(function attachNotebookLmExporter() {
  const MESSAGE_TYPE = "NOTEBOOKLM_EXPORT_MARKDOWN";
  const STATUS_ID = "notebooklm-export-status";

  function getCore() {
    if (!globalThis.NotebookLmExportCore) {
      throw new Error("NotebookLM export core is not loaded.");
    }
    return globalThis.NotebookLmExportCore;
  }

  function showStatus(message, tone = "info") {
    let element = document.getElementById(STATUS_ID);

    if (!element) {
      element = document.createElement("div");
      element.id = STATUS_ID;
      element.setAttribute("role", "status");
      element.style.cssText = [
        "position:fixed",
        "right:16px",
        "bottom:16px",
        "z-index:2147483647",
        "max-width:360px",
        "padding:12px 14px",
        "border-radius:8px",
        "box-shadow:0 4px 18px rgba(0,0,0,.25)",
        "font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
        "background:#1f2937",
        "color:#fff",
      ].join(";");
      document.documentElement.appendChild(element);
    }

    element.textContent = message;
    element.style.background = tone === "error" ? "#991b1b" : tone === "success" ? "#166534" : "#1f2937";
  }

  function hideStatusSoon() {
    setTimeout(() => {
      const element = document.getElementById(STATUS_ID);
      if (element) {
        element.remove();
      }
    }, 5000);
  }

  function createFileName(title) {
    const slug = String(title || "notebooklm-export")
      .normalize("NFKD")
      .replace(/[^\w\s.-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80)
      .replace(/^-+|-+$/g, "");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    return `${slug || "notebooklm-export"}-${stamp}.md`;
  }

  function downloadMarkdown(markdown, filename) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function exportMarkdown() {
    if (!location.hostname.endsWith("notebooklm.google.com")) {
      throw new Error("Open a NotebookLM notebook page before exporting.");
    }

    const core = getCore();
    showStatus("NotebookLM Export: loading full conversation history...");

    const history = await core.loadFullHistory(document, {
      waitMs: 650,
      stableChecks: 3,
      maxAttempts: 100,
    });

    if (history.status !== "complete") {
      throw new Error(`Could not confirm complete conversation history (${history.status}).`);
    }

    showStatus("NotebookLM Export: extracting conversation...");
    const exportedAt = new Date().toISOString();
    const data = core.extractNotebookData(document, {
      exportedAt,
      historyLoadStatus: history.status,
      url: location.href,
    });

    if (!data.messages.length) {
      throw new Error("No NotebookLM conversation messages were found.");
    }

    showStatus("NotebookLM Export: rendering Markdown...");
    const markdown = core.renderMarkdown(data);

    showStatus("NotebookLM Export: downloading Markdown...");
    downloadMarkdown(markdown, createFileName(data.metadata.title));

    showStatus("NotebookLM Export: Markdown downloaded.", "success");
    hideStatusSoon();

    return {
      ok: true,
      messageCount: data.messages.length,
      warningCount: data.warnings.length,
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== MESSAGE_TYPE) {
      return undefined;
    }

    exportMarkdown()
      .then((result) => sendResponse(result))
      .catch((error) => {
        showStatus(`NotebookLM Export: ${error.message}`, "error");
        sendResponse({ ok: false, error: error.message });
      });

    return true;
  });
})();
