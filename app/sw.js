// 오프라인에서도 열리도록 앱 파일을 저장해 두는 서비스 워커
// 새 버전을 올릴 때는 아래 VERSION 숫자를 올리세요.
const VERSION = 'v1.17.2';
// 웹 앱만 고쳐 다시 올릴 때는 BUILD 숫자를 올리세요 (PC 프로그램 버전과 따로)
const BUILD = 1;
const CACHE = 'markcont-' + VERSION + '-' + BUILD;

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './docs/guide.md',
  './docs/writing-rules.md',
  './docs/workflow-rules.md',
  './docs/workflow-rules.en.md',
  './docs/features.md',
  './docs/style-rules.md',
  './docs/licenses.md',
  './docs/guide.en.md',
  './docs/writing-rules.en.md',
  './docs/features.en.md',
  './docs/style-rules.en.md',
  './docs/licenses.en.md',
  './app.js',
  './i18n.js',
  './diagram.js',
  './portable.js',
  './cjk.js',
  './paste.js',
  './docx.js',
  './richcopy.js',
  './vendor/highlight.min.js',
  './vendor/hljs-github-dark.min.css',
  './vendor/hljs-github.min.css',
  './vendor/katex/fonts/KaTeX_AMS-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff2',
  './vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Fraktur-Bold.woff2',
  './vendor/katex/fonts/KaTeX_Fraktur-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Main-Bold.woff2',
  './vendor/katex/fonts/KaTeX_Main-BoldItalic.woff2',
  './vendor/katex/fonts/KaTeX_Main-Italic.woff2',
  './vendor/katex/fonts/KaTeX_Main-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Math-BoldItalic.woff2',
  './vendor/katex/fonts/KaTeX_Math-Italic.woff2',
  './vendor/katex/fonts/KaTeX_SansSerif-Bold.woff2',
  './vendor/katex/fonts/KaTeX_SansSerif-Italic.woff2',
  './vendor/katex/fonts/KaTeX_SansSerif-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Script-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Size1-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Size2-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Size3-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Size4-Regular.woff2',
  './vendor/katex/fonts/KaTeX_Typewriter-Regular.woff2',
  './vendor/katex/katex.min.css',
  './vendor/katex/katex.min.js',
  './vendor/katex/mhchem.min.js',
  './vendor/markdown-it-deflist.min.js',
  './vendor/markdown-it-emoji-data.js',
  './vendor/markdown-it-footnote.min.js',
  './vendor/markdown-it-ins.min.js',
  './vendor/markdown-it-mark.min.js',
  './vendor/markdown-it.min.js',
  './vendor/mermaid.min.js',
  './vendor/pretendard/pretendard.css',
  './vendor/pretendard/woff2/PretendardVariable.woff2',
  './vendor/purify.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('markcont-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // 화면(index.html · 화면 본체 app.js)과 안내 문서: 인터넷이 되면 항상 새로 받고, 안 될 때만 저장해 둔 것
    // (저장본을 먼저 쓰면 새 버전을 올려도 예전 화면이 계속 보이는 문제가 있었음.
    //  app.js 는 index.html 과 늘 짝이 맞아야 해서 같이 새로 받음)
    const fresh = req.mode === 'navigate' || /\/(index\.html|app\.js|manifest\.webmanifest)?$/.test(url.pathname) || url.pathname.includes('/docs/');
    if (fresh) {
      event.respondWith(
        caches.open(CACHE).then(async (cache) => {
          try {
            // 페이지 이동(navigate) 요청은 옵션을 붙여 다시 만들 수 없어서, 주소로 새 요청을 만듦
            const target = req.mode === 'navigate'
              ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' })
              : new Request(req, { cache: 'no-cache' });
            const res = await fetch(target);
            if (res.ok) cache.put(req, res.clone());
            return res;
          } catch {
            return (await cache.match(req, { ignoreSearch: true })) ||
              (req.mode === 'navigate' && (await cache.match('./index.html'))) || Response.error();
          }
        })
      );
      return;
    }
    // 라이브러리 · 글꼴 · 아이콘: 버전마다 바뀌지 않으니 저장해 둔 것을 먼저 씀
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // 글꼴(구글 폰트) 같은 바깥 파일: 인터넷이 되면 받아오고, 안 되면 저장해 둔 것
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const res = await fetch(req);
          cache.put(req, res.clone());
          return res;
        } catch {
          return (await cache.match(req)) || Response.error();
        }
      })
    );
  }
});
