const RUNTIME_CACHE = 'jeleupec-runtime-v1'
const API_CACHE = 'jeleupec-api-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => {
              const isOldRuntime = name.startsWith('jeleupec-runtime-') && name !== RUNTIME_CACHE
              const isOldApi = name.startsWith('jeleupec-api-') && name !== API_CACHE
              return isOldRuntime || isOldApi
            })
            .map((name) => caches.delete(name))
        )
      ),
      self.clients.claim().then(() => {
        // Avisa todas as abas que há uma nova versão
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }))
        })
      }),
    ])
  )
})

// Network-first com fallback pro cache, tanto pra páginas quanto pras
// respostas GET da API (/api/leite, /api/animais...). Assim, quando fica
// sem internet, a tela continua mostrando os últimos dados que já tinham
// sido carregados, em vez de aparecer vazia. Só GET é cacheado — envios
// (POST) continuam passando direto e são tratados pela fila offline em
// src/lib/offlineQueue.ts.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  const cacheName = request.url.includes('/api/') ? API_CACHE : RUNTIME_CACHE

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(cacheName).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || Promise.reject('offline-sem-cache')))
  )
})

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'J.ELEUPEC'
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url ?? '/dashboard/alertas' },
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard/alertas'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
