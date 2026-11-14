const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 700 } });
  p.on('pageerror', e => console.log('err', e.message));
  await p.goto('http://127.0.0.1:8765/pano.html'); await p.waitForFunction(() => window.ready, null, { timeout: 30000 });
  for (const [name, yaw, pitch] of [['east', 90, 0], ['south-sofa', 180, -5], ['west-kitchen', -90, 0], ['down', 180, -60]]) { await p.evaluate(([y, pt]) => window.look(y, pt), [yaw, pitch]); await p.waitForTimeout(300); await p.screenshot({ path: `shots/pano-${name}.png` }); }
  await b.close();
})();
