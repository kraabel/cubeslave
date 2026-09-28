"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import PaperSwarm, { type Formation } from "./PaperSwarm";

export type Stage = "gate" | "intro" | "question" | "divining" | "verdict";

interface SceneProps {
  stage: Stage;
  step: number; // question index
  progress: number; // 0..1 through the questions
  risk: number | null; // 0..100 once divined
}

/** Seeded RNG so the forest is identical on every load. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Forest() {
  const count = 420;

  const placements = useMemo(() => {
    const r = rng(1995);
    const out: { x: number; z: number; h: number; w: number; tilt: number }[] = [];
    while (out.length < count) {
      const angle = r() * Math.PI * 2;
      const dist = 9 + Math.pow(r(), 0.7) * 42;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist - 6;
      const h = 5 + r() * 9;
      const w = 0.9 + r() * 1.3;
      const tilt = (r() - 0.5) * 0.06;
      // Keep a clearing along the camera's path so no trunk fills the lens.
      if (Math.abs(x) < 7 + w && z > -12) continue;
      out.push({ x, z, h, w, tilt });
    }
    return out;
  }, []);

  const setup = (mesh: THREE.InstancedMesh | null, kind: "trunk" | "crown") => {
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    placements.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(p.tilt, 0, p.tilt));
      if (kind === "trunk") m.compose(new THREE.Vector3(p.x, p.h * 0.25, p.z), q, new THREE.Vector3(0.18, p.h * 0.5, 0.18));
      else m.compose(new THREE.Vector3(p.x, p.h * 0.62, p.z), q, new THREE.Vector3(p.w, p.h * 0.8, p.w));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  return (
    <group>
      <instancedMesh
        ref={(m) => setup(m, "trunk")}
        args={[undefined, undefined, count]}
      >
        <cylinderGeometry args={[0.6, 1, 1, 5]} />
        <meshStandardMaterial color="#0b0b0a" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={(m) => setup(m, "crown")}
        args={[undefined, undefined, count]}
      >
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial color="#101a1c" roughness={0.95} flatShading />
      </instancedMesh>
    </group>
  );
}

function Cabin() {
  const lamp = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!lamp.current) return;
    const t = clock.elapsedTime;
    lamp.current.intensity = 5 + Math.sin(t * 7.3) * 0.6 + Math.sin(t * 13.1) * 0.4 + (Math.random() < 0.02 ? -2 : 0);
  });
  return (
    <group position={[-7.5, 0, -16]} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[3.2, 2.2, 2.6]} />
        <meshStandardMaterial color="#17110c" roughness={1} />
      </mesh>
      <mesh position={[0, 2.75, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.6, 1.3, 4]} />
        <meshStandardMaterial color="#0c0907" roughness={1} />
      </mesh>
      <mesh position={[0.6, 1.25, 1.31]}>
        <planeGeometry args={[0.55, 0.45]} />
        <meshBasicMaterial color="#ffae57" toneMapped={false} />
      </mesh>
      <pointLight ref={lamp} position={[0.6, 1.3, 2]} color="#ff9a3c" distance={9} decay={1.6} />
    </group>
  );
}

/** Drifting motes: grey dust falling, or warm embers rising. */
function Motes({ count, color, size, rise, opacity, seed }: { count: number; color: string; size: number; rise: boolean; opacity: number; seed: number }) {
  const points = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const r = rng(seed);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (r() - 0.5) * (rise ? 18 : 60);
      positions[i * 3 + 1] = r() * 16;
      positions[i * 3 + 2] = (r() - 0.5) * (rise ? 14 : 60) - (rise ? 1 : 5);
      speeds[i] = 0.15 + r() * 0.45;
    }
    return { positions, speeds };
  }, [count, rise, seed]);

  useFrame(({ clock }, dt) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const arr = geo.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      arr[k + 1] += (rise ? 1 : -0.6) * speeds[i] * dt;
      arr[k] += Math.sin(t * 0.3 + i) * dt * (rise ? 0.35 : 0.25);
      if (rise && arr[k + 1] > 12) arr[k + 1] = 0;
      if (!rise && arr[k + 1] < 0) arr[k + 1] = 16;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={rise ? THREE.AdditiveBlending : THREE.NormalBlending}
        toneMapped={!rise}
      />
    </points>
  );
}

function softTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** Low banks of mist that drift across the clearing, in layers for depth. */
function Mist() {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(softTexture, []);
  const banks = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 16 }, () => ({
      x: (r() - 0.5) * 30,
      y: 0.3 + r() * 1.6,
      z: -2 - r() * 22,
      s: 6 + r() * 9,
      v: 0.1 + r() * 0.25,
      o: 0.05 + r() * 0.08,
    }));
  }, []);
  useFrame((_, dt) => {
    group.current?.children.forEach((m, i) => {
      m.position.x += banks[i].v * dt;
      if (m.position.x > 18) m.position.x = -18;
    });
  });
  return (
    <group ref={group}>
      {banks.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} scale={[b.s * 1.8, b.s * 0.45, 1]}>
          <planeGeometry />
          <meshBasicMaterial map={tex} color="#9fb0b8" transparent opacity={b.o} depthWrite={false} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Lanterns set along the clearing; their light pools on the wet ground. */
function Lanterns() {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const spots: [number, number, number][] = [
    [-5.5, 0.35, -3],
    [5.8, 0.35, -5],
    [-3.2, 0.35, -11],
    [8.5, 0.35, -13],
  ];
  const glow = useMemo(softTexture, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    lights.current.forEach((l, i) => {
      if (l) l.intensity = 3.2 + Math.sin(t * (5 + i) + i) * 0.35 + Math.sin(t * 11.3 + i * 2) * 0.2;
    });
  });
  return (
    <group>
      {spots.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <boxGeometry args={[0.16, 0.26, 0.16]} />
            <meshBasicMaterial color="#ffb45e" toneMapped={false} />
          </mesh>
          <sprite scale={[1.6, 1.6, 1]}>
            <spriteMaterial map={glow} color="#ff9f45" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          <pointLight
            ref={(l) => {
              lights.current[i] = l;
            }}
            color="#ff9a3c"
            distance={7}
            decay={1.7}
          />
        </group>
      ))}
    </group>
  );
}

/** The homepage loop: pages blow in, then spin from shape to shape. */
const HOME_LOOP: { f: Formation; hold: number }[] = [
  { f: "sphere", hold: 7 },
  { f: "bust", hold: 8 },
  { f: "vortex", hold: 6.5 },
  { f: "nest", hold: 6.5 },
];
const QUESTION_SHAPES: Formation[] = ["vortex", "bust", "nest", "sphere"];

