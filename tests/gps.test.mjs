import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectLocation} from '../web/gps.ts';
test('failed GPS refresh clears previous location and successful reading keeps timestamp',async()=>{
 let state={latitude:1,longitude:2};const update=x=>{state=x};
 const success={getCurrentPosition:ok=>ok({coords:{latitude:37,longitude:127,accuracy:5},timestamp:Date.UTC(2026,9,7)})};
 await collectLocation(update,success);assert.equal(state.latitude,37);assert.equal(state.location_recorded_at,'2026-10-07T00:00:00.000Z');
 const failure={getCurrentPosition:(_ok,fail)=>fail({message:'denied'})};
 await assert.rejects(collectLocation(update,failure));assert.equal(state,null);
});
