# NotebookLM Export 1.0 Status

## Current Objective

NotebookLM Export 1.0 implements a Manifest V3 browser extension that exports a NotebookLM conversation to structured Markdown.

## In Scope

- DOM-first browser extension.
- Automatic lazy-history loading before export.
- Structured Markdown output.
- Source and citation extraction.
- Basic LaTeX formula extraction with warning fallback.
- Local tests and build verification.

## Out of Scope

- PDF export.
- Private NotebookLM API extraction.
- Full Gemini/Voyager formula-copy compatibility.
- Live authenticated NotebookLM session verification for this iteration.

## Implementation Snapshot

- Extension shell: `manifest.json`, `src/extension/popup.html`, `src/extension/popup.css`, `src/extension/popup.js`, `src/extension/content-script.js`.
- Core logic: `src/extension/core.js`.
- Static verifier: `scripts/verify-extension.js`.
- Tests: `tests/renderer.test.js`, `tests/formula.test.js`, `tests/lazy-loader.test.js`, `tests/dom-adapter.test.js`, `tests/helpers/fake-dom.js`.
- Spec: `docs/specs/00_notebooklm_export_1_0.md`.
- Completion matrix: `docs/matrix_notebooklm_export_1_0.md`.

## Validation Snapshot

- `npm test`: 10/10 tests passed.
- `npm run build`: extension verification passed.
- Chrome/Edge headless unpacked load: blocked by local GPU process failures; baseline Chrome headless without extension fails the same way.
- Saved NotebookLM HTML browser smoke: extracted 28 messages and 28 sources, generated frontmatter, conversation, sources, and Markdown content.
- `html_tset/` is ignored by Git.
- Live NotebookLM URL smoke: blocked by Google sign-in in the current Playwright browser context.

## Known Boundaries

- The content-script path is verified statically and through core smoke on saved HTML, but not by clicking the popup in a live authenticated NotebookLM tab because the available browser context has no NotebookLM login session.
- Chromium CLI unpacked-extension runtime loading is not counted as verified because local headless Chrome/Edge fails even without loading the extension.
- Formula fallback warnings are intentionally visible in exports; high warning counts on math-heavy pages indicate preserved unsupported formula markup rather than silent loss.

## Next Steps

- Run a live authenticated NotebookLM export manually after loading the unpacked extension.
- Start a 1.1 spec for PDF export or Gemini/Voyager formula-copy compatibility when samples are available.