function useFormation({ stage, step, risk }: SceneProps): Formation {
  const [loop, setLoop] = useState(-1);
  useEffect(() => {
    if (stage !== "gate") return;
    let i = loop;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      i = (i + 1) % HOME_LOOP.length;
      setLoop(i);
      timer = setTimeout(next, HOME_LOOP[i].hold * 1000);
    };
    timer = setTimeout(next, loop < 0 ? 600 : HOME_LOOP[Math.max(0, i)].hold * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  if (stage === "gate") return loop < 0 ? "inflow" : HOME_LOOP[loop].f;
  if (stage === "intro") return "sphere";
  if (stage === "question") return QUESTION_SHAPES[step % QUESTION_SHAPES.length];
  if (stage === "divining") return "vortex";
  if (risk === null) return "sphere";
  if (risk >= 60) return "sphere";
  if (risk >= 35) return "bust";
  if (risk >= 15) return "nest";
  return "drift";
}

/**
 * Camera framing per stage. The orb lives at (0, 2.4, 0); aiming the camera
 * away from it places the orb beside or above the text instead of behind it.
 * "tall" is used on portrait screens, where there is no room beside the text.
 */
type Shot = { pos: [number, number, number]; look: [number, number, number] };
const SHOTS: Record<Stage, { wide: Shot; tall: Shot }> = {
  gate: {
    wide: { pos: [0.6, 2.8, 10.5], look: [-3.1, 2.3, 0] },
    tall: { pos: [0, 2.8, 18], look: [0, -1.5, 0] },
  },
  intro: {
    wide: { pos: [0, 2.8, 11], look: [0, 0.4, 0] },
    tall: { pos: [0, 2.8, 14], look: [0, -0.4, 0] },
  },
  question: {
    wide: { pos: [0.6, 2.7, 9.5], look: [-3.1, 2.3, 0] },
    tall: { pos: [0, 2.7, 13.5], look: [0, -1.4, 0] },
  },
  divining: {
    wide: { pos: [0, 2.6, 8], look: [0, 1.4, 0] },
    tall: { pos: [0, 2.6, 11], look: [0, 0.6, 0] },
  },
  verdict: {
    wide: { pos: [0.6, 2.7, 10], look: [-3.1, 2.3, 0] },
    tall: { pos: [0, 2.7, 14], look: [0, -1.6, 0] },
  },
};

function CameraRig({ stage, progress }: { stage: Stage; progress: number }) {
  const { camera, pointer, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 3, 0));
  const pos = useMemo(() => new THREE.Vector3(), []);
  const aim = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const shot = size.width / size.height < 0.9 ? SHOTS[stage].tall : SHOTS[stage].wide;
    const push = stage === "question" ? progress * 1.2 : 0;
    pos.set(
      shot.pos[0] + Math.sin(t * 0.11) * 0.9 + pointer.x * 1.1,
      shot.pos[1] + Math.sin(t * 0.17) * 0.25 + pointer.y * 0.5,
      shot.pos[2] - push,
    );
    aim.set(shot.look[0] + pointer.x * 0.3, shot.look[1] + pointer.y * 0.15, shot.look[2]);
    const k = 1 - Math.exp(-dt * 0.9);
    camera.position.lerp(pos, k);
    look.current.lerp(aim, k);
    camera.lookAt(look.current);
  });
  return null;
}

export default function Scene(props: SceneProps) {
  const formation = useFormation(props);
  const { stage, risk } = props;
  const high = stage === "verdict" && (risk ?? 0) >= 60;
  return (
    <Canvas
      className="scene"
      dpr={[1, 1.75]}
      camera={{ fov: 42, position: [0.6, 3, 16], near: 0.1, far: 200 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#070a0c"]} />
      <fogExp2 attach="fog" args={["#0b1114", 0.042]} />
      <ambientLight intensity={0.16} color="#a9bcc8" />
      <directionalLight position={[-12, 20, -20]} intensity={0.4} color="#9fb4d6" />
      {/* Warm key from the viewer's side so page faces show their text. */}
      <directionalLight position={[6, 6, 12]} intensity={1.5} color="#ffe6c2" />
      <mesh position={[-22, 26, -80]}>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial color="#d9dccf" toneMapped={false} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[240, 240]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={22}
          roughness={0.9}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0c0f10"
          metalness={0.55}
          mirror={0.6}
        />
      </mesh>
      <Forest />
      <Cabin />
      <Lanterns />
      <Mist />
      <Motes count={900} color="#b9b4aa" size={0.05} rise={false} opacity={0.4} seed={77} />
      <Motes count={260} color="#ffae5c" size={0.09} rise opacity={0.9} seed={12} />
      <PaperSwarm
        formation={formation}
        spin={stage === "divining" ? 1.3 : stage === "verdict" ? 0.08 : 0.16}
        tight={high ? 1 : 0}
        thread={high ? 1 : stage === "verdict" && formation === "drift" ? 0 : 0.75}
        heat={stage === "verdict" ? Math.min(1, (risk ?? 0) / 80) : stage === "divining" ? 0.8 : 0.45}
      />
      <CameraRig stage={stage} progress={props.progress} />
      <EffectComposer multisampling={0}>
        <DepthOfField target={[0, 2.5, 0]} focalLength={0.09} bokehScale={2.2} height={480} />
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.3} luminanceSmoothing={0.35} />
        <Noise opacity={0.06} premultiply blendFunction={BlendFunction.ADD} />
        <Vignette offset={0.25} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
