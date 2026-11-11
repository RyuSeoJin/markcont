---
title: 문서 스타일(CSS) 규칙
version: 1.0
---

# 문서 스타일(CSS) 규칙

「문서 스타일(CSS)」로 문서 모양을 바꿀 때 알아 둘 규칙입니다. 어떤 이름(클래스)을 고치면 되는지, 그리고 화면 · HTML 저장 · 인쇄(PDF) · 서식 복사 · Word 저장에서 각각 어떻게 되는지 정리했습니다.

스타일을 만들고 문서에 고르는 방법은 [사용 안내서](guide.md)의 「문서 스타일(CSS)」을 보세요.

## 1. CSS 는 이렇게 걸립니다

- **본문 안에만 걸립니다.** 쓴 CSS 는 문서 본문(`.markdown-body`) 안에만 적용됩니다. `h2 { color: teal; }` 처럼 바로 쓰면 되고, `.markdown-body h2` 라고 써도 같습니다. 메뉴 · 사이드바는 바뀌지 않으니 잘못 써도 고칠 수 있습니다.
- **`body` · `html` · `:root` 는 효과가 없습니다.** 본문 밖이기 때문입니다. 색 · 글꼴은 아래 2장의 변수를 스타일 **맨 위에** 써서 바꿉니다.
- **인터넷 주소는 빠집니다.** `url(https://…)` · `@import` · `image-set()` 처럼 바깥에서 글꼴 · 그림을 받아 오는 부분은 지워집니다. 문서를 연 사실과 IP 가 그 서버로 가지 않게 하려는 것입니다. 그림 · 글꼴은 `data:` 주소로 넣으세요.
- **같은 선택자면 문서 스타일이 이깁니다.** markcont 규칙보다 나중에 읽기 때문입니다. markcont 규칙이 더 구체적이면(예: `.callout .callout-title`) 그만큼 구체적으로 쓰거나 `!important` 를 붙입니다.
- **한 문서에는 스타일 하나만** 쓰입니다. 그 문서 → 가장 가까운 폴더 → 모든 문서 순으로 고릅니다.

## 2. 색 · 글꼴 변수

스타일 **맨 위에** 쓰면 문서 안 전체에 걸립니다.

```css
--accent: #c0392b;   /* 링크 · 고른 탭 · 강조 */
--text: #222;        /* 본문 글자 */
```

| 변수 | 쓰이는 곳 |
|:---|:---|
| `--text` · `--muted` | 본문 글자 · 흐린 글자 |
| `--accent` · `--accent-soft` | 링크 · 고른 탭 · 강조 색과 그 옅은 바탕 |
| `--bg` · `--surface` · `--surface-2` | 바탕 · 상자 바탕 · 한 단계 짙은 바탕 |
| `--border` | 표 · 상자 선 |
| `--code-bg` | 코드 바탕 |
| `--quote` | 인용 글자 |
| `--c-blue` · `--c-green` · `--c-purple` · `--c-amber` · `--c-red` | 알림 상자 · 배지 색 |
| `--font` · `--serif` · `--mono` | 고딕 · 명조 · 코드 글꼴 |

> [!WARNING]
> 변수는 밝은 · 어두운 테마에 똑같이 걸립니다. `--text: #222;` 처럼 어두운 글자색을 쓰면 어두운 테마에서 읽기 어렵습니다. 어두운 테마 값은 따로 씁니다.
>
> ```css
> --text: #222;
> :root[data-theme="dark"] & { --text: #eee; }
> ```

## 3. 출력 형식마다 어떻게 되나요

| | 화면 | HTML 저장 | 인쇄 · PDF | 서식 복사 | Word 저장 | 다른 뷰어용 저장 |
|:---|:---|:---|:---|:---|:---|:---|
| 문서 스타일(CSS) | ✅ | ✅ 파일 안에 함께 | ✅ `@media print` 포함 | ✅ 밝은 테마로 계산한 모양 | ❌ Word 기본 서식 | ❌ 마크다운 글만 |
| 탭 | 고른 탭 | 골라 볼 수 있음 | 탭마다 탭 상자 하나씩 차례로 | 모두 이름과 함께 | 모두 이름과 함께 | 굵은 이름 + 내용 |
| 접는 내용 · 접는 알림 상자 | 접힌 대로 | 저장할 때 모양 (그 파일을 인쇄하면 펼침) | 펼쳐서 찍음 | 펼침 | 펼침 | 그대로 |
| 수식 · 다이어그램 | ✅ | ✅ | ✅ | 그림(PNG) | 다이어그램은 그림, 수식은 TeX 글자 | 원래 글 |

