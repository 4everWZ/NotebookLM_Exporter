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

if (process.exitCode) {
  process.exit();
}

console.log("Extension verification passed.");
