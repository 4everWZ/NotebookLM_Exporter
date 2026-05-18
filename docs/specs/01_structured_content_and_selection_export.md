# NotebookLM Export 1.1 Structured Content and Selection Spec

## Purpose

Improve the Markdown export so a NotebookLM conversation is exported as structured Markdown rather than flattened visible text. Version 1.1 also makes the popup show conversation scan status, loaded-history completeness, message count, and an export mode control for all messages or checked messages. The default export mode is all messages.

This is a Tier B behavior change. It changes user-visible export output, popup behavior, and content-script message contracts, but it does not introduce private NotebookLM API usage or PDF export.

## Goals

- Preserve internal message line breaks and block structure in exported Markdown.
- Keep Markdown deterministic for the same normalized conversation model.
- Show the user how many conversation messages are currently detected.
- Show whether the lazy-loaded DOM history is confirmed complete.
- Let the user export all messages or only checked messages.
- Keep all as the default export mode.
- Keep NotebookLM selector details inside the DOM adapter and lazy loader.
- Keep `html_tset/` ignored and use it only as a local fixture/smoke-test source.

## Non-Goals

- PDF export.
- Full visual reproduction of NotebookLM formatting.
- Private NotebookLM network/API extraction.
- Full Gemini/Voyager formula-copy compatibility.
- Cross-device sync, saved presets, or persistent selection storage.
- Selecting sources independently from messages.

## Product Behavior

1. User opens a NotebookLM notebook tab.
2. User opens the extension popup.
3. Popup starts a scan of the active NotebookLM tab.
4. Content script loads lazy conversation history using the existing loader policy.
5. Content script extracts a normalized conversation model.
6. Popup shows:
   - detected message count,
   - source count,
   - DOM/history load status,
   - export mode control: all or selected,
   - a checklist of detected messages for selected export mode.
7. Export mode defaults to all.
8. If selected mode is chosen, the export button is disabled until at least one message is checked.
9. Export blocks when history completeness is not confirmed as `complete`.
10. Export all writes every normalized message.
11. Export selected writes only checked messages, preserving their original conversation order.

## UX Model

The popup remains compact and operational rather than becoming a landing page.

### Required Popup Fields

- Header: `NotebookLM Export`
- Status line:
  - `Checking active tab...`
  - `Loading conversation history...`
  - `History complete`
  - `History incomplete: <reason>`
  - `Export failed: <reason>`
- Count row:
  - `Messages: N`
  - `Sources: N`
- Load state row:
  - `DOM: complete`
  - `DOM: loading`
  - `DOM: timeout`
  - `DOM: container_not_found`
  - `DOM: no_messages`
  - `DOM: error`
- Export mode:
  - radio `All`
  - radio `Checked`
  - `All` selected by default
- Checklist:
  - visible for scan results,
  - enabled only when `Checked` mode is selected,
  - row label uses role and a short single-line preview,
  - row value stores normalized message id such as `m1`.
- Primary button:
  - `Export Markdown`,
  - disabled while scan/export is running,
  - disabled if active tab is not NotebookLM,
  - disabled if selected mode has zero checked messages,
  - disabled if history status is not `complete`.

### Selection Unit

The selection unit is one normalized message, not a question/answer pair. A message is either a user turn or an assistant turn. This matches the existing normalized data model and keeps selected export precise. Pair-level selection can be added later by grouping adjacent user/assistant messages in the popup without changing the underlying export model.

## Content Script Message Contract

Use explicit message types instead of overloading the current export command.

### `NOTEBOOKLM_SCAN_CONVERSATION`

Request:

```json
{
  "type": "NOTEBOOKLM_SCAN_CONVERSATION"
}
```

Successful response:

```json
{
  "ok": true,
  "status": "complete",
  "messageCount": 28,
  "sourceCount": 12,
  "warningCount": 3,
  "messages": [
    {
      "id": "m1",
      "role": "user",
      "preview": "What is the core method?"
    }
  ]
}
```

Failure response:

```json
{
  "ok": false,
  "status": "timeout",
  "messageCount": 14,
  "sourceCount": 12,
  "error": "Could not confirm complete conversation history (timeout)."
}
```

