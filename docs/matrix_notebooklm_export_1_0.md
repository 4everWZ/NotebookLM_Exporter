# NotebookLM Export 1.0 Completion Matrix

## Objective

Deliver NotebookLM Export 1.0: a browser extension that exports NotebookLM conversation history to structured Markdown, with automatic lazy-history loading, source/citation extraction, basic LaTeX formula handling, and verification evidence.

## Prompt-to-Artifact Checklist

| Requirement | Evidence | Verification |
|---|---|---|
| Browser extension product shape | `manifest.json`, `src/extension/popup.html`, `src/extension/content-script.js` | `npm run build` verifies MV3 manifest, popup, content scripts, and required files |
| First version exports Markdown | `src/extension/core.js` `renderMarkdown`; `src/extension/content-script.js` download flow | `tests/renderer.test.js`; saved HTML browser smoke produced Markdown length 37760 |
| Structured archive scope: title, roles, order, sources, citations, lists, code, tables, frontmatter | `src/extension/core.js`; `tests/dom-adapter.test.js`; `tests/renderer.test.js` | `npm test` 10/10 pass; saved HTML smoke extracted 28 messages and 28 sources |
| NotebookLM conversation history is lazy-loaded | `loadFullHistory` in `src/extension/core.js` | `tests/lazy-loader.test.js` covers completion, timeout, missing container, and loading indicator |
| Automatic history loading before export | `src/extension/content-script.js` calls `loadFullHistory` before `extractNotebookData` | `npm run build`; content-script code inspection |
| Do not silently export incomplete history | `src/extension/content-script.js` throws on non-`complete` history status | `tests/lazy-loader.test.js`; build verifier |
| Basic LaTeX formula parsing | `extractFormulaMarkdown` in `src/extension/core.js` | `tests/formula.test.js` covers inline, block, and fallback warning |
| Formula failures preserve visible text and warn | `extractFormulaMarkdown`; Markdown warnings rendering | `tests/formula.test.js`; `tests/renderer.test.js` |
| Gemini/Voyager copy format is future work, not a 1.0 blocker | `docs/specs/00_notebooklm_export_1_0.md` Future Work | Spec scope review |
| PDF export is future work | `docs/specs/00_notebooklm_export_1_0.md` Out of Scope/Future Work | Spec scope review |
| Use user-provided saved NotebookLM HTML as fixture source | `html_tset/` ignored; Playwright smoke opened saved HTML | `git status --short --ignored`; saved HTML smoke result |
| Do not track `html_tset/` in Git | `.gitignore` | `git status --short --ignored` shows `!! html_tset/` |
| Avoid private NotebookLM network/API dependency | implementation uses DOM selectors and browser page APIs only | `rg -n "fetch\\(|XMLHttpRequest|chrome\\.downloads|notebooklm\\.google\\.com/_|/_/" src scripts manifest.json package.json` returned no matches |
| Spec exists before implementation | `docs/specs/00_notebooklm_export_1_0.md` | Spec completeness scan returned no matches |
| Implementation plan exists | `docs/plans/2026-05-17-notebooklm-export-1-0.md` | Task checklist updated through implementation |

## Verification Evidence

### Unit Tests

Command:

```powershell
npm test
```

Observed result:

- 10 tests passed
- 0 failed
- Covers renderer, formula parser, lazy loader, and DOM adapter

### Static Extension Build Verification

Command:

```powershell
npm run build
```

Observed result:

- `Extension verification passed.`
- Verifies MV3 manifest, `activeTab`, content scripts, popup files, and required extension files.

### Chromium CLI Boundary

Command:

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --headless=new --disable-gpu --no-first-run --no-default-browser-check --user-data-dir="<workspace temp profile>" --disable-extensions-except="<workspace>" --load-extension="<workspace>" --dump-dom about:blank
```

Observed result:

- Chrome/Edge headless extension-load attempts failed in this environment with GPU process failures.
- A baseline Chrome headless command without `--load-extension` also failed with the same GPU process failure, so this is an environment boundary rather than evidence of manifest invalidity.
- Static manifest verification remains the extension packaging evidence for this environment.

### Saved NotebookLM HTML Browser Smoke

Tool path:

- Opened `html_tset/MC3WD–SEGBC_ Manifold Collision 3WD Semantic-Entropy GBC - NotebookLM.html` in Playwright via `file://`.
- Injected `src/extension/core.js`.
- Ran `extractNotebookData()` and `renderMarkdown()` in the browser page.

Observed result:

- title: `MC3WD–SEGBC: Manifold Collision 3WD Semantic-Entropy GBC`
- messageCount: 28
- sourceCount: 28
- warningCount: 271
- hasConversationSection: true
- hasSourcesSection: true
- hasFrontmatter: true
- markdownLength: 37760
- firstMessageRole: `user`
- lastMessageRole: `assistant`
- hasSyntheticSourceFallback: false

The high warning count is expected for unsupported formula/rich markup fallback behavior in 1.0; warnings preserve visible text rather than dropping content.

## Residual Boundaries

- Live authenticated NotebookLM export was attempted but not completed because Playwright was redirected to Google sign-in. The local fixture was the agreed page sample source for this iteration, and saved-page extraction smoke passed.
- Chromium CLI unpacked-extension runtime loading could not be verified because the local Chrome/Edge headless baseline fails before extension-specific behavior can be assessed.
- PDF export and full Gemini/Voyager formula-copy compatibility are out of scope for 1.0 and documented as future work.
