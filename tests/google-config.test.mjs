import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapConfig} from '../core/geo.ts';
test('Google browser key switches map provider without exposing VWorld credentials',async()=>{
 const response=mapConfig({GOOGLE_MAPS_BROWSER_KEY:'google-test',VWORLD_API_KEY:'vworld-test',VWORLD_BROWSER_ENABLED:'true'});
 assert.equal(response.headers.get('cache-control'),'no-store');
 const data=await response.json();assert.equal(data.provider,'google');assert.equal(data.browser_key,'google-test');assert.ok(!JSON.stringify(data).includes('vworld-test'));
});
