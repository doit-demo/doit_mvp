import {PNG} from 'pngjs';
import jpeg from 'jpeg-js';
import {writeFile,readFile} from 'node:fs/promises';
const png=new PNG({width:320,height:180});
for(let y=0;y<180;y++)for(let x=0;x<320;x++){const n=(y*320+x)*4;png.data[n]=x<30?75:18;png.data[n+1]=x<30?196:58+Math.floor(y/8);png.data[n+2]=x<30?164:64;png.data[n+3]=255;}
await writeFile('tests/fixtures/sample.png',PNG.sync.write(png));await writeFile('tests/fixtures/sample.jpg',jpeg.encode({width:320,height:180,data:png.data},80).data);
const old="Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64')";
for(const path of ['tests/integration.test.mjs','scripts/live-test.mjs','scripts/ui-flow.mjs']){const s=await readFile(path,'utf8');await writeFile(path,s.replaceAll(old,"await readFile('tests/fixtures/sample.png')"));}
console.log('Generated valid PNG/JPEG fixtures; replaced old CRC-invalid PNG sample.');
