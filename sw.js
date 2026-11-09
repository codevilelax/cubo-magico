// Guarda o app no celular para abrir sem internet.
// Tenta a internet primeiro (para pegar atualizações) e, sem conexão, usa a cópia guardada.
const CACHE = 'cubo-magico-v1';

self.addEventListener('install', e => {
  const arquivos = [
    './', './index.html', './manifest.json',
    './js/cubo.js', './js/conteudo.js', './js/desenho.js', './js/app.js',
    './icone-180.png', './icone-192.png', './icone-512.png', './abertura-iphone14.png',
  ];
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(arquivos)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(resposta => {
        const copia = resposta.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return resposta;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
