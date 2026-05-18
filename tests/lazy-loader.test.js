const test = require("node:test");
const assert = require("node:assert/strict");

const { loadFullHistory } = require("../src/extension/core.js");
const { doc, el } = require("./helpers/fake-dom.js");

function pair(text) {
  return el("div", { class: "chat-message-pair" }, [text]);
}

function append(parent, child) {
  child.parentNode = parent;
  parent.childNodes.push(child);
  parent.children.push(child);
}

test("completes after loaded message count and top scroll position stabilize", async () => {
  const scroller = el("div", { class: "chat-panel-content", scrollTop: 100 }, [pair("newer")]);
  const documentRef = doc({ children: [scroller] });
  let waits = 0;

  const result = await loadFullHistory(documentRef, {
    stableChecks: 2,
    maxAttempts: 6,
    wait: async () => {
      waits += 1;
      if (waits === 1) {
        append(scroller, pair("older"));
      }
    },
  });

  assert.equal(result.status, "complete");
  assert.equal(result.messageCount, 2);
  assert.ok(result.attempts >= 2);
  assert.equal(scroller.scrollTop, 0);
});

test("counts individual NotebookLM messages before chat pairs when both are present", async () => {
  const scroller = el("div", { class: "chat-panel-content", scrollTop: 100 }, [
    el("div", { class: "chat-message-pair" }, [
      el("chat-message", { class: "individual-message" }, ["user 1"]),
      el("chat-message", { class: "individual-message" }, ["assistant 1"]),
    ]),
    el("div", { class: "chat-message-pair" }, [
      el("chat-message", { class: "individual-message" }, ["user 2"]),
      el("chat-message", { class: "individual-message" }, ["assistant 2"]),
    ]),
  ]);
  const documentRef = doc({ children: [scroller] });

  const result = await loadFullHistory(documentRef, {
    stableChecks: 1,
    maxAttempts: 2,
    wait: async () => {},
  });

  assert.equal(result.status, "complete");
  assert.equal(result.messageCount, 4);
});

test("times out when message count never stabilizes", async () => {
  const scroller = el("div", { class: "chat-panel-content", scrollTop: 100 }, [pair("1")]);
  const documentRef = doc({ children: [scroller] });
  let count = 1;

  const result = await loadFullHistory(documentRef, {
    stableChecks: 2,
    maxAttempts: 3,
    wait: async () => {
      count += 1;
      append(scroller, pair(String(count)));
    },
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.messageCount, 4);
  assert.equal(result.attempts, 3);
});

test("reports missing container when chat panel cannot be found", async () => {
  const result = await loadFullHistory(doc({ children: [] }), {
    wait: async () => {},
  });

  assert.equal(result.status, "container_not_found");
  assert.equal(result.messageCount, 0);
});

test("does not complete while a loading indicator is still visible", async () => {
  const scroller = el("div", { class: "chat-panel-content", scrollTop: 0 }, [
    pair("1"),
    el("div", { class: "loading" }, ["Loading"]),
  ]);
  const documentRef = doc({ children: [scroller] });

  const result = await loadFullHistory(documentRef, {
    stableChecks: 1,
    maxAttempts: 2,
    wait: async () => {},
  });

  assert.equal(result.status, "timeout");
  assert.equal(result.messageCount, 1);
});
