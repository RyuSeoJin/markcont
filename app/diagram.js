// markcont 다이어그램 — 외부 라이브러리 없이 SVG 로 그립니다.
// 흐름도는 markcont 흐름도 기준을 따릅니다: 위 유저 구역 · 아래 시스템 구역, 도형마다 정해진 뜻,
// 왼쪽 → 오른쪽 배치, 수평 · 수직 선만, 예 = 파랑 · 아니오 = 빨강, 분기 값은 선의 출발 쪽,
// 다른 섹션으로 가거나 멀리 건너가는 선은 「→ 코드」 · 「↩ 코드」 연결자로 끊음.
// 같은 모양 규칙으로 주고받는 순서(sequence) · 상태 변화(state) · 일정표(timeline)도 그립니다.
// 요약 흐름도(summary)는 기능 전체를 한눈에 보는 그림: 위 → 아래 한 줄기, 왼쪽 단계 · 가운데 같은 크기 칸 · 오른쪽 설명.
(function () {
  const L = (ko, en) => (window.L ? window.L(ko, en) : ko);
  const FONT = '"Pretendard Variable", Pretendard, -apple-system, "Segoe UI", "Malgun Gothic", sans-serif';
  let ctx;
  function textW(s, size = 13, weight = 400) {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${weight} ${size}px ${FONT}`;
    return ctx.measureText(String(s)).width;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const r1 = (n) => Math.round(n * 10) / 10;
  const normKey = (s) => String(s || '').toLowerCase().replace(/[\s·・/,.\-_]+/g, '');

  // 긴 글은 maxW 안에서 줄을 나눔 (\n · <br> 은 그대로 줄바꿈)
  function wrap(text, maxW, size = 13, weight = 400) {
    const out = [];
    for (const para of String(text || '').split(/\n|<br\s*\/?>|\\n/i)) {
      let line = '';
      for (const w of para.split(/(\s+)/)) {
        const t = line + w;
        if (!line.trim() || textW(t.trim(), size, weight) <= maxW) line = t;
        else { out.push(line.trim()); line = w.trimStart(); }
        while (line.trim().length > 1 && textW(line.trim(), size, weight) > maxW) {
          let k = line.length - 1;
          while (k > 1 && textW(line.slice(0, k).trim(), size, weight) > maxW) k--;
          out.push(line.slice(0, k).trim());
          line = line.slice(k);
        }
      }
      if (line.trim()) out.push(line.trim());
    }
    return out;
  }

  // 색 이름 → 색 묶음
  const TINT = {};
  [['blue', '파랑 파란색 blue'], ['green', '초록 초록색 녹색 green'], ['amber', '주황 노랑 노란색 orange yellow amber'],
    ['red', '빨강 빨간색 red'], ['purple', '보라 보라색 purple'], ['gray', '회색 gray grey']]
    .forEach(([k, names]) => names.split(' ').forEach((n) => (TINT[normKey(n)] = k)));
  const PALETTE = ['blue', 'green', 'purple', 'amber', 'red', 'gray'];
  // 「색 이름1, 이름2: 초록」
  function parseColorLine(line, errs, ln) {
    const m = line.match(/^(?:색|color)\s+(.+?)\s*[:：]\s*(\S+)\s*$/i);
    if (!m) return null;
    const tint = TINT[normKey(m[2])];
    if (!tint) { errs.push({ ln, msg: L(`모르는 색: ${m[2]} (파랑 · 초록 · 주황 · 빨강 · 보라 · 회색)`, `Unknown color: ${m[2]} (blue, green, orange, red, purple, gray)`) }); return {}; }
    return { names: m[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean), tint };
  }
  function applyColors(colors, find) {
    for (const c of colors) for (const n of c.names || []) { const t = find(n); if (t) t.tint = c.tint; }
  }

  function markers(uid, kinds) {
    return '<defs>' + kinds.map((k) => `<marker id="${uid}-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="dg-arrow ${k}"/></marker>`).join('') +
      `<marker id="${uid}-open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9" class="dg-arrow-open"/></marker></defs>`;
  }
  const pathD = (pts) => 'M' + pts.map((p) => `${r1(p.x)},${r1(p.y)}`).join(' L');
  function multiText(lines, cx, cy, lh, cls, extra = '') {
    const top = cy - (lines.length * lh) / 2;
    return lines.map((l, i) => `<text x="${r1(cx)}" y="${r1(top + (i + 0.5) * lh)}" class="${cls}" ${extra}>${esc(l)}</text>`).join('');
  }
  function labelBox(text, x, y, kind, anchor = 'start') {
    const w = textW(text, 11, 600) + 10, h = 17;
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    return `<g class="dg-label ${kind}"><rect x="${r1(x0)}" y="${r1(y - h / 2)}" width="${r1(w)}" height="${h}" rx="4"/><text x="${r1(x0 + w / 2)}" y="${r1(y)}">${esc(text)}</text></g>`;
  }
  function svgWrap(cls, W, H, body, title) {
    return `<svg class="dg-svg ${cls}" xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(W)}" height="${Math.ceil(H)}" viewBox="0 0 ${Math.ceil(W)} ${Math.ceil(H)}" role="img" aria-label="${esc(title)}">${body}</svg>`;
  }
  function fail(errs) {
    const e = new Error(errs.slice(0, 6).map((x) => (x.ln ? L(`${x.ln}번째 줄: `, `Line ${x.ln}: `) : '') + x.msg).join('\n'));
    e.dgErrors = errs;
    throw e;
  }
  const YES = /^(예|네|yes|y|true|참)(\s|$|[·,:])/i;
  const NO = /^(아니오|아니요|아니|no|n|false|거짓)(\s|$|[·,:])/i;
  const kindOfLabel = (s) => (YES.test(s || '') ? 'yes' : NO.test(s || '') ? 'no' : 'normal');

  /* =====================================================================
     흐름도 (flow) — 노드 표:  코드 | 구역 | 도형 | 문구 | 나감 | 판정 기준 (| 섹션)
     ===================================================================== */
  const SHAPE = {};
  [['term', '시작종료 시작 종료 끝 알약 term start end'], ['action', '행동 처리 행동처리 사각형 네모 action'],
    ['input', '입력 input'], ['output', '출력 화면 노출 output'], ['decision', '조건 판단 마름모 decision'],
    ['process', '공통처리 공통 process'], ['ref', '반복 반복지점 원 ref'], ['sub', '서브루틴 하위흐름 sub subroutine']]
    .forEach(([k, names]) => names.split(' ').forEach((n) => (SHAPE[normKey(n)] = k)));
  const ZONE_U = new Set(['유저', '사용자', '유저구역', 'user', 'u']);
  const ZONE_S = new Set(['시스템', '시스템구역', '서버', 'system', 's']);
  const HEAD = {};
  [['code', '코드 code id'], ['zone', '구역 zone lane'], ['shape', '도형 모양 shape type'], ['text', '문구 내용 글 text label'],
    ['out', '나감 다음 연결 out next goesto'], ['judge', '판정기준 판정 judge rule'], ['color', '색 color'], ['section', '섹션 묶음 section group']]
    .forEach(([k, names]) => names.split(' ').forEach((n) => (HEAD[normKey(n)] = k)));

  function splitOut(out) {
    out = String(out || '').trim();
    if (!out || /^[—–-]+$/.test(out)) return [];
    return out.split(/\s+\/\s+/).map((p) => {
      const m = p.trim().match(/^(.*?)(?:→|->|=>)\s*([^\s·]+)\s*(?:·\s*(.*))?$/);
      if (!m) return null;
      const label = m[1].trim(), note = (m[3] || '').trim();
      return { to: m[2].trim(), kind: kindOfLabel(label), label: [label, note].filter(Boolean).join(' · ') };
    }).filter(Boolean);
  }

  // 블록 안의 지시 줄: 「@보기 이름: N1 N2」 · 「@자료 ../nodes/흐름.md#흐름」
  const VIEW_RE = /^@(?:보기|view)\s+(.+)$/i, DATA_RE = /^@(?:자료|data)\s+(.+)$/i;
  function viewLine(rest) {
    const m = rest.match(/^(.*?)\s*[:：]\s*(.*)$/);
    const name = m ? m[1].trim() : '', codes = (m ? m[2] : rest).split(/[\s,，]+/).map((s) => s.replace(/^`|`$/g, '')).filter(Boolean);
    return { name, codes };
  }
  // 노드 자료 파일(마크다운)에서 노드 표를 꺼냄: 흐름 이름이 있으면 「**워크플로우 노드 · 흐름 이름**」 줄 아래의 표, 없으면 머리 첫 칸이 「코드」인 첫 표
  function flowTable(text, flow) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    let from = 0;
    if (flow) {
      const want = normKey(flow);
      from = lines.findIndex((l) => { const m = l.trim().match(/^\*\*(.+)\*\*$/); return m && /흐름|flow/i.test(m[1]) && normKey(m[1].replace(/^.*(흐름|flow)\s*/i, '')) === want; }); // 마지막 「흐름 · flow」 뒤 (Workflow 의 flow 가 아니라)
      if (from < 0) return null;
    }
    let fence = null;
    for (let i = from; i < lines.length; i++) {
      const l = lines[i], fm = l.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) { if (fm && fm[1][0] === fence[0] && fm[1].length >= fence.length) fence = null; continue; }
      if (fm) { fence = fm[1]; continue; }
      if (!/^\s*\|/.test(l) || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || '')) continue;
      const first = l.replace(/^\s*\|/, '').split('|')[0];
      if (HEAD[normKey(first.replace(/[`*]/g, ''))] !== 'code') { if (flow) return null; continue; }
      let j = i + 2;
      while (j < lines.length && /^\s*\|/.test(lines[j])) j++;
      return [l, ...lines.slice(i + 2, j)].join('\n');
    }
    return null;
  }

  // opt.data: @자료 파일에서 꺼낸 노드 표 (null 이면 찾지 못함, undefined 면 아직 모름)
  function parseFlow(src, errs, opt = {}) {
    const nodes = new Map(), edges = [], secNames = new Map(), colors = [], secLines = [], explicit = new Set(), views = [];
    let longLines = 'auto', source = null, sourceLn = 0;
    let cols = ['code', 'zone', 'shape', 'text', 'out', 'judge'];
    let hideCodes = false;
    const srcLines = src.split('\n');
    const isRow = (l) => { const t = l.trim(); return t.includes('|') && !/^(@|%%|\/\/|#)/.test(t) && !/^\|?\s*:?-{3,}/.test(t) && !/^(색|color)\s/i.test(t); };
    for (const l of srcLines) { const m = l.trim().match(DATA_RE); if (m) { source = m[1].trim(); break; } }
    sourceLn = srcLines.findIndex((l) => DATA_RE.test(l.trim())) + 1;
    // 블록 안에 노드 줄이 있으면 블록 안 표를 씀 (지금 문서와 호환), 없으면 @자료 표
    let all = srcLines.map((raw, i) => [raw, i + 1]);
    if (source && !srcLines.some((l) => isRow(l) && !/^\|?\s*(코드|code)\s*\|/i.test(l.trim()))) {
      if (opt.data) all = all.concat(String(opt.data).split('\n').map((raw) => [raw, sourceLn]));
      else if (opt.data === null) errs.push({ ln: sourceLn, msg: L(`노드 자료를 찾지 못했습니다 — ${source}`, `Couldn't find the node data — ${source}`) });
      else errs.push({ ln: sourceLn, msg: L(`노드 자료를 읽는 중입니다 — ${source}`, `Reading the node data — ${source}`), loading: true });
    }
    all.forEach(([raw, ln]) => {
      const line = raw.trim();
      let m;
      if (!line || /^(%%|\/\/)/.test(line) || /^\*\*.*\*\*$/.test(line)) return;
      if ((m = line.match(VIEW_RE))) { views.push({ ...viewLine(m[1]), ln }); return; }
      if (DATA_RE.test(line)) return;
      if ((m = line.match(/^#{1,6}\s+(.+?)\s*[:：]\s+(.+)$/)) || (m = line.match(/^#{1,6}\s+(\S+)\s+(.+)$/)) || (m = line.match(/^(?:섹션|section)\s+(.+?)\s*[:：]?\s+(.+)$/i))) { secLines.push([m[1].trim(), m[2].trim()]); return; }
      if (/^(긴\s*선\s*끊기|cut\s*long\s*lines?)$/i.test(line)) { longLines = 'cut'; return; }
      if (/^(긴\s*선\s*잇기|keep\s*long\s*lines?)$/i.test(line)) { longLines = 'keep'; return; }
      if (/^(코드\s*숨기기|hide\s*codes?)$/i.test(line)) { hideCodes = true; return; }
      const c = parseColorLine(line, errs, ln);
      if (c) { colors.push(c); return; }
      if (!line.includes('|')) { errs.push({ ln, msg: L('표의 한 줄(코드 | 구역 | 도형 | 문구 | 나감)로 써 주세요', 'Write each node as a table row (code | zone | shape | text | goes to)') }); return; }
      if (/^\|?\s*:?-{3,}/.test(line)) return;
      const cells = line.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((s) => s.trim().replace(/^`(.*)`$/, '$1'));
      const keys = cells.map((s) => HEAD[normKey(s)] || null);
      if (keys.includes('code') && keys.filter(Boolean).length >= 2) { cols = keys; return; }
      const row = {};
      cols.forEach((k, j) => { if (k) row[k] = (cells[j] || '').replace(/\*\*/g, ''); });
      const id = (row.code || '').trim();
      if (!id) { errs.push({ ln, msg: L('코드가 비어 있습니다', 'The code is empty') }); return; }
      if (nodes.has(id)) { errs.push({ ln, msg: L(`같은 코드가 두 번 있습니다: ${id}`, `Duplicate code: ${id}`) }); return; }
      let type = row.shape ? SHAPE[normKey(row.shape)] : 'action';
      if (!type) { errs.push({ ln, msg: L(`모르는 도형: ${row.shape}`, `Unknown shape: ${row.shape}`) }); type = 'action'; }
      const zk = normKey(row.zone);
      let zone = '';
      if (zk && zk !== '—') {
        if (ZONE_U.has(zk)) zone = 'u';
        else if (ZONE_S.has(zk)) zone = 's';
        else { errs.push({ ln, msg: L(`구역은 유저 · 시스템 중 하나입니다: ${row.zone}`, `Zone must be user or system: ${row.zone}`) }); zone = 's'; }
      }
      const judge = (row.judge || '').trim();
      const secSet = (row.section || '').trim().replace(/^[—–-]$/, '');
      if (secSet) explicit.add(secSet);
      nodes.set(id, { id, zone, type, text: (row.text || '').trim(), judge: /^[—–-]$/.test(judge) ? '' : judge, tint: row.color ? TINT[normKey(row.color)] : undefined, secSet: secSet || undefined, ln });
      for (const e of splitOut(row.out)) edges.push({ from: id, ...e, ln, idx: edges.length });
    });
    // 섹션 줄: 「# 받기: N9 N10 N11」 처럼 뒤가 모두 노드 코드면 그 노드들을 그 섹션으로, 아니면 「# S1 로그인」 섹션 이름
    for (const [key, rest] of secLines) {
      const codes = rest.split(/[\s,，]+/).filter(Boolean);
      if (codes.length && codes.every((c) => nodes.has(c))) { explicit.add(key); for (const c of codes) nodes.get(c).secSet = key; }
      else secNames.set(key.replace(/[:：]$/, ''), rest);
    }
    applyColors(colors, (n) => nodes.get(n));
    return { nodes, edges, secNames, hideCodes, explicit, longLines, views, source, sourceLn };
  }

  // @보기: 고른 노드만 남김. 고른 노드에서 밖으로 나가는 선은 남겨 두어 연결자로 그림 (표 전체는 f.all 에)
  function applyView(f, errs) {
    f.all = new Map(f.nodes);
    if (!f.views.length) return;
    const sel = new Set();
    for (const v of f.views) for (const c of v.codes) if (f.all.has(c)) sel.add(c);
    if (!sel.size) { if (f.all.size) errs.push({ ln: f.views[0].ln, msg: L('@보기에 적은 코드가 표에 하나도 없습니다', 'None of the codes in @view are in the table') }); return; }
    for (const id of [...f.nodes.keys()]) if (!sel.has(id)) f.nodes.delete(id);
    f.edges = f.edges.filter((e) => sel.has(e.from));
    f.viewName = f.views.map((v) => v.name).filter(Boolean).join(' · ');
  }
  // 연결자 도착: 어디로 가는지 (같은 표 → 같은 문서의 다른 블록 · 다른 노드 자료 파일)
  function whereOf(f, code, ctx) {
    const own = new Set(f.views.map((v) => v.name));
    const n = f.all && f.all.get(code);
    if (n) {
      const v = ctx && ctx.viewOf && ctx.viewOf(code, own);
      const sec = flowSec(n);
      const named = sec && (f.secNames.has(sec) || f.explicit.has(sec));
      return { found: true, text: n.text, where: v || (named ? secLabel(f, sec) : '') };
    }
    const hit = ctx && ctx.lookup && ctx.lookup(code, own);
    if (hit) return { found: true, text: hit.text || '', where: hit.where || '' };
    return { found: false, text: f.secNames.get(code) || '', where: '' };
  }

  // 노드의 섹션: 따로 정했으면 그것, 아니면 코드 앞부분(S1-02 → S1)
  const flowSec = (n) => n.secSet || (n.id.includes('-') ? n.id.slice(0, n.id.lastIndexOf('-')) : '');
  const secLabel = (f, sec) => (f.explicit.has(sec) ? sec : sec + (f.secNames.get(sec) ? ' · ' + f.secNames.get(sec) : ''));
  function renderFlow(src, uid, opt = {}) {
    const errs = [];
    const f = parseFlow(src, errs, opt);
    applyView(f, errs);
    if (!f.nodes.size) { if (!errs.length) errs.push({ msg: L('도형이 하나도 없습니다', 'No nodes') }); fail(errs); }
    if (errs.length) fail(errs);
    const { nodes, edges } = f;
    const hasZones = [...nodes.values()].some((n) => n.zone);
    for (const n of nodes.values()) {
      if (!n.zone) n.zone = 's';
      n.sec = flowSec(n);
    }
    const secOrder = [];
    for (const n of nodes.values()) if (!secOrder.includes(n.sec)) secOrder.push(n.sec);
    const outs = new Map();
    for (const e of edges) { if (!outs.has(e.from)) outs.set(e.from, []); outs.get(e.from).push(e); }
    const roots = new Map();

    // 1) 열: 섹션 안에서 앞으로 가는 연결의 가장 긴 경로 (되돌아가는 연결은 빼고)
    for (const sec of secOrder) {
      const list = [...nodes.values()].filter((n) => n.sec === sec);
      const inSec = (e) => nodes.has(e.to) && nodes.get(e.to).sec === sec && nodes.get(e.from).sec === sec;
      const hasIn = new Set();
      for (const e of edges) if (inSec(e) && e.from !== e.to) hasIn.add(e.to);
      const st = new Map();
      const visit = (id) => {
        st.set(id, 1);
        for (const e of outs.get(id) || []) {
          if (!inSec(e)) continue;
          if (e.to === id || st.get(e.to) === 1) e.back = true;
          else if (!st.get(e.to)) visit(e.to);
        }
        st.set(id, 2);
      };
      const rs = list.filter((n) => !hasIn.has(n.id));
      if (!rs.length) rs.push(list[0]);
      roots.set(sec, rs);
      for (const n of rs) if (!st.get(n.id)) visit(n.id);
      for (const n of list) if (!st.get(n.id)) visit(n.id);
      const col = new Map(list.map((n) => [n.id, 0]));
      for (let k = 0; k <= list.length; k++) {
        let changed = false;
        for (const e of edges) {
          if (e.back || !inSec(e)) continue;
          const c = col.get(e.from) + 1;
          if (c > col.get(e.to)) { col.set(e.to, c); changed = true; }
        }
        if (!changed) break;
      }
      list.forEach((n) => (n.col = col.get(n.id)));
    }

    // 2) 연결자: 다른 섹션 · 다른 흐름 → 「→ 코드」, 두 열 이상 되돌아감 → 「↩ 코드」
    let cid = 0;
    const subTargets = new Set();
    for (const n of nodes.values()) if (n.type === 'sub') for (const e of outs.get(n.id) || []) subTargets.add(nodes.has(e.to) ? nodes.get(e.to).sec : e.to);
    for (const e of edges) {
      const a = nodes.get(e.from), b = nodes.get(e.to);
      if (!b || b.sec !== a.sec) {
        if (a.type === 'sub' && b) { e.subLink = true; continue; } // 서브루틴은 하위 섹션을 엶 (뒤에 연결자를 두지 않음)
        // 다른 곳으로 가는 연결자: 도착 문구와 어느 보기 · 섹션 · 문서인지 (출발 도형과 같은 구역에)
        const w = b ? { found: true, text: b.text, where: b.sec ? secLabel(f, b.sec) : '' } : whereOf(f, e.to, opt.ctx);
        const c = { id: `__c${cid++}`, type: 'goto', zone: a.zone, sec: a.sec, col: a.col + 1, virtual: true,
          code: '→ ' + e.to, target: e.to, text: w.text, where: w.where, missing: !w.found, label: e.label };
        nodes.set(c.id, c); e.to = c.id;
      } else if (e.back && a.col - b.col >= 2) {
        const c = { id: `__c${cid++}`, type: 'ret', zone: a.zone, sec: a.sec, col: a.col + 1, virtual: true, code: '↩ ' + b.id, target: b.id, text: b.text };
        nodes.set(c.id, c); e.to = c.id; e.back = false;
      } else if (!e.back && b.col - a.col >= 2 && (opt.cut?.has(e.idx) || f.longLines === 'cut')) {
        // 앞으로 멀리 건너가는 선: 긴 선 대신 「→ 코드」 연결자
        const c = { id: `__c${cid++}`, type: 'goto', zone: a.zone, sec: a.sec, col: a.col + 1, virtual: true, code: '→ ' + b.id, target: b.id, text: b.text };
        nodes.set(c.id, c); e.to = c.id;
      }
    }
    for (const e of edges) if (e.subLink) e.hidden = true;

    // 3) 행: 주 경로는 앞 도형의 행을 잇고, 갈래는 새 행 (유저 구역은 위로, 시스템 구역은 아래로 쌓음)
    const occ = new Set();
    const key = (n, s) => `${n.sec}|${n.col}|${n.zone}|${s}`;
    const put = (n, pref) => { let s = Math.max(0, pref); while (occ.has(key(n, s))) s++; n.slot = s; occ.add(key(n, s)); };
    for (const sec of secOrder) {
      for (const r of roots.get(sec) || []) {
        if (r.slot != null) continue;
        put(r, 0);
        const q = [r];
        while (q.length) {
          const p = q.shift();
          let i = 0;
          for (const e of outs.get(p.id) || []) {
            if (e.back || e.hidden) continue;
            const c = nodes.get(e.to);
            if (!c || c.slot != null) continue;
            put(c, c.zone === p.zone ? p.slot + (i ? 1 : 0) : (i ? 1 : 0));
            i++;
            q.push(c);
          }
        }
      }
      for (const n of nodes.values()) if (n.sec === sec && n.slot == null) put(n, 0);
    }

    // 4) 크기
    const SKEW = 12;
    for (const n of nodes.values()) {
      const small = n.type === 'goto' || n.type === 'ret';
      const size = small ? 12 : 13;
      // 글은 줄이지 않고(「…」 없이) 다 보여 줌: 줄이 늘면 도형이 그만큼 높아짐
      n.lines = n.text ? wrap(n.text, small ? 120 : 150, size) : [];
      n.codeText = n.virtual ? n.code : (f.hideCodes || n.type === 'ref' ? '' : n.id);
      if (n.type === 'sub') n.codeText = (n.codeText ? n.codeText + ' ' : '') + '▸';
      if (n.type === 'ref' && !n.lines.length) n.lines = [n.id];
      // 연결자: 도착이 어느 보기 · 섹션 · 문서인지 문구 위에 작게 (길면 여러 줄)
      n.whereLines = n.where ? wrap(n.where, 130, 10.5, 600) : [];
      const tw = Math.max(n.codeText ? textW(n.codeText, 11.5, 700) : 0, ...n.whereLines.map((l) => textW(l, 10.5, 600)), ...n.lines.map((l) => textW(l, size)), 0);
      const th = (n.codeText ? 15 : 0) + n.whereLines.length * 13 + n.lines.length * 17;
      n.th = th;
      switch (n.type) {
        case 'decision': n.w = Math.max(100, tw * 1.5 + 30); n.h = Math.max(66, th * 1.6 + 24); break;
        case 'ref': n.w = n.h = Math.max(46, Math.max(tw, th) + 20); break;
        case 'input': case 'output': n.w = Math.max(100, tw + 24 + SKEW * 2); n.h = Math.max(40, th + 18); break;
        case 'process': case 'sub': n.w = Math.max(100, tw + 44); n.h = Math.max(40, th + 18); break;
        case 'goto': n.w = tw + 34; n.h = Math.max(34, th + 12); break;
        case 'ret': n.w = tw + 30; n.h = Math.max(30, th + 10); break;
        default: n.w = Math.max(90, tw + 24); n.h = Math.max(40, th + 18);
      }
    }
    // 한 도형에 드나드는 선은 모두 다른 점을 씀: 점 사이 16px (선 글자가 있으면 28px), 모자라면 도형 높이를 늘림
    const inCount = new Map();
    for (const e of edges) if (!e.back && !e.hidden && nodes.has(e.to)) inCount.set(e.to, (inCount.get(e.to) || 0) + 1);
    for (const n of nodes.values()) {
      if (n.type === 'decision' || n.type === 'ref') continue;
      const fw = n.virtual ? [] : (outs.get(n.id) || []).filter((e) => !e.back && !e.hidden);
      if (fw.length >= 2) n.h = Math.max(n.h, fw.length * (fw.some((e) => e.label) ? 28 : 16) + 12);
      const inn = inCount.get(n.id) || 0;
      if (inn >= 2) n.h = Math.max(n.h, (inn + 1) * 16);
    }

    // 5) 자리 — 섹션이 여럿이고 옆으로 너무 길면 섹션을 위아래로 쌓음 (섹션마다 유저 · 시스템 구역)
    const GX = 78, GY = 34, SEC_PAD = 20, SEC_HEAD = 30, LANE_HEAD = hasZones ? 34 : 0, M = 12, LP = 26, SEC_GAP = 36, STACK_GAP = 22;
    // 열 사이 틈: 그 틈을 지나는 선이 많을수록 넓게
    const gapCount = new Map();
    for (const e of edges) {
      if (e.hidden || !nodes.has(e.to)) continue;
      const a = nodes.get(e.from), b = nodes.get(e.to);
      const k = e.back ? `${b.sec}|${b.col - 1}` : `${a.sec}|${a.col}`;
      gapCount.set(k, (gapCount.get(k) || 0) + 1);
    }
    // 선 글자는 첫 선분 위에 얹으므로, 틈은 가장 긴 선 글자 + 세로 통로(선마다 12px)를 넣을 만큼
    const labW = (e) => (e.label ? Math.max(...wrap(e.label, 130, 11, 600).map((l) => textW(l, 11, 600))) + 10 : 0);
    const gapLab = new Map();
    for (const e of edges) {
      if (e.hidden || e.back || !nodes.has(e.to)) continue;
      const a = nodes.get(e.from), k = `${a.sec}|${a.col}`;
      gapLab.set(k, Math.max(gapLab.get(k) || 0, labW(e)));
    }
    const gapW = (sec, c) => {
      const k = `${sec}|${c}`, cnt = gapCount.get(k) || 0;
      return Math.max(GX + Math.min(110, Math.max(0, cnt - 2) * 14), (gapLab.get(k) || 0) + 52 + Math.min(cnt, 12) * 12);
    };
    const secInfo = secOrder.map((sec) => {
      const list = [...nodes.values()].filter((n) => n.sec === sec);
      const ncol = Math.max(...list.map((n) => n.col)) + 1;
      const framed = !!sec && (f.secNames.has(sec) || f.explicit.has(sec) || secOrder.length > 1);
      const colW = [];
      for (let c = 0; c < ncol; c++) colW[c] = Math.max(0, ...list.filter((n) => n.col === c).map((n) => n.w));
      let w = framed ? SEC_PAD * 2 : 0, last = -1;
      colW.forEach((cw, c) => { if (cw) { if (last >= 0) w += gapW(sec, last); w += cw; last = c; } });
      return { sec, list, ncol, framed, colW, w };
    });
    const startX = M + LANE_HEAD + (hasZones ? 10 : 0);
    const totalW = startX + secInfo.reduce((sum, i) => sum + i.w, 0) + SEC_GAP * (secInfo.length - 1) + M;
    const stacked = secInfo.length > 1 && totalW > 1400;
    const blocks = stacked ? secInfo.map((i) => [i]) : [secInfo];
    const colBox = new Map(), secBox = new Map(), laneBoxes = [];
    let y = M, W = 0;
    for (const blk of blocks) {
      // 가로: 이 줄의 섹션들을 왼쪽부터
      let x = startX;
      for (const i of blk) {
        const x0 = x;
        if (i.framed) x += SEC_PAD;
        let lastGap = 0;
        i.colW.forEach((cw, c) => {
          colBox.set(`${i.sec}|${c}`, { x, w: cw, gap: gapW(i.sec, c) });
          if (cw) { x += cw + gapW(i.sec, c); lastGap = gapW(i.sec, c); }
        });
        x -= lastGap;
        if (i.framed) x += SEC_PAD;
        secBox.set(i.sec, { x0, x1: x, framed: i.framed, sub: subTargets.has(i.sec) });
        x += SEC_GAP;
      }
      W = Math.max(W, x - SEC_GAP + M);
      const blockRight = x - SEC_GAP;
      // 세로: 이 줄 안에서 같은 행의 사각형 도형은 가장 높은 도형에 맞춤
      const bn = blk.flatMap((i) => i.list);
      const rowH = { u: [], s: [] };
      for (const n of bn) rowH[n.zone][n.slot] = Math.max(rowH[n.zone][n.slot] || 0, n.h);
      for (const n of bn) if (!['decision', 'ref', 'goto', 'ret'].includes(n.type)) n.h = rowH[n.zone][n.slot];
      const framedAny = blk.some((i) => i.framed);
      const top = y;
      y += framedAny ? SEC_HEAD : 0;
      const nU = hasZones ? Math.max(1, rowH.u.length) : 0, nS = Math.max(1, rowH.s.length);
      const rowY = { u: [], s: [] };
      const lane = { top, right: blockRight };
      if (hasZones) {
        lane.u0 = y; y += LP;
        for (let s = nU - 1; s >= 0; s--) { rowH.u[s] = rowH.u[s] || 40; rowY.u[s] = y; y += rowH.u[s] + GY; }
        y += LP - GY; lane.mid = y; y += LP;
      } else { y += 6; }
      for (let s = 0; s < nS; s++) { rowH.s[s] = rowH.s[s] || 40; rowY.s[s] = y; y += rowH.s[s] + GY; }
      y += (hasZones ? LP : 6) - GY;
      lane.s1 = y;
      laneBoxes.push(lane);
      for (const n of bn) { n.rowTop = rowY[n.zone][n.slot]; n.rowH = rowH[n.zone][n.slot]; }
      for (const i of blk) { const b = secBox.get(i.sec); b.y0 = top + 4; b.y1 = y + 8; }
      y += 8 + STACK_GAP;
    }
    const H = y - STACK_GAP + M;
    for (const n of nodes.values()) {
      const cb = colBox.get(`${n.sec}|${n.col}`);
      n.cx = cb.x + cb.w / 2;
      n.cy = n.rowTop + n.rowH / 2;
      n.cb = cb;
    }

    // 6) 연결선 (수평 · 수직만, 도형을 지나지 않는 길을 고름)
    const rects = [...nodes.values()].map((n) => ({ n, x0: n.cx - n.w / 2 - 5, x1: n.cx + n.w / 2 + 5, y0: n.cy - n.h / 2 - 5, y1: n.cy + n.h / 2 + 5 }));
    const hits = (pts, skip) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const sx0 = Math.min(a.x, b.x), sx1 = Math.max(a.x, b.x), sy0 = Math.min(a.y, b.y), sy1 = Math.max(a.y, b.y);
        for (const r of rects) {
          if (skip.includes(r.n)) continue;
          if (sx1 > r.x0 && sx0 < r.x1 && sy1 > r.y0 && sy0 < r.y1) return true;
        }
      }
      return false;
    };
    const gapUse = new Map();
    const lane_ = (k) => { const c = gapUse.get(k) || 0; gapUse.set(k, c + 1); return (c % 2 ? 1 : -1) * Math.ceil(c / 2) * 11; };
    const gapAfter = (n) => n.cb.x + n.cb.w + n.cb.gap / 2 + lane_(`${n.sec}|${n.col}|a`);
    // 도착 쪽 세로 통로: 도착 도형 가까이(마지막 구간 24px 이상)부터 왼쪽으로 12px씩 (출발 쪽 통로와 섞이지 않게)
    const gapBefore = (n) => { const k = `${n.sec}|${n.col - 1}|b`, c = gapUse.get(k) || 0; gapUse.set(k, c + 1); return n.cb.x - 26 - c * 12; };
    const inPort = (n, dy) => {
      if (n.type === 'decision' || n.type === 'ref') return { x: n.cx - n.w / 2, y: n.cy };
      const sk = n.type === 'input' || n.type === 'output' ? SKEW / 2 : 0;
      return { x: n.cx - n.w / 2 + sk, y: n.cy + dy };
    };
    const outPort = (n, side, dy, dx = 0) => {
      const inset = n.type === 'decision' ? (Math.abs(dx) / (n.w / 2)) * (n.h / 2) : 0; // 마름모 빗변 위의 점
      if (side === 'top') return { x: n.cx + dx, y: n.cy - n.h / 2 + inset };
      if (side === 'bottom') return { x: n.cx + dx, y: n.cy + n.h / 2 - inset };
      const sk = n.type === 'input' || n.type === 'output' ? SKEW / 2 : 0;
      return { x: n.cx + n.w / 2 - sk, y: n.cy + (n.type === 'decision' ? 0 : dy) };
    };
    const vis = edges.filter((e) => !e.hidden && nodes.has(e.to));
    // 들어오는 선은 왼쪽 면의 다른 점을 나눠 씀
    const ins = new Map();
    for (const e of vis) if (!e.back) { if (!ins.has(e.to)) ins.set(e.to, []); ins.get(e.to).push(e); }
    for (const [id, list] of ins) {
      const n = nodes.get(id);
      list.sort((p, q) => nodes.get(p.from).cy - nodes.get(q.from).cy);
      // 들어오는 점 사이 16px (모자라면 도형 높이 안에서 고르게)
      const step = Math.min(16, (n.h - 8) / Math.max(1, list.length - 1));
      list.forEach((e, i) => (e.inDy = (i - (list.length - 1) / 2) * step));
      // 출발 도형이 같은 높이에 있으면 곧게 들어오게 (다른 점과 16px 이상 떨어질 때만)
      if (!['decision', 'ref'].includes(n.type)) {
        for (const e of list) {
          const sy = nodes.get(e.from).cy - n.cy;
          if (Math.abs(sy) <= n.h / 2 - 6 && list.every((o) => o === e || Math.abs(o.inDy - sy) >= 16)) e.inDy = sy;
        }
      }
    }
    // 나가는 쪽: 조건은 오른쪽 · 위 · 아래 꼭짓점, 나머지는 오른쪽 면
    for (const [id, list] of outs) {
      const a = nodes.get(id);
      const fw = list.filter((e) => !e.back && !e.hidden && nodes.has(e.to));
      if (a.type === 'decision') {
        fw.forEach((e, i) => {
          const dy = nodes.get(e.to).cy - a.cy;
          e.side = i === 0 ? 'right' : dy < -2 ? 'top' : 'bottom';
        });
        // 같은 꼭짓점으로 여러 선이 나가면 꼭짓점 둘레로 비켜 냄
        for (const side of ['top', 'bottom']) {
          const g = fw.filter((e) => e.side === side);
          g.forEach((e, i) => (e.exDx = (i - (g.length - 1) / 2) * 18));
        }
      } else {
        // 나가는 점은 선이 실제로 향하는 높이 순으로 (위로 가는 선이 위 점에서 나가야 서로 가로지르지 않음)
        const ty = (e) => nodes.get(e.to).cy + (e.inDy || 0);
        fw.sort((p, q) => ty(p) - ty(q) || p.idx - q.idx);
        const step = Math.min(30, (a.h - 8) / Math.max(1, fw.length));
        fw.forEach((e, i) => { e.side = 'right'; e.outDy = (i - (fw.length - 1) / 2) * step; });
      }
      // 출발 쪽 세로 통로: 선 글자가 첫 선분에 들어가도록 열 오른쪽 + 가장 긴 선 글자 뒤부터.
      // 위로 가는 선은 위 점일수록 안쪽, 아래로 가는 선은 아래 점일수록 안쪽 통로 → 한 도형에서 나간 선끼리 가로지르지 않음
      const right = fw.filter((e) => e.side === 'right');
      const sy = (e) => (a.type === 'decision' ? a.cy : a.cy + (e.outDy || 0)), ty2 = (e) => nodes.get(e.to).cy + (e.inDy || 0);
      const ups = right.filter((e) => ty2(e) < sy(e) - 0.5).sort((p, q) => sy(p) - sy(q));
      const downs = right.filter((e) => ty2(e) > sy(e) + 0.5).sort((p, q) => sy(q) - sy(p));
      const key = `${a.sec}|${a.col}|a`, start = gapUse.get(key) || 0, nCh = Math.max(ups.length, downs.length);
      gapUse.set(key, start + nCh);
      const base = a.cb.x + a.cb.w + (gapLab.get(`${a.sec}|${a.col}`) || 0) + 22; // 선 글자는 도형에서 12px 띄어 첫 선분 위에
      ups.forEach((e, i) => (e.chX = base + (start + i) * 12));
      downs.forEach((e, i) => (e.chX = base + (start + i) * 12));
    }
    let backK = 0;
    const toCut = new Set();
    for (const e of vis) {
      const a = nodes.get(e.from), b = nodes.get(e.to);
      const skip = [a, b];
      if (e.back) {
        const dir = hasZones && a.zone === 'u' ? -1 : 1;
        const S = outPort(a, dir < 0 ? 'top' : 'bottom');
        const E = inPort(b, 0);
        const between = [...nodes.values()].filter((n) => n.sec === a.sec && n.zone === a.zone && n.col >= b.col && n.col <= a.col);
        const k = backK++ % 3;
        const yE = dir < 0 ? Math.min(...between.map((n) => n.cy - n.h / 2)) - 14 - k * 7 : Math.max(...between.map((n) => n.cy + n.h / 2)) + 14 + k * 7;
        const xb = Math.min(gapBefore(b), E.x - 24);
        e.pts = [S, { x: S.x, y: yE }, { x: xb, y: yE }, { x: xb, y: E.y }, E];
        continue;
      }
      const S = outPort(a, e.side, e.outDy || 0, e.exDx || 0), E = inPort(b, e.inDy || 0);
      const cands = [];
      const xb = Math.min(gapBefore(b), E.x - 24); // 마지막 구간은 24px 이상 (화살표 머리가 꺾임을 덮지 않게)
      const rowTop = b.rowTop, rowBot = b.rowTop + b.rowH;
      if (e.side === 'top' || e.side === 'bottom') {
        cands.push([S, { x: S.x, y: E.y }, E]);
        const yc = e.side === 'bottom' ? a.cy + a.h / 2 + GY / 2 : a.cy - a.h / 2 - GY / 2;
        cands.push([S, { x: S.x, y: yc }, { x: xb, y: yc }, { x: xb, y: E.y }, E]);
      } else {
        if (Math.abs(S.y - E.y) < 0.5) cands.push([S, E]);
        const xa = e.chX != null ? Math.max(e.chX, S.x + 22) : Math.max(gapAfter(a), S.x + 22);
        cands.push([S, { x: xa, y: S.y }, { x: xa, y: E.y }, E]);
        cands.push([S, { x: xb, y: S.y }, { x: xb, y: E.y }, E]);
        for (const yc of [rowTop - GY / 2, rowBot + GY / 2]) cands.push([S, { x: xa, y: S.y }, { x: xa, y: yc }, { x: xb, y: yc }, { x: xb, y: E.y }, E]);
      }
      e.pts = cands.find((p) => !hits(p, skip)) || cands[cands.length - 1];
      if (e.pts.length > 4 && b.col - a.col >= 2 && !b.virtual && f.longLines === 'auto' && !opt.cut) toCut.add(e.idx);
    }
    // 그림을 가로지르는 긴 선이 있으면 그 선만 연결자로 끊어서 다시 그림 (markcont 흐름도 기준)
    if (toCut.size) return renderFlow(src, uid, { ...opt, cut: toCut });

    // 7) 그리기
    let svg = markers(uid, ['normal', 'yes', 'no']);
    if (hasZones) for (const lane of laneBoxes) {
      const lw = (stacked ? lane.right + 8 : W - M) - M; // 쌓은 섹션은 그 섹션 폭까지만
      svg += `<rect class="dg-lane u" x="${M}" y="${r1(lane.u0)}" width="${r1(lw)}" height="${r1(lane.mid - lane.u0)}" rx="8"/>`;
      svg += `<rect class="dg-lane s" x="${M}" y="${r1(lane.mid)}" width="${r1(lw)}" height="${r1(lane.s1 - lane.mid)}" rx="8"/>`;
      svg += `<line class="dg-lane-line" x1="${M}" x2="${r1(M + lw)}" y1="${r1(lane.mid)}" y2="${r1(lane.mid)}"/>`;
      const lx = M + LANE_HEAD / 2;
      svg += `<text class="dg-lane-label" transform="translate(${r1(lx)},${r1((lane.u0 + lane.mid) / 2)}) rotate(-90)">${esc(L('유저', 'User'))}</text>`;
      svg += `<text class="dg-lane-label" transform="translate(${r1(lx)},${r1((lane.mid + lane.s1) / 2)}) rotate(-90)">${esc(L('시스템', 'System'))}</text>`;
    }
    for (const [sec, b] of secBox) {
      if (!b.framed) continue;
      const y0 = b.y0, y1 = b.y1;
      svg += `<rect class="dg-sec${b.sub ? ' sub' : ''}" x="${r1(b.x0)}" y="${r1(y0)}" width="${r1(b.x1 - b.x0)}" height="${r1(y1 - y0)}" rx="10"/>`;
      svg += `<text class="dg-sec-label" x="${r1(b.x0 + 12)}" y="${r1(y0 + 17)}">${esc(secLabel(f, sec))}</text>`;
    }
    // 그래도 남는 교차는 가로 선이 반지름 5px 반원으로 넘어감 (합쳐지는 것이 아님을 보임)
    const verts = [];
    for (const e of vis) for (let i = 0; i < e.pts.length - 1; i++) {
      const p = e.pts[i], q = e.pts[i + 1];
      if (Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) > 0.5) verts.push({ e, x: p.x, y0: Math.min(p.y, q.y), y1: Math.max(p.y, q.y) });
    }
    const bridgePath = (e) => {
      let d = `M${r1(e.pts[0].x)},${r1(e.pts[0].y)}`;
      for (let i = 0; i < e.pts.length - 1; i++) {
        const p = e.pts[i], q = e.pts[i + 1];
        if (Math.abs(p.y - q.y) < 0.5 && Math.abs(p.x - q.x) > 20) {
          const dir = q.x > p.x ? 1 : -1, lo = Math.min(p.x, q.x) + 8, hi = Math.max(p.x, q.x) - 8;
          const xs = verts.filter((v) => v.e !== e && v.x > lo && v.x < hi && v.y0 < p.y - 1 && v.y1 > p.y + 1).map((v) => v.x).sort((m, n) => (m - n) * dir);
          let last = null;
          for (const x of xs) {
            if (last != null && Math.abs(x - last) < 12) continue;
            d += ` L${r1(x - 5 * dir)},${r1(p.y)} A5,5 0 0 ${dir > 0 ? 1 : 0} ${r1(x + 5 * dir)},${r1(p.y)}`;
            last = x;
          }
        }
        d += ` L${r1(q.x)},${r1(q.y)}`;
      }
      return d;
    };
    for (const e of vis) {
      const kind = e.kind || 'normal';
      svg += `<path class="dg-edge ${kind}" d="${bridgePath(e)}" marker-end="url(#${uid}-${kind})"/>`;
    }
    for (const n of nodes.values()) svg += flowNode(n, SKEW);
    const placed = [];
    const clash = (r) => placed.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) ||
      rects.some((q) => r.x0 < q.x1 - 5 && r.x1 > q.x0 + 5 && r.y0 < q.y1 - 5 && r.y1 > q.y0 + 5);
    for (const e of vis) {
      if (!e.label) continue;
      const [p0, p1] = e.pts;
      const lines = wrap(e.label, 130, 11, 600); // 줄이지 않고 다 보여 줌
      const w = Math.max(...lines.map((l) => textW(l, 11, 600))) + 10, h = lines.length * 14 + 3;
      const cands = [];
      if (Math.abs(p0.y - p1.y) < 0.5) {
        const dir = p1.x >= p0.x ? 1 : -1;
        for (const dy of [0, -19, 19, -38, 38, -57, 57]) for (const dx of [12, w + 16]) cands.push({ x: dir > 0 ? p0.x + dx : p0.x - dx - w, y: p0.y + dy - h / 2 });
      } else {
        const dir = p1.y > p0.y ? 1 : -1;
        for (const dy of [14, 34, 54, 74, 94, 114]) for (const dx of [-w / 2, 4, -w - 4]) cands.push({ x: p0.x + dx, y: p0.y + dir * dy - h / 2 });
      }
      // 겹치지 않는 자리가 없으면 가장 덜 겹치는 자리
      const area = (c) => {
        const r = { x0: c.x, x1: c.x + w, y0: c.y, y1: c.y + h };
        return [...placed, ...rects].reduce((sum, q) => sum + Math.max(0, Math.min(r.x1, q.x1) - Math.max(r.x0, q.x0)) * Math.max(0, Math.min(r.y1, q.y1) - Math.max(r.y0, q.y0)), 0);
      };
      const pick = cands.find((c) => !clash({ x0: c.x, x1: c.x + w, y0: c.y, y1: c.y + h })) || cands.reduce((m, c) => (area(c) < area(m) ? c : m), cands[0]);
      placed.push({ x0: pick.x, x1: pick.x + w, y0: pick.y, y1: pick.y + h });
      svg += `<g class="dg-label ${e.kind}"><title>${esc(e.label)}</title><rect x="${r1(pick.x)}" y="${r1(pick.y)}" width="${r1(w)}" height="${r1(h)}" rx="4"/>` +
        lines.map((l, i) => `<text x="${r1(pick.x + w / 2)}" y="${r1(pick.y + 8.5 + i * 14)}">${esc(l)}</text>`).join('') + '</g>';
    }
    for (const n of nodes.values()) {
      if (n.type === 'decision' && n.judge) svg += `<text class="dg-judge" x="${r1(n.cx + n.w / 4 + 6)}" y="${r1(n.cy + n.h / 4 + 12)}">${esc(L('판정: ', 'Rule: ') + n.judge)}</text>`;
    }
    return svgWrap('dg-flow', W, H, svg, L('흐름도', 'Flowchart'));
  }

  function flowNode(n, SKEW) {
    const x0 = n.cx - n.w / 2, y0 = n.cy - n.h / 2, x1 = x0 + n.w, y1 = y0 + n.h;
    let shape;
    switch (n.type) {
      case 'term': shape = `<rect class="dg-shape" x="${r1(x0)}" y="${r1(y0)}" width="${r1(n.w)}" height="${r1(n.h)}" rx="${r1(n.h / 2)}"/>`; break;
      case 'decision': shape = `<polygon class="dg-shape" points="${r1(n.cx)},${r1(y0)} ${r1(x1)},${r1(n.cy)} ${r1(n.cx)},${r1(y1)} ${r1(x0)},${r1(n.cy)}"/>`; break;
      case 'input': case 'output': shape = `<polygon class="dg-shape" points="${r1(x0 + SKEW)},${r1(y0)} ${r1(x1)},${r1(y0)} ${r1(x1 - SKEW)},${r1(y1)} ${r1(x0)},${r1(y1)}"/>`; break;
      case 'process': case 'sub': shape = `<rect class="dg-shape" x="${r1(x0)}" y="${r1(y0)}" width="${r1(n.w)}" height="${r1(n.h)}" rx="3"/>` +
        `<line class="dg-shape-line" x1="${r1(x0 + 9)}" x2="${r1(x0 + 9)}" y1="${r1(y0)}" y2="${r1(y1)}"/><line class="dg-shape-line" x1="${r1(x1 - 9)}" x2="${r1(x1 - 9)}" y1="${r1(y0)}" y2="${r1(y1)}"/>`; break;
      case 'ref': shape = `<circle class="dg-shape" cx="${r1(n.cx)}" cy="${r1(n.cy)}" r="${r1(n.w / 2)}"/>`; break;
      case 'goto': case 'ret': shape = `<polygon class="dg-shape" points="${r1(x0)},${r1(y0)} ${r1(x1 - 12)},${r1(y0)} ${r1(x1)},${r1(n.cy)} ${r1(x1 - 12)},${r1(y1)} ${r1(x0)},${r1(y1)}"/>`; break;
      default: shape = `<rect class="dg-shape" x="${r1(x0)}" y="${r1(y0)}" width="${r1(n.w)}" height="${r1(n.h)}" rx="4"/>`;
    }
    const cx = n.type === 'goto' || n.type === 'ret' ? n.cx - 6 : n.cx;
    const small = n.type === 'goto' || n.type === 'ret';
    const lines = [];
    let text = '';
    const top = n.cy - n.th / 2;
    if (n.codeText) { text += `<text class="dg-code" x="${r1(cx)}" y="${r1(top + 7.5)}">${esc(n.codeText)}</text>`; }
    n.whereLines.forEach((l, i) => { text += `<text class="dg-where" x="${r1(cx)}" y="${r1(top + (n.codeText ? 15 : 0) + 6.5 + i * 13)}">${esc(l)}</text>`; });
    const t0 = top + (n.codeText ? 15 : 0) + n.whereLines.length * 13;
    n.lines.forEach((l, i) => lines.push(`<text class="dg-text${small ? ' small' : ''}" x="${r1(cx)}" y="${r1(t0 + (i + 0.5) * 17)}">${esc(l)}</text>`));
    text += lines.join('');
    // 마우스를 올리면: 연결자는 도착 코드 · 문구 · 보기(섹션) · 선 글자를 줄마다
    const tip = n.virtual ? [n.code, n.text, n.where, n.label && L('선: ', 'Line: ') + n.label].filter(Boolean).join('\n') : [n.id, n.text].filter(Boolean).join(' — ');
    const data = n.virtual ? (n.target ? ` data-goto="${esc(n.target)}" role="link" tabindex="0"` : '') : ` data-code="${esc(n.id)}"`;
    return `<g class="dg-node ${n.type}${n.tint ? ' tinted tint-' + n.tint : ''}${n.missing ? ' missing' : ''}"${data}><title>${esc(tip)}</title>${shape}${text}</g>`;
  }

  /* =====================================================================
     주고받는 순서 (sequence)
     ===================================================================== */
  function renderSequence(src, uid, asMermaid) {
    const errs = [], parts = [], byName = new Map(), items = [], colors = [], stack = [];
    let number = false;
    const part = (name) => {
      name = name.trim().replace(/\s*\((유저|사용자|user|시스템|system)\)$/i, '');
      let p = byName.get(name);
      if (!p) { p = { name, kind: 's', i: parts.length }; parts.push(p); byName.set(name, p); }
      return p;
    };
    const BLOCK = { 조건: 'alt', alt: 'alt', 선택: 'opt', opt: 'opt', 반복: 'loop', loop: 'loop', 동시: 'par', par: 'par' };
    src.split('\n').forEach((raw, i) => {
      const line = raw.trim(), ln = i + 1;
      let m;
      if (!line || /^(%%|\/\/)/.test(line)) return;
      if ((m = line.match(/^(?:참여|participants?)\s*[:：]\s*(.+)$/i))) {
        for (const t of m[1].split(/[,，]/)) {
          const mm = t.trim().match(/^(.+?)\s*(?:\((유저|사용자|user|시스템|system)\))?$/i);
          if (!mm) continue;
          const p = part(mm[1]);
          if (mm[2]) p.kind = /유저|사용자|user/i.test(mm[2]) ? 'u' : 's';
        }
        return;
      }
      if (/^(번호|autonumber)$/i.test(line)) { number = true; return; }
      const c = parseColorLine(line, errs, ln);
      if (c) { colors.push(c); return; }
      if ((m = line.match(/^(조건|alt|선택|opt|반복|loop|동시|par)(?:\s+(.*))?$/i))) {
        const it = { t: 'open', kind: BLOCK[m[1].toLowerCase()], label: (m[2] || '').trim(), depth: stack.length, lo: Infinity, hi: -Infinity, ln };
        items.push(it); stack.push(it); return;
      }
      if ((m = line.match(/^(아니면|else|그리고|and)(?:\s+(.*))?$/i))) {
        if (!stack.length) { errs.push({ ln, msg: L('「아니면」 앞에 「조건」이 없습니다', '"else" without "alt"') }); return; }
        items.push({ t: 'else', label: (m[2] || '').trim(), block: stack[stack.length - 1] }); return;
      }
      if (/^(끝|end)$/i.test(line)) {
        if (!stack.length) { errs.push({ ln, msg: L('닫을 묶음이 없습니다 (「끝」이 하나 더 있음)', 'Extra "end"') }); return; }
        items.push({ t: 'close', block: stack.pop() }); return;
      }
      if ((m = line.match(/^(?:메모|note)\s+(.+?)\s*[:：]\s*(.+)$/i))) {
        items.push({ t: 'note', ps: m[1].split(/[,，]/).map((s) => part(s)), text: m[2].trim() }); return;
      }
      if ((m = line.match(/^(.+?)\s*(-->>|-->|->>|->|→|⇢)\s*(.+?)\s*(?:[:：]\s*(.*))?$/))) {
        items.push({ t: 'msg', a: part(m[1]), b: part(m[3]), text: (m[4] || '').trim(), reply: /-->|⇢/.test(m[2]), ln }); return;
      }
      errs.push({ ln, msg: L('알 수 없는 줄입니다 (예: 사용자 -> 앱: 로그인)', 'Unknown line (e.g. User -> App: Sign in)') });
    });
    for (const b of stack) errs.push({ ln: b.ln, msg: L('「끝」으로 닫지 않은 묶음이 있습니다', 'Block not closed with "end"') });
    if (!parts.length) errs.push({ msg: L('주고받는 내용이 없습니다', 'No messages') });
    if (errs.length) fail(errs);
    applyColors(colors, (n) => byName.get(n));
    if (asMermaid) return seqMermaid(parts, items, number);

    // 범위: 묶음마다 안쪽에 나오는 참여자의 왼쪽 · 오른쪽 끝
    const open = [];
    for (const it of items) {
      if (it.t === 'open') open.push(it);
      else if (it.t === 'close') open.splice(open.indexOf(it.block), 1);
      else if (it.t === 'msg' || it.t === 'note') {
        const idx = it.t === 'msg' ? [it.a.i, it.b.i] : it.ps.map((p) => p.i);
        for (const b of open) { b.lo = Math.min(b.lo, ...idx); b.hi = Math.max(b.hi, ...idx); }
      }
    }
    const HH = 36;
    parts.forEach((p) => (p.w = Math.max(84, textW(p.name, 13, 600) + 30)));
    const need = parts.map((p, i) => (i < parts.length - 1 ? p.w / 2 + parts[i + 1].w / 2 + 40 : 0));
    let num = 0, selfExtra = 0;
    for (const it of items) {
      if (it.t !== 'msg') continue;
      it.n = ++num;
      const lw = textW(it.text, 12.5) + (number ? 26 : 0) + 30;
      const i = Math.min(it.a.i, it.b.i), j = Math.max(it.a.i, it.b.i);
      if (i === j) { if (i < parts.length - 1) need[i] = Math.max(need[i], lw + 44); else selfExtra = Math.max(selfExtra, lw + 30); continue; }
      let span = 0;
      for (let k = i; k < j; k++) span += need[k];
      if (span < lw) for (let k = i; k < j; k++) need[k] += (lw - span) / (j - i);
    }
    const depthMax = Math.max(0, ...items.filter((it) => it.t === 'open').map((it) => it.depth + 1));
    const PADX = 20 + depthMax * 10;
    const cx = [PADX + parts[0].w / 2];
    for (let k = 1; k < parts.length; k++) cx[k] = cx[k - 1] + need[k - 1];
    let W = cx[parts.length - 1] + parts[parts.length - 1].w / 2 + PADX + selfExtra;
    for (const it of items) {
      if (it.t !== 'note') continue;
      it.lines = wrap(it.text, 220, 12);
      it.w = Math.max(...it.lines.map((l) => textW(l, 12))) + 20;
    }
    let y = 12 + HH + 22;
    for (const it of items) {
      if (it.t === 'msg') { it.y = y + 14; y += it.a === it.b ? 52 : 40; }
      else if (it.t === 'open') { it.y0 = y; y += 32; }
      else if (it.t === 'else') { it.y = y; y += 30; }
      else if (it.t === 'close') { it.block.y1 = y + 2; y += 18; }
      else if (it.t === 'note') { it.y = y; it.h = it.lines.length * 16 + 12; y += it.h + 14; }
    }
    const H = y + 10;

    let svg = markers(uid, ['normal']);
    // 묶음 틀
    for (const it of items) {
      if (it.t !== 'open') continue;
      const lo = isFinite(it.lo) ? it.lo : 0, hi = isFinite(it.hi) ? it.hi : parts.length - 1;
      const inset = it.depth * 10;
      it.x0 = cx[lo] - parts[lo].w / 2 - 12 + inset;
      it.x1 = Math.max(cx[hi] + parts[hi].w / 2 + 12 - inset, it.x0 + 160);
      if (it.x1 > W - 6) W = it.x1 + 6;
      const name = { alt: L('조건', 'alt'), opt: L('선택', 'opt'), loop: L('반복', 'loop'), par: L('동시', 'par') }[it.kind];
      const tw = textW(name, 11.5, 700) + 16;
      svg += `<g class="dg-block ${it.kind}"><rect class="dg-block-frame" x="${r1(it.x0)}" y="${r1(it.y0)}" width="${r1(it.x1 - it.x0)}" height="${r1(it.y1 - it.y0)}" rx="6"/>` +
        `<path class="dg-block-tab" d="M${r1(it.x0)},${r1(it.y0 + 20)} L${r1(it.x0)},${r1(it.y0 + 6)} Q${r1(it.x0)},${r1(it.y0)} ${r1(it.x0 + 6)},${r1(it.y0)} L${r1(it.x0 + tw + 6)},${r1(it.y0)} L${r1(it.x0 + tw + 6)},${r1(it.y0 + 12)} L${r1(it.x0 + tw - 2)},${r1(it.y0 + 20)} Z"/>` +
        `<text class="dg-block-name" x="${r1(it.x0 + 8)}" y="${r1(it.y0 + 10.5)}">${esc(name)}</text>` +
        (it.label ? `<text class="dg-block-label" x="${r1(it.x0 + tw + 14)}" y="${r1(it.y0 + 10.5)}">[${esc(it.label)}]</text>` : '') + '</g>';
    }
    for (const it of items) {
      if (it.t !== 'else') continue;
      const b = it.block;
      svg += `<line class="dg-block-else" x1="${r1(b.x0)}" x2="${r1(b.x1)}" y1="${r1(it.y)}" y2="${r1(it.y)}"/>`;
      if (it.label) svg += `<text class="dg-block-label" x="${r1(b.x0 + 10)}" y="${r1(it.y + 13)}">[${esc(it.label)}]</text>`;
    }
    // 생명선 · 머리
    parts.forEach((p, k) => {
      svg += `<line class="dg-life" x1="${r1(cx[k])}" x2="${r1(cx[k])}" y1="${12 + HH}" y2="${r1(H - 8)}"/>`;
    });
    parts.forEach((p, k) => {
      const x0 = cx[k] - p.w / 2;
      svg += `<g class="dg-node dg-actor ${p.kind === 'u' ? 'user' : 'system'}${p.tint ? ' tinted tint-' + p.tint : ''}"><rect class="dg-shape" x="${r1(x0)}" y="12" width="${r1(p.w)}" height="${HH}" rx="${p.kind === 'u' ? HH / 2 : 6}"/>` +
        `<text class="dg-text strong" x="${r1(cx[k])}" y="${12 + HH / 2}">${esc(p.name)}</text></g>`;
    });
    // 메시지 · 메모
    for (const it of items) {
      if (it.t === 'msg') {
        const xa = cx[it.a.i], xb = cx[it.b.i];
        const cls = `dg-edge normal${it.reply ? ' reply' : ''}`;
        const mk = it.reply ? `url(#${uid}-open)` : `url(#${uid}-normal)`;
        const badge = number ? `<g class="dg-num"><circle cx="0" cy="0" r="8"/><text x="0" y="0">${it.n}</text></g>` : '';
        if (it.a === it.b) {
          svg += `<path class="${cls}" d="M${r1(xa)},${r1(it.y - 6)} L${r1(xa + 36)},${r1(it.y - 6)} L${r1(xa + 36)},${r1(it.y + 14)} L${r1(xa + 2)},${r1(it.y + 14)}" marker-end="${mk}"/>`;
          const tx = xa + 44;
          if (badge) svg += badge.replace('<g class="dg-num">', `<g class="dg-num" transform="translate(${r1(tx + 8)},${r1(it.y + 4)})">`);
          svg += `<text class="dg-msg" x="${r1(tx + (number ? 20 : 0))}" y="${r1(it.y + 4)}">${esc(it.text)}</text>`;
        } else {
          const dir = xb > xa ? 1 : -1;
          svg += `<path class="${cls}" d="M${r1(xa)},${r1(it.y)} L${r1(xb - dir * 1.5)},${r1(it.y)}" marker-end="${mk}"/>`;
          const mid = (xa + xb) / 2;
          const tw = textW(it.text, 12.5);
          const total = tw + (number ? 22 : 0);
          if (badge) svg += badge.replace('<g class="dg-num">', `<g class="dg-num" transform="translate(${r1(mid - total / 2 + 8)},${r1(it.y - 11)})">`);
          svg += `<text class="dg-msg" x="${r1(mid - total / 2 + (number ? 22 : 0))}" y="${r1(it.y - 11)}">${esc(it.text)}</text>`;
        }
      } else if (it.t === 'note') {
        const idx = it.ps.map((p) => p.i);
        const lo = Math.min(...idx), hi = Math.max(...idx);
        const cxm = (cx[lo] + cx[hi]) / 2;
        const w = Math.max(it.w, lo === hi ? 0 : cx[hi] - cx[lo] + 60);
        svg += `<g class="dg-note"><rect x="${r1(cxm - w / 2)}" y="${r1(it.y)}" width="${r1(w)}" height="${r1(it.h)}" rx="4"/>` +
          multiText(it.lines, cxm, it.y + it.h / 2, 16, 'dg-note-text') + '</g>';
      }
    }
    return svgWrap('dg-seq', W, H, svg, L('주고받는 순서', 'Sequence'));
  }

  /* =====================================================================
     상태 변화 (state)
     ===================================================================== */
  function renderState(src, uid, asMermaid) {
    const errs = [], states = new Map(), edges = [], groups = [], colors = [];
    const gstack = [];
    const START = '\u0000start', END = '\u0000end';
    const state = (name) => {
      name = name.trim();
      let s = states.get(name);
      if (!s) { s = { id: name, name, desc: '', i: states.size }; states.set(name, s); if (gstack.length) gstack[gstack.length - 1].members.add(name); }
      return s;
    };
    const isStart = (t) => /^(\[\*\]|●|시작|start)$/i.test(t.trim());
    const isEnd = (t) => /^(\[\*\]|◉|끝|end)$/i.test(t.trim());
    let usesStart = false, usesEnd = false;
    src.split('\n').forEach((raw, i) => {
      const line = raw.trim(), ln = i + 1;
      let m;
      if (!line || /^(%%|\/\/)/.test(line)) return;
      if ((m = line.match(/^(?:묶음|group)\s+(.+?)\s*\{$/i))) { const g = { name: m[1].trim(), members: new Set() }; groups.push(g); gstack.push(g); return; }
      if (line === '}') { if (!gstack.pop()) errs.push({ ln, msg: L('닫을 묶음이 없습니다', 'Nothing to close') }); return; }
      const c = parseColorLine(line, errs, ln);
      if (c) { colors.push(c); return; }
      if ((m = line.match(/^(.+?)\s*(-->|->|→)\s*(.+?)\s*(?:[:：]\s*(.*))?$/))) {
        const a = isStart(m[1]) ? START : state(m[1]).id;
        const b = isEnd(m[3]) ? END : state(m[3]).id;
        if (a === START) usesStart = true;
        if (b === END) usesEnd = true;
        edges.push({ a, b, label: (m[4] || '').trim(), kind: kindOfLabel(m[4]) });
        return;
      }
      if ((m = line.match(/^([^:：]+?)\s*[:：]\s*(.+)$/))) { state(m[1]).desc = m[2].trim(); return; }
      errs.push({ ln, msg: L('알 수 없는 줄입니다 (예: 작성중 -> 검토중: 제출)', 'Unknown line (e.g. Draft -> Review: submit)') });
    });
    if (gstack.length) errs.push({ msg: L('「}」로 닫지 않은 묶음이 있습니다', 'Group not closed with "}"') });
    if (!states.size) errs.push({ msg: L('상태가 하나도 없습니다', 'No states') });
    if (errs.length) fail(errs);
    applyColors(colors, (n) => states.get(n));
    if (asMermaid) return stateMermaid(states, edges, groups, START, END);

    const nodes = new Map();
    if (usesStart) nodes.set(START, { id: START, pseudo: 'start', w: 18, h: 18 });
    for (const s of states.values()) nodes.set(s.id, s);
    if (usesEnd) nodes.set(END, { id: END, pseudo: 'end', w: 22, h: 22 });
    const outs = new Map();
    for (const e of edges) { if (!outs.has(e.a)) outs.set(e.a, []); outs.get(e.a).push(e); }
    // 되돌아가는 연결 찾기 + 가장 긴 경로로 열 정하기
    const st = new Map();
    const visit = (id) => {
      st.set(id, 1);
      for (const e of outs.get(id) || []) {
        if (e.b === END) continue;
        if (e.b === id || st.get(e.b) === 1) e.back = true;
        else if (!st.get(e.b)) visit(e.b);
      }
      st.set(id, 2);
    };
    if (usesStart) visit(START);
    for (const id of nodes.keys()) if (!st.get(id) && id !== END) visit(id);
    const rank = new Map([...nodes.keys()].map((k) => [k, 0]));
    for (let k = 0; k <= nodes.size; k++) {
      let ch = false;
      for (const e of edges) {
        if (e.back || e.b === END) continue;
        const r = rank.get(e.a) + 1;
        if (r > rank.get(e.b)) { rank.set(e.b, r); ch = true; }
      }
      if (!ch) break;
    }
    if (usesEnd) rank.set(END, Math.max(...[...rank.entries()].filter(([k]) => k !== END).map(([, v]) => v)) + 1);
    for (const s of states.values()) {
      const nw = textW(s.name, 13, 600), dw = s.desc ? Math.min(textW(s.desc, 11.5), 200) : 0;
      s.descLines = s.desc ? wrap(s.desc, 200, 11.5) : [];
      s.w = Math.max(84, nw + 30, dw + 26);
      s.h = 38 + s.descLines.length * 15;
    }
    const byRank = [];
    for (const n of nodes.values()) { const r = rank.get(n.id); (byRank[r] = byRank[r] || []).push(n); }
    const rowH = [];
    byRank.forEach((list) => list.forEach((n, k) => { n.slot = k; rowH[k] = Math.max(rowH[k] || 0, n.h); }));
    // 칸 사이 폭: 그 사이를 지나는 화살표 글자가 들어가게
    const gap = byRank.map(() => 70);
    for (const e of edges) {
      if (e.back || !e.label) continue;
      const r = rank.get(e.a);
      if (rank.get(e.b) === r + 1) gap[r] = Math.max(gap[r], textW(e.label, 11, 600) + 36);
    }
    const M = 16;
    const colX = [];
    let x = M;
    byRank.forEach((list, r) => {
      const w = Math.max(...list.map((n) => n.w));
      colX[r] = { x, w };
      x += w + (gap[r] || 70);
    });
    const W0 = x - (gap[byRank.length - 1] || 70) + M;
    const GY = 30;
    const rowY = [];
    const hasGroups = groups.length > 0;
    let y = M + (hasGroups ? 24 : 4);
    rowH.forEach((h, k) => { rowY[k] = y; y += h + GY; });
    let H = y - GY + M;
    for (const n of nodes.values()) {
      const c = colX[rank.get(n.id)];
      n.cx = c.x + c.w / 2;
      n.cy = rowY[n.slot] + rowH[n.slot] / 2;
    }
    const left = (n) => ({ x: n.cx - n.w / 2, y: n.cy });
    const right = (n) => ({ x: n.cx + n.w / 2, y: n.cy });
    let svg = markers(uid, ['normal', 'yes', 'no']);
    // 묶음 틀
    for (const g of groups) {
      const ms = [...g.members].map((id) => nodes.get(id)).filter(Boolean);
      if (!ms.length) continue;
      const x0 = Math.min(...ms.map((n) => n.cx - n.w / 2)) - 14, x1 = Math.max(...ms.map((n) => n.cx + n.w / 2)) + 14;
      const y0 = Math.min(...ms.map((n) => n.cy - n.h / 2)) - 26, y1 = Math.max(...ms.map((n) => n.cy + n.h / 2)) + 12;
      svg += `<rect class="dg-sec" x="${r1(x0)}" y="${r1(y0)}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" rx="10"/><text class="dg-sec-label" x="${r1(x0 + 10)}" y="${r1(y0 + 13)}">${esc(g.name)}</text>`;
    }
    // 화살표
    let backK = 0;
    const labels = [];
    for (const e of edges) {
      const a = nodes.get(e.a), b = nodes.get(e.b);
      let pts;
      if (e.a === e.b) {
        const top = a.cy - a.h / 2;
        pts = [{ x: a.cx + a.w / 2, y: a.cy - 6 }, { x: a.cx + a.w / 2 + 18, y: a.cy - 6 }, { x: a.cx + a.w / 2 + 18, y: top - 14 }, { x: a.cx + 10, y: top - 14 }, { x: a.cx + 10, y: top }];
        if (e.label) labels.push([e.label, a.cx + a.w / 2 + 4, top - 14, e.kind, 'start']);
      } else if (e.back || rank.get(e.b) <= rank.get(e.a)) {
        const lo = Math.min(rank.get(e.a), rank.get(e.b)), hi = Math.max(rank.get(e.a), rank.get(e.b));
        const between = [...nodes.values()].filter((n) => rank.get(n.id) >= lo && rank.get(n.id) <= hi);
        const k = backK++;
        const yb = Math.max(...between.map((n) => n.cy + n.h / 2)) + 18 + k * 14;
        H = Math.max(H, yb + 22);
        pts = [{ x: a.cx, y: a.cy + a.h / 2 }, { x: a.cx, y: yb }, { x: b.cx + 8, y: yb }, { x: b.cx + 8, y: b.cy + b.h / 2 }];
        if (e.label) labels.push([e.label, (a.cx + b.cx) / 2, yb, e.kind, 'middle']);
      } else {
        const S = right(a), E = left(b);
        if (Math.abs(S.y - E.y) < 0.5) {
          pts = [S, E];
          if (e.label) labels.push([e.label, (S.x + E.x) / 2, S.y - 12, e.kind, 'middle']);
        } else {
          const ra = rank.get(e.a);
          const xm = colX[ra].x + colX[ra].w + (gap[ra] || 70) / 2;
          pts = [S, { x: xm, y: S.y }, { x: xm, y: E.y }, E];
          if (e.label) labels.push([e.label, (xm + E.x) / 2, E.y - 12, e.kind, 'middle']);
        }
      }
      svg += `<path class="dg-edge ${e.kind}" d="${pathD(pts)}" marker-end="url(#${uid}-${e.kind})"/>`;
    }
    for (const n of nodes.values()) {
      if (n.pseudo === 'start') { svg += `<circle class="dg-start" cx="${r1(n.cx)}" cy="${r1(n.cy)}" r="9"/>`; continue; }
      if (n.pseudo === 'end') { svg += `<circle class="dg-end-ring" cx="${r1(n.cx)}" cy="${r1(n.cy)}" r="11"/><circle class="dg-start" cx="${r1(n.cx)}" cy="${r1(n.cy)}" r="6"/>`; continue; }
      const x0 = n.cx - n.w / 2, y0 = n.cy - n.h / 2;
      svg += `<g class="dg-node state${n.tint ? ' tinted tint-' + n.tint : ''}"><rect class="dg-shape" x="${r1(x0)}" y="${r1(y0)}" width="${r1(n.w)}" height="${r1(n.h)}" rx="12"/>`;
      if (n.descLines.length) {
        svg += `<text class="dg-text strong" x="${r1(n.cx)}" y="${r1(y0 + 19)}">${esc(n.name)}</text>`;
        svg += `<line class="dg-shape-line" x1="${r1(x0)}" x2="${r1(x0 + n.w)}" y1="${r1(y0 + 34)}" y2="${r1(y0 + 34)}"/>`;
        n.descLines.forEach((l, i) => (svg += `<text class="dg-text small muted" x="${r1(n.cx)}" y="${r1(y0 + 44 + i * 15)}">${esc(l)}</text>`));
      } else svg += `<text class="dg-text strong" x="${r1(n.cx)}" y="${r1(n.cy)}">${esc(n.name)}</text>`;
      svg += '</g>';
    }
    for (const l of labels) svg += labelBox(...l);
    return svgWrap('dg-state', W0, H, svg, L('상태 변화', 'State diagram'));
  }

  /* =====================================================================
     일정표 (timeline)
     ===================================================================== */
  const DAY = 86400000;
  const parseDate = (s) => { const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; };
  const md = (t) => { const d = new Date(t); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`; };
  function renderTimeline(src, uid, asMermaid) {
    const errs = [], sections = [], tasks = new Map(), colors = [];
    let title = '', today = null, showToday = true, cur = null, prevEnd = null;
    const now = new Date();
    const todayDefault = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    src.split('\n').forEach((raw, i) => {
      const line = raw.trim(), ln = i + 1;
      let m;
      if (!line || /^(%%|\/\/)/.test(line)) return;
      if ((m = line.match(/^(?:제목|title)\s*[:：]?\s+(.+)$/i))) { title = m[1].trim(); return; }
      if ((m = line.match(/^(?:오늘|today)(?:\s*[:：]?\s*(.+))?$/i))) {
        const v = (m[1] || '').trim();
        if (/^(숨기기|hide|없음|off)$/i.test(v)) showToday = false;
        else if (v && parseDate(v) != null) today = parseDate(v);
        else if (v) errs.push({ ln, msg: L('날짜는 2026-11-06 처럼 씁니다', 'Write dates like 2026-11-06') });
        return;
      }
      if ((m = line.match(/^(?:묶음|section|#{1,6})\s*[:：]?\s*(.+)$/i))) { cur = { name: m[1].trim(), tasks: [] }; sections.push(cur); return; }
      const c = parseColorLine(line, errs, ln);
      if (c) { colors.push(c); return; }
      if ((m = line.match(/^(.+?)\s*[:：]\s*(.*)$/))) {
        let name = m[1].trim();
        const t = { name, ln, done: false, active: false, crit: false, milestone: false };
        if (/^◆\s*/.test(name)) { t.milestone = true; t.name = name.replace(/^◆\s*/, ''); }
        let start = null, end = null, days = null, dep = null;
        for (const fRaw of m[2].split(/[,，]/)) {
          const fv = fRaw.trim();
          let mm;
          if (!fv) continue;
          if (parseDate(fv) != null) { if (start == null) start = parseDate(fv); else end = parseDate(fv); }
          else if ((mm = fv.match(/^~\s*(\S+)$/)) && parseDate(mm[1]) != null) end = parseDate(mm[1]);
          else if ((mm = fv.match(/^(\d+(?:\.\d+)?)\s*(일|d|days?|주|w|weeks?|개월|달|m|months?)$/i))) {
            const v = parseFloat(mm[1]);
            days = /^(주|w|week)/i.test(mm[2]) ? v * 7 : /^(개월|달|m|month)/i.test(mm[2]) ? v * 30 : v;
          } else if ((mm = fv.match(/^(.+?)\s*(뒤|후|다음)$/)) || (mm = fv.match(/^after\s+(.+)$/i))) dep = mm[1].trim();
          else if (/^(완료|끝남|done)$/i.test(fv)) t.done = true;
          else if (/^(진행|진행\s*중|active|doing)$/i.test(fv)) t.active = true;
          else if (/^(중요|crit|critical)$/i.test(fv)) t.crit = true;
          else if (/^(마일스톤|milestone|◆)$/i.test(fv)) t.milestone = true;
          else errs.push({ ln, msg: L(`알 수 없는 값: ${fv}`, `Unknown value: ${fv}`) });
        }
        if (start == null && dep) {
          const d = tasks.get(dep);
          if (!d) errs.push({ ln, msg: L(`「${dep}」 일을 앞에서 찾지 못했습니다`, `Task "${dep}" not found above`) });
          else start = d.end;
        }
        if (start == null) start = prevEnd != null ? prevEnd : (today != null ? today : todayDefault);
        if (end != null) days = Math.round((end - start) / DAY) + 1;
        if (days == null) days = t.milestone ? 0 : 1;
        if (t.milestone) days = 0;
        t.start = start; t.days = days; t.end = start + days * DAY;
        prevEnd = t.milestone ? start : t.end;
        if (!cur) { cur = { name: '', tasks: [] }; sections.push(cur); }
        cur.tasks.push(t);
        tasks.set(t.name, t);
        return;
      }
      errs.push({ ln, msg: L('일은 「이름: 2026-11-02, 5일」 처럼 씁니다', 'Write tasks like "Name: 2026-11-02, 5d"') });
    });
    if (!tasks.size) errs.push({ msg: L('일정이 하나도 없습니다', 'No tasks') });
    if (errs.length) fail(errs);
    applyColors(colors, (n) => tasks.get(n) || sections.find((s) => s.name === n));
    if (asMermaid) return timelineMermaid(title, sections, showToday);
    sections.forEach((s, i) => { if (!s.tint) s.tint = PALETTE[i % PALETTE.length]; });
    const all = [...tasks.values()];
    const t0 = Math.min(...all.map((t) => t.start)) - DAY;
    const t1 = Math.max(...all.map((t) => Math.max(t.end, t.start + DAY))) + DAY;
    const days = Math.round((t1 - t0) / DAY);
    const dayPx = Math.max(4, Math.min(34, Math.floor(760 / days)));
    const nameW = Math.min(240, Math.max(120, ...all.map((t) => textW(t.name, 13) + 34), ...sections.map((s) => textW(s.name, 12.5, 700) + 24)));
    const M = 12, TITLE = title ? 30 : 0, AXIS = 44, ROW = 30, SEC = 26;
    const X = (t) => M + nameW + ((t - t0) / DAY) * dayPx;
    let rowsH = 0;
    for (const s of sections) rowsH += (s.name ? SEC : 0) + s.tasks.length * ROW;
    const W = M * 2 + nameW + days * dayPx;
    const top = M + TITLE + AXIS;
    const H = top + rowsH + M;
    let svg = markers(uid, []);
    if (title) svg += `<text class="dg-title" x="${M}" y="${M + 12}">${esc(title)}</text>`;
    // 주말 · 눈금
    for (let d = 0; d < days; d++) {
      const t = t0 + d * DAY, dt = new Date(t), wd = dt.getUTCDay();
      const x0 = X(t);
      if (dayPx >= 8 && (wd === 0 || wd === 6)) svg += `<rect class="dg-weekend" x="${r1(x0)}" y="${top - 20}" width="${dayPx}" height="${r1(rowsH + 20)}"/>`;
      if (dt.getUTCDate() === 1 || d === 0) {
        const label = window.LANG === 'en' ? dt.toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : `${dt.getUTCFullYear()}년 ${dt.getUTCMonth() + 1}월`;
        svg += `<text class="dg-axis month" x="${r1(x0 + 3)}" y="${r1(M + TITLE + 12)}">${esc(label)}</text>`;
        if (d) svg += `<line class="dg-grid strong" x1="${r1(x0)}" x2="${r1(x0)}" y1="${r1(M + TITLE + 2)}" y2="${r1(top + rowsH)}"/>`;
      }
      const tick = dayPx >= 18 ? true : dayPx >= 6 ? wd === 1 : dt.getUTCDate() === 1;
      if (tick) {
        svg += `<line class="dg-grid" x1="${r1(x0)}" x2="${r1(x0)}" y1="${top - 20}" y2="${r1(top + rowsH)}"/>`;
        svg += `<text class="dg-axis${dayPx >= 18 ? ' mid' : ''}" x="${r1(x0 + (dayPx >= 18 ? dayPx / 2 : 3))}" y="${top - 8}">${dayPx >= 18 ? dt.getUTCDate() : md(t)}</text>`;
      }
    }
    svg += `<line class="dg-grid strong" x1="${M + nameW}" x2="${r1(W - M)}" y1="${top}" y2="${top}"/>`;
    let y = top;
    for (const s of sections) {
      if (s.name) {
        svg += `<rect class="dg-tl-sec tint-${s.tint}" x="${M}" y="${r1(y + 2)}" width="${r1(W - M * 2)}" height="${SEC - 4}" rx="5"/>`;
        svg += `<text class="dg-tl-sec-label" x="${M + 10}" y="${r1(y + SEC / 2)}">${esc(s.name)}</text>`;
        y += SEC;
      }
      for (const t of s.tasks) {
        const cy = y + ROW / 2;
        const tint = t.tint || s.tint;
        svg += `<text class="dg-tl-name${t.done ? ' done' : ''}" x="${M + 14}" y="${r1(cy)}">${t.done ? '✓ ' : ''}${esc(t.name)}</text>`;
        const range = t.milestone ? md(t.start) : `${md(t.start)} – ${md(t.end - DAY)} (${t.days}${L('일', 'd')})`;
        if (t.milestone) {
          const x0 = X(t.start);
          svg += `<g class="dg-ms tint-${tint}${t.crit ? ' crit' : ''}"><title>${esc(t.name + ' · ' + range)}</title><polygon points="${r1(x0)},${r1(cy - 8)} ${r1(x0 + 8)},${r1(cy)} ${r1(x0)},${r1(cy + 8)} ${r1(x0 - 8)},${r1(cy)}"/></g>`;
          svg += `<text class="dg-tl-dur" x="${r1(x0 + 13)}" y="${r1(cy)}">${md(t.start)}</text>`;
        } else {
          const x0 = X(t.start), w = Math.max(3, t.days * dayPx);
          svg += `<g class="dg-bar tint-${tint}${t.done ? ' done' : ''}${t.active ? ' active' : ''}${t.crit ? ' crit' : ''}"><title>${esc(t.name + ' · ' + range)}</title><rect x="${r1(x0)}" y="${r1(cy - 9)}" width="${r1(w)}" height="18" rx="4"/></g>`;
          const dur = `${t.days}${L('일', 'd')}`;
          if (textW(dur, 11, 600) + 10 < w) svg += `<text class="dg-tl-dur in" x="${r1(x0 + w / 2)}" y="${r1(cy)}">${dur}</text>`;
          else svg += `<text class="dg-tl-dur" x="${r1(x0 + w + 5)}" y="${r1(cy)}">${dur}</text>`;
        }
        y += ROW;
      }
    }
    const td = today != null ? today : todayDefault;
    if (showToday && td >= t0 && td <= t1) {
      const xt = X(td) + dayPx / 2;
      svg += `<line class="dg-today" x1="${r1(xt)}" x2="${r1(xt)}" y1="${top - 22}" y2="${r1(top + rowsH)}"/>`;
      svg += `<text class="dg-today-label" x="${r1(xt)}" y="${top - 26}">${esc(L('오늘', 'Today'))}</text>`;
    }
    return svgWrap('dg-timeline', W, H, svg, title || L('일정표', 'Timeline'));
  }

  /* =====================================================================
     Mermaid 로 바꾸기 — 다른 뷰어(GitHub · Obsidian 등)에서도 그림이 그려지도록
     ===================================================================== */
  const MTINT = { blue: 'fill:#dbeafe,stroke:#2563eb', green: 'fill:#dcfce7,stroke:#16a34a', amber: 'fill:#fef3c7,stroke:#d97706',
    red: 'fill:#fee2e2,stroke:#dc2626', purple: 'fill:#ede9fe,stroke:#7c3aed', gray: 'fill:#f1f5f9,stroke:#64748b' };
  const mq = (s) => '"' + String(s).replace(/"/g, '#quot;') + '"';
  const mtext = (s) => String(s).replace(/[#;]/g, (c) => (c === '#' ? '#35;' : '#59;'));
  function tintLines(list, idOf) {
    const by = {};
    for (const x of list) if (x.tint) (by[x.tint] = by[x.tint] || []).push(idOf(x));
    const out = [];
    for (const [t, ids] of Object.entries(by)) out.push(`  classDef t_${t} ${MTINT[t]}`, `  class ${ids.join(',')} t_${t}`);
    return out;
  }

  function flowMermaid(src, opt = {}) {
    const errs = [];
    const f = parseFlow(src, errs, opt);
    applyView(f, errs);
    if (!f.nodes.size) errs.push({ msg: L('도형이 하나도 없습니다', 'No nodes') });
    if (errs.length) fail(errs);
    const { nodes, edges } = f;
    const mids = new Map(), used = new Set();
    for (const id of nodes.keys()) {
      let m = 'n_' + id.replace(/[^A-Za-z0-9]/g, '_'), k = 2;
      while (used.has(m)) m = 'n_' + id.replace(/[^A-Za-z0-9]/g, '_') + '_' + k++;
      used.add(m); mids.set(id, m);
    }
    const hasZones = [...nodes.values()].some((n) => n.zone);
    const secs = [];
    for (const n of nodes.values()) { n.sec = flowSec(n); if (!secs.includes(n.sec)) secs.push(n.sec); }
    const framed = (s) => !!s && (f.secNames.has(s) || f.explicit.has(s) || secs.length > 1);
    const label = (n) => {
      const parts = [];
      if (!f.hideCodes && n.type !== 'ref') parts.push('<b>' + (n.type === 'sub' ? '▸ ' : '') + n.id + '</b>');
      if (n.text) parts.push(n.text);
      if (n.type === 'decision' && n.judge) parts.push('<i>' + L('판정: ', 'Rule: ') + n.judge + '</i>');
      return mq(parts.join('<br>') || n.id);
    };
    const shape = (n) => {
      const l = label(n);
      switch (n.type) {
        case 'term': return `([${l}])`;
        case 'decision': return `{${l}}`;
        case 'input': case 'output': return `[/${l}/]`;
        case 'process': case 'sub': return `[[${l}]]`;
        case 'ref': return `((${l}))`;
        default: return `[${l}]`;
      }
    };
    const out = ['flowchart LR'];
    if (hasZones) out.push('  %% ' + L('파란 상자 = 유저 구역, 회색 상자 = 시스템 구역 (markcont 흐름도에서 바꿈)', 'Blue boxes = user zone, gray boxes = system zone (converted from a markcont flowchart)'));
    secs.forEach((sec, i) => {
      const list = [...nodes.values()].filter((n) => n.sec === sec);
      const fr = framed(sec);
      if (fr) out.push(`  subgraph s${i + 1}[${mq(secLabel(f, sec))}]`);
      for (const n of list) out.push(`${fr ? '    ' : '  '}${mids.get(n.id)}${shape(n)}`);
      if (fr) out.push('  end');
    });
    const ext = new Map();
    const styles = [];
    let k = 0;
    for (const e of edges) {
      const a = mids.get(e.from);
      let b = mids.get(e.to);
      if (!b) {
        b = ext.get(e.to);
        if (!b) {
          const w = whereOf(f, e.to, opt.ctx);
          b = 'x' + (ext.size + 1); ext.set(e.to, b);
          out.push(`  ${b}>${mq('→ ' + e.to + (w.where ? ' · ' + w.where : '') + (w.text ? ' ' + w.text : ''))}]`);
        }
      }
      const from = nodes.get(e.from), to = nodes.get(e.to);
      const dashed = from.type === 'sub' && to && to.sec !== from.sec;
      out.push(`  ${a} ${dashed ? '-.->' : '-->'}${e.label ? '|' + mq(e.label) + '|' : ''} ${b}`);
      if (e.kind === 'yes') styles.push(`  linkStyle ${k} stroke:#2563eb,color:#2563eb`);
      if (e.kind === 'no') styles.push(`  linkStyle ${k} stroke:#dc2626,color:#dc2626`);
      k++;
    }
    out.push(...styles);
    if (hasZones) {
      const us = [...nodes.values()].filter((n) => n.zone === 'u').map((n) => mids.get(n.id));
      const ss = [...nodes.values()].filter((n) => n.zone !== 'u').map((n) => mids.get(n.id));
      out.push('  classDef user fill:#eff6ff,stroke:#2563eb', '  classDef system fill:#f8fafc,stroke:#64748b');
      if (us.length) out.push(`  class ${us.join(',')} user`);
      if (ss.length) out.push(`  class ${ss.join(',')} system`);
    }
    out.push(...tintLines([...nodes.values()], (n) => mids.get(n.id)));
    return out.join('\n');
  }

  function seqMermaid(parts, items, number) {
    const pid = (p) => 'p' + (p.i + 1);
    const out = ['sequenceDiagram'];
    if (number) out.push('  autonumber');
    for (const p of parts) out.push(`  ${p.kind === 'u' ? 'actor' : 'participant'} ${pid(p)} as ${mtext(p.name)}`);
    let depth = 1;
    for (const it of items) {
      const ind = '  '.repeat(depth);
      if (it.t === 'msg') out.push(`${ind}${pid(it.a)}${it.reply ? '-->>' : '->>'}${pid(it.b)}: ${mtext(it.text) || '…'}`);
      else if (it.t === 'open') { out.push(`${ind}${it.kind} ${mtext(it.label)}`.trimEnd()); depth++; }
      else if (it.t === 'else') out.push(`${'  '.repeat(depth - 1)}${it.block.kind === 'par' ? 'and' : 'else'} ${mtext(it.label)}`.trimEnd());
      else if (it.t === 'close') { depth--; out.push(`${'  '.repeat(depth)}end`); }
      else if (it.t === 'note') {
        const ids = [...new Set(it.ps.map(pid))];
        out.push(`${ind}Note over ${(ids.length > 2 ? [ids[0], ids[ids.length - 1]] : ids).join(',')}: ${mtext(it.text)}`);
      }
    }
    return out.join('\n');
  }

  function stateMermaid(states, edges, groups, START, END) {
    const sid = new Map();
    let k = 0;
    for (const s of states.values()) sid.set(s.id, 's' + ++k);
    const q = (s) => String(s).replace(/"/g, "'");
    const out = ['stateDiagram-v2'];
    const inGroup = new Set();
    groups.forEach((g, i) => {
      out.push(`  state "${q(g.name)}" as g${i + 1} {`);
      for (const m of g.members) { const s = states.get(m); if (!s) continue; out.push(`    state "${q(s.name)}" as ${sid.get(m)}`); inGroup.add(m); }
      out.push('  }');
    });
    for (const s of states.values()) if (!inGroup.has(s.id)) out.push(`  state "${q(s.name)}" as ${sid.get(s.id)}`);
    for (const e of edges) out.push(`  ${e.a === START ? '[*]' : sid.get(e.a)} --> ${e.b === END ? '[*]' : sid.get(e.b)}${e.label ? ' : ' + e.label : ''}`);
    for (const s of states.values()) if (s.desc) out.push(`  note right of ${sid.get(s.id)} : ${s.desc}`);
    out.push(...tintLines([...states.values()], (s) => sid.get(s.id)));
    return out.join('\n');
  }

  function timelineMermaid(title, sections, showToday) {
    const iso = (t) => new Date(t).toISOString().slice(0, 10);
    const nm = (s) => String(s).replace(/[:#;]/g, ' ').trim();
    const out = ['gantt', '  dateFormat YYYY-MM-DD'];
    if (title) out.push('  title ' + nm(title));
    if (!showToday) out.push('  todayMarker off');
    for (const s of sections) {
      if (s.name) out.push('  section ' + nm(s.name));
      for (const t of s.tasks) {
        const tags = [t.done && 'done', t.active && 'active', t.crit && 'crit', t.milestone && 'milestone'].filter(Boolean);
        out.push(`  ${nm(t.name)} :${[...tags, iso(t.start), (t.milestone ? 0 : Math.max(1, Math.round(t.days))) + 'd'].join(', ')}`);
      }
    }
    return out.join('\n');
  }

  /* =====================================================================
     노출 위치 (ui) — 들여 쓴 목록을 「📍 위치 → 🚪 진입점 → 진입하면 노출」 나무로
     ===================================================================== */
  const UI_TYPES = [
    ['toast', '💬', /토스트|toast/i], ['popup', '🪟', /팝업|모달|다이얼로그|popup|modal|dialog/i],
    ['sheet', '🗂', /바텀\s*시트|시트|sheet|drawer/i], ['screen', '🖥', /화면|탭|페이지|screen|tab|page/i],
    ['dot', '🔴', /레드닷|배지|뱃지|알림 점|badge|red\s*dot/i], ['list', '📋', /목록|리스트|list/i],
    ['card', '🃏', /카드|card/i], ['button', '🔘', /^\[[^\]]+\]$/],
  ];
  const UI_ITEM = ['item', '▫️'];
  const uiType = (t) => UI_TYPES.find(([, , re]) => re.test(t)) || UI_ITEM;
  // 종류를 직접 붙이기: 「{바텀시트} 대화 방식」 — 이름만으로는 알 수 없거나 잘못 잡히는 줄에 (「{항목}」은 아이콘 없이)
  const UI_KINDS = [
    ['screen', /^(화면|탭|페이지|screen|tab|page)$/i], ['sheet', /^(바텀\s*시트|시트|sheet|bottom\s*sheet|drawer)$/i],
    ['popup', /^(팝업|모달|다이얼로그|popup|modal|dialog)$/i], ['toast', /^(토스트|toast)$/i],
    ['button', /^(버튼|단추|button)$/i], ['dot', /^(표시|레드닷|배지|뱃지|badge|dot|red\s*dot)$/i],
    ['list', /^(목록|리스트|list)$/i], ['card', /^(카드|card)$/i], ['item', /^(항목|없음|기타|item|none)$/i],
  ];
  function uiKind(label) {
    const k = UI_KINDS.find(([, re]) => re.test(label.trim()));
    return k ? (k[0] === 'item' ? UI_ITEM : UI_TYPES.find(([id]) => id === k[0])) : null;
  }
  // 줄 앞의 「{종류}」를 떼어 냄 (아는 종류일 때만. 모르는 말이면 글자 그대로 둠)
  function uiTakeKind(text) {
    const m = text.match(/^\{([^{}]+)\}\s*/);
    const type = m && uiKind(m[1]);
    return type ? { type, text: text.slice(m[0].length) } : { type: null, text };
  }
  // 블록 맨 앞의 설정 줄: 「# 제목」(첫 줄일 때만) · 「@범례 켬」(기본은 꺼짐. 「@범례 끔」도 받음)
  const UI_LEGEND_RE = /^@\s*(범례|legend)\s*[:：]?\s*(끔|끄기|숨김|off|none|hide|켬|켜기|보임|on|show)?\s*$/i;
  function uiHead(lines) {
    const head = { title: '', legend: null, skip: new Set() };
    let first = true;
    lines.forEach((raw, i) => {
      const t = raw.trim();
      if (!t || /^(%%|\/\/)/.test(t)) return;
      const lg = t.match(UI_LEGEND_RE);
      if (lg) { head.legend = !/^(끔|끄기|숨김|off|none|hide)$/i.test(lg[2] || ''); head.skip.add(i); return; }
      if (first && /^#\s+\S/.test(t)) { head.title = t.replace(/^#\s+/, '').replace(/\s+#+$/, ''); head.skip.add(i); }
      first = false;
    });
    return head;
  }
  const UI_LEGEND = [
    ['path', '📍', () => L('위치', 'Location')], ['entry', '🚪', () => L('진입점', 'Entry point')],
    ['screen', '🖥', () => L('화면 · 탭', 'Screen · tab')], ['sheet', '🗂', () => L('바텀시트', 'Sheet')], ['popup', '🪟', () => L('팝업', 'Popup')],
    ['toast', '💬', () => L('토스트', 'Toast')], ['button', '🔘', () => L('버튼', 'Button')], ['dot', '🔴', () => L('표시', 'Badge')],
    ['list', '📋', () => L('목록', 'List')], ['card', '🃏', () => L('카드', 'Card')],
  ];
  function uiInline(t) {
    return esc(t).replace(/\[([^\]]+)\]/g, '<span class="ut-btn">$1</span>');
  }
  // 다른 뷰어용으로 저장: 제목은 굵은 글 한 줄로, 「@범례」 줄과 「{종류}」 표시는 빼고 보통 들여 쓴 목록으로
  function uiToList(src) {
    const lines = src.split('\n'), head = uiHead(lines), out = [];
    if (head.title) out.push('**' + head.title + '**', '');
    lines.forEach((b, i) => {
      if (head.skip.has(i)) return;
      if (!b.trim()) { out.push(b); return; }
      let m = b.match(/^(\s*)((?:[-*+]|\d+[.)])\s+)?(.*)$/), text = m[3];
      text = uiTakeKind(text).text.replace(/((?:→|->)\s*)\{([^{}]+)\}\s*/, (all, arrow, k) => (uiKind(k) ? arrow : all));
      out.push(m[1] + (m[2] || '- ') + text);
    });
    return out.join('\n');
  }
  function renderUiTree(src) {
    const root = { kids: [], level: -1 };
    const stack = [{ node: root, indent: -1 }];
    let count = 0;
    const lines = src.split('\n'), head = uiHead(lines);
    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li];
      if (head.skip.has(li) || !raw.trim() || /^\s*(%%|\/\/)/.test(raw)) continue;
      const indent = raw.replace(/\t/g, '    ').match(/^ */)[0].length;
      let text = raw.trim().replace(/^([-*+]|\d+[.)])\s+/, '');
      const n = { kids: [], entry: false };
      // 줄 맨 앞의 {종류}
      let kind = uiTakeKind(text);
      text = kind.text;
      // 진입점: 「🚪 」 · 「진입:」 · 「[진입]」 으로 시작하거나 「(들어오는 곳 …)」 이 붙은 줄
      const em = text.match(/^(🚪|진입\s*[:：]|\[진입\]|entry\s*[:：])\s*/i);
      if (em) { n.entry = true; text = text.slice(em[0].length); if (!kind.type) { kind = uiTakeKind(text); text = kind.text; } }
      if (/\((들어오는\s*곳|진입)[^)]*\)/.test(text)) n.entry = true;
      // 끝의 (설명)
      const nm = text.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
      if (nm && nm[1]) { text = nm[1]; n.note = nm[2]; }
      // 「조작 → 결과」
      const parts = text.split(/\s*(?:→|->)\s*/);
      if (parts.length > 1 && parts[0]) { n.trigger = parts[0]; n.name = parts.slice(1).join(' → '); }
      else n.name = text.replace(/^\s*(?:→|->)\s*/, '');
      // 「조작 → {종류} 결과」: 결과 쪽에 붙인 종류
      const rk = uiTakeKind(n.name);
      if (rk.type) n.name = rk.text;
      n.type = rk.type || kind.type || uiType(n.name);
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      stack[stack.length - 1].node.kids.push(n);
      stack.push({ node: n, indent });
      count++;
    }
    if (!count) fail([{ msg: L('목록이 비어 있습니다 (들여 쓴 줄로 씁니다)', 'The list is empty (write indented lines)') }]);
    // 진입점의 위쪽 줄은 「위치」
    const markPath = (n) => { let has = n.entry; for (const k of n.kids) has = markPath(k) || has; if (has && !n.entry) n.path = true; return has; };
    root.kids.forEach(markPath);
    const hasEntry = root.kids.some(function f(n) { return n.entry || n.kids.some(f); });
    const row = (n) => {
      const tag = n.entry ? `<span class="ut-tag">${esc(L('진입점', 'Entry'))}</span>` : '';
      const ico = n.entry ? '🚪' : n.path ? '📍' : n.type[1];
      return `<div class="ut-row" data-t="${n.entry ? 'entry' : n.path ? 'path' : n.type[0]}"><span class="ut-ico">${ico}</span>` +
        (n.trigger ? `<span class="ut-trigger">${uiInline(n.trigger)}</span><span class="ut-arrow">→</span>` : '') +
        `<span class="ut-name">${uiInline(n.name)}</span>` + (n.note ? `<span class="ut-note">${uiInline(n.note)}</span>` : '') + tag + '</div>';
    };
    const list = (kids) => '<ul>' + kids.map((n) => {
      let sub = '';
      if (n.kids.length) sub = n.entry
        ? `<div class="ut-exposed"><div class="ut-exposed-label">${esc(L('진입하면 노출', 'Shown after entering'))}</div>${list(n.kids)}</div>`
        : list(n.kids);
      return `<li class="${n.entry ? 'ut-entry' : n.path ? 'ut-path' : ''}">${row(n)}${sub}</li>`;
    }).join('') + '</ul>';
    // 범례: 기본은 꺼짐. 「@범례 켬」을 쓴 블록에서만, 이 블록에 실제로 쓰인 아이콘만 (하나도 없으면 숨김). 제목이 있으면 제목 아래에
    const seen = new Set();
    (function walk(kids) { for (const n of kids) { seen.add(n.entry ? 'entry' : n.path ? 'path' : n.type[0]); walk(n.kids); } })(root.kids);
    const showLegend = head.legend === true;
    const legend = showLegend ? UI_LEGEND.filter(([id]) => seen.has(id)).map(([, i, t]) => `<span>${i} ${esc(t())}</span>`).join('') : '';
    return '<div class="ut">' + (head.title ? `<div class="ut-title${legend ? ' with-legend' : ''}">${uiInline(head.title)}</div>` : '') +
      (legend ? `<div class="ut-legend">${legend}</div>` : '') + list(root.kids) + '</div>';
  }

  /* =====================================================================
     데이터 정의 (data) — 데이터마다 카드, 필드마다 줄 (이름 · 형식 · 필수 · 설명 · 예시 · 상태)
     ===================================================================== */
  const DHEAD = {};
  [['name', '필드 필드명 이름 항목 field name'], ['type', '형식 타입 자료형 종류 type format'], ['req', '필수 필수여부 required req'],
    ['desc', '설명 내용 뜻 description desc'], ['ex', '예시 예 example sample'], ['status', '상태 status']]
    .forEach(([k, names]) => names.split(' ').forEach((n) => (DHEAD[normKey(n)] = k)));
  function splitDataLine(line) {
    if (line.includes('\t')) return line.split('\t').map((s) => s.trim());
    if (line.includes('|')) return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((s) => s.trim());
    // CSV: 따옴표 안의 쉼표는 나누지 않음
    const out = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === ',' && !q) { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim());
    return out;
  }
  function parseData(src, errs) {
    const ents = [];
    let cur = null, cols = ['name', 'type', 'req', 'desc', 'ex', 'status'];
    src.split('\n').forEach((raw, i) => {
      const line = raw.trim(), ln = i + 1;
      let m;
      if (!line || /^(%%|\/\/)/.test(line)) return;
      if ((m = line.match(/^#{1,6}\s+(.+?)(?:\s*\(([^)]+)\))?\s*$/))) { cur = { name: m[1].trim(), id: (m[2] || '').trim(), desc: [], fields: [], ln }; ents.push(cur); return; }
      if (cur && (m = line.match(/^>\s?(.*)$/))) { cur.desc.push(m[1]); return; }
      if (/^\|?\s*:?-{3,}/.test(line)) return;
      const cells = splitDataLine(line);
      const keys = cells.map((c) => DHEAD[normKey(c)] || null);
      if (keys.includes('name') && keys.filter(Boolean).length >= 2) { cols = keys; return; }
      if (!cur) { cur = { name: L('데이터', 'Data'), id: '', desc: [], fields: [], ln }; ents.push(cur); }
      const f = {};
      cols.forEach((k, j) => { if (k) f[k] = (cells[j] || '').replace(/^`(.*)`$/, '$1'); });
      f.name = (f.name || '').replace(/^\[(.*)\]$/, '$1').trim();
      if (!f.name) { errs.push({ ln, msg: L('필드 이름이 비어 있습니다', 'The field name is empty') }); return; }
      const rq = normKey(f.req);
      f.required = /^(필수|required|req|y|yes|o|✓|✔|true|1)$/.test(rq) ? true : /^(선택|optional|opt|n|no|x|false|0|—|-)$/.test(rq) || !rq ? false : null;
      f.ln = ln;
      cur.fields.push(f);
    });
    if (!ents.length || !ents.some((e) => e.fields.length)) errs.push({ msg: L('데이터가 없습니다 (「# 데이터 이름」 아래에 필드를 한 줄씩)', 'No data (write fields one per line under "# Data name")') });
    // 다른 데이터를 가리키는 형식: 「→ 보상」 · 「보상 목록」 · 「보상[]」 · 「list of 보상」
    const byName = new Map();
    for (const e of ents) { byName.set(e.name, e); if (e.id) byName.set(e.id, e); }
    for (const e of ents) for (const f of e.fields) {
      const t = (f.type || '').trim();
      let m = t.match(/^(?:→|->)\s*(.+?)(\s*(목록|리스트|\[\]|\s+list|\s+array))?$/i) || t.match(/^(.+?)\s*(목록|리스트|\[\]|\s+list|\s+array|s)$/i) || t.match(/^(?:list of|array of)\s+(.+)$/i);
      let target = m && byName.get(m[1].trim().replace(/\s*데이터$/, '')) || m && byName.get(m[1].trim());
      if (!target && byName.has(t)) target = byName.get(t);
      if (!target && byName.has(t.replace(/\s*데이터$/, ''))) target = byName.get(t.replace(/\s*데이터$/, ''));
      if (target && target !== e) { f.ref = target; f.many = /목록|리스트|\[\]|list|array/i.test(t); }
    }
    return ents;
  }
  const STATUS_TINT = [[/^확정|done|confirmed/i, 'green'], [/^승인\s*전|pending/i, 'amber'], [/^미결|open|undecided/i, 'red']];
  // 선택지 번호: 원 숫자 ①~⑳ · 원 영문자 ⓐ~ⓩ
  const DT_MARK = '\u2460-\u2473\u24d0-\u24e9';
  const DT_OPT_SPLIT = new RegExp(`(?:^|\\s+·\\s+|\\s+)(?=[${DT_MARK}]\\s)`);
  const DT_OPT_ITEM = new RegExp(`^([${DT_MARK}])\\s+([\\s\\S]*)$`);
  const DT_COND = new RegExp(`^([${DT_MARK}]+)\\s+(\\S[\\s\\S]*)$`);
  const dtIsNum = (c) => c >= '\u2460' && c <= '\u2473';
  // 설명 속 선택지: 번호로 시작하는 항목이 둘 이상이면 { before, items: [{ mark, text }], after }, 아니면 null
  //  항목 사이의 「 · 」는 구분자로 지우고, 마지막 항목 뒤의 「 · 다른 글」은 after 로 뺌
  function dtOptions(desc) {
    const parts = String(desc || '').trim().split(DT_OPT_SPLIT);
    let before = '';
    const items = [];
    for (const p of parts) {
      const m = p.match(DT_OPT_ITEM);
      if (m) items.push({ mark: m[1], text: m[2].trim() });
      else if (!items.length) before = p.trim();
      else items[items.length - 1].text += ' ' + p.trim();
    }
    if (items.length < 2) return null;
    let after = '';
    const last = items[items.length - 1], cut = last.text.search(/\s+·\s+/);
    if (cut >= 0) { after = last.text.slice(cut).replace(/^\s+·\s+/, '').trim(); last.text = last.text.slice(0, cut).trim(); }
    return { before: before.replace(/\s*·\s*$/, '').trim(), items, after };
  }
  // 조건부 필드 이름 「③ⓑ 캐릭터 목록」 → { chip: '③ⓑ', name: '캐릭터 목록', keys: ['③', '③ⓑ'] }
  //  keys = 이 필드가 이어지는 선택지들: 앞쪽 원 숫자는 번호 칩이 없는 필드의 선택지(①②면 둘 다),
  //  그 뒤 글자는 칩이 앞 글자까지와 같은 필드(③ 대상 범위)의 선택지
  function dtCond(name) {
    const m = String(name || '').match(DT_COND);
    if (!m) return null;
    const cs = [...m[1]], keys = [];
    let lead = true;
    cs.forEach((c, k) => {
      if (lead && dtIsNum(c)) keys.push(c);
      else { lead = false; keys.push(cs.slice(0, k + 1).join('')); }
    });
    return { chip: m[1], name: m[2].trim(), keys };
  }
  function renderData(src, uid) {
    const errs = [];
    const ents = parseData(src, errs);
    if (errs.length) fail(errs);
    const ent = (e, i) => {
      const rows = e.fields.map((f) => {
        const type = f.ref
          ? `<a class="dt-ref" href="#${uid}-e${ents.indexOf(f.ref)}" data-ref="${uid}-e${ents.indexOf(f.ref)}">→ ${esc(f.ref.name)}${f.many ? ' ' + esc(L('목록', '[ ]')) : ''}</a>`
          : (f.type ? `<span class="dt-type">${esc(f.type)}</span>` : '');
        const req = f.required === true ? `<span class="dt-req on" title="${esc(L('필수', 'Required'))}">${esc(L('필수', 'req'))}</span>`
          : f.required === false ? `<span class="dt-req" title="${esc(L('선택', 'Optional'))}">${esc(L('선택', 'opt'))}</span>` : (f.req ? `<span class="dt-req">${esc(f.req)}</span>` : '');
        const st = f.status ? `<span class="dt-st tint-${(STATUS_TINT.find(([re]) => re.test(f.status)) || [0, 'gray'])[1]}">${esc(f.status)}</span>` : '';
        // 다른 데이터로 이어지면 맨 오른쪽(연결선이 나가는 곳)에 그 카드로 가는 단추
        const to = f.ref ? `${uid}-e${ents.indexOf(f.ref)}` : '', goTip = f.ref ? esc(L(`「${f.ref.name}」 카드로 가기`, `Go to ${f.ref.name}`)) : '';
        const go = f.ref ? `<a class="dt-go" href="#${to}" data-ref="${to}" title="${goTip}" aria-label="${goTip}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>` : '';
        // 한 줄: [이름](필수 · 선택) | 형식 (상태) | → 단추 — 그 아래 설명(문장), 그 아래 「예시」 값(고정폭)
        // 조건부 필드: 이름 앞의 번호를 칩으로 뗌. 설명 속 선택지가 둘 이상이면 세로 목록으로 (선택지 ↔ 칩은 data-opt · data-cond 로 이어 강조)
        const cond = dtCond(f.name), opts = dtOptions(f.desc);
        const chip = cond ? `<span class="dt-cond" data-cond="${esc(cond.keys.join(' '))}">${esc(cond.chip)}</span>` : '';
        const own = cond ? cond.chip : '';
        const sub = !f.desc ? '' : !opts ? `<div class="dt-sub">${esc(f.desc)}</div>`
          : '<div class="dt-sub">' + (opts.before ? `<div>${esc(opts.before)}</div>` : '') +
            `<ul class="dt-opts">${opts.items.map((o) => `<li data-opt="${esc(own + o.mark)}"><span class="dt-optn">${esc(o.mark)}</span><span>${esc(o.text)}</span></li>`).join('')}</ul>` +
            (opts.after ? `<div>${esc(opts.after)}</div>` : '') + '</div>';
        return `<div class="dt-row"${f.ref ? ` data-to="${to}"` : ''}><div class="dt-main"><span class="dt-key">${chip}<span class="dt-name">${esc(cond ? cond.name : f.name)}</span>${req}</span><span class="dt-kind">${type}${st}</span>${go}</div>` +
          sub +
          (f.ex ? `<div class="dt-exrow"><span class="dt-exl">${esc(L('예시', 'Example'))}</span><span class="dt-ex">${esc(f.ex)}</span></div>` : '') + '</div>';
      }).join('');
      return `<section class="dt-card" id="${uid}-e${i}"><header><span class="dt-ico">🗃</span><b>${esc(e.name)}</b>${e.id ? `<code>${esc(e.id)}</code>` : ''}<span class="dt-count">${esc(L(`필드 ${e.fields.length}개`, `${e.fields.length} field${e.fields.length === 1 ? '' : 's'}`))}</span></header>` +
        (e.desc.length ? `<p class="dt-desc">${esc(e.desc.join(' '))}</p>` : '') + rows + '</section>';
    };
    return `<div class="dt" data-uid="${uid}"><svg class="dt-links" aria-hidden="true"></svg><div class="dt-grid">${ents.map(ent).join('')}</div></div>`;
  }
  // 꺾이는 점들을 잇되 모서리는 둥글게
  function roundedPath(pts, rad = 8) {
    let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x, y] = pts[i], [xn, yn] = pts[i + 1];
      const l1 = Math.hypot(x - x0, y - y0), l2 = Math.hypot(xn - x, yn - y);
      if (!l1 || !l2) continue;
      const r = Math.min(rad, l1 / 2, l2 / 2);
      d += ` L${r1(x - ((x - x0) / l1) * r)},${r1(y - ((y - y0) / l1) * r)} Q${r1(x)},${r1(y)} ${r1(x + ((xn - x) / l2) * r)},${r1(y + ((yn - y) / l2) * r)}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${r1(last[0])},${r1(last[1])}`;
  }
  // 카드 사이 연결선 (그린 뒤 · 크기가 바뀔 때마다 다시)
  function drawDataLinks(box) {
    const dt = box.querySelector('.dt');
    if (!dt) return;
    const svg = dt.querySelector('.dt-links');
    const base = dt.getBoundingClientRect();
    svg.setAttribute('width', dt.scrollWidth);
    svg.setAttribute('height', dt.scrollHeight);
    let paths = '';
    const used = new Map();
    dt.querySelectorAll('.dt-row[data-to]').forEach((row) => {
      const card = dt.querySelector('#' + CSS.escape(row.dataset.to));
      const from = row.closest('.dt-card');
      if (!card || card === from) return;
      // 늘 그 필드의 → 단추 높이 · 카드 오른쪽 끝에서 나감
      //  - 오른쪽 카드: 그 왼쪽 끝으로 곡선
      //  - 왼쪽 카드: 이 카드 아래 틈으로 돌아 두 카드 사이 틈을 타고 그 오른쪽 끝으로 (카드 뒤로 숨지 않게)
      //  - 위 · 아래(같은 열): 오른쪽으로 돌아 그 오른쪽 끝으로 곡선
      const a = (row.querySelector('.dt-go') || row).getBoundingClientRect(), b = card.querySelector('header').getBoundingClientRect(), fc = from.getBoundingClientRect(), tc = card.getBoundingClientRect();
      const k = (used.get(card) || 0); used.set(card, k + 1);
      const right = tc.left >= fc.right - 4, left = tc.right <= fc.left + 4;
      const x1 = fc.right - base.left, y1 = a.top + a.height / 2 - base.top, x2 = (right ? tc.left : tc.right) - base.left, y2 = b.top + b.height / 2 - base.top + k * 4;
      let d;
      if (left) {
        const xr = x1 + 12 + k * 4, yb = fc.bottom - base.top + 9 + k * 4, xg = (tc.right + fc.left) / 2 - base.left - k * 4;
        d = roundedPath([[x1, y1], [xr, y1], [xr, yb], [xg, yb], [xg, y2], [x2, y2]]);
      } else {
        const dx = Math.max(40, Math.abs(x2 - x1) / 2);
        d = `M${r1(x1)},${r1(y1)} C${r1(x1 + dx)},${r1(y1)} ${r1(x2 + (right ? -dx : dx))},${r1(y2)} ${r1(x2)},${r1(y2)}`;
      }
      paths += `<path d="${d}"/><circle cx="${r1(x1)}" cy="${r1(y1)}" r="3"/><circle cx="${r1(x2)}" cy="${r1(y2)}" r="3"/>`;
    });
    svg.innerHTML = paths;
  }
  // 다른 뷰어용: 데이터마다 일반 표
  function dataToTables(src) {
    const errs = [];
    const ents = parseData(src, errs);
    if (errs.length) fail(errs);
    const hasEx = ents.some((e) => e.fields.some((f) => f.ex)), hasSt = ents.some((e) => e.fields.some((f) => f.status));
    const head = [L('필드', 'Field'), L('형식', 'Type'), L('필수', 'Required'), L('설명', 'Description')].concat(hasEx ? [L('예시', 'Example')] : [], hasSt ? [L('상태', 'Status')] : []);
    const cell = (s) => String(s || '').replace(/\|/g, '\\|');
    const out = [];
    for (const e of ents) {
      out.push(`**${e.name}**${e.id ? ` (\`${e.id}\`)` : ''}`, '');
      if (e.desc.length) out.push(e.desc.join(' '), '');
      out.push('| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|');
      for (const f of e.fields) {
        const type = f.ref ? `→ ${f.ref.name}${f.many ? ' ' + L('목록', '[ ]') : ''}` : f.type;
        const req = f.required === true ? L('필수', 'Required') : f.required === false ? L('선택', 'Optional') : f.req;
        out.push('| ' + [f.name, type, req, f.desc].concat(hasEx ? [f.ex] : [], hasSt ? [f.status] : []).map(cell).join(' | ') + ' |');
      }
      out.push('');
    }
    return out.join('\n').trim();
  }

  /* =====================================================================
     요약 흐름도 (summary) — 기능 전체를 한눈에: 위 → 아래 한 줄기
       # 단계                      왼쪽 단계 이름 + 그 단계 칸들 높이만큼 세로 점선
       - [역할] 제목                가운데 칸 (모두 같은 너비 · 제목 한 줄 높이). 제목이 ? 로 끝나면 마름모(판정)
         설명 줄                    칸 오른쪽의 작은 회색 글 (칸 크기는 그대로)
         - 아니오 → [역할] 제목     판정의 끝나는 갈래 (오른쪽 작은 칸)
       - 예 → [역할] 제목           판정 다음의 이어지는 갈래 (아래로)
       - 갈래 + 들여 쓴 칸들        나란한 끝 (한 줄에 나란히, 설명은 각 칸 아래)
       역할 이름: 색                역할 색 (기본 운영 = 보라 · 유저 = 초록 · 시스템 = 회색)
     넓은 모양(설명이 칸 오른쪽)과 좁은 모양(설명이 칸 아래)을 둘 다 그려 두고, 블록 폭에 맞는 쪽을 CSS 가 고름
     ===================================================================== */
  const SUM_ROLES = [['ops', '운영', 'Ops', 'purple', '운영 운영자 운영팀 ops operator operations admin'],
    ['user', '유저', 'User', 'green', '유저 사용자 플레이어 user player'],
    ['system', '시스템', 'System', 'gray', '시스템 서버 system server']];
  const SUM_FORK = /^(갈래|나란히|병렬|fork|split|parallel)$/i;
  const SUM_ARROW = /^(.*?)\s*(?:→|->|=>)\s*(.*)$/;
  const sumClean = (s) => String(s || '').replace(/\*\*|`/g, '').trim();
  function parseSummary(src, errs) {
    const roles = new Map();
    for (const [id, ko, en, tint, names] of SUM_ROLES) {
      const r = { id, name: L(ko, en), tint, typed: false };
      names.split(' ').forEach((n) => roles.set(normKey(n), r));
    }
    const stages = [], chain = [], stack = [], used = [];
    let stage = null, anyRole = false;
    const rows = src.split('\n').map((raw, i) => ({ raw: raw.replace(/\t/g, '    '), ln: i + 1 })).filter((r) => r.raw.trim() && !/^\s*(%%|\/\/)/.test(r.raw));
    const base = Math.min(...rows.map((r) => r.raw.match(/^ */)[0].length), Infinity);
    // 「[역할] 제목」 · 「예 → [역할] 제목」 → { label, role, title }
    const head = (text) => {
      let label = '', m = text.match(/^\[([^\]]*)\]\s*(.*)$/);
      if (!m) {
        const a = text.match(SUM_ARROW);
        if (a) { label = sumClean(a[1]); text = a[2].trim(); m = text.match(/^\[([^\]]*)\]\s*(.*)$/); }
      }
      return { label, role: m ? m[1].trim() : '', title: sumClean(m ? m[2] : text) };
    };
    const box = (h, ln) => {
      if (!h.title) errs.push({ ln, msg: L('칸 제목이 비어 있습니다', 'The box title is empty') });
      if (h.role) anyRole = true;
      return { title: h.title, roleName: h.role, desc: [], label: h.label, kind: kindOfLabel(h.label), decision: /[?？]$/.test(h.title), ln };
    };
    const noDecision = (label, ln) => errs.push({ ln, msg: L(`「${label} →」 앞에 판정 칸이 없습니다 (제목이 ? 로 끝나는 칸 다음에 씁니다 · 제목에 → 를 쓰려면 앞에 [역할])`, `"${label} →" has no decision before it (put it after a box whose title ends with "?" · to use → in a title, start with [role])`) });
    for (const { raw, ln } of rows) {
      const indent = raw.match(/^ */)[0].length - base, line = raw.trim();
      let m;
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      const parent = stack[stack.length - 1];
      if (!parent && (m = line.match(/^#{1,6}\s*(.+?)\s*$/))) { stage = { name: sumClean(m[1]), ln, items: [] }; stages.push(stage); continue; }
      if ((m = line.match(/^[-*+]\s+(.*)$/))) {
        const text = m[1].trim();
        if (!parent) {
          const last = chain[chain.length - 1];
          if (last && last.fork && !last.after) { last.after = true; errs.push({ ln, msg: L('갈래(나란한 끝) 뒤에는 칸을 둘 수 없습니다', 'Nothing can follow a fork (the parallel end)') }); }
          let it;
          if (SUM_FORK.test(text)) it = { fork: true, boxes: [], ln };
          else {
            it = box(head(text), ln);
            it.sides = [];
            if (it.label && !(last && last.decision)) noDecision(it.label, ln);
          }
          it.stage = stage;
          if (stage) stage.items.push(it);
          chain.push(it);
          stack.push({ indent, node: it, kind: it.fork ? 'fork' : 'box' });
        } else if (parent.kind === 'fork') {
          const h = head(text);
          if (h.label && !/^\[/.test(text)) { errs.push({ ln, msg: L('갈래 안의 칸은 「- [역할] 제목」으로 씁니다', 'Write boxes in a fork as "- [role] title"') }); continue; }
          const b = box(h, ln);
          parent.node.boxes.push(b);
          stack.push({ indent, node: b, kind: 'leaf' });
        } else if (parent.kind === 'box') {
          const h = head(text);
          if (!h.label) { errs.push({ ln, msg: L('칸 아래에 들여 쓴 「-」 줄은 「- 아니오 → [역할] 제목」처럼 갈래로 씁니다 (설명은 「-」 없이)', 'An indented "-" line under a box is a branch like "- no → [role] title" (write descriptions without "-")') }); continue; }
          const b = box(h, ln);
          if (!parent.node.decision) noDecision(h.label, ln);
          parent.node.sides.push(b);
          stack.push({ indent, node: b, kind: 'leaf' });
        } else errs.push({ ln, msg: L('여기에는 칸을 더 들여 쓸 수 없습니다', "Boxes can't be nested this deep") });
        continue;
      }
      if (!parent) {
        // 역할 색: 「역할 이름1, 이름2: 색」 (「역할」은 빼도 됨)
        const kw = line.match(/^(?:역할|role)\s+(.+?)\s*[:：]\s*(\S+)\s*$/i), bare = kw ? null : line.match(/^([^:：]+?)\s*[:：]\s*(\S+)\s*$/);
        const tint = TINT[normKey((kw || bare || [])[2])];
        if (kw && !tint) errs.push({ ln, msg: L(`모르는 색: ${kw[2]} (파랑 · 초록 · 주황 · 빨강 · 보라 · 회색)`, `Unknown color: ${kw[2]} (blue, green, orange, red, purple, gray)`) });
        else if (tint) {
          for (const name of (kw || bare)[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean)) {
            const r = roles.get(normKey(name));
            if (r) r.tint = tint; else roles.set(normKey(name), { id: '', name, tint, typed: true });
          }
        } else errs.push({ ln, msg: L('알 수 없는 줄입니다 (칸은 「- [역할] 제목」, 설명은 칸 아래에 들여 씁니다)', 'Unknown line (write boxes as "- [role] title" and indent descriptions under a box)') });
        continue;
      }
      if (parent.kind === 'fork') errs.push({ ln, msg: L('갈래에는 설명을 달 수 없습니다 (갈래 안의 칸 아래에 씁니다)', "A fork can't have a description (put it under a box in the fork)") });
      else parent.node.desc.push(sumClean(line));
    }
    // 역할: 그린 순서대로 (범례 순서). [역할] 이 없으면 시스템
    const system = roles.get('시스템');
    const setRole = (b) => {
      let r = b.roleName ? roles.get(normKey(b.roleName)) : system;
      if (!r) { errs.push({ ln: b.ln, msg: L(`모르는 역할: ${b.roleName} (운영 · 유저 · 시스템 — 다른 역할은 블록 맨 위에 「역할 ${b.roleName}: 주황」)`, `Unknown role: ${b.roleName} (ops, user, system — add others at the top: "role ${b.roleName}: orange")`) }); r = system; }
      else if (b.roleName && !r.typed) { r.name = b.roleName; r.typed = true; } // 범례에는 문서에 쓴 이름 그대로
      b.role = r;
      if (!used.includes(r)) used.push(r);
    };
    for (const it of chain) {
      if (it.fork) {
        if (!it.boxes.length) errs.push({ ln: it.ln, msg: L('갈래 아래에 칸이 없습니다 (들여 써서 「- [역할] 제목」)', 'The fork has no boxes (indent "- [role] title" under it)') });
        it.boxes.forEach(setRole);
      } else { setRole(it); it.sides.forEach(setRole); }
    }
    for (const s of stages) if (!s.items.length) errs.push({ ln: s.ln, msg: L(`빈 단계입니다: ${s.name} (아래에 칸이 없음)`, `Empty stage: ${s.name} (no boxes under it)`) });
    if (!chain.length && !errs.length) errs.push({ msg: L('칸이 하나도 없습니다 (「- [역할] 제목」)', 'No boxes (write "- [role] title")') });
    errs.sort((p, q) => (p.ln || 0) - (q.ln || 0)); // 줄 순서대로 알려 줌
    return { stages, chain, roles: used, anyRole };
  }

  // 문서 스타일(CSS)에서 정한 길이 (--sf-box-width 등). 없으면 0
  function cssLen(name) {
    try {
      const host = document.querySelector('.markdown-body') || document.documentElement;
      const v = parseFloat(getComputedStyle(host).getPropertyValue(name));
      return v > 0 ? v : 0;
    } catch { return 0; }
  }
  function drawSummary(model, uid, narrow, boxMin) {
    const { stages, chain, roles, anyRole } = model;
    const H = 40, DH = 56, GAP = 16, DGAP = 20, FGAP = 24, LH = 18, COLGAP = 20, TOP = 14, X0 = 6;
    const tW = (t) => textW(t, 14, 600), dW = (t) => textW(t, 12);
    const boxes = chain.flatMap((it) => (it.fork ? it.boxes : [it])), sides = chain.flatMap((it) => it.sides || []);
    // 칸 너비: 가장 긴 제목에 맞춰 모두 같게 (마름모는 가운데 줄 폭이 좁아 더 넓게)
    const boxW = Math.ceil(Math.max(boxMin, ...boxes.map((b) => (b.decision ? tW(b.title) / 0.66 + 16 : tW(b.title) + 36))) / 2) * 2;
    const sideW = Math.ceil(Math.max(Math.round(boxMin * 2 / 3), ...sides.map((b) => tW(b.title) + 32)) / 2) * 2;
    const named = stages.filter((s) => s.name);
    for (const s of named) s.lines = wrap(s.name, 96, 14, 600);
    const area = named.length ? Math.max(84, Math.ceil(Math.max(...named.flatMap((s) => s.lines.map(tW)))) + 28) : 0;
    const lineX = X0 + area, boxX = named.length ? lineX + 20 : 10, cx = boxX + boxW / 2;
    // 설명: 넓은 모양은 쓴 줄 그대로 칸 오른쪽 (아주 길 때만 나눔), 칸 아래에 둘 때는 칸 폭에 맞춰 나눔
    const lines = (b, maxW) => b.desc.flatMap((d) => wrap(d, maxW, 12));
    const under = (n) => (n ? 6 + n * LH : 0); // 칸 아래 설명이 차지하는 높이
    let svg = '', maxX = boxX + boxW, y = TOP, prev = null;
    // data-w: 그릴 때 잰 글 너비 — Word 저장 · 서식 복사에서 글꼴이 달라져도 그 너비에 맞춤 (설명이 그림 밖으로 잘리지 않게)
    const text = (cls, x, yy, s) => `<text class="${cls}" x="${r1(x)}" y="${r1(yy)}" data-w="${r1(/sf-(title|stage)/.test(cls) ? tW(s) : dW(s))}">${esc(s)}</text>`;
    const descRight = (ls, x, cy) => { ls.forEach((l, i) => { svg += text('sf-desc', x, cy + (i - (ls.length - 1) / 2) * LH, l); maxX = Math.max(maxX, x + dW(l)); }); };
    const descUnder = (ls, x, bottom) => { ls.forEach((l, i) => { svg += text('sf-desc mid', x, bottom + 16 + i * LH, l); maxX = Math.max(maxX, x + dW(l) / 2); }); };
    const node = (b, x, top, w, h, cls) => {
      const mx = x + w / 2, my = top + h / 2;
      const shape = b.decision && cls !== 'side'
        ? `<polygon class="sf-shape" points="${r1(mx)},${r1(top)} ${r1(x + w)},${r1(my)} ${r1(mx)},${r1(top + h)} ${r1(x)},${r1(my)}"/>`
        : `<rect class="sf-shape" x="${r1(x)}" y="${r1(top)}" width="${r1(w)}" height="${r1(h)}" rx="8"/>`;
      svg += `<g class="sf-node ${cls} tint-${b.role.tint}" data-role="${esc(b.role.name)}"><title>${esc([b.title, ...b.desc].join('\n'))}</title>${shape}${text('sf-title', mx, my, b.title)}</g>`;
      maxX = Math.max(maxX, x + w);
    };
    const edge = (pts, kind) => { svg += `<path class="sf-edge ${kind}" d="${pathD(pts)}" marker-end="url(#${uid}-${kind})"/>`; };
    for (const it of chain) {
      if (prev) y = prev.bottom + (it.fork ? FGAP : prev.decision ? DGAP : GAP);
      if (it.fork) {
        // 나란한 끝: 위 칸에서 갈라져 한 줄에, 설명은 각 칸 아래
        const top = y;
        let bottom = top + H;
        it.boxes.forEach((b, k) => {
          const x = boxX + k * (boxW + COLGAP), mx = x + boxW / 2, ls = lines(b, boxW + 12);
          if (prev) edge(k ? [{ x: cx, y: top - 14 }, { x: mx, y: top - 14 }, { x: mx, y: top - 2 }] : [{ x: cx, y: prev.out }, { x: cx, y: top - 2 }], 'normal');
          node(b, x, top, boxW, H, b.decision ? 'decision' : 'box');
          descUnder(ls, mx, top + H);
          bottom = Math.max(bottom, top + H + under(ls.length));
        });
        it.top = top; it.bottom = bottom;
        prev = { bottom, out: bottom, decision: false };
        continue;
      }
      const h = it.decision ? DH : H;
      const below = narrow || it.sides.length > 0; // 설명을 칸 아래에: 좁은 모양이거나 오른쪽에 갈래 칸이 있을 때
      const own = lines(it, below ? boxW + 16 : 340);
      // 끝나는 갈래: 오른쪽 작은 칸 (첫 칸은 판정과 같은 높이, 더 있으면 그 아래로)
      const sd = it.sides.map((b) => {
        const ls = lines(b, narrow ? sideW + 16 : 300);
        return { b, ls, h: narrow ? H + under(ls.length) : Math.max(H, ls.length * LH + 4), off: narrow ? H / 2 : Math.max(H, ls.length * LH + 4) / 2 };
      });
      const rowH = below ? h : Math.max(h, own.length * LH + 4);
      const top = y, cy = top + Math.max(rowH / 2, sd.length ? sd[0].off : 0), shapeTop = cy - h / 2, shapeBottom = cy + h / 2;
      let bottom = Math.max(top + rowH, shapeBottom + (below ? under(own.length) : 0));
      if (prev) {
        edge([{ x: cx, y: prev.out }, { x: cx, y: shapeTop - 2 }], it.kind);
        if (it.label) { svg += text('sf-elabel', cx + 12, (prev.out + shapeTop - 2) / 2, it.label); maxX = Math.max(maxX, cx + 12 + dW(it.label)); }
      }
      node(it, boxX, shapeTop, boxW, h, it.decision ? 'decision' : 'box');
      if (below) descUnder(own, cx, shapeBottom); else descRight(own, boxX + boxW + COLGAP, cy);
      if (sd.length) {
        const x1 = boxX + boxW, many = sd.length > 1;
        const gap = Math.max(40, ...sd.map((s) => Math.ceil(dW(s.b.label)) + 6)) + (many ? 14 : 0), sx = x1 + gap; // 선 글자가 판정과 갈래 칸 사이에 들어가게
        let st = cy - sd[0].off;
        sd.forEach((s, k) => {
          const my = st + s.off, xm = x1 + 14;
          edge(k ? [{ x: x1, y: cy }, { x: xm, y: cy }, { x: xm, y: my }, { x: sx - 2, y: my }] : [{ x: x1, y: cy }, { x: sx - 2, y: my }], s.b.kind);
          svg += text('sf-elabel mid', ((many ? xm : x1) + sx - 2) / 2, my - 14, s.b.label);
          node(s.b, sx, my - H / 2, sideW, H, 'side');
          if (narrow) descUnder(s.ls, sx + sideW / 2, my + H / 2); else descRight(s.ls, sx + sideW + 12, my);
          st += s.h + 12;
        });
        bottom = Math.max(bottom, st - 12);
      }
      it.top = Math.min(top, shapeTop); it.bottom = bottom;
      prev = { bottom, out: below && own.length ? shapeBottom + under(own.length) + 2 : shapeBottom, decision: it.decision };
    }
    // 단계: 왼쪽에 이름, 그 단계 칸들 높이만큼 세로 점선
    let stageSvg = '';
    for (const s of named) {
      const y0 = Math.min(...s.items.map((it) => it.top)), y1 = Math.max(...s.items.map((it) => it.bottom));
      stageSvg += `<line class="sf-stage-line" x1="${r1(lineX)}" x2="${r1(lineX)}" y1="${r1(y0)}" y2="${r1(y1)}"/>` +
        s.lines.map((l, i) => text('sf-stage', X0 + area / 2, (y0 + y1) / 2 + (i - (s.lines.length - 1) / 2) * 17, l)).join('');
    }
    let bottom = prev.bottom, W = Math.ceil(maxX) + 12;
    // 범례: 쓴 역할만, 그림 아래 가운데
    let legend = '';
    if (anyRole && roles.length) {
      const ws = roles.map((r) => 20 + dW(r.name)), total = ws.reduce((a, b) => a + b, 0) + (roles.length - 1) * 26;
      W = Math.max(W, Math.ceil(total) + 24);
      let x = (W - total) / 2;
      const ly = bottom + 24;
      roles.forEach((r, i) => {
        legend += `<g class="sf-key tint-${r.tint}" data-role="${esc(r.name)}"><rect class="sf-shape" x="${r1(x)}" y="${r1(ly)}" width="14" height="14" rx="3"/>${text('sf-desc', x + 20, ly + 7, r.name)}</g>`;
        x += ws[i] + 26;
      });
      bottom = ly + 14;
    }
    const defs = '<defs>' + ['normal', 'yes', 'no'].map((k) => `<marker id="${uid}-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path class="sf-arrow ${k}" d="M2 1L8 5L2 9"/></marker>`).join('') + '</defs>';
    return { svg: svgWrap('dg-summary' + (narrow ? ' narrow' : ''), W, bottom + 14, defs + stageSvg + svg + legend, L('요약 흐름도', 'Summary flow')), w: W };
  }
  function renderSummary(src, uid, opt = {}) {
    const errs = [];
    const model = parseSummary(src, errs);
    if (errs.length) fail(errs);
    const boxMin = Math.min(400, Math.max(80, opt.boxWidth || cssLen('--sf-box-width') || 180));
    const wide = drawSummary(model, uid + 'w', false, boxMin), slim = drawSummary(model, uid + 'n', true, boxMin);
    // 설명이 없어 두 모양이 같으면 하나만
    if (slim.w >= wide.w) return `<div class="dg-scroll">${wide.svg}</div>`;
    // 블록 폭이 넓은 모양보다 좁으면 좁은 모양 (CSS 컨테이너 쿼리 — 인쇄 · HTML 저장본에서도 같은 규칙)
    return `<div class="sf" style="--sf-w:${wide.w + 1};--sf-n:${slim.w}px"><div class="sf-probe"><div class="sf-in">` +
      `<div class="sf-var sf-wide dg-scroll">${wide.svg}</div><div class="sf-var sf-narrow dg-scroll">${slim.svg}</div></div></div></div>`;
  }
  // 다른 뷰어용: 단계 = subgraph, 설명은 칸 안 둘째 줄부터
  function summaryMermaid(src) {
    const errs = [];
    const { stages, chain } = parseSummary(src, errs);
    if (errs.length) fail(errs);
    const out = ['flowchart TD'], links = [], styles = [], all = [];
    let n = 0;
    const id = (b) => { if (!b.mid) { b.mid = 'n' + ++n; all.push(b); } return b.mid; };
    const decl = (b) => { const l = mq([b.title, ...b.desc].join('<br>')); return `${id(b)}${b.decision ? `{${l}}` : `[${l}]`}`; };
    const link = (a, b, label, kind) => {
      if (kind === 'yes') styles.push(`  linkStyle ${links.length} stroke:#2563eb,color:#2563eb`);
      if (kind === 'no') styles.push(`  linkStyle ${links.length} stroke:#dc2626,color:#dc2626`);
      links.push(`  ${id(a)} -->${label ? '|' + mq(label) + '|' : ''} ${id(b)}`);
    };
    const put = (it, ind) => {
      if (it.fork) { for (const b of it.boxes) out.push(ind + decl(b)); return; }
      out.push(ind + decl(it));
      for (const s of it.sides) out.push(ind + decl(s));
    };
    let gi = 0;
    for (const it of chain.filter((c) => !c.stage)) put(it, '  ');
    for (const s of stages) {
      out.push(`  subgraph g${++gi}[${mq(s.name)}]`);
      for (const it of s.items) put(it, '    ');
      out.push('  end');
    }
    let prev = null;
    for (const it of chain) {
      if (it.fork) { if (prev) for (const b of it.boxes) link(prev, b, '', 'normal'); prev = null; continue; }
      if (prev) link(prev, it, it.label, it.kind);
      for (const s of it.sides) link(it, s, s.label, s.kind);
      prev = it;
    }
    out.push(...links, ...styles, ...tintLines(all.map((b) => ({ tint: b.role.tint, mid: b.mid })), (b) => b.mid));
    return out.join('\n');
  }

  /* ===================================================================== */
  const KIND = {};
  [['flow', 'flow 흐름도'], ['sequence', 'sequence seq 주고받기 순서'], ['state', 'state 상태'], ['timeline', 'timeline schedule 일정표 일정'], ['ui', 'ui 노출 노출위치 exposure'], ['data', 'data 데이터 데이터정의 schema'],
    ['summary', 'summary summaryflow 요약흐름 요약흐름도']]
    .forEach(([k, names]) => names.split(' ').forEach((n) => (KIND[n] = k)));
  let uidN = 0;
  window.MarkDiagram = {
    kindOf: (lang) => KIND[String(lang || '').toLowerCase()] || null,
    // opt (흐름도만): { data: @자료 파일의 노드 표 (null = 찾지 못함), ctx: { viewOf(code, own), lookup(code, own) } }
    render(kind, src, opt) {
      const uid = 'dg' + ++uidN;
      if (kind === 'flow') return renderFlow(src, uid, opt || {});
      if (kind === 'sequence') return renderSequence(src, uid);
      if (kind === 'state') return renderState(src, uid);
      if (kind === 'timeline') return renderTimeline(src, uid);
      if (kind === 'ui') return renderUiTree(src);
      if (kind === 'data') return renderData(src, uid);
      if (kind === 'summary') return renderSummary(src, uid, opt || {});
      throw new Error('unknown diagram kind');
    },
    drawDataLinks,
    dataToTables,
    uiToList,
    flowTable,
    // 파일 안의 노드 표 모두 (머리 첫 칸이 「코드」인 표)
    flowTables(text) {
      const out = [], lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (!/^\s*\|/.test(lines[i]) || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || '')) continue;
        const t = flowTable(lines.slice(i).join('\n'));
        if (t && t.split('\n')[0] === lines[i]) out.push(t);
        let j = i + 2;
        while (j < lines.length && /^\s*\|/.test(lines[j])) j++;
        i = j;
      }
      return out;
    },
    // 흐름도 블록의 @자료 경로 ({ path, flow }) — 없으면 null
    flowSource(src) {
      for (const l of String(src).split('\n')) {
        const m = l.trim().match(DATA_RE);
        if (m) { const [path, flow] = m[1].trim().split('#'); return { path: path.trim(), flow: (flow || '').trim(), raw: m[1].trim() }; }
      }
      return null;
    },
    // 흐름도 블록의 노드 · 보기 (같은 문서의 다른 블록에서 연결자 도착을 찾을 때)
    flowInfo(src, opt = {}) {
      const errs = [], f = parseFlow(src, errs, opt);
      const nodes = [...f.nodes.values()].map((n) => { const sec = flowSec(n); return { id: n.id, text: n.text, sec: sec && (f.secNames.has(sec) || f.explicit.has(sec)) ? secLabel(f, sec) : '' }; });
      return { nodes, views: f.views.map((v) => ({ name: v.name, codes: v.codes })), source: f.source };
    },
    // 문서 점검: { ln, msg, info } — info 는 알려만 줌
    flowCheck(src, opt = {}) {
      const out = [], errs = [], f = parseFlow(src, errs, opt);
      for (const e of errs) if (!e.loading && /노드 자료|node data/.test(e.msg)) out.push({ ln: e.ln, msg: e.msg });
      if (errs.length && !f.nodes.size) return out;
      const seen = new Set();
      for (const v of f.views) for (const c of v.codes) {
        if (!f.nodes.has(c)) out.push({ ln: v.ln, msg: L(`@보기에 적은 코드가 표에 없습니다: ${c}`, `Code in @view isn't in the table: ${c}`) });
        else if (seen.has(c)) out.push({ ln: v.ln, msg: L(`@보기에 같은 코드가 두 번 있습니다: ${c}`, `Same code twice in @view: ${c}`) });
        seen.add(c);
      }
      applyView(f, []);
      for (const e of f.edges) {
        if (f.all.has(e.to)) continue;
        if (!whereOf(f, e.to, opt.ctx).found) out.push({ ln: e.ln, msg: L(`연결 도착을 어디서도 찾지 못했습니다: ${e.from} → ${e.to}`, `Couldn't find where this goes: ${e.from} → ${e.to}`) });
      }
      // 갈래 · 글자 수: 알려만 줌. 다른 보기 · 섹션 · 문서로 가는 갈래(연결자로 그려지는 것)는 세지 않음
      for (const n of f.nodes.values()) {
        const fw = f.edges.filter((e) => e.from === n.id && f.nodes.has(e.to) && flowSec(f.nodes.get(e.to)) === flowSec(n));
        if (fw.length > 4) out.push({ ln: n.ln, info: true, msg: L(`${n.id} 갈래 ${fw.length}개 — @보기로 나누거나 연결자로 보이기 (데이터는 그대로)`, `${n.id} has ${fw.length} branches — split with @view or show them as connectors (keep the data)`) });
        if ([...(n.text || '').replace(/<br\s*\/?>/gi, '')].length > 20) out.push({ ln: n.ln, info: true, msg: L(`${n.id} 도형 문구 20자 넘음 (줄을 바꿔 다 보임)`, `${n.id} text over 20 chars (wrapped, not cut)`) });
      }
      for (const e of f.edges) if (e.label && [...e.label].length > 12) out.push({ ln: e.ln, info: true, msg: L(`선 글자 12자 넘음: ${e.label}`, `Line label over 12 chars: ${e.label}`) });
      return out;
    },
    // 요약 흐름도 문서 점검: 문법 오류 { ln, msg }
    summaryCheck(src) {
      const errs = [];
      parseSummary(src, errs);
      return errs.map((e) => ({ ln: e.ln, msg: e.msg }));
    },
    // 다른 뷰어용: 같은 내용을 Mermaid 문법으로
    toMermaid(kind, src, opt) {
      if (kind === 'flow') return flowMermaid(src, opt || {});
      if (kind === 'sequence') return renderSequence(src, 'm', true);
      if (kind === 'state') return renderState(src, 'm', true);
      if (kind === 'timeline') return renderTimeline(src, 'm', true);
      if (kind === 'summary') return summaryMermaid(src);
      throw new Error('unknown diagram kind');
    },
  };
})();
