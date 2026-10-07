// Deterministic UI regression with simulated Google responses; NOT live geocoding validation.
import {chromium,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://doit.test/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const json=data=>route.fulfill({json:data});
  if(path==='/api/auth/me')return json({user:{id:'test',name:'테스트',role:'CLIENT'},csrf:'test'});
  if(path==='/api/health')return json({core:true});
  if(path==='/api/tasks')return json([]);
  if(path==='/api/geo/config')return json({provider:'google',browser_key:'fixture-only'});
  if(path==='/assets/app.js')return route.fulfill({contentType:'application/javascript',body:await readFile('dist/app.js','utf8')});
  if(path==='/assets/app.css')return route.fulfill({contentType:'text/css',body:await readFile('dist/app.css','utf8')});
  return route.fulfill({contentType:'text/html',body:await readFile('dist/index.html','utf8')});
 });
 await page.route('https://maps.googleapis.com/**',route=>route.fulfill({contentType:'application/javascript',body:`
 window.google={maps:{event:{clearInstanceListeners(){}},Circle:class {setMap(){}},importLibrary:async(name)=> name==='maps'?{Map:class{constructor(host){this.host=host;}addListener(){}panTo(p){this.host.dataset.center=JSON.stringify(p)}}}:{Geocoder:class{geocode(req,cb){window.lastGeocode=req;const finish=()=>cb(req.address==='none'?[]:[{place_id:'test',formatted_address:'試験住所 / Test address',partial_match:true,geometry:{location:{lat:()=>34.68,lng:()=>135.08},location_type:'APPROXIMATE'}}],req.address==='none'?'ZERO_RESULTS':'OK');if(req.address==='slow')window.finishSlow=finish;else finish();}}}}};window.doitGoogleReady();` }));
 await page.goto('https://doit.test/client');await page.getByRole('button',{name:'새 업무 의뢰'}).click();
 const address=page.getByLabel('주소',{exact:true}),lat=page.getByLabel('목적지 위도'),lng=page.getByLabel('목적지 경도');
 for(const query of ['神戸市須磨区弥栄台2丁目5番2','2-5-2 Yaeidai, Kobe, Japan','서울 중구 세종대로 110']){
  await address.fill(query);await page.getByRole('button',{name:'주소로 위치 찾기'}).click();
  await expect(page.getByText('대략적인 위치',{exact:false})).toBeVisible();assert.equal(await page.evaluate(()=>window.lastGeocode.address),query);
  await page.getByRole('button',{name:/試験住所/}).click();await expect(lat).toHaveValue('34.68');await expect(lng).toHaveValue('135.08');await expect(page.getByTestId('location-map')).toHaveAttribute('data-center','{"lat":34.68,"lng":135.08}');
 }
 await address.fill('changed');await expect(lat).toHaveValue('');await expect(lng).toHaveValue('');await expect(page.getByRole('button',{name:'의뢰 등록 →'})).toBeDisabled();
 await address.fill('slow');await page.getByRole('button',{name:'주소로 위치 찾기'}).click();await page.waitForFunction(()=>!!window.finishSlow);await address.fill('newer');await page.evaluate(()=>window.finishSlow());await expect(page.locator('.address-results')).toHaveCount(0);
 await address.fill('none');await page.getByRole('button',{name:'주소로 위치 찾기'}).click();await expect(page.getByText(/검색 결과가 없습니다/)).toBeVisible();await expect(lat).toHaveValue('');
 assert.deepEqual(errors,[]);console.log('PASS simulated UI: 3 language inputs, candidate/map selection, edit invalidation, stale result, empty result');
}finally{await browser.close();}
