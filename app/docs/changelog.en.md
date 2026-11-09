# What's new in markcont

Changes in each version. New versions are added at the top.
When a new version comes out, the PC app shows these notes and can update with one click.

## 1.11.2 · 2026-11-09

- PC app: checks for a new version every time it starts. If you close the notice, that version stays hidden until the next day (20 hours later), and a newer version is shown right away

## 1.11.1 · 2026-11-09

- Flowcharts: with a `@view Name: N1 N2` line, keep the table once and pick the nodes to draw in each block. Lines leaving them become connectors
- Flowcharts: a `@data file.md` line reads the node table from another file (with a folder open)
- Flowcharts: connectors show the target text and which view, section or document it's in; click to jump to that shape
- Flowcharts: lines leaving one shape cross less, and labels sit on the first segment of their own line. Remaining crossings hop over with a small half-circle
- Document check: points out flowchart `@view` · `@data` problems and targets it can't find
- Save for other viewers: side-by-side examples now include the result below the code
- Data definition cards: aligned, striped field rows, → buttons for linked fields, separate description and example

## 1.11.0 · 2026-11-09

- Document styles: the "Your own CSS" box in View settings (Aa) is replaced by a styles window. Load CSS files, save them as files, and choose for each style where it applies: all documents, a folder, or a single document
- Document styles: each document uses one style, chosen in this order: the document → the nearest folder (subfolders included) → all documents
- Document styles: what you wrote in the old "Your own CSS" box moves to a style used for all documents
- Document styles: parts that load fonts or images from the internet (`url(https://…)` · `@import`) are skipped. Embed images and fonts as `data:` URLs
- Editing: Shift+Enter inside a table cell inserts a line break (`<br>`) without breaking the table
- Removed "Show code line numbers" from View settings

## 1.10.1 · 2026-11-09

- Save as Word: fixed list numbers landing on a separate line from the text in lists with blank lines between items
- Save as Word: a gap keeps tables from touching the quote or callout right above them
- Save as Word: callouts no longer split across pages, and table rows no longer break over two pages
- Print · PDF: table edges are no longer cut off and tables fit the page width
- Smaller rounded corners on tables, code blocks and boxes
- Save for other viewers: adds a blank line after the document info so other viewers show the title correctly

## 1.10.0 · 2026-11-09

- PC app: when a new version is out, it shows what changed since your version, and "Update now" installs it right away
- PC app: check anytime with ⋯ → Help → "Check for updates", and turn off automatic checks in View settings (Aa)
- Updates start with this version. If you're on 1.9.7 or earlier, please install this one yourself once

## 1.9.7 · 2026-11-09

- "Remove from list" in the ⋯ menu of separately opened files: the file stays, but it leaves the list, quick open and search. Open it again to bring it back
- Fixed the window title keeping the old document name after going back to the start screen

## 1.9.6 · 2026-11-09

- Separately opened files can also be hidden from the sidebar (for this session; opening the file again shows it)
- "Show N hidden files" in the list shows them again

## 1.9.5 · 2026-11-09

- "Hide from sidebar": the file stays, only the tree hides it. Bring it back with Show hidden items · Show again
- "Copy path": the PC app copies the full path, ready to paste into File Explorer
- Polished icons, font weights, spacing and selection highlights

## 1.9.4 · 2026-11-09

- Document check now covers the writing rules, links outside the folder, and invisible characters, which you can remove with one button
- Fixed tables inside callouts and quotes being flagged by mistake

## 1.9.3 · 2026-11-08

- Saving keeps the original line endings (CRLF), BOM and encoding. EUC-KR and UTF-16 files are read and written correctly
- Fixed every line showing as changed after switching a CRLF document to edit mode

## 1.9.2 · 2026-11-08

- Fixed the find bar buttons overflowing the screen on phones
- Fixed the editor and preview drifting apart around example code blocks

## 1.9.1 · 2026-11-08

- Tidied View settings (Aa) and the ⋯ menu. Menus scroll to the end even in short windows

## 1.9.0 · 2026-11-08

- Saved versions, quick open (Ctrl+O), search all documents (Ctrl+Shift+F)
- Link previews, document check, links fixed automatically when you rename
- Suggestion marks · Claude suggest mode, table editing helper, ::: blocks · embedded documents
- Presentation mode, Word (.docx) export · rich copy, new document templates · autocomplete
