const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const htmlPath = path.join(__dirname, 'tabela-precos.html');
  const pdfPath = path.join(__dirname, 'tabela-precos.pdf');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();
  console.log('PDF salvo em ' + pdfPath);
})();
