import {ApiError,fail,db,bucket,statement,one,all,run,text,integer,price,email,digest,same,validatePassword,hashPassword,verifyPassword,tokenFrom,requireUser,currentUser,publicUser,sessionCookie,signIn,throttle,checkWrite,body,ownerSetupKey,shopSettings,productColumns,uploadPhoto} from '@/lib/server';
import {CATEGORIES,STATUSES} from '@/lib/catalog';
import {SUBCATEGORIES} from '@/lib/subcategories';
import {promotionRoutes} from '@/lib/promotion-server';
export const dynamic='force-dynamic';
function json(data:any,status=200,cookie?:string){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});}
async function product(id:string,admin=false){const p=await one(`SELECT ${productColumns} FROM products p WHERE p.id=? ${admin?'':'AND p.active=1'}`,id);if(!p)fail(404,'Product not found.');p.images=await all('SELECT * FROM photos WHERE product_id=? ORDER BY CASE WHEN id=? THEN 0 ELSE 1 END,position,id',id,p.cover_image||'');return p;}
function productData(b:any){const category=text(b.category,'Category');if(!CATEGORIES.includes(category))fail(400,'Choose one of the shop categories.');const subcategory=text(b.subcategory||'','Subcategory',100,false);if(subcategory&&!SUBCATEGORIES[category]?.some(s=>s.name===subcategory))fail(400,'Choose a subcategory within the selected category.');return [text(b.name,'Product name',160),text(b.description||'','Description',10000,false),text(b.brand||'','Brand',100,false),category,subcategory,price(b.price),text(b.unit,'Selling unit',40),integer(b.quantity,'Stock quantity'),b.active?1:0];}
async function ordersFor(user:any,admin=false){const orders=await all(`SELECT * FROM orders ${admin?'':'WHERE user_id=?'} ORDER BY created_at DESC`,...(admin?[]:[user.id]));for(const o of orders)o.items=await all('SELECT * FROM order_items WHERE order_id=?',o.id);return orders;}
async function handler(req:Request){try{
 const url=new URL(req.url),path=url.pathname.replace(/^\/api\//,'').split('/').map(decodeURIComponent),method=req.method;
 if(method!=='GET')checkWrite(req);
 const promotionResponse=await promotionRoutes(req,path,method);if(promotionResponse)return promotionResponse;
 if(path[0]==='categories'&&method==='GET')return json(await all(`SELECT category,subcategory,image FROM (SELECT p.category,p.subcategory,COALESCE((SELECT object_key FROM photos WHERE id=p.cover_image AND product_id=p.id),(SELECT object_key FROM photos WHERE product_id=p.id ORDER BY position,id LIMIT 1)) AS image,ROW_NUMBER() OVER(PARTITION BY p.category,p.subcategory ORDER BY p.created_at DESC,p.id) AS rn FROM products p WHERE p.active=1 AND EXISTS(SELECT 1 FROM photos WHERE product_id=p.id)) WHERE rn=1`));
 if(path[0]==='bootstrap'&&method==='GET'){const u=await currentUser(req);return json({user:publicUser(u),settings:await shopSettings(),needsOwner:!(await one("SELECT id FROM users WHERE role='admin'")),categories:CATEGORIES});}
 if(path[0]==='auth'&&method==='POST'){
  const b=await body(req),action=path[1];
  if(action==='logout'){if(req.headers.has('x-gura-user'))await requireUser(req);const token=tokenFrom(req);if(token)await run('DELETE FROM sessions WHERE token=?',await digest(token));return json({ok:true},200,sessionCookie(req,'',0));}
  const mail=email(b.email);await throttle(req,mail);
  if(action==='login'){const u=await one('SELECT * FROM users WHERE email=?',mail);if(!u||!await verifyPassword(b.password,u.password))fail(401,'Email or password is incorrect.');return json({user:publicUser(u)},200,await signIn(req,u.id));}
  if(action==='register'||action==='owner-setup'){
   const role=action==='owner-setup'?'admin':'customer';
   if(role==='admin'){if(await one("SELECT id FROM users WHERE role='admin'"))fail(409,'The shop owner account already exists. Please sign in.');const key=ownerSetupKey();if(!key||!same(await digest(String(b.setup_key||'')),await digest(key)))fail(403,'The owner setup code is incorrect.');}
   const password=await hashPassword(validatePassword(b.password,role));const name=text(b.name,'Name',100);if(await one('SELECT id FROM users WHERE email=?',mail))fail(409,'An account already uses this email. Please sign in.');const id=crypto.randomUUID();await run('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',id,name,mail,password,role,Date.now());return json({user:publicUser(await one('SELECT * FROM users WHERE id=?',id))},201,await signIn(req,id));
  }
 }
 if(path[0]==='products'&&method==='GET'){
  if(path[1])return json(await product(path[1]));
  const q=(url.searchParams.get('q')||'').slice(0,150),cat=url.searchParams.get('category')||'',offset=Math.max(0,Math.min(Number(url.searchParams.get('offset'))||0,1e7));const seed=Math.abs(Number(url.searchParams.get('seed'))||731)%1000000;const brand=url.searchParams.get('brand')||'';const where='p.active=1 AND (?=\'\' OR p.category=?) AND (?=\'\' OR p.brand=?) AND (?=\'\' OR p.name LIKE ? ESCAPE \'\\\' OR p.description LIKE ? ESCAPE \'\\\' OR p.brand LIKE ? ESCAPE \'\\\')';const pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';const sub=url.searchParams.get('subcategory')||'';const args=[cat,cat,brand,brand,q,pattern,pattern,pattern,sub,sub];const products=await all(`SELECT ${productColumns} FROM products p WHERE ${where} AND (?='' OR p.subcategory=?) ORDER BY ((p.sort_key*48271+?) % 2147483647),p.id LIMIT 25 OFFSET ?`,...args,seed,offset);return json({products:products.slice(0,24),more:products.length>24});
 }
 if(path[0]==='media'&&method==='GET'){
  const key=path.slice(1).join('/');const photo=await one('SELECT p.active FROM photos f JOIN products p ON p.id=f.product_id WHERE f.object_key=?',key);if(!photo||!photo.active){const u=await requireUser(req);const history=await one('SELECT oi.id FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE oi.image=? AND (o.user_id=? OR ?=1)',key,u.id,u.role==='admin'?1:0);if(u.avatar!==key&&!(u.role==='admin'&&photo)&&!history)fail(404,'Photo not found.');}
  const obj=await bucket().get(key);if(!obj)fail(404,'Photo not found.');return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
 }
 if(path[0]==='profile'){
  const u=await requireUser(req);
  if(method==='GET')return json(publicUser(u));
  if(method==='POST'&&path[1]==='avatar'){const f=(await req.formData()).get('file');const stored=await uploadPhoto(f as File,'avatars');try{await run('UPDATE users SET avatar=? WHERE id=?',stored.key,u.id);}catch(e){await bucket().delete(stored.key);throw e;}if(u.avatar)await bucket().delete(u.avatar);return json({ok:true});}
  if(method==='POST'&&path[1]==='password'){const b=await body(req);await throttle(req,'password:'+u.id);if(!await verifyPassword(b.current_password,u.password))fail(400,'Current password is incorrect.');const hash=await hashPassword(validatePassword(b.password,u.role));await db().batch([statement('UPDATE users SET password=? WHERE id=?',hash,u.id),statement('DELETE FROM sessions WHERE user_id=?',u.id)]);return json({ok:true},200,await signIn(req,u.id));}
  if(method==='POST'&&path[1]==='delete'){const b=await body(req);await throttle(req,'delete:'+u.id);if(u.role==='admin')fail(400,'The owner account cannot be deleted while it manages this shop.');if(!await verifyPassword(b.password,u.password))fail(400,'Password is incorrect.');if(await one("SELECT id FROM orders WHERE user_id=? AND status NOT IN ('Delivered','Cancelled')",u.id))fail(409,'Wait until your open orders are completed or cancelled before deleting your account.');await db().batch([statement("UPDATE orders SET recipient='Deleted customer',address='',phone='' WHERE user_id=?",u.id),statement('DELETE FROM users WHERE id=?',u.id)]);if(u.avatar)await bucket().delete(u.avatar);return json({ok:true},200,sessionCookie(req,'',0));}
  if(method==='POST'&&path[1]==='gold'){await run('UPDATE users SET gold_requested=1 WHERE id=?',u.id);return json({ok:true});}
  if(method==='PATCH'){
   const b=await body(req),mail=email(b.email);if(mail!==u.email&&!await verifyPassword(b.current_password,u.password))fail(400,'Enter your current password to change your email.');const existing=await one('SELECT id FROM users WHERE email=? AND id<>?',mail,u.id);if(existing)fail(409,'This email is already in use.');const lang=text(b.language||'en','Language',10);if(lang!=='en')fail(400,'English is the available interface language.');await run('UPDATE users SET name=?,email=?,phone=?,recipient=?,address=?,delivery_phone=?,country=?,language=?,notifications=? WHERE id=?',text(b.name,'Name',100),mail,text(b.phone||'','Phone',40,false),text(b.recipient||'','Recipient',100,false),text(b.address||'','Address',1000,false),text(b.delivery_phone||'','Delivery phone',40,false),text(b.country||'Uganda','Country / Region',100),lang,b.notifications?1:0,u.id);return json({user:publicUser(await one('SELECT * FROM users WHERE id=?',u.id))});
  }
 }
 if(path[0]==='history'&&method==='GET'){
  const u=await requireUser(req);const brands=await all("SELECT oi.brand,COUNT(DISTINCT o.id) AS purchases FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.user_id=? AND o.paid=1 AND o.status<>'Cancelled' AND oi.brand<>'' GROUP BY oi.brand ORDER BY purchases DESC,oi.brand LIMIT 20",u.id);const products=await all(`SELECT ${productColumns} FROM products p WHERE p.active=1 AND p.id IN (SELECT oi.product_id FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.user_id=? AND o.paid=1 AND o.status<>'Cancelled') ORDER BY p.created_at DESC`,u.id);return json({brands,products});
 }
 if(path[0]==='cart'){
  const u=await requireUser(req);
  if(method==='GET')return json(await all(`SELECT ${productColumns},c.quantity AS cart_quantity FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=? ORDER BY p.name`,u.id));
  if(method==='DELETE'){await run('DELETE FROM cart WHERE user_id=? AND product_id=?',u.id,path[1]);return json({ok:true});}
  if(method==='POST'){
   const b=await body(req),p=await product(text(b.product_id,'Product'));const qty=integer(b.quantity,'Quantity',1,10000);const prev=await one('SELECT quantity FROM cart WHERE user_id=? AND product_id=?',u.id,p.id);const next=b.replace?qty:(prev?.quantity||0)+qty;if(next>10000)fail(400,'You can order up to 10,000 units of one product at a time.');if(next>p.quantity)fail(409,`Only ${p.quantity} ${p.unit} available.`);await run('INSERT INTO cart(user_id,product_id,quantity) VALUES(?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity',u.id,p.id,next);return json({ok:true});
  }
 }
 if(path[0]==='orders'){
  const u=await requireUser(req);
  if(method==='GET')return json(await ordersFor(u));
  if(method==='POST'){
   const b=await body(req),request=text(b.request_id,'Checkout reference',80);const old=await one('SELECT id FROM orders WHERE request_id=? AND user_id=?',request,u.id);if(old)return json({id:old.id});const rows=await all(`SELECT c.*,p.name,p.brand,p.price,p.unit,COALESCE((SELECT object_key FROM photos WHERE id=p.cover_image),(SELECT object_key FROM photos WHERE product_id=p.id ORDER BY position,id LIMIT 1)) AS image FROM cart c JOIN products p ON p.id=c.product_id WHERE c.user_id=?`,u.id);if(!rows.length)fail(400,'Your cart is empty.');const s=await shopSettings(),id=crypto.randomUUID(),recipient=text(b.recipient,'Recipient',100),address=text(b.address,'Delivery address',1000),phone=text(b.phone,'Delivery phone',40);
   // The first statement reserves an order only when every cart row is still available.
   // All later statements depend on that order existing, so a failed reservation changes nothing.
   const available=`EXISTS(SELECT 1 FROM cart WHERE user_id=?) AND NOT EXISTS(SELECT 1 FROM cart c LEFT JOIN products p ON p.id=c.product_id WHERE c.user_id=? AND (p.id IS NULL OR p.active<>1 OR p.quantity<c.quantity))`;
   const statements=[statement(`INSERT INTO orders(id,user_id,request_id,delivery_fee,currency,recipient,address,phone,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE ${available}`,id,u.id,request,s.delivery_fee,s.currency,recipient,address,phone,Date.now(),u.id,u.id)];
   for(const c of rows){
    statements.push(statement(`INSERT INTO order_items(id,order_id,product_id,name,brand,price,unit,quantity,image) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=?)`,crypto.randomUUID(),id,c.product_id,c.name,c.brand,c.price,c.unit,c.quantity,c.image,id));
    statements.push(statement('UPDATE products SET quantity=quantity-?,version=version+1 WHERE id=? AND active=1 AND quantity>=? AND EXISTS(SELECT 1 FROM orders WHERE id=?)',c.quantity,c.product_id,c.quantity,id));
   }
   statements.push(statement('UPDATE orders SET total=delivery_fee+(SELECT COALESCE(SUM(price*quantity),0) FROM order_items WHERE order_id=?) WHERE id=?',id,id));statements.push(statement('DELETE FROM cart WHERE user_id=? AND EXISTS(SELECT 1 FROM orders WHERE id=?)',u.id,id));
   try{const result:any[]=await db().batch(statements);if(!result[0]?.meta?.changes)fail(409,'A product is unavailable or has insufficient stock. Review your cart and try again.');}catch(e){const existing=await one('SELECT id FROM orders WHERE request_id=? AND user_id=?',request,u.id);if(existing)return json({id:existing.id});if(e instanceof ApiError)throw e;throw e;}return json({id},201);
  }
 }
 if(path[0]==='admin'){
  const u=await requireUser(req,true);const b=method!=='GET'&&req.headers.get('content-type')?.includes('application/json')?await body(req):{};
  if(path[1]==='overview'&&method==='GET'){const counts=await one("SELECT COUNT(*) AS orders,COALESCE(SUM(CASE WHEN paid=1 AND status<>'Cancelled' THEN total ELSE 0 END),0) AS revenue,SUM(CASE WHEN status NOT IN ('Delivered','Cancelled') THEN 1 ELSE 0 END) AS open_orders FROM orders");return json({...counts,products:(await one('SELECT COUNT(*) AS n FROM products')).n,customers:(await one("SELECT COUNT(*) AS n FROM users WHERE role='customer'")).n,low_stock:await all(`SELECT ${productColumns} FROM products p WHERE p.active=1 AND p.quantity<=5 ORDER BY p.quantity`)});}
  if(path[1]==='products'){
   if(method==='GET')return json(path[2]?await product(path[2],true):await all(`SELECT ${productColumns} FROM products p ORDER BY created_at DESC`));
   if(method==='POST'&&!path[2]){const data=productData(b),id=crypto.randomUUID();await run('INSERT INTO products(name,description,brand,category,subcategory,price,unit,quantity,active,id,sort_key,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',...data,id,crypto.getRandomValues(new Uint32Array(1))[0]%2147483647,Date.now());return json(await product(id,true),201);}
   if(method==='PATCH'&&path[2]){const data=productData(b),version=integer(b.version,'Product version',1);const res=await run('UPDATE products SET name=?,description=?,brand=?,category=?,subcategory=?,price=?,unit=?,quantity=?,active=?,version=version+1 WHERE id=? AND version=?',...data,path[2],version);if(!res.meta.changes)fail(409,'This product or its stock changed. Reload the product before saving.');return json(await product(path[2],true));}
   if(method==='POST'&&path[3]==='photos'){await product(path[2],true);const f=(await req.formData()).get('file');const saved=await uploadPhoto(f as File,'products');try{await run('INSERT INTO photos(id,product_id,object_key,content_type,position) VALUES(?,?,?,?,?)',crypto.randomUUID(),path[2],saved.key,saved.type,Date.now());}catch(e){await bucket().delete(saved.key);throw e;}return json(await product(path[2],true),201);}
  }
  if(path[1]==='photos'&&path[2]){
   const p=await one('SELECT * FROM photos WHERE id=?',path[2]);if(!p)fail(404,'Photo not found.');
   if(method==='PATCH'){await run('UPDATE products SET cover_image=?,version=version+1 WHERE id=?',p.id,p.product_id);return json({ok:true});}
   if(method==='DELETE'){await db().batch([statement('UPDATE products SET cover_image=NULL,version=version+1 WHERE cover_image=?',p.id),statement('DELETE FROM photos WHERE id=?',p.id)]);if(!await one('SELECT id FROM order_items WHERE image=? LIMIT 1',p.object_key))await bucket().delete(p.object_key);return json({ok:true});}
  }
  if(path[1]==='orders'){
   if(method==='GET')return json(await ordersFor(u,true));
   if(method==='PATCH'){
    const o=await one('SELECT * FROM orders WHERE id=?',path[2]);if(!o)fail(404,'Order not found.');const status=text(b.status,'Status');if(!STATUSES.includes(status))fail(400,'Choose a valid status.');if(['Cancelled','Delivered'].includes(o.status)&&status!==o.status)fail(409,'Completed or cancelled orders cannot change status.');if(status===o.status&&status==='Cancelled')return json({ok:true});if(status!=='Cancelled'&&STATUSES.indexOf(status)<STATUSES.indexOf(o.status))fail(400,'Order status cannot move backwards.');if(status==='Cancelled'&&o.paid)fail(400,'Record the refund by clearing Paid before cancelling this order.');const date=String(b.delivery_date||'');if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||isNaN(Date.parse(date))))fail(400,'Use a valid delivery date.');if(status==='Cancelled'){await db().batch([statement('UPDATE orders SET status=?,paid=?,delivery_date=? WHERE id=? AND status=?',status,b.paid?1:0,date,o.id,o.status),statement(`UPDATE products SET quantity=quantity+COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id=? AND product_id=products.id),0),version=version+1 WHERE id IN (SELECT product_id FROM order_items WHERE order_id=?)`,o.id,o.id)]);}else await run('UPDATE orders SET status=?,paid=?,delivery_date=? WHERE id=? AND status=?',status,b.paid?1:0,date,o.id,o.status);return json({ok:true});
   }
  }
  if(path[1]==='customers'&&method==='GET')return json(await all("SELECT id,name,email,phone,created_at,gold_requested FROM users WHERE role='customer' ORDER BY created_at DESC"));
  if(path[1]==='settings'&&method==='PATCH'){
   const currency=text(b.currency,'Currency',3).toUpperCase();if(!['UGX','KRW','USD','KES','TZS','RWF','EUR','GBP'].includes(currency))fail(400,'Choose a supported currency.');const current=await shopSettings();if(currency!==current.currency&&(await one('SELECT COUNT(*) AS n FROM products')).n)fail(409,'Set the shop currency before adding products. Existing prices must not be silently reinterpreted.');const values={name:text(b.name,'Shop name',100),currency,delivery_fee:price(b.delivery_fee,'Delivery fee'),gold_description:text(b.gold_description||'','Membership details',2000,false)};await db().batch(Object.entries(values).map(([k,v])=>statement('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',k,String(v))));return json(await shopSettings());
  }
 }
 fail(404,'Page not found.');
 }catch(e){if(e instanceof ApiError)return json({error:e.message,...(e.code?{code:e.code}:{})},e.status);console.error('GURA request failed',e);return json({error:'The request could not be completed. Please try again. Your changes have not been confirmed.'},500);}}
export {handler as GET,handler as POST,handler as PATCH,handler as DELETE};
