import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
if(Number(process.versions.node.split('.')[0])<22)throw new Error('Install Node.js 22.13 or newer before continuing.');
if(!existsSync('.dev.vars'))writeFileSync('.dev.vars','OWNER_SETUP_KEY="'+randomBytes(24).toString('hex')+'"\n',{mode:0o600});
function run(args){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
run(['scripts/run-framework.mjs','build']);
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
mkdirSync('.sites-runtime',{recursive:true});
writeFileSync('.sites-runtime/local-migrations.json',JSON.stringify({name:'gura-local',compatibility_date:config.compatibility_date,d1_databases:config.d1_databases.map(x=>({...x,migrations_dir:resolve('drizzle')}))},null,2));
run(['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config','.sites-runtime/local-migrations.json','--persist-to','.wrangler/state']);
console.log('\nGURA is ready. Run: pnpm dev');
console.log('Open the address printed by the server, then select Set up shop owner.');
const key=readFileSync('.dev.vars','utf8').match(/^OWNER_SETUP_KEY\s*=\s*"?([^"\r\n]+)"?/m)?.[1];
console.log('\nYour local owner setup code: '+(key||'See .dev.vars'));
console.log('Keep the setup code private. Choose your owner email and password in the app.');
console.log('Your local database and uploaded photos are in .wrangler/state. Keep that folder for future sessions.\n');
