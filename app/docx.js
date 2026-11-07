// markcont Word(.docx) 저장: 그려진 문서(DOM)를 WordprocessingML 로 옮겨 zip(저장만, 압축 없음)으로 묶습니다. 라이브러리 없이.
// - 제목 · 문단 · 굵게 · 기울임 · 취소선 · 형광펜 · 코드 · 링크 · 목록(번호 · 글머리 · 할 일) · 표 · 인용 · 알림 상자 · 코드 블록 · 구분선 · 그림
// - 다이어그램(SVG) · SVG · WebP 그림은 PNG 로 바꿔 넣고, 수식은 TeX 글자로 넣습니다.
// - 종이 크기는 브라우저 지역을 따릅니다 (미국 · 캐나다 등은 Letter, 그 밖은 A4). 바닥글에 쪽 번호.
// window.MarkDocx.build(root, { title, lang }) → Promise<Blob>
(function () {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, ''); // XML 에 못 넣는 글자

  // ---------- zip (저장만) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    const u16 = (v) => [v & 0xff, (v >>> 8) & 0xff], u32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
    for (const f of files) {
      const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      const head = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
      parts.push(head, name, data);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
      offset += head.length + name.length + data.length;
    }
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
    return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  // ---------- 그림: PNG · JPEG · GIF 는 그대로, 나머지(SVG · WebP …)는 PNG 로 ----------
  async function blobToBytes(b) { return new Uint8Array(await b.arrayBuffer()); }
  function loadImage(url) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
  }
  async function toPng(url, w, h) {
    const im = await loadImage(url);
    const scale = 2, cw = Math.max(1, Math.round((w || im.naturalWidth || 300) * scale)), ch = Math.max(1, Math.round((h || im.naturalHeight || 150) * scale));
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cw, ch);
    g.drawImage(im, 0, 0, cw, ch);
    return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
  }
  // SVG 요소 → PNG (화면 CSS 로 칠한 색 · 글꼴을 요소마다 직접 넣은 뒤)
  async function svgToPng(svg) {
    const box = svg.getBoundingClientRect();
    const w = Math.round(box.width || +svg.getAttribute('width') || 600), h = Math.round(box.height || +svg.getAttribute('height') || 300);
    const copy = svg.cloneNode(true);
    const src = [svg, ...svg.querySelectorAll('*')], dst = [copy, ...copy.querySelectorAll('*')];
    const props = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'color', 'text-anchor', 'dominant-baseline', 'visibility', 'display'];
    const win = svg.ownerDocument.defaultView || window; // 숨은 밝은 틀(iframe) 안의 SVG 면 그 틀의 스타일로
    src.forEach((el, i) => {
      const cs = win.getComputedStyle(el), st = dst[i].style;
      for (const p of props) { const v = cs.getPropertyValue(p); if (v) st.setProperty(p, v); }
    });
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', w);
    copy.setAttribute('height', h);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copy));
    return { blob: await toPng(url, w, h), w, h };
  }

  // ---------- 문서 ----------
  async function build(root, opts = {}) {
    const rels = [], media = [], nums = [];
    let relId = 10, picId = 1;
    const link = (url) => { const id = 'rId' + relId++; rels.push(`<Relationship Id="${id}" Type="${R}/hyperlink" Target="${esc(url)}" TargetMode="External"/>`); return id; };
    const letter = /^(en-(US|CA)|es-(MX|US)|fr-CA)$/i.test(opts.lang || navigator.language || '');
    const page = letter ? { w: 12240, h: 15840 } : { w: 11906, h: 16838 }, margin = 1300;
    const maxEmu = (page.w - margin * 2) * 635; // 1 twip = 635 EMU
    const pgXml = `<w:pgSz w:w="${page.w}" w:h="${page.h}"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="708" w:footer="708" w:gutter="0"/>`;
    const hasCover = !!root.querySelector('.print-cover');

    async function picture(blob, pxW, pxH) {
      let bytes, ext;
      if (/png/.test(blob.type)) ext = 'png';
      else if (/jpe?g/.test(blob.type)) ext = 'jpeg';
      else if (/gif/.test(blob.type)) ext = 'gif';
      else { blob = await toPng(URL.createObjectURL(blob), pxW, pxH); ext = 'png'; }
      bytes = await blobToBytes(blob);
      const id = 'rId' + relId++, n = picId++, file = `image${n}.${ext}`;
      media.push({ name: 'word/media/' + file, data: bytes });
      rels.push(`<Relationship Id="${id}" Type="${R}/image" Target="media/${file}"/>`);
      let cx = Math.round((pxW || 300) * 9525), cy = Math.round((pxH || 200) * 9525);
      if (cx > maxEmu) { cy = Math.round(cy * maxEmu / cx); cx = maxEmu; }
      return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Picture ${n}"/>` +
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${file}"/><pic:cNvPicPr/></pic:nvPicPr>` +
        `<pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    }
    async function imgRun(img) {
      try {
        const src = img.currentSrc || img.src;
        if (!src) return '';
        const blob = await (await fetch(src)).blob();
        const r = img.getBoundingClientRect();
        const w = +img.getAttribute('width') || Math.round(r.width) || img.naturalWidth, h = img.getAttribute('width') && img.naturalWidth ? Math.round(w * img.naturalHeight / img.naturalWidth) : Math.round(r.height) || img.naturalHeight;
        return await picture(blob, w, h);
      } catch { return run(img.alt ? `[${img.alt}]` : '', {}); }
    }
    // 글줄 꾸밈 → w:rPr (순서: rStyle, rFonts, b, i, strike, color, sz, highlight, u, shd, vertAlign)
    function rPr(f) {
      let s = '';
      if (f.link) s += '<w:rStyle w:val="Hyperlink"/>';
      if (f.code) s += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="D2Coding" w:cs="Consolas"/>';
      if (f.b) s += '<w:b/>';
      if (f.i) s += '<w:i/>';
      if (f.strike) s += '<w:strike/>';
      if (f.color) s += `<w:color w:val="${f.color}"/>`;
      if (f.code) s += '<w:sz w:val="19"/>';
      if (f.hl) s += '<w:highlight w:val="yellow"/>';
      if (f.u) s += '<w:u w:val="single"/>';
      if (f.code) s += '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>';
      if (f.sup) s += '<w:vertAlign w:val="superscript"/>';
      if (f.sub) s += '<w:vertAlign w:val="subscript"/>';
      return s ? `<w:rPr>${s}</w:rPr>` : '';
    }
    const run = (text, f) => (text ? `<w:r>${rPr(f)}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>` : '');
    // 수식 → 원래 TeX (markcont 가 data-tex 에 남겨 둠). 없으면 annotation, 그것도 없으면 보이는 글자
    function texOf(k) {
      const t = k.getAttribute('data-tex') || k.querySelector('annotation')?.textContent;
      if (t) return t.trim();
      return (k.querySelector('.katex-html') || k).textContent;
    }
    async function runs(node, f) {
      let out = '';
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { out += run(c.nodeValue.replace(/[\t\n\r]+/g, ' '), f); continue; }
        if (c.nodeType !== 1) continue;
        const tag = c.tagName, cls = c.classList;
        if (/^(SCRIPT|STYLE|BUTTON|INPUT|TEMPLATE)$/.test(tag) || c.getAttribute('aria-hidden') === 'true' && !cls.contains('katex-html')) {
          if (tag === 'INPUT' && c.type === 'checkbox') out += run(c.checked ? '☑ ' : '☐ ', f);
          continue;
        }
        if (cls.contains('katex')) { out += run(texOf(c), { ...f, i: true }); continue; }
        if (tag === 'BR') { out += '<w:r><w:br/></w:r>'; continue; }
        if (tag === 'IMG') { out += await imgRun(c); continue; }
        if (tag === 'svg') { try { const p = await svgToPng(c); out += await picture(p.blob, p.w, p.h); } catch {} continue; }
        const g = { ...f };
        if (tag === 'STRONG' || tag === 'B') g.b = true;
        if (tag === 'EM' || tag === 'I') g.i = true;
        if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') g.strike = true;
        if (tag === 'MARK') g.hl = true;
        if (tag === 'INS' || tag === 'U') g.u = true;
        if (tag === 'CODE' || tag === 'KBD' || tag === 'SAMP') g.code = true;
        if (tag === 'SUP') g.sup = true;
        if (tag === 'SUB') g.sub = true;
        if (tag === 'A') {
          if (cls.contains('footnote-backref')) continue; // 각주 끝의 ↩︎ (종이에서는 못 누름)
          const href = c.getAttribute('href') || '';
          if (/^(https?:|mailto:)/i.test(href)) { out += `<w:hyperlink r:id="${link(href)}">${await runs(c, { ...g, link: true })}</w:hyperlink>`; continue; }
        }
        out += await runs(c, g);
      }
      return out;
    }
    // 문단 속성 (순서: pStyle, keepNext, numPr, pBdr, shd, spacing, ind, jc)
    const para = (inner, p = {}) => {
      let pp = '';
      if (p.style) pp += `<w:pStyle w:val="${p.style}"/>`;
      if (p.keep) pp += '<w:keepNext/>';
      if (p.num) pp += `<w:numPr><w:ilvl w:val="${p.num.lvl}"/><w:numId w:val="${p.num.id}"/></w:numPr>`;
      if (p.quote) pp += `<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${p.quoteColor || 'C8C8C8'}"/></w:pBdr>`;
      if (p.rule) pp += '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr>';
      if (p.shd) pp += `<w:shd w:val="clear" w:color="auto" w:fill="${p.shd}"/>`;
      if (p.ind) pp += `<w:ind w:left="${p.ind}"/>`;
      if (p.jc) pp += `<w:jc w:val="${p.jc}"/>`;
      return `<w:p>${pp ? `<w:pPr>${pp}</w:pPr>` : ''}${inner}</w:p>`;
    };
    const blockTags = /^(P|DIV|H[1-6]|UL|OL|LI|TABLE|PRE|BLOCKQUOTE|HR|FIGURE|FIGCAPTION|SECTION|DETAILS|SUMMARY|NAV|DL|DT|DD|ASIDE|ARTICLE|HEADER|FOOTER)$/;
    async function blocks(node, ctx = {}) {
      let out = '', inl = null;
      const flush = async () => { if (inl) { const r = await runsOf(inl); if (r.trim()) out += para(r, ctx.p || {}); inl = null; } };
      const runsOf = async (list) => { let s = ''; for (const n of list) { const tmp = document.createElement('span'); tmp.append(n.cloneNode(true)); s += await runs(tmp, ctx.f || {}); } return s; };
      for (const c of node.childNodes) {
        if (c.nodeType === 1 && (blockTags.test(c.tagName) || c.tagName === 'svg' && c.closest('.dg, .mermaid'))) { await flush(); out += await block(c, ctx); }
        else if (c.nodeType === 1 || (c.nodeType === 3 && c.nodeValue.trim())) (inl = inl || []).push(c);
      }
      await flush();
      return out;
    }
    async function block(el, ctx) {
      const tag = el.tagName, cls = el.classList, p = ctx.p || {};
      if (el.hidden || /^(SCRIPT|STYLE|BUTTON|TEMPLATE)$/.test(tag) || cls.contains('h-tools') || cls.contains('code-head') || cls.contains('page-break-label')) return '';
      if (cls.contains('page-break')) return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      if (cls.contains('print-cover')) return cover(el);
      if (cls.contains('front-matter') && hasCover) return ''; // 표지에 이미 나옴
      if (/^H[1-6]$/.test(tag)) return para(await runs(el, {}), { style: 'Heading' + tag[1], keep: true });
      if (tag === 'P') return para(await runs(el, ctx.f || {}), p);
      if (tag === 'HR') return para('', { rule: true });
      if (tag === 'PRE') {
        // 코드 블록 제목(```js title="app.js") 은 굵게 한 줄, 강조한 줄({2,4-5})은 노란 바탕
        const cb = el.closest('.code-block');
        const title = cb?.querySelector('.code-lang.has-title')?.textContent.trim();
        const hl = new Set((cb?.dataset.hl || '').split(',').map(Number));
        const code = el.querySelector('code') || el;
        const lines = code.textContent.replace(/\n$/, '').split('\n');
        return (title ? para(run(title, { b: true, code: true }), { keep: true, ind: p.ind }) : '') +
          lines.map((l, i) => para(run(l || ' ', { code: false }), { style: 'Code', ind: p.ind, shd: hl.has(i + 1) ? 'FFF1B8' : '' })).join('');
      }
      if (tag === 'svg') { try { const s = await svgToPng(el); return para(await picture(s.blob, s.w, s.h), { jc: 'center' }); } catch { return ''; } }
      if (cls.contains('math-block')) return para(await runs(el, {}), { ...p, jc: 'center' });
      if (tag === 'UL' || tag === 'OL') return list(el, ctx, 0);
      if (tag === 'TABLE') return table(el);
      if (tag === 'BLOCKQUOTE') return blocks(el, { ...ctx, p: { ...p, quote: true, ind: (p.ind || 0) + 240 } });
      if (cls.contains('callout')) {
        const title = el.querySelector(':scope > .callout-title');
        const color = { blue: '2F6FEB', green: '1F883D', amber: '9A6700', red: 'CF222E', purple: '8250DF', gray: '8C959F' }[[...cls].map((c) => c.replace('c-', '')).find((c) => /^(blue|green|amber|red|purple|gray)$/.test(c))] || '2F6FEB';
        const q = { ...p, quote: true, quoteColor: color, ind: (p.ind || 0) + 240 };
        const label = title ? [...title.childNodes].map((n) => n.textContent.trim()).filter(Boolean).join(' ') : ''; // 「💡」+「NOTE」 사이 띄움
        return (label ? para(run(label, { b: true, color }), q) : '') + await blocks(el.querySelector(':scope > .callout-body') || el, { ...ctx, p: q });
      }
      if (tag === 'FIGURE') {
        let s = '';
        for (const c of el.childNodes) {
          if (c.nodeType !== 1) continue;
          if (c.tagName === 'FIGCAPTION') s += para(await runs(c, { i: true }), { style: 'Caption', jc: 'center' });
          else s += para(await runs(c.tagName === 'IMG' ? wrap(c) : c, {}), { jc: 'center' });
        }
        return s;
      }
      if (tag === 'DETAILS') return blocks(el, ctx);
      if (tag === 'SUMMARY') return para(await runs(el, { b: true }), p);
      if (tag === 'DT') return para(await runs(el, { b: true }), p);
      if (tag === 'DD') return blocks(el, { ...ctx, p: { ...p, ind: (p.ind || 0) + 360 } });
      return blocks(el, ctx);
    }
    const wrap = (n) => { const s = document.createElement('span'); s.append(n.cloneNode(true)); return s; };
    // 표지 (문서 정보 「표지: 예」): 제목 · 요약 · 나머지 정보를 따로 구역에 넣어 쪽 가운데에, 쪽 번호 없이 (본문 쪽 번호는 1부터)
    function cover(el) {
      const t = el.querySelector('.cover-title'), sub = el.querySelector('.cover-sub');
      let s = '';
      if (t) s += para(run(t.textContent.trim(), {}), { style: 'Title' });
      if (sub) s += para(run(sub.textContent.trim(), {}), { style: 'Subtitle' });
      for (const tr of el.querySelectorAll('tr')) {
        const [k, v] = [...tr.cells].map((c) => c.textContent.trim());
        s += `<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="2000"/></w:tabs><w:spacing w:after="60"/></w:pPr>${run(k, { b: true, color: '777777' })}<w:r><w:tab/></w:r>${run(v || '', {})}</w:p>`;
      }
      return s + `<w:p><w:pPr><w:sectPr>${pgXml}<w:vAlign w:val="center"/></w:sectPr></w:pPr></w:p>`;
    }
    async function list(el, ctx, lvl) {
      let id = 1;
      if (el.tagName === 'OL') { id = 2 + nums.length; nums.push(+(el.getAttribute('start') || 1)); }
      let out = '';
      for (const li of el.children) {
        if (li.tagName !== 'LI') continue;
        const inline = [], rest = [];
        for (const c of li.childNodes) (c.nodeType === 1 && (blockTags.test(c.tagName)) && !(c.tagName === 'P' && !inline.length && !rest.length) ? rest : inline).push(c);
        // 첫 문단은 번호와 같은 줄로
        const first = inline.length === 1 && inline[0].nodeType === 1 && inline[0].tagName === 'P' ? inline[0] : null;
        const tmp = document.createElement('span');
        (first ? [...first.childNodes] : inline).forEach((n) => tmp.append(n.cloneNode(true)));
        out += para(await runs(tmp, {}), { num: { id, lvl: Math.min(lvl, 8) } });
        for (const c of rest) {
          if (c.tagName === 'UL' || c.tagName === 'OL') out += await list(c, ctx, lvl + 1);
          else out += await block(c, { ...ctx, p: { ind: 720 * (lvl + 1) } });
        }
      }
      return out;
    }
    async function table(t) {
      const rows = [...t.rows];
      if (!rows.length) return '';
      const cols = Math.max(...rows.map((r) => [...r.cells].reduce((s, c) => s + (c.colSpan || 1), 0)));
      const colW = Math.floor((page.w - margin * 2) / cols);
      let s = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${colW}"/>`.repeat(cols)}</w:tblGrid>`;
      for (const [ri, r] of rows.entries()) {
        const head = ri === 0 && (r.parentElement.tagName === 'THEAD' || [...r.cells].every((c) => c.tagName === 'TH'));
        s += `<w:tr>${head ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}`;
        for (const c of r.cells) {
          const span = c.colSpan || 1;
          const align = (c.style.textAlign || c.getAttribute('align') || '').toLowerCase();
          const inner = await runs(c, head ? { b: true } : {});
          s += `<w:tc><w:tcPr><w:tcW w:w="${colW * span}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${head ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : ''}</w:tcPr>` +
            para(inner, align === 'center' || align === 'right' ? { jc: align } : {}) + '</w:tc>';
        }
        s += '</w:tr>';
      }
      return s + '</w:tbl>' + para('', {});
    }

    const body = await blocks(root);
    const title = opts.title || 'markcont';
    const ftr = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="${W}" xmlns:r="${R}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>` +
      '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}` +
      `<w:sectPr><w:footerReference w:type="default" r:id="rId3"/>${pgXml}${hasCover ? '<w:pgNumType w:start="1"/>' : ''}</w:sectPr></w:body></w:document>`;
    const heading = (n, sz, before) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:style>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}">` +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="맑은 고딕" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      heading(1, 36, 360) + heading(2, 30, 320) + heading(3, 26, 280) + heading(4, 23, 240) + heading(5, 22, 200) + heading(6, 21, 200) +
      '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:b/><w:sz w:val="52"/><w:szCs w:val="52"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="480"/></w:pPr><w:rPr><w:color w:val="555555"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F5F5F5"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:eastAsia="D2Coding" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:i/><w:color w:val="666666"/><w:sz w:val="18"/></w:rPr></w:style>' +
      '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>' +
      '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders>' +
      ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>`).join('') +
      '</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>';
    const bullet = ['•', '◦', '▪'];
    const lvls = (fmt) => Array.from({ length: 9 }, (_, i) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt === 'bullet' ? 'bullet' : ['decimal', 'lowerLetter', 'lowerRoman'][i % 3]}"/><w:lvlText w:val="${fmt === 'bullet' ? bullet[i % 3] : '%' + (i + 1) + '.'}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr></w:lvl>`).join('');
    const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${W}">` +
      `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${lvls('bullet')}</w:abstractNum>` +
      `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${lvls('decimal')}</w:abstractNum>` +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
      nums.map((start, k) => `<w:num w:numId="${2 + k}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="${start}"/></w:lvlOverride></w:num>`).join('') +
      '</w:numbering>';
    const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/numbering" Target="numbering.xml"/><Relationship Id="rId3" Type="${R}/footer" Target="footer1.xml"/>` +
      rels.join('') + '</Relationships>';
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/>` +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
      { name: 'docProps/core.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        `<dc:title>${esc(title)}</dc:title><dc:creator>markcont</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>` },
      { name: 'word/document.xml', data: doc },
      { name: 'word/styles.xml', data: styles },
      { name: 'word/numbering.xml', data: numbering },
      { name: 'word/footer1.xml', data: ftr },
      { name: 'word/_rels/document.xml.rels', data: docRels },
      ...media,
    ];
    return zip(files);
  }

  window.MarkDocx = { build, svgToPng };
})();
