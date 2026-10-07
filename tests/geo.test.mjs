import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker from '../core/worker.ts';

const env={VWORLD_API_KEY:'test-secret',DB:{prepare(){return {bind(){return this},async first(){return {id:'client',role:'CLIENT'}}}}}};
const request=(path='/api/geo/tiles/15/27941/12689.png')=>new Request('https://doit.test'+path+'?app=CLIENT',{headers:{cookie:'doit_CLIENT=test-session'}});
test('VWorld tiles require a session',async()=>{
 assert.equal((await worker.fetch(new Request('https://doit.test/api/geo/tiles/15/27941/12689.png'),env,{})).status,401);
});
test('Browser map credentials require session and an explicit domain-confirmed switch',async()=>{
 assert.equal((await worker.fetch(new Request('https://doit.test/api/geo/config'),env,{})).status,401);
 const off=await worker.fetch(request('/api/geo/config'),env,{});assert.equal(off.status,200);assert.ok(!(await off.text()).includes('test-secret'));
 const on=await worker.fetch(request('/api/geo/config'),{...env,VWORLD_BROWSER_ENABLED:'true'},{});
 assert.equal(on.status,200);assert.match(on.headers.get('cache-control'),/no-store/);const data=await on.json();assert.equal(data.provider,'vworld');assert.match(data.tile_url,/https:\/\/api.vworld.kr\/req\/wmts\/1.0.0\/test-secret\/Base/);
});
test('VWorld tile proxy validates coordinates and hides upstream credentials/errors',async(t)=>{
 const png=await readFile('tests/fixtures/sample.png');let calls=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls++;assert.equal(String(url),'https://api.vworld.kr/req/wmts/1.0.0/test-secret/Base/15/12689/27941.png');
  assert.equal(options.headers.Referer,'https://doit.test/');
  assert.equal(options.redirect,'manual');
  return new Response(png,{headers:{'content-type':'image/png','x-upstream-secret':'test-secret'}});
 });
 const r=await worker.fetch(request(),env,{});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.equal(r.headers.get('x-upstream-secret'),null);assert.match(r.headers.get('cache-control'),/no-store/);assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);
 for(const path of ['/api/geo/tiles/99/0/0.png','/api/geo/tiles/7/128/0.png','/api/geo/tiles/7/-1/0.png'])assert.equal((await worker.fetch(request(path),env,{})).status,422);
 assert.equal(calls,1);
 assert.equal((await worker.fetch(request(),{...env,VWORLD_API_KEY:undefined},{})).status,503);
 t.mock.method(globalThis,'fetch',async()=>new Response('test-secret invalid key',{status:200,headers:{'content-type':'text/xml'}}));
 const bad=await worker.fetch(request(),env,{});assert.equal(bad.status,502);assert.ok(!(await bad.text()).includes('test-secret'));
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('test-secret transport failure')});
 const outage=await worker.fetch(request(),env,{});assert.equal(outage.status,502);assert.ok(!(await outage.text()).includes('test-secret'));
});
