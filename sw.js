// RAAJ MULTIMEDIA - Service Worker for PWA
const CACHE_NAME='raaj-pwa-v2';
const URLS_TO_CACHE=['./app.html','./manifest.json'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.url.includes('supabase')||e.request.url.includes('paystack')||e.request.url.includes('esm.sh')||e.request.url.includes('cdn.tailwindcss.com'))return;
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
      if(resp.ok&&e.request.url.startsWith('http')){
        const clone=resp.clone();
        caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
      }
      return resp;
    }).catch(()=>{
      if(e.request.destination==='document')return caches.match('./app.html');
    }))
  );
});