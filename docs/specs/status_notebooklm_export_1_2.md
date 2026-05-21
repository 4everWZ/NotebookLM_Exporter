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
- Formula export now prefers Gemini/Voyager-style source fields, LaTeX annotations, and supported NotebookLM KaTeX visual-DOM inference before falling back to non-empty visible-text warnings.
- Formula Markdown now isolates display math delimiters on their own lines and spaces inline formulas away from surrounding prose for Typora-style renderers.
- Adjacent source citation markers and adjacent generated emphasis spans are separated so exports do not contain ambiguous `[4][5]` or `****` runs between independent inline tokens.
- PINN-style raw Markdown math embedded in ordinary paragraph text is repaired into Typora-friendly block math, malformed formula/citation boundaries are split so citations stay outside formulas, and compressed pipe-table text is recovered into Markdown table rows when the column pattern is clear.
- Citation overflow controls such as `more_horiz` are clicked with bounded retries after lazy history completion and before extraction; saved static pages that cannot expand still omit the non-numeric marker from Markdown.
- Structured table cells now use the Markdown/citation inline renderer instead of raw visible text, so real tables stay tables while citations inside cells render as `[n]`.
- Clearly compressed pseudocode step lines are split back into per-step Markdown lines, and visual `\leftarrow` formulas no longer get mis-normalized as `\le ftarrow`.

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
- Keep adjacent citation references visually separate in Markdown output.
- Keep generated emphasis delimiters parseable when adjacent bold/italic spans touch.
- Attempt bounded expansion of NotebookLM citation overflow controls such as `more_horiz`; omit non-numeric markers if the page cannot expand them.
- Repair compressed Markdown pipe tables only when a clear header/separator/body column pattern is present.
- Repair clearly compressed pseudocode step lines while leaving existing code fences and normal paragraphs unchanged.
- Normalize raw Markdown math text outside code fences, including `\mathbbm` to `\mathbb` and common Unicode math symbols to KaTeX-compatible commands.

## Out of Scope

- PDF export.
- Full Gemini/Voyager formula-copy UI and Word/MathML compatibility.
- Private NotebookLM API extraction.
- Live authenticated NotebookLM automation in the current Playwright context.

## Implementation Snapshot

- Popup manual scan and DOM loaded count display: `src/extension/popup.html`, `src/extension/popup.js`, `src/extension/popup.css`.
- Static contract checks: `scripts/verify-extension.js`.
- Rich-text wrapper extraction: `src/extension/core.js`.
- Summary extraction, user prompt heading handling, Markdown section rendering, and history counting: `src/extension/core.js`.
- Formula source extraction and supported KaTeX visual-DOM inference: `src/extension/core.js`.
- Typora-safe formula block boundaries, inline formula spacing, and unsupported visual inference fallback: `src/extension/core.js`.
- Adjacent citation and emphasis delimiter spacing, table-cell citation rendering, and bounded citation overflow expansion: `src/extension/core.js`.
- PINN/MC3WD artifact repair for raw display math, malformed formula citations, compressed pipe tables, compressed pseudocode lines, and `more_horiz` citation markers: `src/extension/core.js`.
- Regression tests: `tests/dom-adapter.test.js`, `tests/renderer.test.js`, `tests/lazy-loader.test.js`.
- Formula regression tests: `tests/formula.test.js`.
- Version metadata: `manifest.json` and `package.json` are `1.2.0`.

## Validation Snapshot

- `node --test tests/lazy-loader.test.js tests/dom-adapter.test.js tests/renderer.test.js`: targeted tests passed.
- `npm test`: full suite passed.
- `npm run build`: extension verification passed.
- Adjacent citation/emphasis regression tests:
  - adjacent source markers export as `[4] [5]`
  - adjacent bold spans export as `**a** **b**` instead of `**a****b**`
  - single-star italic, double-star bold, and triple-star bold-italic output remains parseable
- MC3WD adjacent inline Markdown smoke:
  - `adjacentCitationCount=0`
  - `starRunCount=0`
  - sample repeated source citations render with a single separating space, such as `[17] [18]`
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
- MC3WD formula saved HTML smoke:
  - `messageCount=28`
  - `formulaWarningCount=0`
  - `warningCount=0`
  - `unsafeDisplayLineCount=0`
  - `formulaCount=451`
  - KaTeX validation parsed `451/451` exported formulas with `errorCount=0`
  - local preview `html_tset/mc3wd-after-preview.html` had `displayMathCount=20`, `inlineMathCount=431`, and `errorsCount=0`
  - sample formulas included `$GB_i$`, `$$ p_k(GB_i)=\frac{...}{...} $$`, and `$$ H(GB_i)=-\sum_{k=1}^C... $$`
- PINN saved HTML smoke:
  - `messageCount=18`
  - `sourceCount=68`
  - `moreHorizCount=0`
  - compressed table line count `0`
  - `warningCount=0`
  - suspicious formula pattern count `0`
  - KaTeX validation parsed `274/274` exported formulas with `errorCount=0`
  - compressed pipe text under `统一优化表` exports as a standard Markdown table
  - malformed raw display math such as `IoU^{focaler}` is split into a standalone `$$` block, with citations rendered after the formula
- Three saved-page Playwright smoke after the latest artifact fixes:
  - MC3WD: `messages=28`, `sources=28`, `warningCount=0`, `exportMoreHorizCount=0`, `leFtarrowCount=0`, `longPseudocodeLineCount=0`, `collapsedAlgorithmHeaderCount=0`
  - UAV: `messages=6`, `sources=4`, `warningCount=0`, real DOM table exports as 8 Markdown table rows, first row renders citation cells such as `AirCopBench[1] [2]`, and `exportMoreHorizCount=0`
  - PINN: `messages=18`, `sources=68`, `warningCount=0`, `exportMoreHorizCount=0`, `compressedTableResidualCount=0`, `longPseudocodeLineCount=0`

## Known Boundaries

- Live authenticated NotebookLM popup/export still requires the user's logged-in browser session.
- The UAV smoke uses the saved HTML under ignored `html_tset/`.
- Saved static NotebookLM pages do not execute enough live app behavior to expand `more_horiz`; the exporter clicks the controls but can only verify expansion behavior in a live authenticated NotebookLM session.
- KaTeX visual-DOM inference is conservative and does not claim full original-source recovery for every possible KaTeX construct.
