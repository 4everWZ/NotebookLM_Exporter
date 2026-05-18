# NotebookLM Export

Browser extension for exporting NotebookLM conversations to structured Markdown.

## 1.1 Scope

- Manifest V3 browser extension.
- Exports the current NotebookLM conversation to `.md`.
- Automatically attempts to load lazy conversation history before export.
- Shows detected message count, source count, and DOM/history completeness in the popup.
- Supports all-message export by default and checked-message export when selected.
- Preserves structured turns, internal message line breaks, sources, citations, paragraphs, headings, lists, code blocks, tables, links, emphasis, inline code, and basic formulas.
- Uses LaTeX annotations when available and records warnings when formula markup is unsupported.

PDF export and full Gemini/Voyager formula-copy compatibility are future work.

## Load the Extension

1. Open a Chromium-based browser.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select this project directory.
6. Open a NotebookLM notebook page.
7. Click the NotebookLM Export extension action.
8. Wait for the popup to scan the conversation and show `DOM: complete`.
9. Keep `All` selected or switch to `Checked` and choose messages.
10. Click Export Markdown.

## Verify Locally

```powershell
npm test
npm run build
git status --short --ignored
```

Expected:

- `npm test`: all tests pass.
- `npm run build`: `Extension verification passed.`
- `git status --short --ignored`: `html_tset/` appears ignored.

## Fixture Policy

Saved NotebookLM pages belong under `html_tset/`. That directory is ignored by Git and is used only as a local fixture source.

## Current Validation Boundary

The saved NotebookLM HTML fixture has been smoke-tested with Playwright by injecting `src/extension/core.js` and running extraction/rendering in the browser page. Live NotebookLM export requires an authenticated Google session and should be run manually after loading the extension.
