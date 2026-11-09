// markcont 전용 문법을 다른 뷰어(GitHub · VS Code · Obsidian 등)에서도 통하는 표준 마크다운으로 바꿉니다.
// - convert(src, { keepCritic }): 바꾼 글과 바꾼 곳 목록 (keepCritic: 교정 표기 · 숨은 메모 %%…%% 를 그대로 둠)
// - stripNotes(src): 숨은 메모 %%…%% 를 지움 (줄 수는 그대로)
// - 코드 블록 · 인라인 코드 · 수식 안은 건드리지 않습니다.
(function () {
  const L = (ko, en) => (window.L ? window.L(ko, en) : ko);

  // 바꾼 곳 종류 → 화면에 보일 설명
  const KINDS = {
    mark: () => [L('형광펜 ==글==', 'Highlight ==text=='), L('<mark> 태그로', 'to a <mark> tag')],
    ins: () => [L('추가 표시 ++글++', 'Inserted ++text++'), L('<ins> 태그로', 'to an <ins> tag')],
    del: () => [L('제거 표시 --글--', 'Deleted --text--'), L('<del> 태그로', 'to a <del> tag')],
    callout: () => [L('추가 알림 상자 [!INFO] 등', 'Extra callout [!INFO] etc.'), L('기본 5종 + 제목으로', 'to one of the 5 standard types + title')],
    calloutTitle: () => [L('알림 상자 제목', 'Callout title'), L('다음 줄 굵은 글씨로', 'to a bold line below')],
    calloutFold: () => [L('접는 알림 상자', 'Foldable callout'), L('<details> 접는 내용으로', 'to <details>')],
    wikilink: () => [L('위키링크 [[문서]]', 'Wikilink [[doc]]'), L('일반 링크로', 'to a normal link')],
    embed: () => [L('위키식 그림 ![[그림]]', 'Wiki embed ![[image]]'), L('일반 그림으로', 'to a normal image')],
    imgSize: () => [L('그림 크기 ![[그림|300]] · ![설명|300](그림)', 'Image size ![[image|300]] · ![alt|300](image)'), L('<img width> 태그로', 'to an <img width> tag')],
    toc: () => [L('문서 안 목차 [[_TOC_]]', 'Table of contents [[_TOC_]]'), L('제목 링크 목록으로', 'to a list of heading links')],
    footnote: () => [L('바로 쓰는 각주 ^[설명]', 'Inline footnote ^[text]'), L('표준 각주로', 'to a standard footnote')],
    deflist: () => [L('정의 목록', 'Definition list'), L('굵은 용어 + 설명으로', 'to bold term + text')],
    media: () => [L('동영상 · 소리', 'Video · audio'), L('링크로', 'to a link')],
    diagram: () => [L('markcont 다이어그램', 'markcont diagram'), L('Mermaid 로', 'to Mermaid')],
    example: () => [L('쓰는 법 · 결과 나란히 블록', 'Side-by-side example block'), L('코드 블록 + 그 아래 보이는 모습', 'a code block with its result below')],
    chem: () => [L('화학식 \\ce{}', 'Chemistry \\ce{}'), L('바꾸지 않음 (GitHub 수식은 \\ce 를 모름)', 'not converted (GitHub math has no \\ce)')],
    diagramErr: () => [L('다이어그램 (틀린 곳 있음)', 'Diagram (has errors)'), L('바꾸지 않음', 'not converted')],
    uiTree: () => [L('노출 위치 블록', 'Exposure block'), L('일반 들여 쓴 목록으로', 'to a normal indented list')],
    dataTable: () => [L('데이터 정의 블록', 'Data definition block'), L('데이터마다 일반 표로', 'to a normal table per data')],
    cjkEmph: () => [L('조사가 붙은 굵게 · 기울임 **굵게(괄호)**는', 'Bold · italic next to CJK text **bold(note)**는'), L('<strong> · <em> · <del> 태그로', 'to <strong> · <em> · <del> tags')],
    cjkEmphErr: () => [L('조사가 붙은 굵게 (기호가 얽혀 있음)', 'Bold next to CJK text (tangled markers)'), L('바꾸지 않음 — <strong> 태그로 직접 바꾸세요', 'not converted — change it to a <strong> tag by hand')],
    embedDoc: () => [L('문서 넣기 ![[문서#제목]]', 'Embedded document ![[doc#heading]]'), L('다른 뷰어용으로 저장할 때 내용을 펼쳐 넣음 (못 읽으면 링크로)', 'expanded into the content when saving for other viewers (a link if it can’t be read)')],
    container: () => [L('::: 블록 (탭 · 단계 · 파일 트리)', '::: blocks (tabs · steps · file tree)'), L('탭은 굵은 제목 + 내용, 단계 · 트리는 일반 목록으로', 'tabs to bold titles + content, steps · trees to plain lists')],
    critic: () => [L('교정 표기 {++추가++} 등', 'Suggestion marks {++added++} etc.'), L('다른 뷰어용으로 저장할 때만 <ins> · <del> · <mark> 태그로 (메모는 숨은 주석)', 'to <ins> · <del> · <mark> tags only when saving for other viewers (comments become hidden HTML comments)')],
    fmGap: () => [L('문서 정보 --- 바로 뒤에 빈 줄 없음', 'No blank line right after the document info ---'), L('빈 줄을 넣음 (없으면 제목까지 문서 정보로 삼키는 뷰어가 있음)', 'blank line added (some viewers swallow the title into the document info without it)')],
    fmViewer: () => [L('문서 정보 「뷰어: markcont」', 'Document info "viewer: markcont"'), L('뺌 (이 사본은 markcont 전용이 아님)', 'removed (this copy isn’t markcont-only)')],
    hiddenNote: () => [L('숨은 메모 %%…%%', 'Hidden note %%…%%'), L('지움 (다른 뷰어에서는 글자 그대로 보여서)', 'removed (other viewers show it as plain text)')],
  };
  // ::: 블록 (탭 · 단계 · 파일 트리)
  const CONTAINER_OPEN = /^\s{0,3}:::\s*(tabs|탭|steps|단계|tree|트리)\s*$/i;
  const CONTAINER_CLOSE = /^\s{0,3}:::\s*$/;
  // 줄 i 가 ::: tabs 안인지 (위로 올라가며 짝을 셈)
  function inTabs(lines, i) {
    let depth = 0;
    for (let k = i - 1; k >= 0; k--) {
      if (CONTAINER_CLOSE.test(lines[k])) depth++;
      else { const m = lines[k].match(CONTAINER_OPEN); if (m) { if (!depth) return /^(tabs|탭)$/i.test(m[1]); depth--; } }
    }
    return false;
  }
  // Obsidian 숨은 메모 %%…%% (여러 줄도): markcont 는 보기 · HTML 저장 · 서식 복사 · Word 에서 빼고, 다른 뷰어용으로 저장할 때 지움
  //  (GitHub 등은 글자 그대로 보여서, 남에게 보내는 파일에 메모가 따라가지 않게)
  //  - 지운 자리의 줄바꿈은 남겨 원본 줄 번호(data-line)가 어긋나지 않게
  //  - 코드 블록 · `코드` · $$ 수식 블록 · $수식$ 안의 %% 는 그대로 (그 자리를 빈칸으로 가린 뒤 짝을 찾음)
  //  - 닫는 %% 가 없거나 숫자 바로 뒤의 %%(50%% 같은 글)는 메모로 보지 않음 — 뒤의 글을 다 숨기지 않게
  function maskCodeMath(src) {
    let fence = null, math = false;
    const blank = (s) => s.replace(/[^\n]/g, ' ');
    return src.split('\n').map((l) => {
      const f = l.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && /^ {0,3}(`+|~+)\s*$/.test(l)) fence = null; return blank(l); }
      if (f) { fence = f[1]; return blank(l); }
      if (/^\s*\$\$/.test(l) && !/^\s*\$\$.*\S.*\$\$\s*$/.test(l)) { math = !math; return blank(l); }
      if (math) return blank(l);
      return l.replace(/\\./g, '  ').replace(/(`+)[^`][\s\S]*?\1(?!`)/g, blank).replace(/\$(?=[^\s$])[^$\n]*?[^\s$]\$|\$[^\s$]\$/g, blank);
    }).join('\n');
  }
  function stripNotes(src) {
    if (!src || !src.includes('%%')) return src;
    const flat = maskCodeMath(src), ranges = [];
    let open = -1;
    for (let k = flat.indexOf('%%'); k >= 0; k = flat.indexOf('%%', k + 2)) {
      if (open >= 0) { ranges.push([open, k + 2]); open = -1; }
      else if (!(k > 0 && /\d/.test(flat[k - 1]))) open = k;
    }
    if (!ranges.length) return src;
    let out = '', last = 0;
    for (const [a, b] of ranges) { out += src.slice(last, a) + src.slice(a, b).replace(/[^\n]/g, ''); last = b; }
    return out + src.slice(last);
  }
  // 교정 표기 (CriticMarkup) 한 줄 안: {++추가++} {--삭제--} {~~옛~>새~~} {>>메모<<} {==표시==}
  const CRITIC_LINE = /(\{\+\+.+?\+\+\}|\{--.+?--\}|\{~~.*?~>.*?~~\}|\{>>.+?<<\}|\{==.+?==\})/;
  function criticHtml(m) {
    const inner = m.slice(3, -3);
    if (m.startsWith('{++')) return `<ins>${inner}</ins>`;
    if (m.startsWith('{--')) return `<del>${inner}</del>`;
    if (m.startsWith('{~~')) { const i = inner.indexOf('~>'), a = inner.slice(0, i), b = inner.slice(i + 2); return (a ? `<del>${a}</del>` : '') + (b ? `<ins>${b}</ins>` : ''); }
    if (m.startsWith('{>>')) return `<!-- ${inner.replace(/--/g, '- -')} -->`;
    return `<mark>${inner}</mark>`;
  }
  const STD = { note: 1, tip: 1, important: 1, warning: 1, caution: 1 };
  const MAP = { info: 'NOTE', todo: 'NOTE', example: 'NOTE', question: 'NOTE', faq: 'NOTE', danger: 'CAUTION' };
  const NAME = () => ({ note: L('참고', 'Note'), info: L('정보', 'Info'), todo: L('할 일', 'To do'), tip: L('팁', 'Tip'), important: L('중요', 'Important'),
    example: L('예시', 'Example'), warning: L('주의', 'Warning'), question: L('질문', 'Question'), faq: 'FAQ', caution: L('경고', 'Caution'), danger: L('위험', 'Danger') });
  const MEDIA = /\.(mp4|webm|ogv|mov|mp3|wav|aac|flac|m4a|oga|ogg)(?=$|[?#])/i;
  const ASSET_LIKE = /\.(png|jpe?g|gif|svg|webp|bmp|avif|ico|mp4|webm|ogv|mov|mp3|wav|aac|flac|m4a|oga|ogg|pdf)$/i;
  const ghSlug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
  const dest = (u) => (/[\s()<>]/.test(u) ? `<${u}>` : u);
  // 그림 크기: 「설명|300」 · 「300x200」 → { text, w, h } (표 칸 안의 \| 도)
  function sizeOf(s) {
    let w = 0, h = 0;
    const text = [];
    for (const p of String(s || '').split('|').map((x) => x.replace(/\\$/, '').trim())) {
      const m = p.match(/^(\d{1,5})(?:\s*[x×]\s*(\d{1,5}))?$/);
      if (m && !w) { w = +m[1]; h = +(m[2] || 0); } else if (p) text.push(p);
    }
    return { text: text.join(' | '), w, h };
  }
  const attr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const imgTag = (src, alt, o, title) => `<img src="${attr(src.replace(/ /g, '%20'))}" alt="${attr(alt)}"${title ? ` title="${attr(title)}"` : ''} width="${o.w}"${o.h ? ` height="${o.h}"` : ''}>`;

  // 조사가 붙은 굵게 · 기울임 · 취소선: markcont 에서만 되는 짝을 HTML 태그로
  //  - markcont 해석(cjk)과 CommonMark 해석(std)을 견줘서, markcont 에서만 생긴 짝만 바꿈
  //  - 바꾼 뒤 CommonMark 로 다시 그려 보고, 모양이 달라지면 바꾸지 않고 알리기만 함
  const samePair = (p, q) => p.tag === q.tag && p.open[0] === q.open[0] && p.close[0] === q.close[0];
  const delTag = (h) => h.replace(/<(\/?)s>/g, '<$1del>');
  function cjkText(text, P) {
    const C = window.markdownitCjk;
    if (!C.edge.test(text)) return { text, state: 'same' };
    const std = C.pairs(P.std, text);
    const only = C.pairs(P.cjk, text).filter((p) => !std.some((q) => samePair(p, q)));
    if (!only.length) return { text, state: 'same' };
    const edits = [];
    for (const p of only) edits.push([p.open[0], p.open[1], `<${p.tag}>`], [p.close[0], p.close[1], `</${p.tag}>`]);
    edits.sort((a, b) => b[0] - a[0]);
    let out = text;
    for (const [from, to, tag] of edits) out = out.slice(0, from) + tag + out.slice(to);
    if (delTag(P.std.renderInline(out)) !== delTag(P.cjk.renderInline(text))) return { text, state: 'failed' };
    return { text: out, state: 'fixed' };
  }
  // 표 줄은 칸마다 따로 (칸을 넘는 짝이 생기지 않게). 코드 안의 | 와 \| 는 칸 나눔이 아님
  function rowCells(line) {
    const cells = [];
    let cur = '', tick = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '\\' && i + 1 < line.length) { cur += ch + line[++i]; continue; }
      if (ch === '`') {
        let n = 1;
        while (line[i + n] === '`') n++;
        cur += line.slice(i, i + n);
        i += n - 1;
        tick = !tick ? n : tick === n ? 0 : tick;
        continue;
      }
      if (ch === '|' && !tick) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    return cells;
  }
  function cjkLine(line) {
    const P = window.markdownitCjk && MarkPortable.parsers && MarkPortable.parsers();
    if (!P || !/[*_~]/.test(line)) return { text: line, state: 'same' };
    if (!/^\s*\|/.test(line)) return cjkText(line, P);
    const res = rowCells(line).map((c) => cjkText(c, P));
    if (res.some((r) => r.state === 'failed')) return { text: line, state: 'failed' };
    if (!res.some((r) => r.state === 'fixed')) return { text: line, state: 'same' };
    return { text: res.map((r) => r.text).join('|'), state: 'fixed' };
  }

  // 문서 안 목차 [[_TOC_]] · [toc] · [[toc]] 한 줄
  const TOC_LINE = /^\s{0,3}(\[\[_toc_\]\]|\[\[toc\]\]|\[toc\])\s*$/i;
  // 제목 글자에서 마크다운 기호를 뺀 것 (GitHub 이 제목 링크 이름을 만들 때처럼)
  const plainHeading = (s) => s
    .replace(/!?\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g, (m, f, h, a) => a || [f, h].filter(Boolean).join(' › '))
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|~~|==|\+\+|\*/g, '')
    .trim();
  // 목차에 넣을 제목 (# ~ ###, 맨 위 제목이 하나뿐이면 그 제목은 빼고 ## ~ ####) → 링크 목록 줄
  function tocLines(lines) {
    const heads = [], used = new Map();
    let fence = null, inFm = /^---\s*$/.test(lines[0] || '');
    for (let k = 0; k < lines.length; k++) {
      const l = lines[k];
      if (inFm) { if (k > 0 && /^(---|\.\.\.)\s*$/.test(l)) inFm = false; continue; }
      const f = l.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fence) { if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !l.trim().slice(f[1].length).trim()) fence = null; continue; }
      if (f) { fence = f[1]; continue; }
      const h = l.match(/^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
      if (!h) continue;
      const text = plainHeading(h[2]);
      let slug = ghSlug(text);
      const n = used.get(slug) || 0;
      used.set(slug, n + 1);
      if (n) slug += '-' + n;
      heads.push({ lvl: h[1].length, text, slug });
    }
    const one = heads.filter((h) => h.lvl === 1).length === 1;
    const hs = heads.filter((h) => (one ? h.lvl >= 2 && h.lvl <= 4 : h.lvl <= 3));
    if (!hs.length) return [];
    const min = Math.min(...hs.map((h) => h.lvl));
    return hs.map((h) => '  '.repeat(h.lvl - min) + `- [${h.text.replace(/[[\]]/g, '\\$&')}](#${h.slug})`);
  }

  // opts.keepCritic: 교정 표기는 그대로 둠 (이 문서를 표준 문법으로 바꿀 때 — 받아들이기 전의 제안을 지우지 않게)
  function convert(src, opts = {}) {
    const raw = String(src).replace(/\r\n?/g, '\n');
    // 숨은 메모 %%…%% 는 지움 (지운 줄을 바꾼 곳으로 알림). 이 문서 자체를 바꿀 때(keepCritic)는 교정 표기처럼 내 메모도 그대로
    const lines = (opts.keepCritic ? raw : stripNotes(raw)).split('\n');
    const out = [], changes = [], notes = [];
    const note = (ln, kind, text) => changes.push({ line: ln, kind, text: (text || '').trim().slice(0, 80) });
    if (!opts.keepCritic && raw.includes('%%')) raw.split('\n').forEach((l, k) => { if (l !== lines[k]) note(k + 1, 'hiddenNote', l); });
    let fn = 0, toc = null, exN = 0;
    const fp = opts.fnPrefix || 'm'; // 예시 결과를 넣을 때 바로 쓰는 각주 번호가 겹치지 않게

    // 인라인: 코드 · 수식 조각은 그대로 두고 나머지만 바꿈
    function inline(line, ln) {
      const cj = cjkLine(line);
      if (cj.state === 'fixed') { note(ln, 'cjkEmph', line); line = cj.text; }
      else if (cj.state === 'failed') note(ln, 'cjkEmphErr', line);
      const pieces = line.split(/(`+[^`]*`+|\$[^$\n]+\$)/);
      return pieces.map((p, k) => {
        if (k % 2) { if (p[0] === '$' && /\\ce\{/.test(p)) note(ln, 'chem', p); return p; }
        let s = p;
        s = s.replace(/!\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (m, file, hash, alias) => {
          file = file.trim().replace(/\\$/, ''); // 표 칸 안의 ![[그림.png\|300]]
          // 문서 넣기 ![[문서#제목]]: 펼치지 못한 것은 링크로 (다른 뷰어용으로 저장할 때는 화면에서 미리 펼쳐 넣음)
          if (!ASSET_LIKE.test(file)) {
            note(ln, 'embedDoc', m);
            const h = hash ? hash.slice(1).trim() : '';
            return `[${(alias || '').trim() || file + (h ? ' › ' + h : '')}](${dest((/\.(md|markdown)$/i.test(file) ? file : file + '.md') + (h ? '#' + ghSlug(h) : ''))})`;
          }
          const o = sizeOf(alias);
          if (MEDIA.test(file)) { note(ln, 'media', m); return `[${o.text || file}](${dest(file)})`; }
          if (o.w) { note(ln, 'imgSize', m); return imgTag(file, o.text || file, o); }
          note(ln, 'embed', m);
          return `![${o.text || file}](${dest(file)})`;
        });
        // ![설명|300](그림.png) · ![설명|300x200](그림.png) → <img width>
        s = s.replace(/!\[([^\]]*?)\s*\\?\|\s*(\d{1,5})(?:\s*[x×]\s*(\d{1,5}))?\s*\]\((<[^>]*>|[^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, alt, w, h, url, title) => {
          url = url.replace(/^<(.*)>$/, '$1');
          if (MEDIA.test(url)) return `![${alt}](${dest(url)})`;
          note(ln, 'imgSize', m);
          return imgTag(url, alt, { w: +w, h: +(h || 0) }, title);
        });
        s = s.replace(/\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g, (m, file, heading, alias) => {
          file = (file || '').trim().replace(/\\$/, ''); heading = (heading || '').trim().replace(/\\$/, ''); // 표 칸 안의 [[문서\|별명]]
          const text = (alias || '').trim() || [file, heading].filter(Boolean).join(' › ');
          const href = (file ? (/\.(md|markdown)$/i.test(file) ? file : file + '.md') : '') + (heading ? '#' + ghSlug(heading) : '');
          note(ln, 'wikilink', m);
          return `[${text}](${dest(href)})`;
        });
        s = s.replace(/\^\[([^\]]+)\]/g, (m, t) => { fn++; notes.push(`[^${fp}${fn}]: ${t}`); note(ln, 'footnote', m); return `[^${fp}${fn}]`; });
        s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) => {
          if (!MEDIA.test(url)) return m;
          note(ln, 'media', m);
          return `[${/\.(mp3|wav|aac|flac|m4a|oga|ogg)/i.test(url) ? '🔊' : '🎬'} ${alt || url}](${url})`;
        });
        // 교정 표기는 ==, ++, -- 보다 먼저 떼어 둠 ({++추가++} 가 {<ins>추가</ins>} 가 되지 않게)
        return s.split(CRITIC_LINE).map((part, k) => {
          if (k % 2) { note(ln, 'critic', part); return opts.keepCritic ? part : criticHtml(part); }
          let t = part;
          const pair = (re, tag, kind) => { t = t.replace(re, (m, pre, inner) => { note(ln, kind, m.slice(pre.length)); return `${pre}<${tag}>${inner}</${tag}>`; }); };
          pair(/(^|[^A-Za-z0-9=])==(?=[^\s=])(.+?)(?<=\S)==(?![A-Za-z0-9=])/g, 'mark', 'mark');
          pair(/(^|[^A-Za-z0-9+])\+\+(?=[^\s+])(.+?)(?<=\S)\+\+(?![A-Za-z0-9+])/g, 'ins', 'ins');
          pair(/(^|[^A-Za-z0-9-])--(?=[^\s-])(.+?)(?<=\S)--(?![A-Za-z0-9-])/g, 'del', 'del');
          return t;
        }).join('');
      }).join('');
    }

    let i = 0;
    // 맨 위 문서 정보(--- … ---)는 그대로 두되
    //  - 「뷰어: markcont」 줄은 뺌 (이 사본은 markcont 전용이 아니므로)
    //  - 닫는 --- 바로 다음 줄이 비어 있지 않으면 빈 줄을 넣음
    //    (빈 줄이 없으면 문서 정보가 끝나는 곳을 다음 구분선 --- 으로 잘못 읽어, 제목 · 첫 단락까지 문서 정보로 삼키는 뷰어가 있음)
    if (/^---\s*$/.test(lines[0] || '')) {
      let j = 1;
      while (j < lines.length && !/^(---|\.\.\.)\s*$/.test(lines[j])) j++;
      if (j < lines.length) {
        for (let k = 0; k <= j; k++) {
          if (k > 0 && k < j && /^\s*(뷰어|viewer)\s*:\s*.*markcont/i.test(lines[k])) { note(k + 1, 'fmViewer', lines[k]); continue; }
          out.push(lines[k]);
        }
        i = j + 1;
        if (i < lines.length && lines[i].trim()) { out.push(''); note(j + 1, 'fmGap', lines[j]); }
      }
    }
    while (i < lines.length) {
      const line = lines[i], ln = i + 1;
      // 문서 안 목차: 제목 링크 목록으로 펼침 (문단 중간에 붙은 줄은 markcont 에서도 목차가 아니므로 그대로)
      if (TOC_LINE.test(line) && (i === 0 || !lines[i - 1].trim() || /^\s{0,3}#{1,6}\s/.test(lines[i - 1]))) {
        toc = toc || tocLines(lines);
        out.push(...toc);
        note(ln, 'toc', line);
        i++;
        continue;
      }
      // ::: 블록 (탭 · 단계 · 파일 트리): 감싼 줄을 빼고, 탭 이름(== 이름)은 굵은 제목 줄로
      if (CONTAINER_OPEN.test(line)) { note(ln, 'container', line); i++; continue; }
      if (CONTAINER_CLOSE.test(line)) { i++; continue; }
      const tabHead = line.match(/^\s{0,3}==\s+(\S.*?)\s*$/);
      if (tabHead && inTabs(lines, i)) {
        if (out.length && out[out.length - 1].trim()) out.push('');
        out.push(`**${tabHead[1]}**`, '');
        i++;
        continue;
      }
      // 코드 블록
      const fm = line.match(/^(\s*)(`{3,}|~{3,})\s*([^`\s]*)\s*(.*)$/);
      if (fm) {
        const [, ind, mark, lang, rest] = fm;
        const closeRe = new RegExp('^\\s*' + (mark[0] === '`' ? '`' : '~') + '{' + mark.length + ',}\\s*$');
        let j = i + 1;
        while (j < lines.length && !closeRe.test(lines[j])) j++;
        const body = lines.slice(i + 1, j), close = j < lines.length ? lines[j] : null;
        const kind = window.MarkDiagram && MarkDiagram.kindOf(lang);
        if (kind === 'data') {
          try { out.push(...MarkDiagram.dataToTables(body.join('\n')).split('\n')); note(ln, 'dataTable', lang); }
          catch { out.push(line, ...body); if (close != null) out.push(close); note(ln, 'diagramErr', lang); }
          i = j + 1;
          continue;
        }
        if (kind === 'ui') {
          out.push(...body.map((b) => (/^\s*([-*+]|\d+[.)])\s/.test(b) || !b.trim() ? b : b.replace(/^(\s*)/, '$1- '))));
          note(ln, 'uiTree', lang);
          i = j + 1;
          continue;
        }
        if (kind) {
          try {
            const mm = MarkDiagram.toMermaid(kind, body.join('\n'), { ctx: opts.flowCtx }); // 흐름도 @자료 표는 저장 전에 펼쳐 둠
            out.push(ind + mark + 'mermaid', ...mm.split('\n'), ind + mark);
            note(ln, 'diagram', lang);
            i = j + 1;
            continue;
          } catch { note(ln, 'diagramErr', lang); }
        } else if (/^(markdown|md)$/i.test(lang) && /^(example|preview|예시)\b/i.test(rest)) {
          out.push(ind + mark + lang, ...body);
          if (close != null) out.push(close);
          // 다른 뷰어에는 「보이는 모습」 칸이 없으므로, 코드 바로 아래에 그 결과를 (같은 규칙으로 바꿔서) 넣음
          if (!ind && body.some((b) => b.trim())) {
            const inner = convert(body.join('\n'), { ...opts, fnPrefix: `x${++exN}m` }).text;
            out.push('', `<sub>${L('▼ 보이는 모습', '▼ Result')}</sub>`, '', ...inner.split('\n'), '');
          }
          note(ln, 'example', line);
          i = j + 1;
          continue;
        }
        out.push(line, ...body);
        if (close != null) out.push(close);
        i = j + 1;
        continue;
      }
      // 수식 블록 $$ … $$
      if (/^\s*\$\$/.test(line)) {
        let j = i;
        if (!/\$\$\s*$/.test(line.trim().slice(2)) || line.trim() === '$$') { j = i + 1; while (j < lines.length && !/\$\$\s*$/.test(lines[j])) j++; }
        const block = lines.slice(i, Math.min(j, lines.length - 1) + 1);
        if (/\\ce\{/.test(block.join('\n'))) note(ln, 'chem', '\\ce{…}');
        out.push(...block);
        i = Math.min(j, lines.length - 1) + 1;
        continue;
      }
      // 알림 상자
      const cm = line.match(/^(\s*>\s?)\[!(\w+)\]([+-]?)[ \t]*(.*)$/);
      if (cm) {
        const [, pre, rawType, fold, title] = cm;
        const type = rawType.toLowerCase();
        let j = i + 1;
        while (j < lines.length && /^\s*>/.test(lines[j])) j++;
        const body = lines.slice(i + 1, j);
        const names = NAME();
        if (fold) {
          out.push(`<details${fold === '+' ? ' open' : ''}><summary>${title || names[type] || rawType}</summary>`, '');
          for (const [k, b] of body.entries()) out.push(inline(b.replace(/^\s*>\s?/, ''), i + 2 + k));
          out.push('', '</details>');
          note(ln, 'calloutFold', line);
        } else {
          const target = STD[type] ? rawType.toUpperCase() : (MAP[type] || 'NOTE');
          out.push(`${pre}[!${target}]`);
          const t = title || (STD[type] ? '' : names[type] || rawType);
          if (t) out.push(`${pre}**${t}**`);
          if (!STD[type]) note(ln, 'callout', line); else if (title) note(ln, 'calloutTitle', line);
          for (const [k, b] of body.entries()) out.push(inline(b, i + 2 + k));
        }
        i = j;
        continue;
      }
      // 정의 목록:  용어 / : 설명
      const dm = line.match(/^:\s+(.*)$/);
      if (dm && out.length && i > 0 && lines[i - 1].trim() && !/^\s*([#>|`*+-]|\d+\.)/.test(lines[i - 1]) && !/^:\s/.test(lines[i - 1])) {
        out[out.length - 1] = `**${out[out.length - 1].trim()}**  `;
        let j = i;
        const descs = [];
        while (j < lines.length && /^:\s+/.test(lines[j])) { descs.push(inline(lines[j].replace(/^:\s+/, ''), j + 1)); j++; }
        descs.forEach((d, k) => out.push(d + (k < descs.length - 1 ? '  ' : '')));
        note(ln, 'deflist', lines[i - 1]);
        i = j;
        continue;
      }
      // 표 구분 줄 |:--|--:| 은 그대로 (-- 가 제거 표시로 읽히지 않게)
      if (line.includes('|') && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line)) { out.push(line); i++; continue; }
      out.push(inline(line, ln));
      i++;
    }
    if (notes.length) out.push('', ...notes);
    changes.sort((a, b) => a.line - b.line);
    return { text: out.join('\n'), changes };
  }

  window.MarkPortable = {
    convert,
    stripNotes,
    describe(kind) { return (KINDS[kind] || (() => [kind, '']))(); },
    // 바꿀 수 없어 경고만 하는 종류
    warnOnly: (kind) => kind === 'chem' || kind === 'diagramErr' || kind === 'cjkEmphErr' || kind === 'critic',
  };
})();
