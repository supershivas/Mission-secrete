const CACHE = 'agent-v63';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/tv.html',
  '/livret.html',
  '/manifest.json',
  '/css/style.css',
  '/js/config.js',
  '/js/audio.js',
  '/js/artefacts.js',
  '/js/animations.js',
  '/js/session.js',
  '/js/app.js',
  '/js/names.js',
  '/js/teams.js',
  '/js/challenges.js',
  '/js/timer.js',
  '/js/pin.js',
  '/js/resume.js',
  '/js/main.js',
  'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network-first pour HTML et JS/CSS : toujours la dernière version
  if (url.pathname.endsWith('.html') || url.pathname === '/' ||
      url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first pour les autres assets (images, fonts, icons)
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
