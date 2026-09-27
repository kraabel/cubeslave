// node stills.mjs --page showreel/index.html --times 0.4,1.2,2.2 --out out/stills.png [--cols 4] [--scale 0.25]
// Renders chosen moments straight from seek(t) and tiles them into one labelled contact sheet.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const argv = process.argv;
const str = (k, d) => { const i = argv.indexOf('--' + k); return i > 0 ? argv[i + 1] : d; };
const PAGE = resolve(str('page', 'index.html')), OUT = str('out', 'out/stills.png');
const TIMES = str('times', '0,1,2,3').split(',').map(Number), COLS = Number(str('cols', 4)), SC = Number(str('scale', 0.25));
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('file://' + PAGE);
await page.evaluate(() => window.ready || document.fonts.ready);
const shots = [];
for (const t of TIMES) { await page.evaluate((t) => window.seek(t), t); shots.push(await page.evaluate(() => document.getElementById('c').toDataURL('image/png'))); }
await page.evaluate(({ shots, times, cols, sc }) => new Promise(async (done) => {
  const imgs = await Promise.all(shots.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
  const w = imgs[0].width * sc, h = imgs[0].height * sc, rows = Math.ceil(imgs.length / cols);
  const c = document.createElement('canvas'); c.id = 'sheet'; c.width = w * cols; c.height = (h + 26) * rows;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => { const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 26);
    g.drawImage(im, x, y + 26, w, h); g.fillStyle = '#fff'; g.font = '16px monospace'; g.fillText(times[i].toFixed(2) + 's', x + 6, y + 18); });
  document.body.innerHTML = ''; document.body.appendChild(c); done();
}), { shots, times: TIMES, cols: COLS, sc: SC });
await page.locator('#sheet').screenshot({ path: OUT });
await browser.close();
console.log('wrote', OUT);
