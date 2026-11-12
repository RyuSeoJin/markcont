// markcont 화면 본체 (마크다운 변환 · 편집기 · 작업 공간)
// index.html 에서 불러옵니다. 보안 설정(CSP)이 index.html 안에 직접 쓴 스크립트를 막기 때문에 따로 둔 파일입니다.
(() => {
  translateStatic(document.body);
  if (LANG === 'en') document.getElementById('langHint').textContent = '언어';
  // 앱에 들어 있는 안내 문서 (파일 이름은 영어: PC 프로그램 내부 서버가 한글 경로를 못 찾는 경우가 있음)
  const BUILTIN = {
    guide: { file: L('guide.md', 'guide.en.md'), name: L('사용-안내서.md', 'User-Guide.md'), title: L('사용 안내서', 'User guide') },
    rules: { file: L('writing-rules.md', 'writing-rules.en.md'), name: L('마크다운-작성-규칙.md', 'Markdown-Writing-Rules.md'), title: L('마크다운 작성 규칙', 'Markdown writing rules') },
    workflow: { file: L('workflow-rules.md', 'workflow-rules.en.md'), name: L('워크플로우-작성-규칙.md', 'Workflow-Writing-Rules.md'), title: L('워크플로우 작성 규칙', 'Workflow writing rules') },
    styles: { file: L('style-rules.md', 'style-rules.en.md'), name: L('문서-스타일-규칙.md', 'Document-Style-Rules.md'), title: L('문서 스타일 규칙', 'Document style rules') },
    features: { file: L('features.md', 'features.en.md'), name: L('기능-예제.md', 'Feature-Examples.md'), title: L('기능 예제', 'Feature examples') },
    licenses: { file: L('licenses.md', 'licenses.en.md'), name: L('오픈소스-라이선스.md', 'Open-Source-Licenses.md'), title: L('오픈소스 라이선스', 'Open-source licenses') },
  };
  const builtinPath = (key) => L('markcont 안내/', 'markcont docs/') + BUILTIN[key].name;
  // 링크가 앱에 들어 있는 안내 문서를 가리키는지 (한국어 · 영어 이름, guide.md 같은 파일 이름 모두)
  const BUILTIN_NAMES = { guide: ['사용-안내서', 'user-guide', 'guide'], rules: ['마크다운-작성-규칙', 'markdown-writing-rules', 'writing-rules'], workflow: ['워크플로우-작성-규칙', 'workflow-writing-rules', 'workflow-rules'], styles: ['문서-스타일-규칙', 'document-style-rules', 'style-rules'], features: ['기능-예제', 'feature-examples', 'features'], licenses: ['오픈소스-라이선스', 'open-source-licenses', 'licenses'] };
  function builtinKeyFor(ref) {
    let d = ref;
    try { d = decodeURIComponent(ref); } catch {}
    const n = d.split('/').pop().replace(/\.(en\.)?md$/i, '').toLowerCase();
    return Object.keys(BUILTIN_NAMES).find((k) => BUILTIN_NAMES[k].includes(n)) || null;
  }
  const isBuiltinPath = (p) => /^markcont (안내|docs)\//.test(p);
  const $ = (s) => document.querySelector(s);
  const MD_EXT = /\.(md|markdown|mdown|mkd|txt)$/i;
  const IMG_EXT = /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i;
  const VIDEO_EXT = /\.(mp4|webm|ogv|mov)(?=$|[?#])/i;
  const AUDIO_EXT = /\.(mp3|wav|aac|flac|m4a|oga|ogg)(?=$|[?#])/i;
  const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|bmp|avif|mp4|webm|ogv|mov|mp3|wav|aac|flac|m4a|oga|ogg)$/i;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
    json(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    files: [],          // { path, name, text, file, handle, lastModified }
    assets: new Map(),  // 경로 -> { file } 또는 { handle }
    assetUrls: new Map(),
    rootName: '',
    current: null,
    editing: false,
    dirty: false,
    hist: [], histPos: -1,
    folds: store.json('mdv-folds', {}),
    roots: [],               // 열린 폴더들(작업 공간): { key, kind: 'handle' | 'tauri' | 'input', name, handle?, path? }
    dirs: new Set(),         // 폴더 안의 하위 폴더 (상대 경로)
    extraDirs: new Set(),    // 새로 만든 빈 폴더 (md가 없어도 보여줌)
  };

  const el = {
    sidebar: $('#sidebar'), scrim: $('#scrim'), filesSection: $('#filesSection'), fileList: $('#fileList'),
    tocSection: $('#tocSection'), toc: $('#toc'), welcome: $('#welcome'), workspace: $('#workspace'),
    editor: $('#editor'), preview: $('#preview'), doc: $('#doc'), sideView: $('#sideView'), sideScroll: $('#svScroll'), sideDoc: $('#sideDoc'), docMeta: $('#docMeta'), docTitle: $('#docTitle'),
    btnEdit: $('#btnEdit'), btnSave: $('#btnSave'), btnTheme: $('#btnTheme'),
    fileInput: $('#fileInput'), folderInput: $('#folderInput'), toast: $('#toast'),
  };

  // 옆 보기: 본문 오른쪽에서 읽는 문서 (hist: 옆 보기만의 뒤로 · 앞으로, text · sig: 그린 내용과 설정 — 바뀌었을 때만 다시 그림)
  const sv = { hist: [], pos: -1, seq: 0, text: null, sig: '', timer: 0, builtins: new Map(), flows: { data: new Map(), ctx: null, seq: 0 } };

  const libsOk = !!(window.markdownit && window.DOMPurify);
  if (!libsOk) $('#libNotice').hidden = false;

  /* =========================================================
     설정 (글자 크기, 글꼴, 폭, 줄바꿈, 스크롤 맞춤)
     ========================================================= */
  const settings = Object.assign({ size: 16.5, font: 'sans', width: 'normal', lh: 'normal', para: 'normal', tint: 'plain', sync: true, compatHint: true, callout: 'soft', headNum: false, confirmSave: true, mcpSuggest: false, updateCheck: true, htmlToc: true }, store.json('mdv-settings', {}));
  delete settings.breaks; // 없앤 설정 (엔터 한 번도 줄바꿈으로 보기)
  delete settings.lines; // 없앤 설정 (코드 줄 번호 보기)
  const WIDTHS = { narrow: '680px', normal: '820px', wide: '1060px' };
  const LINE_H = { tight: '1.6', normal: '1.8', loose: '2.05' }, PARA_GAP = { tight: '.7em', normal: '1.1em', loose: '1.6em' };
  /* ---------- 문서 스타일 (CSS): 여러 개를 두고 모든 문서 · 폴더 · 문서마다 고름 ---------- */
  // mdv-styles = { list: [{ id, name, css }], rules: [{ style, kind: 'all' | 'dir' | 'file', key, label }] }
  //  - key: PC 프로그램은 전체 경로("abs:" · \ → /), 브라우저로 연 폴더는 "rel:폴더이름/안쪽", 따로 연 파일은 "name:파일 이름"
  //  - 한 문서에는 하나만: 그 문서 > 가장 가까운 폴더 > 모든 문서 순으로 고름
  const STYLE_KEY = 'mdv-styles';
  const styles = (() => {
    const s = store.json(STYLE_KEY, null);
    if (s && Array.isArray(s.list) && Array.isArray(s.rules)) return s;
    // 예전 「내 CSS」 칸에 쓴 것 → 모든 문서에 쓰는 스타일 하나로 옮김
    const old = (store.get('mdv-user-css') || '').trim(), out = { list: [], rules: [] };
    if (old) { out.list.push({ id: 's1', name: L('내 CSS', 'My CSS'), css: old }); out.rules.push({ style: 's1', kind: 'all', key: '', label: '' }); }
    return out;
  })();
  function saveStyles() {
    if (!store.set(STYLE_KEY, JSON.stringify(styles))) { toast(L('스타일을 저장하지 못했습니다 (저장 공간이 모자랍니다)', "Couldn't save styles (storage is full)"), 4000); return; }
    try { localStorage.removeItem('mdv-user-css'); } catch {}
  }
  if (store.get('mdv-user-css') != null) saveStyles();
  const stylePath = (p) => { const s = p.replace(/\\/g, '/').replace(/\/+$/, ''); return /^[a-z]:\//i.test(s) ? s.toLowerCase() : s; }; // Windows 경로는 대소문자를 가리지 않음
  // 문서가 놓인 곳: { file, fileLabel, dirs: [가까운 폴더부터 { key, label }] } (새 문서처럼 파일이 아직 없으면 null)
  function placeOf(entry) {
    if (!entry || entry.isNew) return null;
    if (entry.tauriPath) {
      const abs = entry.tauriPath.replace(/\\/g, '/'), root = !entry.loose && rootOf(entry.path);
      let d = abs.replace(/\/[^/]*$/, '');
      const stop = stylePath(root && root.path ? root.path : d), dirs = []; // 열린 폴더 안이면 그 폴더까지, 따로 연 파일은 그 폴더만
      while (d) { dirs.push({ key: 'abs:' + stylePath(d), label: d }); if (stylePath(d).length <= stop.length || !d.includes('/')) break; d = d.replace(/\/[^/]*$/, ''); }
      return { file: 'abs:' + stylePath(abs), fileLabel: abs, dirs };
    }
    if (entry.loose || entry.builtin || !rootOf(entry.path)) return { file: 'name:' + entry.path, fileLabel: entry.path, dirs: [] };
    const dirs = [];
    for (let d = entry.path.includes('/') ? entry.path.replace(/\/[^/]*$/, '') : ''; d; d = d.includes('/') ? d.replace(/\/[^/]*$/, '') : '') dirs.push({ key: 'rel:' + d, label: d });
    return { file: 'rel:' + entry.path, fileLabel: entry.path, dirs };
  }
  function styleFor(entry) {
    const pl = placeOf(entry);
    let r = pl && styles.rules.find((x) => x.kind === 'file' && x.key === pl.file);
    if (!r && pl) for (const x of styles.rules) if (x.kind === 'dir' && pl.file.startsWith(x.key + '/') && (!r || x.key.length > r.key.length)) r = x;
    if (!r) r = styles.rules.find((x) => x.kind === 'all');
    const st = r && styles.list.find((s) => s.id === r.style);
    return st ? { style: st, rule: r } : null;
  }
  // 문서 안(.markdown-body)에만 걸리게 감쌈 — 잘못 써도 메뉴 · 사이드바는 그대로라 고칠 수 있음
  //  (「.markdown-body h2」처럼 써도 되게 앞의 .markdown-body 는 & 로 바꿈)
  const wrapCss = (c) => (c.trim() ? `.markdown-body {\n${c.replace(/(^|[{},;]\s*)\.markdown-body\b/g, '$1&')}\n}` : '');
  // 바깥 주소를 부르는 곳은 뺌: 인터넷의 글꼴 · 그림을 받아 오면 문서를 연 사실과 IP 가 그 서버로 가고,
  // 속성 선택자와 엮으면 문서 속 링크 주소까지 새어 나갈 수 있음. 브라우저가 읽은 결과(\ 이스케이프를 푼 값)로 가려냄
  //  - data: 주소와 문서 안 #id 는 그대로, @import 는 읽을 때 브라우저가 버림
  const OUTSIDE_RE = /\b(?:url|src|image-set)\(/i;
  const localRef = (v) => v.replace(/url\(\s*(?:"(?:data:|#)[^"]*"|'(?:data:|#)[^']*'|(?:data:|#)[^)'"]*)\s*\)/gi, '');
  const outsideRef = (v, custom) => OUTSIDE_RE.test(localRef(v)) || (custom && v.includes('\\'));
  let safeMemo = { in: null, out: null };
  function safeCss(text) {
    if (safeMemo.in === text) return safeMemo.out;
    let out = { css: '', blocked: 0 };
    if (text) {
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(text);
        let blocked = 0;
        const scrub = (rules, owner) => {
          for (let i = rules.length - 1; i >= 0; i--) {
            const r = rules[i];
            if (r.style) {
              for (let k = r.style.length - 1; k >= 0; k--) {
                const p = r.style[k];
                if (outsideRef(r.style.getPropertyValue(p), p.startsWith('--'))) { r.style.removeProperty(p); blocked++; }
              }
              if (outsideRef(r.style.cssText, false)) { r.style.cssText = ''; blocked++; } // 하나씩 못 뺀 것(@font-face 의 src 등)은 통째로
            }
            if (r.cssRules) scrub(r.cssRules, r);
            else if (!r.style && outsideRef(r.cssText, true) && owner.deleteRule) { owner.deleteRule(i); blocked++; }
          }
        };
        scrub(sheet.cssRules, sheet);
        blocked += (text.replace(/\/\*[\s\S]*?\*\//g, '').match(/@import\b/gi) || []).length; // 브라우저가 이미 버린 @import 도 셈에 넣음
        out = { css: [...sheet.cssRules].map((r) => r.cssText).join('\n'), blocked };
      } catch {}
    }
    safeMemo = { in: text, out };
    return out;
  }
  const userCssText = () => { const s = styleFor(state.current); return s ? safeCss(wrapCss(s.style.css)).css : ''; };
  function applyUserCss() {
    let st = document.getElementById('userCssStyle');
    if (!st) { st = document.createElement('style'); st.id = 'userCssStyle'; document.head.append(st); }
    const t = userCssText();
    if (st.textContent !== t) { st.textContent = t; requestAnimationFrame(() => { drawAllDataLinks(); redrawSummaries(); }); }
    const s = styleFor(state.current), now = document.getElementById('styleNow');
    if (now) now.textContent = s ? s.style.name : L('없음', 'None');
  }
  let serifLoaded = false;
  function applySettings(rerender) {
    const r = document.documentElement.style;
    r.setProperty('--doc-size', settings.size + 'px');
    r.setProperty('--doc-width', WIDTHS[settings.width] || WIDTHS.normal);
    r.setProperty('--doc-font', settings.font === 'serif' ? 'var(--serif)' : 'var(--font)');
    r.setProperty('--doc-lh', LINE_H[settings.lh] || LINE_H.normal);
    r.setProperty('--doc-para', PARA_GAP[settings.para] || PARA_GAP.normal);
    if (settings.tint && settings.tint !== 'plain') document.documentElement.dataset.tint = settings.tint;
    else delete document.documentElement.dataset.tint;
    if (settings.font === 'serif' && !serifLoaded) {
      serifLoaded = true;
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap';
      document.head.append(l);
    }
    $('#sizeVal').textContent = settings.size + 'px';
    $('#sizeRange').value = settings.size;
    document.querySelectorAll('#fontSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.font));
    document.querySelectorAll('#widthSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.width));
    document.querySelectorAll('#lhSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.lh));
    document.querySelectorAll('#paraSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.para));
    document.querySelectorAll('#tintSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === (settings.tint || 'plain')));
    document.querySelectorAll('#calloutSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === settings.callout));
    document.querySelectorAll('#langSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === LANG));
    $('#optHeadNum').checked = settings.headNum;
    $('#optConfirmSave').checked = settings.confirmSave;
    $('#optHtmlToc').checked = settings.htmlToc !== false;
    $('#optCompat').checked = settings.compatHint !== false;
    $('#optSync').checked = settings.sync;
    $('#optUpdate').checked = settings.updateCheck !== false;
    store.set('mdv-settings', JSON.stringify(settings));
    if (rerender) { buildMd(); render(true); }
  }
  const setSize = (v) => { settings.size = Math.min(24, Math.max(13, Math.round(v * 2) / 2)); applySettings(); };
  $('#sizeRange').oninput = (e) => setSize(+e.target.value);
  $('#sizeDown').onclick = () => setSize(settings.size - 0.5);
  $('#sizeUp').onclick = () => setSize(settings.size + 0.5);
  $('#fontSeg').onclick = (e) => { if (e.target.dataset.v) { settings.font = e.target.dataset.v; applySettings(); } };
  $('#widthSeg').onclick = (e) => { if (e.target.dataset.v) { settings.width = e.target.dataset.v; applySettings(); } };
  $('#lhSeg').onclick = (e) => { if (e.target.dataset.v) { settings.lh = e.target.dataset.v; applySettings(); lineTops = null; } };
  $('#paraSeg').onclick = (e) => { if (e.target.dataset.v) { settings.para = e.target.dataset.v; applySettings(); lineTops = null; } };
  $('#tintSeg').onclick = (e) => { if (e.target.dataset.v) { settings.tint = e.target.dataset.v; applySettings(); } };
  applyUserCss();
  // 언어 바꾸기: 저장하고 화면을 다시 불러옴 (저장 안 한 내용이 있으면 먼저 묻기)
  $('#langSeg').onclick = (e) => {
    const v = e.target.closest('button')?.dataset.v;
    if (!v || v === LANG) return;
    if (state.dirty && !confirm(L('저장하지 않은 변경 사항이 있습니다. 버리고 언어를 바꿀까요?', 'You have unsaved changes. Discard them and switch language?'))) return;
    store.set('mdv-lang', v);
    state.dirty = false;
    location.reload();
  };
  $('#calloutSeg').onclick = (e) => { const v = e.target.closest('button')?.dataset.v; if (v) { settings.callout = v; applySettings(true); } };
  $('#optHeadNum').onchange = (e) => { settings.headNum = e.target.checked; applySettings(true); };
  $('#optConfirmSave').onchange = (e) => { settings.confirmSave = e.target.checked; applySettings(); };
  $('#optHtmlToc').onchange = (e) => { settings.htmlToc = e.target.checked; applySettings(); };
  $('#optSync').onchange = (e) => { settings.sync = e.target.checked; applySettings(); };
  $('#optUpdate').onchange = (e) => { settings.updateCheck = e.target.checked; applySettings(); };
  $('#optCompat').onchange = (e) => { settings.compatHint = e.target.checked; applySettings(); if (state.current) updateMeta(source()); };

  /* =========================================================
     테마
     ========================================================= */
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('#hljs-light').disabled = t === 'dark';
    $('#hljs-dark').disabled = t !== 'dark';
    el.btnTheme.innerHTML = t === 'dark' ? SUN : MOON;
    store.set('mdv-theme', t);
  }
  applyTheme(store.get('mdv-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  el.btnTheme.onclick = () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    if (state.current && el.doc.querySelector('.mermaid')) render(true);
    svSync();
  };

  /* =========================================================
     알림
     ========================================================= */
  let toastTimer;
  function toast(msg, ms = 2400, action) {
    el.toast.textContent = '';
    const span = document.createElement('span');
    span.textContent = msg;
    el.toast.append(span);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-btn';
      b.textContent = action.label;
      b.onclick = () => { el.toast.classList.remove('show'); action.onClick(); };
      el.toast.append(b);
    }
    el.toast.classList.toggle('has-action', !!action);
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
  }

  /* =========================================================
     markdown-it 설정 + 수식, 위키링크, 원본 줄 번호
     ========================================================= */
  function renderMath(tex, display) {
    if (!window.katex) return `<code>${escapeHtml(display ? `$$${tex}$$` : `$${tex}$`)}</code>`;
    // 원래 TeX 를 data-tex 로 남겨 둠: 보안 정리(DOMPurify)가 MathML 의 annotation 을 지워서
    // Word 내보내기 · 복사 · 붙여 넣기가 수식 원문을 여기서 읽음
    try { return katex.renderToString(tex, { displayMode: display, throwOnError: false }).replace('<span class="katex"', `<span class="katex" data-tex="${escapeHtml(tex)}"`); }
    catch { return escapeHtml(tex); }
  }

  function mathInline(state, silent) {
    const src = state.src, start = state.pos;
    if (src.charCodeAt(start) !== 0x24 /* $ */) return false;
    if (src.charCodeAt(start + 1) === 0x24) {
      const end = src.indexOf('$$', start + 2);
      if (end < 0 || end === start + 2) return false;
      if (!silent) { const t = state.push('math_inline', 'math', 0); t.content = src.slice(start + 2, end); t.meta = { display: true }; }
      state.pos = end + 2;
      return true;
    }
    const next = src[start + 1];
    if (!next || /\s/.test(next)) return false;
    if (start > 0 && /[\w$]/.test(src[start - 1])) return false;
    let end = start + 1;
    for (;;) {
      end = src.indexOf('$', end);
      if (end < 0) return false;
      if (src[end - 1] === '\\') { end++; continue; }
      break;
    }
    if (/\s/.test(src[end - 1]) || /\d/.test(src[end + 1] || '')) return false;
    if (!silent) { const t = state.push('math_inline', 'math', 0); t.content = src.slice(start + 1, end); t.meta = { display: false }; }
    state.pos = end + 1;
    return true;
  }

  function mathBlock(state, startLine, endLine, silent) {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    if (state.sCount[startLine] - state.blkIndent >= 4) return false;
    if (state.src.slice(pos, pos + 2) !== '$$') return false;
    const first = state.src.slice(pos + 2, max);
    let content = '', next = startLine, found = false;
    if (first.trim().endsWith('$$') && first.trim().length >= 2) {
      content = first.trim().slice(0, -2);
      found = true;
    } else {
      if (first.trim()) content = first + '\n';
      for (next = startLine + 1; next < endLine; next++) {
        const line = state.src.slice(state.bMarks[next] + state.tShift[next], state.eMarks[next]);
        if (line.trim().endsWith('$$')) { content += line.trim().slice(0, -2); found = true; break; }
        content += line + '\n';
      }
    }
    if (!found) return false;
    if (silent) return true;
    state.line = next + 1;
    const t = state.push('math_block', 'math', 0);
    t.block = true;
    t.content = content;
    t.map = [startLine, state.line];
    return true;
  }

  function wikiRule(state, silent) {
    const src = state.src, pos = state.pos;
    let embed = false, start = pos;
    if (src.charCodeAt(pos) === 0x21 /* ! */) {
      if (src.slice(pos + 1, pos + 3) !== '[[') return false;
      embed = true;
      start = pos + 1;
    } else if (src.slice(pos, pos + 2) !== '[[') return false;
    const end = src.indexOf(']]', start + 2);
    if (end < 0) return false;
    const inner = src.slice(start + 2, end);
    if (!inner.trim() || /[\n[\]]/.test(inner)) return false;
    if (!silent) {
      // 표 칸 안에서는 [[문서\|별명]] 처럼 \| 로 씀 → 앞의 \ 는 버림. 그림은 「설명|300」 처럼 칸이 여럿일 수 있음
      const parts = inner.split('|').map((x) => x.replace(/\\$/, ''));
      const target = parts[0], alias = parts.slice(1).join('|');
      const hashAt = target.indexOf('#');
      const file = (hashAt >= 0 ? target.slice(0, hashAt) : target).trim();
      const heading = hashAt >= 0 ? target.slice(hashAt + 1).trim() : '';
      const t = state.push('wikilink', '', 0);
      t.meta = { embed, file, heading, alias: alias.trim(), raw: src.slice(pos, end + 2) };
    }
    state.pos = end + 2;
    return true;
  }

  // 문서 안 목차: 한 줄에 [[_TOC_]] (GitLab · Azure DevOps), [toc] (Typora), [[toc]] (VitePress)
  const TOC_LINE = /^(\[\[_toc_\]\]|\[\[toc\]\]|\[toc\])\s*$/i;
  function tocRule(state, startLine, endLine, silent) {
    if (state.sCount[startLine] - state.blkIndent >= 4) return false;
    const line = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]);
    if (!TOC_LINE.test(line)) return false;
    if (silent) return true;
    state.line = startLine + 1;
    const t = state.push('toc_inline', 'nav', 0);
    t.block = true;
    t.map = [startLine, state.line];
    return true;
  }

  // 두 글자 기호로 감싸는 문법(==, ++, --)을 안전하게 찾는 규칙
  //  - 여는 기호 앞, 닫는 기호 뒤가 영문 · 숫자 · 같은 기호면 문법이 아님 (x==1, y==2, C++, a++b, a--b, --force)
  //  - 여는 기호 바로 뒤, 닫는 기호 바로 앞은 빈칸이 아니어야 함 (a == b == c 는 그대로)
  //  - 한글은 붙어도 됨 (==중요==를)
  function pairRule(code, tag) {
    const ch = String.fromCharCode(code);
    const pair = ch + ch;
    const stuck = new RegExp('[A-Za-z0-9' + (ch === '+' ? '\\+' : ch === '-' ? '\\-' : ch) + ']');
    return function (state, silent) {
      const src = state.src, start = state.pos, max = state.posMax;
      if (src.charCodeAt(start) !== code || src.charCodeAt(start + 1) !== code) return false;
      if (start > 0 && stuck.test(src[start - 1])) return false;
      const first = src[start + 2];
      if (!first || start + 2 >= max || /\s/.test(first) || first === ch) return false;
      let end = src.indexOf(pair, start + 3);
      while (end !== -1 && end + 2 <= max) {
        const before = src[end - 1], after = src[end + 2] || ' ';
        if (!/\s/.test(before) && !stuck.test(after)) break;
        end = src.indexOf(pair, end + 1);
      }
      if (end === -1 || end + 2 > max) return false;
      if (!silent) {
        state.push(tag + '_open', tag, 1).markup = pair;
        const oldMax = state.posMax;
        state.pos = start + 2;
        state.posMax = end;
        state.md.inline.tokenize(state);
        state.posMax = oldMax;
        state.push(tag + '_close', tag, -1).markup = pair;
      }
      state.pos = end + 2;
      return true;
    };
  }

  // 교정 표기 (CriticMarkup): {++추가++} {--삭제--} {~~옛 글~>새 글~~} {>>메모<<} {==표시==}
  //  - ==, ++, --, ~~ 규칙보다 먼저 봄 ({++추가++} 가 {<ins>추가</ins>} 가 되지 않게)
  //  - data-raw 에 원본 글자를 그대로 남김 (받아들이기 · 버리기에서 원본의 그 자리를 찾을 때)
  const CRITIC = { '++': ['++}', 'add', 'ins'], '--': ['--}', 'del', 'del'], '~~': ['~~}', 'sub', 'span'], '>>': ['<<}', 'cmt', 'span'], '==': ['==}', 'hl', 'mark'] };
  function criticRule(state, silent) {
    const src = state.src, pos = state.pos, max = state.posMax;
    if (src.charCodeAt(pos) !== 0x7B /* { */) return false;
    const c = CRITIC[src.slice(pos + 1, pos + 3)];
    if (!c) return false;
    const end = src.indexOf(c[0], pos + 3);
    if (end < 0 || end + 3 > max) return false;
    const inner = src.slice(pos + 3, end), split = c[1] === 'sub' ? inner.indexOf('~>') : -1;
    if (c[1] === 'sub' ? split < 0 : !inner.trim()) return false;
    if (!silent) {
      const open = state.push('critic_open', c[2], 1);
      open.attrs = [['class', 'critic critic-' + c[1]], ['data-kind', c[1]], ['data-raw', src.slice(pos, end + 3)]];
      const part = (from, to, tag) => {
        if (tag) state.push('critic_part_open', tag, 1);
        const oldMax = state.posMax;
        state.pos = from;
        state.posMax = to;
        state.md.inline.tokenize(state);
        state.posMax = oldMax;
        if (tag) state.push('critic_part_close', tag, -1);
      };
      if (c[1] === 'sub') { part(pos + 3, pos + 3 + split, 'del'); part(pos + 5 + split, end, 'ins'); }
      else part(pos + 3, end, null);
      state.push('critic_close', c[2], -1);
    }
    state.pos = end + 3;
    return true;
  }

  // 쪽 나눔: 한 줄에 <!-- 쪽 나눔 --> 또는 <!-- pagebreak --> (다른 뷰어에서는 보이지 않는 주석이라 그대로 둠)
  const PAGE_BREAK = /^<!--\s*(page\s*-?\s*break|pagebreak|newpage|쪽\s*나눔|페이지\s*나눔)\s*-->\s*$/i;
  function pageBreakRule(state, startLine, endLine, silent) {
    if (state.sCount[startLine] - state.blkIndent >= 4) return false;
    if (!PAGE_BREAK.test(state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]).trim())) return false;
    if (silent) return true;
    state.line = startLine + 1;
    const t = state.push('page_break', 'div', 0);
    t.block = true;
    t.map = [startLine, startLine + 1];
    return true;
  }
  // ::: 블록 — 탭 · 단계 · 파일 트리 (VitePress 꼴, 한국어 이름도: ::: 탭 · ::: 단계 · ::: 트리)
  //  - 탭: 안쪽의 「== 이름」 줄로 나눔 (그 줄은 앞뒤 글과 한 문단으로 붙지 않게 따로 읽음)
  const CONTAINER = { tabs: 'tabs', '탭': 'tabs', steps: 'steps', '단계': 'steps', tree: 'tree', '트리': 'tree' };
  function containerRule(state, startLine, endLine, silent) {
    if (state.sCount[startLine] - state.blkIndent >= 4) return false;
    const lineAt = (k) => state.src.slice(state.bMarks[k] + state.tShift[k], state.eMarks[k]);
    const m = lineAt(startLine).match(/^:::\s*([^\s:]+)\s*$/);
    const kind = m && CONTAINER[m[1].toLowerCase()];
    if (!kind) return false;
    if (silent) return true;
    // 닫는 ::: (안쪽의 다른 ::: 블록과 짝을 맞추고, 코드 울타리 안은 건너뜀)
    let depth = 1, close = startLine, fence = null;
    const heads = [];
    while (++close < endLine) {
      if (state.sCount[close] < state.blkIndent && lineAt(close).trim()) break;
      const l = lineAt(close), f = l.match(/^(`{3,}|~{3,})/);
      if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !l.slice(f[1].length).trim()) fence = null; continue; }
      if (f) { fence = f[1]; continue; }
      if (/^:::\s*[^\s:]+\s*$/.test(l)) depth++;
      else if (/^:::\s*$/.test(l) && --depth === 0) break;
      else if (kind === 'tabs' && depth === 1 && state.sCount[close] - state.blkIndent < 4 && /^==\s+\S/.test(l)) heads.push({ line: close, title: l.replace(/^==\s+/, '').trim() });
    }
    const closed = close < endLine;
    const oldParent = state.parentType, oldMax = state.lineMax;
    state.parentType = 'container';
    state.lineMax = close;
    const open = state.push('mc_' + kind + '_open', 'div', 1);
    open.block = true;
    open.map = [startLine, close];
    if (kind === 'tabs' && heads.length) {
      open.meta = { titles: heads.map((h) => h.title) };
      if (heads[0].line > startLine + 1) state.md.block.tokenize(state, startLine + 1, heads[0].line); // 첫 탭 앞의 글
      heads.forEach((h, i) => {
        const t = state.push('mc_tab_open', 'div', 1);
        t.block = true;
        t.meta = { title: h.title, index: i };
        state.md.block.tokenize(state, h.line + 1, i + 1 < heads.length ? heads[i + 1].line : close);
        state.push('mc_tab_close', 'div', -1).block = true;
      });
    } else {
      if (kind === 'tabs') open.meta = { titles: [] };
      state.md.block.tokenize(state, startLine + 1, close);
    }
    state.push('mc_' + kind + '_close', 'div', -1).block = true;
    state.parentType = oldParent;
    state.lineMax = oldMax;
    state.line = close + (closed ? 1 : 0);
    return true;
  }

  let md, mdStd = null;
  // 코드 블록 첫 줄: ```js title="app.js" {2,4-5} → 언어 · 머리줄 제목 · 강조할 줄
  //  - MkDocs 의 hl_lines="2 4-5", VitePress 식으로 붙여 쓴 js{2} 도 알아들음 (GitHub 은 첫 낱말만 언어로 씀)
  function codeMeta(info) {
    const s = String(info || '').trim();
    const first = s.split(/\s+/)[0] || '';
    let rest = s.slice(first.length).trim(), lang = first;
    const glued = first.match(/^([\w+#.-]+)\{([\d,\s-]+)\}$/);
    if (glued) { lang = glued[1]; rest = `{${glued[2]}} ${rest}`; }
    let title = '';
    rest = rest.replace(/(?:^|\s)(?:title|filename)=(?:"([^"]*)"|'([^']*)'|(\S+))/i, (_, a, b, c) => { title = (a ?? b ?? c).trim(); return ' '; });
    const lines = new Set();
    const add = (spec) => {
      for (const part of spec.split(/[\s,]+/)) {
        const m = part.match(/^(\d+)(?:-(\d+))?$/);
        if (!m) continue;
        const a = Math.min(+m[1], +(m[2] || m[1])), b = Math.max(+m[1], +(m[2] || m[1]));
        for (let i = Math.max(1, a); i <= b && i <= 5000; i++) lines.add(i);
      }
    };
    for (const m of rest.matchAll(/\{([\d,\s-]+)\}/g)) add(m[1]);
    const hm = rest.match(/(?:^|\s)hl_lines=(?:"([^"]*)"|'([^']*)'|(\S+))/);
    if (hm) add(hm[1] ?? hm[2] ?? hm[3]);
    return { lang, title, hl: [...lines].sort((x, y) => x - y) };
  }
  // GitHub 이모지 코드 :smile: → 😄 (GitHub 목록 전체, vendor/markdown-it-emoji-data.js. 웃음 표시 :) · <3 은 그대로 — GitHub 과 같음). 코드 안은 markdown-it 이 이미 빼 둠
  // :a: · :b: · :x: · :id: 같은 짧은 코드도 있어서, 앞뒤에 영문 · 숫자가 붙어 있으면 그대로 둠 (10:100:5 · a:b:c · IPv6 주소 fe80::a:b). 한글이 붙은 건 바꿈
  const asciiWordChar = (c) => (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A);
  function emojiRule(state, silent) {
    const src = state.src, pos = state.pos;
    if (src.charCodeAt(pos) !== 0x3A /* : */ || !window.MarkEmoji) return false;
    if (pos > 0 && asciiWordChar(src.charCodeAt(pos - 1))) return false;
    const m = /^:([a-z0-9_+-]{1,40}):/.exec(src.slice(pos, pos + 44));
    const e = m && window.MarkEmoji[m[1]];
    if (typeof e !== 'string' || asciiWordChar(src.charCodeAt(pos + m[0].length))) return false;
    if (!silent) { const t = state.push('emoji_code', '', 0); t.content = e; t.markup = m[1]; }
    state.pos += m[0].length;
    return true;
  }
  function buildMd() {
    if (!libsOk) return;
    md = makeMd(true);
    mdStd = null; // CommonMark 규칙 그대로인 해석기: 다른 뷰어용 변환에서 필요할 때 만듦
  }
  // cjk: 한국어 · 중국어 · 일본어 옆의 굵게 · 기울임 · 취소선을 넓게 받을지 (false 면 CommonMark 그대로)
  function makeMd(cjk) {
    const md = window.markdownit({
      html: true, linkify: true, breaks: false, // 엔터 한 번은 표준대로 같은 문단 (빈 줄로 문단을 나눔)
      highlight(str, lang) {
        if (lang && lang !== 'mermaid' && window.hljs && hljs.getLanguage(lang)) {
          try { return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value; } catch {}
        }
        return '';
      },
    });
    for (const p of [window.markdownitFootnote, window.markdownitDeflist]) if (p) md.use(p);
    // 「README.md」 · 「guide.md」 같은 파일 이름이 인터넷 주소(.md 는 몰도바 도메인)로 이어지지 않게 (http:// · www. 가 붙은 것만)
    if (md.linkify) {
      const lmatch = md.linkify.match.bind(md.linkify);
      // (test 는 그대로 둠: match 안에서 test 를 부름. 다 걸러지면 빈 목록 → 글자 그대로)
      md.linkify.match = (text) => (lmatch(text) || []).filter((x) => x.schema || /^www\./i.test(x.raw) || !/\.(md|markdown|txt)$/i.test(x.raw.replace(/[/?#].*$/, '')));
    }
    // `**스크립트(script)**는` 처럼 문장부호로 끝나는 굵게 뒤에 조사가 붙어도 굵게로
    if (window.markdownitCjk) md.use(window.markdownitCjk, { relax: cjk });
    // 형광펜 ==글== · 추가 표시 ++글++ · 제거 표시 --글-- : 영문 · 숫자에 붙은 기호(x==1, C++, --force)는 문법으로 보지 않음
    md.inline.ruler.before('emphasis', 'mark_safe', pairRule(0x3D, 'mark'));
    md.inline.ruler.before('emphasis', 'ins_safe', pairRule(0x2B, 'ins'));
    md.inline.ruler.before('emphasis', 'del_safe', pairRule(0x2D, 'del')); // 제거 표시 --글--
    md.inline.ruler.before('mark_safe', 'critic', criticRule); // 교정 표기 {++ ++} 는 ==, ++, -- 보다 먼저
    md.inline.ruler.after('escape', 'math_inline', mathInline);
    md.block.ruler.before('fence', 'math_block', mathBlock, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
    md.inline.ruler.before('link', 'wikilink', wikiRule);
    md.inline.ruler.push('emoji_code', emojiRule); // :smile: (GitHub 목록 전체, vendor/markdown-it-emoji-data.js)
    md.renderer.rules.emoji_code = (t, i) => `<span class="emoji" title=":${escapeHtml(t[i].markup)}:">${t[i].content}</span>`;
    md.block.ruler.before('paragraph', 'toc_inline', tocRule);
    md.block.ruler.before('fence', 'mc_container', containerRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
    md.block.ruler.before('html_block', 'page_break', pageBreakRule, { alt: ['paragraph', 'reference', 'blockquote'] });
    md.renderer.rules.page_break = (t, i) => `<div class="page-break" data-line="${t[i].map[0]}" data-label="${escapeHtml(L('쪽 나눔', 'Page break'))}"></div>\n`;
    const attrs = (t, self) => self.renderAttrs(t);
    md.renderer.rules.mc_tabs_open = (t, i, o, env, self) => `<div class="mc-tabs"${attrs(t[i], self)}><div class="mc-tab-bar" role="tablist">` +
      (t[i].meta.titles || []).map((x, k) => `<button type="button" role="tab" class="mc-tab${k ? '' : ' on'}" aria-selected="${k ? 'false' : 'true'}" data-tab="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join('') + '</div>\n';
    md.renderer.rules.mc_tab_open = (t, i) => `<div class="mc-tab-panel" role="tabpanel" data-tab="${escapeHtml(t[i].meta.title)}"${t[i].meta.index ? ' hidden' : ''}>\n`;
    md.renderer.rules.mc_steps_open = (t, i, o, env, self) => `<div class="mc-steps"${attrs(t[i], self)}>\n`;
    md.renderer.rules.mc_tree_open = (t, i, o, env, self) => `<div class="mc-tree"${attrs(t[i], self)}>\n`;
    for (const k of ['mc_tabs_close', 'mc_tab_close', 'mc_steps_close', 'mc_tree_close']) md.renderer.rules[k] = () => '</div>\n';
    md.renderer.rules.toc_inline = (t, i) => `<nav class="toc-inline"${t[i].map ? ` data-line="${t[i].map[0]}"` : ''}></nav>\n`;
    md.renderer.rules.math_inline = (t, i) => renderMath(t[i].content, t[i].meta.display);
    md.renderer.rules.math_block = (t, i) => `<div class="math-block" data-line="${t[i].map[0]}">${renderMath(t[i].content, true)}</div>\n`;
    md.renderer.rules.wikilink = (t, i) => {
      const m = t[i].meta, e = escapeHtml;
      const attrs = `data-file="${e(m.file)}" data-heading="${e(m.heading)}" data-raw="${e(m.raw)}"`;
      if (m.embed) return `<span class="wiki-embed" ${attrs} data-alias="${e(m.alias)}">${e(m.raw)}</span>`;
      const label = m.alias || (m.file ? m.file + (m.heading ? ' › ' + m.heading : '') : m.heading);
      return `<a class="wikilink" href="#" ${attrs}>${e(label)}</a>`;
    };
    // ```markdown example → 왼쪽에 쓰는 법, 오른쪽에 보이는 모습 (다른 프로그램에서는 그냥 코드 블록)
    const defaultFence = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const t = tokens[idx];
      const depth = (env && env.depth) || 0;
      if (depth < 2 && /^(markdown|md)\s+(example|preview|예시)\b/i.test(t.info.trim())) {
        const src = t.content.replace(/\n$/, '');
        let hl;
        try { hl = window.hljs && hljs.getLanguage('markdown') ? hljs.highlight(src, { language: 'markdown', ignoreIllegals: true }).value : escapeHtml(src); }
        catch { hl = escapeHtml(src); }
        const out = md.render(stripNotes(src), { nested: true, depth: depth + 1, docId: 'ex' + depth + '-' + idx }); // docId: 예시 안 각주 번호가 본문과 겹치지 않게
        const line = t.map && !depth ? ` data-line="${t.map[0]}" data-end="${t.map[1]}"` : ''; // data-end: 스크롤 맞춤이 원본 줄을 '이렇게 쓰면' 칸에 맞추는 데 씀
        return `<div class="md-example"${line}>` +
          `<div class="ex-pane ex-src"><div class="ex-label">${L('이렇게 쓰면', 'Write this')}</div><pre><code class="language-markdown">${hl}</code></pre></div>` +
          `<div class="ex-pane ex-out"><div class="ex-label">${L('이렇게 보입니다', 'Looks like this')}</div><div class="ex-body">${out}</div></div></div>\n`;
      }
      // 제목 · 줄 강조: 언어 이름만 남겨 색을 넣고, 제목 · 강조할 줄은 <pre> 에 적어 둠 (그린 뒤 postProcess 가 머리줄 · 띠로)
      const cm = codeMeta(t.info);
      if (cm.title || cm.hl.length || cm.lang !== (t.info.trim().split(/\s+/)[0] || '')) {
        const info = t.info;
        t.info = cm.lang;
        let html = defaultFence(tokens, idx, options, env, self);
        t.info = info;
        return html.replace(/^<pre/, `<pre${cm.title ? ` data-title="${escapeHtml(cm.title)}"` : ''}${cm.hl.length ? ` data-hl="${cm.hl.join(',')}"` : ''}`);
      }
      return defaultFence(tokens, idx, options, env, self);
    };
    // 블록마다 원본 줄 번호를 data-line 으로 남김 (스크롤 맞춤, 체크박스 클릭에 사용)
    md.core.ruler.push('source_lines', (s) => {
      if (s.env && s.env.nested) return;
      for (const t of s.tokens) if (t.map && t.nesting >= 0 && t.type !== 'inline') t.attrSet('data-line', String(t.map[0]));
    });
    return md;
  }
  buildMd();
  // 다른 뷰어용 변환: markcont 해석과 CommonMark 해석을 견줘서 markcont 에서만 굵게가 되는 곳을 찾음
  if (window.MarkPortable) MarkPortable.parsers = () => (md ? { cjk: md, std: mdStd || (mdStd = makeMd(false)) } : null);

  /* =========================================================
     파일 읽기 · 쓰기 (UTF-16 은 맨 앞 BOM 으로 알아보고, 그 밖에는 UTF-8 → 아니면 한글 EUC-KR로 다시 시도)
     - 읽은 글은 맨 앞 BOM 을 떼고 줄 끝을 \n 으로 맞춤: 편집창(<textarea>)이 \r\n 을 \n 으로 바꿔 담으므로, 그대로 두면 고치지 않은 줄까지 모두 바뀐 줄로 보임
     - 파일의 글자 방식(줄 끝 entry.eol · BOM entry.bom · 인코딩 entry.enc)은 기억해 두었다가 저장할 때 되돌려 씀 (저장하면서 파일이 몰래 바뀌지 않게)
     - EUC-KR 파일에 EUC-KR 에 없는 글자(이모지 · — 등)를 쓰려 하면 UTF-8 로 바꿀지 먼저 물음
     ========================================================= */
  // 바이트 → { raw: 글(줄 끝은 그대로), bom: 맨 앞에 BOM 이 있었는지, enc: 'utf-8' | 'euc-kr' | 'utf-16le' | 'utf-16be' }
  function decodeBuf(buf) {
    // UTF-16 은 맨 앞 BOM(FF FE · FE FF)으로만 알아봄 (Windows PowerShell 5.1 의 Out-File · > 가 이렇게 씀)
    const head = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
    if (head[0] === 0xff && head[1] === 0xfe) return { raw: new TextDecoder('utf-16le').decode(buf), bom: true, enc: 'utf-16le' };
    if (head[0] === 0xfe && head[1] === 0xff) return { raw: new TextDecoder('utf-16be').decode(buf), bom: true, enc: 'utf-16be' };
    try {
      const s = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buf);
      const raw = s.replace(/^\uFEFF+/, '');
      return { raw, bom: raw.length !== s.length, enc: 'utf-8' };
    } catch {
      return { raw: new TextDecoder('euc-kr').decode(buf), bom: false, enc: 'euc-kr' };
    }
  }
  const toLF = (s) => (s.includes('\r') ? s.replace(/\r\n?/g, '\n') : s);
  // 주로 쓰는 줄 끝: \r\n 이 줄바꿈의 절반을 넘으면 '\r\n', 아니면 '\n' (PC 프로그램 src-tauri/src/textfile.rs 와 같음)
  function eolOf(s) {
    const crlf = (s.match(/\r\n/g) || []).length;
    return crlf && crlf * 2 > (s.match(/\n/g) || []).length ? '\r\n' : '\n';
  }
  // \n 줄 끝을 eol 로 (eol 을 모르면 \n 그대로)
  const withEol = (text, eol) => (eol === '\r\n' ? toLF(text).replace(/\n/g, '\r\n') : toLF(text));
  // 파일 → { text: \n 으로 맞춘 글, eol, bom, enc }
  async function readDoc(file) {
    const { raw, bom, enc } = decodeBuf(await file.arrayBuffer());
    return { text: toLF(raw), eol: eolOf(raw), bom, enc };
  }
  async function readText(file) { return (await readDoc(file)).text; }
  // 읽은 글자 방식(줄 끝 · BOM · 인코딩)을 entry 에 기억 / fillFmt 는 모르는 것만 채움
  const setFmt = (e, d) => { e.eol = d.eol; e.bom = !!d.bom; e.enc = d.enc || 'utf-8'; };
  const fillFmt = (e, d) => { e.eol ??= d.eol; e.bom ??= !!d.bom; e.enc ??= d.enc || 'utf-8'; };
  // PC 프로그램 save_file 에 넘길 글자 방식 (모르는 것은 null → 지금 파일의 방식을 따름)
  const fmtArgs = (e) => ({ eol: e.eol || null, bom: e.bom ?? null, enc: e.enc || null });
  // EUC-KR(CP949)로 쓰기: 브라우저에는 EUC-KR 인코더가 없어서, 처음 쓸 때 TextDecoder 로 거꾸로 찾는 표를 만듦 (약 17,000자, 수십 ms)
  let eucKrMap = null;
  function eucKrTable() {
    if (eucKrMap) return eucKrMap;
    const dec = new TextDecoder('euc-kr'), b = new Uint8Array(2), m = new Map();
    for (let lead = 0x81; lead <= 0xfe; lead++) for (let trail = 0x41; trail <= 0xfe; trail++) {
      b[0] = lead; b[1] = trail;
      const ch = dec.decode(b);
      if (ch.length === 1 && ch !== '\uFFFD' && !m.has(ch)) m.set(ch, (lead << 8) | trail);
    }
    return (eucKrMap = m);
  }
  // EUC-KR 에 없는 글자 (이모지 · — · © 등). 겹치지 않게 앞에서부터 5개까지
  function eucKrMissing(text) {
    const m = eucKrTable(), out = [];
    for (const ch of text) {
      if (ch.charCodeAt(0) < 0x80 || m.has(ch) || out.includes(ch)) continue;
      out.push(ch);
      if (out.length >= 5) break;
    }
    return out;
  }
  // 파일에 쓸 내용: 줄 끝 · BOM · 인코딩을 f({ eol, bom, enc }) 대로. EUC-KR · UTF-16 이면 바이트, 아니면 글(UTF-8 로 써짐)
  function encodeDoc(text, f = {}) {
    const body = withEol(text, f.eol);
    if (f.enc === 'utf-16le' || f.enc === 'utf-16be') {
      // UTF-16 은 늘 맨 앞 BOM 과 함께 (BOM 으로 알아보므로). 글의 UTF-16 단위를 바이트 순서만 맞춰 그대로 씀
      const le = f.enc === 'utf-16le', out = new Uint8Array(body.length * 2 + 2);
      const put = (i, u) => { out[i] = le ? u & 0xff : u >> 8; out[i + 1] = le ? u >> 8 : u & 0xff; };
      put(0, 0xfeff);
      for (let i = 0; i < body.length; i++) put(2 + i * 2, body.charCodeAt(i));
      return out;
    }
    if (f.enc !== 'euc-kr') return f.bom ? '\uFEFF' + body : body;
    const m = eucKrTable(), out = new Uint8Array(body.length * 2);
    let n = 0;
    for (const ch of body) {
      const c = ch.charCodeAt(0);
      if (c < 0x80) { out[n++] = c; continue; }
      const v = m.get(ch);
      if (v == null) throw new Error(L('EUC-KR(한글 완성형) 파일에 쓸 수 없는 글자가 있습니다: ', "This EUC-KR (Korean) file can't hold these characters: ") + eucKrMissing(body).join(' '));
      out[n++] = v >> 8;
      out[n++] = v & 0xff;
    }
    return out.slice(0, n);
  }
  // 저장할 글자 방식: 문서 e 의 방식 그대로. 다만 EUC-KR 파일에 EUC-KR 에 없는 글자가 있으면 UTF-8 로 바꿔 저장할지 물음
  // (취소하면 null → 저장하지 않음). e 는 바꾸지 않음: 저장에 성공한 뒤 keepFmt 로 반영
  function saveFmt(e, text) {
    const f = { eol: e.eol, bom: e.bom, enc: e.enc };
    if (f.enc !== 'euc-kr') return f;
    const bad = eucKrMissing(text);
    if (!bad.length) return f;
    if (!confirm(L(`이 문서는 EUC-KR(한글 완성형) 파일인데, EUC-KR에 없는 글자가 있습니다: ${bad.join(' ')}\n\nUTF-8로 바꿔 저장할까요? (취소하면 저장하지 않습니다)`, `This document is an EUC-KR (Korean) file, but it has characters EUC-KR can't hold: ${bad.join(' ')}\n\nSave it as UTF-8 instead? (Cancel to leave it unsaved)`))) return null;
    return { ...f, enc: 'utf-8', bom: false };
  }
  const keepFmt = (e, f) => { if (f.eol) e.eol = f.eol; if (f.bom != null) e.bom = f.bom; if (f.enc) e.enc = f.enc; }; // 아는 것만 반영
  async function entryFile(entry) { return entry.file || (entry.handle && entry.handle.getFile()); }

  /* =========================================================
     경로와 첨부 파일
     ========================================================= */
  function resolvePath(base, rel) {
    const parts = base.split('/');
    parts.pop();
    for (const seg of rel.split('/')) {
      if (seg === '..') parts.pop();
      else if (seg !== '.' && seg !== '') parts.push(seg);
    }
    return parts.join('/');
  }
  // 상대 경로가 열어 둔 폴더 밖(위 폴더)으로 나가는지: 그 폴더를 열지 않았으니 대상이 있는지 확인할 수 없음
  //  (따로 연 문서는 들어 있는 폴더를 모르므로 .. 이 있으면 밖으로 봄)
  function leavesRoot(base, rel) {
    if (!/(^|\/)\.\.(\/|$)/.test(rel)) return false;
    const r = rootOf(base);
    return !r || !resolvePath(base, rel).startsWith(r.key + '/');
  }
  const hasScheme = (u) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(u);
  const baseName = (p) => p.split('/').pop();

  function findAssetKey(base, ref) {
    let decoded = ref;
    try { decoded = decodeURIComponent(ref); } catch {}
    const direct = resolvePath(base, decoded);
    if (state.assets.has(direct)) return direct;
    const name = baseName(decoded).toLowerCase();
    for (const k of state.assets.keys()) if (baseName(k).toLowerCase() === name) return k;
    return null;
  }
  // 그림 · 동영상 읽기를 모아 둠: HTML · Word 저장 전에 아직 읽는 중인 것까지 기다렸다가 넣으려고 (settleMedia)
  const mediaLoads = new Set();
  function trackMedia(p) { mediaLoads.add(p); const done = () => mediaLoads.delete(p); p.then(done, done); return p; }
  async function settleMedia() { for (let i = 0; i < 5 && mediaLoads.size; i++) await Promise.allSettled([...mediaLoads]); }
  function assetUrl(key) { return trackMedia(loadAsset(key)); }
  async function loadAsset(key) {
    if (state.assetUrls.has(key)) return state.assetUrls.get(key);
    const a = state.assets.get(key);
    let file;
    if (a.tauriPath) {
      const buf = await window.__TAURI__.core.invoke('read_binary', { path: a.tauriPath });
      file = new Blob([buf], /\.svg$/i.test(key) ? { type: 'image/svg+xml' } : {});
    } else file = a.file || await a.handle.getFile();
    const url = URL.createObjectURL(file);
    state.assetUrls.set(key, url);
    return url;
  }
  function clearAssets() {
    state.assetUrls.forEach((u) => URL.revokeObjectURL(u));
    state.assets.clear();
    state.assetUrls.clear();
  }
  function findEntry(base, ref) {
    let decoded = ref;
    try { decoded = decodeURIComponent(ref); } catch {}
    decoded = decoded.normalize('NFC'); // 맥에서 만든 이름(자모가 쪼개진 꼴)도 같은 이름으로
    const withExt = MD_EXT.test(decoded) ? decoded : decoded + '.md';
    const direct = resolvePath(base.normalize('NFC'), withExt);
    let hit = state.files.find((f) => f.path.normalize('NFC') === direct);
    if (hit) return hit;
    const name = baseName(withExt).toLowerCase();
    return state.files.find((f) => f.name.normalize('NFC').toLowerCase() === name) || null;
  }

  /* =========================================================
     Mermaid (필요할 때만 불러옴)
     ========================================================= */
  let mermaidPromise;
  function loadMermaid() {
    if (!mermaidPromise) {
      mermaidPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'vendor/mermaid.min.js';
        s.onload = () => resolve(window.mermaid);
        s.onerror = reject;
        document.head.append(s);
      });
    }
    return mermaidPromise;
  }
  const mermaidConfig = (dark) => ({
    startOnLoad: false, securityLevel: 'strict', theme: 'base',
    themeVariables: dark
      ? { primaryColor: '#1c3a31', primaryBorderColor: '#3fb98f', primaryTextColor: '#e4e7ea', lineColor: '#8fd9bf', secondaryColor: '#22262b', tertiaryColor: '#1a1d21', actorBkg: '#1c3a31', actorBorder: '#3fb98f', actorTextColor: '#e4e7ea', signalColor: '#e4e7ea', signalTextColor: '#e4e7ea', noteBkgColor: '#2a2f35', noteTextColor: '#e4e7ea', fontFamily: 'Pretendard Variable, Pretendard, sans-serif' }
      : { primaryColor: '#d7f5ea', primaryBorderColor: '#3cb995', primaryTextColor: '#1f2328', lineColor: '#3d4a45', secondaryColor: '#eef7f3', tertiaryColor: '#ffffff', actorBkg: '#d7f5ea', actorBorder: '#3cb995', actorTextColor: '#1f2328', signalColor: '#1f2328', signalTextColor: '#1f2328', noteBkgColor: '#fff8d6', fontFamily: 'Pretendard Variable, Pretendard, sans-serif' },
  });

  /* =========================================================
     렌더링
     ========================================================= */
  const ALERTS = {
    note: [L('참고', 'Note'), 'blue', 'i'], info: [L('정보', 'Info'), 'blue', 'i'], todo: [L('할 일', 'To do'), 'blue', 'check'],
    tip: [L('팁', 'Tip'), 'green', 'bulb'], important: [L('중요', 'Important'), 'purple', 'star'], example: [L('예시', 'Example'), 'purple', 'list'],
    warning: [L('주의', 'Warning'), 'amber', 'warn'], question: [L('질문', 'Question'), 'amber', 'q'], faq: ['FAQ', 'amber', 'q'],
    caution: [L('경고', 'Caution'), 'red', 'stop'], danger: [L('위험', 'Danger'), 'red', 'stop'],
  };
  const ICONS = {
    i: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
    q: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    stop: '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z"/><path d="M12 8v4M12 16h.01"/>',
  };
  const EMOJI = { note: '💡', info: 'ℹ️', todo: '☑️', tip: '✨', important: '❗', example: '📋', warning: '⚠️', question: '❓', faq: '❓', caution: '🚫', danger: '⛔' };
  const SOFT_COLORS = { note: 'gray', tip: 'gray', important: 'blue', warning: 'amber' };
  const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
  const EXPAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const svgIcon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

  function slugify(text) {
    return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '-') || 'section';
  }

  // Obsidian 숨은 메모 %%…%% 지우기 (portable.js: 「다른 뷰어용으로 저장」과 같은 규칙)
  const stripNotes = (src) => (window.MarkPortable && MarkPortable.stripNotes ? MarkPortable.stripNotes(src) : src);
  // YAML front matter: 줄 번호가 어긋나지 않게 같은 수의 빈 줄로 바꿔 둠
  function splitFrontMatter(src) {
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/);
    if (!m) return { fm: null, body: src };
    const n = (m[0].match(/\n/g) || []).length;
    return { fm: m[1], body: '\n'.repeat(n) + src.slice(m[0].length) };
  }
  function fmRows(fm) {
    const rows = [];
    for (const line of String(fm || '').split(/\r?\n/)) {
      const kv = line.match(/^([\w가-힣 .-]+):\s*(.*)$/);
      const li = line.match(/^\s*-\s+(.*)$/);
      if (kv) rows.push([kv[1], kv[2].replace(/^["']|["']$/g, '')]);
      else if (li && rows.length) rows[rows.length - 1][1] += (rows[rows.length - 1][1] ? ', ' : '') + li[1];
    }
    return rows;
  }
  // 문서 정보로 정하는 markcont 보기 옵션
  //  - 뷰어: markcont   → 「다른 뷰어에서 다르게 보이는 곳」 안내를 띄우지 않음 · 문서 점검이 작성 규칙(이모지 · 구분선 · 굵은 소제목)까지 봄
  //  - 배지: 확정=초록, 승인 전=주황, 미결=빨강 → 그 말로 시작하는 표 칸을 색 배지로
  const BADGE_TINT = { 파랑: 'blue', 파란색: 'blue', blue: 'blue', 초록: 'green', 초록색: 'green', 녹색: 'green', green: 'green', 주황: 'amber', 노랑: 'amber', orange: 'amber', yellow: 'amber', amber: 'amber', 빨강: 'red', 빨간색: 'red', red: 'red', 보라: 'purple', purple: 'purple', 회색: 'gray', gray: 'gray', grey: 'gray' };
  function docOptions(fm) {
    const o = { markcontOnly: false, badges: [], cover: false };
    for (const [k, v] of fmRows(fm)) {
      const key = k.trim().toLowerCase();
      if (/^(뷰어|viewer)$/.test(key)) o.markcontOnly = /markcont/i.test(v);
      if (/^(표지|cover)$/.test(key)) o.cover = /^(예|네|있음|켬|true|yes|on|1)$/i.test(v.trim()); // 인쇄 · PDF 첫 쪽에 표지
      if (/^(배지|badges?)$/.test(key)) {
        for (const part of v.split(/[,，]/)) {
          const m = part.match(/^\s*(.+?)\s*=\s*(\S+)\s*$/);
          if (m && BADGE_TINT[m[2].toLowerCase()]) o.badges.push({ word: m[1], tint: BADGE_TINT[m[2].toLowerCase()] });
        }
        o.badges.sort((a, b) => b.word.length - a.word.length);
      }
    }
    return o;
  }
  // 인쇄 · PDF 표지 (문서 정보에 「표지: 예」): 제목 · 요약 · 나머지 정보 표 (화면에서는 숨김)
  function coverHtml(fm, body, cur = state.current) {
    const rows = fmRows(fm), E = escapeHtml;
    const get = (re) => (rows.find(([k]) => re.test(k.trim().toLowerCase())) || [])[1];
    const h1 = (body.match(/^#\s+(.+?)\s*#*\s*$/m) || [])[1];
    const title = get(/^(title|제목)$/) || (h1 ? plainInline(h1) : cur.name.replace(MD_EXT, ''));
    const sub = get(/^(description|summary|subtitle|요약|설명|부제)$/);
    const skip = /^(title|제목|description|summary|subtitle|요약|설명|부제|표지|cover|뷰어|viewer|배지|badges?)$/;
    const meta = rows.filter(([k]) => !skip.test(k.trim().toLowerCase()));
    return `<section class="print-cover"><div class="cover-title">${E(title)}</div>${sub ? `<p class="cover-sub">${E(sub)}</p>` : ''}` +
      (meta.length ? `<table>${meta.map(([k, v]) => `<tr><th>${E(k)}</th><td>${E(v)}</td></tr>`).join('')}</table>` : '') + '</section>';
  }
  function frontMatterHtml(fm) {
    const rows = fmRows(fm);
    if (!rows.length) return '';
    const body = rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
    return `<details class="front-matter" open><summary>${L('문서 정보', 'Document info')}</summary><table>${body}</table></details>`;
  }

  const source = () => el.editor.value;
  // 데이터 정의 카드 사이 연결선: 그린 뒤 · 화면 크기가 바뀔 때마다 다시
  let dataLinkRaf = 0;
  function drawAllDataLinks() {
    if (!window.MarkDiagram) return;
    for (const root of [el.doc, el.sideDoc]) root.querySelectorAll('.dg-html .dt').forEach((dt) => { try { MarkDiagram.drawDataLinks(dt.parentElement); } catch {} });
  }
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { clearTimeout(dataLinkRaf); dataLinkRaf = setTimeout(drawAllDataLinks, 60); }); ro.observe(el.doc); ro.observe(el.sideDoc); }
  // 요약 흐름도: 문서 스타일(CSS)의 칸 너비(--sf-box-width)가 바뀌면 다시 그림
  function redrawSummaries() {
    if (!window.MarkDiagram) return;
    for (const root of [el.doc, el.sideDoc]) root.querySelectorAll('.dg-sum[data-src]').forEach((d) => {
      try { d.classList.remove('dg-error'); d.innerHTML = MarkDiagram.render('summary', d.dataset.src); addDgExpand(d); }
      catch (err) { d.classList.add('dg-error'); d.textContent = L('다이어그램을 그리지 못했습니다\n', "Couldn't draw the diagram\n") + err.message; }
    });
    lineTops = null;
  }

  function render(keepScroll = false) {
    if (!libsOk || !state.current) return;
    applyUserCss(); // 문서마다 다른 스타일 (바뀐 게 없으면 그대로)
    hidePreview();
    const scroll = el.preview.scrollTop;
    const src = source();
    find.hits = []; find.now = -1;
    if (!$('#findBar').hidden) setTimeout(() => runFind($('#findInput').value.trim()), 0);
    const { fm, body } = splitFrontMatter(src);
    state.docOpts = docOptions(fm);
    let html = md.render(stripNotes(body));
    html = DOMPurify.sanitize(html, { ADD_ATTR: ['target'], FORBID_TAGS: ['style'] });
    el.doc.innerHTML = (state.docOpts.cover ? coverHtml(fm, body) : '') + (fm ? frontMatterHtml(fm) : '') + html;
    postProcess();
    buildToc();
    applyFolds();
    updateMeta(src);
    requestAnimationFrame(drawAllDataLinks);
    setTimeout(drawAllDataLinks, 120); // 화면이 뒤에 있어 그리기 콜백이 늦을 때도
    lineTops = null;
    if (keepScroll) el.preview.scrollTop = scroll;
    if (state.editing) { paintEditor(); cursorBlock = null; updateCursor(); }
    svSync();
  }

  // 알림 상자 > [!NOTE] (본문과 링크 미리 보기에서 같이 씀)
  function makeCallouts(root) {
    root.querySelectorAll('blockquote').forEach((bq) => {
      const p = bq.firstElementChild;
      if (!p || p.tagName !== 'P') return;
      const m = p.innerHTML.match(/^\s*\[!(\w+)\]([+-]?)[ \t]*([^\n<]*?)[ \t]*(?:<br>\s*|\n|$)/i);
      if (!m) return;
      const info = ALERTS[m[1].toLowerCase()];
      if (!info) return;
      p.innerHTML = p.innerHTML.slice(m[0].length);
      if (!p.innerHTML.trim()) p.remove();
      const type = m[1].toLowerCase();
      const soft = settings.callout === 'soft';
      const box = document.createElement(m[2] ? 'details' : 'div');
      if (m[2] === '+') box.open = true;
      box.className = 'callout c-' + (soft && SOFT_COLORS[type] ? SOFT_COLORS[type] : info[1]) + (soft ? ' soft' : '');
      box.dataset.callout = type; // 복사해서 붙여 넣을 때 > [!TYPE] 로 되살림 (paste.js)
      if (m[3]) box.dataset.title = '1';
      if (bq.dataset.line) box.dataset.line = bq.dataset.line;
      const title = document.createElement(m[2] ? 'summary' : 'div');
      title.className = 'callout-title';
      title.innerHTML = (soft ? `<span class="emoji">${EMOJI[type] || '💡'}</span>` : svgIcon(info[2])) + '<span></span>';
      if (m[3]) title.lastChild.innerHTML = m[3]; else title.lastChild.textContent = soft ? m[1].toUpperCase() : info[0];
      const bodyEl = document.createElement('div');
      bodyEl.className = 'callout-body';
      bodyEl.append(...bq.childNodes);
      box.append(title);
      if (bodyEl.textContent.trim() || bodyEl.querySelector('img,pre,table')) box.append(bodyEl);
      bq.replaceWith(box);
    });
  }

  // doc · cur · opts: 본문이 아닌 곳(옆 보기)에도 같은 모양으로 그리려고 받음. flows: 흐름도 읽기 기억 (옆 보기는 따로)
  function postProcess(doc = el.doc, cur = state.current, opts = state.docOpts, flows = flowState) {
    const base = cur.path;

    makeCallouts(doc);
    initTabs(doc);
    // ::: tree — 안에 목록이 있거나 이름이 / 로 끝나면 폴더
    doc.querySelectorAll('.mc-tree li').forEach((li) => {
      const own = [...li.childNodes].filter((n) => !(n.nodeType === 1 && /^(UL|OL)$/.test(n.tagName))).map((n) => n.textContent).join('').trim();
      if (li.querySelector(':scope > ul, :scope > ol') || own.endsWith('/')) li.classList.add('dir');
    });

    // 제목: id, 링크 복사, 접기 단추
    const used = new Map();
    doc.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      if (h.closest('.md-example')) return; // 예시 안의 제목은 목차 · 접기에서 뺌
      const title = h.textContent.trim();
      let id = slugify(title);
      const n = used.get(id) || 0;
      used.set(id, n + 1);
      if (n) id += '-' + n;
      h.id = id;
      h.dataset.title = title;
      const tools = document.createElement('span');
      tools.className = 'h-tools';
      tools.innerHTML = '<button type="button" class="h-anchor" title="' + L('이 제목으로 가는 링크 복사', 'Copy a link to this heading') + '">#</button>' +
        '<button type="button" class="h-fold" title="' + L('접기 / 펴기', 'Fold / unfold') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>';
      h.append(tools);
    });
    const heads = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => !h.closest('.md-example'));
    if (settings.headNum) numberHeadings(heads);
    fillInlineToc(heads, doc);

    // 체크리스트 [ ] [x] — 클릭하면 원본도 바뀜
    doc.querySelectorAll('li').forEach((li) => {
      // 빈 줄이 섞인 목록은 <li> 안에 줄바꿈 글자 + <p> 가 들어오므로, 빈 글자는 건너뛰고 찾음
      let first = li.firstChild;
      while (first && first.nodeType === 3 && !first.nodeValue.trim()) first = first.nextSibling;
      const holder = !first ? null : first.nodeType === 3 ? li : first.tagName === 'P' ? first : null;
      let tn = holder === li ? first : holder && holder.firstChild;
      while (tn && tn.nodeType === 3 && !tn.nodeValue.trim() && tn.nextSibling) tn = tn.nextSibling;
      if (!tn || tn.nodeType !== 3) return;
      tn.nodeValue = tn.nodeValue.replace(/^\s+/, '');
      const m = tn.nodeValue.match(/^\[([ xX])\](\s|$)/);
      if (!m) return;
      tn.nodeValue = tn.nodeValue.slice(m[0].length);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'task';
      cb.checked = m[1] !== ' ';
      holder.insertBefore(cb, tn);
      // 체크박스 오른쪽 글자만 span 으로 묶음 (아래 목록 · 문단 같은 블록 앞에서 멈춤)
      const label = document.createElement('span');
      label.className = 'task-text';
      const BLOCK = /^(UL|OL|P|DIV|PRE|TABLE|BLOCKQUOTE|DETAILS|H[1-6]|HR|DL|FIGURE)$/;
      while (cb.nextSibling && !(cb.nextSibling.nodeType === 1 && BLOCK.test(cb.nextSibling.tagName))) label.append(cb.nextSibling);
      cb.after(label);
      li.classList.add('task-item');
      li.classList.toggle('task-done', cb.checked);
    });

    // 설명([^1]: …)이 없는 각주 표시는 글자 그대로 남으므로, 빨간 점선으로 알려줌
    {
      const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement.closest('code, pre, .katex, .ex-src, .fn-missing') ? NodeFilter.FILTER_REJECT
          : /\[\^[^\]\s]+\]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
      });
      const hits = [];
      while (walker.nextNode()) hits.push(walker.currentNode);
      for (const n of hits) {
        const text = n.nodeValue, frag = document.createDocumentFragment();
        let last = 0;
        text.replace(/\[\^([^\]\s]+)\]/g, (m, id, off) => {
          frag.append(text.slice(last, off));
          const s = document.createElement('span');
          s.className = 'fn-missing';
          s.textContent = m;
          s.title = L(`각주 설명이 없습니다. 문서 아무 곳에나 한 줄로 [^${id}]: 설명 을 쓰세요.`, `This footnote has no text. Add a line like [^${id}]: text anywhere in the document.`);
          frag.append(s);
          last = off + m.length;
          return m;
        });
        frag.append(text.slice(last));
        n.replaceWith(frag);
      }
    }

    // 표 칸: 문서 정보 「배지:」의 말로 시작하면 색 배지, 코드 · 날짜 모양(MAIL-P01, 2026-09-18)은 줄을 바꾸지 않음
    const badges = (opts && opts.badges) || [];
    doc.querySelectorAll('td, th').forEach((cell) => {
      if (cell.closest('.front-matter')) return;
      if (badges.length && cell.tagName === 'TD') {
        const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
        const first = w.nextNode();
        if (first && !first.parentElement.closest('code, .katex, a')) {
          const lead = first.nodeValue.match(/^\s*/)[0], rest = first.nodeValue.slice(lead.length);
          const b = badges.find((x) => rest.startsWith(x.word));
          if (b) {
            const sp = document.createElement('span');
            sp.className = 'mc-badge b-' + b.tint;
            sp.textContent = b.word;
            first.nodeValue = rest.slice(b.word.length);
            first.parentNode.insertBefore(sp, first);
          }
        }
      }
      const tw = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('.katex, .nb') ? NodeFilter.FILTER_REJECT : /[A-Za-z0-9가-힣)][-./:][A-Za-z0-9(]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
      const texts = [];
      while (tw.nextNode()) texts.push(tw.currentNode);
      for (const t of texts) {
        const parts = t.nodeValue.split(/(\s+)/);
        if (!parts.some((x) => x.length <= 32 && /[A-Za-z0-9가-힣)][-./:][A-Za-z0-9(]/.test(x))) continue;
        const frag = document.createDocumentFragment();
        for (const x of parts) {
          if (x.length <= 32 && /[A-Za-z0-9가-힣)][-./:][A-Za-z0-9(]/.test(x)) { const sp = document.createElement('span'); sp.className = 'nb'; sp.textContent = x; frag.append(sp); }
          else frag.append(x);
        }
        t.replaceWith(frag);
      }
    });

    // 표 칸 모양: 값이 모두 짧은 칸은 한 줄로, ID · 코드 칸과 상태 칸은 따로 꾸밈
    doc.querySelectorAll('table').forEach((t) => {
      if (t.closest('.front-matter') || !t.tHead) return;
      const heads = [...t.tHead.rows[0].cells];
      const rows = [...t.tBodies].flatMap((b) => [...b.rows]);
      heads.forEach((th, ci) => {
        const cells = rows.map((r) => r.cells[ci]).filter(Boolean);
        const vals = cells.map((c) => c.textContent.trim()).filter((v) => v && v !== '—');
        if (!vals.length) return;
        const hk = th.textContent.trim().toLowerCase();
        const idLike = vals.every((v) => /^[A-Za-z][A-Za-z0-9]*([-_.][A-Za-z0-9]+)+$/.test(v) || /^[A-Z]{1,4}\d+(-\d+)?$/.test(v));
        if (idLike) { cells.forEach((c) => c.classList.add('col-id')); th.classList.add('col-short'); return; }
        if (/^(상태|status|판정|state)$/.test(hk)) { cells.forEach((c) => c.classList.add('col-status')); return; }
        if (Math.max(...vals.map((v) => v.length)) <= 12 && th.textContent.trim().length <= 12) [th, ...cells].forEach((c) => c.classList.add('col-short'));
      });
    });

    // 표 가로 스크롤
    doc.querySelectorAll('table').forEach((t) => {
      if (t.closest('.front-matter')) return;
      const w = document.createElement('div');
      w.className = 'table-wrap';
      t.replaceWith(w);
      w.append(t);
    });

    // 위키링크 [[문서#제목|별명]]
    doc.querySelectorAll('a.wikilink').forEach((a) => {
      const { file, heading, raw } = a.dataset;
      if (!file) { a.href = '#' + slugify(heading); a.dataset.inDoc = '1'; return; }
      const entry = findEntry(base, file);
      if (entry) { a.dataset.path = entry.path; a.title = entry.path; return; }
      const bk = builtinKeyFor(file);
      if (bk) { a.dataset.path = ''; a.dataset.builtin = bk; a.title = BUILTIN[bk].title; return; }
      if (!heading) { a.replaceWith(document.createTextNode(raw)); return; }
      a.classList.add('missing');
      a.dataset.path = '';
      a.title = L('이 문서를 찾지 못했습니다. 폴더 열기로 열면 이동할 수 있어요.', "Couldn't find this document. Open its folder with Open folder to follow the link.");
    });
    // 첨부 ![[그림.png]]
    doc.querySelectorAll('span.wiki-embed').forEach((sp) => {
      const { file, raw } = sp.dataset;
      if (ASSET_EXT.test(file)) {
        // ![[그림.png|설명|300]]: 숫자 칸은 크기(300 · 300x200), 나머지는 설명
        const o = sizeFrom(sp.dataset.alias);
        const node = mediaNode(file, o.text || file, cur);
        applySize(node, o);
        if (!o.text) node.dataset.nocap = '1'; // 설명이 없으면 파일 이름을 그림 밑에 쓰지 않음
        sp.replaceWith(node);
        return;
      }
      const entry = findEntry(base, file);
      // 문서 넣기 ![[문서#제목]]: 그 줄에 홀로 있으면 내용을 그 자리에 (읽은 뒤 채움)
      const p = sp.parentElement;
      if (entry && p && p.tagName === 'P' && p.childNodes.length === 1 && !p.closest('.md-example')) {
        p.replaceWith(embedBox(entry, sp.dataset.heading, [cur.path]));
        return;
      }
      if (entry) {
        const a = document.createElement('a');
        a.className = 'wikilink';
        a.href = '#';
        a.dataset.path = entry.path;
        a.textContent = file;
        sp.replaceWith(a);
      } else sp.replaceWith(document.createTextNode(raw));
    });

    // 링크
    doc.querySelectorAll('a[href]:not(.wikilink)').forEach((a) => {
      const href = a.getAttribute('href');
      if (/^https?:|^mailto:/i.test(href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        // 문단에 유튜브 링크 하나만 있으면 썸네일로
        const id = ytId(href);
        const p = a.parentElement;
        if (id && p.tagName === 'P' && p.childNodes.length === 1) p.replaceWith(ytCard(id));
        return;
      }
      if (href.startsWith('#') || hasScheme(href)) return;
      const [p, hash] = href.split('#');
      if (!MD_EXT.test(p)) return;
      const entry = findEntry(base, p);
      a.dataset.path = entry ? entry.path : '';
      if (!entry && builtinKeyFor(p)) a.dataset.builtin = builtinKeyFor(p);
      else if (!entry && leavesRoot(base, p)) a.dataset.outside = '1'; // 누르면 「위 폴더를 열어 주세요」
      if (hash) a.dataset.hash = hash;
    });

    // 그림, 동영상, 소리, 유튜브
    doc.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      const id = ytId(src);
      if (id) { img.replaceWith(ytCard(id)); return; }
      // ![설명|300](그림.png): 설명 끝의 |숫자는 크기 (Obsidian 과 같은 문법)
      const sz = (img.getAttribute('alt') || '').match(/^(.*?)\s*\|\s*(\d{1,5})(?:\s*[x×]\s*(\d{1,5}))?\s*$/);
      const size = sz ? { w: +sz[2], h: +(sz[3] || 0) } : null;
      if (sz) img.alt = sz[1];
      if (VIDEO_EXT.test(src) || AUDIO_EXT.test(src)) { const m = mediaNode(src, img.alt, cur); if (size) applySize(m, size); img.replaceWith(m); return; }
      if (size) applySize(img, size);
      img.loading = 'lazy';
      img.addEventListener('error', () => img.classList.add('broken'), { once: true });
      // 앱에 든 안내 문서의 그림은 앱 폴더 기준 (icons/… 처럼)
      if (cur.builtin) return;
      if (!hasScheme(src) && !src.startsWith('data:')) {
        const key = findAssetKey(base, src);
        if (key) { assetUrl(key).then((u) => (img.src = u)).catch(() => {}); return; }
        let rel = src;
        try { rel = decodeURIComponent(src); } catch {}
        // PC 프로그램: 열어 둔 폴더 밖이어도 문서 위치를 기준으로 직접 읽음
        if (cur.tauriPath && isTauri()) {
          const dir = cur.tauriPath.replace(/[\\/][^\\/]*$/, '');
          const parts = dir.split(/[\\/]/);
          for (const seg of rel.split('/')) { if (seg === '..') parts.pop(); else if (seg && seg !== '.') parts.push(seg); }
          const abs = parts.join(dir.includes('\\') ? '\\' : '/');
          trackMedia(tinvoke('read_binary', { path: abs })
            .then((buf) => { img.src = URL.createObjectURL(new Blob([buf], /\.svg$/i.test(abs) ? { type: 'image/svg+xml' } : {})); })
            .catch(() => img.replaceWith(missingImage(src, false))));
          return;
        }
        img.replaceWith(missingImage(src, leavesRoot(base, rel)));
      }
    });

    // 한 줄에 따로 쓴 그림: 설명(alt)을 그림 아래에 (링크로 감싼 그림 · 설명 없는 ![[그림]] 은 그대로)
    doc.querySelectorAll('p > img').forEach((img) => {
      const p = img.parentElement;
      const alt = (img.getAttribute('alt') || '').trim();
      if (!alt || img.dataset.nocap || p.closest('.md-example .ex-src')) return;
      if ([...p.childNodes].some((n) => n !== img && (n.nodeType === 1 || n.nodeValue.trim()))) return;
      const fig = document.createElement('figure');
      fig.className = 'img-fig';
      if (p.dataset.line) fig.dataset.line = p.dataset.line;
      const cap = document.createElement('figcaption');
      cap.textContent = alt;
      p.replaceWith(fig);
      fig.append(img, cap);
    });

    // 코드 블록
    const mermaidBlocks = [], flowJobs = [];
    doc.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement;
      if (code.classList.contains('language-mermaid')) {
        const d = document.createElement('div');
        d.className = 'mermaid';
        if (pre.dataset.line || code.dataset.line) d.dataset.line = pre.dataset.line || code.dataset.line;
        d.textContent = code.textContent;
        d.dataset.src = code.textContent; // 어두운 테마에서 서식 복사 · Word 저장할 때 밝은 색으로 다시 그리려고
        pre.replaceWith(d);
        mermaidBlocks.push(d);
        return;
      }
      const lineAttr = pre.dataset.line || code.dataset.line || '';
      const langClass = [...code.classList].find((c) => c.startsWith('language-'));
      const lang = langClass ? langClass.slice(9) : '';
      // markcont 다이어그램: ```flow · ```sequence · ```state · ```timeline · ```요약흐름 (한글 이름도 됨)
      const dgKind = window.MarkDiagram && MarkDiagram.kindOf(lang);
      if (dgKind) {
        const d = document.createElement('div');
        d.className = 'dg';
        if (lineAttr) d.dataset.line = lineAttr;
        try {
          if (dgKind === 'ui') { d.classList.add('dg-html'); d.innerHTML = MarkDiagram.render(dgKind, code.textContent); }
          else if (dgKind === 'data') {
            d.classList.add('dg-html');
            d.innerHTML = MarkDiagram.render(dgKind, code.textContent); // 카드 사이 연결선은 다 그린 뒤 drawAllDataLinks
          }
          else if (dgKind === 'flow') { d.classList.add('dg-flowblock'); flowJobs.push({ d, src: code.textContent }); } // 문서의 흐름도를 다 모은 뒤 그림 (연결자 도착을 다른 블록에서도 찾게)
          else if (dgKind === 'summary') { d.classList.add('dg-sum'); d.dataset.src = code.textContent; d.innerHTML = MarkDiagram.render(dgKind, code.textContent); addDgExpand(d); } // 넓은 · 좁은 모양을 함께 (문서 스타일이 바뀌면 data-src 로 다시 그림)
          else { d.innerHTML = '<div class="dg-scroll">' + MarkDiagram.render(dgKind, code.textContent) + '</div>'; addDgExpand(d); }
        }
        catch (err) { d.classList.add('dg-error'); d.textContent = L('다이어그램을 그리지 못했습니다\n', "Couldn't draw the diagram\n") + err.message; }
        pre.replaceWith(d);
        return;
      }
      // ```math 블록은 수식으로 (화학식 \ce{} 포함)
      if (/^(math|latex|tex|katex)$/i.test(lang)) {
        const d = document.createElement('div');
        d.className = 'math-block';
        if (lineAttr) d.dataset.line = lineAttr;
        d.innerHTML = renderMath(code.textContent.trim(), true);
        pre.replaceWith(d);
        return;
      }
      // 코드 블록 머리줄: 언어 이름, 복사, 크게 보기
      const block = document.createElement('div');
      block.className = 'code-block';
      if (lineAttr) block.dataset.line = lineAttr;
      const head = document.createElement('div');
      head.className = 'code-head';
      head.innerHTML = `<span class="code-lang"></span><button type="button" class="code-copy" title="${L('복사', 'Copy')}">${COPY_ICON}</button><button type="button" class="code-expand" title="${L('크게 보기', 'Expand')}">${EXPAND_ICON}</button>`;
      head.firstChild.textContent = lang || 'code';
      // ```js title="app.js" → 머리줄에 파일 이름 (언어 이름은 마우스를 올리면)
      const title = pre.dataset.title;
      if (title) { head.firstChild.textContent = title; head.firstChild.classList.add('has-title'); if (lang) head.firstChild.title = lang; }
      const body = document.createElement('div');
      body.className = 'code-body';
      pre.replaceWith(block);
      pre.removeAttribute('data-line');
      pre.removeAttribute('data-title');
      // ```js {2,4-5} → 강조 띠: highlight.js 결과는 자르지 않고 줄 높이에 맞춰 뒤에 겹쳐 그림 (여러 줄 주석 · 문자열이 안 깨지게)
      const total = code.textContent.replace(/\n$/, '').split('\n').length;
      const hl = (pre.dataset.hl || '').split(',').map(Number).filter((x) => x >= 1 && x <= total);
      pre.removeAttribute('data-hl');
      if (hl.length) {
        block.dataset.hl = hl.join(',');
        const bands = document.createElement('span');
        bands.className = 'hl-bands';
        bands.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < hl.length; ) {
          let j = i;
          while (j + 1 < hl.length && hl[j + 1] === hl[j] + 1) j++;
          const b = document.createElement('span');
          b.className = 'hl-band';
          b.style.setProperty('--a', hl[i] - 1);
          b.style.setProperty('--n', j - i + 1);
          bands.append(b);
          i = j + 1;
        }
        pre.prepend(bands);
        pre.classList.add('has-hl');
      }
      // 인쇄 · PDF 에서 종이 너비를 넘는 줄이 있으면(한글은 두 칸) 줄을 접고 강조 띠는 숨김 (접으면 줄 위치가 어긋나서)
      const cols = (s) => [...s].reduce((w, ch) => w + (ch === '\t' ? 4 : /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1), 0);
      if (code.textContent.split('\n').some((l) => l.length > 44 && cols(l) > 88)) block.classList.add('wide');
      body.append(pre);
      block.append(head, body);
    });
    if (flowJobs.length) drawFlows(flowJobs, base, flows);
    if (mermaidBlocks.length) {
      loadMermaid().then((m) => {
        m.initialize(mermaidConfig(document.documentElement.dataset.theme === 'dark'));
        return m.run({ nodes: mermaidBlocks });
      }).then(() => { mermaidBlocks.forEach((b) => b.querySelector('svg') && addDgExpand(b)); lineTops = null; }).catch(() => {});
    }
  }

  function ytId(u) {
    const m = String(u).match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
    return m && m[1];
  }
  function ytCard(id) {
    const a = document.createElement('a');
    a.className = 'yt';
    a.href = 'https://www.youtube.com/watch?v=' + id;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = L('유튜브에서 보기', 'Watch on YouTube');
    a.innerHTML = `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${L('유튜브 동영상', 'YouTube video')}" loading="lazy"><span>▶</span>`;
    return a;
  }
  function missingImage(src, outside) {
    const sp = document.createElement('span');
    sp.className = 'img-missing';
    sp.append('🖼 ' + (outside
      ? L('열어 둔 폴더 밖의 그림입니다 — 그림이 들어 있는 위 폴더를 열어 주세요: ', 'This image is outside the open folder — open a parent folder that contains it: ')
      : L('그림을 찾지 못했습니다: ', "Couldn't find the image: ")));
    const c = document.createElement('code');
    c.textContent = src;
    sp.append(c);
    return sp;
  }
  function mediaNode(src, alt, cur = state.current) {
    const kind = VIDEO_EXT.test(src) ? 'video' : AUDIO_EXT.test(src) ? 'audio' : 'img';
    const node = document.createElement(kind);
    if (kind === 'img') { node.alt = alt || ''; node.loading = 'lazy'; }
    else { node.controls = true; node.preload = 'metadata'; }
    if (hasScheme(src) || src.startsWith('data:') || (cur && cur.builtin)) node.src = src;
    else {
      const key = findAssetKey(cur.path, src);
      if (key) assetUrl(key).then((u) => (node.src = u)).catch(() => {});
      else if (kind === 'img') { node.classList.add('broken'); node.alt = alt || src; }
      else node.src = src;
    }
    return node;
  }
  // 그림 크기: 「설명|300」 · 「300x200」 · 「설명|300x200」 → { text: 설명, w, h }
  function sizeFrom(s) {
    let w = 0, h = 0;
    const text = [];
    for (const p of String(s || '').split('|').map((x) => x.trim())) {
      const m = p.match(/^(\d{1,5})(?:\s*[x×]\s*(\d{1,5}))?$/);
      if (m && !w) { w = +m[1]; h = +(m[2] || 0); } else if (p) text.push(p);
    }
    return { text: text.join(' | '), w, h };
  }
  function applySize(node, o) {
    if (!o || !o.w || !/^(IMG|VIDEO)$/.test(node.tagName)) return;
    node.setAttribute('width', o.w);
    if (o.h) { node.setAttribute('height', o.h); node.style.height = o.h + 'px'; node.style.objectFit = 'contain'; }
  }

  /* ---------- 문서 안 클릭 처리 (링크, 복사, 접기, 체크박스) ---------- */
  // inSide: 옆 보기 안에서 누른 것 (제목 · 각주는 옆 보기 안에서 찾고, 링크는 옆 보기 내용만 바꿈)
  async function docClick(e, inSide) {
    const t = e.target;
    const copy = t.closest('.code-copy');
    if (copy) {
      await copyText(copy.closest('.code-block').querySelector('pre code').textContent);
      toast(L('코드를 복사했습니다', 'Code copied'), 1400);
      return;
    }
    const dref = t.closest('.dt-ref, .dt-go');
    if (dref) { e.preventDefault(); const c = document.getElementById(dref.dataset.ref); if (c) { c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1400); } return; }
    const dgx = t.closest('.dg-expand');
    if (dgx) { openDiagramViewer(dgx.parentElement); return; }
    const expand = t.closest('.code-expand');
    if (expand) { toggleExpand(expand.closest('.code-block')); return; }
    const anchor = t.closest('.h-anchor');
    if (anchor) {
      const h = anchor.closest('h1,h2,h3,h4,h5,h6');
      await copyText(`[${h.dataset.title}](#${h.id})`);
      toast(L('링크를 복사했습니다: ', 'Link copied: ') + `[${h.dataset.title}](#${h.id})`);
      return;
    }
    const fold = t.closest('.h-fold');
    if (fold) { if (!inSide) toggleFold(fold.closest('h1,h2,h3,h4,h5,h6').id); return; }
    // 그림을 누르면 크게 보기 (링크로 감싼 그림은 링크로, 나란히 편집 중에는 원본으로 이동)
    const pic = t.closest('img');
    if (pic && zoomable(pic, inSide)) { openImageViewer(pic); return; }

    const a = t.closest('a');
    if (!a) return;
    const goId = inSide ? svScrollTo : scrollToId;
    if (a.dataset.inDoc || (a.getAttribute('href') || '').startsWith('#') && !a.dataset.path && !a.dataset.builtin) {
      e.preventDefault();
      goId(decodeURIComponent((a.getAttribute('href') || '#').slice(1)));
      return;
    }
    if ('path' in a.dataset) {
      e.preventDefault();
      const mod = e.ctrlKey || e.metaKey || e.button === 1;
      // 나란히 편집 중: 그냥 누르면 열지 않고 편집창 커서만 그 줄로 (아래 「미리보기를 누르면 원본으로」가 옮김). 열려면 Ctrl+클릭
      if (!inSide && !mod && state.editing && viewMode === 'split') return;
      const to = aTarget(a);
      if (!to) return;
      // 옆에서 열기: 옆 보기 안의 링크 · Ctrl(가운데)+클릭 · 넓은 화면의 그냥 클릭. 좁은 화면의 그냥 클릭은 본문을 바꿈 (옆 보기가 화면을 덮으므로)
      if (inSide || mod || !svNarrow()) { svOpen(to, to.hash); return; }
      if (to.builtin) {
        const ok = await openBuiltinDoc(to.builtin);
        const h = to.hash;
        // 큰 문서는 그리는 동안 부드러운 스크롤이 끊기므로 바로 이동 (다 그려진 뒤 한 번 더)
        const jump = () => { const t = document.getElementById(decodeURIComponent(h)) || document.getElementById(slugify(decodeURIComponent(h))); if (t) { unfoldTo(t); t.scrollIntoView({ block: 'start' }); } };
        if (ok && h) [80, 700, 1500].forEach((ms) => setTimeout(jump, ms));
        return;
      }
      const ok = await openEntry(to.entry);
      if (ok && to.hash) setTimeout(() => scrollToId(decodeURIComponent(to.hash)), 50);
    }
  }
  // 링크가 가리키는 문서: { entry | builtin, hash }. 열 수 없으면 까닭을 알리고 null
  function aTarget(a) {
    const hash = a.dataset.hash || (a.dataset.heading ? slugify(a.dataset.heading) : '');
    if (a.dataset.builtin) return { builtin: a.dataset.builtin, hash };
    if (a.classList.contains('missing')) { toast(L('이 문서를 찾지 못했습니다. 폴더 열기로 열면 이동할 수 있어요.', "Couldn't find this document. Open its folder with Open folder to follow the link.")); return null; }
    const entry = state.files.find((f) => f.path === a.dataset.path);
    if (!entry && a.dataset.outside) { toast(L('열어 둔 폴더 밖의 문서입니다. 그 문서가 들어 있는 위 폴더를 열면 링크로 이동할 수 있어요.', 'This document is outside the open folder. Open a parent folder that contains it to follow the link.'), 3600); return null; }
    if (!entry) { toast(L('이 파일은 열려 있지 않습니다. 폴더 열기로 폴더를 열면 링크로 이동할 수 있어요.', "This file isn't open. Open its folder with Open folder to follow the link."), 3200); return null; }
    return { entry, hash };
  }
  const setModDown = (on) => document.body.classList.toggle('mod-down', !!on);
  window.addEventListener('keydown', (e) => { if (e.key === 'Control' || e.key === 'Meta') setModDown(true); });
  window.addEventListener('keyup', (e) => { if (e.key === 'Control' || e.key === 'Meta') setModDown(false); });
  window.addEventListener('blur', () => setModDown(false));
  el.preview.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') setModDown(e.ctrlKey || e.metaKey); }, { passive: true }); // 다른 창에서 누른 채 들어온 경우도
  const docLink = (e) => { const a = e.target.closest('a'); return a && 'path' in a.dataset ? a : null; };
  for (const [root, inSide] of [[el.doc, false], [el.sideDoc, true]]) {
    root.addEventListener('click', (e) => docClick(e, inSide));
    // 가운데 클릭: 다른 문서 링크를 옆에서 열기 (브라우저의 새 탭 · 자동 스크롤은 막음)
    root.addEventListener('auxclick', (e) => { if (e.button === 1 && docLink(e)) docClick(e, inSide); });
    root.addEventListener('mousedown', (e) => { if (e.button === 1 && docLink(e)) e.preventDefault(); });
  }
  el.doc.addEventListener('change', (e) => {
    const cb = e.target;
    if (!cb.matches('input.task')) return;
    const li = cb.closest('li[data-line]');
    if (!li) return;
    li.classList.toggle('task-done', cb.checked);
    toggleTaskLine(+li.dataset.line, cb.checked);
  });

  function toggleTaskLine(n, checked) {
    const lines = source().split('\n');
    if (lines[n] == null) return;
    lines[n] = lines[n].replace(/\[( |x|X)\]/, checked ? '[x]' : '[ ]');
    const keep = el.editor.scrollTop;
    el.editor.value = lines.join('\n');
    el.editor.scrollTop = keep;
    markDirty();
    lineTops = null;
    paintEditor();
    if (state.current.handle && !state.editing) save({ quiet: true });
  }

  function zoomable(img, inSide) {
    if (img.closest('a, .ex-src') || img.classList.contains('broken') || !img.complete || !img.naturalWidth) return false;
    return inSide || !state.editing || viewMode === 'preview';
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
  }

  /* ---------- 다이어그램 크게 보기: 확대 · 축소 · 끌어 옮기기 · 화면에 맞추기 ---------- */
  /* ---------- 흐름도: @자료 노드 표 읽기 · 연결자 도착 찾기 ---------- */
  // 마지막으로 그린 문서의 노드 자료 · 찾기 정보 (문서 점검이 같이 씀)
  const flowState = { data: new Map(), ctx: null, seq: 0 };
  const flowDataKey = (base, s) => resolvePath(base, s.path) + '#' + s.flow;
  async function readFlowFile(entry) {
    const c = await gsRead(entry);
    return c ? c.text : await peekText(entry);
  }
  // @자료 파일의 노드 표 (못 찾으면 null)
  async function loadFlowData(base, s) {
    const entry = findEntry(base, s.path);
    if (!entry) return { table: null };
    try { return { table: MarkDiagram.flowTable(await readFlowFile(entry), s.flow), entry }; } catch { return { table: null }; }
  }
  // 연결자 도착 찾기: 같은 문서의 다른 블록 → @자료 파일과 같은 폴더의 노드 자료 파일
  function flowCtx(infos, ext) {
    const views = [], nodes = new Map();
    for (const inf of infos) {
      for (const v of inf.views) if (v.name) views.push(v);
      for (const n of inf.nodes) if (!nodes.has(n.id)) nodes.set(n.id, n);
    }
    const viewOf = (code, own) => (views.find((v) => !own.has(v.name) && v.codes.includes(code)) || {}).name || '';
    return {
      viewOf,
      lookup(code, own) {
        const n = nodes.get(code);
        if (n) return { text: n.text, where: viewOf(code, own) || n.sec };
        const x = ext && ext.get(code);
        return x ? { text: x.text, where: L('다른 문서', 'Other document') + (x.file ? ' · ' + x.file : '') } : null;
      },
    };
  }
  async function drawFlows(jobs, base, fs = flowState) {
    const seq = ++fs.seq;
    const draw = (data, ext) => {
      const dataOf = (src) => { const s = MarkDiagram.flowSource(src); return s ? (data.has(flowDataKey(base, s)) ? data.get(flowDataKey(base, s)) : undefined) : undefined; };
      const ctx = flowCtx(jobs.map((j) => MarkDiagram.flowInfo(j.src, { data: dataOf(j.src) })), ext);
      fs.ctx = ctx;
      for (const j of jobs) {
        if (!j.d.isConnected) continue;
        try {
          j.d.classList.remove('dg-error');
          j.d.innerHTML = '<div class="dg-scroll">' + MarkDiagram.render('flow', j.src, { data: dataOf(j.src), ctx }) + '</div>';
          addDgExpand(j.d);
        } catch (err) {
          j.d.classList.add('dg-error');
          j.d.textContent = L('다이어그램을 그리지 못했습니다\n', "Couldn't draw the diagram\n") + err.message;
        }
      }
      lineTops = null;
    };
    const sources = jobs.map((j) => MarkDiagram.flowSource(j.src)).filter(Boolean);
    // 이미 읽어 둔 노드 자료로 먼저 그리고 (없으면 「읽는 중」), 다 읽으면 다시 그림
    draw(fs.data, fs.ext);
    if (!sources.length) return;
    const data = new Map(), folders = new Set();
    for (const s of sources) {
      const k = flowDataKey(base, s);
      if (data.has(k)) continue;
      const r = await loadFlowData(base, s);
      data.set(k, r.table);
      if (r.entry) folders.add(r.entry.path.replace(/[^/]*$/, ''));
    }
    // 같은 폴더의 다른 노드 자료 파일 (다른 문서로 가는 연결자의 도착 문구)
    const ext = new Map();
    const files = state.files.filter((f) => MD_EXT.test(f.name) && folders.has(f.path.replace(/[^/]*$/, ''))).slice(0, 80);
    for (const f of files) {
      let text;
      try { text = await readFlowFile(f); } catch { continue; }
      for (const t of MarkDiagram.flowTables(text)) {
        for (const n of MarkDiagram.flowInfo(t).nodes) if (!ext.has(n.id)) ext.set(n.id, { text: n.text, file: f.name.replace(MD_EXT, '') });
      }
    }
    if (seq !== fs.seq) return; // 그 사이에 다시 그렸으면 버림
    fs.data = data; fs.ext = ext;
    draw(data, ext);
  }
  // 다른 뷰어용으로 저장: 노드 줄이 없는 흐름도 블록의 「@자료 …」 줄을 그 파일의 노드 표로 바꿈 (@보기 는 그대로)
  async function expandFlowData(text, base) {
    const out = [];
    let fence = null, flow = false, buf = [];
    for (const l of text.split('\n')) {
      const f = l.match(/^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)/);
      if (fence) {
        if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !f[2]) {
          if (flow) {
            const src = buf.join('\n'), s = MarkDiagram.flowSource(src);
            const own = buf.some((b) => b.includes('|') && !/^\s*@/.test(b));
            const r = s && !own ? await loadFlowData(base, s) : null;
            out.push(...(r && r.table ? buf.flatMap((b) => (/^\s*@(자료|data)\s/i.test(b) ? r.table.split('\n') : [b])) : buf));
          }
          out.push(l); fence = null; continue;
        }
        if (flow) buf.push(l); else out.push(l);
        continue;
      }
      if (f) { fence = f[1]; flow = MarkDiagram.kindOf(f[2]) === 'flow'; buf = []; }
      out.push(l);
    }
    if (fence && flow) out.push(...buf); // 닫지 않은 블록
    return out.join('\n');
  }
  // 연결자를 누르면: 같은 문서 안의 도착 도형으로 옮기고(숨은 탭이면 엶) 잠깐 깜빡임
  function gotoFlowNode(code) {
    const hits = [...el.doc.querySelectorAll('.dg-node[data-code]')].filter((g) => g.dataset.code === code);
    const t = hits.find((g) => !g.closest('.mc-tab-panel[hidden]')) || hits[0];
    if (!t) { toast(L(`이 문서에는 ${code} 도형이 없습니다`, `${code} isn't drawn in this document`), 2500); return; }
    const panel = t.closest('.mc-tab-panel[hidden]');
    if (panel) showTab(panel.closest('.mc-tabs'), panel.dataset.tab);
    t.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    t.classList.remove('flash'); void t.getBBox(); t.classList.add('flash');
    setTimeout(() => t.classList.remove('flash'), 1700);
  }
  el.doc.addEventListener('click', (e) => {
    const g = e.target.closest && e.target.closest('.dg-node[data-goto]');
    if (g && el.doc.contains(g) && !g.closest('.dg-modal')) { e.preventDefault(); gotoFlowNode(g.dataset.goto); }
  });
  el.doc.addEventListener('keydown', (e) => {
    const g = e.target.closest && e.target.closest('.dg-node[data-goto]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); gotoFlowNode(g.dataset.goto); }
  });
  function addDgExpand(box) {
    if (box.querySelector(':scope > .dg-expand')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dg-expand';
    b.title = L('크게 보기 (확대 · 축소 · 끌어 옮기기)', 'Expand (zoom · pan)');
    b.innerHTML = EXPAND_ICON;
    box.prepend(b);
  }
  const dgv = { s: 1, x: 0, y: 0, w: 0, h: 0, pts: new Map(), pinch: null };
  function dgvApply() {
    $('#dgStage').style.transform = `translate(${dgv.x}px, ${dgv.y}px) scale(${dgv.s})`;
    $('#dgZoomVal').textContent = Math.round(dgv.s * 100) + '%';
  }
  function dgvFit() {
    const r = $('#dgArea').getBoundingClientRect();
    dgv.s = Math.min((r.width - 48) / dgv.w, (r.height - 48) / dgv.h, dgv.maxFit || 2);
    dgv.x = (r.width - dgv.w * dgv.s) / 2;
    dgv.y = (r.height - dgv.h * dgv.s) / 2;
    dgvApply();
  }
  function dgvZoomAt(f, cx, cy) {
    const ns = Math.min(8, Math.max(0.08, dgv.s * f));
    dgv.x = cx - (cx - dgv.x) * (ns / dgv.s);
    dgv.y = cy - (cy - dgv.y) * (ns / dgv.s);
    dgv.s = ns;
    dgvApply();
  }
  function dgvCenterZoom(f) { const r = $('#dgArea').getBoundingClientRect(); dgvZoomAt(f, r.width / 2, r.height / 2); }
  function openDiagramViewer(box) {
    // 요약 흐름도는 넓은 · 좁은 모양 가운데 지금 보이는 쪽
    const svgs = box ? [...box.querySelectorAll('svg:not(.dg-expand svg)')] : [];
    const svg = svgs.find((x) => x.getClientRects().length) || svgs[0];
    if (!svg) return;
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    const w = (vb && vb.width) || rect.width, h = (vb && vb.height) || rect.height;
    const c = svg.cloneNode(true);
    c.removeAttribute('style');
    c.setAttribute('width', w);
    c.setAttribute('height', h);
    openZoomViewer(c, w, h, 2);
  }
  // 그림 크게 보기: 문서 위에 뜨는 팝업 상자로. 원래 크기를 넘겨 늘리지는 않고, 화면보다 크면 화면에 맞춤
  function openImageViewer(img) {
    const rect = img.getBoundingClientRect();
    const w = img.naturalWidth || rect.width, h = img.naturalHeight || rect.height;
    if (!w || !h) return;
    const c = document.createElement('img');
    c.src = img.currentSrc || img.src;
    c.alt = img.alt;
    c.width = w;
    c.height = h;
    c.draggable = false;
    openZoomViewer(c, w, h, 1, true);
  }
  // 팝업 상자 크기: 그림을 (늘리지 않고) 다 보여 줄 만큼, 화면의 92% × 88% 안에서
  function dgvPopupSize() {
    const box = $('#dgBox'), bar = box.querySelector('.dg-viewer-bar');
    const pad = 48, barH = bar.offsetHeight; // pad: dgvFit 의 여백과 같게 (작은 그림이 100% 로 보이게)
    const maxW = window.innerWidth * 0.92, maxH = window.innerHeight * 0.88 - barH;
    const s = Math.min(1, (maxW - pad) / dgv.w, (maxH - pad) / dgv.h);
    box.style.width = Math.round(Math.min(maxW, Math.max(Math.min(420, maxW), dgv.w * s + pad))) + 'px';
    box.style.height = Math.round(Math.min(maxH, Math.max(160, dgv.h * s + pad)) + barH) + 'px';
  }
  function openZoomViewer(node, w, h, maxFit, popup) {
    const v = $('#dgViewer');
    if (!v.dataset.ready) {
      v.dataset.ready = '1';
      const hint = L('휠 · 두 손가락으로 확대 · 축소, 끌어서 옮기기', 'Wheel or pinch to zoom, drag to pan');
      v.innerHTML = `<div class="dg-viewer-box" id="dgBox" role="dialog" aria-modal="true" aria-label="${L('크게 보기', 'Enlarged view')}"><div class="dg-viewer-bar">
          <button class="btn icon" id="dgZoomOut" title="${L('축소', 'Zoom out')}">−</button>
          <span class="zoom" id="dgZoomVal">100%</span>
          <button class="btn icon" id="dgZoomIn" title="${L('확대', 'Zoom in')}">+</button>
          <button class="btn" id="dgFit">${L('화면에 맞추기', 'Fit to screen')}</button>
          <button class="btn" id="dgActual">100%</button>
          <span class="hint">${hint}</span>
          <span class="dg-spacer"></span>
          <button class="btn" id="dgClose" title="${L('닫기 (Esc)', 'Close (Esc)')}" aria-label="${L('닫기 (Esc)', 'Close (Esc)')}"><span class="dg-close-x" aria-hidden="true">✕</span><span class="dg-close-text">${L('닫기 (Esc)', 'Close (Esc)')}</span></button>
        </div>
        <div class="dg-viewer-area" id="dgArea" title="${hint}"><div class="dg-viewer-stage" id="dgStage"></div></div></div>`;
      // 팝업일 때 상자 밖(어두운 곳)을 누르면 닫음
      v.addEventListener('click', (e) => { if (e.target === v && v.classList.contains('popup')) closeDiagramViewer(); });
      // 팝업일 때 창 크기가 바뀌면 상자 크기 · 맞춤을 다시
      window.addEventListener('resize', () => { if (!v.hidden && v.classList.contains('popup')) { dgvPopupSize(); dgvFit(); } });
      $('#dgZoomIn').onclick = () => dgvCenterZoom(1.25);
      $('#dgZoomOut').onclick = () => dgvCenterZoom(1 / 1.25);
      $('#dgFit').onclick = dgvFit;
      $('#dgActual').onclick = () => { const r = $('#dgArea').getBoundingClientRect(); dgv.s = 1; dgv.x = Math.max(24, (r.width - dgv.w) / 2); dgv.y = Math.max(24, (r.height - dgv.h) / 2); dgvApply(); };
      $('#dgClose').onclick = closeDiagramViewer;
      const area = $('#dgArea');
      area.addEventListener('wheel', (e) => {
        e.preventDefault();
        const r = area.getBoundingClientRect();
        dgvZoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });
      area.addEventListener('pointerdown', (e) => {
        area.setPointerCapture(e.pointerId);
        dgv.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        area.classList.add('drag');
        if (dgv.pts.size === 2) {
          const [a, b] = [...dgv.pts.values()];
          dgv.pinch = Math.hypot(a.x - b.x, a.y - b.y);
        }
      });
      area.addEventListener('pointermove', (e) => {
        const p = dgv.pts.get(e.pointerId);
        if (!p) return;
        if (dgv.pts.size === 1) { dgv.x += e.clientX - p.x; dgv.y += e.clientY - p.y; dgvApply(); }
        p.x = e.clientX; p.y = e.clientY;
        if (dgv.pts.size === 2) {
          const [a, b] = [...dgv.pts.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y), r = area.getBoundingClientRect();
          if (dgv.pinch) dgvZoomAt(d / dgv.pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
          dgv.pinch = d;
        }
      });
      const up = (e) => { dgv.pts.delete(e.pointerId); if (dgv.pts.size < 2) dgv.pinch = null; if (!dgv.pts.size) area.classList.remove('drag'); };
      area.addEventListener('pointerup', up);
      area.addEventListener('pointercancel', up);
      area.addEventListener('dblclick', dgvFit);
    }
    dgv.w = w;
    dgv.h = h;
    dgv.maxFit = maxFit;
    const stage = $('#dgStage');
    stage.innerHTML = '';
    stage.append(node);
    v.classList.toggle('popup', !!popup);
    $('#dgBox').removeAttribute('style');
    v.hidden = false;
    if (popup) dgvPopupSize();
    requestAnimationFrame(dgvFit);
    $('#dgClose').focus({ preventScroll: true });
  }
  function closeDiagramViewer() { $('#dgViewer').hidden = true; $('#dgStage').innerHTML = ''; }

  function toggleExpand(block, force) {
    const on = force ?? !block.classList.contains('expanded');
    document.querySelectorAll('.code-block.expanded').forEach((b) => b.classList.remove('expanded'));
    if (on) block.classList.add('expanded');
    const btn = block.querySelector('.code-expand');
    if (btn) btn.title = on ? L('작게 보기 (Esc)', 'Shrink (Esc)') : L('크게 보기', 'Expand');
  }

  /* ---------- 링크 · 각주 미리 보기: 마우스를 올리면(휴대폰은 길게 누르면) 작은 창으로 ---------- */
  const lp = { box: null, timer: 0, hideTimer: 0, seq: 0, anchor: null, suppress: false };
  const builtinTexts = new Map();
  // 미리 볼 수 있는 링크: 각주 번호, 다른 문서(위키링크 · .md 링크 · 안내 문서), 이 문서 안의 제목
  function previewKind(a) {
    if (!a || !(el.doc.contains(a) || el.sideDoc.contains(a)) || a.closest('nav.toc-inline, .h-tools')) return null;
    if (a.closest('.footnote-ref')) return 'fn';
    if (a.classList.contains('footnote-backref') || a.classList.contains('missing')) return null;
    if (a.dataset.builtin) return 'builtin';
    if (a.dataset.path) return 'doc';
    const href = a.getAttribute('href') || '';
    if (!('path' in a.dataset) && href.length > 1 && href.startsWith('#')) return 'here';
    return null;
  }
  // 아직 열지 않은 문서도 내용만 읽음 (목록의 기록은 건드리지 않음). 글자 방식은 entry 에 (링크 고치기 · 템플릿이 그대로 씀)
  async function peekText(entry) {
    if (entry === state.current) return source();
    if (entry.text != null) return entry.text;
    const d = entry.tauriPath && !entry.file && !entry.handle ? await tinvoke('read_file', { path: entry.tauriPath }) : await readDoc(await entryFile(entry));
    setFmt(entry, d);
    return d.text;
  }
  async function builtinText(key) {
    const opened = state.files.find((f) => f.builtin && f.path === builtinPath(key));
    if (opened && opened.text != null) return opened.text;
    if (!builtinTexts.has(key)) {
      const res = await fetch('docs/' + BUILTIN[key].file, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      builtinTexts.set(key, toLF(await res.text()));
    }
    return builtinTexts.get(key);
  }
  const plainInline = (s) => { const d = document.createElement('div'); d.innerHTML = DOMPurify.sanitize(md.renderInline(s)); return d.textContent.trim(); };
  // 원본에서 #제목 단락(없으면 앞부분)만 잘라 냄: 40줄 안팎, 빈 줄에서 끊음
  function sliceSource(text, hash, max = 40) {
    const lines = splitFrontMatter(text).body.split('\n');
    const heads = [];
    let fence = null;
    lines.forEach((l, i) => {
      const f = l.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null; return; }
      if (f) { fence = f[1]; return; }
      const h = l.match(/^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
      if (h) heads.push({ i, lvl: h[1].length, text: h[2] });
    });
    let from = 0, to = lines.length, found = '';
    if (hash) {
      const want = slugify(hash), used = new Map();
      for (const h of heads) {
        const t = plainInline(h.text);
        let id = slugify(t);
        const n = used.get(id) || 0;
        used.set(id, n + 1);
        if (n) id += '-' + n;
        if (id === hash || id === want || t === hash) {
          const next = heads.find((x) => x.i > h.i && x.lvl <= h.lvl);
          from = h.i; to = next ? next.i : lines.length; found = t;
          break;
        }
      }
    }
    while (from < to && !lines[from].trim()) from++;
    let end = Math.min(to, from + max);
    if (end < to) for (let k = end; k > from + 10; k--) if (!lines[k - 1].trim()) { end = k; break; }
    return { md: lines.slice(from, end).join('\n'), cut: end < to, found };
  }
  /* ---------- 문서 넣기 ![[문서#제목]] ----------
     - 자리를 먼저 그리고, 그 문서를 읽은 뒤 채움 (찾기와 같은 읽기 기억을 써서 칠 때마다 다시 읽지 않음)
     - 각주 번호가 겹치지 않게 넣는 곳마다 docId 를 달리 줌, 넣은 부분의 제목은 id · 목차에서 빼려고 제목 모양 글로
     - 넣는 깊이는 두 단계까지, 서로가 서로를 넣는 경우는 막음 */
  let embedSeq = 0;
  function embedBox(entry, heading, chain) {
    const box = document.createElement('div');
    box.className = 'md-embed';
    const head = document.createElement('a');
    head.className = 'emb-head';
    head.href = '#';
    head.dataset.path = entry.path;
    if (heading) head.dataset.hash = slugify(heading);
    head.textContent = '📄 ' + entry.name.replace(MD_EXT, '') + (heading ? ' › ' + heading : '');
    head.title = L('원래 문서로 가기', 'Go to the original document');
    const body = document.createElement('div');
    body.className = 'emb-body';
    body.textContent = L('불러오는 중…', 'Loading…');
    box.append(head, body);
    fillEmbed(box, entry, heading, chain);
    return box;
  }
  async function fillEmbed(box, entry, heading, chain) {
    const body = box.querySelector('.emb-body'), fail = (msg) => { body.textContent = msg; box.classList.add('missing'); };
    if (chain.includes(entry.path)) return fail(L('이 문서를 넣은 문서를 다시 넣을 수 없습니다', "Can't embed a document that embeds this one"));
    if (chain.length > 2) return fail(L('문서 넣기는 두 단계까지입니다', 'Embeds go only two levels deep'));
    let text;
    try { const c = await gsRead(entry); text = c ? c.text : await peekText(entry); } catch { return fail(L('문서를 읽지 못했습니다', "Couldn't read the document")); }
    const part = sliceSource(text, heading, Infinity);
    if (heading && !part.found) return fail(L(`「${heading}」 제목을 찾지 못했습니다`, `Heading “${heading}” not found`));
    body.innerHTML = DOMPurify.sanitize(md.render(stripNotes(part.md), { nested: true, depth: 1, docId: 'emb' + ++embedSeq }), { ADD_ATTR: ['target'], FORBID_TAGS: ['style'] });
    embedProcess(body, entry, chain.concat(entry.path));
  }
  // 다른 뷰어용으로 저장: 한 줄에 홀로 있는 ![[문서#제목]] 을 그 내용으로 펼침 (두 단계까지, 코드 안은 그대로)
  async function expandEmbeds(text, base, chain) {
    const out = [];
    let fence = null;
    for (const l of text.split('\n')) {
      const f = l.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null; out.push(l); continue; }
      if (f) { fence = f[1]; out.push(l); continue; }
      const m = l.match(/^\s*!\[\[([^\]|#]+)(?:#([^\]|]*))?(?:\|[^\]]*)?\]\]\s*$/);
      const entry = m && !ASSET_EXT.test(m[1].trim()) && findEntry(base, m[1].trim());
      if (!entry || chain.includes(entry.path) || chain.length > 2) { out.push(l); continue; }
      let t;
      try { const c = await gsRead(entry); t = c ? c.text : await peekText(entry); } catch { out.push(l); continue; }
      const part = sliceSource(t, (m[2] || '').trim(), Infinity);
      if (m[2] && !part.found) { out.push(l); continue; }
      out.push(...(await expandEmbeds(part.md, entry.path, chain.concat(entry.path))).split('\n'));
    }
    return out.join('\n');
  }
  // 넣은 내용 안: 그림 · 링크는 넣은 문서 기준으로, 제목은 목차에 안 들어가게, 안에 또 넣은 문서는 한 단계 더
  function embedProcess(root, entry, chain) {
    makeCallouts(root);
    root.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      const d = document.createElement('div');
      d.className = 'emb-h emb-' + h.tagName.toLowerCase();
      d.setAttribute('role', 'heading');
      d.setAttribute('aria-level', h.tagName[1]);
      d.append(...h.childNodes);
      h.replaceWith(d);
    });
    root.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      img.loading = 'lazy';
      if (hasScheme(src) || src.startsWith('data:')) return;
      img.removeAttribute('src');
      const key = findAssetKey(entry.path, src);
      if (key) assetUrl(key).then((u) => (img.src = u)).catch(() => {});
    });
    root.querySelectorAll('span.wiki-embed').forEach((sp) => {
      const f = sp.dataset.file;
      if (ASSET_EXT.test(f)) { const o = sizeFrom(sp.dataset.alias); const node = document.createElement('img'); node.alt = o.text || f; applySize(node, o); const key = findAssetKey(entry.path, f); if (key) assetUrl(key).then((u) => (node.src = u)).catch(() => {}); sp.replaceWith(node); return; }
      const t = findEntry(entry.path, f), p = sp.parentElement;
      if (t && p && p.tagName === 'P' && p.childNodes.length === 1) p.replaceWith(embedBox(t, sp.dataset.heading, chain));
      else sp.replaceWith(document.createTextNode(sp.dataset.raw));
    });
    root.querySelectorAll('a.wikilink').forEach((a) => {
      const { file, heading } = a.dataset;
      const t = file ? findEntry(entry.path, file) : entry;
      if (t) { a.dataset.path = t.path; if (heading) a.dataset.hash = slugify(heading); } else a.classList.add('missing');
    });
    root.querySelectorAll('a[href]:not(.wikilink)').forEach((a) => {
      const href = a.getAttribute('href');
      if (/^https?:|^mailto:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
      if (hasScheme(href)) return;
      const [p, hash] = href.split('#');
      if (!p) { a.dataset.path = entry.path; if (hash) a.dataset.hash = hash; return; }
      if (!MD_EXT.test(p)) return;
      const t = findEntry(entry.path, p);
      a.dataset.path = t ? t.path : '';
      if (hash) a.dataset.hash = hash;
    });
  }
  // 미리 보기 안: 알림 상자는 그리고, 링크는 누르지 않게, 그림은 그 문서 기준으로
  function previewProcess(root, base, builtin) {
    makeCallouts(root);
    const imgSrc = (img, src) => {
      img.loading = 'lazy';
      if (builtin || hasScheme(src) || src.startsWith('data:')) { img.src = src; return; }
      img.removeAttribute('src');
      const key = findAssetKey(base, src);
      if (key) assetUrl(key).then((u) => (img.src = u)).catch(() => {});
    };
    root.querySelectorAll('span.wiki-embed').forEach((x) => {
      const f = x.dataset.file;
      if (!IMG_EXT.test(f)) { x.replaceWith(document.createTextNode(x.dataset.raw)); return; }
      const img = document.createElement('img');
      img.alt = f;
      imgSrc(img, f);
      x.replaceWith(img);
    });
    root.querySelectorAll('img[src]').forEach((img) => imgSrc(img, img.getAttribute('src')));
    root.querySelectorAll('a').forEach((x) => {
      const h = x.getAttribute('href') || '';
      if (/^https?:|^mailto:/i.test(h)) { x.target = '_blank'; x.rel = 'noopener noreferrer'; return; }
      const sp = document.createElement('span');
      sp.className = 'pv-link';
      sp.append(...x.childNodes);
      x.replaceWith(sp);
    });
  }
  async function previewContent(a, kind) {
    const box = document.createElement('div');
    // 옆 보기 안의 링크는 옆 보기 안에서 찾음 (본문과 제목 id 가 겹칠 수 있음)
    const root = el.sideDoc.contains(a) ? el.sideDoc : el.doc;
    const byId = (id) => (root === el.doc ? document.getElementById(id) : svFind(id));
    if (kind === 'fn') {
      const li = byId(decodeURIComponent((a.getAttribute('href') || '#').slice(1)));
      if (!li || !root.contains(li)) return null;
      const c = li.cloneNode(true);
      c.querySelectorAll('.footnote-backref').forEach((x) => x.remove());
      box.append(...c.childNodes);
      return { title: L('각주 ', 'Footnote ') + a.textContent.replace(/[[\]]/g, ''), node: box };
    }
    if (kind === 'here') {
      const id = decodeURIComponent((a.getAttribute('href') || '#').slice(1));
      const h = byId(id) || byId(slugify(id));
      if (!h || !root.contains(h) || !headingLevel(h)) return null;
      const lvl = headingLevel(h);
      for (let n = h.nextElementSibling, k = 0; n && k < 12; n = n.nextElementSibling, k++) {
        const l = headingLevel(n);
        if ((l && l <= lvl) || n.matches('.footnotes, .footnotes-sep')) break;
        const c = n.cloneNode(true);
        c.querySelectorAll('.h-tools, .dg-expand, .code-head button, .copy').forEach((x) => x.remove());
        c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
        c.removeAttribute('id');
        c.classList.remove('fold-hidden', 'cursor-block');
        box.append(c);
      }
      if (!box.childNodes.length) return null;
      box.querySelectorAll('a').forEach((x) => { if (!/^https?:|^mailto:/i.test(x.getAttribute('href') || '')) x.removeAttribute('href'); });
      return { title: headLabel(h), node: box };
    }
    let text, base, name, builtin = false;
    if (kind === 'builtin') {
      const key = a.dataset.builtin;
      text = await builtinText(key);
      base = builtinPath(key); name = BUILTIN[key].title; builtin = true;
    } else {
      const entry = state.files.find((f) => f.path === a.dataset.path);
      if (!entry) return null;
      text = await peekText(entry);
      base = entry.path; name = entry.name.replace(MD_EXT, ''); builtin = !!entry.builtin;
    }
    if (text == null) return null;
    let hash = a.dataset.hash || a.dataset.heading || '';
    try { hash = decodeURIComponent(hash); } catch {}
    const s = sliceSource(text, hash);
    box.innerHTML = DOMPurify.sanitize(md.render(stripNotes(s.md), { nested: true, depth: 1, docId: 'pv' }), { ADD_ATTR: ['target'], FORBID_TAGS: ['style'] });
    previewProcess(box, base, builtin);
    if (!box.textContent.trim() && !box.querySelector('img')) box.innerHTML = `<p class="lp-more">${L('비어 있는 문서입니다', 'This document is empty')}</p>`;
    if (s.cut) box.insertAdjacentHTML('beforeend', `<div class="lp-more">${L('… 이어지는 내용이 더 있습니다', '… There is more below')}</div>`);
    return { title: name + (s.found ? ' › ' + s.found : ''), node: box, how: lpHow(a) };
  }
  // 다른 문서 링크를 눌렀을 때 일어나는 일: [누르는 방법, 결과] (docClick 의 규칙과 같게)
  function lpHow(a) {
    const ctrl = (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl') + L('+클릭', '+click'), click = L('클릭', 'Click');
    const beside = L('보던 문서는 그대로 두고 오른쪽 옆 보기에 엽니다', 'opens in the side view on the right, keeping this document');
    const same = [ctrl, L('그냥 클릭과 같습니다 (옆 보기에 엽니다)', 'same as a plain click (opens in the side view)')];
    // when: 지금 어떤 상태라서 이렇게 열리는지 (상태마다 달라지므로 먼저 밝힘)
    if (el.sideDoc.contains(a)) return { when: L('옆 보기 안에서는', 'Inside the side view'), rows: [[click, L('옆 보기의 내용을 이 문서로 바꿉니다 (본문은 그대로)', 'shows this document in the side view (the main document stays)')]] };
    if (state.editing && viewMode === 'split') return { when: L('나란히 편집 중에는', 'While editing side by side'), rows: [[click, L('열지 않고 편집창 커서를 이 링크 줄로 옮깁니다', "doesn't open it; moves the editor cursor to this link's line")], [ctrl, beside]] };
    if (svNarrow()) return { when: L('좁은 화면에서는', 'On a narrow screen'), rows: [[click, L('본문을 이 문서로 바꿉니다', 'replaces the main document with this one')], [ctrl, L('본문 위를 덮는 옆 보기에 엽니다', 'opens in a side view over the main document')]] };
    return { when: state.editing ? L('미리보기만 볼 때는', 'In preview-only mode') : L('보기만 할 때는', 'In view-only mode'), rows: [[click, beside], same] };
  }
  function previewBox() {
    if (lp.box) return lp.box;
    const b = document.createElement('div');
    b.className = 'link-preview';
    b.hidden = true;
    b.setAttribute('role', 'tooltip');
    b.innerHTML = '<div class="lp-head"><span class="lp-title"></span><button type="button" class="lp-side" hidden></button></div><div class="lp-body markdown-body"></div><div class="lp-foot" hidden></div>';
    b.querySelector('.lp-side').textContent = L('옆에서 열기', 'Open beside');
    b.querySelector('.lp-side').onclick = () => { const a = lp.anchor, to = a && a.isConnected && aTarget(a); hidePreview(); if (to) svOpen(to, to.hash); };
    b.addEventListener('pointerenter', () => clearTimeout(lp.hideTimer));
    b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hidePreviewSoon(); });
    document.body.append(b);
    return (lp.box = b);
  }
  async function showPreview(a) {
    const kind = previewKind(a);
    if (!kind) return;
    const seq = ++lp.seq;
    let r = null;
    try { r = await previewContent(a, kind); } catch {}
    if (seq !== lp.seq || !r || !a.isConnected) return;
    const b = previewBox();
    b.querySelector('.lp-title').textContent = r.title;
    // 그냥 눌러서는 옆에서 열리지 않는 곳(나란히 편집 중 · 좁은 화면)에서만 단추를 보임
    b.querySelector('.lp-side').hidden = !((kind === 'doc' || kind === 'builtin') && el.doc.contains(a) && (svNarrow() || (state.editing && viewMode === 'split')));
    const body = b.querySelector('.lp-body');
    body.innerHTML = '';
    body.append(r.node);
    // 창 아래에 늘 보이게: 이 링크를 누르면 어디에 열리는지 (지금 화면 · 보기 방식에 맞춰)
    const foot = b.querySelector('.lp-foot');
    foot.innerHTML = '';
    foot.hidden = !r.how;
    if (r.how) foot.append(Object.assign(document.createElement('div'), { className: 'lp-when', textContent: r.how.when }));
    for (const [key, what] of r.how ? r.how.rows : []) {
      const row = document.createElement('div');
      row.append(Object.assign(document.createElement('b'), { textContent: key }), what);
      foot.append(row);
    }
    b.style.visibility = 'hidden';
    b.hidden = false;
    body.scrollTop = 0;
    // 링크 바로 아래(자리가 없으면 위)에
    const rc = a.getClientRects()[0] || a.getBoundingClientRect();
    const w = b.offsetWidth, h = b.offsetHeight;
    let top = rc.bottom + 6;
    if (top + h > innerHeight - 8 && rc.top - 6 - h >= 8) top = rc.top - 6 - h;
    b.style.top = Math.max(8, Math.min(top, innerHeight - h - 8)) + 'px';
    b.style.left = Math.max(8, Math.min(rc.left, innerWidth - w - 8)) + 'px';
    b.style.visibility = '';
    lp.anchor = a;
  }
  function hidePreview() {
    clearTimeout(lp.timer);
    clearTimeout(lp.hideTimer);
    lp.seq++;
    lp.anchor = null;
    if (lp.box) lp.box.hidden = true;
  }
  function hidePreviewSoon() { clearTimeout(lp.hideTimer); lp.hideTimer = setTimeout(hidePreview, 220); }
  const previewOpen = () => !!(lp.box && !lp.box.hidden);
  // 데이터 카드: 선택지 번호에 올리면 그 번호로 이어진 필드를, 필드의 번호 칩에 올리면 이어진 선택지를 강조
  function dtHover(e) {
    const hit = e.target.closest ? e.target.closest('.dt-opts li[data-opt], .dt-cond') : null;
    const card = hit && hit.closest('.dt-card');
    const root = e.currentTarget;
    if (root._dtHit === hit) return;
    root._dtHit = hit;
    root.querySelectorAll('.dt-hl').forEach((n) => n.classList.remove('dt-hl'));
    if (!card) return;
    if (hit.matches('.dt-cond')) {
      const keys = hit.dataset.cond.split(' ');
      card.querySelectorAll('.dt-opts li[data-opt]').forEach((li) => { if (keys.includes(li.dataset.opt)) li.classList.add('dt-hl'); });
    } else {
      card.querySelectorAll('.dt-cond').forEach((c) => { if (c.dataset.cond.split(' ').includes(hit.dataset.opt)) c.closest('.dt-row').classList.add('dt-hl'); });
    }
  }
  for (const root of [el.doc, el.sideDoc]) {
    root.addEventListener('pointerover', dtHover);
    root.addEventListener('pointerleave', dtHover);
    root.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const a = e.target.closest('a');
      if (!previewKind(a)) return;
      clearTimeout(lp.hideTimer);
      if (lp.anchor === a && previewOpen()) return;
      clearTimeout(lp.timer);
      lp.timer = setTimeout(() => showPreview(a), 350);
    });
    root.addEventListener('pointerout', (e) => {
      if (e.pointerType !== 'mouse') return;
      const a = e.target.closest('a');
      if (!a || (e.relatedTarget && a.contains(e.relatedTarget))) return;
      clearTimeout(lp.timer);
      if (previewOpen()) hidePreviewSoon(); else lp.seq++;
    });
    // 휴대폰 · 태블릿: 길게 누르면 미리 보기, 그때는 링크로 넘어가지 않음
    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      lp.suppress = false;
      if (previewOpen()) hidePreview();
      const a = e.target.closest('a');
      if (!previewKind(a)) return;
      const x = e.clientX, y = e.clientY;
      lp.timer = setTimeout(() => { lp.suppress = true; showPreview(a); }, 450);
      const stop = (ev) => {
        if (ev.type === 'pointermove' && Math.hypot(ev.clientX - x, ev.clientY - y) < 10) return;
        clearTimeout(lp.timer);
        ['pointerup', 'pointercancel', 'pointermove'].forEach((t) => a.removeEventListener(t, stop));
      };
      ['pointerup', 'pointercancel', 'pointermove'].forEach((t) => a.addEventListener(t, stop));
    });
    root.addEventListener('click', (e) => { if (lp.suppress) { lp.suppress = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    root.addEventListener('contextmenu', (e) => { if (lp.suppress) e.preventDefault(); });
  }
  document.addEventListener('pointerdown', (e) => { if (previewOpen() && !lp.box.contains(e.target)) hidePreview(); });
  for (const pane of [el.preview, el.sideScroll]) pane.addEventListener('scroll', () => { if (previewOpen()) hidePreview(); }, { passive: true });
  window.addEventListener('blur', () => { if (previewOpen()) hidePreview(); });

  /* ---------- 옆 보기: 본문은 그대로 두고 링크의 문서를 오른쪽에서 읽기 ----------
     - 읽기 전용: 체크박스는 못 누르고, 목차 탭 · 접기 · 찾기는 본문 것만
     - 본문과 같은 함수(postProcess)로 그림. 제목 id 가 본문과 겹칠 수 있어 옆 보기 안에서는 svFind 로 찾음
     - 옆 보기 안의 링크는 옆 보기 내용만 바꿈. 본문으로 올리려면 머리줄의 「본문으로 열기」 */
  const svOpenNow = () => !el.sideView.hidden;
  const svCur = () => sv.hist[sv.pos] || null;
  const svNarrow = () => matchMedia('(max-width: 900px)').matches;
  const svSig = () => document.documentElement.dataset.theme + JSON.stringify(settings);
  function svFind(id) { try { return el.sideDoc.querySelector('#' + CSS.escape(id)); } catch { return null; } }
  function svScrollTo(id, smooth = true) {
    const t = svFind(id) || svFind(slugify(id));
    if (!t) return;
    const top = el.sideScroll.scrollTop + t.getBoundingClientRect().top - el.sideScroll.getBoundingClientRect().top - 12;
    el.sideScroll.scrollTo({ top, behavior: smooth && Math.abs(top - el.sideScroll.scrollTop) < 4000 ? 'smooth' : 'auto' }); // 먼 곳은 바로
  }
  // 안내 문서: 이미 목록에 있으면 그것을, 아니면 내용만 읽어 둔 것을 (목록 · 기록은 건드리지 않음)
  async function svEntryOf(to) {
    if (to.entry) return to.entry;
    const key = to.builtin, path = builtinPath(key);
    const opened = state.files.find((f) => f.builtin && f.path === path);
    if (opened) return opened;
    if (!sv.builtins.has(key)) sv.builtins.set(key, { name: BUILTIN[key].name, path, text: await builtinText(key), builtin: true, builtinKey: key });
    return sv.builtins.get(key);
  }
  // 본문에서 열어 둔 문서는 편집창의 글을, 그 밖에는 파일을 새로 읽음 (밖에서 바뀐 내용도 보이게)
  async function svRead(entry) {
    if (entry === state.current) return source();
    if (entry.builtin) return entry.text;
    try {
      if (entry.tauriPath && !entry.file && !entry.handle) return toLF((await tinvoke('read_file', { path: entry.tauriPath })).text);
      const f = await entryFile(entry);
      if (f) return toLF((await readDoc(f)).text);
    } catch (err) { if (entry.text == null) throw err; }
    return entry.text;
  }
  async function svOpen(to, hash = '') {
    hidePreview();
    let entry;
    try { entry = await svEntryOf(to); } catch { toast(L('안내 문서를 열지 못했습니다.', "Couldn't open the built-in document."), 3000); return false; }
    const now = svCur(), same = !!now && now.entry === entry;
    if (!same) {
      sv.hist = sv.hist.slice(0, sv.pos + 1);
      sv.hist.push({ entry });
      if (sv.hist.length > 50) sv.hist.shift();
      sv.pos = sv.hist.length - 1;
    }
    return svShow(hash, same);
  }
  // keep: 읽던 자리 그대로, lazy: 내용 · 설정이 바뀌었을 때만 다시 그림
  async function svShow(hash = '', keep = false, lazy = false) {
    const it = svCur();
    if (!it) return false;
    const seq = ++sv.seq;
    let text = null;
    try { text = await svRead(it.entry); } catch {}
    if (seq !== sv.seq || it !== svCur()) return false;
    const wasOpen = svOpenNow();
    el.sideView.hidden = false;
    el.workspace.classList.add('has-side');
    document.body.classList.add('sv-open');
    if (!wasOpen) svLayout();
    svHead();
    if (text == null) {
      sv.text = null;
      el.sideDoc.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'sv-note';
      p.textContent = L('문서를 읽지 못했습니다', "Couldn't read the document");
      el.sideDoc.append(p);
      return false;
    }
    if (!(lazy && text === sv.text && svSig() === sv.sig)) svPaint(it.entry, text, keep);
    if (hash) {
      let id = hash;
      try { id = decodeURIComponent(hash); } catch {}
      // 큰 문서 · 그림은 그린 뒤에 자리가 밀리므로 몇 번 더 맞춤
      [0, 120, 700].forEach((ms) => setTimeout(() => { if (seq === sv.seq) svScrollTo(id, false); }, ms));
    }
    return true;
  }
  function svPaint(entry, text, keep) {
    const top = el.sideScroll.scrollTop;
    sv.text = text;
    sv.sig = svSig();
    const { fm, body } = splitFrontMatter(text);
    const opts = docOptions(fm);
    const html = DOMPurify.sanitize(md.render(stripNotes(body), { docId: 'side' }), { ADD_ATTR: ['target'], FORBID_TAGS: ['style'] }); // docId: 각주 번호가 본문과 겹치지 않게
    el.sideDoc.innerHTML = (opts.cover ? coverHtml(fm, body, entry) : '') + (fm ? frontMatterHtml(fm) : '') + html;
    postProcess(el.sideDoc, entry, opts, sv.flows);
    el.sideDoc.querySelectorAll('input.task').forEach((cb) => (cb.disabled = true)); // 읽기 전용
    el.sideScroll.scrollTop = keep ? top : 0;
    requestAnimationFrame(drawAllDataLinks);
  }
  const svName = (entry) => { const k = entry.builtin && Object.keys(BUILTIN).find((x) => builtinPath(x) === entry.path); return k ? BUILTIN[k].title : entry.name.replace(MD_EXT, ''); };
  function svHead() {
    const it = svCur(), head = $('#svHead');
    if (!it) return;
    if (!head.firstChild) {
      const btn = (id, cls, tip, inner) => `<button type="button" class="btn ${cls}" id="${id}" title="${tip}" aria-label="${tip}">${inner}</button>`;
      const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
      head.innerHTML = btn('svBack', 'icon ghost', L('옆 보기: 이전 문서', 'Side view: previous document'), svg('<path d="m15 6-6 6 6 6"/>')) +
        btn('svFwd', 'icon ghost', L('옆 보기: 다음 문서', 'Side view: next document'), svg('<path d="m9 6 6 6-6 6"/>')) +
        '<div class="sv-title"><small></small><span></span></div>' +
        btn('svPromote', 'sv-promote', L('이 문서를 본문으로 열기', 'Open this document in the main view'), '') +
        btn('svClose', 'icon ghost', L('옆 보기 닫기 (Esc)', 'Close side view (Esc)'), svg('<path d="M18 6 6 18M6 6l12 12"/>'));
      head.querySelector('.sv-title small').textContent = L('옆 보기', 'Beside');
      $('#svPromote').textContent = L('본문으로 열기', 'Open in main');
      $('#svBack').onclick = () => svGo(-1);
      $('#svFwd').onclick = () => svGo(1);
      $('#svPromote').onclick = svPromote;
      $('#svClose').onclick = svClose;
    }
    const t = head.querySelector('.sv-title');
    t.lastChild.textContent = svName(it.entry);
    t.title = it.entry.builtin ? svName(it.entry) : it.entry.path;
    $('#svBack').disabled = sv.pos <= 0;
    $('#svFwd').disabled = sv.pos >= sv.hist.length - 1;
    $('#svPromote').disabled = it.entry === state.current;
  }
  function svGo(step) {
    const to = sv.pos + step;
    if (to < 0 || to >= sv.hist.length) return;
    sv.pos = to;
    svShow();
  }
  // 옆에서 보던 문서를 본문으로 (저장하지 않은 본문이 있으면 평소처럼 묻고, 열리면 옆 보기는 닫음)
  async function svPromote() {
    const it = svCur();
    if (!it) return;
    const e = it.entry;
    const ok = e.builtinKey && !state.files.includes(e) ? await openBuiltinDoc(e.builtinKey) : await openEntry(e);
    if (ok) svClose();
  }
  function svClose() {
    if (!svOpenNow() && !sv.hist.length) return;
    clearTimeout(sv.timer);
    sv.seq++;
    sv.hist = []; sv.pos = -1; sv.text = null;
    el.sideView.hidden = true;
    el.sideDoc.innerHTML = '';
    el.workspace.classList.remove('has-side', 'side-over');
    document.body.classList.remove('sv-open');
    svLayout();
  }
  // 나란히 편집 중 세 칸이 안 되는 폭이면 옆 보기가 미리보기 자리를 대신함. 칸 폭이 바뀌므로 편집창 쪽도 다시 맞춤
  const SV_3COL = 1280;
  function svLayout() {
    const over = svOpenNow() && state.editing && viewMode === 'split' && !svNarrow() && el.workspace.clientWidth < SV_3COL;
    el.workspace.classList.toggle('side-over', over);
    // 「맨 위로」 단추가 옆 보기를 가리지 않게 본문 쪽으로
    document.body.style.setProperty('--sv-px', (svOpenNow() && !svNarrow() ? el.sideView.offsetWidth : 0) + 'px');
    lineTops = null;
    if (state.editing) requestAnimationFrame(() => { syncHlWidth(); syncHlScroll(); });
  }
  window.addEventListener('resize', () => { if (svOpenNow()) svLayout(); });
  // 본문을 다시 그릴 때: 옆에 같은 문서를 띄웠으면 고친 내용을, 설정 · 테마가 바뀌었으면 모양을 따라 맞춤
  function svSync() {
    if (!svOpenNow()) return;
    const it = svCur();
    if (!it) return;
    $('#svPromote') && ($('#svPromote').disabled = it.entry === state.current);
    if ((it.entry === state.current && source() !== sv.text) || svSig() !== sv.sig) {
      clearTimeout(sv.timer);
      sv.timer = setTimeout(() => svShow('', true, true), 250);
    }
  }
  // 파일 목록이 바뀔 때: 목록에서 빠진 문서는 옆 보기 기록에서도 빼고, 보던 문서가 없어졌으면 닫음
  function svPrune() {
    if (!sv.hist.length) return;
    const keep = (it) => it.entry.builtin || it.entry === state.current || state.files.includes(it.entry);
    const now = svCur();
    if (!sv.hist.every(keep)) {
      sv.hist = sv.hist.filter(keep);
      if (!keep(now)) { svClose(); return; }
      sv.pos = sv.hist.indexOf(now);
    }
    if (svOpenNow()) svHead(); // 이름을 바꿨을 때도
  }
  // 다른 창에서 고치고 돌아왔을 때: 옆에 띄운 파일이 바뀌었으면 다시 그림
  window.addEventListener('focus', () => { const it = svCur(); if (svOpenNow() && it && it.entry !== state.current && !it.entry.builtin) svShow('', true, true); });
  $('#svResizer').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rz = e.currentTarget;
    rz.setPointerCapture(e.pointerId);
    rz.classList.add('drag');
    document.body.classList.add('resizing');
    const move = (ev) => {
      const box = el.workspace.getBoundingClientRect();
      const w = Math.max(260, Math.min(box.width - 320, box.right - ev.clientX));
      el.workspace.style.setProperty('--sv-w', Math.round(w) + 'px');
      store.set('mdv-sv-w', String(Math.round(w)));
      lineTops = null;
    };
    const up = () => {
      rz.classList.remove('drag');
      document.body.classList.remove('resizing');
      rz.removeEventListener('pointermove', move);
      rz.removeEventListener('pointerup', up);
      svLayout();
      drawAllDataLinks();
    };
    rz.addEventListener('pointermove', move);
    rz.addEventListener('pointerup', up);
  });
  $('#svResizer').addEventListener('dblclick', () => { el.workspace.style.removeProperty('--sv-w'); store.set('mdv-sv-w', ''); svLayout(); });
  if (+store.get('mdv-sv-w') >= 260) el.workspace.style.setProperty('--sv-w', +store.get('mdv-sv-w') + 'px');

  /* ---------- 문서에서 찾기 ---------- */
  const find = { hits: [], now: -1 };
  function clearFind() {
    el.doc.querySelectorAll('mark.find-hit').forEach((m) => {
      const p = m.parentNode;
      m.replaceWith(document.createTextNode(m.textContent));
      p.normalize();
    });
    find.hits = []; find.now = -1;
    $('#findCount').textContent = '';
  }
  function runFind(q) {
    clearFind();
    if (!q) return;
    const lower = q.toLowerCase();
    const walker = document.createTreeWalker(el.doc, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('.h-tools, .code-head, .katex, .mermaid, .dg, script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue, low = text.toLowerCase();
      let i = low.indexOf(lower);
      if (i < 0) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      while (i >= 0) {
        frag.append(text.slice(last, i));
        const m = document.createElement('mark');
        m.className = 'find-hit';
        m.textContent = text.slice(i, i + q.length);
        frag.append(m);
        find.hits.push(m);
        last = i + q.length;
        i = low.indexOf(lower, last);
      }
      frag.append(text.slice(last));
      node.replaceWith(frag);
    }
    if (find.hits.length) gotoHit(0); else $('#findCount').textContent = L('0개', '0');
  }
  function gotoHit(i) {
    if (!find.hits.length) return;
    find.hits[find.now]?.classList.remove('now');
    find.now = (i + find.hits.length) % find.hits.length;
    const m = find.hits[find.now];
    m.classList.add('now');
    unfoldTo(m.closest('.markdown-body > *') || m);
    const det = m.closest('details');
    if (det) det.open = true;
    const panel = m.closest('.mc-tab-panel[hidden]'); // 숨은 탭 안에서 찾았으면 그 탭을 엶
    if (panel) showTab(panel.closest('.mc-tabs'), panel.dataset.tab);
    revealInPreview(m);
    $('#findCount').textContent = `${find.now + 1}/${find.hits.length}`;
  }
  // 미리보기 안에서만 굴려 가운데에 보이게 함. scrollIntoView는 화면 전체까지 움직여서,
  // 휴대폰 자판이 떠 있으면 맨 윗줄과 찾기 막대가 위로 밀려 가려짐. 자판에 가린 아래쪽은 빼고 가운데를 잡음
  function revealInPreview(node) {
    const pv = el.preview;
    for (let a = node.parentElement; a && a !== pv; a = a.parentElement) { // 옆 · 아래로 굴러가는 표 · 코드 칸 안이면 그 칸부터
      const cs = getComputedStyle(a), ar = a.getBoundingClientRect(), nr = node.getBoundingClientRect();
      if (a.scrollWidth > a.clientWidth + 1 && /auto|scroll/.test(cs.overflowX) && (nr.left < ar.left || nr.right > ar.right)) a.scrollLeft += nr.left - ar.left - (a.clientWidth - nr.width) / 2;
      if (a.scrollHeight > a.clientHeight + 1 && /auto|scroll/.test(cs.overflowY) && (nr.top < ar.top || nr.bottom > ar.bottom)) a.scrollTop += nr.top - ar.top - (a.clientHeight - nr.height) / 2;
    }
    const pr = pv.getBoundingClientRect(), nr = node.getBoundingClientRect(), vv = window.visualViewport;
    const top = Math.max(pr.top, vv ? vv.offsetTop : 0);
    const bottom = Math.min(pr.bottom, vv ? vv.offsetTop + vv.height : innerHeight);
    pv.scrollTop += nr.top + nr.height / 2 - (top + Math.max(0, bottom - top) / 2);
  }
  /* ---------- ::: tabs — 같은 이름의 탭은 문서 전체에서 같이 바뀌고, 고른 탭을 기억 ---------- */
  const tabPref = () => store.json('mdv-tab-pref', []);
  function showTab(box, title) {
    if (!box) return false;
    const has = [...box.querySelectorAll(':scope > .mc-tab-bar > .mc-tab')].some((b) => b.dataset.tab === title);
    if (!has) return false;
    box.querySelectorAll(':scope > .mc-tab-bar > .mc-tab').forEach((b) => { b.classList.toggle('on', b.dataset.tab === title); b.setAttribute('aria-selected', String(b.dataset.tab === title)); });
    box.querySelectorAll(':scope > .mc-tab-panel').forEach((p) => { p.hidden = p.dataset.tab !== title; });
    if (el.doc.contains(box)) syncTocTabs();
    return true;
  }
  // 사이드바 목차의 탭 항목: 지금 켜진 탭을 표시
  function syncTocTabs() {
    el.toc.querySelectorAll('a.tab').forEach((a) => a.classList.toggle('on', !!a._panel && !a._panel.hidden));
  }
  // 숨은 탭 안에 있으면 그 탭(바깥 탭부터)을 열고, 접힌 제목 아래면 폄
  function revealNode(node) {
    const chain = [];
    for (let p = node.closest('.mc-tab-panel'); p; p = p.parentElement.closest('.mc-tab-panel')) chain.unshift(p);
    for (const p of chain) if (p.hidden) showTab(p.closest('.mc-tabs'), p.dataset.tab);
    let top = node;
    while (top.parentElement && top.parentElement !== el.doc) top = top.parentElement;
    if (top.parentElement === el.doc) unfoldTo(top);
  }
  function initTabs(root) {
    const pref = tabPref();
    root.querySelectorAll('.mc-tabs').forEach((box) => { for (const t of pref) if (showTab(box, t)) break; });
  }
  for (const [root, pane] of [[el.doc, el.preview], [el.sideDoc, el.sideScroll]]) root.addEventListener('click', (e) => {
    const b = e.target.closest('.mc-tab');
    if (!b) return;
    const title = b.dataset.tab, keep = pane.scrollTop, top = b.getBoundingClientRect().top;
    root.querySelectorAll('.mc-tabs').forEach((box) => showTab(box, title));
    store.set('mdv-tab-pref', JSON.stringify([title, ...tabPref().filter((x) => x !== title)].slice(0, 20)));
    pane.scrollTop = keep + (b.getBoundingClientRect().top - top); // 누른 탭이 화면에서 움직이지 않게
  });
  function openFind() {
    if (!state.current) return;
    closeMenus();
    $('#findBar').hidden = false;
    const inp = $('#findInput');
    const sel = String(getSelection()).trim();
    if (sel && sel.length < 80 && !sel.includes('\n')) inp.value = sel;
    inp.focus();
    inp.select();
    if (inp.value) runFind(inp.value);
  }
  function closeFind() { $('#findBar').hidden = true; clearFind(); }
  let findTimer;
  $('#findInput').addEventListener('input', (e) => { clearTimeout(findTimer); findTimer = setTimeout(() => runFind(e.target.value.trim()), 200); });
  $('#findInput').addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!find.hits.length) runFind(e.target.value.trim());
      else gotoHit(find.now + (e.shiftKey ? -1 : 1));
    } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFind(); }
  });
  $('#findNext').onclick = () => gotoHit(find.now + 1);
  $('#findPrev').onclick = () => gotoHit(find.now - 1);
  $('#findClose').onclick = closeFind;

  function scrollToId(id) {
    const t = document.getElementById(id) || document.getElementById(slugify(id));
    if (!t) return;
    unfoldTo(t);
    t.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  /* =========================================================
     제목 접기
     ========================================================= */
  const headingLevel = (n) => (/^H[1-6]$/.test(n.tagName) ? +n.tagName[1] : 0);
  function currentFolds() {
    const p = state.current?.path;
    return new Set((p && state.folds[p]) || []);
  }
  function saveFolds(set) {
    const p = state.current.path;
    if (set.size) state.folds[p] = [...set]; else delete state.folds[p];
    store.set('mdv-folds', JSON.stringify(state.folds));
  }
  function applyFolds() {
    const folded = currentFolds();
    let hideLevel = 0;
    for (const n of el.doc.children) {
      const lvl = headingLevel(n);
      if (lvl && hideLevel && lvl <= hideLevel) hideLevel = 0;
      const exempt = n.classList.contains('footnotes') || n.classList.contains('footnotes-sep');
      n.classList.toggle('fold-hidden', !!hideLevel && !exempt);
      if (lvl) {
        const f = folded.has(n.id);
        n.classList.toggle('folded', f);
        if (f && !hideLevel) hideLevel = lvl;
      }
    }
    el.toc.querySelectorAll('a').forEach((a) => {
      const h = document.getElementById(a.dataset.id);
      a.style.opacity = h && h.classList.contains('fold-hidden') ? '.5' : '';
    });
    lineTops = null;
  }
  function toggleFold(id) {
    const s = currentFolds();
    if (s.has(id)) s.delete(id); else s.add(id);
    saveFolds(s);
    applyFolds();
  }
  function unfoldTo(target) {
    if (!target.classList.contains('fold-hidden')) return;
    const s = currentFolds();
    let n = target, minLevel = headingLevel(target) || 7;
    while ((n = n.previousElementSibling)) {
      const lvl = headingLevel(n);
      if (lvl && lvl < minLevel) { s.delete(n.id); minLevel = lvl; }
    }
    saveFolds(s);
    applyFolds();
  }
  function foldAllToggle() {
    const heads = [...el.doc.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    if (!heads.length) return;
    const s = currentFolds();
    if (s.size) s.clear();
    else {
      const top = Math.min(...heads.map(headingLevel));
      const levels = heads.map(headingLevel).filter((l) => l > top);
      const foldLevel = levels.length ? Math.min(...levels) : top;
      heads.filter((h) => headingLevel(h) === foldLevel).forEach((h) => s.add(h.id));
    }
    saveFolds(s);
    applyFolds();
  }

  /* ---------- 제목 번호 (보기 설정, 원본 글은 그대로) ---------- */
  // 맨 위 제목(#)이 하나뿐이면 문서 제목으로 보고 ## 부터 1 · 1.1 · 1.1.1
  const titleOnly = (heads) => heads.filter((h) => h.tagName === 'H1').length === 1;
  // 이미 번호가 있는 제목: 1. · 1.2 · 1-1. · 1) · 1️⃣ · 🔟 · ① · 제1장
  function ownNumber(text) {
    let m = text.match(/^\s*(\d+(?:[.-]\d+)*)[.)]?(?=\s|$)/);
    if (m) return m[1].split(/[.-]/).map(Number);
    if ((m = text.match(/^\s*([0-9])️?⃣/))) return [+m[1]];
    if (/^\s*\u{1f51f}/u.test(text)) return [10];
    if ((m = text.match(/^\s*([①-⑳])/))) return [m[1].charCodeAt(0) - 0x245f];
    if ((m = text.match(/^\s*(?:제\s*)?(\d+)\s*(?:장|절|부|편)(?=[\s.:]|$)/))) return [+m[1]];
    return null;
  }
  function numberHeadings(heads) {
    if (!heads.length) return;
    const base = titleOnly(heads) ? 2 : Math.min(...heads.map(headingLevel));
    const cnt = [];
    for (const h of heads) {
      const d = headingLevel(h) - base;
      if (d < 0) continue;
      const own = ownNumber(h.dataset.title || '');
      if (own) { // 그 번호에 맞춰 이어 셈 (2️⃣ 아래 제목은 2.1, 2.2 …)
        own.forEach((n, k) => { const at = d - (own.length - 1) + k; if (at >= 0) cnt[at] = n; });
        cnt.length = d + 1;
        continue;
      }
      for (let k = 0; k < d; k++) cnt[k] = cnt[k] || 0;
      cnt[d] = (cnt[d] || 0) + 1;
      cnt.length = d + 1;
      const num = cnt.join('.') + (d ? '' : '.');
      h.dataset.num = num;
      const sp = document.createElement('span');
      sp.className = 'h-num';
      sp.textContent = num;
      h.prepend(sp);
    }
  }
  const headLabel = (h) => (h.dataset.num ? h.dataset.num + ' ' : '') + h.dataset.title;

  /* ---------- 문서 안 목차 [[_TOC_]] ---------- */
  function fillInlineToc(all, doc = el.doc) {
    const navs = doc.querySelectorAll('nav.toc-inline');
    if (!navs.length) return;
    // 사이드바 목차처럼 # ~ ###, 맨 위 제목이 하나뿐이면 그 제목은 빼고 ## ~ ####
    const one = titleOnly(all);
    const heads = all.filter((h) => (one ? /^H[234]$/ : /^H[123]$/).test(h.tagName));
    for (const nav of navs) {
      nav.innerHTML = '';
      const title = document.createElement('div');
      title.className = 'toc-inline-title';
      title.textContent = L('목차', 'Contents');
      nav.append(title);
      if (!heads.length) {
        const p = document.createElement('p');
        p.className = 'toc-inline-empty';
        p.textContent = L('목차에 넣을 제목(#)이 없습니다.', 'No headings (#) to list yet.');
        nav.append(p);
        continue;
      }
      const root = document.createElement('ul');
      const stack = [{ lvl: Math.min(...heads.map(headingLevel)), ul: root }];
      for (const h of heads) {
        const lvl = headingLevel(h);
        while (stack.length > 1 && lvl < stack[stack.length - 1].lvl) stack.pop();
        let top = stack[stack.length - 1];
        if (lvl > top.lvl) {
          const holder = top.ul.lastElementChild || top.ul.appendChild(document.createElement('li'));
          const ul = document.createElement('ul');
          holder.append(ul);
          stack.push((top = { lvl, ul }));
        }
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = headLabel(h);
        li.append(a);
        top.ul.append(li);
      }
      nav.append(root);
    }
  }

  /* =========================================================
     목차 + 현재 위치 표시
     ========================================================= */
  let observer;
  // 목차 항목: 제목(h1~h3)과 탭 상자의 탭을 문서 순서대로. 탭은 바로 앞 항목의 한 단계 아래, 탭 안의 제목은 그 탭의 한 단계 아래
  //  → [{ n: 제목 또는 탭 내용, isTab, box: 그 탭 상자(탭 밖의 제목이면 null), lvl: 1~6 }]
  function tocItems(root) {
    const nodes = [...root.querySelectorAll('h1,h2,h3,.mc-tab-panel')].filter((n) => !n.closest('.md-example'));
    const minLevel = Math.min(...nodes.map(headingLevel).filter(Boolean));
    const boxLevel = new Map();
    let last = 0;
    return nodes.map((n) => {
      const isTab = !headingLevel(n), panel = isTab ? n : n.closest('.mc-tab-panel'), box = panel && panel.closest('.mc-tabs');
      if (isTab && !boxLevel.has(box)) boxLevel.set(box, Math.min(last + 1, 6));
      const lvl = isTab ? boxLevel.get(box) : box ? Math.min(boxLevel.get(box) + 1, 6) : headingLevel(n) - minLevel + 1;
      last = lvl;
      return { n, isTab, box, lvl };
    });
  }
  function buildToc() {
    const items = tocItems(el.doc), nodes = items.map((x) => x.n);
    const heads = nodes.filter((n) => headingLevel(n));
    el.toc.innerHTML = '';
    el.tocSection.hidden = nodes.length < 2;
    const links = new Map();
    items.forEach(({ n, isTab, box, lvl }) => {
      const a = document.createElement('a');
      if (isTab) {
        a.href = '#';
        a.textContent = n.dataset.tab;
        a.title = L('탭: ', 'Tab: ') + n.dataset.tab;
        a._panel = n;
        a.onclick = (e) => {
          e.preventDefault();
          const title = n.dataset.tab;
          revealNode(box);
          el.doc.querySelectorAll('.mc-tabs').forEach((b) => showTab(b, title)); // 문서에서 탭을 누를 때와 같이: 같은 이름의 탭은 함께 바뀌고 고른 탭을 기억
          store.set('mdv-tab-pref', JSON.stringify([title, ...tabPref().filter((x) => x !== title)].slice(0, 20)));
          box.scrollIntoView({ block: 'start', behavior: 'smooth' });
          closeSidebar();
        };
      } else {
        a.href = '#' + n.id;
        a.dataset.id = n.id;
        a.textContent = headLabel(n);
        a.onclick = (e) => { e.preventDefault(); revealNode(n); scrollToId(n.id); closeSidebar(); };
        links.set(n, a);
      }
      a.className = 'l' + lvl + (isTab ? ' tab' : '');
      el.toc.append(a);
    });
    syncTocTabs();
    if (observer) observer.disconnect();
    updateSidebar();
    if (!heads.length) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          el.toc.querySelectorAll('a.active').forEach((x) => x.classList.remove('active'));
          const a = links.get(en.target);
          if (a) { a.classList.add('active'); a.scrollIntoView({ block: 'nearest' }); }
        }
      });
    }, { root: el.preview, rootMargin: '0px 0px -75% 0px' });
    heads.forEach((h) => observer.observe(h));
  }

  function updateSidebar() {
    $('#tocEmpty').hidden = !el.tocSection.hidden;
  }

  const LOC_ICO = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
    fileNew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M12 18v-6M9 15h6"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  };
  // 이 문서가 어디에 있는 파일인지 (열린 방식에 따라 알 수 있는 만큼)
  function describeLocation(e) {
    if (!e) return {};
    const dirOf = (p) => p.replace(/[\\/][^\\/]*$/, '');
    if (e.builtin) return { icon: 'book', short: L('markcont 안내 문서', 'markcont built-in document'), note: L('앱에 들어 있는 문서입니다. 고친 내용은 새 파일로 저장됩니다.', 'This document comes with the app. Your edits are saved as a new file.') };
    if (e.isNew) return { icon: 'fileNew', short: L('아직 저장하지 않은 새 문서', 'New document, not saved yet'), note: L('저장하면 위치를 정할 수 있습니다.', 'You can choose where to put it when you save.') };
    if (e.tauriPath) return { icon: 'folder', short: dirOf(e.tauriPath), full: e.tauriPath, reveal: true };
    if (!e.loose) {
      const r = rootOf(e.path);
      return { icon: 'folder', short: e.path, full: e.path, note: r && r.kind === 'handle' ? L(`'${r.name}' 폴더 안의 파일입니다. 그 폴더가 컴퓨터의 어디에 있는지는 브라우저가 알려주지 않습니다.`, `A file in the '${r.name}' folder. The browser doesn't tell where that folder is on your computer.`) : '' };
    }
    if (e.handle) return { icon: 'file', short: e.name, note: L('Chrome · Edge는 보안 때문에 파일의 전체 위치를 알려주지 않습니다. 그 파일이 든 폴더를 "폴더 열기"로 열면 트리에서 위치를 볼 수 있고, PC 프로그램에서는 전체 경로가 보입니다.', 'For security, Chrome and Edge don\'t reveal a file\'s full location. Open its folder with "Open folder" to see where it sits in the tree; the PC app shows the full path.') };
    if (e.fromRecent) return { icon: 'clock', short: L('최근 문서 기록', 'Recent document copy'), note: L('마지막으로 열었을 때 기록해 둔 내용입니다. 원래 파일과 연결되어 있지 않아서, 저장하면 새 파일로 저장됩니다.', 'The content saved when you last opened it. It isn\'t linked to the original file, so saving creates a new file.') };
    if (e.file) return { icon: 'file', short: e.name + L(' (복사본)', ' (copy)'), note: L('원래 파일 위치를 알 수 없는 방식으로 열렸습니다. 저장하면 새 파일로 저장됩니다. "파일 열기" 단추로 다시 열면 원래 파일에 저장할 수 있습니다.', 'Opened in a way that hides the original location, so saving creates a new file. Reopen it with "Open file" to save to the original.') };
    return { icon: 'file', short: e.path };
  }
  function fmtModified(t) {
    if (!t) return '';
    const d = new Date(t), now = new Date();
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (d.toDateString() === now.toDateString()) return L(`오늘 ${hm}`, `Today ${hm}`);
    if (LANG === 'en') return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }) + ' ' + hm;
    return `${d.getFullYear() !== now.getFullYear() ? d.getFullYear() + '년 ' : ''}${d.getMonth() + 1}월 ${d.getDate()}일 ${hm}`;
  }
  // 읽는 시간: 한국어 · 중국어 · 일본어는 분당 500자, 영어 등은 분당 230낱말로 따로 세어 더함 (코드 블록 · 주소 · 그림 데이터는 뺌)
  const CJK_CH = /[ㄱ-ㆎ가-힣぀-ヿ㐀-鿿豈-﫿]/g;
  function readMinutes(src) {
    const text = stripNotes(splitFrontMatter(src).body)
      .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*$/gm, ' ')
      .replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g, ' ').replace(/\b(?:https?|ftp):\/\/\S+/g, ' ');
    const cjk = (text.match(CJK_CH) || []).length;
    const words = (text.replace(CJK_CH, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
    return Math.max(1, Math.round(cjk / 500 + words / 230));
  }
  function updateMeta(src) {
    if (side.tab === 'links') lkSchedule();
    const chars = src.replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g, '').replace(/\s/g, '').length;
    const minutes = readMinutes(src);
    const cur = state.current, loc = describeLocation(cur);
    el.docMeta.innerHTML = '';
    const line = document.createElement('div');
    line.className = 'meta-loc';
    line.innerHTML = `<span class="loc-icon">${LOC_ICO[loc.icon] || LOC_ICO.file}</span><span class="loc-text"></span>`;
    line.querySelector('.loc-text').textContent = loc.short || cur.path;
    line.title = loc.full || loc.short || cur.path;
    const cp = loc.full ? copyPathOf(cur.path, cur) : null;
    if (cp) {
      const b = document.createElement('button');
      b.className = 'meta-btn'; b.type = 'button'; b.textContent = copyPathLabel(cp);
      b.onclick = () => copyPath(cp);
      line.append(b);
    }
    if (loc.reveal && window.__TAURI__) {
      const b = document.createElement('button');
      b.className = 'meta-btn'; b.type = 'button'; b.textContent = L('폴더에서 보기', 'Show in folder');
      b.onclick = () => window.__TAURI__.core.invoke('reveal_in_folder', { path: cur.tauriPath }).catch((e) => toast(L('폴더를 열지 못했습니다: ', "Couldn't open the folder: ") + e));
      line.append(b);
    }
    el.docMeta.append(line);
    const facts = document.createElement('div');
    facts.className = 'meta-facts';
    for (const t of [cur.lastModified ? L('마지막 수정 ', 'Modified ') + fmtModified(cur.lastModified) : '', L(`${chars.toLocaleString()}자`, `${chars.toLocaleString()} chars`), L(`약 ${minutes}분 분량`, `~${minutes} min read`)].filter(Boolean)) {
      const sp = document.createElement('span');
      sp.textContent = t;
      facts.append(sp);
    }
    el.docMeta.append(facts);
    // 교정 표기가 있으면 「✎ 제안 N개 · 모두 받아들이기 · 모두 버리기」
    paintCriticBar(src);
    // 문서 점검 (깨진 링크 · 다른 뷰어에서 다르게 보이는 곳 …): 지난 결과를 바로 보이고, 잠시 뒤 다시 셈
    if (chk.for !== cur) chk.res = null;
    paintCheckBadge();
    scheduleCheck(chk.res ? 600 : 0);
    if (loc.note) {
      const n = document.createElement('div');
      n.className = 'meta-note';
      n.textContent = 'ⓘ ' + loc.note;
      el.docMeta.append(n);
    }
  }

  function updateTitle() {
    el.docTitle.textContent = '';
    if (!state.current) { document.title = 'markcont'; return; } // 보던 문서를 닫거나 빼서 처음 화면으로
    el.docTitle.textContent = state.current.path;
    { const l = describeLocation(state.current); el.docTitle.title = l.full || [l.short, l.note].filter(Boolean).join('\n'); }
    if (state.dirty) {
      const d = document.createElement('span');
      d.className = 'dirty';
      d.textContent = L(' • 저장 안 됨', ' • Unsaved');
      el.docTitle.append(d);
    }
    document.title = (state.dirty ? '• ' : '') + state.current.name + ' — markcont';
    $('#saveGroup').hidden = !(state.editing || state.dirty);
    if (state.editing) requestAnimationFrame(updateCursor);
  }
  function markDirty() {
    const was = state.dirty;
    state.dirty = source() !== state.current.text;
    if (was !== state.dirty) updateTitle();
  }

  /* =========================================================
     파일 목록, 열기, 이전/다음
     ========================================================= */
  /* =========================================================
     글자 맞추기: 빠른 열기 · 사이드바 파일 찾기
     - 유니코드 형태(NFC) · 대소문자 · 라틴 악센트 · 전각/반각 · 히라가나=가타카나를 맞춰서 비교
     - 한글 초성(ㄱㅎㅅ → 기획서), 치는 중인 마지막 글자(깋 → 기획서)도 받음
     ========================================================= */
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅗㅏ', 'ㅗㅐ', 'ㅗㅣ', 'ㅛ', 'ㅜ', 'ㅜㅓ', 'ㅜㅔ', 'ㅜㅣ', 'ㅠ', 'ㅡ', 'ㅡㅣ', 'ㅣ'];
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄱㅅ', 'ㄴ', 'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄹ', 'ㄹㄱ', 'ㄹㅁ', 'ㄹㅂ', 'ㄹㅅ', 'ㄹㅌ', 'ㄹㅍ', 'ㄹㅎ', 'ㅁ', 'ㅂ', 'ㅂㅅ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const JAMO_KEYS = { 'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ', 'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ' };
  const isSyllable = (c) => c >= 0xac00 && c <= 0xd7a3;
  const choOf = (ch) => { const c = ch.codePointAt(0); return isSyllable(c) ? CHO[Math.floor((c - 0xac00) / 588)] : ch; };
  // 자판으로 친 순서: 획 → ㅎㅗㅣㄱ
  function hangulKeys(ch) {
    const c = ch.codePointAt(0);
    if (!isSyllable(c)) return JAMO_KEYS[ch] || ch;
    const s = c - 0xac00;
    return CHO[Math.floor(s / 588)] + JUNG[Math.floor((s % 588) / 28)] + JONG[s % 28];
  }
  function foldChar(ch) {
    const c0 = ch.codePointAt(0);
    if (c0 >= 0x3130 && c0 <= 0x318f) return ch; // 한글 자모(ㄱ~ㅎ): NFKC 를 하면 다른 글자(U+1100…)가 되어 초성 찾기가 깨짐
    let c = ch.normalize('NFKC'); // 전각 · 반각 (ＡＢＣ → ABC, ｶ → カ)
    if ([...c].length !== 1) c = ch;
    const lower = c.toLowerCase();
    if ([...lower].length === 1) c = lower;
    const base = String.fromCodePoint(c.normalize('NFD').codePointAt(0));
    if (base !== c && /\p{Script=Latin}/u.test(base)) c = base; // é → e (라틴 글자만: 가나의 탁점 が 는 그대로)
    const k = c.codePointAt(0);
    if (k >= 0x30a1 && k <= 0x30f6) c = String.fromCodePoint(k - 0x60); // カタカナ → ひらがな
    return c;
  }
  // 글자마다 [원래 글자, 맞춘 글자] (맥에서 만든 이름처럼 자모가 쪼개진 글은 먼저 합침)
  const prepText = (s) => [...String(s).normalize('NFC')].map((ch) => ({ ch, f: foldChar(ch) }));
  const HANGUL_CHAR = /[ㄱ-ㆎ가-힣]/;
  // 검색어 한 글자가 대상 i 번째부터 맞으면 쓴 글자 수 (안 맞으면 0)
  function unitAt(qu, t, i, last) {
    if (t[i].f === qu.f) return 1;
    if (CHO.includes(qu.ch) && choOf(t[i].ch) === qu.ch) return 1;
    if (last && HANGUL_CHAR.test(qu.ch)) { // 치는 중인 마지막 글자: 회 → 획, 깋 → 기획
      const k = hangulKeys(qu.ch);
      let acc = '';
      for (let j = i; j < t.length && j < i + 2; j++) {
        acc += hangulKeys(t[j].ch);
        if (acc.startsWith(k)) return j - i + 1;
        if (!k.startsWith(acc)) break;
      }
    }
    return 0;
  }
  const WORD_SEP = /[\s\-_./\\()[\]{}·,+]/;
  const wordStart = (t, i) => i === 0 || WORD_SEP.test(t[i - 1].ch) || (/\p{Ll}/u.test(t[i - 1].ch) && /\p{Lu}/u.test(t[i].ch));
  // 이어진 곳을 먼저, 없으면(contiguous 가 아니면) 띄엄띄엄(fp → feature-proposals) → { score, at } 또는 null
  function textMatch(q, t, contiguous) {
    const m = q.length, n = t.length;
    if (!m) return { score: 0, at: [] };
    for (let s = 0; s < n; s++) {
      const at = [];
      let i = s, j = 0;
      for (; j < m && i < n; j++) {
        const used = unitAt(q[j], t, i, j === m - 1);
        if (!used) break;
        for (let k = 0; k < used; k++) at.push(i + k);
        i += used;
      }
      if (j === m) return { score: 1000 + (s === 0 ? 150 : wordStart(t, s) ? 70 : 0) + (s === 0 && i === n ? 200 : 0) - s * 2 - n * 0.3, at };
    }
    if (contiguous) return null;
    const spread = (wordFirst) => {
      const at = [];
      let i = 0, bonus = 0;
      for (let j = 0; j < m; j++) {
        let found = -1, used = 0;
        for (let k = i; k < n && found < 0; k++) if ((!wordFirst || wordStart(t, k)) && (used = unitAt(q[j], t, k, j === m - 1))) found = k;
        if (found < 0 && wordFirst) for (let k = i; k < n && found < 0; k++) if ((used = unitAt(q[j], t, k, j === m - 1))) found = k;
        if (found < 0) return null;
        if (wordStart(t, found)) bonus += 30;
        for (let k = 0; k < used; k++) at.push(found + k);
        i = found + used;
      }
      return { score: 500 + bonus - (at[at.length - 1] - at[0] - at.length) * 3 - at[0] * 2 - n * 0.3, at };
    };
    return spread(true) || spread(false);
  }
  const prepCache = new Map();
  const prepName = (s) => { let p = prepCache.get(s); if (!p) { p = prepText(s); if (prepCache.size > 5000) prepCache.clear(); prepCache.set(s, p); } return p; };
  // 맞은 글자를 <mark> 로
  function markText(t, at) {
    const on = new Set(at);
    let out = '', open = false;
    t.forEach((c, i) => {
      if (on.has(i) !== open) { out += open ? '</mark>' : '<mark>'; open = !open; }
      out += escapeHtml(c.ch);
    });
    return out + (open ? '</mark>' : '');
  }

  /* =========================================================
     사이드바: 파일 · 목차 탭, 폴더 트리
     ========================================================= */
  const ICON = {
    chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    dir: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    md: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M6.5 15V9l2.5 3 2.5-3v6M15.5 9v6m0 0-2-2m2 2 2-2"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  };
  const side = {
    tab: store.get('mdv-side-tab') || 'files',
    filter: '', q: [],
    collapsed: new Set(),
    showHidden: false, // 숨긴 항목도 흐리게 보이기 (이번에만)
  };
  const parentOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
  const joinRel = (dir, name) => (dir ? dir + '/' + name : name);
  const collapseKey = () => 'mdv-collapsed:workspace';
  function loadCollapsed() { side.collapsed = new Set(store.json(collapseKey(), [])); }
  function saveCollapsed() { store.set(collapseKey(), JSON.stringify([...side.collapsed])); }
  // 사이드바에서 숨긴 파일 · 폴더: 파일은 그대로 두고 트리에서만 뺌 (빠른 열기 · 찾기 · 링크는 그대로)
  // 폴더마다 기억 (PC 프로그램은 폴더의 전체 경로, 브라우저는 폴더 이름) → 그 폴더 안의 경로 목록
  const HIDE_KEY = 'mdv-hidden';
  let hiddenMap = null;
  const hideId = (r) => (r.kind === 'tauri' ? 'path:' + r.path.replace(/[\\/]+$/, '') : 'name:' + r.name);
  function hiddenSet(r) {
    hiddenMap ??= new Map(Object.entries(store.json(HIDE_KEY, {}) || {}).map(([k, v]) => [k, new Set(Array.isArray(v) ? v : [])]));
    const id = hideId(r);
    if (!hiddenMap.has(id)) hiddenMap.set(id, new Set());
    return hiddenMap.get(id);
  }
  function saveHidden() {
    const o = {};
    for (const [k, s] of hiddenMap || []) if (s.size) o[k] = [...s];
    store.set(HIDE_KEY, JSON.stringify(o));
  }
  // path 가 숨긴 항목이거나 숨긴 폴더 안에 있으면 그 숨긴 항목의 폴더 안 경로, 아니면 ''
  function hiddenBy(path) {
    const r = rootOf(path);
    if (!r || path === r.key) return '';
    const s = hiddenSet(r);
    if (!s.size) return '';
    for (let p = path.slice(r.key.length + 1); p; p = parentOf(p)) if (s.has(p)) return p;
    return '';
  }
  function setHidden(path, on) {
    const r = rootOf(path);
    if (!r || path === r.key) return;
    const s = hiddenSet(r), rel = path.slice(r.key.length + 1);
    if (on) s.add(rel); else s.delete(rel);
    saveHidden();
  }
  // 이름을 바꾸거나(to) 지운(to 없음) 항목의 숨김 기록을 따라 옮김
  function moveHidden(r, from, to) {
    const s = hiddenSet(r), a = from.slice(r.key.length + 1), b = to ? to.slice(r.key.length + 1) : null;
    let changed = false;
    for (const h of [...s]) if (h === a || h.startsWith(a + '/')) { s.delete(h); if (b != null) s.add(b + h.slice(a.length)); changed = true; }
    if (changed) saveHidden();
  }
  function hideInSidebar(path) {
    setHidden(path, true);
    renderFileList();
    const name = baseName(path);
    toast(L(`사이드바에서 숨겼습니다: ${name} (파일은 그대로). 다시 보려면 맨 위 폴더의 ⋯ → 숨긴 항목 보기`, `Hidden from the sidebar: ${name} (the file stays). To see it again: top folder ⋯ → Show hidden items`), 6000,
      { label: L('되돌리기', 'Undo'), onClick: () => { setHidden(path, false); renderFileList(); } });
  }
  // 따로 연 파일은 이번에만 숨김 (기억하지 않음). 그 파일을 다시 열면 새 항목으로 바뀌어 다시 보임
  function hideLooseInSidebar(entry) {
    entry.sideHidden = true;
    renderFileList();
    toast(L(`사이드바에서 숨겼습니다: ${entry.name} (파일은 그대로). 목록의 「숨긴 파일 보기」나 다시 열기로 다시 볼 수 있습니다`, `Hidden from the sidebar: ${entry.name} (the file stays). Use "Show hidden files" in the list, or open it again, to see it`), 6000,
      { label: L('되돌리기', 'Undo'), onClick: () => { entry.sideHidden = false; renderFileList(); } });
  }
  // 따로 연 파일을 markcont 목록에서 빼기 (파일은 그대로). 숨기기와 달리 빠른 열기 · 찾기에서도 빠지고, 다시 열면 다시 들어옴
  async function removeLooseFromList(entry) {
    const at = state.files.indexOf(entry);
    if (at < 0) return;
    const wasCurrent = state.current === entry;
    if (wasCurrent && state.dirty && !confirm(L('저장하지 않은 변경 사항이 있습니다. 버리고 목록에서 뺄까요?', 'You have unsaved changes. Discard them and remove the file from the list?'))) return;
    if (wasCurrent) saveReadPos();
    state.files.splice(at, 1);
    gs.cache.delete(entry);
    // 뒤로 · 앞으로 기록에서도 빼고 (같은 파일을 다시 열기 전의 옛 항목까지), 보던 문서였으면 그 앞에 보던 문서로
    const keep = (e) => e !== entry && (e === state.current || state.files.includes(e));
    const before = state.hist.slice(0, state.histPos + 1).filter((e) => !keep(e)).length;
    state.hist = state.hist.filter(keep);
    state.histPos = Math.min(state.hist.length - 1, state.histPos - before);
    updateNav();
    if (wasCurrent) {
      state.dirty = false;
      const prev = state.hist[state.histPos];
      const next = prev || state.files.find((f) => !f.builtin && (f.loose ? !f.sideHidden : !hiddenBy(f.path)));
      if (next) await openEntry(next, { fromHistory: !!prev }); else { state.current = null; showHome(); updateTitle(); }
    }
    renderFileList();
    toast(L(`목록에서 뺐습니다: ${entry.name} (파일은 그대로). 다시 보려면 그 파일을 다시 여세요`, `Removed from the list: ${entry.name} (the file stays). Open the file again to bring it back`), 6000,
      { label: L('되돌리기', 'Undo'), onClick: () => {
        if (state.files.some((f) => f.loose && f.path === entry.path)) return; // 그사이 같은 파일을 다시 열었음
        state.files.push(entry);
        state.files.sort((a, b) => a.path.localeCompare(b.path, 'ko', { numeric: true }));
        if (wasCurrent) openEntry(entry); else renderFileList();
      } });
  }
  // 숨긴 항목 수: 열어 둔 폴더들 + 따로 연 파일
  const hiddenTotal = () => state.roots.reduce((n, r) => n + hiddenSet(r).size, 0) + state.files.filter((f) => f.loose && f.sideHidden).length;

  function setSideTab(tab) {
    side.tab = tab;
    store.set('mdv-side-tab', tab);
    document.querySelectorAll('.side-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    el.filesSection.hidden = tab !== 'files';
    $('#tocPanel').hidden = tab !== 'toc';
    $('#searchPanel').hidden = tab !== 'search';
    $('#linksPanel').hidden = tab !== 'links';
    if (tab === 'search') gsShown();
    if (tab === 'links') lkSchedule(0);
  }
  document.querySelectorAll('.side-tabs button').forEach((b) => (b.onclick = () => { setSideTab(b.dataset.tab); if (b.dataset.tab === 'search') $('#gsInput').focus(); }));

  /* =========================================================
     폴더 전체에서 찾기 (사이드바 「찾기」 탭, Ctrl+Shift+F)
     - 열어 둔 폴더 · 따로 연 문서를 차례로 읽어 줄 단위로 찾음 (지금 문서는 편집 중인 내용으로)
     - 빠른 열기처럼 NFC · 대소문자 · 라틴 악센트 · 전각/반각 · 히라가나=가타카나를 맞춰 비교,
       한글 자음(ㄱ~ㅎ)은 그 자음으로 시작하는 글자와도 맞음 (ㄱㅎ → 기획)
     - 옵션: 대소문자 구분 · 단어 단위(한글도 되게 \b 대신 앞뒤 글자를 봄) · 정규식
     ========================================================= */
  const GS_TOTAL = 3000, GS_PER_FILE = 200;
  const gs = { seq: 0, timer: 0, cache: new Map(), closed: new Set(), shown: [], opts: { case: false, word: false, regex: false }, ranFor: '' };
  try { Object.assign(gs.opts, JSON.parse(store.get('mdv-gs-opts') || '{}')); } catch {}
  const foldMemo = new Map();
  // foldChar 를 빠르게: 영문 · 한글 음절은 바로, 나머지는 기억해 둠 (글자 하나 → 글자 하나)
  function foldFast(ch) {
    const c = ch.charCodeAt(0);
    if (c < 0x80) return c >= 65 && c <= 90 ? String.fromCharCode(c + 32) : ch;
    if (c >= 0xac00 && c <= 0xd7a3) return ch;
    let f = foldMemo.get(ch);
    if (f === undefined) { f = foldChar(ch); if (foldMemo.size > 20000) foldMemo.clear(); foldMemo.set(ch, f); }
    return f;
  }
  const foldStr = (s) => { let o = ''; for (const ch of s) o += foldFast(ch); return o; };
  const GS_WORD = /[\p{L}\p{N}_]/u;
  // 찾는 말 → { quick: 파일을 먼저 걸러 볼 글자(없으면 null), find(line, fline) → [[시작, 끝], …] (UTF-16) } 또는 { error }
  function gsCompile(q, o) {
    if (o.regex) {
      let re;
      try { re = new RegExp(o.word ? `(?<![\\p{L}\\p{N}_])(?:${q})(?![\\p{L}\\p{N}_])` : q, 'gu' + (o.case ? '' : 'i')); }
      catch (e) { return { error: String(e.message).replace(/^Invalid regular expression: \/.*\/[a-z]*: /, '') }; }
      return {
        quick: null,
        find(line) {
          const out = [];
          re.lastIndex = 0;
          let m;
          while (out.length < 50 && (m = re.exec(line))) {
            if (!m[0].length) { re.lastIndex += 1; continue; }
            out.push([m.index, m.index + m[0].length]);
          }
          return out;
        },
      };
    }
    const qs = [...q.normalize('NFC')];
    const qf = o.case ? qs : qs.map(foldFast);
    const cho = qs.map((ch) => CHO.includes(ch));
    const m = qf.length;
    return {
      quick: cho.some(Boolean) ? null : qf.join(''),
      find(line, fline) {
        const chars = [...line], fl = fline === line ? chars : [...fline], n = chars.length, out = [];
        let u16 = null;
        for (let i = 0; i + m <= n && out.length < 50; i++) {
          let j = 0;
          for (; j < m; j++) {
            const t = fl[i + j];
            if (t !== qf[j] && !(cho[j] && choOf(t) === qs[j])) break;
          }
          if (j < m) continue;
          if (o.word && ((i > 0 && GS_WORD.test(chars[i - 1])) || (i + m < n && GS_WORD.test(chars[i + m])))) continue;
          if (!u16) { u16 = [0]; for (const ch of chars) u16.push(u16[u16.length - 1] + ch.length); }
          out.push([u16[i], u16[i + m]]);
          i += m - 1;
        }
        return out;
      },
    };
  }
  // 찾을 문서: 열어 둔 폴더의 문서(트리 순서) → 따로 연 문서 (앱 안내 문서는 빼고)
  function gsFiles() {
    const order = (f) => (f.loose ? state.roots.length : Math.max(0, state.roots.indexOf(rootOf(f.path))));
    return state.files.filter((f) => !f.builtin && MD_EXT.test(f.name))
      .sort((a, b) => order(a) - order(b) || a.path.localeCompare(b.path, undefined, { numeric: true }));
  }
  // 문서 내용 (바뀌지 않았으면 기억해 둔 것을 씀)
  async function gsRead(entry) {
    if (entry === state.current) return { text: source().normalize('NFC'), ftext: null };
    let c = gs.cache.get(entry);
    if (c && Date.now() - c.checked < 5000) return c;
    try {
      let stamp, file = null;
      if (entry.handle) { file = await entry.handle.getFile(); stamp = file.lastModified + ':' + file.size; }
      else if (entry.tauriPath && isTauri()) stamp = await tinvoke('file_modified', { path: entry.tauriPath });
      else if (entry.file) { file = entry.file; stamp = file.lastModified + ':' + file.size; }
      else if (entry.text != null) stamp = entry.text;
      else return null;
      if (!c || c.stamp !== stamp) {
        const text = file ? await readText(file) : entry.tauriPath && isTauri() ? (await tinvoke('read_file', { path: entry.tauriPath })).text : entry.text;
        c = { stamp, text: text.normalize('NFC'), ftext: null };
        gs.cache.set(entry, c);
      }
      c.checked = Date.now();
      return c;
    } catch { return null; }
  }
  function gsSearchText(c, M) {
    const o = gs.opts, fold = !o.regex && !o.case;
    if (M.quick != null) {
      const hay = fold ? (c.ftext ??= foldStr(c.text)) : c.text;
      if (!hay.includes(M.quick)) return [];
    }
    const lines = c.text.split(/\r?\n/), flines = fold ? (c.ftext ??= foldStr(c.text)).split(/\r?\n/) : lines;
    const out = [];
    for (let i = 0; i < lines.length && out.length < GS_PER_FILE; i++) {
      if (M.quick != null && !flines[i].includes(M.quick)) continue;
      const ranges = M.find(lines[i], flines[i]);
      if (ranges.length) out.push({ line: i + 1, text: lines[i], ranges });
    }
    return out;
  }
  // 줄에서 찾은 곳 앞뒤만 보여 줌
  function gsSnippet(h) {
    const t = h.text, lead = t.length - t.trimStart().length;
    let from = Math.max(lead, h.ranges[0][0] - 24);
    if (from > lead && /[\udc00-\udfff]/.test(t[from])) from--;
    const to = Math.min(t.length, h.ranges[0][0] + 200);
    let out = from > lead ? '…' : '', pos = from;
    for (const [a, b] of h.ranges) {
      if (a >= to) break;
      if (b <= pos) continue;
      out += escapeHtml(t.slice(pos, Math.max(pos, a))) + '<mark>' + escapeHtml(t.slice(Math.max(pos, a), Math.min(b, to))) + '</mark>';
      pos = Math.min(b, to);
    }
    return out + escapeHtml(t.slice(pos, to));
  }
  function gsHint() {
    if (!gsFiles().length) return L('폴더를 열면 그 안의 모든 문서에서 찾습니다.', 'Open a folder to search all the documents in it.');
    return L('열어 둔 폴더의 모든 문서에서 찾습니다. 한글 자음(ㄱㅎㅅ)은 초성으로도 찾습니다.', 'Searches every document in the open folders. Korean consonants (ㄱㅎㅅ) also match initial sounds.');
  }
  function gsPaint(results, { done, total, capped, final }) {
    const st = $('#gsStatus'), box = $('#gsResults');
    results.sort((a, b) => a.idx - b.idx);
    gs.shown = results;
    const n = results.reduce((s, r) => s + r.hits.length, 0);
    st.classList.remove('err');
    st.textContent = !final ? L(`찾는 중… ${done}/${total}`, `Searching… ${done}/${total}`)
      : !results.length ? L('찾은 곳이 없습니다.', 'No matches.')
      : L(`문서 ${results.length}개에서 ${n}줄`, `${n} line${n === 1 ? '' : 's'} in ${results.length} document${results.length === 1 ? '' : 's'}`) + (capped ? L(' (많아서 앞부분만 보여 줍니다)', ' (showing the first part)') : '');
    box.innerHTML = results.map((r, k) => {
      const e = r.entry, dir = e.loose ? L('따로 연 파일', 'Opened separately') : parentOf(e.path);
      return `<div class="gs-file${gs.closed.has(e.path) ? ' closed' : ''}"><button type="button" class="gs-head" data-k="${k}" title="${escapeHtml(e.path)}">${ICON.chev}${ICON.md}<span class="gs-name">${escapeHtml(e.name.replace(MD_EXT, ''))}</span><span class="gs-dir">${escapeHtml(dir)}</span><span class="gs-n">${r.hits.length}${r.hits.length >= GS_PER_FILE ? '+' : ''}</span></button>` +
        '<div class="gs-lines">' + r.hits.map((h, j) => `<button type="button" class="gs-line" data-k="${k}" data-j="${j}"><span class="gs-ln">${h.line}</span><span class="gs-tx">${gsSnippet(h)}</span></button>`).join('') +
        (r.hits.length >= GS_PER_FILE ? `<div class="gs-more">${L(`이 문서에서 ${GS_PER_FILE}줄까지만 보여 줍니다`, `Showing the first ${GS_PER_FILE} lines in this document`)}</div>` : '') + '</div></div>';
    }).join('');
  }
  async function gsRun() {
    const q = $('#gsInput').value, seq = ++gs.seq;
    gs.ranFor = q + '\n' + JSON.stringify(gs.opts);
    const st = $('#gsStatus'), box = $('#gsResults');
    if (!q.trim()) { box.innerHTML = ''; gs.shown = []; st.classList.remove('err'); st.textContent = gsHint(); return; }
    const M = gsCompile(gs.opts.regex ? q : q.trim() || q, gs.opts);
    if (M.error) { box.innerHTML = ''; gs.shown = []; st.textContent = L('정규식이 올바르지 않습니다: ', 'Invalid regular expression: ') + M.error; st.classList.add('err'); return; }
    const files = gsFiles(), results = [];
    if (!files.length) { box.innerHTML = ''; st.textContent = gsHint(); return; }
    let next = 0, done = 0, lines = 0, capped = false, painted = Date.now();
    const work = async () => {
      while (next < files.length && seq === gs.seq && !capped) {
        const idx = next++, c = await gsRead(files[idx]);
        done++;
        if (!c || seq !== gs.seq) continue;
        const hits = gsSearchText(c, M);
        if (hits.length) { results.push({ idx, entry: files[idx], hits }); lines += hits.length; if (lines >= GS_TOTAL) capped = true; }
        if (Date.now() - painted > 200) { painted = Date.now(); gsPaint(results.slice(), { done, total: files.length }); }
      }
    };
    await Promise.all(Array.from({ length: 6 }, work));
    if (seq === gs.seq) gsPaint(results, { done, total: files.length, capped, final: true });
  }
  function gsSchedule(ms = 250) { clearTimeout(gs.timer); gs.timer = setTimeout(gsRun, ms); }
  // 탭을 열 때: 찾는 말이 있으면 다시 찾음 (그사이 바뀐 문서 반영)
  function gsShown() {
    $('#searchPanel').querySelectorAll('.gs-opt').forEach((b) => b.setAttribute('aria-pressed', String(!!gs.opts[b.dataset.opt])));
    if ($('#gsInput').value) gsSchedule(0); else if (!gs.shown.length) $('#gsStatus').textContent = gsHint();
  }
  $('#gsInput').addEventListener('input', () => gsSchedule());
  $('#gsInput').addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') { e.preventDefault(); const first = $('#gsResults .gs-line'); if (first) first.click(); else gsSchedule(0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); $('#gsResults .gs-line')?.focus(); }
    else if (e.key === 'Escape' && e.target.value) { e.preventDefault(); e.stopPropagation(); e.target.value = ''; gsRun(); }
  });
  $('#searchPanel').querySelectorAll('.gs-opt').forEach((b) => (b.onclick = (e) => {
    e.preventDefault();
    gs.opts[b.dataset.opt] = !gs.opts[b.dataset.opt];
    b.setAttribute('aria-pressed', String(gs.opts[b.dataset.opt]));
    store.set('mdv-gs-opts', JSON.stringify(gs.opts));
    gsSchedule(0);
    $('#gsInput').focus();
  }));
  $('#gsResults').addEventListener('click', (e) => {
    const head = e.target.closest('.gs-head');
    if (head) {
      const r = gs.shown[+head.dataset.k], box = head.parentElement;
      box.classList.toggle('closed');
      if (box.classList.contains('closed')) gs.closed.add(r.entry.path); else gs.closed.delete(r.entry.path);
      return;
    }
    const ln = e.target.closest('.gs-line');
    if (!ln) return;
    $('#gsResults').querySelectorAll('.gs-line.on').forEach((x) => x.classList.remove('on'));
    ln.classList.add('on');
    const r = gs.shown[+ln.dataset.k];
    gsGo(r.entry, r.hits[+ln.dataset.j]);
  });
  // 결과 목록에서 ↑ ↓ 로 옮겨 다니기
  $('#gsResults').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const all = [...$('#gsResults').querySelectorAll('.gs-file:not(.closed) .gs-line, .gs-head')];
    const i = all.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    if (e.key === 'ArrowUp' && i === 0) { $('#gsInput').focus(); return; }
    all[Math.max(0, Math.min(all.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  });
  // 찾은 줄로 가기: 편집 중이면 원본에서 그 글자를 고르고, 아니면 미리보기에서 찾은 글자를 강조
  async function gsGo(entry, h) {
    if (state.current !== entry && !(await openEntry(entry))) return;
    if (window.innerWidth <= 900) closeSidebar();
    const q = $('#gsInput').value.trim();
    if (state.editing) {
      gotoSourceLine(h.line);
      const ta = el.editor, lines = ta.value.split('\n'), raw = (lines[h.line - 1] || '').replace(/\r$/, '');
      if (raw === h.text) {
        let pos = 0;
        for (let k = 0; k < h.line - 1; k++) pos += lines[k].length + 1;
        ta.setSelectionRange(pos + h.ranges[0][0], pos + h.ranges[0][1]);
      }
      return;
    }
    const plain = !gs.opts.regex && ![...q].some((ch) => CHO.includes(ch));
    if (plain) {
      $('#findBar').hidden = false;
      $('#findInput').value = q;
      runFind(q);
      if (find.hits.length) {
        const lineOf = (m) => { const b = m.closest('[data-line]'); return b ? +b.dataset.line : -1; };
        let pick = -1;
        find.hits.forEach((m, i) => { const l = lineOf(m); if (l <= h.line - 1 && (pick < 0 || l > lineOf(find.hits[pick]))) pick = i; });
        gotoHit(pick < 0 ? 0 : pick);
        return;
      }
      closeFind();
    }
    gotoSourceLine(h.line);
  }
  function openGlobalSearch() {
    closeMenus();
    if (window.innerWidth <= 900) { el.sidebar.classList.add('open'); el.scrim.classList.add('show'); }
    else if (document.body.classList.contains('side-collapsed')) $('#btnSidebar').click();
    const ta = el.editor;
    const sel = (state.editing && document.activeElement === ta ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : String(getSelection())).trim();
    const inp = $('#gsInput');
    if (sel && sel.length < 80 && !sel.includes('\n')) inp.value = sel;
    setSideTab('search');
    inp.focus();
    inp.select();
  }

  /* =========================================================
     링크 색인 — 사이드바 「연결」 탭 · 문서 점검 · 이름을 바꿀 때 링크 고치기
     - 찾기와 같은 파일 읽기(gsRead: 바뀌지 않은 파일은 다시 읽지 않음). 코드 안의 링크는 markdown-it 이 빼 줌
     - 이름은 NFC 로 맞춰 비교 (맥에서 만든 이름)
     - markcont 는 경로가 틀려도 같은 이름의 파일을 찾아 이어 주므로(findEntry), 그런 링크는 「markcont에서만 열림」
     ========================================================= */
  const nfc = (s) => String(s == null ? '' : s).normalize('NFC');
  const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
  // 찾기용 표: 경로 · 이름 → 문서, 첨부 파일 경로 · 이름
  function fileMaps() {
    const byPath = new Map(), byName = new Map(), assetPath = new Map(), assetName = new Map();
    for (const f of state.files) {
      if (f.builtin) continue;
      byPath.set(nfc(f.path), f);
      const n = nfc(f.name).toLowerCase();
      if (!byName.has(n)) byName.set(n, f);
    }
    for (const k of state.assets.keys()) {
      assetPath.set(nfc(k), k);
      const n = nfc(baseName(k)).toLowerCase();
      if (!assetName.has(n)) assetName.set(n, k);
    }
    return { byPath, byName, assetPath, assetName };
  }
  // 문서 링크: exact(경로 그대로) · loose(이름만 같음 → GitHub 에서는 깨짐) · builtin(앱 안내 문서) · none
  function resolveDoc(base, ref, maps, byName) {
    const dec = nfc(safeDecode(ref)), withExt = MD_EXT.test(dec) ? dec : dec + '.md';
    const exact = maps.byPath.get(resolvePath(nfc(base), withExt));
    if (exact) return { entry: exact, how: 'exact' };
    const loose = maps.byName.get(baseName(withExt).toLowerCase());
    if (loose) return { entry: loose, how: byName ? 'exact' : 'loose' }; // 위키링크는 원래 이름으로 찾음
    if (builtinKeyFor(ref)) return { entry: null, how: 'builtin' };
    return { entry: null, how: 'none' };
  }
  function resolveFile(base, ref, maps) {
    const dec = nfc(safeDecode(ref));
    const k = maps.assetPath.get(resolvePath(nfc(base), dec));
    if (k) return { key: k, how: 'exact' };
    const l = maps.assetName.get(baseName(dec).toLowerCase());
    return l ? { key: l, how: 'loose' } : { key: null, how: 'none' };
  }
  // 제목 줄의 글자 (미리보기의 제목 글자와 같게: 서식은 빼고 글만)
  function inlineText(tok) {
    if (!tok || !tok.children) return '';
    return tok.children.map((c) => (c.type === 'text' || c.type === 'code_inline' ? c.content : c.type === 'softbreak' || c.type === 'hardbreak' ? ' '
      : c.type === 'wikilink' ? c.meta.alias || (c.meta.file ? c.meta.file + (c.meta.heading ? ' › ' + c.meta.heading : '') : c.meta.heading) : '')).join('');
  }
  // 문서 하나의 링크 · 제목 (줄 번호는 0부터, 맨 위 문서 정보는 빈 줄로 바꿔 세므로 원본과 같음)
  function scanDoc(text, env = {}) {
    const tokens = md ? md.parse(stripNotes(splitFrontMatter(text).body), env) : [];
    return scanParsed(tokens, text);
  }
  function scanParsed(tokens, text) {
    const links = [], heads = [], used = new Map();
    let at = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.map) at = t.map[0];
      if (t.type === 'heading_open') {
        const title = inlineText(tokens[i + 1]).trim();
        let slug = slugify(title);
        const n = used.get(slug) || 0;
        used.set(slug, n + 1);
        if (n) slug += '-' + n;
        heads.push({ level: +t.tag.slice(1), title, slug, line: at });
        continue;
      }
      if (t.type !== 'inline' || !t.children) continue;
      let line = t.map ? t.map[0] : at;
      for (const c of t.children) {
        if (c.type === 'softbreak' || c.type === 'hardbreak') line++;
        else if (c.type === 'wikilink') links.push({ kind: c.meta.embed ? 'embed' : 'wiki', line, file: c.meta.file, heading: c.meta.heading, raw: c.meta.raw });
        else if (c.type === 'link_open' && c.markup !== 'linkify' && c.markup !== 'autolink') links.push({ kind: 'md', line, href: c.attrGet('href') || '' });
        else if (c.type === 'image') links.push({ kind: 'img', line, href: c.attrGet('src') || '' });
      }
    }
    return { links, heads, text };
  }
  // 링크가 가리키는 곳: { target(문서) | asset(첨부 파일), hash, how }
  function linkTarget(from, l, maps) {
    if (l.kind === 'wiki' || l.kind === 'embed') {
      if (!l.file) return { target: from, hash: l.heading, how: 'exact', self: true };
      if (ASSET_EXT.test(l.file)) { const r = resolveFile(from.path, l.file, maps); return { asset: r.key, how: r.how === 'loose' ? 'exact' : r.how, file: true }; }
      const r = resolveDoc(from.path, l.file, maps, true);
      return { target: r.entry, hash: l.heading, how: r.how };
    }
    const href = (l.href || '').trim();
    if (!href || hasScheme(href)) return null;
    const at = href.indexOf('#'), p = at >= 0 ? href.slice(0, at) : href, hash = at >= 0 ? safeDecode(href.slice(at + 1)) : '';
    if (!p) return { target: from, hash, how: 'exact', self: true };
    const dp = safeDecode(p);
    if (l.kind === 'img' || ASSET_EXT.test(dp)) { const r = resolveFile(from.path, p, maps); return { asset: r.key, how: r.how, file: true, img: l.kind === 'img' }; }
    if (!MD_EXT.test(dp)) return null;
    const r = resolveDoc(from.path, p, maps, false);
    return { target: r.entry, hash, how: r.how };
  }
  // 상태: ok · loose(markcont에서만 열림) · broken(대상 없음) · anchor(그 제목 없음)
  //      · outside(열어 둔 폴더 밖이라 확인할 수 없음 — 문제로 세지 않음) · skip(밖의 주소 · 알 수 없음)
  const linkLeaves = (from, l) => {
    if (l.kind === 'wiki' || l.kind === 'embed') return false;
    const h = (l.href || '').trim(), at = h.indexOf('#');
    return leavesRoot(nfc(from.path), nfc(safeDecode(at >= 0 ? h.slice(0, at) : h)));
  };
  function judge(from, l, maps, index) {
    const t = linkTarget(from, l, maps);
    if (!t) return { status: 'skip' };
    if (t.file) {
      if (t.how === 'none') return from.loose ? { status: 'skip' } : { status: linkLeaves(from, l) ? 'outside' : 'broken', what: t.img ? 'img' : 'file' };
      return { status: t.how === 'loose' ? 'loose' : 'ok', asset: t.asset };
    }
    if (t.how === 'builtin') return { status: 'ok' };
    if (t.how === 'none') return { status: linkLeaves(from, l) ? 'outside' : 'broken', what: 'doc' };
    let status = t.how === 'loose' ? 'loose' : 'ok';
    if (t.hash) {
      const hs = index && index.get(t.target) ? index.get(t.target).heads : null;
      if (hs && !hs.some((h) => h.slug === t.hash || h.slug === slugify(t.hash))) status = 'anchor';
    }
    return { status, target: t.target, hash: t.hash, self: !!t.self };
  }
  const lk = { seq: 0, timer: 0, building: null, all: false, rows: [] };
  // 열어 둔 폴더 · 따로 연 문서 모두의 링크 (문서 → 훑은 결과)
  async function linkIndex() {
    if (lk.building) return lk.building;
    lk.building = (async () => {
      const files = gsFiles(), out = new Map();
      let next = 0;
      const work = async () => {
        while (next < files.length) {
          const f = files[next++], c = await gsRead(f);
          if (!c) continue;
          if (!c.scan) c.scan = scanDoc(c.text);
          out.set(f, c.scan);
        }
      };
      await Promise.all(Array.from({ length: 6 }, work));
      if (state.current && !out.has(state.current)) out.set(state.current, scanDoc(source()));
      return out;
    })();
    try { return await lk.building; } finally { lk.building = null; }
  }
  const lkWhy = (j) => (j.status === 'loose' ? L('markcont에서만 열림 · GitHub에서는 깨짐', 'Opens only in markcont · broken on GitHub')
    : j.status === 'outside' ? L('열어 둔 폴더 밖 · 위 폴더를 열면 확인됨', 'Outside the open folder · open a parent folder to check')
    : j.status === 'anchor' ? L('그 제목이 없음', 'Heading not found')
    : j.what === 'img' ? L('그림을 찾지 못함', 'Image not found') : j.what === 'file' ? L('파일을 찾지 못함', 'File not found') : L('문서를 찾지 못함', 'Document not found'));
  const lkLabel = (l) => (l.kind === 'wiki' || l.kind === 'embed' ? l.raw : safeDecode(l.href || ''));
  // 지금 문서: 가리키는 문서(나가는 링크) · 이 문서를 가리키는 문서(백링크) · 깨진 링크
  function linkReport(index, cur) {
    const maps = fileMaps(), back = new Map(), out = new Map(), bad = [], allBad = new Map(), away = [];
    for (const [from, scan] of index) for (const l of scan.links) {
      const j = judge(from, l, maps, index);
      if (j.status === 'skip') continue;
      if (j.status === 'outside') { if (from === cur) away.push({ l, j }); continue; } // 깨진 링크와 따로 (가리키는 문서도 없음)
      if (j.status !== 'ok') { if (!allBad.has(from)) allBad.set(from, []); allBad.get(from).push({ l, j }); }
      if (from === cur) {
        if (j.status !== 'ok') bad.push({ l, j });
        if (j.target && !j.self) {
          const o = out.get(j.target) || { entry: j.target, n: 0, worst: 'ok' };
          o.n++;
          if (j.status !== 'ok') o.worst = j.status;
          out.set(j.target, o);
        }
      } else if (j.target === cur) {
        if (!back.has(from)) back.set(from, []);
        back.get(from).push({ l, j });
      }
    }
    return { back, out, bad, allBad, away };
  }
  function lkSchedule(ms = 700) { clearTimeout(lk.timer); lk.timer = setTimeout(lkRender, ms); }
  async function lkRender() {
    if (side.tab !== 'links' || $('#linksPanel').hidden) return;
    const cur = state.current, box = $('#lkBody'), st = $('#lkStatus');
    if (!cur) { st.textContent = L('문서를 열면 이 문서를 가리키는 문서, 이 문서가 가리키는 문서, 깨진 링크를 보여 줍니다.', 'Open a document to see what links to it, what it links to and its broken links.'); box.innerHTML = ''; return; }
    const seq = ++lk.seq;
    if (!box.childElementCount) st.textContent = L('링크를 모으는 중…', 'Collecting links…');
    let index;
    try { index = await linkIndex(); } catch { index = new Map([[cur, scanDoc(source())]]); }
    if (seq !== lk.seq || state.current !== cur) return;
    const r = linkReport(index, cur), rows = [], E = escapeHtml;
    const add = (o) => (rows.push(o), rows.length - 1);
    const lineOf = (e, n) => (((index.get(e) || {}).text || '').split('\n')[n] || '').trim();
    const name = (e) => E(e.name.replace(MD_EXT, ''));
    const sec = (title, n) => `<div class="lk-title">${title}<span class="gs-n">${n}</span></div>`;
    let h = '';
    // 1) 이 문서를 가리키는 문서
    const backs = [...r.back].sort((a, b) => a[0].path.localeCompare(b[0].path, undefined, { numeric: true }));
    h += sec(L('이 문서를 가리키는 문서', 'Linked from'), backs.length);
    h += backs.length ? backs.map(([from, list]) => `<div class="gs-file"><button type="button" class="gs-head" data-i="${add({ entry: from })}" title="${E(from.path)}">${ICON.md}<span class="gs-name">${name(from)}</span><span class="gs-dir">${E(from.loose ? '' : parentOf(from.path))}</span><span class="gs-n">${list.length}</span></button>` +
      list.slice(0, 50).map((x) => `<button type="button" class="gs-line" data-i="${add({ entry: from, line: x.l.line })}"><span class="gs-ln">${x.l.line + 1}</span><span class="gs-tx">${E(lineOf(from, x.l.line))}</span></button>`).join('') + '</div>').join('')
      : `<div class="lk-empty">${gsFiles().length > 1 ? L('이 문서를 가리키는 문서가 없습니다.', 'No document links here.') : L('폴더를 열면 이 문서를 가리키는 문서를 찾습니다.', 'Open a folder to find documents that link here.')}</div>`;
    // 2) 이 문서가 가리키는 문서
    const outs = [...r.out.values()].sort((a, b) => a.entry.path.localeCompare(b.entry.path, undefined, { numeric: true }));
    h += sec(L('이 문서가 가리키는 문서', 'Links to'), outs.length);
    h += outs.length ? outs.map((o) => `<button type="button" class="lk-row ${o.worst === 'ok' ? 'ok' : 'warn'}" data-i="${add({ entry: o.entry })}" title="${E(o.entry.path)}"><span class="lk-ic">${o.worst === 'ok' ? '✓' : '!'}</span><span class="lk-name">${name(o.entry)}</span><span class="lk-sub">${o.worst === 'ok' ? E(o.entry.loose ? '' : parentOf(o.entry.path)) : E(lkWhy({ status: o.worst }))}</span></button>`).join('')
      : `<div class="lk-empty">${L('다른 문서를 가리키는 링크가 없습니다.', 'No links to other documents.')}</div>`;
    // 3) 깨진 링크 · 그림
    h += sec(L('깨진 링크 · 그림', 'Broken links · images'), r.bad.length);
    h += r.bad.length ? r.bad.map((x) => `<button type="button" class="lk-row ${x.j.status === 'loose' ? 'warn' : 'bad'}" data-i="${add({ entry: cur, line: x.l.line })}" title="${E(lkLabel(x.l))}"><span class="lk-ic">${x.j.status === 'loose' ? '!' : '✕'}</span><span class="lk-name">${E(lkLabel(x.l))}</span><span class="lk-sub">${E(lkWhy(x.j))} · ${x.l.line + 1}</span></button>`).join('')
      : `<div class="lk-empty">${L('깨진 링크가 없습니다.', 'No broken links.')}</div>`;
    // 3-1) 열어 둔 폴더 밖을 가리켜 확인하지 못한 링크 (있을 때만, 깨진 링크로 세지 않음)
    if (r.away.length) {
      h += sec(L('폴더 밖이라 확인하지 못한 링크', 'Links outside the open folder'), r.away.length);
      h += r.away.map((x) => `<button type="button" class="lk-row info" data-i="${add({ entry: cur, line: x.l.line })}" title="${E(lkLabel(x.l))}"><span class="lk-ic">↗</span><span class="lk-name">${E(lkLabel(x.l))}</span><span class="lk-sub">${E(lkWhy(x.j))} · ${x.l.line + 1}</span></button>`).join('');
    }
    // 4) 폴더 전체의 깨진 링크 (누를 때만)
    const others = [...r.allBad].filter(([e]) => e !== cur);
    if (gsFiles().length > 1) {
      if (!lk.all) h += `<button type="button" class="btn lk-all" id="lkAll">${L(`폴더 전체의 깨진 링크 보기 (${others.reduce((s, [, v]) => s + v.length, 0)})`, `Show broken links in the whole folder (${others.reduce((s, [, v]) => s + v.length, 0)})`)}</button>`;
      else {
        h += sec(L('폴더 전체의 깨진 링크', 'Broken links in the folder'), others.reduce((s, [, v]) => s + v.length, 0));
        h += others.length ? others.sort((a, b) => a[0].path.localeCompare(b[0].path, undefined, { numeric: true })).map(([from, list]) => `<div class="gs-file"><button type="button" class="gs-head" data-i="${add({ entry: from })}" title="${E(from.path)}">${ICON.md}<span class="gs-name">${name(from)}</span><span class="gs-dir">${E(from.loose ? '' : parentOf(from.path))}</span><span class="gs-n">${list.length}</span></button>` +
          list.slice(0, 50).map((x) => `<button type="button" class="gs-line" data-i="${add({ entry: from, line: x.l.line })}"><span class="gs-ln">${x.l.line + 1}</span><span class="gs-tx">${E(lkLabel(x.l))} <small style="color:var(--muted)">· ${E(lkWhy(x.j))}</small></span></button>`).join('') + '</div>').join('')
          : `<div class="lk-empty">${L('다른 문서에도 깨진 링크가 없습니다.', 'No broken links in other documents either.')}</div>`;
      }
    }
    lk.rows = rows;
    st.textContent = '';
    box.innerHTML = h;
    const all = $('#lkAll');
    if (all) all.onclick = () => { lk.all = true; lkRender(); };
  }
  $('#lkBody').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const o = lk.rows[+b.dataset.i];
    if (!o) return;
    if (o.entry && state.current !== o.entry && !(await openEntry(o.entry))) return;
    if (window.innerWidth <= 900) closeSidebar();
    if (o.line != null) gotoSourceLine(o.line + 1);
  });

  /* ---------- 링크 고치기: 이름을 바꾼 문서 · 폴더 · 제목을 가리키던 링크를 새 이름으로 ---------- */
  const writableEntry = (e) => !!e && !e.builtin && ((e.tauriPath && isTauri()) || !!(e.handle && e.handle.createWritable));
  // 한 줄 안의 `코드` 자리 (그 안의 예시는 건드리지 않음)
  function codeSpans(line) {
    const out = [];
    for (const m of line.matchAll(/(`+)[\s\S]*?(?<!`)\1(?!`)/g)) out.push([m.index, m.index + m[0].length]);
    return out;
  }
  const inSpans = (spans, i) => spans.some(([a, b]) => i >= a && i < b);
  // 문서 경로 from 에서 to 로 가는 상대 경로 (다른 폴더(작업 공간의 다른 맨 위 폴더)면 이름만)
  function relLink(from, to) {
    const a = from.split('/'), b = to.split('/');
    a.pop();
    if (a[0] !== b[0]) return b[b.length - 1];
    let i = 0;
    while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    return '../'.repeat(a.length - i) + b.slice(i).join('/');
  }
  const urlLike = (dest, plain) => (/%[0-9A-Fa-f]{2}/.test(dest) ? encodeURI(plain) : plain.replace(/[ ()<>]/g, (c) => ({ ' ': '%20', '(': '%28', ')': '%29', '<': '%3C', '>': '%3E' })[c]));
  // 링크 하나를 바꿈: fix = { file?: 새 대상 경로(문서 · 첨부), heading?: [옛 제목 글자 · 옛 조각, 새 제목 글자, 새 조각] }
  function rewriteOne(lines, from, l, fix) {
    const at = l.line;
    if (l.kind === 'wiki' || l.kind === 'embed') {
      const line = lines[at] || '', spans = codeSpans(line);
      let i = line.indexOf(l.raw);
      while (i >= 0 && inSpans(spans, i)) i = line.indexOf(l.raw, i + 1);
      if (i < 0) return false;
      const pre = l.raw.startsWith('!') ? '![[' : '[[', body = l.raw.slice(pre.length, -2);
      const bar = body.search(/\\?\|/), target = bar >= 0 ? body.slice(0, bar) : body, rest = bar >= 0 ? body.slice(bar) : '';
      const hashAt = target.indexOf('#');
      let file = hashAt >= 0 ? target.slice(0, hashAt) : target, head = hashAt >= 0 ? target.slice(hashAt + 1) : '';
      if (fix.file) {
        const t = file.trim(), keepExt = MD_EXT.test(t) || ASSET_EXT.test(t);
        let nf = t.includes('/') ? relLink(from.path, fix.file) : baseName(fix.file);
        if (!keepExt) nf = nf.replace(MD_EXT, '');
        file = file.replace(t, nf);
      }
      if (fix.heading && head) head = head.replace(head.trim(), fix.heading[1]);
      const raw = pre + file + (hashAt >= 0 ? '#' + head : '') + rest + ']]';
      if (raw === l.raw) return false;
      lines[at] = line.slice(0, i) + raw + line.slice(i + l.raw.length);
      return true;
    }
    // [글](주소) · ![설명](그림) — 그 줄에 없으면 참조 정의([이름]: 주소) 줄에서 찾음
    const want = nfc(safeDecode(l.href));
    const re = /\]\(\s*(<[^>\n]*>|[^\s()<>]*(?:\([^\s()]*\)[^\s()<>]*)*)/g;
    const defRe = /^( {0,3}\[[^\]]+\]:[ \t]*)(<[^>\n]*>|\S+)/;
    const patch = (dest) => {
      const angle = dest.startsWith('<'), plain = angle ? dest.slice(1, -1) : dest;
      const hashAt = plain.indexOf('#');
      let p = hashAt >= 0 ? plain.slice(0, hashAt) : plain, hash = hashAt >= 0 ? plain.slice(hashAt) : '';
      if (fix.file) p = urlLike(p, relLink(from.path, fix.file));
      if (fix.heading && hash) hash = '#' + urlLike(hash.slice(1), fix.heading[2]);
      const out = p + hash;
      return angle ? '<' + out + '>' : out;
    };
    const tryLine = (k, isDef) => {
      const line = lines[k];
      if (line == null) return false;
      if (isDef) {
        const m = line.match(defRe);
        if (!m || nfc(safeDecode(m[2].replace(/^<|>$/g, ''))) !== want) return false;
        lines[k] = m[1] + patch(m[2]) + line.slice(m[0].length);
        return true;
      }
      const spans = codeSpans(line);
      for (const m of line.matchAll(re)) {
        if (inSpans(spans, m.index)) continue;
        const dest = m[1];
        if (nfc(safeDecode(dest.replace(/^<|>$/g, ''))) !== want) continue;
        const start = m.index + m[0].length - dest.length;
        lines[k] = line.slice(0, start) + patch(dest) + line.slice(start + dest.length);
        return true;
      }
      return false;
    };
    if (tryLine(at, false)) return true;
    for (let k = 0; k < lines.length; k++) if (tryLine(k, true)) return true;
    return false;
  }
  // 고칠 링크들 → 문서마다 { entry, before, after, n }
  async function planLinkFix(items) {
    const byFile = new Map();
    for (const it of items) { if (!byFile.has(it.from)) byFile.set(it.from, []); byFile.get(it.from).push(it); }
    const plans = [];
    for (const [from, list] of byFile) {
      if (!writableEntry(from)) continue;
      let text;
      try { text = from === state.current ? source() : await peekText(from); } catch { continue; }
      const lines = text.split('\n');
      let n = 0;
      for (const it of list) if (rewriteOne(lines, from, it.l, it.fix)) n++;
      const after = lines.join('\n');
      if (n && after !== text) plans.push({ entry: from, before: text, after, n });
    }
    return plans;
  }
  // 파일에 쓰기 (저장 기록도 남김). 지금 문서는 편집창에도 반영 (Ctrl+Z 로 되돌릴 수 있게)
  async function writeDocText(entry, text) {
    if (entry === state.current) {
      const wasDirty = state.dirty;
      applyText(text);
      if (wasDirty) return 'editor'; // 저장 안 한 고침이 섞여 있어서 파일에는 쓰지 않음
    }
    if (entry.tauriPath && isTauri()) entry.lastModified = await tinvoke('save_file', { path: entry.tauriPath, text, keepHistory: true, ...fmtArgs(entry) });
    else if (entry.handle && entry.handle.createWritable) {
      let before = null;
      try { const d = await readDoc(await entry.handle.getFile()); before = d.text; fillFmt(entry, d); } catch {}
      const data = encodeDoc(text, entry); // EUC-KR 에 없는 글자가 있으면 여기서 멈춤 (파일은 그대로, 못 바꾼 문서로 알림)
      const w = await entry.handle.createWritable();
      await w.write(data);
      await w.close();
      vers.changed(entry, before, text, 'save');
      try { entry.lastModified = (await entry.handle.getFile()).lastModified; } catch {}
    } else throw new Error(L('고칠 수 없는 파일입니다', "This file can't be changed"));
    if (entry.text != null || entry === state.current) entry.text = text;
    gs.cache.delete(entry);
    if (entry === state.current) { state.dirty = false; snapshot(L('링크 고침', 'Links fixed'), { saved: true }); applyChangeMarks(); updateTitle(); }
    return 'file';
  }
  function showLinkFix(plans, intro) {
    const total = plans.reduce((s, p) => s + p.n, 0);
    $('#lfTitle').textContent = L('링크 고치기', 'Fix links');
    $('#lfBody').innerHTML = `<p class="chg-help">${intro} ${L(`문서 ${plans.length}개의 링크 ${total}곳을 바꿉니다. 바꾼 문서는 저장 기록에 남아 되돌릴 수 있습니다.`, `This changes ${total} link${total === 1 ? '' : 's'} in ${plans.length} document${plans.length === 1 ? '' : 's'}. The changed documents are kept in saved versions, so you can go back.`)}</p>` +
      plans.map((p, i) => `<details class="lf-file"${i < 3 ? ' open' : ''}><summary>${escapeHtml(p.entry.path)}<small>${L(`${p.n}곳`, `${p.n}`)}</small></summary>${diffHtml(p.before, p.after)}</details>`).join('');
    $('#lfFoot').innerHTML = `<button class="btn" id="lfNo">${L('그대로 두기', 'Leave as is')}</button><span style="flex:1"></span><button class="btn primary" id="lfYes">${L(`링크 ${total}곳 바꾸기`, `Change ${total} link${total === 1 ? '' : 's'}`)}</button>`;
    $('#linkFixModal').hidden = false;
    $('#lfNo').onclick = closeLinkFix;
    $('#lfYes').onclick = async () => {
      closeLinkFix();
      let ok = 0, onlyEditor = 0;
      const failed = [];
      for (const p of plans) {
        try { (await writeDocText(p.entry, p.after)) === 'editor' ? onlyEditor++ : ok++; } catch (err) { failed.push(p.entry.path + ': ' + ((err && err.message) || err)); }
      }
      if (state.current) render(true);
      lkSchedule(0);
      toast(L(`링크를 바꿨습니다: 문서 ${ok + onlyEditor}개`, `Links changed in ${ok + onlyEditor} document${ok + onlyEditor === 1 ? '' : 's'}`) + (onlyEditor ? L(' (지금 문서는 저장하지 않은 고침이 있어 편집창에만 반영)', ' (the current document has unsaved edits, so only the editor was changed)') : '') + (failed.length ? L(` · 못 바꾼 문서 ${failed.length}개`, ` · ${failed.length} failed`) : ''), 5000);
      if (failed.length) console.warn('[링크 고치기]', failed);
    };
  }
  function closeLinkFix() { $('#linkFixModal').hidden = true; }
  $('#lfClose').onclick = closeLinkFix;
  $('#linkFixModal').addEventListener('click', (e) => { if (e.target.id === 'linkFixModal') closeLinkFix(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#linkFixModal').hidden) { e.preventDefault(); e.stopImmediatePropagation(); closeLinkFix(); } }, true);
  // 이름을 바꾸기 전에: 그 문서(또는 폴더 안의 문서 · 첨부 파일)를 가리키는 링크를 모아 둠
  async function linksInto(path, kind) {
    const index = await linkIndex(), maps = fileMaps(), hits = [];
    const inPath = (p) => !!p && (kind === 'dir' ? p === path || p.startsWith(path + '/') : p === path);
    for (const [from, scan] of index) for (const l of scan.links) {
      const t = linkTarget(from, l, maps);
      if (!t || t.self || t.how === 'none' || t.how === 'builtin') continue;
      if (t.file ? inPath(t.asset) : t.target && !t.target.loose && inPath(t.target.path)) hits.push({ from, l, target: t.target, asset: t.asset });
    }
    return hits;
  }
  // 이름을 바꾼 뒤: 새 경로로 고칠지 물음
  async function offerRenameFix(hits, oldPath, newPath) {
    const moveP = (p) => (p === oldPath || p.startsWith(oldPath + '/') ? newPath + p.slice(oldPath.length) : p);
    const items = hits.map((h) => ({ from: h.from, l: h.l, fix: { file: h.asset ? moveP(h.asset) : h.target.path } }));
    const plans = await planLinkFix(items);
    if (plans.length) showLinkFix(plans, L(`<b>${escapeHtml(baseName(oldPath))}</b> → <b>${escapeHtml(baseName(newPath))}</b> 로 이름을 바꿨습니다. 이 이름을 가리키던 링크도 바꿀까요?`, `Renamed <b>${escapeHtml(baseName(oldPath))}</b> → <b>${escapeHtml(baseName(newPath))}</b>. Change the links that pointed to it too?`));
  }
  // 저장한 뒤: 제목 글이 바뀌었으면(개수 · 단계는 그대로), 그 제목을 가리키던 링크도 고칠지 물음
  async function offerHeadingFix(entry, before, after) {
    if (!before || before === after || !md) return;
    const a = scanDoc(before).heads, b = scanDoc(after).heads;
    if (a.length !== b.length) return;
    const pairs = new Map();
    a.forEach((h, i) => { if (h.level === b[i].level && h.slug !== b[i].slug) pairs.set(h.slug, [h.title, b[i].title, b[i].slug]); });
    if (!pairs.size || pairs.size > 3) return; // 많이 바뀌었으면 이름 바꾸기가 아니라 다시 쓴 것으로 봄
    const index = await linkIndex(), maps = fileMaps(), items = [];
    for (const [from, scan] of index) for (const l of scan.links) {
      const t = linkTarget(from, l, maps);
      if (!t || t.file || t.target !== entry || !t.hash) continue;
      const p = pairs.get(t.hash) || pairs.get(slugify(t.hash));
      if (p) items.push({ from, l, fix: { heading: p } });
    }
    const plans = await planLinkFix(items);
    if (plans.length) showLinkFix(plans, L(`제목을 「${escapeHtml([...pairs.values()][0][0])}」 → 「${escapeHtml([...pairs.values()][0][1])}」${pairs.size > 1 ? ` 외 ${pairs.size - 1}개` : ''}로 바꿔서, 그 제목을 가리키던 링크가 깨집니다. 새 제목으로 바꿀까요?`, `You renamed the heading “${escapeHtml([...pairs.values()][0][0])}” → “${escapeHtml([...pairs.values()][0][1])}”${pairs.size > 1 ? ` and ${pairs.size - 1} more` : ''}, so links to it are now broken. Point them to the new heading?`));
  }

  /* =========================================================
     문서 점검: 깨진 링크 · 그림, 제목 단계 건너뜀, 각주, 표 칸 수, 너무 긴 문장, 작성 규칙, 다른 뷰어에서 다르게 보이는 곳
     (문서 위의 「⚠ 문서 점검」 단추 → 목록, 줄을 누르면 그 위치로)
     ========================================================= */
  const LONG_KO = 100, LONG_EN = 40; // 한국어는 글자 수(빈칸 빼고), 영어는 낱말 수
  const sentenceSeg = window.Intl && Intl.Segmenter ? new Intl.Segmenter(LANG === 'en' ? 'en' : 'ko', { granularity: 'sentence' }) : null;
  function sentencesOf(text) {
    if (sentenceSeg) return [...sentenceSeg.segment(text)].map((s) => s.segment);
    return text.split(/(?<=[.!?。])\s+/);
  }
  // 표 줄의 칸 수 (\| 는 칸 나눔이 아님 · GFM 처럼 `코드` 안의 | 도 나눔)
  //  알림 상자 · 인용 안의 표는 줄 앞의 > 를 떼고 셈 (떼지 않으면 칸이 하나 더 많게 잡힘)
  function tableCells(line) {
    let t = line.replace(/^\s*(?:>\s?)+/, '').trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (/(^|[^\\])\|$/.test(t)) t = t.slice(0, -1);
    return t.split(/(?<!\\)\|/).length;
  }
  // 보이지 않는 글자: 화면에는 안 보이는데 복사 · 찾기 · 다른 프로그램(또는 AI에게 준 문서)에서 문제를 일으키는 글자
  //  정규식 대신 코드 번호로 셈 (이 소스에도 숨은 글자가 생기지 않게). [시작, 끝, 종류]
  const INVISIBLE = [
    [0x00, 0x08, 'ctrl'], [0x0B, 0x0C, 'ctrl'], [0x0E, 0x1F, 'ctrl'], [0x7F, 0x9F, 'ctrl'],
    [0xAD, 0xAD, 'shy'], [0x180E, 0x180E, 'other'], [0x200B, 0x200B, 'zwsp'], [0x200C, 0x200C, 'zwnj'], [0x200D, 0x200D, 'zwj'],
    [0x200E, 0x200F, 'bidi'], [0x202A, 0x202E, 'bidi'], [0x2060, 0x2060, 'wj'], [0x2061, 0x2064, 'other'], [0x2066, 0x2069, 'bidi'],
    [0x3164, 0x3164, 'filler'], [0xFEFF, 0xFEFF, 'bom'], [0xFFA0, 0xFFA0, 'filler'], [0xFFF9, 0xFFFB, 'other'],
  ];
  const invisibleName = (k) => ({
    ctrl: L('제어 문자', 'Control character'), shy: L('숨은 하이픈', 'Soft hyphen'), zwsp: L('폭 없는 공백', 'Zero-width space'),
    zwnj: L('폭 없는 비결합자', 'Zero-width non-joiner'), zwj: L('폭 없는 결합자', 'Zero-width joiner'), bidi: L('글자 방향 제어 문자', 'Text-direction control'),
    wj: L('단어 결합자', 'Word joiner'), filler: L('한글 채움 문자', 'Hangul filler'), bom: L('BOM 표시', 'Byte order mark'),
    tag: L('숨은 태그 글자', 'Hidden tag character'), other: L('보이지 않는 기호', 'Invisible symbol'),
  })[k];
  // 이모지 끝 · 처음 (가족 · 직업 이모지처럼 폭 없는 결합자로 잇는 이모지), 비결합자를 쓰는 글자(히브리 · 아랍 · 인도 글자)
  const emojiEnd = (c) => (c >= 0xDC00 && c <= 0xDFFF) || c === 0xFE0F || (c >= 0x2000 && c <= 0x2BFF);
  const emojiStart = (c) => (c >= 0xD800 && c <= 0xDBFF) || (c >= 0x2000 && c <= 0x2BFF);
  const joinScript = (c) => (c >= 0x0590 && c <= 0x0DFF) || (c >= 0xFB1D && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFC);
  // 글 안의 보이지 않는 글자 [{ i(위치), len, cp(코드 번호), kind }]
  //  쓰는 글자는 뺌: 이모지 사이의 폭 없는 결합자(가족 이모지 등), 히브리 · 아랍 · 인도 글자 옆의 비결합자, 깃발 🏴 뒤의 태그 글자(잉글랜드 · 스코틀랜드 깃발)
  function findInvisible(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if ((c >= 0x20 && c < 0x7F) || (c >= 0xAC00 && c <= 0xD7A3) || c === 0x09 || c === 0x0A || c === 0x0D) continue; // 대부분 (영문 · 숫자 · 한글)
      // 태그 글자 U+E0000–E007F (서로게이트 DB40 + DC00–DC7F): 글 속에 몰래 숨긴 글에 쓰임
      if (c === 0xDB40 && i + 1 < s.length && s.charCodeAt(i + 1) >= 0xDC00 && s.charCodeAt(i + 1) <= 0xDC7F) {
        let j = i;
        while (j >= 2 && s.charCodeAt(j - 2) === 0xDB40 && s.charCodeAt(j - 1) >= 0xDC00 && s.charCodeAt(j - 1) <= 0xDC7F) j -= 2;
        if (!(j >= 2 && s.charCodeAt(j - 2) === 0xD83C && s.charCodeAt(j - 1) === 0xDFF4)) out.push({ i, len: 2, cp: 0xE0000 + s.charCodeAt(i + 1) - 0xDC00, kind: 'tag' });
        i++;
        continue;
      }
      const hit = INVISIBLE.find(([a, b]) => c >= a && c <= b);
      if (!hit) continue;
      const p = i > 0 ? s.charCodeAt(i - 1) : 0, n = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (hit[2] === 'zwj' && emojiEnd(p) && emojiStart(n)) continue;
      if (hit[2] === 'zwnj' && (joinScript(p) || joinScript(n))) continue;
      out.push({ i, len: 1, cp: c, kind: hit[2] });
    }
    return out;
  }
  const cpLabel = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
  // 보이지 않는 글자를 모두 뺀 글 (「보이지 않는 글자 지우기」)
  function dropInvisible(s) {
    let out = '', at = 0;
    for (const f of findInvisible(s)) { out += s.slice(at, f.i); at = f.i + f.len; }
    return out + s.slice(at);
  }
  // 편집기 색칠 층: 보이지 않는 글자를 빨간 표시로 감쌈 (글자는 그대로라 입력 칸과 위치가 어긋나지 않음)
  function markInvisible(html) {
    const found = findInvisible(html);
    if (!found.length) return html;
    let out = '', at = 0;
    for (const f of found) { out += html.slice(at, f.i) + '<span class="t-inv">' + html.slice(f.i, f.i + f.len) + '</span>'; at = f.i + f.len; }
    return out + html.slice(at);
  }
  // index: 다른 문서의 제목까지 볼 때 (없으면 이미 읽어 둔 문서만으로)
  function runCheck(src, cur, index) {
    const groups = [];
    const add = (key, title, items, info) => { if (items.length) groups.push({ key, title, items, info }); }; // info: 알려만 주고 문제 수에는 넣지 않음
    const env = {};
    const tokens = md ? md.parse(stripNotes(splitFrontMatter(src).body), env) : [];
    const scan = scanParsed(tokens, src), lines = src.split('\n');
    // 1) 깨진 링크 · 그림
    if (!index) { index = new Map(); for (const [e, c] of gs.cache) if (c.scan) index.set(e, c.scan); }
    index = new Map(index);
    index.set(cur, scan);
    const maps = fileMaps(), bad = [], away = [];
    for (const l of scan.links) {
      const j = judge(cur, l, maps, index);
      if (j.status === 'outside') away.push({ line: l.line, what: j.what === 'img' ? L('폴더 밖의 그림', 'Image outside the folder') : L('폴더 밖의 링크', 'Link outside the folder'), text: lkLabel(l) + ' · ' + lkWhy(j), info: true });
      else if (j.status !== 'ok' && j.status !== 'skip') bad.push({ line: l.line, what: j.status === 'loose' ? L('markcont에서만 열리는 링크', 'Link that opens only in markcont') : j.what === 'img' ? L('깨진 그림', 'Broken image') : L('깨진 링크', 'Broken link'), text: lkLabel(l) + ' · ' + lkWhy(j), warn: j.status === 'loose' });
    }
    add('links', L('깨진 링크 · 그림', 'Broken links · images'), bad);
    // 1-1) 열어 둔 폴더 밖(../)을 가리켜 있는지 확인할 수 없는 링크: 깨진 링크와 따로, 문제 수에는 넣지 않음
    add('outside', L('열어 둔 폴더 밖이라 확인하지 못한 링크 (문제로 세지 않음)', "Links outside the open folder, not checked (not counted as issues)"), away, true);
    // 1-2) 보이지 않는 글자 (줄마다 하나로 묶어서, 그 글자 자리는 ⟦U+200B⟧ 처럼 보여 줌)
    const hidden = [];
    let hiddenChars = 0;
    lines.forEach((ln, n) => {
      const found = findInvisible(ln);
      if (!found.length) return;
      hiddenChars += found.length;
      // 종류별 개수 (태그 글자는 코드 번호마다 나누지 않고 한 묶음)
      const kinds = new Map();
      for (const f of found) { const key = f.kind === 'tag' ? 'tag' : f.cp; const k = kinds.get(key) || { kind: f.kind, cp: f.cp, n: 0 }; k.n++; kinds.set(key, k); }
      // 그 자리를 ⟦U+200B⟧ 로. 이어진 태그 글자는 숨긴 영문 글을 풀어서 ⟦숨은 글 "…"⟧ 로
      let shown = '', at = 0;
      for (let k = 0; k < found.length; k++) {
        const f = found[k];
        shown += ln.slice(at, f.i);
        if (f.kind === 'tag') {
          let s = '';
          for (; k < found.length && found[k].kind === 'tag' && found[k].i === f.i + s.length * 2; k++) s += found[k].cp >= 0xE0020 && found[k].cp <= 0xE007E ? String.fromCharCode(found[k].cp - 0xE0000) : '?';
          k--;
          shown += '⟦' + L('숨은 글', 'hidden text') + ' "' + s + '"⟧';
          at = f.i + s.length * 2;
        } else { shown += '⟦' + cpLabel(f.cp) + '⟧'; at = f.i + f.len; }
      }
      shown += ln.slice(at);
      const from = Math.max(0, shown.indexOf('⟦') - 20);
      hidden.push({ line: n, what: [...kinds.values()].map((k) => invisibleName(k.kind) + (k.kind === 'tag' ? '' : ' ' + cpLabel(k.cp)) + (k.n > 1 ? L(` ${k.n}개`, ` ×${k.n}`) : '')).join(' · '), text: (from ? '…' : '') + shown.slice(from).trim() });
    });
    add('hidden', L('보이지 않는 글자', 'Invisible characters'), hidden);
    // 2) 제목 단계 건너뜀 (## 다음에 #### 처럼)
    const skips = [];
    scan.heads.forEach((h, i) => {
      const prev = scan.heads[i - 1];
      if (prev && h.level > prev.level + 1) skips.push({ line: h.line, what: L(`${'#'.repeat(prev.level)} 다음에 ${'#'.repeat(h.level)}`, `${'#'.repeat(h.level)} right after ${'#'.repeat(prev.level)}`), text: h.title });
    });
    add('heads', L('제목 단계를 건너뜀', 'Skipped heading levels'), skips);
    // 3) 각주: 쓰지 않는 설명 · 설명이 없는 번호
    const notes = [], refs = (env.footnotes && env.footnotes.refs) || {};
    let fence = null;
    lines.forEach((ln, i) => {
      const fm = ln.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) { if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length) fence = null; return; }
      if (fm) { fence = fm[1]; return; }
      const def = ln.match(/^ {0,3}\[\^([^\]\s]+)\]:/);
      if (def && refs[':' + def[1]] === -1) notes.push({ line: i, what: L('쓰지 않는 각주', 'Unused footnote'), text: `[^${def[1]}]` });
      const spans = codeSpans(ln);
      for (const m of ln.matchAll(/\[\^([^\]\s]+)\](?!:)/g)) {
        if (inSpans(spans, m.index) || (def && m.index === ln.indexOf('[^'))) continue;
        if (!(':' + m[1] in refs)) notes.push({ line: i, what: L('설명이 없는 각주', 'Footnote without a note'), text: m[0] });
      }
    });
    add('notes', L('각주', 'Footnotes'), notes);
    // 4) 칸 수가 머리줄과 다른 표 줄
    const rows = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== 'table_open' || !t.map) continue;
      let head = 0;
      for (let k = i + 1; k < tokens.length && tokens[k].type !== 'tr_close'; k++) if (tokens[k].type === 'th_open') head++;
      for (let n = t.map[0]; n < t.map[1]; n++) {
        if (n === t.map[0] + 1 || !lines[n] || !lines[n].trim()) continue;
        const c = tableCells(lines[n]);
        if (c !== head) rows.push({ line: n, what: L(`칸 ${c}개 (머리줄은 ${head}개)`, `${c} cells (header has ${head})`), text: lines[n].trim() });
      }
    }
    add('table', L('칸 수가 다른 표 줄', 'Table rows with a different number of cells'), rows);
    // 5) 너무 긴 문장 (문단 · 목록의 글만)
    const longs = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== 'inline' || !t.map || !tokens[i - 1] || tokens[i - 1].type !== 'paragraph_open') continue;
      for (const s of sentencesOf(inlineText(t))) {
        const noSpace = s.replace(/\s/g, ''), ko = (s.match(/[가-힣]/g) || []).length;
        const isKo = noSpace && ko / noSpace.length > 0.3;
        const size = isKo ? noSpace.length : (s.trim().match(/\S+/g) || []).length;
        if (size <= (isKo ? LONG_KO : LONG_EN)) continue;
        const head = s.trim().slice(0, 12);
        let at = t.map[0];
        for (let n = t.map[0]; n < t.map[1]; n++) if (lines[n] && lines[n].includes(head)) { at = n; break; }
        longs.push({ line: at, what: isKo ? L(`${size}자`, `${size} chars`) : L(`${size}낱말`, `${size} words`), text: s.trim().slice(0, 60) + (s.trim().length > 60 ? '…' : '') });
      }
    }
    add('long', L(`너무 긴 문장 (한국어 ${LONG_KO}자 · 영어 ${LONG_EN}낱말 넘음)`, `Long sentences (over ${LONG_KO} Korean chars · ${LONG_EN} words)`), longs);
    // 6) 작성 규칙: 제목(#)은 하나, ## 단락마다 알림 상자 두 개 · 형광펜 한 번까지
    //  + 규칙을 따르는 문서(문서 정보 「뷰어: markcont」, 또는 ## 단락에 이모지를 하나라도 붙인 문서)만:
    //    맨 위 제목 · ### 에 이모지 없이, ## 단락마다 이모지 하나, ## 단락 사이 구분선 ---, 굵은 글씨 한 줄을 소제목으로 쓰지 않기
    //    (규칙을 모르고 쓴 보통 문서까지 단락마다 잡으면 어느 문서를 열어도 점검 단추가 떠서)
    const rules = [];
    const h1 = scan.heads.filter((h) => h.level === 1);
    if (h1.length > 1) rules.push({ line: h1[1].line, what: L('제목(#)이 둘 이상', 'More than one title (#)'), text: L('작성 규칙: 맨 위 제목은 문서에 하나만', 'Writing rules: one top title per document'), warn: true });
    const rule = (line, what, text) => rules.push({ line, what, text, warn: true });
    // 문서 정보의 닫는 --- 바로 뒤에 빈 줄이 없으면: 다른 뷰어에서 제목 · 첫 단락까지 문서 정보로 묶여 보일 수 있음
    const fmEnd = src.match(/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*\r?\n/);
    if (fmEnd) {
      const n = (fmEnd[0].match(/\n/g) || []).length;
      if (lines[n] !== undefined && lines[n].trim()) rule(n - 1, L('문서 정보 --- 뒤에 빈 줄 없음', 'No blank line after the document info ---'), L('작성 규칙: 닫는 --- 다음에는 빈 줄 한 줄 (없으면 다른 뷰어에서 제목까지 문서 정보로 보일 수 있음)', 'Writing rules: one blank line after the closing --- (otherwise other viewers may show the title as document info)'));
    }
    const tops = []; // 맨 바깥 제목 { level, line, text(이모지 코드 :rocket: 는 이모지로), hr(바로 앞 덩어리가 구분선인지) }
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== 'heading_open' || t.level !== 0) continue;
      const kids = (tokens[i + 1] && tokens[i + 1].children) || [];
      let k = i - 1; // 바로 앞 덩어리 (주석만 있는 HTML 덩어리는 건너뜀)
      while (k >= 0 && (tokens[k].level !== 0 || (tokens[k].type === 'html_block' && /^\s*(?:<!--[\s\S]*?-->\s*)+$/.test(tokens[k].content)))) k--;
      tops.push({ level: +t.tag.slice(1), line: t.map ? t.map[0] : 0, text: kids.map((c) => (c.type === 'text' || c.type === 'emoji_code' ? c.content : '')).join('').trim(), hr: k >= 0 && tokens[k].type === 'hr' });
    }
    // 붙였는지 볼 때는 넓게(⚠ 처럼 FE0F 없이 쓴 것도), 붙이지 말아야 할 곳은 이모지로 보이는 것만(© ™ ↔ 같은 기호는 빼고)
    const EMOJI_ANY = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;
    const EMOJI_SHOWN = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F|\p{Regional_Indicator}|\u20E3/u;
    const graphemes = window.Intl && Intl.Segmenter ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;
    const emojiCount = (s) => (graphemes ? [...graphemes.segment(s)].filter((g) => EMOJI_ANY.test(g.segment)).length : EMOJI_ANY.test(s) ? 1 : 0);
    const h2s = tops.filter((h) => h.level === 2);
    if (docOptions(splitFrontMatter(src).fm).markcontOnly || h2s.some((h) => emojiCount(h.text))) {
      let prev = 0; // 앞 제목의 단계 (#, ## 만 셈): ## 다음 ## 이면 그 사이에 구분선
      for (const h of tops) {
        if (h.level === 1 && EMOJI_SHOWN.test(h.text)) rule(h.line, L('맨 위 제목(#)에 이모지', 'Emoji in the top title (#)'), L('작성 규칙: 맨 위 제목은 이모지 없이 (이모지는 ## 단락에만) · ', 'Writing rules: no emoji in the top title (emoji go on ## sections only) · ') + h.text);
        if (h.level >= 3 && EMOJI_SHOWN.test(h.text)) rule(h.line, L(`${'#'.repeat(h.level)} 작은 단락에 이모지`, `Emoji in a ${'#'.repeat(h.level)} subsection`), L('작성 규칙: 작은 단락(###)은 이모지 없이 · ', 'Writing rules: no emoji in subsections (###) · ') + h.text);
        if (h.level === 2) {
          const n = emojiCount(h.text);
          if (n !== 1) rule(h.line, n ? L('## 단락에 이모지 둘 이상', '2+ emoji in a ## section') : L('## 단락에 이모지 없음', 'No emoji on a ## section'), L('작성 규칙: ## 단락마다 이모지 하나 · ', 'Writing rules: one emoji per ## section · ') + h.text);
          if (prev === 2 && !h.hr) rule(h.line, L('## 단락 앞에 구분선 없음', 'No divider before a ## section'), L('작성 규칙: ## 단락 사이에는 구분선 --- · ', 'Writing rules: a --- divider between ## sections · ') + h.text);
        }
        if (h.level <= 2) prev = h.level;
      }
      // 굵은 글씨만 있는 짧은 한 줄 문단 (**정책 상태** 처럼) → ### 소제목으로. 문장(마침표 · 물음표 …로 끝남)을 통째로 굵게 한 강조는 빼고
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type !== 'paragraph_open' || tokens[i].level !== 0) continue;
        const kids = ((tokens[i + 1] && tokens[i + 1].children) || []).filter((c) => !(c.type === 'text' && !c.content.trim()));
        if (kids.length < 3 || kids[0].type !== 'strong_open' || kids[kids.length - 1].type !== 'strong_close' || kids.some((c, n) => n && c.type === 'strong_open' || c.type === 'softbreak' || c.type === 'hardbreak')) continue;
        const text = kids.map((c) => (c.type === 'text' || c.type === 'code_inline' || c.type === 'emoji_code' ? c.content : '')).join('').trim();
        if (!text || text.length > 40 || /[.!?。…]$|[다요죠까]$/.test(text)) continue;
        rule(tokens[i].map ? tokens[i].map[0] : 0, L('굵은 글씨 한 줄을 소제목처럼 씀', 'A bold line used as a heading'), L('작성 규칙: 작은 단락은 ### 제목으로 · ', 'Writing rules: use a ### heading for subsections · ') + text);
      }
    }
    let callouts = 0, marks = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'heading_open' && (t.tag === 'h1' || t.tag === 'h2')) { callouts = 0; marks = 0; continue; }
      if (t.type === 'blockquote_open' && t.level === 0 && tokens[i + 2] && /^\[!\w+\]/.test(tokens[i + 2].content || '')) {
        if (++callouts === 3) rules.push({ line: t.map ? t.map[0] : 0, what: L('한 단락에 알림 상자 3개 이상', '3+ callouts in one section'), text: L('작성 규칙: 알림 상자는 단락(##)마다 두 개까지', 'Writing rules: at most two callouts per section (##)'), warn: true });
      }
      if (t.type === 'inline' && t.children) for (const c of t.children) {
        if (c.type === 'mark_open' && ++marks === 2) rules.push({ line: t.map ? t.map[0] : 0, what: L('한 단락에 형광펜 두 번 이상', 'Highlight used twice in one section'), text: L('작성 규칙: 형광펜은 단락(##)마다 한 번만', 'Writing rules: one highlight per section (##)'), warn: true });
      }
    }
    add('rules', L('작성 규칙', 'Writing rules'), rules.sort((a, b) => a.line - b.line));
    // 7) 흐름도: @보기 · @자료 · 연결자 도착 (갈래 수 · 글자 수는 알려만 줌)
    if (window.MarkDiagram) {
      const flowBad = [], flowInfo = [], sumBad = [], cover = new Map(); // @자료 → { first, codes: 보기에 든 코드, all: 표의 코드 }
      const base = cur && cur.path ? cur.path : (state.current && state.current.path) || '';
      let fence = null, start = 0, buf = null, kind = null;
      lines.forEach((ln, i) => {
        const fm = ln.match(/^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)/);
        if (fence) {
          if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length && !fm[2]) {
            if (buf && kind === 'summary') {
              // 요약 흐름도: 모르는 역할 · 판정 없는 예/아니오 · 빈 단계 같은 문법 오류
              for (const it of MarkDiagram.summaryCheck(buf.join('\n'))) sumBad.push({ line: start + (it.ln || 1), what: it.msg, text: buf[(it.ln || 1) - 1] || '' });
            } else if (buf) {
              const src = buf.join('\n'), s = MarkDiagram.flowSource(src);
              const data = s ? flowState.data.get(flowDataKey(base, s)) : undefined;
              for (const it of MarkDiagram.flowCheck(src, { data, ctx: flowState.ctx })) (it.info ? flowInfo : flowBad).push({ line: start + (it.ln || 1), what: it.msg, text: buf[(it.ln || 1) - 1] || '', info: it.info });
              if (s && data) {
                const k = flowDataKey(base, s), c = cover.get(k) || { first: start, codes: new Set(), all: MarkDiagram.flowInfo(data).nodes.map((n) => n.id), views: 0 };
                const inf = MarkDiagram.flowInfo(src, { data });
                for (const v of inf.views) { c.views++; v.codes.forEach((x) => c.codes.add(x)); }
                cover.set(k, c);
              }
            }
            fence = null; buf = null;
          } else if (buf) buf.push(ln);
          return;
        }
        if (fm) { fence = fm[1]; start = i; kind = MarkDiagram.kindOf(fm[2]); buf = kind === 'flow' || kind === 'summary' ? [] : null; }
      });
      // 같은 @자료를 @보기로 나눴는데 어느 보기에도 들지 않은 노드
      for (const c of cover.values()) {
        const miss = c.views ? c.all.filter((x) => !c.codes.has(x)) : [];
        if (miss.length) flowInfo.push({ line: c.first, what: L(`어느 @보기에도 들지 않은 노드 ${miss.length}개`, `${miss.length} node${miss.length === 1 ? '' : 's'} in no @view`), text: miss.slice(0, 12).join(' ') + (miss.length > 12 ? ' …' : '') });
      }
      add('flow', L('흐름도', 'Flowcharts'), flowBad.sort((a, b) => a.line - b.line));
      add('summary', L('요약 흐름도', 'Summary flows'), sumBad);
      add('flowInfo', L('흐름도 작성 기준 (문제로 세지 않음)', 'Flowchart guidelines (not counted as issues)'), flowInfo.sort((a, b) => a.line - b.line), true);
    }
    const problems = groups.reduce((s, g) => s + (g.info ? 0 : g.items.length), 0);
    // 7) 다른 뷰어에서 다르게 보이는 곳 (markcont 전용 문법)
    let changes = [];
    if (window.MarkPortable && !docOptions(splitFrontMatter(src).fm).markcontOnly) { try { changes = MarkPortable.convert(src).changes; } catch {} }
    return { groups, problems, changes, compat: changes.length, hidden: hiddenChars };
  }
  const chk = { timer: 0, res: null, for: null };
  // 문서 위의 단추: 「⚠ 문서 점검 N곳 · 다른 뷰어 M곳」
  function paintCheckBadge() {
    const old = el.docMeta.querySelector('.meta-compat'), r = chk.res;
    if (!state.current || state.current.builtin || settings.compatHint === false || !r || chk.for !== state.current || (!r.problems && !r.compat)) { if (old) old.remove(); return; }
    const b = old || document.createElement('button');
    b.type = 'button';
    b.className = 'meta-compat';
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.warn}</svg>`;
    b.append(r.problems
      ? L(`문서 점검 ${r.problems}곳`, `${r.problems} issue${r.problems === 1 ? '' : 's'} found`) + (r.compat ? L(` · 다른 뷰어 ${r.compat}곳`, ` · ${r.compat} differ in other viewers`) : '')
      : L(`다른 뷰어에서 다르게 보이는 곳 ${r.compat}곳`, `${r.compat} spot${r.compat === 1 ? '' : 's'} look different in other viewers`));
    b.title = L('깨진 링크 · 제목 단계 · 각주 · 표 · 긴 문장 · 작성 규칙과, GitHub · VS Code 같은 다른 뷰어에서 다르게 보이는 곳을 모아 봅니다. 눌러서 목록을 보세요.', 'Broken links, heading levels, footnotes, tables, long sentences, writing rules, and spots that look different in viewers like GitHub or VS Code. Click to see the list.');
    b.onclick = openCompat;
    if (!old) el.docMeta.insertBefore(b, el.docMeta.querySelector('.meta-note'));
  }
  function scheduleCheck(ms = 500) {
    clearTimeout(chk.timer);
    chk.timer = setTimeout(() => {
      const cur = state.current;
      if (!cur || cur.builtin || settings.compatHint === false) { chk.res = null; paintCheckBadge(); return; }
      try { chk.res = runCheck(source(), cur); chk.for = cur; } catch (e) { console.warn('[문서 점검]', e); }
      paintCheckBadge();
      // 다른 문서의 제목(#링크)까지 보려면 링크 색인이 필요: 문서를 열 때 한 번 뒤에서 만들고 다시 셈
      if (chk.indexedFor !== cur && gsFiles().length > 1) {
        chk.indexedFor = cur;
        linkIndex().then(() => { if (state.current === cur) scheduleCheck(0); }).catch(() => {});
      }
    }, ms);
  }

  /* =========================================================
     교정 표기 받아들이기 · 버리기 — 표기를 누르면 작은 창, 문서 위에 「제안 N개 · 모두 받아들이기 · 모두 버리기」
     ========================================================= */
  // 코드 블록 · `코드` · 맨 위 문서 정보를 같은 길이의 빈칸으로 (그 안의 {++ ++} 는 글자 그대로라서)
  function maskCode(src) {
    const fm = src.match(/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/);
    const fmLines = fm ? (fm[0].match(/\n/g) || []).length : 0;
    let fence = null;
    return src.split('\n').map((l, i) => {
      if (i < fmLines) return ' '.repeat(l.length);
      const f = l.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && /^ {0,3}(`+|~+)\s*$/.test(l)) fence = null; return ' '.repeat(l.length); }
      if (f) { fence = f[1]; return ' '.repeat(l.length); }
      return l.replace(/(`+)[\s\S]*?(?<!`)\1(?!`)/g, (m) => ' '.repeat(m.length));
    }).join('\n');
  }
  const CRITIC_RE = /\{\+\+([\s\S]+?)\+\+\}|\{--([\s\S]+?)--\}|\{~~([\s\S]*?)~>([\s\S]*?)~~\}|\{>>([\s\S]+?)<<\}|\{==([\s\S]+?)==\}/g;
  // 원본의 교정 표기 → [{ start, end, raw, kind }]
  function criticMarks(src) {
    const out = [];
    if (!src || !src.includes('{')) return out;
    for (const m of maskCode(src).matchAll(CRITIC_RE)) {
      const raw = src.slice(m.index, m.index + m[0].length);
      if (/\n[ \t]*\n/.test(raw)) continue; // 문단을 넘지 않음
      const kind = m[1] != null ? 'add' : m[2] != null ? 'del' : m[3] != null ? 'sub' : m[5] != null ? 'cmt' : 'hl';
      if (kind !== 'sub' && !raw.slice(3, -3).trim()) continue;
      out.push({ start: m.index, end: m.index + m[0].length, raw, kind });
    }
    return out;
  }
  // 받아들이면 / 버리면 남는 글
  function criticResult(raw, kind, accept) {
    const inner = raw.slice(3, -3);
    if (kind === 'add') return accept ? inner : '';
    if (kind === 'del') return accept ? '' : inner;
    if (kind === 'sub') { const i = inner.indexOf('~>'); return accept ? inner.slice(i + 2) : inner.slice(0, i); }
    if (kind === 'hl') return inner;
    return ''; // 메모는 지움
  }
  // 고른 표기들을 원본에 적용 (한 번의 Ctrl+Z 로 되돌림). 지운 자리 앞뒤에 빈칸이 겹치면 하나로
  function applyCritic(marks, accept) {
    if (!marks.length) return 0;
    let v = source();
    for (const m of marks.slice().sort((a, b) => b.start - a.start)) {
      const rep = typeof accept === 'function' ? accept(m) : criticResult(m.raw, m.kind, accept);
      let end = m.end;
      if (!rep && v[m.start - 1] === ' ' && (v[end] === ' ' || /[.,!?)\]」』]/.test(v[end] || ''))) end += v[end] === ' ' ? 1 : 0;
      if (!rep && v[m.start - 1] === ' ' && /[.,!?)\]」』]/.test(v[end] || '')) v = v.slice(0, m.start - 1) + v.slice(end);
      else v = v.slice(0, m.start) + rep + v.slice(end);
    }
    applyText(v);
    return marks.length;
  }
  const cpop = document.createElement('div');
  cpop.className = 'critic-pop';
  cpop.hidden = true;
  cpop.setAttribute('role', 'dialog');
  document.body.append(cpop);
  let cpopFor = null;
  function hideCriticPop() { cpop.hidden = true; cpopFor?.classList.remove('picked'); cpopFor = null; }
  function showCriticPop(node) {
    hideCriticPop();
    const kind = node.dataset.kind, raw = node.dataset.raw, E = escapeHtml;
    const inner = raw.slice(3, -3), at = inner.indexOf('~>');
    const what = {
      add: L(`<b>더하기 제안</b> · ${E(inner)}`, `<b>Suggested addition</b> · ${E(inner)}`),
      del: L(`<b>지우기 제안</b> · ${E(inner)}`, `<b>Suggested deletion</b> · ${E(inner)}`),
      sub: L(`<b>바꾸기 제안</b> · ${E(inner.slice(0, at))} → ${E(inner.slice(at + 2))}`, `<b>Suggested change</b> · ${E(inner.slice(0, at))} → ${E(inner.slice(at + 2))}`),
      hl: L(`<b>표시</b> · ${E(inner)}`, `<b>Highlight</b> · ${E(inner)}`),
      cmt: L(`<b>메모</b> · ${E(inner)}`, `<b>Comment</b> · ${E(inner)}`),
    }[kind];
    const btns = kind === 'hl' ? `<button class="btn" data-a="1">${L('표시 지우기', 'Remove highlight')}</button>`
      : kind === 'cmt' ? `<button class="btn" data-a="1">${L('메모 지우기', 'Remove comment')}</button>`
      : `<button class="btn primary" data-a="1">✓ ${L('받아들이기', 'Accept')}</button><button class="btn" data-a="0">✕ ${L('버리기', 'Reject')}</button>`;
    cpop.innerHTML = `<div class="cp-what">${what}</div><div class="cp-btns">${btns}</div>`;
    cpop.hidden = false;
    cpopFor = node;
    node.classList.add('picked');
    const r = node.getBoundingClientRect(), w = cpop.offsetWidth, h = cpop.offsetHeight;
    cpop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
    cpop.style.top = (r.bottom + h + 12 < window.innerHeight ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
    cpop.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const accept = b.dataset.a === '1';
      // 그 표기가 원본의 몇 번째인지: 같은 글자의 표기 가운데 몇 번째인지로 찾음
      const same = [...el.doc.querySelectorAll('.critic[data-raw]')].filter((x) => !x.closest('.md-example') && x.dataset.raw === raw);
      const nth = same.indexOf(node);
      const mark = criticMarks(source()).filter((m) => m.raw === raw)[Math.max(0, nth)];
      hideCriticPop();
      if (!mark) { toast(L('원본에서 이 표기를 찾지 못했습니다', "Couldn't find this mark in the source")); return; }
      applyCritic([mark], accept);
      toast(kind === 'hl' || kind === 'cmt' ? L('지웠습니다 (Ctrl+Z 로 취소)', 'Removed (Ctrl+Z to undo)') : accept ? L('받아들였습니다 (Ctrl+Z 로 취소) · 저장해야 파일에 반영됩니다', 'Accepted (Ctrl+Z to undo) · save to write it to the file') : L('버렸습니다 (Ctrl+Z 로 취소) · 저장해야 파일에 반영됩니다', 'Rejected (Ctrl+Z to undo) · save to write it to the file'), 3200);
    }));
  }
  el.doc.addEventListener('click', (e) => {
    const node = e.target.closest('.critic[data-raw]');
    if (!node || node.closest('.md-example') || e.target.closest('a')) return;
    e.preventDefault();
    e.stopPropagation();
    if (cpopFor === node) { hideCriticPop(); return; }
    showCriticPop(node);
  });
  document.addEventListener('pointerdown', (e) => { if (!cpop.hidden && !cpop.contains(e.target) && !e.target.closest('.critic')) hideCriticPop(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cpop.hidden) { e.preventDefault(); e.stopImmediatePropagation(); hideCriticPop(); } }, true);
  el.preview.addEventListener('scroll', () => { if (!cpop.hidden) hideCriticPop(); }, { passive: true });
  // 문서 위: 「✎ 제안 N개 · 모두 받아들이기 · 모두 버리기」
  function paintCriticBar(src) {
    const marks = criticMarks(src), n = marks.filter((m) => m.kind === 'add' || m.kind === 'del' || m.kind === 'sub').length, c = marks.length - n;
    if (!marks.length || state.current.builtin) return;
    const row = document.createElement('div');
    row.className = 'meta-critic';
    row.innerHTML = `<span>✎ ${n ? L(`제안 ${n}개`, `${n} suggestion${n === 1 ? '' : 's'}`) : ''}${n && c ? ' · ' : ''}${c ? L(`메모 · 표시 ${c}개`, `${c} comment${c === 1 ? '' : 's'} · highlight${c === 1 ? '' : 's'}`) : ''}</span>` +
      (n ? `<button type="button" class="meta-btn" data-all="1">${L('모두 받아들이기', 'Accept all')}</button><button type="button" class="meta-btn" data-all="0">${L('모두 버리기', 'Reject all')}</button>` : '') +
      (c ? `<button type="button" class="meta-btn" data-all="c">${L('메모 · 표시 모두 지우기', 'Remove comments · highlights')}</button>` : '');
    row.querySelectorAll('[data-all]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.all, all = criticMarks(source());
      const pick = k === 'c' ? all.filter((m) => m.kind === 'cmt' || m.kind === 'hl') : all.filter((m) => m.kind !== 'cmt' && m.kind !== 'hl');
      if (!pick.length) return;
      const label = k === '1' ? L(`제안 ${pick.length}개를 모두 받아들일까요?`, `Accept all ${pick.length} suggestions?`) : k === '0' ? L(`제안 ${pick.length}개를 모두 버릴까요?`, `Reject all ${pick.length} suggestions?`) : L(`메모 · 표시 ${pick.length}개를 모두 지울까요?`, `Remove all ${pick.length} comments · highlights?`);
      if (!confirm(label + L('\n(Ctrl+Z 로 되돌릴 수 있고, 저장해야 파일에 반영됩니다)', '\n(Ctrl+Z undoes it; save to write it to the file)'))) return;
      applyCritic(pick, k !== '0');
      toast(L('바꿨습니다 (Ctrl+Z 로 취소) · 저장해야 파일에 반영됩니다', 'Done (Ctrl+Z to undo) · save to write it to the file'), 3200);
    }));
    el.docMeta.append(row);
  }

  // 폴더 목록 → 트리 구조
  function buildTree() {
    const rootNode = { name: '', path: '', dirs: new Map(), files: [], count: 0 };
    const ensureDir = (path) => {
      let node = rootNode;
      if (!path) return node;
      let acc = '';
      for (const seg of path.split('/')) {
        acc = joinRel(acc, seg);
        if (!node.dirs.has(seg)) node.dirs.set(seg, { name: seg, path: acc, dirs: new Map(), files: [], count: 0 });
        node = node.dirs.get(seg);
      }
      return node;
    };
    for (const r of state.roots) ensureDir(r.key);
    for (const d of state.extraDirs) ensureDir(d);
    for (const f of state.files) if (!f.loose && (side.showHidden || !hiddenBy(f.path))) ensureDir(parentOf(f.path)).files.push(f); // 숨긴 파일은 개수에서도 뺌
    const countUp = (n) => { n.count = n.files.length; for (const c of n.dirs.values()) n.count += countUp(c); return n.count; };
    countUp(rootNode);
    return rootNode;
  }

  function treeRow({ kind, name, path, depth, entry, count, closed, root, readonly, hidden }) {
    const row = document.createElement('div');
    row.className = 'tree-row ' + kind + (root ? ' root' : '') + (closed ? ' closed' : '') + (entry && entry === state.current ? ' current' : '') + (hidden ? ' is-hidden' : '');
    if (root) row.dataset.root = '1';
    row.setAttribute('role', 'treeitem');
    row.tabIndex = 0;
    row.style.setProperty('--indent', 6 + depth * 14 + 'px');
    row.dataset.kind = kind;
    row.dataset.path = path;
    let label = escapeHtml(name);
    if (side.filter && kind === 'file') {
      const t = prepName(name), m = textMatch(side.q, t, true);
      if (m) label = markText(t, m.at);
    }
    row.innerHTML = (kind === 'dir' ? ICON.chev : '<span style="width:14px;flex:none"></span>') + (kind === 'dir' ? ICON.dir : ICON.md) +
      `<span class="nm">${label}</span>` + (readonly ? `<span class="cnt" title="${L('읽기 전용 (Safari · Firefox 에서 연 폴더)', 'Read-only (folder opened in Safari · Firefox)')}">${L('읽기 전용', 'Read-only')}</span>` : '') + (kind === 'dir' ? `<span class="cnt">${count}</span>` : '') +
      `<button class="more" type="button" aria-label="${L('더 보기', 'More')}">${ICON.more}</button>`;
    row.title = (path || name) + (hidden ? L(' (사이드바에서 숨긴 항목)', ' (hidden from the sidebar)') : '');
    if (entry) row._entry = entry;
    return row;
  }

  function renderFileList() {
    svPrune();
    const box = el.fileList;
    box.innerHTML = '';
    const hasRoot = state.roots.length > 0;
    // 안내 문서는 늘 목록에 보임: 아무것도 안 열었을 때는 맨 위, 내 파일 · 폴더를 열면 맨 아래
    const mine = state.files.filter((f) => !f.builtin);
    const builtinFirst = !hasRoot && !mine.length;
    const loose = mine.filter((f) => f.loose || !hasRoot);
    const total = mine.length;
    const shownTotal = side.showHidden ? total : mine.filter((f) => (f.loose ? !f.sideHidden : !hiddenBy(f.path))).length;
    $('#fileCount').textContent = shownTotal ? shownTotal : '';
    $('#sideEmpty').hidden = total > 0 || hasRoot;
    $('#sideHead').hidden = !hasRoot && !total;
    $('#sideSearch').hidden = total < 6;
    $('#rootName').textContent = !hasRoot ? L('열린 파일', 'Open files') : state.roots.length === 1 ? state.roots[0].name : L(`작업 공간 · 폴더 ${state.roots.length}개`, `Workspace · ${state.roots.length} folders`);
    const canWrite = state.roots.some(writable);
    $('#sNewFile').hidden = !canWrite;
    $('#sRefresh').hidden = !canWrite;
    $('#sCollapse').hidden = !hasRoot;
    const q = side.filter;
    // 파일 이름으로 찾기: 대소문자 · 악센트 · 전각/반각 · 맥의 자모 쪼갬을 맞추고, 초성(ㄱㅎㅅ)으로도
    const nameHit = (name) => !!textMatch(side.q, prepName(name), true);
    const matches = (f) => !q || nameHit(f.name);
    const frag = document.createDocumentFragment();
    let shown = 0;

    if (hasRoot) {
      const tree = buildTree();
      const hasMatch = (n) => n.files.some(matches) || [...n.dirs.values()].some(hasMatch);
      const sortDirs = (n) => [...n.dirs.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
      const sortFiles = (n) => n.files.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko', { numeric: true }));
      const walk = (n, depth) => {
        const dirs = depth === 0 ? state.roots.map((r) => n.dirs.get(r.key)).filter(Boolean) : sortDirs(n); // 맨 위 폴더는 연 순서대로
        for (const d of dirs) {
          const isRoot = depth === 0;
          const hid = !isRoot && !!hiddenBy(d.path);
          if (hid && !side.showHidden) continue;
          if (q ? !hasMatch(d) : (!isRoot && d.count === 0 && !state.extraDirs.has(d.path))) continue;
          const closed = !q && side.collapsed.has(d.path);
          const r = isRoot && rootOf(d.path);
          frag.append(treeRow({ kind: 'dir', root: isRoot, name: isRoot ? r.name : d.name, path: d.path, depth, count: d.count, closed, readonly: isRoot && !writable(r), hidden: hid }));
          if (!closed) {
            walk(d, depth + 1);
            if (isRoot && !d.count && !d.dirs.size) {
              const p = document.createElement('div');
              p.className = 'tree-empty';
              p.style.paddingLeft = '34px';
              const nHidden = side.showHidden ? 0 : hiddenSet(rootOf(d.path)).size;
              p.textContent = nHidden ? L(`숨긴 항목만 있습니다 (${nHidden}개). ⋯ → 숨긴 항목 보기`, `Only hidden items (${nHidden}). ⋯ → Show hidden items`) : L('마크다운 파일이 없습니다.', 'No markdown files.');
              frag.append(p);
            }
          }
        }
        for (const f of sortFiles(n)) {
          if (!matches(f)) continue;
          frag.append(treeRow({ kind: 'file', name: f.name, path: f.path, depth, entry: f, hidden: side.showHidden && !!hiddenBy(f.path) }));
          shown++;
        }
      };
      walk(tree, 0);
    }
    const appendBuiltin = () => {
      const keys = Object.keys(BUILTIN).filter((k) => !q || nameHit(BUILTIN[k].title));
      if (!keys.length) return;
      const g = document.createElement('div');
      g.className = 'tree-group';
      g.textContent = L('markcont 안내 문서', 'markcont docs');
      frag.append(g);
      for (const key of keys) {
        shown++;
        const path = builtinPath(key);
        const row = treeRow({ kind: 'file', name: BUILTIN[key].title, path, depth: 0, entry: state.files.find((f) => f.builtin && f.path === path) });
        row.dataset.builtin = key;
        row.classList.add('builtin');
        row.querySelector('.more')?.remove();
        row.title = L('앱에 들어 있는 안내 문서입니다. 고친 내용은 새 파일로 저장됩니다.', 'A document that comes with the app. Your edits are saved as a new file.');
        frag.append(row);
      }
    };
    if (builtinFirst) appendBuiltin();
    const looseShown = loose.filter((f) => matches(f) && (side.showHidden || !f.sideHidden));
    const looseHidden = q ? 0 : loose.filter((f) => f.sideHidden).length;
    if (looseShown.length || looseHidden) {
      if (hasRoot) {
        const g = document.createElement('div');
        g.className = 'tree-group';
        g.textContent = L('따로 연 파일', 'Separately opened files');
        frag.append(g);
      }
      for (const f of looseShown) {
        const row = treeRow({ kind: 'file', name: f.name, path: f.path, depth: 0, entry: f, hidden: side.showHidden && !!f.sideHidden });
        const l = describeLocation(f);
        const sub = document.createElement('small');
        sub.className = 'row-sub';
        sub.textContent = f.tauriPath ? l.short : l.short === f.name ? L('위치는 브라우저가 알려주지 않음', 'Location hidden by the browser') : l.short;
        row.querySelector('.nm').append(sub);
        row.title = l.full || [f.name, l.note].filter(Boolean).join('\n');
        frag.append(row);
        shown++;
      }
      // 숨긴 따로 연 파일이 있으면 「숨긴 파일 N개 보기」 (맨 위 폴더가 없어도 다시 볼 수 있게)
      if (looseHidden) {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'tree-hint';
        t.textContent = side.showHidden ? L('숨긴 항목 다시 감추기', 'Stop showing hidden items') : L(`숨긴 파일 ${looseHidden}개 보기`, `Show ${looseHidden} hidden file${looseHidden === 1 ? '' : 's'}`);
        t.onclick = () => { side.showHidden = !side.showHidden; renderFileList(); };
        frag.append(t);
      }
    }
    if (!builtinFirst) appendBuiltin();
    if (q && !shown) {
      const p = document.createElement('div');
      p.className = 'tree-empty';
      p.textContent = L(`"${side.filter}"이(가) 들어간 파일이 없습니다.`, `No files containing "${side.filter}".`);
      frag.append(p);
    }
    box.append(frag);
    renderSideEmpty();
    updateSidebar();
    if (typeof syncMcpState === 'function') syncMcpState();
  }

  // 트리 클릭: 폴더 접기/펴기, 파일 열기, ⋯ 메뉴
  el.fileList.addEventListener('click', (e) => {
    const row = e.target.closest('.tree-row');
    if (!row) return;
    if (e.target.closest('.more')) { e.stopPropagation(); openCtxMenu(row, e.target.closest('.more').getBoundingClientRect()); return; }
    if (row.dataset.kind === 'dir') {
      const p = row.dataset.path;
      if (side.collapsed.has(p)) side.collapsed.delete(p); else side.collapsed.add(p);
      saveCollapsed();
      renderFileList();
      return;
    }
    if (row.dataset.builtin) { openBuiltinDoc(row.dataset.builtin); closeSidebar(); return; }
    if (row._entry) { openEntry(row._entry); closeSidebar(); }
  });
  el.fileList.addEventListener('keydown', (e) => {
    const row = e.target.closest('.tree-row');
    if (!row) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = [...el.fileList.querySelectorAll('.tree-row')];
      rows[rows.indexOf(row) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
    } else if (row.dataset.builtin) { /* 안내 문서는 이름 바꾸기 · 지우기 없음 */
    } else if (e.key === 'F2') { e.preventDefault(); fsRename(row.dataset.kind, row.dataset.path); }
    else if (e.key === 'Delete') { e.preventDefault(); fsDelete(row.dataset.kind, row.dataset.path); }
  });
  el.fileList.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.tree-row');
    e.preventDefault();
    if (row && row.dataset.builtin) return;
    openCtxMenu(row, { left: e.clientX, top: e.clientY, bottom: e.clientY });
  });
  let filterTimer;
  $('#treeFilter').addEventListener('input', (e) => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => { side.filter = e.target.value.trim(); side.q = prepText(side.filter); renderFileList(); }, 120);
  });
  $('#sCollapse').onclick = () => {
    const dirs = [...el.fileList.querySelectorAll('.tree-row.dir')].map((r) => r.dataset.path);
    if (side.collapsed.size) side.collapsed.clear();
    else buildTreeDirs().forEach((d) => side.collapsed.add(d));
    saveCollapsed();
    renderFileList();
    void dirs;
  };
  function buildTreeDirs() {
    const out = new Set(state.extraDirs);
    for (const f of state.files) { let p = parentOf(f.path); while (p) { out.add(p); p = parentOf(p); } }
    return out;
  }
  function revealCurrent() {
    if (!state.current || !state.roots.length) return;
    let p = parentOf(state.current.path), changed = false;
    while (p) { if (side.collapsed.delete(p)) changed = true; p = parentOf(p); }
    if (changed) saveCollapsed();
  }

  /* ---------- 사이드바 빈 화면: 폴더 놓는 칸, 최근 폴더 · 파일 ---------- */
  function fmtDate(t) {
    const d = new Date(t), now = new Date();
    if (d.toDateString() === now.toDateString()) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return LANG === 'en' ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }
  async function renderSideEmpty() {
    if ($('#sideEmpty').hidden) return;
    const rf = $('#recentFolders');
    const folders = await recentFolders();
    rf.innerHTML = '';
    if (folders.length) {
      rf.innerHTML = '<h3>' + L('최근 폴더', 'Recent folders') + '</h3>';
      for (const f of folders) {
        const row = treeRow({ kind: 'dir', name: f.name, path: '', depth: 0, count: fmtDate(f.time) });
        row.classList.add('recent');
        delete row.dataset.kind;
        row.querySelector('.chev')?.remove();
        row.querySelector('.more')?.remove();
        row.title = f.path || f.name;
        row.onclick = () => reopenFolder(f);
        rf.append(row);
      }
    }
    const rs = $('#recentFilesSide');
    const files = store.json('mdv-recent', []).filter((r) => !isBuiltinPath(r.name));
    rs.innerHTML = '';
    if (files.length) {
      rs.innerHTML = '<h3>' + L('최근 파일', 'Recent files') + '</h3>';
      for (const r of files.slice(0, 5)) {
        const row = treeRow({ kind: 'file', name: baseName(r.name), path: r.name, depth: 0 });
        row.querySelector('.more')?.remove();
        row.onclick = () => {
          let entry = state.files.find((f) => f.path === r.name);
          if (!entry && r.tauriPath && window.__TAURI__) { openTauriPaths([r.tauriPath]); return; }
          if (!entry) { entry = { name: baseName(r.name), path: r.name, text: r.text, loose: true, fromRecent: true }; state.files.push(entry); }
          openEntry(entry);
        };
        rs.append(row);
      }
    }
  }
  $('#sdFolder').onclick = () => pickFolder();
  $('#sdFile').onclick = () => $('#btnOpen').click();
  $('#sOpenFolder').onclick = () => pickFolder();
  const sideDrop = $('#sideDrop');
  ['dragenter', 'dragover'].forEach((t) => sideDrop.addEventListener(t, () => sideDrop.classList.add('over')));
  ['dragleave', 'drop'].forEach((t) => sideDrop.addEventListener(t, () => sideDrop.classList.remove('over')));

  /* ---------- 최근 폴더 기억 (Chrome · Edge: 폴더 핸들, PC 프로그램: 경로) · 웹 앱의 저장 기록 ---------- */
  const idb = {
    db: null,
    open() {
      if (this.db) return this.db;
      this.db = new Promise((res, rej) => {
        const r = indexedDB.open('markcont', 2);
        r.onupgradeneeded = () => {
          const db = r.result;
          if (!db.objectStoreNames.contains('folders')) db.createObjectStore('folders', { keyPath: 'name' });
          if (!db.objectStoreNames.contains('versions')) db.createObjectStore('versions', { keyPath: 'id', autoIncrement: true }).createIndex('key', 'key');
        };
        r.onsuccess = () => { const db = r.result; db.onversionchange = () => { db.close(); this.db = null; }; res(db); };
        r.onerror = () => rej(r.error);
        r.onblocked = () => rej(new Error('blocked')); // 예전 버전 창이 열려 있을 때
      });
      this.db.catch(() => { this.db = null; });
      return this.db;
    },
    async run(mode, fn, store = 'folders') {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error);
      });
    },
  };
  async function recentFolders() {
    let list = [];
    try { if (window.indexedDB && !isTauri()) list = (await idb.run('readonly', (s) => s.getAll())) || []; } catch {}
    list = list.concat(store.json('mdv-recent-folders', []));
    return list.sort((a, b) => b.time - a.time).slice(0, 6);
  }
  async function rememberFolder(root) {
    try {
      if (root.kind === 'handle' && window.indexedDB) {
        await idb.run('readwrite', (s) => s.put({ name: root.name, handle: root.handle, time: Date.now() }));
        const all = (await idb.run('readonly', (s) => s.getAll())) || [];
        for (const old of all.sort((a, b) => b.time - a.time).slice(6)) await idb.run('readwrite', (s) => s.delete(old.name));
      } else if (root.kind === 'tauri') {
        const list = store.json('mdv-recent-folders', []).filter((f) => f.path !== root.path);
        list.unshift({ name: root.name, path: root.path, time: Date.now() });
        store.set('mdv-recent-folders', JSON.stringify(list.slice(0, 6)));
      }
    } catch {}
  }
  async function reopenFolder(f) {
    try {
      if (f.handle) {
        const perm = await f.handle.requestPermission({ mode: 'read' });
        if (perm !== 'granted') { toast(L('폴더를 읽을 권한이 없습니다', 'No permission to read the folder')); return; }
        await openFolder({ kind: 'handle', handle: f.handle, name: f.handle.name });
      } else if (f.path) {
        await openFolder({ kind: 'tauri', path: f.path, name: f.name });
      }
    } catch { toast(L('이 폴더를 다시 열지 못했습니다. 폴더 열기로 다시 골라 주세요.', "Couldn't reopen this folder. Pick it again with Open folder."), 3500); }
  }

  /* ---------- 폴더 읽기 · 다시 읽기 ---------- */
  const isTauri = () => !!(window.__TAURI__ && window.__TAURI__.core);
  const tinvoke = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);
  // PC 프로그램의 파일 · 폴더 선택 창은 한 번에 하나만: 처음 창은 늦게 뜰 수 있어서, 그사이 다시 눌러도 또 열지 않음
  //  (예전에는 요청이 쌓여 창이 늦게 뜨거나 연달아 떴음). 이미 떠 있으면 undefined 를 돌려줘 부른 쪽이 그냥 끝남
  let pickerBusy = false;
  async function pickOnce(cmd, args) {
    if (pickerBusy) return undefined;
    pickerBusy = true;
    try { return await tinvoke(cmd, args); } finally { pickerBusy = false; }
  }
  // PC 프로그램: 파일 선택 창 제목 · 오류 문구도 화면 언어로
  if (isTauri()) tinvoke('set_lang', { lang: LANG }).catch(() => {});
  // 여러 폴더(작업 공간): 모든 경로는 "폴더이름/안쪽/경로" 처럼 맨 앞이 그 폴더의 이름(key)
  const rootOf = (path) => state.roots.find((r) => path === r.key || path.startsWith(r.key + '/')) || null;
  const relOf = (path) => { const r = rootOf(path); return !r || path === r.key ? '' : path.slice(r.key.length + 1); };
  const writable = (r) => !!r && (r.kind === 'handle' || r.kind === 'tauri');
  function absPath(path) {
    const root = rootOf(path), rel = relOf(path);
    const r = root.path.replace(/[\\/]+$/, '');
    const sep = r.includes('\\') ? '\\' : '/';
    return rel ? r + sep + rel.split('/').join(sep) : r;
  }
  // 「경로 복사」로 복사할 것: PC 프로그램은 탐색기 주소창에 그대로 붙여 넣을 수 있는 전체 경로 (따로 연 파일은 entry.tauriPath).
  // 브라우저는 컴퓨터 안의 전체 위치를 알려주지 않아서, 연 폴더 안의 경로만 (inFolder). 따로 연 파일 · 새 문서 · 안내 문서는 복사할 경로가 없음 (null)
  function copyPathOf(path, entry) {
    if (entry && entry.tauriPath) return { text: entry.tauriPath, inFolder: false };
    if (entry && entry.loose) return null;
    const root = rootOf(path);
    if (!root) return null;
    return root.kind === 'tauri' ? { text: absPath(path), inFolder: false } : { text: path, inFolder: true };
  }
  function copyPathLabel(cp) { return cp.inFolder ? L('폴더 안 경로 복사', 'Copy path in folder') : L('경로 복사', 'Copy path'); }
  function copyPath(cp) {
    copyText(cp.text).then(() => cp.inFolder
      ? toast(L('폴더 안 경로를 복사했습니다: ', 'Copied the path inside the folder: ') + cp.text + L(' (브라우저는 컴퓨터 안의 전체 위치를 알려주지 않습니다. 탐색기에서 쓸 전체 경로는 PC 프로그램에서 복사하세요)', " (the browser doesn't reveal the full location on your computer; copy it from the PC app to use in File Explorer)"), 5000)
      : toast(L('경로를 복사했습니다: ', 'Path copied: ') + cp.text));
  }
  async function scanFolder(root) {
    const files = [], assets = new Map(), dirs = new Set([root.key]);
    const pre = (rel) => root.key + '/' + rel;
    if (root.kind === 'tauri') {
      const res = await tinvoke('list_dir', { root: root.path });
      const r = root.path.replace(/[\\/]+$/, ''), sep = r.includes('\\') ? '\\' : '/';
      const abs = (rel) => r + sep + rel.split('/').join(sep);
      for (const p of res.files) files.push({ name: baseName(p), path: pre(p), tauriPath: abs(p), text: null });
      for (const p of res.assets) assets.set(pre(p), { tauriPath: abs(p) });
      for (const p of res.dirs) dirs.add(pre(p));
    } else if (root.kind === 'handle') {
      let count = 0;
      const walk = async (h, prefix, depth) => {
        for await (const [name, child] of h.entries()) {
          if (name.startsWith('.') || name === 'node_modules' || ++count > 20000) continue;
          const p = joinRel(prefix, name);
          if (child.kind === 'directory') { dirs.add(p); if (depth < 10) await walk(child, p, depth + 1); }
          else if (MD_EXT.test(name)) files.push({ name, path: p, handle: child, text: null });
          else if (ASSET_EXT.test(name)) assets.set(p, { handle: child });
        }
      };
      await walk(root.handle, root.key, 0);
    }
    return { files, assets, dirs };
  }
  async function sameFolder(a, b) {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'tauri') return a.path.replace(/[\\/]+$/, '').toLowerCase() === b.path.replace(/[\\/]+$/, '').toLowerCase();
    if (a.kind === 'handle' && a.handle.isSameEntry) { try { return await a.handle.isSameEntry(b.handle); } catch { return false; } }
    return false;
  }
  function uniqueKey(name) {
    const base = (name || '폴더').replace(/\//g, '-');
    let key = base, n = 2;
    while (state.roots.some((r) => r.key === key)) key = base + ' (' + (n++) + ')';
    return key;
  }
  // 폴더를 작업 공간에 더함
  async function addRoot(root, scan) {
    state.roots.push(root);
    for (const [k, v] of scan.assets) state.assets.set(k, v);
    for (const d of scan.dirs) state.dirs.add(d);
    state.files = state.files.concat(scan.files);
    side.collapsed.delete(root.key); saveCollapsed();
    side.filter = ''; side.q = []; $('#treeFilter').value = '';
    setSideTab('files');
    saveWorkspace();
    toast(state.roots.length > 1
      ? L(`'${root.name}' 폴더를 더했습니다 (마크다운 ${scan.files.length}개) · 지금 폴더 ${state.roots.length}개`, `Added folder '${root.name}' (${scan.files.length} markdown file${scan.files.length === 1 ? '' : 's'}) · ${state.roots.length} folders open`)
      : (scan.files.length ? L(`마크다운 파일 ${scan.files.length}개를 찾았습니다`, `Found ${scan.files.length} markdown file${scan.files.length === 1 ? '' : 's'}`) : L('이 폴더에는 마크다운 파일이 없습니다', 'No markdown files in this folder')), 3200);
    const mine = scan.files;
    const first = mine.find((e) => /\/readme\.md$/i.test(e.path) && e.path.split('/').length === 2) ||
      mine.find((e) => e.path.split('/').length === 2) || mine[0];
    if (first && (!state.current || state.current.loose)) await openEntry(first);
    else renderFileList();
    if (!state.current) showHome();
    if (window.innerWidth <= 900) { el.sidebar.classList.add('open'); el.scrim.classList.add('show'); }
  }
  async function openFolder(root, { quiet } = {}) {
    for (const r of state.roots) {
      if (await sameFolder(r, root)) {
        side.collapsed.delete(r.key); saveCollapsed(); renderFileList();
        if (!quiet) toast(L(`'${r.name}' 폴더는 이미 열려 있습니다`, `Folder '${r.name}' is already open`));
        return;
      }
    }
    if (!quiet) toast(L('폴더를 읽는 중…', 'Reading folder…'), 8000);
    root.key = uniqueKey(root.name);
    let scan;
    try { scan = await scanFolder(root); } catch (e) { toast(L('폴더를 읽지 못했습니다: ', "Couldn't read the folder: ") + (e.message || e), 4000); return; }
    rememberFolder(root);
    await addRoot(root, scan);
  }
  // 작업 공간에서 폴더 닫기 (파일은 지우지 않음)
  async function closeRoot(key) {
    const root = state.roots.find((r) => r.key === key);
    if (!root) return;
    const inside = (p) => p === key || p.startsWith(key + '/');
    const curInside = state.current && !state.current.loose && inside(state.current.path);
    if (curInside && state.dirty && !confirm(L('저장하지 않은 변경 사항이 있습니다. 버리고 폴더를 닫을까요?', 'You have unsaved changes. Discard them and close the folder?'))) return;
    state.roots = state.roots.filter((r) => r !== root);
    state.files = state.files.filter((f) => f.loose || !inside(f.path));
    for (const k of [...state.assets.keys()]) if (inside(k)) { const u = state.assetUrls.get(k); if (u) URL.revokeObjectURL(u); state.assets.delete(k); state.assetUrls.delete(k); }
    state.dirs = new Set([...state.dirs].filter((d) => !inside(d)));
    state.extraDirs = new Set([...state.extraDirs].filter((d) => !inside(d)));
    side.collapsed = new Set([...side.collapsed].filter((d) => !inside(d))); saveCollapsed();
    state.hist = state.hist.filter((e) => state.files.includes(e)); state.histPos = state.hist.length - 1; updateNav();
    saveWorkspace();
    if (curInside) {
      state.dirty = false;
      const next = state.files.find((f) => !f.loose) || state.files[0];
      if (next) await openEntry(next); else { state.current = null; showHome(); updateTitle(); }
    }
    renderFileList();
    toast(L(`'${root.name}' 폴더를 닫았습니다 (파일은 그대로 있습니다)`, `Closed folder '${root.name}' (files are untouched)`));
  }
  // PC 프로그램: 다음에 켤 때 같은 폴더들을 다시 열도록 기억
  function saveWorkspace() {
    if (!isTauri()) return;
    store.set('mdv-workspace', JSON.stringify(state.roots.filter((r) => r.kind === 'tauri').map((r) => ({ name: r.name, path: r.path }))));
  }
  // 폴더 안의 파일이 생기거나 지워지면 트리에 반영 (폴더마다)
  let refreshing = false;
  async function refreshRoot(root) {
    const scan = await scanFolder(root);
    if (!state.roots.includes(root)) return false;
    const inside = (p) => p === root.key || p.startsWith(root.key + '/');
    const mineOld = state.files.filter((f) => !f.loose && inside(f.path));
    const oldPaths = mineOld.map((f) => f.path).sort().join('\n');
    const newPaths = scan.files.map((f) => f.path).sort().join('\n');
    const oldDirs = [...state.dirs].filter(inside).sort().join('\n'), newDirs = [...scan.dirs].sort().join('\n');
    for (const [k, v] of scan.assets) if (!state.assets.has(k)) state.assets.set(k, v);
    if (oldPaths === newPaths && oldDirs === newDirs) return false;
    const keep = new Map(mineOld.map((f) => [f.path, f]));
    const merged = scan.files.map((f) => {
      const old = keep.get(f.path);
      if (!old) return f;
      if (f.handle) old.handle = f.handle;
      if (f.tauriPath) old.tauriPath = f.tauriPath; // 이름을 바꾼 뒤에도 옛 경로에 저장하지 않게
      return old;
    });
    state.files = state.files.filter((f) => f.loose || !inside(f.path)).concat(merged);
    state.dirs = new Set([...state.dirs].filter((d) => !inside(d)).concat([...scan.dirs]));
    for (const d of [...state.extraDirs]) if (inside(d) && !scan.dirs.has(d)) state.extraDirs.delete(d);
    if (state.current && !state.current.loose && inside(state.current.path) && !state.files.includes(state.current)) {
      toast(L('보고 있던 파일이 폴더에서 사라졌습니다', 'The file you were viewing is gone from the folder'), 3500);
    }
    return true;
  }
  async function refreshFolder({ quiet = false, only } = {}) {
    if (refreshing) return false;
    const targets = state.roots.filter((r) => writable(r) && (!only || r.key === only));
    if (!targets.length) return false;
    refreshing = true;
    let changed = false;
    try { for (const r of targets) { try { if (await refreshRoot(r)) changed = true; } catch {} } }
    finally { refreshing = false; }
    if (changed) renderFileList();
    if (!quiet) toast(changed ? L('폴더를 다시 읽었습니다', 'Folder reloaded') : L('바뀐 것이 없습니다', 'Nothing changed'));
    return changed;
  }
  $('#sRefresh').onclick = () => refreshFolder();
  setInterval(() => { if (!document.hidden && state.roots.length && !state.editing) refreshFolder({ quiet: true }); }, 5000);

  /* ---------- 오른쪽 클릭 메뉴: 새 문서 · 새 폴더 · 이름 바꾸기 · 삭제 ---------- */
  const CTX_ICONS = {
    open: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    newFile: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>',
    newDir: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
    rename: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    del: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.4 3.3M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/>',
    remove: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  };
  let ctxRow = null;
  function closeCtxMenu() { $('#ctxMenu').hidden = true; ctxRow?.classList.remove('ctx-target'); ctxRow = null; }
  function openCtxMenu(row, rect) {
    closeMenus();
    closeCtxMenu();
    const m = $('#ctxMenu');
    const kind = row ? row.dataset.kind : 'empty';      // file · dir · empty(빈 곳)
    const isRootRow = !!(row && row.dataset.root);
    const path = row ? row.dataset.path : '';
    const entry = row && row._entry;
    const isLoose = entry && entry.loose;
    const root = row && !isLoose ? rootOf(path) : null;
    const canWrite = writable(root);
    const dirForNew = kind === 'dir' ? path : kind === 'file' && !isLoose ? parentOf(path) : '';
    const items = [];
    const add = (id, label, icon, opts = {}) => items.push({ id, label, icon, ...opts });
    if (kind === 'empty') {
      add('addRoot', state.roots.length ? L('폴더 더하기', 'Add folder') : L('폴더 열기', 'Open folder'), 'newDir');
      if (state.roots.length > 1) add('collapseAll', L('모든 폴더 접기', 'Collapse all folders'), 'open');
      const nHid = hiddenTotal();
      if (side.showHidden) add('toggleHidden', L('숨긴 항목 다시 감추기', 'Stop showing hidden items'), 'eyeOff');
      else if (nHid) add('toggleHidden', L(`숨긴 항목 보기 (${nHid}개)`, `Show hidden items (${nHid})`), 'eye');
    }
    if (kind === 'file') add('open', L('열기', 'Open'), 'open');
    if (canWrite && !isLoose) {
      add('newFile', L('새 문서', 'New document'), 'newFile');
      add('newDir', L('새 폴더', 'New folder'), 'newDir');
      if (kind !== 'empty' && !isRootRow) { add('sep'); add('rename', L('이름 바꾸기', 'Rename'), 'rename', { kbd: 'F2' }); }
    }
    if (isRootRow && canWrite) add('refresh', L('다시 읽기', 'Reload'), 'open');
    const cp = kind !== 'empty' ? copyPathOf(path, entry) : null;
    if (cp) add('copy', copyPathLabel(cp), 'copy');
    // 사이드바에서 숨기기 (파일은 그대로) · 숨긴 것은 다시 보이기. 읽기 전용 폴더에서도 됨
    const canHide = !!root && !isRootRow && kind !== 'empty';
    const canDel = canWrite && !isLoose && kind !== 'empty' && !isRootRow;
    const hid = canHide ? hiddenBy(path) : '';
    const looseHide = isLoose && kind === 'file'; // 따로 연 파일: 이번에만 숨김
    if (canHide || canDel || looseHide) add('sep');
    if (looseHide) add(entry.sideHidden ? 'unhideLoose' : 'hideLoose', entry.sideHidden ? L('다시 보이기', 'Show again') : L('사이드바에서 숨기기', 'Hide from sidebar'), entry.sideHidden ? 'eye' : 'eyeOff');
    if (looseHide) add('removeLoose', L('목록에서 빼기 (파일은 그대로)', 'Remove from list (file stays)'), 'remove');
    if (canHide && !hid) add('hide', L('사이드바에서 숨기기', 'Hide from sidebar'), 'eyeOff');
    else if (canHide && hid === relOf(path)) add('unhide', L('다시 보이기', 'Show again'), 'eye');
    else if (canHide) add('unhideParent', L(`'${baseName(hid)}' 폴더 다시 보이기`, `Show the '${baseName(hid)}' folder again`), 'eye');
    if (canDel) add('delete', isTauri() ? L('휴지통으로 보내기', 'Move to Trash') : L('삭제', 'Delete'), 'del', { danger: true, kbd: 'Del' });
    if (isRootRow) {
      const n = hiddenSet(root).size;
      add('sep');
      if (side.showHidden) add('toggleHidden', L('숨긴 항목 다시 감추기', 'Stop showing hidden items'), 'eyeOff');
      else if (n) add('toggleHidden', L(`숨긴 항목 보기 (${n}개)`, `Show hidden items (${n})`), 'eye');
      add('closeRoot', L('이 폴더 닫기 (파일은 그대로)', 'Close this folder (files stay)'), 'remove');
    }
    m.innerHTML = '';
    for (const it of items) {
      if (it.id === 'sep') { m.append(document.createElement('hr')); continue; }
      const b = document.createElement('button');
      b.className = 'menu-item' + (it.danger ? ' danger' : '');
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CTX_ICONS[it.icon]}</svg>${it.label}` + (it.kbd ? `<kbd>${it.kbd}</kbd>` : '');
      b.onclick = () => {
        closeCtxMenu();
        if (it.id === 'open') openEntry(entry);
        else if (it.id === 'newFile') fsNewFile(dirForNew);
        else if (it.id === 'newDir') fsNewFolder(dirForNew);
        else if (it.id === 'rename') fsRename(kind, path);
        else if (it.id === 'delete') fsDelete(kind, path);
        else if (it.id === 'copy') copyPath(cp);
        else if (it.id === 'hide') hideInSidebar(path);
        else if (it.id === 'hideLoose') hideLooseInSidebar(entry);
        else if (it.id === 'removeLoose') removeLooseFromList(entry);
        else if (it.id === 'unhideLoose') { entry.sideHidden = false; renderFileList(); toast(L('다시 보이게 했습니다: ', 'Showing again: ') + entry.name); }
        else if (it.id === 'unhide' || it.id === 'unhideParent') { const p = it.id === 'unhide' ? path : root.key + '/' + hid; setHidden(p, false); renderFileList(); toast(L('다시 보이게 했습니다: ', 'Showing again: ') + baseName(p)); }
        else if (it.id === 'toggleHidden') { side.showHidden = !side.showHidden; renderFileList(); }
        else if (it.id === 'addRoot') pickFolder();
        else if (it.id === 'collapseAll') { state.roots.forEach((r) => side.collapsed.add(r.key)); saveCollapsed(); renderFileList(); }
        else if (it.id === 'refresh') refreshFolder({ only: root.key });
        else if (it.id === 'closeRoot') closeRoot(root.key);
      };
      m.append(b);
    }
    if (!canWrite && root && !isLoose) {
      const note = document.createElement('div');
      note.className = 'ctx-note';
      note.textContent = L('새로 만들기 · 이름 바꾸기 · 삭제는 PC 프로그램이나 Chrome · Edge에서 폴더 열기로 연 폴더에서만 됩니다.', 'Create, rename and delete work only in the PC app, or in Chrome · Edge for folders opened with Open folder.');
      m.append(note);
    }
    if (!m.childElementCount) return;
    m.hidden = false;
    const w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(rect.left, innerWidth - w - 8)) + 'px';
    m.style.top = (rect.bottom + h + 8 > innerHeight ? Math.max(8, rect.top - h - 4) : rect.bottom + 4) + 'px';
    if (row) { row.classList.add('ctx-target'); ctxRow = row; }
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('#ctxMenu')) closeCtxMenu(); });
  window.addEventListener('blur', closeCtxMenu);
  el.preview.addEventListener('scroll', closeCtxMenu, { passive: true });
  $('#filesSection').addEventListener('scroll', closeCtxMenu, { passive: true });

  /* ---------- 파일 · 폴더 만들기, 이름 바꾸기, 지우기 ---------- */
  const BAD_NAME = /[\\/:*?"<>|]/;
  function askName(title, def) {
    const v = prompt(title, def);
    if (v == null) return null;
    const name = v.trim();
    if (!name || name === '.' || name === '..' || BAD_NAME.test(name)) { toast(L('이름에 \\ / : * ? " < > | 는 쓸 수 없습니다', 'Names can\'t contain \\ / : * ? " < > |'), 3500); return null; }
    return name;
  }
  async function ensureWrite(root) {
    if (root.kind !== 'handle') return true;
    const p = await root.handle.requestPermission({ mode: 'readwrite' });
    if (p !== 'granted') { toast(L('폴더를 고칠 권한을 받지 못했습니다', "Didn't get permission to change the folder")); return false; }
    return true;
  }
  async function dirHandleFor(path) {
    let h = rootOf(path).handle;
    const rel = relOf(path);
    if (rel) for (const seg of rel.split('/')) h = await h.getDirectoryHandle(seg);
    return h;
  }
  async function exists(dir, name) {
    if (rootOf(dir).kind === 'tauri') return state.files.some((f) => f.path === joinRel(dir, name)) || state.dirs.has(joinRel(dir, name));
    const dh = await dirHandleFor(dir);
    for await (const n of dh.keys()) if (n.toLowerCase() === name.toLowerCase()) return true;
    return false;
  }
  function openDirInTree(dir) { let p = dir, ch = false; while (p) { if (side.collapsed.delete(p)) ch = true; p = parentOf(p); } if (ch) saveCollapsed(); }

  async function fsNewFile(dir, tpl) {
    tpl = tpl || await pickTemplate();
    if (!tpl) return;
    let name = askName(L('새 문서 이름', 'New document name'), tpl.name + '.md');
    if (!name) return;
    if (!/\.[A-Za-z0-9]+$/.test(name)) name += '.md';
    const rel = joinRel(dir, name);
    const root = rootOf(dir);
    if (!writable(root)) return;
    const text = withEol(fillTemplate(tpl.text, name.replace(MD_EXT, '')), tpl.eol); // 폴더 템플릿이 \r\n 이면 새 문서도 (인코딩은 늘 BOM 없는 UTF-8)
    try {
      if (!(await ensureWrite(root))) return;
      if (await exists(dir, name)) { toast(L('같은 이름이 이미 있습니다', 'That name is already taken')); return; }
      if (root.kind === 'tauri') await tinvoke('create_file', { path: absPath(rel), text });
      else {
        const fh = await (await dirHandleFor(dir)).getFileHandle(name, { create: true });
        const w = await fh.createWritable(); await w.write(text); await w.close();
      }
    } catch (e) { toast(L('새 문서를 만들지 못했습니다: ', "Couldn't create the document: ") + (e.message || e), 4000); return; }
    openDirInTree(dir);
    await refreshFolder({ quiet: true, only: root.key });
    const entry = state.files.find((f) => f.path === rel);
    if (entry && await openEntry(entry)) setEditing(true);
    toast(L('새 문서를 만들었습니다: ', 'Created document: ') + rel);
  }
  async function fsNewFolder(dir) {
    const name = askName(L('새 폴더 이름', 'New folder name'), L('새 폴더', 'New folder'));
    if (!name) return;
    const rel = joinRel(dir, name);
    const root = rootOf(dir);
    try {
      if (!(await ensureWrite(root))) return;
      if (await exists(dir, name)) { toast(L('같은 이름이 이미 있습니다', 'That name is already taken')); return; }
      if (root.kind === 'tauri') await tinvoke('create_dir', { path: absPath(rel) });
      else await (await dirHandleFor(dir)).getDirectoryHandle(name, { create: true });
    } catch (e) { toast(L('새 폴더를 만들지 못했습니다: ', "Couldn't create the folder: ") + (e.message || e), 4000); return; }
    state.extraDirs.add(rel);
    openDirInTree(rel);
    await refreshFolder({ quiet: true, only: root.key });
    state.extraDirs.add(rel);
    renderFileList();
    toast(L('새 폴더를 만들었습니다: ', 'Created folder: ') + rel);
  }
  const under = (p, base) => p === base || p.startsWith(base + '/');
  async function fsRename(kind, path) {
    const root = path && rootOf(path);
    if (!writable(root) || path === root.key) return; // 맨 위 폴더 이름은 바꾸지 않음
    const oldName = baseName(path);
    if (state.dirty && state.current && under(state.current.path, path)) { toast(L('먼저 지금 문서를 저장해 주세요', 'Save the current document first')); return; }
    const name = askName(kind === 'dir' ? L('새 폴더 이름', 'New folder name') : L('새 파일 이름', 'New file name'), oldName);
    if (!name || name === oldName) return;
    const dir = parentOf(path), rel = joinRel(dir, name);
    const curPath = state.current && !state.current.loose ? state.current.path : null;
    // 이 이름을 가리키는 링크를 미리 모아 둠 (바꾼 뒤 새 이름으로 고칠지 물음)
    let incoming = [];
    try { incoming = await linksInto(path, kind); } catch {}
    try {
      if (!(await ensureWrite(root))) return;
      if (name.toLowerCase() !== oldName.toLowerCase() && await exists(dir, name)) { toast(L('같은 이름이 이미 있습니다', 'That name is already taken')); return; }
      if (root.kind === 'tauri') await tinvoke('rename_path', { from: absPath(path), to: absPath(rel) });
      else if (kind === 'file') {
        const entry = state.files.find((f) => f.path === path);
        const fh = entry.handle;
        if (fh.move) await fh.move(name);
        else {
          const f = await fh.getFile(); // 글자 · 줄 끝이 바뀌지 않게 파일을 그대로 옮겨 씀
          const dh = await dirHandleFor(dir);
          const nh = await dh.getFileHandle(name, { create: true });
          const w = await nh.createWritable(); await w.write(f); await w.close();
          await dh.removeEntry(oldName);
        }
      } else {
        const dh = await dirHandleFor(path);
        if (!dh.move) { toast(L('이 브라우저에서는 폴더 이름을 바꿀 수 없습니다. PC 프로그램을 써 주세요.', "This browser can't rename folders. Please use the PC app."), 4000); return; }
        await dh.move(name);
      }
    } catch (e) { toast(L('이름을 바꾸지 못했습니다: ', "Couldn't rename: ") + (e.message || e), 4000); return; }
    await vers.moved(path, rel, kind === 'dir');
    // 접힘 상태와 보고 있던 파일 경로를 새 이름으로 옮김
    const moveP = (p) => (under(p, path) ? rel + p.slice(path.length) : p);
    side.collapsed = new Set([...side.collapsed].map(moveP)); saveCollapsed();
    moveHidden(root, path, rel);
    state.extraDirs = new Set([...state.extraDirs].map(moveP));
    for (const f of state.files) if (!f.loose && under(f.path, path)) {
      f.path = moveP(f.path);
      f.name = baseName(f.path);
      if (f.tauriPath && root.kind === 'tauri') f.tauriPath = absPath(f.path); // PC 프로그램: 다음 저장이 옛 경로로 가지 않게
      gs.cache.delete(f);
    }
    await refreshFolder({ quiet: true, only: root.key });
    if (curPath && under(curPath, path)) {
      const now = state.files.find((f) => f.path === moveP(curPath));
      if (now) { state.current = now; updateTitle(); updateMeta(source()); syncMcpState(); }
    }
    renderFileList();
    toast(L('이름을 바꿨습니다: ', 'Renamed: ') + rel);
    if (incoming.length) offerRenameFix(incoming, path, rel).catch(() => {});
  }
  async function fsDelete(kind, path) {
    const root = path && rootOf(path);
    if (!writable(root) || path === root.key) return; // 맨 위 폴더는 '닫기'로만
    const name = baseName(path);
    const n = kind === 'dir' ? state.files.filter((f) => !f.loose && under(f.path, path)).length : 0;
    const what = kind === 'dir' ? L(`'${name}' 폴더${n ? `(마크다운 파일 ${n}개 포함)` : ''}`, `the folder '${name}'${n ? ` (${n} markdown file${n === 1 ? '' : 's'})` : ''}`) : `'${name}'`;
    const msg = isTauri()
      ? L(`${what}를 휴지통으로 보낼까요?\n휴지통에서 되살릴 수 있습니다.`, `Move ${what} to the Trash?\nYou can restore it from the Trash.`)
      : L(`${what}를 지울까요?\n\n주의: 브라우저에서 지운 파일은 휴지통으로 가지 않고 완전히 지워집니다. 되살릴 수 없습니다.`, `Delete ${what}?\n\nWarning: files deleted in the browser don't go to the Trash. They can't be restored.`);
    if (!confirm(msg)) return;
    try {
      if (!(await ensureWrite(root))) return;
      if (root.kind === 'tauri') await tinvoke('delete_path', { path: absPath(path) });
      else await (await dirHandleFor(parentOf(path))).removeEntry(name, { recursive: kind === 'dir' });
    } catch (e) { toast(L('지우지 못했습니다: ', "Couldn't delete: ") + (e.message || e), 4000); return; }
    const wasCurrent = state.current && !state.current.loose && under(state.current.path, path);
    for (const d of [...state.extraDirs]) if (under(d, path)) state.extraDirs.delete(d);
    moveHidden(root, path, null);
    state.files = state.files.filter((f) => f.loose || !under(f.path, path));
    if (wasCurrent) {
      state.dirty = false;
      const next = state.files.find((f) => !f.loose);
      if (next) await openEntry(next); else { state.current = null; showHome(); updateTitle(); }
    }
    await refreshFolder({ quiet: true, only: root.key });
    renderFileList();
    toast(isTauri() ? L('휴지통으로 보냈습니다: ', 'Moved to Trash: ') + name : L('지웠습니다: ', 'Deleted: ') + name);
  }

  /* ---------- 사이드바 폭 조절 · 접기 ---------- */
  const savedW = +store.get('mdv-side-w');
  if (savedW) document.documentElement.style.setProperty('--side-w', savedW + 'px');
  if (store.get('mdv-side-collapsed') === '1') document.body.classList.add('side-collapsed');
  $('#sideResizer').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rz = e.currentTarget;
    rz.setPointerCapture(e.pointerId);
    rz.classList.add('drag');
    document.body.classList.add('resizing');
    const move = (ev) => {
      const w = Math.max(200, Math.min(560, ev.clientX - el.sidebar.getBoundingClientRect().left));
      document.documentElement.style.setProperty('--side-w', w + 'px');
      store.set('mdv-side-w', String(Math.round(w)));
      lineTops = null;
    };
    const up = () => {
      rz.classList.remove('drag');
      document.body.classList.remove('resizing');
      rz.removeEventListener('pointermove', move);
      rz.removeEventListener('pointerup', up);
      if (state.editing) syncHlWidth();
    };
    rz.addEventListener('pointermove', move);
    rz.addEventListener('pointerup', up);
  });
  $('#sideResizer').addEventListener('dblclick', () => { document.documentElement.style.removeProperty('--side-w'); store.set('mdv-side-w', ''); });

  async function inWorkspace(e) {
    for (const r of state.roots) {
      try {
        if (e.handle && r.kind === 'handle' && r.handle.resolve) {
          const segs = await r.handle.resolve(e.handle);
          if (segs && segs.length) return state.files.find((f) => !f.loose && f.path === r.key + '/' + segs.join('/')) || null;
        }
        if (e.tauriPath && r.kind === 'tauri') {
          const base = r.path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() + '/';
          const full = e.tauriPath.replace(/\\/g, '/');
          if (full.toLowerCase().startsWith(base)) return state.files.find((f) => !f.loose && f.path === r.key + '/' + full.slice(base.length)) || null;
        }
      } catch {}
    }
    return null;
  }
  async function addFiles(entries, replace) {
    if (!entries.length) { toast(L('마크다운 파일(.md)을 찾지 못했습니다', 'No markdown (.md) files found')); return; }
    if (!replace && state.roots.length) {
      const kept = [];
      let hit = null;
      for (const e of entries) { const w = await inWorkspace(e); if (w) hit = hit || w; else kept.push(e); }
      if (hit && !kept.length) { toast(L('열어 둔 폴더 안의 파일이라 그 폴더에서 엽니다', 'This file is in an open folder, so it opens there')); openEntry(hit); return; }
      entries = kept.length ? kept : entries;
    }
    if (replace) { state.files = []; state.hist = []; state.histPos = -1; }
    for (const e of entries) {
      e.loose = true; // 폴더와 상관없이 따로 연 파일
      const i = state.files.findIndex((f) => f.loose && f.path === e.path);
      if (i >= 0) state.files[i] = e; else state.files.push(e);
    }
    state.files.sort((a, b) => a.path.localeCompare(b.path, 'ko', { numeric: true }));
    const first = entries.find((e) => /(^|\/)readme\.md$/i.test(e.path)) || entries.find((e) => !e.path.includes('/')) || entries[0];
    openEntry(first);
  }

  /* ---------- 읽던 위치 기억 (문서마다) ---------- */
  // 화면 맨 위에 걸친 블록의 원본 줄 번호로 남김: 글자 크기 · 폭 · 창 크기가 바뀌어도 같은 곳으로 돌아감
  const READ_KEY = 'mdv-readpos';
  let readTimer = 0, readPath = '';
  function saveReadPos() {
    clearTimeout(readTimer);
    const cur = state.current;
    if (!cur || cur.isNew || cur.path !== readPath || !el.preview.clientHeight) return; // 편집만 보기처럼 결과가 안 보이면 그대로 둠
    const top = el.preview.getBoundingClientRect().top;
    let line = 0;
    for (const n of el.doc.querySelectorAll('[data-line]')) {
      if (n.getBoundingClientRect().bottom > top + 8) { line = +n.dataset.line || 0; break; }
    }
    const all = store.json(READ_KEY, {});
    if (line > 0) all[cur.path] = { line, t: Date.now() }; else delete all[cur.path];
    const keys = Object.keys(all);
    if (keys.length > 300) keys.sort((a, b) => all[a].t - all[b].t).slice(0, keys.length - 300).forEach((k) => delete all[k]);
    store.set(READ_KEY, JSON.stringify(all));
  }
  el.preview.addEventListener('scroll', () => { clearTimeout(readTimer); readTimer = setTimeout(saveReadPos, 400); }, { passive: true });
  function restoreReadPos() {
    const cur = state.current;
    readPath = cur ? cur.path : '';
    const p = cur && store.json(READ_KEY, {})[cur.path];
    if (!p || !p.line) return;
    const go = () => {
      let best = null;
      for (const n of el.doc.querySelectorAll('[data-line]')) { const l = +n.dataset.line; if (l <= p.line && (!best || l >= +best.dataset.line)) best = n; }
      if (!best || !best.offsetParent) return null;
      el.preview.scrollTop += best.getBoundingClientRect().top - el.preview.getBoundingClientRect().top - 8;
      return el.preview.scrollTop;
    };
    const at = go();
    // 그림 · 다이어그램이 늦게 그려져 자리가 밀리면 한 번 더 (그사이 다른 곳으로 옮겨 갔으면 그대로 둠)
    if (at != null) setTimeout(() => { if (state.current === cur && Math.abs(el.preview.scrollTop - at) < 2) go(); }, 450);
  }

  async function openEntry(entry, { fromHistory = false } = {}) {
    if (state.dirty && entry !== state.current && !confirm(L('저장하지 않은 변경 사항이 있습니다. 버리고 다른 파일을 열까요?', 'You have unsaved changes. Discard them and open another file?'))) return false;
    if (state.current && entry !== state.current) saveReadPos(); // 떠나는 문서의 위치를 먼저 남김
    if (entry.text == null) {
      try {
        if (entry.tauriPath && !entry.file && !entry.handle) {
          const f = await window.__TAURI__.core.invoke('read_file', { path: entry.tauriPath });
          entry.text = f.text;
          setFmt(entry, f);
          entry.lastModified = f.modified;
        } else {
          const f = await entryFile(entry);
          const d = await readDoc(f);
          entry.text = d.text;
          setFmt(entry, d);
          entry.lastModified = f.lastModified;
        }
      } catch {
        toast(L('파일을 읽지 못했습니다', "Couldn't read the file"));
        return false;
      }
    } else if (entry.text.includes('\r')) {
      // 최근 문서 기록처럼 파일이 아닌 곳에서 받은 글도 편집창과 같게 \n 으로
      entry.eol = entry.eol || eolOf(entry.text);
      entry.text = toLF(entry.text);
    }
    state.current = entry;
    state.dirty = false;
    if (!entry.history) entry.history = [{ t: Date.now(), text: entry.text, label: L('열었을 때', 'Opened'), saved: true }];
    el.editor.value = entry.text;
    el.welcome.hidden = true;
    el.workspace.hidden = false;
    [el.btnEdit, $('#mZen'), $('#mFoldAll'), $('#mExportSub'), $('#mExport'), $('#mPortable'), $('#mPrint'), $('#mFind'), $('#mPresent'), $('#mDocx'), $('#mCopyRich')].forEach((b) => (b.disabled = false));
    document.body.classList.add('has-doc');
    if (!fromHistory) {
      state.hist = state.hist.slice(0, state.histPos + 1);
      if (state.hist[state.histPos] !== entry) { state.hist.push(entry); state.histPos = state.hist.length - 1; }
    }
    updateNav();
    render();
    el.preview.scrollTop = 0;
    el.editor.scrollTop = 0;
    restoreReadPos(); // 읽던 곳으로 (링크의 #제목으로 열면 부른 쪽이 그 뒤에 옮김)
    revealCurrent();
    renderFileList();
    el.fileList.querySelector('.tree-row.current')?.scrollIntoView({ block: 'nearest' });
    updateTitle();
    remember(entry);
    return true;
  }

  function updateNav() {
    $('#navBtns').hidden = state.hist.length < 2;
    $('#btnBack').disabled = state.histPos <= 0;
    $('#btnFwd').disabled = state.histPos >= state.hist.length - 1;
  }
  async function goHistory(step) {
    const to = state.histPos + step;
    if (to < 0 || to >= state.hist.length) return;
    if (await openEntry(state.hist[to], { fromHistory: true })) { state.histPos = to; updateNav(); }
  }
  $('#btnBack').onclick = () => goHistory(-1);
  $('#btnFwd').onclick = () => goHistory(1);

  /* ---------- 최근 문서 ---------- */
  function remember(entry) {
    if (entry.builtin) return; // 안내 문서는 최근 문서에 남기지 않음
    let list = store.json('mdv-recent', []).filter((r) => !isBuiltinPath(r.name)).filter((r) => r.name !== entry.path);
    if (entry.text.length < 300000) list.unshift({ name: entry.path, text: entry.text, time: Date.now(), tauriPath: entry.tauriPath || undefined });
    list = list.slice(0, 6);
    while (list.length && !store.set('mdv-recent', JSON.stringify(list))) list.pop();
  }
  function renderRecent() {
    const list = store.json('mdv-recent', []).filter((r) => !isBuiltinPath(r.name));
    const box = $('#recent');
    box.innerHTML = '';
    box.hidden = !list.length;
    if (!list.length) return;
    const h = document.createElement('h2');
    h.textContent = L('최근 문서', 'Recent documents');
    box.append(h);
    for (const r of list) {
      const b = document.createElement('button');
      const d = new Date(r.time);
      b.innerHTML = '<span></span><span></span>';
      b.firstChild.textContent = r.name;
      b.lastChild.textContent = (LANG === 'en' ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : `${d.getMonth() + 1}월 ${d.getDate()}일`) + ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      b.title = L('마지막으로 열었을 때 저장해 둔 내용을 보여줍니다', 'Shows the content saved when you last opened it');
      b.onclick = () => openRecent(r);
      box.append(b);
    }
  }
  function openRecent(r) {
    let entry = state.files.find((f) => f.path === r.name);
    if (!entry && r.tauriPath && window.__TAURI__) { openTauriPaths([r.tauriPath]); return; }
    if (!entry) { entry = { name: baseName(r.name), path: r.name, text: r.text, loose: true, fromRecent: true }; state.files.push(entry); }
    openEntry(entry);
  }
  function showHome() {
    el.welcome.hidden = false;
    el.workspace.hidden = true;
    document.body.classList.remove('has-doc');
    svClose();
    closeFind();
    renderRecent();
  }
  $('#btnHome').onclick = () => { if (state.current) showHome(); };
  renderRecent();

  /* ---------- 파일 · 폴더 열기 ---------- */
  async function pickFiles() {
    if (window.showOpenFilePicker) {
      try {
        const handles = await showOpenFilePicker({
          multiple: true,
          types: [{ description: L('마크다운', 'Markdown'), accept: { 'text/plain': ['.md', '.markdown', '.mdown', '.mkd', '.txt'] } }],
        });
        addFiles(handles.map((h) => ({ name: h.name, path: h.name, handle: h, text: null })), false);
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    el.fileInput.click();
  }
  el.fileInput.onchange = () => {
    const entries = [...el.fileInput.files].filter((f) => MD_EXT.test(f.name)).map((f) => ({ name: f.name, path: f.name, file: f, text: null }));
    el.fileInput.value = '';
    addFiles(entries, false);
  };

  async function pickFolder() {
    closeMenus();
    if (isTauri()) {
      try {
        const path = await pickOnce('pick_folder');
        if (path) await openFolder({ kind: 'tauri', path, name: path.split(/[\\/]/).filter(Boolean).pop() || path });
      } catch (e) { toast(L('폴더 선택 창을 열지 못했습니다: ', "Couldn't open the folder picker: ") + e, 4000); }
      return;
    }
    if (window.showDirectoryPicker) {
      try {
        const dir = await showDirectoryPicker({ mode: 'read' });
        await loadDirHandle(dir);
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    el.folderInput.click();
  }
  async function loadDirHandle(dir) {
    return openFolder({ kind: 'handle', handle: dir, name: dir.name });
  }
  // 폴더 선택 창을 못 쓰는 브라우저(Safari · Firefox): 폴더를 한 번에 읽기만 함
  el.folderInput.onchange = async () => {
    const all = [...el.folderInput.files];
    el.folderInput.value = '';
    if (!all.length) return;
    const rootName = all[0].webkitRelativePath.split('/')[0] || '폴더';
    const root = { kind: 'input', name: rootName };
    root.key = uniqueKey(rootName);
    const files = [], assets = new Map(), dirs = new Set([root.key]);
    for (const f of all) {
      const rel = f.webkitRelativePath.split('/').slice(1).join('/');
      if (/(^|\/)(node_modules|\.git)\//.test(rel) || rel.split('/').some((x) => x.startsWith('.'))) continue;
      const path = root.key + '/' + rel;
      for (let d = parentOf(path); d; d = parentOf(d)) dirs.add(d);
      if (MD_EXT.test(f.name)) files.push({ name: f.name, path, file: f, text: null });
      else if (ASSET_EXT.test(f.name)) assets.set(path, { file: f });
    }
    await addRoot(root, { files, assets, dirs });
  };

  /* ---------- 새 문서 템플릿 ---------- */
  // 작성 규칙(맨 위 제목 하나는 이모지 없이 · ## 단락마다 이모지 · 단락 사이 ---)을 따르는 뼈대 + 열어 둔 폴더의 templates/ · 템플릿/ 안 문서
  //  - {{title}} · {{date}} · {{time}} 을 채움 (한국어 {{제목}} · {{날짜}} · {{시간}} 도). 날짜는 나라마다 읽는 순서가 다른 11/7 대신 2026-11-07
  const pad2 = (n) => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
  const nowTime = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const fillTemplate = (text, title) => text
    .replace(/\{\{\s*(?:title|제목)\s*\}\}/gi, () => title)
    .replace(/\{\{\s*(?:date|날짜)\s*\}\}/gi, today)
    .replace(/\{\{\s*(?:time|시간)\s*\}\}/gi, nowTime);
  function builtinTemplates() {
    const F = '```', ko = LANG === 'ko';
    const flow = ko
      ? ['A-01 | 유저 | 시작·종료 | 시작 | → A-02', 'A-02 | 유저 | 입력 | 버튼 누르기 | → A-03', 'A-03 | 시스템 | 조건 | 조건을 적으세요 | 예 → A-04 / 아니오 → A-05', 'A-04 | 시스템 | 출력 | 결과 화면 | → A-06', 'A-05 | 시스템 | 출력 | 안내 창 | → A-02', 'A-06 | 유저 | 시작·종료 | 끝 | —']
      : ['A-01 | user | start | Start | → A-02', 'A-02 | user | input | Press the button | → A-03', 'A-03 | system | decision | Write the condition | yes → A-04 / no → A-05', 'A-04 | system | output | Result screen | → A-06', 'A-05 | system | output | Notice | → A-02', 'A-06 | user | end | End | —'];
    const fm = (more) => ['---', 'title: {{title}}', ...more, '---', ''];
    return [
      { ko: '빈 문서', en: 'Blank document', sub: L('제목만', 'Title only'), name: L('새 문서', 'Untitled'), text: '# {{title}}\n\n' },
      { ko: '기능 기획서', en: 'Feature spec', sub: L('목표 · 기능 · 흐름 · 예외 · 확인 목록', 'Goal · feature · flow · exceptions · checklist'), name: L('기능 기획서', 'Feature spec'), text: [
        ...fm(['author: ', 'date: {{date}}']),
        '# {{title}}', '', L('이 기능이 무엇이고 왜 만드는지 한두 줄로 적습니다.', 'Say in a line or two what this feature is and why we build it.'), '',
        L('## 🎯 목표', '## 🎯 Goal'), '', L('- 사용자가 무엇을 할 수 있게 되는지 적습니다.', '- What users will be able to do.'), '', '---', '',
        L('## ✨ 기능', '## ✨ Feature'), '', L('### 화면', '### Screens'), '', L('- 어떤 화면에 무엇이 보이는지', '- What shows on which screen'), '',
        L('### 동작', '### Behavior'), '', L('| 상황 | 동작 |', '| When | What happens |'), '|:---|:---|', '|  |  |', '', '---', '',
        L('## 🔀 흐름', '## 🔀 Flow'), '', F + 'flow', ...flow, F, '', '---', '',
        L('## ⚠️ 예외 · 주의', '## ⚠️ Exceptions'), '', '> [!WARNING]', L('> 놓치기 쉬운 예외를 적습니다.', '> Write down the exceptions that are easy to miss.'), '', '---', '',
        L('## ✅ 확인 목록', '## ✅ Checklist'), '', L('- [ ] 확인할 것', '- [ ] Something to check'), ''].join('\n') },
      { ko: '회의록', en: 'Meeting notes', sub: L('참석 · 안건 · 정한 것 · 할 일', 'Attendees · agenda · decisions · to-dos'), name: `${today()} ${L('회의록', 'Meeting notes')}`, text: [
        ...fm(['date: {{date}}']),
        '# {{title}}', '', L('{{date}} 회의에서 나눈 이야기와 정한 것을 적습니다.', 'What we discussed and decided in the meeting on {{date}}.'), '',
        L('## 👥 참석', '## 👥 Attendees'), '', L('- 이름', '- Name'), '', '---', '',
        L('## 💬 안건', '## 💬 Agenda'), '', L('### 1. 첫 안건', '### 1. First item'), '', L('- 나온 이야기', '- What was said'), '', '---', '',
        L('## ✅ 정한 것', '## ✅ Decisions'), '', L('- 정한 것', '- Decision'), '', '---', '',
        L('## 🎯 할 일', '## 🎯 To-dos'), '', L('- [ ] 담당 · 할 일 · 기한', '- [ ] Owner · task · due date'), ''].join('\n') },
      { ko: '흐름도', en: 'Flowchart', sub: L('```flow 흐름도 + 도형 설명 표', '```flow chart + node table'), name: L('흐름도', 'Flowchart'), text: [
        '# {{title}}', '', L('이 흐름이 무엇을 하는지 한두 줄로 적습니다.', 'Say in a line or two what this flow does.'), '',
        L('## 🔀 흐름도', '## 🔀 Flowchart'), '', F + 'flow', ...flow, F, '', '---', '',
        L('## 📊 도형 설명', '## 📊 Nodes'), '', L('| 코드 | 설명 |', '| Code | Notes |'), '|:---|:---|', L('| A-03 | 판정 기준을 적습니다 |', '| A-03 | How the condition is decided |'), ''].join('\n') },
      { ko: '데이터 정의 · 노출 위치', en: 'Data definition · exposure', sub: L('```데이터 카드 + ```노출 나무', '```data cards + ```ui tree'), name: L('데이터 정의', 'Data definition'), text: [
        '# {{title}}', '', L('이 데이터가 어디에 쓰이는지 한두 줄로 적습니다.', 'Say in a line or two where this data is used.'), '',
        L('## 📊 데이터', '## 📊 Data'), '', F + L('데이터', 'data'),
        L('# 데이터 이름 (data_id)', '# Data name (data_id)'), L('> 설명', '> Description'),
        L('필드 | 형식 | 필수 | 설명 | 예시', 'Field | Type | Required | Description | Example'),
        L('상품 제목 | 글자(40) | 필수 | 목록 · 상세에 보임 | 기본 상품', 'Item title | Text(40) | Required | Shown in the list · details | Basic plan'), F, '', '---', '', // 예시 칸이 머리줄 이름(이름 · 필수 · 예시)과 겹치면 머리줄로 읽혀서
        L('## 📍 노출 위치', '## 📍 Where it shows'), '', F + L('노출', 'ui'),
        L('- 화면 이름', '- Screen name'), L('  - 버튼 [열기] (들어오는 곳: 메뉴)', '  - [Open] button (entry: menu)'), L('    - 보이는 것', '    - What shows'), F, ''].join('\n') },
    ];
  }
  // 템플릿 고르기 → { text, name } (닫으면 null). 빠른 열기 창을 빌려 씀
  async function pickTemplate() {
    const items = builtinTemplates().map((t) => ({ kind: 'tpl', label: L(t.ko, t.en), alt: L(t.en, t.ko), sub: t.sub, value: t }));
    for (const f of state.files) {
      if (f.builtin || !MD_EXT.test(f.name) || !/(^|\/)(templates|템플릿)\//i.test(f.path)) continue;
      items.push({ kind: 'tpl', label: f.name.replace(MD_EXT, ''), sub: L('폴더 템플릿 · ', 'Folder template · ') + parentOf(f.path), value: { file: f, name: f.name.replace(MD_EXT, '') } });
    }
    const t = await new Promise((resolve) => openQuick('', {
      items: items.map((it) => ({ ...it, run: () => resolve(it.value) })),
      placeholder: L('새 문서 — 템플릿 고르기 (이름으로 찾기)', 'New document — choose a template (type to filter)'),
      onCancel: () => resolve(null),
    }));
    if (!t) return null;
    if (!t.file) return { text: t.text, name: t.name };
    try { const text = await peekText(t.file); return { text, name: t.name, eol: t.file.eol }; }
    catch (e) { toast(L('템플릿을 읽지 못했습니다: ', "Couldn't read the template: ") + ((e && e.message) || e), 3500); return null; }
  }
  async function newDoc() {
    const tpl = await pickTemplate();
    if (!tpl) return;
    const target = (state.current && !state.current.loose && writable(rootOf(state.current.path)))
      ? parentOf(state.current.path) : (state.roots.find(writable) || {}).key;
    if (target) { fsNewFile(target, tpl); return; }
    let n = 1;
    const base = tpl.name;
    while (state.files.some((f) => f.path === (n === 1 ? base + '.md' : `${base} ${n}.md`))) n++;
    const name = n === 1 ? base + '.md' : `${base} ${n}.md`;
    const entry = { name, path: name, text: '', loose: true, isNew: true };
    state.files.push(entry);
    openEntry(entry).then((ok) => {
      if (!ok) return;
      el.editor.value = fillTemplate(tpl.text, name.replace(MD_EXT, ''));
      markDirty();
      setEditing(true);
      render(); // 미리보기도 바로 (원본만 바꾸면 입력 전까지 비어 있었음)
    });
  }

  /* ---------- 끌어다 놓기 ---------- */
  let dragDepth = 0;
  const overlay = $('#dropOverlay');
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) { dragDepth++; overlay.classList.add('show'); } });
  window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; overlay.classList.remove('show'); } });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragDepth = 0;
    overlay.classList.remove('show');
    const items = [...(e.dataTransfer?.items || [])].filter((i) => i.kind === 'file');
    // 가능하면 파일 핸들로 받아서 저장·자동 새로고침이 되게 함
    const handles = items[0]?.getAsFileSystemHandle ? await Promise.all(items.map((i) => i.getAsFileSystemHandle().catch(() => null))) : [];
    const dirHandle = handles.find((h) => h && h.kind === 'directory');
    if (dirHandle) { await loadDirHandle(dirHandle); return; }
    const files = [...(e.dataTransfer?.files || [])];
    const entries = [];
    files.forEach((f, i) => {
      const h = handles[i] && handles[i].kind === 'file' ? handles[i] : null;
      if (MD_EXT.test(f.name)) entries.push(h ? { name: f.name, path: f.name, handle: h, text: null } : { name: f.name, path: f.name, file: f, text: null });
      else if (ASSET_EXT.test(f.name)) state.assets.set(f.name, { file: f });
    });
    if (entries.length) addFiles(entries, false);
    else if (files.length && state.current) { toast(L('그림 파일을 받았습니다. 문서에서 이 이름으로 쓰면 보입니다', 'Image received. Use its file name in the document to show it')); render(true); }
    else if (files.length) toast(L('마크다운 파일(.md)만 열 수 있습니다', 'Only markdown (.md) files can be opened'));
  });

  /* =========================================================
     편집
     ========================================================= */
  function setEditing(on) {
    state.editing = on;
    el.workspace.classList.toggle('editing', on);
    el.btnEdit.classList.toggle('active', on);
    el.btnEdit.querySelector('.label').textContent = on ? L('보기만', 'View only') : L('편집', 'Edit');
    $('#viewSeg').hidden = !on;
    applyViewMode();
    updateTitle();
    lineTops = null;
    if (on) {
      paintEditor();
      requestAnimationFrame(() => { previewToEditor(); syncHlScroll(); el.editor.focus({ preventScroll: true }); updateCursor(); });
    } else {
      el.doc.querySelectorAll('.cursor-block').forEach((n) => n.classList.remove('cursor-block'));
    }
  }

  /* ---------- 보기 방식: 편집만 / 나란히 / 미리보기 ---------- */
  let viewMode = store.get('mdv-view') || 'split';
  function applyViewMode() {
    el.workspace.classList.toggle('mode-edit', viewMode === 'edit');
    el.workspace.classList.toggle('mode-preview', viewMode === 'preview');
    document.querySelectorAll('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === viewMode));
    if (svOpenNow()) svLayout();
    lineTops = null;
  }
  $('#viewSeg').onclick = (e) => {
    const v = e.target.closest('button')?.dataset.v;
    if (!v) return;
    if (el.workspace.classList.contains('side-over')) svClose(); // 옆 보기가 미리보기 자리를 쓰고 있었으면 닫고 돌려줌
    viewMode = v;
    store.set('mdv-view', v);
    applyViewMode();
    requestAnimationFrame(() => { syncHlWidth(); if (v !== 'preview') el.editor.focus({ preventScroll: true }); if (v === 'split') editorToPreview(); });
  };

  /* ---------- 원본 색칠 (줄 번호, 제목 · 굵게 · 코드 · 링크 색) ---------- */
  const elHl = $('#editorHl'), elFind = $('#editorFind');
  function hlInline(s) {
    let h = escapeHtml(s);
    const keep = [];
    const hold = (html) => { keep.push(html); return `\u0001${keep.length - 1}\u0002`; };
    h = h.replace(/(`+)(.+?)\1/g, (m) => hold(`<span class="t-code">${m}</span>`));
    h = h.replace(/\$\$?[^$\s][^$]*?\$\$?/g, (m) => hold(`<span class="t-math">${m}</span>`));
    h = h.replace(/^\[![A-Za-z]+\][+-]?/, (m) => hold(`<span class="t-callout">${m}</span>`));
    h = h.replace(/(!?\[\[?)([^\]]*)(\]\]?)(\(([^)\s]*)\))?/g, (m, a, b, c, d, url) =>
      hold(`<span class="t-lk">${a}${b}${c}</span>` + (d ? `<span class="t-lk">(</span><span class="t-url">${url}</span><span class="t-lk">)</span>` : '')));
    h = h.replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '<span class="t-b">$&</span>');
    h = h.replace(/(^|[^*\w])([*_])(?=[^\s*_])([^*_\n]+?)(?<=[^\s*_])\2(?![*\w])/g, '$1<span class="t-i">$2$3$2</span>');
    h = h.replace(/~~(.+?)~~/g, '<span class="t-s">$&</span>');
    h = h.replace(/(^|[^A-Za-z0-9=])(==(?=[^\s=])(.+?)(?<=\S)==)(?![A-Za-z0-9=])/g, '$1<span class="t-m">$2</span>');
    h = h.replace(/(^|[^A-Za-z0-9+])(\+\+(?=[^\s+])(.+?)(?<=\S)\+\+)(?![A-Za-z0-9+])/g, '$1<span class="t-ins">$2</span>');
    h = h.replace(/(^|[^A-Za-z0-9-])(--(?=[^\s-])(.+?)(?<=\S)--)(?![A-Za-z0-9-])/g, '$1<span class="t-del">$2</span>');
    h = h.replace(/(^|[^A-Za-z0-9+])(\+\+(?=[^\s+])(.+?)(?<=\S)\+\+)(?![A-Za-z0-9+])/g, '$1<span class="t-b">$2</span>');
    if (/^\s*\|/.test(s)) h = h.replace(/\|/g, '<span class="t-pipe">|</span>');
    return h.replace(/\u0001(\d+)\u0002/g, (m, i) => keep[+i]);
  }
  function highlightMd(text) {
    const lines = text.split('\n');
    const out = new Array(lines.length);
    let fence = null;
    let inFm = /^---\r?$/.test(lines[0] || '');
    for (let n = 0; n < lines.length; n++) {
      const line = lines[n];
      let html;
      if (inFm) {
        html = `<span class="t-fm">${escapeHtml(line)}</span>`;
        if (n > 0 && /^(---|\.\.\.)\r?$/.test(line)) inFm = false;
      } else if (fence) {
        const f = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
        if (f && f[1][0] === fence[0] && f[1].length >= fence.length) { fence = null; html = `<span class="t-fence">${escapeHtml(line)}</span>`; }
        else html = `<span class="t-codeblock">${escapeHtml(line)}</span>`;
      } else {
        const f = line.match(/^\s{0,3}(`{3,}|~{3,})/);
        if (f) { fence = f[1]; html = `<span class="t-fence">${escapeHtml(line)}</span>`; }
        else if (/^\s{0,3}#{1,6}(\s|$)/.test(line)) html = `<span class="t-h">${hlInline(line)}</span>`;
        else if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) html = `<span class="t-hr">${escapeHtml(line)}</span>`;
        else if (/^\s*\$\$\s*$/.test(line)) html = `<span class="t-math">${escapeHtml(line)}</span>`;
        else {
          const m = line.match(/^((?:\s*>)+\s?)?(\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)?/);
          const q = m[1] || '', li = m[2] || '';
          html = (q ? `<span class="t-q">${escapeHtml(q)}</span>` : '') + (li ? `<span class="t-li">${escapeHtml(li)}</span>` : '') + hlInline(line.slice(q.length + li.length));
        }
      }
      out[n] = `<div class="ln">${markInvisible(html)}</div>`; // 보이지 않는 글자는 빨간 표시로
    }
    return out.join('');
  }
  let curLineEl = null, paintedValue = null;
  function paintEditor() {
    if (!state.editing) return;
    if (paintedValue === el.editor.value && elHl.childElementCount) { syncHlScroll(); return; }
    paintedValue = el.editor.value;
    elHl.innerHTML = highlightMd(el.editor.value);
    applyChangeMarks();
    curLineEl = null;
    syncHlWidth();
    syncHlScroll();
    updateCursor();
    if (!$('#replBar').hidden) rfSchedule();
  }
  function syncHlWidth() { elHl.style.width = elFind.style.width = el.editor.clientWidth + 'px'; }
  function syncHlScroll() { elHl.scrollTop = elFind.scrollTop = el.editor.scrollTop; }
  el.editor.addEventListener('scroll', syncHlScroll, { passive: true });
  window.addEventListener('resize', () => { if (state.editing) { syncHlWidth(); syncHlScroll(); } });

  /* ---------- 커서 위치: 줄 강조, 상태 줄, 미리보기 블록 표시 ---------- */
  let cursorBlock = null;
  function caretLine() {
    const v = el.editor.value, p = el.editor.selectionStart;
    let n = 0;
    for (let i = v.indexOf('\n'); i !== -1 && i < p; i = v.indexOf('\n', i + 1)) n++;
    return n;
  }
  function updateCursor() {
    if (!state.editing) return;
    const ta = el.editor, v = ta.value, p = ta.selectionStart;
    const line = caretLine();
    const col = p - (v.lastIndexOf('\n', p - 1) + 1) + 1;
    // 편집창의 현재 줄
    const ln = elHl.children[line];
    if (ln !== curLineEl) { curLineEl?.classList.remove('cur'); ln?.classList.add('cur'); curLineEl = ln; }
    // 상태 줄
    const plain = v.replace(/data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+/g, '');
    $('#stChars').textContent = L(`${plain.replace(/\s/g, '').length.toLocaleString()}자`, `${plain.replace(/\s/g, '').length.toLocaleString()} chars`);
    $('#stWords').textContent = L(`${(plain.match(/\S+/g) || []).length.toLocaleString()}단어`, `${(plain.match(/\S+/g) || []).length.toLocaleString()} words`);
    $('#stPos').textContent = L(`줄 ${line + 1}, 칸 ${col}`, `Ln ${line + 1}, Col ${col}`) + (ta.selectionEnd > p ? L(` (${ta.selectionEnd - p}자 선택)`, ` (${ta.selectionEnd - p} selected)`) : '');
    const st = $('#stSaved');
    st.textContent = state.dirty ? L('저장 안 됨', 'Unsaved') : L('저장됨', 'Saved');
    st.classList.toggle('dirty', state.dirty);
    // 미리보기에서 지금 고치는 블록
    let best = null, bestLine = -1;
    for (const n of el.doc.querySelectorAll('[data-line]')) {
      const l = +n.dataset.line;
      if (l <= line && l >= bestLine && n.offsetParent) { best = n; bestLine = l; }
    }
    if (best !== cursorBlock) {
      cursorBlock?.classList.remove('cursor-block');
      best?.classList.add('cursor-block');
      cursorBlock = best;
    }
  }
  let cursorRaf = 0;
  const queueCursor = () => { cancelAnimationFrame(cursorRaf); cursorRaf = requestAnimationFrame(updateCursor); };
  ['keyup', 'click', 'select', 'focus'].forEach((t) => el.editor.addEventListener(t, queueCursor));
  document.addEventListener('selectionchange', () => { if (document.activeElement === el.editor) queueCursor(); });

  // 편집 중 미리보기를 누르면 그 부분의 원본으로 이동
  el.preview.addEventListener('click', (e) => {
    if (!state.editing || viewMode === 'preview') return;
    // 다른 문서로 가는 링크는 그냥 누르면 열지 않고 그 줄로 (Ctrl+클릭이면 옆에서 엶), 그 밖의 링크 · 단추는 제 할 일
    const lk = e.target.closest('a');
    if (lk && !('path' in lk.dataset && !e.ctrlKey && !e.metaKey)) return;
    if (e.target.closest('button, input, summary, .code-head, .h-tools')) return;
    if (String(getSelection()).length) return;
    const blk = e.target.closest('[data-line]');
    if (!blk || !el.doc.contains(blk)) return;
    const line = +blk.dataset.line;
    const v = el.editor.value;
    let pos = 0;
    for (let i = 0; i < line; i++) { const nl = v.indexOf('\n', pos); if (nl < 0) break; pos = nl + 1; }
    el.editor.focus({ preventScroll: true });
    el.editor.setSelectionRange(pos, pos);
    const y = lineToEditorY(line);
    if (y < el.editor.scrollTop || y > el.editor.scrollTop + el.editor.clientHeight - 40) {
      syncLock = 'preview';
      el.editor.scrollTop = Math.max(0, y - el.editor.clientHeight / 3);
    }
    updateCursor();
  });

  let renderTimer;
  el.editor.addEventListener('input', () => {
    markDirty();
    scheduleSnapshot();
    lineTops = null;
    paintEditor();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      render(true);
      if (settings.sync && viewMode === 'split') editorToPreview();
      cursorBlock = null;
      updateCursor();
    }, 120);
  });

  // 되돌리기(Ctrl+Z)가 되도록 execCommand 로 넣음
  function insertText(text, selStart, selEnd) {
    const ta = el.editor;
    ta.focus();
    if (selStart != null) ta.setSelectionRange(selStart, selEnd);
    if (!document.execCommand('insertText', false, text)) {
      ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  }
  function wrapSelection(before, after = before, placeholder = L('텍스트', 'text')) {
    const ta = el.editor;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    if (sel && sel.startsWith(before) && sel.endsWith(after) && sel.length >= before.length + after.length) {
      insertText(sel.slice(before.length, sel.length - after.length), s, e);
      ta.setSelectionRange(s, e - before.length - after.length);
      return;
    }
    const inner = sel || placeholder;
    insertText(before + inner + after, s, e);
    ta.setSelectionRange(s + before.length, s + before.length + inner.length);
  }
  const BLOCK_MARK = /^(\s*)(#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/;
  function setLinePrefix(kind) {
    const ta = el.editor, v = ta.value;
    const s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    let e = v.indexOf('\n', Math.max(ta.selectionEnd - (ta.selectionEnd > ta.selectionStart && v[ta.selectionEnd - 1] === '\n' ? 1 : 0), s));
    if (e < 0) e = v.length;
    const lines = v.slice(s, e).split('\n');
    const prefixFor = (i) => ({ h1: '# ', h2: '## ', h3: '### ', ul: '- ', ol: `${i + 1}. `, task: '- [ ] ', quote: '> ' }[kind]);
    const testFor = { h1: /^#\s/, h2: /^##\s/, h3: /^###\s/, ul: /^[-*+]\s(?!\[[ xX]\])/, ol: /^\d+[.)]\s/, task: /^[-*+]\s\[[ xX]\]\s/, quote: /^>/ }[kind];
    const all = lines.filter((l) => l.trim()).every((l) => testFor.test(l.trimStart()));
    const out = lines.map((l, i) => {
      if (!l.trim() && lines.length > 1) return l;
      const m = l.match(BLOCK_MARK);
      const indent = m ? m[1] : (l.match(/^\s*/)[0]);
      const rest = m ? l.slice(m[0].length) : l.slice(indent.length);
      return all ? indent + rest : indent + prefixFor(i) + rest;
    }).join('\n');
    insertText(out, s, e);
    ta.setSelectionRange(s, s + out.length);
  }
  const COMMANDS = {
    bold: () => wrapSelection('**'),
    italic: () => wrapSelection('*'),
    strike: () => wrapSelection('~~'),
    mark: () => wrapSelection('=='),
    code: () => wrapSelection('`', '`', L('코드', 'code')),
    h1: () => setLinePrefix('h1'), h2: () => setLinePrefix('h2'), h3: () => setLinePrefix('h3'),
    ul: () => setLinePrefix('ul'), ol: () => setLinePrefix('ol'), task: () => setLinePrefix('task'), quote: () => setLinePrefix('quote'),
    codeblock() {
      const ta = el.editor, s = ta.selectionStart, e = ta.selectionEnd;
      const sel = ta.value.slice(s, e) || L('코드', 'code');
      const lead = s > 0 && ta.value[s - 1] !== '\n' ? '\n' : '';
      insertText(`${lead}\`\`\`\n${sel}\n\`\`\`\n`, s, e);
      const start = s + lead.length + 4;
      ta.setSelectionRange(start, start + sel.length);
    },
    callout() {
      const ta = el.editor, s = ta.selectionStart, e = ta.selectionEnd;
      const sel = ta.value.slice(s, e) || L('내용을 쓰세요', 'Write here');
      const lead = s > 0 && ta.value[s - 1] !== '\n' ? '\n\n' : '';
      const body = sel.split('\n').map((l) => '> ' + l).join('\n');
      insertText(`${lead}> [!NOTE]\n${body}\n`, s, e);
      const start = s + lead.length + 4;
      ta.setSelectionRange(start, start + 4);
    },
    link() {
      const ta = el.editor, s = ta.selectionStart, e = ta.selectionEnd;
      const sel = ta.value.slice(s, e);
      if (/^https?:\/\/\S+$/.test(sel)) { const lt = L('링크', 'link'); insertText(`[${lt}](${sel})`, s, e); ta.setSelectionRange(s + 1, s + 1 + lt.length); return; }
      const label = sel || L('링크', 'link');
      insertText(`[${label}](https://)`, s, e);
      const u = s + label.length + 3;
      ta.setSelectionRange(u, u + 8);
    },
    image() {
      const ta = el.editor, s = ta.selectionStart, e = ta.selectionEnd;
      const alt = ta.value.slice(s, e) || L('설명', 'description');
      insertText(`![${alt}](${L('그림.png', 'image.png')})`, s, e);
      const u = s + alt.length + 4;
      ta.setSelectionRange(u, u + 6);
    },
    table() {
      const ta = el.editor, s = ta.selectionStart;
      const lead = s > 0 && ta.value[s - 1] !== '\n' ? '\n\n' : '';
      insertText(lead + L('| 항목 | 내용 |\n| --- | --- |\n| 가 | 나 |\n| 다 | 라 |\n', '| Item | Description |\n| --- | --- |\n| A | B |\n| C | D |\n'), s, ta.selectionEnd);
      ta.setSelectionRange(s + lead.length + 2, s + lead.length + 4);
    },
    hr() {
      const ta = el.editor, s = ta.selectionStart;
      const lead = s > 0 && ta.value[s - 1] !== '\n' ? '\n\n' : '\n';
      insertText(`${lead}---\n\n`, s, ta.selectionEnd);
    },
  };
  $('#editToolbar').addEventListener('mousedown', (e) => e.preventDefault()); // 편집창 선택 영역 유지
  $('#editToolbar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cmd]');
    if (b) COMMANDS[b.dataset.cmd]();
  });

  el.editor.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return; // 한글 입력 중에는 건드리지 않음
    const ta = el.editor;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); COMMANDS.bold(); return; }
      if (k === 'i') { e.preventDefault(); COMMANDS.italic(); return; }
      if (k === 'k') { e.preventDefault(); COMMANDS.link(); return; }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (tableTab(e.shiftKey)) return; // 표 안: 다음 · 이전 칸으로
      const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
      if (s === en && !e.shiftKey) { insertText('    '); return; }
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      let le = v.indexOf('\n', en === s ? en : en - 1); if (le < 0) le = v.length;
      const block = v.slice(ls, le);
      const out = e.shiftKey ? block.replace(/^( {1,4}|\t)/gm, '') : block.replace(/^/gm, '    ');
      insertText(out, ls, le);
      ta.setSelectionRange(ls, ls + out.length);
      return;
    }
    if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && tableBreak()) { e.preventDefault(); return; } // 표 칸 안: <br>
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && ta.selectionStart === ta.selectionEnd) {
      // 목록 · 인용 이어 쓰기
      const v = ta.value, pos = ta.selectionStart;
      const ls = v.lastIndexOf('\n', pos - 1) + 1;
      const line = v.slice(ls, pos);
      const lm = line.match(/^(\s*(?:>\s?)*)(\s*)([-*+]\s\[[ xX]\]\s|[-*+]\s|(\d+)([.)])\s)(.*)$/);
      if (lm) {
        e.preventDefault();
        if (!lm[6].trim() && v.slice(pos, v.indexOf('\n', pos) < 0 ? v.length : v.indexOf('\n', pos)).trim() === '') {
          insertText(lm[1].replace(/\s+$/, '') ? lm[1] : '', ls, pos);
          return;
        }
        let marker = lm[3];
        if (lm[4]) marker = `${+lm[4] + 1}${lm[5]} `;
        else if (/\[[ xX]\]/.test(marker)) marker = marker[0] + ' [ ] ';
        insertText('\n' + lm[1] + lm[2] + marker);
        return;
      }
      const qm = line.match(/^(\s*(?:>\s?)+)(.*)$/);
      if (qm) {
        e.preventDefault();
        if (!qm[2].trim()) { insertText('', ls, pos); return; }
        insertText('\n' + qm[1].replace(/\s*$/, ' '));
      }
    }
  });

  /* ---------- 붙여 넣기 ----------
     그림(스크린샷 · 그림 파일) → 문서 옆 images 폴더에 저장하고 ![](images/…)
     서식 있는 글(웹 · 노션 · 구글 문서 · 워드 · 엑셀 표) → 마크다운 (paste.js)
     글을 고른 채 주소 → [고른 글](주소)
     코드 블록 안이나 Ctrl+Shift+V 는 글자 그대로 */
  let plainPaste = 0;
  el.editor.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') plainPaste = Date.now(); }, true);
  function inCodeFence() {
    const v = el.editor.value, before = v.slice(0, v.lastIndexOf('\n', el.editor.selectionStart - 1) + 1);
    let fence = null;
    for (const line of before.split('\n')) {
      const m = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (!m) continue;
      if (!fence) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length && /^ {0,3}(`+|~+)\s*$/.test(line)) fence = null;
    }
    return !!fence;
  }
  const urlSafe = (u) => u.replace(/[ ()<>]/g, (c) => ({ ' ': '%20', '(': '%28', ')': '%29', '<': '%3C', '>': '%3E' })[c]);
  // 블록(표 · 제목 · 목록 …)을 넣을 때는 앞뒤 글과 빈 줄로 띄움 (글줄 안에 넣는 한 토막은 그대로)
  function blockPad(md, force) {
    if (!force && !/\n/.test(md) && !/^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||```|~~~|---$)/.test(md)) return md;
    const v = el.editor.value, s = el.editor.selectionStart, en = el.editor.selectionEnd;
    const before = v.slice(0, s), after = v.slice(en);
    const lead = !before || /\n\n$/.test(before) ? '' : /\n$/.test(before) ? '\n' : '\n\n';
    const trail = !after ? '\n' : /^\n\n/.test(after) ? '' : /^\n/.test(after) ? '\n' : '\n\n';
    return lead + md + trail;
  }
  function htmlOnlyImage(html) {
    if (!html || !/<img\b/i.test(html)) return false;
    const b = new DOMParser().parseFromString(html, 'text/html').body;
    return !b.textContent.trim() && b.querySelectorAll('img').length === 1;
  }
  el.editor.addEventListener('paste', (e) => {
    const cd = e.clipboardData;
    if (!cd) return;
    if (Date.now() - plainPaste < 1500) { plainPaste = 0; return; } // 글자만
    const types = [...cd.types];
    const html = types.includes('text/html') ? cd.getData('text/html') : '';
    const plain = cd.getData('text/plain') || '';
    // 엑셀 · 워드는 글과 함께 그 모양의 그림도 넣으므로, 글이 있으면 글을 씀
    const imgs = [...cd.files].filter((f) => /^image\//.test(f.type));
    if (imgs.length && (!plain.trim() || htmlOnlyImage(html))) { e.preventDefault(); pasteImages(imgs); return; }
    if (inCodeFence()) return;
    const ta = el.editor, sel = ta.value.slice(ta.selectionStart, ta.selectionEnd), url = plain.trim();
    if (sel.trim() && !sel.includes('\n') && /^https?:\/\/\S+$/i.test(url) && !/^https?:\/\//i.test(sel.trim())) {
      e.preventDefault();
      insertText(`[${sel.replace(/[[\]]/g, '\\$&')}](${urlSafe(url)})`);
      return;
    }
    if (!html || types.includes('vscode-editor-data') || !window.MarkPaste) return;
    let md = null;
    try { md = MarkPaste.fromHtml(html, plain); } catch {}
    if (!md) return;
    e.preventDefault();
    insertText(blockPad(md));
    toast(L('서식을 마크다운으로 바꿔 넣었습니다 · 글자만 넣으려면 Ctrl+Z 뒤 Ctrl+Shift+V', 'Pasted as markdown · for plain text, Ctrl+Z then Ctrl+Shift+V'), 3200);
  });
  // 그림 이름: 스크린샷은 paste-20261107-143205.png, 이름이 있는 그림 파일은 그 이름
  function imageName(f) {
    const two = (x) => String(x).padStart(2, '0'), d = new Date();
    const named = f.name && !/^image\.\w+$/i.test(f.name);
    let base = named ? f.name.replace(/\.[^.]+$/, '') : `paste-${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
    base = base.normalize('NFC').replace(/[\\/:*?"<>|#%\s]+/g, '-').replace(/^[-.]+|-+$/g, '') || 'image';
    const ext = (named && (f.name.match(/\.([A-Za-z0-9]+)$/) || [])[1]) || ({ 'image/jpeg': 'jpg', 'image/svg+xml': 'svg' })[f.type] || f.type.split('/')[1] || 'png';
    return base + '.' + ext.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  // 그림을 쓸 곳: PC 프로그램은 문서 옆, 웹 앱은 폴더 열기로 연 문서 옆 (따로 연 파일은 폴더를 몰라서 못 씀)
  function imageTarget(cur) {
    if (!cur || cur.builtin) return null;
    if (cur.tauriPath && isTauri()) return { kind: 'tauri', dir: cur.tauriPath.replace(/[\\/][^\\/]*$/, '') };
    const root = !cur.loose && rootOf(cur.path);
    if (root && root.kind === 'handle') return { kind: 'handle', root, dir: parentOf(cur.path) };
    return null;
  }
  async function pasteImages(files) {
    const where = imageTarget(state.current);
    if (!where) { toast(L('그림은 문서 옆 images 폴더에 저장합니다. 폴더 열기로 연 문서(또는 PC 프로그램)에서 붙여 넣어 주세요.', 'Images are saved to an images folder next to the document. Paste into a document opened with Open folder (or in the PC app).'), 4500); return; }
    const links = [];
    try {
      let dh = null;
      if (where.kind === 'handle') {
        if (!(await ensureWrite(where.root))) return;
        dh = await (await dirHandleFor(where.dir)).getDirectoryHandle('images', { create: true });
      }
      const sep = where.kind === 'tauri' && where.dir.includes('\\') ? '\\' : '/', abs = (nm) => where.dir + sep + 'images' + sep + nm;
      const taken = async (nm) => (where.kind === 'tauri' ? (await tinvoke('file_modified', { path: abs(nm) })) > 0 : dh.getFileHandle(nm).then(() => true, () => false));
      for (const f of files) {
        let name = imageName(f), n = 2;
        const stem = name.replace(/\.[^.]+$/, ''), ext = name.slice(stem.length);
        while (await taken(name)) name = `${stem}-${n++}${ext}`;
        if (where.kind === 'tauri') {
          await tinvoke('save_binary', { path: abs(name), data: Array.from(new Uint8Array(await f.arrayBuffer())) });
        } else {
          const fh = await dh.getFileHandle(name, { create: true });
          const w = await fh.createWritable(); await w.write(f); await w.close();
          state.assets.set(joinRel(where.dir, 'images/' + name), { handle: fh });
        }
        links.push(`![](images/${urlSafe(name)})`);
      }
    } catch (err) {
      toast(L('그림을 저장하지 못했습니다: ', "Couldn't save the image: ") + ((err && err.message) || err), 4000);
    }
    if (!links.length) return;
    const ta = el.editor, s = ta.selectionStart, text = blockPad(links.join('\n\n'), true);
    insertText(text);
    const at = s + text.indexOf('![') + 2;
    ta.setSelectionRange(at, at); // ![ ] 안: 설명을 바로 쓸 수 있게
    toast(L(`그림 ${links.length}개를 images 폴더에 저장했습니다 · [ ] 안에 설명을 쓰면 그림 아래에 나옵니다`, `Saved ${links.length} image${links.length === 1 ? '' : 's'} to the images folder · write a description inside [ ] to show it under the image`), 3500);
  }

  /* =========================================================
     원본 편집기 기본기 — 모두 insertText 로 넣어서 Ctrl+Z 한 번에 되돌림
     - 찾아 바꾸기: Ctrl+H (Mac은 ⌘H 가 「앱 가리기」라 ⌥⌘F), 대소문자 · 단어 단위 · 정규식($1 · \n)
     - 줄 옮기기: Alt+↑ · ↓ (차례대로였던 번호 목록은 번호도 다시 매김)
     - 제목 단계: Ctrl+Shift+[ 올리기(## → #) · Ctrl+Shift+] 내리기(# → ##), 고른 범위의 제목을 한꺼번에
     - 번호 목록 다시 매기기: 명령(Ctrl+O 에서 >번호)
     ========================================================= */
  const IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  // 편집창 글을 next 로: 바뀐 가운데만 넣음 (한 번에 되돌릴 수 있게)
  function applyText(next) {
    const v = el.editor.value;
    if (v === next) return false;
    let a = 0;
    while (a < v.length && a < next.length && v[a] === next[a]) a++;
    let b = 0;
    while (b < v.length - a && b < next.length - a && v[v.length - 1 - b] === next[next.length - 1 - b]) b++;
    insertText(next.slice(a, next.length - b), a, v.length - b);
    return true;
  }
  // pos 가 있는 줄 앞까지 열린 코드 울타리 (``` · ~~~) — 없으면 null
  function fenceBefore(v, lineStart) {
    let fence = null;
    for (const line of v.slice(0, lineStart).split('\n')) {
      const m = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (!m) continue;
      if (!fence) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length && /^ {0,3}(`+|~+)\s*$/.test(line)) fence = null;
    }
    return fence;
  }
  // 고른 범위가 걸친 줄들 [시작, 끝) — 끝 줄의 맨 앞에서 끝나는 선택은 그 줄을 빼고 셈
  function selLines() {
    const ta = el.editor, v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    let le = v.indexOf('\n', e > s && v[e - 1] === '\n' ? e - 1 : e);
    if (le < 0) le = v.length;
    return { v, s, e, ls, le };
  }

  // ---------- 번호 목록 ----------
  const LI_ANY = /^(\s*)([-*+]|\d{1,9}[.)])(\s|$)/, LI_NUM = /^(\s*)(\d{1,9})([.)])(\s|$)/;
  // 줄 i 가 든 목록의 범위 [a, b) (빈 줄을 사이에 둔 항목까지)
  function listRange(lines, i) {
    const item = (l) => l != null && LI_ANY.test(l), cont = (l) => l != null && /^\s+\S/.test(l);
    const inList = (k) => item(lines[k]) || cont(lines[k]);
    if (!inList(i)) return null;
    let a = i, b = i + 1;
    while (a > 0 && (inList(a - 1) || (!lines[a - 1].trim() && inList(a - 2)))) a--;
    while (b < lines.length && (inList(b) || (!lines[b].trim() && inList(b + 1)))) b++;
    return lines.slice(a, b).some((l) => LI_NUM.test(l)) ? [a, b] : null;
  }
  // 들여쓰기 단계마다 첫 항목 번호(starts 가 있으면 그 번호)부터 차례로
  function renumber(lines, a, b, starts) {
    const stack = [];
    for (let i = a; i < b; i++) {
      const m = lines[i].match(LI_ANY);
      if (!m) continue;
      const indent = m[1].replace(/\t/g, '    ').length;
      while (stack.length && stack[stack.length - 1].indent > indent) stack.pop();
      let top = stack[stack.length - 1];
      if (!top || top.indent < indent) { top = { indent, n: null }; stack.push(top); }
      const om = lines[i].match(LI_NUM);
      if (!om) { top.n = null; continue; }
      top.n = top.n == null ? (starts && starts.has(indent) ? starts.get(indent) : +om[2]) : top.n + 1;
      lines[i] = om[1] + top.n + om[3] + lines[i].slice(om[1].length + om[2].length + 1);
    }
  }
  function renumberList() {
    if (!state.editing) return;
    const ta = el.editor, v = ta.value, lines = v.split('\n');
    const i = v.slice(0, ta.selectionStart).split('\n').length - 1, col = ta.selectionStart - (v.lastIndexOf('\n', ta.selectionStart - 1) + 1);
    const r = listRange(lines, i);
    if (!r) { toast(L('번호 목록(1. 2. 3.) 안에서 쓰세요', 'Use it inside a numbered list (1. 2. 3.)')); return; }
    const next = lines.slice();
    renumber(next, r[0], r[1]);
    if (!applyText(next.join('\n'))) { toast(L('번호가 이미 차례대로입니다', 'The numbers are already in order')); return; }
    const pos = next.slice(0, i).join('\n').length + (i ? 1 : 0) + Math.min(col, next[i].length);
    ta.setSelectionRange(pos, pos);
    toast(L('번호를 다시 매겼습니다 (Ctrl+Z 로 취소)', 'Renumbered (Ctrl+Z to undo)'));
  }

  // ---------- 줄 옮기기 ----------
  function moveLines(dir) {
    const { v, s, e, ls, le } = selLines();
    if ((dir < 0 && ls === 0) || (dir > 0 && le >= v.length)) return;
    const lines = v.split('\n');
    const first = v.slice(0, ls).split('\n').length - 1, count = v.slice(ls, le).split('\n').length;
    const swap = dir < 0 ? first - 1 : first + count; // 자리를 바꿀 이웃 줄
    const at = dir < 0 ? first - 1 : first + 1;        // 옮긴 뒤 첫 줄의 자리
    const next = lines.slice();
    next.splice(at, 0, ...next.splice(first, count));
    // 번호 목록 안에서 옮겼고 원래 번호가 차례대로였으면, 옮긴 뒤에도 차례대로
    const r = LI_NUM.test(lines[first]) && LI_NUM.test(lines[swap]) ? listRange(lines, first) : null;
    if (r) {
      const check = lines.slice();
      renumber(check, r[0], r[1]);
      if (check.join('\n') === v) {
        const starts = new Map();
        for (let k = r[0]; k < r[1]; k++) {
          const m = lines[k].match(LI_NUM);
          if (m) { const ind = m[1].replace(/\t/g, '    ').length; starts.set(ind, Math.min(starts.get(ind) ?? Infinity, +m[2])); }
        }
        renumber(next, r[0], r[1], starts);
      }
    }
    applyText(next.join('\n'));
    // 고른 범위가 옮긴 줄을 그대로 따라가게
    const nls = next.slice(0, at).reduce((n, l) => n + l.length + 1, 0);
    const grow = next.slice(at, at + count).join('\n').length - (le - ls);
    el.editor.setSelectionRange(nls + (s - ls), Math.max(nls + (s - ls), nls + (e - ls) + grow));
  }

  // ---------- 제목 단계 ----------
  function headingStep(dir) {
    const { v, s, e, ls, le } = selLines();
    let fence = fenceBefore(v, ls), changed = 0, stuck = 0;
    const lines = v.slice(ls, le).split('\n');
    const out = lines.map((l) => {
      const fm = l.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) { if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length && /^ {0,3}(`+|~+)\s*$/.test(l)) fence = null; return l; }
      if (fm) { fence = fm[1]; return l; }
      const m = l.match(/^( {0,3})(#{1,6})(?=\s|$)/);
      if (!m) return l;
      const n = m[2].length + dir;
      if (n < 1 || n > 6) { stuck++; return l; }
      changed++;
      return m[1] + '#'.repeat(n) + l.slice(m[0].length);
    });
    // 제목끼리의 높낮이가 흐트러지지 않게, 하나라도 더 못 움직이면 바꾸지 않음
    if (stuck || !changed) {
      toast(!changed && !stuck ? L('제목 줄(#)에서 쓰세요', 'Use it on a heading line (#)')
        : dir < 0 ? L('# 보다 올릴 수 없는 제목이 있어 바꾸지 않았습니다', "Not changed: a heading is already at the highest level (#)")
        : L('###### 보다 내릴 수 없는 제목이 있어 바꾸지 않았습니다', "Not changed: a heading is already at the lowest level (######)"), 2800);
      return;
    }
    const text = out.join('\n');
    insertText(text, ls, le);
    if (s === e) { const p = Math.max(ls, s + out[0].length - lines[0].length); el.editor.setSelectionRange(p, p); }
    else el.editor.setSelectionRange(ls, ls + text.length);
  }

  el.editor.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moveLines(e.key === 'ArrowUp' ? -1 : 1); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && (e.code === 'BracketLeft' || e.code === 'BracketRight')) { e.preventDefault(); headingStep(e.code === 'BracketLeft' ? -1 : 1); }
  });

  // ---------- 표 편집 도우미 ----------
  // 원본에서 커서가 표 안에 있으면: Tab · Shift+Tab 칸 이동, 줄 맞춤, 행 · 열 더하기 · 지우기 · 옮기기, 열 기준 정렬
  //  - 칸 나눔은 GFM 처럼 \| 가 아닌 | (`코드` 안의 | 도 칸 나눔)
  //  - 줄 맞춤은 명령으로만 (칠 때마다 맞추면 한 칸만 고쳐도 표 전체가 바뀐 줄로 잡힘)
  //  - 칸 폭은 편집기 글꼴로 실제 폭을 재서(measureText) 가장 가까운 빈칸 수로 채움 (한글 · 이모지가 영문 두 칸이 아님)
  const TBL_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
  // 한 줄의 칸 → [{ s, e }] (칸 사이 | 를 뺀 자리, 빈칸 포함)
  function cellRanges(line) {
    const pipes = [];
    for (let i = 0; i < line.length; i++) if (line[i] === '|' && line[i - 1] !== '\\') pipes.push(i);
    const lead = Math.max(0, line.search(/\S/)), last = line.trimEnd().length - 1;
    const bounds = pipes.slice();
    if (!pipes.length || pipes[0] !== lead) bounds.unshift(lead - 1);
    if (!pipes.length || pipes[pipes.length - 1] !== last || last === lead) bounds.push(last + 1);
    const out = [];
    for (let k = 0; k + 1 < bounds.length; k++) out.push({ s: bounds[k] + 1, e: bounds[k + 1] });
    return out;
  }
  function parseRow(line) {
    const lead = Math.max(0, line.search(/\S/)), last = line.trimEnd().length - 1;
    const hasLead = line[lead] === '|', hasTrail = last > lead && line[last] === '|' && line[last - 1] !== '\\';
    return { indent: line.slice(0, lead), hasLead, hasTrail, cells: cellRanges(line).map(({ s, e }) => line.slice(s, e)) };
  }
  const rowText = (r) => r.indent + (r.hasLead ? '|' : '') + r.cells.join('|') + (r.hasTrail ? '|' : '');
  // 커서가 든 표: { lines, a, b(끝 줄 다음), row(표 안 줄 번호), col }
  function tableAtCursor() {
    if (!state.editing) return null;
    const ta = el.editor, v = ta.value, lines = v.split('\n');
    const i = v.slice(0, ta.selectionStart).split('\n').length - 1;
    const has = (k) => lines[k] != null && lines[k].includes('|') && lines[k].trim();
    if (!has(i) || fenceBefore(v, v.lastIndexOf('\n', ta.selectionStart - 1) + 1)) return null;
    let a = i, b = i;
    while (has(a - 1)) a--;
    while (has(b + 1)) b++;
    if (a + 1 > b || !TBL_SEP.test(lines[a + 1])) return null;
    const ls = v.lastIndexOf('\n', ta.selectionStart - 1) + 1, at = ta.selectionStart - ls;
    const ranges = cellRanges(lines[i]);
    let col = ranges.findIndex((r) => at >= r.s - 1 && at <= r.e);
    if (col < 0) col = at < (ranges[0] ? ranges[0].s : 0) ? 0 : ranges.length - 1;
    return { lines, a, b: b + 1, row: i - a, col: Math.max(0, col) };
  }
  // 표 줄 k(문서 줄 번호)의 c 번째 칸 글자를 고름
  function selectCell(lines, k, c) {
    const ranges = cellRanges(lines[k]), r = ranges[Math.min(c, ranges.length - 1)];
    if (!r) return;
    let off = 0;
    for (let n = 0; n < k; n++) off += lines[n].length + 1;
    const cell = lines[k].slice(r.s, r.e), lead = cell.length - cell.trimStart().length, body = cell.trim().length;
    const s = off + r.s + (body ? lead : Math.min(1, cell.length));
    el.editor.setSelectionRange(s, s + body);
  }
  function tableTab(back) {
    const ta = el.editor;
    if (ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n')) return false;
    const t = tableAtCursor();
    if (!t) return false;
    const { lines, a, b } = t;
    let k = a + t.row, c = t.col + (back ? -1 : 1);
    const width = (n) => cellRanges(lines[n]).length;
    if (c >= width(k)) { k++; if (k === a + 1) k++; c = 0; }
    if (c < 0) { k--; if (k === a + 1) k--; if (k < a) return true; c = width(k) - 1; }
    if (k >= b) { // 마지막 칸에서 Tab: 아래에 빈 행을 더함
      const head = parseRow(lines[a]);
      const row = { indent: head.indent, hasLead: true, hasTrail: true, cells: head.cells.map(() => '  ') };
      const next = lines.slice();
      next.splice(b, 0, rowText(row));
      applyText(next.join('\n'));
      selectCell(next, b, 0);
      return true;
    }
    selectCell(lines, k, c);
    return true;
  }
  // 칸 안에서 Shift+Enter: 줄을 나누는 대신 <br> (표 한 행은 원본 한 줄이어야 함)
  //  - 구분 줄, 바깥 | 의 앞 · 뒤, 여러 칸에 걸친 선택에서는 넣지 않고 원래대로 줄을 나눔
  function tableBreak() {
    const ta = el.editor, v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
    if (v.slice(s, en).includes('\n')) return false;
    const t = tableAtCursor();
    if (!t || t.row === 1) return false;
    const ls = v.lastIndexOf('\n', s - 1) + 1, at = s - ls, to = en - ls;
    if (!cellRanges(t.lines[t.a + t.row]).some((r) => at >= r.s && to <= r.e)) return false;
    insertText('<br>');
    return true;
  }
  // 칸 폭 재기 (편집기 글꼴)
  let tblCanvas = null;
  function textWidth(s) {
    tblCanvas = tblCanvas || document.createElement('canvas').getContext('2d');
    const cs = getComputedStyle(el.editor);
    tblCanvas.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return tblCanvas.measureText(s).width;
  }
  const alignOf = (cell) => { const t = cell.trim(); return t.startsWith(':') && t.endsWith(':') ? 'c' : t.endsWith(':') ? 'r' : t.startsWith(':') ? 'l' : ''; };
  function tableOp(op) {
    const t = tableAtCursor();
    if (!t) { toast(L('원본의 표 안에 커서를 두고 쓰세요', 'Put the cursor inside a table in the source')); return; }
    const { lines, a, b } = t;
    const rows = lines.slice(a, b).map(parseRow);
    const cols = Math.max(...rows.map((r) => r.cells.length));
    for (const r of rows) while (r.cells.length < cols) r.cells.push(r === rows[1] ? ' --- ' : '  '); // 모자란 칸 채움
    let row = t.row, col = Math.min(t.col, cols - 1);
    const body = (r) => r >= 2;
    if (op === 'align') {
      const aligns = rows[1].cells.map(alignOf);
      const space = textWidth(' ') || 8;
      const texts = rows.map((r) => r.cells.map((c) => c.trim()));
      const widths = Array.from({ length: cols }, (_, k) => Math.max(textWidth('---'), ...texts.filter((_, n) => n !== 1).map((cs) => textWidth(cs[k] || ''))));
      rows.forEach((r, n) => {
        r.hasLead = r.hasTrail = true;
        r.cells = texts[n].map((c, k) => {
          if (n === 1) { const dash = Math.max(3, Math.round(widths[k] / (textWidth('-') || space))); const al = aligns[k]; return ' ' + (al === 'l' || al === 'c' ? ':' : '') + '-'.repeat(Math.max(1, dash - (al === 'c' ? 2 : al ? 1 : 0))) + (al === 'r' || al === 'c' ? ':' : '') + ' '; }
          const pad = Math.max(0, Math.round((widths[k] - textWidth(c)) / space)), al = aligns[k];
          const left = al === 'r' ? pad : al === 'c' ? Math.floor(pad / 2) : 0;
          return ' ' + ' '.repeat(left) + c + ' '.repeat(pad - left) + ' ';
        });
      });
    } else if (op === 'rowAdd') {
      const at = Math.max(2, row + 1);
      rows.splice(at, 0, { indent: rows[0].indent, hasLead: rows[0].hasLead || true, hasTrail: true, cells: Array.from({ length: cols }, () => '  ') });
      row = at; col = 0;
    } else if (op === 'rowDel') {
      if (!body(row)) { toast(L('머리줄과 구분 줄은 지울 수 없습니다', "The header and separator rows can't be deleted")); return; }
      rows.splice(row, 1);
      row = Math.min(row, rows.length - 1);
    } else if (op === 'colAdd') {
      rows.forEach((r, n) => r.cells.splice(col + 1, 0, n === 1 ? ' --- ' : '  '));
      col++;
    } else if (op === 'colDel') {
      if (cols < 2) { toast(L('칸이 하나뿐인 표의 열은 지울 수 없습니다', "Can't delete the only column")); return; }
      rows.forEach((r) => r.cells.splice(col, 1));
      col = Math.min(col, cols - 2);
    } else if (op === 'colLeft' || op === 'colRight') {
      const to = col + (op === 'colLeft' ? -1 : 1);
      if (to < 0 || to >= cols) return;
      rows.forEach((r) => { [r.cells[col], r.cells[to]] = [r.cells[to], r.cells[col]]; });
      col = to;
    } else if (op === 'sort') {
      const bodyRows = rows.slice(2);
      const key = (r) => (r.cells[col] || '').trim();
      const num = (s) => { const x = s.replace(/[,\s]/g, '').replace(/%$/, ''); return x !== '' && !Number.isNaN(Number(x)) ? Number(x) : null; };
      const allNum = bodyRows.every((r) => !key(r) || num(key(r)) != null);
      const cmp = (p, q) => (allNum ? (num(key(p)) ?? -Infinity) - (num(key(q)) ?? -Infinity) : key(p).localeCompare(key(q), undefined, { numeric: true }));
      const asc = bodyRows.slice().sort(cmp);
      const already = asc.every((r, n) => r === bodyRows[n]);
      rows.splice(2, bodyRows.length, ...(already ? asc.reverse() : asc));
      toast(already ? L('내림차순으로 정렬했습니다', 'Sorted descending') : L('오름차순으로 정렬했습니다 (한 번 더 누르면 내림차순)', 'Sorted ascending (press again for descending)'));
    }
    const next = lines.slice(0, a).concat(rows.map(rowText), lines.slice(b));
    applyText(next.join('\n'));
    selectCell(next, a + Math.min(row, rows.length - 1), col);
  }
  $('#tbTable').addEventListener('click', (e) => { const b = e.target.closest('[data-tbl]'); if (b) tableOp(b.dataset.tbl); });
  // 커서가 표 안에 있을 때만 도구 모음에 표 단추를 보임
  let tblTimer = 0;
  function updateTableTools() { clearTimeout(tblTimer); tblTimer = setTimeout(() => { $('#tbTable').hidden = !tableAtCursor(); }, 120); }
  el.editor.addEventListener('keyup', updateTableTools);
  el.editor.addEventListener('mouseup', updateTableTools);
  el.editor.addEventListener('input', updateTableTools);

  // ---------- 찾아 바꾸기 ----------
  const rf = { opts: { case: false, word: false, regex: false }, hits: [], now: -1, re: null, timer: 0, origin: 0 };
  try { Object.assign(rf.opts, JSON.parse(store.get('mdv-rf-opts') || '{}')); } catch {}
  const rfOpen = () => !$('#replBar').hidden;
  function rfScan(keepNear) {
    const inp = $('#rfFind'), q = inp.value, o = rf.opts;
    rf.hits = []; rf.re = null;
    inp.classList.remove('err');
    if (q) {
      try {
        let src = o.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (o.word) src = `(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`;
        rf.re = new RegExp(src, 'gmu' + (o.case ? '' : 'i'));
      } catch { inp.classList.add('err'); }
    }
    if (rf.re) for (const m of el.editor.value.matchAll(rf.re)) {
      if (!m[0].length) continue;
      rf.hits.push({ s: m.index, e: m.index + m[0].length, m });
      if (rf.hits.length >= 20000) break;
    }
    const at = keepNear != null ? keepNear : rf.origin;
    rf.now = rf.hits.length ? Math.max(0, rf.hits.findIndex((h) => h.s >= at)) : -1;
    rfPaint();
  }
  function rfSchedule() { clearTimeout(rf.timer); rf.timer = setTimeout(() => rfScan(el.editor.selectionStart), 150); }
  function rfPaint() {
    const q = $('#rfFind').value;
    $('#rfCount').textContent = !q ? '' : !rf.re ? L('정규식 오류', 'Bad regex') : rf.hits.length ? `${rf.now + 1}/${rf.hits.length}${rf.hits.length >= 20000 ? '+' : ''}` : L('없음', 'None');
    if (!rfOpen() || !rf.hits.length) { elFind.innerHTML = ''; return; }
    // 편집창과 같은 줄 구조로, 찾은 곳만 <mark> (여러 줄에 걸친 것은 줄마다 나눔)
    const v = el.editor.value, H = rf.hits;
    let off = 0, k = 0;
    elFind.innerHTML = v.split('\n').map((line) => {
      const ls = off, le = off + line.length;
      off = le + 1;
      while (k < H.length && H[k].e <= ls) k++;
      let s = '', p = ls, j = k;
      while (j < H.length && H[j].s <= le) {
        const a = Math.max(H[j].s, ls), b = Math.min(H[j].e, le);
        if (a > p) s += escapeHtml(v.slice(p, a));
        if (b > a) s += `<mark${j === rf.now ? ' class="now"' : ''}>${escapeHtml(v.slice(a, b))}</mark>`;
        p = Math.max(p, b);
        if (H[j].e > le) break; // 다음 줄로 이어짐
        j++;
      }
      k = j;
      return `<div class="ln">${s}${escapeHtml(v.slice(p, le))}</div>`;
    }).join('');
    syncHlWidth();
    syncHlScroll();
  }
  // i 번째 찾은 곳을 고르고 보이게 (입력칸의 포커스는 그대로)
  function rfShow(i) {
    if (!rf.hits.length) { rfPaint(); return; }
    rf.now = (i + rf.hits.length) % rf.hits.length;
    const h = rf.hits[rf.now], ta = el.editor;
    ta.setSelectionRange(h.s, h.e);
    const y = lineToEditorY(ta.value.slice(0, h.s).split('\n').length - 1);
    if (y < ta.scrollTop + 10 || y > ta.scrollTop + ta.clientHeight - 60) ta.scrollTop = Math.max(0, y - ta.clientHeight / 3);
    rfPaint();
  }
  // 바꿀 글: 정규식이면 $1 · $& · $<이름> · \n · \t 를 받음
  function rfExpand(m) {
    const r = $('#rfRepl').value;
    if (!rf.opts.regex) return r;
    return r.replace(/\$(\$|&|\d{1,2}|<([^>]+)>)|\\(n|t|\\)/g, (all, d, name, esc) => {
      if (esc) return esc === 'n' ? '\n' : esc === 't' ? '\t' : '\\';
      if (d === '$') return '$';
      if (d === '&') return m[0];
      if (name !== undefined) return (m.groups && m.groups[name]) ?? '';
      return +d < m.length ? (m[+d] ?? '') : all;
    });
  }
  function rfReplaceOne() {
    if (!rf.hits.length) return;
    const ta = el.editor, h = rf.hits[rf.now];
    if (ta.selectionStart !== h.s || ta.selectionEnd !== h.e) { rfShow(rf.now); return; } // 먼저 고르고, 한 번 더 누르면 바꿈
    const rep = rfExpand(h.m);
    insertText(rep, h.s, h.e);
    rfScan(h.s + rep.length);
    rfShow(rf.now);
    $('#rfRepl').focus();
  }
  function rfReplaceAll() {
    if (!rf.hits.length) return;
    const v = el.editor.value, n = rf.hits.length;
    let out = '', p = 0;
    for (const h of rf.hits) { out += v.slice(p, h.s) + rfExpand(h.m); p = h.e; }
    replaceAll(out + v.slice(p), L(`모두 바꾸기 (${n}곳)`, `Replace all (${n})`));
    toast(L(`${n}곳을 바꿨습니다 (Ctrl+Z 로 취소)`, `Replaced ${n} (Ctrl+Z to undo)`));
    rfScan(0);
    $('#rfRepl').focus();
  }
  function openReplace() {
    if (!state.current) return;
    if (!state.editing) setEditing(true);
    if (viewMode === 'preview') $('#viewSeg [data-v="split"]').click();
    const bar = $('#replBar'), ta = el.editor, inp = $('#rfFind');
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    if (sel && !sel.includes('\n') && sel.length <= 200) inp.value = sel;
    bar.hidden = false;
    lineTops = null;
    rf.origin = ta.selectionStart;
    bar.querySelectorAll('[data-rf]').forEach((b) => b.setAttribute('aria-pressed', String(!!rf.opts[b.dataset.rf])));
    inp.focus();
    inp.select();
    rfScan();
    if (rf.hits.length) rfShow(rf.now);
  }
  function closeReplace() {
    $('#replBar').hidden = true;
    elFind.innerHTML = '';
    rf.hits = [];
    lineTops = null;
    el.editor.focus({ preventScroll: true });
  }
  $('#rfFind').addEventListener('input', () => { rfScan(); if (rf.hits.length) rfShow(rf.now); });
  $('#rfFind').addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') { e.preventDefault(); if (e.ctrlKey && e.altKey) rfReplaceAll(); else rfShow(rf.now + (e.shiftKey ? -1 : 1)); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeReplace(); }
  });
  $('#rfRepl').addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') { e.preventDefault(); if (e.ctrlKey && e.altKey) rfReplaceAll(); else rfReplaceOne(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeReplace(); }
  });
  $('#rfNext').onclick = () => rfShow(rf.now + 1);
  $('#rfPrev').onclick = () => rfShow(rf.now - 1);
  $('#rfClose').onclick = closeReplace;
  $('#rfOne').onclick = rfReplaceOne;
  $('#rfAll').onclick = rfReplaceAll;
  $('#replBar').querySelectorAll('[data-rf]').forEach((b) => (b.onclick = () => {
    rf.opts[b.dataset.rf] = !rf.opts[b.dataset.rf];
    b.setAttribute('aria-pressed', String(rf.opts[b.dataset.rf]));
    store.set('mdv-rf-opts', JSON.stringify(rf.opts));
    rfScan(el.editor.selectionStart);
    if (rf.hits.length) rfShow(rf.now);
    $('#rfFind').focus();
  }));
  window.addEventListener('keydown', (e) => {
    const want = IS_MAC ? e.metaKey && e.altKey && !e.shiftKey && e.code === 'KeyF' : e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === 'h';
    if (!want || !state.current || el.workspace.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    openReplace();
  }, true);

  /* =========================================================
     바뀐 내용 추적: 줄 표시, 저장 후 바뀐 내용, 되돌리기 기록
     ========================================================= */
  // 줄 단위 비교 (앞뒤 같은 부분을 빼고 가운데만 LCS)
  function lineDiff(a, b) {
    let s = 0;
    while (s < a.length && s < b.length && a[s] === b[s]) s++;
    let ea = a.length, eb = b.length;
    while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const A = a.slice(s, ea), B = b.slice(s, eb), n = A.length, m = B.length;
    const ops = [];
    for (let i = 0; i < s; i++) ops.push({ t: 'eq', a: i, b: i });
    if (n * m > 4000000) {
      for (let i = 0; i < n; i++) ops.push({ t: 'del', a: s + i });
      for (let j = 0; j < m; j++) ops.push({ t: 'add', b: s + j });
    } else {
      const w = m + 1, L = new Uint32Array((n + 1) * w);
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
        L[i * w + j] = A[i] === B[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
      let i = 0, j = 0;
      while (i < n || j < m) {
        if (i < n && j < m && A[i] === B[j]) { ops.push({ t: 'eq', a: s + i, b: s + j }); i++; j++; }
        else if (j < m && (i >= n || L[i * w + j + 1] >= L[(i + 1) * w + j])) { ops.push({ t: 'add', b: s + j }); j++; }
        else { ops.push({ t: 'del', a: s + i }); i++; }
      }
    }
    for (let k = 0; k < a.length - ea; k++) ops.push({ t: 'eq', a: ea + k, b: eb + k });
    return ops;
  }
  // 바뀐 덩어리(hunk)로 묶기: { aStart, aEnd, bStart, bEnd }
  function hunksOf(ops) {
    const hunks = [];
    let cur = null, ai = 0, bi = 0;
    for (const o of ops) {
      if (o.t === 'eq') { if (cur) { hunks.push(cur); cur = null; } ai = o.a + 1; bi = o.b + 1; continue; }
      if (!cur) cur = { aStart: ai, aEnd: ai, bStart: bi, bEnd: bi };
      if (o.t === 'del') { cur.aEnd = o.a + 1; ai = o.a + 1; } else { cur.bEnd = o.b + 1; bi = o.b + 1; }
    }
    if (cur) hunks.push(cur);
    return hunks;
  }
  const savedText = () => (state.current ? state.current.text || '' : '');

  // 1) 편집창 줄 번호 옆 색 막대: 초록 = 새 줄, 파랑 = 바뀐 줄, 빨강 ▸ = 여기서 줄이 지워짐
  let changeCount = 0;
  function applyChangeMarks() {
    if (!state.editing || !state.current) return;
    const lines = elHl.children;
    for (const ln of lines) ln.classList.remove('ln-add', 'ln-mod', 'ln-del');
    const hunks = hunksOf(lineDiff(savedText().split('\n'), el.editor.value.split('\n')));
    changeCount = 0;
    for (const h of hunks) {
      const added = h.bEnd - h.bStart, removed = h.aEnd - h.aStart;
      changeCount += Math.max(added, removed);
      for (let j = h.bStart; j < h.bEnd; j++) lines[j]?.classList.add(removed ? 'ln-mod' : 'ln-add');
      if (!added) (lines[h.bStart] || lines[lines.length - 1])?.classList.add('ln-del');
    }
    const st = $('#stChanges');
    st.hidden = !changeCount;
    st.textContent = L(`바뀐 줄 ${changeCount}개 · 보기`, `${changeCount} changed line${changeCount === 1 ? '' : 's'} · View`);
  }

  // 3) 되돌리기 기록: 입력이 1초 멈출 때마다 그 시점을 저장 (문서마다 최대 100개)
  function snapshot(label, extra = {}) {
    const e = state.current;
    if (!e) return;
    e.history = e.history || [];
    const text = el.editor.value, last = e.history[e.history.length - 1];
    if (last && last.text === text) { Object.assign(last, extra); if (extra.saved) last.label = label; return; }
    e.history.push({ t: Date.now(), text, label, ...extra });
    if (e.history.length > 100) e.history.splice(1, e.history.length - 100);
  }
  let snapTimer;
  function scheduleSnapshot() { clearTimeout(snapTimer); snapTimer = setTimeout(() => snapshot(L('고침', 'Edit')), 1000); }

  // 편집창 내용을 통째로 바꾸되 Ctrl+Z 로도 돌아갈 수 있게
  function replaceAll(text, label) {
    snapshot(L('되돌리기 전', 'Before undo'));
    const ta = el.editor, keep = ta.scrollTop;
    ta.focus();
    ta.select();
    if (!document.execCommand('insertText', false, text)) { ta.value = text; ta.dispatchEvent(new Event('input')); }
    ta.scrollTop = keep;
    snapshot(label);
  }

  // 2) 바뀐 내용 창
  const chg = { tab: 'diff', pick: -1 };
  function diffHtml(oldText, newText, { revert } = {}) {
    const a = oldText.split('\n'), b = newText.split('\n');
    const hunks = hunksOf(lineDiff(a, b));
    if (!hunks.length) return '<p class="chg-empty">' + L('바뀐 내용이 없습니다.', 'No changes.') + '</p>';
    const ctx = 2;
    return hunks.map((h, k) => {
      const rows = [];
      for (let j = Math.max(0, h.bStart - ctx); j < h.bStart; j++) rows.push(['eq', j + 1, b[j]]);
      for (let i = h.aStart; i < h.aEnd; i++) rows.push(['del', '', a[i]]);
      for (let j = h.bStart; j < h.bEnd; j++) rows.push(['add', j + 1, b[j]]);
      for (let j = h.bEnd; j < Math.min(b.length, h.bEnd + ctx); j++) rows.push(['eq', j + 1, b[j]]);
      const sign = { eq: ' ', del: '−', add: '+' };
      const what = (h.aEnd - h.aStart ? L(`${h.aEnd - h.aStart}줄 지움`, `${h.aEnd - h.aStart} line${h.aEnd - h.aStart === 1 ? '' : 's'} removed`) : '') + (h.aEnd - h.aStart && h.bEnd - h.bStart ? ' · ' : '') + (h.bEnd - h.bStart ? (h.aEnd - h.aStart ? L(`${h.bEnd - h.bStart}줄 새로 씀`, `${h.bEnd - h.bStart} line${h.bEnd - h.bStart === 1 ? '' : 's'} rewritten`) : L(`${h.bEnd - h.bStart}줄 더함`, `${h.bEnd - h.bStart} line${h.bEnd - h.bStart === 1 ? '' : 's'} added`)) : '');
      return `<div class="hunk"><div class="hunk-head"><span>${L(`${h.bStart + 1}번째 줄 근처`, `Near line ${h.bStart + 1}`)} · ${what}</span>` +
        (revert ? `<button class="btn" data-hunk="${k}">${L('이 부분 되돌리기', 'Revert this part')}</button>` : '') + '</div>' +
        rows.map(([t, no, tx]) => `<div class="dl ${t}"><span class="no">${no}</span><span class="sg">${sign[t]}</span><span class="tx">${escapeHtml(tx) || ' '}</span></div>`).join('') + '</div>';
    }).join('');
  }
  function fmtTime(t) { const d = new Date(t); return [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':'); }
  function renderChanges() {
    const body = $('#chgBody'), foot = $('#chgFoot');
    document.querySelectorAll('#chgTabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === chg.tab));
    if (chg.tab === 'ver') { renderVersions(); return; }
    const cur = el.editor.value;
    if (chg.tab === 'diff') {
      body.innerHTML = '<p class="chg-help">' + L('마지막으로 저장한 내용과 지금 내용을 비교합니다. <span class="chg-del">− 빨강</span>은 저장한 뒤 지운 줄, <span class="chg-add">+ 초록</span>은 새로 쓴 줄입니다. 왼쪽 숫자는 지금 문서의 줄 번호입니다.', 'Compares the last saved version with what you have now. <span class="chg-del">− Red</span> lines were removed since saving, <span class="chg-add">+ green</span> lines are new. Numbers on the left are line numbers in the current document.') + '</p>' +
        diffHtml(savedText(), cur, { revert: true });
      foot.innerHTML = state.dirty ? '<button class="btn" id="chgRevertAll">' + L('저장한 상태로 모두 되돌리기', 'Revert everything to saved') + '</button><span style="flex:1"></span><button class="btn primary" id="chgSave">' + L('저장', 'Save') + '</button>' : '<span class="chg-help" style="margin:0">' + L('저장한 뒤로 바뀐 것이 없습니다.', 'Nothing has changed since saving.') + '</span>';
      body.querySelectorAll('[data-hunk]').forEach((btn) => (btn.onclick = () => {
        const a = savedText().split('\n'), b = el.editor.value.split('\n');
        const h = hunksOf(lineDiff(a, b))[+btn.dataset.hunk];
        const next = b.slice(0, h.bStart).concat(a.slice(h.aStart, h.aEnd), b.slice(h.bEnd)).join('\n');
        replaceAll(next, L('부분 되돌리기', 'Partial revert'));
        toast(L('그 부분을 저장한 상태로 되돌렸습니다 (Ctrl+Z 로 취소)', 'Reverted that part to the saved version (Ctrl+Z to undo)'));
        renderChanges();
      }));
      const ra = $('#chgRevertAll');
      if (ra) ra.onclick = () => { if (confirm(L('저장한 뒤 고친 내용을 모두 되돌릴까요? (Ctrl+Z 로 다시 살릴 수 있습니다)', 'Revert all edits since the last save? (Ctrl+Z brings them back)'))) { replaceAll(savedText(), L('모두 되돌리기', 'Revert all')); toast(L('저장한 상태로 되돌렸습니다', 'Reverted to the saved version')); renderChanges(); } };
      const sv = $('#chgSave');
      if (sv) sv.onclick = async () => { await save({ skipConfirm: true }); renderChanges(); };
      return;
    }
    // 되돌리기 기록
    snapshot(L('지금', 'Now'));
    const hist = (state.current.history || []).slice().reverse();
    if (chg.pick < 0 || chg.pick >= hist.length) chg.pick = Math.min(1, hist.length - 1);
    const sel = hist[chg.pick];
    const prevList = body.querySelector('.hist-list'); // 기록 탭을 다시 그릴 때만 위치를 이어받음
    const keepList = prevList ? prevList.scrollTop : 0, keepBody = prevList ? body.scrollTop : 0;
    body.innerHTML = '<p class="chg-help">' + L('고친 내용이 1초마다 기록됩니다. 시점을 누르면 <b>그때로 돌아갈 때 무엇이 바뀌는지</b> 아래에 보여줍니다.', 'Edits are recorded every second. Pick a point to see <b>what would change if you went back to it</b>.') + '</p>' +
      '<div class="hist-list">' + hist.map((h, i) => {
        const tags = [i === 0 ? '<span class="tag now">' + L('지금', 'Now') + '</span>' : '', h.saved ? '<span class="tag saved">' + L('저장됨', 'Saved') + '</span>' : ''].join('');
        const lines = h.text.split('\n').length;
        return `<button class="hist-item${i === chg.pick ? ' on' : ''}" data-i="${i}"><span class="ht">${fmtTime(h.t)}</span><span class="hl">${escapeHtml(h.label)}</span>${tags}<span class="hn">${L(`${lines}줄`, `${lines} line${lines === 1 ? '' : 's'}`)}</span></button>`;
      }).join('') + '</div>' +
      (sel && chg.pick > 0 ? `<div class="hist-preview"><div class="hist-cap">${L(`${fmtTime(sel.t)} 로 돌아가면 지금 문서가 이렇게 바뀝니다`, `Going back to ${fmtTime(sel.t)} changes the document like this`)}</div>${diffHtml(cur, sel.text)}</div>` : '<p class="chg-help">' + L('위에서 돌아갈 시점을 고르세요.', 'Pick a point above to go back to.') + '</p>');
    foot.innerHTML = sel && chg.pick > 0 ? `<span class="chg-help" style="margin:0">${L('돌아간 뒤에도 Ctrl+Z 로 취소할 수 있습니다.', 'You can still undo with Ctrl+Z afterwards.')}</span><span style="flex:1"></span><button class="btn primary" id="chgRestore">${L(`${fmtTime(sel.t)} 로 되돌리기`, `Go back to ${fmtTime(sel.t)}`)}</button>` : '';
    // 다시 그려도 목록 · 창 스크롤 위치는 그대로
    body.querySelector('.hist-list').scrollTop = keepList;
    body.scrollTop = keepBody;
    body.querySelectorAll('.hist-item').forEach((b) => (b.onclick = () => { chg.pick = +b.dataset.i; renderChanges(); }));
    const rs = $('#chgRestore');
    if (rs) rs.onclick = () => { replaceAll(sel.text, L(fmtTime(sel.t) + ' 로 되돌림', 'Back to ' + fmtTime(sel.t))); chg.pick = 1; toast(L(fmtTime(sel.t) + ' 시점으로 되돌렸습니다 (Ctrl+Z 로 취소)', 'Went back to ' + fmtTime(sel.t) + ' (Ctrl+Z to undo)')); renderChanges(); };
  }
  // 밖에서(Claude 등) 바뀐 곳을 몇 초 동안 빛나게
  function flashExternal(oldText, newText) {
    const hunks = hunksOf(lineDiff(oldText.split('\n'), newText.split('\n')));
    if (!hunks.length) return;
    const hit = (line) => hunks.some((h) => (h.bEnd > h.bStart ? line >= h.bStart && line < h.bEnd : line === h.bStart));
    const flashed = [];
    const blocks = [...el.doc.children].filter((n) => n.dataset.line != null);
    blocks.forEach((n, i) => {
      const start = +n.dataset.line;
      const end = i + 1 < blocks.length ? +blocks[i + 1].dataset.line : Infinity;
      if (hunks.some((h) => { const a = h.bStart, b = Math.max(h.bEnd, h.bStart + 1); return a < end && b > start; })) { n.classList.add('ext-flash'); flashed.push(n); }
    });
    if (state.editing) [...elHl.children].forEach((ln, j) => { if (hit(j)) { ln.classList.add('ln-ext'); flashed.push(ln); } });
    flashed[0]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setTimeout(() => flashed.forEach((n) => n.classList.remove('ext-flash', 'ln-ext')), 4500);
  }
  function showExternalDiff(oldText, newText, who) {
    if (!state.current) return;
    $('#chgTabs').hidden = true;
    const title = $('#chgTitle');
    title.hidden = false;
    title.textContent = who === 'claude' ? L('Claude가 바꾼 내용', 'Changes by Claude') : L('밖에서 바꾼 내용', 'Changes made outside');
    $('#chgBody').innerHTML = `<p class="chg-help">${L(`${escapeHtml(state.current.path)} 이(가) 바깥에서 고쳐졌습니다.`, `${escapeHtml(state.current.path)} was changed outside markcont.`)} <span class="chg-del">${L('− 지운 줄', '− removed')}</span> · <span class="chg-add">${L('+ 새로 쓴 줄', '+ added')}</span></p>` + diffHtml(oldText, newText);
    $('#chgFoot').innerHTML = '<button class="btn" id="extRevert">' + L('이 변경 되돌리기', 'Revert this change') + '</button><span style="flex:1"></span><button class="btn primary" id="extKeep">' + L('그대로 두기', 'Keep') + '</button>';
    $('#changesModal').hidden = false;
    $('#extKeep').onclick = closeChanges;
    $('#extRevert').onclick = async () => {
      if (el.editor.value !== newText) { toast(L('그 뒤로 문서가 또 바뀌어서 되돌릴 수 없습니다. 되돌리기 기록을 써 주세요.', 'The document changed again since then, so this can\'t be reverted. Use the undo history instead.'), 4000); return; }
      replaceAll(oldText, who === 'claude' ? L('Claude가 고치기 전으로 되돌림', 'Reverted Claude\'s edit') : L('밖에서 고치기 전으로 되돌림', 'Reverted outside change'));
      closeChanges();
      await save({ skipConfirm: true });
      toast(L('바깥에서 바뀌기 전으로 되돌려 저장했습니다', 'Reverted the outside change and saved'));
    };
  }
  // PC 프로그램: Claude(MCP)가 최근에 고친 파일 (경로 → 시각)
  const mcpRecent = new Map();
  const normPath = (p) => (p || '').replace(/\\/g, '/').toLowerCase();
  function recentMcpWrite(e) {
    const t = e && e.tauriPath ? mcpRecent.get(normPath(e.tauriPath)) : 0;
    return !!t && Date.now() - t < 20000;
  }

  /* ---------- 저장 기록 (닫아도 남음) ----------
     저장할 때마다 · Claude나 다른 프로그램이 파일을 바꿀 때마다 그때의 파일 내용을 남김 (14일 · 파일마다 50개).
     PC 프로그램은 앱 설정 폴더(src-tauri/src/history.rs, MCP 서버도 같은 곳에 씀), 웹 앱은 IndexedDB. */
  const VER_KEEP = 50, VER_DAYS = 14;
  const VER_KIND = {
    save: () => L('저장', 'Saved'),
    before: () => L('바뀌기 전', 'Before the change'),
    claude: () => L('Claude가 고침', 'Edited by Claude'),
    outside: () => L('밖에서 바뀜', 'Changed outside'),
  };
  const verTauri = (e) => !!(e && e.tauriPath && isTauri());
  const verKey = (e) => 'f:' + (e.path || e.name);
  const vers = {
    usable: (e) => !!e && !e.builtin && (verTauri(e) || !!window.indexedDB),
    async all(e) { return ((await idb.run('readonly', (s) => s.index('key').getAll(verKey(e)), 'versions')) || []).sort((a, b) => b.t - a.t); },
    // 새것부터 [{ id, t, kind, lines }]
    async list(e) {
      if (verTauri(e)) return tinvoke('history_list', { path: e.tauriPath });
      return (await vers.all(e)).map((v) => ({ id: v.id, t: v.t, kind: v.kind, lines: v.text.split('\n').length }));
    },
    async read(e, id) {
      if (verTauri(e)) return tinvoke('history_read', { path: e.tauriPath, id });
      const v = await idb.run('readonly', (s) => s.get(id), 'versions');
      if (!v) throw new Error('missing');
      return toLF(v.text); // 예전 기록에는 \r\n 이 남아 있을 수 있음 (지금은 \n 으로 맞춘 글만 남김)
    },
    // 바로 앞 기록과 같으면 건너뜀 ('바뀌기 전'은 최근 10개 중 같은 것이 있으면 건너뜀)
    async add(e, text, kind) {
      if (!vers.usable(e) || typeof text !== 'string') return;
      if (verTauri(e)) return tinvoke('history_add', { path: e.tauriPath, text, kind });
      const key = verKey(e), all = await vers.all(e);
      text = toLF(text);
      if (all.slice(0, kind === 'before' ? 10 : 1).some((v) => toLF(v.text) === text)) return;
      const t = Math.max(Date.now(), all.length ? all[0].t + 1 : 0);
      await idb.run('readwrite', (s) => s.add({ key, t, kind, text }), 'versions');
      const limit = Date.now() - VER_DAYS * 864e5;
      const drop = all.filter((v, i) => i >= VER_KEEP - 1 || v.t < limit);
      if (drop.length) await idb.run('readwrite', (s) => { drop.forEach((v) => s.delete(v.id)); }, 'versions');
    },
    // 파일이 oldText → newText 로 바뀜: 바뀌기 전 내용이 기록에 없으면 먼저 남기고, 새 내용을 남김
    async changed(e, oldText, newText, kind) {
      try {
        if (typeof oldText === 'string' && oldText !== newText) await vers.add(e, oldText, 'before');
        await vers.add(e, newText, kind);
      } catch {}
      if (!$('#changesModal').hidden && chg.tab === 'ver' && state.current === e) renderChanges();
    },
    // 웹 앱: 이름을 바꾸면 기록도 옮김 (PC 프로그램은 rename_path 가 옮김)
    async moved(from, to, dir) {
      if (isTauri() || !window.indexedDB) return;
      try {
        const a = 'f:' + from;
        const range = dir ? IDBKeyRange.bound(a + '/', a + '/￿') : IDBKeyRange.only(a);
        const list = (await idb.run('readonly', (s) => s.index('key').getAll(range), 'versions')) || [];
        if (list.length) await idb.run('readwrite', (s) => { list.forEach((v) => s.put({ ...v, key: 'f:' + to + v.key.slice(a.length) })); }, 'versions');
      } catch {}
    },
    async clear(e) {
      if (verTauri(e)) return tinvoke('history_clear', { path: e.tauriPath });
      const ids = (await idb.run('readonly', (s) => s.index('key').getAllKeys(verKey(e)), 'versions')) || [];
      if (ids.length) await idb.run('readwrite', (s) => { ids.forEach((id) => s.delete(id)); }, 'versions');
    },
  };
  // 오래된 기록 정리: 하루에 한 번
  setTimeout(() => {
    if (Date.now() - (+store.get('mdv-ver-prune') || 0) < 864e5) return;
    store.set('mdv-ver-prune', String(Date.now()));
    if (isTauri()) tinvoke('history_prune').catch(() => {});
    if (!window.indexedDB) return;
    const limit = Date.now() - VER_DAYS * 864e5;
    idb.run('readwrite', (s) => {
      const req = s.openCursor();
      req.onsuccess = () => { const c = req.result; if (!c) return; if (c.value.t < limit) c.delete(); c.continue(); };
    }, 'versions').catch(() => {});
  }, 8000);
  // 언제: 오늘 14:03:21 · 어제 09:10 · 11월 5일 14:03
  function fmtWhen(t) {
    const d = new Date(t), now = new Date();
    const two = (x) => String(x).padStart(2, '0');
    const hm = two(d.getHours()) + ':' + two(d.getMinutes());
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const ago = Math.round((day(now) - day(d)) / 864e5);
    if (ago === 0) return L('오늘 ', 'Today ') + hm + ':' + two(d.getSeconds());
    if (ago === 1) return L('어제 ', 'Yesterday ') + hm;
    return d.toLocaleDateString(LANG === 'en' ? 'en' : 'ko', { month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }) + ' ' + hm;
  }
  // 바뀐 내용 창의 「저장 기록」 탭
  async function renderVersions() {
    const body = $('#chgBody'), foot = $('#chgFoot'), e = state.current;
    const seq = (chg.seq = (chg.seq || 0) + 1);
    const help = '<p class="chg-help">' + L(`저장할 때마다, 그리고 Claude나 다른 프로그램이 파일을 바꿀 때마다 그때의 파일 내용이 남습니다. 프로그램을 닫아도 ${VER_DAYS}일 동안, 파일마다 최근 ${VER_KEEP}개까지 남습니다. 시점을 누르면 <b>그 내용으로 돌아갈 때 무엇이 바뀌는지</b> 아래에 보여줍니다.`, `A copy of the file is kept every time you save, and every time Claude or another program changes the file. They stay for ${VER_DAYS} days even after you close the app, up to the latest ${VER_KEEP} per file. Pick one to see <b>what would change if you went back to it</b>.`) + '</p>';
    if (!vers.usable(e)) {
      body.innerHTML = help + '<p class="chg-empty">' + (e && e.builtin ? L('앱에 든 안내 문서는 기록을 남기지 않습니다.', "Built-in documents don't keep saved versions.") : L('이 브라우저에서는 기록을 남길 수 없습니다.', "This browser can't keep saved versions.")) + '</p>';
      foot.innerHTML = '';
      return;
    }
    if (chg.verFor !== e) { chg.verFor = e; chg.vpick = 0; chg.vtext = new Map(); }
    let list = null;
    try { list = await vers.list(e); } catch {}
    if (seq !== chg.seq || chg.tab !== 'ver' || state.current !== e || $('#changesModal').hidden) return;
    if (!list) { body.innerHTML = help + '<p class="chg-empty">' + L('기록을 읽지 못했습니다.', "Couldn't read the saved versions.") + '</p>'; foot.innerHTML = ''; return; }
    if (!list.length) { body.innerHTML = help + '<p class="chg-empty">' + L('아직 남은 기록이 없습니다. 이 문서를 저장하면 그때부터 남습니다.', 'No saved versions yet. They start once you save this document.') + '</p>'; foot.innerHTML = ''; return; }
    chg.vpick = Math.min(Math.max(0, chg.vpick), list.length - 1);
    const need = [...new Set([0, chg.vpick])].filter((i) => !chg.vtext.has(list[i].id));
    try { for (const i of need) chg.vtext.set(list[i].id, await vers.read(e, list[i].id)); } catch {}
    if (seq !== chg.seq || chg.tab !== 'ver' || state.current !== e) return;
    const sel = list[chg.vpick], selText = chg.vtext.get(sel.id), cur = el.editor.value;
    const prevList = body.querySelector('.hist-list.ver'), keepList = prevList ? prevList.scrollTop : 0, keepBody = prevList ? body.scrollTop : 0;
    body.innerHTML = help + '<div class="hist-list ver">' + list.map((v, i) => {
      const isFile = i === 0 && chg.vtext.get(v.id) === savedText();
      const tags = isFile ? '<span class="tag now">' + L('지금 파일', 'Current file') + '</span>' : '';
      const label = (VER_KIND[v.kind] || VER_KIND.save)();
      return `<button class="hist-item${i === chg.vpick ? ' on' : ''}" data-i="${i}"><span class="ht">${escapeHtml(fmtWhen(v.t))}</span><span class="hl">${escapeHtml(label)}</span>${tags}<span class="hn">${L(`${v.lines}줄`, `${v.lines} line${v.lines === 1 ? '' : 's'}`)}</span></button>`;
    }).join('') + '</div>' +
      (selText == null ? '<p class="chg-empty">' + L('이 기록을 읽지 못했습니다.', "Couldn't read this version.") + '</p>'
        : selText === cur ? '<p class="chg-help">' + L('지금 편집창의 내용과 같습니다.', 'Same as what is in the editor now.') + '</p>'
        : `<div class="hist-preview"><div class="hist-cap">${L(`${escapeHtml(fmtWhen(sel.t))} 내용으로 돌아가면 지금 문서가 이렇게 바뀝니다`, `Going back to ${escapeHtml(fmtWhen(sel.t))} changes the document like this`)}</div>${diffHtml(cur, selText)}</div>`);
    foot.innerHTML = '<button class="btn" id="verClear">' + L('이 문서 기록 지우기', 'Delete these versions') + '</button><span style="flex:1"></span>' +
      (selText != null && selText !== cur ? `<button class="btn primary" id="verRestore">${L(`${escapeHtml(fmtWhen(sel.t))} 내용으로 되돌리기`, `Go back to ${escapeHtml(fmtWhen(sel.t))}`)}</button>` : '');
    body.querySelector('.hist-list').scrollTop = keepList;
    body.scrollTop = keepBody;
    body.querySelectorAll('.hist-item').forEach((b) => (b.onclick = () => { chg.vpick = +b.dataset.i; renderChanges(); }));
    $('#verClear').onclick = async () => {
      if (!confirm(L('이 문서의 저장 기록을 모두 지울까요? 지운 기록은 되살릴 수 없습니다.', 'Delete all saved versions of this document? They cannot be recovered.'))) return;
      try { await vers.clear(e); chg.vtext = new Map(); toast(L('저장 기록을 지웠습니다', 'Saved versions deleted')); } catch (err) { toast(L('지우지 못했습니다: ', "Couldn't delete: ") + ((err && err.message) || err), 4000); }
      renderChanges();
    };
    const rs = $('#verRestore');
    if (rs) rs.onclick = () => {
      replaceAll(selText, L(`${fmtWhen(sel.t)} 저장 기록으로 되돌림`, `Back to the version from ${fmtWhen(sel.t)}`));
      toast(L('되돌렸습니다. 저장하면 파일에도 반영됩니다 (Ctrl+Z 로 취소)', 'Restored. Save to write it to the file (Ctrl+Z to undo)'), 4000);
      renderChanges();
    };
  }

  // 저장 전 확인: 'save' | 'saveAs' | 'cancel' 를 돌려줌
  let confirmResolve = null;
  function confirmSave(mode) {
    return new Promise((resolve) => {
      confirmResolve = resolve;
      const cur = state.current;
      const where = mode === 'over'
        ? (canOverwrite(cur) ? L(`<b>${escapeHtml(cur.tauriPath || cur.path)}</b> 에 저장하면 아래처럼 바뀝니다.`, `Saving to <b>${escapeHtml(cur.tauriPath || cur.path)}</b> changes it like this.`) : L('원래 위치를 몰라서 <b>새 파일</b>로 저장하게 됩니다.', 'The original location is unknown, so this will be saved as a <b>new file</b>.'))
        : L('지금 내용을 <b>새 파일</b>로 저장합니다. 원래 파일은 그대로입니다. 마지막 저장 뒤 바뀐 곳:', 'Saves the current content as a <b>new file</b>. The original stays as it is. Changes since the last save:');
      $('#chgTabs').hidden = true;
      $('#chgTitle').hidden = false;
      $('#chgBody').innerHTML = `<p class="chg-help">${where} <span class="chg-del">${L('− 지운 줄', '− removed')}</span> · <span class="chg-add">${L('+ 새로 쓴 줄', '+ added')}</span></p>` + diffHtml(savedText(), el.editor.value);
      $('#chgFoot').innerHTML =
        '<label class="check-row" style="font-size:12.5px;margin-right:auto"><input type="checkbox" id="chgNoAsk"><span>' + L('다음부터 묻지 않기', "Don't ask again") + '</span></label>' +
        '<button class="btn" data-r="cancel">' + L('취소', 'Cancel') + '</button>' +
        (mode === 'over' ? '<button class="btn" data-r="saveAs">' + L('새 파일로 저장…', 'Save as new file…') + '</button>' : '') +
        `<button class="btn primary" data-r="save">${mode === 'over' ? L('저장', 'Save') : L('저장 위치 고르기…', 'Choose where to save…')}</button>`;
      $('#chgFoot').querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => finishConfirm(b.dataset.r)));
      $('#changesModal').hidden = false;
      $('#chgFoot [data-r="save"]').focus();
    });
  }
  function finishConfirm(result) {
    if (result !== 'cancel' && $('#chgNoAsk') && $('#chgNoAsk').checked) {
      settings.confirmSave = false;
      applySettings();
      setTimeout(() => toast(L('저장 전 확인을 껐습니다. 보기 설정(Aa)에서 다시 켤 수 있어요.', 'Review before saving is off. You can turn it back on in View settings (Aa).'), 3500), 1200);
    }
    $('#changesModal').hidden = true;
    $('#chgTitle').hidden = true;
    $('#chgTabs').hidden = false;
    const res = confirmResolve;
    confirmResolve = null;
    if (res) res(result);
    el.editor.focus({ preventScroll: true });
  }
  // 확인이 필요한지: 설정이 켜져 있고, 저장한 내용과 다를 때
  const needConfirm = () => settings.confirmSave && state.current && savedText() !== el.editor.value;

  function openChanges(tab) {
    if (!state.current) return;
    if (!state.editing) setEditing(true);
    chg.tab = tab || (state.dirty ? 'diff' : 'hist');
    chg.pick = -1;
    chg.verFor = null;
    $('#changesModal').hidden = false;
    renderChanges();
  }
  function closeChanges() { if (confirmResolve) { finishConfirm('cancel'); return; } $('#changesModal').hidden = true; $('#chgTitle').hidden = true; $('#chgTitle').textContent = L('저장 전에 바뀐 내용 확인', 'Review changes before saving'); $('#chgTabs').hidden = false; el.editor.focus({ preventScroll: true }); }
  $('#chgTabs').onclick = (e) => { const v = e.target.closest('button')?.dataset.v; if (v) { chg.tab = v; chg.pick = -1; renderChanges(); } };
  $('#chgClose').onclick = closeChanges;
  $('#changesModal').addEventListener('click', (e) => { if (e.target.id === 'changesModal') closeChanges(); });
  $('#stChanges').onclick = () => openChanges('diff');
  $('#btnChanges').onclick = () => openChanges();
  window.addEventListener('keydown', (e) => {
    if (!$('#changesModal').hidden && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeChanges(); }
    else if (confirmResolve && e.key === 'Enter' && !e.isComposing && !(e.target.closest && e.target.closest('button, input'))) { e.preventDefault(); e.stopImmediatePropagation(); finishConfirm('save'); }
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h' && state.current) { e.preventDefault(); openChanges('hist'); }
  }, true);

  /* =========================================================
     편집창 ↔ 미리보기 스크롤 맞추기 (원본 줄 번호 기준)
     ========================================================= */
  const mirror = document.createElement('div');
  mirror.className = 'editor-mirror';
  mirror.setAttribute('aria-hidden', 'true');
  document.body.append(mirror);
  let lineTops = null;
  function measureLines() {
    const ta = el.editor, cs = getComputedStyle(ta);
    mirror.style.width = ta.clientWidth + 'px';
    for (const p of ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'tabSize']) mirror.style[p] = cs[p];
    const frag = document.createDocumentFragment();
    for (const l of ta.value.split('\n')) {
      const d = document.createElement('div');
      d.textContent = l || '​';
      frag.append(d);
    }
    mirror.replaceChildren(frag);
    lineTops = [...mirror.children].map((c) => c.offsetTop);
    lineTops.push(mirror.scrollHeight);
  }
  function editorYToLine(y) {
    if (!lineTops) measureLines();
    let lo = 0, hi = lineTops.length - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineTops[mid] <= y) lo = mid; else hi = mid - 1; }
    const span = (lineTops[lo + 1] - lineTops[lo]) || 1;
    return lo + Math.min(1, Math.max(0, (y - lineTops[lo]) / span));
  }
  function lineToEditorY(line) {
    if (!lineTops) measureLines();
    const i = Math.max(0, Math.min(Math.floor(line), lineTops.length - 2));
    return lineTops[i] + (line - i) * (lineTops[i + 1] - lineTops[i]);
  }

  /* ---------- 편집기 자동 완성: [[ 를 치면 문서 · 제목, / 를 치면 블록 메뉴 ---------- */
  //  - / 는 한국어 글에 자주 나와서(11/7 · 및/또는 · 경로 · 주소) 줄 맨 앞이나 빈칸 바로 뒤에서만, 코드 안에서는 띄우지 않음
  //  - Esc 로 닫으면 친 글자는 그대로 둠. 한글을 입력하는 중에도 바로 걸러 보여 주되, 입력 중의 Enter · 화살표는 입력기에 넘김
  const ac = { box: null, kind: '', start: 0, shown: [], cur: 0, seq: 0, dismissed: -1 };
  function acBox() {
    if (ac.box) return ac.box;
    const b = document.createElement('div');
    b.className = 'ac-pop';
    b.hidden = true;
    b.setAttribute('role', 'listbox');
    b.addEventListener('mousedown', (e) => { e.preventDefault(); const r = e.target.closest('.ac-item'); if (r) acChoose(+r.dataset.i); }); // 편집기 커서를 잃지 않게
    b.addEventListener('mousemove', (e) => { const r = e.target.closest('.ac-item'); if (r && +r.dataset.i !== ac.cur) acMark(+r.dataset.i, false); });
    document.body.append(b);
    return (ac.box = b);
  }
  function acClose() { if (ac.box) ac.box.hidden = true; ac.kind = ''; ac.shown = []; }
  // 커서 자리(화면 좌표): 편집기 거울(lineTops)로 줄 위치를, 그 줄을 커서까지 따로 그려 줄 안 위치를 잼
  function caretPoint() {
    const ta = el.editor, v = ta.value, pos = ta.selectionStart, cs = getComputedStyle(ta);
    if (!lineTops) measureLines();
    const ls = v.lastIndexOf('\n', pos - 1) + 1;
    const lineNo = (v.slice(0, ls).match(/\n/g) || []).length;
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:border-box;width:${ta.clientWidth}px`;
    for (const p of ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'paddingLeft', 'paddingRight', 'tabSize']) probe.style[p] = cs[p];
    probe.textContent = v.slice(ls, pos);
    const mk = document.createElement('span');
    mk.textContent = '​';
    probe.append(mk);
    document.body.append(probe);
    const x = mk.offsetLeft, y = mk.offsetTop, h = mk.offsetHeight || parseFloat(cs.lineHeight) || 20;
    probe.remove();
    const r = ta.getBoundingClientRect();
    return { x: r.left + x - ta.scrollLeft, y: r.top + (lineTops[lineNo] ?? 0) + y - ta.scrollTop, h };
  }
  function acPlace() {
    const b = ac.box, p = caretPoint();
    const w = b.offsetWidth, h = b.offsetHeight;
    let top = p.y + p.h + 4;
    if (top + h > innerHeight - 8 && p.y - h - 4 > 8) top = p.y - h - 4; // 아래 자리가 없으면 위로
    b.style.left = Math.max(8, Math.min(p.x - 10, innerWidth - w - 8)) + 'px';
    b.style.top = Math.max(8, top) + 'px';
  }
  function acMark(i, scroll) {
    if (!ac.shown.length) return;
    ac.cur = (i + ac.shown.length) % ac.shown.length;
    ac.box.querySelectorAll('.ac-item.on').forEach((r) => r.classList.remove('on'));
    const r = ac.box.querySelector(`.ac-item[data-i="${ac.cur}"]`);
    if (r) { r.classList.add('on'); if (scroll) r.scrollIntoView({ block: 'nearest' }); }
  }
  // 후보를 걸러 보여 줌 (빠른 열기와 같은 찾기: 초성 · 띄어쓰기 무시)
  function acShow(kind, start, items, query, head) {
    const q = prepText(query.trim());
    let rows = items.map((it) => ({ it }));
    if (q.length) {
      rows = [];
      for (const it of items) {
        let best = null;
        for (const [text, pen] of [[it.label, 0], [it.alt, 40]]) {
          if (!text) continue;
          const t = prepName(text), m = textMatch(q, t);
          if (m && (!best || m.score - pen > best.score)) best = { score: m.score - pen, t, at: m.at, label: text === it.label };
        }
        if (best) rows.push({ it, m: best });
      }
      rows.sort((a, b) => b.m.score - a.m.score);
    }
    ac.shown = rows.slice(0, 40);
    if (!ac.shown.length) { acClose(); return; }
    const b = acBox();
    ac.kind = kind;
    ac.start = start;
    b.innerHTML = (head ? `<div class="ac-head">${escapeHtml(head)}</div>` : '') + ac.shown.map(({ it, m }, i) =>
      `<div class="ac-item" role="option" data-i="${i}"><span class="ac-name">${m && m.label ? markText(m.t, m.at) : escapeHtml(it.label)}</span>${it.sub ? `<span class="ac-sub">${escapeHtml(it.sub)}</span>` : ''}</div>`).join('');
    b.hidden = false;
    acMark(0, true);
    acPlace();
  }
  // 문서 후보: 열어 둔 폴더의 마크다운 (이름이 겹치면 폴더 경로까지)
  function acDocs() {
    const docs = state.files.filter((f) => !f.builtin && MD_EXT.test(f.name) && f !== state.current);
    const count = new Map();
    for (const f of docs) { const k = nfc(f.name).toLowerCase(); count.set(k, (count.get(k) || 0) + 1); }
    return docs.map((f) => {
      const n = f.name.replace(MD_EXT, '');
      const dup = count.get(nfc(f.name).toLowerCase()) > 1;
      return { label: n, sub: parentOf(f.path), insert: dup ? (relOf(f.path) || f.path).replace(MD_EXT, '') : n };
    }).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }
  async function acHeads(docName) {
    let text;
    if (!docName) text = source();
    else {
      const key = nfc(docName).toLowerCase();
      const f = state.files.find((x) => !x.builtin && MD_EXT.test(x.name) && (nfc(x.name.replace(MD_EXT, '')).toLowerCase() === key || nfc((relOf(x.path) || x.path).replace(MD_EXT, '')).toLowerCase() === key));
      if (!f) return [];
      try { text = await peekText(f); } catch { return []; }
    }
    return scanDoc(text).heads.map((h) => ({ label: h.title, sub: '#'.repeat(h.level), insert: (docName ? docName : '') + '#' + h.title }));
  }
  function slashItems() {
    const F = '```', ko = LANG === 'ko';
    const it = (k, e, sub, text, alt, inline) => ({ label: L(k, e), alt: L(e, k) + (alt ? ' ' + alt : ''), sub, text, inline });
    return [
      it('표', 'Table', '| |', L('| 항목 | 내용 |\n|:---|:---|\n| ¦ |  |', '| Item | Details |\n|:---|:---|\n| ¦ |  |'), 'table'),
      it('알림 상자 · 참고', 'Callout · note', '> [!NOTE]', '> [!NOTE]\n> ¦', 'callout alert'),
      it('알림 상자 · 팁', 'Callout · tip', '> [!TIP]', '> [!TIP]\n> ¦', 'callout alert'),
      it('알림 상자 · 중요', 'Callout · important', '> [!IMPORTANT]', '> [!IMPORTANT]\n> ¦', 'callout alert'),
      it('알림 상자 · 주의', 'Callout · warning', '> [!WARNING]', '> [!WARNING]\n> ¦', 'callout alert'),
      it('알림 상자 · 위험', 'Callout · caution', '> [!CAUTION]', '> [!CAUTION]\n> ¦', 'callout alert'),
      it('체크리스트', 'Checklist', '- [ ]', '- [ ] ¦', 'todo task'),
      it('코드 블록', 'Code block', F, F + '¦\n\n' + F, 'code'),
      it('흐름도', 'Flowchart', F + 'flow', [F + 'flow', ko ? 'A-01 | 유저 | 시작·종료 | ¦시작 | → A-02' : 'A-01 | user | start | ¦Start | → A-02', ko ? 'A-02 | 시스템 | 조건 | 조건? | 예 → A-03 / 아니오 → A-01' : 'A-02 | system | decision | Condition? | yes → A-03 / no → A-01', ko ? 'A-03 | 유저 | 시작·종료 | 끝 | —' : 'A-03 | user | end | End | —', F].join('\n'), 'flow diagram'),
      it('요약 흐름도', 'Summary flow', F + L('요약흐름', 'summary'), [F + L('요약흐름', 'summary'), L('# ¦단계', '# ¦Stage'), L('- [유저] 하는 일', '- [user] What they do'), L('  한 줄 설명', '  One-line note'), L('- [시스템] 조건 충족?', '- [system] Condition met?'), L('  - 아니오 → [시스템] 끝', '  - no → [system] Ends'), L('- 예 → [시스템] 다음 일', '- yes → [system] Next step'), F].join('\n'), 'summary overview flow'),
      it('주고받는 순서', 'Sequence', F + 'sequence', [F + 'sequence', ko ? '나 -> 앱: ¦요청' : 'Me -> App: ¦Request', ko ? '앱 --> 나: 응답' : 'App --> Me: Response', F].join('\n'), 'sequence diagram'),
      it('노출 위치', 'Exposure tree', F + L('노출', 'ui'), [F + L('노출', 'ui'), L('- ¦화면 이름', '- ¦Screen name'), L('  - 버튼 [열기] (들어오는 곳: 메뉴)', '  - [Open] button (entry: menu)'), L('    - 보이는 것', '    - What shows'), F].join('\n'), 'ui exposure'),
      it('데이터 정의', 'Data definition', F + L('데이터', 'data'), [F + L('데이터', 'data'), L('# ¦데이터 이름 (data_id)', '# ¦Data name (data_id)'), L('필드 | 형식 | 필수 | 설명 | 예시', 'Field | Type | Required | Description | Example'), L('상품 제목 | 글자(40) | 필수 | 목록 · 상세에 보임 | 기본 상품', 'Item title | Text(40) | Required | Shown in the list · details | Basic plan'), F].join('\n'), 'data schema'),
      it('수식 블록', 'Math block', '$$', '$$\n¦\n$$', 'math'),
      it('탭', 'Tabs', '::: tabs', ['::: tabs', L('== 첫째', '== First'), '¦', L('== 둘째', '== Second'), L('내용', 'Content'), ':::'].join('\n'), 'tabs'),
      it('단계', 'Steps', '::: steps', ['::: steps', L('1. ¦첫 단계', '1. ¦First step'), L('2. 다음 단계', '2. Next step'), ':::'].join('\n'), 'steps'),
      it('파일 트리', 'File tree', '::: tree', ['::: tree', '- ¦folder/', '  - file.md', ':::'].join('\n'), 'tree'),
      it('접는 내용', 'Collapsible', '<details>', ['<details>', L('<summary>¦제목</summary>', '<summary>¦Title</summary>'), '', L('내용', 'Content'), '', '</details>'].join('\n'), 'details fold'),
      it('목차', 'Table of contents', '[[_TOC_]]', '[[_TOC_]]¦', 'toc'),
      it('쪽 나눔', 'Page break', L('<!-- 쪽 나눔 -->', '<!-- page break -->'), L('<!-- 쪽 나눔 -->¦', '<!-- page break -->¦'), 'page break print'),
      it('구분선', 'Divider', '---', '---\n¦', 'hr line'),
      it('문서 넣기', 'Embed a document', '![[', '![[¦', 'embed'),
      it('오늘 날짜', "Today's date", today(), today() + '¦', 'date today', true),
    ];
  }
  function acCheck() {
    const ta = el.editor;
    if (!state.editing || ta.selectionStart !== ta.selectionEnd || document.activeElement !== ta) { acClose(); return; }
    const v = ta.value, pos = ta.selectionStart;
    const ls = v.lastIndexOf('\n', pos - 1) + 1, line = v.slice(ls, pos);
    const w = line.match(/\[\[([^[\]|\n]*)$/), s = !w && line.match(/(^|[\s>])\/([^\s/]*)$/);
    if (!w && !s) { ac.dismissed = -1; acClose(); return; }
    if (((line.match(/`/g) || []).length % 2) || fenceBefore(v, ls)) { acClose(); return; } // `코드` · 코드 블록 안
    if (w) {
      const start = ls + w.index + 2, q = w[1];
      if (start === ac.dismissed) { acClose(); return; }
      const hash = q.indexOf('#');
      if (hash < 0) { acShow('wiki', start, acDocs(), q, L('문서', 'Documents')); return; }
      const seq = ++ac.seq, doc = q.slice(0, hash);
      acHeads(doc).then((heads) => { if (seq === ac.seq) acShow('wiki', start, heads, q.slice(hash + 1), doc ? L(`「${doc}」의 제목`, `Headings in "${doc}"`) : L('이 문서의 제목', 'Headings here')); });
      return;
    }
    const start = ls + s.index + s[1].length;
    if (start === ac.dismissed) { acClose(); return; }
    acShow('slash', start, slashItems(), s[2], L('넣기', 'Insert'));
  }
  function acChoose(i) {
    const row = ac.shown[i];
    if (!row) return;
    const ta = el.editor, v = ta.value, pos = ta.selectionStart, kind = ac.kind, start = ac.start;
    acClose();
    if (kind === 'wiki') {
      const close = v.slice(pos, pos + 2) === ']]';
      insertText(row.it.insert + (close ? '' : ']]'), start, pos);
      const at = start + row.it.insert.length + 2;
      ta.setSelectionRange(at, at);
      return;
    }
    // / 블록 메뉴: 「/찾는 말」을 넣을 것으로 바꿈. 블록은 앞뒤를 빈 줄로 띄우고, 들여쓰기 · 인용(>) 안이면 줄마다 같은 머리를 붙임
    const ls = v.lastIndexOf('\n', start - 1) + 1, lead = v.slice(ls, start);
    let text = row.it.text;
    let a = start;
    if (!row.it.inline && /^[\s>]*$/.test(lead)) {
      text = text.split('\n').map((l, k) => (k ? lead + l : l)).join('\n');
      if (!/>/.test(lead)) {
        const before = v.slice(0, ls), after = v.slice(pos);
        const pre = !before || /\n\n$/.test(before) || /^\s*$/.test(before) ? '' : '\n';
        const post = !after || /^\n\n/.test(after) ? '' : /^\n/.test(after) ? '\n' : '\n\n';
        text = pre + text + post;
      }
    } else if (!row.it.inline) {
      text = '\n\n' + text + '\n\n'; // 글 중간의 / 뒤에 블록을 넣으면 다음 줄로
    }
    const caret = text.indexOf('¦');
    text = text.replace('¦', '');
    insertText(text, a, pos);
    const at = a + (caret < 0 ? text.length : caret);
    ta.setSelectionRange(at, at);
    if (row.it.text.startsWith('![[')) acCheck(); // 문서 넣기: 바로 문서 후보
  }
  el.editor.addEventListener('keydown', (e) => {
    if (!ac.kind || !ac.box || ac.box.hidden) return;
    if (e.isComposing || e.keyCode === 229) return; // 한글 입력 중의 Enter · 화살표는 입력기 것
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); acMark(ac.cur + (e.key === 'ArrowDown' ? 1 : -1), true); }
    else if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopImmediatePropagation(); acChoose(ac.cur); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); ac.dismissed = ac.start; acClose(); }
  }, true);
  el.editor.addEventListener('input', acCheck);
  el.editor.addEventListener('keyup', (e) => { if (ac.kind && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) acCheck(); });
  el.editor.addEventListener('mousedown', () => setTimeout(() => { if (ac.kind) acCheck(); }));
  el.editor.addEventListener('blur', () => acClose());
  el.editor.addEventListener('scroll', () => { if (ac.kind) acPlace(); });
  function previewAnchors() {
    const base = el.preview.getBoundingClientRect().top - el.preview.scrollTop;
    const out = [];
    let lastLine = -1, lastTop = -1;
    const add = (line, top) => { if (line > lastLine && top >= lastTop) { out.push({ line, top }); lastLine = line; lastTop = top; } };
    for (const n of el.doc.querySelectorAll('[data-line]')) {
      if (!n.offsetParent) continue;
      add(+n.dataset.line, n.getBoundingClientRect().top - base);
      // ```markdown example: 원본의 예시 줄은 '이렇게 쓰면' 칸의 같은 줄에, 닫는 ``` 줄은 그 칸 끝에 맞춤.
      // 블록 전체로 나누면 좁은 화면(두 칸이 위아래로 붙음)에서 원본 줄이 아래 '이렇게 보입니다' 쪽에 맞춰짐
      const code = n.dataset.end && n.querySelector(':scope > .ex-src code');
      if (code) {
        const r = code.getBoundingClientRect();
        add(+n.dataset.line + 1, r.top - base);
        add(+n.dataset.end - 1, r.bottom - base);
      }
    }
    return out;
  }
  function editorToPreview() {
    const ta = el.editor, pv = el.preview;
    if (ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 4) { pv.scrollTop = pv.scrollHeight; return; }
    const line = editorYToLine(ta.scrollTop);
    const a = previewAnchors();
    if (!a.length) return;
    let i = a.findIndex((x) => x.line > line);
    if (i === -1) i = a.length;
    const prev = a[i - 1] || { line: 0, top: 0 };
    const next = a[i] || { line: lineTops.length - 1, top: pv.scrollHeight };
    const ratio = (line - prev.line) / ((next.line - prev.line) || 1);
    pv.scrollTop = prev.top + ratio * (next.top - prev.top) - 24;
  }
  function previewToEditor() {
    const ta = el.editor, pv = el.preview;
    if (pv.scrollTop + pv.clientHeight >= pv.scrollHeight - 4) { ta.scrollTop = ta.scrollHeight; return; }
    const y = pv.scrollTop + 24;
    const a = previewAnchors();
    if (!a.length) return;
    let i = a.findIndex((x) => x.top > y);
    if (i === -1) i = a.length;
    const prev = a[i - 1] || { line: 0, top: 0 };
    if (!lineTops) measureLines();
    const next = a[i] || { line: lineTops.length - 1, top: pv.scrollHeight };
    const ratio = (y - prev.top) / ((next.top - prev.top) || 1);
    ta.scrollTop = lineToEditorY(prev.line + ratio * (next.line - prev.line));
  }
  let syncLock = '', syncTimer;
  function syncFrom(src) {
    if (!state.editing || !settings.sync) return;
    if (syncLock && syncLock !== src) return;
    syncLock = src;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => (syncLock = ''), 150);
    if (src === 'editor') editorToPreview(); else previewToEditor();
  }
  el.editor.addEventListener('scroll', () => requestAnimationFrame(() => syncFrom('editor')));
  el.preview.addEventListener('scroll', () => requestAnimationFrame(() => syncFrom('preview')));
  window.addEventListener('resize', () => { lineTops = null; });

  /* =========================================================
     저장
     ========================================================= */
  function download(name, content, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- 새 파일로 저장 ---------- */
  const canOverwrite = (e) => !!(e && !e.builtin && ((e.tauriPath && window.__TAURI__) || (e.handle && e.handle.createWritable)));
  function suggestName(e) {
    const n = (e && e.name) || L('새 문서.md', 'Untitled.md');
    return MD_EXT.test(n) ? n : n + '.md';
  }
  async function saveAs({ reason, skipConfirm = false } = {}) {
    const cur = state.current;
    if (!cur) return;
    if (!skipConfirm && needConfirm()) {
      const r = await confirmSave('as');
      if (r === 'cancel') return;
      reason = null;
    }
    const text = source();
    const f = saveFmt(cur, text);
    if (!f) { toast(L('저장하지 않았습니다', 'Not saved')); return; }
    // 새 파일도 이 문서의 글자 방식 그대로 (모르면 BOM 없는 UTF-8 · \n)
    const fmt = { eol: f.eol || '\n', bom: !!f.bom, enc: f.enc || 'utf-8' };
    if (reason) toast(reason, 2600);
    try {
      if (isTauri()) {
        const startDir = cur.tauriPath ? cur.tauriPath.replace(/[\\/][^\\/]*$/, '') : null;
        const path = await pickOnce('pick_save_path', { defaultName: suggestName(cur), startDir });
        if (!path) return;
        const modified = await tinvoke('save_file', { path, text, keepHistory: true, ...fmt });
        await adoptSaved({ tauriPath: path, name: path.split(/[\\/]/).pop(), lastModified: modified, fmt }, text);
      } else if (window.showSaveFilePicker) {
        const fh = await window.showSaveFilePicker({
          suggestedName: suggestName(cur),
          types: [{ description: L('마크다운', 'Markdown'), accept: { 'text/markdown': ['.md', '.markdown', '.txt'] } }],
        });
        let before = null;
        try { const file = await fh.getFile(); if (file.size) before = await readText(file); } catch {}
        const data = encodeDoc(text, fmt);
        const w = await fh.createWritable(); await w.write(data); await w.close();
        await adoptSaved({ handle: fh, name: fh.name, lastModified: (await fh.getFile()).lastModified, fmt }, text);
        vers.changed(state.current, before, text, 'save');
      } else {
        // 파일 위치를 고를 수 없는 브라우저(Safari · Firefox): 이름만 정해 다운로드
        let name = prompt(L('저장할 파일 이름 (다운로드 폴더에 저장됩니다)', 'File name (saved to your Downloads folder)'), suggestName(cur));
        if (!name) return;
        name = name.trim();
        if (!MD_EXT.test(name)) name += '.md';
        download(name, encodeDoc(text, fmt), 'text/markdown;charset=' + fmt.enc);
        keepFmt(cur, fmt);
        vers.changed(cur, cur.text, text, 'save');
        cur.text = text; state.dirty = false;
        snapshot(L('다운로드로 저장', 'Saved to Downloads'), { saved: true });
        updateTitle(); applyChangeMarks();
        toast(L('다운로드 폴더에 저장했습니다: ', 'Saved to Downloads: ') + name);
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast(L('저장하지 못했습니다: ', "Couldn't save: ") + ((e && e.message) || e), 4000);
    }
  }
  // 새로 저장한 파일을 지금 문서로 삼음 (열린 폴더 안이면 그 트리의 파일로)
  async function adoptSaved(info, text) {
    const old = state.current;
    let root = null, path = null;
    for (const r of state.roots) {
      if (info.handle && r.kind === 'handle' && r.handle.resolve) {
        try { const segs = await r.handle.resolve(info.handle); if (segs && segs.length) { root = r; path = r.key + '/' + segs.join('/'); break; } } catch {}
      }
      if (info.tauriPath && r.kind === 'tauri') {
        const norm = (x) => x.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
        const base = norm(r.path) + '/', full = info.tauriPath.replace(/\\/g, '/');
        if (full.toLowerCase().startsWith(base)) { root = r; path = r.key + '/' + full.slice(base.length); break; }
      }
    }
    let entry = null;
    if (root) { await refreshFolder({ quiet: true, only: root.key }); entry = state.files.find((f) => f.path === path); }
    if (!entry) {
      let p = info.name, n = 2;
      while (state.files.some((f) => f.path === p && f !== old)) p = info.name.replace(/(\.[^.]+)?$/, ` (${n++})$1`);
      entry = { name: info.name, path: p, loose: true };
      state.files.push(entry);
    }
    Object.assign(entry, { text, lastModified: info.lastModified, builtin: false });
    setFmt(entry, info.fmt);
    if (info.handle) entry.handle = info.handle;
    if (info.tauriPath) entry.tauriPath = info.tauriPath;
    entry.history = (old && old.history ? old.history.slice() : []);
    state.current = entry;
    state.dirty = false;
    if (state.hist[state.histPos] !== entry) { state.hist = state.hist.slice(0, state.histPos + 1); state.hist.push(entry); state.histPos = state.hist.length - 1; updateNav(); }
    snapshot(L('새 파일로 저장', 'Saved as new file'), { saved: true });
    if (root) openDirInTree(parentOf(path));
    updateTitle(); updateMeta(source()); applyChangeMarks(); renderFileList(); remember(entry);
    toast(L('새 파일로 저장했습니다: ', 'Saved as new file: ') + entry.path + (old && old !== entry && (old.handle || old.tauriPath) ? L(' (원래 파일은 그대로)', ' (original untouched)') : ''), 3500);
  }

  async function save({ quiet = false, skipConfirm = false } = {}) {
    const cur = state.current;
    if (!cur) return;
    if (!quiet && !skipConfirm && needConfirm()) {
      const r = await confirmSave('over');
      if (r === 'cancel') return;
      if (r === 'saveAs' || !canOverwrite(cur)) return saveAs({ skipConfirm: true });
    }
    const text = source();
    let saved = false;
    // 원래 파일에 쓸 수 있으면 글자 방식을 먼저 정함 (EUC-KR 에 없는 글자는 물음). 못 쓰면 아래 saveAs 가 정함
    const fmt = (cur.tauriPath && tauriInvoke) || cur.handle?.createWritable ? saveFmt(cur, text) : {};
    if (!fmt) { toast(L('저장하지 않았습니다', 'Not saved')); return; }
    if (cur.tauriPath && tauriInvoke) {
      try {
        // 저장 기록은 PC 프로그램 쪽에서 남김 (바뀌기 전 디스크 내용 → 새 내용)
        // 줄 끝 · BOM · 인코딩은 열 때의 방식으로 되돌려 씀. 모르는 것(null)은 지금 파일의 방식을 따름
        cur.lastModified = await tauriInvoke('save_file', { path: cur.tauriPath, text, keepHistory: true, ...fmtArgs(fmt) });
        keepFmt(cur, fmt);
        saved = true;
        toast(quiet ? L('체크 표시를 파일에 저장했습니다', 'Checkbox saved to the file') : L('원래 파일에 저장했습니다', 'Saved to the original file'));
      } catch (e) {
        toast(L('저장하지 못했습니다: ', "Couldn't save: ") + e, 4000);
        return;
      }
    } else if (cur.handle?.createWritable) {
      try {
        let before = null;
        try { const d = await readDoc(await cur.handle.getFile()); before = d.text; fillFmt(fmt, d); } catch {}
        const data = encodeDoc(text, fmt);
        const w = await cur.handle.createWritable();
        await w.write(data);
        await w.close();
        keepFmt(cur, fmt);
        saved = true;
        vers.changed(cur, before, text, 'save');
        try { cur.lastModified = (await cur.handle.getFile()).lastModified; } catch {}
        toast(quiet ? L('체크 표시를 파일에 저장했습니다', 'Checkbox saved to the file') : L('원래 파일에 저장했습니다', 'Saved to the original file'));
      } catch (e) {
        if (e.name === 'AbortError' || e.name === 'NotAllowedError') { if (!quiet) toast(L('저장 권한이 없어 저장하지 않았습니다', 'Not saved: no permission to write')); return; }
      }
    }
    if (!saved) {
      if (quiet) return;
      return saveAs({ reason: L('원래 파일 위치를 알 수 없어서 새 파일로 저장합니다', 'The original location is unknown, so saving as a new file'), skipConfirm: skipConfirm || settings.confirmSave });
    }
    const prevSaved = cur.text;
    cur.text = text;
    state.dirty = false;
    gs.cache.delete(cur);
    if (!quiet) {
      // 받아들이지 않은 제안이 남아 있으면: 다른 뷰어 · Git 에서는 {++ ++} 가 글자 그대로 보임
      const left = criticMarks(text).length;
      if (left) toast(L(`저장했습니다 · 남은 교정 표기 ${left}개는 다른 뷰어 · Git에서 {++ ++} 그대로 보입니다`, `Saved · ${left} suggestion mark${left === 1 ? '' : 's'} left will show as {++ ++} in other viewers and Git`), 4500);
      offerHeadingFix(cur, prevSaved, text).catch(() => {}); // 제목을 바꿨으면 그 제목을 가리키던 링크도
    }
    snapshot(L('저장', 'Saved'), { saved: true });
    applyChangeMarks();
    updateTitle();
    remember(cur);
  }

  /* ---------- 밖에서 파일이 바뀌면 다시 불러오기 ---------- */
  let polling = false, warnedChange = 0;
  setInterval(async () => {
    const cur = state.current;
    if (!(cur?.handle || (cur?.tauriPath && tauriInvoke)) || document.hidden || polling) return;
    polling = true;
    try {
      // 파일 핸들(브라우저) 또는 PC 프로그램에서 연 파일 경로
      const f = cur.tauriPath
        ? { lastModified: await tauriInvoke('file_modified', { path: cur.tauriPath }) }
        : await cur.handle.getFile();
      if (cur.lastModified && f.lastModified && f.lastModified !== cur.lastModified) {
        if (!state.dirty) {
          const d = cur.tauriPath ? await tauriInvoke('read_file', { path: cur.tauriPath }) : await readDoc(f);
          const text = d.text;
          cur.lastModified = f.lastModified;
          setFmt(cur, d); // 줄 끝 · BOM · 인코딩만 바뀌었어도 다음 저장은 새 방식으로
          if (text !== cur.text) {
            const oldText = cur.text;
            const who = recentMcpWrite(cur) ? 'claude' : 'ext';
            vers.changed(cur, oldText, text, who === 'claude' ? 'claude' : 'outside'); // Claude가 고친 것은 MCP 서버가 이미 남김 (같으면 건너뜀)
            snapshot(L('밖에서 바뀌기 전', 'Before outside change'));
            cur.text = text;
            const keep = el.editor.scrollTop;
            el.editor.value = text;
            el.editor.scrollTop = keep;
            render(true);
            snapshot(who === 'claude' ? L('Claude가 고침', 'Edited by Claude') : L('밖에서 고침', 'Edited outside'), { saved: true });
            flashExternal(oldText, text);
            toast(who === 'claude' ? L('Claude가 이 문서를 고쳤습니다', 'Claude edited this document') : L('밖에서 이 문서를 고쳤습니다', 'This document was changed outside markcont'), 7000, { label: L('바뀐 내용 보기', 'View changes'), onClick: () => showExternalDiff(oldText, text, who) });
          }
        } else if (warnedChange !== f.lastModified) {
          warnedChange = f.lastModified;
          toast(L('파일이 밖에서 바뀌었습니다. 지금 저장하면 그 변경을 덮어씁니다', 'The file changed outside markcont. Saving now will overwrite that change'), 4000);
        }
      }
    } catch {}
    polling = false;
  }, 1500);

  /* =========================================================
     HTML로 저장
     ========================================================= */
  // 주소(blob: · https:)의 내용을 data: 주소로. 받지 못했거나(404 등) 그림이 아니면 오류 (엉뚱한 오류 페이지를 넣지 않게)
  async function blobToDataUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    if (/^https?:/i.test(url) && blob.type && !/^(image|video|audio)\//.test(blob.type)) throw new Error(blob.type);
    return new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => j(fr.error); fr.readAsDataURL(blob); });
  }
  /* ---------- 다른 뷰어용(표준 마크다운) 사본 저장 ---------- */
  async function exportPortable() {
    closeMenus();
    const cur = state.current;
    if (!cur || !window.MarkPortable) return;
    let src = source();
    try { src = await expandEmbeds(src, cur.path, [cur.path]); } catch {} // 문서 넣기 ![[문서]] 는 내용으로 펼침
    try { src = await expandFlowData(src, cur.path); } catch {} // 흐름도 @자료 는 노드 표로 펼침 (다른 뷰어는 파일을 읽지 못함)
    const { text, changes } = MarkPortable.convert(src, { flowCtx: flowState.ctx });
    const name = suggestName(cur).replace(MD_EXT, '') + L('-표준.md', '-standard.md');
    const critics = changes.filter((c) => c.kind === 'critic').length;
    const done = (where) => toast(L(`다른 뷰어용으로 저장했습니다 (${changes.length}곳 바꿈): `, `Saved for other viewers (${changes.length} change${changes.length === 1 ? '' : 's'}): `) + where +
      (critics ? L(` · 받아들이지 않은 교정 표기 ${critics}개는 <ins> · <del> 태그로 들어갔습니다`, ` · ${critics} unresolved suggestion mark${critics === 1 ? '' : 's'} went in as <ins> · <del> tags`) : ''), critics ? 6000 : 4000);
    try {
      if (isTauri()) {
        const startDir = cur.tauriPath ? cur.tauriPath.replace(/[\\/][^\\/]*$/, '') : null;
        const path = await pickOnce('pick_save_path', { defaultName: name, startDir });
        if (!path) return;
        await tinvoke('save_file', { path, text, eol: '\n', bom: false, enc: 'utf-8' }); // 다른 뷰어용 사본은 늘 BOM 없는 UTF-8 · \n
        done(path);
        if (state.roots.length) refreshFolder({ quiet: true });
      } else if (window.showSaveFilePicker) {
        const fh = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: L('마크다운', 'Markdown'), accept: { 'text/markdown': ['.md'] } }] });
        const w = await fh.createWritable(); await w.write(text); await w.close();
        done(fh.name);
      } else {
        download(name, text, 'text/markdown;charset=utf-8');
        done(name);
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast(L('저장하지 못했습니다: ', "Couldn't save: ") + ((e && e.message) || e), 4000);
    }
  }
  async function openCompat() {
    const cur = state.current;
    if (!cur) return;
    const body = $('#compatBody'), foot = $('#compatFoot');
    $('#compatModal').hidden = false;
    if (!body.childElementCount) body.innerHTML = '<p class="chg-help">' + L('살펴보는 중…', 'Checking…') + '</p>';
    // 다른 문서의 제목까지 보도록 링크 색인을 만든 뒤 셈
    let index = null;
    try { index = await linkIndex(); } catch {}
    if (state.current !== cur || $('#compatModal').hidden) return;
    const r = runCheck(source(), cur, index);
    chk.res = r; chk.for = cur; paintCheckBadge();
    const { changes } = r, E = escapeHtml;
    const fixable = changes.filter((c) => !MarkPortable.warnOnly(c.kind)).length;
    const rows = [];
    const row = (line, what, text, warn) => { rows.push(line); return `<button type="button" class="compat-row${warn === 'info' ? ' info' : warn ? ' warn' : ''}" data-i="${rows.length - 1}"><span class="ln">${L(`${line}번째 줄`, `Line ${line}`)}</span><span class="what"><b>${E(what)}</b>${text ? `<small>${E(text)}</small>` : ''}</span></button>`; };
    let h = '<p class="chg-help">' + L('고칠 만한 곳과, 다른 뷰어에서 다르게 보이는 곳을 모았습니다. 줄을 누르면 그 위치로 갑니다.', 'Spots worth fixing, and spots that look different in other viewers. Click a row to jump to it.') + '</p>';
    if (!r.problems) h += '<p class="chg-empty" style="padding:8px 0 4px">' + L('✓ 깨진 링크 · 제목 단계 · 각주 · 표 · 긴 문장 · 작성 규칙 모두 문제없습니다.', '✓ No broken links, heading-level skips, footnote, table, long-sentence or writing-rule issues.') + '</p>';
    for (const g of r.groups) h += `<div class="lk-title">${E(g.title)}<span class="gs-n">${g.items.length}</span></div><div class="compat-list">` + g.items.map((it) => row(it.line + 1, it.what, it.text, it.info ? 'info' : it.warn)).join('') + '</div>';
    h += `<div class="lk-title">${L('다른 뷰어에서 다르게 보이는 곳', 'Looks different in other viewers')}<span class="gs-n">${changes.length}</span></div>`;
    h += changes.length ? '<p class="chg-help" style="margin:2px 0 8px">' + L('아래 문법은 markcont에서만 보기 좋게 보이고, GitHub · VS Code 같은 다른 뷰어에서는 기호가 그대로 보이거나 다르게 보입니다.', 'The syntax below looks nice only in markcont; viewers like GitHub or VS Code show raw symbols or render it differently.') + '</p><div class="compat-list">' + changes.map((c) => {
      const [what, fix] = MarkPortable.describe(c.kind);
      return row(c.line, `${what} → ${fix}`, c.text, MarkPortable.warnOnly(c.kind));
    }).join('') + '</div>' : '<p class="lk-empty">' + L('다르게 보이는 곳이 없습니다.', 'Nothing looks different.') + '</p>';
    body.innerHTML = h;
    foot.innerHTML = '<button class="btn" id="compatExport">' + L('다른 뷰어용으로 저장…', 'Save for other viewers…') + '</button><span style="flex:1"></span>' +
      (r.hidden ? '<button class="btn" id="compatHidden">' + L(`보이지 않는 글자 지우기 (${r.hidden}개)`, `Remove invisible characters (${r.hidden})`) + '</button>' : '') +
      (fixable ? '<button class="btn primary" id="compatFix">' + L(`이 문서를 표준 문법으로 바꾸기 (${fixable}곳)`, `Convert this document (${fixable})`) + '</button>' : '');
    body.querySelectorAll('.compat-row').forEach((b) => (b.onclick = () => { closeCompat(); gotoSourceLine(rows[+b.dataset.i]); }));
    $('#compatExport').onclick = () => { closeCompat(); exportPortable(); };
    const hd = $('#compatHidden');
    if (hd) hd.onclick = () => {
      if (!confirm(L(`보이지 않는 글자 ${r.hidden}개를 지울까요?\n목록에 나온 글자만 지웁니다. 저장하기 전에는 Ctrl+Z 나 되돌리기 기록으로 되돌릴 수 있습니다.`, `Remove ${r.hidden} invisible characters?\nOnly the characters in the list are removed. Until you save you can undo with Ctrl+Z or the undo history.`))) return;
      const text = dropInvisible(source());
      closeCompat();
      if (!state.editing) setEditing(true);
      replaceAll(text, L('보이지 않는 글자 지움', 'Removed invisible characters'));
      toast(L('보이지 않는 글자를 지웠습니다. 저장하기 전에 확인해 주세요.', 'Removed invisible characters. Review before saving.'), 4000);
    };
    const fx = $('#compatFix');
    if (fx) fx.onclick = () => {
      if (!confirm(L('이 문서의 markcont 전용 문법을 표준 문법으로 바꿀까요?\n원래 모양이 바뀌지만, 저장하기 전에는 Ctrl+Z 나 되돌리기 기록으로 되돌릴 수 있습니다.', 'Convert markcont-only syntax in this document to standard syntax?\nThe look will change, but until you save you can undo with Ctrl+Z or the undo history.'))) return;
      const { text } = MarkPortable.convert(source(), { keepCritic: true }); // 받아들이기 전의 제안은 그대로
      closeCompat();
      if (!state.editing) setEditing(true);
      replaceAll(text, L('표준 문법으로 바꿈', 'Converted to standard syntax'));
      toast(L('표준 문법으로 바꿨습니다. 저장하기 전에 확인해 주세요.', 'Converted to standard syntax. Review it before saving.'), 4000);
    };
    $('#compatModal').hidden = false;
  }
  function closeCompat() { $('#compatModal').hidden = true; }
  $('#compatClose').onclick = closeCompat;
  $('#compatModal').addEventListener('click', (e) => { if (e.target.id === 'compatModal') closeCompat(); });

  /* ---------- 문서 스타일 창: CSS 파일 불러오기 · 파일로 저장 · 적용할 곳 ---------- */
  const stUi = { sel: null, timer: 0, flush: null };
  const shortPath = (p) => (p.length > 56 ? '…' + p.slice(-55) : p);
  const styleById = (id) => styles.list.find((s) => s.id === id);
  const newStyleId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function uniqueStyleName(base, self) { let n = base, k = 2; while (styles.list.some((s) => s !== self && s.name === n)) n = `${base} ${k++}`; return n; }
  function ruleText(r) {
    if (r.kind === 'all') return L('모든 문서', 'All documents');
    return (r.kind === 'dir' ? L('폴더: ', 'Folder: ') : L('문서: ', 'Document: ')) + shortPath(r.label || r.key.replace(/^\w+:/, ''));
  }
  function openStyles() {
    closeMenus();
    const cur = styleFor(state.current);
    stUi.sel = cur ? cur.style.id : styleById(stUi.sel) ? stUi.sel : (styles.list[0] || {}).id || null;
    paintStyles();
    $('#styleModal').hidden = false;
  }
  function closeStyles() { if (stUi.flush) stUi.flush(); $('#styleModal').hidden = true; }
  function paintStyleNote(st) {
    const n = $('#stNote');
    if (!n) return;
    const b = safeCss(wrapCss(st.css)).blocked;
    n.classList.toggle('warn', b > 0);
    n.textContent = b
      ? L(`인터넷에서 글꼴 · 그림 등을 받아 오는 곳 ${b}곳은 쓰지 않습니다 (문서를 연 사실이 바깥으로 나가지 않게). 그림 · 글꼴은 data: 주소로 넣으면 됩니다.`, `${b} place${b === 1 ? '' : 's'} that load fonts, images etc. from the internet ${b === 1 ? 'is' : 'are'} skipped (so nothing about your documents leaves your computer). Embed images and fonts as data: URLs instead.`)
      : L('문서 안만 바뀝니다. h2 · p 처럼 문서 속 요소 이름으로 씁니다. HTML로 저장 · 서식 복사에도 들어갑니다.', 'Only the document changes. Write rules with element names inside it, like h2 · p. Also used by Save as HTML and Copy with formatting.');
  }
  function stylesChanged() { saveStyles(); applyUserCss(); paintStyles(); }
  function paintStyles() {
    if (stUi.flush) stUi.flush();
    const E = escapeHtml, st = styleById(stUi.sel), body = $('#styleBody');
    const items = styles.list.map((s) => {
      const rs = styles.rules.filter((r) => r.style === s.id);
      const sum = rs.length ? rs.map(ruleText).join(' · ') : L('쓰는 곳 없음', 'Not used');
      return `<button type="button" class="st-item${s === st ? ' on' : ''}" data-id="${E(s.id)}"><b>${E(s.name)}</b><small>${E(sum)}</small></button>`;
    }).join('');
    let h = `<div class="st-wrap"><div class="st-side">${items || `<p class="st-empty">${L('아직 스타일이 없습니다.', 'No styles yet.')}</p>`}` +
      `<button type="button" class="btn" id="stNew">${L('＋ 새 스타일', '＋ New style')}</button>` +
      `<button type="button" class="btn" id="stImport">${L('CSS 파일 불러오기…', 'Load CSS file…')}</button></div><div class="st-main">`;
    const rs = st ? styles.rules.filter((r) => r.style === st.id) : [];
    const pl = placeOf(state.current);
    if (!st) {
      h += `<p class="st-empty">${L('CSS 파일을 불러오거나 새 스타일을 만드세요. 스타일마다 <b>모든 문서</b>, <b>폴더</b>, <b>문서 하나</b> 중 어디에 쓸지 고를 수 있습니다.', 'Load a CSS file or make a new style. For each style you choose where it applies: <b>all documents</b>, a <b>folder</b>, or a <b>single document</b>.')}</p>`;
    } else {
      h += `<input class="st-name" id="stName" aria-label="${L('스타일 이름', 'Style name')}" spellcheck="false" maxlength="80">` +
        '<textarea id="stCss" spellcheck="false" placeholder="h2 { color: teal; }&#10;p { text-indent: 1em; }"></textarea><p class="st-note" id="stNote"></p>' +
        `<div class="st-sub">${L('적용할 곳', 'Applies to')}</div><div class="st-rules">` +
        (rs.map((r, i) => `<div class="st-rule"><span title="${E(r.label || '')}">${E(ruleText(r))}</span><button type="button" class="btn ghost" data-unrule="${i}">${L('빼기', 'Remove')}</button></div>`).join('') ||
          `<p class="st-empty" style="margin:0">${L('아직 어디에도 쓰지 않습니다. 아래에서 고르세요.', 'Not applied anywhere yet. Pick a place below.')}</p>`) +
        '</div><div class="st-add">' +
        `<button type="button" class="btn" id="stAll">${L('모든 문서에', 'All documents')}</button>` +
        (pl ? `<button type="button" class="btn" id="stFile" title="${E(pl.fileLabel)}">${L('지금 문서에', 'This document')}</button>` : '') +
        (pl && pl.dirs.length ? `<select id="stDir" aria-label="${L('폴더 고르기', 'Pick a folder')}">${pl.dirs.map((d, i) => `<option value="${i}" title="${E(d.label)}">${E(shortPath(d.label))}</option>`).join('')}</select><button type="button" class="btn" id="stDirAdd">${L('이 폴더에', 'This folder')}</button>` : '') +
        '</div>' +
        (!state.current ? `<p class="st-note">${L('문서를 열면 그 문서나 문서가 든 폴더에도 쓸 수 있습니다.', 'Open a document to apply it to that document or its folder.')}</p>`
          : !pl ? `<p class="st-note">${L('새 문서는 파일로 저장한 뒤에 문서 · 폴더를 고를 수 있습니다.', 'Save the new document as a file first to pick it or its folder.')}</p>`
          : pl.dirs.length ? `<p class="st-note">${L('폴더에 쓰면 그 안의 하위 폴더 문서에도 쓰입니다. 한 문서에는 하나만 쓰이며, 지금 문서 → 가까운 폴더 → 모든 문서 순으로 고릅니다.', 'A folder style also covers its subfolders. Each document uses one style, chosen in this order: the document → the nearest folder → all documents.')}</p>` : '') +
        `<div class="st-acts"><button type="button" class="btn" id="stExport">${L('파일로 저장…', 'Save as file…')}</button><span style="flex:1"></span><button type="button" class="btn ghost" id="stDel">${L('이 스타일 지우기', 'Delete this style')}</button></div>`;
    }
    body.innerHTML = h + '</div></div>';
    const now = styleFor(state.current);
    $('#styleFoot').textContent = !state.current ? '' : now ? L(`지금 문서에 쓰는 스타일: 「${now.style.name}」 (${ruleText(now.rule)})`, `This document uses 「${now.style.name}」 (${ruleText(now.rule)})`) : L('지금 문서에는 스타일을 쓰지 않습니다', "This document doesn't use a style");
    body.querySelectorAll('.st-item').forEach((b) => (b.onclick = () => { stUi.sel = b.dataset.id; paintStyles(); }));
    $('#stNew').onclick = () => {
      const s = { id: newStyleId(), name: uniqueStyleName(L('새 스타일', 'New style')), css: '' };
      styles.list.push(s);
      stUi.sel = s.id;
      stylesChanged();
      $('#stCss').focus();
    };
    $('#stImport').onclick = () => styleInput.click();
    if (!st) return;
    body.querySelectorAll('input, textarea, select').forEach((x) => x.addEventListener('keydown', (e) => e.stopPropagation())); // 치는 글자가 단축키로 가지 않게
    const name = $('#stName'), css = $('#stCss');
    name.value = st.name;
    css.value = st.css;
    paintStyleNote(st);
    name.onchange = () => { st.name = uniqueStyleName(name.value.trim() || st.name, st); stylesChanged(); };
    stUi.flush = null;
    css.oninput = () => {
      clearTimeout(stUi.timer);
      stUi.flush = () => { clearTimeout(stUi.timer); stUi.flush = null; st.css = css.value; saveStyles(); applyUserCss(); paintStyleNote(st); };
      stUi.timer = setTimeout(stUi.flush, 250);
    };
    body.querySelectorAll('[data-unrule]').forEach((b) => (b.onclick = () => { const r = rs[+b.dataset.unrule]; styles.rules = styles.rules.filter((x) => x !== r); stylesChanged(); }));
    $('#stAll').onclick = () => setStyleRule(st, 'all', '', '');
    if ($('#stFile')) $('#stFile').onclick = () => setStyleRule(st, 'file', pl.file, pl.fileLabel);
    if ($('#stDirAdd')) $('#stDirAdd').onclick = () => { const d = pl.dirs[+$('#stDir').value]; if (d) setStyleRule(st, 'dir', d.key, d.label); };
    $('#stExport').onclick = () => exportStyle(st);
    $('#stDel').onclick = () => {
      if (!confirm(L(`「${st.name}」 스타일을 지울까요?\n쓰던 곳에서도 빠집니다. 파일로 저장해 둔 것은 그대로 남습니다.`, `Delete the style 「${st.name}」?\nIt's also removed wherever it was used. Files you saved stay as they are.`))) return;
      styles.list = styles.list.filter((s) => s !== st);
      styles.rules = styles.rules.filter((r) => r.style !== st.id);
      stUi.sel = (styles.list[0] || {}).id || null;
      stylesChanged();
    };
  }
  // 한 곳에는 스타일 하나: 이미 다른 스타일이 있으면 바꿈
  function setStyleRule(st, kind, key, label) {
    const prev = styles.rules.find((r) => r.kind === kind && r.key === key);
    if (prev && prev.style === st.id) return;
    const was = prev && styleById(prev.style);
    styles.rules = styles.rules.filter((r) => r !== prev);
    styles.rules.push({ style: st.id, kind, key, label });
    stylesChanged();
    if (was) toast(L(`그곳에 쓰던 「${was.name}」 대신 「${st.name}」을(를) 씁니다`, `「${st.name}」 now replaces 「${was.name}」 there`));
  }
  const styleInput = Object.assign(document.createElement('input'), { type: 'file', accept: '.css,text/css', multiple: true, hidden: true });
  document.body.append(styleInput);
  styleInput.onchange = async () => {
    const files = [...styleInput.files];
    styleInput.value = '';
    let last = null, n = 0, blocked = 0;
    for (const f of files) {
      if (f.size > 300 * 1024) { toast(L(`${f.name}: 300KB가 넘어서 불러오지 않았습니다`, `${f.name}: over 300 KB, not loaded`), 4000); continue; }
      let css;
      try { css = await f.text(); } catch { continue; }
      const name = (f.name.replace(/\.css$/i, '').trim() || L('스타일', 'Style')).slice(0, 80);
      let st = styles.list.find((s) => s.name === name);
      if (st && st.css !== css && !confirm(L(`「${name}」 스타일이 이미 있습니다. 불러온 파일 내용으로 바꿀까요?\n(적용할 곳은 그대로 둡니다)`, `A style named 「${name}」 already exists. Replace it with the loaded file?\n(Where it applies stays the same)`))) continue;
      if (st) st.css = css; else { st = { id: newStyleId(), name, css }; styles.list.push(st); }
      last = st; n++; blocked += safeCss(wrapCss(css)).blocked;
    }
    if (!last) return;
    stUi.sel = last.id;
    stylesChanged();
    toast(L(`스타일 ${n}개를 불러왔습니다. 「적용할 곳」에서 쓸 곳을 고르세요.`, `Loaded ${n} style${n === 1 ? '' : 's'}. Choose where to use it under 「Applies to」.`) + (blocked ? L(` (인터넷 주소 ${blocked}곳은 쓰지 않음)`, ` (${blocked} internet address${blocked === 1 ? '' : 'es'} skipped)`) : ''), 4500);
  };
  async function exportStyle(st) {
    if (stUi.flush) stUi.flush();
    const name = (st.name.replace(/[\\/:*?"<>|\x00-\x1f]+/g, '_').trim() || 'style') + '.css';
    const text = st.css.endsWith('\n') ? st.css : st.css + '\n';
    const done = (where) => toast(L('스타일을 파일로 저장했습니다: ', 'Saved the style as a file: ') + where, 3500);
    try {
      if (isTauri()) {
        const startDir = state.current && state.current.tauriPath ? state.current.tauriPath.replace(/[\\/][^\\/]*$/, '') : null;
        const path = await pickOnce('pick_save_path', { defaultName: name, startDir, kind: 'css' });
        if (!path) return;
        await tinvoke('save_file', { path, text, eol: '\n', bom: false, enc: 'utf-8' });
        done(path);
      } else if (window.showSaveFilePicker) {
        const fh = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'CSS', accept: { 'text/css': ['.css'] } }] });
        const w = await fh.createWritable(); await w.write(text); await w.close();
        done(fh.name);
      } else {
        download(name, text, 'text/css;charset=utf-8');
        done(name);
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast(L('저장하지 못했습니다: ', "Couldn't save: ") + ((e && e.message) || e), 4000);
    }
  }
  $('#btnStyles').onclick = openStyles;
  $('#styleClose').onclick = closeStyles;
  $('#styleModal').addEventListener('click', (e) => { if (e.target.id === 'styleModal') closeStyles(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#styleModal').hidden) { e.preventDefault(); e.stopImmediatePropagation(); closeStyles(); } }, true);
  // 원본 줄로 가기: 편집 중이면 편집창 커서, 아니면 미리보기에서 그 줄 근처
  function gotoSourceLine(n) {
    if (state.editing) {
      const ta = el.editor, lines = ta.value.split('\n');
      let pos = 0;
      for (let k = 0; k < Math.min(n - 1, lines.length); k++) pos += lines[k].length + 1;
      ta.focus();
      ta.setSelectionRange(pos, pos + (lines[n - 1] || '').length);
      ta.scrollTop = Math.max(0, lineToEditorY(n - 1) - ta.clientHeight / 3);
      return;
    }
    let best = null;
    el.doc.querySelectorAll('[data-line]').forEach((x) => { const l = +x.dataset.line; if (l <= n - 1 && (!best || l >= +best.dataset.line)) best = x; });
    const panel = best && best.closest('.mc-tab-panel[hidden]');
    if (panel) showTab(panel.closest('.mc-tabs'), panel.dataset.tab);
    if (best) { unfoldTo(best); best.scrollIntoView({ block: 'center' }); best.classList.add('flash-line'); setTimeout(() => best.classList.remove('flash-line'), 1500); }
  }
  // 내보내기 · 서식 복사용: 탭은 모두 펼쳐 탭 이름과 함께 (인쇄 CSS 와 같음)
  function expandTabs(root) {
    root.querySelectorAll('.mc-tabs').forEach((box) => {
      box.querySelector(':scope > .mc-tab-bar')?.remove();
      box.querySelectorAll(':scope > .mc-tab-panel').forEach((p) => {
        p.hidden = false;
        p.removeAttribute('hidden');
        const label = document.createElement('p');
        label.innerHTML = '<strong></strong>';
        label.firstChild.textContent = p.dataset.tab;
        p.prepend(label);
      });
    });
  }

  // HTML 저장용: 탭은 살려 둠. 고른 탭 말고는 data-tab-off 만 붙이고 hidden 은 빼서,
  // 스크립트가 돌면 저장본 스크립트(savedTabsScript)가 숨기고, 돌지 않으면 모두 보임
  function keepTabs(root) {
    root.querySelectorAll('.mc-tabs').forEach((box) => {
      const tabs = [...box.querySelectorAll(':scope > .mc-tab-bar > .mc-tab')];
      const pick = (tabs.find((b) => b.classList.contains('on')) || tabs[0])?.dataset.tab;
      tabs.forEach((b) => { b.classList.toggle('on', b.dataset.tab === pick); b.setAttribute('aria-selected', String(b.dataset.tab === pick)); });
      box.querySelectorAll(':scope > .mc-tab-panel').forEach((p) => {
        p.removeAttribute('hidden');
        p.toggleAttribute('data-tab-off', p.dataset.tab !== pick);
      });
    });
  }
  // 이름: 탭 상자(.mc-tabs — 테두리 안 전체) · 탭 막대(.mc-tab-bar — 맨 위 이름 줄) · 탭(.mc-tab — 이름 하나하나) · 탭 내용(.mc-tab-panel — 고른 탭 아래 내용)
  // 인쇄 · PDF: 탭 내용마다 위에 탭 막대 사본(.mc-tab-head)을 붙임 (그 탭이 켜진 모양) — printTabHeads(false) 로 다시 뺌
  //  탭마다 탭 상자가 하나씩, 화면에서 그 탭을 고른 모양 그대로 차례로 찍혀 어디서 탭이 바뀌는지 · 탭이 몇 개인지 보임
  //  Chromium 에서는 탭 내용을 표처럼 두어(mc-tab-repeat) 여러 쪽에 걸친 탭 상자의 탭 막대가 쪽마다 다시 나오게 함
  //  (저장한 HTML 에도 그대로 들어가는 함수라 바깥 변수를 쓰지 않음)
  function printTabHeads(on) {
    document.querySelectorAll('.mc-tab-head').forEach((h) => h.remove());
    document.querySelectorAll('.mc-tab-panel.mc-tab-print').forEach((p) => p.classList.remove('mc-tab-print', 'mc-tab-repeat'));
    if (!on) return;
    const repeat = /Chrome\//.test(navigator.userAgent);
    document.querySelectorAll('.markdown-body .mc-tabs').forEach((box) => {
      const names = [...box.querySelectorAll(':scope > .mc-tab-bar > .mc-tab')].map((b) => b.textContent);
      if (!names.length) return;
      box.querySelectorAll(':scope > .mc-tab-panel').forEach((p, i) => {
        const head = document.createElement('div'), bar = document.createElement('div');
        head.className = 'mc-tab-head';
        head.setAttribute('aria-hidden', 'true');
        bar.className = 'mc-tab-bar';
        names.forEach((n, k) => { const s = document.createElement('span'); s.className = k === i ? 'mc-tab on' : 'mc-tab'; s.textContent = n; bar.append(s); });
        head.append(bar);
        p.prepend(head);
        p.classList.add('mc-tab-print');
        if (repeat) p.classList.add('mc-tab-repeat');
      });
    });
  }
  // 저장한 HTML 의 탭 · 인쇄 동작 (그 파일 안에 그대로 들어가는 스크립트라 바깥 변수를 쓰지 않음 — 탭 막대를 붙이는 함수는 인자로 받음)
  //  - 탭: 누르면 그 패널만, 같은 이름의 탭은 문서 전체에서 같이 바뀜 (앱과 같게)
  //  - 인쇄: 탭은 모두 펼쳐 탭마다 탭 막대를 붙이고, 접는 상자도 펴서 찍은 뒤 닫혀 있던 것만 다시 닫음
  function savedTabsScript(tabHeads) {
    document.documentElement.classList.add('mc-js');
    const show = (box, title) => {
      const tabs = [...box.querySelectorAll(':scope > .mc-tab-bar > .mc-tab')];
      if (!tabs.some((b) => b.dataset.tab === title)) return;
      tabs.forEach((b) => { b.classList.toggle('on', b.dataset.tab === title); b.setAttribute('aria-selected', String(b.dataset.tab === title)); });
      box.querySelectorAll(':scope > .mc-tab-panel').forEach((p) => { p.hidden = p.dataset.tab !== title; p.removeAttribute('data-tab-off'); });
    };
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.mc-tabs').forEach((box) => {
        const on = box.querySelector(':scope > .mc-tab-bar > .mc-tab.on') || box.querySelector(':scope > .mc-tab-bar > .mc-tab');
        if (on) show(box, on.dataset.tab);
      });
    });
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.mc-tab');
      if (!b) return;
      const top = b.getBoundingClientRect().top;
      document.querySelectorAll('.mc-tabs').forEach((box) => show(box, b.dataset.tab));
      window.scrollBy(0, b.getBoundingClientRect().top - top); // 누른 탭이 화면에서 움직이지 않게
    });
    let opened = [];
    window.addEventListener('beforeprint', () => { opened = [...document.querySelectorAll('details:not([open])')]; opened.forEach((d) => (d.open = true)); tabHeads(true); });
    window.addEventListener('afterprint', () => { opened.forEach((d) => (d.open = false)); opened = []; tabHeads(false); });
  }
  // 저장본에 함께 넣는 CSS: 스크립트가 돌기 전에는 고르지 않은 탭을 숨겨 깜빡이지 않게,
  // 스크립트가 꺼진 곳에서는 인쇄처럼 탭 막대 없이 모든 패널을 이름과 함께
  const SAVED_TABS_CSS = `html.mc-js .markdown-body .mc-tab-panel[data-tab-off] { display: none; }
html:not(.mc-js) .markdown-body .mc-tab-bar { display: none; }
html:not(.mc-js) .markdown-body .mc-tab-panel::before { content: attr(data-tab); display: block; font-weight: 700; margin-bottom: .4em; }`;

  // 저장한 HTML 의 왼쪽 목차 (그 파일 안에 그대로 들어가는 스크립트라 바깥 변수를 쓰지 않음)
  //  - 제목을 누르면 그 제목으로, 탭 이름을 누르면 그 탭을 열고 탭 상자로 (숨은 탭 안이면 바깥 탭부터 엶)
  //  - 읽는 위치의 제목 · 지금 켜진 탭을 표시, ☰ 단추로 목차를 여닫음 (좁은 화면에서는 덮개로)
  function savedTocScript() {
    document.addEventListener('DOMContentLoaded', () => {
      const nav = document.querySelector('.st-nav'), btn = document.querySelector('.st-btn');
      if (!nav) return;
      const narrow = () => matchMedia('(max-width: 1000px)').matches;
      const off = (p) => p.hidden || p.hasAttribute('data-tab-off');
      const tabOf = (p) => [...p.parentElement.querySelectorAll(':scope > .mc-tab-bar > .mc-tab')].find((b) => b.dataset.tab === p.dataset.tab);
      const panelOf = (a) => {
        const box = document.querySelector('.mc-tabs[data-toc-box="' + a.dataset.box + '"]');
        return box && [...box.querySelectorAll(':scope > .mc-tab-panel')].find((p) => p.dataset.tab === a.dataset.tab);
      };
      const reveal = (node) => {
        const chain = [];
        for (let p = node.closest('.mc-tab-panel'); p; p = p.parentElement.closest('.mc-tab-panel')) chain.unshift(p);
        for (const p of chain) if (off(p)) { const b = tabOf(p); if (b) b.click(); }
        for (let d = node.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
      };
      const sync = () => nav.querySelectorAll('a.tab').forEach((a) => { const p = panelOf(a); a.classList.toggle('on', !!p && !off(p)); });
      nav.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        e.preventDefault();
        let to;
        if (a.classList.contains('tab')) { const p = panelOf(a); if (!p) return; reveal(p); to = p.parentElement; }
        else { to = document.getElementById(a.dataset.id); if (!to) return; reveal(to); try { history.replaceState(null, '', '#' + encodeURIComponent(a.dataset.id)); } catch (err) { /* file: 주소에서 막히면 그냥 둠 */ } }
        to.scrollIntoView({ block: 'start', behavior: 'smooth' });
        if (narrow()) document.body.classList.remove('st-open');
        sync();
      });
      document.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('.mc-tab')) setTimeout(sync, 0);
        else if (narrow() && document.body.classList.contains('st-open') && !e.target.closest('.st-nav, .st-btn')) document.body.classList.remove('st-open');
      });
      btn.addEventListener('click', () => {
        const key = narrow() ? 'st-open' : 'st-hide';
        document.body.classList.toggle(key);
        btn.setAttribute('aria-expanded', String(narrow() ? document.body.classList.contains('st-open') : !document.body.classList.contains('st-hide')));
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.body.classList.remove('st-open'); });
      sync();
      if (!('IntersectionObserver' in window)) return;
      const links = new Map();
      nav.querySelectorAll('a[data-id]').forEach((a) => { const h = document.getElementById(a.dataset.id); if (h) links.set(h, a); });
      const io = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (!en.isIntersecting) return;
        nav.querySelectorAll('a.active').forEach((x) => x.classList.remove('active'));
        const a = links.get(en.target);
        if (a) { a.classList.add('active'); if (a.scrollIntoViewIfNeeded) a.scrollIntoViewIfNeeded(false); }
      }), { rootMargin: '0px 0px -75% 0px' });
      links.forEach((a, h) => io.observe(h));
    });
  }
  const SAVED_TOC_CSS = `body.has-toc { padding-left: 296px; }
.st-nav { position: fixed; left: 0; top: 0; bottom: 0; width: 280px; box-sizing: border-box; overflow-y: auto; padding: 56px 10px 24px; background: var(--surface); border-right: 1px solid var(--border); font-family: var(--font); z-index: 20; }
.st-nav a { display: block; padding: 5px 10px; border-radius: 6px; font-size: 13.5px; line-height: 1.45; color: var(--muted); text-decoration: none; border-left: 2px solid transparent; overflow-wrap: anywhere; }
.st-nav a:hover { color: var(--text); background: var(--surface-2); }
.st-nav a.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-soft); border-radius: 0 6px 6px 0; }
.st-nav a.l2 { padding-left: 22px; } .st-nav a.l3 { padding-left: 34px; font-size: 13px; } .st-nav a.l4 { padding-left: 46px; font-size: 13px; } .st-nav a.l5 { padding-left: 58px; font-size: 13px; } .st-nav a.l6 { padding-left: 70px; font-size: 13px; }
.st-nav a.tab::before { content: ''; display: inline-block; width: 9px; height: 7px; margin-right: 6px; border: 1.5px solid currentColor; border-bottom: 0; border-radius: 3px 3px 0 0; opacity: .6; }
.st-nav a.tab.on { color: var(--text); font-weight: 600; }
.st-nav a.tab.on::before { background: currentColor; opacity: .85; }
.st-btn { position: fixed; left: 12px; top: 12px; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); cursor: pointer; z-index: 21; }
.st-btn:hover { background: var(--surface-2); }
.st-btn svg { width: 18px; height: 18px; }
body.has-toc.st-hide { padding-left: 16px; }
body.st-hide .st-nav { display: none; }
html:not(.mc-js) .st-btn { display: none; }
@media (max-width: 1000px) {
  body.has-toc, body.has-toc.st-hide { padding-left: 16px; padding-top: 60px; }
  .st-nav, body.st-hide .st-nav { display: none; }
  body.st-open .st-nav { display: block; width: min(300px, 86vw); box-shadow: 0 0 0 100vmax rgba(0, 0, 0, .28), 4px 0 18px rgba(0, 0, 0, .18); }
  html:not(.mc-js) .st-nav { display: block; position: static; width: auto; padding: 0 0 20px; border: 0; background: none; }
}
@media print { .st-nav, .st-btn { display: none !important; } body.has-toc, body.has-toc.st-hide { padding-left: 0; padding-top: 0; } }`;
  // 저장본의 목차 HTML (제목 · 탭이 두 개 미만이면 빈 글). clone 의 탭 상자에는 목차가 찾을 번호(data-toc-box)를 붙임
  function savedTocHtml(clone) {
    const items = tocItems(el.doc);
    if (items.length < 2) return '';
    const boxes = [...el.doc.querySelectorAll('.mc-tabs')];
    clone.querySelectorAll('.mc-tabs').forEach((b, i) => b.setAttribute('data-toc-box', i));
    const links = items.map(({ n, isTab, box, lvl }) => isTab
      ? `<a class="l${lvl} tab" href="#" data-box="${boxes.indexOf(box)}" data-tab="${escapeHtml(n.dataset.tab)}">${escapeHtml(n.dataset.tab)}</a>`
      : `<a class="l${lvl}" href="#${encodeURIComponent(n.id)}" data-id="${escapeHtml(n.id)}">${escapeHtml(headLabel(n))}</a>`).join('\n');
    const label = escapeHtml(L('목차', 'Contents'));
    return `<button type="button" class="st-btn" aria-label="${label}" title="${label}" aria-expanded="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
<nav class="st-nav" aria-label="${label}">
${links}
</nav>
`;
  }

  /* ---------- HTML 저장: 링크된 문서를 파일 안에 함께 넣기 ---------- */
  // 링크 하나가 가리키는 문서: { key, to, name, path } · 지금 문서 자신이면 { key: 'main' } · 찾지 못하면 null
  function savedDocOf(a) {
    if (!('path' in a.dataset)) return null;
    if (a.dataset.builtin) {
      const b = a.dataset.builtin;
      if (!BUILTIN[b]) return null;
      if (state.current.builtin && state.current.path === builtinPath(b)) return { key: 'main' };
      return { key: 'b:' + b, to: { builtin: b }, name: BUILTIN[b].title, path: '' };
    }
    if (a.classList.contains('missing') || !a.dataset.path) return null;
    const entry = state.files.find((f) => f.path === a.dataset.path);
    if (!entry) return null;
    if (entry === state.current) return { key: 'main' };
    return { key: 'f:' + entry.path, to: { entry }, name: entry.name.replace(MD_EXT, ''), path: entry.path };
  }
  // 본문이 직접 링크한 문서들 (한 단계만 — 그 문서들이 다시 링크한 문서는 따라가지 않음)
  function savedLinkedDocs(root) {
    const out = new Map();
    root.querySelectorAll('a').forEach((a) => { const k = savedDocOf(a); if (k && k.key !== 'main' && !out.has(k.key)) out.set(k.key, k); });
    return [...out.values()];
  }
  // 저장본의 문서 링크: 함께 넣은 문서는 data-doc(저장본 스크립트가 옆 칸에 엶), 넣지 않은 문서는 누를 수 없는 표시로. 경로는 남기지 않음
  function savedMarkLinks(root, keys) {
    root.querySelectorAll('a').forEach((a) => {
      if (!('path' in a.dataset)) return;
      const k = savedDocOf(a);
      let hash = a.dataset.hash || (a.dataset.heading ? slugify(a.dataset.heading) : '');
      try { hash = decodeURIComponent(hash); } catch { /* % 가 그냥 글자인 제목 */ }
      for (const n of ['data-path', 'data-builtin', 'data-outside', 'data-heading', 'data-hash', 'title']) a.removeAttribute(n);
      if (k && (k.key === 'main' || keys.has(k.key))) {
        a.setAttribute('href', '#');
        a.dataset.doc = k.key;
        if (hash) a.dataset.docHash = hash;
      } else {
        a.removeAttribute('href');
        a.classList.add('st-missing');
        a.setAttribute('role', 'link');
        a.setAttribute('aria-disabled', 'true');
        a.tabIndex = 0;
        a.title = L('이 파일에는 들어 있지 않은 문서입니다', 'This document is not included in this file');
      }
    });
  }
  // 문서 하나를 화면 밖에서 그려 저장용 사본으로 (그림 · 다이어그램이 다 그려질 때까지 기다림)
  async function savedRenderDoc(entry, n) {
    const text = await svRead(entry);
    const { fm, body } = splitFrontMatter(text);
    const opts = docOptions(fm);
    const host = document.createElement('div'), art = document.createElement('article');
    host.style.cssText = 'position:fixed;left:-99999px;top:0;width:760px;visibility:hidden;pointer-events:none';
    host.setAttribute('aria-hidden', 'true');
    art.className = 'markdown-body';
    host.append(art);
    document.body.append(host);
    try {
      art.innerHTML = (opts.cover ? coverHtml(fm, body, entry) : '') + (fm ? frontMatterHtml(fm) : '') +
        DOMPurify.sanitize(md.render(stripNotes(body), { docId: 'sd' + n }), { ADD_ATTR: ['target'], FORBID_TAGS: ['style'] });
      postProcess(art, entry, opts, { data: new Map(), ctx: null, seq: 0 });
      let prev = -1;
      for (let i = 0; i < 30; i++) { // 내용이 더 바뀌지 않을 때까지 (Mermaid · 흐름도 자료 · 그림 읽기), 길어도 6초
        await settleMedia();
        await new Promise((r) => setTimeout(r, 200));
        const len = art.innerHTML.length;
        if (len === prev && !mediaLoads.size) break;
        prev = len;
      }
      const clone = cleanClone(art, { keepTabs: true });
      return { clone, media: await inlineMedia(clone) };
    } finally { host.remove(); }
  }
  // 저장 전에 묻기: 함께 넣을 문서 고르기 → 고른 key 의 Set (취소하면 null)
  function askSavedDocs(list) {
    return new Promise((resolve) => {
      const m = document.createElement('div');
      m.className = 'modal';
      m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(L('함께 넣을 문서', 'Documents to include'))}">
<div class="modal-head"><div class="modal-title">${escapeHtml(L(`링크된 문서 ${list.length}개를 함께 넣을까요?`, `Include ${list.length} linked document${list.length === 1 ? '' : 's'}?`))}</div></div>
<div class="modal-body"><p class="side-note" style="margin:0 0 12px">${escapeHtml(L('체크한 문서는 내용이 HTML 파일 안에 들어가서, 받는 사람이 링크를 누르면 옆에서 볼 수 있습니다. 빼면 그 링크는 누를 수 없는 표시로 남습니다. 넣은 문서가 다시 링크한 문서는 넣지 않습니다.', 'Checked documents are put inside the HTML file, so readers can open them beside the page from their links. Unchecked ones stay as links that cannot be opened. Documents linked from the included ones are not added.'))}</p>
<div class="sd-pick" style="display:grid;gap:10px;max-height:46vh;overflow:auto">${list.map((d, i) => `<label class="check-row"><input type="checkbox" data-i="${i}" checked><span>${escapeHtml(d.name)}${d.path ? `<small>${escapeHtml(d.path)}</small>` : ''}</span></label>`).join('')}</div></div>
<div class="modal-foot"><button class="btn" data-r="none" style="margin-right:auto">${escapeHtml(L('모두 빼기', 'Uncheck all'))}</button><button class="btn" data-r="cancel">${escapeHtml(L('취소', 'Cancel'))}</button><button class="btn primary" data-r="save">${escapeHtml(L('저장', 'Save'))}</button></div></div>`;
      const boxes = () => [...m.querySelectorAll('input[type=checkbox]')];
      const done = (r) => { m.remove(); resolve(r); };
      m.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]');
        if (!b) return;
        if (b.dataset.r === 'none') { const any = boxes().some((c) => c.checked); boxes().forEach((c) => (c.checked = !any)); b.textContent = any ? L('모두 넣기', 'Check all') : L('모두 빼기', 'Uncheck all'); }
        else done(b.dataset.r === 'save' ? new Set(boxes().filter((c) => c.checked).map((c) => list[+c.dataset.i].key)) : null);
      });
      m.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); } });
      document.body.append(m);
      m.querySelector('[data-r="save"]').focus();
    });
  }
  // 저장한 HTML 에서 문서 링크를 누를 때 (그 파일 안에 그대로 들어가는 스크립트라 바깥 변수를 쓰지 않음 — 화면 글은 인자로 받음)
  //  - 함께 넣은 문서(<template class="sd-doc">): 오른쪽 칸에 엶. 칸 안의 링크는 칸 내용만 바꾸고 ‹ 로 돌아감, Esc · ✕ 로 닫음
  //  - 이 문서 자신으로 가는 링크: 본문의 그 제목으로
  //  - 넣지 않은 문서: 안내만 잠깐 보여 줌
  function savedDocsScript(T) {
    document.addEventListener('DOMContentLoaded', () => {
      const tpl = (key) => [...document.querySelectorAll('template.sd-doc')].find((t) => t.dataset.doc === key);
      let panel, body, scroller, title, backBtn, hist = [], tip, tipTimer;
      const jump = (root, hash) => {
        let t = null;
        try { t = hash ? root.querySelector('#' + CSS.escape(hash)) : null; } catch (err) { t = null; }
        if (!t) return false;
        const chain = [];
        for (let p = t.closest('.mc-tab-panel'); p; p = p.parentElement.closest('.mc-tab-panel')) chain.unshift(p);
        for (const p of chain) if (p.hidden || p.hasAttribute('data-tab-off')) { const b = [...p.parentElement.querySelectorAll(':scope > .mc-tab-bar > .mc-tab')].find((x) => x.dataset.tab === p.dataset.tab); if (b) b.click(); }
        for (let d = t.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
        t.scrollIntoView({ block: 'start' });
        return true;
      };
      const close = () => { if (panel) panel.hidden = true; document.body.classList.remove('sd-open'); hist = []; };
      const show = (key, hash, push) => {
        const t = tpl(key);
        if (!t) return;
        if (!panel) {
          panel = document.createElement('aside');
          panel.className = 'sd-panel';
          panel.innerHTML = '<div class="sd-head"><button type="button" class="sd-back">\u2039</button><div class="sd-title"><small></small><span></span></div><button type="button" class="sd-close">\u2715</button></div><div class="sd-scroll"><article class="markdown-body"></article></div>';
          backBtn = panel.querySelector('.sd-back'); title = panel.querySelector('.sd-title span'); scroller = panel.querySelector('.sd-scroll'); body = panel.querySelector('article');
          panel.querySelector('.sd-title small').textContent = T.side;
          backBtn.title = T.back; backBtn.setAttribute('aria-label', T.back);
          panel.querySelector('.sd-close').title = T.close; panel.querySelector('.sd-close').setAttribute('aria-label', T.close);
          panel.setAttribute('aria-label', T.side);
          backBtn.onclick = () => { if (hist.length < 2) return; hist.pop(); const p = hist[hist.length - 1]; show(p.key, p.hash, false); };
          panel.querySelector('.sd-close').onclick = close;
          document.body.append(panel);
        }
        if (push !== false) hist.push({ key, hash });
        body.textContent = '';
        body.append(t.content.cloneNode(true));
        title.textContent = t.dataset.name;
        backBtn.disabled = hist.length < 2;
        panel.hidden = false;
        document.body.classList.add('sd-open');
        if (!jump(body, hash)) scroller.scrollTop = 0;
      };
      const note = () => {
        if (!tip) { tip = document.createElement('div'); tip.className = 'sd-toast'; tip.setAttribute('role', 'status'); document.body.append(tip); }
        tip.textContent = T.missing;
        tip.hidden = false;
        clearTimeout(tipTimer);
        tipTimer = setTimeout(() => (tip.hidden = true), 2600);
      };
      const act = (a) => {
        if (a.classList.contains('st-missing')) return note();
        if (a.dataset.doc !== 'main') return show(a.dataset.doc, a.dataset.docHash);
        if (matchMedia('(max-width: 1000px)').matches) close();
        if (!jump(document.querySelector('body > article.markdown-body'), a.dataset.docHash)) window.scrollTo(0, 0);
      };
      document.addEventListener('click', (e) => {
        const a = e.target.closest && e.target.closest('a[data-doc], a.st-missing');
        if (a) { e.preventDefault(); act(a); }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel && !panel.hidden) close();
        else if (e.key === 'Enter' && e.target.matches && e.target.matches('a.st-missing')) note();
      });
    });
  }
  const SAVED_DOCS_CSS = `.markdown-body a.st-missing { color: var(--muted); text-decoration: underline dotted; cursor: help; }
.sd-panel { position: fixed; right: 0; top: 0; bottom: 0; width: min(46vw, 680px); box-sizing: border-box; display: flex; flex-direction: column; background: var(--bg); border-left: 1px solid var(--border); box-shadow: -6px 0 24px rgba(0, 0, 0, .08); z-index: 30; }
.sd-panel[hidden], .sd-toast[hidden] { display: none; }
.sd-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--border); background: var(--surface); font-family: var(--font); }
.sd-head button { flex: none; width: 30px; height: 30px; border: 1px solid var(--border); border-radius: 7px; background: var(--surface); color: var(--text); cursor: pointer; font-size: 15px; line-height: 1; }
.sd-head button:hover:not(:disabled) { background: var(--surface-2); }
.sd-head button:disabled { opacity: .4; cursor: default; }
.sd-title { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: var(--text); }
.sd-title small { display: block; font-size: 11px; font-weight: 400; color: var(--muted); }
.sd-title span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-scroll { flex: 1; overflow: auto; padding: 24px 20px 64px; }
.sd-panel .markdown-body { max-width: none; margin: 0; }
.sd-panel .dt-links { display: none; }
body.sd-open { padding-right: calc(min(46vw, 680px) + 16px); }
.sd-toast { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); max-width: 86vw; padding: 9px 14px; border-radius: 8px; background: var(--text); color: var(--bg); font: 13.5px/1.45 var(--font); z-index: 40; }
@media (max-width: 1000px) { body.sd-open { padding-right: 16px; } .sd-panel { width: 100vw; border-left: 0; } }
@media print { .sd-panel, .sd-toast { display: none !important; } body.sd-open { padding-right: 16px; } }`;

  // 보기 설정을 HTML 저장 · 숨은 틀에 옮길 CSS 변수
  const docVars = () => `:root{--doc-size:${settings.size}px;--doc-width:${WIDTHS[settings.width]};--doc-font:${settings.font === 'serif' ? 'var(--serif)' : 'var(--font)'};--doc-lh:${LINE_H[settings.lh] || LINE_H.normal};--doc-para:${PARA_GAP[settings.para] || PARA_GAP.normal};}`;
  // 내보내기 · 서식 복사 · Word 저장 전에 그린 문서를 정리한 사본: 단추 빼기, 접힌 곳 · 탭 펴기, 찾기 표시 지우기
  //  keepTabs: HTML 저장처럼 탭을 펼치지 않고 살려 둠 (Word 저장 · 서식 복사는 펼친 모양)
  function cleanClone(node, { keepTabs: keep = false } = {}) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('.copy, .h-tools, .code-head button, .dg-expand, .dt-go, .mc-tab-head').forEach((b) => b.remove());
    clone.querySelectorAll('.code-block.expanded').forEach((b) => b.classList.remove('expanded'));
    clone.querySelectorAll('mark.find-hit').forEach((m) => m.replaceWith(document.createTextNode(m.textContent)));
    clone.querySelectorAll('.fold-hidden, .folded').forEach((n) => n.classList.remove('fold-hidden', 'folded'));
    if (keep) keepTabs(clone); else expandTabs(clone);
    clone.querySelectorAll('input.task').forEach((c) => { c.disabled = true; if (c.checked) c.setAttribute('checked', ''); });
    return clone;
  }
  // 밝은 테마로 그린 숨은 틀 (richcopy.js): 어두운 테마여도 붙여 넣는 곳 · Word 에는 흰 바탕 색으로
  async function lightFrame(node) {
    const clone = cleanClone(node);
    clone.querySelectorAll('details').forEach((d) => (d.open = true));
    const fr = await MarkRich.frame({
      css: $('#doc-css').textContent + '\n' + userCssText(),
      vars: docVars(),
      width: el.doc.getBoundingClientRect().width,
      sheets: ['vendor/katex/katex.min.css', 'vendor/hljs-github.min.css'],
    });
    fr.root.append(...clone.childNodes);
    // 요약 흐름도: 넓은 · 좁은 모양 가운데 이 폭에서 안 보이는 쪽은 뺌 (그림이 둘 들어가지 않게)
    fr.root.querySelectorAll('.sf-var').forEach((v) => { if (fr.win.getComputedStyle(v).display === 'none') v.remove(); });
    //  이 틀과 PNG 로 바꾼 그림은 화면과 다른 글꼴로 그려질 수 있어, 글을 화면에서 잰 너비(data-w)에 맞춤
    fr.root.querySelectorAll('.dg-summary text[data-w]').forEach((t) => { t.setAttribute('textLength', t.dataset.w); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); });
    // Mermaid 는 그릴 때 정한 색이 그림 안에 박혀 있어서, 어두운 테마면 밝은 색으로 다시 그림
    const boxes = document.documentElement.dataset.theme === 'dark' ? [...fr.root.querySelectorAll('.mermaid[data-src]')] : [];
    if (boxes.length) {
      try {
        const m = await loadMermaid();
        m.initialize(mermaidConfig(false));
        for (const [i, b] of boxes.entries()) {
          try { b.innerHTML = (await m.render(`mc-light-${Date.now()}-${i}`, b.dataset.src)).svg; } catch {}
        }
      } catch {}
      finally { window.mermaid?.initialize(mermaidConfig(document.documentElement.dataset.theme === 'dark')); }
    }
    return fr;
  }

  // HTML 저장본에 그림을 넣음: 읽어 둔 그림(blob:)과 인터넷 그림(https:)을 data: 주소로.
  //  못 넣은 것(화면에서 못 찾은 그림, 그 사이트가 허락하지 않는 인터넷 그림)은 { src, why } 로 모아 돌려줌
  async function inlineMedia(root) {
    let added = 0;
    const skipped = [];
    for (const m of root.querySelectorAll('img[src], video[src], audio[src]')) {
      const src = m.getAttribute('src');
      const web = /^https?:/i.test(src);
      if (!src.startsWith('blob:') && !(web && m.tagName === 'IMG')) continue; // 인터넷 동영상 · 소리는 크기가 커서 주소로 둠
      try { m.setAttribute('src', await blobToDataUrl(src)); added++; }
      catch (e) { // 유튜브 썸네일은 알리지 않음. TypeError = 사이트가 허락하지 않음 · 연결 안 됨, 그 밖 = 404 등 그 주소에 그림이 없음
        if (!m.closest('a.yt')) skipped.push({ src, why: !web ? 'read' : e instanceof TypeError ? 'web' : 'webGone' });
      }
    }
    root.querySelectorAll('.img-missing').forEach((sp) => skipped.push({ src: sp.querySelector('code')?.textContent || '', why: 'missing' }));
    root.querySelectorAll('img.broken:not([src])').forEach((m) => skipped.push({ src: m.alt || '', why: 'missing' }));
    return { added, skipped };
  }
  function confirmSkippedMedia(list) {
    const why = { missing: L('찾지 못함', 'not found'), read: L('읽지 못함', "couldn't read"), web: L('인터넷 그림 — 받아 올 수 없어 주소로 남김, 받는 사람이 인터넷에 연결돼 있으면 보임', "web image — couldn't fetch it, so the address is kept; readers see it when online"), webGone: L('인터넷 주소에 그림이 없음 — 받는 사람에게도 안 보임', "no image at that web address — readers won't see it either") };
    const NL = String.fromCharCode(10);
    const lines = list.slice(0, 8).map((x) => `• ${x.src} (${why[x.why]})`).join(NL) + (list.length > 8 ? NL + L(`… 외 ${list.length - 8}개`, `… and ${list.length - 8} more`) : '');
    return confirm([
      L(`그림 ${list.length}개는 HTML 파일 안에 넣지 못했습니다.`, `${list.length} image${list.length === 1 ? '' : 's'} couldn't be put inside the HTML file.`),
      lines,
      L('찾지 못한 그림은 그 자리에 파일이 있는지, 웹 앱이라면 그림이 들어 있는 위 폴더를 「폴더 열기」로 열었는지 확인해 주세요. 인터넷 그림은 받는 사람이 인터넷에 연결돼 있으면 보입니다.',
        'For images not found, check that the file is there, and in the web app that you opened the parent folder that contains the images with Open folder. Web images show up when the reader is online.'),
      L('그래도 저장할까요?', 'Save anyway?'),
    ].join(NL + NL));
  }

  async function exportHtml() {
    closeMenus();
    await settleMedia(); // 아직 읽는 중인 그림까지
    const clone = cleanClone(el.doc, { keepTabs: true });
    // 링크된 문서: 무엇을 함께 넣을지 먼저 묻고, 고른 문서를 그려서 파일 안에 넣음
    const cands = savedLinkedDocs(el.doc);
    const picked = cands.length ? await askSavedDocs(cands) : new Set();
    if (!picked) return;
    const media = await inlineMedia(clone);
    const docs = [], failed = [];
    if (picked.size) toast(L('링크된 문서를 넣는 중…', 'Adding linked documents…'), 20000);
    for (const c of cands) {
      if (!picked.has(c.key)) continue;
      try {
        const r = await savedRenderDoc(await svEntryOf(c.to), docs.length);
        docs.push({ key: c.key, name: c.name, clone: r.clone });
        media.added += r.media.added;
        media.skipped.push(...r.media.skipped);
      } catch { failed.push(c.name); }
    }
    const keys = new Set(docs.map((d) => d.key));
    savedMarkLinks(clone, keys);
    docs.forEach((d) => savedMarkLinks(d.clone, keys));
    if (failed.length && !confirm(L(`읽지 못해 넣지 못한 문서: ${failed.join(', ')}\n\n그래도 저장할까요?`, `Couldn't read and include: ${failed.join(', ')}\n\nSave anyway?`))) return;
    if (media.skipped.length && !confirmSkippedMedia(media.skipped)) return;
    const toc = settings.htmlToc !== false ? savedTocHtml(clone) : '';
    const hasDocLinks = !!clone.querySelector('a[data-doc], a.st-missing');
    const docsT = JSON.stringify({ side: L('옆 보기', 'Beside'), back: L('이전 문서', 'Previous document'), close: L('닫기 (Esc)', 'Close (Esc)'), missing: L('이 파일에는 들어 있지 않은 문서입니다', 'This document is not included in this file') }).replace(/</g, '\\u003c');
    const docsHtml = docs.map((d) => `<template class="sd-doc" data-doc="${escapeHtml(d.key)}" data-name="${escapeHtml(d.name)}">\n${d.clone.innerHTML}\n</template>`).join('\n');
    const theme = document.documentElement.dataset.theme;
    const hl = theme === 'dark' ? 'github-dark' : 'github';
    const title = escapeHtml(state.current.name.replace(MD_EXT, ''));
    const vars = docVars();
    const serif = settings.font === 'serif' ? '\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap">' : '';
    const out = `<!doctype html>
<html lang="ko" data-theme="${theme}"${settings.tint && settings.tint !== 'plain' ? ` data-tint="${settings.tint}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">${serif}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.12.0/styles/${hl}.min.css">
<style>${$('#doc-css').textContent}
${vars}
${userCssText()}
body { margin: 0; background: var(--bg); padding: 48px 16px 96px; }
@media print { body { background: #fff; padding: 0; } }
${SAVED_TABS_CSS}${toc ? '\n' + SAVED_TOC_CSS : ''}${hasDocLinks ? '\n' + SAVED_DOCS_CSS : ''}
</style>
<script>(${savedTabsScript.toString()})(${printTabHeads.toString()});${toc ? `(${savedTocScript.toString()})();` : ''}${hasDocLinks ? `(${savedDocsScript.toString()})(${docsT});` : ''}</script>
</head>
<body${toc ? ' class="has-toc"' : ''}>
${toc}<article class="markdown-body">
${clone.innerHTML}
</article>
${docsHtml}
</body>
</html>`;
    download(state.current.name.replace(MD_EXT, '') + '.html', out, 'text/html;charset=utf-8');
    if (docs.length) toast(L(`HTML 파일을 다운로드 폴더에 저장했습니다 (링크된 문서 ${docs.length}개${media.added ? ` · 그림 ${media.added}개` : ''}를 파일 안에 넣음)`, `Saved the HTML file to Downloads (${docs.length} linked document${docs.length === 1 ? '' : 's'}${media.added ? ` · ${media.added} image${media.added === 1 ? '' : 's'}` : ''} included in the file)`), 3600);
    else toast(media.added
      ? L(`HTML 파일을 다운로드 폴더에 저장했습니다 (그림 ${media.added}개를 파일 안에 넣음)`, `Saved the HTML file to Downloads (${media.added} image${media.added === 1 ? '' : 's'} included in the file)`)
      : L('HTML 파일을 다운로드 폴더에 저장했습니다', 'Saved the HTML file to Downloads'));
  }

  /* =========================================================
     메뉴, 사이드바, 집중 모드
     ========================================================= */
  // 묶음 항목(내보내기 · 도움말): 한 번에 하나만 펼침, 메뉴를 닫으면 다시 접힘
  function setMenuSub(b, open) {
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    $('#' + b.getAttribute('aria-controls')).hidden = !open;
  }
  function closeMenus() {
    document.querySelectorAll('.menu').forEach((m) => (m.hidden = true));
    document.querySelectorAll('.menu-sub[aria-expanded="true"]').forEach((b) => setMenuSub(b, false));
  }
  // 창 아래로 잘리지 않게: 메뉴 위쪽부터 창 바닥까지 남은 높이만큼만 쓰고, 넘치면 메뉴 안에서 스크롤
  function fitMenu(m) {
    m.style.maxHeight = '';
    m.style.maxHeight = Math.max(160, window.innerHeight - m.getBoundingClientRect().top - 12) + 'px';
  }
  function toggleMenu(id) {
    const m = $(id);
    const open = m.hidden;
    closeMenus();
    m.hidden = !open;
    if (open) { fitMenu(m); m.scrollTop = 0; }
  }
  window.addEventListener('resize', () => document.querySelectorAll('.menu:not([hidden])').forEach(fitMenu));
  document.querySelectorAll('.menu-sub').forEach((b) => (b.onclick = () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    document.querySelectorAll('.menu-sub').forEach((o) => setMenuSub(o, false));
    setMenuSub(b, open);
    if (open) $('#' + b.getAttribute('aria-controls')).scrollIntoView({ block: 'nearest' });
  }));
  $('#btnSettings').onclick = (e) => { e.stopPropagation(); toggleMenu('#settingsMenu'); };
  $('#btnMore').onclick = (e) => { e.stopPropagation(); toggleMenu('#moreMenu'); };
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu-wrap')) closeMenus(); });

  function closeSidebar() { el.sidebar.classList.remove('open'); el.scrim.classList.remove('show'); }
  $('#btnSidebar').onclick = () => {
    if (window.innerWidth <= 900) {
      const open = !el.sidebar.classList.contains('open');
      el.sidebar.classList.toggle('open', open);
      el.scrim.classList.toggle('show', open);
      return;
    }
    const collapsed = document.body.classList.toggle('side-collapsed');
    store.set('mdv-side-collapsed', collapsed ? '1' : '0');
    lineTops = null;
    if (state.editing) requestAnimationFrame(syncHlWidth);
  };
  el.scrim.onclick = closeSidebar;

  function setZen(on) {
    if (on && !state.current) return;
    document.body.classList.toggle('zen', on);
    closeMenus();
    if (on) toast(L('집중 모드: Esc를 누르면 끝납니다', 'Focus mode: press Esc to exit'));
    lineTops = null;
  }

  /* ---------- 빠른 열기 · 명령 (Ctrl+O): 파일 이름 · 이 문서의 제목 · 명령을 한 창에서 ---------- */
  //  - 그냥 치면 파일(이름 → 경로 순), 「>」로 시작하면 명령만, 「#」으로 시작하면 이 문서의 제목만
  //  - 창이 열린 채 Ctrl+O 를 한 번 더 누르면 「다른 파일 열기…」
  const qo = { box: null, input: null, list: null, items: [], shown: [], cur: 0, back: null, custom: null };
  const ICON_QO = {
    file: ICON.md,
    tpl: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    head: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 4v16M19 4v16M5 12h14"/></svg>',
    cmd: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 4 4-4 4M12 16h7"/></svg>',
  };
  function quickCommands() {
    const cur = !!state.current;
    const lang = LANG === 'ko' ? 'en' : 'ko';
    return [
      { ko: '다른 파일 열기…', en: 'Open another file…', kbd: 'Ctrl+O ×2', run: pickFiles },
      { ko: '폴더 열기…', en: 'Open folder…', run: pickFolder },
      { ko: '새 문서 쓰기', en: 'New document', run: newDoc },
      { ko: '편집 시작 · 끝', en: 'Start · stop editing', kbd: 'Ctrl+E', when: cur, run: () => setEditing(!state.editing) },
      { ko: '저장', en: 'Save', kbd: 'Ctrl+S', when: cur, run: () => save() },
      { ko: '새 파일로 저장…', en: 'Save as new file…', kbd: 'Ctrl+Shift+S', when: cur, run: () => saveAs() },
      { ko: '다른 뷰어용으로 저장…', en: 'Save for other viewers…', when: cur, run: exportPortable },
      { ko: 'HTML 파일로 저장', en: 'Save as HTML', when: cur, run: exportHtml },
      { ko: 'Word 파일로 저장 (.docx)', en: 'Save as Word (.docx)', when: cur, run: exportDocx },
      { ko: '서식 그대로 복사 (메일 · 노션 · 구글 문서에 붙여 넣기)', en: 'Copy with formatting (to paste into mail · Notion · Google Docs)', when: cur, run: copyRich },
      { ko: '인쇄 · PDF로 저장', en: 'Print · save as PDF', kbd: 'Ctrl+P', when: cur, run: () => window.print() },
      { ko: '문서에서 찾기', en: 'Find in document', kbd: 'Ctrl+F', when: cur, run: openFind },
      { ko: '모든 문서에서 찾기 (폴더 전체)', en: 'Search all documents (whole folder)', kbd: 'Ctrl+Shift+F', run: openGlobalSearch },
      { ko: '문서 점검 (깨진 링크 · 긴 문장 · 다른 뷰어)', en: 'Check document (broken links · long sentences · other viewers)', when: cur, run: openCompat },
      { ko: '연결: 이 문서를 가리키는 문서 · 깨진 링크', en: 'Links: what links here · broken links', when: cur, run: () => { if (window.innerWidth <= 900) { el.sidebar.classList.add('open'); el.scrim.classList.add('show'); } else if (document.body.classList.contains('side-collapsed')) $('#btnSidebar').click(); setSideTab('links'); } },
      { ko: '찾아 바꾸기 (원본)', en: 'Find and replace (source)', kbd: IS_MAC ? '⌥⌘F' : 'Ctrl+H', when: cur, run: openReplace },
      { ko: '줄 위로 옮기기', en: 'Move line up', kbd: 'Alt+↑', when: cur && state.editing, run: () => moveLines(-1) },
      { ko: '줄 아래로 옮기기', en: 'Move line down', kbd: 'Alt+↓', when: cur && state.editing, run: () => moveLines(1) },
      { ko: '제목 단계 올리기 (## → #)', en: 'Raise heading level (## → #)', kbd: 'Ctrl+Shift+[', when: cur && state.editing, run: () => headingStep(-1) },
      { ko: '제목 단계 내리기 (# → ##)', en: 'Lower heading level (# → ##)', kbd: 'Ctrl+Shift+]', when: cur && state.editing, run: () => headingStep(1) },
      { ko: '번호 목록 다시 매기기', en: 'Renumber the numbered list', when: cur && state.editing, run: renumberList },
      ...(cur && state.editing && tableAtCursor() ? [
        { ko: '표 줄 맞추기', en: 'Table: align columns', run: () => tableOp('align') },
        { ko: '표: 아래에 행 추가', en: 'Table: add a row below', run: () => tableOp('rowAdd') },
        { ko: '표: 이 행 지우기', en: 'Table: delete this row', run: () => tableOp('rowDel') },
        { ko: '표: 오른쪽에 열 추가', en: 'Table: add a column to the right', run: () => tableOp('colAdd') },
        { ko: '표: 이 열 지우기', en: 'Table: delete this column', run: () => tableOp('colDel') },
        { ko: '표: 열을 왼쪽으로', en: 'Table: move column left', run: () => tableOp('colLeft') },
        { ko: '표: 열을 오른쪽으로', en: 'Table: move column right', run: () => tableOp('colRight') },
        { ko: '표: 이 열로 정렬', en: 'Table: sort by this column', run: () => tableOp('sort') },
      ] : []),
      { ko: '바뀐 내용 · 되돌리기 기록', en: 'Changes · undo history', kbd: 'Ctrl+Shift+H', when: cur, run: () => openChanges('hist') },
      { ko: '저장 기록 (닫아도 남는 기록)', en: 'Saved versions (kept after closing)', when: cur, run: () => openChanges('ver') },
      { ko: '집중 모드', en: 'Focus mode', kbd: 'Ctrl+.', when: cur, run: () => setZen(true) },
      { ko: '발표하기 (단락마다 한 장)', en: 'Present (one slide per section)', when: cur, run: startPresent },
      { ko: '제목 모두 접기 · 펴기', en: 'Fold · unfold all headings', when: cur, run: foldAllToggle },
      { ko: settings.headNum ? '제목 번호 끄기' : '제목에 번호 붙여 보기', en: settings.headNum ? 'Hide heading numbers' : 'Number the headings', run: () => { settings.headNum = !settings.headNum; applySettings(true); } },
      { ko: '밝게 · 어둡게', en: 'Light · dark', run: () => el.btnTheme.click() },
      { ko: '보기 설정', en: 'View settings', run: () => setTimeout(() => toggleMenu('#settingsMenu'), 0) },
      { ko: '문서 스타일 (CSS 불러오기 · 저장)', en: 'Document styles (load · save CSS)', run: openStyles },
      { ko: '사이드바 열기 · 닫기', en: 'Show · hide sidebar', run: () => $('#btnSidebar').click() },
      { ko: 'Claude와 연결 (MCP)', en: 'Connect to Claude (MCP)', run: openMcp },
      { ko: '처음 사용 안내 다시 보기', en: 'Show the tour again', run: () => $('#mTour').click() },
      { ko: '업데이트 확인', en: 'Check for updates', when: isTauri(), run: () => checkUpdate({ manual: true }) },
      { ko: '언어: English', en: 'Language: 한국어', run: () => document.querySelector(`#langSeg button[data-v="${lang}"]`).click() },
    ].filter((c) => c.when !== false).map((c) => ({ kind: 'cmd', label: L(c.ko, c.en), alt: L(c.en, c.ko), altShow: true, kbd: c.kbd, run: c.run }));
  }
  // 고를 수 있는 것: 이번에 연 순서 → 나머지 파일 → 안내 문서 → 지난번 최근 문서 (+ 제목 · 명령)
  function quickItems() {
    const files = [], seen = new Set();
    const addFile = (f) => {
      if (!f || seen.has(f) || f.builtin) return;
      seen.add(f);
      const loc = f.loose ? describeLocation(f).short : parentOf(f.path);
      files.push({ kind: 'file', label: f.name.replace(MD_EXT, ''), sub: f.loose && (!loc || loc === f.name) ? L('따로 연 파일', 'Opened separately') : loc, path: f.path.replace(MD_EXT, ''), entry: f, run: () => { openEntry(f); closeSidebar(); } });
    };
    for (let i = state.hist.length - 1; i >= 0; i--) if (state.hist[i] !== state.current) addFile(state.hist[i]);
    const rest = state.files.filter((f) => !seen.has(f) && !f.builtin && f !== state.current).sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
    rest.forEach(addFile);
    if (state.current && !state.current.builtin) addFile(state.current);
    for (const key of Object.keys(BUILTIN)) {
      files.push({ kind: 'file', label: BUILTIN[key].title, sub: L('markcont 안내 문서', 'markcont docs'), alt: BUILTIN_NAMES[key].join(' '), run: () => openBuiltinDoc(key) });
    }
    for (const r of store.json('mdv-recent', []).filter((r) => !isBuiltinPath(r.name))) {
      if (state.files.some((f) => f.path === r.name)) continue;
      files.push({ kind: 'file', label: baseName(r.name).replace(MD_EXT, ''), sub: L('최근 문서 · ', 'Recent · ') + fmtDate(r.time), path: r.name.replace(MD_EXT, ''), run: () => openRecent(r) });
    }
    const heads = !state.current ? [] : [...el.doc.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => !h.closest('.md-example') && h.id)
      .map((h) => ({ kind: 'head', label: headLabel(h), sub: '#'.repeat(headingLevel(h)), run: () => scrollToId(h.id) }));
    return { files, heads, cmds: quickCommands() };
  }
  function quickBox() {
    if (qo.box) return qo.box;
    const b = document.createElement('div');
    b.className = 'qo';
    b.hidden = true;
    b.innerHTML = `<div class="qo-card" role="dialog" aria-modal="true" aria-label="${L('빠른 열기', 'Quick open')}">
        <input class="qo-input" type="text" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="qoList" aria-autocomplete="list">
        <div class="qo-list" id="qoList" role="listbox"></div>
        <div class="qo-foot"><span><kbd>↑</kbd><kbd>↓</kbd> ${L('고르기', 'move')}</span><span><kbd>Enter</kbd> ${L('열기', 'open')}</span><span><kbd>&gt;</kbd> ${L('명령', 'commands')}</span><span><kbd>#</kbd> ${L('이 문서의 제목', 'headings here')}</span><button type="button" class="qo-other">${L('다른 파일 열기…', 'Open another file…')} <kbd>Ctrl+O</kbd></button></div>
      </div>`;
    document.body.append(b);
    qo.box = b;
    qo.input = b.querySelector('.qo-input');
    qo.list = b.querySelector('.qo-list');
    qo.input.placeholder = L('파일 이름 · 초성(ㄱㅎㅅ)으로 찾기   > 명령   # 제목', 'Find a file by name   > commands   # headings');
    qo.input.addEventListener('input', () => quickFilter());
    qo.input.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return; // 입력기가 쓰는 키(한자 · 가나 후보 고르기)는 넘김
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); quickMove(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); quickMove(e.key === 'PageDown' ? 8 : -8); }
      else if (e.key === 'Enter') { e.preventDefault(); quickChoose(qo.cur); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeQuick(); }
      else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'o') { e.preventDefault(); e.stopPropagation(); closeQuick(true); pickFiles(); }
    });
    qo.list.addEventListener('click', (e) => { const r = e.target.closest('.qo-item'); if (r) quickChoose(+r.dataset.i); });
    qo.list.addEventListener('mousemove', (e) => { const r = e.target.closest('.qo-item'); if (r && +r.dataset.i !== qo.cur) quickMark(+r.dataset.i, false); });
    b.querySelector('.qo-other').onclick = () => { closeQuick(true); pickFiles(); };
    b.addEventListener('pointerdown', (e) => { if (e.target === b) closeQuick(); });
    return b;
  }
  // custom: { items, placeholder, onCancel } — 같은 창으로 다른 것을 고를 때 (템플릿 고르기)
  function openQuick(prefix = '', custom = null) {
    if (!$('#tour').hidden) { custom?.onCancel?.(); return; }
    closeMenus();
    hidePreview();
    if (!$('#dgViewer').hidden) closeDiagramViewer();
    const b = quickBox();
    if (b.hidden) qo.back = document.activeElement;
    if (qo.custom && qo.custom !== custom) { const c = qo.custom; qo.custom = null; c.onCancel?.(); }
    qo.custom = custom;
    qo.items = custom ? { files: custom.items, heads: [], cmds: [] } : quickItems();
    b.classList.toggle('custom', !!custom);
    qo.input.placeholder = custom ? custom.placeholder : L('파일 이름 · 초성(ㄱㅎㅅ)으로 찾기   > 명령   # 제목', 'Find a file by name   > commands   # headings');
    b.hidden = false;
    qo.input.value = prefix;
    quickFilter();
    qo.input.focus();
  }
  function closeQuick(keepFocus) {
    if (!qo.box || qo.box.hidden) return;
    qo.box.hidden = true;
    if (qo.custom) { const c = qo.custom; qo.custom = null; c.onCancel?.(); }
    if (!keepFocus && qo.back && qo.back.isConnected && qo.back !== document.body) qo.back.focus({ preventScroll: true });
    qo.back = null;
  }
  function quickFilter() {
    const raw = qo.input.value;
    const mode = qo.custom ? '' : raw[0] === '>' ? 'cmd' : raw[0] === '#' ? 'head' : '';
    const q = prepText(raw.slice(mode ? 1 : 0).trim());
    const { files, heads, cmds } = qo.items;
    let rows = [];
    if (!q.length) {
      rows = mode === 'cmd' ? cmds : mode === 'head' ? heads : files;
      rows = rows.map((it) => ({ it }));
    } else {
      const pool = mode === 'cmd' ? cmds : mode === 'head' ? heads : [...files, ...heads, ...cmds];
      const weight = { file: 0, head: -250, cmd: -300, tpl: 0 };
      for (const it of pool) {
        let best = null;
        const tryOn = (text, where, penalty) => {
          if (!text) return;
          const t = prepName(text), m = textMatch(q, t);
          if (m && (!best || m.score - penalty > best.score)) best = { score: m.score - penalty, where, t, at: m.at };
        };
        tryOn(it.label, 'label', 0);
        tryOn(it.alt, 'alt', 40);
        tryOn(it.path, 'path', 300);
        if (best) rows.push({ it, m: best, score: best.score + (mode ? 0 : weight[it.kind]) });
      }
      rows.sort((a, b) => b.score - a.score || a.it.label.localeCompare(b.it.label, undefined, { numeric: true }));
    }
    qo.shown = rows.slice(0, 60);
    const html = qo.shown.map(({ it, m }, i) => {
      const name = m && m.where === 'label' ? markText(m.t, m.at) : escapeHtml(it.label);
      let sub = it.sub ? escapeHtml(it.sub) : '';
      if (m && m.where === 'path') sub = markText(m.t, m.at);
      else if (m && m.where === 'alt' && it.altShow) sub = markText(m.t, m.at); // 명령은 다른 언어 이름으로도 찾음
      return `<div class="qo-item" role="option" data-i="${i}">${ICON_QO[it.kind] || ICON_QO.file}<span class="qo-main"><span class="qo-name">${name}</span>${sub ? `<span class="qo-sub">${sub}</span>` : ''}</span>${it.kbd ? `<kbd class="qo-kbd">${escapeHtml(it.kbd)}</kbd>` : ''}</div>`;
    }).join('');
    qo.list.innerHTML = html || `<div class="qo-empty">${qo.custom ? L('맞는 것이 없습니다.', 'Nothing matches.') : mode === 'head' && !state.current ? L('문서를 열면 그 문서의 제목을 찾을 수 있습니다.', 'Open a document to find its headings.') : L('맞는 것이 없습니다. Ctrl+O 를 한 번 더 누르면 다른 파일을 열 수 있어요.', 'Nothing matches. Press Ctrl+O again to open another file.')}</div>`;
    quickMark(0, true);
  }
  function quickMark(i, scroll) {
    if (!qo.shown.length) { qo.cur = 0; qo.input.removeAttribute('aria-activedescendant'); return; }
    qo.cur = Math.max(0, Math.min(qo.shown.length - 1, i));
    qo.list.querySelectorAll('.qo-item.on').forEach((r) => r.classList.remove('on'));
    const r = qo.list.querySelector(`.qo-item[data-i="${qo.cur}"]`);
    if (!r) return;
    r.classList.add('on');
    r.id = 'qoCur';
    qo.list.querySelectorAll('.qo-item[id]').forEach((x) => { if (x !== r) x.removeAttribute('id'); });
    qo.input.setAttribute('aria-activedescendant', 'qoCur');
    if (scroll) r.scrollIntoView({ block: 'nearest' });
  }
  function quickMove(step) { if (qo.shown.length) quickMark((qo.cur + step + qo.shown.length) % qo.shown.length, true); }
  function quickChoose(i) {
    const row = qo.shown[i];
    if (!row) return;
    qo.custom = null; // 고른 것이므로 「닫음(취소)」 이 아님
    closeQuick(true);
    row.it.run();
  }

  /* ---------- 버튼 · 단축키 ---------- */
  $('#btnOpen').onclick = $('#wOpen').onclick = pickFiles;
  $('#mQuick').onclick = () => openQuick();
  $('#btnFolder').onclick = $('#wFolder').onclick = pickFolder;
  $('#wNew').onclick = newDoc;
  $('#mNew').onclick = () => { closeMenus(); newDoc(); };
  $('#mZen').onclick = () => setZen(true);
  $('#zenExit').onclick = () => setZen(false);
  $('#mFoldAll').onclick = () => { closeMenus(); foldAllToggle(); };
  $('#mExport').onclick = exportHtml;
  // Word(.docx): 그려진 문서를 옮김 (docx.js). 밝은 테마의 숨은 틀에 탭 · 접힌 곳을 다 편 사본을 그려서
  async function exportDocx() {
    closeMenus();
    if (!state.current || !window.MarkDocx || !window.MarkRich) return;
    toast(L('Word 파일을 만드는 중…', 'Making the Word file…'), 2000);
    let fr = null;
    try {
      await settleMedia(); // 아직 읽는 중인 그림까지
      fr = await lightFrame(el.doc);
      const title = el.doc.querySelector('.print-cover .cover-title')?.textContent.trim() || el.doc.querySelector('h1')?.textContent.trim() || state.current.name.replace(MD_EXT, '');
      const blob = await MarkDocx.build(fr.root, { title, lang: navigator.language });
      const name = suggestName(state.current).replace(MD_EXT, '') + '.docx';
      download(name, blob, blob.type);
      toast(L('Word 파일을 다운로드 폴더에 저장했습니다: ', 'Saved the Word file to Downloads: ') + name, 3500);
    } catch (e) {
      toast(L('Word 파일을 만들지 못했습니다: ', "Couldn't make the Word file: ") + ((e && e.message) || e), 4000);
    } finally { fr?.dispose(); }
  }
  $('#mDocx').onclick = exportDocx;

  // 서식 그대로 복사: 메일 · 노션 · 구글 문서 · 블로그에 붙여 넣어도 모양이 남게 (richcopy.js)
  //  - 문서 안에서 고른 곳이 있으면 그 부분만 (둘레 요소도 함께 옮겨 표 · 목록 · 알림 상자 모양이 남게)
  //  - 글자만 받는 곳에는 문서 전체면 마크다운 원본, 고른 부분이면 그 글자
  async function copyRich() {
    closeMenus();
    if (!state.current || !window.MarkRich) return;
    const sel = getSelection();
    let part = null;
    if (sel.rangeCount && !sel.isCollapsed && el.doc.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const r = sel.getRangeAt(0);
      let wrap = r.cloneContents();
      for (let a = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement; a && a !== el.doc; a = a.parentElement) {
        const sh = a.cloneNode(false);
        sh.append(wrap);
        wrap = sh;
      }
      part = document.createElement('div');
      part.append(wrap);
    }
    const plain = part ? sel.toString() : source();
    toast(L('서식을 담는 중…', 'Copying with formatting…'), 1500);
    const html = (async () => {
      const fr = await lightFrame(part || el.doc);
      try {
        // 알림 상자 아이콘(SVG) → 그림 글자: 붙여 넣는 곳(노션 등)이 작은 그림을 따로 떼어 놓지 않게
        fr.root.querySelectorAll('.callout-title > svg').forEach((s) => s.replaceWith(EMOJI[s.closest('.callout')?.dataset.callout] || '💡', ' '));
        return await MarkRich.toHtml(fr);
      } finally { fr.dispose(); }
    })();
    const done = () => toast(L('서식을 그대로 복사했습니다 — 메일 · 노션 · 구글 문서에 붙여 넣으세요', 'Copied with formatting — paste it into mail · Notion · Google Docs'), 3500);
    try {
      if (!window.ClipboardItem || !navigator.clipboard?.write) throw new Error('no ClipboardItem');
      // 그림 바꾸기가 오래 걸려도 누른 순간에 쓰기를 시작해야 Safari 가 막지 않음 (내용은 Promise 로)
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': html.then((h) => new Blob([h], { type: 'text/html' })), 'text/plain': new Blob([plain], { type: 'text/plain' }) })]);
      done();
    } catch {
      try {
        const h = await html;
        const put = (e) => { e.clipboardData.setData('text/html', h); e.clipboardData.setData('text/plain', plain); e.preventDefault(); };
        document.addEventListener('copy', put, { once: true });
        const ok = document.execCommand('copy');
        document.removeEventListener('copy', put);
        if (!ok) throw new Error('copy blocked');
        done();
      } catch (e) {
        toast(L('서식 복사를 하지 못했습니다: ', "Couldn't copy with formatting: ") + ((e && e.message) || e), 4000);
      }
    }
  }
  $('#mCopyRich').onclick = copyRich;
  // 인쇄 머리글: 문서 제목 (쪽 번호와 같이 Chrome · Edge 131 이상에서)
  window.addEventListener('beforeprint', () => {
    let st = document.getElementById('printTitleStyle');
    if (!st) { st = document.createElement('style'); st.id = 'printTitleStyle'; document.head.append(st); }
    const cover = !document.body.classList.contains('printing-slides') && el.doc.querySelector('.print-cover .cover-title');
    const t = state.current ? (cover?.textContent.trim() || el.doc.querySelector('h1')?.textContent.trim() || state.current.name.replace(MD_EXT, '')) : '';
    st.textContent = (t ? `@page { @top-right { content: "${t.replace(/[\\"]/g, '\\$&').replace(/\s+/g, ' ').slice(0, 80)}"; font-size: 8.5pt; color: #999; } }` : '') +
      (cover ? '@page :first { @top-right { content: none; } @bottom-center { content: none; } }' : ''); // 표지 쪽에는 머리글 · 쪽 번호 없이
  });
  // 인쇄 · PDF: 접는 상자(<details> · 접는 알림 상자 > [!NOTE]-)도 펴서 찍고, 끝나면 닫혀 있던 것만 다시 닫음
  //  탭은 인쇄 CSS 로 모두 펼쳐지고, 탭 내용마다 위에 탭 막대를 붙였다가 끝나면 뺌 (화면의 탭 선택은 그대로. 슬라이드 인쇄는 따로라 건드리지 않음)
  let printOpened = [];
  window.addEventListener('beforeprint', () => {
    if (document.body.classList.contains('printing-slides')) return;
    printOpened = [...el.doc.querySelectorAll('details:not([open])')];
    printOpened.forEach((d) => (d.open = true));
    printTabHeads(true);
  });
  window.addEventListener('afterprint', () => {
    printOpened.forEach((d) => (d.open = false));
    printOpened = [];
    printTabHeads(false);
  });
  $('#mPortable').onclick = exportPortable;
  $('#mPrint').onclick = () => { closeMenus(); window.print(); };
  el.btnEdit.onclick = () => setEditing(!state.editing);
  el.btnSave.onclick = () => save();
  $('#btnSaveMenu').onclick = (e) => {
    e.stopPropagation();
    const cur = state.current;
    $('#saveOverWhere').textContent = !cur ? '' : canOverwrite(cur)
      ? L((cur.tauriPath || cur.path) + ' 에 덮어씁니다', 'Overwrites ' + (cur.tauriPath || cur.path))
      : L('원래 위치를 몰라서 새 파일로 저장하게 됩니다', 'Original location unknown, so it will be saved as a new file');
    toggleMenu('#saveMenu');
  };
  $('#mSaveOver').onclick = () => { closeMenus(); save(); };
  $('#mSaveAs').onclick = () => { closeMenus(); saveAs(); };
  $('#mSavePortable').onclick = exportPortable;
  $('#mOpen').onclick = () => { closeMenus(); pickFiles(); };
  $('#mFolder').onclick = () => { closeMenus(); pickFolder(); };
  $('#mSettings').onclick = (e) => { e.stopPropagation(); toggleMenu('#settingsMenu'); };
  $('#mTheme').onclick = () => { closeMenus(); el.btnTheme.click(); };
  $('#mFind').onclick = openFind;
  $('#fabFind').onclick = openFind;
  $('#fabEdit').onclick = () => setEditing(!state.editing);
  $('#fabTop').onclick = () => el.preview.scrollTo({ top: 0, behavior: 'smooth' });
  el.preview.addEventListener('scroll', () => $('#fabTop').classList.toggle('show', el.preview.scrollTop > 600), { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (previewOpen()) { hidePreview(); return; }
      if (!$('#dgViewer').hidden) { closeDiagramViewer(); return; }
      const exp = document.querySelector('.code-block.expanded');
      if (exp) { toggleExpand(exp, false); return; }
      if (!$('#findBar').hidden) { closeFind(); return; }
      if (rfOpen()) { closeReplace(); return; }
      if (svOpenNow() && !document.querySelector('.menu:not([hidden])') && $('#ctxMenu').hidden) { svClose(); return; }
      if (!document.querySelectorAll('.menu:not([hidden])').length && document.body.classList.contains('zen')) setZen(false);
      if (!$('#ctxMenu').hidden) { closeCtxMenu(); return; }
      closeMenus(); closeSidebar();
      return;
    }
    if (e.altKey && !e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && document.activeElement !== el.editor) {
      e.preventDefault();
      goHistory(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'o') { e.preventDefault(); openQuick(); }
    else if (k === 'e' && state.current) { e.preventDefault(); setEditing(!state.editing); }
    else if (k === 's' && state.current) { e.preventDefault(); if (e.shiftKey) saveAs(); else save(); }
    else if (k === 'f' && e.shiftKey) { e.preventDefault(); openGlobalSearch(); }
    else if (k === 'f' && state.current && !el.workspace.hidden) { e.preventDefault(); openFind(); }
    else if (k === '.' && state.current) { e.preventDefault(); setZen(!document.body.classList.contains('zen')); }
  });
  window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

  applySettings();
  // 버전 표시 (새 버전을 낼 때 package.json · tauri.conf.json 과 함께 올리세요)
  const APP_VERSION = '1.16.0';
  $('#appVersion').textContent = `markcont v${APP_VERSION} · ${window.__TAURI__ ? L('PC 프로그램', 'PC app') : L('웹 앱', 'web app')}`;
  setSideTab(side.tab);
  renderFileList();

  /* =========================================================
     앱에 들어 있는 문서: 사용 안내서, 작성 규칙
     ========================================================= */
  // 파일 이름은 영어(PC 프로그램 내부 서버가 한글 경로를 못 찾는 경우가 있음), 화면에는 한글 이름으로
  async function openBuiltinDoc(key) {
    closeMenus();
    const doc = BUILTIN[key];
    const path = builtinPath(key);
    let entry = state.files.find((f) => f.loose && f.path === path);
    if (!entry) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      try {
        const res = await fetch('docs/' + doc.file, { signal: ctrl.signal, cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status);
        entry = { name: doc.name, path, text: toLF(await res.text()), loose: true, builtin: true };
        state.files.push(entry);
      } catch {
        toast(L('안내 문서를 열지 못했습니다.', "Couldn't open the built-in document."), 3000);
        return false;
      } finally { clearTimeout(timer); }
    }
    try { return await openEntry(entry); } catch { return false; }
  }
  $('#mGuide').onclick = () => openBuiltinDoc('guide');
  $('#wGuide').onclick = () => openBuiltinDoc('guide');
  $('#wFeatures').onclick = () => openBuiltinDoc('features');
  // 처음 화면 카드: 카드마다 맞는 안내 문서 (· 그 안의 제목)로
  const FEAT_HEADING = { save: L('5️⃣ 저장과 내보내기', '5️⃣ Saving and exporting') };
  document.querySelectorAll('[data-feat]').forEach((b) => (b.onclick = async () => {
    const [key, part] = (b.dataset.feat || 'features').split('#');
    const ok = await openBuiltinDoc(key);
    if (!ok || !part) return;
    const id = slugify(FEAT_HEADING[part] || part);
    [80, 700, 1500].forEach((ms) => setTimeout(() => { const t = document.getElementById(id); if (t) { unfoldTo(t); t.scrollIntoView({ block: 'start' }); } }, ms));
  }));
  $('#mRules').onclick = () => openBuiltinDoc('rules');
  $('#mLicenses').onclick = () => openBuiltinDoc('licenses');

  /* =========================================================
     새 버전 알림 · 업데이트 (PC 프로그램)
     켤 때마다 GitHub Releases 의 latest.json 을 확인합니다 (src-tauri/src/update.rs, 서명이 맞는 파일만 설치).
     알림 창을 닫으면 그 버전은 20시간(다음 날)이 지나야 다시 띄웁니다. 「업데이트 확인」으로 직접 보면 늘 띄웁니다.
     바뀐 점은 웹 앱 주소의 docs/changelog.md 에서 읽어, 지금 버전 다음부터 새 버전까지 보여 줍니다.
     ========================================================= */
  const UPD_SNOOZE = 'mdv-update-snooze'; // 알림 창을 닫은 버전 · 시각 { v, t }
  const UPD_SNOOZE_MS = 20 * 3600e3;
  try { localStorage.removeItem('mdv-update-checked'); } catch {} // 예전 「하루에 한 번만 확인」 기록
  const CHANGELOG_URL = 'https://ryuseojin.github.io/markcont/docs/' + L('changelog.md', 'changelog.en.md');
  const upd = { busy: false, installing: false, info: null };
  const verNums = (v) => String(v).replace(/^v/, '').split(/[.+-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
  function verCmp(a, b) {
    const x = verNums(a), y = verNums(b);
    for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
    return 0;
  }
  // 바뀐 점 파일 → [{ version, date, items }] ("## 1.10.0 · 2026-11-09" 아래의 "- " 줄들)
  function parseChangelog(text) {
    const out = [];
    let cur = null;
    for (const line of toLF(text).split('\n')) {
      const h = /^##\s+v?(\d+\.\d+\.\d+)\s*(?:·\s*(.*))?$/.exec(line.trim());
      if (h) { cur = { version: h[1], date: (h[2] || '').trim(), items: [] }; out.push(cur); continue; }
      if (/^#{1,6}\s/.test(line)) { cur = null; continue; }
      if (!cur) continue;
      const li = /^\s*[-*]\s+(.*)$/.exec(line);
      if (li) cur.items.push(li[1].trim());
      else if (line.trim() && cur.items.length) cur.items[cur.items.length - 1] += ' ' + line.trim();
    }
    return out;
  }
  async function fetchChangelog() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(CHANGELOG_URL, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      return parseChangelog(await res.text());
    } catch { return null; } finally { clearTimeout(timer); }
  }
  // 바뀐 점 목록 (글은 textContent 로만 넣음)
  function updNotesFrom(info, log) {
    const box = document.createDocumentFragment();
    const list = (log || []).filter((v) => verCmp(v.version, info.current) > 0 && verCmp(v.version, info.version) <= 0);
    for (const v of list) {
      const h = document.createElement('h4');
      h.textContent = 'v' + v.version;
      if (v.date) { const d = document.createElement('small'); d.textContent = v.date; h.append(d); }
      const ul = document.createElement('ul');
      for (const it of v.items) { const li = document.createElement('li'); li.textContent = it.replace(/\*\*|`/g, ''); ul.append(li); }
      box.append(h, ul);
    }
    if (list.length) return box;
    // 바뀐 점 파일을 못 읽으면 Releases 설명(새 버전 것만)으로
    const plain = String(info.notes || '').replace(/\r/g, '').split(/\n##\s*(?:내려받기|Download)/)[0].replace(/^#{1,6}\s.*$/gm, '').trim();
    const p = document.createElement('div');
    p.className = plain ? 'upd-plain' : 'upd-wait';
    p.textContent = plain || L('바뀐 점은 GitHub Releases 페이지에서 볼 수 있습니다.', 'You can see what changed on the GitHub Releases page.');
    box.append(p);
    return box;
  }
  function renderUpdFoot() {
    const foot = $('#updFoot'), info = upd.info;
    foot.innerHTML = '';
    $('#updX').disabled = upd.installing;
    if (upd.installing) {
      const bar = document.createElement('div');
      bar.className = 'upd-bar';
      bar.append(document.createElement('i'));
      const t = document.createElement('span');
      t.className = 'upd-hint';
      t.id = 'updPct';
      t.style.margin = '0';
      t.textContent = L('내려받는 중…', 'Downloading…');
      foot.append(bar, t);
      return;
    }
    const hint = document.createElement('span');
    hint.className = 'upd-hint';
    hint.textContent = info.can_install
      ? L('업데이트하면 markcont가 잠시 닫혔다가 다시 켜집니다.', 'markcont will close for a moment and open again.')
      : L('이 설치 방식(.deb · .rpm)은 내려받기 페이지에서 새 버전을 받아 주세요.', 'For this install type (.deb · .rpm), get the new version from the download page.');
    const close = document.createElement('button');
    close.className = 'btn';
    close.textContent = L('닫기', 'Close');
    close.onclick = closeUpdate;
    const go = document.createElement('button');
    go.className = 'btn primary';
    go.textContent = info.can_install ? L('지금 업데이트', 'Update now') : L('내려받기 페이지 열기', 'Open download page');
    go.onclick = info.can_install ? installUpdate : () => tinvoke('update_open_page').catch((e) => toast(String(e), 4000));
    foot.append(hint, close, go);
  }
  async function openUpdate(info) {
    upd.info = info;
    $('#updTitle').textContent = L(`새 버전이 나왔습니다: v${info.version}`, `A new version is available: v${info.version}`);
    const now = document.createElement('p');
    now.className = 'upd-now';
    now.textContent = L(`지금 쓰는 버전 v${info.current} → 새 버전 v${info.version}`, `Your version v${info.current} → new version v${info.version}`);
    const notes = document.createElement('div');
    notes.className = 'upd-notes';
    const wait = document.createElement('div');
    wait.className = 'upd-wait';
    wait.textContent = L('바뀐 점을 불러오는 중…', 'Loading what changed…');
    notes.append(wait);
    $('#updBody').replaceChildren(now, notes);
    renderUpdFoot();
    $('#updModal').hidden = false;
    $('#updFoot .btn.primary')?.focus();
    const log = await fetchChangelog();
    if (upd.info === info) notes.replaceChildren(updNotesFrom(info, log));
  }
  // 닫기 · ✕ · Esc · 바깥 누르기: 이 버전은 다음 날까지 저절로 띄우지 않음
  function closeUpdate() {
    if (upd.installing) return;
    if (!$('#updModal').hidden && upd.info) store.set(UPD_SNOOZE, JSON.stringify({ v: upd.info.version, t: Date.now() }));
    $('#updModal').hidden = true;
  }
  $('#updX').onclick = closeUpdate;
  $('#updModal').addEventListener('click', (e) => { if (e.target.id === 'updModal') closeUpdate(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#updModal').hidden) { e.preventDefault(); e.stopImmediatePropagation(); closeUpdate(); } }, true);
  async function installUpdate() {
    if (upd.installing) return;
    if (state.dirty && !confirm(L('저장하지 않은 변경 사항이 있습니다. 업데이트하면 markcont가 다시 켜지면서 이 내용이 사라집니다. 그래도 업데이트할까요?', 'You have unsaved changes. Updating restarts markcont and they will be lost. Update anyway?'))) return;
    upd.installing = true;
    renderUpdFoot();
    const bar = $('#updFoot .upd-bar i'), pct = $('#updPct');
    const ch = new window.__TAURI__.core.Channel();
    ch.onmessage = (m) => {
      if (m.total) {
        const r = Math.min(100, Math.round((m.done / m.total) * 100));
        bar.style.width = r + '%';
        pct.textContent = r >= 100 ? L('설치하는 중…', 'Installing…') : L(`내려받는 중… ${r}%`, `Downloading… ${r}%`);
      } else pct.textContent = L(`내려받는 중… ${(m.done / 1048576).toFixed(1)} MB`, `Downloading… ${(m.done / 1048576).toFixed(1)} MB`);
    };
    try {
      await tinvoke('update_install', { onProgress: ch }); // 잘 되면 프로그램이 다시 켜져서 여기로 돌아오지 않음
    } catch (e) {
      try { await tinvoke('update_check'); } catch {} // 다시 누를 수 있게 새 버전 정보를 다시 받아 둠
      upd.installing = false;
      renderUpdFoot();
      toast(L('업데이트하지 못했습니다: ', "Couldn't update: ") + e, 6000);
    }
  }
  async function checkUpdate({ manual = false } = {}) {
    if (!isTauri() || upd.busy || upd.installing) return;
    if (manual) { closeMenus(); toast(L('새 버전을 확인하는 중…', 'Checking for updates…'), 3000); }
    upd.busy = true;
    let info;
    try { info = await tinvoke('update_check'); }
    catch (e) { if (manual) toast(L('새 버전을 확인하지 못했습니다: ', "Couldn't check for updates: ") + e, 5000); return; }
    finally { upd.busy = false; }
    if (info) {
      const sn = store.json(UPD_SNOOZE, null);
      if (!manual && sn && sn.v === info.version && Date.now() - sn.t < UPD_SNOOZE_MS) return; // 닫은 지 하루가 안 된 같은 버전
      openUpdate(info);
    } else if (manual) toast(L(`지금 최신 버전입니다 (v${APP_VERSION})`, `You're up to date (v${APP_VERSION})`));
  }
  if (isTauri()) {
    $('#mUpdate').hidden = false;
    $('#optUpdateRow').hidden = false;
    $('#mUpdate').onclick = () => checkUpdate({ manual: true });
    // 켤 때마다, 켜고 몇 초 뒤 (닫은 버전은 다음 날까지 건너뜀 — checkUpdate)
    const autoCheck = () => {
      if (settings.updateCheck === false) return;
      if (!$('#tour').hidden || document.querySelector('.modal:not([hidden])')) { setTimeout(autoCheck, 60000); return; } // 다른 창이 떠 있으면 조금 뒤에
      checkUpdate();
    };
    setTimeout(autoCheck, 5000);
  }

  /* =========================================================
     처음 사용 안내 (튜토리얼): 처음 한 번 자동으로, ⋯ 메뉴에서 다시 보기
     ========================================================= */
  const TOUR = [
    { center: true, lang: true, title: L('markcont 둘러보기', 'A quick tour of markcont'),
      text: L('마크다운 파일을 <b>보기 좋게 보고, 바로 고치는</b> 뷰어입니다.<br>주요 기능을 1분 만에 둘러볼게요.', 'A viewer that lets you <b>read markdown beautifully and edit it on the spot</b>.<br>Let\'s tour the main features in a minute.'), next: L('둘러보기 시작', 'Start the tour') },
    { target: '#btnOpen', mobile: '#btnMore', title: L('파일 열기', 'Open file'),
      text: L('<b>파일 열기</b>로 .md 파일을 엽니다.<br>파일을 창 위에 <b>끌어다 놓아도</b> 열려요. <b>Ctrl+O</b> 를 누르면 이름이나 초성으로 찾아 바로 열 수 있어요.', 'Open a .md file with <b>Open file</b>.<br>You can also <b>drag and drop</b> a file onto the window. Press <b>Ctrl+O</b> to find a file by name and open it right away.'),
      mobileText: L('<b>⋯</b> 메뉴의 <b>파일 열기</b>로 .md 파일을 엽니다.', 'Open a .md file with <b>Open file</b> in the <b>⋯</b> menu.') },
    { target: '#btnFolder', title: L('폴더 통째로 열기', 'Open a whole folder'),
      text: L('폴더를 열면 왼쪽에 <b>폴더 트리</b>가 나옵니다.<br>md 파일이 있는 폴더만 골라서 보여줘요.', 'Opening a folder shows a <b>folder tree</b> on the left.<br>Only folders that contain md files are shown.') },
    { target: '#sidebar', mobile: '#btnSidebar', title: L('사이드바', 'Sidebar'),
      text: L('<b>파일 · 목차 · 찾기</b> 탭을 오가며 씁니다. <b>찾기</b>는 폴더의 모든 문서에서 찾아요 (Ctrl+Shift+F).<br>파일이나 폴더를 <b>오른쪽 클릭</b>하면 새 문서, 새 폴더, 이름 바꾸기, 삭제를 할 수 있어요.', 'Switch between the <b>Files · Contents · Search</b> tabs. <b>Search</b> looks through every document in the folder (Ctrl+Shift+F).<br><b>Right-click</b> a file or folder to create, rename or delete.'),
      mobileText: L('<b>☰</b> 단추로 사이드바를 열어 <b>파일 트리 · 목차 · 모든 문서에서 찾기</b>를 씁니다.<br>줄 끝 <b>⋯</b> 단추로 새 문서 · 이름 바꾸기 · 삭제를 해요.', 'Open the sidebar with <b>☰</b> for the <b>file tree, contents and search across documents</b>.<br>Use the <b>⋯</b> button on a row to create, rename or delete.') },
    { target: '#btnEdit', mobile: '#fabEdit', needDoc: true, title: L('실시간 편집', 'Live editing'),
      text: L('<b>편집</b>(Ctrl+E)을 누르면 왼쪽에 원본, 오른쪽에 결과가 나란히 나옵니다.<br>입력하는 즉시 결과가 바뀌어요.', 'Press <b>Edit</b> (Ctrl+E) to see the source on the left and the result on the right.<br>The result updates as you type.'),
      mobileText: L('<b>연필</b> 단추를 누르면 원본을 고칠 수 있고, 결과가 바로 바뀝니다.', 'Tap the <b>pencil</b> button to edit the source; the result updates right away.') },
    { target: '#btnSettings', title: L('보기 설정', 'View settings'),
      text: L('<b>Aa</b>에서 글자 크기, 고딕 · 명조, 본문 폭, 알림 상자 모양을 바꿉니다.', 'In <b>Aa</b> you can change text size, sans · serif font, width, callout style and language.') },
    { target: '#btnMore', title: L('더 많은 기능', 'More features'),
      text: L('<b>⋯</b> 메뉴에 문서에서 찾기, 집중 모드, 발표하기가 있어요.<br><b>내보내기</b>에서 HTML · Word · PDF로 저장하고, <b>도움말</b>에서 사용 안내서와 작성 규칙을 열어요.', 'The <b>⋯</b> menu has find in document, focus mode and presenting.<br>Save as HTML · Word · PDF under <b>Export</b>, and open the user guide and writing rules under <b>Help</b>.'),
      mobileText: L('<b>⋯</b> 메뉴에 파일 · 폴더 열기, 보기 설정, 찾기, 집중 모드가 있어요.<br><b>내보내기</b>에서 PDF로 저장하고, <b>도움말</b>에서 사용 안내서를 열어요.', 'The <b>⋯</b> menu has open file · folder, view settings, find and focus mode.<br>Save as PDF under <b>Export</b>, and open the user guide under <b>Help</b>.') },
    { target: '#btnTheme', title: L('밝게 · 어둡게', 'Light · Dark'), text: L('눈이 편한 쪽으로 테마를 바꿉니다.', 'Switch to whichever theme is easier on your eyes.') },
    { center: true, title: L('준비 끝', 'All set'),
      text: L('지금 열린 문서는 <b>사용 안내서</b>예요. 천천히 읽어 보세요.<br>이 안내는 <b>⋯ → 도움말 → 처음 사용 안내 다시 보기</b>로 언제든 다시 볼 수 있습니다.', 'The open document is the <b>User guide</b>. Take your time reading it.<br>You can replay this tour anytime from <b>⋯ → Help → Replay the tour</b>.'),
      next: L('시작하기', 'Get started'), alt: L('내 파일 열기', 'Open my file') },
  ];
  const tour = { i: 0, steps: [], on: false };
  const isNarrow = () => window.innerWidth <= 900;
  function tourTarget(step) {
    const sel = isNarrow() && 'mobile' in step ? step.mobile : step.target;
    if (!sel) return null;
    const t = $(sel);
    if (!t || !t.offsetParent && getComputedStyle(t).position !== 'fixed') return null;
    const r = t.getBoundingClientRect();
    return r.width && r.height ? t : null;
  }
  async function startTour() {
    // 무슨 일이 있어도 안내는 띄움: 안내서를 못 열거나 오류가 나도 건너뛰고 계속
    let hasDoc = !!state.current;
    try {
      closeMenus(); closeFind(); closeCtxMenu();
      if (document.body.classList.contains('zen')) setZen(false);
      if (!hasDoc) hasDoc = !!(await openBuiltinDoc('guide'));
      if (state.editing) setEditing(false);
    } catch {}
    hasDoc = hasDoc || !!state.current;
    tour.steps = TOUR.filter((s) => (s.center || tourTarget(s)) && (!s.needDoc || hasDoc));
    if (!hasDoc) tour.steps[tour.steps.length - 1] = { ...TOUR[TOUR.length - 1],
      text: L('<b>파일 열기</b>나 <b>폴더 열기</b>로 내 문서를 열어 보세요.<br>이 안내는 <b>⋯ → 도움말 → 처음 사용 안내 다시 보기</b>로 언제든 다시 볼 수 있습니다.', 'Open your own documents with <b>Open file</b> or <b>Open folder</b>.<br>You can replay this tour anytime from <b>⋯ → Help → Replay the tour</b>.') };
    tour.i = 0;
    tour.on = true;
    $('#tour').hidden = false;
    showTourStep();
  }
  function endTour() {
    tour.on = false;
    $('#tour').hidden = true;
    store.set('mdv-tour-done', '1');
  }
  function showTourStep() {
    const s = tour.steps[tour.i];
    const card = $('#tourCard'), spot = $('#tourSpot'), box = $('#tour');
    const narrowText = isNarrow() && s.mobileText;
    $('#tourStep').textContent = s.center ? '' : `${tour.i} / ${tour.steps.length - 2}`;
    $('#tourTitle').textContent = s.title;
    $('#tourText').innerHTML = (s.emoji ? `<span class="tour-emoji">${s.emoji}</span>` : '') + (narrowText || s.text);
    if (s.emoji) { $('#tourText').prepend($('#tourText').querySelector('.tour-emoji')); }
    const tl = $('#tourLang');
    tl.hidden = !s.lang;
    if (s.lang) tl.innerHTML = '<span class="tour-lang-label">언어 · Language</span><div class="seg">' +
      [['ko', '한국어'], ['en', 'English']].map(([v, t]) => `<button type="button" data-v="${v}" class="${v === LANG ? 'on' : ''}">${t}</button>`).join('') + '</div>';
    $('#tourDots').innerHTML = tour.steps.map((_, i) => `<span class="${i === tour.i ? 'on' : ''}"></span>`).join('');
    const last = tour.i === tour.steps.length - 1;
    $('#tourPrev').hidden = tour.i === 0 || last;
    $('#tourNext').textContent = s.next || (tour.i === tour.steps.length - 2 ? L('마치기', 'Finish') : L('다음', 'Next'));
    $('#tourSkip').textContent = last && s.alt ? s.alt : L('건너뛰기', 'Skip');
    $('#tourSkip').hidden = false;
    card.classList.toggle('center', !!s.center);
    card.style.left = card.style.top = '';
    const t = !s.center && tourTarget(s);
    box.classList.toggle('has-spot', !!t);
    if (t) {
      const r = t.getBoundingClientRect(), pad = 6;
      const sx = Math.max(4, r.left - pad), sy = Math.max(4, r.top - pad);
      const sw = Math.min(innerWidth - 8, r.right + pad) - sx, sh = Math.min(innerHeight - 8, r.bottom + pad) - sy;
      Object.assign(spot.style, { left: sx + 'px', top: sy + 'px', width: sw + 'px', height: sh + 'px' });
      const cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
      let left, top;
      if (sh > innerHeight * 0.5 && sx + sw + gap + cw < innerWidth) { left = sx + sw + gap; top = Math.max(16, Math.min(sy + 40, innerHeight - ch - 16)); }
      else {
        left = Math.max(16, Math.min(sx + sw / 2 - cw / 2, innerWidth - cw - 16));
        top = sy + sh + gap + ch < innerHeight ? sy + sh + gap : Math.max(16, sy - ch - gap);
      }
      card.style.left = left + 'px';
      card.style.top = top + 'px';
    }
    $('#tourNext').focus({ preventScroll: true });
  }
  function tourGo(step) {
    const n = tour.i + step;
    if (n < 0) return;
    if (n >= tour.steps.length) { endTour(); return; }
    tour.i = n;
    showTourStep();
  }
  $('#tourLang').onclick = (e) => {
    const v = e.target.closest('button')?.dataset.v;
    if (!v || v === LANG) return;
    if (state.dirty && !confirm(L('저장하지 않은 변경 사항이 있습니다. 버리고 언어를 바꿀까요?', 'You have unsaved changes. Discard them and switch language?'))) return;
    store.set('mdv-lang', v);
    try { sessionStorage.setItem('mdv-tour-resume', '1'); } catch {}
    state.dirty = false;
    location.reload();
  };
  $('#tourNext').onclick = () => tourGo(1);
  $('#tourPrev').onclick = () => tourGo(-1);
  $('#tourSkip').onclick = () => {
    const s = tour.steps[tour.i];
    endTour();
    if (tour.i === tour.steps.length - 1 && s.alt) $('#btnOpen').click();
  };
  $('#tourShade').onclick = () => {}; // 바깥을 눌러도 닫히지 않게
  window.addEventListener('keydown', (e) => {
    if (!tour.on) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); endTour(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); tourGo(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); tourGo(-1); }
    else if (!['Enter', ' ', 'Tab'].includes(e.key)) { e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('resize', () => { if (tour.on) showTourStep(); });
  $('#mTour').onclick = () => { closeMenus(); startTour(); };
  // 처음 실행이거나, 안내 중에 언어를 바꿔 다시 열렸으면 안내를 띄움
  let tourResume = false;
  try { tourResume = sessionStorage.getItem('mdv-tour-resume') === '1'; sessionStorage.removeItem('mdv-tour-resume'); } catch {}
  if (tourResume || !store.get('mdv-tour-done')) setTimeout(() => { if (!tour.on) startTour(); }, tourResume ? 300 : 800);

  /* =========================================================
     PC 프로그램(Tauri)으로 실행했을 때: 더블클릭한 파일 열기, 원래 파일에 저장
     ========================================================= */
  const tauriInvoke = window.__TAURI__?.core?.invoke || null;
  async function openTauriPaths(paths) {
    const entries = [];
    for (const p of paths) {
      try {
        const f = await tauriInvoke('read_file', { path: p });
        entries.push({ name: f.name, path: f.name, text: f.text, eol: f.eol, bom: f.bom, enc: f.enc, tauriPath: f.path, lastModified: f.modified });
        if (entries.filter((x) => x.path === f.name).length > 1 || state.files.some((x) => x.loose && x.path === f.name && x.tauriPath !== f.path)) entries[entries.length - 1].path = f.name + ' (' + f.path.replace(/[\\/][^\\/]*$/, '').split(/[\\/]/).pop() + ')';
      } catch (e) { toast(L('파일을 열지 못했습니다: ', "Couldn't open the file: ") + e, 4000); }
    }
    if (entries.length) addFiles(entries, false);
  }
  if (tauriInvoke) {
    document.documentElement.classList.add('is-desktop-app');
    tauriInvoke('startup_file').then((p) => p && openTauriPaths([p])).catch(() => {});
    // 지난번에 열어 둔 폴더들을 다시 열기
    (async () => {
      for (const f of store.json('mdv-workspace', [])) {
        try { await openFolder({ kind: 'tauri', path: f.path, name: f.name }, { quiet: true }); } catch {}
      }
    })();
    // 파일 열기 단추는 PC 프로그램의 파일 선택 창을 씀 (원래 파일에 바로 저장 가능)
    const pickInApp = async () => {
      try {
        const paths = await pickOnce('pick_files');
        if (paths && paths.length) openTauriPaths(paths);
      } catch (e) { toast(L('파일 선택 창을 열지 못했습니다: ', "Couldn't open the file picker: ") + e, 4000); }
    };
    $('#btnOpen').onclick = $('#wOpen').onclick = pickInApp;
    $('#mOpen').onclick = () => { closeMenus(); pickInApp(); };
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'o') { e.stopImmediatePropagation(); e.preventDefault(); pickInApp(); }
    }, true);
  }

  /* =========================================================
     웹 앱: 오프라인 저장, 설치한 앱으로 .md 파일 열기
     ========================================================= */
  if ('serviceWorker' in navigator && !tauriInvoke && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {});
    // 새 버전이 들어오면: 고치던 내용이 없으면 바로 새로고침, 있으면 알려만 줌
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      if (state.dirty) { toast(L('새 버전이 준비됐습니다. 저장한 뒤 새로고침하면 적용됩니다.', 'A new version is ready. Save, then reload to apply it.'), 5000); return; }
      reloading = true;
      location.reload();
    });
  }
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer((params) => {
      if (!params.files || !params.files.length) return;
      addFiles(params.files.map((h) => ({ name: h.name, path: h.name, handle: h, text: null })), false);
    });
  }

  /* =========================================================
     발표 모드 — 구분선(---)으로 나뉜 단락이 한 장씩 (구분선이 없으면 # · ## 제목마다)
     - 원본을 --- 줄로 자르지 않고 그려진 문서의 맨 위 구분선(hr)으로 나눔: 코드 안 · 문서 정보 · 제목 밑줄(---)은 저절로 빠짐
     - 발표자 노트: 그 장 안에 쓴 <!-- 메모 --> 주석
     - ← → · Page Up/Down(발표용 리모컨) · Space, G 모아 보기, N 노트, Esc 끝
     ========================================================= */
  const pr = { slides: [], notes: [], i: 0 };
  function slideClone(node) {
    const c = node.cloneNode(true);
    c.querySelectorAll('.h-tools, .code-copy, .dg-expand, .code-head button').forEach((x) => x.remove());
    [c, ...c.querySelectorAll('[id]')].forEach((x) => { if (x.id && !x.closest('svg')) x.removeAttribute('id'); });
    return c;
  }
  function buildSlides() {
    const kids = [...el.doc.children].filter((n) => !n.classList.contains('front-matter'));
    const byHr = kids.some((n) => n.tagName === 'HR');
    const groups = [[]];
    for (const n of kids) {
      if (byHr && n.tagName === 'HR') { groups.push([]); continue; }
      if (!byHr && /^H[12]$/.test(n.tagName) && groups[groups.length - 1].length) groups.push([]);
      groups[groups.length - 1].push(n);
    }
    pr.slides = groups.filter((g) => g.some((n) => n.textContent.trim() || n.querySelector('img, svg, video, table')))
      .map((nodes) => ({ nodes, line: (nodes.find((n) => n.dataset && n.dataset.line != null) || { dataset: { line: 0 } }).dataset.line * 1 }));
    // 노트: 맨 위 단계의 <!-- … --> 를 그 줄이 든 장에
    pr.notes = pr.slides.map(() => []);
    for (const t of md.parse(stripNotes(splitFrontMatter(source()).body), {})) {
      if (t.type !== 'html_block' || t.level !== 0 || !/^\s*<!--/.test(t.content)) continue;
      const at = t.map ? t.map[0] : 0;
      let k = 0;
      pr.slides.forEach((s, n) => { if (s.line <= at) k = n; });
      pr.notes[k].push(t.content.replace(/^\s*<!--/, '').replace(/-->\s*$/, '').trim());
    }
  }
  function prFit() {
    const stage = $('#prStage'), box = $('#prSlide');
    box.style.transform = '';
    stage.style.alignItems = 'center';
    const avail = stage.clientHeight - 16, h = box.scrollHeight;
    if (h > avail) { box.style.transform = `scale(${Math.max(0.3, avail / h)})`; stage.style.alignItems = 'flex-start'; }
  }
  function prShow(i) {
    if (!pr.slides.length) return;
    pr.i = Math.max(0, Math.min(pr.slides.length - 1, i));
    const box = $('#prSlide');
    box.innerHTML = '';
    for (const n of pr.slides[pr.i].nodes) box.append(slideClone(n));
    $('#prCount').textContent = `${pr.i + 1} / ${pr.slides.length}`;
    const notes = pr.notes[pr.i] || [];
    $('#prNotes').textContent = notes.length ? notes.join('\n\n') : L('이 장에는 노트가 없습니다. 장 안에 <!-- 메모 --> 로 씁니다.', 'No notes on this slide. Write them inside the slide as <!-- note -->.');
    requestAnimationFrame(prFit);
  }
  function prGrid(on) {
    const grid = $('#prGrid');
    grid.hidden = !on;
    $('#prStage').hidden = on;
    if (!on) { requestAnimationFrame(prFit); return; }
    grid.innerHTML = '';
    pr.slides.forEach((s, n) => {
      const th = document.createElement('div');
      th.className = 'pr-thumb' + (n === pr.i ? ' on' : '');
      const body = document.createElement('div');
      body.className = 'markdown-body';
      s.nodes.forEach((x) => body.append(slideClone(x)));
      const no = document.createElement('span');
      no.className = 'pr-no';
      no.textContent = n + 1;
      th.append(body, no);
      th.onclick = () => { prGrid(false); prShow(n); };
      grid.append(th);
    });
    grid.querySelector('.pr-thumb.on')?.scrollIntoView({ block: 'nearest' });
  }
  function startPresent() {
    closeMenus();
    if (!state.current) return;
    buildSlides();
    if (!pr.slides.length) { toast(L('발표할 내용이 없습니다', 'Nothing to present')); return; }
    // 지금 보던 곳의 장부터
    const top = el.preview.getBoundingClientRect().top;
    let start = 0;
    pr.slides.forEach((s, n) => { const r = s.nodes[0].getBoundingClientRect(); if (r.top - top < el.preview.clientHeight / 3) start = n; });
    $('#present').hidden = false;
    $('#prGrid').hidden = true;
    $('#prStage').hidden = false;
    $('#prNotes').hidden = true;
    try { const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch {}
    prShow(start);
    if (pr.slides.length === 1) toast(L('구분선(---)이나 ## 제목이 없어 한 장으로 보입니다', 'No dividers (---) or ## headings, so it shows as one slide'), 4000);
  }
  function prClose() {
    $('#present').hidden = true;
    $('#prSlide').innerHTML = '';
    $('#prGrid').innerHTML = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  // 슬라이드 인쇄 · PDF: 한 장씩 한 쪽에
  function prPrint() {
    const box = $('#prPrintBox');
    box.innerHTML = '';
    pr.slides.forEach((s) => {
      const page = document.createElement('div');
      page.className = 'pr-page markdown-body';
      s.nodes.forEach((x) => page.append(slideClone(x)));
      box.append(page);
    });
    box.hidden = false;
    document.body.classList.add('printing-slides');
    const done = () => { document.body.classList.remove('printing-slides'); box.hidden = true; box.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 50);
  }
  $('#mPresent').onclick = startPresent;
  $('#prPrev').onclick = () => prShow(pr.i - 1);
  $('#prNext').onclick = () => prShow(pr.i + 1);
  $('#prGridBtn').onclick = () => prGrid($('#prGrid').hidden);
  $('#prNotesBtn').onclick = () => { $('#prNotes').hidden = !$('#prNotes').hidden; requestAnimationFrame(prFit); };
  $('#prPrint').onclick = prPrint;
  $('#prClose').onclick = prClose;
  $('#prStage').addEventListener('click', (e) => {
    const tab = e.target.closest('.mc-tab');
    if (tab) { showTab(tab.closest('.mc-tabs'), tab.dataset.tab); return; }
    if (!e.target.closest('a, button, input, summary, video, audio')) prShow(pr.i + 1);
  });
  window.addEventListener('resize', () => { if (!$('#present').hidden) prFit(); });
  window.addEventListener('keydown', (e) => {
    if ($('#present').hidden) return;
    const k = e.key;
    const go = (fn) => { e.preventDefault(); e.stopImmediatePropagation(); fn(); };
    if (k === 'Escape') go(() => (!$('#prGrid').hidden ? prGrid(false) : prClose()));
    else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) go(() => prShow(pr.i + 1));
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) go(() => prShow(pr.i - 1));
    else if (k === 'Home') go(() => prShow(0));
    else if (k === 'End') go(() => prShow(pr.slides.length - 1));
    else if (/^[gGoO]$/.test(k) && !e.ctrlKey && !e.metaKey) go(() => prGrid($('#prGrid').hidden));
    else if (/^[nN]$/.test(k) && !e.ctrlKey && !e.metaKey) go(() => { $('#prNotes').hidden = !$('#prNotes').hidden; requestAnimationFrame(prFit); });
    else if (!e.ctrlKey && !e.metaKey && !e.altKey) e.stopImmediatePropagation(); // 발표 중에는 다른 단축키가 끼어들지 않게
  }, true);


  /* =========================================================
     Claude와 연결 (MCP) — PC 프로그램에서만
     markcont 가 MCP 서버(markcont --mcp)에게 '열어 둔 폴더 · 지금 문서 · 선택한 부분'을 알려주고,
     Claude 가 고친 파일은 자동 새로고침 + '바뀐 내용 보기'로 보여줌
     ========================================================= */
  function currentAbsPath() {
    const cur = state.current;
    if (!cur) return null;
    if (cur.tauriPath) return cur.tauriPath;
    const r = !cur.loose && rootOf(cur.path);
    return r && r.kind === 'tauri' ? absPath(cur.path) : null;
  }
  function currentSelection() {
    if (state.editing && el.editor.selectionEnd > el.editor.selectionStart) return el.editor.value.slice(el.editor.selectionStart, el.editor.selectionEnd);
    const sel = window.getSelection();
    return sel && sel.rangeCount && el.doc.contains(sel.anchorNode) ? String(sel).trim() : '';
  }
  var mcpSyncTimer, mcpLastSent = ''; // var: 시작할 때 먼저 불려도 안전하게
  function syncMcpState() {
    if (!isTauri()) return;
    clearTimeout(mcpSyncTimer);
    mcpSyncTimer = setTimeout(() => {
      const payload = {
        roots: state.roots.filter((r) => r.kind === 'tauri').map((r) => ({ name: r.key, path: r.path })),
        current: currentAbsPath(),
        selection: currentSelection().slice(0, 8000) || null,
        lang: LANG,
        suggestOnly: !!settings.mcpSuggest, // 「Claude는 제안으로만 고치기」
      };
      const key = JSON.stringify(payload);
      if (key === mcpLastSent) return;
      mcpLastSent = key;
      tinvoke('set_mcp_state', payload).catch(() => {});
    }, 400);
  }
  document.addEventListener('selectionchange', () => { if (state.current) syncMcpState(); });

  // Claude 활동 보기 (2초마다)
  let mcpSince = Date.now();
  function fileLabel(p) { return (p || '').split(/[\\/]/).pop(); }
  async function pollMcp() {
    if (!isTauri() || document.hidden) return;
    let list = [];
    try { list = await tinvoke('mcp_activity', { since: mcpSince }); } catch { return; }
    if (!list.length) return;
    let wrote = false;
    for (const a of list) {
      mcpSince = Math.max(mcpSince, a.t);
      if (a.tool === 'write') { mcpRecent.set(normPath(a.path), a.t); wrote = true; }
    }
    const last = list[list.length - 1];
    const pill = $('#mcpPill');
    pill.hidden = false;
    pill.textContent = last.tool === 'write' ? L(`🔌 Claude가 ${fileLabel(last.path)} 고침`, `🔌 Claude edited ${fileLabel(last.path)}`) : L(`🔌 Claude가 ${fileLabel(last.path)} 읽음`, `🔌 Claude read ${fileLabel(last.path)}`);
    clearTimeout(pollMcp.hideTimer);
    pollMcp.hideTimer = setTimeout(() => { pill.hidden = true; }, 15000);
    if (wrote) refreshFolder({ quiet: true });
  }
  if (isTauri()) setInterval(pollMcp, 2000);
  $('#mcpPill').onclick = () => openMcp();

  // 연결 창
  async function openMcp() {
    closeMenus();
    const body = $('#mcpBody');
    const legal = '<p class="mcp-legal">' + L('Claude는 Anthropic의 상표입니다. markcont는 Anthropic과 관계없는 독립 오픈소스 프로그램입니다.', 'Claude is a trademark of Anthropic. markcont is an independent open-source program not affiliated with Anthropic.') + '</p>';
    const privacy = L(`<div class="mcp-section"><h4>🔒 연결하기 전에 알아 두세요</h4><ul>
      <li>연결하면 Claude가 <b>markcont에서 열어 둔 폴더의 마크다운 파일</b>을 읽고 고칠 수 있습니다.</li>
      <li>Claude가 읽은 문서 내용은 <b>Anthropic으로 보내져 처리</b>됩니다 (Anthropic의 이용 약관 · 개인정보 처리방침이 적용됩니다). markcont가 따로 문서를 어디로 보내지는 않습니다.</li>
      <li>Claude는 <b>열어 둔 폴더 안의 마크다운 · 텍스트 파일만</b> 다룰 수 있고, 파일 삭제 · 이름 바꾸기 · 명령 실행은 할 수 없습니다.</li>
      <li>Claude 앱은 도구를 쓰기 전에 허락을 묻습니다. 고친 곳은 markcont에서 <b>바로 보입니다</b>. 잘못 고쳐졌다면 바뀐 내용 보기 · 되돌리기 기록으로 되돌릴 수 있고, 파일에 저장된 뒤에도 <b>저장 기록</b>(14일 · 파일마다 50개)에서 고치기 전 내용으로 되돌릴 수 있습니다. 그래도 중요한 문서는 따로 백업해 두세요.</li>
      <li>내 구독(Claude Pro · Max 등)으로 <b>Claude 앱에서</b> 대화합니다. markcont는 구독이나 API 키를 쓰지 않습니다.</li>
      <li>⚠️ <b>남이 보낸 문서는 조심하세요.</b> 문서 안에 숨겨진 지시문을 AI가 따를 수 있습니다. 믿을 수 없는 문서가 든 폴더는 연결한 채로 AI에게 맡기지 마세요.</li></ul></div>`,
      `<div class="mcp-section"><h4>🔒 Before you connect</h4><ul>
      <li>Once connected, Claude can read and edit <b>the markdown files in folders you opened in markcont</b>.</li>
      <li>Document content Claude reads is <b>sent to Anthropic for processing</b> (Anthropic's terms and privacy policy apply). markcont itself doesn't send your documents anywhere.</li>
      <li>Claude can only work with <b>markdown and text files inside the folders you opened</b>. It can't delete or rename files or run commands.</li>
      <li>The Claude app asks for permission before using a tool. Edits show up in markcont <b>right away</b>. If something gets changed by mistake you can undo it with View changes · Undo history, and even after it has been saved to the file you can go back to the content before the edit in <b>Saved versions</b> (14 days, up to 50 per file). Still, keep backups of important documents.</li>
      <li>You chat <b>in the Claude app</b> with your own subscription (Claude Pro, Max, etc.). markcont doesn't use any subscription or API key.</li>
      <li>⚠️ <b>Be careful with documents from others.</b> The AI may follow instructions hidden inside a document. Don't hand a folder with untrusted documents to the AI while connected.</li></ul></div>`);
    if (!isTauri()) {
      body.innerHTML = privacy.replace(L('연결하기 전에 알아 두세요', 'Before you connect'), L('Claude와 연결이란?', 'What is connecting to Claude?')) +
        L('<div class="mcp-section"><h4>💻 PC 프로그램에서만 됩니다</h4><p>Claude Desktop · Claude Code가 markcont에 연결하려면 내 컴퓨터에 설치된 markcont가 필요합니다. 웹 앱(브라우저)에서는 쓸 수 없습니다.</p>',
          '<div class="mcp-section"><h4>💻 PC app only</h4><p>For Claude Desktop or Claude Code to connect, markcont must be installed on your computer. It isn\'t available in the web app (browser).</p>') +
        '<p><a href="https://github.com/RyuSeoJin/markcont/releases/latest" target="_blank" rel="noopener">' + L('PC 프로그램 내려받기 →', 'Download the PC app →') + '</a></p></div>' + legal;
      $('#mcpModal').hidden = false;
      return;
    }
    let info = {};
    try { info = await tinvoke('mcp_setup_info'); } catch {}
    const exe = info.exe || 'markcont';
    const ccCmd = `claude mcp add markcont -- "${exe}" --mcp`;
    const json = JSON.stringify({ mcpServers: { markcont: { command: exe, args: ['--mcp'] } } }, null, 2);
    const folders = state.roots.filter((r) => r.kind === 'tauri').map((r) => escapeHtml(r.key));
    body.innerHTML = privacy +
      `<div class="mcp-section"><h4>📁 ${L('Claude가 다룰 수 있는 폴더', 'Folders Claude can work with')}</h4><p>${folders.length ? folders.join(' · ') : L('아직 없습니다. <b>폴더 열기</b>로 폴더를 먼저 여세요.', 'None yet. Open a folder with <b>Open folder</b> first.')}</p></div>` +
      `<div class="mcp-section"><h4>✍️ ${L('Claude가 고치는 방법', 'How Claude edits')}</h4>
        <label class="check-row"><input type="checkbox" id="mcpSuggest"${settings.mcpSuggest ? ' checked' : ''}><span>${L('제안으로만 고치기', 'Only suggest changes')}<small>${L('Claude가 글을 바로 바꾸지 않고 교정 표기(<code>{~~옛 글~>새 글~~}</code>)로 남깁니다. 문서에서 표기를 눌러 하나씩 받아들이거나 버리고, 받아들이기 전까지 원래 글은 그대로입니다. 꺼 두어도 "제안으로 고쳐 줘"라고 하면 같은 방식으로 고칩니다.', 'Claude leaves suggestion marks (<code>{~~old~>new~~}</code>) instead of changing the text. Click a mark in the document to accept or reject it; the original stays until you accept. Even when this is off, asking "suggest changes" works the same way.')}</small></span></label></div>` +
      `<div class="mcp-section"><h4>Claude Desktop <span class="mcp-badge ${info.added ? 'ok' : 'no'}">${info.added ? L('연결됨', 'Connected') : L('연결 안 됨', 'Not connected')}</span></h4>
        <p>${L('단추를 누르면 Claude Desktop 설정에 markcont를 더합니다 (기존 설정은 <code>.bak</code> 으로 백업, 다른 항목은 그대로).', "This button adds markcont to Claude Desktop's settings (the old settings are backed up as <code>.bak</code>; other entries are left alone).")}</p>
        <button class="btn primary" id="mcpAdd">${info.added ? L('다시 연결하기', 'Reconnect') : L('Claude Desktop에 연결', 'Connect to Claude Desktop')}</button>
        <p style="margin-top:8px">${L('연결한 뒤 <b>Claude Desktop을 완전히 종료했다가 다시 여세요</b>. 대화창의 도구 목록에 markcont가 보이면 됩니다.', "After connecting, <b>quit Claude Desktop completely and open it again</b>. You're done when markcont appears in the chat's tool list.")}</p></div>` +
      `<div class="mcp-section"><h4>Claude Code</h4><p>${L('터미널에서 한 번 실행하세요.', 'Run this once in a terminal.')}</p>
        <div class="mcp-code"><code id="mcpCc"></code><button class="btn" id="mcpCopyCc">${L('복사', 'Copy')}</button></div></div>` +
      `<div class="mcp-section"><h4>${L('직접 설정하기', 'Manual setup')}</h4><p>${L('다른 MCP 프로그램이나 직접 설정할 때 쓰는 내용입니다.', 'Use this for other MCP clients or manual setup.')}</p>
        <div class="mcp-code"><code id="mcpJson"></code><button class="btn" id="mcpCopyJson">${L('복사', 'Copy')}</button></div></div>` +
      `<div class="mcp-section"><h4>💬 ${L('이렇게 요청해 보세요', 'Try asking')}</h4><ul>${L('<li>"markcont에서 보고 있는 문서를 작성 규칙에 맞게 다듬어 줘"</li><li>"회의록 폴더의 문서들을 한 장으로 요약해서 새 문서로 만들어 줘"</li><li>"선택한 부분을 표로 바꿔 줘"</li>', `<li>"Polish the document I'm viewing in markcont to follow the writing rules"</li><li>"Summarize the documents in the meeting-notes folder into one new document"</li><li>"Turn the selected part into a table"</li>`)}</ul></div>` + legal;
    $('#mcpCc').textContent = ccCmd;
    $('#mcpJson').textContent = json;
    $('#mcpSuggest').onchange = (e) => {
      settings.mcpSuggest = e.target.checked;
      applySettings();
      syncMcpState();
      toast(e.target.checked ? L('이제 Claude는 제안으로만 고칩니다', 'Claude now only suggests changes') : L('Claude가 다시 바로 고칠 수 있습니다', 'Claude can edit directly again'));
    };
    $('#mcpCopyCc').onclick = () => copyText(ccCmd).then(() => toast(L('명령을 복사했습니다', 'Command copied')));
    $('#mcpCopyJson').onclick = () => copyText(json).then(() => toast(L('설정 내용을 복사했습니다', 'Settings copied')));
    $('#mcpAdd').onclick = async () => {
      try {
        const path = await tinvoke('mcp_add_claude_desktop');
        toast(L('Claude Desktop 설정에 더했습니다. Claude Desktop을 다시 열어 주세요.', 'Added to Claude Desktop settings. Please reopen Claude Desktop.'), 5000);
        syncMcpState();
        openMcp();
        void path;
      } catch (e) { toast(L('연결하지 못했습니다: ', "Couldn't connect: ") + e, 5000); }
    };
    syncMcpState();
    $('#mcpModal').hidden = false;
  }
  function closeMcp() { $('#mcpModal').hidden = true; }
  $('#mMcp').onclick = openMcp;
  $('#mcpClose').onclick = closeMcp;
  $('#mcpModal').addEventListener('click', (e) => { if (e.target.id === 'mcpModal') closeMcp(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#mcpModal').hidden) { e.preventDefault(); e.stopImmediatePropagation(); closeMcp(); } }, true);

  // 테스트·자동화용: 텍스트를 바로 열기
  window.mdViewer = {
    openText(name, text) { const entry = { name: baseName(name), path: name, text, loose: true }; state.files.push(entry); return openEntry(entry); },
    openDir(handle) { return loadDirHandle(handle); },
  };
})();
