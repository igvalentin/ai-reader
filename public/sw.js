const CACHE_NAME = 'ai-reader-shell-v1'
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/app-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([...APP_SHELL, '/icons/app-icon-192.png', '/icons/app-icon-512.png']),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || request.headers.has('authorization')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedApp = await caches.match('/')
        return cachedApp || Response.error()
      }),
    )
    return
  }

  const isAppShellAsset =
    APP_SHELL.includes(url.pathname) ||
    url.pathname === '/icons/app-icon-192.png' ||
    url.pathname === '/icons/app-icon-512.png'
  const isBuiltAsset =
    url.pathname.startsWith('/assets/') &&
    ['script', 'style', 'font', 'image'].includes(request.destination)

  if (!isAppShellAsset && !isBuiltAsset) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request)
      if (cachedResponse) return cachedResponse

      const response = await fetch(request)
      const contentType = response.headers.get('content-type') || ''
      const isSafeAsset =
        response.ok &&
        response.type === 'basic' &&
        !contentType.includes('audio') &&
        !contentType.includes('application/json')

      if (isSafeAsset) await cache.put(request, response.clone())
      return response
    }),
  )
})
