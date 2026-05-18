# NotebookLM Export 1.2 Status

## Current Objective

NotebookLM Export 1.2 fixes two user-reported issues:

- Scan is explicitly triggered by clicking the popup Scan button and no longer starts automatically when the popup opens.
- NotebookLM rich-text structural wrappers in the UAV saved page no longer flatten headings and tables into adjacent text.

## In Scope

- Add popup Scan button.
- Keep export disabled before a successful scan.
- Preserve existing all/checked export behavior after scan.
- Treat NotebookLM `labs-tailwind-*`, `element-list-renderer`, and `paragraph-element-view` wrappers as transparent block containers.
- Convert NotebookLM heading blocks expressed by `role="heading"`, `aria-level`, or `.headingN` to Markdown headings.
- Keep real `<table>` elements under NotebookLM wrappers as Markdown tables.

## Out of Scope

- PDF export.
- Full Gemini/Voyager formula-copy compatibility.
- Private NotebookLM API extraction.
- Live authenticated NotebookLM automation in the current Playwright context.

## Implementation Snapshot

- Popup manual scan: `src/extension/popup.html`, `src/extension/popup.js`, `src/extension/popup.css`.
- Static contract checks: `scripts/verify-extension.js`.
- Rich-text wrapper extraction: `src/extension/core.js`.
- Regression tests: `tests/dom-adapter.test.js`.
- Version metadata: `manifest.json` and `package.json` are `1.2.0`.

## Validation Snapshot

- `node --test tests/dom-adapter.test.js`: 5/5 tests passed.
- `npm test`: 22/22 tests passed.
- `npm run build`: extension verification passed.
- UAV saved HTML smoke:
  - `messageCount=6`
  - `sourceCount=4`
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
  - after Scan, popup rendered `Messages: 2`, `Sources: 1`, and `DOM: complete`
  - default mode remained `All`
  - selected mode disabled export until a message was checked
  - selected export sent `{ mode: "selected", selectedMessageIds: ["m2"] }`

## Known Boundaries

- Live authenticated NotebookLM popup/export still requires the user's logged-in browser session.
- The UAV smoke uses the saved HTML under ignored `html_tset/`.
