---
title: markcont User guide
version: 1.16.1
---

# markcont User guide

markcont (**mark**down **cont**roller) is a program for viewing Markdown files nicely and editing them right where you read them.
This guide is laid out so a first-time user can follow it step by step.

> [!TIP]
> You can replay the first-run tour (tutorial) at any time from **⋯ → Help → Replay the tour** in the top right.

---

## 1️⃣ Opening files

| How | What to do |
|:---|:---|
| Open by name | Press <kbd>Ctrl</kbd>+<kbd>O</kbd> (**⋯ → Quick open · commands**), type part of the name and press <kbd>Enter</kbd> |
| A single file | **Open file** at the top, or <kbd>Ctrl</kbd>+<kbd>O</kbd> twice |
| A whole folder | **Open folder** at the top — the folder tree appears in the sidebar |
| Drag and drop | Drop a `.md` file or a folder onto the window |
| Double-click | If you installed the PC app, double-click a `.md` file |
| Recent documents | **Recent folders · Recent files** on the start screen and in the sidebar |

> [!NOTE]
> Files are read only on your own device. Nothing is uploaded anywhere.

### Quick open · commands (<kbd>Ctrl</kbd>+<kbd>O</kbd>)

Find files in your open folders, headings in the current document and menu commands, all in one box. Move with <kbd>↑</kbd> <kbd>↓</kbd> and open with <kbd>Enter</kbd>.

| Type | To find |
|:---|:---|
| Part of a name | Files: `spec` → Spec.md, `fp` → feature-proposals (the first letters of words) |
| Start with `>` | Commands: `>save` · `>number` · `>저장` (English and Korean names both work) |
| Start with `#` | Headings in the current document: `#decision` |
| Nothing | Files in the order you opened them |

- Case, Latin accents (`cafe` → café), full-width · half-width letters (`ＡＢＣ` = ABC) and hiragana · katakana (`きかく` → キカク) are all matched. Korean names can also be found by their initial consonants (`ㄱㅎㅅ` → 기획서), and Korean names made on a Mac are found too.
- Press <kbd>Ctrl</kbd>+<kbd>O</kbd> once more while the box is open to get the **Open file** dialog.
- The sidebar's **Filter by file name** box matches the same way.

### Where is this file?

The **file location** appears just above the document title. You can also see it by hovering over the title bar at the top.

