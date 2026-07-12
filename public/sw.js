const CACHE_NAME = 'toolbox-v2';
const PRECACHE_URLS = ['/', '/icon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))),
	);
	self.clients.claim();
});

function canCache(response) {
	return response.ok && response.type === 'basic';
}

async function cacheResponse(request, response) {
	if (!canCache(response)) return;
	const cache = await caches.open(CACHE_NAME);
	await cache.put(request, response.clone());
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET' || !request.url.startsWith(self.location.origin) || request.headers.has('range')) return;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					event.waitUntil(cacheResponse(request, response));
					return response;
				})
				.catch(async () => (await caches.match(request)) || (await caches.match('/'))),
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			const networkResponse = fetch(request).then((response) => {
				event.waitUntil(cacheResponse(request, response));
				return response;
			});

			if (cachedResponse) {
				event.waitUntil(networkResponse.catch(() => undefined));
				return cachedResponse;
			}

			return networkResponse;
		}),
	);
});
