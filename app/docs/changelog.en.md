# What's new in markcont

Changes in each version. New versions are added at the top.
When a new version comes out, the PC app shows these notes and can update with one click.

## 1.17.0 · 2026-11-12

- Save as HTML: the window shown when saving has a new check, "Also include the markdown source" (off by default). When checked, the saved file gets an "Open in markcont" button, so readers can reopen and edit the source in the markcont web app. The source is handed over inside the browser only
- markcont web: an `.html` saved with its source can be opened with Open file or drag and drop. An HTML file without a source says it can't be opened
- Changed behavior: saving as HTML now shows the confirmation window once even when there are no linked documents (it is where you choose to include the source)

## 1.16.1 · 2026-11-12

- Summary flow: fixed the `no` branch boxes and `↪` lines being cut off outside the page at narrow widths (narrow windows · side view · phones). When the narrow shape still doesn't fit, it switches to a compact shape with narrower main boxes, titles wrapped to two lines at most, and smaller gaps to the branch boxes and channels
- Summary flow: if the compact shape doesn't fit either, the whole diagram scales down to 75%, and only below that do you scroll sideways. Wide layouts look the same as before, and print · PDF · saved HTML follow the same rule

## 1.16.0 · 2026-11-12

- Summary flow: an indented `↪ Box title` under a box draws a gray arrow line from that box to the box with the same title. It is a join when the target is below and going back when it is above, and `↪ Box title | Line label` puts a label next to the line
- Summary flow: `↪` lines run through a channel on the right of the diagram, so they don't overlap boxes or notes. Rows the line passes get their notes below the box, and more lines add channels outward. It looks the same in print · PDF · saved HTML · Word · copy with formatting, and Save for other viewers adds them to the Mermaid as dotted arrows
- Summary flow: when `↪` points to a box that doesn't exist (a typo), the line number is shown in place of the diagram and in the document check. Blocks without `↪` lines are drawn exactly as before
- Contents tab: the tab names of a tab box (`::: tabs`) are listed in the contents. Clicking one opens that tab and jumps to the box, and the tab that is open now is shown in bold
- Contents tab: headings inside a tab sit under that tab, and clicking one opens the tab and jumps to it
- The in-document `[[_TOC_]]` contents and the print · PDF contents list headings only, as before
- Save as HTML: the saved file has a contents list on the left (for documents with two or more headings or tabs). The part you're reading is highlighted, and clicking a tab name opens that tab. The ☰ button hides it, on a narrow screen the button opens and closes it, and it is left out when printing
- View settings has a new option, "Add a contents sidebar when saving as HTML" (on by default). Turn it off to save the body only, as before
- Save as HTML: when the document links to other documents, it first asks which ones to include. Included documents open in a panel on the right when their link is clicked in the saved file. Only documents linked directly from this one are added
- Changed behavior: in a saved HTML file, links to documents that were not included become dimmed, dotted links that cannot be opened and say so when clicked. Until now the `.md` address was kept and did not open

## 1.15.0 · 2026-11-12

- Data definition: two or more options in a description that start with a circled number (① ② ③) or circled letter (ⓐ ⓑ ⓒ) are shown as a vertical list with their numbers. Other text before or after stays as a sentence above or below the list
- Data definition: a field name that starts with a number, such as `③ Scope` or `③ⓑ Characters`, shows the number as a small chip in front of the name
- Data definition: hover an option to highlight the fields that carry its number; hover a chip to highlight the options it belongs to
- Save for other viewers keeps options and numbers in one table cell, exactly as written

## 1.14.0 · 2026-11-12

- Exposure (`ui`) block: a first line `# Title` shows a title above the block
- Changed behavior: the legend that always sat at the top of an exposure block is now off by default. With `@legend on` it lists only the icons actually used in that block (under the title, if there is one)
- Exposure block: set a line's kind directly with a marker such as `{sheet} Chat mode` (screen · sheet · popup · toast · button · badge · list · card). `{item}` shows no icon
- Save for other viewers: the exposure block's title becomes bold text, and `@legend` lines and `{kind}` markers are removed

## 1.13.0 · 2026-11-11

