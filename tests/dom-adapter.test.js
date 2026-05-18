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

test("extracts NotebookLM starting summary before conversation messages", () => {
  const fixture = doc({
    title: "Summary Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-panel-empty-state" }, [
          el("span", { class: "notebook-summary mat-body-medium" }, [
            el("div", { class: "summary-content" }, [
              el("p", {}, ["Notebook summary first paragraph."]),
              el("ul", {}, [el("li", {}, ["Key summary point"])]),
            ]),
          ]),
        ]),
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "from-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content from-user-message-inner-content" }, [
              el("p", {}, ["Question after summary."]),
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

  assert.deepEqual(data.summary, {
    markdown: ["Notebook summary first paragraph.", "", "- Key summary point"].join("\n"),
  });
  assert.equal(data.messages[0].markdown, "Question after summary.");
});

test("keeps user prompt wrappers marked as heading as plain message text", () => {
  const fixture = doc({
    title: "User Heading Wrapper Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "from-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content from-user-message-inner-content" }, [
              el("div", { class: "message-text-content mat-body-medium" }, [
                el("div", { class: "md3-body-text ng-star-inserted", role: "heading", "aria-level": "3" }, [
                  el("p", {}, ["This user prompt should stay plain text."]),
                ]),
              ]),
            ]),
          ]),
          el("mat-card", { class: "to-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content to-user-message-inner-content" }, [
              el("div", { class: "paragraph heading3", role: "heading", "aria-level": "3" }, [
                "Assistant heading should remain structured.",
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

  assert.equal(data.messages[0].markdown, "This user prompt should stay plain text.");
  assert.equal(data.messages[1].markdown, "### Assistant heading should remain structured.");
});

test("keeps user prompt wrappers with NotebookLM heading classes as plain message text", () => {
  const fixture = doc({
    title: "User Heading Class Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "from-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content from-user-message-inner-content" }, [
              el("div", { class: "message-text-content mat-body-medium" }, [
                el("div", { class: "paragraph heading3" }, ["User text should still not become a heading."]),
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

  assert.equal(data.messages[0].markdown, "User text should still not become a heading.");
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

test("keeps NotebookLM structural wrappers from flattening headings and tables", () => {
  const fixture = doc({
    title: "UAV Wrapper Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "to-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content to-user-message-inner-content" }, [
              el("div", { class: "message-text-content" }, [
                el("labs-tailwind-doc-viewer", {}, [
                  el("element-list-renderer", {}, [
                    el("labs-tailwind-structural-element-view-v2", {}, [
                      el("paragraph-element-view", {}, [
                        el("div", { class: "paragraph normal" }, ["Intro paragraph."]),
                      ]),
                    ]),
                    el("labs-tailwind-structural-element-view-v2", {}, [
                      el("paragraph-element-view", {}, [
                        el("div", { class: "paragraph heading3", role: "heading", "aria-level": "3" }, [
                          "一、 核心要素对比分析表",
                        ]),
                      ]),
                    ]),
                    el("labs-tailwind-structural-element-view-v2", {}, [
                      el("table", {}, [
                        el("tbody", {}, [
                          el("tr", {}, [
                            el("th", {}, [el("div", { class: "paragraph table-paragraph" }, ["比较维度"])]),
                            el("th", {}, [el("div", { class: "paragraph table-paragraph" }, ["AirCopBench"])]),
                          ]),
                          el("tr", {}, [
                            el("td", {}, [el("div", { class: "paragraph table-paragraph" }, ["核心主题"])]),
                            el("td", {}, [el("div", { class: "paragraph table-paragraph" }, ["多无人机协同"])]),
                          ]),
                        ]),
                      ]),
                    ]),
                    el("labs-tailwind-structural-element-view-v2", {}, [
                      el("paragraph-element-view", {}, [
                        el("div", { class: "paragraph heading3", role: "heading", "aria-level": "3" }, [
                          "二、 详细异同分析",
                        ]),
                      ]),
                    ]),
                  ]),
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

  assert.equal(
    data.messages[0].markdown,
    [
      "Intro paragraph.",
      "",
      "### 一、 核心要素对比分析表",
      "",
      "| 比较维度 | AirCopBench |",
      "| --- | --- |",
      "| 核心主题 | 多无人机协同 |",
      "",
      "### 二、 详细异同分析",
    ].join("\n"),
  );
});

test("separates display formulas from surrounding paragraph text for Markdown math renderers", () => {
  const fixture = doc({
    title: "Display Formula Boundary Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "to-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content to-user-message-inner-content" }, [
              el("p", {}, [
                "概率定义：",
                el("span", { class: "katex katex-display" }, [
                  el("annotation", { encoding: "application/x-tex" }, ["p_i=\\frac{1}{C}"]),
                ]),
                "其中，",
                el("span", { class: "katex" }, [
                  el("annotation", { encoding: "application/x-tex" }, ["C"]),
                ]),
                "是类别数。",
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

  assert.equal(
    data.messages[0].markdown,
    ["概率定义：", "", "$$", "p_i=\\frac{1}{C}", "$$", "", "其中， $C$ 是类别数。"].join("\n"),
  );
});

test("adds spacing around inline formulas when adjacent to prose", () => {
  const fixture = doc({
    title: "Inline Formula Spacing Test - NotebookLM",
    children: [
      el("div", { class: "chat-panel-content" }, [
        el("div", { class: "chat-message-pair" }, [
          el("mat-card", { class: "to-user-message-card-content" }, [
            el("mat-card-content", { class: "message-content to-user-message-inner-content" }, [
              el("p", {}, [
                "样本",
                el("span", { class: "katex" }, [
                  el("annotation", { encoding: "application/x-tex" }, ["x_i"]),
                ]),
                "对应分布",
                el("span", { class: "katex" }, [
                  el("annotation", { encoding: "application/x-tex" }, ["p_i"]),
                ]),
                "。",
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

  assert.equal(data.messages[0].markdown, "样本 $x_i$ 对应分布 $p_i$ 。");
});
