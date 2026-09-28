"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { audio } from "@/lib/audio";
import { PAGE_ASPECT, paperTextures } from "@/lib/paperTexture";

/**
 * Several hundred manuscript pages that fly in, then spin between shapes:
 * a ball, a paper bust, a tornado, a nest, or a slow drift. A red thread
 * winds through whatever shape they hold.
 */

export type Formation = "inflow" | "sphere" | "bust" | "vortex" | "nest" | "drift";

const N = 520;
const VARIANTS = 4;
const PAGE_W = 0.44;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

interface Props {
  formation: Formation;
  spin?: number; // group rotation speed, rad/s
  tight?: number; // 0..1, pulls the shape in (used for the verdict ball)
  thread?: number; // 0..1, red thread opacity
  heat?: number; // 0..1, warmth of the inner light
}

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));

/** Radius of the paper bust at height y (a head and shoulders in profile). */
function bustRadius(y: number) {
  if (y < -0.9) return 1.45 - (y + 1.9) * 0.18;
  if (y < -0.3) return THREE.MathUtils.lerp(1.27, 0.42, smooth((y + 0.9) / 0.6));
  if (y < 0.12) return 0.42;
  const k = (y - 1.02) / 0.92;
  return Math.max(0.12, 0.78 * Math.sqrt(Math.max(0, 1 - k * k)));
}

