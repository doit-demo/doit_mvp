// Real SQLite transactions; D1 binding adapter for deterministic Node tests.
// Cloudflare runtime parity is checked separately against the deployed Worker.
import {DatabaseSync} from 'node:sqlite';
export class LocalDB {
 constructor(){this.sqlite=new DatabaseSync(':memory:');}
 exec(sql){this.sqlite.exec(sql);return Promise.resolve({});}
 prepare(sql){const db=this.sqlite;let params=[];return {bind(...p){params=p;return this},async first(){return db.prepare(sql).get(...params)??null},async all(){return {results:db.prepare(sql).all(...params)}},async run(){const r=db.prepare(sql).run(...params);return {meta:{changes:Number(r.changes)}}}};}
 async batch(statements){this.sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());this.sqlite.exec('COMMIT');return result}catch(e){this.sqlite.exec('ROLLBACK');throw e}}
 close(){this.sqlite.close()}
}
export class LocalBucket {
 objects=new Map();
 async put(key,data,options={}){const bytes=data instanceof ArrayBuffer?new Uint8Array(data):new Uint8Array(await new Response(data).arrayBuffer());this.objects.set(key,{bytes,options});return {key};}
 async head(key){const o=this.objects.get(key);return o?{size:o.bytes.length}:null}
 async list(){return {objects:[...this.objects.keys()].map(key=>({key}))}}
 async delete(key){this.objects.delete(key)}
 async get(key,options={}){const o=this.objects.get(key);if(!o)return null;const range=options.range;const bytes=range?o.bytes.slice(range.offset,range.offset+range.length):o.bytes;return {body:new Blob([bytes]).stream(),size:o.bytes.length,httpEtag:'"local"'};}
}
