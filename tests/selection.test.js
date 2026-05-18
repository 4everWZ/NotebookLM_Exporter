const test = require("node:test");
const assert = require("node:assert/strict");

const { createConversationStatus, createMessagePreview, filterExportData } = require("../src/extension/core.js");

function sampleData() {
  return {
    metadata: {
      title: "Selection Test",
      url: "https://notebooklm.google.com/notebook/example",
      exportedAt: "2026-05-18T10:00:00.000Z",
      historyLoadStatus: "complete",
      messageCount: 3,
      sourceCount: 1,
    },
    sources: [{ id: "s1", title: "Source A" }],
    messages: [
      { id: "m1", role: "user", markdown: "First question", citations: [] },
      { id: "m2", role: "assistant", markdown: "First answer", citations: [] },
      { id: "m3", role: "user", markdown: "Second question", citations: [] },
    ],
    warnings: [],
  };
}

test("filterExportData keeps all messages by default", () => {
  const filtered = filterExportData(sampleData(), { mode: "all", selectedMessageIds: [] });

  assert.deepEqual(filtered.messages.map((message) => message.id), ["m1", "m2", "m3"]);
  assert.equal(filtered.metadata.exportMode, "all");
  assert.equal(filtered.metadata.messageCount, 3);
  assert.equal(filtered.metadata.selectedMessageCount, 3);
});

test("filterExportData keeps selected messages in original order", () => {
  const filtered = filterExportData(sampleData(), { mode: "selected", selectedMessageIds: ["m3", "m1"] });

  assert.deepEqual(filtered.messages.map((message) => message.id), ["m1", "m3"]);
  assert.equal(filtered.metadata.exportMode, "selected");
  assert.equal(filtered.metadata.selectedMessageCount, 2);
  assert.equal(filtered.metadata.messageCount, 2);
});

test("filterExportData rejects empty selected exports", () => {
  assert.throws(
    () => filterExportData(sampleData(), { mode: "selected", selectedMessageIds: [] }),
    /requires at least one checked message/,
  );
});

test("filterExportData rejects selected ids that are not present", () => {
  assert.throws(
    () => filterExportData(sampleData(), { mode: "selected", selectedMessageIds: ["missing"] }),
    /Selected messages were not found/,
  );
});

test("createConversationStatus summarizes complete scan data", () => {
  const status = createConversationStatus(sampleData(), { status: "complete", messageCount: 3, attempts: 2 });

  assert.equal(status.ok, true);
  assert.equal(status.status, "complete");
  assert.equal(status.messageCount, 3);
  assert.equal(status.sourceCount, 1);
  assert.equal(status.warningCount, 0);
  assert.deepEqual(status.messages[0], { id: "m1", role: "user", preview: "First question" });
});

test("createConversationStatus reports incomplete history without claiming success", () => {
  const status = createConversationStatus(sampleData(), { status: "timeout", messageCount: 2, attempts: 100 });

  assert.equal(status.ok, false);
  assert.equal(status.status, "timeout");
  assert.equal(status.messageCount, 3);
  assert.equal(status.historyMessageCount, 2);
  assert.match(status.error, /Could not confirm complete conversation history/);
});

test("createMessagePreview flattens markdown to a compact single line", () => {
  assert.equal(createMessagePreview("Heading\n\n- first\n- second"), "Heading - first - second");
});
