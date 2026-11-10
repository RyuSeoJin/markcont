---
title: Document style (CSS) rules
version: 1.0
---

# Document style (CSS) rules

What to know when you change how documents look with **Document style (CSS)**: which names (classes) to target, and what happens on screen, in Save as HTML, Print (PDF), Copy with formatting and Save as Word.

To create a style and pick where it applies, see "Document styles (CSS)" in the [User guide](guide.en.md).

## 1. How your CSS applies

- **Only inside the document.** Your CSS applies only inside the document body (`.markdown-body`). Write `h2 { color: teal; }` directly; `.markdown-body h2` means the same. Menus and the sidebar don't change, so a mistake is easy to fix.
- **`body`, `html` and `:root` have no effect**, because they are outside the document. Change colors and fonts with the variables in section 2, written at the **top** of your style.
- **Internet addresses are removed.** Anything that loads fonts or images from outside — `url(https://…)`, `@import`, `image-set()` — is dropped, so opening a document doesn't tell another server about it or your IP. Use `data:` addresses for images and fonts.
- **With the same selector, your style wins**, because it is read after markcont's. If markcont's rule is more specific (for example `.callout .callout-title`), be as specific or add `!important`.
- **One style per document.** It is picked in this order: that document → the closest folder → all documents.

## 2. Color and font variables

Put these at the **top** of your style to change the whole document.

```css
--accent: #c0392b;   /* links · selected tab · highlights */
--text: #222;        /* body text */
```

| Variable | Used for |
|:---|:---|
| `--text` · `--muted` | Body text · dimmed text |
| `--accent` · `--accent-soft` | Links · selected tab · highlight color, and its light background |
| `--bg` · `--surface` · `--surface-2` | Page background · box background · slightly darker background |
| `--border` | Table and box lines |
| `--code-bg` | Code background |
| `--quote` | Quote text |
| `--c-blue` · `--c-green` · `--c-purple` · `--c-amber` · `--c-red` | Callout and badge colors |
| `--font` · `--serif` · `--mono` | Sans · serif · code fonts |

> [!WARNING]
> Variables apply to both the light and dark themes. A dark text color like `--text: #222;` is hard to read in the dark theme, so set dark-theme values separately.
>
> ```css
> --text: #222;
> :root[data-theme="dark"] & { --text: #eee; }
> ```

## 3. What each output does

| | Screen | Save as HTML | Print · PDF | Copy with formatting | Save as Word | Save for other viewers |
|:---|:---|:---|:---|:---|:---|:---|
| Document style (CSS) | ✅ | ✅ included in the file | ✅ including `@media print` | ✅ as computed in the light theme | ❌ Word's own formatting | ❌ Markdown text only |
| Tabs | Selected tab | Switchable | All, with their names | All, with their names | All, with their names | Bold name + content |
| Collapsible content · collapsible callouts | As collapsed | As when saved (expanded when that file is printed) | Expanded | Expanded | Expanded | Unchanged |
| Math · diagrams | ✅ | ✅ | ✅ | Images (PNG) | Diagrams as images, math as TeX text | Original text |

- **Save as HTML**
  - Buttons such as copy and ⤢ are removed, and the file keeps the theme (light or dark) used when saving.
  - Fonts, math and code-color CSS are loaded from the internet (CDN).
- **Print · PDF**
  - Menus and the sidebar are left out, and body text is 11pt.
  - Pages break at `<!-- page break -->`. If the document info has `cover: yes`, the first page is a cover.
  - Table rows, images, diagrams and callouts are kept from splitting across pages.
- **Copy with formatting:** the look drawn in the light theme (colors, borders) is written onto each element, so it survives pasting into email or Notion.
- **Save as Word:** the structure — headings, paragraphs, lists, tables, callouts, code — is moved into Word formatting. Your document style CSS is not included.

## 4. Names (classes) for each block

