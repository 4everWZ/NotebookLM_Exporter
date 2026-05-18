# Structured Content and Selection Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build NotebookLM Export 1.1 so Markdown preserves internal message structure and the popup can show scan status, counts, and all/checked export controls.

**Architecture:** Keep the 1.0 DOM-first extension architecture. Add block-aware Markdown extraction and pure selection/status helpers in `src/extension/core.js`, then make the content script expose scan/export contracts consumed by a richer popup UI.

**Tech Stack:** Plain JavaScript, Manifest V3, Node built-in `node:test`, repository-native `npm test` and `npm run build`.

---

## File Structure

- Modify `src/extension/core.js`: structured DOM-to-Markdown traversal, previews, status helper, all/selected filtering, frontmatter metadata.
- Modify `src/extension/content-script.js`: add scan message type and export options handling.
- Modify `src/extension/popup.html`: add count/status fields, mode radios, checklist, export button state.
- Modify `src/extension/popup.css`: compact popup layout for counts and checklist.
- Modify `src/extension/popup.js`: scan on load, render counts/checklist, send export options.
- Modify `scripts/verify-extension.js`: verify required popup element IDs and new content-script message constants.
- Modify `tests/dom-adapter.test.js`: add failing fixtures for newlines and rich blocks.
- Modify `tests/renderer.test.js`: add frontmatter metadata tests for export mode.
- Create `tests/selection.test.js`: cover filtering and status helpers.
- Modify `docs/matrix_notebooklm_export_1_1.md`: update implementation status after code is complete.
- Modify `task_plan.md` and `progress.md`: keep phase status current.

## Task 1: RED Tests for Structured Message Markdown

**Files:**
- Modify: `tests/dom-adapter.test.js`

- [ ] **Step 1: Add a failing test for internal line breaks and paragraphs**

Append this test to `tests/dom-adapter.test.js`:

```js
test("preserves message-internal line breaks and paragraph boundaries", () => {
  const fixture = doc({
    title: "Line Break Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "from-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content from-user-message-inner-content" }, [
              el("p", {}, ["First line", el("br", {}, []), "Second line"]),
              el("p", {}, ["Second paragraph"]),
            ]),
          ]),
        ]),
      ]),
    ],
  });

  const data = extractNotebookData(fixture, {
    exportedAt: "2026-05-18T10:00:00.000Z",
    historyLoadStatus: "complete",
  });

  assert.equal(data.messages[0].markdown, "First line\nSecond line\n\nSecond paragraph");
});
```

- [ ] **Step 2: Add a failing test for rich inline and block Markdown**

Append this test to `tests/dom-adapter.test.js`:

```js
test("renders headings, inline rich text, links, and code blocks as Markdown", () => {
  const fixture = doc({
    title: "Rich Text Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "to-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content to-user-message-inner-content" }, [
              el("h3", {}, ["Main result"]),
              el("p", {}, [
                "Use ",
                el("strong", {}, ["collision"]),
                " and ",
                el("em", {}, ["entropy"]),
                " with ",
                el("code", {}, ["score"]),
                " from ",
                el("a", { href: "https://example.com" }, ["paper"]),
                ".",
              ]),
              el("pre", {}, ["alpha\nbeta\n"]),
            ]),
          ]),
        ]),
      ]),
    ],
  });

  const data = extractNotebookData(fixture, {
    exportedAt: "2026-05-18T10:00:00.000Z",
    historyLoadStatus: "complete",
  });

  assert.equal(
    data.messages[0].markdown,
    [
      "### Main result",
      "",
      "Use **collision** and *entropy* with `score` from [paper](https://example.com).",
      "",
      "```text",
      "alpha",
      "beta",
      "```",
    ].join("\n"),
  );
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```powershell
node --test tests/dom-adapter.test.js
```

Expected: FAIL because the current adapter collapses internal newlines and does not render headings, emphasis, or links.

## Task 2: GREEN Structured DOM-to-Markdown Implementation

