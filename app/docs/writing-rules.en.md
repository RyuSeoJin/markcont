---
title: Rules for Good-Looking Markdown
version: 1.2
---

# 📐 Rules for Good-Looking Markdown

Follow these rules and your documents will be easy to take in at a glance in markcont.
When you ask an AI to write a document, give it this file too and use one of these prompts, **depending on where the document will be read**.

| Read in | Tell the AI |
|:---|:---|
| markcont only | **"Rewrite this following these rules."** |
| Anywhere (GitHub, VS Code, …) | **"Rewrite this following these rules, but don't use any syntax marked ❌ in the GitHub column of the section 9 table."** |

> [!IMPORTANT]
> Documents already written in markcont style are fine too. **▾ → Save for other viewers…** next to the Save button makes a **copy** with markcont-only syntax converted to standard syntax (the original stays as it is). If a document uses markcont-only syntax, **⚠ N spots look different in other viewers** appears at the top of the document.

> [!TIP]
> Sections 1–8 mostly look the same on GitHub and Obsidian too.
> **Section 9, markcont extended syntax**, covers extra syntax that markcont supports, so it may show up as plain text elsewhere. See the table in section 9 for where each one works.

> [!NOTE]
> Examples show the source on the **left (✏️ Write this)** and the result on the **right (👀 Looks like this)**, side by side.

---

## 1️⃣ Document structure

| Rule | Like this | Why |
|:---|:---|:---|
| **Only one** title (`#`) per document | `# 👋 About the project` | The top title becomes the document's name |
| Big sections use `##` + **one emoji** | `## 🚀 Getting started` | Sections stand out right away in the outline and the text |
| Small sections use `###`, no emoji | `### How to install` | They look lighter than big sections |
| A divider `---` between `##` sections | | Section boundaries are clear on screen |
| A **one- or two-line summary** right under the title | | Readers can decide right away whether to read on |

```markdown example
# 👋 About the project

A quick overview of the app our team is building.

## 🚀 Getting started

### How to install

Download the installer and run it.

---

## ❓ FAQ
```

### Common section emoji

| Emoji | Use for | Emoji | Use for |
|:---:|:---|:---:|:---|
| 👋 | Document title, greetings | 🚀 | Getting started, key features |
| ✨ | Basic features, highlights | ✅ | To-dos, checklists |
| 📊 | Tables, comparisons, numbers | 💬 | Emphasis, notices |
| 💻 | Code, commands | 🔗 | Links, references |
| ❓ | FAQ | 🎯 | Wrap-up, next steps |
| ⚠️ | Warnings | 📝 | Notes, change log |

---

## 2️⃣ Use callouts for emphasis

Don't just bold important sentences; put them in a **callout**. Stick to these five types.

```markdown example
> [!NOTE]
> Good to know

> [!TIP]
> A better way to do it

> [!IMPORTANT]
> Key point you must know

> [!WARNING]
> Easy to get wrong

> [!CAUTION]
> Risky and hard to undo
```

- Use **at most two** callouts per section. Too many and nothing stands out.
- To set your own title, write `> [!TIP] My own title`.
- To make it collapsible, write `> [!NOTE]-` (collapsed at first) or `> [!NOTE]+` (expanded at first).

---

## 3️⃣ Text formatting

| Use | How to write | Result |
|:---|:---|:---|
| Key words | `**bold**` | **bold** |
| Soft emphasis | `*italic*` | *italic* |
| Point out one spot | `==highlight==` | ==highlight== |
| Outdated content | `~~strikethrough~~` | ~~strikethrough~~ |
| File names, commands, button names | `` `code` `` | `code` |
| Keyboard shortcuts | `<kbd>Ctrl</kbd>+<kbd>S</kbd>` | <kbd>Ctrl</kbd>+<kbd>S</kbd> |

```markdown example
Installing takes just **3 minutes**. *Really.*
==If you don't save, it's gone.== Use `npm install` instead of ~~the old way~~.
Save with <kbd>Ctrl</kbd>+<kbd>S</kbd>.
```

- Use the highlight **only once** per section.
- Don't bold a whole sentence. Bold just the words.
- In Korean, Chinese and Japanese text you can put the next character right after bold · italic · strikethrough. Even when the bold ends in a bracket, quote or punctuation, like `**스크립트(script)**는`, markcont shows it bold. GitHub and VS Code show the `**` as plain text, so use **Save for other viewers** for documents that will be read elsewhere. Only those spots become `<strong>` tags.

---

## 4️⃣ Lists and checklists

- If order matters, use a `1.` numbered list; otherwise use a `-` bullet list.
- Put **one thing per line** in a list item.
- Write to-dos as a checklist. You can click to check them off in the viewer.

