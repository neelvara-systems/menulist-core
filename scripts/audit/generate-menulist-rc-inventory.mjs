import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT = path.join(
    ROOT,
    "__docs__/audits/menulist-rc-certification-inventory.csv",
);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const APP_SPECIAL_FILE = /\/(page|layout|route|loading|error|not-found)\.(?:tsx?|jsx?)$/;
const ROUTE_FILE = /\/route\.(?:tsx?|jsx?)$/;
const PAGE_FILE = /\/page\.(?:tsx?|jsx?)$/;
const CONTROL_PATTERNS = [
    ["button", /<(?:button|Button|IconButton|WebsiteButton)\b/],
    ["link", /<(?:a|Link|NavLink)\b/],
    ["form", /<(?:form|Form)\b|\bonSubmit\s*=/],
    ["input", /<(?:input|Input|InputNumber|TextArea|textarea)\b/],
    ["selection", /<(?:select|Select|Checkbox|Radio|Switch|DatePicker|TimePicker)\b/],
    ["upload", /<(?:Upload|input)\b[^>]*\btype\s*=\s*["']file["']/],
    ["action-handler", /\bonClick\s*=|\bonPress\s*=|\bonAction\s*=/],
    ["menu-action", /\b(?:items|menuItems|actions)\s*=\s*\[|\bkey\s*:\s*["'][^"']+["'][^\n]*(?:label|onClick)/],
];

const COLUMNS = [
    "inventory_id",
    "item_type",
    "product_area",
    "route_or_component",
    "screen_or_tab",
    "role",
    "tenant_state",
    "store_state",
    "subscription_or_entitlement_state",
    "feature_flag_state",
    "viewport",
    "control_or_action",
    "expected_behavior",
    "backing_api_dal_data_path",
    "test_type",
    "test_result",
    "defect_id",
    "regression_test_added",
    "final_verification_status",
    "evidence_or_notes",
];

function walk(directory, output = []) {
    if (!fs.existsSync(directory)) return output;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if ([".git", ".next", "node_modules", "coverage"].includes(entry.name)) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(absolute, output);
        else output.push(absolute);
    }
    return output;
}

function relative(file) {
    return path.relative(ROOT, file).split(path.sep).join("/");
}

function routeFromAppFile(file) {
    const rel = relative(file).slice("src/app".length);
    const withoutSpecialFile = rel.replace(
        /\/(?:page|route|layout|loading|error|not-found)\.(?:tsx?|jsx?)$/,
        "",
    );
    const segments = withoutSpecialFile
        .split("/")
        .filter(Boolean)
        .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
    return `/${segments.join("/")}` || "/";
}

function classifyProduct(file, route = "") {
    const value = `${relative(file)} ${route}`.toLowerCase();
    if (value.includes("answerlattice") || route.startsWith("/widget")) return "Answerlattice boundary";
    if (value.includes("campaigncue")) return "CampaignCue boundary";
    if (value.includes("signaldesk")) return "SignalDesk boundary";
    if (value.includes("mycodex")) return "MyCodex boundary";
    if (value.includes("sites/neelvara")) return "Neelvara boundary";
    if (value.includes("growthos") || route.startsWith("/growth-kits")) return "GrowthOS boundary";
    if (value.includes("kitstamp")) return "KitStamp boundary";
    return "MenuList";
}

function csv(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function makeRow(values) {
    return Object.fromEntries(COLUMNS.map((column) => [column, values[column] ?? ""]));
}

function methodList(source) {
    const methods = new Set();
    for (const match of source.matchAll(/export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)) {
        methods.add(match[1]);
    }
    return [...methods].sort().join("|") || "UNRESOLVED_METHOD";
}

const rows = [];
let sequence = 1;
const add = (values) => {
    const id = `MLRC-${String(sequence).padStart(6, "0")}`;
    sequence += 1;
    rows.push(makeRow({
        inventory_id: id,
        role: "DERIVE_FROM_RUNTIME_GUARD",
        tenant_state: "DERIVE_FROM_RUNTIME_GUARD",
        store_state: "DERIVE_FROM_RUNTIME_GUARD",
        subscription_or_entitlement_state: "DERIVE_FROM_RUNTIME_GUARD",
        feature_flag_state: "CURRENT_AND_MATERIAL_ALTERNATE",
        viewport: "DERIVE_FROM_SURFACE",
        test_result: "NOT_RUN",
        regression_test_added: "NO",
        final_verification_status: "DISCOVERED_UNTESTED",
        ...values,
    }));
};

const appFiles = walk(path.join(ROOT, "src/app"))
    .filter((file) => APP_SPECIAL_FILE.test(file))
    .sort();

for (const file of appFiles) {
    const rel = relative(file);
    const route = routeFromAppFile(file);
    const product = classifyProduct(file, route);
    const name = path.basename(file).split(".")[0];
    const source = fs.readFileSync(file, "utf8");
    add({
        item_type: ROUTE_FILE.test(file) ? "api-route" : name,
        product_area: product,
        route_or_component: route,
        screen_or_tab: rel,
        control_or_action: ROUTE_FILE.test(file) ? methodList(source) : `render:${name}`,
        expected_behavior: "Resolve current source, host, authorization, lifecycle, and failure contract",
        backing_api_dal_data_path: rel,
        test_type: ROUTE_FILE.test(file) ? "boundary-and-runtime" : "browser-and-source",
        evidence_or_notes: product === "MenuList" ? "In-scope candidate" : "Separation boundary only",
    });
}

const uiRoots = ["src/components", "src/app"];
const uiFiles = uiRoots
    .flatMap((root) => walk(path.join(ROOT, root)))
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)))
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort();

