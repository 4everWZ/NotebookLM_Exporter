const test = require("node:test");
const assert = require("node:assert/strict");

const { extractNotebookData } = require("../src/extension/core.js");
const { doc, el } = require("./helpers/fake-dom.js");

function notebookFixture() {
  return doc({
    title: "MC3WD Export Test - NotebookLM",
    url: "https://notebooklm.google.com/notebook/example",
    children: [
      el("input", { class: "title-input", value: "MC3WD Export Test" }, []),
      el("div", { class: "source-panel-content" }, [
        el("div", { class: "single-source-container" }, ["Gemini chat group"]),
        el("div", { class: "single-source-container" }, [
          el("div", { class: "source-title", "aria-label": "MC3WD-SEGBC.pdf" }, ["MC3WD-SEGBC.pdf"]),
        ]),
      ]),
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "from-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content from-user-message-inner-content" }, [
              el("p", {}, ["What is the core method?"]),
            ]),
          ]),
          el("mat-card", { class: "to-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content to-user-message-inner-content" }, [
              el("p", {}, [
                "The method combines collision analysis ",
                el("span", { class: "citation-marker" }, ["1"]),
                ".",
              ]),
              el("ul", {}, [el("li", {}, ["Manifold collision"]), el("li", {}, ["Semantic entropy"])]),
              el("pre", {}, [el("code", {}, ["return score;"])]),
              el("table", {}, [
                el("tr", {}, [el("th", {}, ["Metric"]), el("th", {}, ["Value"])]),
                el("tr", {}, [el("td", {}, ["F1"]), el("td", {}, ["0.91"])]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ],
  });
}

test("extracts NotebookLM title, sources, ordered messages, citations, and rich Markdown", () => {
  const data = extractNotebookData(notebookFixture(), {
    exportedAt: "2026-05-17T10:00:00.000Z",
    historyLoadStatus: "complete",
  });

  assert.equal(data.metadata.title, "MC3WD Export Test");
  assert.equal(data.metadata.url, "https://notebooklm.google.com/notebook/example");
  assert.equal(data.metadata.historyLoadStatus, "complete");
  assert.equal(data.metadata.messageCount, 2);
  assert.equal(data.metadata.sourceCount, 1);
  assert.deepEqual(data.sources, [{ id: "s1", title: "MC3WD-SEGBC.pdf" }]);
  assert.equal(data.messages[0].role, "user");
  assert.equal(data.messages[0].markdown, "What is the core method?");
  assert.equal(data.messages[1].role, "assistant");
  assert.match(data.messages[1].markdown, /The method combines collision analysis \[1\]\./);
  assert.match(data.messages[1].markdown, /- Manifold collision/);
  assert.match(data.messages[1].markdown, /```text\nreturn score;\n```/);
  assert.match(data.messages[1].markdown, /\| Metric \| Value \|/);
  assert.deepEqual(data.messages[1].citations, [{ label: "1", sourceId: "s1" }]);
});

test("preserves message-internal line breaks and paragraph boundaries", () => {
  const fixture = doc({
    title: "Line Break Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "from-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content from-user-message-inner-content" }, [
              el("p", {}, ["First line", el("br", {}, []), "Second line"]),
              el("p", {}, ["Second paragraph"]),
            ]),
          ]),
        ]),
      ]),
    ],
  });

  const data = extractNotebookData(fixture, {
    exportedAt: "2026-05-18T10:00:00.000Z",
    historyLoadStatus: "complete",
  });

  assert.equal(data.messages[0].markdown, "First line\nSecond line\n\nSecond paragraph");
});

test("renders headings, inline rich text, links, and code blocks as Markdown", () => {
  const fixture = doc({
    title: "Rich Text Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "to-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content to-user-message-inner-content" }, [
              el("h3", {}, ["Main result"]),
              el("p", {}, [
                "Use ",
                el("strong", {}, ["collision"]),
                " and ",
                el("em", {}, ["entropy"]),
                " with ",
                el("code", {}, ["score"]),
                " from ",
                el("a", { href: "https://example.com" }, ["paper"]),
                ".",
              ]),
              el("pre", {}, ["alpha\nbeta\n"]),
            ]),
          ]),
        ]),
      ]),
    ],
  });

  const data = extractNotebookData(fixture, {
    exportedAt: "2026-05-18T10:00:00.000Z",
    historyLoadStatus: "complete",
  });

  assert.equal(
    data.messages[0].markdown,
    [
      "### Main result",
      "",
      "Use **collision** and *entropy* with `score` from [paper](https://example.com).",
      "",
      "```text",
      "alpha",
      "beta",
      "```",
    ].join("\n"),
  );
});

test("keeps nested list indentation when exporting Markdown", () => {
  const fixture = doc({
    title: "Nested List Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "to-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content to-user-message-inner-content" }, [
              el("ul", {}, [
                el("li", {}, [
                  "Parent",
                  el("ul", {}, [el("li", {}, ["Child"])]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ],
  });

  const data = extractNotebookData(fixture, {
    exportedAt: "2026-05-18T10:00:00.000Z",
    historyLoadStatus: "complete",
  });

  assert.equal(data.messages[0].markdown, "- Parent\n  - Child");
});
