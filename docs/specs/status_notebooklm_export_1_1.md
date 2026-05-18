# NotebookLM Export 1.1 Status

## Current Objective

NotebookLM Export 1.1 preserves structured Markdown content inside NotebookLM conversation messages and adds popup scan status, message/source counts, and all/checked Markdown export.

## In Scope

- Preserve message-internal line breaks.
- Preserve paragraph boundaries, headings, lists, code blocks, tables, and basic inline rich text.
- Keep formula handling at the existing 1.0 basic LaTeX/fallback level.
- Add content-script scan contract for popup status.
- Add popup message count, source count, DOM/history completeness status, all/checked mode, and message checklist.
- Default export mode to all messages.
- Support selected-message export without renumbering message IDs.

## Out of Scope

- PDF export.
- Full Gemini/Voyager formula-copy compatibility.
- Private NotebookLM API extraction.
- Source-level selection.
- Live authenticated NotebookLM automation in the current Playwright context.

## Implementation Snapshot

- Structured extraction: `src/extension/core.js`.
- Selection/status helpers: `src/extension/core.js`.
- Scan/export content-script contract: `src/extension/content-script.js`.
- Popup UI and behavior: `src/extension/popup.html`, `src/extension/popup.css`, `src/extension/popup.js`.
- Static contract verification: `scripts/verify-extension.js`.
- Tests: `tests/dom-adapter.test.js`, `tests/renderer.test.js`, `tests/selection.test.js`.
- Version metadata: `manifest.json` and `package.json` are `1.1.0`.

## Validation Snapshot

- `npm test`: 21/21 tests passed.
- `npm run build`: extension verification passed.
- Saved NotebookLM HTML smoke via local HTTP server:
  - `messageCount=28`
  - `sourceCount=28`
  - `warningCount=271`
  - `hasFrontmatter=true`
  - `hasExportMode=true`
  - `hasSelectedCount=true`
  - first structured message with internal newline: `m2`
  - `markdownLength=38213`
- Popup smoke via local HTTP server with stubbed `chrome.tabs`:
  - scan rendered `Messages: 2`
  - scan rendered `Sources: 1`
  - scan rendered `DOM: complete`
  - default mode was `All`
  - checklist was disabled in all mode
  - selected mode disabled export until a message was checked
  - selected export sent `{ mode: "selected", selectedMessageIds: ["m2"] }`
- `html_tset/` remains ignored by Git.

## Known Boundaries

- Live authenticated NotebookLM popup export was not automated because the available browser context does not have a NotebookLM login session.
- The popup behavior is verified by static contract checks, core/content-script unit boundaries, and a stubbed popup smoke. A live extension runtime click in an authenticated NotebookLM tab still requires the user's browser session.
- Formula warnings remain intentionally visible for unsupported formula/rich markup. Deeper Gemini/Voyager copy-format parsing is future work.

## Next Steps

- Load the unpacked extension in an authenticated Chromium browser and run one live NotebookLM export.
- Collect concrete Gemini/Voyager formula-copy samples before designing the next formula compatibility layer.
- Start a separate spec for PDF export when Markdown 1.1 is accepted.