**Files:**
- Modify: `src/extension/core.js`

- [ ] **Step 1: Replace global body whitespace collapse with block-aware helpers**

Implement helpers equivalent to:

```js
const BLOCK_TAGS = new Set(["p", "div", "section", "mat-card-content", "ul", "ol", "pre", "table", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6"]);

function trimOuterBlankLines(text) {
  return String(text || "").replace(/^\n+|\n+$/g, "");
}

function normalizeInlineSpaces(text) {
  return String(text || "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function hasBlockChildren(element) {
  return Array.from(element.children || []).some((child) => BLOCK_TAGS.has(getTagName(child)));
}
```

- [ ] **Step 2: Add inline rendering for formatting and links**

Update `nodeToMarkdown` to handle:

```js
if (tagName === "strong" || tagName === "b") {
  const text = normalizeInlineSpaces(renderInlineChildren(node, context));
  return text ? `**${text}**` : "";
}

if (tagName === "em" || tagName === "i") {
  const text = normalizeInlineSpaces(renderInlineChildren(node, context));
  return text ? `*${text}*` : "";
}

if (tagName === "a") {
  const text = normalizeInlineSpaces(renderInlineChildren(node, context));
  const href = node.getAttribute && node.getAttribute("href");
  return text && href ? `[${text}](${href})` : text;
}
```

- [ ] **Step 3: Preserve explicit line breaks**

Keep `<br>` as a newline in `nodeToMarkdown`:

```js
if (tagName === "br") {
  return "\n";
}
```

Ensure no later `normalizeInline` call turns that newline into a space.

- [ ] **Step 4: Render block children separately**

Refactor `elementToMarkdown` so block children are pushed as separate blocks and joined with `\n\n`. Paragraph nodes should render inline children with preserved `<br>` newlines.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/dom-adapter.test.js
```

Expected: PASS.

## Task 3: RED Tests for Selection, Status, and Metadata

**Files:**
- Create: `tests/selection.test.js`
- Modify: `tests/renderer.test.js`

- [ ] **Step 1: Create failing selection/status tests**

Create `tests/selection.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { createConversationStatus, createMessagePreview, filterExportData } = require("../src/extension/core.js");

function sampleData() {
  return {
    metadata: {
      title: "Selection Test",
      url: "https://notebooklm.google.com/notebook/example",
      exportedAt: "2026-05-18T10:00:00.000Z",
      historyLoadStatus: "complete",
      messageCount: 3,
      sourceCount: 1,
    },
    sources: [{ id: "s1", title: "Source A" }],
    messages: [
      { id: "m1", role: "user", markdown: "First question", citations: [] },
      { id: "m2", role: "assistant", markdown: "First answer", citations: [] },
      { id: "m3", role: "user", markdown: "Second question", citations: [] },
    ],
    warnings: [],
  };
}

test("filterExportData keeps all messages by default", () => {
  const filtered = filterExportData(sampleData(), { mode: "all", selectedMessageIds: [] });
  assert.deepEqual(filtered.messages.map((message) => message.id), ["m1", "m2", "m3"]);
  assert.equal(filtered.metadata.exportMode, "all");
  assert.equal(filtered.metadata.messageCount, 3);
});

test("filterExportData keeps selected messages in original order", () => {
  const filtered = filterExportData(sampleData(), { mode: "selected", selectedMessageIds: ["m3", "m1"] });
  assert.deepEqual(filtered.messages.map((message) => message.id), ["m1", "m3"]);
  assert.equal(filtered.metadata.exportMode, "selected");
  assert.equal(filtered.metadata.selectedMessageCount, 2);
  assert.equal(filtered.metadata.messageCount, 2);
});

test("filterExportData rejects empty selected exports", () => {
  assert.throws(
    () => filterExportData(sampleData(), { mode: "selected", selectedMessageIds: [] }),
    /requires at least one checked message/,
  );
});

