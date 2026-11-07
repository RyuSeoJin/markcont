---
title: markcont User guide
version: 1.5.0
---

# 📘 markcont User guide

markcont (**mark**down **cont**roller) is a program for viewing Markdown files nicely and editing them right where you read them.
This guide is laid out so a first-time user can follow it step by step.

> [!TIP]
> You can replay the first-run tour (tutorial) at any time from **⋯ → Replay the tour** in the top right.

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
| A file inside a folder opened with Open folder | `folder-name/inner/a.md` · **Copy path** |
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
| Copy path | Copies the file's location |
| Delete | The PC app sends it to the **Trash**; the browser deletes it **permanently** |

> [!WARNING]
> Files deleted in a browser (Chrome · Edge) don't go to the Trash and can't be recovered. Double-check before you delete.

### Contents tab

Builds a table of contents from the document's headings (`#`). The part you're reading is highlighted, and clicking a heading jumps to it.

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

---

## 3️⃣ Comfortable reading

| Feature | Where | Description |
|:---|:---|:---|
| View settings | **Aa** button at the top | Text size, Sans · Serif, body width, callout style, code line numbers, heading numbers (1 · 1.1), review before saving |
| Language | View settings (Aa) → Language, or the first screen of the tour | Switch between 한국어 and English |
| Light · Dark | ☾ / ☀ button at the top | Dark mode |
| Fold a heading | ⌄ button next to a heading | Folds the content under that heading |
| Copy link | **#** button next to a heading | Copies a `[heading](#heading)` link |
| Link · footnote preview | Hover over a link or a footnote number (long-press on phones) | Shows the start of another document, the section under its heading, or the footnote text in a small window |
| Find in document | <kbd>Ctrl</kbd>+<kbd>F</kbd> | Highlights matches and steps through them |
| Search all documents | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>, the sidebar **Search** tab | Searches every document in the open folders (2️⃣ Search tab) |
| Focus mode | <kbd>Ctrl</kbd>+<kbd>.</kbd> | Leaves only the body text. Press <kbd>Esc</kbd> to exit |
| Enlarge code | ⤢ in the code block header | Shows the code full screen |
| Enlarge a diagram | ⤢ at the top right of a diagram | Wheel or pinch to zoom, drag to pan, "Fit to screen" |
| Enlarge an image | Click the image | The same zoom view as diagrams. While editing side by side, a click jumps to that line of the source instead |

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

### Editing shortcuts

| Shortcut | What it does |
|:---|:---|
| <kbd>Ctrl</kbd>+<kbd>B</kbd> | Bold |
| <kbd>Ctrl</kbd>+<kbd>I</kbd> | Italic |
| <kbd>Ctrl</kbd>+<kbd>K</kbd> | Link |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Indent / Outdent |
| <kbd>Enter</kbd> | Continues a list · quote on the next line (press on an empty line to end it) |
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | Paste plain text without formatting |
| <kbd>Ctrl</kbd>+<kbd>S</kbd> | Save |

The editing toolbar has buttons for headings, lists, task lists, callouts, code blocks, tables, and inserting images.

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
| As an HTML file | **⋯ → Save as HTML** — a single file that looks just like the screen |
| As a PDF | In **⋯ → Print · Save as PDF**, choose "Save as PDF" |

- Files opened with Open file · Open folder are **saved straight to the original file**.
- Before saving, markcont **shows you what will change and asks once more** (Cancel · Save as new file · Save). To turn this off, turn off **Aa → Review changes before saving**, or check **Don't ask again** in the confirmation window.
- Documents whose original location is unknown (the User guide, new documents, some dropped files) automatically open **Save as new file** when you save.
- If you save a new file inside an open folder, it shows up in that folder tree right away.
- If a document uses markcont-only syntax (`==highlight==`, `[!INFO]`, ```` ```flow ````, etc.), **⚠ N spots look different in other viewers** appears at the top of the document. Click it for the list of lines; click a line to jump there, or use **Convert this document** to convert everything at once.
- If another program changes the file, markcont **reloads it automatically.** If you have unsaved changes, it won't overwrite them and lets you know instead.
- Every save is kept in **Saved versions**. If you saved something by mistake, go back to the older content with the **History** button → **Saved versions**.

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

Open **⋯ → [Markdown writing rules](Markdown-Writing-Rules.md)**. Give that document to an AI along with yours and say "Rewrite this following these rules."

</details>

---

## 🎯 One-page summary

1. Open with **Open file · Open folder · drag and drop**. <kbd>Ctrl</kbd>+<kbd>O</kbd> opens a file by typing its name
2. In the sidebar, use the **Files · Contents · Search** tabs; right-click for **New document · Rename · Delete**
3. **Aa** for view settings, <kbd>Ctrl</kbd>+<kbd>F</kbd> to find in the document, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> to search all documents, <kbd>Ctrl</kbd>+<kbd>.</kbd> for focus mode
4. <kbd>Ctrl</kbd>+<kbd>E</kbd> to edit, <kbd>Ctrl</kbd>+<kbd>S</kbd> to save
5. From the **⋯** menu: HTML · PDF export, the guide and the writing rules
