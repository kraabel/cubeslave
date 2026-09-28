"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * A cold night over western Montana: a deep sky, a thin cold moon, a field of
 * stars, and ridgelines that pale with distance (atmospheric perspective).
 * Built from shapes and shaders, so there are no textures to load.
 */

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1D fractal value noise, for ridgelines. */
function ridge(seed: number) {
  const r = rng(seed);
  const lattice = Array.from({ length: 512 }, () => r());
  const at = (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = lattice[((i % 512) + 512) % 512];
    const b = lattice[(((i + 1) % 512) + 512) % 512];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
  return (x: number) => {
    let v = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < 5; o++) {
      v += at(x * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    // Sharpen the peaks so they read as mountains, not hills.
    const n = v / norm;
    return Math.pow(n, 1.6);
  };
}

export function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          zenith: { value: new THREE.Color("#020407") },
          horizon: { value: new THREE.Color("#0e1b25") },
          glow: { value: new THREE.Color("#1c2c38") },
          moonDir: { value: new THREE.Vector3(-0.35, 0.42, -0.84).normalize() },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 zenith; uniform vec3 horizon; uniform vec3 glow; uniform vec3 moonDir;
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 c = mix(horizon, zenith, pow(h, 0.55));
            // Cold haze around the moon.
            float m = max(dot(normalize(vDir), moonDir), 0.0);
            c += glow * pow(m, 18.0) * 0.9 + glow * pow(m, 4.0) * 0.25;
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      }),
    [],
  );
  return (
    <mesh material={material} renderOrder={-10}>
      <sphereGeometry args={[180, 32, 16]} />
    </mesh>
  );
}

export function Stars({ count = 2400 }: { count?: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
        uniforms: { time: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float seed; attribute float size;
          uniform float time;
          varying float vA;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = size;
            vA = 0.55 + 0.45 * sin(time * (0.6 + seed * 2.4) + seed * 40.0);
            // Fade stars near the horizon haze.
            vA *= smoothstep(0.02, 0.25, normalize(position).y);
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vec3(0.82, 0.88, 1.0), a * vA);
          }
        `,
      }),
    [],
  );
  const geometry = useMemo(() => {
    const r = rng(1971);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = r() * Math.PI * 2;
      const v = Math.acos(1 - r() * 0.95);
      const R = 170;
      pos[i * 3] = Math.sin(v) * Math.cos(u) * R;
      pos[i * 3 + 1] = Math.cos(v) * R;
      pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * R;
      seed[i] = r();
      size[i] = r() < 0.03 ? 3.2 : 0.8 + r() * 1.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("size", new THREE.BufferAttribute(size, 1));
    return g;
  }, [count]);
  useFrame(({ clock }) => {
    material.uniforms.time.value = clock.elapsedTime;
  });
  return <points geometry={geometry} material={material} renderOrder={-9} />;
}

export function Moon() {
  const halo = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(200,220,255,0.55)");
    grad.addColorStop(0.25, "rgba(160,190,230,0.16)");
    grad.addColorStop(1, "rgba(120,150,200,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  // Placed along the sky shader's moonDir.
  const pos = new THREE.Vector3(-0.35, 0.42, -0.84).normalize().multiplyScalar(150);
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#dfe6ee" toneMapped={false} fog={false} />
      </mesh>
      <sprite scale={[26, 26, 1]}>
        <spriteMaterial map={halo} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/**
 * One ridgeline: a silhouette darker than the sky, shading up to faint
 * moonlit snow near the peaks, with a barely-there rim of light on the crest.
 */
function Ridge({ seed, z, height, base, color, snow, rim, scale, width }: { seed: number; z: number; height: number; base: number; color: string; snow: number; rim: number; scale: number; width: number }) {
  const { geometry, line, material } = useMemo(() => {
    const h = ridge(seed);
    const shape = new THREE.Shape();
    const edge: THREE.Vector3[] = [];
    const steps = 260;
    shape.moveTo(-width, -4);
    for (let i = 0; i <= steps; i++) {
      const x = -width + (i / steps) * width * 2;
      const y = base + h(x * scale + 7.3) * height;
      shape.lineTo(x, y);
      edge.push(new THREE.Vector3(x, y, 0.01));
    }
    shape.lineTo(width, -4);
    shape.closePath();
    const material = new THREE.ShaderMaterial({
      fog: false,
      uniforms: {
        rock: { value: new THREE.Color(color) },
        snowColor: { value: new THREE.Color("#9fb3c8") },
        base: { value: base },
        top: { value: base + height },
        snow: { value: snow },
      },
      vertexShader: /* glsl */ `
        varying float vY;
        void main() {
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 rock; uniform vec3 snowColor; uniform float base; uniform float top; uniform float snow;
        varying float vY;
        void main() {
          float k = clamp((vY - base) / max(0.001, top - base), 0.0, 1.0);
          // Slightly lighter toward the crest, then faint snow on the high peaks.
          vec3 c = rock * (0.75 + 0.5 * k);
          c = mix(c, snowColor * 0.22, smoothstep(0.62, 0.95, k) * snow);
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    });
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(edge),
      new THREE.LineBasicMaterial({ color: "#9fb6cf", transparent: true, opacity: rim, fog: false }),
    );
    return { geometry: new THREE.ShapeGeometry(shape), line, material };
  }, [seed, height, base, scale, width, rim, color, snow]);

  return (
    <group position={[0, 0, z]}>
      <mesh geometry={geometry} material={material} />
      {rim > 0 && <primitive object={line} />}
    </group>
  );
}

/** Four ranges receding into the dark, the farthest palest, like the Bitterroot at night. */
export function Mountains() {
  return (
    <group>
      <Ridge seed={11} z={-150} height={52} base={8} color="#0c1720" snow={1} rim={0.035} scale={0.035} width={220} />
      <Ridge seed={23} z={-120} height={40} base={4} color="#09121a" snow={0.8} rim={0.04} scale={0.05} width={190} />
      <Ridge seed={37} z={-92} height={27} base={0} color="#060d13" snow={0.45} rim={0.03} scale={0.07} width={160} />
      <Ridge seed={53} z={-66} height={14} base={-1} color="#04090d" snow={0} rim={0} scale={0.1} width={130} />
    </group>
  );
}

/** Light snow falling through the scene. */
export function Snow({ count = 700 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const r = rng(1996);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (r() - 0.5) * 50;
      positions[i * 3 + 1] = r() * 18;
      positions[i * 3 + 2] = (r() - 0.5) * 50 - 6;
      speeds[i] = 0.25 + r() * 0.5;
    }
    return { positions, speeds };
  }, [count]);
  useFrame(({ clock }, dt) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const arr = geo.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      arr[k + 1] -= speeds[i] * dt;
      arr[k] += Math.sin(t * 0.4 + i) * dt * 0.3;
      if (arr[k + 1] < 0) arr[k + 1] = 18;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#dfe8f2" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}
