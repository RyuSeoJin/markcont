// 한국어 · 중국어 · 일본어 옆의 굵게 · 기울임 · 취소선 (markdown-it 플러그인)
// - CommonMark에서는 닫는 ** 바로 앞이 문장부호이면, 뒤에 빈칸이나 문장부호가 와야 닫힙니다.
//   한국어는 조사가 바로 붙어서 `**스크립트(script)**는` · `**10%**의` 가 굵게가 되지 않습니다.
// - 이 플러그인은 기호 반대쪽이 한중일 글자일 때만 그 조건을 넓힙니다 (markdown-cjk-friendly 명세와 같은 방향).
//   그 밖의 글은 CommonMark 결과 그대로입니다.
// - markdownitCjk.pairs(md, 한 줄): 굵게 · 기울임 · 취소선 짝의 원본 위치 (다른 뷰어용 변환에서 씀)
(function () {
  // 한글 · 한자 · 가나 · 주음 · 전각 글자 (이모지는 넣지 않음)
  const CJK = /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Bopomofo}　-〿！-｠￠-￦]/u;
  // 이체자 선택자: 앞 글자를 볼 때는 건너뛰고 그 앞의 본 글자로 판단
  const VS = /^(?:[︀-️]|\udb40[\udd00-\uddef])$/;

  // i 바로 앞 글자(서로게이트 쌍을 한 글자로)와 그 시작 위치
  function before(src, i) {
    let j = i - 1;
    const c = src.charCodeAt(j);
    if (c >= 0xdc00 && c <= 0xdfff && j > 0) {
      const h = src.charCodeAt(j - 1);
      if (h >= 0xd800 && h <= 0xdbff) j--;
    }
    return { ch: src.slice(j, i), at: j };
  }
  function cjkBefore(src, pos) {
    if (pos <= 0) return false;
    let r = before(src, pos);
    if (VS.test(r.ch) && r.at > 0) r = before(src, r.at);
    return CJK.test(r.ch);
  }
  function cjkAt(src, pos, max) {
    return pos < max && CJK.test(String.fromCodePoint(src.codePointAt(pos)));
  }

  function plugin(md, opts) {
    const relax = !(opts && opts.relax === false); // relax: false → CommonMark 그대로 (위치만 기록)
    const { isWhiteSpace, isPunctChar, isMdAsciiPunct } = md.utils;
    const punct = (c) => isMdAsciiPunct(c) || isPunctChar(String.fromCharCode(c));
    const Base = md.inline.State;

    class CjkState extends Base {
      // markdown-it 14.1.0 의 scanDelims 와 같고, 반대쪽이 한중일 글자인 경우만 더함
      scanDelims(start, canSplitWord) {
        const src = this.src, max = this.posMax, marker = src.charCodeAt(start);
        const lastChar = start > 0 ? src.charCodeAt(start - 1) : 0x20;
        let pos = start;
        while (pos < max && src.charCodeAt(pos) === marker) pos++;
        const count = pos - start;
        const nextChar = pos < max ? src.charCodeAt(pos) : 0x20;
        const lastP = punct(lastChar), nextP = punct(nextChar);
        const lastW = isWhiteSpace(lastChar), nextW = isWhiteSpace(nextChar);
        const left = !nextW && (!nextP || lastW || lastP || (relax && cjkBefore(src, start)));
        const right = !lastW && (!lastP || nextW || nextP || (relax && cjkAt(src, pos, max)));
        const tr = this.env && this.env.__cjkTrack;
        if (tr && this.src === tr.src) this.__cjkMark(marker, start, count);
        return {
          can_open: left && (canSplitWord || !right || lastP),
          can_close: right && (canSplitWord || !left || nextP),
          length: count,
        };
      }
      // 기호 글자가 들어갈 토큰 번호 → 원본 위치 (앞에 쌓인 글자가 있으면 그 토큰이 먼저 들어감)
      __cjkMark(marker, start, count) {
        const map = this.__cjkPos || (this.__cjkPos = new Map());
        const first = this.tokens.length + (this.pending ? 1 : 0);
        if (marker === 0x7e /* ~ */) {
          const odd = count % 2;
          for (let k = 0; k < count - odd; k += 2) map.set(first + odd + k / 2, start + odd + k);
        } else {
          for (let k = 0; k < count; k++) map.set(first + k, start + k);
        }
      }
    }
    md.inline.State = CjkState;

    // 짝이 정해진 뒤(굵게 · 기울임 · 취소선 토큰이 만들어진 뒤) 위치를 모음
    md.inline.ruler2.after('emphasis', 'cjk_track', (state) => {
      const tr = state.env && state.env.__cjkTrack;
      const map = state.__cjkPos;
      if (!tr || !map || state.src !== tr.src) return;
      const lists = [state.delimiters, ...(state.tokens_meta || []).map((m) => m && m.delimiters).filter(Boolean)];
      for (const list of lists) {
        for (const d of list) {
          if (d.end < 0) continue;
          const t = state.tokens[d.token];
          const o = map.get(d.token), c = map.get(list[d.end].token);
          if (o == null || c == null) continue;
          if (t.type === 'strong_open') tr.out.push({ tag: 'strong', open: [o - 1, o + 1], close: [c, c + 2] });
          else if (t.type === 'em_open') tr.out.push({ tag: 'em', open: [o, o + 1], close: [c, c + 1] });
          else if (t.type === 's_open') tr.out.push({ tag: 'del', open: [o, o + 2], close: [c, c + 2] });
        }
      }
    });
  }

  // 한 줄(인라인)을 읽어 굵게 · 기울임 · 취소선 짝의 원본 위치를 돌려줌
  plugin.pairs = function (md, line) {
    const tr = { src: line, out: [] };
    try { md.parseInline(line, { __cjkTrack: tr }); } catch { return []; }
    return tr.out;
  };
  // 한중일 글자와 문장부호 사이에 기호(같은 글자가 이어진 묶음)가 끼어 있는지
  //  - 없으면 CommonMark와 결과가 같으므로, 다른 뷰어용 변환은 이 줄을 건너뜀
  const C = CJK.source.slice(1, -1);
  plugin.edge = new RegExp(`[${C}][\\ufe00-\\ufe0f\\u{e0100}-\\u{e01ef}]?([*_~])\\1*(?!\\1)[\\p{P}\\p{S}]|([\\p{P}\\p{S}])(?!\\2)([*_~])\\3*[${C}]`, 'u');

  if (typeof module !== 'undefined' && module.exports) module.exports = plugin;
  if (typeof window !== 'undefined') window.markdownitCjk = plugin;
})();
