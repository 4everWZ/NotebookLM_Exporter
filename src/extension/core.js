(function attachCore(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.NotebookLmExportCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore() {
  function yamlString(value) {
    return `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function roleHeading(role) {
    return role === "user" ? "User" : "NotebookLM";
  }

  function renderWarnings(warnings) {
    if (!Array.isArray(warnings) || warnings.length === 0) {
      return "";
    }

    const items = warnings.map((warning) => {
      const code = warning && warning.code ? `[${warning.code}] ` : "";
      const message = warning && warning.message ? warning.message : "Unspecified export warning.";
      return `- ${code}${message}`;
    });

    return ["## Export Warnings", "", ...items].join("\n");
  }

  function renderSources(sources) {
    if (!Array.isArray(sources) || sources.length === 0) {
      return "";
    }

    const items = sources.map((source, index) => `${index + 1}. ${source.title || "Untitled source"}`);
    return ["## Sources", "", ...items].join("\n");
  }

  function renderMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return "";
    }

    return messages
      .map((message) => {
        const heading = roleHeading(message.role);
        const body = String(message.markdown || "").trim();
        return [`### ${heading}`, "", body].join("\n").trimEnd();
      })
      .join("\n\n");
  }

  function renderMarkdown(exportData) {
    const data = exportData || {};
    const metadata = data.metadata || {};
    const title = metadata.title || "NotebookLM Export";

    const sections = [
      "---",
      `title: ${yamlString(title)}`,
      `source_url: ${yamlString(metadata.url || "")}`,
      `exported_at: ${yamlString(metadata.exportedAt || "")}`,
      `history_load_status: ${yamlString(metadata.historyLoadStatus || "unknown")}`,
      `message_count: ${numberValue(metadata.messageCount)}`,
      `source_count: ${numberValue(metadata.sourceCount)}`,
      "---",
      "",
      `# ${title}`,
      "",
      "## Conversation",
      "",
      renderMessages(data.messages),
      "",
      renderSources(data.sources),
      "",
      renderWarnings(data.warnings),
    ];

    return `${sections.filter((section) => section !== "").join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
  }

  function hasClass(element, className) {
    if (!element) {
      return false;
    }

    if (element.classList && typeof element.classList.contains === "function") {
      return element.classList.contains(className);
    }

    return String(element.getAttribute ? element.getAttribute("class") : element.className || "")
      .split(/\s+/)
      .includes(className);
  }

  function getFormulaAnnotation(element) {
    if (!element || typeof element.querySelector !== "function") {
      return "";
    }

    const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
    return annotation && annotation.textContent ? annotation.textContent.trim() : "";
  }

  function isDisplayFormula(element) {
    if (!element) {
      return false;
    }

    if (typeof element.matches === "function" && element.matches(".katex-display")) {
      return true;
    }

    return hasClass(element, "katex-display");
  }

  function addWarning(warnings, code, message) {
    if (Array.isArray(warnings)) {
      warnings.push({ code, message });
    }
  }

  function extractFormulaMarkdown(element, warnings) {
    const latex = getFormulaAnnotation(element);

    if (latex) {
      return isDisplayFormula(element) ? `$$\n${latex}\n$$` : `$${latex}$`;
    }

    const visibleText = String((element && element.textContent) || "").trim();
    addWarning(
      warnings,
      "unsupported_formula",
      visibleText ? `Formula kept as visible text: ${visibleText}` : "Formula kept as visible text.",
    );

    return visibleText;
  }

  function queryFirst(root, selectors) {
    if (!root || typeof root.querySelector !== "function") {
      return null;
    }

    for (const selector of selectors) {
      const result = root.querySelector(selector);
      if (result) {
        return result;
      }
    }

    return null;
  }

  function queryAll(root, selector) {
    if (!root || typeof root.querySelectorAll !== "function") {
      return [];
    }
    return Array.from(root.querySelectorAll(selector));
  }

  function visibleText(node) {
    return String((node && node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function normalizeInline(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function getTagName(element) {
    return String((element && element.tagName) || "").toLowerCase();
  }

  function isElement(node) {
    return Boolean(node && node.nodeType === 1);
  }

  function isText(node) {
    return Boolean(node && node.nodeType === 3);
  }

  function matchesAny(element, selectors) {
    return Boolean(
      element &&
        typeof element.matches === "function" &&
        selectors.some((selector) => element.matches(selector)),
    );
  }

  function getTitle(documentRef) {
    const titleInput = queryFirst(documentRef, [".title-input"]);
    if (titleInput && titleInput.value) {
      return String(titleInput.value).trim();
    }

    return String((documentRef && documentRef.title) || "NotebookLM Export")
      .replace(/\s+-\s+NotebookLM\s*$/i, "")
      .trim();
  }

  function getPageUrl(documentRef, options) {
    return (
      options.url ||
      (documentRef && documentRef.URL) ||
      (documentRef && documentRef.location && documentRef.location.href) ||
      ""
    );
  }

  function extractSources(documentRef) {
    const containers = queryAll(documentRef, ".single-source-container");

    return containers
      .map((container) => {
        const titleNode = queryFirst(container, [".source-title", ".source-stretched-button[aria-label]"]);
        const title = (titleNode && titleNode.getAttribute && titleNode.getAttribute("aria-label")) || visibleText(titleNode);

        if (!title) {
          return null;
        }

        return {
          title,
        };
      })
      .filter(Boolean)
      .map((source, index) => ({
        id: `s${index + 1}`,
        title: source.title,
      }));
  }

  function renderTable(element) {
    const rows = queryAll(element, "tr").map((row) =>
      Array.from(row.children || [])
        .filter((cell) => ["td", "th"].includes(getTagName(cell)))
        .map((cell) => visibleText(cell)),
    );

    if (rows.length === 0 || rows[0].length === 0) {
      return visibleText(element);
    }

    const columnCount = rows[0].length;
    const header = `| ${rows[0].join(" | ")} |`;
    const separator = `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`;
    const body = rows.slice(1).map((row) => `| ${row.join(" | ")} |`);
    return [header, separator, ...body].join("\n");
  }

  function renderList(element, context) {
    return Array.from(element.children || [])
      .filter((child) => getTagName(child) === "li")
      .map((child, index) => {
        const marker = getTagName(element) === "ol" ? `${index + 1}.` : "-";
        return `${marker} ${normalizeInline(renderInlineChildren(child, context))}`;
      })
      .join("\n");
  }

  function renderInlineChildren(element, context) {
    return Array.from(element.childNodes || [])
      .map((child) => nodeToMarkdown(child, context))
      .join("");
  }

  function recordCitation(element, context) {
    const label = visibleText(element);
    if (label) {
      const citation = { label, sourceId: `s${label}` };
      if (!context.citations.some((item) => item.label === citation.label && item.sourceId === citation.sourceId)) {
        context.citations.push(citation);
      }
      return `[${label}]`;
    }
    return "";
  }

  function nodeToMarkdown(node, context) {
    if (isText(node)) {
      return node.textContent || "";
    }

    if (!isElement(node)) {
      return "";
    }

    if (matchesAny(node, [".citation-marker"])) {
      return recordCitation(node, context);
    }

    if (matchesAny(node, [".katex", ".katex-display"]) || getTagName(node) === "math") {
      return extractFormulaMarkdown(node, context.warnings);
    }

    const tagName = getTagName(node);

    if (tagName === "br") {
      return "\n";
    }

    if (tagName === "pre") {
      return `\`\`\`text\n${String(node.textContent || "").trim()}\n\`\`\``;
    }

    if (tagName === "code") {
      return `\`${String(node.textContent || "").trim()}\``;
    }

    if (tagName === "ul" || tagName === "ol") {
      return renderList(node, context);
    }

    if (tagName === "table") {
      return renderTable(node);
    }

    return renderInlineChildren(node, context);
  }

  function elementToMarkdown(element, context) {
    const blockParts = [];

    for (const child of Array.from(element.childNodes || [])) {
      if (isText(child)) {
        const text = normalizeInline(child.textContent);
        if (text) {
          blockParts.push(text);
        }
        continue;
      }

      const tagName = getTagName(child);
      if (["p", "div", "section", "mat-card-content"].includes(tagName)) {
        const text = normalizeInline(renderInlineChildren(child, context));
        if (text) {
          blockParts.push(text);
        }
      } else if (["ul", "ol", "pre", "table"].includes(tagName)) {
        const markdown = nodeToMarkdown(child, context).trim();
        if (markdown) {
          blockParts.push(markdown);
        }
      } else {
        const markdown = normalizeInline(nodeToMarkdown(child, context));
        if (markdown) {
          blockParts.push(markdown);
        }
      }
    }

    if (blockParts.length === 0) {
      return visibleText(element);
    }

    return blockParts.join("\n\n");
  }

  function extractMessageMarkdown(container, warnings) {
    const body = queryFirst(container, [".message-text-content", ".message-content"]) || container;
    const context = { citations: [], warnings };
    const markdown = elementToMarkdown(body, context);

    return {
      markdown,
      citations: context.citations,
    };
  }

  function extractNotebookData(documentRef, options = {}) {
    const warnings = [];
    const sources = extractSources(documentRef);
    const pairs = queryAll(documentRef, ".chat-message-pair");
    const messages = [];

    for (const pair of pairs) {
      const userContainer = queryFirst(pair, [".from-user-message-inner-content", ".from-user-message-card-content"]);
      const assistantContainer = queryFirst(pair, [".to-user-message-inner-content", ".to-user-message-card-content"]);

      if (userContainer) {
        const userMessage = extractMessageMarkdown(userContainer, warnings);
        messages.push({
          id: `m${messages.length + 1}`,
          role: "user",
          markdown: userMessage.markdown,
          citations: userMessage.citations,
        });
      }

      if (assistantContainer) {
        const assistantMessage = extractMessageMarkdown(assistantContainer, warnings);
        messages.push({
          id: `m${messages.length + 1}`,
          role: "assistant",
          markdown: assistantMessage.markdown,
          citations: assistantMessage.citations,
        });
      }
    }

    return {
      metadata: {
        title: getTitle(documentRef),
        url: getPageUrl(documentRef, options),
        exportedAt: options.exportedAt || new Date().toISOString(),
        historyLoadStatus: options.historyLoadStatus || "unknown",
        messageCount: messages.length,
        sourceCount: sources.length,
      },
      sources,
      messages,
      warnings,
    };
  }

  function defaultWait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  function findChatScrollContainer(documentRef) {
    return queryFirst(documentRef, [
      ".chat-panel-content",
      ".chat-panel",
      '[aria-label="将对话面板滚动到底部"]',
    ]);
  }

  function countLoadedMessages(documentRef) {
    const pairCount = queryAll(documentRef, ".chat-message-pair").length;
    if (pairCount > 0) {
      return pairCount;
    }

    const chatMessageCount = queryAll(documentRef, "chat-message").length;
    if (chatMessageCount > 0) {
      return chatMessageCount;
    }

    return queryAll(documentRef, ".individual-message").length;
  }

  function hasLoadingIndicator(documentRef) {
    const candidates = queryAll(
      documentRef,
      [
        ".loading",
        ".spinner",
        ".mat-mdc-progress-spinner",
        "mat-progress-spinner",
        '[aria-busy="true"]',
      ].join(","),
    );

    return candidates.some((candidate) => visibleText(candidate) || getTagName(candidate) !== "");
  }

  async function loadFullHistory(documentRef, options = {}) {
    const container = findChatScrollContainer(documentRef);

    if (!container) {
      return {
        status: "container_not_found",
        attempts: 0,
        messageCount: 0,
      };
    }

    const wait = options.wait || (() => defaultWait(options.waitMs || 500));
    const stableChecks = Number(options.stableChecks || 3);
    const maxAttempts = Number(options.maxAttempts || 80);
    let previousCount = countLoadedMessages(documentRef);
    let stableCount = 0;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts += 1;

      if (typeof container.scrollTop === "number") {
        container.scrollTop = 0;
      }

      await wait();

      const currentCount = countLoadedMessages(documentRef);
      const atTop = typeof container.scrollTop !== "number" || container.scrollTop === 0;
      const loading = hasLoadingIndicator(documentRef);

      if (currentCount === previousCount && atTop && !loading) {
        stableCount += 1;
      } else {
        stableCount = 0;
      }

      previousCount = currentCount;

      if (stableCount >= stableChecks) {
        return {
          status: "complete",
          attempts,
          messageCount: currentCount,
        };
      }
    }

    return {
      status: "timeout",
      attempts,
      messageCount: countLoadedMessages(documentRef),
    };
  }

  return {
    extractNotebookData,
    extractFormulaMarkdown,
    loadFullHistory,
    renderMarkdown,
  };
});
