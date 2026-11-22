import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const src=readFileSync(new URL('../harness/browser-smoke.mjs',import.meta.url),'utf8');
test('SwiftShader screenshot capture remains mandatory with bounded 60s deadline',()=>{
 assert.match(src,/await page\.screenshot\(\{ path: out \+ '\/' \+ title \+ '\.png',/);
 assert.match(src,/animations: 'disabled', timeout: 60000/);
 assert.match(src,/if \(faults\.length\)/);
 assert.match(src,/process\.exitCode = 1/);
});
