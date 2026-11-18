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
      assert.ok(await page.locator('#map-legend button').count() >= 6,
        'numbered landmark legend must be visible on the phone');
      await page.screenshot({ path: out + '/' + title + '-atlas.png' });
      await page.locator('#map-legend button').first().tap();
      assert.equal(await page.locator('#map-toggle').getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('#map-route').getAttribute('aria-hidden'),'false');
      assert.match(await page.locator('#map-route').innerText(),/GARDEN BRIDGE/);
      await page.locator('#map-route').tap();
      assert.equal(await page.locator('#map-route').getAttribute('aria-hidden'),'true');
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

// Unlike screenshot poses, this scenario clicks PLAY and drives the live
// squirrel with real keyboard input. Local-only QA data gives a stable
// assertion surface without exposing player coordinates in production.
async function checkGameplay() {
  const context = await browser.newContext({viewport:{width:800,height:560}});
  const page = await context.newPage();
  const title = 'desktop-live-play';
  page.on('pageerror', e => faults.push(title + ': JS ' + (e.stack || e.message)));
  page.on('console', m => { if (m.type() === 'error') faults.push(title + ': console ' + m.text()); });
  const get = () => page.evaluate(() => window.__scurryQA.state());
  try {
    const response = await page.goto(base + '/?qa=1&lowq=1&nolock=1', {waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response?.status(),200);
    await page.waitForFunction(() => !!window.__scurryQA && !!window.__scurryQA.state().pos,
      null,{timeout:120000});
    assert.equal((await get()).started,false,'title should not auto-play');
    await page.locator('#title').click({timeout:30000});
    await page.waitForFunction(() => window.__scurryQA.state().started, null, {timeout:15000});
    const start = await get();
    await page.keyboard.down('w');
    await page.waitForFunction(initial => {
      const p=window.__scurryQA.state().pos;
      return Math.hypot(p.x-initial.x,p.z-initial.z)>0.12;
    },start.pos,{timeout:18000,polling:200});
    await page.keyboard.up('w');
    const afterWalk=await get();
    assert.ok(afterWalk.started&&!afterWalk.paused,'must remain in live play');
    // Explicit fallback mode: no pointer lock, but ordinary mouse dragging
    // must rotate the live squirrel camera (without causing a bite).
    await page.mouse.move(260,250);
    const yawBefore=(await get()).yaw;
    await page.mouse.down();
    await page.mouse.move(370,255,{steps:5});
    await page.mouse.up();
    const yawAfter=(await get()).yaw;
    assert.ok(Math.abs(yawAfter-yawBefore)>.1,'desktop mouse-drag fallback must rotate camera');
    // On a low-FPS software renderer a press-and-release in one browser
    // event task could be over before the next physics frame sees Space.
    await page.keyboard.down('Space');
    await page.waitForFunction(initialY => window.__scurryQA.state().pos.y>initialY+.04,
      afterWalk.pos.y,{timeout:10000,polling:100});
    await page.keyboard.up('Space');

    // A held movement key must be discarded on pause/resume even when its
    // physical keyup was never delivered to the game.
    await page.keyboard.down('w');
    await page.evaluate(() => window.__scurryQA.suspend());
    assert.equal((await get()).paused,true);
    assert.equal((await get()).audioPaused,true,'pause must silence procedural audio');
    await page.locator('#pause').click();
    assert.equal((await get()).paused,false);
    assert.equal((await get()).audioPaused,false,'resume must unpause audio');
    const resumed=await get();
    await page.waitForTimeout(650);
    const stopped=await get();
    assert.ok(Math.hypot(stopped.pos.x-resumed.pos.x,stopped.pos.z-resumed.pos.z)<.16,
      'pause must clear W instead of moving the squirrel after resume');
    await page.keyboard.up('w');

    // Portal transit uses the actual E handler and the live interactable
    // registry. QA may position feet, but never calls enterBurrow directly.
    const choose=async term => page.evaluate(term => {
      const item=window.__scurryQA.interactions().find(i=>i.label.includes(term));
      if(!item)throw Error('Missing interaction '+term);
      window.__scurryQA.place(item.x,item.y,item.z);
      return window.__scurryQA.state().prompt;
    },term);
    assert.match(await choose('dive into the burrow'), /burrow/i);
    await page.keyboard.press('e');
    await page.waitForFunction(() => window.__scurryQA.state().inBurrow, null,{timeout:10000});
    assert.ok((await get()).grounded,'burrow arrival should be grounded');
    assert.match(await choose('pop back up'), /pop back up/i);
    await page.keyboard.press('e');
    await page.waitForFunction(() => !window.__scurryQA.state().inBurrow,null,{timeout:10000});
    assert.ok((await get()).grounded,'surface return must be grounded');

    // Every off-map destination must be reachable through its burrow door.
    for (const [entry,flag] of [
      ['long west run','inFenway'],['north run','inGarden'],
      ['east run','inCityHall'],['river run','inEsplanade']]) {
      await choose('dive into the burrow');
      await page.keyboard.press('e');
      await page.waitForFunction(() => window.__scurryQA.state().inBurrow,null,{timeout:10000});
      assert.match(await choose(entry), /run/i);
      await page.keyboard.press('e');
      await page.waitForFunction(flag => window.__scurryQA.state()[flag],flag,{timeout:10000});
      const destination=await get();
      assert.ok(destination.grounded,'arrival at '+flag+' must be grounded');
      assert.ok(Math.abs(destination.pos.y-destination.floor)<.1,
        'portal feet must meet sampled floor in '+flag+': '+JSON.stringify(destination));
      assert.ok(!destination.inBurrow,'portal must leave burrow');
      assert.match(await choose('dive back to the burrows'), /burrow/i);
      await page.keyboard.press('e');
      await page.waitForFunction(() => window.__scurryQA.state().inBurrow,null,{timeout:10000});
      // Return to surface, then re-enter normally for the next route.
      assert.match(await choose('pop back up'), /pop back up/i);
      await page.keyboard.press('e');
      await page.waitForFunction(() => !window.__scurryQA.state().inBurrow,null,{timeout:10000});
    }
    results.push({title,status:'PASS',routes:'walk/jump/mouse-drag/pause + burrow + four destinations'});
    await page.screenshot({path:out+'/'+title+'.png'});
    console.log(title+': PASS walk, jump, pause, burrow and destination return routes');
  } catch(e) {
    faults.push(title+': '+(e.stack||e));
    results.push({title,status:'FAIL'});
    try { await page.screenshot({path:out+'/'+title+'-failure.png'}); } catch {}
  } finally { await context.close(); }
}

try {
  await checkScene('spawn');
  await checkScene('garden');
  await checkScene('spawn', true);
  await checkGameplay();
} finally {
  await browser.close();
}
writeFileSync(out + '/report.json', JSON.stringify({ results, faults }, null, 2));
if (faults.length) {
  console.error('SCURRY browser smoke FAILED:\n' + faults.join('\n\n'));
  process.exitCode = 1;
} else console.log('SCURRY browser smoke: desktop/mobile poses and live route checks passed; screenshots archived.');
