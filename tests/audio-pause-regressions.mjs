import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/audio.js',import.meta.url),'utf8');
test('WebAudio lifecycle: pause suspends and resume reuses a single context',async()=>{
  const priorWindow=globalThis.window,priorTimeout=globalThis.setTimeout;
  let built=0,ctx;
  class FakeAudio{
    constructor(){this.state='running';this.destination={};built++;ctx=this;}
    createGain(){return {gain:{value:0},connect(){}};}
    suspend(){this.state='suspended';return Promise.resolve();}
    resume(){this.state='running';return Promise.resolve();}
  }
  try{
    globalThis.window={AudioContext:FakeAudio};
    globalThis.setTimeout=()=>42;
    const mod=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
    mod.setGameAudioPaused(true);
    assert.equal(mod.isGameAudioPaused(),true);
    mod.initAudio();
    assert.equal(ctx.state,'suspended');
    mod.sfx.boop(); // no oscillator needed while paused
    mod.setMuted(true);
    mod.setGameAudioPaused(false);
    assert.equal(ctx.state,'running');
    assert.equal(mod.isMuted(),true);
    mod.initAudio();
    assert.equal(built,1,'reuse context on every resume');
    mod.setGameAudioPaused(true);
    assert.equal(ctx.state,'suspended');
  }finally{
    if(priorWindow===undefined)delete globalThis.window;else globalThis.window=priorWindow;
    globalThis.setTimeout=priorTimeout;
  }
});
test('pause before any WebAudio user gesture is safe',async()=>{
  const mod=await import('data:text/javascript;base64,'+
    Buffer.from(src+'\n// fresh instance').toString('base64'));
  assert.doesNotThrow(()=>mod.setGameAudioPaused(true));
  assert.equal(mod.isGameAudioPaused(),true);
  assert.doesNotThrow(()=>mod.setGameAudioPaused(false));
  assert.equal(mod.isGameAudioPaused(),false);
});