```markdown example
1. Open the file
2. Edit the content
3. Save

- Apple
- Banana
  - Ripe banana

- [x] Done
- [ ] Still to do
```

---

## 5️⃣ Tables

- When comparing things or listing settings, use a **table** instead of sentences.
- The position of `:` in the second row sets the alignment: left `:---`, center `:---:`, right `---:`
- Center short values (yes/no, numbers) and left-align descriptions.

```markdown example
| Setting | Options | Description |
|:---|:---:|:---|
| Theme | Light / Dark | Whatever is easy on your eyes |
| Font size | 13 ~ 24 | As you like |
```

---

## 6️⃣ Code

- **Always** write the language name on a code block. That gives it colors and shows the language in the header.
- Show changes with `diff`. `-` lines show in red, `+` lines in green.

````markdown example
```javascript
console.log("Hello");
```

```diff
- Old way
+ New way
```
````

---

## 7️⃣ Images, diagrams, math

### 7-1. Images

| What you want | How to write |
|:---|:---|
| Add an image | `![description](images/picture.png)` |
| A title that shows on mouse hover | `![description](picture.png "Title")` |
| A file name with spaces | `![description](<my picture.png>)` |
| An image from the web | `![description](https://example.com/picture.png)` |
| Set the size | `<img src="picture.png" width="300">` |
| Center it | `<p align="center"><img src="picture.png" width="300"></p>` |
| An image you can click to go somewhere | `[![description](picture.png)](https://example.com)` |
| Add by name only (wiki style) | `![[picture.png]]` |
| Video · audio | `![description](video.mp4)` · `![description](sound.mp3)` |

**How to write paths**: start from the folder the current document is in.

| Where the image is | How to write |
|:---|:---|
| Same folder as the document | `picture.png` |
| A folder below | `images/picture.png` |
| A folder above | `../picture.png` |

```markdown example
![markcont icon](icons/icon-192.png "markcont")

<p align="center"><img src="icons/icon-192.png" width="64"></p>
```

- **Always** write the description inside `[ ]`. It shows when the image can't load, and screen readers read it aloud.
- Keeping images together in an `images/` folder inside the document folder makes them easy to manage.
- Images in a folder only show in documents opened with **Open folder**. If you open a single file, it can't read images in the same folder.

---

### 7-2. Diagrams (markcont style)

Diagrams that markcont draws itself. Flowcharts follow the **markcont flowchart standard**: the user zone is on top and the system zone below, each shape has a fixed meaning, and the flow runs left to right. Lines are horizontal or vertical only, and a decision's **Yes is blue and No is red**.

| Code block language | Kind | Use for |
|:---|:---|:---|
| `flow` | Flowchart | Service and feature flows, screen navigation, branches and loops |
| `sequence` | Message order | Requests and responses between people, apps and servers |
| `state` | State changes | Order, document and approval states |
| `timeline` | Timeline | Project schedules, milestones |
| `ui` (or `노출`) | Exposure locations | Where a feature sits and what shows after entering it |
| `data` (or `데이터`) | Data definition | Data and fields developers manage |

> [!NOTE]
> These are markcont-only. GitHub and Obsidian show them as plain code blocks. If the diagram must render elsewhere too, use Mermaid (7-3).

#### Flowchart: write it as a table

Write each shape as **one table row**. You can paste a node table from a planning document as-is (unknown columns are ignored). The header row is optional; without it, columns are read as `code | zone | shape | text | goes to | rule`.

| Column | How to write | Example |
|:---|:---|:---|
| Code | `section-number`. Shapes with the same prefix (`S1`) form one section | `S1-02` |
| Zone | `user` or `system`. Leave empty to draw without zones | `system` |
| Shape | A name from the shape table below | `decision` |
| Text | Text inside the shape. Use `<br>` for a line break | `Signed in?` |
| Goes to | `→ code`. Separate several branches with `/` | `yes → S1-03 / no → S1-04` |
| Rule | Shown small next to a decision as "Rule: …" | `user.signedIn` |
| Section (optional) | A section name, independent of the code | `Receive` |

| Shape name | Looks like | Meaning |
|:---|:---|:---|
| `term` (start/end) | Pill | Start · end |
| `action` | Rectangle | Action · processing |
| `input` | Parallelogram | The user enters or picks something |
| `output` | Parallelogram | A screen, window or notice appears |
| `decision` | Diamond | One question. Branches are labeled "yes · no" |
| `process` | Rectangle with side bars | Shared processing used by several flows |
| `ref` | Circle | A point that returns to a given shape (put the code as text) |
| `sub` (subroutine) | Purple border + ▸ | Opens a sub-flow (dashed section) |

**Shapes where the user picks or enters something go in the user zone; decisions, processing and screens go in the system zone.** Draw user actions such as tapping, typing or closing as user-zone shapes rather than as line labels.

