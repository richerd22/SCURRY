// SCURRY real-browser smoke test. CI-only Playwright, no in-game dependency.
// Serves the existing static main branch and checks WebGL + screenshot
// pose readiness, desktop map hotkey, mobile touch map, runtime errors.
// Not a substitute for a physical iPhone or visual acceptance.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.SCURRY_BASE_URL || 'http://127.0.0.1:8000';
const suite = process.env.SCURRY_TEST_MODE || 'all';
if (!['gameplay','visuals','all'].includes(suite))
  throw new RangeError('SCURRY_TEST_MODE must be gameplay, visuals, or all');
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
async function checkScene(pose, mobile = false, eye = 0.25) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1024, height: 720 },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const title = (mobile ? 'mobile-' : 'desktop-') + pose +
    (eye!==0.25 ? '-human-eye' : '');
  page.on('pageerror', e => faults.push(title + ': JS ' + (e.stack || e.message)));
  page.on('console', m => {
    if (m.type() === 'error') faults.push(title + ': console ' + m.text());
  });
  try {
    const url = base + '/?shot=' + encodeURIComponent(pose) + '&lowq=1&t=17.6' +
      '&eye=' + eye +
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
      assert.equal(await page.locator('#map-legend [data-transit="true"]').count(),3,
        'all three real MBTA station entrances must be on the park atlas');
      await page.locator('#map-guide-toggle').tap();
      assert.equal(await page.locator('#map-guide').isVisible(),true,
        'Field Notes must open in map panel');
      assert.equal(await page.locator('#map-guide [role="listitem"]').count(),14);
      await page.screenshot({path:out+'/'+title+'-field-notes.png'});
      await page.locator('#map-guide-toggle').tap();
      assert.equal(await page.locator('#map-canvas').isVisible(),true,
        'Field Notes must return to the atlas');
      await page.screenshot({ path: out + '/' + title + '-atlas.png' });
      await page.locator('#map-legend button').first().tap();
      assert.equal(await page.locator('#map-toggle').getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('#map-route').getAttribute('aria-hidden'),'false');
      assert.match(await page.locator('#map-route').innerText(),/garden bridge/i);
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
    const fleet=await page.evaluate(()=>window.__scurryQA.surveySwanFleet());
    assert.equal(fleet.length,3,'actual 3-boat fleet');
    for(const b of fleet){
      assert.equal(b.seats,5);assert.equal(b.backs,5);assert.equal(b.hulls,1);
      assert.equal(b.seatColor,0xa93529);assert.equal(b.hullColor,0x275a40);
      assert.equal(b.roofMeshCount,0);
      assert.ok(b.height>3&&b.height<4.5,'real swan head height '+b.height);
    }
    const lagoon=await page.evaluate(()=>window.__scurryQA.surveyGardenLagoon());
    assert.ok(lagoon.count>1600,'lagoon 3D water/island sampling density');
    assert.ok(lagoon.waterHits>250&&lagoon.islandHits>8,'island hole and lake sampled');
    assert.ok(lagoon.islandHeight>.18&&lagoon.islandSolids>=4,
      'real island tree, boulders, and walkable raised terrain required: '+JSON.stringify(lagoon));
    assert.ok(lagoon.drySamples>120&&lagoon.minDryMeshY>=-.001,
      'coarse real island terrain triangles dipped below waterline: '+JSON.stringify(lagoon));
    assert.equal(lagoon.mismatches,0,
      'painted lagoon vs real water triangles disagree: '+JSON.stringify(lagoon));
    const underpass=await page.evaluate(()=>window.__scurryQA.surveySwanBridgePassage());
    assert.ok(underpass.vertexCount>1800&&underpass.sweeps>90&&
      underpass.closeVertices>900,'insufficient real boat/underbridge vertex sweep: '+JSON.stringify(underpass));
    assert.ok(underpass.rayDiff<.015,'boat scan uses fake underside rather than true mesh: '+JSON.stringify(underpass));
    assert.ok(underpass.minMargin>=.15,
      'real rendered boat intersects physical arched bridge: '+JSON.stringify(underpass));
    assert.ok(underpass.routeMinBank>5,
      'full Swan Boat route is less than one hull length from physical bank: '+JSON.stringify(underpass));
    assert.ok(underpass.hullVertices>=5&&underpass.footprintProbes>20000&&
      underpass.actualHullMinBank>.35,
      'ACTUAL visible boat footprint touches an island or outside shore: '+JSON.stringify(underpass));
    console.log('GARDEN ACTUAL SWAN UNDERPASS AND HULL',
      JSON.stringify(underpass));
    const bridge=await page.evaluate(()=>window.__scurryQA.surveyGardenBridge());
    assert.equal(bridge.count,225,'bridge deck + both ramps at 75 × 3 positions');
    assert.ok(bridge.maxAbsDiff<.015,
      'real rendered bridge differs from registered support: '+JSON.stringify(bridge));
    assert.ok(bridge.maxSolverDiff<.015,
      'real player support disagrees with registered bridge: '+JSON.stringify(bridge));

    // Two complete crossings, both shores, using the *actual* player
    // movement solver and browser-held W/Shift. Goose logic is tested by
    // the normal game loop; this tight synchronous traversal isolates
    // player contact/support so a goose charge cannot conceal a bad ramp.
    for(const fromWest of [true,false]){
      const x=fromWest?-163:-101;
      const yaw=fromWest?-Math.PI/2:Math.PI/2;
      await page.evaluate(({x,yaw})=>
        window.__scurryQA.placeOnTerrain(x,0,yaw),{x,yaw});
      await page.keyboard.down('Shift');
      await page.keyboard.down('w');
      const crossing=await page.evaluate(()=>window.__scurryQA.traceTerrainWalk(1000));
      await page.keyboard.up('w');
      await page.keyboard.up('Shift');
      assert.ok(crossing.horizontalDistance>57,
        'physical bridge route blocked: '+JSON.stringify(crossing.end));
      assert.ok(fromWest?crossing.end.x>-104:crossing.end.x<-159,
        'squirrel failed to reach opposite dry shore: '+JSON.stringify(crossing.end));
      assert.ok(crossing.minClear>-.03&&crossing.minMeshClear>-.03,
        'feet clipped visible terrain while crossing: '+JSON.stringify(crossing));
      assert.ok(crossing.nonGround<80,
        'approach ramp launches squirrel into air: '+JSON.stringify(crossing));
      const onDeck=crossing.samples.filter(s=>s.x>-147&&s.x<-117);
      assert.ok(onDeck.length>8&&onDeck.every(s=>s.feet>1.07)&&
        onDeck.some(s=>s.feet>4.4),
        'squirrel did not walk to real 4.55m bridge crest: '+JSON.stringify(onDeck));
    }
    await page.evaluate(()=>window.__scurryQA.placeOnTerrain(24,30,-2.2));
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
    // A mouse click on MAP is interface interaction, never a squirrel BITE.
    await page.locator('#map-toggle').click();
    assert.equal(await page.locator('#map-toggle').getAttribute('aria-expanded'),'true');
    await page.locator('#map-close').click();
    assert.equal(await page.locator('#map-toggle').getAttribute('aria-expanded'),'false');
    assert.ok((await get()).biteCooldown < .01,'UI clicks must not fire bite');
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

    // Park crowd truth: night workers exist, but picnics/bench crowds/dogs
    // vanish in the middle of the night; noon restores the same pooled
    // actors without allocating new models or breaking E-prompt lifecycles.
    await page.evaluate(()=>window.__scurryQA.setTime(3));
    await page.waitForFunction(()=>{
      const p=window.__scurryQA.population();
      return p.picnics===0&&p.bench===0&&p.dogs===0&&p.nightWorker;
    },null,{timeout:30000,polling:100});
    const night=await page.evaluate(()=>window.__scurryQA.population());
    assert.equal(night.picnics,0,'3 AM must not have six unattended picnics');
    assert.equal(night.bench,0,'3 AM park benches must not be full of beg targets');
    assert.equal(night.dogs,0,'3 AM off-leash dog pack should be sleeping');
    assert.equal(night.nightWorker,true,'night-shift staff should be nearby');
    await page.evaluate(()=>window.__scurryQA.setTime(12));
    await page.waitForFunction(()=>{
      const p=window.__scurryQA.population();
      return p.picnics>=4&&p.bench>=9&&p.dogs>=4&&!p.nightWorker;
    },null,{timeout:30000,polling:100});
    const noon=await page.evaluate(()=>window.__scurryQA.population());
    assert.ok(noon.picnics>=4 && noon.bench>=9 && noon.dogs>=4,
      'daytime must restore real park actors: '+JSON.stringify(noon));
    assert.equal(noon.nightWorker,false);

    // Real-keyboard MBTA flow: enter Park Street from the Common, inspect
    // separate subway realm, hide under bench and meet a harmless staff
    // shooing. Check the alternate burrow-market connection both ways.
    assert.match(await choose('enter PARK STREET station'),/PARK STREET/i);
    await page.keyboard.press('e');
    await page.waitForFunction(()=>window.__scurryQA.state().inMBTA,null,{timeout:8000});
    let transit=await get();
    assert.equal(transit.inBurrow,false,'street entrance is not a rat hole');
    assert.ok(Math.abs(transit.pos.y-transit.floor)<.1,'MBTA floor must be supported');
    assert.equal(await page.evaluate(()=>window.__scurryQA.mbta().inMBTA),true);
    assert.match(await choose('hide beneath the station bench'),/hide beneath/i);
    await page.keyboard.press('e');
    assert.equal(await page.evaluate(()=>window.__scurryQA.mbta().hidden),true);
    assert.match(await choose('come out from under the bench'),/come out/i);
    await page.keyboard.press('e');
    assert.equal(await page.evaluate(()=>window.__scurryQA.mbta().hidden),false);
    // Fast-forward *the real updateMBTA simulation* in localhost QA,
    // not its relocation action. SwiftShader can render only ~1fps.
    await page.evaluate(()=>window.__scurryQA.advanceMBTA(3.6));
    await page.evaluate(()=>window.__scurryQA.place(8000+76,0,-8000+0));
    await page.evaluate(()=>window.__scurryQA.advanceMBTA(2.5));
    await page.waitForFunction(()=>!window.__scurryQA.state().inMBTA,
      null,{timeout:10000,polling:120});
    const escorted=await get();
    assert.ok(escorted.grounded&&!escorted.inBurrow);
    assert.ok(Math.abs(escorted.pos.y-escorted.floor)<.1);
    // At the moment of dismissal the portal cooldown prevents immediately
    // re-entering. Exercise the old burrow entry first while it expires.
    assert.match(await choose('dive into the burrow'),/burrow/i);
    await page.keyboard.press('e');
    await page.waitForFunction(()=>window.__scurryQA.state().inBurrow,
      null,{timeout:8000});
    await page.evaluate(()=>window.__scurryQA.advanceMBTA(3.6));
    await page.waitForFunction(()=>
      window.__scurryQA.wildlife().filter(a=>a.underground&&a.visible).length>2,
      null,{timeout:30000,polling:200});
    const beforeResidents=await page.evaluate(()=>window.__scurryQA.wildlife()
      .filter(a=>a.underground&&a.visible));
    assert.ok(beforeResidents.length>2,'shared underground must have living NPCs');
    assert.match(await choose('take the rat passage'),/rat passage/i);
    await page.keyboard.press('e');
    await page.waitForFunction(()=>window.__scurryQA.state().inMBTA,
      null,{timeout:8000});
    assert.equal((await get()).inBurrow,false);
    await page.evaluate(()=>window.__scurryQA.advanceMBTA(3.6));
    assert.match(await choose('return to the rat market'),/rat market/i);
    await page.keyboard.press('e');
    await page.waitForFunction(()=>window.__scurryQA.state().inBurrow,
      null,{timeout:8000});
    assert.ok(Math.abs((await get()).pos.y)<.05,
      'MBTA to rat market must land precisely on the tunnel floor');
    assert.match(await choose('pop back up'),/pop back up/i);
    await page.keyboard.press('e');
    await page.waitForFunction(()=>!window.__scurryQA.state().inBurrow,
      null,{timeout:8000});

    // The real dock and real E prompt must mount the actual moving boat;
    // peeking/hiding and safe landing also run through E, not direct
    // internal action calls. Local QA only fast-forwards the tour clock.
    await page.evaluate(()=>window.__scurryQA.place(-140.5,.45,47.9));
    assert.match((await get()).prompt,/sneak aboard the Swan Boat/i);
    await page.keyboard.press('e');
    await page.waitForFunction(()=>window.__scurryQA.state().onSwanBoat,
      null,{timeout:5000});
    const aboard0=await get();
    assert.equal(aboard0.swan.stage,'moving');
    assert.equal(aboard0.swan.hidden,true);
    await page.evaluate(()=>window.__scurryQA.advanceSwanRide(2));
    const aboard1=await get();
    assert.ok(Math.hypot(aboard1.pos.x-aboard0.pos.x,
      aboard1.pos.z-aboard0.pos.z)>.15,
      'stowaway must travel with an actually moving boat');
    assert.ok(aboard1.pos.y>.65,'feet ride above the water, not below the lagoon');
    await page.keyboard.press('e');
    assert.equal((await get()).swan.hidden,false,'E peeks over the boat benches');
    await page.keyboard.press('e');
    assert.equal((await get()).swan.hidden,true,'E hides from operator again');
    assert.equal(await page.evaluate(()=>window.__scurryQA.finishSwanRide()),true);
    assert.equal((await get()).swan.stage,'docked');
    await page.keyboard.press('e');
    assert.equal((await get()).onSwanBoat,false,'E returns to the real dock');
    assert.ok(Math.abs((await get()).pos.y-.45)<.01,
      'boat exit must meet existing dock physics deck');

    // New historical Garden E actions must be reachable just outside the
    // corresponding real colliders, not floating off by the old monument.
    await page.evaluate(()=>window.__scurryQA.placeOnTerrain(-81.8,-80,0));
    await page.waitForFunction(()=>/count the Ducklings/i.test(
      window.__scurryQA.state().prompt||''),null,{timeout:30000,polling:200});
    await page.keyboard.press('e');
    await page.evaluate(()=>window.__scurryQA.placeOnTerrain(-188,0,0));
    await page.waitForFunction(()=>/inspect Washington statue/i.test(
      window.__scurryQA.state().prompt||''),null,{timeout:30000,polling:200});
    await page.keyboard.press('e');

    // At least one real squirrel interaction is rendered and keyboard
    // reachable; the same E handler handles passengers and wildlife.
    // A burrow squirrel is not a surface squirrel. Start beside an
    // authored surface resident, then wait for the real updateWildlife
    // tick to make that realm visible before testing the actual E prompt.
    const resident=await page.evaluate(()=>window.__scurryQA.wildlife()
      .find(a=>a.kind==='squirrel'&&!a.underground));
    assert.ok(resident,'a surface squirrel must exist');
    await page.evaluate(a=>window.__scurryQA.place(a.x,a.y,a.z),resident);
    await page.waitForFunction(()=>window.__scurryQA.wildlife().some(a=>
      a.kind==='squirrel'&&!a.underground&&a.visible&&
      Math.hypot(a.x-window.__scurryQA.state().pos.x,
        a.z-window.__scurryQA.state().pos.z)<2),
      null,{timeout:30000,polling:200});
    const critter=await page.evaluate(()=>window.__scurryQA.wildlife()
      .find(a=>a.kind==='squirrel'&&!a.underground&&a.visible&&
        Math.hypot(a.x-window.__scurryQA.state().pos.x,
          a.z-window.__scurryQA.state().pos.z)<2));
    assert.ok(critter,'living surface squirrel must appear after real update');
    await page.evaluate(a=>window.__scurryQA.place(a.x,a.y,a.z),critter);
    await page.waitForFunction(()=>/chatter with squirrel|share your food with squirrel/i
      .test(window.__scurryQA.state().prompt||''),
      null,{timeout:30000,polling:200});
    await page.keyboard.press('e');

    // Independent *rendered* sidewalk wedge parity, not merely shared
    // formula agreement between the layout and platform collision.
    const curbs=await page.evaluate(()=>window.__scurryQA.surveySidewalkSurfaces());
    writeFileSync(out+'/sidewalk-visual-collision.json',JSON.stringify(curbs,null,2));
    assert.equal(curbs.count,168,'full Charles Street sidewalk visual sample grid');
    assert.ok(curbs.maxAbsDiff<.005,
      'concrete mesh not aligned to actual player support: '+JSON.stringify(curbs.worst));
    console.log('CURB VISUAL PARITY '+JSON.stringify(curbs));
    // World-wide independent mesh-vs-ground survey before actual movement:
    // 651 spatial points detect a miss between collision math and the
    // triangulated terrain even where no chosen path happened to go.
    const survey=await page.evaluate(()=>window.__scurryQA.surveyGroundTriangles());
    writeFileSync(out+'/terrain-triangle-survey.json',JSON.stringify(survey,null,2));
    assert.equal(survey.count,651);
    assert.equal(survey.negative,0,'world-wide feet sample below visible mesh');
    assert.ok(survey.min>=-.015,'terrain math below mesh '+JSON.stringify(survey.worstLow));
    assert.ok(survey.max<=.2,'terrain collision sits far above visible mesh '+JSON.stringify(survey.worstHigh));
    console.log('TERRAIN SURVEY '+JSON.stringify(survey));
    // Continuous open-world traversals. Real keyboard W is held through
    // the actual player movement substeps, not simulated by teleporting
    // between samples. Raycast against the REAL Three.js terrain triangles.
    const routes=[
      ['Common Mall',-18,-18,-Math.PI/2,620],
      ['Garden north path',-188,-70,-Math.PI/2,620],
      ['Frog Pond south path',66,42,-Math.PI/2,620],
      ['Charles St Garden gate',-48,-66,Math.PI/2,470],
      ['State House grade',170,-85,Math.PI/2,680],
      // Reverse-direction travel catches path-side and slope contact cases
      // that a single west/east route cannot exercise.
      ['Mall reverse',156,-18,Math.PI/2,500],
      ['Common north fence run',-24,-94,-Math.PI/2,580],
      ['Common south fence run',-14,94,-Math.PI/2,580],
      ['Common east spine',158,76,0,560],
      ['Common central spine',60,72,0,560],
      ['Garden bridge south approach',-132,72,0,330],
      ['Garden south lagoon loop',-180,34,0,310],
    ];
    const traversals=[];
    for(const [name,x,z,yaw,steps] of routes){
      await page.evaluate(a=>window.__scurryQA.placeOnTerrain(a.x,a.z,a.yaw),{x,z,yaw});
      await page.keyboard.down('w');
      const walk=await page.evaluate(steps=>window.__scurryQA.traceTerrainWalk(steps),steps);
      await page.keyboard.up('w');
      traversals.push({name,...walk});
      // Persist BEFORE assertions: a failing walk still leaves its exact
      // world-coordinate trace in the uploaded failure artifact.
      writeFileSync(out+'/terrain-traversal.json',JSON.stringify(traversals,null,2));
      assert.ok(walk.horizontalDistance>1, name+' player must move through world');
      assert.ok(walk.minClear>=-.03, name+' feet penetrated support '+walk.minClear);
      assert.ok(walk.minMeshClear>=-.03,name+' feet under rendered mesh '+walk.minMeshClear);
      assert.ok(walk.penetrations===0,name+' had terrain penetrations');
      assert.ok(walk.nonGround<steps*.02,name+' left terrain while walking: '+walk.nonGround);
      if(name==='Charles St Garden gate')
        assert.ok(walk.maxStepY<.05,
          'curb transition snapped vertically in one 90Hz frame: '+walk.maxStepY);
      assert.equal(walk.climbs,0,name+' unintentionally grabbed a tree');
      console.log('TERRAIN '+name+' '+JSON.stringify({metres:+walk.horizontalDistance.toFixed(1),
        minClear:+walk.minClear.toFixed(4),minMeshClear:+walk.minMeshClear.toFixed(4),
        maxStepY:+walk.maxStepY.toFixed(4),airborne:walk.nonGround,meshSamples:walk.meshSamples}));
    }
    // Elevated topology is part of the same ground-clipping complaint:
    // check real canopy/bridge/fence registries with the same solver.
    const targets=await page.evaluate(()=>window.__scurryQA.supportTargets());
    for(const target of targets){
      await page.evaluate(t=>window.__scurryQA.place(t.x,t.y,t.z,t.yaw),target);
      await page.keyboard.down('w');
      const walk=await page.evaluate(n=>window.__scurryQA.traceTerrainWalk(n),target.steps);
      await page.keyboard.up('w');
      traversals.push({name:target.name,kind:'elevated',...walk});
      writeFileSync(out+'/terrain-traversal.json',JSON.stringify(traversals,null,2));
      assert.ok(walk.horizontalDistance>.1,target.name+' was stuck');
      assert.ok(walk.minMeshClear>=-.03,target.name+' clipped below terrain mesh');
      assert.equal(walk.penetrations,0,target.name+' penetrated ground');
      assert.equal(walk.nonGround,0,target.name+' lost its registered walk surface');
      assert.equal(walk.climbs,0,target.name+' unexpectedly reentered climbing');
      assert.ok(Math.abs(walk.end.y-target.y)<.25,
        target.name+' height popped off its registered support: '+walk.end.y);
      console.log('ELEVATED '+target.name+' '+JSON.stringify({metres:+walk.horizontalDistance.toFixed(2),
        minMeshClear:+walk.minMeshClear.toFixed(3),ungrounded:walk.nonGround}));
    }
    writeFileSync(out+'/terrain-traversal.json',JSON.stringify(traversals,null,2));
    // Actual climb-controller adversarial case: with no elevated support,
    // reaching canopy height must NOT snap all the way down to the lawn.
    const missingCanopy=await page.evaluate(()=>window.__scurryQA.probeMissingCanopy());
    assert.ok(missingCanopy.climbing&&!missingCanopy.grounded,
      'missing canopy must leave squirrel attached, not falsely grounded');
    assert.ok(missingCanopy.feetY>7,
      'missing canopy must never teleport a 7m climber to 0m lawn');
    // Actual shared fade code, not just relocation.js pure state tests.
    const transitions = await page.evaluate(() => [
      window.__scurryQA.tryRelocation(), window.__scurryQA.tryRelocation()
    ]);
    assert.deepEqual(transitions,[true,false], 'two catches may not start two teleports');
    assert.equal((await get()).relocating,true);
    await page.waitForFunction(() => !window.__scurryQA.state().relocating,
      null,{timeout:15000,polling:100});
    const landing = await get();
    assert.ok(landing.grounded && Math.abs(landing.pos.y-landing.floor)<.1,
      'single catch must land on visible supported terrain');
    assert.ok(landing.catchGrace>0, 'landing must grant catch immunity');
    assert.equal(await page.evaluate(() => window.__scurryQA.tryRelocation()),false,
      'landing grace must refuse immediate catch');
    results.push({title,status:'PASS',routes:'walk/jump/pause + four destinations + five lawn paths + three elevated supports + relocation'});
    await page.screenshot({path:out+'/'+title+'.png'});
    console.log(title+': PASS walk, jump, pause, burrow and destination return routes');
  } catch(e) {
    faults.push(title+': '+(e.stack||e));
    results.push({title,status:'FAIL'});
    try { await page.screenshot({path:out+'/'+title+'-failure.png'}); } catch {}
  } finally { await context.close(); }
}


