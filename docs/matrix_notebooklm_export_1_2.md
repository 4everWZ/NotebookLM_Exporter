# NotebookLM Export 1.2 Spec-to-Implementation Matrix

## Objective

Deliver NotebookLM Export 1.2: scan starts only after the user clicks Scan, and NotebookLM structural rich-text wrappers no longer flatten headings, tables, and adjacent blocks in Markdown exports.

| Requirement ID | Original Intent | Current Status | Implementation Pointer | Verification Pointer | Notes |
|---|---|---|---|---|---|
| R1 | Popup must not scan automatically when opened | Implemented | `src/extension/popup.js`; `src/extension/popup.html#scan-conversation` | `scripts/verify-extension.js` rejects `scanActiveTab();`; popup smoke before Scan had sent messages `[]` | Addresses user item 1 |
| R2 | User clicks Scan to trigger conversation scan | Implemented | `src/extension/popup.js` binds `#scan-conversation`; `src/extension/content-script.js` keeps `NOTEBOOKLM_SCAN_CONVERSATION` | `npm run build`; popup smoke after Scan sent `NOTEBOOKLM_SCAN_CONVERSATION` | Export remains disabled until successful scan |
| R3 | UAV NotebookLM rich table exports as a real Markdown table | Implemented | `src/extension/core.js` transparent wrapper block handling | `tests/dom-adapter.test.js` structural wrapper test; UAV saved HTML smoke | Fixes heading/table flattening shown in `html_tset/UAV-Embodied-Bench-2026-05-18-11-36-47.md` |
| R4 | NotebookLM wrapper headings become Markdown headings | Implemented | `src/extension/core.js` `getHeadingLevel` supports `role="heading"`, `aria-level`, `.headingN` | `tests/dom-adapter.test.js`; UAV saved HTML smoke | Restores `### 一、...` and `### 二、...` boundaries |
| R5 | Version and docs reflect the behavior change | Implemented | `manifest.json`; `package.json`; `README.md`; `docs/specs/01_structured_content_and_selection_export.md` | Code/doc inspection; `npm run build` parses manifest | Version is `1.2.0` |
| R6 | `html_tset/` remains ignored | Implemented | `.gitignore` | `git status --short --ignored` | Samples stay out of Git |
