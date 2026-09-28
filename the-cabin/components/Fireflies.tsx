"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * Fireflies in three depth layers. Each one wanders on its own slow path and
 * blinks on its own rhythm. Near ones are large and soft, as if out of focus;
 * far ones are pinpricks against the ridges. All motion runs on the GPU.
 */

interface Layer {
  count: number;
  spread: [number, number, number]; // box size
  center: [number, number, number];
  size: number; // base point size in pixels at 10 units
  softness: number; // 0 sharp .. 1 very soft (bokeh)
  wander: number;
  seed: number;
}

const LAYERS: Layer[] = [
  { count: 14, spread: [18, 5, 4], center: [0, 2.6, 6], size: 30, softness: 1, wander: 0.9, seed: 3 },
  { count: 80, spread: [34, 6, 18], center: [0, 2.2, -4], size: 12, softness: 0.4, wander: 0.7, seed: 7 },
  { count: 170, spread: [90, 7, 40], center: [0, 2.5, -30], size: 8, softness: 0.15, wander: 0.5, seed: 13 },
];

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function FireflyLayer({ layer }: { layer: Layer }) {
  const { geometry, material } = useMemo(() => {
    const r = rng(layer.seed * 997);
    const n = layer.count;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = layer.center[0] + (r() - 0.5) * layer.spread[0];
      pos[i * 3 + 1] = Math.max(0.3, layer.center[1] + (r() - 0.5) * layer.spread[1]);
      pos[i * 3 + 2] = layer.center[2] + (r() - 0.5) * layer.spread[2];
      seed[i * 3] = r();
      seed[i * 3 + 1] = r();
      seed[i * 3 + 2] = r();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("seed", new THREE.BufferAttribute(seed, 3));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        size: { value: layer.size },
        softness: { value: layer.softness },
        wander: { value: layer.wander },
        pixelRatio: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 seed;
        uniform float time; uniform float size; uniform float wander; uniform float pixelRatio;
        varying float vGlow; varying float vHue;
        void main() {
          vec3 p = position;
          float t = time * (0.18 + seed.x * 0.25);
          p.x += sin(t + seed.y * 30.0) * wander * 1.6 + sin(t * 2.3 + seed.z * 11.0) * wander * 0.4;
          p.y += sin(t * 1.3 + seed.z * 20.0) * wander * 0.6;
          p.z += cos(t * 0.9 + seed.x * 25.0) * wander * 1.2;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = size * pixelRatio * (10.0 / max(1.0, -mv.z));
          // Slow pulses with long dark gaps, like the real thing.
          float phase = time * (0.35 + seed.y * 0.5) + seed.x * 60.0;
          float pulse = pow(max(0.0, sin(phase)), 6.0);
          vGlow = 0.08 + pulse;
          vHue = seed.z;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float softness;
        varying float vGlow; varying float vHue;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float core = smoothstep(0.35 + softness * 0.4, 0.0, d);
          float halo = smoothstep(1.0, 0.0, d) * 0.35;
          // Bokeh ring for the near, out-of-focus layer.
          float ring = softness * smoothstep(0.75, 0.9, d) * smoothstep(1.0, 0.9, d) * 0.25;
          vec3 warm = mix(vec3(1.0, 0.78, 0.36), vec3(0.82, 1.0, 0.45), vHue * 0.6);
          float a = (core + halo + ring) * vGlow * (1.0 - softness * 0.45);
          gl_FragColor = vec4(warm * 1.6, a);
        }
      `,
    });
    return { geometry, material };
  }, [layer]);

  useFrame(({ clock, gl }) => {
    material.uniforms.time.value = clock.elapsedTime;
    material.uniforms.pixelRatio.value = gl.getPixelRatio();
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

export default function Fireflies() {
  return (
    <group>
      {LAYERS.map((l) => (
        <FireflyLayer key={l.seed} layer={l} />
      ))}
    </group>
  );
}
