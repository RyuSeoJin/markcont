// markcont 서식 그대로 복사: 지금 보이는 모양(표 · 알림 상자 · 코드 색)을 요소마다 style 로 넣은 HTML 로 바꿔
// 메일 · 노션 · 구글 문서 · 블로그 편집기에 붙여 넣어도 모양이 남게 합니다. 라이브러리 없이.
// - 어두운 테마여도 밝은 색으로: 숨은 틀(iframe)에 밝은 테마로 따로 그려 그 색을 읽음 (Word 저장도 이 틀을 씀)
// - color-mix() · 반투명 색은 바탕과 섞은 #rrggbb 로 (메일 · 노션은 color(srgb …) 를 못 읽음)
// - 수식 · 다이어그램은 PNG 그림으로, blob: 그림은 data 주소로 (붙여 넣은 곳에서 사라지지 않게)
// - ::before 로 그린 번호 · 아이콘(단계 번호 · 파일 트리 · 메모 표시)은 글자로 꺼내 넣음
// window.MarkRich = { frame(opts) → Promise<틀>, toHtml(틀) → Promise<string> }
(function () {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escA = (s) => esc(s).replace(/"/g, '&quot;');
  const q = (v) => String(v).replace(/"/g, "'");
  const dataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

  // ---------- 밝은 테마의 숨은 틀 ----------
  async function frame({ css = '', vars = '', width = 800, sheets = [] } = {}) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.tabIndex = -1;
    f.style.cssText = `position:fixed;left:-40000px;top:0;width:${Math.max(320, Math.round(width))}px;height:800px;border:0;pointer-events:none;`;
    document.body.append(f);
    const d = f.contentDocument;
    d.open();
    d.write('<!doctype html><html data-theme="light"><head><meta charset="utf-8">' +
      `<base href="${escA(document.baseURI)}">` + sheets.map((h) => `<link rel="stylesheet" href="${escA(h)}">`).join('') +
      `<style>${css}\n${vars}\nhtml,body{margin:0;background:#fff}</style></head><body><article class="markdown-body"></article></body></html>`);
    d.close();
    await Promise.all([...d.querySelectorAll('link')].map((l) => new Promise((r) => { if (l.sheet) r(); else l.onload = l.onerror = () => r(); })));
    return { el: f, win: f.contentWindow, doc: d, root: d.querySelector('article'), dispose() { f.remove(); } };
  }

  // ---------- 색: 무엇이든 #rrggbb 로 (반투명이면 바탕과 섞어서) ----------
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const memo = new Map();
  const alpha = (s) => (s == null ? 1 : s.endsWith('%') ? parseFloat(s) / 100 : +s);
  function rgba(c) {
    if (memo.has(c)) return memo.get(c);
    let v, m;
    if ((m = c.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/))) v = [+m[1], +m[2], +m[3], alpha(m[4])];
    else if ((m = c.match(/^color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/))) v = [m[1] * 255, m[2] * 255, m[3] * 255, alpha(m[4])];
    else { // 그 밖의 색 공간(oklch · lab …): 1픽셀에 칠해서 읽음
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = c;
      cx.fillRect(0, 0, 1, 1);
      const p = cx.getImageData(0, 0, 1, 1).data;
      v = [p[0], p[1], p[2], p[3] / 255];
    }
    memo.set(c, v);
    return v;
  }
  const hx = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  function hex(c, bg = '#ffffff') {
    const [r, g, b, a] = rgba(c);
    if (a >= 0.999) return '#' + hx(r) + hx(g) + hx(b);
    const B = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
    return '#' + hx(r * a + B[0] * (1 - a)) + hx(g * a + B[1] * (1 - a)) + hx(b * a + B[2] * (1 - a));
  }
  const clear = (c) => !c || rgba(c)[3] < 0.004;

  // ---------- 붙여 넣기 전에: 그림 · 동영상 · 다이어그램 · 수식 ----------
  async function shrinkToUrl(src) {
    const blob = await (await fetch(src)).blob();
    if (blob.size > 1.5e6 && /^image\/(png|jpeg|webp)/.test(blob.type) && window.createImageBitmap) {
      // 큰 사진은 너비 1600px · JPEG 로 줄여서 (붙여 넣는 곳이 너무 큰 글을 버리지 않게)
      const bm = await createImageBitmap(blob);
      const sc = Math.min(1, 1600 / bm.width);
      if (sc < 1) {
        const c = document.createElement('canvas');
        c.width = Math.round(bm.width * sc);
        c.height = Math.round(bm.height * sc);
        const g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(bm, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.9);
      }
    }
    return dataUrl(blob);
  }
  async function prepare(fr) {
    const d = fr.doc, root = fr.root;
    root.querySelectorAll('.footnote-backref').forEach((x) => x.remove()); // 각주 끝의 ↩︎ (붙여 넣은 곳에서는 못 누름)
    for (const m of root.querySelectorAll('video, audio')) {
      const src = m.getAttribute('src') || m.querySelector('source')?.getAttribute('src') || '';
      const name = m.getAttribute('title') || m.getAttribute('aria-label') || (/^blob:/.test(src) ? '' : decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || ''));
      const a = d.createElement(/^https?:/i.test(src) ? 'a' : 'span');
      if (a.tagName === 'A') a.href = src;
      a.textContent = (m.tagName === 'VIDEO' ? '🎬 ' : '🔊 ') + (name || (m.tagName === 'VIDEO' ? 'video' : 'audio'));
      m.replaceWith(a);
    }
    const imgs = [...root.querySelectorAll('img')];
    for (const img of imgs) {
      img.removeAttribute('loading');
      const src = img.getAttribute('src') || '';
      if (/^blob:/.test(src)) {
        try { img.setAttribute('src', await shrinkToUrl(src)); } catch { img.replaceWith(d.createTextNode(img.alt ? `[${img.alt}]` : '')); }
      }
    }
    await Promise.all(imgs.filter((i) => i.isConnected && !i.complete).map((i) => i.decode().catch(() => {})));
    // 다이어그램 · 그 밖의 SVG → PNG (데이터 정의 카드 사이 선처럼 겹쳐 그린 SVG 는 옮길 수 없어 뺌)
    for (const svg of [...root.querySelectorAll('svg')]) {
      if (!svg.isConnected || svg.parentElement.closest('svg')) continue;
      if (svg.closest('.dg-html')) { svg.remove(); continue; }
      try {
        const p = await window.MarkDocx.svgToPng(svg);
        const img = d.createElement('img');
        img.src = await dataUrl(p.blob);
        img.width = p.w;
        img.height = p.h;
        img.alt = svg.getAttribute('aria-label') || '';
        svg.replaceWith(img);
      } catch { svg.remove(); }
    }
    await mathImages(fr);
  }

  // 수식: KaTeX 로 그린 모양을 글꼴째 SVG(foreignObject)에 담아 PNG 로. 안 되면 $TeX$ 글자로
  async function katexCss(fr, ks) {
    const sheet = [...fr.doc.styleSheets].find((s) => /katex/i.test(s.href || ''));
    if (!sheet) throw new Error('no katex css');
    const used = new Set();
    for (const k of ks) {
      for (const n of [k, ...k.querySelectorAll('.katex-html *')]) {
        const cs = fr.win.getComputedStyle(n);
        const fam = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
        if (/^KaTeX_/.test(fam)) used.add(`${fam}|${+cs.fontWeight >= 600 ? 'b' : 'n'}|${cs.fontStyle === 'italic' ? 'i' : 'n'}`);
      }
    }
    let faces = '', rest = '';
    for (const r of sheet.cssRules) {
      if (r.type !== 5) { rest += r.cssText; continue; } // 5 = @font-face
      const fam = r.style.getPropertyValue('font-family').trim().replace(/^["']|["']$/g, '');
      const w = /bold|[6-9]00/.test(r.style.getPropertyValue('font-weight')) ? 'b' : 'n';
      const it = /italic/.test(r.style.getPropertyValue('font-style')) ? 'i' : 'n';
      if (!used.has(`${fam}|${w}|${it}`)) continue;
      const m = r.style.getPropertyValue('src').match(/url\(["']?([^"')]+?\.woff2)["']?\)/);
      if (!m) continue;
      const font = await dataUrl(await (await fetch(new URL(m[1], sheet.href).href)).blob());
      faces += `@font-face{font-family:${fam};src:url(${font}) format("woff2");font-weight:${w === 'b' ? 700 : 400};font-style:${it === 'i' ? 'italic' : 'normal'}}`;
    }
    return faces + rest;
  }
  async function mathImg(fr, k, css) {
    const d = fr.doc, win = fr.win;
    const old = k.getAttribute('style');
    k.style.display = 'inline-block'; // 블록 수식도 글자 폭만큼만 재려고
    const r = k.getBoundingClientRect();
    const mk = d.createElement('span');
    mk.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    k.after(mk);
    const base = mk.getBoundingClientRect().bottom; // 빈 inline-block 의 아래 끝 = 글줄 기준선
    mk.remove();
    if (old == null) k.removeAttribute('style'); else k.setAttribute('style', old);
    const pad = 2, w = Math.ceil(r.width) + pad * 2, h = Math.ceil(r.height) + pad * 2;
    if (w < 4 || h < 4) throw new Error('empty');
    const copy = k.cloneNode(true);
    copy.querySelector('.katex-mathml')?.remove();
    copy.style.display = 'inline-block';
    const fs = win.getComputedStyle(k.parentElement).fontSize, color = win.getComputedStyle(k).color;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="${w}" height="${h}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="padding:${pad}px;font-size:${fs};color:${color};line-height:normal;white-space:nowrap"><style><![CDATA[${css}]]></style>` +
      new XMLSerializer().serializeToString(copy) + '</div></foreignObject></svg>';
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await im.decode();
    const sc = 2, c = document.createElement('canvas');
    c.width = w * sc;
    c.height = h * sc;
    const g = c.getContext('2d');
    g.scale(sc, sc);
    g.drawImage(im, 0, 0, w, h);
    const img = d.createElement('img');
    img.src = c.toDataURL('image/png'); // 캔버스가 막히면(SecurityError) 글자로
    img.width = w;
    img.height = h;
    img.alt = k.getAttribute('data-tex') || '';
    if (k.hasAttribute('data-tex')) img.setAttribute('data-tex', k.getAttribute('data-tex'));
    if (k.closest('.katex-display')) img.setAttribute('data-display', '1');
    img.style.verticalAlign = `${-Math.max(0, Math.round(r.bottom + pad - base))}px`;
    return img;
  }
  async function mathImages(fr) {
    const ks = [...fr.root.querySelectorAll('.katex')].filter((k) => !k.parentElement.closest('.katex'));
    if (!ks.length) return;
    try { await fr.doc.fonts.ready; } catch {}
    let css = null;
    try { css = await katexCss(fr, ks); } catch {}
    for (const k of ks) {
      const box = k.closest('.katex-display');
      let rep = null;
      if (css != null) { try { rep = await mathImg(fr, k, css); } catch {} }
      if (!rep) {
        rep = fr.doc.createElement('code');
        const t = k.getAttribute('data-tex') || (k.querySelector('.katex-html') || k).textContent;
        rep.textContent = box ? `$$${t}$$` : `$${t}$`;
      }
      if (box) {
        const p = fr.doc.createElement('div');
        p.style.textAlign = 'center';
        p.style.margin = '0.6em 0';
        p.append(rep);
        box.replaceWith(p);
      } else k.replaceWith(rep);
    }
  }

  // ---------- 요소마다 style 넣어 HTML 로 ----------
  const SKIP = /^(SCRIPT|STYLE|BUTTON|TEMPLATE|TEXTAREA|SELECT|NOSCRIPT|IFRAME|OBJECT|EMBED|CANVAS|svg|VIDEO|AUDIO|SOURCE|TRACK|LINK|META)$/;
  const RENAME = { DETAILS: 'div', SUMMARY: 'div', SECTION: 'div', ARTICLE: 'div', NAV: 'div', ASIDE: 'div', HEADER: 'div', FOOTER: 'div', MAIN: 'div', FIGURE: 'div', FIGCAPTION: 'div', LABEL: 'span' };
  const INLINE = /^(a|abbr|b|bdi|bdo|cite|code|del|dfn|em|i|ins|kbd|mark|q|s|samp|small|span|strong|sub|sup|time|u|var|img|br)$/;
  const DISPLAY = { li: 'list-item', table: 'table', tr: 'table-row', td: 'table-cell', th: 'table-cell', thead: 'table-header-group', tbody: 'table-row-group', tfoot: 'table-footer-group', caption: 'table-caption', colgroup: 'table-column-group', col: 'table-column' };
  const defDisplay = (t) => (INLINE.test(t) ? 'inline' : DISPLAY[t] || 'block');
  const TEXT = ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'text-align', 'white-space', 'text-transform', 'letter-spacing'];
  const SIDES = ['top', 'right', 'bottom', 'left'];

  function serialize(fr) {
    const gcs = (e, p) => fr.win.getComputedStyle(e, p);
    const rootCs = gcs(fr.root);
    const counterOf = (e) => { // ::: 단계 번호: 같은 종류 형제 중 몇째
      let i = 1;
      for (let s = e.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === e.tagName) i++;
      const start = e.parentElement && +e.parentElement.getAttribute('start');
      return String(start ? start + i - 1 : i);
    };
    function pseudo(e, which, cs, bg, col) {
      const ps = gcs(e, which), c = ps.content;
      if (!c || c === 'none' || c === 'normal' || ps.display === 'none') return null;
      let text = '';
      for (const m of c.matchAll(/"((?:[^"\\]|\\.)*)"|attr\(\s*([\w-]+)\s*\)|counters?\(\s*([\w-]+)[^)]*\)/g)) {
        if (m[1] != null) text += m[1].replace(/\\([0-9a-fA-F]{2,6}) ?|\\(.)/g, (_, h, ch) => (h ? String.fromCodePoint(parseInt(h, 16)) : ch));
        else if (m[2]) text += e.getAttribute(m[2]) || '';
        else text += counterOf(e);
      }
      if (!text.trim()) return null;
      const st = [];
      const pc = hex(ps.color, bg);
      if (pc !== col) st.push('color:' + pc);
      if (!clear(ps.backgroundColor)) st.push('background-color:' + hex(ps.backgroundColor, bg));
      if (ps.fontWeight !== cs.fontWeight) st.push('font-weight:' + ps.fontWeight);
      if (ps.fontSize !== cs.fontSize) st.push('font-size:' + ps.fontSize);
      if (ps.borderRadius && !/^0px/.test(ps.borderRadius)) st.push('border-radius:' + ps.borderRadius);
      const abs = ps.position === 'absolute' || ps.position === 'fixed';
      if (abs || /block/.test(ps.display)) {
        st.push('display:inline-block');
        if (parseFloat(ps.width) > 0 && parseFloat(ps.height) > 0) st.push(`width:${ps.width}`, `height:${ps.height}`, `line-height:${ps.height}`, 'text-align:center');
      }
      const mr = abs ? '0.5em' : ps.marginRight, ml = abs ? '0px' : ps.marginLeft;
      if (mr !== '0px') st.push('margin-right:' + mr);
      if (ml !== '0px') st.push('margin-left:' + ml);
      return { abs, html: `<span${st.length ? ` style="${st.join(';')}"` : ''}>${esc(text)}</span>` };
    }
    function kids(n, pcs, bg) {
      let s = '';
      for (const c of n.childNodes) {
        if (c.nodeType === 3) s += esc(c.nodeValue);
        else if (c.nodeType === 1) s += node(c, pcs, bg);
      }
      return s;
    }
    function node(e, pcs, bg) {
      const T = e.tagName;
      if (SKIP.test(T) || e.hidden || e.getAttribute('aria-hidden') === 'true' || e.classList.contains('page-break')) return '';
      const cs = gcs(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') return '';
      if (T === 'BR') return '<br>';
      if (T === 'INPUT') return e.type === 'checkbox' ? (e.checked ? '☑ ' : '☐ ') : '';
      let tag = (RENAME[T] || T).toLowerCase();
      const href = T === 'A' ? e.getAttribute('href') || '' : '';
      if (T === 'A' && !/^(https?:|mailto:)/i.test(href)) tag = 'span'; // 문서 안 링크 · 각주 번호는 글자로
      const st = [];
      const put = (k, v) => st.push(`${k}:${String(v).replace(/(\d+\.\d)\d+px/g, '$1px')}`); // 9.97425px → 9.9px
      let nbg = bg;
      if (!clear(cs.backgroundColor)) { nbg = hex(cs.backgroundColor, bg); put('background-color', nbg); }
      const col = hex(cs.color, nbg);
      if (cs.color !== pcs.color || nbg !== bg) put('color', col);
      for (const k of TEXT) { const v = cs.getPropertyValue(k); if (v !== pcs.getPropertyValue(k)) put(k, q(v)); }
      const dl = cs.textDecorationLine;
      if (dl && dl !== 'none') {
        put('text-decoration', dl + (cs.textDecorationStyle && cs.textDecorationStyle !== 'solid' ? ' ' + cs.textDecorationStyle : ''));
        const dc = hex(cs.textDecorationColor, nbg);
        if (dc !== col) put('text-decoration-color', dc);
      } else if (tag === 'a') put('text-decoration', 'none');
      if (cs.verticalAlign !== 'baseline' && T !== 'IMG' && !(/^(TBODY|THEAD|TFOOT|TR)$/.test(T) && cs.verticalAlign === 'middle')) put('vertical-align', cs.verticalAlign);
      let disp = cs.display;
      if (/^(flex|grid|flow-root)$/.test(disp) || T === 'SUMMARY') disp = 'block';
      if (/^inline-(flex|grid)$/.test(disp)) disp = 'inline-block';
      // 가로로 늘어놓던(flex) 상자의 아이는 블록으로 계산되지만, 받는 곳에서는 줄 안에 이어 놓고 사이(gap)는 왼쪽 여백으로
      const flexKid = /flex|grid/.test(pcs.display) && pcs !== rootCs;
      if (flexKid && defDisplay(tag) === 'inline') disp = 'inline';
      if (disp !== defDisplay(tag) && /^(block|inline-block|inline|list-item)$/.test(disp)) put('display', disp);
      const sides = SIDES.map((s) => {
        const w = parseFloat(cs.getPropertyValue(`border-${s}-width`)), y = cs.getPropertyValue(`border-${s}-style`);
        // 화면 배율 때문에 0.8px 처럼 나오는 선 굵기는 정수로
        return w > 0 && y !== 'none' && y !== 'hidden' ? `${Math.max(1, Math.round(w))}px ${y} ${hex(cs.getPropertyValue(`border-${s}-color`), nbg)}` : '';
      });
      if (T === 'HR') put('border', 'none');
      if (sides[0] && sides.every((x) => x === sides[0])) put('border', sides[0]);
      else sides.forEach((x, i) => { if (x) put('border-' + SIDES[i], x); });
      if (cs.borderRadius && !/^0px( 0px)*$/.test(cs.borderRadius)) put('border-radius', cs.borderRadius);
      for (const p of ['padding', 'margin']) {
        const v = SIDES.map((s) => cs.getPropertyValue(`${p}-${s}`));
        if (v.every((x) => x === '0px')) continue;
        put(p, v[0] === v[2] && v[1] === v[3] ? (v[0] === v[1] ? v[0] : `${v[0]} ${v[1]}`) : v.join(' '));
      }
      if (flexKid && e.previousElementSibling && parseFloat(pcs.columnGap) > 0 && /row/.test(pcs.flexDirection || 'row')) put('margin-left', pcs.columnGap);
      if (tag === 'ul' || tag === 'ol') put('list-style-type', cs.listStyleType);
      if (tag === 'table') {
        put('border-collapse', cs.borderCollapse);
        if (e.parentElement && e.offsetWidth >= e.parentElement.clientWidth - 2) put('width', '100%');
      }
      // markcont 에 다시 붙여 넣을 때 알림 상자 · 수식 · 코드 언어를 되살리는 표시만 남김 (다른 곳은 모르는 이름이라 무시)
      let attrs = '';
      const keepCls = [...e.classList].filter((c) => /^(callout-title|callout-body|code-head|language-[\w+#.-]+)$/.test(c));
      if (keepCls.length) attrs += ` class="${escA(keepCls.join(' '))}"`;
      for (const a of ['data-callout', 'data-title', 'data-tex', 'data-display']) if (e.hasAttribute(a)) attrs += ` ${a}="${escA(e.getAttribute(a))}"`;
      if (tag === 'a') attrs += ` href="${escA(href)}"`;
      if (T === 'IMG') {
        const r = e.getBoundingClientRect();
        attrs += ` src="${escA(e.getAttribute('src') || '')}" alt="${escA(e.getAttribute('alt') || '')}"`;
        const w = Math.round(r.width) || +e.getAttribute('width'), h = Math.round(r.height) || +e.getAttribute('height');
        if (w && h) attrs += ` width="${w}" height="${h}"`;
        put('max-width', '100%');
        if (e.style.verticalAlign) put('vertical-align', e.style.verticalAlign);
        else if (cs.verticalAlign !== 'baseline') put('vertical-align', cs.verticalAlign);
        return `<img${attrs} style="${st.join(';')}">`;
      }
      if ((T === 'TD' || T === 'TH') && e.colSpan > 1) attrs += ` colspan="${e.colSpan}"`;
      if ((T === 'TD' || T === 'TH') && e.rowSpan > 1) attrs += ` rowspan="${e.rowSpan}"`;
      if (T === 'OL' && e.getAttribute('start')) attrs += ` start="${escA(e.getAttribute('start'))}"`;
      const before = T === 'SUMMARY' ? null : pseudo(e, '::before', cs, nbg, col);
      const after = T === 'SUMMARY' ? null : pseudo(e, '::after', cs, nbg, col);
      if (before && before.abs) put('padding-left', '0'); // 번호 동그라미 자리를 비워 두던 여백
      const inner = (before ? before.html : '') + kids(e, cs, nbg) + (after ? after.html : '');
      return `<${tag}${attrs}${st.length ? ` style="${st.join(';')}"` : ''}>${inner}</${tag}>`;
    }
    const base = `font-family:${q(rootCs.fontFamily)};font-size:${rootCs.fontSize};line-height:${rootCs.lineHeight};color:${hex(rootCs.color)}`;
    return `<div style="${base}">${kids(fr.root, rootCs, '#ffffff')}</div>`;
  }

  async function toHtml(fr) {
    await prepare(fr);
    return serialize(fr);
  }

  window.MarkRich = { frame, toHtml, hex };
})();
