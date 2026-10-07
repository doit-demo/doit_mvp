import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../core/worker.ts';

test('unauthenticated task access is rejected', async()=>{
 const response=await worker.fetch(new Request('https://doit.test/api/tasks'),{},{});
 assert.equal(response.status,401);
});
test('cross-origin mutation is rejected before processing', async()=>{
 const response=await worker.fetch(new Request('https://doit.test/api/tasks',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:'{}'}),{},{});
 assert.equal(response.status,403);
});
