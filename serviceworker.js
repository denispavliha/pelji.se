
const cacheName = 'pelji-se-v1';

const assetsToCache = [
    '/style-wip.css',
    '/index-wip.htm',
    '/script-wip.js',
    '/images/bus-1.png',
	'/images/bus-1-tracked.png',
	'/images/bus-2.png',
	'/images/bus-2-tracked.png',
	'/images/bus-4.png',
	'/images/bus-4-tracked.png',
	'/images/logo.png',
	'/images/tooltip-background.png',
	'/images/tracker.png'
];

self.addEventListener('install', ( event ) => {
    event.waitUntil(  
        caches.open(cacheName).then((cache) => {
              return cache.addAll(assetsToCache);
        })
      );
});

self.addEventListener('fetch', event => {
  console.log('Fetch event for ', event.request.url);
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      if (response) {
        console.log('Found ', event.request.url, ' in cache');
        return response;
      }
      console.log('Network request for ', event.request.url);
      return fetch(event.request)

      // TODO 4 - Add fetched files to the cache

    }).catch(error => {

      debugger;

    })
  );
});