`status` values:

- `complete`
- `loading`
- `timeout`
- `container_not_found`
- `no_messages`
- `not_notebooklm`
- `error`

The scan may run the lazy loader. The popup should show a loading state while waiting for this response.

### `NOTEBOOKLM_EXPORT_MARKDOWN`

Request:

```json
{
  "type": "NOTEBOOKLM_EXPORT_MARKDOWN",
  "options": {
    "mode": "all",
    "selectedMessageIds": []
  }
}
```

Selected export request:

```json
{
  "type": "NOTEBOOKLM_EXPORT_MARKDOWN",
  "options": {
    "mode": "selected",
    "selectedMessageIds": ["m1", "m4"]
  }
}
```

Successful response:

```json
{
  "ok": true,
  "messageCount": 2,
  "sourceCount": 12,
  "warningCount": 3,
  "historyStatus": "complete",
  "exportMode": "selected"
}
```

Failure response:

```json
{
  "ok": false,
  "error": "Selected export requires at least one checked message."
}
```

## Normalized Data Model Changes

Keep the 1.0 model and add export-selection metadata during rendering or before rendering.

```js
{
  metadata: {
    title: "Notebook title",
    url: "https://notebooklm.google.com/...",
    exportedAt: "2026-05-18T...",
    historyLoadStatus: "complete",
    messageCount: 28,
    sourceCount: 12,
    exportMode: "all",
    selectedMessageCount: 28
  },
  sources: [
    { id: "s1", title: "Source title" }
  ],
  messages: [
    {
      id: "m1",
      role: "user",
      markdown: "Preserved Markdown body",
      preview: "Preserved Markdown body",
      citations: []
    }
  ],
  warnings: []
}
```

Rules:

- Message IDs remain sequential and deterministic after extraction.
- Filtering does not renumber messages.
- Selected export preserves original message order.
- `messageCount` in exported frontmatter reflects messages actually exported.
- `selectedMessageCount` is included for selected exports and equals exported message count.
- Sources are not filtered in 1.1; all detected sources remain in the Sources section so citation references have context.

## Structured Markdown Extraction Rules

The DOM adapter must stop using one global whitespace-collapse path for message bodies. Extraction should be block-aware.

### Block Rules

- Paragraph-like nodes become paragraph blocks separated by one blank line.
- Consecutive text separated by `<br>` keeps line breaks inside the same paragraph.
- Multiple paragraphs inside one NotebookLM message remain separate paragraphs.
- `div`, `section`, `mat-card-content`, and unknown containers are treated as block containers when they contain block children.
- `ul` and `ol` become Markdown lists.
- Nested lists should keep indentation when the source DOM expresses nesting.
- `pre` becomes a fenced code block and preserves internal newlines exactly after trimming only surrounding blank lines.
- `table` becomes a Markdown table when rows and cells are parseable.
- Headings `h1` through `h6` become Markdown headings with matching levels.
- Empty blocks are ignored.

### Inline Rules

- Inline text normalizes runs of spaces and tabs, but does not erase explicit `<br>` line breaks.
- `strong` and `b` become `**text**`.
- `em` and `i` become `*text*`.
- `code` outside `pre` becomes inline code.
- `a[href]` becomes `[text](href)` when both text and href are available; otherwise text is preserved.
- Citation markers keep the existing bracket form, such as `[1]`.
- Inline formulas keep `$...$` when LaTeX annotation is available.
- Unsupported inline rich nodes fall back to their recursively extracted text and add a warning only when content would otherwise be ambiguous or lost.

### Newline Policy

- Source Markdown must include internal message newlines.
- Paragraph boundaries use a blank line.
- Explicit line breaks within a paragraph use a single newline in the Markdown source.
- Code blocks preserve internal newlines exactly.
- Renderer must not run a final global replacement that collapses message-body newlines.

## Formula Handling

1.1 keeps the 1.0 formula behavior:

- prefer `annotation[encoding="application/x-tex"]`,
- render display formulas as `$$ ... $$`,
- render inline formulas as `$...$`,
- preserve visible text and warning on unsupported markup.