#### Branching: split by a condition

In a `decision` shape's "goes to", write `yes → code / no → code`. Yes becomes a blue line and No a red one, with the label at the line's **starting end**. Add a note after `·`.

````markdown example
```flow
A-1 | | term | Order received | → A-2
A-2 | | decision | In stock? | yes → A-3 / no → A-4 · request stock
A-3 | | action | Pack | → A-5
A-4 | | action | Wait for stock | when it arrives → A-3
A-5 | | term | Ship | —
```
````

#### Going back: repeat an earlier step

Write **the code of an earlier shape** in "goes to". One column back is drawn as a line; **two or more columns back becomes a "↩ code" connector**, so long lines don't cut across the chart.

````markdown example
```flow
| code | zone | shape | text | goes to |
|---|---|---|---|---|
| S1-01 | system | output | [Screen] Sign in | → S1-02 |
| S1-02 | user | input | Enter account | → S1-03 |
| S1-03 | system | decision | Account correct? | yes → S1-04 / no → S1-05 |
| S1-04 | system | action | Save sign-in | — |
| S1-05 | system | output | [Notice] Input error | retry → S1-02 |
```
````

#### Grouping: split into sections

Shapes whose codes share a prefix form **one section** inside a frame. Name a section with a `# code name` line. If codes have no prefix (like `N1` · `N23`), group them yourself: list the codes on a section line such as **`# Receive: N9 N10 N11`**, or add a `section` column to the table. Links to another section are cut with a **"→ code" connector** instead of a long line, and a section opened by a `sub` shape is drawn with a **dashed frame** (sub-flow).

````markdown example
```flow
# H1 Home
# H2 Settings
H1-01 | system | output | [Screen] Home | → H1-02
H1-02 | user | action | Pick Settings | → H1-03
H1-03 | system | sub | Open settings | → H2-01
H2-01 | system | output | [Sheet] Settings | → H2-02
H2-02 | user | action | Pick Sign out | → H2-03
H2-03 | system | process | Clear sign-in | → S1-01
```
````

#### Coloring

Color shapes with a `color code1, code2: name` line. Colors are `blue` `green` `orange` `red` `purple` `gray`. You can also add a `color` column to the table.

> [!IMPORTANT]
> Line colors have fixed meanings (normal = black, yes = blue, no = red). Don't recolor lines to mean "normal" or "error"; write the details as text. Use shape colors **only to show status**, such as done or in progress.

````markdown example
```flow
B-1 | | action | Plan | → B-2
B-2 | | action | Build | → B-3
B-3 | | action | Launch | —
color B-1: green
color B-2: orange
```
````

#### Message order (with conditions and loops)

| How to write | Meaning |
|:---|:---|
| `participants: User(user), App, Server` | Participants and their order (`(user)` draws a pill) |
| `A -> B: text` | Request (solid) |
| `B --> A: text` | Response (dashed) |
| `alt text` ~ `else text` ~ `end` | Different flows by condition |
| `loop text` ~ `end` · `opt text` ~ `end` | Loop · optional flow |
| `note A, B: text` | Note |
| `autonumber` | Number the messages |

````markdown example
```sequence
participants: User(user), App, Server
autonumber
User -> App: Sign in
App -> Server: Check password
alt correct
  Server --> App: OK
  App --> User: Home screen
else wrong
  Server --> App: Failed
  App --> User: Try again
end
```
````

#### State changes

Write `state -> state: event`. `[*]` is the start or end point, `state: description` adds text inside the box, and `group name { … }` groups states. Arrows that go back loop underneath.

````markdown example
```state
[*] -> Draft
Draft -> Review: submit
Review -> Draft: reject
Review -> Done: approve
Done -> [*]
Draft: being written
color Done: green
```
````

#### Timeline

Write `name: start date, duration`. Without a start date a task starts when the previous one ends; `after task` starts when that task ends.

| How to write | Meaning |
|:---|:---|
| `section name` | Group (gets its own color) |
| `5d` · `2w` · `1m` | Duration (1m = 30 days) |
| `~ 2026-11-20` | End date |
| `done` · `active` · `crit` | Faded · bold · red border |
| `◆ name: date` | Milestone |
| `today 2026-11-06` · `today hide` | Today line date · hide it |

````markdown example
```timeline
title Launch plan
today 2026-11-06
section Planning
Requirements: 2026-11-02, 5d, done
Screen design: 3d, active
section Build
Build screens: after Requirements, 7d
Testing: 3d, crit
◆ Launch: 2026-11-20
```
````

#### Exposure locations

Put an indented list in a ```` ```ui ```` block and it shows as a **📍 location → 🚪 entry point → shown after entering** tree. A line starting with `🚪` or `entry:` (or ending with `(들어오는 곳: …)`) is an entry point.

````markdown example
```ui
- Home tab
  - entry: Navigation bar [Mailbox]
    - Red dot (when rewards are waiting)
    - Mailbox sheet
      - [Receive] → Rewards popup
      - [Delete] → Delete confirm popup
