'use strict';
// Replaced with the content hash and explicit runtime list by build_web.py.
const VERSION='d1f6bec6c5d85a08';
const FILES=["./", "./app.js", "./assets/02554947-4873-47db-a2d0-b6fbcda2dde4.woff2", "./assets/096d242a-6708-4e24-afd8-089dd65453ed.jpg", "./assets/0b8dd18d-023c-4bc6-8fbe-576c2a634560.jpg", "./assets/216806d8-c097-4828-be87-848f81b4c610.jpg", "./assets/6608d240-a9f6-48f8-a94c-87954d14d323.woff2", "./assets/66e15ebd-7d58-4e16-8a6f-973ac1d18128.jpg", "./assets/7361e67e-81bd-48f3-8300-992ac0dd19fe.jpg", "./assets/7fcd9037-d219-42a0-a6db-19228152a4d1.js", "./assets/89838fa0-d6b9-4225-a5a0-943ace2860a6.js", "./assets/FONT-LICENSE.txt", "./assets/d6c53ad2-50cd-43a5-a9b9-03ba8b4326f9.js", "./assets/d9f7b6f0-e64c-44d2-b035-7eefe19b15e1.jpg", "./assets/fb149150-61bf-4816-a6a7-6437330a46a4.jpg", "./assets/pelvic-clam-v1.png", "./assets/pelvic-lift-v1.png", "./assets/pelvic-plank-v1.png", "./assets/pelvic-squeeze-v1.png", "./icon.svg", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./index.html", "./manifest.webmanifest", "./neck.html", "./pelvic-plan.js", "./pelvic-sources.js", "./pelvic.css", "./pelvic.html", "./pelvic.js", "./strength-plan.js", "./strength.css", "./strength.html", "./strength.js", "./style.css"];
const PREFIX='movement:'+self.registration.scope+':';
const CACHE=PREFIX+VERSION;
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(FILES))
));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    const url=new URL(event.request.url);
    if(event.request.mode==='navigate'&&url.pathname===new URL('./',self.registration.scope).pathname)
      return await cache.match('./index.html')||fetch(event.request);
    return fetch(event.request);
  })());
});