// Live mobile scenario (not a debug screenshot): actual pointer handlers,
// real animation/physics, and E-equivalent ACT portal transitions.
async function checkTouchGameplay() {
  const context = await browser.newContext({
    viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,
  });
  const page = await context.newPage();
  const title='mobile-live-play';
  page.on('pageerror', e => faults.push(title+': JS '+(e.stack||e.message)));
  page.on('console', m => {if(m.type()==='error')faults.push(title+': console '+m.text());});
  const get=()=>page.evaluate(()=>window.__scurryQA.state());
  try {
    const response=await page.goto(base+'/?qa=1&lowq=1&touch=1',
      {waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response?.status(),200);
    await page.waitForFunction(()=>!!window.__scurryQA&&!!document.getElementById('stick-base'),
      null,{timeout:120000});
    assert.equal((await get()).started,false,'mobile title must wait for a tap');
    await page.locator('#title').tap();
    await page.waitForFunction(()=>window.__scurryQA.state().started,null,{timeout:15000});
    const start=await get();
    // Keep touch #41 held while triggering touch #42 on JUMP.
    await page.evaluate(()=>{
      const base=document.getElementById('stick-base'),r=base.getBoundingClientRect();
      const x=r.left+r.width/2,y=r.top+r.height/2-38;
      base.dispatchEvent(new PointerEvent('pointerdown',{
        bubbles:true,cancelable:true,pointerType:'touch',pointerId:41,isPrimary:true,clientX:x,clientY:y
      }));
    });
    await page.waitForFunction(()=>window.__scurryQA.state().touch.y < -.4,null,
      {timeout:8000});
    await page.waitForFunction(begin=>{
      const p=window.__scurryQA.state().pos;
      return Math.hypot(p.x-begin.x,p.z-begin.z)>.15;
    },start.pos,{timeout:20000,polling:150});
    const beforeJump=await get();
    await page.evaluate(()=>{
      const btn=document.getElementById('btn-jump'),r=btn.getBoundingClientRect();
      btn.dispatchEvent(new PointerEvent('pointerdown',{
        bubbles:true,cancelable:true,pointerType:'touch',pointerId:42,isPrimary:false,
        clientX:r.left+r.width/2,clientY:r.top+r.height/2
      }));
    });
    await page.waitForFunction(y=>window.__scurryQA.state().pos.y>y+.04,
      beforeJump.pos.y,{timeout:12000,polling:150});
    await page.evaluate(()=>{
      window.dispatchEvent(new PointerEvent('pointerup',{
        bubbles:true,pointerType:'touch',pointerId:41
      }));
      document.getElementById('btn-jump').dispatchEvent(new PointerEvent('pointerup',{
        bubbles:true,pointerType:'touch',pointerId:42
      }));
    });
    await page.waitForFunction(()=>{
      const t=window.__scurryQA.state().touch;
      return Math.abs(t.x)<.001&&Math.abs(t.y)<.001;
    },null,{timeout:8000});
    // A second pointer looking on the right must change yaw without stick.
    const originalYaw=(await get()).yaw;
    await page.evaluate(()=>{
      const zone=document.getElementById('lookzone');
      const x=innerWidth*.78,y=innerHeight*.46;
      zone.dispatchEvent(new PointerEvent('pointerdown',{
        bubbles:true,cancelable:true,pointerType:'touch',pointerId:43,
        clientX:x,clientY:y
      }));
      window.dispatchEvent(new PointerEvent('pointermove',{
        bubbles:true,cancelable:true,pointerType:'touch',pointerId:43,
        clientX:x+90,clientY:y+12
      }));
      window.dispatchEvent(new PointerEvent('pointerup',{
        bubbles:true,pointerType:'touch',pointerId:43
      }));
    });
    assert.ok(Math.abs((await get()).yaw-originalYaw)>.2,
      'mobile look-zone drag must rotate camera');
    await page.locator('#btn-sprint').tap();
    assert.equal((await get()).touch.sprint,true,'sprint toggles on');
    await page.locator('#btn-sprint').tap();
    assert.equal((await get()).touch.sprint,false,'sprint toggles off');
    // Positioning is QA-only; entering burrow must still use ACT's
    // pointerdown callback as the real phone UI would.
    const prompt=await page.evaluate(()=>{
      const it=window.__scurryQA.interactions().find(item=>
        item.label.includes('dive into the burrow'));
      if(!it)throw Error('no surface burrow entrance registered');
      window.__scurryQA.place(it.x,it.y,it.z);
      return window.__scurryQA.state().prompt;
    });
    assert.match(prompt,/burrow/i);
    await page.locator('#btn-act').tap();
    await page.waitForFunction(()=>window.__scurryQA.state().inBurrow,
      null,{timeout:10000});
    assert.equal((await get()).inBurrow,true);
    await page.waitForFunction(()=>{
      try{ return JSON.parse(localStorage.getItem('scurry-field-notes-v1'))?.ids?.includes('burrows'); }
      catch{return false;}
    },null,{timeout:15000});
    await page.screenshot({path:out+'/'+title+'.png'});
    // Reload is essential: a passed in-memory Set alone does not prove
    // persistence. The same browser context must restore discovered ids.
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>!!window.__scurryQA,null,{timeout:120000});
    await page.locator('#title').tap();
    await page.locator('#map-toggle').tap();
    await page.locator('#map-guide-toggle').tap();
    const saved=page.locator('#map-guide [data-note-id="burrows"]');
    assert.equal(await saved.getAttribute('data-found'),'true',
      'Field Notes burrow discovery must survive a full reload');
    await page.screenshot({path:out+'/'+title+'-saved-notes.png'});
    await page.locator('#map-guide-toggle').tap();
    await page.evaluate(() => window.__scurryQA.place(140,0,42));
    await page.waitForFunction(() => {
      try { return JSON.parse(localStorage.getItem('scurry-field-notes-v1'))?.ids?.includes('bandstand'); }
      catch { return false; }
    },null,{timeout:15000});
    await page.waitForFunction(() => document.querySelector(
      '#map-legend [data-note-id="bandstand"]')?.dataset.found==='true',
      null,{timeout:10000});
    assert.match(await page.locator('#map-legend [data-note-id="bandstand"]')
      .getAttribute('aria-label'),/visited/i);
    await page.screenshot({path:out+'/'+title+'-visited-atlas.png'});
    results.push({title,status:'PASS',
      routes:'live joystick + simultaneous jump + look + sprint + ACT burrow + persisted notes'});
    console.log(title+': PASS joystick, dual-touch jump, look, sprint, ACT portal');
  } catch(e) {
    faults.push(title+': '+(e.stack||e));
    results.push({title,status:'FAIL'});
    try{await page.screenshot({path:out+'/'+title+'-failure.png'});}catch{}
  } finally {await context.close();}
}

try {
  // Each CI worker is independent: one performs actual gameplay, the other
  // renders visual references. The default all still runs both in one call.
  if (suite==='all'||suite==='gameplay') {
    await checkGameplay();
    await checkTouchGameplay();
  }
  if (suite==='all'||suite==='visuals') {
    await checkScene('spawn');
    await checkScene('garden');
    await checkScene('gardenisland');
    await checkScene('swanunderpass');
    // These are separate from the physics raycast: preserve visual
    // evidence of the correctly oriented crossing and dry south dock.
    await checkScene('bridge');
    await checkScene('swanclose');
    await checkScene('geese');
    await checkScene('charles');
    await checkScene('charles',false,1.7);
    await checkScene('spawn',true);
  }
} finally {
  await browser.close();
}
writeFileSync(out + '/report.json', JSON.stringify({ suite,results,faults }, null, 2));
if (faults.length) {
  console.error('SCURRY '+suite+' browser smoke FAILED:\n' + faults.join('\n\n'));
  process.exitCode = 1;
} else console.log('SCURRY '+suite+' browser smoke passed.');
