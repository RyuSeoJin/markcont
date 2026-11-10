[한국어](README.md) | **English**

<div align="center">

<img src="app/icons/icon-192.png" width="84" alt="markcont icon">

# markcont

A Markdown viewer that turns plain `.md` files into readable documents, and lets you edit them right where you read.<br>
Runs as a web app and as a desktop app for Windows, macOS and Linux.

[Use it in the browser](https://ryuseojin.github.io/markcont/) · [Download](https://github.com/RyuSeoJin/markcont/releases/latest) · [User guide](app/docs/guide.en.md) · [Writing rules](app/docs/writing-rules.en.md)

<img src=".github/assets/demo.gif" width="860" alt="markcont demo: folder tree, formatted documents, a markcont flowchart, live preview, dark mode">

</div>

## Why I made it

I used to write every planning document in full detail, and it kept falling behind a fast-moving project.

So I switched to lightweight Markdown: each document only records *what we decided to build, why, and the conditions that must hold*. Everything else gets filled in by talking with the dev team.

The catch was that opened in Notepad or a code editor, tables, flowcharts and callouts show up as raw symbols. markcont exists to make those lightweight documents comfortable to read.

## Try it

No install: open [ryuseojin.github.io/markcont](https://ryuseojin.github.io/markcont/) and drop a `.md` file or a folder onto the window. Files are read inside your browser and never uploaded.

Desktop app, one line:

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/RyuSeoJin/markcont/main/install.ps1 | iex
```

```bash
# macOS · Linux
curl -fsSL https://raw.githubusercontent.com/RyuSeoJin/markcont/main/install.sh | sh
```

Or grab a file from [Releases](https://github.com/RyuSeoJin/markcont/releases/latest): `-setup.exe` for Windows, `.dmg` for macOS, `.AppImage` / `.deb` for Linux.

> [!NOTE]
> The builds aren't code-signed, so you may see a warning the first time. On Windows choose **More info → Run anyway**; on macOS **right-click the app → Open**.
>
> - **Moving to a new version**: the easiest way is **⋯ → Help → Check for updates** inside the app. If you install a new `-setup.exe` over it, choose **Do not uninstall** in the installer. Your settings and history stay. (Choosing "Uninstall before installing" may show "Unable to uninstall!".)
> - On PCs with **Windows Smart App Control** turned on, installing, uninstalling or updating may be blocked because the app isn't signed. Smart App Control can't allow a single app, so on such PCs use the [web app](https://ryuseojin.github.io/markcont/) without installing. Turning Smart App Control off lets you install, but it disables a Windows security feature and may be hard to turn back on, so we don't recommend it.

## What it does

**Read**
- GitHub-style tables, callouts (`> [!NOTE]`), task lists, footnotes and code highlighting.
- Math (`$E=mc^2$`), chemical formulas and Mermaid diagrams.
- Dark mode, font size and width settings, table of contents, collapsible headings.
- Embed another document with `![[doc#heading]]`, organize long documents with `:::` tabs · steps · file trees, and present sections as slides.

**Edit**
- Source and result side by side, with a preview that updates as you type.
- See what will change before you save; undo history is kept.
- Open whole folders and create, rename or delete documents on one screen.
- A copy is kept on every save, so you can go back to earlier content for 14 days, even after closing the document.
- Type `[[` to pick a document or heading, or `/` to insert blocks like tables, callouts and flowcharts. New documents can start from a template.
- Paste a screenshot, Excel cells or text from the web or Notion and get an image file, a table or Markdown.

**Find and export**
- Find files by name or Korean initials (`ㄱㅎㅅ` → 기획서) with <kbd>Ctrl</kbd>+<kbd>O</kbd>, and search every document with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>.
- See what links to a document and which links are broken; renaming a file also fixes the links that point to it.
- Save as HTML, Word (.docx) or PDF, or copy with formatting to paste into mail, Notion or Google Docs.

**Planning-doc blocks** (markcont only)
- `flow` flowcharts: write nodes as a table and get a diagram split into user and system zones.
- `ui` placement: shows where a feature lives and what appears when you enter it, as a tree.
- `data` definitions: one card per data type, one row per field.
- Also `sequence`, `state` and `timeline`.

**Claude integration** (desktop app)
- markcont also runs as an MCP server, so Claude Desktop or Claude Code can edit documents in the folder you have open.
- Claude can only read and edit Markdown / text files inside that folder — no deleting, no running commands. Changes are highlighted on screen.
- Turn on **Only suggest changes** and Claude leaves suggestion marks (`{~~old~>new~~}`) instead of editing the text; you accept or reject each one in markcont.

GitHub and Obsidian show the markcont-only blocks as plain code. **Save for other viewers** writes a standard Markdown copy (diagrams become Mermaid).

### A flowchart looks like this

````markdown
```flow
| Code | Zone | Shape | Text | Goes to |
|---|---|---|---|---|
| S1-01 | user | term | Open app | → S1-02 |
| S1-02 | system | decision | Signed in? | yes → S1-03 / no → S1-04 |
| S1-03 | system | output | Home screen | |
| S1-04 | system | output | Sign-in screen | |
```
````

You can paste the node table from an existing planning doc as is. Shapes, branches and loops are covered in [writing rules 7-2](app/docs/writing-rules.en.md).

## Privacy

- Documents are read and written only on your device. No telemetry.
- Saved versions (copies of a document, 14 days, up to 50 per file) also stay on your device: in the app's settings folder for the desktop app, in browser storage for the web app.
- Document content goes to Anthropic only when you use **Connect to Claude**.
- Loading the serif font (Google Fonts), YouTube thumbnails, styles in exported HTML (CDN) or images hosted online sends your IP address to those servers. Everything else works offline.

> Claude is a trademark of Anthropic. markcont is an independent open-source project, not affiliated with Anthropic.

## Make it your own

Feel free to fork it and adapt it to your team's document rules. The viewer is plain HTML and JS files with no build step, so it's easy to poke at.

```
app/                 UI shared by the web app and the desktop app
  index.html         page skeleton, styles, security policy (CSP)
  app.js             the viewer (Markdown rendering, editor, workspace)
  diagram.js         markcont-only blocks (flow · ui · data …)
  i18n.js            UI string table
  sw.js              offline cache
  docs/              user guide, writing rules, feature samples (also open inside the app)
  vendor/            markdown-it, DOMPurify, highlight.js, KaTeX, Mermaid (bundled so it works offline)
src-tauri/           desktop app (Tauri 2) — main.rs, file scope checks (scope.rs), MCP server (mcp.rs)
.github/workflows/   web deploy (pages), installers (release), desktop compile check (check)
```

**Web app only:** serve `app/` with any static server.

```bash
python -m http.server 8000 --directory app
# then open http://localhost:8000
```

**Desktop app:** install [Node.js](https://nodejs.org) and [Rust](https://rustup.rs), then:

```bash
npm install
npm run icons
npm run dev     # run in development
npm run build   # build installers
```

Good to know:

- The UI is bilingual (Korean / English). In code, strings are written as `L('한국어', 'English')`; strings in `index.html` live in `app/i18n.js`; docs have `*.en.md` versions.
- Page code lives in files like `app.js`, never in an inline `<script>` in `index.html`: the security policy (CSP) in `index.html` blocks every script that isn't one of the app's own files, so code hidden in a document can't run.
- The desktop app's file commands (`main.rs`) first check with `scope.rs` that a path is inside a folder or file the user picked. Add the same check to any new file command.
- Pushing to `main` deploys the web app to GitHub Pages; pushing a tag like `v1.5.0` builds installers into Releases.
- When releasing, bump the version in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `package.json`, plus `VERSION` in `app/sw.js` and `APP_VERSION` in `app/app.js`.

## Contributing

Bug reports and ideas are welcome in [Issues](https://github.com/RyuSeoJin/markcont/issues), and so are PRs. If you change UI text, please include the English string too.

## License

[MIT](LICENSE) © 2026 RyuSeoJin

Licenses of bundled libraries are in [Open-source licenses](app/docs/licenses.en.md) and `app/vendor/licenses/`.
