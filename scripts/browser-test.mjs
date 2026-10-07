import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const base='https://doit-r02.namcot.workers.dev';
const users=JSON.parse(await readFile('private/test-accounts.json','utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
await mkdir('test-results',{recursive:true});await mkdir('tests/fixtures',{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/client');await page.getByLabel('이메일').fill(users[0].email);await page.getByLabel('비밀번호').fill(users[0].password);await page.getByRole('button',{name:'워크스페이스 시작하기'}).click();await page.getByRole('heading',{name:'현장 업무를 한눈에'}).waitFor();await page.screenshot({path:'test-results/client-desktop.png',fullPage:true});
 const bytes=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');const stream=canvas.captureStream(10);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});const blobs=[];recorder.ondataavailable=e=>blobs.push(e.data);const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();ctx.fillStyle='#123a40';ctx.fillRect(0,0,320,180);ctx.fillStyle='#ffffff';ctx.font='25px sans-serif';ctx.fillText('DOIT test evidence',25,90);await new Promise(r=>setTimeout(r,700));recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());return [...new Uint8Array(await new Blob(blobs,{type:'video/webm'}).arrayBuffer())]});await writeFile('tests/fixtures/sample.webm',Buffer.from(bytes));
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/agent');await p.getByLabel('이메일').fill(users[1].email);await p.getByLabel('비밀번호').fill(users[1].password);await p.getByRole('button',{name:'워크스페이스 시작하기'}).click();await p.getByRole('heading',{name:'오늘의 현장 업무'}).waitFor();await p.screenshot({path:'test-results/agent-mobile.png',fullPage:true});
 if(errors.length)throw new Error(errors.join('\n'));console.log('PASS Desktop Client login, Mobile Agent login, no browser errors; real WEBM fixture generated.');
}finally{await browser.close();}