export default function PaperSwarm({ formation, spin = 0.12, tight = 0, thread = 0.8, heat = 0.5 }: Props) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);

  const sheet = useMemo(() => {
    const r = seeded(1978);
    const seedA = new Float32Array(N);
    const seedB = new Float32Array(N);
    const seedC = new Float32Array(N);
    const bustY = new Float32Array(N);
    const axis = Array.from({ length: N }, () => new THREE.Vector3());
    const chaos = Array.from({ length: N }, () => new THREE.Quaternion());
    for (let i = 0; i < N; i++) {
      seedA[i] = r();
      seedB[i] = r();
      seedC[i] = r();
      // Sample bust heights in proportion to cross-section so pages spread evenly.
      let y = 0;
      for (let k = 0; k < 30; k++) {
        y = -1.9 + r() * 3.85;
        if (r() * 2.2 < bustRadius(y) + 0.35) break;
      }
      bustY[i] = y;
      axis[i].set(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      chaos[i].setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28));
    }
    return {
      seedA,
      seedB,
      seedC,
      bustY,
      axis,
      chaos,
      pos: Array.from({ length: N }, () => new THREE.Vector3()),
      quat: Array.from({ length: N }, () => new THREE.Quaternion()),
      fromPos: Array.from({ length: N }, () => new THREE.Vector3()),
      fromQuat: Array.from({ length: N }, () => new THREE.Quaternion()),
    };
  }, []);

  const geometry = useMemo(() => {
    // A page with a gentle curl so it catches light like real paper.
    const g = new THREE.PlaneGeometry(PAGE_W, PAGE_W * PAGE_ASPECT, 6, 3);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (PAGE_W / 2);
      const y = p.getY(i) / ((PAGE_W * PAGE_ASPECT) / 2);
      p.setZ(i, -0.035 * x * x + 0.012 * y * y);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const materials = useMemo(
    () =>
      paperTextures(VARIANTS).map(
        (map) =>
          new THREE.MeshStandardMaterial({
            map,
            emissiveMap: map,
            emissive: new THREE.Color("#ffd8a6"),
            emissiveIntensity: 0.1,
            roughness: 0.78,
            side: THREE.DoubleSide,
            // Keep the pages crisp and cream; the forest behind them carries the fog.
            fog: false,
          }),
      ),
    [],
  );

  // Two red threads through fixed subsets of pages.
  const threadSets = useMemo(() => {
    const sets = [0, 1].map((s) => Array.from({ length: 44 }, (_, k) => (k * 14 + s * 7 + 3) % N));
    return sets.map((idx, k) => {
      const buffer = new Float32Array(240 * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(buffer, 3));
      const line = new THREE.Line(
        geo,
        // Over-bright red so the bloom pass turns a 1px line into a glowing thread.
        new THREE.LineBasicMaterial({ color: new THREE.Color(k === 0 ? 3.2 : 2.2, 0.28, 0.22), transparent: true, opacity: 0, toneMapped: false, fog: false }),
      );
      line.frustumCulled = false;
      return { idx, order: [...idx], pts: idx.map(() => new THREE.Vector3()), buffer, line };
    });
  }, []);

  const state = useRef({ formation: "inflow" as Formation, t0: 0, started: false });

  const target = useMemo(() => {
    const m = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);
    const n = new THREE.Vector3();
    const radial = new THREE.Vector3();
    const zero = new THREE.Vector3();
    const tilt = new THREE.Quaternion();

    return (f: Formation, i: number, t: number, tightK: number, outP: THREE.Vector3, outQ: THREE.Quaternion) => {
      const a = sheet.seedA[i];
      const b = sheet.seedB[i];
      const c = sheet.seedC[i];
      switch (f) {
        case "inflow": {
          // Off to the right and behind, where the pages blow in from.
          outP.set(9 + a * 7, -1 + b * 7, -9 + c * 12);
          outQ.copy(sheet.chaos[i]);
          return;
        }
        case "sphere": {
          const y = 1 - (2 * (i + 0.5)) / N;
          const r = Math.sqrt(1 - y * y);
          const th = GOLDEN * i;
          const R = (1.55 - tightK * 0.35) * (1 + (a - 0.5) * 0.08);
          outP.set(Math.cos(th) * r * R, y * R, Math.sin(th) * r * R);
          up.set(0.001, 1, 0);
          m.lookAt(outP, zero, up);
          outQ.setFromRotationMatrix(m);
          // Lift one edge of each page so the ball reads as feathered paper.
          outQ.multiply(tilt.setFromAxisAngle(sheet.axis[i], (b - 0.5) * 0.9));
          return;
        }
        case "bust": {
          const y = sheet.bustY[i];
          const R = bustRadius(y);
          const th = GOLDEN * i * 7.3;
          const fill = 0.62 + 0.38 * Math.sqrt(a);
          const depth = y < -0.3 ? 0.55 : 0.85;
          const forward = y > 0.12 ? 0.14 : 0;
          outP.set(Math.cos(th) * R * fill + forward, y, Math.sin(th) * R * fill * depth);
          // Stacked, nearly flat layers tipped outward, like a paper sculpture.
          radial.set(Math.cos(th), 0, Math.sin(th));
          n.copy(up.set(0, 1, 0)).multiplyScalar(0.9).addScaledVector(radial, 0.45).normalize();
          m.lookAt(n, zero, radial);
          outQ.setFromRotationMatrix(m);
          outQ.multiply(tilt.setFromAxisAngle(sheet.axis[i], (c - 0.5) * 0.5));
          return;
        }
        case "vortex": {
          const h = (i / N) * 4.4 - 2.1;
          const u = (h + 2.1) / 4.4;
          const R = 0.22 + Math.pow(u, 1.4) * 1.9 + (a - 0.5) * 0.25;
          const th = GOLDEN * i * 3 + t * (1.6 - u * 0.8);
          outP.set(Math.cos(th) * R, h, Math.sin(th) * R);
          radial.set(Math.cos(th), 0.35, Math.sin(th)).normalize();
          m.lookAt(radial, zero, up.set(0, 1, 0));
          outQ.setFromRotationMatrix(m);
          return;
        }
        case "nest": {
          const th = GOLDEN * i * 5 + t * 0.12;
          const phi = a * Math.PI * 2;
          const minor = 0.3 + b * 0.55;
          const R = 1.65 + Math.cos(phi) * minor;
          outP.set(Math.cos(th) * R, Math.sin(phi) * minor * 0.8, Math.sin(th) * R);
          outQ.copy(sheet.chaos[i]);
          return;
        }
        case "drift": {
          const th = GOLDEN * i * 11 + t * 0.03;
          const R = 4 + a * 6;
          outP.set(Math.cos(th) * R, -1 + b * 7 + Math.sin(t * 0.2 + c * 6) * 0.4, Math.sin(th) * R - 2);
          outQ.copy(sheet.chaos[i]);
          return;
        }
      }
    };
  }, [sheet]);

  // Start every page at the inflow position.
  useEffect(() => {
    const q = new THREE.Quaternion();
    for (let i = 0; i < N; i++) {
      target("inflow", i, 0, 0, sheet.pos[i], q);
      sheet.quat[i].copy(q);
    }
  }, [sheet, target]);

  const tmpP = useMemo(() => new THREE.Vector3(), []);
  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const flutter = useMemo(() => new THREE.Quaternion(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const scale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const spinAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const spinQ = useMemo(() => new THREE.Quaternion(), []);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(threadSets[0].pts, false, "centripetal"), [threadSets]);
  const sample = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const s = state.current;

    // A new formation: remember where every page is and start the flight.
    if (s.formation !== formation || !s.started) {
      s.started = true;
      s.formation = formation;
      s.t0 = t;
      for (let i = 0; i < N; i++) {
        sheet.fromPos[i].copy(sheet.pos[i]);
        sheet.fromQuat[i].copy(sheet.quat[i]);
      }
      // Re-thread through the new shape, ordered so the line winds around it.
      for (const set of threadSets) {
        set.order.sort((x, y) => {
          target(formation, x, t, tight, tmpP, tmpQ);
          const ax = Math.atan2(tmpP.z, tmpP.x) + tmpP.y * 1.3;
          target(formation, y, t, tight, tmpP, tmpQ);
          const ay = Math.atan2(tmpP.z, tmpP.x) + tmpP.y * 1.3;
          return ax - ay;
        });
      }
      audio.rustle(formation === "inflow" ? 0.3 : 0.7);
    }

    const since = t - s.t0;
    let inTransit = 0;
    for (let i = 0; i < N; i++) {
      const a = sheet.seedA[i];
      const b = sheet.seedB[i];
      const dur = 2.4 + b * 1.4;
      const delay = a * 1.1;
      const e = smooth((since - delay) / dur);
      const mid = Math.sin(Math.PI * e);
      if (e < 1) inTransit++;

      target(formation, i, t, tight, tmpP, tmpQ);
      const p = sheet.pos[i].copy(sheet.fromPos[i]).lerp(tmpP, e);
      // Whip around the centre mid-flight so pages spiral into place.
      spinQ.setFromAxisAngle(spinAxis, mid * (1.6 + b * 1.8) * (a < 0.5 ? 1 : -1));
      p.applyQuaternion(spinQ);
      p.y += mid * (a - 0.3) * 0.9;

      const q = sheet.quat[i].copy(sheet.fromQuat[i]).slerp(tmpQ, e);
      const amp = 0.08 + mid * 1.4;
      flutter.setFromAxisAngle(sheet.axis[i], Math.sin(t * (1.2 + b * 2.2) + a * 20) * amp);
      q.multiply(flutter);

      const mesh = meshes.current[i % VARIANTS];
      if (!mesh) continue;
      matrix.compose(p, q, scale);
      mesh.setMatrixAt(Math.floor(i / VARIANTS), matrix);
    }
    for (const mesh of meshes.current) if (mesh) mesh.instanceMatrix.needsUpdate = true;

    // Threads follow their pages; they fade while the shape is in flight.
    const settle = 1 - inTransit / N;
    threadSets.forEach((set, k) => {
      const line = set.line;
      set.order.forEach((idx, j) => set.pts[j].copy(sheet.pos[idx]));
      curve.points = set.pts;
      const count = set.buffer.length / 3;
      for (let j = 0; j < count; j++) {
        curve.getPoint(j / (count - 1), sample);
        set.buffer[j * 3] = sample.x;
        set.buffer[j * 3 + 1] = sample.y;
        set.buffer[j * 3 + 2] = sample.z;
      }
      line.geometry.attributes.position.needsUpdate = true;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity += ((k === 0 ? 0.85 : 0.4) * thread * (0.25 + 0.75 * settle) - mat.opacity) * Math.min(1, dt * 2);
    });

    if (group.current) {
      group.current.rotation.y += dt * spin;
      group.current.position.y = 2.5 + Math.sin(t * 0.6) * 0.08;
    }
    if (light.current) {
      const level = audio.level();
      light.current.intensity = 6 + heat * 10 + level * 30;
    }
  });

  return (
    <group ref={group} position={[0, 2.5, 0]}>
      {materials.map((mat, v) => (
        <instancedMesh
          key={v}
          ref={(m) => {
            meshes.current[v] = m;
          }}
          args={[geometry, mat, N / VARIANTS]}
          frustumCulled={false}
        />
      ))}
      {threadSets.map((set, k) => (
        <primitive key={k} object={set.line} />
      ))}
      <pointLight ref={light} color="#ffa24c" distance={9} decay={1.6} />
    </group>
  );
}
