import {all,one,run,bucket,requireUser,uploadPhoto,body,text,integer,fail} from './server';
import {CATEGORIES} from './catalog';
import {SUBCATEGORIES} from './subcategories';

const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const visible=(p:any,now=Date.now())=>p.active===1&&p.starts_at<=now&&p.ends_at>now;
const publicFields=(p:any)=>{const {image_key,...rest}=p;return {...rest,image_url:image_key?`/api/promotions/${encodeURIComponent(p.id)}/image?v=${p.version}`:null};};
async function imageResponse(key:string|null){
  if(!key)fail(404,'Image not found.');
  const obj=await bucket().get(key);if(!obj)fail(404,'Image not found.');
  return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
async function logoURL(){const logo=await one("SELECT value FROM settings WHERE key='brand_logo'");return logo?.value?'/api/branding/logo?v='+encodeURIComponent(logo.value):null;}
async function values(b:any){
  const category=text(b.category||'','Category',100,false),subcategory=text(b.subcategory||'','Subcategory',100,false);
  if(category&&!CATEGORIES.includes(category))fail(400,'Choose a shop category.');
  if(subcategory&&!SUBCATEGORIES[category]?.some(s=>s.name===subcategory))fail(400,'Choose a subcategory within the selected category.');
  const productId=text(b.product_id||'','Product',80,false)||null;
  if(productId&&category)fail(400,'Choose either a product or a category for this offer.');
  if(productId&&!await one('SELECT id FROM products WHERE id=?',productId))fail(400,'Choose an existing product.');
  const starts=integer(b.starts_at,'Start date',0,8640000000000000),ends=integer(b.ends_at,'End date',0,8640000000000000);
  if(ends<=starts)fail(400,'End date must be after the start date.');
  const active=b.active===true||b.active===1?1:0;
  if(active&&ends<=Date.now())fail(400,'Choose a future end date to publish this offer.');
  if(active&&productId&&!await one('SELECT id FROM products WHERE id=? AND active=1',productId))fail(400,'Publish the product before promoting it.');
  return [text(b.title,'Offer title',100),text(b.description||'','Offer details',500,false),text(b.button_label||'Shop this offer','Button label',40),category,subcategory,productId,starts,ends,active,Date.now()];
}
export async function promotionRoutes(req:Request,path:string[],method:string):Promise<Response|null>{
  if(path[0]==='branding'&&path[1]==='logo'&&method==='GET'){
    const logo=await one("SELECT value FROM settings WHERE key='brand_logo'");return imageResponse(logo?.value);
  }
  if(path[0]==='promotions'&&method==='GET'){
    if(!path[1]){const now=Date.now();const items=await all(`SELECT * FROM promotions WHERE active=1 AND starts_at<=? AND ends_at>? AND (product_id IS NULL OR EXISTS(SELECT 1 FROM products WHERE products.id=promotions.product_id AND products.active=1)) ORDER BY starts_at DESC,id LIMIT 20`,now,now);return json({items:items.map(publicFields),logo_url:await logoURL()});}
    if(path[2]==='image'){
      const p=await one('SELECT * FROM promotions WHERE id=?',path[1]);if(!p)fail(404,'Offer not found.');
      if(!visible(p)||(p.product_id&&!await one('SELECT id FROM products WHERE id=? AND active=1',p.product_id)))await requireUser(req,true);
      return imageResponse(p.image_key);
    }
    return null;
  }
  if(path[0]!=='admin'||!['promotions','branding'].includes(path[1]))return null;
  await requireUser(req,true);
  if(path[1]==='branding'){
    if(method==='GET')return json({logo_url:await logoURL()});
    if(path[2]==='logo'&&method==='POST'){
      const old=await one("SELECT value FROM settings WHERE key='brand_logo'");
      const stored=await uploadPhoto((await req.formData()).get('file') as File,'branding');
      try{await run("INSERT INTO settings(key,value) VALUES('brand_logo',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",stored.key);}catch(e){await bucket().delete(stored.key);throw e;}
      if(old?.value)await bucket().delete(old.value);
      return json({logo_url:await logoURL()});
    }
    if(path[2]==='logo'&&method==='DELETE'){
      const old=await one("SELECT value FROM settings WHERE key='brand_logo'");await run("DELETE FROM settings WHERE key='brand_logo'");if(old?.value)await bucket().delete(old.value);return json({ok:true});
    }
    return null;
  }
  if(method==='GET'&&!path[2])return json((await all('SELECT * FROM promotions ORDER BY updated_at DESC,id')).map(publicFields));
  if(method==='POST'&&!path[2]){
    const data=await values(await body(req)),id=crypto.randomUUID();
    await run('INSERT INTO promotions(title,description,button_label,category,subcategory,product_id,starts_at,ends_at,active,updated_at,id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',...data,id);
    return json(publicFields(await one('SELECT * FROM promotions WHERE id=?',id)),201);
  }
  const p=path[2]?await one('SELECT * FROM promotions WHERE id=?',path[2]):null;if(!p)fail(404,'Offer not found.');
  if(method==='PATCH'){
    const b=await body(req),data=await values(b),version=integer(b.version,'Offer version',1);
    const result=await run('UPDATE promotions SET title=?,description=?,button_label=?,category=?,subcategory=?,product_id=?,starts_at=?,ends_at=?,active=?,updated_at=?,version=version+1 WHERE id=? AND version=?',...data,p.id,version);
    if(!result.meta.changes)fail(409,'This offer changed. Reload it before saving.');
    return json(publicFields(await one('SELECT * FROM promotions WHERE id=?',p.id)));
  }
  if(method==='POST'&&path[3]==='image'){
    const stored=await uploadPhoto((await req.formData()).get('file') as File,'promotions');
    try{const result=await run('UPDATE promotions SET image_key=?,version=version+1,updated_at=? WHERE id=? AND version=?',stored.key,Date.now(),p.id,p.version);if(!result.meta.changes)fail(409,'This offer changed. Reload it before uploading.');}catch(e){await bucket().delete(stored.key);throw e;}
    if(p.image_key)await bucket().delete(p.image_key);return json(publicFields(await one('SELECT * FROM promotions WHERE id=?',p.id)));
  }
  if(method==='DELETE'&&path.length===3){await run('DELETE FROM promotions WHERE id=?',p.id);if(p.image_key)await bucket().delete(p.image_key);return json({ok:true});}
  return null;
}
