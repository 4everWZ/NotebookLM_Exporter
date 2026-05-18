# NotebookLM Export 1.2 Spec-to-Implementation Matrix

## Objective

Deliver NotebookLM Export 1.2: scan starts only after the user clicks Scan, and NotebookLM structural rich-text wrappers no longer flatten headings, tables, and adjacent blocks in Markdown exports.

| Requirement ID | Original Intent | Current Status | Implementation Pointer | Verification Pointer | Notes |
|---|---|---|---|---|---|
| R1 | Popup must not scan automatically when opened | Implemented | `src/extension/popup.js`; `src/extension/popup.html#scan-conversation` | `scripts/verify-extension.js` rejects `scanActiveTab();`; popup smoke before Scan had sent messages `[]` | Addresses user item 1 |
| R2 | User clicks Scan to trigger conversation scan | Implemented | `src/extension/popup.js` binds `#scan-conversation`; `src/extension/content-script.js` keeps `NOTEBOOKLM_SCAN_CONVERSATION` | `npm run build`; popup smoke after Scan sent `NOTEBOOKLM_SCAN_CONVERSATION` | Export remains disabled until successful scan |
| R3 | UAV NotebookLM rich table exports as a real Markdown table | Implemented | `src/extension/core.js` transparent wrapper block handling | `tests/dom-adapter.test.js` structural wrapper test; UAV saved HTML smoke | Fixes heading/table flattening shown in `html_tset/UAV-Embodied-Bench-2026-05-18-11-36-47.md` |
| R4 | NotebookLM wrapper headings become Markdown headings | Implemented | `src/extension/core.js` `getHeadingLevel` supports `.headingN`, real heading tags, and role headings outside user prompt suppression | `tests/dom-adapter.test.js`; UAV saved HTML smoke | Restores assistant headings while preventing user prompt wrappers from becoming headings |
| R5 | Version and docs reflect the behavior change | Implemented | `manifest.json`; `package.json`; `README.md`; `docs/specs/01_structured_content_and_selection_export.md` | Code/doc inspection; `npm run build` parses manifest | Version is `1.2.0` |
| R6 | `html_tset/` remains ignored | Implemented | `.gitignore` | `git status --short --ignored` | Samples stay out of Git |
| R7 | Popup long previews must not display full ultra-wide text | Implemented | `src/extension/popup.css`; `src/extension/popup.js`; `scripts/verify-extension.js` | `npm run build`; Playwright popup smoke | Uses fixed popup width, `minmax(0, 1fr)`, and `.message-preview` ellipsis |
| R8 | Export should include the NotebookLM starting summary | Implemented | `src/extension/core.js` extracts `.summary-content` / `.notebook-summary` and renders `## Notebook Summary` | `tests/dom-adapter.test.js`; `tests/renderer.test.js`; saved HTML smoke | Summary appears before `## Conversation` |
| R9 | User prompt content must not all become H3 headings | Implemented | `src/extension/core.js` disables NotebookLM heading role/class conversion when extracting user messages | `tests/dom-adapter.test.js`; saved HTML smoke | Assistant `.headingN` headings remain Markdown headings |
| R10 | Scan/export must only proceed after lazy history is complete | Implemented | `src/extension/content-script.js` gates scan/export through `loadAndExtractConversation`; `src/extension/core.js` `loadFullHistory`; `src/extension/popup.js` displays `historyMessageCount` | `tests/lazy-loader.test.js`; `tests/selection.test.js`; `scripts/verify-extension.js`; popup and saved HTML smokes; `README.md` scan completeness notes | Loader handles repeated lazy loads by scrolling to top until count/top stabilize and no loader is visible; export throws unless status is `complete`; popup shows loaded DOM count |
