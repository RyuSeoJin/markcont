# 오픈소스 라이선스

markcont는 아래 오픈소스 소프트웨어를 사용합니다. 만든 분들께 감사드립니다.

## markcont

[MIT License](https://github.com/RyuSeoJin/markcont/blob/main/LICENSE) © 2026 RyuSeoJin

## 화면(웹)에 들어간 라이브러리

| 라이브러리 | 버전 | 라이선스 | 원문 |
|:---|:---|:---|:---|
| markdown-it | 14.3.3 | MIT | `vendor/licenses/markdown-it-LICENSE.txt` |
| markdown-it-footnote | 4.0.0 | MIT | `vendor/licenses/markdown-it-footnote-LICENSE.txt` |
| markdown-it-deflist | 4.0.0 | MIT | `vendor/licenses/markdown-it-deflist-LICENSE.txt` |
| markdown-it-mark | 4.0.0 | MIT | `vendor/licenses/markdown-it-mark-LICENSE.txt` |
| markdown-it-ins | 4.0.0 | MIT | `vendor/licenses/markdown-it-ins-LICENSE.txt` |
| markdown-it-emoji (이모지 코드 목록만) | 3.1.0 | MIT | `vendor/licenses/markdown-it-emoji-LICENSE.txt` |
| DOMPurify | 3.4.17 | Apache-2.0 또는 MPL-2.0 | `vendor/licenses/dompurify-LICENSE.txt` |
| highlight.js | 11.12.0 | BSD-3-Clause | `vendor/licenses/highlight.js-LICENSE.txt` |
| KaTeX (mhchem 포함) | 0.19.1 | MIT | `vendor/licenses/katex-LICENSE.txt` |
| Mermaid | 10.9.8 | MIT | `vendor/licenses/mermaid-LICENSE.txt` |
| Pretendard (글꼴) | 1.3.9 | SIL Open Font License 1.1 | `vendor/licenses/pretendard-LICENSE.txt` |

원문 파일은 프로그램 안 `vendor/licenses/` 폴더와 [GitHub 저장소](https://github.com/RyuSeoJin/markcont/tree/main/app/vendor/licenses)에 있습니다.

명조 글꼴을 고르면 Google Fonts의 Noto Serif KR(SIL Open Font License 1.1)을 인터넷에서 불러옵니다.

## 다른 라이브러리 안에 함께 들어 있는 라이브러리

Mermaid · markdown-it · 이모지 코드 목록 파일 안에는 아래 라이브러리가 함께 묶여 있습니다. Mermaid 쪽 버전은 Mermaid 10.9.8 을 만들 때 쓰인 것(그 릴리스의 pnpm-lock.yaml)입니다.

| 묶인 곳 | 라이브러리 | 버전 | 라이선스 | 원문 |
|:---|:---|:---|:---|:---|
| mermaid | [@braintree/sanitize-url](https://github.com/braintree/sanitize-url) | 6.0.4 | MIT | `vendor/licenses/bundled/braintree__sanitize-url-LICENSE.txt` |
| mermaid | [cytoscape](https://github.com/cytoscape/cytoscape.js) | 3.28.1 | MIT | `vendor/licenses/bundled/cytoscape-LICENSE.txt` |
| mermaid | [heap](https://github.com/qiao/heap.js) (cytoscape 가 씀) | 0.2.7 | MIT | `vendor/licenses/bundled/heap-LICENSE.txt` |
| mermaid | [cytoscape-cose-bilkent](https://github.com/cytoscape/cytoscape.js-cose-bilkent) | 4.1.0 | MIT | `vendor/licenses/bundled/cytoscape-cose-bilkent-LICENSE.txt` |
| mermaid | [cose-base](https://github.com/iVis-at-Bilkent/cose-base) | 1.0.3 | MIT | `vendor/licenses/bundled/cose-base-LICENSE.txt` |
| mermaid | [layout-base](https://github.com/iVis-at-Bilkent/layout-base) | 1.0.2 | MIT | `vendor/licenses/bundled/layout-base-LICENSE.txt` |
| mermaid | [d3](https://github.com/d3/d3) (d3-* 모듈 포함) | 7.9.0 · 7.8.5 | ISC | `vendor/licenses/bundled/d3-LICENSE.txt` |
| mermaid | [internmap](https://github.com/mbostock/internmap) | 2.0.3 · 1.0.1 | ISC | `vendor/licenses/bundled/internmap-LICENSE.txt` |
| mermaid | [delaunator](https://github.com/mapbox/delaunator) | 5.0.1 | ISC | `vendor/licenses/bundled/delaunator-LICENSE.txt` |
| mermaid | [robust-predicates](https://github.com/mourner/robust-predicates) | 3.0.2 | Unlicense | `vendor/licenses/bundled/robust-predicates-LICENSE.txt` |
| mermaid | [d3-sankey](https://github.com/d3/d3-sankey) (d3-array 2 · d3-shape 1 · d3-path 1 포함) | 0.12.3 | BSD-3-Clause | `vendor/licenses/bundled/d3-sankey-LICENSE.txt` |
| mermaid | [dagre-d3-es](https://github.com/tbo47/dagre-es) | 7.0.13 | MIT | `vendor/licenses/bundled/dagre-d3-es-LICENSE.txt` |
| mermaid | [dayjs](https://github.com/iamkun/dayjs) | 1.11.10 | MIT | `vendor/licenses/bundled/dayjs-LICENSE.txt` |
| mermaid | [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4.2 | Apache-2.0 또는 MPL-2.0 | `vendor/licenses/dompurify-LICENSE.txt` |
| mermaid | [elkjs](https://github.com/kieler/elkjs) | 0.9.2 | EPL-2.0 (EPL-2.0 · GPL-3.0 중 EPL-2.0 으로 사용) | `vendor/licenses/bundled/elkjs-LICENSE.txt` |
| mermaid | [js-yaml](https://github.com/nodeca/js-yaml) | 4.1.0 | MIT | `vendor/licenses/bundled/js-yaml-LICENSE.txt` |
| mermaid | [KaTeX](https://github.com/KaTeX/KaTeX) | 0.16.45 | MIT | `vendor/licenses/katex-LICENSE.txt` |
| mermaid | [khroma](https://github.com/fabiospampinato/khroma) | 2.1.0 | MIT | `vendor/licenses/bundled/khroma-LICENSE.txt` |
| mermaid | [lodash-es](https://github.com/lodash/lodash) · lodash | 4.18.1 | MIT | `vendor/licenses/bundled/lodash-es-LICENSE.txt` |
| mermaid | [mdast-util-from-markdown](https://github.com/syntax-tree/mdast-util-from-markdown) (micromark 3 과 micromark-* 하위 패키지, mdast-util-to-string, unist-util-stringify-position, decode-named-character-reference, character-entities 포함 — 모두 같은 저작자) | 1.3.1 | MIT | `vendor/licenses/bundled/mdast-util-from-markdown-LICENSE.txt` |
| mermaid | [non-layered-tidy-tree-layout](https://github.com/stetrevor/non-layered-tidy-tree-layout) | 2.0.2 | MIT | `vendor/licenses/bundled/non-layered-tidy-tree-layout-LICENSE.txt` |
| mermaid | [stylis](https://github.com/thysultan/stylis.js) | 4.3.1 | MIT | `vendor/licenses/bundled/stylis-LICENSE.txt` |
| mermaid | [ts-dedent](https://github.com/tamino-martinius/node-ts-dedent) | 2.2.0 | MIT | `vendor/licenses/bundled/ts-dedent-LICENSE.txt` |
| mermaid | [uuid](https://github.com/uuidjs/uuid) | 9.0.1 | MIT | `vendor/licenses/bundled/uuid-LICENSE.txt` |
| mermaid | [web-worker](https://github.com/developit/web-worker) | 1.3.0 | Apache-2.0 | `vendor/licenses/bundled/web-worker-LICENSE.txt` |
| markdown-it | [entities](https://github.com/fb55/entities) | 4.5.0 | BSD-2-Clause | `vendor/licenses/bundled/entities-LICENSE.txt` |
| markdown-it | [linkify-it](https://github.com/markdown-it/linkify-it) | 5.0.2 | MIT | `vendor/licenses/bundled/linkify-it-LICENSE.txt` |
| markdown-it | [mdurl](https://github.com/markdown-it/mdurl) | 2.1.0 | MIT | `vendor/licenses/bundled/mdurl-LICENSE.txt` |
| markdown-it | [punycode.js](https://github.com/mathiasbynens/punycode.js) | 2.3.1 | MIT | `vendor/licenses/bundled/punycode.js-LICENSE.txt` |
| markdown-it | [uc.micro](https://github.com/markdown-it/uc.micro) | 2.1.0 | MIT | `vendor/licenses/bundled/uc.micro-LICENSE.txt` |
| markdown-it-emoji | [gemoji](https://github.com/github/gemoji) (GitHub 이모지 이름) | 4.1.0 | MIT | `vendor/licenses/bundled/gemoji-LICENSE.txt` |

> [!NOTE]
> - elkjs(EPL-2.0)는 Mermaid 안에 컴파일된 형태로 들어 있습니다. 소스 코드는 [github.com/kieler/elkjs](https://github.com/kieler/elkjs) 에서 받을 수 있고, 라이선스 원문은 `vendor/licenses/bundled/elkjs-LICENSE.txt` 에 있습니다.
> - cytoscape 안에는 Gaetan Renaudeau 의 베지어 곡선 함수와 Koen Bok(Framer.js)의 스프링 함수(둘 다 MIT)가 들어 있고, 그 저작권 표시는 `vendor/mermaid.min.js` 안의 주석에 그대로 있습니다.

## 상표

- Claude는 Anthropic의 상표입니다. markcont는 Anthropic과 관계없는 독립 오픈소스 프로그램입니다.
- GitHub, Windows, macOS 등은 각 회사의 상표입니다.