```
````

#### Data definition

Under `# Data name`, write **one field per line**. Columns are `field | type | required | description | example | status`; a header row sets a different order. Separate columns with `|`, commas (CSV) or tabs, so you can paste straight from a spreadsheet.

- If a type names another data (`Reward` · `Reward list` · `→ Reward`), a **connector line** links the cards; click it to jump to that card.
- A `> note` line becomes a description under the card header; parentheses in `# Name (id)` show as the code name.
- Save for other viewers turns each data into a normal table.

````markdown example
```data
# Mail (mail)
> One mail kept in the mailbox
field | type | required | description | example
Mail title | text(40) | required | Shown in list · detail | 7-day login reward
Sent at | datetime | required | Arrival time | 2026-11-06 05:00
Sender | text | optional | Ops · system | Ops team
Reward list | Reward list | required | In attachment order | Ticket 3

# Reward (reward)
Reward type | ticket · illustration card · video card | required
Amount | number | required
```
````

> [!TIP]
> Guidelines for flowcharts and exposure locations with many nodes are collected in the [Workflow writing rules](Workflow-Writing-Rules.md).

#### Diagram rules (markcont style)

1. Flows run **left → right**. The main path stays straight; branches stack in new rows (up in the user zone, down in the system zone).
2. A decision asks one question, and its branches are labeled **yes · no**.
3. User actions (tap, type, close) are **user-zone shapes**; automatic processing and screens go in the system zone.
4. Links to another section, links going two or more columns back, and **long lines that would cut across the chart** become connectors ("→ code" · "↩ code") automatically. A connector shows the target's code and text. Add a `cut long lines` line to cut every link that skips two or more columns, or `keep long lines` to never cut them.
5. When a shape has many branches, the lines spread around its corners and their labels are moved so they don't overlap.
6. Mark guessed shapes or links with "(guess)" at the end of the text.
7. If something is written wrong, the diagram area shows **which line is wrong and why**.
8. For a big chart, use **⤢** at the top right to enlarge it: wheel or pinch to zoom, drag to pan, and "Fit to screen".

---

### 7-3. Diagrams (Mermaid)

Use these when the diagram must also render on GitHub or Obsidian.

````markdown
```mermaid
flowchart TD
    Start --> End
```
````

Write `mermaid` as the code block language, and put the **diagram type** on the first line.

| First line | Type | Use for |
|:---|:---|:---|
| `flowchart TD` | Flowchart (top → bottom) | Workflows, branches, loops |
| `flowchart LR` | Flowchart (left → right) | Short steps |
| `sequenceDiagram` | Back-and-forth sequence | Conversations between people · systems |
| `stateDiagram-v2` | State changes | Order · document status |
| `gantt` | Schedule | Project timelines |
| `pie` | Pie chart | Proportions |
| `mindmap` | Mind map | Organizing ideas |

#### Flowchart: box shapes

| How to write | Shape | Use for |
|:---|:---|:---|
| `A[text]` | Rectangle | Normal step |
| `A(text)` | Rounded rectangle | Softer step |
| `A([text])` | Pill | Start · end |
| `A{text}` | Diamond | **Branch (yes/no)** |
| `A((text))` | Circle | Connector |
| `A[(text)]` | Cylinder | Storage · DB |
| `A[[text]]` | Double rectangle | Calling another flow |

#### Flowchart: arrows

| How to write | Shape |
|:---|:---|
| `A --> B` | Arrow |
| `A --- B` | Line only |
| `A -.-> B` | Dotted arrow (optional · exception) |
| `A ==> B` | Thick arrow (main path) |
| `A -->|yes| B` | Text on the arrow |
| `A --> B & C` | To several places at once |

#### Branches: splitting by condition

Send several arrows out of a diamond `{ }`, and add a `|condition|` to each arrow.

````markdown example
```mermaid
flowchart TD
    A([Order received]) --> B{In stock?}
    B -->|Yes| C[Pack]
    B -->|No| D[Request restock]
    C --> E([Ship])
    D -.->|When restocked| C
```
````

#### Going back: repeating an earlier step

Just point an arrow back to an **earlier box**. Write the repeat condition as the arrow text.

````markdown example
```mermaid
flowchart TD
    A[Write draft] --> B[Review]
    B --> C{Approved?}
    C -->|No, needs fixes| A
    C -->|Yes| D([Publish])
```
````

#### Groups: boxing steps together

Boxes placed between `subgraph name` and `end` are shown as one group. Groups can be connected with arrows too.

