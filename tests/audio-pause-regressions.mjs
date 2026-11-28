import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../js/systems/audio.js',import.meta.url),'utf8');
test('park ambience has distinct, clock-wrapping quiet profiles',async()=>{
  const m=await import('data:text/javascript;base64,'+Buffer.from(src+'\n// ambience rules instance').toString('base64'));
  assert.equal(m.ambienceProfile(6),'dawn');
  assert.equal(m.ambienceProfile(12),'day');
  assert.equal(m.ambienceProfile(17.6),'golden');
  assert.equal(m.ambienceProfile(20),'evening');
  assert.equal(m.ambienceProfile(2),'night');
  assert.equal(m.ambienceProfile(26),m.ambienceProfile(2),'clock wraps');
  for(const profile of ['dawn','day','golden','evening','night']){
    const delay=m.ambienceDelay(profile,()=>.5);
    assert.ok(delay>=2300&&delay<=7000,profile+' remains sparse');
  }
});
test('mute before first gesture sets master gain to zero and starts no timer',async()=>{
  const priorW=globalThis.window,priorSet=globalThis.setTimeout,priorClear=globalThis.clearTimeout;
  let created=0,timers=0,cancelled=0,ctx;
  class FakeAudio{
    constructor(){this.state='running';this.destination={};this.gains=[];ctx=this;created++;}
    createGain(){const gain={gain:{value:0},connect(){}};this.gains.push(gain);return gain;}
    suspend(){this.state='suspended';return Promise.resolve();}
    resume(){this.state='running';return Promise.resolve();}
  }
  try{
    globalThis.window={AudioContext:FakeAudio};
    globalThis.setTimeout=()=>++timers;
    globalThis.clearTimeout=()=>{cancelled++;};
    const m=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
    m.setMuted(true);
    m.initAudio();
    assert.equal(created,1);
    assert.equal(ctx.gains[0].gain.value,0,'saved mute must apply on context creation');
    assert.equal(timers,0,'muted game does not schedule birds/crickets');
    m.setMuted(false);
    assert.equal(ctx.gains[0].gain.value,.5);
    assert.equal(timers,1,'unmuting starts one ambience timer');
    m.initAudio();m.setGameAudioPaused(false);
    assert.equal(timers,1,'repeated starts do not duplicate timers');
    m.setGameAudioPaused(true);
    assert.equal(ctx.state,'suspended');
    assert.equal(cancelled,1,'pause actually cancels ambient timer');
    m.setGameAudioPaused(false);
    assert.equal(ctx.state,'running');
    assert.equal(timers,2,'resume starts only one replacement timer');
    m.setMuted(true);
    assert.equal(cancelled,2,'mute cancels active timer too');
    m.setGameAudioPaused(true);
    m.setGameAudioPaused(false);
    assert.equal(timers,2,'resuming while still muted does not wake timer');
    assert.equal(ctx.gains[0].gain.value,0);
    assert.equal(created,1,'one audio context for entire session');
  }finally{
    if(priorW===undefined)delete globalThis.window;else globalThis.window=priorW;
    globalThis.setTimeout=priorSet;
    globalThis.clearTimeout=priorClear;
  }
});
test('pause before any WebAudio gesture is safe and schedules nothing',async()=>{
  const priorSet=globalThis.setTimeout;
  let called=0;globalThis.setTimeout=()=>{called++;return 1;};
  try{
    const m=await import('data:text/javascript;base64,'+
      Buffer.from(src+'\n// second independent instance').toString('base64'));
    m.setGameAudioPaused(true);
    assert.equal(m.isGameAudioPaused(),true);
    m.setGameAudioPaused(false);
    assert.equal(m.isGameAudioPaused(),false);
    assert.equal(called,0);
  }finally{globalThis.setTimeout=priorSet;}
});