| How you opened it | Location shown |
|:---|:---|
| PC app | Full path (`C:\Users\…\a.md`) · **Copy path** · **Show in folder** |
| A file inside a folder opened with Open folder | `folder-name/inner/a.md` · **Copy path in folder** |
| A single file opened in the browser | File name only (for security, the browser doesn't reveal the full location) |
| A dropped copy · a recent-documents entry | A note that the original location is unknown (saving creates a new file) |

- If you use **Open file** on a file inside a folder you already have open, it opens as a file in that folder tree.

---

## 2️⃣ Using the sidebar

Open and close the sidebar with the <kbd>☰</kbd> button in the top left. Drag its edge to change the width; double-click the edge to go back to the default width.

### Files tab

- When you open a folder, the tree shows **only folders that contain md files**. The number next to a folder is how many md files it holds.
- **Using Open folder again adds one more folder.** Each folder stacks up as its own top-level item (workspace). Opening the same folder again just takes you to the one that's already open.
- Right-click a top-level folder → **Close this folder** removes it from the list only. The files stay where they are.
- The PC app reopens your folders the next time you start it.
- Click a folder name to fold or unfold it. The folded state is remembered.
- When there are many files, a **Filter by file name** box appears. It ignores case and accents.
- Keyboard: <kbd>↑</kbd> <kbd>↓</kbd> move, <kbd>Enter</kbd> open, <kbd>F2</kbd> rename, <kbd>Del</kbd> delete

### Right-click menu

**Right-click** a file or folder, or press the **⋯** button at the end of its row.

| Menu | What it does |
|:---|:---|
| New document · New folder | Creates a new one inside that folder. A new document opens straight in the editor |
| Rename | Renames the file or folder |
| Copy path | The PC app copies the full path (`C:\Users\…\a.md`), which you can paste straight into the File Explorer address bar. In the browser it's **Copy path in folder**, which copies only the path inside the opened folder |
| Hide from sidebar | Leaves the file alone and only takes it out of the sidebar list. Quick open, search and links still work. Top folder ⋯ → **Show hidden items** shows them again (dimmed), and that row's ⋯ → **Show again** brings it back. **Separately opened files** are hidden for this session only; click **Show N hidden files** in the list, or open the file again, to see it |
| Remove from list | Only for **separately opened files**. Leaves the file alone and takes it out of markcont's list entirely. Unlike hiding, it no longer shows up in quick open or search; open the file again to bring it back. To take out a whole folder, use **Close this folder** on the top folder |
| Delete | The PC app sends it to the **Trash**; the browser deletes it **permanently** |

> [!WARNING]
> Files deleted in a browser (Chrome · Edge) don't go to the Trash and can't be recovered. Double-check before you delete.

**Renaming keeps links working**: when you rename a file or folder, markcont asks whether to change the `[[links]]` · `[text](file.md)` that pointed to it. It first shows the documents and lines that change, and leaves examples inside code blocks · `code` alone. When you rename a **heading** in a document and save, it also asks whether to fix `[text](doc.md#heading)` · `[[doc#heading]]` links to it. Changed documents are kept in saved versions. (PC app · Chrome · Edge)

### Contents tab

Builds a table of contents from the document's headings (`#`). The part you're reading is highlighted, and clicking a heading jumps to it.

If the document has a tab box (`::: tabs`), the tab names are listed too, under the heading above the box. Clicking one opens that tab and jumps to the box, and the tab that is open now is shown in bold. Headings inside a tab sit under that tab.

Write `[[_TOC_]]` on a line of its own in the document, and a table of contents appears there too. It's included when you print or save as PDF.

### Search tab (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>)

Searches **every document** in the open folders. Matching lines are grouped by document; click a line to go to that spot (in the view the match is highlighted, and while editing it's selected in the source).

| Button | What it does |
|:---:|:---|
| `Aa` | Match case |
| <code><u>ab</u></code> | Match whole words only (`plan` matches `plan doc` but not `planning`) |
| `.*` | Search with a regular expression (e.g. `colou?r`) |

- Like quick open, it ignores case, Latin accents, full-width · half-width and hiragana · katakana differences, and finds documents made on a Mac too.
- Korean consonants (`ㄱㅎ`) also match syllables that start with them (`ㄱㅎ` → 기획).
- The current document is searched including unsaved edits. Up to 200 lines per document and 3000 lines in total are shown.
- In the results, move with <kbd>↑</kbd> <kbd>↓</kbd> and open with <kbd>Enter</kbd>. Click a document name to fold its results.

### Links tab

Shows the documents connected to the current one. Click a row to go to that document and line.

| Group | What it shows |
|:---|:---|
| Linked from | Documents that link to this one, and the lines (backlinks) |
| Links to | Documents this one links to |
| Broken links · images | Documents · headings · images that can't be found, and links that **open only in markcont** |
| Links outside the open folder | Links that point outside the open folder (`../`), so markcont can't tell whether they exist. They aren't counted as broken. Open a parent folder to check them |
| Broken links in the folder | Press the button to see broken links in the other documents too |

> [!NOTE]
> Even when the path in `[text](folder/file.md)` is wrong, markcont finds a file with the same name and opens it. Such links break on GitHub · VS Code, so they're listed separately as **opens only in markcont**.

---

## 3️⃣ Comfortable reading

| Feature | Where | Description |
|:---|:---|:---|
| View settings | **Aa** button at the top | Text size, Sans · Serif, body width, line spacing · paragraph spacing, color theme (Default · Paper · High contrast), callout style, heading numbers (1 · 1.1), review before saving, document styles (CSS) |
| Where you left off | Automatic | Remembers where you were reading in each document and goes back there when you open it again |
| Reading time | The info line above the document | "~N min read" — counts Korean · Chinese · Japanese at 500 characters a minute and other languages at 230 words a minute, then adds them up (code blocks left out) |
| Language | View settings (Aa) → Language, or the first screen of the tour | Switch between 한국어 and English |
| Light · Dark | ☾ / ☀ button at the top | Dark mode |
| Fold a heading | ⌄ button next to a heading | Folds the content under that heading |
| Copy link | **#** button next to a heading | Copies a `[heading](#heading)` link |
| Link · footnote preview | Hover over a link or a footnote number (long-press on phones) | Shows the start of another document, the section under its heading, or the footnote text in a small window. For links to other documents, the bottom of the window also tells you **where a click or Ctrl+click will open it in the current state** |
| Side view | Click a link to another document | Keeps the document you're reading and opens the linked one on the right (read-only). Links inside the side view change only the side view. Its header has back · forward, **Open in main**, and close (<kbd>Esc</kbd>). Drag the border to resize. While editing side by side, a plain click on a link moves the editor cursor to that line; use <kbd>Ctrl</kbd>+click (or middle click · **Open beside** in the preview pop-up) to open it; over such a link the mouse shows a text cursor and turns into a hand only while <kbd>Ctrl</kbd> is held. If there isn't room for three columns while editing, the side view takes the preview's place. On narrow screens such as phones, clicking a link replaces the main document as before |
| Find in document | <kbd>Ctrl</kbd>+<kbd>F</kbd> | Highlights matches and steps through them |
| Search all documents | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>, the sidebar **Search** tab | Searches every document in the open folders (2️⃣ Search tab) |
| Focus mode | <kbd>Ctrl</kbd>+<kbd>.</kbd> | Leaves only the body text. Press <kbd>Esc</kbd> to exit |
| Enlarge code | ⤢ in the code block header | Shows the code full screen |
| Enlarge a diagram | ⤢ at the top right of a diagram | Wheel or pinch to zoom, drag to pan, "Fit to screen" |
| Enlarge an image | Click the image | Opens in a pop-up over the document. Wheel or pinch to zoom, drag to pan; click outside it or press Esc to close. While editing side by side, a click jumps to that line of the source instead |
| Present | **⋯ → Present** | Shows the sections split by dividers (`---`) one slide at a time, full screen (see below) |

- **Document styles (CSS)**: click **Document style → Manage…** at the bottom of View settings (or type `>style` in <kbd>Ctrl</kbd>+<kbd>O</kbd>) to open the styles window.
  - Bring in a `.css` file with **Load CSS file…** or make one with **＋ New style**, then edit it — something like `h2 { color: teal; }` applies right away. **Save as file…** exports it as a `.css` file to share with another computer or other people.
  - Under **Applies to**, choose for each style: **all documents · a folder · this document**. A folder style also covers its subfolders. Each document uses one style, chosen in this order: **this document → nearest folder → all documents**.
  - Only the document changes, so the menus stay usable even if you make a mistake. Save as HTML and Copy with formatting also carry that document's style.
  - Names (classes) to target, color variables, what changes in each output (HTML · print · Word) and examples are in the [Document style rules](style-rules.en.md).
  - Parts that load fonts or images from the internet (`url(https://…)`, `@import`) are skipped, so nothing about opening your documents reaches outside servers. Embed images and fonts as `data:` URLs instead.
- **Hidden notes** `%%note%%` don't show up when viewing, printing or exporting (chapter 9 of the [writing rules](writing-rules.en.md)).

### Presenting

A document that follows the writing rules, with a divider `---` between `##` sections, turns **each section into a slide**. Without dividers, each `#` · `##` heading starts a slide.

| Task | How |
|:---|:---|
| Next · previous slide | <kbd>→</kbd> · <kbd>←</kbd>, <kbd>Space</kbd>, <kbd>Page Down</kbd> · <kbd>Page Up</kbd> (presentation remotes), click the screen |
| First · last slide | <kbd>Home</kbd> · <kbd>End</kbd> |
| Overview | <kbd>G</kbd> — click a slide to go there |
| Speaker notes | <kbd>N</kbd> — comments written inside the slide as `<!-- note -->` |
| Print slides · PDF | The **Print** button at the bottom — one slide per page |
| End | <kbd>Esc</kbd> |

- It starts from the slide you were reading. Slides with a lot of content are scaled down to fit.
- `---` inside code blocks, the document info at the top, and `---` right under a line of text (a heading underline) don't split slides.

> [!NOTE]
> **When markcont goes online** — the Serif font (Google Fonts), YouTube thumbnails, web images in a document, and the styles (CDN) of files saved as HTML are downloaded from external servers, and your IP address is sent to those servers. Everything else works without the internet.

---

## 4️⃣ Editing (live editing)

Press **Edit** at the top (<kbd>Ctrl</kbd>+<kbd>E</kbd>) to see the source on the left and the result on the right, side by side.

- The result on the right and the table of contents update as you type.
- The part you're editing is shown with a **border** on the right.
- Click the result on the right to jump to that line in the source on the left.
- Switch layouts with **Editor · Split · Preview** at the top.
- Clicking a checkbox in the preview also changes `[ ]` to `[x]` in the source.

### New document · templates

**⋯ → New document** (or right-click a folder → New document) first asks you to choose a **template**. Just press <kbd>Enter</kbd> for a blank document.

| Template | What's inside |
|:---|:---|
| Feature spec | Goal · feature (screens · behavior) · flowchart · exceptions · checklist |
| Meeting notes | Attendees · agenda · decisions · to-dos (today's date in the name) |
| Flowchart | A ```` ```flow ```` chart + a node table |
| Data definition · exposure | ```` ```data ```` cards + a ```` ```ui ```` tree |

- They all follow the [writing rules](writing-rules.en.md) (one top title with no emoji, an emoji on each `##` section, `---` between sections).
- Documents in a **`templates`** folder inside an open folder show up in the template list too. Write `{{title}}` · `{{date}}` · `{{time}}` in them and they become the new document's name · today's date · the current time. Dates go in as `2026-11-07`, not `11/7`, since countries read the day and month in different orders.

### Autocomplete · the `/` menu

| Type this | What pops up |
|:---|:---|
| `[[` | The **documents** in your open folders. Pick one to get `[[document]]` |
| `[[document#` · `[[#` | The **headings** of that document (`[[#` = this document) |
| `/` at the start of a line or after a space | The **block menu**: table · callouts · checklist · code block · flowchart · summary flow · sequence · exposure tree · data definition · math · tabs · steps · file tree · collapsible · table of contents · page break · divider · embed a document · today's date |

- Keep typing to narrow the list (Korean initial consonants work too). Move with <kbd>↑</kbd> <kbd>↓</kbd> and insert with <kbd>Enter</kbd> · <kbd>Tab</kbd>.
- Close it with <kbd>Esc</kbd> and what you typed stays as it is.
- The menu doesn't open for a `/` stuck to other text, like `11/7`, `and/or` or a web address, or inside code.
- While an input method (Korean · Chinese · Japanese) is composing, <kbd>Enter</kbd> and the arrow keys belong to it, so pick after you finish the word.

### Editing shortcuts

| Shortcut | What it does |
|:---|:---|
| <kbd>Ctrl</kbd>+<kbd>B</kbd> | Bold |
| <kbd>Ctrl</kbd>+<kbd>I</kbd> | Italic |
| <kbd>Ctrl</kbd>+<kbd>K</kbd> | Link |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Indent / Outdent |
| <kbd>Enter</kbd> | Continues a list · quote on the next line (press on an empty line to end it) |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | Paste plain text without formatting |
| <kbd>Ctrl</kbd>+<kbd>H</kbd> (<kbd>⌥</kbd>+<kbd>⌘</kbd>+<kbd>F</kbd> on Mac) | Find and replace in the source |
| <kbd>Alt</kbd>+<kbd>↑</kbd> / <kbd>Alt</kbd>+<kbd>↓</kbd> | Move the current line (or selected lines) up / down. In a numbered list the numbers stay in order |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>[</kbd> / <kbd>]</kbd> | Raise (`##` → `#`) / lower (`#` → `##`) the heading level. Works on every heading in the selection |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | Save |

The editing toolbar has buttons for headings, lists, task lists, callouts, code blocks, tables, and inserting images.

- If the numbers in a numbered list got mixed up, type `>renumber` in <kbd>Ctrl</kbd>+<kbd>O</kbd> and choose **Renumber the numbered list**. It renumbers from the first item's number.
- With the cursor **inside a table**, <kbd>Tab</kbd> · <kbd>Shift</kbd>+<kbd>Tab</kbd> move to the next · previous cell, and <kbd>Tab</kbd> in the last cell adds an empty row below. <kbd>Shift</kbd>+<kbd>Enter</kbd> inside a cell inserts a line break (`<br>`) without breaking the table. Table buttons (**Align · Row+ · Row− · Col+ · Col− · ◀Col · Col▶ · Sort**) appear in the toolbar. Align measures the real width of Korean characters and emoji, so it may be off by about half a space depending on the font. Sort toggles ascending · descending, and a column of numbers sorts by value.
- Changing heading levels leaves `#` inside code blocks alone, and if any heading can't go above `#` or below `######`, nothing changes so the headings keep their relative levels.
- Each of these can be undone with a single <kbd>Ctrl</kbd>+<kbd>Z</kbd>.

### Find and replace (<kbd>Ctrl</kbd>+<kbd>H</kbd>)

Find and replace boxes open above the source, and matches are painted yellow in the source.

| Task | How |
|:---|:---|
| Next · previous match | <kbd>Enter</kbd> · <kbd>Shift</kbd>+<kbd>Enter</kbd> in the Find box, or the ⌄ ⌃ buttons |
| Replace one by one | <kbd>Enter</kbd> in the Replace box (or **Replace**) — replaces the current match and moves to the next |
| Replace all | The **Replace all** button (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>) |
| Match case · whole word · regex | The `Aa` · <code><u>ab</u></code> · `.*` buttons (whole word also works for Korean by looking at the neighboring letters) |
| Close | <kbd>Esc</kbd> |

- With a regular expression, the replacement can use `$1` `$2` (groups), `$&` (the whole match) and `\n` (line break). Example: `(\d+)px` → `$1 px`
- On macOS <kbd>⌘</kbd>+<kbd>H</kbd> is "Hide app", so like VS Code it uses <kbd>⌥</kbd>+<kbd>⌘</kbd>+<kbd>F</kbd>.
- To find in the preview use <kbd>Ctrl</kbd>+<kbd>F</kbd>; to search every document in the open folders use <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>.

### Pasting

| What you paste | What goes in |
|:---|:---|
| A screenshot · image file | Saved as an image file in an `images` folder next to the document, plus `![](images/paste-20261107-143205.png)` |
| Cells from Excel · Google Sheets | A markdown table |
| Text from a web page · Notion · Google Docs · Word | Markdown that keeps headings · lists · links · tables · bold · code |
| A URL (`https://…`) while text is selected | A `[selected text](URL)` link |

- If you don't like the converted result, remove it with <kbd>Ctrl</kbd>+<kbd>Z</kbd> and paste plain text with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>.
- Inside a code block (```` ``` ````), and for text copied from a code editor (VS Code etc.), the text is pasted as it is.
- After an image is inserted, the cursor sits inside `![ ]`, so you can type a description right away and it shows under the image.
- The web app can save images only for documents opened with **Open folder** (for a file opened on its own, the browser doesn't tell markcont its folder).

### Seeing what you've changed · undoing

| What you see | Meaning |
|:---|:---|
| **Green bar** next to line numbers | A line newly written since saving |
| **Blue bar** next to line numbers | A line changed since saving |
| **Red ▸** next to line numbers | Lines were deleted here |
| **N lines changed · View** in the status bar | Click to open the changes window |

Open the window with the **History** button in the editing toolbar (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>H</kbd>).

- **Changes since save**: Compares the saved version with the current one using `−` (deleted lines) / `+` (new lines). Each changed chunk has **Undo this part**, and at the bottom there's **Revert all to saved**.
- **Undo history**: Your edits are recorded every second with a timestamp. Click a point in time to first see **how the current document would change if you went back to it**, then press **Undo** to go back. This history disappears when you close the program.
- **Saved versions**: A copy of the file is kept every time you save, and every time Claude or another program changes the file. They stay **for 14 days even after you close the program, up to the latest 50 per file**, so you can go back to older content even after saving. Click one to first see what would change, then press **Go back to …** to put that content in the editor (save to write it to the file). You can also remove them with **Delete these versions**.
- Even after going back, you can cancel with <kbd>Ctrl</kbd>+<kbd>Z</kbd>.

> [!NOTE]
> Saved versions stay only on your device: in the app's settings folder for the PC app (`%APPDATA%\com.markcont.app\history` on Windows), and in browser storage for the web app. When you rename a file, its versions follow it.

---

## 5️⃣ Saving and exporting

| Task | How |
|:---|:---|
| Save to original file | **Save** button or <kbd>Ctrl</kbd>+<kbd>S</kbd> |
| Save as a new file | **▾ → Save as new file…** next to the Save button, or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> — the original file stays as it is, and from then on you edit the new file |
| For other viewers | **▾ → Save for other viewers…** next to the Save button — a copy with markcont-only syntax converted to standard syntax (looks the same on GitHub · VS Code; the original stays as it is) |
| As an HTML file | **⋯ → Export → HTML file** — a single file that looks just like the screen |
| As a PDF | In **⋯ → Export → Print · PDF**, choose "Save as PDF" |
| As a Word file | **⋯ → Export → Word file (.docx)** — to send to a company or keep editing in Word · Hancom Office |
| Somewhere else, looking the same | **⋯ → Export → Copy with formatting**, then paste into mail · Notion · Google Docs · a blog editor — tables · callouts · code colors stay, and math · diagrams go in as images. Select part of the document first to copy just that part |

- Files opened with Open file · Open folder are **saved straight to the original file**.
- Before saving, markcont **shows you what will change and asks once more** (Cancel · Save as new file · Save). To turn this off, turn off **Aa → Review changes before saving**, or check **Don't ask again** in the confirmation window.
- Documents whose original location is unknown (the User guide, new documents, some dropped files) automatically open **Save as new file** when you save.
- If you save a new file inside an open folder, it shows up in that folder tree right away.
- Click **⚠ N issues found** at the top of a document to see the spots worth fixing in one list. Click a row to jump there.

  | Group | What it looks at |
  |:---|:---|
  | Broken links · images | Documents · headings · images that can't be found, links that open only in markcont |
  | Invisible characters | Control characters, zero-width spaces, text-direction controls, hidden tag characters and the like. The editor marks each spot in red, and **Remove invisible characters** below the list removes them all at once (characters that are part of something, like the joiners inside emoji, are left alone) |
  | Links outside the open folder, not checked | Links · images that point outside the open folder (`../`). Listed separately and not counted in **⚠ N issues found** |
  | Skipped heading levels | `####` right after `##` |
  | Footnotes | Footnote notes that are never used, footnote numbers without a note |
  | Table rows with a different number of cells | Rows with more or fewer cells than the header |
  | Long sentences | Sentences over 100 Korean characters · 40 English words |
  | Writing rules | More than one title (`#`), 3+ callouts or 2+ highlights in one section (`##`) |
  | Writing rules (documents that follow them) | Emoji in the top title or a `###`, a `##` with no emoji or more than one, a missing `---` between `##` sections, a bold line used as a heading. Checked only when a `##` section has an emoji or the document info has `viewer: markcont` |
  | Looks different in other viewers | markcont-only syntax (`==highlight==`, `[!INFO]`, ```` ```flow ````, etc.) — **Convert this document** converts it all at once |

  With no issues and only markcont-only syntax, it shows **⚠ N spots look different in other viewers** instead. To hide it, turn off **Aa → Show the document check**.
- If another program changes the file, markcont **reloads it automatically.** If you have unsaved changes, it won't overwrite them and lets you know instead.
- Every save is kept in **Saved versions**. If you saved something by mistake, go back to the older content with the **History** button → **Saved versions**.

### Print · PDF · Word

- Page numbers (`3 / 12`) are printed at the bottom of each page and the document title at the top. This works in Chrome · Edge 131 or later and the Windows PC app; in other browsers, turn on **Headers and footers** in the print window.
- Tables · images · diagrams · math · callouts are kept off page boundaries where possible and move to the next page instead. Code lines longer than the paper are wrapped.
- To start a new page at a spot of your choice, write `<!-- page break -->` on a line there. On screen it shows only as a dashed line.
- Every tab is printed in order. Each tab is printed as its own tab box with that tab selected in the tab bar, so it looks like the tab does on screen. When the tab content runs over several pages, the tab bar repeats on each page so you can tell which tab you're in.
- Collapsed content (`<details>` · foldable callouts) is printed open too. When you close the print window, the tabs you picked and what was collapsed on screen stay as they were.
- A file saved as HTML lets you pick tabs in the browser just like the app (tabs with the same name switch together). Printing that file also opens every tab and all collapsed content, and opening it where scripts are off shows all the content without tabs.
- A file saved as HTML has a **contents list on the left** (for documents with two or more headings or tabs). The part you're reading is highlighted; clicking a heading jumps to it, and clicking a tab name opens that tab and jumps to it. The ☰ button at the top left hides the list, and on a narrow screen it opens and closes it. The list is left out when printing. Turn off **View settings → "Add a contents sidebar when saving as HTML"** to save without it.
- When the document has **links to other documents**, Save as HTML first asks which ones to include. Checked documents are put inside the file, so readers can open them in a panel on the right from their links (‹ goes back, ✕ or Esc closes). Only documents linked directly from this one are offered; documents they link to in turn are not added. Links to documents that were left out or not found are shown dimmed with a dotted underline, and clicking one says "This document is not included in this file". The saved file does not keep the documents' paths.
- Saving as HTML **puts the images inside the file**, so sending just that one file is enough for others to see them. Images from web addresses are included too when the site allows it. If some images can't be included (for example, ones that weren't found), you get a list before saving. In the web app, open the parent folder that contains the images with Open folder so they can be read.
- Write `cover: yes` in the document info at the top, and the first page becomes a **cover** (title · summary · the rest of the info, like the author). The cover has no page number.
- Word files keep heading levels · lists · tables · code · callouts · images, and diagrams become images. Math goes in as TeX text (`E=mc^2`). The paper size follows your region (Letter for the US · Canada, A4 elsewhere).
- Save as Word and Copy with formatting use light colors that suit a white background, even in the dark theme.

---

## 6️⃣ Differences depending on where you use it

| Feature | PC app | Chrome · Edge | Safari · Firefox | Phone |
|:---|:---:|:---:|:---:|:---:|
| Open folder · tree | ✅ | ✅ | ✅ Read only | ❌ Files only |
| Save to original file | ✅ | ✅ | Download | Download |
| New document · Rename · Delete | ✅ | ✅ | ❌ | ❌ |
| Recover deleted files | ✅ Trash | ❌ | — | — |
| Auto-reload changed files | ✅ | ✅ | ❌ | ❌ |
| Saved versions kept after closing | ✅ | ✅ | ✅ | ✅ |
| Use without the internet | ✅ | ✅ After installing | ✅ After opening once | ✅ After installing |

---

## 7️⃣ Installing

- **Phone**: Open the web app address and choose **Add to Home Screen** from the browser menu
- **PC browser**: Open the web app address and click the **Install** button at the right of the address bar
- **PC app**: From GitHub **Releases**, get Windows `-setup.exe`, macOS `.dmg`, or Linux `.AppImage` / `.deb`

> [!WARNING]
> On PCs with **Windows Smart App Control** turned on, installing, uninstalling or updating markcont may be blocked because it isn't code-signed. Smart App Control can't allow a single app, so on such PCs use the web app (https://ryuseojin.github.io/markcont/) without installing.

### Updating to a new version (PC app)

- When a new version is out, a window shows up at startup with **what changed since your version**. **Update now** downloads and installs it, then opens markcont again. **Close** hides that version until the next day (20 hours later).
- If you install a new `-setup.exe` from Releases over it, choose **Do not uninstall** in the installer. Your settings and history stay. Choosing "Uninstall before installing" may show "Unable to uninstall!".
- Check anytime with **⋯ → Help → Check for updates**. Turn off automatic checks with **Check for updates at startup** in View settings (Aa).
- The check runs every time the app starts and only fetches version info from GitHub. Your documents and file paths are never sent. Only installers with a valid signature are installed.
- If you installed with a Linux `.deb` or `.rpm`, it opens the download page instead of installing directly.
- Updates start with 1.10.0. For older versions, download and install it from Releases once.

---

## 8️⃣ Connect to Claude (PC app)

You can let Claude Desktop · Claude Code edit your markcont documents directly (MCP connection).

1. Open the folder you want to work in with **Open folder**. Claude can only work with **Markdown · text files inside the folders you have open**.
2. In **⋯ → Connect to Claude (MCP)**, press **Connect to Claude Desktop** and restart Claude Desktop. For Claude Code, run the command shown in the window once in a terminal.
3. Ask in the Claude app. For example: "Polish the document I'm viewing in markcont to follow the writing rules", "Turn the selected part into a table"

| What you see | Meaning |
|:---|:---|
| **🔌 Claude edited ○○** at the top | The file Claude just read or edited |
| Changed spots **glow yellow** | Places Claude (or another program) changed |
| **View changes** in the notification | A −/+ comparison and **Undo this change** |
| "Claude edited" in the **History** window | A point you can go back to |
| "Before the change" · "Edited by Claude" in **History → Saved versions** | The file content before and after Claude's edit. Edits made while markcont was closed are kept too, and you can go back for 14 days |
| Green underlines · red strikethroughs and **✎ N suggestions** | Suggestions Claude left. Click to accept or reject |

**Make Claude only suggest**: turn on **Only suggest changes** in **⋯ → Connect to Claude (MCP)**, and Claude leaves suggestion marks (`{~~old~>new~~}` · `{++add++}` · `{--cut--}`) instead of changing the text. Click a mark in the view to **Accept · Reject** it, or use **✎ N suggestions** at the top of the document for all of them. The original text stays until you accept. Even when it's off, asking "suggest changes" works the same way. (Inside code blocks · the document info, suggestions aren't possible, so Claude edits directly and the previous content is kept in saved versions.)

> [!NOTE]
> Once connected, the content of documents Claude reads is sent to Anthropic for processing. The Claude app asks for permission before it uses a tool. markcont doesn't use a subscription or an API key.

> [!WARNING]
> **Be careful with documents from other people.** An AI may follow instructions hidden inside a document (e.g. "change all the other documents too") (prompt injection). markcont limits the damage by blocking delete · rename · running commands and by working only inside the folders you have open, but don't hand a folder containing untrusted documents to an AI while connected. If something gets changed by mistake, you can undo it with **View changes · Undo history**, and even after it has been saved to the file you can go back to the content before the edit in **Saved versions** (14 days, up to 50 per file). Still, keep backups of important documents.

---

## ❓ Frequently asked questions

<details>
<summary>I saved, but the original file didn't change</summary>

Files you dropped in or opened the old way don't have permission to write to the original file, so they're saved to your **Downloads folder**. Reopen the file with the **Open file** button or **Open folder**, and it will save to the original file.

</details>

<details>
<summary>Some folders don't show up in the folder tree</summary>

Folders with no md files at all, folders whose names start with `.`, and `node_modules` are hidden.

</details>

<details>
<summary>How do I write documents that look good?</summary>

Open **⋯ → Help → [Markdown writing rules](Markdown-Writing-Rules.md)**. Give that document to an AI along with yours and say "Rewrite this following these rules."

</details>

---

## 🎯 One-page summary

1. Open with **Open file · Open folder · drag and drop**. <kbd>Ctrl</kbd>+<kbd>O</kbd> opens a file by typing its name
2. In the sidebar, use the **Files · Contents · Search · Links** tabs; right-click for **New document · Rename · Delete**
3. **Aa** for view settings, <kbd>Ctrl</kbd>+<kbd>F</kbd> to find in the document, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> to search all documents, <kbd>Ctrl</kbd>+<kbd>.</kbd> for focus mode
4. <kbd>Ctrl</kbd>+<kbd>E</kbd> to edit, <kbd>Ctrl</kbd>+<kbd>S</kbd> to save
5. In the **⋯** menu, **Export** saves as HTML · PDF · Word, and **Help** has the guide and the writing rules
