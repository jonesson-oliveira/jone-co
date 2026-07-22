const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = path.resolve(__dirname, 'instagram');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.goto('file://' + path.resolve(__dirname, 'carrossel.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);

  const slides = await page.$$('.slide');
  for (let i = 0; i < slides.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    await slides[i].screenshot({ path: path.join(outDir, `slide-${num}.png`) });
  }

  await browser.close();
  console.log(`Renderizado ${slides.length} slides em instagram/`);
})();
