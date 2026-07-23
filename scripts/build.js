const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const ignored = new Set([
  ".git",
  ".netlify",
  "dist",
  "docs",
  "netlify",
  "node_modules",
  "package.json",
  "README.md",
  "scripts",
  "netlify.toml"
]);
const assetMap = new Map();

function rmDir(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function hashFile(source) {
  const buffer = fs.readFileSync(source);
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 12);
}

function shouldFingerprint(relativePath) {
  return relativePath === "assets/css/styles.css" || relativePath === "assets/js/main.js";
}

function fingerprintName(relativePath) {
  const parsed = path.parse(relativePath);
  const hash = hashFile(path.join(root, relativePath));
  return path.join(parsed.dir, `${parsed.name}.${hash}${parsed.ext}`).replaceAll(path.sep, "/");
}

function copyTree(sourceDir, targetDir) {
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (ignored.has(entry.name)) continue;

    const source = path.join(sourceDir, entry.name);
    const relative = path.relative(root, source).replaceAll(path.sep, "/");

    if (entry.isDirectory()) {
      copyTree(source, path.join(targetDir, entry.name));
      continue;
    }

    if (shouldFingerprint(relative)) {
      const fingerprinted = fingerprintName(relative);
      assetMap.set(`/${relative}`, `/${fingerprinted}`);
      ensureDir(path.dirname(path.join(dist, fingerprinted)));
      fs.copyFileSync(source, path.join(dist, fingerprinted));
      continue;
    }

    const target = path.join(targetDir, entry.name);
    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
  }
}

function rewriteHtmlFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteHtmlFiles(target);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;

    let html = fs.readFileSync(target, "utf8");
    for (const [from, to] of assetMap) {
      html = html.replaceAll(`"${from}"`, `"${to}"`);
      html = html.replaceAll(`'${from}'`, `'${to}'`);
    }
    fs.writeFileSync(target, html);
  }
}

rmDir(dist);
copyTree(root, dist);
rewriteHtmlFiles(dist);

console.log(`Built ${path.relative(root, dist)} with ${assetMap.size} fingerprinted assets.`);
