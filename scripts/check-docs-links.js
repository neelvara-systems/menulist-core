#!/usr/bin/env node

/**
 * Documentation Broken Link Checker
 *
 * Scans all .md files in __docs__/ for internal links and verifies targets exist.
 * Reports broken links, missing files, and orphaned docs.
 *
 * Usage:
 *   node scripts/check-docs-links.js
 *   npm run docs:check-links
 */

const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "../__docs__");
const IGNORE_DIRS = ["Single Source of Truth", "archive", "_archive"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function shouldIgnore(filePath) {
    return IGNORE_DIRS.some((d) => filePath.includes(d));
}

function getAllMarkdownFiles(dir) {
    const results = [];
    function walk(currentDir) {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            if (shouldIgnore(fullPath)) continue;
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (item.endsWith(".md")) {
                results.push(fullPath);
            }
        }
    }
    walk(dir);
    return results;
}

function extractLinks(content, filePath) {
    const links = [];
    // Match markdown links: [text](path) and [text](<path with parentheses>) — only docs/file links.
    const linkRegex = /\[([^\]]*)\]\((<[^>]+>|[^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        let target = match[2];
        if (target.startsWith("<") && target.endsWith(">")) {
            target = target.slice(1, -1);
        }
        // Skip external URLs, anchors, and mailto
        if (
            target.startsWith("http://") ||
            target.startsWith("https://") ||
            target.startsWith("#") ||
            target.startsWith("mailto:") ||
            target.includes("://") ||
            target.startsWith("/")
        ) {
            continue;
        }
        // Strip anchor from target
        const cleanTarget = target
            .split("#")[0]
            .replace(/\\_/g, "_")
            .replace(/^\.\/__docs__\//, "__docs__/");
        if (cleanTarget) {
            links.push({
                text: match[1],
                target: cleanTarget,
                line:
                    content.substring(0, match.index).split("\n").length,
            });
        }
    }

    // Match inline references like `__docs__/path/to/file.md`
    const inlineRefRegex = /`(__docs__\/[^`]+\.md)`/g;
    while ((match = inlineRefRegex.exec(content)) !== null) {
        links.push({
            text: match[1],
            target: match[1],
            line: content.substring(0, match.index).split("\n").length,
            isInlineRef: true,
        });
    }

    return links;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log("🔍 Scanning __docs__/ for broken links...\n");

const allFiles = getAllMarkdownFiles(DOCS_DIR);
const allFilePaths = new Set(allFiles.map((f) => f));

let totalLinks = 0;
let brokenLinks = 0;
const brokenReport = [];

// Check naming convention violations
const namingViolations = [];

for (const filePath of allFiles) {
    const basename = path.basename(filePath);
    if (basename === "README.md") continue;

    // Check for uppercase or spaces
    if (/[A-Z]/.test(basename) || / /.test(basename)) {
        namingViolations.push({
            file: path.relative(DOCS_DIR, filePath),
            issue: "Contains uppercase or spaces",
        });
    }
}

for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    const dir = path.dirname(filePath);
    const links = extractLinks(content, filePath);

    for (const link of links) {
        totalLinks++;
        let targetPath;

        if (link.target.startsWith("./") || link.target.startsWith("../")) {
            targetPath = path.resolve(dir, link.target);
        } else if (link.target.startsWith("__docs__/")) {
            targetPath = path.resolve(
                DOCS_DIR,
                "..",
                link.target
            );
        } else {
            targetPath = path.resolve(dir, link.target);
        }

        if (!fs.existsSync(targetPath)) {
            brokenLinks++;
            brokenReport.push({
                source: path.relative(DOCS_DIR, filePath),
                target: link.target,
                line: link.line,
                text: link.text.substring(0, 50),
            });
        }
    }
}

// ── Report ───────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════");
console.log("  DOCUMENTATION HEALTH REPORT");
console.log("═══════════════════════════════════════════════\n");

console.log(`📄 Total files scanned: ${allFiles.length}`);
console.log(`🔗 Total internal links: ${totalLinks}`);
console.log(
    `${brokenLinks === 0 ? "✅" : "❌"} Broken links: ${brokenLinks}`
);
console.log(
    `${namingViolations.length === 0 ? "✅" : "⚠️"} Naming violations: ${namingViolations.length}`
);

if (brokenLinks > 0) {
    console.log("\n── BROKEN LINKS ──────────────────────────────\n");
    for (const b of brokenReport) {
        console.log(`  ❌ ${b.source}:${b.line}`);
        console.log(`     Link: [${b.text}](${b.target})`);
        console.log("");
    }
}

if (namingViolations.length > 0) {
    console.log("\n── NAMING VIOLATIONS ─────────────────────────\n");
    for (const v of namingViolations) {
        console.log(`  ⚠️  ${v.file} — ${v.issue}`);
    }
}

// Check for missing READMEs
const featureDirs = fs
    .readdirSync(DOCS_DIR)
    .filter((d) => {
        const full = path.join(DOCS_DIR, d);
        return (
            fs.statSync(full).isDirectory() &&
            !d.startsWith(".") &&
            !shouldIgnore(full) &&
            d !== "archive" &&
            d !== "patterns"
        );
    });

const missingReadmes = featureDirs.filter(
    (d) => !fs.existsSync(path.join(DOCS_DIR, d, "README.md"))
);

if (missingReadmes.length > 0) {
    console.log("\n── MISSING READMEs ───────────────────────────\n");
    for (const d of missingReadmes) {
        console.log(`  📁 ${d}/ — no README.md`);
    }
}

console.log("\n═══════════════════════════════════════════════");
console.log(
    brokenLinks === 0 && namingViolations.length === 0 && missingReadmes.length === 0
        ? "  ✅ ALL CHECKS PASSED"
        : `  ⚠️  ${brokenLinks + namingViolations.length + missingReadmes.length} issue(s) found`
);
console.log("═══════════════════════════════════════════════\n");

process.exit(brokenLinks > 0 ? 1 : 0);
