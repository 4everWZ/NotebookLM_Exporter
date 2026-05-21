# NotebookLM Export

Browser extension for exporting NotebookLM conversations to structured Markdown.

## 1.2 Scope

- Manifest V3 browser extension.
- Exports the current NotebookLM conversation to `.md`.
- Includes the NotebookLM starting summary when the page exposes `.summary-content` / `.notebook-summary`.
- Automatically attempts to load lazy conversation history before export.
- Shows detected message count, source count, DOM/history completeness, and loaded DOM message count in the popup after the user clicks Scan.
- Supports all-message export by default and checked-message export when selected.
- Preserves structured turns, internal message line breaks, sources, citations, paragraphs, headings, lists, code blocks, tables, links, emphasis, inline code, and formulas.
- Keeps user prompt text as message body text even when NotebookLM marks the prompt wrapper with heading roles or heading classes.
- Uses Gemini/Voyager-style formula source fields, LaTeX annotations, and conservative NotebookLM KaTeX visual-DOM inference before falling back to visible text warnings.
- Emits Typora-friendly Markdown math: display formulas are isolated on their own `$$` lines, and inline formulas are spaced away from surrounding prose.
- Repairs common saved-page artifacts: citation overflow controls such as `more_horiz` are clicked with bounded retries before extraction and omitted only if the page cannot expand them, raw `$$...$$` math embedded in paragraph text is split into Markdown block math, clearly compressed pipe-table text is recovered into Markdown table rows, and clearly compressed pseudocode step lines are split back into readable lines.

PDF export and full Gemini/Voyager formula-copy UI/MathML format compatibility are future work.

## Load the Extension

1. Open a Chromium-based browser.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select this project directory.
6. Open a NotebookLM notebook page.
7. Click the NotebookLM Export extension action.
8. Click Scan and wait for the popup to show `DOM: complete`.
9. Keep `All` selected or switch to `Checked` and choose messages.
10. Click Export Markdown.

## Scan Completeness

Scan and export both run the same lazy-load gate before extracting Markdown:

- The content script scrolls the chat panel to the top repeatedly.
- It waits for the loaded message count and top scroll position to stay stable across multiple checks.
- It refuses `complete` while NotebookLM loading indicators are visible.
- After history is complete, it attempts bounded expansion of NotebookLM citation overflow controls before extracting Markdown.
- It counts `.individual-message` nodes when NotebookLM exposes them, falling back to `.chat-message-pair` / `chat-message` for older DOM shapes, and the popup shows that loaded DOM count.
- Export throws instead of downloading if the scan status is not `complete`.

The saved NotebookLM fixtures checked so far do not expose a separate visible total-message counter; completeness is inferred from DOM stabilization plus loading-state absence.

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