The structured extraction change must not collapse formula blocks into adjacent prose. Deeper Gemini/Voyager copy-format parsing remains future work until concrete copy-format samples are added.

## Error Handling

Blocking errors:

- active tab is not NotebookLM,
- content script cannot find a conversation container,
- history loader returns anything other than `complete`,
- no messages are found,
- selected mode has zero checked messages,
- selected message IDs do not match any extracted message.

Non-blocking warnings:

- unsupported formula fallback,
- unsupported rich content flattened to text,
- table fallback to plain text,
- missing source title.

## Architecture Changes

### `src/extension/core.js`

Add or expose these responsibilities:

- block-aware DOM-to-Markdown conversion,
- `createMessagePreview(markdown)`,
- `createConversationStatus(exportData, history)`,
- `filterExportData(exportData, options)`.

`filterExportData` owns all/selected behavior so content-script and tests do not duplicate filtering logic.

### `src/extension/content-script.js`

Add:

- `NOTEBOOKLM_SCAN_CONVERSATION`,
- scan orchestration that loads history and extracts data,
- export orchestration that accepts options and filters messages,
- shared helper to avoid scan/export drift.

The content script may rescan during export instead of trusting stale popup data. Stale selected IDs are handled by `filterExportData`.

### `src/extension/popup.*`

Add:

- scan on popup load,
- status/count/load-state fields,
- all/checked radio group,
- message checklist,
- export button validation.

The popup does not parse NotebookLM DOM. It only consumes content-script scan responses.

## Verification Requirements

### Unit Tests

- DOM adapter preserves:
  - paragraph boundaries,
  - `<br>` internal line breaks,
  - code block internal newlines,
  - headings,
  - inline bold/italic/link/code,
  - list structure.
- Renderer/frontmatter includes:
  - `export_mode`,
  - selected export count when applicable.
- `filterExportData`:
  - keeps all messages in all mode,
  - keeps checked messages in selected mode,
  - preserves original order,
  - errors when selected mode is empty,
  - errors when selected IDs do not match messages.
- Status creation:
  - reports complete message/source counts,
  - reports incomplete history status without claiming completeness.
- Popup contract:
  - static verifier checks required popup element IDs,
  - no production code relies on missing IDs.

### Local Verification Commands

```powershell
npm test
npm run build
git status --short --ignored
```

### Smoke Verification

Use the saved NotebookLM HTML under ignored `html_tset/`:

- inject `src/extension/core.js`,
- run lazy-load/extract/render path where practical,
- confirm extracted message count is non-zero,
- confirm at least one exported message body contains preserved internal Markdown newlines when fixture content includes them.

Live authenticated NotebookLM export remains a manual verification path because current automated Playwright context does not have a NotebookLM login session.

## Acceptance Criteria

- Popup shows detected message count and source count after scan.
- Popup shows DOM/history load completeness status.
- Popup defaults to all export mode.
- Popup supports checked-message export mode.
- Export selected mode exports only checked messages in original order.
- Export all mode exports all messages.
- Export blocks visibly when history completeness is not confirmed.
- Message internal line breaks are preserved in Markdown source.
- Paragraphs, lists, code blocks, tables, headings, and basic inline rich text are exported as Markdown blocks/inline markup rather than flattened text.
- `npm test` passes.
- `npm run build` passes.
- `html_tset/` remains ignored by Git.

## Design Alternatives Considered

### Recommended: Scan-Then-Export Through Content Script

The popup asks the content script to scan, displays scan results, then sends export options. Export rescans to avoid stale DOM assumptions. This is slightly more work but keeps popup simple and avoids private NotebookLM APIs.

### Alternative: Export UI Injected Into NotebookLM Page

An in-page panel could have more space for long checklists. It would also be more invasive, more likely to conflict with NotebookLM CSS, and harder to keep visually restrained. This is not chosen for 1.1.

### Alternative: Only Add Partial Export Without Checklist

The popup could provide only all/current-visible export. This would not satisfy the requirement to choose all or checked messages and would keep the lazy-load completeness ambiguity hidden. This is not chosen.

