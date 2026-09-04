const CACHE_NAME = "pre-atendimento-shell-v1";
const APP_SHELL = ["/manifest.json", "/icons/icon-192x192.png", "/icons/icon-512x512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

// Estratégia network-first: sempre tenta a rede primeiro (dados do
// paciente/psicólogo nunca podem ficar desatualizados por causa de
// cache), e só cai pro cache/offline se a rede falhar. Não fazemos
// cache de nenhuma resposta autenticada dinâmica — só do app shell
// estático definido acima.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match("/manifest.json"))
    )
  );
});