| Block | Written as | Names to target |
|:---|:---|:---|
| Headings | `#` to `######` | `h1` to `h6`, heading numbers `.h-num` |
| Document info | Between `---` at the top | `.front-matter` |
| Cover (first printed page) | `cover: yes` in document info | `.print-cover`, `.cover-title`, `.cover-sub` |
| Table of contents in the document | `[[_TOC_]]` | `.toc-inline` |
| Callouts | `> [!NOTE]` | `.callout`, `.callout-title`, `.callout-body` |
| One kind of callout | `[!TIP]` · `[!WARNING]` … | `.callout[data-callout="tip"]` — the kind in lowercase |
| Collapsible callouts | `> [!NOTE]-` | `details.callout` |
| Collapsible content | `<details>` | `details`, `summary` |
| Tabs | `::: tabs` | `.mc-tabs`, `.mc-tab-bar`, `.mc-tab` (selected `.mc-tab.on`), `.mc-tab-panel` |
| One tab | `== Name` | `.mc-tab-panel[data-tab="Name"]` |
| Steps | `::: steps` | `.mc-steps` |
| File tree | `::: tree` | `.mc-tree`, folder rows `.mc-tree li.dir` |
| Code blocks | ```` ``` ```` | `.code-block`, `.code-head` (language · title), `.code-body`, `pre code`, highlighted lines `.hl-band` |
| Code colors | ```` ```js ```` etc. | `.hljs-keyword`, `.hljs-string` … |
| Tables | `\| a \| b \|` | `.table-wrap`, `table`, `th`, `td` |
| Table badges | `badges:` in document info | `.mc-badge` |
| Math | `$…$` · `$$…$$` | `.katex`, block math `.math-block` |
| Mermaid | ```` ```mermaid ```` | `.mermaid` (colors inside are set when drawn, so CSS can hardly change them) |
| markcont diagrams | ```` ```flow ```` · ```` ```sequence ```` … | `.dg` |
| Data definitions · exposure trees | ```` ```data ```` · ```` ```ui ```` | `.dt-card` · `.ut` |
| Embedded documents | `![[Doc#Heading]]` | `.md-embed` |
| Page breaks | `<!-- page break -->` | `.page-break` (a dashed line on screen) |
| Footnotes | `[^1]` | `.footnote-ref`, `.footnotes` |
| Task items | `- [ ]` | `.task-item` |
| CriticMarkup | `{++added++}` · `{--deleted--}` · `{~~old~>new~~}` · `{==highlight==}` · `{>>comment<<}` | `.critic` (kinds: `.critic-add` · `.critic-del` · `.critic-sub` · `.critic-hl` · `.critic-cmt`) |
| Syntax · result side by side | ```` ```markdown example ```` | `.md-example`, `.ex-src`, `.ex-out` |

> [!TIP]
> For names not in this table, right-click that part in the browser (or the desktop app) → **Inspect**. The names in this table are kept stable across versions as far as possible.

## 5. Different only in print · PDF

Put print-only rules inside `@media print { … }`.

```css
@media print {
  h2 { break-before: page; }        /* new page for each big heading */
  .callout { border: 1px solid #999; }
}
```

> [!IMPORTANT]
> Things hidden on screen (such as tabs that aren't selected) are hidden by markcont with `[hidden] { display: none !important; }`. To show them again in print you **must** add `!important`.
>
> ```css
> @media print { .mc-tab-panel[hidden] { display: block !important; } }
> ```

## 6. Ready-to-use examples

**Like a company report:** change the accent color, underline big headings and tint table headers.

```css
--accent: #b4232a;
h1, h2 { border-bottom: 2px solid var(--accent); padding-bottom: .2em; }
th { background: color-mix(in srgb, var(--accent) 10%, transparent); }
```

**Tabs like cards:** drop the tab bar background and make only the selected tab stand out.

```css
.mc-tab-bar { background: none; }
.mc-tab.on { background: var(--accent-soft); border-radius: 6px 6px 0 0; }
```

**Change just one kind of callout:** a thicker border only for Warning.

```css
.callout[data-callout="warning"] { border-width: 2px; }
```

**Smaller text in print only, and don't split code blocks across pages**

```css
@media print {
  & { font-size: 10pt; }
  .code-block { break-inside: avoid; }
}
```
