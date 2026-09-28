"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { audio } from "@/lib/audio";

export type Stage = "gate" | "intro" | "question" | "divining" | "verdict";

interface SceneProps {
  stage: Stage;
  progress: number; // 0..1 through the questions
  risk: number | null; // 0..100 once divined
}

const COLD = new THREE.Color("#8fb3d9");
const EMBER = new THREE.Color("#ff5a1f");
const MOSS = new THREE.Color("#7fd6a4");

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

function orbColor(stage: Stage, progress: number, risk: number | null, out: THREE.Color) {
  if (stage === "verdict" && risk !== null) {
    return risk < 15 ? out.copy(MOSS) : out.copy(COLD).lerp(EMBER, Math.min(1, risk / 85));
  }
  return out.copy(COLD).lerp(EMBER, stage === "divining" ? 0.55 : progress * 0.35);
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
        <meshStandardMaterial color="#0d1512" roughness={0.95} flatShading />
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

function Ash() {
  const points = useRef<THREE.Points>(null);
  const count = 2200;
  const { positions, speeds } = useMemo(() => {
    const r = rng(77);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (r() - 0.5) * 60;
      positions[i * 3 + 1] = r() * 22;
      positions[i * 3 + 2] = (r() - 0.5) * 60 - 5;
      speeds[i] = 0.15 + r() * 0.45;
    }
    return { positions, speeds };
  }, []);

  useFrame(({ clock }, dt) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const arr = geo.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      arr[k + 1] -= speeds[i] * dt * 0.6;
      arr[k] += Math.sin(t * 0.3 + i) * dt * 0.25;
      if (arr[k + 1] < 0) arr[k + 1] = 22;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#c9c3b8" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** The genie: a breathing, distorted orb that listens to the audio. */
function Oracle({ stage, progress, risk }: SceneProps) {
  const shell = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const lattice = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const target = useMemo(() => new THREE.Color(), []);
  const distortion = useRef(0.3);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const level = audio.level();
    orbColor(stage, progress, risk, target);
    color.lerp(target, Math.min(1, dt * 1.5));

    const agitation = stage === "divining" ? 0.75 : stage === "verdict" ? 0.35 + (risk ?? 0) / 250 : 0.25 + progress * 0.25;
    distortion.current += (agitation - distortion.current) * Math.min(1, dt * 2);

    if (shell.current) {
      const mat = shell.current.material as THREE.MeshStandardMaterial & { distort: number; speed: number };
      mat.distort = distortion.current + level * 0.5;
      mat.color.copy(color);
      mat.emissive.copy(color);
      mat.emissiveIntensity = 0.35 + level * 1.4;
      const s = 1 + Math.sin(t * 0.9) * 0.03 + level * 0.25;
      shell.current.scale.setScalar(s);
    }
    if (core.current) {
      (core.current.material as THREE.MeshBasicMaterial).color.copy(color).multiplyScalar(2.2);
      core.current.scale.setScalar(0.22 + level * 0.25 + Math.sin(t * 2.1) * 0.015);
    }
    const spin = stage === "divining" ? 2.4 : 0.35;
    if (lattice.current) {
      lattice.current.rotation.y -= dt * spin * 0.25;
      lattice.current.rotation.x += dt * spin * 0.1;
      (lattice.current.material as THREE.MeshBasicMaterial).color.copy(color);
      lattice.current.scale.setScalar(1 + level * 0.4);
    }
    if (ringA.current) {
      ringA.current.rotation.x += dt * spin * 0.6;
      ringA.current.rotation.y += dt * spin * 0.3;
      (ringA.current.material as THREE.MeshBasicMaterial).color.copy(color);
    }
    if (ringB.current) {
      ringB.current.rotation.y -= dt * spin * 0.5;
      ringB.current.rotation.z += dt * spin * 0.2;
      (ringB.current.material as THREE.MeshBasicMaterial).color.copy(color);
    }
    if (light.current) {
      light.current.color.copy(color);
      light.current.intensity = 14 + level * 40;
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.35} floatIntensity={1.1} floatingRange={[-0.25, 0.25]}>
      <group position={[0, 2.4, 0]}>
        <mesh ref={shell}>
          <icosahedronGeometry args={[1, 24]} />
          <MeshDistortMaterial color={COLD} emissive={COLD} roughness={0.1} metalness={0.6} transparent opacity={0.22} depthWrite={false} distort={0.3} speed={1.6} />
        </mesh>
        <mesh ref={lattice}>
          <icosahedronGeometry args={[1.12, 2]} />
          <meshBasicMaterial wireframe transparent opacity={0.12} toneMapped={false} />
        </mesh>
        <mesh ref={core}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
        <mesh ref={ringA}>
          <torusGeometry args={[1.65, 0.008, 8, 160]} />
          <meshBasicMaterial toneMapped={false} transparent opacity={0.7} />
        </mesh>
        <mesh ref={ringB} rotation={[1.1, 0, 0.4]}>
          <torusGeometry args={[2.05, 0.005, 8, 160]} />
          <meshBasicMaterial toneMapped={false} transparent opacity={0.45} />
        </mesh>
        <pointLight ref={light} distance={16} decay={1.8} />
        <Sparkles count={60} scale={4.5} size={2.2} speed={0.35} opacity={0.6} color="#e8dccb" />
      </group>
    </Float>
  );
}

/**
 * Camera framing per stage. The orb lives at (0, 2.4, 0); aiming the camera
 * away from it places the orb beside or above the text instead of behind it.
 * "tall" is used on portrait screens, where there is no room beside the text.
 */
type Shot = { pos: [number, number, number]; look: [number, number, number] };
const SHOTS: Record<Stage, { wide: Shot; tall: Shot }> = {
  gate: {
    wide: { pos: [0, 3.2, 17], look: [0, 3, 0] },
    tall: { pos: [0, 3.2, 22], look: [0, 3, 0] },
  },
  intro: {
    wide: { pos: [0, 2.8, 11], look: [0, -0.2, 0] },
    tall: { pos: [0, 2.8, 15], look: [0, 0.2, 0] },
  },
  question: {
    wide: { pos: [0.6, 2.6, 9], look: [-2.9, 2.3, 0] },
    tall: { pos: [0, 2.6, 13], look: [0, -1.4, 0] },
  },
  divining: {
    wide: { pos: [0, 2.5, 6.5], look: [0, 1.6, 0] },
    tall: { pos: [0, 2.5, 9], look: [0, 1.2, 0] },
  },
  verdict: {
    wide: { pos: [0, 2.4, 11], look: [0, 0.2, 0] },
    tall: { pos: [0, 2.4, 15], look: [0, -1.8, 0] },
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
    const push = stage === "question" ? progress * 1.6 : 0;
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
  return (
    <Canvas
      className="scene"
      dpr={[1, 1.75]}
      camera={{ fov: 42, position: [0, 3.2, 17], near: 0.1, far: 200 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#050607"]} />
      <fogExp2 attach="fog" args={["#07090b", 0.045]} />
      <ambientLight intensity={0.12} color="#9fb4c8" />
      <directionalLight position={[-12, 20, -20]} intensity={0.35} color="#9fb4d6" />
      <mesh position={[-22, 26, -80]}>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial color="#d9dccf" toneMapped={false} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#080a09" roughness={1} />
      </mesh>
      <Forest />
      <Cabin />
      <Ash />
      <Oracle {...props} />
      <CameraRig stage={props.stage} progress={props.progress} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.25} luminanceThreshold={0.25} luminanceSmoothing={0.3} />
        <ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0004)} radialModulation={false} modulationOffset={0} blendFunction={BlendFunction.NORMAL} />
        <Noise opacity={0.07} premultiply blendFunction={BlendFunction.ADD} />
        <Vignette offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