- Side view: clicking a link to another document keeps the one you're reading and opens the linked document on the right (read-only). Links inside the side view change only the side view; use Open in main in its header to move it to the main view. Close with Esc or ✕, and drag the border to resize
- Changed behavior: clicking a link no longer replaces the main document. To switch the main document, use Open in main in the side view or the file list. On narrow screens such as phones, links still replace the main document
- Editing side by side: a plain click on a link to another document no longer opens it; the editor cursor moves to that line. Use Ctrl+click, middle click, or Open beside in the preview pop-up to open it in the side view. If there isn't room for three columns, the side view takes the preview's place
- Link preview: hovering a link to another document now shows, at the bottom of the small window, where a click or Ctrl+click will open it, along with the current state (for example, "While editing side by side")
- Editing side by side: over a link to another document the mouse shows a text cursor, and turns into a hand only while Ctrl is held
- If the side view shows the same document as the main view, your edits appear there right away. Files changed in another program are re-read when you come back to the window

## 1.12.0 · 2026-11-11

- New block, the summary flow (```` ```summary ```` · `요약흐름`): a top-to-bottom overview of a whole feature, for the summary section of a spec. Stage names sit on the left, same-size boxes with only a title in the middle and notes on the right, so long notes never change the box size
- Summary flow: a `[role]` before the title sets the color (ops = purple · user = green · system = gray) and only the roles you used appear in the legend. A title ending with `?` is a decision (diamond): `yes →` continues down and `no →` ends in a small box on the right. `- fork` puts the last boxes side by side
- Summary flow: when the block is narrow, notes move below the boxes. It looks the same in print · PDF · saved HTML · Word · copy with formatting, and Save for other viewers turns it into Mermaid
- Summary flow: mistakes (unknown role · `yes →` without a decision · empty stage) are shown with the line number in place of the diagram and in the document check. Document styles can change role colors and the box width (`--sf-box-width`)
- Print · PDF: tab boxes print more clearly. Each tab is printed as its own tab box, one after another, with that tab selected in the tab bar, so it looks the way the tab does on screen. When the tab content runs over several pages the tab bar repeats on each page, and no blank space is left before a tab box. Printing a file saved as HTML works the same way

## 1.11.7 · 2026-11-10

- Desktop app: the first click on Open folder or Open file after starting sometimes didn't open the picker. The picker now always shows on top of the markcont window and opens right away, even while the last folders are being reloaded
- Save as HTML: images are always put inside the file. Images from web addresses are included too (when the site allows it), and if some images can't be included you get a list before saving. Sharing a single HTML file now keeps its images

## 1.11.6 · 2026-11-10

- Print · PDF: printing a document with tabs printed only the selected tab. Now every tab is printed with its name
- New guide "Document style rules": the names and color variables you can change with Document style (CSS), what changes in Save as HTML, Print and Save as Word, and ready-to-use examples

## 1.11.5 · 2026-11-10

- Security: the libraries used by the interface are updated to versions that fix security issues (Mermaid 10.9.8 · markdown-it 14.3.3 · KaTeX 0.19.1 · DOMPurify 3.4.17 · highlight.js 11.12.0). Code hidden in diagram text can no longer run, and a specially made document can no longer freeze the screen
- Security: the interface no longer runs any script that isn't one of the app's own files, so code hidden in a document doesn't run
- Desktop app: it only works with the folders and files you picked with Open folder · Open file · Save as new file, and files you double-clicked. Links to documents outside the picked folders don't open; use Open file instead. Folders you had open last time and files with saved versions still open as before
- Enlarge an image: clicking an image opens it in a pop-up over the document. Zoom buttons are at the bottom; click outside it or press Esc to close
- Print · PDF: collapsed boxes are expanded when printing. Tabs can be switched in files saved as HTML too
- Open-source licenses: libraries bundled inside other libraries are now all listed

## 1.11.4 · 2026-11-10

- Flowcharts: connector text, the connector's view · section · document line, and line labels are no longer cut short with an ellipsis (…). Long text makes the shape or label box bigger instead

## 1.11.3 · 2026-11-09

- User guide: added how to install a new version over the old one with "Do not uninstall", and notes for PCs with Windows Smart App Control turned on
- Downloads: Linux now ships AppImage and deb only (no more rpm), and update signature files (.sig) are no longer in the download list

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
