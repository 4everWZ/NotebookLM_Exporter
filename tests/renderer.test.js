const test = require("node:test");
const assert = require("node:assert/strict");

const { renderMarkdown } = require("../src/extension/core.js");

test("renders deterministic structured Markdown with frontmatter, turns, sources, and warnings", () => {
  const exportData = {
    metadata: {
      title: "MC3WD: Export Test",
      url: "https://notebooklm.google.com/notebook/example",
      exportedAt: "2026-05-17T10:00:00.000Z",
      historyLoadStatus: "complete",
      messageCount: 2,
      sourceCount: 1,
    },
    messages: [
      {
        id: "m1",
        role: "user",
        markdown: "Summarize the method.",
        citations: [],
      },
      {
        id: "m2",
        role: "assistant",
        markdown: [
          "The method has three parts:",
          "",
          "- manifold collision",
          "- semantic entropy",
          "",
          "```text",
          "stable code fence",
          "```",
          "",
          "| Metric | Value |",
          "| --- | --- |",
          "| F1 | 0.91 |",
        ].join("\n"),
        citations: [{ label: "1", sourceId: "s1" }],
      },
    ],
    sources: [{ id: "s1", title: "MC3WD-SEGBC.pdf" }],
    warnings: [{ code: "unsupported_formula", message: "Formula kept as visible text." }],
  };

  const first = renderMarkdown(exportData);
  const second = renderMarkdown(exportData);

  assert.equal(first, second);
  assert.match(first, /^---\n/);
  assert.match(first, /title: "MC3WD: Export Test"/);
  assert.match(first, /source_url: "https:\/\/notebooklm\.google\.com\/notebook\/example"/);
  assert.match(first, /history_load_status: "complete"/);
  assert.match(first, /message_count: 2/);
  assert.match(first, /# MC3WD: Export Test/);
  assert.match(first, /## Conversation/);
  assert.match(first, /### User\n\nSummarize the method\./);
  assert.match(first, /### NotebookLM\n\nThe method has three parts:/);
  assert.match(first, /- manifold collision/);
  assert.match(first, /```text\nstable code fence\n```/);
  assert.match(first, /\| Metric \| Value \|/);
  assert.match(first, /## Sources\n\n1\. MC3WD-SEGBC\.pdf/);
  assert.match(first, /## Export Warnings\n\n- \[unsupported_formula\] Formula kept as visible text\./);
});

test("escapes YAML-sensitive frontmatter values", () => {
  const markdown = renderMarkdown({
    metadata: {
      title: 'Notebook "quoted": test',
      url: "https://notebooklm.google.com/notebook/example",
      exportedAt: "2026-05-17T10:00:00.000Z",
      historyLoadStatus: "complete",
      messageCount: 0,
      sourceCount: 0,
    },
    messages: [],
    sources: [],
    warnings: [],
  });

  assert.match(markdown, /title: "Notebook \\"quoted\\": test"/);
  assert.doesNotMatch(markdown, /## Export Warnings/);
});
