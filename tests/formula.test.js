const test = require("node:test");
const assert = require("node:assert/strict");

const { extractFormulaMarkdown } = require("../src/extension/core.js");
const { el } = require("./helpers/fake-dom.js");

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

  assert.equal(markdown, "\n\n$$\n\\sum_i x_i\n$$\n\n");
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

test("extracts LaTeX from Gemini-style data-math attributes", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "math-inline", "data-math": "x^2 + y^2" }, ["x² + y²"]),
    warnings,
  );

  assert.equal(markdown, "$x^2 + y^2$");
  assert.deepEqual(warnings, []);
});

test("normalizes mathbbm indicator macros to KaTeX-compatible mathbb", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "math-inline", "data-math": "\\mathbbm{1}(x > 0)" }, ["1(x > 0)"]),
    warnings,
  );

  assert.equal(markdown, "$\\mathbb{1}(x > 0)$");
  assert.deepEqual(warnings, []);
});

test("keeps visual left arrow commands intact when adding LaTeX boundaries", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [el("span", { class: "mrel" }, ["←"])]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "$\\leftarrow$");
  assert.deepEqual(warnings, []);
});

test("extracts LaTeX from annotation encoding variants", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("math", {}, [
        el("semantics", {}, [
          el("mrow", {}, ["x"]),
          el("annotation", { encoding: "application/x-tex; mode=display" }, ["\\alpha_i"]),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "$\\alpha_i$");
  assert.deepEqual(warnings, []);
});

test("infers visual accent hats as LaTeX accent commands", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "mord accent" }, [
            el("span", { class: "vlist-t" }, [
              el("span", { class: "vlist-r" }, [
                el("span", { class: "vlist" }, [
                  el("span", { style: "top: -3em;" }, [
                    el("span", { class: "pstrut" }, []),
                    el("span", { class: "mord mathnormal" }, ["u"]),
                  ]),
                  el("span", { style: "top: -3em;" }, [
                    el("span", { class: "pstrut" }, []),
                    el("span", { class: "accent-body" }, [el("span", { class: "mord" }, ["^"])]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "$\\hat{u}$");
  assert.deepEqual(warnings, []);
});

test("keeps scripts attached to visual accent bases", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "mord" }, [
            el("span", { class: "mord accent" }, [
              el("span", { class: "vlist-t" }, [
                el("span", { class: "vlist-r" }, [
                  el("span", { class: "vlist" }, [
                    el("span", { style: "top: -3em;" }, [
                      el("span", { class: "pstrut" }, []),
                      el("span", { class: "mord mathnormal" }, ["z"]),
                    ]),
                    el("span", { style: "top: -3em;" }, [
                      el("span", { class: "pstrut" }, []),
                      el("span", { class: "accent-body" }, [el("span", { class: "mord" }, ["^"])]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
            el("span", { class: "msupsub" }, [
              el("span", { class: "vlist-t vlist-t2" }, [
                el("span", { class: "vlist-r" }, [
                  el("span", { class: "vlist" }, [
                    el("span", { style: "top: -2.4em;" }, [
                      el("span", { class: "pstrut" }, []),
                      el("span", { class: "sizing" }, [el("span", { class: "mord mathnormal" }, ["h"])]),
                    ]),
                    el("span", { style: "top: -3.2em;" }, [
                      el("span", { class: "pstrut" }, []),
                      el("span", { class: "sizing" }, [el("span", { class: "mord" }, ["K"])]),
                    ]),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "$\\hat{z}_h^K$");
  assert.deepEqual(warnings, []);
});

test("infers visual cases tables as parseable cases environments", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex katex-display" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "mord mathnormal" }, ["MAL"]),
          el("span", { class: "mrel" }, ["="]),
        ]),
        el("span", { class: "base" }, [
          el("span", { class: "minner" }, [
            el("span", { class: "mopen delimcenter" }, [el("span", { class: "delimsizing" }, ["{"])]),
            el("span", { class: "mord" }, [
              el("span", { class: "mtable" }, [
                el("span", { class: "col-align-l" }, [
                  el("span", { class: "vlist-t vlist-t2" }, [
                    el("span", { class: "vlist-r" }, [
                      el("span", { class: "vlist" }, [
                        el("span", { style: "top: -3.6em;" }, [
                          el("span", { class: "pstrut" }, []),
                          el("span", { class: "mord mathnormal" }, ["a"]),
                        ]),
                        el("span", { style: "top: -2.2em;" }, [
                          el("span", { class: "pstrut" }, []),
                          el("span", { class: "mord mathnormal" }, ["b"]),
                        ]),
                      ]),
                    ]),
                  ]),
                ]),
                el("span", { class: "col-align-l" }, [
                  el("span", { class: "vlist-t vlist-t2" }, [
                    el("span", { class: "vlist-r" }, [
                      el("span", { class: "vlist" }, [
                        el("span", { style: "top: -3.6em;" }, [
                          el("span", { class: "pstrut" }, []),
                          el("span", { class: "mord mathnormal" }, ["y"]),
                          el("span", { class: "mrel" }, ["="]),
                          el("span", { class: "mord" }, ["1"]),
                        ]),
                        el("span", { style: "top: -2.2em;" }, [
                          el("span", { class: "pstrut" }, []),
                          el("span", { class: "mord mathnormal" }, ["y"]),
                          el("span", { class: "mrel" }, ["="]),
                          el("span", { class: "mord" }, ["0"]),
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
    ]),
    warnings,
  );

  assert.equal(markdown, "\n\n$$\nMAL=\\begin{cases}a, & y=1\\\\b, & y=0\\end{cases}\n$$\n\n");
  assert.deepEqual(warnings, []);
});

test("infers simple NotebookLM KaTeX visual DOM with subscripts", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "strut" }, []),
          el("span", { class: "mord mathnormal" }, ["G"]),
          el("span", { class: "mord" }, [
            el("span", { class: "mord mathnormal" }, ["B"]),
            el("span", { class: "msupsub" }, [
              el("span", { class: "vlist-t vlist-t2" }, [
                el("span", { class: "vlist-r" }, [
                  el("span", { class: "vlist" }, [
                    el("span", { style: "top: -2.55em;" }, [
                      el("span", { class: "pstrut" }, []),
                      el("span", { class: "sizing reset-size6 size3 mtight" }, [
                        el("span", { class: "mord mathnormal mtight" }, ["i"]),
                      ]),
                    ]),
                  ]),
                ]),
                el("span", { class: "vlist-r" }, [el("span", { class: "vlist" }, [el("span", {}, [])])]),
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "$GB_i$");
  assert.deepEqual(warnings, []);
});

test("infers NotebookLM KaTeX fractions and superscripts from visual DOM", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex katex-display" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "mord" }, [
            el("span", { class: "mopen nulldelimiter" }, []),
            el("span", { class: "mfrac" }, [
              el("span", { class: "vlist-t vlist-t2" }, [
                el("span", { class: "vlist-r" }, [
                  el("span", { class: "vlist" }, [
                    el("span", { style: "top: -2.655em;" }, [
                      el("span", { class: "pstrut" }, []),
                      el("span", { class: "sizing reset-size6 size3 mtight" }, [
                        el("span", { class: "mord mtight" }, [
                          el("span", { class: "mord mathnormal mtight" }, ["n"]),
                        ]),
                      ]),
                    ]),
                    el("span", { style: "top: -3.23em;" }, [
                      el("span", { class: "pstrut" }, []),
                      el("span", { class: "frac-line" }, []),
                    ]),
                    el("span", { style: "top: -3.394em;" }, [
                      el("span", { class: "pstrut" }, []),
                      el("span", { class: "sizing reset-size6 size3 mtight" }, [
                        el("span", { class: "mord mtight" }, [
                          el("span", { class: "mord mathnormal mtight" }, ["x"]),
                          el("span", { class: "msupsub" }, [
                            el("span", { class: "vlist-t" }, [
                              el("span", { class: "vlist-r" }, [
                                el("span", { class: "vlist" }, [
                                  el("span", { style: "top: -2.786em;" }, [
                                    el("span", { class: "pstrut" }, []),
                                    el("span", { class: "sizing reset-size3 size1 mtight" }, [
                                      el("span", { class: "mord mtight" }, ["2"]),
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
                ]),
              ]),
            ]),
            el("span", { class: "mclose nulldelimiter" }, []),
          ]),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "\n\n$$\n\\frac{x^2}{n}\n$$\n\n");
  assert.deepEqual(warnings, []);
});

test("ignores empty NotebookLM KaTeX spacing nodes without warnings", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "strut", style: "height: 0em;" }, []),
          el("span", { class: "mspace", style: "margin-right: 1em;" }, []),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "");
  assert.deepEqual(warnings, []);
});

test("ignores zero-width-only formula fallback text without warnings", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(fakeFormulaElement({ className: "katex", text: "\u200B" }), warnings);

  assert.equal(markdown, "");
  assert.deepEqual(warnings, []);
});

test("keeps inferred LaTeX commands separated from following identifiers", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "mord mathnormal" }, ["x"]),
          el("span", { class: "mrel" }, ["∈"]),
          el("span", { class: "mord mathnormal" }, ["GB"]),
          el("span", { class: "mrel" }, ["→"]),
          el("span", { class: "mord" }, ["0"]),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "$x\\in GB\\to 0$");
  assert.deepEqual(warnings, []);
});

test("maps visual-only mathematical symbols to KaTeX-parseable commands", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "mord mathnormal" }, ["Q"]),
          el("span", { class: "mrel" }, ["\uE020"]),
          el("span", { class: "mrel" }, ["="]),
          el("span", { class: "mord" }, ["∅"]),
          el("span", { class: "mrel" }, ["⟺"]),
          el("span", { class: "mord" }, ["∃"]),
          el("span", { class: "mord mathnormal" }, ["x"]),
          el("span", { class: "mbin" }, ["∩"]),
          el("span", { class: "mord mathnormal" }, ["B"]),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "$Q\\ne \\emptyset \\Longleftrightarrow \\exists x\\cap B$");
  assert.deepEqual(warnings, []);
});

test("escapes percent signs in inferred LaTeX formulas", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [
          el("span", { class: "mord mathnormal" }, ["q"]),
          el("span", { class: "mrel" }, ["="]),
          el("span", { class: "mord" }, ["95%"]),
        ]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "$q=95\\%$");
  assert.deepEqual(warnings, []);
});

test("falls back to visible text with warning when visual inference has unsupported symbols", () => {
  const warnings = [];
  const markdown = extractFormulaMarkdown(
    el("span", { class: "katex" }, [
      el("span", { class: "katex-html", "aria-hidden": "true" }, [
        el("span", { class: "base" }, [el("span", { class: "mord" }, ["Q\uE123=0"])]),
      ]),
    ]),
    warnings,
  );

  assert.equal(markdown, "Q\uE123=0");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "unsupported_formula");
  assert.match(warnings[0].message, /Q\uE123=0/);
});
