const MESSAGE_TYPES = {
  scan: "NOTEBOOKLM_SCAN_CONVERSATION",
  exportMarkdown: "NOTEBOOKLM_EXPORT_MARKDOWN",
};

const elements = {
  button: document.getElementById("export-markdown"),
  historyStatus: document.getElementById("history-status"),
  messageCount: document.getElementById("message-count"),
  messageList: document.getElementById("message-list"),
  modeAll: document.getElementById("mode-all"),
  modeSelected: document.getElementById("mode-selected"),
  scanButton: document.getElementById("scan-conversation"),
  sourceCount: document.getElementById("source-count"),
  status: document.getElementById("status"),
};

const state = {
  activeTab: null,
  exporting: false,
  scan: null,
  scanning: false,
};

function setStatus(message) {
  elements.status.textContent = message;
}

function setCounts(messageCount, sourceCount) {
  elements.messageCount.textContent = `Messages: ${Number(messageCount || 0)}`;
  elements.sourceCount.textContent = `Sources: ${Number(sourceCount || 0)}`;
}

function setHistoryStatus(status) {
  elements.historyStatus.textContent = `DOM: ${status || "unknown"}`;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function isNotebookLmTab(tab) {
  return Boolean(tab && tab.id && tab.url && tab.url.startsWith("https://notebooklm.google.com/"));
}

function roleLabel(role) {
  return role === "user" ? "User" : "NotebookLM";
}

function getMode() {
  return elements.modeSelected.checked ? "selected" : "all";
}

function getSelectedMessageIds() {
  return Array.from(elements.messageList.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function canExport() {
  if (state.scanning || state.exporting || !state.scan || !state.scan.ok) {
    return false;
  }

  return getMode() !== "selected" || getSelectedMessageIds().length > 0;
}

function updateControls() {
  const selectedMode = getMode() === "selected";
  const checkboxes = elements.messageList.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach((checkbox) => {
    checkbox.disabled = !selectedMode || state.scanning || state.exporting;
  });

  elements.button.disabled = !canExport();
  elements.scanButton.disabled = state.scanning || state.exporting;
}

function renderMessages(messages) {
  elements.messageList.textContent = "";

  if (!Array.isArray(messages) || messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message-list";
    empty.textContent = "No messages detected.";
    elements.messageList.appendChild(empty);
    return;
  }

  messages.forEach((message) => {
    const label = document.createElement("label");
    label.className = "message-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = message.id;
    checkbox.addEventListener("change", updateControls);

    const text = document.createElement("span");
    const role = document.createElement("span");
    role.className = "message-role";
    role.textContent = `${roleLabel(message.role)}: `;
    text.appendChild(role);
    text.append(document.createTextNode(message.preview || "(empty message)"));

    label.append(checkbox, text);
    elements.messageList.appendChild(label);
  });
}

function renderScan(scan) {
  state.scan = scan;
  setCounts(scan && scan.messageCount, scan && scan.sourceCount);
  setHistoryStatus(scan && scan.status);
  renderMessages(scan && scan.messages);

  if (!scan) {
    setStatus("Scan failed.");
  } else if (scan.ok) {
    setStatus(`History complete. Messages: ${scan.messageCount}.`);
  } else {
    setStatus(scan.error || `History incomplete: ${scan.status}`);
  }

  updateControls();
}

async function scanActiveTab() {
  state.scanning = true;
  state.scan = null;
  elements.button.disabled = true;
  setCounts(0, 0);
  setHistoryStatus("loading");
  renderMessages([]);
  setStatus("Loading conversation history...");

  try {
    const tab = await getActiveTab();
    state.activeTab = tab;

    if (!isNotebookLmTab(tab)) {
      renderScan({
        ok: false,
        status: "not_notebooklm",
        messageCount: 0,
        sourceCount: 0,
        messages: [],
        error: "Open a NotebookLM notebook tab first.",
      });
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.scan });
    renderScan(response || { ok: false, status: "error", error: "Scan failed.", messages: [] });
  } catch (error) {
    renderScan({
      ok: false,
      status: "error",
      messageCount: 0,
      sourceCount: 0,
      messages: [],
      error: error.message,
    });
  } finally {
    state.scanning = false;
    updateControls();
  }
}

async function exportMarkdown() {
  state.exporting = true;
  updateControls();
  setStatus("Starting export...");

  try {
    const tab = state.activeTab || (await getActiveTab());

    if (!isNotebookLmTab(tab)) {
      throw new Error("Open a NotebookLM notebook tab first.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.exportMarkdown,
      options: {
        mode: getMode(),
        selectedMessageIds: getSelectedMessageIds(),
      },
    });

    if (!response || !response.ok) {
      throw new Error((response && response.error) || "Export failed.");
    }

    setStatus(
      `Downloaded Markdown. Messages: ${response.messageCount}. Sources: ${response.sourceCount}. Warnings: ${response.warningCount}.`,
    );
  } catch (error) {
    setStatus(`Export failed: ${error.message}`);
  } finally {
    state.exporting = false;
    updateControls();
  }
}

elements.modeAll.addEventListener("change", updateControls);
elements.modeSelected.addEventListener("change", updateControls);
elements.scanButton.addEventListener("click", scanActiveTab);
elements.button.addEventListener("click", exportMarkdown);
updateControls();
