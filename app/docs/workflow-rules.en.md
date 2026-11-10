---
title: Workflow Writing Rules
version: 1.1
---

# Workflow Writing Rules

How to write **workflows that need a wide view** — like the flow-node data and exposure locations in a planning document — so they read well in markcont.
The flowchart syntax follows section 7-2 of the [Markdown writing rules](Markdown-Writing-Rules.md); this document covers only **what to keep in mind for large flows**.

> [!TIP]
> When you ask an AI to write a workflow, give it this document and the writing rules and say **"Rewrite the flowchart and exposure locations following these rules."**

---

## 1️⃣ Split first

| Guideline | Recommended |
|:---|:---|
| Nodes in one flowchart | 30 or fewer. Beyond that, split the flowchart by feature step |
| Nodes in one section | About 10 |
| What a section is | One user goal (open · receive · delete · close) |

- If codes have no section prefix (like `N1` · `N23`), group them with **section lines**.
- Moves between sections show up automatically as "→ code" connectors. Don't put the same node in two sections.

```markdown
# Open mailbox: N1 N2
# Receive rewards: N9 N8 N10 N11 N12 N13
```

### Splitting by feature: `@view` · `@data`

When there are many nodes, keep the table **once** and pick the nodes to draw in each block. With tabs (`::: tabs`), each feature gets its own tab.

| Line | What it does |
|:---|:---|
| `@view Name: N1 N2` | Draws only the picked nodes. Lines between them are drawn, and lines leaving them become "→ code" connectors |
| `@data ../nodes/mailbox.md` | Reads the node table from that file (relative to the document). If the block has its own node rows, those are used |
| `@data ../nodes/mailbox.md#mailbox` | Reads the table under the `**Workflow nodes · flow mailbox**` line in that file. Without `#`, the first table whose first header cell is "code" |

````markdown
```flow
@data ../nodes/project-flow-mailbox.md
@view Open mailbox: N1 N2
```
````

- Connectors show the target text and, in small type, **where it goes**: the view name for another view in the same document, the section name for another section of the same table, or "Other document" when it's found in another node file in the same folder as the `@data` file.
- Hover a connector to see the target code, text, view name and line label. **Click** it to jump to the target shape in the same document; it flashes briefly (a hidden tab opens).
- `@data` is read when a folder is open. If the file can't be found, the chart shows "Couldn't find the node data".
- Saving for other viewers expands `@data` into the node table, and `@view` becomes Mermaid with only the picked nodes.

---

## 2️⃣ One thing per shape

- Keep **text around 20 characters** — just the key point. Put detailed conditions and wording in the policy table and point to its ID — `Grant rewards (MAIL-P15)`.
- Prefix screens and windows with their kind — `[Sheet] Show mailbox` · `[Popup] Common error` · `[Toast] Expired notice`.
- Draw **user actions as action shapes in the user zone** and system judgments as **decision shapes**. Don't replace an action with a line label.
- Use the "rule" column only for decisions. It appears small next to the diamond.

---

## 3️⃣ Fewer branches

The more lines leave one shape, the more crowded lines and labels get.

| Guideline | Recommended |
|:---|:---|
| Branches leaving one shape | **4 or fewer**. Beyond that, don't merge nodes: split with `@view`, or show branches to other features as connectors (branches drawn as connectors don't count) |
| Line labels | **12 characters or fewer** — `save failed` · `none` |
| yes · no | Only on decisions |

- Labels sit **on the first segment** of their line. Long labels wrap over several lines and are never cut short. Long labels still make the chart bigger, so move long explanations into **the target shape's text or the policy table**.
- For shapes that naturally have many branches (like a screen with many user actions), don't merge node codes (simulators and QA use them) — split by feature with `@view` instead.
- Document check **only points out** where branches, labels or shape text go over these guidelines (not counted as issues).

````markdown example
```flow
A1 | system | process | Calculate · save rewards | → A2 · success / → A3 · failed / → A4 · none
A2 | system | output | [Popup] Rewards received | —
A3 | system | output | [Popup] Common error | —
A4 | system | output | [Toast] No rewards | —
```
````

---

## 4️⃣ Connectors instead of long lines

| Case | What markcont draws |
|:---|:---|
| Going to another section | "→ code" connector |
| Going two or more columns back | "↩ code" connector |
| Jumping far ahead across the chart | "→ code" connector (automatic) |
| A point that returns to a set shape | `ref` shape (circle) |

- Add a `cut long lines` line to cut every link that skips two or more columns, or `keep long lines` to never cut.
- Many lines returning to the same screen create many connectors. If they return to the same place, gather them into one process shape first.
- Connectors stay in the **same zone** as the shape they leave, stacked top to bottom in the order of their exit points.
- Every line into or out of a shape uses its own point, ordered by the height the line actually heads to. Any crossing that's left shows a small half-circle hop so it doesn't look joined.

---

## 5️⃣ Viewing large charts

- With several sections that would get too wide, **sections stack top to bottom**, each with its own user · system zones.
- Use **⤢** at the top right of a diagram to enlarge it: wheel or pinch to zoom, drag to pan, and "Fit to screen".

---

## 6️⃣ Exposure locations

Put an indented list in a ```` ```ui ```` (or ```` ```노출 ````) code block and it shows as a **📍 location → 🚪 entry point → shown after entering** tree.

| How to write | What you see |
|:---|:---|
| Indented lines | UI placed inside, or opened from, the line above |
| `🚪 name` · `entry: name` · `(들어오는 곳: …)` at the end | **Entry point** (green box). Lines above are 📍 locations; lines below form the "shown after entering" group |
| `action → result` | The action is faded, the result is bold |
| `[button]` | Button shape |
| `(note)` at the end | Small gray note |
| sheet · popup · toast · screen · tab · badge in the name | Kind icon and left color |

````markdown example
```ui
- Main screen
  - Home tab
    - entry: Navigation bar [Mailbox]
      - Red dot (when rewards are waiting)
      - Mailbox sheet
        - Mail card
          - Tap card → Mail detail sheet
          - [Receive]
            - Granted → Rewards popup
            - Nothing to receive → Toast
        - [Delete] → Delete confirm popup
```
````

- Mark the entry point **where the user comes into the feature** (a button or menu). Mark each one if there are several.
- Save for other viewers turns it into a normal indented list.

---

## 7️⃣ Data definition

Don't cram the data needed for implementation into one cell of the "implementation essentials" table. Use a ```` ```data ```` block: **one data = one card, one field = one line**. See "Data definition" in section 7-2 of the [Markdown writing rules](Markdown-Writing-Rules.md).

- Keep the "implementation essentials" table as **a list of decisions**, and put the data definition below it.
- Name fields the same way screens and policies do — `Mail title` · `Expires at`.
- For a field that holds other data, write that data's name as the type — `Reward list`. A connector line links the cards.
- Write `open` in the status column for undecided fields.

---

## ✅ Checklist

- [ ] About 10 nodes per section?
- [ ] 4 or fewer branches leaving each shape? (If more, split with `@view`?)
- [ ] Line labels 12 characters or fewer?
- [ ] Shape text around 20 characters, with details pointed to by policy ID?
- [ ] User actions in the user zone, judgments and screens in the system zone?
- [ ] Entry points marked in the exposure locations?
- [ ] Data written as a data definition block, one line per field?
