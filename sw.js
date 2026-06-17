const CACHE='prochistka-calc-v4-1-edit-lock';
const ASSETS=['./','./index.html','./config.js','./assets/style.css','./assets/app.js','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));});
self.addEventListener('fetch',e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});
