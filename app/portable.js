// markcont 전용 문법을 다른 뷰어(GitHub · VS Code · Obsidian 등)에서도 통하는 표준 마크다운으로 바꿉니다.
// - convert(src): 바꾼 글과 바꾼 곳 목록
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
    footnote: () => [L('바로 쓰는 각주 ^[설명]', 'Inline footnote ^[text]'), L('표준 각주로', 'to a standard footnote')],
    deflist: () => [L('정의 목록', 'Definition list'), L('굵은 용어 + 설명으로', 'to bold term + text')],
    media: () => [L('동영상 · 소리', 'Video · audio'), L('링크로', 'to a link')],
    diagram: () => [L('markcont 다이어그램', 'markcont diagram'), L('Mermaid 로', 'to Mermaid')],
    example: () => [L('쓰는 법 · 결과 나란히 블록', 'Side-by-side example block'), L('일반 코드 블록으로', 'to a plain code block')],
    chem: () => [L('화학식 \\ce{}', 'Chemistry \\ce{}'), L('바꾸지 않음 (GitHub 수식은 \\ce 를 모름)', 'not converted (GitHub math has no \\ce)')],
    diagramErr: () => [L('다이어그램 (틀린 곳 있음)', 'Diagram (has errors)'), L('바꾸지 않음', 'not converted')],
    uiTree: () => [L('노출 위치 블록', 'Exposure block'), L('일반 들여 쓴 목록으로', 'to a normal indented list')],
    dataTable: () => [L('데이터 정의 블록', 'Data definition block'), L('데이터마다 일반 표로', 'to a normal table per data')],
  };
  const STD = { note: 1, tip: 1, important: 1, warning: 1, caution: 1 };
  const MAP = { info: 'NOTE', todo: 'NOTE', example: 'NOTE', question: 'NOTE', faq: 'NOTE', danger: 'CAUTION' };
  const NAME = () => ({ note: L('참고', 'Note'), info: L('정보', 'Info'), todo: L('할 일', 'To do'), tip: L('팁', 'Tip'), important: L('중요', 'Important'),
    example: L('예시', 'Example'), warning: L('주의', 'Warning'), question: L('질문', 'Question'), faq: 'FAQ', caution: L('경고', 'Caution'), danger: L('위험', 'Danger') });
  const MEDIA = /\.(mp4|webm|ogv|mov|mp3|wav|aac|flac|m4a|oga|ogg)(?=$|[?#])/i;
  const ghSlug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
  const dest = (u) => (/[\s()<>]/.test(u) ? `<${u}>` : u);

  function convert(src) {
    const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    const out = [], changes = [], notes = [];
    const note = (ln, kind, text) => changes.push({ line: ln, kind, text: (text || '').trim().slice(0, 80) });
    let fn = 0;

    // 인라인: 코드 · 수식 조각은 그대로 두고 나머지만 바꿈
    function inline(line, ln) {
      const pieces = line.split(/(`+[^`]*`+|\$[^$\n]+\$)/);
      return pieces.map((p, k) => {
        if (k % 2) { if (p[0] === '$' && /\\ce\{/.test(p)) note(ln, 'chem', p); return p; }
        let s = p;
        s = s.replace(/!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (m, file, alias) => {
          file = file.trim();
          note(ln, MEDIA.test(file) ? 'media' : 'embed', m);
          return MEDIA.test(file) ? `[${alias || file}](${dest(file)})` : `![${alias || file}](${dest(file)})`;
        });
        s = s.replace(/\[\[([^\]|#]*)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g, (m, file, heading, alias) => {
          file = (file || '').trim(); heading = (heading || '').trim();
          const text = (alias || '').trim() || [file, heading].filter(Boolean).join(' › ');
          const href = (file ? (/\.(md|markdown)$/i.test(file) ? file : file + '.md') : '') + (heading ? '#' + ghSlug(heading) : '');
          note(ln, 'wikilink', m);
          return `[${text}](${dest(href)})`;
        });
        s = s.replace(/\^\[([^\]]+)\]/g, (m, t) => { fn++; notes.push(`[^m${fn}]: ${t}`); note(ln, 'footnote', m); return `[^m${fn}]`; });
        s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) => {
          if (!MEDIA.test(url)) return m;
          note(ln, 'media', m);
          return `[${/\.(mp3|wav|aac|flac|m4a|oga|ogg)/i.test(url) ? '🔊' : '🎬'} ${alt || url}](${url})`;
        });
        const pair = (re, tag, kind) => { s = s.replace(re, (m, pre, inner) => { note(ln, kind, m.slice(pre.length)); return `${pre}<${tag}>${inner}</${tag}>`; }); };
        pair(/(^|[^A-Za-z0-9=])==(?=[^\s=])(.+?)(?<=\S)==(?![A-Za-z0-9=])/g, 'mark', 'mark');
        pair(/(^|[^A-Za-z0-9+])\+\+(?=[^\s+])(.+?)(?<=\S)\+\+(?![A-Za-z0-9+])/g, 'ins', 'ins');
        pair(/(^|[^A-Za-z0-9-])--(?=[^\s-])(.+?)(?<=\S)--(?![A-Za-z0-9-])/g, 'del', 'del');
        return s;
      }).join('');
    }

    let i = 0;
    // 맨 위 문서 정보(--- … ---)는 그대로
    if (/^---\s*$/.test(lines[0] || '')) {
      let j = 1;
      while (j < lines.length && !/^(---|\.\.\.)\s*$/.test(lines[j])) j++;
      if (j < lines.length) { out.push(...lines.slice(0, j + 1)); i = j + 1; }
    }
    while (i < lines.length) {
      const line = lines[i], ln = i + 1;
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
            const mm = MarkDiagram.toMermaid(kind, body.join('\n'));
            out.push(ind + mark + 'mermaid', ...mm.split('\n'), ind + mark);
            note(ln, 'diagram', lang);
            i = j + 1;
            continue;
          } catch { note(ln, 'diagramErr', lang); }
        } else if (/^(markdown|md)$/i.test(lang) && /^(example|preview|예시)\b/i.test(rest)) {
          out.push(ind + mark + lang, ...body);
          if (close != null) out.push(close);
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
      out.push(inline(line, ln));
      i++;
    }
    if (notes.length) out.push('', ...notes);
    changes.sort((a, b) => a.line - b.line);
    return { text: out.join('\n'), changes };
  }

  window.MarkPortable = {
    convert,
    describe(kind) { return (KINDS[kind] || (() => [kind, '']))(); },
    // 바꿀 수 없어 경고만 하는 종류
    warnOnly: (kind) => kind === 'chem' || kind === 'diagramErr',
  };
})();
