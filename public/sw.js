// Network-only shopping: never cache account details, orders, or authenticated API responses.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GURA · Offline</title><body style="font-family:Arial;padding:40px;color:#14232e"><h1>You’re offline</h1><p>Connect to the internet to open GURA and continue shopping.</p><button onclick="location.reload()">Try again</button></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
});
