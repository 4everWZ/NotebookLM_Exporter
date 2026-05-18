const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function fail(message) {
  console.error(`Extension verification failed: ${message}`);
  process.exitCode = 1;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(root, filePath)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const manifestPath = path.join(root, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  fail("manifest.json is missing");
  process.exit();
}

const manifest = readJson(manifestPath);

if (!manifest) {
  process.exit();
}

if (manifest.manifest_version !== 3) {
  fail("manifest.json must use manifest_version 3");
}

if (!manifest.action || manifest.action.default_popup !== "src/extension/popup.html") {
  fail("manifest action.default_popup must be src/extension/popup.html");
}

if (!Array.isArray(manifest.permissions) || !manifest.permissions.includes("activeTab")) {
  fail("manifest permissions must include activeTab for popup tab messaging");
}

if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
  fail("manifest.json must define content_scripts");
} else {
  const scripts = manifest.content_scripts[0].js || [];
  for (const requiredScript of ["src/extension/core.js", "src/extension/content-script.js"]) {
    if (!scripts.includes(requiredScript)) {
      fail(`content_scripts[0].js must include ${requiredScript}`);
    }
  }
}

for (const requiredFile of [
  "src/extension/core.js",
  "src/extension/content-script.js",
  "src/extension/popup.html",
  "src/extension/popup.css",
  "src/extension/popup.js",
]) {
  if (!exists(requiredFile)) {
    fail(`${requiredFile} is missing`);
  }
}

const popupHtml = readText("src/extension/popup.html");
for (const requiredId of [
  "status",
  "scan-conversation",
  "message-count",
  "source-count",
  "history-status",
  "mode-all",
  "mode-selected",
  "message-list",
  "export-markdown",
]) {
  if (!popupHtml.includes(`id="${requiredId}"`)) {
    fail(`popup.html must include #${requiredId}`);
  }
}

const contentScript = readText("src/extension/content-script.js");
for (const requiredMessageType of ["NOTEBOOKLM_SCAN_CONVERSATION", "NOTEBOOKLM_EXPORT_MARKDOWN"]) {
  if (!contentScript.includes(requiredMessageType)) {
    fail(`content-script.js must include ${requiredMessageType}`);
  }
}

const popupJs = readText("src/extension/popup.js");
if (popupJs.includes("scanActiveTab();")) {
  fail("popup.js must not auto-scan on load; scan must be triggered by #scan-conversation");
}
if (!popupJs.includes('document.getElementById("scan-conversation")')) {
  fail("popup.js must bind #scan-conversation");
}
if (!popupJs.includes("message-preview")) {
  fail("popup.js must render message previews with .message-preview for bounded popup layout");
}

const popupCss = readText("src/extension/popup.css");
const bodyRule = popupCss.match(/body\s*\{[^}]*\}/);
if (!bodyRule || !/(^|[;{\s])width:\s*360px\b/.test(bodyRule[0])) {
  fail("popup.css body must set width: 360px so long previews cannot make the popup super wide");
}
if (!/grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)/.test(popupCss)) {
  fail("popup.css .message-row must use minmax(0, 1fr) so long previews cannot widen the popup");
}

const previewRule = popupCss.match(/\.message-preview\s*\{[^}]*\}/);
if (!previewRule) {
  fail("popup.css must define .message-preview");
} else {
  for (const requiredDeclaration of [
    /min-width:\s*0\b/,
    /overflow:\s*hidden\b/,
    /white-space:\s*nowrap\b/,
    /text-overflow:\s*ellipsis\b/,
  ]) {
    if (!requiredDeclaration.test(previewRule[0])) {
      fail(`popup.css .message-preview is missing ${requiredDeclaration}`);
    }
  }
}

if (process.exitCode) {
  process.exit();
}

console.log("Extension verification passed.");
