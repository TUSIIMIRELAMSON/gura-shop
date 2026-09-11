// Isolated adapters: exercises the real API, SQL, and transactions without a server or network.
import {DatabaseSync} from 'node:sqlite';
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}async first(){return sqlite.prepare(this.sql).get(...this.args)||null;}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}async run(){const r=sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes)}};}}
const DB={prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements){const r=sqlite.prepare(s.sql).run(...s.args);results.push({success:true,meta:{changes:Number(r.changes)}});}sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close:()=>sqlite.close()};
const objects=new Map();
const BUCKET={async put(key,stream,options){objects.set(key,{bytes:await new Response(stream).arrayBuffer(),httpMetadata:options.httpMetadata});},async get(key){const o=objects.get(key);return o?{body:new Blob([o.bytes]).stream(),httpMetadata:o.httpMetadata}:null;},async delete(key){objects.delete(key);}};
export const env={DB,BUCKET,OWNER_SETUP_KEY:'test-owner-setup-code'};
