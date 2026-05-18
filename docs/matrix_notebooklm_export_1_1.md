# NotebookLM Export 1.1 Spec-to-Implementation Matrix

## Objective

Deliver structured Markdown preservation and selective export for NotebookLM Export 1.1. The current state is design-ready and not yet implemented; this matrix will be updated after implementation.

| Requirement ID | Original Intent | Current Status | Implementation Pointer | Verification Pointer | Notes |
|---|---|---|---|---|---|
| R1 | Preserve internal message line breaks in Markdown source | Not Implemented | Planned: `src/extension/core.js` block-aware DOM renderer | Planned: `tests/dom-adapter.test.js` line-break fixture | Fixes current `normalizeInline` collapse behavior |
| R2 | Preserve structured rich content as Markdown blocks and inline markup | Not Implemented | Planned: `src/extension/core.js` `elementToMarkdown` refactor | Planned: `tests/dom-adapter.test.js` headings, lists, code, links, emphasis | Extends 1.0 list/code/table coverage |
| R3 | Popup shows detected conversation message count | Not Implemented | Planned: `src/extension/content-script.js` scan response; `src/extension/popup.js` count rendering | Planned: `npm run build` verifier for popup IDs; manual popup inspection | Count comes from normalized extracted messages |
| R4 | Popup shows source count | Not Implemented | Planned: scan response and popup count rendering | Planned: verifier and smoke result | Sources remain all-detected for both export modes |
| R5 | Popup shows DOM/history load completeness | Not Implemented | Planned: `NOTEBOOKLM_SCAN_CONVERSATION` returns history status | Planned: status helper tests and build verifier | Must not claim complete unless loader returns `complete` |
| R6 | Export mode supports all and checked | Not Implemented | Planned: popup radio group and export options payload | Planned: popup verifier and `filterExportData` tests | `all` is default |
| R7 | Selected export filters checked messages only | Not Implemented | Planned: `filterExportData(exportData, options)` | Planned: `tests/renderer.test.js` or new selection tests | Preserves original order and IDs |
| R8 | Selected mode rejects empty selection | Not Implemented | Planned: popup validation and core filtering validation | Planned: selection tests | Blocking error, no empty export |
| R9 | Export blocks when history is incomplete | Partially Implemented | Existing: `src/extension/content-script.js` blocks export on non-`complete`; Planned: popup disables export after scan | Existing: `tests/lazy-loader.test.js`; Planned: status helper tests | 1.0 export path already blocks; 1.1 UI makes it visible before export |
| R10 | Render export metadata for export mode and selected count | Not Implemented | Planned: `renderMarkdown` frontmatter additions via filtered data metadata | Planned: renderer tests | Avoids ambiguity in selected exports |
| R11 | Content-script scan contract exists | Not Implemented | Planned: `NOTEBOOKLM_SCAN_CONVERSATION` handler | Planned: build verifier/static inspection and smoke | Popup must not parse NotebookLM DOM |
| R12 | Keep `html_tset/` ignored | Implemented | `.gitignore` | `git status --short --ignored` | Must remain true after 1.1 |
| R13 | PDF and Gemini/Voyager copy-format compatibility remain future work | Implemented in spec | `docs/specs/01_structured_content_and_selection_export.md` | Spec review | 1.1 must not claim full formula-copy compatibility |

