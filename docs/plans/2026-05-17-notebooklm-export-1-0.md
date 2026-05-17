# NotebookLM Export 1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 browser extension that exports a fully loaded NotebookLM conversation to structured Markdown.

**Architecture:** Use a DOM-first content script with a strict adapter boundary. Shared core logic lives in a browser/global + CommonJS-compatible module so Node unit tests can cover rendering, formula parsing, lazy loading, and DOM extraction without extension packaging.

**Tech Stack:** Plain JavaScript, Manifest V3, Node built-in `node:test`, no external runtime dependencies.

---

## File Structure

- Create `package.json`: project metadata and scripts.
- Create `manifest.json`: MV3 extension entry.
- Create `src/extension/core.js`: shared renderer, formula parser, DOM adapter, lazy history loader.
- Create `src/extension/content-script.js`: NotebookLM page integration and download flow.
- Create `src/extension/popup.html`: popup UI.
- Create `src/extension/popup.css`: popup styles.
- Create `src/extension/popup.js`: popup messaging.
- Create `scripts/verify-extension.js`: static packaging verifier.
- Create `tests/helpers/fake-dom.js`: tiny fake DOM for unit tests.
- Create `tests/renderer.test.js`: Markdown renderer tests.
- Create `tests/formula.test.js`: formula parser tests.
- Create `tests/lazy-loader.test.js`: lazy history loader tests.
- Create `tests/dom-adapter.test.js`: NotebookLM DOM adapter tests.
- Modify `task_plan.md` and `progress.md`: keep phase status current.

## Task 1: Project Harness and Static Verification

**Files:**
- Create: `package.json`
- Create: `scripts/verify-extension.js`

- [x] **Step 1: Create project scripts**

Create `package.json` with:

```json
{
  "name": "notebooklm-export",
  "version": "1.0.0",
  "private": true,
  "description": "Browser extension for exporting NotebookLM conversations to Markdown.",
  "scripts": {
    "test": "node --test tests/*.test.js",
    "build": "node scripts/verify-extension.js"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [x] **Step 2: Create static verifier**

Create `scripts/verify-extension.js` that checks required extension files exist, parses `manifest.json` when present, verifies Manifest V3, verifies required content script files, and verifies popup files.

- [x] **Step 3: Run verifier before manifest exists**

Run: `npm run build`

Expected: FAIL with a clear missing `manifest.json` message.

## Task 2: Markdown Renderer TDD

**Files:**
- Create: `tests/renderer.test.js`
- Create: `src/extension/core.js`

- [x] **Step 1: Write failing renderer tests**

Tests must assert frontmatter, title heading, role headings, sources, warnings, table Markdown, list Markdown, code fence preservation, and deterministic output.

- [x] **Step 2: Run renderer tests**

Run: `node --test tests/renderer.test.js`

Expected: FAIL because `src/extension/core.js` does not exist or does not export `renderMarkdown`.

- [x] **Step 3: Implement minimal renderer**

Implement `renderMarkdown(exportData)`, YAML escaping, filename-independent deterministic output, and CommonJS export.

- [x] **Step 4: Re-run renderer tests**

Run: `node --test tests/renderer.test.js`

Expected: PASS.

## Task 3: Formula Parser TDD

**Files:**
- Create: `tests/formula.test.js`
- Modify: `src/extension/core.js`

- [x] **Step 1: Write failing formula tests**

Tests must cover inline LaTeX annotation, block/display LaTeX annotation, unsupported formula fallback, and warning emission.

- [x] **Step 2: Run formula tests**

Run: `node --test tests/formula.test.js`

Expected: FAIL because formula parser functions are missing.

- [x] **Step 3: Implement minimal formula parser**

Implement `extractFormulaMarkdown(element, warnings)` and supporting helpers. Prefer `annotation[encoding="application/x-tex"]`; fall back to visible text with `unsupported_formula` warning.

- [x] **Step 4: Re-run formula tests**

Run: `node --test tests/formula.test.js`

Expected: PASS.

## Task 4: DOM Adapter TDD

**Files:**
- Create: `tests/helpers/fake-dom.js`
- Create: `tests/dom-adapter.test.js`
- Modify: `src/extension/core.js`

- [x] **Step 1: Write failing fake DOM helper and adapter tests**

Tests must model NotebookLM-like structures using selectors from the saved sample: `chat-message-pair`, `from-user-message-card-content`, `to-user-message-card-content`, `message-text-content`, `citation-marker`, `single-source-container`, and `source-title`.

- [x] **Step 2: Run adapter tests**

Run: `node --test tests/dom-adapter.test.js`

Expected: FAIL because extraction functions are missing or incomplete.

- [x] **Step 3: Implement adapter**

Implement `extractNotebookData(document, options)` and DOM-to-Markdown conversion for paragraphs, lists, code, tables, citations, and formulas.

- [x] **Step 4: Re-run adapter tests**

Run: `node --test tests/dom-adapter.test.js`

Expected: PASS.

## Task 5: Lazy History Loader TDD

**Files:**
- Create: `tests/lazy-loader.test.js`
- Modify: `src/extension/core.js`

- [x] **Step 1: Write failing lazy loader tests**

Tests must cover `complete`, `timeout`, and `container_not_found`.

- [x] **Step 2: Run lazy loader tests**

Run: `node --test tests/lazy-loader.test.js`

Expected: FAIL because `loadFullHistory` is missing.

- [x] **Step 3: Implement loader**

Implement `loadFullHistory(document, options)` with injected `wait` for tests, stable-count checks, timeout, and container selector fallbacks.

- [x] **Step 4: Re-run lazy loader tests**

Run: `node --test tests/lazy-loader.test.js`

Expected: PASS.

## Task 6: Extension Shell

**Files:**
- Create: `manifest.json`
- Create: `src/extension/content-script.js`
- Create: `src/extension/popup.html`
- Create: `src/extension/popup.css`
- Create: `src/extension/popup.js`

- [x] **Step 1: Write extension shell files**

Create MV3 manifest with `core.js` loaded before `content-script.js`, popup action, and host match for NotebookLM. Create popup UI and content script orchestration.

- [x] **Step 2: Run static verifier**

Run: `npm run build`

Expected: PASS after required files exist and manifest is valid.

## Task 7: Full Verification and 1.0 Audit

**Files:**
- Modify: `task_plan.md`
- Modify: `progress.md`

- [x] **Step 1: Run all tests**

Run: `npm test`

Expected: PASS.

- [x] **Step 2: Run build verifier**

Run: `npm run build`

Expected: PASS.

- [x] **Step 3: Verify Git ignore**

Run: `git status --short --ignored`

Expected: `html_tset/` appears ignored and not as tracked/untracked content.

- [x] **Step 4: Completion audit**

Map every acceptance criterion from `docs/specs/00_notebooklm_export_1_0.md` to concrete file/test/build evidence. Any uncovered item must be fixed before claiming 1.0 complete.
