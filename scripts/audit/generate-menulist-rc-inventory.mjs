import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT = path.join(
    ROOT,
    "__docs__/audits/menulist-rc-certification-inventory.csv",
);
const RUNTIME_EVIDENCE_PATH = path.join(
    ROOT,
    "__docs__/audits/menulist-rc-runtime-evidence.json",
);
const runtimeEvidence = fs.existsSync(RUNTIME_EVIDENCE_PATH)
    ? JSON.parse(fs.readFileSync(RUNTIME_EVIDENCE_PATH, "utf8"))
    : {};
const privateRouteAccessEvidence = runtimeEvidence.privateRouteAccess ?? null;
const privateRouteAccessRoutes = new Set(privateRouteAccessEvidence?.routes ?? []);
const apiAnonymousBoundaryEvidence = runtimeEvidence.apiAnonymousBoundary ?? null;
const authenticatedOwnerNavigationEvidence = runtimeEvidence.authenticatedOwnerNavigation ?? null;
const authenticatedOwnerNavigationRoutes = new Set(authenticatedOwnerNavigationEvidence?.routes ?? []);
const publicWebsiteRouteRenderEvidence = runtimeEvidence.publicWebsiteRouteRender ?? null;
const publicSitemapPath = path.join(ROOT, "public/sitemap.xml");
const publicSitemapPaths = fs.existsSync(publicSitemapPath)
    ? [...fs.readFileSync(publicSitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => {
            try {
                return new URL(match[1]).pathname;
            } catch {
                return null;
            }
        })
        .filter(Boolean)
    : [];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SOURCE_RESOLUTION_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
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
    if (
        value.includes("answerlattice")
        || route.startsWith("/widget")
        || route.startsWith("/api/widget")
    ) return "Answerlattice boundary";
    if (value.includes("campaigncue")) return "CampaignCue boundary";
    if (value.includes("signaldesk")) return "SignalDesk boundary";
    if (value.includes("mycodex")) return "MyCodex boundary";
    if (value.includes("sites/neelvara")) return "Neelvara boundary";
    // GrowthOS is the internal implementation namespace for the shipped
    // MenuList Growth Kits add-on. It has no standalone host or app surface,
    // so its owner page, APIs, data paths, and reachable controls remain part
    // of MenuList release certification.
    if (value.includes("growthos") || route.startsWith("/growth-kits")) return "MenuList";
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
    for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
        for (const specifier of match[1].split(",")) {
            const exportedName = specifier.trim().split(/\s+as\s+/i).at(-1);
            if (/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(exportedName)) methods.add(exportedName);
        }
    }
    for (const match of source.matchAll(/export\s+const\s*\{([^}]+)\}\s*=/g)) {
        for (const name of match[1].split(",").map((value) => value.trim())) {
            if (/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(name)) methods.add(name);
        }
    }
    return [...methods].sort().join("|") || "UNRESOLVED_METHOD";
}

const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf8"));
const aliasEntries = Object.entries(tsconfig.compilerOptions?.paths ?? {})
    .map(([pattern, targets]) => ({
        prefix: pattern.replace(/\*$/, ""),
        targetPrefix: String(targets[0] ?? "").replace(/\*$/, ""),
    }))
    .sort((left, right) => right.prefix.length - left.prefix.length);

function resolveSourceImport(importer, specifier) {
    let candidateBase = null;
    if (specifier.startsWith(".")) {
        candidateBase = path.resolve(path.dirname(importer), specifier);
    } else if (specifier.startsWith("src/")) {
        candidateBase = path.join(ROOT, specifier);
    } else {
        const alias = aliasEntries.find((entry) => specifier.startsWith(entry.prefix));
        if (alias) {
            candidateBase = path.join(ROOT, alias.targetPrefix, specifier.slice(alias.prefix.length));
        }
    }
    if (!candidateBase) return null;

    const candidates = [
        candidateBase,
        ...SOURCE_RESOLUTION_EXTENSIONS.map((extension) => `${candidateBase}${extension}`),
        ...SOURCE_RESOLUTION_EXTENSIONS.map((extension) => path.join(candidateBase, `index${extension}`)),
    ];
    return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function importedSourceFiles(file) {
    const source = fs.readFileSync(file, "utf8");
    const specifiers = new Set();
    for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)) {
        specifiers.add(match[1]);
    }
    return [...specifiers]
        .map((specifier) => resolveSourceImport(file, specifier))
        .filter(Boolean);
}

function featureFlagState(source) {
    const flags = [...source.matchAll(/FEATURE_FLAGS\.(ENABLE_[A-Z0-9_]+)/g)]
        .map((match) => match[1]);
    return [...new Set(flags)].sort().join("|") || "NO_DIRECT_FLAG_GUARD";
}

