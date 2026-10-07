import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='https://doit-r02.namcot.workers.dev';
const accounts=JSON.parse(await readFile('private/test-accounts.json','utf8'));
const key=(await readFile('.env','utf8')).match(/^VWORLD_API_KEY=(.+)$/m)?.[1].trim();
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[]; const direct=process.env.DOIT_EXPECT_VWORLD==='true';
try{
 assert.equal((await fetch(base+'/api/geo/tiles/15/27941/12689.png?app=CLIENT')).status,401);
 const bundle=await(await fetch(base+'/assets/app.js')).text();assert.ok(key&&!bundle.includes(key));
 for(const role of ['CLIENT','AGENT','ADMIN']){
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!direct)assert.ok(!r.url().includes(key))});
  const user=accounts.find(a=>a.role===role);
  await page.goto(base+'/'+role.toLowerCase());await page.getByLabel('이메일').fill(user.email);await page.getByLabel('비밀번호').fill(user.password);await page.getByRole('button',{name:'워크스페이스 시작하기'}).click();await page.getByRole('heading',{name:'업무 목록'}).waitFor();
  const tile=page.waitForResponse(r=>r.url().startsWith(direct?'https://api.vworld.kr/req/wmts/':'https://tile.openstreetmap.org/')&&r.status()===200);
  if(role==='CLIENT')await page.getByRole('button',{name:'새 업무 의뢰'}).click();
  else {await page.locator('tbody button').first().click();}
  const response=await tile;assert.equal(response.headers()['content-type'],'image/png');
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
  await expect(page.locator('.leaflet-control-attribution')).toContainText(direct?'VWorld':'OpenStreetMap');
  if(role==='CLIENT'){
   const before=await page.getByLabel('목적지 위도').inputValue();await page.getByTestId('location-map').click({position:{x:180,y:120}});assert.notEqual(await page.getByLabel('목적지 위도').inputValue(),before);
  }
  assert.deepEqual(errors,[]);await mkdir('test-results',{recursive:true});await page.screenshot({path:`test-results/vworld-${role.toLowerCase()}.png`,fullPage:true});
  results.push({role,status:'PASS',checks:direct?'VWorld direct PNG rendered, no JS error':'OSM fallback rendered, no key in request, no JS error'});console.log('PASS',role,direct?'VWorld map':'OSM fallback');await context.close();
 }
}catch(error){process.exitCode=1;results.push({status:'FAIL',message:error.message.replaceAll(key||'__missing__','[redacted]')});console.error(results.at(-1).message)}finally{await writeFile('test-results/geo-results.json',JSON.stringify({at:new Date().toISOString(),results},null,2));await browser.close();}
