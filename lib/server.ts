import { env } from 'cloudflare:workers';
export class ApiError extends Error {constructor(public status:number,message:string,public code?:string){super(message);}}
export function fail(status:number,message:string):never {throw new ApiError(status,message);}
export function db(){if(!env.DB) fail(503,'The shop database is unavailable. Please try again.');return env.DB;}
export function bucket(){if(!env.BUCKET) fail(503,'Photo storage is unavailable. Please try again.');return env.BUCKET;}
export function statement(sql:string,...args:any[]){return db().prepare(sql).bind(...args);}
export async function one(sql:string,...args:any[]):Promise<any>{return statement(sql,...args).first();}
export async function all(sql:string,...args:any[]):Promise<any[]>{return (await statement(sql,...args).all()).results;}
export async function run(sql:string,...args:any[]){return statement(sql,...args).run();}
export function text(value:unknown,label:string,max=200,required=true){if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))fail(400,`${label} is required and must be no more than ${max} characters.`);return (value as string).trim();}
export function integer(value:unknown,label:string,min=0,max=1e9){if(!Number.isSafeInteger(value)||Number(value)<min||Number(value)>max)fail(400,`${label} must be a whole number between ${min} and ${max}.`);return Number(value);}
export function price(value:unknown,label='Price'){const n=typeof value==='string'&&/^\d+(\.\d{1,2})?$/.test(value)?Math.round(Number(value)*100):NaN;return integer(n,label,0,1e11);}
export function email(value:unknown){const s=text(value,'Email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail(400,'Enter a valid email address.');return s;}
const encoder=new TextEncoder();
function hex(bytes:ArrayBuffer|Uint8Array){return Array.from(new Uint8Array(bytes instanceof Uint8Array?bytes.buffer:bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function randomToken(){return hex(crypto.getRandomValues(new Uint8Array(32)));}
export async function digest(s:string){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(s)));}
export function same(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export function validatePassword(value:unknown,role:string){if(typeof value!=='string'||Array.from(value).length<(role==='admin'?10:6)||Array.from(value).length>128)fail(400,`Password must be ${role==='admin'?10:6}–128 characters.`);return value as string;}
export async function hashPassword(password:string,salt=randomToken()){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256);return `pbkdf2$${salt}$${hex(bits)}`;}
export async function verifyPassword(password:unknown,hash:string){if(typeof password!=='string'||password.length>512)return false;return same(await hashPassword(password,hash.split('$')[1]),hash);}
export function tokenFrom(req:Request){return req.headers.get('cookie')?.match(/(?:^|;\s*)gura_session=([a-f0-9]{64})(?:;|$)/)?.[1]||'';}
export async function currentUser(req:Request){const token=tokenFrom(req);if(!token)return null;return one('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?',await digest(token),Date.now());}
export async function requireUser(req:Request,admin=false){
 const u=await currentUser(req);
 if(!u)throw new ApiError(401,'Your session has ended. Please sign in again.','SESSION_EXPIRED');
 const expectedUser=req.headers.get('x-gura-user');
 if(expectedUser&&expectedUser!==u.id)throw new ApiError(409,'The signed-in account changed in this browser. Sign in with the account you want to use and try again.','SESSION_CHANGED');
 if(admin&&u.role!=='admin')throw new ApiError(403,'You are currently signed in as a customer. Sign in with your shop owner email to manage products.','OWNER_REQUIRED');
 return u;
}
export function publicUser(u:any){if(!u)return null;const {password,...safe}=u;return safe;}
export function sessionCookie(req:Request,token:string,maxAge=604800){return `gura_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
export async function signIn(req:Request,id:string){const token=randomToken();await db().batch([statement('DELETE FROM sessions WHERE expires<?',Date.now()),statement('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',await digest(token),id,Date.now()+604800000)]);return sessionCookie(req,token);}
export async function throttle(req:Request,key:string){const ip=req.headers.get('cf-connecting-ip')||'local';for(const suffix of ['ip:'+ip,'account:'+key]){const h=await digest(suffix);const now=Date.now();await run('INSERT INTO login_limits(key,attempts,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END',h,now+900000,now,now);const row=await one('SELECT attempts FROM login_limits WHERE key=?',h);if(row.attempts>(suffix.startsWith('ip:')?60:12))fail(429,'Too many attempts. Please try again in 15 minutes.');}}
export function checkWrite(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)fail(403,'Request origin is not allowed.');if(req.headers.get('x-gura-action')!=='1')fail(403,'Refresh this page and try again.');}
export async function body(req:Request){if(Number(req.headers.get('content-length'))>1000000)fail(413,'This request is too large.');try{return await req.json() as any;}catch{fail(400,'Invalid request.');}}
export function ownerSetupKey(){return (env as unknown as Record<string,string>).OWNER_SETUP_KEY||'';}
export async function shopSettings(){const rows=await all('SELECT key,value FROM settings');const s:any={name:'GURA',currency:'UGX',delivery_fee:0,gold_description:''};for(const r of rows)s[r.key]=r.key==='delivery_fee'?Number(r.value):r.value;return s;}
export const productColumns="p.*,COALESCE((SELECT object_key FROM photos WHERE id=p.cover_image),(SELECT object_key FROM photos WHERE product_id=p.id ORDER BY position,id LIMIT 1)) AS image,(SELECT COUNT(*) FROM photos WHERE product_id=p.id) AS image_count";
export async function uploadPhoto(file:File,prefix:string){if(!(file instanceof File)||file.size===0)fail(400,'Choose a photo.');if(file.size>20*1024*1024)fail(413,'Each photo can be up to 20 MB. You can add as many photos as you need.');const head=new Uint8Array(await file.slice(0,16).arrayBuffer());const ascii=new TextDecoder('ascii').decode(head);let type='';if(head[0]===255&&head[1]===216&&head[2]===255)type='image/jpeg';else if(head[0]===137&&ascii.slice(1,4)==='PNG')type='image/png';else if(ascii.startsWith('GIF87a')||ascii.startsWith('GIF89a'))type='image/gif';else if(ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP')type='image/webp';else if(ascii.slice(4,8)==='ftyp'&&['avif','avis'].includes(ascii.slice(8,12)))type='image/avif';if(!type)fail(400,'Use a JPG, PNG, WebP, GIF or AVIF image.');const key=prefix+'/'+crypto.randomUUID();await bucket().put(key,file.stream(),{httpMetadata:{contentType:type}});return {key,type};}
