# NotebookLM Export 1.0 Spec

## Purpose

Build a browser extension that exports a NotebookLM notebook conversation to Markdown. Version 1.0 focuses on structured Markdown export from the current NotebookLM page. PDF export and deeper Gemini/Voyager formula-copy compatibility are future extensions.

## Scope

### In Scope for 1.0

- Chrome-compatible Manifest V3 browser extension.
- Runs on `https://notebooklm.google.com/*`.
- User starts export from the extension popup/action while a NotebookLM notebook page is open.
- Automatically loads the full lazy-loaded conversation history before extraction.
- Extracts notebook title, page URL, sources, conversation order, user messages, NotebookLM responses, citations, lists, code blocks, tables, and basic formulas.
- Produces a `.md` file download.
- Includes basic Markdown frontmatter.
- Uses the saved NotebookLM page under `html_tset/` only as a local development fixture source; the directory is ignored by Git.

### Out of Scope for 1.0

- PDF export.
- Direct use of private NotebookLM network/API endpoints as the primary extraction path.
- Full fidelity visual reproduction of NotebookLM UI.
- Full compatibility with every Gemini/Voyager formula copy format.
- Tracking or committing files under `html_tset/`.

## Product Behavior

1. User opens a NotebookLM notebook page.
2. User clicks the extension action.
3. Popup shows an export button.
4. Export starts in the NotebookLM tab.
5. The content script shows lightweight in-page progress:
   - loading conversation history
   - extracting conversation
   - rendering Markdown
   - downloading file
6. The extension repeatedly scrolls the chat history container upward and waits for additional messages until the loaded message count and scroll position are stable.
7. If full history loading reaches a timeout or cannot find the conversation container, the extension must not silently claim a complete export. It should show a clear error and avoid producing an unmarked partial export.
8. Formula parsing failures must not block the whole export. The original visible formula text is preserved and a warning is recorded in the Markdown.

## Architecture

The implementation uses a DOM-first browser extension with a strict adapter boundary.

### Components

- `manifest.json`
  - Defines Manifest V3 extension metadata, content script, popup, and host permissions.
- `popup.html`, `popup.js`, `popup.css`
  - Provides a small trigger UI and status output.
- `content-script.js`
  - Runs in NotebookLM pages.
  - Receives export commands from popup.
  - Coordinates lazy history loading, extraction, Markdown rendering, and file download.
- `core.js`
  - Shared extraction and rendering logic.
  - Exposes functions through a browser global for content-script usage and CommonJS exports for Node tests.
- `NotebookLmDomAdapter`
  - Owns NotebookLM DOM selectors and fallback selectors.
  - Converts page DOM into the normalized conversation model.
- `LazyHistoryLoader`
  - Owns scroll/wait/stability logic for lazy-loaded conversation history.
- `MarkdownRenderer`
  - Converts the normalized model to Markdown.
- `FormulaParser`
  - Converts supported formula DOM patterns to Markdown LaTeX.
  - Preserves original text and records warnings when unsupported.

### Design Rule

NotebookLM selector details must stay inside the DOM adapter and lazy loader. Markdown rendering and export download code must consume normalized data, not NotebookLM DOM nodes.

## Normalized Data Model

The internal export model should represent:

- `metadata`
  - `title`
  - `url`
  - `exportedAt`
  - `historyLoadStatus`
  - `messageCount`
  - `sourceCount`
- `sources`
  - stable sequential `id`
  - visible source `title`
- `messages`
  - stable sequential `id`
  - `role`: `user` or `assistant`
  - `markdown`
  - `citations`
- `warnings`
  - `code`
  - human-readable `message`

Markdown rendering should be deterministic for identical normalized input.

## Markdown Output

The exported Markdown should use this shape:

```markdown
---
title: "Notebook title"
source_url: "https://notebooklm.google.com/..."
exported_at: "2026-05-17T..."
history_load_status: "complete"
message_count: 10
source_count: 3
---

# Notebook title

## Conversation

### User

...

### NotebookLM

...

## Sources

1. Source title

## Export Warnings

- Warning text
```

Rules:

