# NotebookLM Export 1.2 Status

## Current Objective

NotebookLM Export 1.2 fixes user-reported export and popup issues:

- Scan is explicitly triggered by clicking the popup Scan button and no longer starts automatically when the popup opens.
- NotebookLM rich-text structural wrappers in the UAV saved page no longer flatten headings and tables into adjacent text.
- Popup message previews truncate long text with ellipsis instead of widening or overlapping the popup.
- NotebookLM starting summary content is included before the conversation in Markdown exports.
- User prompt wrappers that NotebookLM marks with heading roles or heading classes remain plain user message text.
- Lazy-load history counts prefer `.individual-message` nodes when present so DOM history count tracks exported message count rather than chat-pair count.
- Popup DOM status displays the loaded DOM message count from scan results.

## In Scope

- Add popup Scan button.
- Keep export disabled before a successful scan.
- Preserve existing all/checked export behavior after scan.
- Treat NotebookLM `labs-tailwind-*`, `element-list-renderer`, and `paragraph-element-view` wrappers as transparent block containers.
- Convert NotebookLM heading blocks expressed by `role="heading"`, `aria-level`, or `.headingN` to Markdown headings.
- Keep real `<table>` elements under NotebookLM wrappers as Markdown tables.
- Extract `.summary-content` / `.notebook-summary` into a `## Notebook Summary` section before `## Conversation`.
- Disable NotebookLM heading role/class conversion for user prompts while preserving assistant headings.
- Keep scan/export gated on `complete` lazy-load status.
- Show `DOM: complete, loaded: N` in the popup when scan returns a loaded DOM message count.

## Out of Scope

- PDF export.
- Full Gemini/Voyager formula-copy compatibility.
- Private NotebookLM API extraction.
- Live authenticated NotebookLM automation in the current Playwright context.

## Implementation Snapshot

- Popup manual scan and DOM loaded count display: `src/extension/popup.html`, `src/extension/popup.js`, `src/extension/popup.css`.
- Static contract checks: `scripts/verify-extension.js`.
- Rich-text wrapper extraction: `src/extension/core.js`.
- Summary extraction, user prompt heading handling, Markdown section rendering, and history counting: `src/extension/core.js`.
- Regression tests: `tests/dom-adapter.test.js`, `tests/renderer.test.js`, `tests/lazy-loader.test.js`.
- Version metadata: `manifest.json` and `package.json` are `1.2.0`.

## Validation Snapshot

- `node --test tests/lazy-loader.test.js tests/dom-adapter.test.js tests/renderer.test.js`: targeted tests passed.
- `npm test`: full suite passed.
- `npm run build`: extension verification passed.
- UAV saved HTML smoke:
  - `messageCount=6`
  - `historyMessageCount=6`
  - `sourceCount=4`
  - `hasSummary=true`
  - `firstUserStartsHeading=false`
  - `warningCount=0`
  - `hasHeadingBeforeTable=true`
  - `hasMarkdownTable=true`
  - `noFlattenedHeadingPipe=true`
  - `containsSecondHeading=true`
- Popup manual-scan smoke:
  - before clicking Scan, sent messages were `[]`
  - before clicking Scan, status was `Click Scan to inspect the active NotebookLM tab.`
  - before clicking Scan, export was disabled and Scan was enabled
  - after clicking Scan, sent messages contained `NOTEBOOKLM_SCAN_CONVERSATION`
  - after Scan, popup rendered `Messages: 2`, `Sources: 1`, and `DOM: complete, loaded: 2`
  - default mode remained `All`
  - selected mode disabled export until a message was checked
  - selected export sent `{ mode: "selected", selectedMessageIds: ["m2"] }`

## Known Boundaries

- Live authenticated NotebookLM popup/export still requires the user's logged-in browser session.
- The UAV smoke uses the saved HTML under ignored `html_tset/`.
