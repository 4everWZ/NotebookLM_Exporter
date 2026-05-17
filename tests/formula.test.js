const test = require("node:test");
const assert = require("node:assert/strict");

const { extractFormulaMarkdown } = require("../src/extension/core.js");

function fakeFormulaElement({ className = "", text = "", annotation = "" } = {}) {
  return {
    className,
    textContent: text,
    getAttribute(name) {
      return name === "class" ? className : null;
    },
    classList: {
      contains(token) {
        return className.split(/\s+/).includes(token);
      },
    },
    matches(selector) {
      if (selector === ".katex-display") {
        return className.split(/\s+/).includes("katex-display");
      }
      if (selector === ".katex") {
        return className.split(/\s+/).includes("katex");
      }
      return false;
    },
    querySelector(selector) {
      if (selector === 'annotation[encoding="application/x-tex"]' && annotation) {
        return { textContent: annotation };
      }
      return null;
    },
  };
}

test("extracts inline LaTeX from a KaTeX annotation", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    fakeFormulaElement({ className: "katex", text: "x squared", annotation: "x^2" }),
    warnings,
  );

  assert.equal(markdown, "$x^2$");
  assert.deepEqual(warnings, []);
});

test("extracts block LaTeX from display math", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    fakeFormulaElement({ className: "katex katex-display", text: "sum", annotation: "\\sum_i x_i" }),
    warnings,
  );

  assert.equal(markdown, "$$\n\\sum_i x_i\n$$");
  assert.deepEqual(warnings, []);
});

test("preserves visible formula text and emits a warning when LaTeX is unavailable", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    fakeFormulaElement({ className: "katex", text: "visible formula" }),
    warnings,
  );

  assert.equal(markdown, "visible formula");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "unsupported_formula");
  assert.match(warnings[0].message, /visible formula/);
});