````markdown example
```mermaid
flowchart LR
    subgraph Planning
        A[Idea] --> B[Proposal]
    end
    subgraph Development
        C[Screens] --> D[Features]
        D --> E{Test}
        E -->|Fail| D
    end
    B --> C
    E -->|Pass| F([Launch])
```
````

#### Adding color

Define a color with `classDef name fill:background,stroke:border`, then apply it with `class boxes name`.

````markdown example
```mermaid
flowchart LR
    A[Done] --> B[In progress] --> C[Planned]
    classDef done fill:#d7f5ea,stroke:#3cb995
    classDef doing fill:#fff1c2,stroke:#d4a017
    class A done
    class B doing
```
````

#### Back-and-forth sequences (with conditions · loops)

| How to write | Meaning |
|:---|:---|
| `A->>B: text` | Send (solid line) |
| `B-->>A: text` | Reply (dotted line) |
| `alt condition` ~ `else` ~ `end` | Different flow depending on a condition |
| `loop condition` ~ `end` | Loop |
| `Note over A,B: text` | Note |

````markdown example
```mermaid
sequenceDiagram
    User->>App: Log in
    App->>Server: Check password
    alt Correct
        Server-->>App: Success
        App-->>User: Home screen
    else Wrong
        Server-->>App: Failure
        App-->>User: Try again
    end
```
````

#### State changes · schedules

````markdown example
```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> InReview: Submit
    InReview --> Draft: Reject
    InReview --> Done: Approve
    Done --> [*]
```
````

````markdown example
```mermaid
gantt
    dateFormat YYYY-MM-DD
    section Planning
    Gather requirements :a1, 2026-11-02, 5d
    section Development
    Build screens :after a1, 7d
    Testing :3d
```
````

#### Diagram rules

1. Use **short English IDs** for boxes (`A`, `B`, `start`), and put the visible text inside `[ ]`.
2. If the text contains symbols like parentheses or commas, wrap it in quotes: `A["Check (required)"]`
3. To break a line inside a box, use `<br>`: `A[Step 1<br>Prepare]`
4. Keep it to **15 boxes or fewer** per diagram. If you have more, group them with `subgraph` or split into two.
5. Keep the flow in one direction (`TD` or `LR`); only arrows that go back run the other way.
6. If the syntax is wrong, an error message appears where the diagram should be. Start by checking the line you changed last.

---

### 7-4. Math (KaTeX)

| Where | How to write |
|:---|:---|
| Inside a sentence | `$E = mc^2$` |
| On its own, large | Between two `$$` lines, or in a ```` ```math ```` block |

| What you want | How to write | Result |
|:---|:---|:---|
| Superscript · subscript | `x^2`, `a_i`, `x^{10}` | $x^2$, $a_i$, $x^{10}$ |
| Fraction | `\frac{a}{b}` | $\frac{a}{b}$ |
| Square root | `\sqrt{x}`, `\sqrt[3]{x}` | $\sqrt{x}$, $\sqrt[3]{x}$ |
| Sum · product | `\sum_{i=1}^{n} i`, `\prod_{k=1}^{n} k` | $\sum_{i=1}^{n} i$, $\prod_{k=1}^{n} k$ |
| Integral · limit | `\int_a^b f(x)\,dx`, `\lim_{x \to 0}` | $\int_a^b f(x)\,dx$, $\lim_{x \to 0}$ |
| Greek letters | `\alpha \beta \pi \theta \Delta \Sigma` | $\alpha \beta \pi \theta \Delta \Sigma$ |
| Multiply · divide | `\times \div \cdot \pm` | $\times \div \cdot \pm$ |
| Comparison | `\le \ge \ne \approx \equiv` | $\le \ge \ne \approx \equiv$ |
| Arrows | `\to \Rightarrow \Leftrightarrow` | $\to \Rightarrow \Leftrightarrow$ |
| Sets | `\in \notin \subset \cup \cap \emptyset` | $\in \notin \subset \cup \cap \emptyset$ |
| Vector · mean | `\vec{v}`, `\bar{x}`, `\hat{y}` | $\vec{v}$, $\bar{x}$, $\hat{y}$ |
| Words inside math | `\text{speed} = \frac{\text{distance}}{\text{time}}` | $\text{speed} = \frac{\text{distance}}{\text{time}}$ |

````markdown example
Align several lines on the equals sign.

$$
\begin{aligned}
(a+b)^2 &= (a+b)(a+b) \\
        &= a^2 + 2ab + b^2
\end{aligned}
$$

Split by cases.

$$
|x| = \begin{cases} x & (x \ge 0) \\ -x & (x < 0) \end{cases}
$$

Matrices work too: $\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}$
````

**Math rules**

1. To raise or lower two or more characters, group them with `{ }`: `x^{10}` (without it, `x^10` → $x^10$)
2. Wrap words inside math in `\text{ }`.
3. `\\` is a line break and `&` is the alignment point (inside `aligned`, `cases`, and matrices).
4. For a literal `$`, such as in a price, write `\$`.

---

### 7-5. Chemical formulas (mhchem)

Use `\ce{ }` inside math to draw it by chemistry rules. Numbers automatically become subscripts.

| What you want | How to write | Result |
|:---|:---|:---|
| Molecule | `$\ce{H2O}$`, `$\ce{C6H12O6}$` | $\ce{H2O}$, $\ce{C6H12O6}$ |
| Ion | `$\ce{Na+}$`, `$\ce{SO4^2-}$` | $\ce{Na+}$, $\ce{SO4^2-}$ |
| Reaction | `$\ce{2H2 + O2 -> 2H2O}$` | $\ce{2H2 + O2 -> 2H2O}$ |
| Reversible reaction | `$\ce{N2 + 3H2 <=> 2NH3}$` | $\ce{N2 + 3H2 <=> 2NH3}$ |
| Reaction conditions | `$\ce{CaCO3 ->[\Delta] CaO + CO2}$` | $\ce{CaCO3 ->[\Delta] CaO + CO2}$ |
| State of matter | `$\ce{NaCl(aq)}$`, `$\ce{H2O(l)}$` | $\ce{NaCl(aq)}$, $\ce{H2O(l)}$ |
| Gas · precipitate | `$\ce{CO2 ^}$`, `$\ce{AgCl v}$` | $\ce{CO2 ^}$, $\ce{AgCl v}$ |
| Hydrate | `$\ce{CuSO4*5H2O}$` | $\ce{CuSO4*5H2O}$ |
| Isotope | `$\ce{^{14}_{6}C}$` | $\ce{^{14}_{6}C}$ |

```markdown example
The equation for photosynthesis is:

