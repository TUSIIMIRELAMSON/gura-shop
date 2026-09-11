import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const dataDir=process.env.GURA_DATA_DIR;
const ownerKey=process.env.OWNER_SETUP_KEY;
if(!publicOrigin)throw new Error('Set PUBLIC_ORIGIN to the public Railway website address.');
const publicOrigin=process.env.PUBLIC_ORIGIN;
if(!dataDir)throw new Error('Set GURA_DATA_DIR to your Railway Volume mount path, for example /data.');
if(!ownerKey)throw new Error('Set OWNER_SETUP_KEY in Railway Variables before starting GURA.');

const stateDir=resolve(dataDir,'wrangler-state');
const runtimeDir=resolve(dataDir,'runtime');
mkdirSync(stateDir,{recursive:true});
mkdirSync(runtimeDir,{recursive:true});

// Pass Railway's owner setup key securely into the local Worker.
const workerEnvFile=resolve('/tmp/gura-worker.env');
writeFileSync(workerEnvFile,'OWNER_SETUP_KEY='+JSON.stringify(ownerKey)+'\n',{mode:0o600});
const built=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
const migrationConfig=resolve(runtimeDir,'migrations.json');
writeFileSync(
  workerEnvFile,
  'OWNER_SETUP_KEY='+JSON.stringify(ownerKey)+'\n'+
  'PUBLIC_ORIGIN='+JSON.stringify(publicOrigin)+'\n',
  {mode:0o600}
);

const shared=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js'];
const environment={
  ...process.env,
  SITES_RUNTIME_ROOT:runtimeDir,
  WRANGLER_SEND_METRICS:'false',
  WRANGLER_WRITE_LOGS:'false'
};
const migrated=spawnSync(process.execPath,[...shared,'d1','migrations','apply','DB','--local','--config',migrationConfig,'--persist-to',stateDir],{stdio:'inherit',env:environment});
if(migrated.status!==0)process.exit(migrated.status||1);

const worker=spawn(process.execPath,[...shared,'dev','--env-file',workerEnvFile,'--config','dist/server/wrangler.json','--local','--persist-to',stateDir,'--ip','0.0.0.0','--port',String(process.env.PORT||3000),'--inspector-port','0'],{stdio:'inherit',env:environment});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>worker.kill(signal));
worker.on('exit',(code)=>process.exit(code??1));
