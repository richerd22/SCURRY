// SCURRY real-browser smoke test. CI-only Playwright, no in-game dependency.
// Serves the existing static main branch and checks WebGL + screenshot
// pose readiness, desktop map hotkey, mobile touch map, runtime errors.
// Not a substitute for a physical iPhone or visual acceptance.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.SCURRY_BASE_URL || 'http://127.0.0.1:8000';
const out = '.ci/browser-smoke';
mkdirSync(out, { recursive: true });
const faults = [];
const results = [];
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ],
});
async function checkScene(pose, mobile = false) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1024, height: 720 },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const title = (mobile ? 'mobile-' : 'desktop-') + pose;
  page.on('pageerror', e => faults.push(title + ': JS ' + (e.stack || e.message)));
  page.on('console', m => {
    if (m.type() === 'error') faults.push(title + ': console ' + m.text());
  });
  try {
    const url = base + '/?shot=' + encodeURIComponent(pose) + '&lowq=1&t=17.6' +
      (mobile ? '&touch=1' : '');
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response?.status(), 200, title + ': static page must load');
    await page.waitForFunction(() => window.__scurryReady === true, null,
      { timeout: 120000, polling: 400 });
    const info = await page.evaluate(() => {
      const canvas = document.querySelector('#app canvas');
      let context = null;
      try { context = canvas?.getContext('webgl2') || canvas?.getContext('webgl'); }
      catch { /* surface missing is a test failure below */ }
      const version = document.querySelector('meta[name="scurry-version"]')?.content;
      return {
        canvas: !!canvas, webgl: !!context,
        width: canvas?.width, height: canvas?.height,
        hud: !!document.getElementById('hud-stash'),
        version,
        map: !!document.getElementById('map-panel'),
        touch: getComputedStyle(document.getElementById('touchui')).display !== 'none',
      };
    });
    assert.ok(info.canvas && info.webgl, title + ': missing WebGL canvas');
    assert.ok(info.width > 0 && info.height > 0, title + ': invalid drawing buffer');
    assert.ok(info.hud && info.map && info.version, title + ': HUD/map or version missing');
    assert.equal(info.touch, mobile, title + ': touch controls do not match device');
    await page.screenshot({ path: out + '/' + title + '.png', animations: 'disabled' });
    if (mobile) {
      await page.locator('#map-toggle').tap();
      assert.equal(await page.locator('#map-toggle').getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator('#map-panel').getAttribute('aria-hidden'), 'false');
      await page.screenshot({ path: out + '/' + title + '-atlas.png' });
    } else {
      await page.keyboard.press('KeyG');
      assert.equal(await page.locator('#map-toggle').getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('KeyG');
      assert.equal(await page.locator('#map-toggle').getAttribute('aria-expanded'), 'false');
    }
    results.push({ title, status: 'PASS', ...info });
    console.log(title + ': PASS ' + JSON.stringify(info));
  } catch (error) {
    faults.push(title + ': ' + (error.stack || error));
    results.push({ title, status: 'FAIL' });
    try { await page.screenshot({ path: out + '/' + title + '-failure.png' }); }
    catch { /* no screenshot possible after an unavailable page */ }
  } finally {
    await context.close();
  }
}
try {
  await checkScene('spawn');
  await checkScene('garden');
  await checkScene('spawn', true);
} finally {
  await browser.close();
}
writeFileSync(out + '/report.json', JSON.stringify({ results, faults }, null, 2));
if (faults.length) {
  console.error('SCURRY browser smoke FAILED:\n' + faults.join('\n\n'));
  process.exitCode = 1;
} else console.log('SCURRY browser smoke: all three scenes passed; screenshots archived.');
