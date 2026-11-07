// markcont 붙여 넣기: 서식 있는 글(HTML)을 마크다운으로
// 웹 페이지 · 노션 · 구글 문서 · 워드 · 엑셀 · 구글 시트에서 복사한 글의 제목 · 목록 · 링크 · 표 · 굵게 · 코드를 살립니다.
// window.MarkPaste.fromHtml(html, plain) → 마크다운 (바꿀 서식이 없으면 null: 그때는 글자 그대로 붙여 넣음)
(function () {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE', 'META', 'LINK', 'SVG', 'CANVAS', 'IFRAME', 'OBJECT',
    'EMBED', 'BUTTON', 'SELECT', 'TEXTAREA', 'COLGROUP', 'COL', 'AUDIO', 'VIDEO', 'MAP', 'AREA', 'DIALOG']);
  const BLOCK = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BODY', 'CENTER', 'DD', 'DETAILS', 'DIV', 'DL', 'DT', 'FIELDSET',
    'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'HTML', 'LI', 'MAIN', 'NAV', 'OL', 'P',
    'PRE', 'SECTION', 'SUMMARY', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL', 'CAPTION']);
  const BR = ''; // <br> 자리 (문단을 만들 때 줄바꿈으로 바꿈)

  const style = (el) => (el.getAttribute('style') || '').toLowerCase();
  const boldStyle = (s) => /font-weight\s*:\s*(bold|bolder|[6-9]00)\b/.test(s);
  const normalWeight = (s) => /font-weight\s*:\s*(normal|lighter|[1-5]00)\b/.test(s);
  const italicStyle = (s) => /font-style\s*:\s*(italic|oblique)/.test(s);
  const strikeStyle = (s) => /text-decoration[^;]*line-through/.test(s);
  const isWord = (c) => !!c && /[\p{L}\p{N}]/u.test(c);

  // 글 안의 마크다운 기호가 서식으로 읽히지 않게
  function escText(s) {
    s = s.replace(/\\(?=[!-/:-@[-`{-~])/g, '\\\\');
    s = s.replace(/_/g, (m, i) => (isWord(s[i - 1]) && isWord(s[i + 1]) ? '_' : '\\_')); // snake_case 는 그대로
    s = s.replace(/[*`]/g, '\\$&')
      .replace(/~~/g, '\\~\\~')
      .replace(/==/g, '\\=\\=')
      .replace(/\[\[|\]\]|\](?=\()/g, (m) => m.replace(/[[\]]/g, '\\$&'))
      .replace(/<(?=[A-Za-z/!?])/g, '\\<')
      .replace(/&(?=#?\w+;)/g, '&amp;');
    if ((s.match(/\$/g) || []).length >= 2) s = s.replace(/\$/g, '\\$'); // $…$ 가 수식으로 읽히지 않게
    return s;
  }
  // 줄 맨 앞의 # > - + 1. 이 제목 · 인용 · 목록으로 읽히지 않게
  function escLineStart(line) {
    return line
      .replace(/^(#{1,6})(?=\s|$)/, '\\$1')
      .replace(/^>/, '\\>')
      .replace(/^([-+])(?=\s|$)/, '\\$1')
      .replace(/^(\d{1,9})([.)])(?=\s|$)/, '$1\\$2')
      .replace(/^(=+|-+)$/, '\\$1');
  }
  const collapse = (s) => s.replace(/[\t\n\r\f ]+/g, ' ').replace(/ /g, ' ');

  function wrap(inner, mark, close = mark) {
    const m = inner.match(/^([\s]*)([\s\S]*?)([\s]*)$/);
    if (!m[2]) return inner;
    return m[1] + mark + m[2] + close + m[3];
  }
  function codeSpan(text) {
    text = text.replace(/[\r\n]+/g, ' ').replace(/ /g, ' ');
    if (!text.trim()) return text;
    let n = 1;
    while (text.includes('`'.repeat(n))) n++;
    const f = '`'.repeat(n), pad = /^`|`$/.test(text) ? ' ' : '';
    return f + pad + text + pad + f;
  }
  const URL_ESC = { ' ': '%20', '(': '%28', ')': '%29', '<': '%3C', '>': '%3E' };
  const urlOf = (u) => u.trim().replace(/[ ()<>]/g, (c) => URL_ESC[c]);

  // ---------- 글줄 안 (inline) ----------
  function inline(node, ctx) {
    let out = '';
    for (const c of node.childNodes) out += inlineNode(c, ctx);
    return out;
  }
  function inlineNode(n, ctx) {
    if (n.nodeType === 3) return ctx.code ? n.nodeValue : escText(collapse(n.nodeValue));
    if (n.nodeType !== 1) return '';
    const tag = n.tagName, s = style(n);
    if (SKIP.has(tag) || n.getAttribute('aria-hidden') === 'true') return '';
    if (tag === 'BR') return ctx.code ? '\n' : BR;
    if (tag === 'IMG') return image(n);
    if (tag === 'INPUT') return '';
    if (n.classList && n.classList.contains('katex')) return math(n);
    if (tag === 'A') return link(n, ctx);
    if (tag === 'CODE' || tag === 'SAMP' || tag === 'TT') return ctx.code ? n.textContent : codeSpan(n.textContent);
    if (tag === 'KBD') return '<kbd>' + escText(collapse(n.textContent)).trim() + '</kbd>';
    if (tag === 'SUP' || tag === 'SUB') { const t = inline(n, ctx).trim(); return t ? `<${tag.toLowerCase()}>${t}</${tag.toLowerCase()}>` : ''; }
    let inner;
    const bold = !ctx.bold && !ctx.heading && (((tag === 'B' || tag === 'STRONG') && !normalWeight(s)) || boldStyle(s));
    const italic = !ctx.italic && ((tag === 'I' || tag === 'EM') || italicStyle(s));
    const strike = !ctx.strike && (tag === 'DEL' || tag === 'S' || tag === 'STRIKE' || strikeStyle(s));
    const mark = !ctx.mark && tag === 'MARK';
    const sub = { ...ctx, bold: ctx.bold || bold, italic: ctx.italic || italic, strike: ctx.strike || strike, mark: ctx.mark || mark };
    if (BLOCK.has(tag)) {
      // 글줄 안에 들어온 블록(링크 안의 div 등): 앞뒤를 띄어서 이어 붙임
      inner = ' ' + blocks(n, { ...sub, cell: true }).join(' ') + ' ';
    } else inner = inline(n, sub);
    if (mark) inner = wrap(inner, '==');
    if (strike) inner = wrap(inner, '~~');
    if (italic) inner = wrap(inner, '*');
    if (bold) inner = wrap(inner, '**');
    return inner;
  }
  function image(n) {
    const src = (n.getAttribute('src') || '').trim();
    if (!src || /^(data|blob|cid|file):/i.test(src)) return ''; // 클립보드 안의 그림 데이터는 넣지 않음
    const alt = collapse(n.getAttribute('alt') || '').trim().replace(/[[\]]/g, '\\$&');
    return `![${alt}](${urlOf(src)})`;
  }
  function link(n, ctx) {
    const href = (n.getAttribute('href') || '').trim();
    const text = inline(n, { ...ctx, link: true });
    if (ctx.link || !href || /^(javascript|vbscript|data):/i.test(href) || href.startsWith('#')) return text;
    const m = text.match(/^([\s]*)([\s\S]*?)([\s]*)$/);
    if (!m[2]) return text;
    let label = m[2];
    if (label.replace(/\\(.)/g, '$1') === href && /^https?:\/\//i.test(href)) return m[1] + urlOf(href) + m[3];
    label = label.replace(/[[\]]/g, (c, i, s) => (s[i - 1] === '\\' ? c : '\\' + c));
    return `${m[1]}[${label}](${urlOf(href)})${m[3]}`;
  }
  // KaTeX 로 그린 수식 → $…$ (원래 TeX 는 annotation 에, markcont 에서 복사한 것은 data-tex 에 들어 있음)
  function math(n) {
    const ann = n.querySelector('annotation[encoding="application/x-tex"]');
    const tex = n.getAttribute('data-tex') || (ann && ann.textContent);
    if (!tex) {
      const vis = n.querySelector('.katex-html');
      return escText(collapse((vis || n).textContent));
    }
    const display = !!n.closest('.katex-display');
    return display ? `$$${tex.trim()}$$` : `$${tex.trim()}$`;
  }

  // ---------- 블록 ----------
  // 글줄을 문단으로: <br> 한 번은 줄바꿈(\), 두 번 이상은 문단 나눔
  function paragraphs(raw, ctx) {
    const lines = raw.split(BR).map((l) => l.replace(/ {2,}/g, ' ').trim());
    const parts = [];
    let cur = [];
    for (const l of lines) {
      if (l) cur.push(l);
      else if (cur.length) { parts.push(cur); cur = []; }
    }
    if (cur.length) parts.push(cur);
    return parts.map((ls) => (ctx.cell ? ls.join('<br>') : ls.map(escLineStart).join('\\\n')));
  }
  function blocks(node, ctx = {}) {
    const out = [];
    let buf = '';
    const flush = () => { if (buf.replace(new RegExp(BR, 'g'), '').trim()) out.push(...paragraphs(buf, ctx)); buf = ''; };
    const kids = [...node.childNodes];
    for (let i = 0; i < kids.length; i++) {
      const c = kids[i];
      if (c.nodeType === 1 && wordListItem(c)) { // 워드의 목록 문단을 모아 목록으로 (목록 번호 l0 · l1 이 바뀌면 다른 목록)
        flush();
        const items = [], id = wordListId(c);
        for (; i < kids.length; i++) {
          const k = kids[i];
          if (k.nodeType === 3 && !k.nodeValue.trim()) continue;
          if (k.nodeType !== 1 || !wordListItem(k) || wordListId(k) !== id) break;
          items.push(k);
        }
        i--;
        out.push(wordList(items, ctx));
        continue;
      }
      // 블록을 품은 글줄 요소(구글 문서가 전체를 감싸는 <b style="font-weight:normal"> 등)는 속을 블록으로
      if (c.nodeType === 1 && !BLOCK.has(c.tagName) && !SKIP.has(c.tagName) && c.tagName !== 'A' && hasBlock(c)) { flush(); out.push(...blocks(c, ctx)); continue; }
      if (c.nodeType !== 1 || !BLOCK.has(c.tagName) || SKIP.has(c.tagName)) { buf += inlineNode(c, ctx); continue; }
      flush();
      const b = block(c, ctx);
      if (Array.isArray(b)) out.push(...b); else if (b) out.push(b);
    }
    flush();
    return out.filter((b) => b && b.trim());
  }
  const hasBlock = (el) => [...el.children].some((k) => !SKIP.has(k.tagName) && (BLOCK.has(k.tagName) || (k.tagName !== 'A' && hasBlock(k))));
  function block(el, ctx) {
    const tag = el.tagName;
    // 알림 상자: GitHub(markdown-alert) · markcont(data-callout) → > [!NOTE]
    const alertType = el.getAttribute('data-callout') || ((typeof el.className === 'string' && el.className.match(/(?:^|\s)markdown-alert-(\w+)/)) || [])[1];
    if (alertType && !ctx.cell) {
      const titleEl = el.querySelector(':scope > .callout-title, :scope > .markdown-alert-title');
      const title = el.getAttribute('data-title') && titleEl ? inline(titleEl, ctx).replace(new RegExp(BR, 'g'), ' ').trim() : '';
      if (titleEl) titleEl.remove();
      const fold = tag === 'DETAILS' ? (el.hasAttribute('open') ? '+' : '-') : '';
      const inner = blocks(el.querySelector(':scope > .callout-body') || el, ctx).join('\n\n');
      return (`[!${alertType.toUpperCase()}]${fold}${title ? ' ' + title : ''}` + (inner ? '\n' + inner : '')).split('\n').map((l) => (l ? '> ' + l : '>')).join('\n');
    }
    if (/^H[1-6]$/.test(tag)) {
      const t = inline(el, { ...ctx, heading: true }).split(BR).join(' ').replace(/\s+/g, ' ').trim().replace(/#+$/, '\\$&');
      if (!t) return '';
      return ctx.cell ? `**${t}**` : '#'.repeat(+tag[1]) + ' ' + t;
    }
    if (tag === 'P' || tag === 'DIV' || tag === 'SECTION' || tag === 'ARTICLE' || tag === 'MAIN' || tag === 'HEADER' || tag === 'FOOTER' ||
      tag === 'NAV' || tag === 'ASIDE' || tag === 'CENTER' || tag === 'FIGURE' || tag === 'FIGCAPTION' || tag === 'ADDRESS' || tag === 'FORM' ||
      tag === 'FIELDSET' || tag === 'DETAILS' || tag === 'BODY' || tag === 'HTML' || tag === 'CAPTION') return blocks(el, ctx);
    if (tag === 'SUMMARY') { const t = inline(el, ctx).trim(); return t ? (ctx.bold ? t : `**${t}**`) : ''; }
    if (tag === 'HR') return ctx.cell ? '' : '---';
    if (tag === 'PRE') return ctx.cell ? codeSpan(preText(el)) : pre(el);
    if (tag === 'BLOCKQUOTE') {
      const inner = blocks(el, ctx);
      if (ctx.cell) return inner;
      return inner.join('\n\n').split('\n').map((l) => (l ? '> ' + l : '>')).join('\n');
    }
    if (tag === 'UL' || tag === 'OL') return ctx.cell ? listInCell(el, ctx) : list(el, tag === 'OL', ctx);
    if (tag === 'LI') return list({ children: [el], getAttribute: () => null }, false, ctx);
    if (tag === 'TABLE') return table(el, ctx);
    if (tag === 'DL') return defList(el, ctx);
    return blocks(el, ctx); // DT · DD · TR · TD 처럼 홀로 나온 것
  }
  function preText(node) {
    let s = '';
    for (const c of node.childNodes) {
      if (c.nodeType === 3) s += c.nodeValue;
      else if (c.nodeType === 1 && !SKIP.has(c.tagName)) {
        if (c.tagName === 'BR') { s += '\n'; continue; }
        const line = /^(DIV|P|LI|TR)$/.test(c.tagName);
        if (line && s && !s.endsWith('\n')) s += '\n';
        s += preText(c);
        if (line && !s.endsWith('\n')) s += '\n';
      }
    }
    return s.replace(/ /g, ' ');
  }
  function pre(el) {
    const code = el.querySelector('code') || el;
    const cls = [code.className, el.className, el.parentElement && el.parentElement.className].filter((x) => typeof x === 'string').join(' ');
    const lang = (cls.match(/(?:^|\s)(?:lang(?:uage)?-|highlight-source-|brush:\s*)([\w+#.-]+)/i) || [])[1] || el.getAttribute('data-lang') || code.getAttribute('data-lang') || '';
    const text = preText(el).replace(/\n+$/, '');
    let n = 3;
    for (const m of text.matchAll(/`{3,}/g)) n = Math.max(n, m[0].length + 1);
    const f = '`'.repeat(n);
    return f + lang.toLowerCase() + '\n' + text + '\n' + f;
  }
  const LIST_START = /^([-*+]|\d{1,9}[.)])\s/;
  function list(el, ordered, ctx) {
    let n = ordered ? parseInt(el.getAttribute('start') || '1', 10) || 1 : 0;
    const items = [];
    for (const li of el.children) {
      if (li.tagName === 'UL' || li.tagName === 'OL') { // <ul><li>…</li><ul>…</ul></ul> 처럼 잘못 들어온 안쪽 목록
        if (items.length) items[items.length - 1].body.push(list(li, li.tagName === 'OL', ctx));
        continue;
      }
      if (li.tagName !== 'LI') continue;
      let task = '';
      const cb = li.querySelector('input[type=checkbox]');
      if (cb && !cb.closest('li ul, li ol')) task = cb.checked || cb.hasAttribute('checked') ? '[x] ' : '[ ] ';
      items.push({ marker: ordered ? `${n++}. ` : '- ', task, body: blocks(li, ctx) });
    }
    const loose = items.some((it) => it.body.filter((b) => !LIST_START.test(b)).length > 1);
    return items.map((it) => {
      const body = it.body.reduce((acc, b) => (acc ? acc + (LIST_START.test(b) && !loose ? '\n' : '\n\n') + b : b), '');
      const pad = ' '.repeat(it.marker.length);
      const lines = (body || '').split('\n');
      return it.marker + it.task + lines[0] + lines.slice(1).map((l) => '\n' + (l ? pad + l : '')).join('');
    }).join(loose ? '\n\n' : '\n');
  }
  function listInCell(el, ctx) {
    return [...el.children].filter((li) => li.tagName === 'LI').map((li) => '• ' + blocks(li, ctx).join(' ')).join('<br>');
  }
  function defList(el, ctx) {
    const out = [];
    for (const c of el.children) {
      const t = blocks(c, { ...ctx, cell: true }).join(' ').trim();
      if (!t) continue;
      if (c.tagName === 'DT') out.push((out.length ? '\n' : '') + t);
      else if (c.tagName === 'DD') out.push(': ' + t);
    }
    return out.join('\n');
  }
  // 표: 첫 줄을 머리줄로 (GFM 표). 칸이 하나뿐인 표는 겉모양용으로 보고 안의 글만
  function table(el, ctx) {
    const rows = [...el.rows].filter((tr) => tr.closest('table') === el);
    const grid = rows.map((tr) => {
      const cells = [];
      for (const td of tr.cells) {
        const t = blocks(td, { ...ctx, cell: true }).join('<br>').replace(/\n/g, '<br>').replace(/\|/g, (c, i, s) => (s[i - 1] === '\\' ? c : '\\|')).trim();
        cells.push({ t, el: td });
        for (let k = 1; k < Math.min(+td.colSpan || 1, 30); k++) cells.push({ t: '', el: td });
      }
      return cells;
    }).filter((r) => r.length);
    if (!grid.length) return '';
    const cols = Math.max(...grid.map((r) => r.length));
    if (cols === 1 && grid.length === 1) return blocks(rows[0].cells[0], ctx);
    if (ctx.cell) return grid.map((r) => r.map((c) => c.t).join(' · ')).join('<br>');
    const align = (c) => {
      const a = ((c && (c.el.getAttribute('align') || (style(c.el).match(/text-align\s*:\s*(\w+)/) || [])[1])) || '').toLowerCase();
      return a === 'center' ? ':---:' : a === 'right' ? '---:' : '---';
    };
    const line = (r) => '| ' + Array.from({ length: cols }, (_, i) => (r[i] && r[i].t) || ' ').join(' | ') + ' |';
    return [line(grid[0]), '| ' + Array.from({ length: cols }, (_, i) => align(grid[0][i])).join(' | ') + ' |', ...grid.slice(1).map(line)].join('\n');
  }
  // 워드: 목록이 <p style="mso-list:l0 level1 lfo1"> 문단으로 옴 (글머리 기호는 mso-list:Ignore 칸 안)
  const wordListItem = (el) => el.tagName === 'P' && /mso-list\s*:\s*l\d+\s+level\d+/i.test(el.getAttribute('style') || '');
  const wordListId = (el) => (style(el).match(/mso-list\s*:\s*(l\d+)/) || [])[1];
  function wordList(ps, ctx) {
    const counters = [], lines = [], widths = [];
    for (const p of ps) {
      const level = Math.max(1, +((style(p).match(/level(\d+)/) || [])[1] || 1));
      const ign = [...p.querySelectorAll('span')].find((s) => /mso-list\s*:\s*ignore/i.test(s.getAttribute('style') || ''));
      const bullet = ign ? collapse(ign.textContent).trim() : '';
      if (ign) ign.remove();
      const ordered = /^(\d+|[a-z]|[ivx]+)[.)]$/i.test(bullet);
      counters.length = level;
      counters[level - 1] = (counters[level - 1] || 0) + 1;
      const num = /^\d+/.test(bullet) ? parseInt(bullet, 10) : counters[level - 1];
      const marker = ordered ? `${num}. ` : '- ';
      widths.length = level - 1;
      const indent = widths.reduce((s, w) => s + w, 0);
      widths[level - 1] = marker.length;
      const text = paragraphs(inline(p, ctx), ctx).join(' ');
      lines.push(' '.repeat(indent) + marker + text);
    }
    return lines.join('\n');
  }

  // 붙여 넣을 만한 서식이 있는지 (없으면 글자 그대로가 더 정확함: 코드 편집기 · 메모장 등)
  function rich(body, plain) {
    if (body.querySelector('h1,h2,h3,h4,h5,h6,ul,ol,table,a[href],blockquote,img,hr,dl,del,s,strike,mark,.katex')) return true;
    if (body.querySelector('pre') && /\n/.test(plain.trim())) return true;
    if ([...body.querySelectorAll('code')].some((c) => !c.closest('pre'))) return true;
    for (const el of body.querySelectorAll('b,strong,i,em,span,font,p')) {
      const s = style(el);
      if (wordListItem(el)) return true;
      if ((el.tagName === 'B' || el.tagName === 'STRONG') && !normalWeight(s) && el.textContent.trim()) return true;
      if ((el.tagName === 'I' || el.tagName === 'EM') && el.textContent.trim()) return true;
      if ((boldStyle(s) || italicStyle(s) || strikeStyle(s)) && el.textContent.trim()) return true;
    }
    return body.querySelectorAll('p').length >= 2;
  }

  function fromHtml(html, plain = '') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.body;
    if (!body) return null;
    // 화면용 덧붙임 빼기 (markcont 미리보기의 제목 단추 · 코드 머리줄 등)
    body.querySelectorAll('.h-tools, .code-head, .code-copy, .dg-expand, [hidden]').forEach((n) => n.remove());
    // 코드 편집기에서 복사한 글(고정폭 글꼴 + white-space: pre)은 글자 그대로
    const first = body.firstElementChild;
    if (first && /white-space\s*:\s*pre/.test(style(first)) && /(mono|consol|courier|menlo)/.test(style(first))) return null;
    if (!rich(body, plain)) return null;
    const md = blocks(body).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    return md || null;
  }

  const api = { fromHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.MarkPaste = api;
})();
