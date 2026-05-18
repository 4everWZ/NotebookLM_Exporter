# NotebookLM Export 1.1 Spec-to-Implementation Matrix

## Objective

Deliver structured Markdown preservation and selective export for NotebookLM Export 1.1.

| Requirement ID | Original Intent | Current Status | Implementation Pointer | Verification Pointer | Notes |
|---|---|---|---|---|---|
| R1 | Preserve internal message line breaks in Markdown source | Implemented | `src/extension/core.js` `normalizeInline`, `elementToMarkdown`, `renderMarkdown` | `tests/dom-adapter.test.js`; `tests/renderer.test.js`; saved HTML smoke | Fixes current `normalizeInline` collapse behavior and renderer-level newline collapse |
| R2 | Preserve structured rich content as Markdown blocks and inline markup | Implemented | `src/extension/core.js` block-aware DOM renderer | `tests/dom-adapter.test.js` headings, emphasis, links, code, nested lists | Extends 1.0 list/code/table coverage |
| R3 | Popup shows detected conversation message count | Implemented | `src/extension/content-script.js` scan response; `src/extension/popup.js` `setCounts`; `src/extension/popup.html#message-count` | `npm run build` verifies popup ID; `tests/selection.test.js`; popup smoke rendered `Messages: 2` | Count comes from normalized extracted messages |
| R4 | Popup shows source count | Implemented | `src/extension/content-script.js`; `src/extension/popup.js`; `src/extension/popup.html#source-count` | `npm run build`; `tests/selection.test.js`; saved HTML smoke `sourceCount=28`; popup smoke rendered `Sources: 1` | Sources remain all-detected for both export modes |
| R5 | Popup shows DOM/history load completeness | Implemented | `src/extension/content-script.js` `NOTEBOOKLM_SCAN_CONVERSATION`; `src/extension/popup.js` `setHistoryStatus` | `tests/selection.test.js`; `npm run build`; popup smoke rendered `DOM: complete` | Must not claim complete unless loader returns `complete` |
| R6 | Export mode supports all and checked | Implemented | `src/extension/popup.html` radio group; `src/extension/popup.js` export options payload | `npm run build`; `tests/selection.test.js`; popup smoke verified default `All` and selected mode | `all` is default via checked radio |
| R7 | Selected export filters checked messages only | Implemented | `src/extension/core.js` `filterExportData`; `src/extension/content-script.js` export options | `tests/selection.test.js` | Preserves original order and IDs |
| R8 | Selected mode rejects empty selection | Implemented | `src/extension/core.js` `filterExportData`; `src/extension/popup.js` `canExport` | `tests/selection.test.js`; popup smoke verified selected/empty disabled state | Blocking error, no empty export |
| R9 | Export blocks when history is incomplete | Implemented | `src/extension/content-script.js` checks `createConversationStatus`; `src/extension/popup.js` disables export when scan is not ok | `tests/lazy-loader.test.js`; `tests/selection.test.js`; `npm run build` | 1.1 UI makes incomplete status visible before export |
| R10 | Render export metadata for export mode and selected count | Implemented | `src/extension/core.js` `renderMarkdown` frontmatter fields | `tests/renderer.test.js`; saved HTML smoke | Avoids ambiguity in selected exports |
| R11 | Content-script scan contract exists | Implemented | `src/extension/content-script.js` `NOTEBOOKLM_SCAN_CONVERSATION` handler | `npm run build` verifies message constant | Popup does not parse NotebookLM DOM |
| R12 | Keep `html_tset/` ignored | Implemented | `.gitignore` | `git status --short --ignored` | Must remain true after 1.1 |
| R13 | PDF and Gemini/Voyager copy-format compatibility remain future work | Implemented in spec | `docs/specs/01_structured_content_and_selection_export.md` | Spec review | 1.1 must not claim full formula-copy compatibility |
| R14 | Extension/package version reflects 1.1 | Implemented | `manifest.json`; `package.json` | `npm run build` parses manifest; code inspection | Keeps release metadata aligned with docs |