function appSurfaceProfile(file, route, itemType, product, source) {
    const rel = relative(file);
    const isMain = rel.startsWith("src/app/(main)/");
    const isWebsite = rel.startsWith("src/app/(website)/");
    const isApi = itemType === "api-route";

    if (product !== "MenuList") {
        return {
            role: "SEPARATION_BOUNDARY_ONLY",
            tenant_state: "PRODUCT_HOST_BOUNDARY",
            store_state: "OUT_OF_SCOPE_EXCEPT_ISOLATION",
            subscription_or_entitlement_state: "OUT_OF_SCOPE_EXCEPT_ISOLATION",
            viewport: isApi ? "SERVER" : "RESPONSIVE_WHERE_RENDERED",
        };
    }

    if (isApi) {
        const authSignals = [];
        if (/getServerSession|requireAuthenticated|requireApiAuth|withAuth|session\b/.test(source)) authSignals.push("AUTHENTICATED");
        if (/requirePlatformAdmin|PLATFORM_USER_ROLE|platformRole/.test(source)) authSignals.push("PLATFORM_ADMIN");
        if (/validatePublicApiKey|hasPublicApiCredentialScope|X-API-Key/i.test(source)) authSignals.push("PUBLIC_API_KEY");
        if (/checkRateLimit|getRateLimitForFeature/.test(source)) authSignals.push("RATE_LIMITED");
        if (/timingSafeEqual|hasValid\w*Secret|verify\w*Signature|validate\w*Signature/.test(source)) authSignals.push("SERVER_SECRET_OR_SIGNATURE");
        if (/tenantId|tenantID|tenant_id|x-tenant-/.test(source)) authSignals.push("TENANT_SCOPED");
        if (/storeId|storeID|store_id/.test(source)) authSignals.push("STORE_SCOPED");
        if (
            route === "/api/auth/[...nextauth]"
            || route === "/api/auth/phone-otp/start"
            || route === "/api/auth/phone-otp/verify"
            || route === "/api/auth/validate-claim"
        ) authSignals.push("PUBLIC_AUTH_ENTRY");
        if (
            route === "/api/csp-report"
            || route === "/api/test/rate-limit"
            || route === "/api/version"
            || route === "/client/robots"
            || route === "/developers/openapi"
            || route === "/manifest.webmanifest"
            || route === "/serwist/[path]"
        ) authSignals.push("PUBLIC_PLATFORM_OR_STATIC");
        if (route.startsWith("/api/public/")) authSignals.push("PUBLIC_CUSTOMER_OR_INTAKE");
        if (route === "/api/razorpay/webhook") authSignals.push("PROVIDER_WEBHOOK_BOUNDARY");
        if (route === "/api/screen/seen") authSignals.push("PUBLIC_SCREEN_TOKEN");
        return {
            role: authSignals.join("|") || "PUBLIC_OR_GUARD_TRACE_REQUIRED",
            tenant_state: authSignals.includes("TENANT_SCOPED") ? "VALID_AND_INVALID_TENANT" : "NOT_ROUTE_DERIVABLE",
            store_state: authSignals.includes("STORE_SCOPED") ? "VALID_MISSING_AND_FOREIGN_STORE" : "NOT_ROUTE_DERIVABLE",
            subscription_or_entitlement_state: /subscription|entitlement|credit|plan/i.test(`${route} ${source}`)
                ? "ACTIVE|UNPAID|PENDING|EXPIRED_AS_APPLICABLE"
                : "NOT_ROUTE_DERIVABLE",
            viewport: "SERVER",
        };
    }

    if (isMain) {
        const recoveryRoute = route === "/billing" || route === "/help-center" || route.startsWith("/help-center/");
        const platformRoute = route === "/platform" || route.startsWith("/platform/") || route === "/ops" || route.startsWith("/ops/");
        const resellerManage = route === "/reseller/manage" || route.startsWith("/reseller/manage/");
        const resellerRoute = route === "/reseller" || route.startsWith("/reseller/");
        const noStoreRoute = recoveryRoute || platformRoute || resellerRoute;
        return {
            role: platformRoute || resellerManage
                ? "PLATFORM_ADMIN"
                : resellerRoute
                    ? "PLATFORM_OR_RESELLER"
                    : "MENULIST_OWNER_OR_AUTHORIZED_STAFF",
            tenant_state: platformRoute ? "PLATFORM_CONTEXT" : "AUTHENTICATED_MENULIST_TENANT",
            store_state: noStoreRoute ? "STORE_OPTIONAL_OR_ROUTE_SPECIFIC" : "ACTIVE_SELECTED_STORE",
            subscription_or_entitlement_state: platformRoute || resellerRoute
                ? "ROLE_GATED_NOT_OWNER_PLAN_GATED"
                : recoveryRoute
                    ? "ACTIVE|STARTER|UNPAID|PENDING|EXPIRED"
                    : "ACTIVE_PAID_OR_BOUNDED_STARTER_ROUTE",
            viewport: route === "/platform/test-sentry" ? "DESKTOP_ONLY" : "DESKTOP_AND_MOBILE_SHELL",
        };
    }

    if (isWebsite) {
        return {
            role: "UNAUTHENTICATED_VISITOR_AND_AUTHENTICATED_VISITOR",
            tenant_state: "PLATFORM_WEBSITE",
            store_state: "NOT_APPLICABLE",
            subscription_or_entitlement_state: "PUBLIC_PRESENTATION_OR_AUTH_HANDOFF",
            viewport: "SMALL_MOBILE|PHONE|TABLET|DESKTOP",
        };
    }

    if (route.startsWith("/client/") || route.startsWith("/screen/") || route.startsWith("/feedback/")) {
        return {
            role: "PUBLIC_CUSTOMER",
            tenant_state: "VALID|INVALID|MALFORMED_TENANT",
            store_state: "ACTIVE|MISSING|UNPUBLISHED|ARCHIVED_OR_DISABLED",
            subscription_or_entitlement_state: "PUBLICATION_AND_ENTITLEMENT_GATED",
            viewport: route.startsWith("/screen/") ? "SCREEN|MOBILE|DESKTOP" : "SMALL_MOBILE|PHONE|TABLET|DESKTOP",
        };
    }

    return {
        role: "ROUTE_GUARD_TRACE_REQUIRED",
        tenant_state: "ROUTE_STATE_TRACE_REQUIRED",
        store_state: "ROUTE_STATE_TRACE_REQUIRED",
        subscription_or_entitlement_state: "ROUTE_STATE_TRACE_REQUIRED",
        viewport: "RESPONSIVE_WHERE_RENDERED",
    };
}