for (const file of uiFiles) {
    const rel = relative(file);
    const product = classifyProduct(file);
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        for (const [kind, pattern] of CONTROL_PATTERNS) {
            if (!pattern.test(line)) continue;
            add({
                item_type: "user-control-candidate",
                product_area: product,
                route_or_component: rel,
                screen_or_tab: "DERIVE_FROM_RENDER_TREE",
                control_or_action: `${kind}@${index + 1}`,
                expected_behavior: "Resolve label, reachability, guard, mutation, feedback, and recovery contract",
                backing_api_dal_data_path: "TRACE_REQUIRED",
                test_type: "runtime-interaction-required",
                evidence_or_notes: line.trim().replace(/\s+/g, " ").slice(0, 240),
            });
        }
    }
}

const featureSource = fs.readFileSync(path.join(ROOT, "src/config/features.ts"), "utf8");
for (const match of featureSource.matchAll(/^\s*(ENABLE_[A-Z0-9_]+)\s*:/gm)) {
    const flag = match[1];
    const product = classifyProduct(path.join(ROOT, "src/config/features.ts"), flag);
    add({
        item_type: "feature-flag",
        product_area: product,
        route_or_component: "src/config/features.ts",
        screen_or_tab: flag,
        control_or_action: "enabled-and-disabled-state",
        expected_behavior: "Flag-on behavior is reachable and flag-off behavior fails closed without dead navigation",
        backing_api_dal_data_path: "TRACE_FLAG_READERS",
        test_type: "source-and-material-runtime-state",
        evidence_or_notes: "Current declaration discovered programmatically",
    });
}

const functionsIndex = path.join(ROOT, "functions/src/index.ts");
if (fs.existsSync(functionsIndex)) {
    const source = fs.readFileSync(functionsIndex, "utf8");
    const exports = new Map();
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const assignment = line.match(/^exports\.([A-Za-z0-9_]+)\s*=/);
        if (assignment) exports.set(assignment[1], index + 1);
        const direct = line.match(/^export\s+\{([^}]+)\}/);
        if (direct) {
            for (const name of direct[1].split(",").map((value) => value.trim()).filter(Boolean)) {
                exports.set(name.split(/\s+as\s+/).at(-1), index + 1);
            }
        }
    }
    for (const block of source.matchAll(/export\s+\{([\s\S]*?)\}\s*(?:from\s+["'][^"']+["'])?\s*;/g)) {
        const line = source.slice(0, block.index).split(/\r?\n/).length;
        for (const name of block[1].split(",").map((value) => value.trim()).filter(Boolean)) {
            exports.set(name.split(/\s+as\s+/).at(-1), line);
        }
    }
    for (const [name, line] of [...exports.entries()].sort(([left], [right]) => left.localeCompare(right))) {
        add({
            item_type: "firebase-function-export",
            product_area: "MenuList",
            route_or_component: "functions/src/index.ts",
            screen_or_tab: name,
            control_or_action: `export:${name}`,
            expected_behavior: "Resolve trigger, region, authorization, bounds, idempotency, retry, logging, and cost contract",
            backing_api_dal_data_path: "TRACE_FUNCTION_EXPORT",
            test_type: "source-emulator-and-deployed-readback-as-applicable",
            evidence_or_notes: `functions/src/index.ts:${line}`,
        });
    }
}

const output = [
    COLUMNS.join(","),
    ...rows.map((row) => COLUMNS.map((column) => csv(row[column])).join(",")),
].join("\n");

fs.writeFileSync(OUTPUT, `${output}\n`, "utf8");

const counts = rows.reduce((summary, row) => {
    summary.total += 1;
    summary.byType[row.item_type] = (summary.byType[row.item_type] ?? 0) + 1;
    summary.byProduct[row.product_area] = (summary.byProduct[row.product_area] ?? 0) + 1;
    return summary;
}, { total: 0, byType: {}, byProduct: {} });

console.log(JSON.stringify({ output: relative(OUTPUT), ...counts }, null, 2));