- **HTML 저장**
  - 복사 · ⤢ 같은 단추는 빠지고, 저장할 때의 테마(밝게 · 어둡게)로 저장됩니다.
  - 글꼴 · 수식 · 코드 색 CSS 는 인터넷(CDN)에서 받아 옵니다.
- **인쇄 · PDF**
  - 메뉴 · 사이드바는 빠지고, 본문 글자는 11pt 입니다.
  - `<!-- 쪽 나눔 -->` 에서 쪽이 나뉩니다. 문서 정보에 `표지: 예` 가 있으면 첫 쪽이 표지가 됩니다.
  - 표 줄 · 그림 · 다이어그램 · 알림 상자는 쪽 경계에서 쪼개지지 않게 합니다.
- **서식 복사:** 밝은 테마로 그린 모양(색 · 테두리)을 글자마다 직접 넣어 붙여 넣습니다. 그래서 메일 · 노션에서도 모양이 남습니다.
- **Word 저장:** 제목 · 문단 · 목록 · 표 · 알림 상자 · 코드 같은 구조를 Word 서식으로 옮깁니다. 문서 스타일 CSS 는 들어가지 않습니다.

## 4. 블록마다 고칠 이름 (클래스)

| 블록 | 쓰는 법 | 고칠 이름 |
|:---|:---|:---|
| 제목 | `#` ~ `######` | `h1` ~ `h6`, 제목 번호 `.h-num` |
| 문서 정보 | 맨 위 `---` 사이 | `.front-matter` |
| 표지 (인쇄 첫 쪽) | 문서 정보에 `표지: 예` | `.print-cover`, `.cover-title`, `.cover-sub` |
| 문서 안 목차 | `[[_TOC_]]` | `.toc-inline` |
| 알림 상자 | `> [!NOTE]` | `.callout`, `.callout-title`, `.callout-body` |
| 알림 상자 종류 | `[!TIP]` · `[!WARNING]` … | `.callout[data-callout="tip"]` 처럼 종류 이름(소문자) |
| 접는 알림 상자 | `> [!NOTE]-` | `details.callout` |
| 접는 내용 | `<details>` | `details`, `summary` |
| 탭 | `::: tabs` | 탭 상자 `.mc-tabs`, 탭 막대 `.mc-tab-bar`, 탭 `.mc-tab`(고른 탭 `.mc-tab.on`), 탭 내용 `.mc-tab-panel` |
| 탭 내용 하나만 | `== 이름` | `.mc-tab-panel[data-tab="이름"]` |
| 인쇄 · PDF 의 탭 막대 | `::: tabs` | `.mc-tab-head` (탭 내용마다 위에 붙는 탭 막대 — 안쪽은 화면과 같은 `.mc-tab-bar` · `.mc-tab` · `.mc-tab.on`) |
| 단계 | `::: steps` | `.mc-steps` |
| 파일 트리 | `::: tree` | `.mc-tree`, 폴더 줄 `.mc-tree li.dir` |
| 코드 블록 | ```` ``` ```` | `.code-block`, `.code-head`(언어 · 제목), `.code-body`, `pre code`, 강조 줄 `.hl-band` |
| 코드 색 | ```` ```js ```` 등 | `.hljs-keyword`, `.hljs-string` … |
| 표 | `\| 가 \| 나 \|` | `.table-wrap`, `table`, `th`, `td` |
| 표 배지 | 문서 정보에 `배지:` | `.mc-badge` |
| 수식 | `$…$` · `$$…$$` | `.katex`, 블록 수식 `.math-block` |
| Mermaid | ```` ```mermaid ```` | `.mermaid` (안쪽 색은 그릴 때 정해져 CSS 로 바꾸기 어려움) |
| markcont 다이어그램 | ```` ```flow ```` · ```` ```sequence ```` … | `.dg` |
| 데이터 정의 · 노출 위치 | ```` ```데이터 ```` · ```` ```노출 ```` | `.dt-card` · `.ut` |
| 요약 흐름도 | ```` ```요약흐름 ```` | `.dg-summary`, 칸 `.sf-node`(역할마다 `[data-role="운영"]`, 색은 `--t`), 설명 `.sf-desc`, 단계 이름 `.sf-stage`, 범례 `.sf-key`. 칸 너비는 변수 `--sf-box-width` |
| 문서 넣기 | `![[문서#제목]]` | `.md-embed` |
| 쪽 나눔 | `<!-- 쪽 나눔 -->` | `.page-break` (화면에서는 점선) |
| 각주 | `[^1]` | `.footnote-ref`, `.footnotes` |
| 할 일 | `- [ ]` | `.task-item` |
| 교정 표기 | `{++추가++}` · `{--삭제--}` · `{~~바꿈~>새 글~~}` · `{==강조==}` · `{>>메모<<}` | `.critic` (종류는 `.critic-add` · `.critic-del` · `.critic-sub` · `.critic-hl` · `.critic-cmt`) |
| 쓰는 법 · 결과 나란히 | ```` ```markdown example ```` | `.md-example`, `.ex-src`, `.ex-out` |

> [!TIP]
> 표에 없는 이름은 브라우저(또는 PC 프로그램)에서 그 부분을 오른쪽 클릭 → **검사**로 확인할 수 있습니다. 위 표의 이름은 버전이 바뀌어도 되도록 유지합니다.

## 5. 인쇄 · PDF 에만 다르게

인쇄에만 쓰는 규칙은 `@media print { … }` 안에 씁니다.

```css
@media print {
  h2 { break-before: page; }        /* 큰 제목마다 새 쪽 */
  .callout { border: 1px solid #999; }
}
```

> [!IMPORTANT]
> 화면에서 숨긴 것(고르지 않은 탭 등)은 markcont 가 `[hidden] { display: none !important; }` 로 숨깁니다. 인쇄에서 다시 보이게 하려면 **`!important` 를 꼭** 붙여야 합니다.
>
> ```css
> @media print { .mc-tab-panel[hidden] { display: block !important; } }
> ```

## 6. 바로 쓰는 예시

**회사 보고서처럼**: 강조색을 바꾸고, 큰 제목에 밑줄, 표 머리줄에 색을 넣습니다.

```css
--accent: #b4232a;
h1, h2 { border-bottom: 2px solid var(--accent); padding-bottom: .2em; }
th { background: color-mix(in srgb, var(--accent) 10%, transparent); }
```

**탭을 카드처럼**: 탭 막대 바탕을 없애고 고른 탭만 진하게 보이게 합니다.

```css
.mc-tab-bar { background: none; }
.mc-tab.on { background: var(--accent-soft); border-radius: 6px 6px 0 0; }
```

**알림 상자 하나만 바꾸기**: 「주의」 상자만 굵은 테두리로 합니다.

```css
.callout[data-callout="warning"] { border-width: 2px; }
```

**요약 흐름도의 칸 너비 · 역할 색 바꾸기**: 칸 너비는 기본 180px 이고(긴 제목이 있으면 그만큼 넓어짐), 역할 색은 범례에도 함께 바뀝니다.

```css
--sf-box-width: 220px;
.dg-summary [data-role="운영"] { --t: #b45309; }
```

**인쇄 · PDF 에서 탭마다 새 쪽에서 시작**: 기본은 탭 상자가 이어서 찍힙니다.

```css
@media print { .mc-tab-panel + .mc-tab-panel { break-before: page; } }
```

**인쇄할 때만 글자를 작게, 코드 블록은 쪽 사이에 쪼개지 않게**

```css
@media print {
  & { font-size: 10pt; }
  .code-block { break-inside: avoid; }
}
```
