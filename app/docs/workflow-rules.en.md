---
title: Workflow Writing Rules
version: 1.0
---

# 🧭 Workflow Writing Rules

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
| Branches leaving one shape | **4 or fewer**. With 5 or more, split the decision into two steps |
| Line labels | **12 characters or fewer** — `save failed` · `none` |
| yes · no | Only on decisions |

- Long labels wrap to two lines; anything longer is cut with an ellipsis (hover to see it all). Move long explanations into **the target shape's text or the policy table**.
- Shapes with many branches grow taller so lines spread apart, but reducing the branches reads far better.

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

## ✅ Checklist

- [ ] About 10 nodes per section?
- [ ] 4 or fewer branches leaving each shape?
- [ ] Line labels 12 characters or fewer?
- [ ] Shape text around 20 characters, with details pointed to by policy ID?
- [ ] User actions in the user zone, judgments and screens in the system zone?
- [ ] Entry points marked in the exposure locations?