function appRuntimeEvidence(file, route, itemType, product) {
    if (
        itemType === "api-route"
        && product === "MenuList"
        && apiAnonymousBoundaryEvidence?.result === "PASS"
        && apiAnonymousBoundaryEvidence.handlers === 140
        && apiAnonymousBoundaryEvidence.methodProbes === 157
    ) {
        return {
            test_result: "PASS_ANONYMOUS_BOUNDARY",
            final_verification_status: "ANONYMOUS_BOUNDARY_PASSED_FUNCTIONAL_STATE_PENDING",
            evidence_or_notes: `Anonymous empty/invalid probe across every exported method; ${apiAnonymousBoundaryEvidence.testedAt}; no 5xx, timeout, or protected 2xx; authenticated and valid public behavior remains separately pending`,
        };
    }
    if (
        itemType === "page"
        && product === "MenuList"
        && relative(file).startsWith("src/app/(website)/")
        && publicWebsiteRouteRenderEvidence?.result === "PASS"
        && publicWebsiteRouteRenderEvidence.sitemapRouteCount === 186
        && publicSitemapPaths.some((candidate) => routePatternMatches(route, candidate))
    ) {
        return {
            test_result: "PASS_BROWSER_RENDER",
            final_verification_status: "RENDER_PASSED_CONTROL_INTERACTION_PENDING",
            evidence_or_notes: `${publicWebsiteRouteRenderEvidence.browser}; current sitemap concrete route rendered main and heading; ${publicWebsiteRouteRenderEvidence.testedAt}; individual controls remain separately pending`,
        };
    }
    if (
        itemType === "page"
        && product === "MenuList"
        && relative(file).startsWith("src/app/(main)/")
        && authenticatedOwnerNavigationEvidence?.result === "PASS"
        && authenticatedOwnerNavigationRoutes.has(route)
    ) {
        return {
            test_result: "PASS_AUTHENTICATED_RENDER",
            final_verification_status: "AUTHENTICATED_RENDER_PASSED_CONTROL_INTERACTION_PENDING",
            evidence_or_notes: `${authenticatedOwnerNavigationEvidence.browser}; entitled owner reached ${route} on exact hosted build ${authenticatedOwnerNavigationEvidence.servedBuildId}; ${authenticatedOwnerNavigationEvidence.testedAt}; route rendered without generic load failure or horizontal overflow; child controls remain separately pending`,
        };
    }
    if (
        itemType !== "page"
        || product !== "MenuList"
        || !relative(file).startsWith("src/app/(main)/")
        || privateRouteAccessEvidence?.result !== "PASS"
        || !privateRouteAccessRoutes.has(route)
    ) return {};

    const concreteRoute = privateRouteAccessEvidence.concreteRouteOverrides?.[route] ?? route;
    const expectedCallback = privateRouteAccessEvidence.canonicalCallbackOverrides?.[route] ?? concreteRoute;
    return {
        test_result: "PASS_ACCESS_BOUNDARY",
        final_verification_status: "ACCESS_PASSED_FUNCTIONAL_INTERACTION_PENDING",
        evidence_or_notes: `${privateRouteAccessEvidence.browser}; signed-out ${concreteRoute} -> /signin callback ${expectedCallback}; ${privateRouteAccessEvidence.testedAt}; authenticated controls remain separately pending`,
    };
}

