const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', r => logs.push(`[reqfail] ${r.url()} ${r.failure() && r.failure().errorText}`));
  await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const vs = await page.evaluate(() => { const v = document.getElementById('film'); return { readyState: v.readyState, paused: v.paused, error: v.error && v.error.code, t: v.currentTime, dur: v.duration, settled: document.getElementById('top').classList.contains('settled') }; });
  console.log('video state', JSON.stringify(vs));
  await page.screenshot({ path: 'shots/01-hero-start.png' });
  if (!vs.settled) { await page.click('#skipBtn'); }
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'shots/02-hero-settled.png' });
  // hover a unit
  const poly = page.locator('#units polygon[data-id="2B"]');
  await poly.hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/03-hover.png' });
  await poly.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'shots/04-zoom.png' });
  await page.waitForTimeout(9000);
  const st = await page.evaluate(() => ({ loading: document.getElementById('loading').hidden, fail: document.getElementById('webglFail').hidden, canvas: !!document.querySelector('#gl canvas'), rooms: [...document.querySelectorAll('#rooms button')].map(b => b.textContent) }));
  console.log('tour state', JSON.stringify(st));
  await page.screenshot({ path: 'shots/05-tour-living.png' });
  for (const room of ['Balcony', 'Kitchen', 'Bedroom']) {
    await page.click(`#rooms button:has-text("${room}")`);
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `shots/06-tour-${room.toLowerCase()}.png` });
  }
  await page.click('#backBtn');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/07-back.png' });
  await page.evaluate(() => window.scrollTo(0, document.getElementById('residences').offsetTop - 40));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/08-residences.png' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/09-bottom.png' });
  // mobile
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const mp = await m.newPage();
  mp.on('pageerror', e => logs.push(`[m pageerror] ${e.message}`));
  await mp.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load' });
  await mp.waitForTimeout(1500);
  const sw = await mp.evaluate(() => document.documentElement.scrollWidth);
  console.log('mobile scrollWidth', sw);
  if (!(await mp.evaluate(() => document.getElementById('top').classList.contains('settled')))) await mp.click('#skipBtn');
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: 'shots/10-mobile-hero.png' });
  await mp.screenshot({ path: 'shots/11-mobile-full.png', fullPage: true });
  console.log(logs.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