test("filterExportData rejects selected ids that are not present", () => {
  assert.throws(
    () => filterExportData(sampleData(), { mode: "selected", selectedMessageIds: ["missing"] }),
    /Selected messages were not found/,
  );
});

test("createConversationStatus summarizes complete scan data", () => {
  const status = createConversationStatus(sampleData(), { status: "complete", messageCount: 3, attempts: 2 });
  assert.equal(status.ok, true);
  assert.equal(status.status, "complete");
  assert.equal(status.messageCount, 3);
  assert.equal(status.sourceCount, 1);
  assert.deepEqual(status.messages[0], { id: "m1", role: "user", preview: "First question" });
});

test("createMessagePreview flattens markdown to a compact single line", () => {
  assert.equal(createMessagePreview("Heading\n\n- first\n- second"), "Heading - first - second");
});
```

- [ ] **Step 2: Add renderer metadata assertions**

In `tests/renderer.test.js`, add assertions for:

```js
assert.match(first, /export_mode: "all"/);
assert.match(first, /selected_message_count: 2/);
```

Update the test fixture metadata to include:

```js
exportMode: "all",
selectedMessageCount: 2,
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
node --test tests/selection.test.js tests/renderer.test.js
```

Expected: FAIL because `createConversationStatus`, `createMessagePreview`, `filterExportData`, and new frontmatter fields are missing.

## Task 4: GREEN Selection, Status, and Frontmatter

**Files:**
- Modify: `src/extension/core.js`

- [ ] **Step 1: Add preview helper**

Implement:

```js
function createMessagePreview(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " code ")
    .replace(/[#>*_`[\]()|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}
```

- [ ] **Step 2: Add `filterExportData`**

Implement all/selected filtering by cloning the top-level model and metadata. Selected mode uses a `Set`, preserves original order, and throws on empty or unmatched IDs.

- [ ] **Step 3: Add `createConversationStatus`**

Implement a pure status response helper that returns scan summaries and previews without exposing full Markdown bodies to the popup.

- [ ] **Step 4: Add frontmatter fields**

Add these lines to `renderMarkdown` after `history_load_status`:

```js
`export_mode: ${yamlString(metadata.exportMode || "all")}`,
`selected_message_count: ${numberValue(metadata.selectedMessageCount ?? metadata.messageCount)}`,
```

- [ ] **Step 5: Export helpers**

Expose new helpers from `core.js` CommonJS/global return:

```js
return {
  createConversationStatus,
  createMessagePreview,
  extractNotebookData,
  extractFormulaMarkdown,
  filterExportData,
  loadFullHistory,
  renderMarkdown,
};
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/selection.test.js tests/renderer.test.js
```

Expected: PASS.

## Task 5: RED Static Contract Checks for Popup and Message Types

**Files:**
- Modify: `scripts/verify-extension.js`

- [ ] **Step 1: Add verifier requirements before changing popup code**

Add checks that fail unless these popup IDs exist in `src/extension/popup.html`:

```js
for (const requiredId of [
  "status",
  "message-count",
  "source-count",
  "history-status",
  "mode-all",
  "mode-selected",
  "message-list",
  "export-markdown",
]) {
  if (!popupHtml.includes(`id="${requiredId}"`)) {
    fail(`popup.html must include #${requiredId}`);
  }
}
```

Add checks that fail unless `content-script.js` contains both:

```js
NOTEBOOKLM_SCAN_CONVERSATION
NOTEBOOKLM_EXPORT_MARKDOWN
```

- [ ] **Step 2: Run verifier and verify RED**

Run:

```powershell
npm run build
```

Expected: FAIL because popup/content-script do not yet satisfy the 1.1 contract.

## Task 6: GREEN Content Script Scan and Export Options

**Files:**
- Modify: `src/extension/content-script.js`

- [ ] **Step 1: Add message type constants**

Use:

```js
const MESSAGE_TYPES = {
  scan: "NOTEBOOKLM_SCAN_CONVERSATION",
  exportMarkdown: "NOTEBOOKLM_EXPORT_MARKDOWN",
};
```

- [ ] **Step 2: Extract shared scan helper**

Create an internal `scanConversation()` that validates NotebookLM host, runs `loadFullHistory`, extracts data, and returns `{ history, data }`. It should throw for `not_notebooklm`, non-complete history, and zero messages when used by export, but scan responses should return incomplete status data when possible.

- [ ] **Step 3: Implement `scanForPopup()`**

Return `core.createConversationStatus(data, history)` when extraction succeeds. On non-complete history, return `{ ok: false, status: history.status, messageCount: history.messageCount || 0, sourceCount: data ? data.sources.length : 0, error }`.

- [ ] **Step 4: Update `exportMarkdown(options)`**

Accept `options`, call `core.filterExportData(data, options || { mode: "all", selectedMessageIds: [] })`, render filtered data, download, and return response metadata including `historyStatus` and `exportMode`.

- [ ] **Step 5: Route both message types**

Update `chrome.runtime.onMessage.addListener` so scan and export are handled separately and unsupported messages return `undefined`.

## Task 7: GREEN Popup UI and Validation

**Files:**
- Modify: `src/extension/popup.html`
- Modify: `src/extension/popup.css`
- Modify: `src/extension/popup.js`

- [ ] **Step 1: Add popup fields**

Replace the one-button body with fields matching the spec:

```html
<section class="metrics" aria-label="Conversation status">
  <span id="message-count">Messages: -</span>
  <span id="source-count">Sources: -</span>
</section>
<p id="history-status">DOM: unknown</p>
<fieldset class="mode-group">
  <legend>Export</legend>
  <label><input id="mode-all" name="export-mode" type="radio" value="all" checked /> All</label>
  <label><input id="mode-selected" name="export-mode" type="radio" value="selected" /> Checked</label>
</fieldset>
<div id="message-list" class="message-list" aria-label="Detected messages"></div>
<button id="export-markdown" type="button" disabled>Export Markdown</button>
<p id="status" role="status">Checking active tab...</p>
```

- [ ] **Step 2: Style compact checklist**

Use fixed popup width, a max-height scroll area for `#message-list`, stable row spacing, and restrained colors consistent with 1.0.

- [ ] **Step 3: Implement scan on load**

In `popup.js`, send `{ type: "NOTEBOOKLM_SCAN_CONVERSATION" }` after getting the active tab. Render counts/status and message rows from the response.

- [ ] **Step 4: Implement selection validation**

Keep `All` as default. Disable row checkboxes unless selected mode is active. Disable export if selected mode has zero checked IDs or scan status is not `complete`.

- [ ] **Step 5: Send export options**

On export click, send:

```js
{
  type: "NOTEBOOKLM_EXPORT_MARKDOWN",
  options: {
    mode: getMode(),
    selectedMessageIds: getSelectedMessageIds()
  }
}
```

## Task 8: Full Verification and Documentation Sync

**Files:**
- Modify: `docs/matrix_notebooklm_export_1_1.md`
- Modify: `docs/specs/status_notebooklm_export_1_0.md` or create `docs/specs/status_notebooklm_export_1_1.md`
- Modify: `task_plan.md`
- Modify: `progress.md`

- [ ] **Step 1: Run unit tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Run extension verifier**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 3: Verify ignored sample directory**

Run:

```powershell
git status --short --ignored
```

Expected: `html_tset/` appears as ignored and not tracked.

- [ ] **Step 4: Update matrix**

Change each 1.1 matrix row from `Not Implemented` or `Partially Implemented` to the observed status and point to the exact test/verifier evidence.

- [ ] **Step 5: Completion audit**

Before final response, check every acceptance criterion in `docs/specs/01_structured_content_and_selection_export.md` against code, tests, verifier output, and docs. Any missing criterion must be implemented or explicitly reported as blocked.

