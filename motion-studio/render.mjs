// node render.mjs --fps 60 --dur 15 --sub 4 [--page index.html] [--out out/silent.mp4]
// Walks time, calls window.seek(t), screenshots the canvas, pipes PNGs into ffmpeg.
// Set FFMPEG=/path/to/ffmpeg if ffmpeg isn't on PATH.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const argv = process.argv;
const str = (k, d) => { const i = argv.indexOf('--' + k); return i > 0 ? argv[i + 1] : d; };
const num = (k, d) => Number(str(k, d));
const FPS = num('fps', 60), DUR = num('dur', 15), SUB = num('sub', 4);
const PAGE = resolve(str('page', 'index.html')), OUT = str('out', 'out/silent.mp4');
const W = num('w', 1080), H = num('h', 1920);
mkdirSync(dirname(OUT), { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('file://' + PAGE);
await page.evaluate(() => document.fonts.ready);       // canvas text needs loaded fonts

// tmix averages SUB consecutive subframes (motion blur); select keeps one per group
const vf = SUB > 1
  ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB`
  : 'null';
const ff = spawn(process.env.FFMPEG || 'ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe',
  '-framerate', String(FPS * SUB), '-i', '-', '-vf', vf, '-r', String(FPS),
  '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', OUT],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round(DUR * FPS * SUB);
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.seek(t), i / (FPS * SUB));
  const png = await page.locator('#c').screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % (FPS * SUB) === 0) console.log(`rendered ${i / (FPS * SUB)}s / ${DUR}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('wrote', OUT);
