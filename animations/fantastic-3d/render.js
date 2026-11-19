// Renders animations/fantastic/index.html to PNG frames.
// Usage: node render.js [outDir] [t1,t2,...]   (times given → only those stills)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'build', 'frames'));
  const stills = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?capture');
  await page.evaluate(() => window.__anim.ready);

  const { duration, fps } = await page.evaluate(() => ({ duration: window.__anim.duration, fps: window.__anim.fps }));
  const times = stills || Array.from({ length: Math.round(duration * fps) }, (_, i) => i / fps);

  for (let i = 0; i < times.length; i++) {
    const dataUrl = await page.evaluate(t => { window.__anim.render(t); return document.getElementById('c').toDataURL('image/png'); }, times[i]);
    const name = stills ? `still_${times[i].toFixed(2)}.png` : `f_${String(i).padStart(4, '0')}.png`;
    fs.writeFileSync(path.join(outDir, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  await browser.close();
  console.log(`wrote ${times.length} frame(s) to ${outDir}`);
})();