function routePatternMatches(pattern, candidate) {
    if (pattern === candidate) return true;
    const escaped = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\[\\\[\\\.\\\.\\\.[^\]]+\\\]\\\]/g, "(?:/.*)?")
        .replace(/\\\[\\\.\\\.\\\.[^\]]+\\\]/g, ".+")
        .replace(/\\\[[^\]]+\\\]/g, "[^/]+");
    return new RegExp(`^${escaped}$`).test(candidate);
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
    const itemType = ROUTE_FILE.test(file) ? "api-route" : name;
    const profile = appSurfaceProfile(file, route, itemType, product, source);
    const recordedRuntimeEvidence = appRuntimeEvidence(file, route, itemType, product);
    add({
        item_type: itemType,
        product_area: product,
        route_or_component: route,
        screen_or_tab: rel,
        ...profile,
        feature_flag_state: featureFlagState(source),
        control_or_action: ROUTE_FILE.test(file) ? methodList(source) : `render:${name}`,
        expected_behavior: "Resolve current source, host, authorization, lifecycle, and failure contract",
        backing_api_dal_data_path: rel,
        test_type: ROUTE_FILE.test(file) ? "boundary-and-runtime" : "browser-and-source",
        evidence_or_notes: product === "MenuList" ? "In-scope candidate" : "Separation boundary only",
        ...recordedRuntimeEvidence,
    });
}

const sourceFiles = walk(path.join(ROOT, "src"))
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)));
const sourceFileSet = new Set(sourceFiles);
const importGraph = new Map(sourceFiles.map((file) => [
    file,
    importedSourceFiles(file).filter((dependency) => sourceFileSet.has(dependency)),
]));
const reachableRoutesByFile = new Map();
for (const pageFile of appFiles.filter((file) => PAGE_FILE.test(file))) {
    const route = routeFromAppFile(pageFile);
    const visited = new Set();
    const pending = [pageFile];
    let ancestor = path.dirname(pageFile);
    const appRoot = path.join(ROOT, "src/app");
    while (ancestor.startsWith(appRoot)) {
        for (const basename of ["layout", "loading", "error", "not-found", "global-error"]) {
            for (const extension of SOURCE_RESOLUTION_EXTENSIONS) {
                const specialFile = path.join(ancestor, `${basename}${extension}`);
                if (sourceFileSet.has(specialFile)) pending.push(specialFile);
            }
        }
        if (ancestor === appRoot) break;
        ancestor = path.dirname(ancestor);
    }
    while (pending.length > 0) {
        const current = pending.pop();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        const routes = reachableRoutesByFile.get(current) ?? new Set();
        routes.add(route);
        reachableRoutesByFile.set(current, routes);
        for (const dependency of importGraph.get(current) ?? []) pending.push(dependency);
    }
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
    const reachableRoutes = [...(reachableRoutesByFile.get(file) ?? [])].sort();
    const renderedSurface = reachableRoutes.length > 0
        ? reachableRoutes.join("|")
        : "UNREACHED_BY_APP_PAGE_STATIC_GRAPH";
    const reachabilityEvidence = reachableRoutes.length > 0
        ? {}
        : {
            test_type: "static-app-page-reachability",
            test_result: "PASS_NOT_SHIPPED",
            final_verification_status: "SOURCE_UNREACHABLE_NOT_USER_TRIGGERABLE",
        };
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        for (const [kind, pattern] of CONTROL_PATTERNS) {
            if (!pattern.test(line)) continue;
            add({
                item_type: "user-control-candidate",
                product_area: product,
                route_or_component: rel,
                screen_or_tab: renderedSurface,
                control_or_action: `${kind}@${index + 1}`,
                expected_behavior: "Resolve label, reachability, guard, mutation, feedback, and recovery contract",
                backing_api_dal_data_path: "TRACE_REQUIRED",
                test_type: "runtime-interaction-required",
                evidence_or_notes: `${reachableRoutes.length > 0 ? `Reachable from ${reachableRoutes.length} page route(s). ` : "No page import path found. "}${line.trim().replace(/\s+/g, " ").slice(0, 200)}`,
                ...reachabilityEvidence,
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
