const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

class FakeTextNode {
  constructor(text) {
    this.nodeType = TEXT_NODE;
    this.textContent = text;
    this.parentNode = null;
  }
}

class FakeElement {
  constructor(tagName, attrs = {}, children = []) {
    this.nodeType = ELEMENT_NODE;
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attrs };
    this.parentNode = null;
    this.childNodes = children.map((child) => {
      const node = typeof child === "string" ? new FakeTextNode(child) : child;
      node.parentNode = this;
      return node;
    });
    this.children = this.childNodes.filter((child) => child.nodeType === ELEMENT_NODE);
    this.value = attrs.value || "";
    this.scrollTop = Number(attrs.scrollTop || 0);
    this.scrollHeight = Number(attrs.scrollHeight || 0);
    this.clientHeight = Number(attrs.clientHeight || 0);
  }

  get className() {
    return this.attributes.class || "";
  }

  get classList() {
    return {
      contains: (token) => this.className.split(/\s+/).filter(Boolean).includes(token),
    };
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent || "").join("");
  }

  set textContent(value) {
    this.childNodes = [new FakeTextNode(value)];
    this.childNodes[0].parentNode = this;
    this.children = [];
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }

  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name);
  }

  matches(selector) {
    return selector
      .split(",")
      .map((part) => part.trim())
      .some((part) => matchesSimpleSelector(this, part));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const selectors = selector
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const results = [];

    for (const child of walk(this)) {
      if (child === this) {
        continue;
      }
      if (selectors.some((part) => matchesSelectorChain(child, part))) {
        results.push(child);
      }
    }

    return results;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches && current.matches(selector)) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }
}

class FakeDocument extends FakeElement {
  constructor({ title = "", url = "https://notebooklm.google.com/notebook/example", children = [] } = {}) {
    super("document", {}, children);
    this.title = title;
    this.URL = url;
    this.location = { href: url };
  }
}

function walk(root) {
  const nodes = [root];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.children) {
      nodes.push(...node.children);
    }
  }
  return nodes;
}

function matchesSelectorChain(element, selector) {
  const parts = selector.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return matchesSimpleSelector(element, parts[0]);
  }

  if (!matchesSimpleSelector(element, parts[parts.length - 1])) {
    return false;
  }

  let ancestor = element.parentNode;
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    while (ancestor && !matchesSimpleSelector(ancestor, parts[index])) {
      ancestor = ancestor.parentNode;
    }
    if (!ancestor) {
      return false;
    }
    ancestor = ancestor.parentNode;
  }

  return true;
}

function matchesSimpleSelector(element, selector) {
  if (!selector || !element || element.nodeType !== ELEMENT_NODE) {
    return false;
  }

  const attrMatch = selector.match(/\[([^=\]]+)(?:="([^"]*)")?\]/);
  const attrName = attrMatch ? attrMatch[1] : "";
  const attrValue = attrMatch ? attrMatch[2] : undefined;
  const withoutAttr = selector.replace(/\[[^\]]+\]/g, "");
  const classMatches = [...withoutAttr.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((match) => match[1]);
  const tag = withoutAttr.replace(/\.[A-Za-z0-9_-]+/g, "").trim();

  if (tag && tag !== "*" && element.tagName.toLowerCase() !== tag.toLowerCase()) {
    return false;
  }

  if (classMatches.some((className) => !element.classList.contains(className))) {
    return false;
  }

  if (attrName) {
    if (!element.hasAttribute(attrName)) {
      return false;
    }
    if (attrValue !== undefined && element.getAttribute(attrName) !== attrValue) {
      return false;
    }
  }

  return true;
}

function el(tagName, attrs, children) {
  return new FakeElement(tagName, attrs, children);
}

function doc(options) {
  return new FakeDocument(options);
}

module.exports = {
  ELEMENT_NODE,
  TEXT_NODE,
  FakeDocument,
  FakeElement,
  FakeTextNode,
  doc,
  el,
};
