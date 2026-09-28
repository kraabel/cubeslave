import * as THREE from "three";

/**
 * Procedural manuscript pages: aged paper, typed lines, margin notes, the odd
 * sketch and red underline, singed edges. Drawn to canvas once, so there are
 * no image files to host.
 */

const W = 256;
const H = 332;

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function drawPage(ctx: CanvasRenderingContext2D, variant: number) {
  const r = seeded(97 + variant * 131);

  // Paper stock: warm cream with a soft, uneven tone.
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#f3e6ca");
  g.addColorStop(0.55, "#ead8b4");
  g.addColorStop(1, "#dcc496");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Fibre and foxing.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(120, 90, 50, ${r() * 0.05})`;
    ctx.fillRect(r() * W, r() * H, 1 + r() * 2, 1);
  }
  for (let i = 0; i < 6; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = 6 + r() * 22;
    const s = ctx.createRadialGradient(x, y, 0, x, y, rad);
    s.addColorStop(0, "rgba(150, 105, 55, 0.14)");
    s.addColorStop(1, "rgba(150, 105, 55, 0)");
    ctx.fillStyle = s;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Typed lines: bars of uneven length read as text from any distance.
  const left = 22;
  const right = W - 22;
  let y = 30;
  const kind = variant % 4;
  while (y < H - 26) {
    if (kind === 1 && y > 120 && y < 210) {
      // A diagram block: boxes and connecting lines, like a schematic.
      ctx.strokeStyle = "rgba(40, 32, 24, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(left + 8, 128, 60, 34);
      ctx.strokeRect(left + 110, 150, 70, 40);
      ctx.beginPath();
      ctx.moveTo(left + 68, 145);
      ctx.lineTo(left + 110, 168);
      ctx.moveTo(left + 38, 162);
      ctx.lineTo(left + 38, 200);
      ctx.lineTo(left + 150, 200);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(left + 190, 136, 12, 0, Math.PI * 2);
      ctx.stroke();
      y = 216;
      continue;
    }
    if (kind === 2 && y > 150 && y < 230) {
      // A pencil sketch of pines.
      ctx.strokeStyle = "rgba(50, 40, 30, 0.5)";
      ctx.lineWidth = 1;
      for (let p = 0; p < 5; p++) {
        const px = left + 20 + p * 38 + r() * 8;
        const ph = 40 + r() * 30;
        ctx.beginPath();
        ctx.moveTo(px, 225);
        ctx.lineTo(px, 225 - ph);
        for (let b = 0; b < 5; b++) {
          const by = 225 - ph + 6 + b * (ph / 6);
          const bw = 4 + b * 3;
          ctx.moveTo(px - bw, by + 5);
          ctx.lineTo(px, by);
          ctx.lineTo(px + bw, by + 5);
        }
        ctx.stroke();
      }
      y = 238;
      continue;
    }
    const indent = r() < 0.12 ? 14 : 0;
    let x = left + indent;
    const end = r() < 0.15 ? left + (right - left) * (0.3 + r() * 0.5) : right;
    while (x < end - 6) {
      const wlen = 6 + r() * 26;
      ctx.fillStyle = `rgba(35, 28, 22, ${0.55 + r() * 0.3})`;
      ctx.fillRect(x, y, Math.min(wlen, end - x), 2.6);
      x += wlen + 4 + r() * 3;
    }
    if (r() < 0.05) {
      ctx.strokeStyle = "rgba(190, 30, 30, 0.8)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(left + indent, y + 5);
      ctx.lineTo(left + indent + 60 + r() * 90, y + 5.5);
      ctx.stroke();
    }
    y += 11;
  }

  // A handwritten margin note on some pages.
  if (kind === 3 || kind === 0) {
    ctx.strokeStyle = "rgba(60, 45, 30, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    let mx = W - 18;
    ctx.moveTo(mx, 60);
    for (let i = 0; i < 40; i++) {
      mx = W - 18 + Math.sin(i * 1.7) * 4;
      ctx.lineTo(mx, 60 + i * 2.2);
    }
    ctx.stroke();
  }

  // Singed, darkened edges.
  const e = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  e.addColorStop(0, "rgba(90, 55, 20, 0)");
  e.addColorStop(1, "rgba(70, 38, 12, 0.55)");
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, W, H);
}

let cache: THREE.CanvasTexture[] | null = null;

export function paperTextures(count = 4): THREE.CanvasTexture[] {
  if (cache) return cache;
  cache = Array.from({ length: count }, (_, v) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    drawPage(c.getContext("2d")!, v);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
  return cache;
}

export const PAGE_ASPECT = H / W;
