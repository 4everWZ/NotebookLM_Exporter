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

  function renderSummary(summary) {
    const markdown = String((summary && summary.markdown) || summary || "").trim();
    return markdown ? ["## Notebook Summary", "", markdown].join("\n") : "";
  }

  function renderMarkdown(exportData) {
    const data = exportData || {};
    const metadata = data.metadata || {};
    const title = metadata.title || "NotebookLM Export";

    const frontmatter = [
      "---",
      `title: ${yamlString(title)}`,
      `source_url: ${yamlString(metadata.url || "")}`,
      `exported_at: ${yamlString(metadata.exportedAt || "")}`,
      `history_load_status: ${yamlString(metadata.historyLoadStatus || "unknown")}`,
      `export_mode: ${yamlString(metadata.exportMode || "all")}`,
      `message_count: ${numberValue(metadata.messageCount)}`,
      `selected_message_count: ${numberValue(metadata.selectedMessageCount ?? metadata.messageCount)}`,
      `source_count: ${numberValue(metadata.sourceCount)}`,
      "---",
    ];
    const conversation = ["## Conversation", "", renderMessages(data.messages)].filter((section) => section !== "").join("\n");
    const sections = [
      `# ${title}`,
      renderSummary(data.summary),
      conversation,
      renderSources(data.sources),
      renderWarnings(data.warnings),
    ];

    return `${frontmatter.join("\n")}\n\n${sections.filter((section) => section !== "").join("\n\n").trimEnd()}\n`;
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

  function directChildren(element) {
    return Array.from((element && element.children) || []).filter(isElement);
  }

  function childNodes(element) {
    return Array.from((element && element.childNodes) || []);
  }

  function firstChildWithClass(element, className) {
    return directChildren(element).find((child) => hasClass(child, className)) || null;
  }

  function closestWithClass(element, className, stopAt) {
    let current = element && element.parentNode;
    while (current && current !== stopAt) {
      if (hasClass(current, className)) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  function hasAncestorClass(element, className) {
    let current = element && element.parentNode;
    while (current) {
      if (hasClass(current, className)) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }

  function walkElementLike(root) {
    const results = [];
    const stack = root ? [root] : [];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current.getAttribute !== "function") {
        continue;
      }

      results.push(current);
      const children = childNodes(current).filter((child) => child && typeof child.getAttribute === "function");
      for (let index = children.length - 1; index >= 0; index -= 1) {
        stack.push(children[index]);
      }
    }

    return results;
  }

  function getTrimmedAttribute(element, name) {
    if (!element || typeof element.getAttribute !== "function") {
      return "";
    }
    return String(element.getAttribute(name) || "").trim();
  }

  function getFormulaAttributeSource(element) {
    const attributeNames = ["data-math", "data-latex", "data-tex"];

    for (const candidate of walkElementLike(element)) {
      for (const attributeName of attributeNames) {
        const value = getTrimmedAttribute(candidate, attributeName);
        if (value) {
          return value;
        }
      }
    }

    return "";
  }

  function getFormulaAnnotation(element) {
    if (!element || typeof element.querySelector !== "function") {
      return "";
    }

    const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
    if (annotation && annotation.textContent) {
      return annotation.textContent.trim();
    }

    let fallback = "";
    for (const candidate of walkElementLike(element)) {
      if (getTagName(candidate) !== "annotation") {
        continue;
      }

      const value = String(candidate.textContent || "").trim();
      if (!value) {
        continue;
      }

      const encoding = getTrimmedAttribute(candidate, "encoding").toLowerCase();
      if (encoding.includes("x-tex") || encoding === "tex" || encoding === "latex") {
        return value;
      }

      fallback = fallback || value;
    }

    return fallback;
  }

  function stripFormulaDelimiters(latex) {
    const trimmed = String(latex || "").trim();

    if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
      return trimmed.slice(2, -2).trim();
    }

    if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]")) {
      return trimmed.slice(2, -2).trim();
    }

    if (trimmed.startsWith("\\(") && trimmed.endsWith("\\)")) {
      return trimmed.slice(2, -2).trim();
    }

    if (trimmed.startsWith("$") && trimmed.endsWith("$")) {
      return trimmed.slice(1, -1).trim();
    }

    return trimmed;
  }

  const TEXT_SYMBOL_LATEX = new Map([
    ["α", "\\alpha"],
    ["β", "\\beta"],
    ["γ", "\\gamma"],
    ["δ", "\\delta"],
    ["ϵ", "\\epsilon"],
    ["ε", "\\epsilon"],
    ["θ", "\\theta"],
    ["λ", "\\lambda"],
    ["μ", "\\mu"],
    ["π", "\\pi"],
    ["ρ", "\\rho"],
    ["σ", "\\sigma"],
    ["τ", "\\tau"],
    ["φ", "\\phi"],
    ["ω", "\\omega"],
    ["Γ", "\\Gamma"],
    ["Δ", "\\Delta"],
    ["Θ", "\\Theta"],
    ["Λ", "\\Lambda"],
    ["Π", "\\Pi"],
    ["Σ", "\\Sigma"],
    ["Φ", "\\Phi"],
    ["Ω", "\\Omega"],
    ["∑", "\\sum"],
    ["∏", "\\prod"],
    ["∈", "\\in"],
    ["∉", "\\notin"],
    ["∅", "\\emptyset"],
    ["∃", "\\exists"],
    ["∀", "\\forall"],
    ["∞", "\\infty"],
    ["≤", "\\le"],
    ["≥", "\\ge"],
    ["≠", "\\ne"],
    ["≈", "\\approx"],
    ["∩", "\\cap"],
    ["∪", "\\cup"],
    ["⊂", "\\subset"],
    ["⊆", "\\subseteq"],
    ["⊃", "\\supset"],
    ["⊇", "\\supseteq"],
    ["×", "\\times"],
    ["÷", "\\div"],
    ["±", "\\pm"],
    ["%", "\\%"],
    ["−", "-"],
    ["→", "\\to"],
    ["←", "\\leftarrow"],
    ["↔", "\\leftrightarrow"],
    ["⇒", "\\Rightarrow"],
    ["⇐", "\\Leftarrow"],
    ["⇔", "\\Leftrightarrow"],
    ["⟺", "\\Longleftrightarrow"],
    ["∣", "|"],
    ["‖", "\\|"],
    ["√", "\\sqrt"],
  ]);

  const NAMED_OPERATORS = new Set(["arccos", "arcsin", "arctan", "cos", "det", "dim", "exp", "ln", "log", "max", "min", "sin", "tan"]);
  const LATEX_COMMANDS_REQUIRING_BOUNDARY = [
    "Rightarrow",
    "Leftarrow",
    "Leftrightarrow",
    "Longleftrightarrow",
    "leftrightarrow",
    "leftarrow",
    "notin",
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "emptyset",
    "exists",
    "forall",
    "theta",
    "lambda",
    "mu",
    "pi",
    "rho",
    "sigma",
    "tau",
    "phi",
    "omega",
    "Gamma",
    "Delta",
    "Theta",
    "Lambda",
    "Pi",
    "Sigma",
    "Phi",
    "Omega",
    "sum",
    "prod",
    "in",
    "le",
    "ge",
    "ne",
    "approx",
    "cap",
    "cup",
    "subset",
    "subseteq",
    "supset",
    "supseteq",
    "times",
    "div",
    "pm",
    "to",
    ...NAMED_OPERATORS,
  ];
  const LATEX_COMMAND_BOUNDARY_PATTERNS = LATEX_COMMANDS_REQUIRING_BOUNDARY.map((command) => ({
    followedByIdentifier: new RegExp(`\\\\${command}(?=[A-Za-z0-9])`, "g"),
    followedByCommand: new RegExp(`\\\\${command}(?=\\\\[A-Za-z])`, "g"),
    replacement: `\\${command} `,
  }));

  function normalizeKatexText(text, element) {
    const raw = String(text || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\uE020\s*=/g, "\\ne")
      .trim();
    if (!raw) {
      return "";
    }

    if (hasClass(element, "mathbb")) {
      return `\\mathbb{${raw}}`;
    }

    if (hasClass(element, "mathcal")) {
      return `\\mathcal{${raw}}`;
    }

    if (hasClass(element, "mop") && NAMED_OPERATORS.has(raw)) {
      return `\\${raw}`;
    }

    if (NAMED_OPERATORS.has(raw) && !hasClass(element, "mathnormal")) {
      return `\\${raw}`;
    }

    return Array.from(raw)
      .map((character) => TEXT_SYMBOL_LATEX.get(character) || character)
      .join("");
  }

  function formatLatexScript(marker, latex) {
    const value = String(latex || "").trim();
    if (!value) {
      return "";
    }

    return /^[A-Za-z0-9]$/.test(value) ? `${marker}${value}` : `${marker}{${value}}`;
  }

  function parseTopValue(element) {
    let current = element;
    while (current) {
      const style = getTrimmedAttribute(current, "style");
      const match = style.match(/(?:^|;)\s*top:\s*(-?\d+(?:\.\d+)?)em\b/);
      if (match) {
        return Number(match[1]);
      }
      current = current.parentNode;
    }
    return Number.NaN;
  }

  function parseKatexNode(node) {
    if (isText(node)) {
      return normalizeKatexText(node.textContent, null);
    }

    if (!isElement(node)) {
      return "";
    }

    return parseKatexElement(node);
  }

  function parseKatexNodes(nodes) {
    return Array.from(nodes || [])
      .map((node) => parseKatexNode(node))
      .join("");
  }

  function hasDirectChildWithClass(element, className) {
    return directChildren(element).some((child) => hasClass(child, className));
  }

  function shouldIgnoreKatexElement(element) {
    return ["strut", "pstrut", "mspace", "vlist-s", "frac-line", "msupsub"].some((className) =>
      hasClass(element, className),
    );
  }

  function primaryVlistRows(element) {
    const vlistT = firstChildWithClass(element, "vlist-t");
    const vlistR = firstChildWithClass(vlistT, "vlist-r");
    const vlist = firstChildWithClass(vlistR, "vlist");
    return directChildren(vlist);
  }

  function parseKatexRow(row) {
    return parseKatexNodes(childNodes(row)).trim();
  }

  function sortedVisualRows(element) {
    return primaryVlistRows(element)
      .map((row, index) => ({
        index,
        top: parseTopValue(row),
        latex: parseKatexRow(row),
      }))
      .filter((row) => row.latex)
      .sort((left, right) => {
        const leftTop = Number.isFinite(left.top) ? left.top : left.index;
        const rightTop = Number.isFinite(right.top) ? right.top : right.index;
        return leftTop - rightTop;
      });
  }

  function parseKatexFraction(element) {
    const rows = sortedVisualRows(element);
    if (rows.length < 2) {
      return parseKatexNodes(childNodes(element));
    }

    const numerator = rows[0].latex;
    const denominator = rows[rows.length - 1].latex;
    return `\\frac{${numerator}}{${denominator}}`;
  }

  function parseKatexOperatorLimits(element) {
    const rows = sortedVisualRows(element);
    const operatorIndex = rows.findIndex((row) => /\\(?:sum|prod)|[∑∏]/.test(row.latex));

    if (operatorIndex === -1) {
      return parseKatexNodes(childNodes(element));
    }

    const operator = rows[operatorIndex].latex;
    const superscript = rows.slice(0, operatorIndex).map((row) => row.latex).join("");
    const subscript = rows.slice(operatorIndex + 1).map((row) => row.latex).join("");
    return `${operator}${formatLatexScript("_", subscript)}${formatLatexScript("^", superscript)}`;
  }

  function topLevelScriptCandidates(msupsub) {
    return queryAll(msupsub, ".sizing").filter((candidate) => !closestWithClass(candidate, "sizing", msupsub));
  }

  function parseKatexScripts(msupsub) {
    const candidates = topLevelScriptCandidates(msupsub).map((candidate, index) => ({
      index,
      top: parseTopValue(candidate),
      latex: parseKatexNodes(childNodes(candidate)).trim(),
    })).filter((candidate) => candidate.latex);

    if (candidates.length === 0) {
      return { subscript: "", superscript: "" };
    }

    candidates.sort((left, right) => {
      const leftTop = Number.isFinite(left.top) ? left.top : left.index;
      const rightTop = Number.isFinite(right.top) ? right.top : right.index;
      return leftTop - rightTop;
    });

    if (candidates.length === 1) {
      const vlistT = queryFirst(msupsub, [".vlist-t"]);
      if (hasClass(vlistT, "vlist-t2")) {
        return { subscript: candidates[0].latex, superscript: "" };
      }
      return { subscript: "", superscript: candidates[0].latex };
    }

    return {
      subscript: candidates[candidates.length - 1].latex,
      superscript: candidates[0].latex,
    };
  }

  function parseKatexScriptedElement(element) {
    const nodes = childNodes(element);
    const scriptIndex = nodes.findIndex((node) => isElement(node) && hasClass(node, "msupsub"));

    if (scriptIndex === -1) {
      return "";
    }

    const base = parseKatexNodes(nodes.slice(0, scriptIndex));
    const scripts = parseKatexScripts(nodes[scriptIndex]);
    const after = parseKatexNodes(nodes.slice(scriptIndex + 1));
    return `${base}${formatLatexScript("_", scripts.subscript)}${formatLatexScript("^", scripts.superscript)}${after}`;
  }

  function parseKatexElement(element) {
    if (shouldIgnoreKatexElement(element)) {
      return "";
    }

    if (hasClass(element, "mfrac")) {
      return parseKatexFraction(element);
    }

    if (hasClass(element, "op-limits")) {
      return parseKatexOperatorLimits(element);
    }

    if (hasDirectChildWithClass(element, "msupsub")) {
      return parseKatexScriptedElement(element);
    }

    const children = childNodes(element);
    if (children.length === 0) {
      return normalizeKatexText(element.textContent, element);
    }

    if (!children.some(isElement)) {
      return normalizeKatexText(element.textContent, element);
    }

    return parseKatexNodes(children);
  }

  function inferKatexVisualLatex(element) {
    const katexHtml = hasClass(element, "katex-html") ? element : queryFirst(element, [".katex-html"]);
    if (!katexHtml) {
      return "";
    }

    return normalizeInferredKatexLatex(parseKatexElement(katexHtml));
  }

  function normalizeInferredKatexLatex(latex) {
    let normalized = String(latex || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\uE020\s*=/g, "\\ne")
      .trim();

    for (const pattern of LATEX_COMMAND_BOUNDARY_PATTERNS) {
      normalized = normalized
        .replace(pattern.followedByIdentifier, pattern.replacement)
        .replace(pattern.followedByCommand, pattern.replacement);
    }

    return normalized;
  }

  function hasUnsupportedInferredLatex(latex) {
    return /[\uE000-\uF8FF#&]/.test(String(latex || ""));
  }

  function getFormulaLatexSource(element) {
    const attributeSource = stripFormulaDelimiters(getFormulaAttributeSource(element));
    if (attributeSource) {
      return { latex: attributeSource, source: "attribute" };
    }

    const annotationSource = stripFormulaDelimiters(getFormulaAnnotation(element));
    if (annotationSource) {
      return { latex: annotationSource, source: "annotation" };
    }

    const inferredSource = stripFormulaDelimiters(inferKatexVisualLatex(element));
    if (!inferredSource) {
      return { latex: "", source: "none" };
    }

    if (hasUnsupportedInferredLatex(inferredSource)) {
      return { latex: "", source: "visual", rejected: true };
    }

    return { latex: inferredSource, source: "visual" };
  }

  function formatFormulaMarkdown(latex, display) {
    return display ? `\n\n$$\n${latex}\n$$\n\n` : `$${latex}$`;
  }

  function isDisplayFormula(element) {
    if (!element) {
      return false;
    }

    if (typeof element.matches === "function" && element.matches(".katex-display")) {
      return true;
    }

    return hasClass(element, "katex-display") || hasAncestorClass(element, "katex-display");
  }

  function addWarning(warnings, code, message) {
    if (Array.isArray(warnings)) {
      warnings.push({ code, message });
    }
  }

  function extractFormulaMarkdown(element, warnings) {
    const formulaSource = getFormulaLatexSource(element);
    const latex = formulaSource.latex;

    if (latex) {
      return formatFormulaMarkdown(latex, isDisplayFormula(element));
    }

    const visibleText = String((element && element.textContent) || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
    if (!visibleText) {
      return "";
    }

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

  function trimOuterBlankLines(text) {
    return String(text || "").replace(/^\n+|\n+$/g, "");
  }

  function normalizeInline(text) {
    return String(text || "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();
  }

  function getTagName(element) {
    return String((element && element.tagName) || "").toLowerCase();
  }

  const BLOCK_TAGS = new Set([
    "blockquote",
    "div",
    "element-list-renderer",
    "hr",
    "labs-tailwind-doc-viewer",
    "labs-tailwind-structural-element-view-v2",
    "mat-card-content",
    "ol",
    "p",
    "paragraph-element-view",
    "pre",
    "section",
    "table",
    "ul",
  ]);

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

  function isHeadingTag(tagName) {
    return /^h[1-6]$/.test(tagName);
  }

  function getHeadingLevel(element, context = {}) {
    const tagName = getTagName(element);

    if (isHeadingTag(tagName)) {
      return Number(tagName.slice(1));
    }

    if (context.disableNotebookHeadings) {
      return 0;
    }

    const className = String((element && element.getAttribute && element.getAttribute("class")) || element?.className || "");
    const classLevel = className.match(/\bheading([1-6])\b/);
    if (classLevel) {
      return Number(classLevel[1]);
    }

    const role = element && element.getAttribute && element.getAttribute("role");
    const ariaLevel = element && element.getAttribute && Number(element.getAttribute("aria-level"));
    if (role === "heading" && Number.isInteger(ariaLevel) && ariaLevel >= 1 && ariaLevel <= 6) {
      return ariaLevel;
    }

    return 0;
  }

  function isBlockElement(element, context = {}) {
    const tagName = getTagName(element);
    return BLOCK_TAGS.has(tagName) || getHeadingLevel(element, context) > 0;
  }

  function hasBlockChildren(element, context = {}) {
    return Array.from((element && element.children) || []).some((child) => isBlockElement(child, context));
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

  function listItemChildren(element) {
    const items = [];

    for (const child of Array.from((element && element.children) || [])) {
      if (getTagName(child) === "li") {
        items.push(child);
      } else if (["labs-tailwind-structural-element-view-v2", "paragraph-element-view"].includes(getTagName(child))) {
        items.push(...listItemChildren(child));
      }
    }

    return items;
  }

  function renderList(element, context, depth = 0) {
    return listItemChildren(element)
      .map((child, index) => {
        const marker = getTagName(element) === "ol" ? `${index + 1}.` : "-";
        const directParts = [];
        const nestedLists = [];

        for (const itemChild of Array.from(child.childNodes || [])) {
          if (isElement(itemChild) && ["ul", "ol"].includes(getTagName(itemChild))) {
            const nested = renderList(itemChild, context, depth + 1);
            if (nested) {
              nestedLists.push(nested);
            }
          } else if (isElement(itemChild) && (isBlockElement(itemChild, context) || hasBlockChildren(itemChild, context))) {
            directParts.push(renderBlockElement(itemChild, context));
          } else {
            directParts.push(nodeToMarkdown(itemChild, context));
          }
        }

        const prefix = "  ".repeat(depth);
        const itemText = normalizeInline(directParts.join(""));
        const currentLine = `${prefix}${marker}${itemText ? ` ${itemText}` : ""}`;
        return [currentLine, ...nestedLists].filter(Boolean).join("\n");
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
      const markdown = extractFormulaMarkdown(node, context.warnings);
      return markdown.startsWith("$") ? ` ${markdown} ` : markdown;
    }

    const tagName = getTagName(node);

    if (tagName === "br") {
      return "\n";
    }

    if (tagName === "pre") {
      return `\`\`\`text\n${trimOuterBlankLines(node.textContent)}\n\`\`\``;
    }

    if (tagName === "code") {
      return `\`${String(node.textContent || "").trim()}\``;
    }

    const headingLevel = getHeadingLevel(node, context);
    if (headingLevel) {
      const text = normalizeInline(renderInlineChildren(node, context));
      return text ? `${"#".repeat(headingLevel)} ${text}` : "";
    }

    if (tagName === "strong" || tagName === "b") {
      const text = normalizeInline(renderInlineChildren(node, context));
      return text ? `**${text}**` : "";
    }

    if (tagName === "em" || tagName === "i") {
      const text = normalizeInline(renderInlineChildren(node, context));
      return text ? `*${text}*` : "";
    }

    if (tagName === "a") {
      const text = normalizeInline(renderInlineChildren(node, context));
      const href = node.getAttribute && node.getAttribute("href");
      return text && href ? `[${text}](${href})` : text;
    }

    if (tagName === "ul" || tagName === "ol") {
      return renderList(node, context);
    }

    if (tagName === "table") {
      return renderTable(node);
    }

    return renderInlineChildren(node, context);
  }

  function renderBlockElement(element, context) {
    const tagName = getTagName(element);
    const headingLevel = getHeadingLevel(element, context);

    if (headingLevel || ["ul", "ol", "pre", "table"].includes(tagName)) {
      return nodeToMarkdown(element, context).trim();
    }

    if (tagName === "hr") {
      return "---";
    }

    if (tagName === "p") {
      return normalizeInline(renderInlineChildren(element, context));
    }

    if (tagName === "blockquote") {
      const markdown = elementToMarkdown(element, context);
      return markdown
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");
    }

    if (hasBlockChildren(element, context)) {
      return elementToMarkdown(element, context);
    }

    return normalizeInline(renderInlineChildren(element, context));
  }

  function elementToMarkdown(element, context) {
    const blockParts = [];
    let inlineBuffer = "";

    function flushInlineBuffer() {
      const text = normalizeInline(inlineBuffer);
      if (text) {
        blockParts.push(text);
      }
      inlineBuffer = "";
    }

    for (const child of Array.from(element.childNodes || [])) {
      if (isText(child)) {
        inlineBuffer += child.textContent || "";
        continue;
      }

      if (isElement(child) && (isBlockElement(child, context) || hasBlockChildren(child, context))) {
        flushInlineBuffer();
        const markdown = renderBlockElement(child, context).trim();
        if (markdown) {
          blockParts.push(markdown);
        }
      } else {
        inlineBuffer += nodeToMarkdown(child, context);
      }
    }

    flushInlineBuffer();

    if (blockParts.length === 0) {
      return visibleText(element);
    }

    return blockParts.join("\n\n");
  }

  function extractMessageMarkdown(container, warnings, options = {}) {
    const body = queryFirst(container, [".message-text-content", ".message-content"]) || container;
    const context = { citations: [], warnings, disableNotebookHeadings: Boolean(options.disableNotebookHeadings) };
    const markdown = elementToMarkdown(body, context);

    return {
      markdown,
      citations: context.citations,
    };
  }

  function extractNotebookSummary(documentRef, warnings) {
    const summaryContainer = queryFirst(documentRef, [".summary-content", ".notebook-summary"]);

    if (!summaryContainer) {
      return null;
    }

    const context = { citations: [], warnings };
    const markdown = elementToMarkdown(summaryContainer, context).trim();
    return markdown ? { markdown } : null;
  }

  function extractNotebookData(documentRef, options = {}) {
    const warnings = [];
    const sources = extractSources(documentRef);
    const summary = extractNotebookSummary(documentRef, warnings);
    const pairs = queryAll(documentRef, ".chat-message-pair");
    const messages = [];

    for (const pair of pairs) {
      const userContainer = queryFirst(pair, [".from-user-message-inner-content", ".from-user-message-card-content"]);
      const assistantContainer = queryFirst(pair, [".to-user-message-inner-content", ".to-user-message-card-content"]);

      if (userContainer) {
        const userMessage = extractMessageMarkdown(userContainer, warnings, { disableNotebookHeadings: true });
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
      summary,
      sources,
      messages,
      warnings,
    };
  }

  function createMessagePreview(markdown) {
    return String(markdown || "")
      .replace(/```[\s\S]*?```/g, " code ")
      .replace(/[#>*_`[\]()|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);
  }

  function normalizeExportOptions(options = {}) {
    return {
      mode: options.mode === "selected" ? "selected" : "all",
      selectedMessageIds: Array.isArray(options.selectedMessageIds) ? options.selectedMessageIds : [],
    };
  }

  function filterExportData(exportData, options = {}) {
    const data = exportData || {};
    const normalizedOptions = normalizeExportOptions(options);
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const sources = Array.isArray(data.sources) ? data.sources : [];
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    let selectedMessages = messages;

    if (normalizedOptions.mode === "selected") {
      const selectedIds = new Set(normalizedOptions.selectedMessageIds.filter(Boolean));

      if (selectedIds.size === 0) {
        throw new Error("Selected export requires at least one checked message.");
      }

      selectedMessages = messages.filter((message) => selectedIds.has(message.id));

      if (selectedMessages.length !== selectedIds.size) {
        throw new Error("Selected messages were not found in the current conversation.");
      }
    }

    return {
      ...data,
      metadata: {
        ...(data.metadata || {}),
        exportMode: normalizedOptions.mode,
        messageCount: selectedMessages.length,
        selectedMessageCount: selectedMessages.length,
        sourceCount: sources.length,
      },
      sources: [...sources],
      messages: [...selectedMessages],
      warnings: [...warnings],
    };
  }

  function createConversationStatus(exportData, history = {}) {
    const data = exportData || {};
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const sources = Array.isArray(data.sources) ? data.sources : [];
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    const historyStatus = history.status || (data.metadata && data.metadata.historyLoadStatus) || "unknown";
    const status = historyStatus === "complete" && messages.length === 0 ? "no_messages" : historyStatus;
    const ok = status === "complete";
    const response = {
      ok,
      status,
      messageCount: messages.length,
      historyMessageCount: numberValue(history.messageCount ?? messages.length),
      sourceCount: sources.length,
      warningCount: warnings.length,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        preview: createMessagePreview(message.markdown),
      })),
    };

    if (!ok) {
      response.error =
        status === "no_messages"
          ? "No NotebookLM conversation messages were found."
          : `Could not confirm complete conversation history (${status}).`;
    }

    return response;
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
    const individualMessageCount = queryAll(documentRef, ".individual-message").length;
    if (individualMessageCount > 0) {
      return individualMessageCount;
    }

    const pairCount = queryAll(documentRef, ".chat-message-pair").length;
    if (pairCount > 0) {
      return pairCount;
    }

    const chatMessageCount = queryAll(documentRef, "chat-message").length;
    if (chatMessageCount > 0) {
      return chatMessageCount;
    }

    return 0;
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
    createConversationStatus,
    createMessagePreview,
    extractNotebookData,
    extractFormulaMarkdown,
    filterExportData,
    loadFullHistory,
    renderMarkdown,
  };
});