$$
\ce{6CO2 + 6H2O ->[\text{light}] C6H12O6 + 6O2}
$$
```

---

## 8️⃣ Footnotes and collapsible content

### Footnotes

- Write `[^1]` in the text, and a line `[^1]: explanation` **anywhere** in the document.
- Wherever you put the explanation line, on screen they're **always gathered at the bottom** of the document in number order. You don't have to put them at the end.
- For easy upkeep, we recommend putting it **right below that paragraph**.
- Names work instead of numbers too: `[^source]`, `[^note]`

**How to check it worked**

| Status | What you see |
|:---|:---|
| Explanation exists | A small superscript number. Click it to jump to the explanation below; click ↩ to come back |
| Explanation missing | `[^1]` shows as plain text with a **red dotted line** |

```markdown example
markcont can also be used as a web app[^web].

[^web]: On a phone, add it to your home screen and it opens like an app.

Here's what a missing explanation looks like[^missing].
```

### Collapsible content

Fold away content people only need sometimes, like FAQs. Leave a **blank line** after `<summary>` and before `</details>` so the Markdown inside shows properly.

```markdown example
<details>
<summary>Do I need to install it?</summary>

No. Just open the **web address** and start using it.

</details>
```

---

## 9️⃣ markcont extended syntax

This syntax isn't part of standard Markdown (CommonMark), but markcont understands it.
Check **where it works** first, and if the document will be opened elsewhere too, pick the options with more ✅.

### Where does it work?

| Syntax | How to write | markcont | GitHub | Obsidian |
|:---|:---|:---:|:---:|:---:|
| 5 callout types | `> [!NOTE]` | ✅ | ✅ | ✅ |
| 6 extra callout types | `> [!INFO]` `> [!TODO]` … | ✅ | ❌ | ✅ |
| Collapsible callouts | `> [!NOTE]-` · `> [!NOTE]+` | ✅ | ❌ | ✅ |
| Custom callout title | `> [!TIP] My title` | ✅ | ❌ | ✅ |
| Bold · italic followed by CJK text | `**bold(note)**는` | ✅ | ❌ symbols shown | ⚠️ reading view only |
| Highlight | `==text==` | ✅ | ❌ plain text | ✅ |
| Inserted text | `++text++` | ✅ | ❌ plain text | ❌ |
| Deleted text | `--text--` | ✅ | ❌ plain text | ❌ |
| Footnote | `text[^1]` + `[^1]: explanation` | ✅ | ✅ | ✅ |
| Inline footnote | `text^[explanation]` | ✅ | ❌ | ✅ |
| Definition list | `term` + next line `: definition` | ✅ | ❌ | ❌ |
| Math | `$…$` · `$$…$$` | ✅ | ✅ | ✅ |
| Math block | ```` ```math ```` | ✅ | ✅ | ❌ |
| Chemical formula | `$\ce{H2O}$` | ✅ | ❌ | ❌ |
| Diagram (Mermaid) | ```` ```mermaid ```` | ✅ | ✅ | ✅ |
| Diagram (markcont style) | ```` ```flow ```` ```` ```sequence ```` ```` ```state ```` ```` ```timeline ```` | ✅ | ❌ shown as code | ❌ shown as code |
| Exposure · data definition | ```` ```ui ```` · ```` ```data ```` | ✅ | ❌ shown as code | ❌ shown as code |
| Wikilink | `[[document]]` · `[[document#heading\|alias]]` | ✅ | ❌ | ✅ |
| Embed image (wiki style) | `![[picture.png]]` | ✅ | ❌ | ✅ |
| Video · audio | `![description](video.mp4)` | ✅ | ❌ broken image | ✅ |
| YouTube thumbnail | A YouTube URL alone on a line | ✅ | ❌ link | ❌ link |
| Document info | `name: value` between `---` lines at the very top | ✅ info box | ⚠️ table | ✅ |
| Collapsible content | `<details>` | ✅ | ✅ | ✅ |
| Keyboard keys | `<kbd>Ctrl</kbd>` | ✅ | ✅ | ✅ |
| Source · result side by side | ```` ```markdown example ```` | ✅ | ❌ shown as code | ❌ shown as code |

<sub>The GitHub and Obsidian columns show behavior with default settings as of November 2026. It may differ by version or plugins.</sub>

> [!TIP]
> Even if you use ❌ syntax, **▾ → Save for other viewers…** makes a standard copy. Bold followed by CJK text and highlight · inserted · deleted text become HTML tags, extra callouts become one of the 5 standard types + a title, foldable callouts become `<details>`, wikilinks become normal links, and markcont diagrams become **Mermaid**. Chemistry `\ce{}` can't be converted, so it's left as is and flagged.

### Callouts: 11 types and collapsing

On top of the same 5 types as GitHub (`NOTE` · `TIP` · `IMPORTANT` · `WARNING` · `CAUTION`), there are 6 more.

| How to write | Label shown | Use for |
|:---|:---|:---|
| `> [!INFO]` | ℹ️ INFO | Extra information |
| `> [!TODO]` | ☑️ TODO | To-dos |
| `> [!EXAMPLE]` | 📋 EXAMPLE | Examples |
| `> [!QUESTION]` | ❓ QUESTION | Questions |
| `> [!FAQ]` | ❓ FAQ | Frequently asked questions |
| `> [!DANGER]` | ⛔ DANGER | Very dangerous things |

```markdown example
> [!INFO]
> Here's some extra information.

> [!EXAMPLE]- Click to expand
> Collapsed at first.

> [!TODO]+ Today's tasks
> Expanded at first; click the title to collapse it.

> [!DANGER]
> This is very dangerous.
```

- `-` means **collapsed at first**, `+` means **expanded at first**.
- Text written right after `[!TYPE]` becomes the title.
- Choose the callout look (💡 NOTE / ⓘ Note) in **View settings (Aa) → Callout style**.

### Highlight · inserted · deleted text

```markdown example
Highlight only ==the single most important phrase==.
In a revised document, mark newly added words ++like this++ and removed words --like this--.
```

#### Keeping symbols from turning into formatting by mistake

`~`, `==`, `++`, and `--` show up a lot in everyday writing, so markcont **only treats them as formatting in narrow cases**.

| If you write | markcont shows | Why |
|:---|:---|:---|
| `Seoul~Busan`, `~10 to ~20` | Plain text | Strikethrough needs **two** tildes: `~~text~~` |
| `x==1 and y==2` | Plain text | `==` attached to letters or numbers isn't a highlight |
| `a == b == c` | Plain text | A space just inside the symbols means it isn't a highlight |
| `C++`, `i++ and j++` | Plain text | `++` attached to letters isn't inserted text |
| `--force`, `a--b`, `A --> B` | Plain text | `--` attached to letters or numbers, or with a space just inside, isn't deleted text |
| `` `a == b` ``, `$a == b$` | Code · math | Inside code and math, it's always left as is |
| `==중요==를` | Highlight | Korean (Hangul) letters may touch it |

```markdown example
10:00~12:00, Seoul~Busan
Check whether x==1 and y==2
==just this part== highlighted, ~~just this part~~ struck through
```

**If you still want the symbols shown as plain text**, put `\` in front of them.

```markdown example
\=\=as is\=\= · \~\~as is\~\~ · \+\+as is\+\+
```

> [!WARNING]
> **On GitHub, a single tilde** `~text~` also becomes strikethrough. If the document will go on GitHub too, write ranges like `10:00-12:00` or `10:00 ~ 12:00` (with spaces), or use `\~`. For subscripts, write `H<sub>2</sub>O`.

### Inline footnotes · definition lists

```markdown example
Write a footnote right in the text^[No need to pick a number.].

Markdown
: A format for making tidy documents with just a few symbols

markcont
: A viewer for reading and editing Markdown nicely
: You can add more than one definition
```

### Math · chemical formulas

| How to write | Result |
|:---|:---|
| `$E = mc^2$` | $E = mc^2$ |
| `$\frac{a}{b}$` | $\frac{a}{b}$ |
| `$\ce{H2O}$` | $\ce{H2O}$ |
| `$\ce{2H2 + O2 -> 2H2O}$` | $\ce{2H2 + O2 -> 2H2O}$ |

- Write large formulas between two `$$` lines or in a ```` ```math ```` block.
- To write `$` as a character, like a price, put `\` in front: `\$5`. A `$` with a number right after it, like `$5`, isn't treated as math.

### Wikilinks · embedding images

Links that jump straight to another document when you've opened a folder. Leave out the `.md`.

| How to write | What it does |
|:---|:---|
| `[[Meeting notes]]` | Opens Meeting notes.md |
| `[[Meeting notes#Decisions]]` | Goes to the "Decisions" heading in that document |
| `[[Meeting notes#Decisions\|See decisions]]` | Shows the link text as "See decisions" |
| `[[#3️⃣ Text formatting]]` | Goes to a heading in this document |
| `![[picture.png]]` | Embeds an image in the folder by name only |

- If you write just a document name, markcont looks for **that name across the whole folder**. If several share the name, write a path like `[[docs/Meeting notes]]`.
- A link to a document that doesn't exist shows as a faint dotted link. A link with no heading, like `[[document]]`, is left as plain text if the document it points to doesn't exist.
- Regular links like `[text](other-doc.md)` also open right inside markcont.

### Video · audio · YouTube

```markdown
![Screen recording](images/demo.mp4)
![Interview](audio/interview.mp3)

https://youtu.be/SEgHM748yrE?si=HsLb-OZOiQqXq3ng
```

- Put a video (`mp4` `webm` `mov`) or audio (`mp3` `wav` `m4a` `flac`) file in image syntax and it shows as a **player**.
- A YouTube URL **on a line by itself** becomes a thumbnail. A URL in the middle of a sentence stays a plain link.

### Document info (`---` at the top)

```markdown
---
title: November meeting notes
author: RyuSeoJin
tags:
  - meeting
  - 2026
---
```

- Wrap lines in `---` starting from the **very first line** of the document, and they're shown neatly in a **document info** box above the text.
- Write one `name: value` per line, and list items as `  - item`.
- These names also work as markcont view options. They never change the text itself.

| name: value | What it does |
|:---|:---|
| `badges: done=green, pending=orange, open=red` | Table cells that start with those words show as colored badges (blue · green · orange · red · purple · gray) |
| `viewer: markcont` | A markcont-only document: hides the "⚠ spots look different in other viewers" notice |

### Line breaks

| What you want | How to write |
|:---|:---|
| A new paragraph | One blank line |
| A line break within the same paragraph | Two spaces at the end of the line, or `\` |

> [!NOTE]
> A single Enter keeps the text in the same paragraph (same as GitHub and standard markdown). Use the methods above to break lines.

### Showing source and result side by side

Use this when you want to show **"Write this → Looks like this"** side by side, like this document does.
Write `markdown example` where the code block language goes, and the source appears on the left with the result on the right.

`````markdown example
````markdown example
Write **bold** and add a ==highlight== too.
````
`````

- On narrow screens, it splits into top (source) and bottom (result).
- Headings inside examples don't appear in the outline.
- Other programs just show it as a regular Markdown code block.

### What you can't use

| If you write | What happens | Instead |
|:---|:---|:---|
| `<style>` · `<script>` | Removed (for security) | Format with Markdown syntax |
| `~subscript~` | Plain text (strikethrough on GitHub) | `<sub>…</sub>` |
| `^superscript^` | Plain text | `<sup>…</sup>` |
| `:smile:` emoji codes | Plain text | Type the 😄 emoji directly |

---

## 🎯 One-page summary

1. One `#` title, one emoji per `##` section, `---` between sections
2. Emphasis goes in callouts (NOTE · TIP · IMPORTANT · WARNING · CAUTION), up to two per section
3. Tables for comparisons and settings, checklists for to-dos
4. Language names on code blocks, `diff` for changes
5. Flows as a ```` ```flow ```` table (user · system zones, yes = blue · no = red, sections for groups) or mermaid for GitHub, math with `$`, chemistry with `\ce{}`
6. Side notes as footnotes (the explanation line can go anywhere; a missing one shows a red dotted line), Q&A in `<details>`
7. Extended syntax (`==highlight==`, `[[wikilink]]`, `> [!TODO]-` …) may only work in markcont, so check **the table in section 9**
