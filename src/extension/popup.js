const MESSAGE_TYPE = "NOTEBOOKLM_EXPORT_MARKDOWN";

const button = document.getElementById("export-markdown");
const statusElement = document.getElementById("status");

function setStatus(message) {
  statusElement.textContent = message;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

button.addEventListener("click", async () => {
  button.disabled = true;
  setStatus("Starting export...");

  try {
    const tab = await getActiveTab();

    if (!tab || !tab.id || !tab.url || !tab.url.startsWith("https://notebooklm.google.com/")) {
      throw new Error("Open a NotebookLM notebook tab first.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPE });

    if (!response || !response.ok) {
      throw new Error((response && response.error) || "Export failed.");
    }

    setStatus(`Downloaded Markdown. Messages: ${response.messageCount}. Warnings: ${response.warningCount}.`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    button.disabled = false;
  }
});
