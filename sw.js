const CACHE_PREFIX='prochistka-calc-';
const CACHE=`${CACHE_PREFIX}v4-9-1`;
const ASSETS=['./','./index.html','./config.js','./assets/style.css','./assets/vendor/html2pdf.bundle.min.js','./assets/core.js','./assets/js/state.js','./assets/js/helpers.js','./assets/js/settings.js','./assets/js/estimate.js','./assets/js/main.js','./manifest.json'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key))
  )));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin) return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy));
    }
    return response;
  }).catch(()=>caches.match(request).then(cached=>{
    if(cached) return cached;
    if(request.mode==='navigate') return caches.match('./index.html');
    return Response.error();
  })));
});
