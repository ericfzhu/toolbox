const CACHE_NAME = 'toolbox-v1';

// Add all static assets and pages to cache
const urlsToCache = [
	'/',
	'/icon.jpg',
	'/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(urlsToCache);
		})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip cross-origin requests
	if (!event.request.url.startsWith(self.location.origin)) return;

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			// Return cached response if available
			if (cachedResponse) {
				// Fetch and update cache in background
				event.waitUntil(
					fetch(event.request).then((response) => {
						if (response.ok) {
							caches.open(CACHE_NAME).then((cache) => {
								cache.put(event.request, response);
							});
						}
					}).catch(() => {})
				);
				return cachedResponse;
			}

			// Otherwise fetch from network and cache
			return fetch(event.request).then((response) => {
				if (!response.ok) return response;

				const responseToCache = response.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(event.request, responseToCache);
				});

				return response;
			}).catch(() => {
				// Return offline fallback if available
				return caches.match('/');
			});
		})
	);
});