- Preserve conversation order.
- Use `### User` and `### NotebookLM` headings for turns.
- Preserve basic Markdown structures for paragraphs, lists, tables, and fenced code blocks.
- Render citations inline as bracket references when citation markers are present.
- Render block formulas as `$$ ... $$` and inline formulas as `$...$` when supported.
- Include `Export Warnings` only when warnings exist.

## Lazy-Loaded History Strategy

The loader should:

1. Locate the chat scroll container using adapter-owned selectors.
2. Count currently loaded conversation messages.
3. Scroll the container to the top.
4. Wait for DOM mutations or a fixed short interval.
5. Recount messages.
6. Repeat until:
   - message count is unchanged for multiple checks,
   - scroll position remains at the top,
   - and no loading indicator is visible.
7. Return `complete` only when stability criteria are met.
8. Return `timeout` or `container_not_found` when the loader cannot establish completeness.

The export flow must treat `timeout` and `container_not_found` as blocking errors for a complete 1.0 export.

## DOM Extraction Strategy

The adapter should prioritize stable semantic and structural signals, with fallbacks based on the saved sample:

- message groups: `chat-message-pair`, `chat-message`, `.individual-message`
- user content: `.from-user-message-card-content`, `.from-user-message-inner-content`
- assistant content: `.to-user-message-card-content`, `.to-user-message-inner-content`
- message body: `.message-text-content`, `.message-content`
- citations: `.citation-marker`, `.citation-tooltip-panel`
- sources: `.single-source-container`, `.source-title`, `.source-stretched-button[aria-label]`
- formulas: `.katex`, `.katex-display`, `math`, `annotation[encoding="application/x-tex"]`

These selectors are starting points, not global contracts. If selectors fail, the adapter should return warnings with enough detail to diagnose the missing structure.

## Formula Handling

1. Prefer existing LaTeX annotations:
   - `annotation[encoding="application/x-tex"]`
   - KaTeX-related annotation nodes
2. If a formula appears display-style, render with block delimiters.
3. If a formula appears inline, render with inline delimiters.
4. If LaTeX cannot be extracted:
   - preserve visible text,
   - add a formula warning,
   - continue exporting.

Gemini/Voyager formula-copy compatibility is a future research track. It should be informed by concrete copy-format samples before implementation.

## Error Handling

Blocking errors:

- Current tab is not a NotebookLM page.
- Content script cannot find a usable conversation container.
- Lazy history loader times out before completeness is established.
- No conversation messages are found after loading.

Non-blocking warnings:

- Source title missing for a citation.
- Unsupported formula markup.
- Unsupported rich content node converted to plain text.
- Table could not be rendered as a valid Markdown table and was flattened.

## Verification Requirements

1. Unit tests for Markdown rendering:
   - frontmatter
   - message order
   - sources
   - warnings
   - lists, code blocks, tables
2. Unit tests for formula parsing:
   - inline formula from LaTeX annotation
   - block formula from display-style markup
   - unsupported formula fallback warning
3. Unit tests for lazy history loading:
   - completes after message count stabilizes
   - times out when messages keep changing
   - reports container missing
4. Unit tests for DOM adapter behavior using small synthetic fixtures based on observed NotebookLM structure.
5. Manual extension smoke test:
   - load unpacked extension
   - open NotebookLM page
   - click export
   - verify `.md` file downloads
   - inspect output for frontmatter, messages, citations, sources, formulas, and warnings.

## 1.0 Acceptance Criteria

- Extension can be loaded unpacked in a Chromium-based browser.
- Export button is available from the extension popup.
- Export attempts to load full lazy conversation history before extraction.
- Export fails visibly rather than silently producing an unmarked incomplete file when full history cannot be established.
- Markdown download contains structured frontmatter, conversation turns, sources, citations, supported formulas, and warnings.
- `html_tset/` remains ignored by Git.
- Automated tests cover renderer, formula parser, lazy loader, and DOM adapter.
- Build and test commands pass locally.

## Future Work

- PDF export from the normalized conversation model or generated Markdown.
- Gemini/Voyager formula copy-format research and compatibility layer.
- More robust source/citation backlink rendering.
- Options UI for export style and partial-export override.
- Cross-browser packaging.
