// markcont 다이어그램 — 외부 라이브러리 없이 SVG 로 그립니다.
// 흐름도는 rsj 흐름도 규칙을 따릅니다: 위 유저 구역 · 아래 시스템 구역, 도형마다 정해진 뜻,
// 왼쪽 → 오른쪽 배치, 수평 · 수직 선만, 예 = 파랑 · 아니오 = 빨강, 분기 값은 선의 출발 쪽,
// 다른 섹션으로 가거나 두 열 이상 되돌아갈 때는 「→ 코드」 · 「↩ 코드」 연결자.
// 같은 모양 규칙으로 주고받는 순서(sequence) · 상태 변화(state) · 일정표(timeline)도 그립니다.
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
     흐름도 (flow) — rsj 노드 표:  코드 | 구역 | 도형 | 문구 | 나감 | 판정 기준
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
    ['out', '나감 다음 연결 out next goesto'], ['judge', '판정기준 판정 judge rule'], ['color', '색 color']]
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

  function parseFlow(src, errs) {
    const nodes = new Map(), edges = [], secNames = new Map(), colors = [];
    let cols = ['code', 'zone', 'shape', 'text', 'out', 'judge'];
    let hideCodes = false;
    src.split('\n').forEach((raw, i) => {
      const line = raw.trim(), ln = i + 1;
      let m;
      if (!line || /^(%%|\/\/)/.test(line) || /^\*\*.*\*\*$/.test(line)) return;
      if ((m = line.match(/^#{1,6}\s+(\S+?)[:：]?\s+(.+)$/)) || (m = line.match(/^(?:섹션|section)\s+(\S+?)[:：]?\s+(.+)$/i))) { secNames.set(m[1], m[2].trim()); return; }
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
      nodes.set(id, { id, zone, type, text: (row.text || '').trim(), judge: /^[—–-]$/.test(judge) ? '' : judge, tint: row.color ? TINT[normKey(row.color)] : undefined, ln });
      for (const e of splitOut(row.out)) edges.push({ from: id, ...e, ln });
    });
    applyColors(colors, (n) => nodes.get(n));
    return { nodes, edges, secNames, hideCodes };
  }

  function renderFlow(src, uid) {
    const errs = [];
    const f = parseFlow(src, errs);
    if (!f.nodes.size) { if (!errs.length) errs.push({ msg: L('도형이 하나도 없습니다', 'No nodes') }); fail(errs); }
    if (errs.length) fail(errs);
    const { nodes, edges } = f;
    const hasZones = [...nodes.values()].some((n) => n.zone);
    for (const n of nodes.values()) {
      if (!n.zone) n.zone = 's';
      n.sec = n.id.includes('-') ? n.id.slice(0, n.id.lastIndexOf('-')) : '';
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
        const c = { id: `__c${cid++}`, type: 'goto', zone: a.zone, sec: a.sec, col: a.col + 1, virtual: true,
          code: '→ ' + e.to, text: b ? b.text : (f.secNames.get(e.to) || '') };
        nodes.set(c.id, c); e.to = c.id;
      } else if (e.back && a.col - b.col >= 2) {
        const c = { id: `__c${cid++}`, type: 'ret', zone: a.zone, sec: a.sec, col: a.col + 1, virtual: true, code: '↩ ' + b.id, text: b.text };
        nodes.set(c.id, c); e.to = c.id; e.back = false;
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
      n.lines = n.text ? wrap(n.text, small ? 120 : 150, size) : [];
      if (small && n.lines.length > 2) n.lines = [n.lines[0], n.lines[1] + '…'];
      n.codeText = n.virtual ? n.code : (f.hideCodes || n.type === 'ref' ? '' : n.id);
      if (n.type === 'sub') n.codeText = (n.codeText ? n.codeText + ' ' : '') + '▸';
      if (n.type === 'ref' && !n.lines.length) n.lines = [n.id];
      const tw = Math.max(n.codeText ? textW(n.codeText, 11.5, 700) : 0, ...n.lines.map((l) => textW(l, size)), 0);
      const th = (n.codeText ? 15 : 0) + n.lines.length * 17;
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
    // 같은 행의 사각형 도형은 가장 높은 도형에 맞춤
    const rowH = { u: [], s: [] };
    for (const n of nodes.values()) rowH[n.zone][n.slot] = Math.max(rowH[n.zone][n.slot] || 0, n.h);
    for (const n of nodes.values()) if (!['decision', 'ref', 'goto', 'ret'].includes(n.type)) n.h = rowH[n.zone][n.slot];

    // 5) 자리
    const GX = 78, GY = 34, SEC_PAD = 20, SEC_HEAD = 30, LANE_HEAD = hasZones ? 34 : 0, M = 12, LP = 26;
    const framedAny = secOrder.some((s) => s);
    const colBox = new Map(), secBox = new Map();
    let x = M + LANE_HEAD + (hasZones ? 10 : 0);
    for (const sec of secOrder) {
      const list = [...nodes.values()].filter((n) => n.sec === sec);
      const ncol = Math.max(...list.map((n) => n.col)) + 1;
      const framed = !!sec && (f.secNames.has(sec) || secOrder.length > 1);
      const x0 = x;
      if (framed) x += SEC_PAD;
      for (let c = 0; c < ncol; c++) {
        const w = Math.max(0, ...list.filter((n) => n.col === c).map((n) => n.w));
        colBox.set(`${sec}|${c}`, { x, w });
        x += w + (w ? GX : 0);
      }
      x -= GX;
      if (framed) x += SEC_PAD;
      secBox.set(sec, { x0, x1: x, framed, sub: subTargets.has(sec) });
      x += 36;
    }
    const W = x - 36 + M;
    const nU = hasZones ? Math.max(1, rowH.u.length) : 0, nS = Math.max(1, rowH.s.length);
    const rowY = { u: [], s: [] };
    let y = M + (framedAny ? SEC_HEAD : 0);
    const lane = {};
    if (hasZones) {
      lane.u0 = y; y += LP;
      for (let s = nU - 1; s >= 0; s--) { rowH.u[s] = rowH.u[s] || 40; rowY.u[s] = y; y += rowH.u[s] + GY; }
      y += LP - GY; lane.mid = y; y += LP;
    } else { y += 6; }
    for (let s = 0; s < nS; s++) { rowH.s[s] = rowH.s[s] || 40; rowY.s[s] = y; y += rowH.s[s] + GY; }
    y += (hasZones ? LP : 6) - GY;
    lane.s1 = y;
    const H = y + M + 6;
    for (const n of nodes.values()) {
      const cb = colBox.get(`${n.sec}|${n.col}`);
      n.cx = cb.x + cb.w / 2;
      n.cy = rowY[n.zone][n.slot] + rowH[n.zone][n.slot] / 2;
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
    const lane_ = (k) => { const c = gapUse.get(k) || 0; gapUse.set(k, c + 1); return (c % 2 ? 1 : -1) * Math.ceil(c / 2) * 8; };
    const gapAfter = (n) => n.cb.x + n.cb.w + GX / 2 + lane_(`${n.sec}|${n.col}|a`);
    const gapBefore = (n) => n.cb.x - GX / 2 + lane_(`${n.sec}|${n.col - 1}|a`); // 앞 열의 오른쪽 틈과 같은 칸을 나눠 씀
    const inPort = (n, dy) => {
      if (n.type === 'decision' || n.type === 'ref') return { x: n.cx - n.w / 2, y: n.cy };
      const sk = n.type === 'input' || n.type === 'output' ? SKEW / 2 : 0;
      return { x: n.cx - n.w / 2 + sk, y: n.cy + dy };
    };
    const outPort = (n, side, dy) => {
      if (side === 'top') return { x: n.cx, y: n.cy - n.h / 2 };
      if (side === 'bottom') return { x: n.cx, y: n.cy + n.h / 2 };
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
      const step = Math.min(12, n.h / (list.length + 1));
      list.forEach((e, i) => (e.inDy = (i - (list.length - 1) / 2) * step));
      // 출발 도형이 같은 높이에 있으면 곧게 들어오게 (겹치지 않을 때만)
      if (!['decision', 'ref'].includes(n.type)) {
        const used = new Set();
        for (const e of list) {
          const sy = nodes.get(e.from).cy - n.cy;
          if (Math.abs(sy) <= n.h / 2 - 6 && !used.has(Math.round(sy))) { e.inDy = sy; used.add(Math.round(sy)); }
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
      } else {
        const step = Math.min(10, a.h / (fw.length + 1));
        fw.forEach((e, i) => { e.side = 'right'; e.outDy = (i - (fw.length - 1) / 2) * step; });
      }
    }
    let backK = 0;
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
        const xb = Math.min(gapBefore(b), E.x - 16);
        e.pts = [S, { x: S.x, y: yE }, { x: xb, y: yE }, { x: xb, y: E.y }, E];
        continue;
      }
      const S = outPort(a, e.side, e.outDy || 0), E = inPort(b, e.inDy || 0);
      const cands = [];
      const xb = Math.min(gapBefore(b), E.x - 18);
      const rowTop = rowY[b.zone][b.slot], rowBot = rowTop + rowH[b.zone][b.slot];
      if (e.side === 'top' || e.side === 'bottom') {
        cands.push([S, { x: S.x, y: E.y }, E]);
        const yc = e.side === 'bottom' ? a.cy + a.h / 2 + GY / 2 : a.cy - a.h / 2 - GY / 2;
        cands.push([S, { x: S.x, y: yc }, { x: xb, y: yc }, { x: xb, y: E.y }, E]);
      } else {
        if (Math.abs(S.y - E.y) < 0.5) cands.push([S, E]);
        const xa = Math.max(gapAfter(a), S.x + 22);
        cands.push([S, { x: xa, y: S.y }, { x: xa, y: E.y }, E]);
        cands.push([S, { x: xb, y: S.y }, { x: xb, y: E.y }, E]);
        for (const yc of [rowTop - GY / 2, rowBot + GY / 2]) cands.push([S, { x: xa, y: S.y }, { x: xa, y: yc }, { x: xb, y: yc }, { x: xb, y: E.y }, E]);
      }
      e.pts = cands.find((p) => !hits(p, skip)) || cands[cands.length - 1];
    }

    // 7) 그리기
    let svg = markers(uid, ['normal', 'yes', 'no']);
    if (hasZones) {
      svg += `<rect class="dg-lane u" x="${M}" y="${r1(lane.u0)}" width="${r1(W - M * 2)}" height="${r1(lane.mid - lane.u0)}" rx="8"/>`;
      svg += `<rect class="dg-lane s" x="${M}" y="${r1(lane.mid)}" width="${r1(W - M * 2)}" height="${r1(lane.s1 - lane.mid)}" rx="8"/>`;
      svg += `<line class="dg-lane-line" x1="${M}" x2="${r1(W - M)}" y1="${r1(lane.mid)}" y2="${r1(lane.mid)}"/>`;
      const lx = M + LANE_HEAD / 2;
      svg += `<text class="dg-lane-label" transform="translate(${r1(lx)},${r1((lane.u0 + lane.mid) / 2)}) rotate(-90)">${esc(L('유저', 'User'))}</text>`;
      svg += `<text class="dg-lane-label" transform="translate(${r1(lx)},${r1((lane.mid + lane.s1) / 2)}) rotate(-90)">${esc(L('시스템', 'System'))}</text>`;
    }
    for (const [sec, b] of secBox) {
      if (!b.framed) continue;
      const y0 = M + 4, y1 = H - M + 2;
      svg += `<rect class="dg-sec${b.sub ? ' sub' : ''}" x="${r1(b.x0)}" y="${r1(y0)}" width="${r1(b.x1 - b.x0)}" height="${r1(y1 - y0)}" rx="10"/>`;
      const name = f.secNames.get(sec);
      svg += `<text class="dg-sec-label" x="${r1(b.x0 + 12)}" y="${r1(y0 + 17)}">${esc(sec)}${name ? ' · ' + esc(name) : ''}</text>`;
    }
    for (const e of vis) {
      const kind = e.kind || 'normal';
      svg += `<path class="dg-edge ${kind}" d="${pathD(e.pts)}" marker-end="url(#${uid}-${kind})"/>`;
    }
    for (const n of nodes.values()) svg += flowNode(n, SKEW);
    for (const e of vis) {
      if (!e.label) continue;
      const [p0, p1] = e.pts;
      if (Math.abs(p0.y - p1.y) < 0.5) svg += labelBox(e.label, p1.x >= p0.x ? p0.x + 5 : p0.x - 5, p0.y, e.kind, p1.x >= p0.x ? 'start' : 'end');
      else svg += labelBox(e.label, p0.x, p1.y > p0.y ? p0.y + 14 : p0.y - 14, e.kind, 'middle');
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
    const t0 = top + (n.codeText ? 15 : 0);
    n.lines.forEach((l, i) => lines.push(`<text class="dg-text${small ? ' small' : ''}" x="${r1(cx)}" y="${r1(t0 + (i + 0.5) * 17)}">${esc(l)}</text>`));
    text += lines.join('');
    const title = `<title>${esc([n.virtual ? n.code : n.id, n.text].filter(Boolean).join(' — '))}</title>`;
    return `<g class="dg-node ${n.type}${n.tint ? ' tinted tint-' + n.tint : ''}">${title}${shape}${text}</g>`;
  }

  /* =====================================================================
     주고받는 순서 (sequence)
     ===================================================================== */
  function renderSequence(src, uid) {
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
  function renderState(src, uid) {
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
  function renderTimeline(src, uid) {
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
        t.start = start; t.days = days; t.end = start + Math.round(days * DAY / DAY) * DAY;
        if (days % 1) t.end = start + days * DAY;
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

  /* ===================================================================== */
  const KIND = {};
  [['flow', 'flow 흐름도'], ['sequence', 'sequence seq 주고받기 순서'], ['state', 'state 상태'], ['timeline', 'timeline schedule 일정표 일정']]
    .forEach(([k, names]) => names.split(' ').forEach((n) => (KIND[n] = k)));
  let uidN = 0;
  window.MarkDiagram = {
    kindOf: (lang) => KIND[String(lang || '').toLowerCase()] || null,
    render(kind, src) {
      const uid = 'dg' + ++uidN;
      if (kind === 'flow') return renderFlow(src, uid);
      if (kind === 'sequence') return renderSequence(src, uid);
      if (kind === 'state') return renderState(src, uid);
      if (kind === 'timeline') return renderTimeline(src, uid);
      throw new Error('unknown diagram kind');
    },
  };
})();
