# Open-source licenses

markcont uses the open-source software below. Many thanks to everyone who made it.

## markcont

[MIT License](https://github.com/RyuSeoJin/markcont/blob/main/LICENSE) © 2026 RyuSeoJin

## Libraries used in the interface (web)

| Library | Version | License | License text |
|:---|:---|:---|:---|
| markdown-it | 14.3.3 | MIT | `vendor/licenses/markdown-it-LICENSE.txt` |
| markdown-it-footnote | 4.0.0 | MIT | `vendor/licenses/markdown-it-footnote-LICENSE.txt` |
| markdown-it-deflist | 4.0.0 | MIT | `vendor/licenses/markdown-it-deflist-LICENSE.txt` |
| markdown-it-mark | 4.0.0 | MIT | `vendor/licenses/markdown-it-mark-LICENSE.txt` |
| markdown-it-ins | 4.0.0 | MIT | `vendor/licenses/markdown-it-ins-LICENSE.txt` |
| markdown-it-emoji (emoji code list only) | 3.1.0 | MIT | `vendor/licenses/markdown-it-emoji-LICENSE.txt` |
| DOMPurify | 3.4.17 | Apache-2.0 or MPL-2.0 | `vendor/licenses/dompurify-LICENSE.txt` |
| highlight.js | 11.12.0 | BSD-3-Clause | `vendor/licenses/highlight.js-LICENSE.txt` |
| KaTeX (including mhchem) | 0.19.1 | MIT | `vendor/licenses/katex-LICENSE.txt` |
| Mermaid | 10.9.8 | MIT | `vendor/licenses/mermaid-LICENSE.txt` |
| Pretendard (font) | 1.3.9 | SIL Open Font License 1.1 | `vendor/licenses/pretendard-LICENSE.txt` |

The license texts are in the `vendor/licenses/` folder inside the program and in the [GitHub repository](https://github.com/RyuSeoJin/markcont/tree/main/app/vendor/licenses).

If you choose the Serif font, Noto Serif KR (SIL Open Font License 1.1) is loaded from Google Fonts over the internet.

## Libraries bundled inside other libraries

The Mermaid · markdown-it · emoji code list files have the libraries below bundled inside them. The versions on the Mermaid side are the ones used to build Mermaid 10.9.8 (that release's pnpm-lock.yaml).

| Bundled in | Library | Version | License | License text |
|:---|:---|:---|:---|:---|
| mermaid | [@braintree/sanitize-url](https://github.com/braintree/sanitize-url) | 6.0.4 | MIT | `vendor/licenses/bundled/braintree__sanitize-url-LICENSE.txt` |
| mermaid | [cytoscape](https://github.com/cytoscape/cytoscape.js) | 3.28.1 | MIT | `vendor/licenses/bundled/cytoscape-LICENSE.txt` |
| mermaid | [heap](https://github.com/qiao/heap.js) (used by cytoscape) | 0.2.7 | MIT | `vendor/licenses/bundled/heap-LICENSE.txt` |
| mermaid | [cytoscape-cose-bilkent](https://github.com/cytoscape/cytoscape.js-cose-bilkent) | 4.1.0 | MIT | `vendor/licenses/bundled/cytoscape-cose-bilkent-LICENSE.txt` |
| mermaid | [cose-base](https://github.com/iVis-at-Bilkent/cose-base) | 1.0.3 | MIT | `vendor/licenses/bundled/cose-base-LICENSE.txt` |
| mermaid | [layout-base](https://github.com/iVis-at-Bilkent/layout-base) | 1.0.2 | MIT | `vendor/licenses/bundled/layout-base-LICENSE.txt` |
| mermaid | [d3](https://github.com/d3/d3) (including d3-* modules) | 7.9.0 · 7.8.5 | ISC | `vendor/licenses/bundled/d3-LICENSE.txt` |
| mermaid | [internmap](https://github.com/mbostock/internmap) | 2.0.3 · 1.0.1 | ISC | `vendor/licenses/bundled/internmap-LICENSE.txt` |
| mermaid | [delaunator](https://github.com/mapbox/delaunator) | 5.0.1 | ISC | `vendor/licenses/bundled/delaunator-LICENSE.txt` |
| mermaid | [robust-predicates](https://github.com/mourner/robust-predicates) | 3.0.2 | Unlicense | `vendor/licenses/bundled/robust-predicates-LICENSE.txt` |
| mermaid | [d3-sankey](https://github.com/d3/d3-sankey) (including d3-array 2 · d3-shape 1 · d3-path 1) | 0.12.3 | BSD-3-Clause | `vendor/licenses/bundled/d3-sankey-LICENSE.txt` |
| mermaid | [dagre-d3-es](https://github.com/tbo47/dagre-es) | 7.0.13 | MIT | `vendor/licenses/bundled/dagre-d3-es-LICENSE.txt` |
| mermaid | [dayjs](https://github.com/iamkun/dayjs) | 1.11.10 | MIT | `vendor/licenses/bundled/dayjs-LICENSE.txt` |
| mermaid | [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4.2 | Apache-2.0 or MPL-2.0 | `vendor/licenses/dompurify-LICENSE.txt` |
| mermaid | [elkjs](https://github.com/kieler/elkjs) | 0.9.2 | EPL-2.0 (used under EPL-2.0, out of EPL-2.0 · GPL-3.0) | `vendor/licenses/bundled/elkjs-LICENSE.txt` |
| mermaid | [js-yaml](https://github.com/nodeca/js-yaml) | 4.1.0 | MIT | `vendor/licenses/bundled/js-yaml-LICENSE.txt` |
| mermaid | [KaTeX](https://github.com/KaTeX/KaTeX) | 0.16.45 | MIT | `vendor/licenses/katex-LICENSE.txt` |
| mermaid | [khroma](https://github.com/fabiospampinato/khroma) | 2.1.0 | MIT | `vendor/licenses/bundled/khroma-LICENSE.txt` |
| mermaid | [lodash-es](https://github.com/lodash/lodash) · lodash | 4.18.1 | MIT | `vendor/licenses/bundled/lodash-es-LICENSE.txt` |
| mermaid | [mdast-util-from-markdown](https://github.com/syntax-tree/mdast-util-from-markdown) (including micromark 3 and its micromark-* packages, mdast-util-to-string, unist-util-stringify-position, decode-named-character-reference, character-entities — all by the same author) | 1.3.1 | MIT | `vendor/licenses/bundled/mdast-util-from-markdown-LICENSE.txt` |
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
| markdown-it-emoji | [gemoji](https://github.com/github/gemoji) (GitHub emoji names) | 4.1.0 | MIT | `vendor/licenses/bundled/gemoji-LICENSE.txt` |

> [!NOTE]
> - elkjs (EPL-2.0) is included inside Mermaid in compiled form. The source code is available at [github.com/kieler/elkjs](https://github.com/kieler/elkjs), and the license text is in `vendor/licenses/bundled/elkjs-LICENSE.txt`.
> - cytoscape includes a Bezier curve function by Gaetan Renaudeau and a spring function by Koen Bok (Framer.js), both MIT; their copyright notices are kept in the comments inside `vendor/mermaid.min.js`.

## Trademarks

- Claude is a trademark of Anthropic. markcont is an independent open-source program not affiliated with Anthropic.
- GitHub, Windows, macOS, and others are trademarks of their respective companies.
