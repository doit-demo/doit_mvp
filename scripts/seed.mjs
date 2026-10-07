import {randomBytes,pbkdf2Sync,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
await mkdir('private',{recursive:true});
let credentials;
try{credentials=JSON.parse(await readFile('private/test-accounts.json','utf8'))}catch{credentials=[['CLIENT','client','의뢰인 테스트'],['AGENT','agent','현장 Agent'],['ADMIN','admin','운영 관리자'],['CLIENT','otherclient','권한 검증 Client'],['AGENT','otheragent','권한 검증 Agent']].map(([role,handle,name])=>({id:randomUUID(),role,email:handle+'@doit.test',name,password:randomBytes(18).toString('base64url')}));await writeFile('private/test-accounts.json',JSON.stringify(credentials,null,2));}
const quote=x=>"'"+String(x).replaceAll("'","''")+"'";
const now=new Date().toISOString();const statements=credentials.map(u=>{const salt=randomBytes(16).toString('hex'),hash=pbkdf2Sync(u.password,salt,100000,32,'sha256').toString('hex');return `INSERT OR IGNORE INTO users(id,email,name,role,password_hash,created_at) VALUES (${[u.id,u.email,u.name,u.role,`pbkdf2$100000$${salt}$${hash}`,now].map(quote).join(',')});`});
await writeFile('private/seed.sql',statements.join('\n'));
await writeFile('private/TEST_ACCOUNTS.md','# DOIT 테스트 계정\n\nURL: https://doit-r02.namcot.workers.dev\n\n이 파일은 Git에 포함되지 않습니다. 실제 운영 전에 테스트 계정을 교체하세요.\n\n'+credentials.slice(0,3).map(u=>`## ${u.name}\n\n- APP: /${u.role.toLowerCase()}\n- 이메일: ${u.email}\n- 비밀번호: ${u.password}\n`).join('\n'));
console.log('Seed prepared. Credentials saved locally to private/TEST_ACCOUNTS.md (not logged).');
