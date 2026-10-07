import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['web/App.tsx'],bundle:true,minify:true,format:'iife',outfile:'dist/app.js',define:{'process.env.NODE_ENV':'"production"'},loader:{'.png':'dataurl'}});
const html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#112b30"><title>DOIT · 현장 실행 플랫폼</title><link rel="stylesheet" href="/assets/app.css"></head><body><div id="root"></div><script src="/assets/app.js" defer></script></body></html>';
const assets={'/':{body:html,type:'text/html; charset=utf-8'},'/assets/app.js':{body:await readFile('dist/app.js','utf8'),type:'application/javascript; charset=utf-8'},'/assets/app.css':{body:await readFile('dist/app.css','utf8'),type:'text/css; charset=utf-8'}};
await writeFile('dist/index.html',html);
await build({entryPoints:['core/worker.ts'],outfile:'dist/worker.js',bundle:true,minify:true,format:'esm',platform:'browser',external:['node:*'],plugins:[{name:'embedded-assets',setup(b){b.onLoad({filter:/core[\\/]assets\.ts$/},()=>({contents:'export const assets='+JSON.stringify(assets),loader:'js'}))}}]});
console.log('Built DOIT Worker and React application.');
