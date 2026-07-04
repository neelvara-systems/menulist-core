#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const optionalRead = (relativePath) => exists(relativePath) ? read(relativePath) : '';
const listSourceFiles = (relativeDir) => {
    const absoluteDir = path.join(root, relativeDir);
    if (!fs.existsSync(absoluteDir)) return [];

    return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
        const absolutePath = path.join(absoluteDir, entry.name);
        const relativePath = path.relative(root, absolutePath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
            if (entry.name === '__tests__') return [];
            return listSourceFiles(relativePath);
        }

        if (!entry.isFile()) return [];
        if (!/\.(?:ts|tsx)$/.test(entry.name)) return [];
        if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)) return [];
        return [relativePath];
    });
};

const assert = (condition, message) => {
    if (!condition) failures.push(message);
};

const assertIncludes = (content, needle, message) => {
    assert(content.includes(needle), message);
};

const assertOrder = (content, orderedNeedles, message) => {
    let cursor = -1;
    const missingOrOutOfOrder = [];

    orderedNeedles.forEach((needle) => {
        const nextIndex = content.indexOf(needle, cursor + 1);
        if (nextIndex === -1) {
            missingOrOutOfOrder.push(needle);
            return;
        }
        cursor = nextIndex;
    });

    assert(missingOrOutOfOrder.length === 0, `${message}: ${missingOrOutOfOrder.join(', ')}`);
};

const assertNoDirectConsole = (content, message) => {
    assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(content), message);
};

const assertNoDirectConsoleAny = (content, message) => {
    assert(!/\bconsole\.(?:error|warn|log|info|debug)\s*\(/.test(content), message);
};

const assertNoRandomReactKeys = (content, label) => {
    assert(!/key\s*[:=]\s*\{?\s*Math\.random\s*\(/.test(content), `${label} must not use Math.random() for React keys.`);
};

const assertNoUnexpectedOperationalMathRandom = () => {
    const allowedFiles = new Set([
        'src/lib/cache/swrLocalStorageProvider.ts',
        'src/lib/screen/utils.ts',
        'src/components/atoms/Confetti/index.tsx',
    ]);

    const sourceFiles = [
        ...listSourceFiles('src/app'),
        ...listSourceFiles('src/components'),
        ...listSourceFiles('src/config'),
        ...listSourceFiles('src/hooks'),
        ...listSourceFiles('src/database'),
        ...listSourceFiles('src/lib'),
    ];

    sourceFiles.forEach((relativePath) => {
        const content = read(relativePath);
        if (!content.includes('Math.random(')) return;
        assert(
            allowedFiles.has(relativePath),
            `${relativePath} must use src/lib/runtime/randomId.ts for operational IDs instead of Math.random().`,
        );
    });
};

const assertNoStaleImplementationMarkers = () => {
    const sourceFiles = [
        ...listSourceFiles('src/app'),
        ...listSourceFiles('src/components'),
        ...listSourceFiles('src/config'),
        ...listSourceFiles('src/hooks'),
        ...listSourceFiles('src/database'),
        ...listSourceFiles('src/lib'),
        ...listSourceFiles('functions/src'),
        ...listSourceFiles('functions-answerlattice/src'),
    ];

    const staleMarkerPattern = /\bTODO\b|\bFIXME\b|\[STUB\]|not implemented yet|Not implemented yet|throw new Error\(['"]Not implemented/;
    sourceFiles.forEach((relativePath) => {
        assert(
            !staleMarkerPattern.test(read(relativePath)),
            `${relativePath} must not keep stale TODO/FIXME/STUB or unimplemented production markers.`,
        );
    });
};

const assertNoUnexpectedAppDirectConsole = () => {
    const allowedFiles = new Set([
        'src/lib/monitoring/logger.ts',
        'src/lib/security/secureLogger.ts',
    ]);

    const sourceFiles = [
        ...listSourceFiles('src/app'),
        ...listSourceFiles('src/components'),
        ...listSourceFiles('src/hooks'),
        ...listSourceFiles('src/database'),
        ...listSourceFiles('src/lib'),
    ];

    const consolePattern = /\bconsole\.(?:log|warn|error)\s*\(/;
    sourceFiles.forEach((relativePath) => {
        if (!consolePattern.test(read(relativePath))) return;
        assert(
            allowedFiles.has(relativePath),
            `${relativePath} must use an approved diagnostic wrapper instead of direct console calls.`,
        );
    });
};

const assertNoUnsafeBlankWindowOpen = () => {
    const sourceFiles = [
        ...listSourceFiles('src/app'),
        ...listSourceFiles('src/components'),
        ...listSourceFiles('src/hooks'),
        ...listSourceFiles('src/database'),
        ...listSourceFiles('src/lib'),
    ];

    sourceFiles.forEach((relativePath) => {
        read(relativePath).split('\n').forEach((line, index) => {
            if (!line.includes('window.open(')) return;
            if (!/['_"]_blank['_"]/.test(line)) return;
            assert(
                line.includes('noopener,noreferrer'),
                `${relativePath}:${index + 1} must use noopener,noreferrer for _blank window.open handoffs.`,
            );
        });
    });
};

const listMenuListBrowserSurfaceFiles = () => [
    ...listSourceFiles('src/app'),
    ...listSourceFiles('src/components'),
].filter((relativePath) => {
    if (relativePath.startsWith('src/app/api/')) return false;
    if (relativePath.startsWith('src/app/sites/answerlattice/')) return false;
    if (relativePath.includes('/answerlattice/')) return false;
    return true;
});

const FIREBASE_AUTH_DIRECT_METHOD_ALLOWLIST = new Map([
    ['src/components/templates/loginPage/index.tsx', new Set([
        'signInWithEmailAndPassword',
        'signInWithCustomToken',
    ])],
    ['src/components/templates/forgotPassword/index.tsx', new Set([
        'sendPasswordResetEmail',
    ])],
]);

const getAllowedFirebaseAuthDirectMethods = (relativePath) => (
    FIREBASE_AUTH_DIRECT_METHOD_ALLOWLIST.get(relativePath) || new Set()
);

const getImportedFirebaseAuthNames = (importClause) => {
    const namedMatch = importClause.match(/\{([\s\S]*?)\}/);
    if (!namedMatch) return [];

    return namedMatch[1]
        .split(',')
        .map((specifier) => specifier.trim())
        .filter(Boolean)
        .map((specifier) => specifier.replace(/^type\s+/, '').split(/\s+as\s+/i)[0].trim())
        .filter(Boolean);
};

const assertMenuListBrowserSurfacesUseAllowedFirebaseAuthDirectMethods = () => {
    const staticImportPattern = /import\s+(type\s+)?([^;]*?)\s+from\s+['"](?:firebase\/auth|@firebase\/auth)['"]\s*;?/g;
    const dynamicImportPattern = /(?:const|let|var)\s+\{\s*([^}]+?)\s*\}\s*=\s*(?:await\s+)?import\(\s*['"](?:firebase\/auth|@firebase\/auth)['"]\s*\)/g;

    listMenuListBrowserSurfaceFiles().forEach((relativePath) => {
        const content = read(relativePath);
        const allowedMethods = getAllowedFirebaseAuthDirectMethods(relativePath);

        for (const match of content.matchAll(staticImportPattern)) {
            const isTypeOnlyImport = Boolean(match[1]);
            if (isTypeOnlyImport) continue;

            const importClause = match[2];
            const importedNames = getImportedFirebaseAuthNames(importClause);

            assert(
                importedNames.length > 0,
                `${relativePath} must not use default or namespace firebase/auth imports from browser surfaces.`,
            );

            importedNames.forEach((importedName) => {
                assert(
                    allowedMethods.has(importedName),
                    `${relativePath} must not import ${importedName} from firebase/auth outside the auth-entry allowlist.`,
                );
            });
        }

        for (const match of content.matchAll(dynamicImportPattern)) {
            getImportedFirebaseAuthNames(`{${match[1]}}`).forEach((importedName) => {
                assert(
                    allowedMethods.has(importedName),
                    `${relativePath} must not dynamically import ${importedName} from firebase/auth outside the auth-entry allowlist.`,
                );
            });
        }
    });
};

const REALTIME_DATABASE_DIRECT_IMPORT_ALLOWLIST = new Map([
    ['src/lib/firebase/firebaseClient.ts', new Set([
        'getDatabase',
    ])],
    ['src/database/loggers/applicationLogger.ts', new Set([
        'child',
        'get',
        'onValue',
        'ref',
        'set',
    ])],
    ['src/database/loggers/errorLogger.ts', new Set([
        'child',
        'get',
        'onValue',
        'ref',
        'set',
    ])],
]);

const getAllowedRealtimeDatabaseImports = (relativePath) => (
    REALTIME_DATABASE_DIRECT_IMPORT_ALLOWLIST.get(relativePath) || new Set()
);

const getImportedRealtimeDatabaseNames = (importClause) => {
    const namedMatch = importClause.match(/\{([\s\S]*?)\}/);
    if (!namedMatch) return [];

    return namedMatch[1]
        .split(',')
        .map((specifier) => specifier.trim())
        .filter(Boolean)
        .map((specifier) => specifier.replace(/^type\s+/, '').split(/\s+as\s+/i)[0].trim())
        .filter(Boolean);
};

const assertRealtimeDatabaseDirectImportBoundary = () => {
    const sourceFiles = [
        ...listSourceFiles('src/app'),
        ...listSourceFiles('src/components'),
        ...listSourceFiles('src/config'),
        ...listSourceFiles('src/hooks'),
        ...listSourceFiles('src/database'),
        ...listSourceFiles('src/lib'),
    ];

    const staticImportPattern = /import\s+(type\s+)?([^;]*?)\s+from\s+['"](?:firebase\/database|@firebase\/database)['"]\s*;?/g;
    const dynamicImportPattern = /(?:const|let|var)\s+\{\s*([^}]+?)\s*\}\s*=\s*(?:await\s+)?import\(\s*['"](?:firebase\/database|@firebase\/database)['"]\s*\)/g;

    sourceFiles.forEach((relativePath) => {
        const content = read(relativePath);
        const allowedImports = getAllowedRealtimeDatabaseImports(relativePath);

        for (const match of content.matchAll(staticImportPattern)) {
            const isTypeOnlyImport = Boolean(match[1]);
            if (isTypeOnlyImport) continue;

            const importedNames = getImportedRealtimeDatabaseNames(match[2]);
            assert(
                importedNames.length > 0,
                `${relativePath} must not use default or namespace firebase/database imports outside the logger/client allowlist.`,
            );

            importedNames.forEach((importedName) => {
                assert(
                    allowedImports.has(importedName),
                    `${relativePath} must not import ${importedName} from firebase/database outside the bounded logger/client allowlist.`,
                );
            });
        }

        for (const match of content.matchAll(dynamicImportPattern)) {
            getImportedRealtimeDatabaseNames(`{${match[1]}}`).forEach((importedName) => {
                assert(
                    allowedImports.has(importedName),
                    `${relativePath} must not dynamically import ${importedName} from firebase/database outside the bounded logger/client allowlist.`,
                );
            });
        }
    });
};

const assertRealtimeDatabaseLoggerBoundaryDocs = () => {
    const changelog = read('__docs__/CHANGELOG.md');
    const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');

    [
        'Browser Realtime Database Logger Boundary',
        'verify:auth-security-failure-matrix',
        'firebase/database',
        'src/lib/firebase/firebaseClient.ts',
        'src/database/loggers/applicationLogger.ts',
        'src/database/loggers/errorLogger.ts',
        'bounded logger/client allowlist',
    ].forEach((token) => {
        assertIncludes(changelog, token, `Changelog must document the Realtime Database logger boundary token: ${token}`);
    });

    [
        'Realtime Database logger boundary checkpoint',
        'verify:auth-security-failure-matrix',
        'firebase/database',
        'src/lib/firebase/firebaseClient.ts',
        'src/database/loggers/applicationLogger.ts',
        'src/database/loggers/errorLogger.ts',
        'bounded logger/client allowlist',
    ].forEach((token) => {
        assertIncludes(productionAudit, token, `Production audit must document the Realtime Database logger boundary token: ${token}`);
    });
};

const assertBrowserFirebaseAuthBoundaryDocs = () => {
    const changelog = read('__docs__/CHANGELOG.md');
    const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');

    [
        'Browser Firebase Auth Direct-Method Boundary',
        'verify:auth-security-failure-matrix',
        'signInWithEmailAndPassword',
        'signInWithCustomToken',
        'sendPasswordResetEmail',
        'NextAuth signOut',
    ].forEach((token) => {
        assertIncludes(changelog, token, `Changelog must document the browser Firebase Auth boundary token: ${token}`);
    });

    [
        'Browser Firebase Auth direct-method boundary checkpoint',
        'verify:auth-security-failure-matrix',
        'signInWithEmailAndPassword',
        'signInWithCustomToken',
        'sendPasswordResetEmail',
        'NextAuth signOut',
    ].forEach((token) => {
        assertIncludes(productionAudit, token, `Production audit must document the browser Firebase Auth boundary token: ${token}`);
    });
};

const assertLifecycleMessagingLoggerRouting = () => {
    const messagingEngine = read('functions/src/messaging/messagingEngine.ts');
    assertNoDirectConsole(
        messagingEngine,
        'functions/src/messaging/messagingEngine.ts must route diagnostics through functions.logger.',
    );
    [
        'function getMessagingIdLogContext',
        'function getMessagingOperationLogContext',
        "getMessagingIdLogContext('storeId', context.storeId)",
        "getMessagingIdLogContext('tenantId', context.tenantId)",
        "getMessagingIdLogContext('referenceId', context.referenceId)",
        "getMessagingIdLogContext('subscriptionId', context.subscriptionId)",
        'getMessagingOperationLogContext({ storeId, tenantId, eventType, referenceId })',
        "getMessagingOperationLogContext({ subscriptionId: doc.id, eventType: 'RENEWAL_REMINDER' })",
        "getMessagingOperationLogContext({ subscriptionId: doc.id, eventType: 'SUSPENSION_WARNING' })",
    ].forEach((token) => {
        assertIncludes(messagingEngine, token, 'Lifecycle messaging Functions diagnostics must bound operational identifiers.');
    });
    [
        "logger.warn('[Messaging] Rate limited, skipping', { eventType, storeId })",
        "logger.warn('[Messaging] No recipient email for store', { storeId, tenantId, eventType })",
        "logger.info('[Messaging] Duplicate detected, skipping', { eventType, referenceId })",
        "logger.error('[Messaging] Failed to log message', {\n      storeId: log.storeId,",
        "logger.error('[Messaging] Renewal reminder failed for subscription', {\n          subscriptionId: doc.id,",
        "logger.error('[Messaging] Suspension warning failed for subscription', {\n          subscriptionId: doc.id,",
    ].forEach((token) => {
        assert(!messagingEngine.includes(token), `Lifecycle messaging Functions diagnostics must not keep raw identifier pattern: ${token}`);
    });

    const smtpProvider = read('functions/src/messaging/providers/resend.ts');
    assertNoDirectConsole(
        smtpProvider,
        'functions/src/messaging/providers/resend.ts must route diagnostics through functions.logger.',
    );
    assertIncludes(
        smtpProvider,
        "SMTP_NOT_CONFIGURED_ERROR = 'SMTP_NOT_CONFIGURED'",
        'SMTP provider must return a stable code when credentials are missing.',
    );
    assertIncludes(
        smtpProvider,
        "SMTP_SEND_FAILED_ERROR = 'SMTP_SEND_FAILED'",
        'SMTP provider must return a stable code when provider delivery fails.',
    );
};

const assertMonitoringAlertLoggerRouting = () => {
    [
        'functions/src/monitoring/alerts.ts',
        'functions/src/monitoring/telegramAlert.ts',
        'functions/src/monitoring/safeMode.ts',
        'functions/src/monitoring/deployMute.ts',
        'functions/src/monitoring/errorTracking.ts',
        'functions/src/monitoring/healthCheck.ts',
        'functions/src/monitoring/publishVerification.ts',
    ].forEach((relativePath) => {
        assertNoDirectConsoleAny(
            read(relativePath),
            `${relativePath} must route diagnostics through functions.logger.`,
        );
    });

    const alerts = read('functions/src/monitoring/alerts.ts');
    const telegramAlert = read('functions/src/monitoring/telegramAlert.ts');
    const safeMode = read('functions/src/monitoring/safeMode.ts');
    const deployMute = read('functions/src/monitoring/deployMute.ts');
    const monitoringDiagnostics = read('functions/src/monitoring/diagnostics.ts');
    const errorTracking = read('functions/src/monitoring/errorTracking.ts');
    const healthCheck = read('functions/src/monitoring/healthCheck.ts');
    const publishVerification = read('functions/src/monitoring/publishVerification.ts');

    assertIncludes(
        alerts,
        "message: 'ALERT_CREATE_FAILED'",
        'Alert system error tracking must use a stable local failure code.',
    );
    assert(
        !alerts.includes('Failed to create alert: ${error instanceof Error ? error.message'),
        'Alert system error tracking must not store raw exception text.',
    );
    [
        'SAFE_ALERT_METADATA_KEYS',
        'getBoundedAlertStringContext',
        'function buildActiveAlertSummary',
        'metadataPreview: getAlertMetadataPreview(data.metadata)',
        'return alertsSnapshot.docs.map(buildActiveAlertSummary)',
        'tIdPresent: alert.tId.length > 0',
        'sIdPresent: alert.sId.length > 0',
        "getBoundedAlertStringContext('alertId', docRef.id)",
        "getBoundedAlertStringContext('alertId', alertId)",
        "getBoundedAlertStringContext('userId', userId)",
        'type TriggeredAlertCreate',
        "logger.error('[Alerts] Rule alert creation failed'",
        'failedCount',
        'triggeredCount: triggeredAlerts.length',
        'firstFailedRuleId: triggeredAlerts[firstFailedIndex]?.ruleId',
    ].forEach((token) => {
        assertIncludes(alerts, token, 'Alert diagnostics must bound tenant, store, alert, and user identifiers.');
    });
    [
        'alertId: docRef.id',
        "logger.info('[Alerts] Alert muted', { alertId: docRef.id })",
        "logger.info('[Alerts] Alert acknowledged', { alertId, userId })",
        "logger.error('[Alerts] Failed to get active alerts', {\n      tId,\n      sId,",
        "logger.error('[Alerts] Failed to evaluate rule', {\n        tId,\n        sId,",
        'await Promise.allSettled(triggeredAlerts);',
    ].forEach((token) => {
        assert(!alerts.includes(token), `Alert diagnostics must not keep raw identifier pattern: ${token}`);
    });
    [
        'return alertsSnapshot.docs.map(doc => ({',
        '...doc.data()',
    ].forEach((token) => {
        assert(!alerts.includes(token), `Active alert reads must not return raw stored alert payloads: ${token}`);
    });
    assert(
        !telegramAlert.includes('response.text()'),
        'Telegram alert delivery must not log raw provider response bodies.',
    );
    [
        'TELEGRAM_BOT_TOKEN_PATTERN',
        'function getTelegramSendMessageUrl',
        'encodeURIComponent(normalizedToken)',
        'Bot token format invalid',
        'telegramSendMessageUrl',
        'function escapeTelegramHtml',
        'escapeTelegramHtml(alert.title)',
        'escapeTelegramHtml(alert.message)',
        'function getTelegramMetadataStringContext',
        "escapeTelegramHtml(getTelegramMetadataStringContext('storeId', alert.metadata.storeId))",
        "escapeTelegramHtml(getTelegramMetadataStringContext('tenantId', alert.metadata.tenantId))",
        'escapeTelegramHtml(String(alert.metadata.failureCode))',
        'escapeTelegramHtml(String(alert.metadata.consecutiveFailures))',
    ].forEach((token) => {
        assertIncludes(telegramAlert, token, 'Telegram alert delivery must validate and encode provider path segments.');
    });
    assert(
        !telegramAlert.includes('https://api.telegram.org/bot${token}/sendMessage'),
        'Telegram alert delivery must not interpolate raw bot token into provider URL path.',
    );
    assert(
        !telegramAlert.includes('`Store: ${alert.metadata.storeId}`'),
        'Telegram alert delivery must not render raw store identifiers in outbound text.',
    );
    assert(
        !telegramAlert.includes('`Tenant: ${alert.metadata.tenantId}`'),
        'Telegram alert delivery must not render raw tenant identifiers in outbound text.',
    );
    assert(
        !telegramAlert.includes('] ${alert.title}</b>'),
        'Telegram alert delivery must not render raw alert titles in HTML mode.',
    );
    assert(
        !telegramAlert.includes('\n    alert.message,\n'),
        'Telegram alert delivery must not render raw alert messages in HTML mode.',
    );
    assert(
        !telegramAlert.includes('`Code: ${alert.metadata.failureCode}`'),
        'Telegram alert delivery must not render raw failure-code metadata in HTML mode.',
    );
    [
        'getMonitoringErrorContext',
        'sourceErrorName',
        'sourceErrorCode',
        'sourceStatusCode',
    ].forEach((token) => {
        assertIncludes(monitoringDiagnostics, token, 'Monitoring diagnostics helper must expose bounded source error context.');
    });
    assertIncludes(
        safeMode,
        "failureCode: 'FUNCTIONS_SAFE_MODE_CHECK_FAILED'",
        'Functions SAFE_MODE helper must log a stable fail-open failure code.',
    );
    assertIncludes(
        safeMode,
        'error: getMonitoringErrorContext(error)',
        'Functions SAFE_MODE helper must use bounded monitoring diagnostics.',
    );
    assert(
        !safeMode.includes("error: error instanceof Error ? { name: error.name } : {}"),
        'Functions SAFE_MODE helper must not use ad hoc raw exception normalization.',
    );
    assertIncludes(
        deployMute,
        "failureCode: 'FUNCTIONS_DEPLOY_MUTE_CHECK_FAILED'",
        'Functions deploy mute helper must log a stable fail-open failure code.',
    );
    assertIncludes(
        deployMute,
        'error: getMonitoringErrorContext(error)',
        'Functions deploy mute helper must use bounded monitoring diagnostics.',
    );
    assert(
        !deployMute.includes("error: error instanceof Error ? { name: error.name } : {}"),
        'Functions deploy mute helper must not use ad hoc raw exception normalization.',
    );
    assertIncludes(
        errorTracking,
        "message: 'Critical system error recorded'",
        'Critical error alerts must use fixed stored alert text.',
    );
    assert(
        !errorTracking.includes('Critical Error: ${error.message}'),
        'Critical error alerts must not copy raw system-error text.',
    );
    [
        "(error.name || 'Error').slice(0, 80)",
        'String(code).slice(0, 64)',
        'String(status).slice(0, 32)',
        'getBoundedSystemErrorStringContext',
        'getStoredSystemErrorMessage',
        'sanitizeSystemErrorContext',
        'buildStoredSystemError',
        'buildSafeSystemErrorFromDoc',
        "return 'SYSTEM_ERROR_RECORDED';",
        'stored.stackPresent = true;',
        'stored.stackLength = error.stack.length;',
        '.where(\'message\', \'==\', storedError.message)',
        '...storedError,',
        'triggerCriticalAlert(storedError)',
        'buildSafeSystemErrorFromDoc(doc.id, doc.data())',
    ].forEach((token) => {
        assertIncludes(errorTracking, token, 'System error tracking must bound stored messages, stacks, contexts, and summary rows.');
    });
    [
        ".where('message', '==', error.message)",
        '...error,',
        '...doc.data()',
        'name: error instanceof Error ? error.name : undefined',
        "code: typeof record.code === 'string' ? record.code : undefined",
        "status: typeof record.status === 'number' ? record.status : undefined",
        'errorId: existingError.id',
        'logger.info(\'[Error Tracking] Marked error as resolved\', { errorId })',
        'tId,\n      sId,\n      daysBack',
    ].forEach((token) => {
        assert(!errorTracking.includes(token), `System error tracking must not keep raw diagnostic/storage pattern: ${token}`);
    });
    assertIncludes(
        healthCheck,
        "failureCode: code",
        'Health-check component failures must store fixed failure codes.',
    );
    assert(
        !healthCheck.includes("details: { error: error instanceof Error ? error.message"),
        'Health-check component failures must not store raw exception text.',
    );
    [
        'getBoundedPublishVerificationStringContext',
        'const PUBLISH_VERIFICATION_MIN_BODY_BYTES = 500;',
        'async function hasMinimumMenuResponseBytes(response: Response): Promise<boolean>',
        'const hasContent = await hasMinimumMenuResponseBytes(response);',
        "getBoundedPublishVerificationStringContext('storeId', storeId)",
        "getBoundedPublishVerificationStringContext('tenantId', tenantId)",
        'PUBLISH_VERIFICATION_FAILED_ALERT_MESSAGE',
        'message: PUBLISH_VERIFICATION_FAILED_ALERT_MESSAGE',
    ].forEach((token) => {
        assertIncludes(publishVerification, token, 'Publish verification diagnostics must bound store and tenant identifiers.');
    });
    [
        "logger.error('[PublishVerification] Failed to create alert', {\n        storeId,\n        tenantId,",
        "logger.info('[PublishVerification] Store health updated', {\n    storeId,\n    tenantId,",
        'const body = await response.text();',
        'response.text()',
        'Menu failed verification: ${verificationResult.failureReason}',
    ].forEach((token) => {
        assert(!publishVerification.includes(token), `Publish verification diagnostics must not keep raw identifier pattern: ${token}`);
    });
};

const assertDecisionBlocksAnalyticsLoggerRouting = () => {
    [
        'functions/src/analytics/analyticsDiagnostics.ts',
        'functions/src/analytics/authorityMaturation.ts',
        'functions/src/analytics/extractionLearning.ts',
        'functions/src/analytics/storeTruthConfidence.ts',
        'functions/src/analytics/stalenessCheck.ts',
        'functions/src/analytics/menuDriftMetrics.ts',
    ].forEach((relativePath) => {
        const source = read(relativePath);
        assertNoDirectConsoleAny(
            source,
            `${relativePath} must route scheduler diagnostics through functions.logger.`,
        );
        assert(
            !/\b(?:error|storeError|projectError)\.message\b/.test(source),
            `${relativePath} must not log or persist raw exception messages.`,
        );
    });

    const menuDriftMetrics = read('functions/src/analytics/menuDriftMetrics.ts');
    assertIncludes(
        menuDriftMetrics,
        "const PROJECT_DRIFT_FAILURE = 'PROJECT_DRIFT_METRICS_FAILED'",
        'Menu drift metrics must use a stable project failure code.',
    );
    assertIncludes(
        menuDriftMetrics,
        "const STORE_DRIFT_FAILURE = 'STORE_DRIFT_METRICS_FAILED'",
        'Menu drift metrics must use a stable store failure code.',
    );
    assertIncludes(
        menuDriftMetrics,
        "error: 'MENU_DRIFT_METRICS_FATAL'",
        'Menu drift fatal telemetry must use a stable failure code.',
    );
    assertIncludes(
        menuDriftMetrics,
        'const DRIFT_CHANGE_TYPES = new Set<MenuChangeType>',
        'Menu drift metrics must allowlist change-log types before computing counters.',
    );
    assertIncludes(
        menuDriftMetrics,
        "if (!data.timestamp || typeof data.timestamp.toMillis !== 'function') continue;",
        'Menu drift metrics must skip malformed timestamps before computing counters.',
    );
    assert(
        !menuDriftMetrics.includes('{ id: doc.id, ...doc.data() }'),
        'Menu drift metrics must not hydrate full change-log document payloads.',
    );
};

const assertFeedbackWeeklyNarrativeDiagnosticsRouting = () => {
    [
        'functions/src/analytics/feedbackIntelligence.ts',
        'functions/src/analytics/weeklyNarrative.ts',
        'functions/src/services/gemini/feedbackAnalysis.ts',
        'functions/src/services/gemini/weeklyNarrative.ts',
        'functions/src/services/gemini/geminiDiagnostics.ts',
        'functions/src/telemetry/logger.ts',
    ].forEach((relativePath) => {
        const source = read(relativePath);
        assertNoDirectConsoleAny(
            source,
            `${relativePath} must route AI insight diagnostics through functions.logger.`,
        );
        assert(
            !/\berror\.message\b/.test(source),
            `${relativePath} must not log or persist raw exception messages.`,
        );
        assert(
            !source.includes('Failed to parse Gemini response'),
            `${relativePath} must not rethrow raw Gemini parse details.`,
        );
    });

    const feedbackIntelligence = read('functions/src/analytics/feedbackIntelligence.ts');
    const weeklyNarrative = read('functions/src/analytics/weeklyNarrative.ts');
    const feedbackAnalysis = read('functions/src/services/gemini/feedbackAnalysis.ts');
    const weeklyNarrativeService = read('functions/src/services/gemini/weeklyNarrative.ts');
    const telemetryLogger = read('functions/src/telemetry/logger.ts');

    assertIncludes(
        feedbackIntelligence,
        "const FEEDBACK_INTELLIGENCE_FAILURE = 'FEEDBACK_INTELLIGENCE_FAILED';",
        'Feedback Intelligence telemetry must use a stable failure code.',
    );
    assertIncludes(
        feedbackIntelligence,
        "const FEEDBACK_INTELLIGENCE_STORE_FAILURE = 'FEEDBACK_INTELLIGENCE_STORE_FAILED';",
        'Feedback Intelligence per-store failures must use a stable failure code.',
    );
    assertIncludes(
        weeklyNarrative,
        "const WEEKLY_NARRATIVE_FAILURE = 'WEEKLY_NARRATIVE_FAILED';",
        'Weekly Narrative telemetry must use a stable failure code.',
    );
    assertIncludes(
        weeklyNarrative,
        "const WEEKLY_NARRATIVE_STORE_FAILURE = 'WEEKLY_NARRATIVE_STORE_FAILED';",
        'Weekly Narrative per-store failures must use a stable failure code.',
    );
    assertIncludes(
        feedbackAnalysis,
        "const GEMINI_FEEDBACK_ANALYSIS_PARSE_FAILED = 'GEMINI_FEEDBACK_ANALYSIS_PARSE_FAILED';",
        'Feedback Analysis Gemini parser must use a stable parse failure code.',
    );
    assertIncludes(
        weeklyNarrativeService,
        "const GEMINI_WEEKLY_NARRATIVE_PARSE_FAILED = 'GEMINI_WEEKLY_NARRATIVE_PARSE_FAILED';",
        'Weekly Narrative Gemini parser must use a stable parse failure code.',
    );
    assertIncludes(
        telemetryLogger,
        "const TELEMETRY_WRAPPED_FUNCTION_FAILED = 'TELEMETRY_WRAPPED_FUNCTION_FAILED';",
        'Telemetry wrapper failures must use a stable failure code.',
    );
};

const assertKBQualityDiagnosticsRouting = () => {
    [
        'functions/src/analytics/kbQuality.ts',
        'functions/src/services/gemini/kbQuality.ts',
    ].forEach((relativePath) => {
        const source = read(relativePath);
        assertNoDirectConsoleAny(
            source,
            `${relativePath} must route KB Quality diagnostics through functions.logger.`,
        );
        assert(
            !/\berror\.message\b/.test(source),
            `${relativePath} must not log or persist raw exception messages.`,
        );
    });

    const kbQuality = read('functions/src/analytics/kbQuality.ts');
    const kbQualityService = read('functions/src/services/gemini/kbQuality.ts');
    const decisionBlocksScoring = read('functions/src/decisionBlocksScoring.ts');
    const answerlatticeFunctionsIndex = read('functions-answerlattice/src/index.ts');
    const answerlatticeScheduler = read('functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts');
    const chatMonitoringReadme = read('__docs__/answerlattice/chat-monitoring/README.md');
    const chatMonitoringImpl = read('__docs__/answerlattice/chat-monitoring/chat-monitoring_impl.md');
    const productSeparationPlaybook = read('__docs__/answerlattice/doctrine/08-product-separation-playbook.md');
    const multiProductTenancy = read('__docs__/answerlattice/doctrine/07-multi-product-tenancy.md');

    assertIncludes(
        kbQuality,
        "const KB_QUALITY_FAILURE = 'KB_QUALITY_FAILED';",
        'KB Quality store telemetry must use a stable failure code.',
    );
    assertIncludes(
        kbQuality,
        "const KB_QUALITY_BATCH_FAILURE = 'KB_QUALITY_BATCH_FAILED';",
        'KB Quality batch telemetry must use a stable failure code.',
    );
    assertIncludes(
        kbQualityService,
        "const GEMINI_KB_QUALITY_PARSE_FAILED = 'GEMINI_KB_QUALITY_PARSE_FAILED';",
        'KB Quality Gemini parser must use a stable parse failure code.',
    );
    assertIncludes(
        kbQualityService,
        'Number.isFinite(qualityScore)',
        'KB Quality parser must accept a valid zero score instead of treating it as missing.',
    );
    assertIncludes(
        kbQuality,
        'const MAX_KB_QUALITY_ARTICLES_PER_STORE = 10;',
        'KB Quality store analysis must keep a bounded article cap for one-call store analysis.',
    );
    assertIncludes(
        kbQuality,
        'const analysis = await analyzeKBStoreQuality({',
        'KB Quality scheduler must analyze store quality in one bounded Gemini call.',
    );
    assertIncludes(
        kbQuality,
        ".doc('kbQuality')",
        'KB Quality output must write the documented store-level ai/kbQuality insight document.',
    );
    assertIncludes(
        kbQuality,
        "promptVersion: 'v1-store'",
        'KB Quality output must mark the store-level prompt contract.',
    );
    assertIncludes(
        kbQualityService,
        "const GEMINI_KB_QUALITY_STORE_FAILED = 'GEMINI_KB_QUALITY_STORE_FAILED';",
        'KB Quality store-level Gemini analysis must use a stable failure code.',
    );
    assertIncludes(
        decisionBlocksScoring,
        "const KB_QUALITY_TASK_FAILED = 'KB_QUALITY_TASK_FAILED';",
        'Decision Blocks KB Quality task result must use a stable failure code.',
    );
    assertIncludes(
        kbQuality,
        '.collection(DB_COLLECTIONS.TENANTS)',
        'KB Quality must remain documented as a MenuList tenant/store chat-monitoring job until it is deliberately migrated.',
    );
    assertIncludes(
        kbQuality,
        '.collection(DB_COLLECTIONS.KNOWLEDGE_BASE)',
        'KB Quality must remain documented as scanning MenuList nested knowledgeBase documents until it is deliberately migrated.',
    );
    assertIncludes(
        chatMonitoringReadme,
        'Product-boundary note:',
        'Chat Monitoring docs must identify the MenuList-hosted legacy runtime boundary.',
    );
    assertIncludes(
        chatMonitoringImpl,
        'Product-boundary note:',
        'Chat Monitoring implementation docs must identify the MenuList-hosted legacy runtime boundary.',
    );
    assertIncludes(
        productSeparationPlaybook,
        'Legacy MenuList chat-monitoring boundary',
        'Answerlattice product separation playbook must name the current KB Quality runtime boundary.',
    );
    assertIncludes(
        multiProductTenancy,
        'Legacy MenuList chat-monitoring boundary',
        'Answerlattice multi-product doctrine must name the current KB Quality runtime boundary.',
    );
    [
        answerlatticeFunctionsIndex,
        answerlatticeScheduler,
    ].forEach((source) => {
        assert(
            !source.includes('processKBQualityForAllStores') && !source.includes('kb_quality'),
            'Answerlattice Functions must not claim the legacy MenuList KB Quality scheduler without a deliberate migration.',
        );
    });
    [
        "'Feedback Intelligence failed:', fiError.message",
        "error: fiError.message",
        "'KB Quality Analysis failed:', kbError.message",
        "error: kbError.message",
        "'Weekly Narrative failed:', wnError.message",
        "error: wnError.message",
    ].forEach((rawPattern) => {
        assert(
            !decisionBlocksScoring.includes(rawPattern),
            `Decision Blocks AI insight task results must not use raw exception text via ${rawPattern}.`,
        );
    });
    [
        'Firestore Path: insights/{tId}/stores/{sId}/ai/kbQuality/{articleId}',
        'const docPath = `insights/${analysis.tId}/stores/${analysis.sId}/ai/kbQuality`',
        'collection(docPath)',
        'storeKBQualityAnalysis',
        "import { analyzeKBArticleQuality } from '../services/gemini/kbQuality';",
    ].forEach((rawPattern) => {
        assert(
            !kbQuality.includes(rawPattern),
            `KB Quality store insight contract must not keep old per-article output pattern ${rawPattern}.`,
        );
    });
};

const assertOwnerDashboardGeminiDiagnosticsRouting = () => {
    [
        'functions/src/services/gemini/ownerDashboardSummary.ts',
        'functions/src/services/gemini/ownerActionPlan.ts',
    ].forEach((relativePath) => {
        const source = read(relativePath);
        assertNoDirectConsoleAny(
            source,
            `${relativePath} must route owner dashboard Gemini diagnostics through functions.logger.`,
        );
        assert(
            !/\berror\.message\b/.test(source),
            `${relativePath} must not log, return, or rethrow raw exception messages.`,
        );
        assert(
            !source.includes('Failed to parse Gemini response'),
            `${relativePath} must not rethrow raw Gemini parse details.`,
        );
    });

    const ownerDashboardSummary = read('functions/src/services/gemini/ownerDashboardSummary.ts');
    const ownerActionPlan = read('functions/src/services/gemini/ownerActionPlan.ts');

    assertIncludes(
        ownerDashboardSummary,
        "const GEMINI_OWNER_DASHBOARD_PARSE_FAILED = 'GEMINI_OWNER_DASHBOARD_PARSE_FAILED';",
        'Owner dashboard Gemini parser must use a stable parse failure code.',
    );
    assertIncludes(
        ownerDashboardSummary,
        "const GEMINI_OWNER_DASHBOARD_SUMMARY_FAILED = 'GEMINI_OWNER_DASHBOARD_SUMMARY_FAILED';",
        'Owner dashboard weekly summary generation must use a stable failure code.',
    );
    assertIncludes(
        ownerDashboardSummary,
        "const GEMINI_OWNER_DASHBOARD_DAILY_FAILED = 'GEMINI_OWNER_DASHBOARD_DAILY_FAILED';",
        'Owner dashboard daily summary generation must use a stable failure code.',
    );
    assertIncludes(
        ownerDashboardSummary,
        "const GEMINI_OWNER_DASHBOARD_MONTHLY_FAILED = 'GEMINI_OWNER_DASHBOARD_MONTHLY_FAILED';",
        'Owner dashboard monthly summary generation must use a stable failure code.',
    );
    assertIncludes(
        ownerDashboardSummary,
        'error: getGeminiErrorContext(error)',
        'Owner dashboard Gemini summaries must log bounded error context.',
    );
    assertIncludes(
        ownerActionPlan,
        "const GEMINI_OWNER_ACTION_PLAN_PARSE_FAILED = 'GEMINI_OWNER_ACTION_PLAN_PARSE_FAILED';",
        'Owner action plan Gemini parser must use a stable parse failure code.',
    );
    assertIncludes(
        ownerActionPlan,
        "const GEMINI_OWNER_ACTION_PLAN_FAILED = 'GEMINI_OWNER_ACTION_PLAN_FAILED';",
        'Owner action plan Gemini generation must use a stable failure code.',
    );
    assertIncludes(
        ownerActionPlan,
        'error: getGeminiErrorContext(error)',
        'Owner action plan Gemini service must log bounded error context.',
    );
};

const assertSmallFunctionsConsoleCleanup = () => {
    [
        'functions/src/index.ts',
        'functions/src/logic/aiResponseUtils.ts',
        'functions/src/aggregateCustomerAnalytics.ts',
    ].forEach((relativePath) => {
        assertNoDirectConsoleAny(
            read(relativePath),
            `${relativePath} must not direct-console raw runtime diagnostics.`,
        );
    });

    const functionsIndex = read('functions/src/index.ts');
    const aiResponseUtils = read('functions/src/logic/aiResponseUtils.ts');
    const aggregateCustomerAnalytics = read('functions/src/aggregateCustomerAnalytics.ts');

    assertIncludes(
        functionsIndex,
        "functionsLogger.info('[Dev] Loaded .env.local for emulator'",
        'Functions entrypoint emulator dotenv notice must use functions.logger.',
    );
    assertIncludes(
        aiResponseUtils,
        "const AI_RESPONSE_PARSE_FAILED = 'AI_RESPONSE_PARSE_FAILED';",
        'AI response parser must use a stable parse failure code.',
    );
    assertIncludes(
        aiResponseUtils,
        "const AI_RESPONSE_VALIDATION_WARNINGS = 'AI_RESPONSE_VALIDATION_WARNINGS';",
        'AI response validation warnings must use a stable warning code.',
    );
    assert(
        !/\berror\.message\b/.test(aiResponseUtils),
        'AI response utilities must not log raw parser exception messages.',
    );
    assert(
        !aiResponseUtils.includes("Validation warnings:', validation.errors"),
        'AI response utilities must not log raw validation warning details.',
    );
    assertIncludes(
        aggregateCustomerAnalytics,
        "appLogger.info('[ManualCustomerAnalytics] Trigger accepted'",
        'Manual customer analytics trigger must use the app logger.',
    );
    assertIncludes(
        aggregateCustomerAnalytics,
        "const CUSTOMER_ANALYTICS_PROJECT_AGGREGATION_FAILED = 'CUSTOMER_ANALYTICS_PROJECT_AGGREGATION_FAILED';",
        'Customer analytics project aggregation failures must use a stable failure code.',
    );
    assertIncludes(
        aggregateCustomerAnalytics,
        "const CUSTOMER_ANALYTICS_MANUAL_TRIGGER_FAILED = 'CUSTOMER_ANALYTICS_MANUAL_TRIGGER_FAILED';",
        'Manual customer analytics trigger failures must use a stable failure code.',
    );
    assert(
        !/\berror\.message\b/.test(aggregateCustomerAnalytics),
        'Customer analytics must not log, return, or persist raw exception messages.',
    );
    assert(
        !aggregateCustomerAnalytics.includes('error: aiError instanceof Error ? aiError.message'),
        'Customer analytics AI summary failures must not log raw AI exception messages.',
    );
    assertIncludes(
        aggregateCustomerAnalytics,
        'projectIdLength: String(projectId || \'\').length',
        'Manual customer analytics trigger must bound project IDs in diagnostics.',
    );
    assert(
        !aggregateCustomerAnalytics.includes('[Manual Trigger] User:'),
        'Manual customer analytics trigger must not log raw requester and project identifiers.',
    );
};

const assertChatAggregationDiagnosticsRouting = () => {
    [
        'functions/src/aggregateDailyChatStats.ts',
        'functions/src/triggerAggregationManual.ts',
    ].forEach((relativePath) => {
        const source = read(relativePath);
        assertNoDirectConsoleAny(
            source,
            `${relativePath} must route chat aggregation diagnostics through functions.logger.`,
        );
        assert(
            !/\berror\.message\b/.test(source),
            `${relativePath} must not log, return, or persist raw exception messages.`,
        );
    });

    const aggregateDailyChatStats = read('functions/src/aggregateDailyChatStats.ts');
    const negativeFeedbackAlert = read('functions/src/negativeFeedbackAlert.ts');
    const triggerAggregationManual = read('functions/src/triggerAggregationManual.ts');

    assertIncludes(
        aggregateDailyChatStats,
        "const CHAT_DAILY_STORE_AGGREGATION_FAILED = 'CHAT_DAILY_STORE_AGGREGATION_FAILED';",
        'Daily chat aggregation store failures must use a stable failure code.',
    );
    assertIncludes(
        aggregateDailyChatStats,
        "const CHAT_BACKFILL_DAY_FAILED = 'CHAT_BACKFILL_DAY_FAILED';",
        'Daily chat aggregation backfill failures must use a stable failure code.',
    );
    assertIncludes(
        aggregateDailyChatStats,
        "'chatAnalytics.lastError': CHAT_DAILY_STORE_AGGREGATION_FAILED",
        'Daily chat aggregation must persist stable store failure codes.',
    );
    assertIncludes(
        aggregateDailyChatStats,
        'Check Functions logs for bounded store context.',
        'Daily chat aggregation Slack alerts must avoid raw tenant/store error lists.',
    );
    assertIncludes(
        aggregateDailyChatStats,
        "import { validateNetworkTargetUrl } from './utils/networkTarget';",
        'Daily chat aggregation Slack alerts must import the shared network target validator.',
    );
    assertIncludes(
        aggregateDailyChatStats,
        "const CHAT_DAILY_SLACK_TARGET_REJECTED = 'CHAT_DAILY_SLACK_TARGET_REJECTED';",
        'Daily chat aggregation Slack target rejections must use a stable failure code.',
    );
    assertIncludes(
        aggregateDailyChatStats,
        'validateNetworkTargetUrl(String(webhookUrl))',
        'Daily chat aggregation Slack alerts must validate configured webhook targets before fetching.',
    );
    assertIncludes(
        aggregateDailyChatStats,
        'fetch(targetValidation.normalizedUrl,',
        'Daily chat aggregation Slack alerts must fetch only the validated normalized webhook URL.',
    );
    assert(
        !aggregateDailyChatStats.includes('fetch(webhookUrl'),
        'Daily chat aggregation Slack alerts must not fetch the raw configured webhook URL.',
    );
    assertIncludes(
        negativeFeedbackAlert,
        "import { validateNetworkTargetUrl } from './utils/networkTarget';",
        'Negative feedback Slack alerts must import the shared network target validator.',
    );
    assertIncludes(
        negativeFeedbackAlert,
        "const NEGATIVE_FEEDBACK_SLACK_TARGET_REJECTED = 'NEGATIVE_FEEDBACK_SLACK_TARGET_REJECTED';",
        'Negative feedback Slack target rejections must use a stable failure code.',
    );
    assertIncludes(
        negativeFeedbackAlert,
        'validateNetworkTargetUrl(String(webhookUrl))',
        'Negative feedback Slack alerts must validate configured webhook targets before fetching.',
    );
    assertIncludes(
        negativeFeedbackAlert,
        'fetch(targetValidation.normalizedUrl,',
        'Negative feedback Slack alerts must fetch only the validated normalized webhook URL.',
    );
    assert(
        !negativeFeedbackAlert.includes('fetch(webhookUrl'),
        'Negative feedback Slack alerts must not fetch the raw configured webhook URL.',
    );
    [
        'Final Results:',
        'Errors encountered:',
        'Tenant ${e.tId}',
        'error instanceof Error ? error.message',
        'String(error)',
    ].forEach((rawPattern) => {
        assert(
            !aggregateDailyChatStats.includes(rawPattern),
            `Daily chat aggregation must not keep raw diagnostic pattern ${rawPattern}.`,
        );
    });

    assertIncludes(
        triggerAggregationManual,
        "const MANUAL_CHAT_AGGREGATION_DAY_FAILED = 'MANUAL_CHAT_AGGREGATION_DAY_FAILED';",
        'Manual chat aggregation day failures must use a stable failure code.',
    );
    assertIncludes(
        triggerAggregationManual,
        "'chatAnalytics.lastError': MANUAL_CHAT_AGGREGATION_FAILED",
        'Manual chat aggregation catch-all must persist a stable failure code.',
    );
    assertIncludes(
        triggerAggregationManual,
        'Aggregation failed for one or more days. Please try again.',
        'Manual chat aggregation partial failures must return fixed callable copy.',
    );
    [
        '[Manual Trigger]',
        'Aggregation failed: ${results.errors.join',
        'error instanceof Error ? error.message',
        'String(error)',
    ].forEach((rawPattern) => {
        assert(
            !triggerAggregationManual.includes(rawPattern),
            `Manual chat aggregation must not keep raw diagnostic pattern ${rawPattern}.`,
        );
    });
};

const assertRealtimeTrackingDiagnosticsRouting = () => {
    const realtimeTracking = read('functions/src/analytics/realtimeTracking.ts');

    assertNoDirectConsoleAny(
        realtimeTracking,
        'functions/src/analytics/realtimeTracking.ts must route realtime diagnostics through functions.logger.',
    );
    assert(
        !/\berror\.message\b/.test(realtimeTracking),
        'Realtime tracking must not log or persist raw exception messages.',
    );
    [
        'Chat completed: ${data.sessionId}',
        'Error tracking chat completion:',
        'Error tracking feedback:',
        'Error tracking regeneration:',
        "Error fetching today\\'s stats:",
        'Initialized document for ${today}',
        'Error initializing document:',
    ].forEach((rawPattern) => {
        assert(
            !realtimeTracking.includes(rawPattern),
            `Realtime tracking must not keep old raw diagnostic string ${rawPattern}.`,
        );
    });
    assertIncludes(
        realtimeTracking,
        "const REALTIME_CHAT_COMPLETION_TRACKING_FAILED = 'REALTIME_CHAT_COMPLETION_TRACKING_FAILED';",
        'Realtime chat completion failures must use a stable failure code.',
    );
    assertIncludes(
        realtimeTracking,
        'sessionId: getAnalyticsIdContext(data.sessionId)',
        'Realtime tracking must bound session identifiers before diagnostics.',
    );
};

const assertSchedulerManualRetentionDiagnosticsRouting = () => {
    [
        'functions/src/analytics/guestFeedbackRetention.ts',
        'functions/src/schedulers/masterScheduler.ts',
    ].forEach((relativePath) => {
        const source = read(relativePath);
        assertNoDirectConsoleAny(
            source,
            `${relativePath} must route scheduler diagnostics through functions.logger.`,
        );
        assert(
            !/\berror\.message\b/.test(source),
            `${relativePath} must not log, return, or persist raw exception messages.`,
        );
    });

    const guestFeedbackRetention = read('functions/src/analytics/guestFeedbackRetention.ts');
    const masterScheduler = read('functions/src/schedulers/masterScheduler.ts');
    const decisionBlocksScoring = read('functions/src/decisionBlocksScoring.ts');
    const maintenanceScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');

    assertIncludes(
        guestFeedbackRetention,
        "const GUEST_FEEDBACK_RETENTION_BATCH_DELETE_FAILED = 'GUEST_FEEDBACK_RETENTION_BATCH_DELETE_FAILED';",
        'Guest Feedback Retention batch failures must use stable failure codes.',
    );
    assertIncludes(
        masterScheduler,
        "const MANUAL_TRIGGER_FEEDBACK_INTELLIGENCE_FAILED = 'MANUAL_TRIGGER_FEEDBACK_INTELLIGENCE_FAILED';",
        'Manual scheduler task failures must use stable failure codes.',
    );
    assertIncludes(
        masterScheduler,
        "'Manual trigger failed.'",
        'Manual scheduler callable must return fixed failure copy.',
    );
    assertIncludes(
        decisionBlocksScoring,
        "const GUEST_FEEDBACK_RETENTION_TASK_FAILED = 'GUEST_FEEDBACK_RETENTION_TASK_FAILED';",
        'Decision Blocks retention task result must use a stable failure code.',
    );
    [
        "const SCHEDULER_TASK_FAILED_MESSAGE = 'Scheduler task failed';",
        "const SCHEDULER_ANALYTICS_SETTLEMENT_FAILED = 'SCHEDULER_ANALYTICS_SETTLEMENT_FAILED';",
        "const SCHEDULER_OWNER_BUSINESS_HEALTH_FAILED = 'SCHEDULER_OWNER_BUSINESS_HEALTH_FAILED';",
        "const SCHEDULER_PROJECT_INTELLIGENCE_FAILED = 'SCHEDULER_PROJECT_INTELLIGENCE_FAILED';",
        "const SCHEDULER_PROJECT_SCORING_FAILED = 'SCHEDULER_PROJECT_SCORING_FAILED';",
        "const SCHEDULER_STORE_RECOVERY_FAILED = 'SCHEDULER_STORE_RECOVERY_FAILED';",
        "const SCHEDULER_STORE_SUMMARY_ENRICHMENT_FAILED = 'SCHEDULER_STORE_SUMMARY_ENRICHMENT_FAILED';",
        "const SCHEDULER_AUTHORITY_MATURATION_FAILED = 'SCHEDULER_AUTHORITY_MATURATION_FAILED';",
        "const SCHEDULER_MENU_DRIFT_FAILED = 'SCHEDULER_MENU_DRIFT_FAILED';",
        "const SCHEDULER_SUBSCRIPTION_RECONCILIATION_FAILED = 'SCHEDULER_SUBSCRIPTION_RECONCILIATION_FAILED';",
        "const SCHEDULER_LIFECYCLE_MESSAGING_FAILED = 'SCHEDULER_LIFECYCLE_MESSAGING_FAILED';",
        "const SCHEDULER_SPECIAL_MENU_ACTIVATE_FAILED = 'SCHEDULER_SPECIAL_MENU_ACTIVATE_FAILED';",
        "const SCHEDULER_SPECIAL_MENU_DEACTIVATE_FAILED = 'SCHEDULER_SPECIAL_MENU_DEACTIVATE_FAILED';",
        "const SCHEDULER_SPECIAL_MENU_STORE_CHECK_FAILED = 'SCHEDULER_SPECIAL_MENU_STORE_CHECK_FAILED';",
        "const SCHEDULER_SPECIAL_MENU_TASK_FAILED = 'SCHEDULER_SPECIAL_MENU_TASK_FAILED';",
        "const SCHEDULER_EXTRACTION_LEARNING_FAILED = 'SCHEDULER_EXTRACTION_LEARNING_FAILED';",
        "const SCHEDULER_STORE_TRUTH_CONFIDENCE_FAILED = 'SCHEDULER_STORE_TRUTH_CONFIDENCE_FAILED';",
        "const SCHEDULER_STALENESS_CHECK_FAILED = 'SCHEDULER_STALENESS_CHECK_FAILED';",
        "const SCHEDULER_HEALTH_SIGNALS_FAILED = 'SCHEDULER_HEALTH_SIGNALS_FAILED';",
        "const SCHEDULER_KB_GENERATION_WATCHDOG_FAILED = 'SCHEDULER_KB_GENERATION_WATCHDOG_FAILED';",
        "const SCHEDULER_RUN_LOG_PERSIST_FAILED = 'SCHEDULER_RUN_LOG_PERSIST_FAILED';",
        "const SCHEDULER_DECISION_BLOCKS_FATAL_FAILED = 'SCHEDULER_DECISION_BLOCKS_FATAL_FAILED';",
        "const SCHEDULER_COMPLETION_ALERT_FAILED = 'SCHEDULER_COMPLETION_ALERT_FAILED';",
        "const SCHEDULER_MANUAL_STORE_NOT_FOUND = 'SCHEDULER_MANUAL_STORE_NOT_FOUND';",
        "const SCHEDULER_MANUAL_STORE_TENANT_MISMATCH = 'SCHEDULER_MANUAL_STORE_TENANT_MISMATCH';",
        "const MANUAL_STORE_NOT_FOUND_MESSAGE = 'Store was not found in storesSummary.';",
        "const MANUAL_STORE_TENANT_MISMATCH_MESSAGE = 'Store does not match the requested tenant.';",
        'function logSchedulerFailure(',
        'function getSchedulerSourceErrorContext(',
        'function getSchedulerIdLogContext(',
        'function getSchedulerProgressLogContext(',
        'function logSchedulerInfo(',
        'function logSchedulerWarn(',
        'function buildSchedulerFailureDiagnostic(',
        "logSchedulerFailure(logger, '[DecisionBlocks] Completion alert failed'",
        "logSchedulerFailure(logger, '[DecisionBlocks] Store enrichment collection failed'",
        "operation: 'collect_store_enrichment'",
    ].forEach((requiredPattern) => {
        assertIncludes(
            decisionBlocksScoring,
            requiredPattern,
            `Decision Blocks scheduler failure boundary must keep ${requiredPattern}.`,
        );
    });
    [
        "const RESELLER_LICENSE_EXPIRE_FAILED_CODE = 'RESELLER_LICENSE_EXPIRE_FAILED';",
        "name: 'reseller_license_expiry'",
        "failureCode: RESELLER_LICENSE_EXPIRE_FAILED_CODE",
        "run: runResellerLicenseExpiry",
    ].forEach((requiredPattern) => {
        assertIncludes(
            maintenanceScheduler,
            requiredPattern,
            `Maintenance scheduler reseller expiry boundary must keep ${requiredPattern}.`,
        );
    });
    assert(
        !decisionBlocksScoring.includes('SCHEDULER_RESELLER_LICENSE_EXPIRE_FAILED'),
        'Decision Blocks scheduler must not own reseller expiry failure codes.',
    );
    [
        "'Guest Feedback Retention failed:', retentionError.message",
        "error: retentionError.message",
        'settlementError?.message || String(settlementError)',
        '`Nightly analytics failed: ${analyticsError.message}`',
        'ownerBusinessHealthError.message || String(ownerBusinessHealthError)',
        '`    ✗ Project ${projectId} intelligence: ${intError.message}`',
        '`    ✗ Project ${projectId}: ${error.message}`',
        'error: error.message',
        '`  ✗ Store ${sId}: ${error.message}`',
        'enrichError.message',
        'maturationError.message',
        'driftError.message',
        'reconcileError.message',
        'msgError.message',
        'e.message',
        'smError.message',
        'learningError.message',
        'truthError.message',
        'stalenessError.message',
        'resellerError.message',
        'hsError.message',
        'watchdogError.message',
        'message || String(',
        "import { logger as appLogger } from './lib/logger';",
        'logger.warn(`[${tId}_${sId}_${projectId}] Missing or stale intelligence snapshot; manual scoring without analytics`)',
        'logger.info(`[${tId}_${sId}] No items found`)',
        'logger.info(`Store ${sId}: Inactive, skipping`)',
        'logger.warn(`Store ${sId} has no tenantId, skipping`)',
        'logger.info(`Processing store ${sId} (tenant ${tId})...`)',
        'logger.info(`  - Store ${sId}: No active projects found (${source}); analytics settlement still runs`)',
        'logger.info(`  Found ${projectEntries.length} active projects for store ${sId} (${source})`)',
        'logger.info(`  - Store ${sId}: Analytics already settled`)',
        'logger.info(`  - Store ${sId}: Settlement ${settlementDate} already locked or completed`)',
        'logger.error(`  ✗ Store ${sId} analytics (${settlementDate}): ${customerAggregation.errors.length} project aggregation errors`)',
        'appLogger.warn(\'[NightlyAnalytics] Missing or stale intelligence snapshot; scoring without analytics\'',
        'logger.info(`    ✓ Project ${projectId}: Computed decision blocks`)',
        'logger.info(`    ✓ Project ${projectId}: Computed menu intelligence`)',
        'logger.info(`    - Project ${projectId}: No items to score`)',
        'logger.info(`  ✓ Activated special menu "${projData.specialMenuDisplayName}" for store ${sId}`)',
        'logger.info(`  ✓ Deactivated special menu "${projData.specialMenuDisplayName}" for store ${sId}`)',
        'logger.info(`  ✓ Expired manual subscription ${subDoc.id} (store ${subData.storeId})`)',
        "logger.error('Fatal error in decision blocks scoring:', error)",
        "appLogger.error('[ManualSchedulerRecovery] Failed'",
        'logger.info(`Manual trigger for project ${projectId} (store ${sId}, tenant ${tId})`)',
        'logger.info(`Manual trigger for all projects in store ${sId} (tenant ${tId})`)',
        'new Error(`Store ${sId} was not found in storesSummary`)',
        'new Error(`Store ${sId} does not belong to tenant ${tId}`)',
        'throw new HttpsError(\'not-found\', `Store ${sId} was not found in storesSummary`',
        'throw new HttpsError(\'failed-precondition\', `Store ${sId} does not belong to tenant ${tId}`',
        'Non-blocking — enrichment failure should never block scoring',
    ].forEach((rawPattern) => {
        assert(
            !decisionBlocksScoring.includes(rawPattern),
            `Decision Blocks scheduler task results must not use raw exception text via ${rawPattern}.`,
        );
    });
    assert(
        !/\b(?:settlementError|analyticsError|ownerBusinessHealthError|intError|error|enrichError|maturationError|driftError|reconcileError|msgError|e|smError|learningError|truthError|stalenessError|resellerError|hsError|watchdogError)\.message\b/.test(decisionBlocksScoring),
        'Decision Blocks scheduler must not log, persist, or rethrow raw scheduler exception messages.',
    );
};

const assertNoOwnerVisibleRawErrorMessage = (content, label) => {
    [
        'error instanceof Error ? error.message',
        'error?.message',
        'error.message ||',
        'message.error(error.message',
        'description: error.message',
        '${error.message}',
        'Toast.show({ content: error',
    ].forEach((rawPattern) => {
        assert(!content.includes(rawPattern), `${label} must not surface raw exception text via ${rawPattern}.`);
    });
};

const publicApi = read('src/middleware/publicApi.ts');
const secureLogger = read('src/lib/security/secureLogger.ts');
const loggerSource = read('src/lib/monitoring/logger.ts');
const clientConsoleBuffer = read('src/lib/debug/clientConsoleBuffer.ts');
const localLogsTracker = read('src/lib/localLogs/localLogsTracker.ts');
const sentryShared = read('src/lib/monitoring/sentryShared.ts');
const instrumentationClient = read('instrumentation-client.ts');
const sentryServerConfig = read('sentry.server.config.ts');
const sentryEdgeConfig = read('sentry.edge.config.ts');
const functionsSentry = read('functions/src/lib/sentry.ts');
const functionsLogger = read('functions/src/lib/logger.ts');
const uiErrorMessages = read('src/lib/errors/uiErrorMessages.ts');
const dragAndDropHook = read('src/hooks/useDragAndDrop.ts');
const rateLimit = read('src/lib/rateLimit.ts');
const rateLimitHelpers = read('src/lib/rateLimit/helpers.ts');
const functionsRateLimit = read('functions/src/lib/rateLimit.ts');
const healthSignalsComputation = read('functions/src/analytics/healthSignalsComputation.ts');
const localLogUtils = read('src/lib/logs/utils.ts');
const functionsLogUtils = read('functions/src/utils/log-utils.ts');
const envValidation = read('src/lib/env/validateEnv.ts');
const envDiagnostics = read('src/lib/env/envDiagnostics.ts');
const databaseLoggerDiagnostics = read('src/database/loggers/loggerDiagnostics.ts');
const databaseOperationLogger = read('src/database/loggers/databaseOperation.ts');
const applicationLogger = read('src/database/loggers/applicationLogger.ts');
const errorLogger = read('src/database/loggers/errorLogger.ts');
const i18nDiagnostics = read('src/i18n/diagnostics.ts');
const i18nRequest = read('src/i18n/request.ts');
const legacyI18nRequest = read('src/i18n-old.ts');
const intlClientWrapper = read('src/providers/IntlClientWrapper.tsx');
const securityDiagnostics = read('src/lib/security/securityDiagnostics.ts');
const inputValidation = read('src/lib/security/inputValidation.ts');
const magicBytesValidator = read('src/lib/security/magicBytesValidator.ts');
const fileValidation = read('src/lib/security/fileValidation.ts');
const webhookValidation = read('src/lib/security/webhookValidation.ts');
const razorpayWebhookValidator = read('src/lib/razorpay/webhook-validator.ts');
const runtimeDiagnostics = read('src/lib/runtime/runtimeDiagnostics.ts');
const randomIdRuntime = read('src/lib/runtime/randomId.ts');
const performanceUtils = read('src/lib/utils/performance.ts');
const rootLayout = read('src/app/layout.tsx');
const serviceWorkerRegister = read('src/components/ServiceWorkerRegister.tsx');
const globalError = read('src/app/global-error.tsx');
const appError = read('src/app/error.tsx');
const globalPagesError = read('src/app/(global-pages)/error.tsx');
const errorReportButton = read('src/components/shared/debug/ErrorReportButton.tsx');
const testSentryPage = read('src/components/pages/TestSentryPage/index.tsx');
const testSentryRoute = read('src/app/(main)/platform/test-sentry/page.tsx');
const platformLayout = read('src/app/(main)/platform/layout.tsx');
const opsLayout = read('src/app/(main)/ops/layout.tsx');
const resellerLayout = read('src/app/(main)/reseller/layout.tsx');
const resellerManageLayout = read('src/app/(main)/reseller/manage/layout.tsx');
const platformRouteGuard = read('src/lib/auth/platformRouteGuard.ts');
const navigationConstants = read('src/constants/navigations.ts');
const permissionRequirements = read('src/lib/permissions/permissionRequirements.ts');
const layoutProvider = read('src/providers/layoutProvider.tsx');
const mainLayout = read('src/app/(main)/layout.tsx');
const analyticsContext = read('src/contexts/AnalyticsContext.tsx');
const chatAnalyticsService = read('src/services/chatAnalytics/index.ts');
const systemHealthDashboard = read('src/components/analytics/SystemHealthDashboard.tsx');
const analyticsExportButton = read('src/components/analytics/ExportButton.tsx');
const ownerBusinessAssistantAnswerHook = read('src/hooks/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer.ts');
const businessCopyLocalization = read('src/services/ai/businessCopy/localizeBusinessCopyResult.ts');
const formatters = read('src/utils/formatters.ts');
const exportUtils = read('src/utils/exportUtils.ts');
const sharedUtils = read('src/utils/utils.ts');
const aiSearchActionButtons = read('src/components/organisms/AISearchModal/ActionButtons.tsx');
const answerlatticeSupportClipboard = read('src/lib/answerlattice/supportClipboard.ts');
const notificationCenter = read('src/components/notifications/NotificationCenter.tsx');
const mobileProjectSelectorSheet = read('src/components/mobile/components/MobileProjectSelectorSheet.tsx');
const mobileDesignEditorScreen = read('src/components/mobile/screens/MobileDesignEditorScreen.tsx');
const mobileBusinessHealthScreen = read('src/components/mobile/screens/MobileBusinessHealthScreen.tsx');
const mobileBasicSettingsScreen = read('src/components/mobile/screens/MobileBasicSettingsScreen.tsx');
const mobileBusinessCopySetupScreen = read('src/components/mobile/screens/MobileBusinessCopySetupScreen.tsx');
const mobileMoreScreen = read('src/components/mobile/screens/MobileMoreScreen.tsx');
const storeSwitcher = read('src/components/molecules/StoreSwitcher/index.tsx');
const mobileItemEditSheet = read('src/components/mobile/sheets/ItemEditSheet.tsx');
const ownerAssistantPanel = read('src/components/templates/main-app/ownerBusinessAssistant/OwnerAssistantPanel.tsx');
const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
const businessCopySetupTab = read('src/components/templates/main-app/businessSettings/tabs/BusinessCopySetupTab.tsx');
const reviewReplyTool = read('src/components/templates/main-app/reviews/ReviewReplyTool.tsx');
const aiPackStatusRoute = read('src/app/api/ai-packs/status/route.ts');
const businessCopyRoute = read('src/app/api/business-copy/route.ts');
const campaignCaptionRoute = read('src/app/api/campaigns/caption/route.ts');
const menuCardDesignAdvisorRoute = read('src/app/api/menu-card-export/design-advisor/route.ts');
const reviewSuggestRoute = read('src/app/api/reviews/suggest/route.ts');
const seoRoute = read('src/app/api/seo/route.ts');
const translationsRoute = read('src/app/api/translations/route.ts');
const weeklyNarrativeLocalRoute = read('src/app/api/analytics/weekly-narrative/generate-local/route.ts');
const projectEditModal = read('src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx');
const aiImageGenerator = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx');
const imageUploadModal = read('src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx');
const backgroundSettings = read('src/components/templates/main-app/projects/b2cView/menuPage/backgroundSettings.tsx');
const todayView = read('src/components/templates/main-app/today/index.tsx');
const ownerDashboardTypes = read('src/components/templates/main-app/projects/types/ownerDashboard.types.ts');
const ownerActionPlanCard = read('src/components/templates/main-app/dashboard/OwnerDashboard/OwnerActionPlanCard.tsx');
const mobileOwnerActionPlanCard = read('src/components/mobile/screens/dashboardSections/MobileOwnerActionPlanCard.tsx');
const promptEnhancer = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/PromptEnhancer.tsx');
const fontFamilySelect = read('src/components/atoms/fontFamily/index.tsx');
const imageUploadInput = read('src/components/atoms/imageUploadInput/index.tsx');
const prepareMediaImage = read('src/lib/media/prepareMediaImage.ts');
const itemPhotoCaptureAssistLib = read('src/lib/media/itemPhotoCaptureAssist.ts');
const itemPhotoCaptureAssist = read('src/components/shared/media/ItemPhotoCaptureAssist.tsx');
const mediaImageAdjustModal = read('src/components/shared/media/MediaImageAdjustModal.tsx');
const tooltipElement = read('src/components/antdComponent/tolltipElement/index.tsx');
const platformAssetDetailsModal = read('src/components/templates/platform/assets/detailsModal.tsx');
const platformAssetTemplates = read('src/components/templates/platform/assetTemplates/index.tsx');
const templateRegistryDal = read('src/lib/creative-editor/templateRegistryDal.ts');
const platformJobActionMenu = read('src/components/templates/platform/KBGeneration/jobHistory/JobActionMenu.tsx');
const platformWeeklyDigest = read('src/components/templates/platform/chatManagement/WeeklyDigest.tsx');
const platformUsers = read('src/components/templates/platform/users/index.tsx');
const staffClient = read('src/lib/staffManagement/client.ts');
const staffServer = read('src/lib/staffManagement/server.ts');
const usersDal = read('src/database/users/index.ts');
const platformArticleModal = read('src/components/templates/platform/knowledgeBase/ArticleModal.tsx');
const platformTenantDetailsModal = read('src/components/templates/platform/tenants/tenantDetailsModal.tsx');
const platformTenantsDashboard = read('src/components/templates/platform/tenants/index.tsx');
const platformAnalyticsBackfill = read('src/components/templates/platform/admin/AnalyticsBackfill.tsx');
const platformPricingPlans = read('src/components/templates/platform/pricingPlans/index.tsx');
const platformStoresDashboard = read('src/components/templates/platform/stores/index.tsx');
const platformFontPresets = read('src/components/templates/platform/fontPresets/index.tsx');
const storageDiagnostics = read('src/database/storage/storageDiagnostics.ts');
const deleteFromStorage = read('src/database/storage/deleteFromStorage.ts');
const uploadBase64ToStorage = read('src/database/storage/uploadBase64ToStorage.ts');
const uploadJSONToStorage = read('src/database/storage/uploadJSONToStorage.ts');
const uploadFontToStorage = read('src/database/storage/uploadFontToStorage.ts');
const uploadBlobFileToStorage = read('src/database/storage/uploadBlobFileToStorage.ts');
const uploadOBPPhoto = read('src/database/stores/uploadOBPPhoto.ts');
const staticAssetDiagnostics = read('src/database/static/staticDiagnostics.ts');
const staticAssetData = read('src/database/static/static.ts');
const tenantData = read('src/database/tenants/index.tsx');
const firebaseStorageHelper = read('src/lib/firebase/storage.ts');
const imageProviderDiagnostics = read('src/lib/imageProviderDiagnostics.ts');
const imageProviderRequests = read('src/lib/imageProviderRequests.ts');
const unsplashProvider = read('src/lib/unsplash/index.ts');
const pexelsProvider = read('src/lib/pexels/index.ts');
const pixabayProvider = read('src/lib/pixabay/index.ts');
const firebaseDiagnostics = read('src/lib/firebase/firebaseDiagnostics.ts');
const firebaseAdminDiagnostics = read('src/lib/firebase/firebaseAdminDiagnostics.ts');
const firebaseAdmin = read('src/lib/firebase/firebaseAdmin.ts');
const answerlatticeFirebaseAdmin = read('src/lib/firebase/answerlatticeFirebaseAdmin.ts');
const campaigncueFirebaseAdmin = read('src/lib/firebase/campaigncueFirebaseAdmin.ts');
const signaldeskFirebaseAdmin = read('src/lib/firebase/signaldeskFirebaseAdmin.ts');
const firebaseClient = read('src/lib/firebase/firebaseClient.ts');
const appCheck = read('src/lib/firebase/appCheck.ts');
const useAuthHook = read('src/hooks/useAuth.ts');
const firebaseAuthSyncHook = read('src/hooks/useFirebaseAuthSync.ts');
const firebaseAuthSyncHelper = read('src/lib/auth/firebaseAuthSync.ts');
const sessionProvider = read('src/providers/sessionProvider.tsx');
const authDiagnostics = read('src/lib/auth/authDiagnostics.ts');
const authClient = read('src/lib/auth/client.ts');
const authBrowserRequestPolicy = read('src/lib/auth/browserRequestPolicy.ts');
const getActiveSessionHelper = read('src/lib/auth/getActiveSession.ts');
const sessionExpiryMonitor = read('src/components/auth/SessionExpiryMonitor.tsx');
const profileActionsModal = read('src/components/organisms/headerComponent/profileActionsModal/index.tsx');
const userProfileModal = read('src/components/organisms/headerComponent/profileActionsModal/userProfileModal/index.tsx');
const addSupportTicket = read('src/components/organisms/addSupportTicket/index.tsx');
const supportTicketDiagnostics = read('src/components/organisms/addSupportTicket/supportTicketDiagnostics.ts');
const internalUserApi = read('src/lib/internalApi/user/index.ts');
const hookDiagnostics = read('src/hooks/hookDiagnostics.ts');
const useContentViewTracking = read('src/hooks/useContentViewTracking.ts');
const useFullscreen = read('src/hooks/useFullscreen.ts');
const useRecentColors = read('src/hooks/useRecentColors.ts');
const useAppSelector = read('src/hooks/useAppSelector.ts');
const useAppDispatch = read('src/hooks/useAppDispatch.ts');
const useIngestionJobsListener = read('src/hooks/useIngestionJobsListener.ts');
const useImageBatchJobListener = read('src/hooks/useImageBatchJobListener.ts');
const recentlyViewedHelper = read('src/lib/recentlyViewed/index.ts');
const contentFeedbackStorage = read('src/lib/contentFeedbackStorage/index.ts');
const userUtils = optionalRead('src/utils/usersUtils.ts');
const swrLocalStorageProvider = read('src/lib/cache/swrLocalStorageProvider.ts');
const apiCallComposerClient = read('src/lib/apiHelper/apiCallComposerClient.ts');
const apiCallComposerClientWithoutLoader = read('src/lib/apiHelper/apiCallComposerClientWithoutLoader.ts');
const apiCallComposerServer = read('src/lib/apiHelper/apiCallComposerServer.ts');
const contactRoute = read('src/app/api/answerlattice/public/contact/route.ts');
const feedbackRoute = read('src/app/api/public/feedback/submit/route.ts');
const contactForm = read('src/app/sites/answerlattice/contact/ContactForm.tsx');
const answerlatticeOnboardingForm = read('src/app/sites/answerlattice/get-started/OnboardingForm.tsx');
const feedbackForm = read('src/components/atoms/GuestFeedbackForm/index.tsx');
const loginPage = read('src/components/templates/loginPage/index.tsx');
const phoneOtpPanel = read('src/components/auth/PhoneOtpAuthPanel.tsx');
const turnstileWidget = read('src/components/security/TurnstileWidget.tsx');
const authIndex = read('src/lib/auth/index.ts');
const authMiddleware = read('src/middleware/auth.ts');
const setClaimsRoute = read('src/app/api/auth/set-claims/route.ts');
const authSecurity = read('src/lib/auth/security.ts');
const phoneOtpHelper = read('src/lib/auth/phoneOtp.ts');
const forgotPassword = read('src/components/templates/forgotPassword/index.tsx');
const claimAccount = read('src/app/api/auth/claim-account/route.ts');
const validateClaim = read('src/app/api/auth/validate-claim/route.ts');
const changePassword = read('src/app/api/auth/change-password/route.ts');
const switchStore = read('src/app/api/auth/switch-store/route.ts');
const phoneOtpStart = read('src/app/api/auth/phone-otp/start/route.ts');
const phoneOtpVerify = read('src/app/api/auth/phone-otp/verify/route.ts');
const myCodexSessionRoute = read('src/app/sites/mycodex/api/session/route.ts');
const myCodexClientContainer = read('src/app/sites/mycodex/components/MyCodexClientContainer.tsx');
const functionsTestHtml = read('functions/functions-test.html');
const stagingEnv = read('.env.staging.example');
const productionEnv = read('.env.production.example');

assertIncludes(
    publicApi,
    'const PUBLIC_FORM_TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;',
    'Turnstile middleware must read TURNSTILE_SECRET_KEY.',
);
assertIncludes(
    functionsTestHtml,
    'Keep this file placeholder-only in git. Do not commit API keys or app IDs.',
    'Functions local test page must document the no-committed-web-config rule.',
);
assert(
    !/AIza[0-9A-Za-z_-]{20,}/.test(functionsTestHtml),
    'Functions local test page must not contain Firebase API-key-shaped literals.',
);
assertIncludes(
    publicApi,
    "import { createHmac } from 'crypto';",
    'Public API helper must hash public rate-limit key material.',
);
assertIncludes(
    publicApi,
    'export const hashPublicRateLimitValue = (value: unknown): string => {',
    'Public API helper must expose the shared rate-limit key hash helper.',
);
assertIncludes(
    publicApi,
    'const ipHash = hashPublicRateLimitValue(ip);',
    'Public API rate-limit helper must hash client IPs before building provider keys.',
);
assertIncludes(
    publicApi,
    'key: `public:${feature}:${ipHash}`',
    'Public API rate-limit helper must store hashed IP keys.',
);
assert(!publicApi.includes('key: `public:${feature}:${ip}`'), 'Public API rate-limit helper must not store raw IP keys.');
assertIncludes(
    secureLogger,
    'function sanitizeErrorForLog(error: Error): LogData',
    'Secure logger must normalize error objects before console output.',
);
assertIncludes(secureLogger, 'messagePresent', 'Secure logger must record only message presence metadata.');
assertIncludes(secureLogger, 'messageLength', 'Secure logger must record only message length metadata.');
assertIncludes(secureLogger, 'stackPresent', 'Secure logger must record only stack presence metadata.');
assertIncludes(secureLogger, 'stackLength', 'Secure logger must record only stack length metadata.');
assertIncludes(secureLogger, 'MAX_LOG_STRING_LENGTH', 'Secure logger must cap arbitrary context strings.');
assertIncludes(secureLogger, 'MAX_LOG_ARRAY_ITEMS', 'Secure logger must cap arbitrary context arrays.');
assertIncludes(secureLogger, 'MAX_LOG_OBJECT_KEYS', 'Secure logger must cap arbitrary context object keys.');
assertIncludes(secureLogger, 'normalizeLogFieldKey', 'Secure logger must normalize sensitive field keys.');
assertIncludes(secureLogger, 'getBoundedLogString', 'Secure logger must bound non-error string context.');
assertIncludes(secureLogger, 'sanitizeArrayLogItem', 'Secure logger must bound array item context.');
assertIncludes(secureLogger, 'WeakSet<object>', 'Secure logger must guard circular log context.');
assertIncludes(secureLogger, "BLOCKED_FIELDS.has(normalizeLogFieldKey(key))", 'Sensitive-data detector must use normalized keys.');
assertIncludes(secureLogger, "message: 'An error occurred. Please try again.'", 'Client error sanitizer must return generic copy.');
assert(!/message\s*:\s*error\.message/.test(secureLogger), 'Secure logger must not log raw exception messages.');
assert(!/stack\s*:\s*(?:process\.env[^?]+?\?\s*)?error\.stack/.test(secureLogger), 'Secure logger must not log raw exception stacks.');
assert(!secureLogger.includes('message: sourceMessage'), 'Client error sanitizer must not return raw development exception text.');
assertIncludes(loggerSource, "import { sanitizeErrorForLog, sanitizeLogData } from '@lib/security/secureLogger';", 'Monitoring logger must reuse central log sanitizers.');
assertIncludes(loggerSource, 'sanitizeLoggerConsoleValue', 'Monitoring logger must sanitize console payloads.');
assertIncludes(loggerSource, 'const sanitizedError = sanitizeLoggerConsoleValue(error);', 'Monitoring logger error path must sanitize error payloads.');
assertIncludes(loggerSource, 'const sanitizedContext = sanitizeLoggerConsoleValue(context);', 'Monitoring logger error path must sanitize context payloads.');
assertIncludes(loggerSource, 'const sanitizedDetails = sanitizeLoggerConsoleValue(details);', 'Monitoring logger security path must sanitize details.');
assert(!loggerSource.includes('message, error, context ||'), 'Monitoring logger must not print raw error/context payloads.');
assert(!loggerSource.includes('message, data ||'), 'Monitoring logger must not print raw data payloads.');
assert(!loggerSource.includes('event,\n        details'), 'Monitoring logger security path must not print raw details.');
assertIncludes(sentryShared, "import { sanitizeErrorForLog, sanitizeLogData } from '@lib/security/secureLogger';", 'Sentry context sanitizer must reuse central log sanitizers.');
assertIncludes(sentryShared, 'MONITORING_SENSITIVE_KEYS', 'Sentry context sanitizer must define sensitive key handling.');
assertIncludes(sentryShared, 'MONITORING_IDENTIFIER_KEYS', 'Sentry context sanitizer must define identifier key handling.');
assertIncludes(sentryShared, 'MONITORING_PATH_KEYS', 'Sentry context sanitizer must define route/path key handling.');
assertIncludes(sentryShared, 'MONITORING_EMAIL_PATTERN', 'Sentry context sanitizer must pattern-summarize email-like strings.');
assertIncludes(sentryShared, 'MONITORING_ROUTE_PATTERN', 'Sentry context sanitizer must pattern-summarize route/query-like strings.');
assertIncludes(sentryShared, 'MONITORING_SECRET_VALUE_PATTERN', 'Sentry context sanitizer must pattern-summarize token-like strings.');
assertIncludes(sentryShared, "summarizeMonitoringString('redacted'", 'Sentry context sanitizer must redact sensitive strings.');
assertIncludes(sentryShared, "summarizeMonitoringString('identifier_present'", 'Sentry context sanitizer must summarize identifiers.');
assertIncludes(sentryShared, "summarizeMonitoringString('path_present'", 'Sentry context sanitizer must summarize paths.');
assertIncludes(sentryShared, 'getSafeMonitoringTagValue', 'Sentry tags must use sanitized tag values.');
assertIncludes(sentryShared, 'getSanitizedMonitoringMessage', 'Sentry breadcrumb and event messages must use a shared sanitizer.');
assertIncludes(sentryShared, 'sanitizeMonitoringEvent', 'Sentry beforeSend must sanitize outbound event metadata.');
assertIncludes(sentryShared, "summarizeMonitoringString('error_message_present'", 'Sentry exception values must summarize raw exception messages.');
assertIncludes(sentryShared, 'seen: WeakSet<object>', 'Sentry context sanitizer must guard circular context values.');
assertIncludes(instrumentationClient, 'sanitizeMonitoringEvent(event)', 'Client Sentry beforeSend must sanitize outbound event metadata.');
assertIncludes(sentryServerConfig, 'sanitizeMonitoringEvent(event)', 'Server Sentry beforeSend must sanitize outbound event metadata.');
assertIncludes(sentryEdgeConfig, 'sanitizeMonitoringEvent(event)', 'Edge Sentry beforeSend must sanitize outbound event metadata.');
assertIncludes(loggerSource, 'getSanitizedMonitoringMessage', 'Monitoring logger must sanitize Sentry breadcrumb and event messages.');
assertIncludes(loggerSource, 'const safeMessage = getSanitizedMonitoringMessage(message);', 'Monitoring logger must sanitize generic Sentry messages.');
assertIncludes(loggerSource, 'message: safeMessage', 'Monitoring logger breadcrumbs must use sanitized message text.');
assertIncludes(loggerSource, 'Sentry.captureMessage(safeMessage', 'Monitoring logger message captures must use sanitized message text.');
assertIncludes(loggerSource, 'const safeEvent = getSanitizedMonitoringMessage(event);', 'Monitoring security events must sanitize Sentry event text.');
assertIncludes(loggerSource, 'const userContext = getSanitizedMonitoringContext({', 'Monitoring user context must be sanitized before Sentry user/tag/context writes.');
assertIncludes(loggerSource, "id: String(userContext.id || 'user_present')", 'Sentry user ID must use sanitized user context.');
assert(!loggerSource.includes('email: user.email'), 'Sentry user context must not send raw user email.');
assert(!loggerSource.includes('username: [user.name'), 'Sentry user context must not send raw user/tenant/store names.');
assert(!loggerSource.includes("Sentry.setTag('tenantId', String(user.tId"), 'Sentry tenant tag must not use raw tenant ID.');
assert(!loggerSource.includes("Sentry.setTag('storeId', String(user.sId"), 'Sentry store tag must not use raw store ID.');
assert(!loggerSource.includes('addBreadcrumb(`API ${method} ${endpoint}`'), 'Monitoring API breadcrumbs must not put raw endpoints in the breadcrumb title.');
assert(!loggerSource.includes("addBreadcrumb(action, 'user'"), 'Monitoring user-action breadcrumbs must not put raw actions in the breadcrumb title.');
assert(!loggerSource.includes("addBreadcrumb(event, 'business'"), 'Monitoring business-event breadcrumbs must not put raw event names in the breadcrumb title.');
assertIncludes(loggerSource, "console.warn('API call failed'", 'Monitoring API failure console output must use structured sanitized payload.');
assertIncludes(loggerSource, "console.log('User action'", 'Monitoring user action console output must use structured sanitized payload.');
assertIncludes(loggerSource, "console.log('Navigation'", 'Monitoring navigation console output must use structured sanitized payload.');
assertIncludes(loggerSource, "console.log('Business event'", 'Monitoring business-event console output must use structured sanitized payload.');
assertIncludes(
    errorReportButton,
    "import { sanitizeErrorForLog } from '@lib/security/secureLogger';",
    'Error report button must use bounded error metadata.',
);
assertIncludes(errorReportButton, 'error: error ? sanitizeErrorForLog(error) : undefined', 'Error report payload must store bounded error metadata.');
assertIncludes(errorReportButton, 'copyRuntimeTextToClipboard(diagnostics)', 'Error report diagnostics copy must use the acknowledged runtime clipboard helper.');
assertIncludes(errorReportButton, 'hasClipboardWrite: hasRuntimeClipboardWrite()', 'Error report diagnostics copy failure must include clipboard support metadata.');
assertIncludes(errorReportButton, 'hasCopyFallback: hasRuntimeCopyFallback()', 'Error report diagnostics copy failure must include fallback support metadata.');
assertIncludes(errorReportButton, 'diagnosticsLength: diagnostics.length', 'Error report diagnostics copy failure must log bounded diagnostics length only.');
assert(!errorReportButton.includes('errorMessage: error?.message'), 'Error report payload must not copy raw exception messages.');
assert(!errorReportButton.includes('await navigator.clipboard.writeText(diagnostics)'), 'Error report diagnostics copy must not use direct Clipboard API success.');
assertIncludes(testSentryPage, "import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';", 'Sentry test page must use bounded runtime metadata for fake identifiers.');
assertIncludes(testSentryPage, "const TEST_USER_CONTEXT = getBoundedRuntimeStringContext('testUserId'", 'Sentry test page must bound test user metadata.');
assertIncludes(testSentryPage, "const TEST_PRODUCT_CONTEXT = getBoundedRuntimeStringContext('testProductId'", 'Sentry test page must bound test product metadata.');
assert(!testSentryPage.includes('test-user-123'), 'Sentry test page must not emit raw fake user IDs.');
assert(!testSentryPage.includes("productId: 'abc123'"), 'Sentry test page must not emit raw fake product IDs.');
assertIncludes(testSentryRoute, "import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';", 'Sentry test route must use the shared platform route guard.');
assertIncludes(testSentryRoute, 'await requirePlatformAdminRouteAccess();', 'Sentry test route must check platform admin access before rendering diagnostics.');
assert(!testSentryRoute.includes('Access: Requires authentication (platform routes)'), 'Sentry test route docs must not imply generic authentication is sufficient.');
assertIncludes(platformRouteGuard, "import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';", 'Platform route guard must use the canonical platform role constant.');
assertIncludes(platformRouteGuard, "import { authOptions } from '@lib/auth';", 'Platform route guard must use the shared NextAuth options.');
assertIncludes(platformRouteGuard, 'getServerSession(authOptions)', 'Platform route guard must check the server session before rendering internal routes.');
assertIncludes(platformRouteGuard, 'allowedPlatformRoles: readonly string[]', 'Platform route guard must accept an explicit platform-role allowlist.');
assertIncludes(platformRouteGuard, '!allowedPlatformRoles.includes(getPlatformRoleFromSession(session))', 'Platform route guard must reject sessions outside the explicit role allowlist.');
assertIncludes(platformRouteGuard, 'redirect(redirectPath)', 'Platform route guard must redirect rejected sessions through the selected route boundary.');
assertIncludes(platformRouteGuard, 'return requirePlatformRoleRouteAccess([ECOMSAI_PLATFORM_USER_ROLE], redirectPath);', 'Platform admin route guard must remain the full PLATFORM-role shortcut.');
assertIncludes(platformLayout, "import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';", 'Platform layout must use the shared platform route guard.');
assertIncludes(platformLayout, 'await requirePlatformAdminRouteAccess();', 'Platform layout must guard /platform routes before rendering.');
assertIncludes(opsLayout, "import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';", 'Ops layout must use the shared platform route guard.');
assertIncludes(opsLayout, 'await requirePlatformAdminRouteAccess();', 'Ops layout must guard legacy /ops routes before rendering.');
assertIncludes(resellerLayout, "import { FEATURE_FLAGS } from '@config/features';", 'Reseller layout must respect the reseller dashboard feature flag before rendering.');
assertIncludes(resellerLayout, 'ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE', 'Reseller layout must use the canonical platform and reseller role constants.');
assertIncludes(resellerLayout, '!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD', 'Reseller layout must stop route rendering when the reseller dashboard flag is off.');
assertIncludes(resellerLayout, 'requirePlatformRoleRouteAccess(\n        [ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE]', 'Reseller layout must allow only platform and reseller sessions.');
assertIncludes(resellerLayout, "'/dashboard'", 'Reseller layout must preserve the dashboard redirect boundary for non-reseller sessions.');
assertIncludes(resellerManageLayout, "import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';", 'Reseller management layout must use the shared platform admin route guard.');
assertIncludes(resellerManageLayout, "await requirePlatformAdminRouteAccess('/dashboard');", 'Reseller management layout must stay platform-admin only before rendering.');
assertIncludes(navigationConstants, 'allowedPlatformRoles: [ECOMSAI_PLATFORM_USER_ROLE],\n        subNav: [', 'Desktop Platform navigation must stay hidden from non-platform sessions.');
assertIncludes(navigationConstants, 'allowedPlatformRoles: [ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE],\n        subNav: [', 'Desktop Reseller navigation must stay hidden from non-reseller and non-platform sessions.');
assertIncludes(permissionRequirements, 'pathname === "/dashboard" || pathname === "/business-health"', 'Business Health owner route must require analytics permission.');
assertIncludes(permissionRequirements, 'pathname === "/assets"', 'Dedicated Assets route must have an owner permission requirement.');
assertIncludes(permissionRequirements, 'pathname === "/use-menulist/print-assets"', 'Print Assets compatibility route must have an owner permission requirement.');
assertIncludes(permissionRequirements, 'pathname === "/use-menulist/menu-card-export"', 'Menu Card Export route must have an owner permission requirement.');
assertIncludes(permissionRequirements, 'pathname === "/use-menulist/ai-menu-manager"', 'Legacy AI Menu Manager redirect route must have an owner permission requirement.');
assertIncludes(permissionRequirements, 'anyOf: [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU]', 'Output asset routes must match the mobile daily-action permission set.');
assertIncludes(mobileMoreScreen, 'const platformHubItems: MoreListItem[] = isPlatformAdmin ? [', 'Mobile More platform hub must stay platform-admin gated.');
assertIncludes(mobileMoreScreen, "{ key: 'testSentry'", 'Mobile More must keep the Sentry diagnostics entry in the platform hub.');
assertIncludes(mobileMoreScreen, 'const resellerManagementItems: MoreListItem[] = FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD && canUseResellerScreens ? [', 'Mobile More reseller hub must stay feature and role gated.');
[
    ['client console buffer', clientConsoleBuffer],
    ['ticket local log capture', localLogsTracker],
    ['Sentry shared context sanitizer', sentryShared],
].forEach(([label, source]) => {
    assertIncludes(source, 'sanitizeErrorForLog', `${label} must use the central bounded error sanitizer.`);
    assert(!source.includes('value.message'), `${label} must not serialize raw Error.message values.`);
    assert(!source.includes('value.stack'), `${label} must not serialize raw Error.stack values.`);
    assert(!source.includes('entryValue.message'), `${label} must not serialize nested raw Error.message values.`);
    assert(!source.includes('entryValue.stack'), `${label} must not serialize nested raw Error.stack values.`);
});
[
    'function getSentryErrorCode',
    'function shouldDropExpectedSentryError',
    "name === 'CIRCUITBREAKERERROR'",
    "code.includes('RATE_LIMIT')",
    "code.includes('RESOURCE_EXHAUSTED')",
].forEach((token) => {
    assertIncludes(functionsSentry, token, 'Functions Sentry expected-error filter must use structured error metadata.');
});
[
    'error.message?.includes',
    "error.message?.includes('Rate limit')",
    "error.message?.includes('Circuit breaker is OPEN')",
].forEach((token) => {
    assert(!functionsSentry.includes(token), `Functions Sentry expected-error filter must not scan raw messages: ${token}`);
});
[
    'FUNCTION_SENTRY_SENSITIVE_KEYS',
    'FUNCTION_SENTRY_IDENTIFIER_KEYS',
    'FUNCTION_SENTRY_PATH_KEYS',
    'FUNCTION_SENTRY_EMAIL_PATTERN',
    'FUNCTION_SENTRY_ROUTE_PATTERN',
    'FUNCTION_SENTRY_SECRET_VALUE_PATTERN',
    'getFunctionSentryErrorContext',
    "(error.name || 'Error').slice(0, 80)",
    'getSanitizedFunctionSentryContext',
    'getSanitizedFunctionSentryMessage',
    'sanitizeFunctionSentryEvent',
    'sendDefaultPii: false',
    'sanitizeFunctionSentryEvent(event)',
    "summarizeFunctionSentryValue('error_message_present'",
    'seen: WeakSet<object>',
].forEach((token) => {
    assertIncludes(functionsSentry, token, 'Functions Sentry must bound outbound monitoring metadata.');
});
[
    'function getConfiguredFunctionsSentryDsn()',
    "const sentryDsn = String(process.env.SENTRY_DSN || '').trim();",
    "return String(process.env.SENTRY_DEV_DSN || '').trim() || sentryDsn;",
    'const dsn = getConfiguredFunctionsSentryDsn();',
    "functions.logger.warn('[Sentry] Disabled because SENTRY_DSN is not configured'",
].forEach((token) => {
    assertIncludes(functionsSentry, token, 'Functions Sentry must fail closed when no DSN secret/env is configured.');
});
assert(
    !/https:\/\/[^'"`]+@[^'"`]+sentry\.io\/\d+/.test(functionsSentry),
    'Functions Sentry must not embed hard-coded Sentry DSN fallbacks.',
);
assert(!functionsSentry.includes('const DEV_DSN'), 'Functions Sentry must not keep a hard-coded dev DSN fallback.');
assert(!functionsSentry.includes('const PROD_DSN'), 'Functions Sentry must not keep a hard-coded prod DSN fallback.');
[
    'email: user.email',
    'username: formattedUsername',
    'tenant_name: user.tenantName',
    'project_id: user.projectId,\n    });',
    'data,\n        timestamp',
    'extra: context?.details',
    "sourceErrorName: error.name || 'Error'",
].forEach((token) => {
    assert(!functionsSentry.includes(token), `Functions Sentry must not keep raw metadata pattern: ${token}`);
});
assertIncludes(functionsSentry, "id: String(userContext.uid || 'user_present')", 'Functions Sentry user identity must use sanitized user context.');
assertIncludes(functionsSentry, "message: getSanitizedFunctionSentryMessage(message)", 'Functions Sentry breadcrumbs must sanitize message text.');
assertIncludes(functionsSentry, "data: getSanitizedFunctionSentryContext(data)", 'Functions Sentry breadcrumbs must sanitize data.');
assertIncludes(functionsSentry, "Sentry.captureMessage(getSanitizedFunctionSentryMessage(message)", 'Functions Sentry message captures must sanitize message text.');
assertIncludes(functionsLogger, 'Sentry.getSanitizedFunctionSentryMessage(message)', 'Functions central logger must sanitize Firebase logger message text.');
assertIncludes(functionsLogger, 'Sentry.getSanitizedFunctionSentryContext(data)', 'Functions central logger must sanitize Firebase logger data payloads.');
assertIncludes(functionsLogger, 'Sentry.getSanitizedFunctionSentryContext({ error, ...(context || {}) })', 'Functions central logger must sanitize Firebase logger error/context payloads.');
assertIncludes(functionsLogger, 'operation: safeMessage', 'Functions central logger must pass sanitized operation labels to Sentry.');
assert(!functionsLogger.includes('firebaseLogger.error(message, { error, ...context })'), 'Functions central logger must not log raw error/context payloads.');
assert(!functionsLogger.includes('firebaseLogger.info(message, data || {})'), 'Functions central logger must not log raw info payloads.');
assert(!functionsLogger.includes('firebaseLogger.warn(message, data || {})'), 'Functions central logger must not log raw warning payloads.');
assertIncludes(
    rateLimit,
    "import { secureError } from '@lib/security/secureLogger';",
    'Core rate limit utility must use secure logging.',
);
assertIncludes(
    rateLimit,
    'normalizeRateLimitLogError',
    'Core rate limit utility must normalize provider errors before logging.',
);
assertIncludes(
    rateLimit,
    'class RateLimitProviderTimeoutError extends Error',
    'Core rate limit utility must use a typed provider timeout sentinel.',
);
assertIncludes(
    rateLimit,
    'new RateLimitProviderTimeoutError()',
    'Core rate limit utility timeout race must throw the typed provider timeout sentinel.',
);
assertIncludes(
    rateLimit,
    'isRateLimitProviderTimeoutError(error)',
    'Core rate limit utility timeout catch must branch on typed provider timeout sentinel.',
);
assertIncludes(
    rateLimit,
    "'[Rate Limit] Upstash provider error; temporarily allowing requests with local bypass'",
    'Core rate limit utility must securely log provider failures.',
);
assertIncludes(
    rateLimit,
    "'[Rate Limit] Upstash provider timed out; temporarily allowing requests with local bypass'",
    'Core rate limit utility must securely log provider timeouts.',
);
assertIncludes(
    rateLimit,
    'failClosedOnProviderError?: boolean',
    'Core rate limit utility must expose opt-in fail-closed provider behavior.',
);
assertIncludes(
    rateLimit,
    "reason?: 'limit_exceeded' | 'provider_unavailable';",
    'Core rate limit utility must return a stable provider-unavailable reason for strict callers.',
);
assertIncludes(
    rateLimit,
    'buildRateLimitProviderUnavailableResult',
    'Core rate limit utility must centralize strict provider-unavailable results.',
);
assert(!rateLimit.includes('new Error(String(error))'), 'Core rate limit utility must not log raw provider exception text.');
assert(!rateLimit.includes("error.message === 'Rate limit provider timeout'"), 'Core rate limit utility must not branch on raw timeout exception text.');
assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(rateLimit), 'Core rate limit utility must not direct-console provider failures.');
assertIncludes(
    rateLimitHelpers,
    "import { secureError } from '@lib/security/secureLogger';",
    'Rate limit helper must use secure logging.',
);
assertIncludes(
    rateLimitHelpers,
    'normalizeRateLimitHelperError',
    'Rate limit helper must normalize unexpected errors before logging.',
);
assertIncludes(
    rateLimitHelpers,
    "'[Rate Limit Helper] Failed, allowing request'",
    'Rate limit helper must securely log fail-open helper failures.',
);
assertIncludes(rateLimitHelpers, "import { hashPublicRateLimitValue } from 'src/middleware/publicApi';", 'Rate limit helper must hash provider key identity.');
assertIncludes(rateLimitHelpers, "import { getBoundedSecurityStringContext } from '@lib/security/securityDiagnostics';", 'Rate limit helper must bound security log identity context.');
assertIncludes(rateLimitHelpers, 'const userRateLimitHash = hashPublicRateLimitValue(session.user.id);', 'Rate limit helper must hash user key material.');
assertIncludes(rateLimitHelpers, "const tenantRateLimitHash = hashPublicRateLimitValue(session.user.tenantId || 'unknown');", 'Rate limit helper must hash tenant key material.');
assertIncludes(rateLimitHelpers, 'const rateLimitKey = `${keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}`;', 'Rate limit helper must use hashed provider key material.');
assertIncludes(rateLimitHelpers, "getBoundedSecurityStringContext('userId', session.user.id)", 'Rate limit helper must bound user security context.');
assertIncludes(rateLimitHelpers, "getBoundedSecurityStringContext('tenantId', session.user.tenantId)", 'Rate limit helper must bound tenant security context.');
assertIncludes(rateLimitHelpers, "getBoundedSecurityStringContext('email', session.user.email)", 'Rate limit helper must bound email security context.');
assert(!rateLimitHelpers.includes('const rateLimitKey = `${keyPrefix}:${session.user.id}:${session.user.tenantId}`;'), 'Rate limit helper must not store raw user/tenant IDs in provider keys.');
assert(!rateLimitHelpers.includes('userId: session.user.id'), 'Rate limit helper must not raw-log user IDs.');
assert(!rateLimitHelpers.includes('tenantId: session.user.tenantId'), 'Rate limit helper must not raw-log tenant IDs.');
assert(!rateLimitHelpers.includes('email: session.user.email'), 'Rate limit helper must not raw-log emails.');
assert(!rateLimitHelpers.includes('new Error(String(error))'), 'Rate limit helper must not log raw exception text.');
assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(rateLimitHelpers), 'Rate limit helper must not direct-console fail-open errors.');
[
    "import { createHmac } from 'crypto';",
    'FUNCTIONS_RATE_LIMIT_HASH_SECRET',
    'function hashFunctionsRateLimitValue(value: unknown): string',
    'getRateLimitErrorContext',
    'getBoundedRateLimitStringContext',
    "'[RateLimit] Failed to initialize Upstash client - rate limiting disabled'",
    "'[RateLimit] Upstash error - allowing request'",
    "getBoundedRateLimitStringContext('key', key)",
    'error: getRateLimitErrorContext(error)',
    'const projectRateLimitHash = hashFunctionsRateLimitValue(projectId);',
    'key: `ai-expensive:parallel:${projectRateLimitHash}`',
].forEach((token) => {
    assertIncludes(functionsRateLimit, token, 'Functions rate limit helper must use bounded fail-open diagnostics.');
});
[
    "functions.logger.error('[RateLimit] Failed to initialize Upstash client - rate limiting disabled', error)",
    "logger.error('[RateLimit] Upstash error:', error)",
    'key: `ai-expensive:parallel:${projectId}`',
    /logger\.warn\('\[RateLimit\] Rate limit exceeded'[\s\S]{0,120}\bkey,/,
].forEach((token) => {
    const found = token instanceof RegExp ? token.test(functionsRateLimit) : functionsRateLimit.includes(token);
    assert(!found, `Functions rate limit helper must not keep raw diagnostic ${token}.`);
});
assertNoDirectConsole(functionsRateLimit, 'Functions rate limit helper must not direct-console provider failures.');
[
    "import { getAnalyticsErrorContext, getAnalyticsIdContext } from './analyticsDiagnostics';",
    'interface DailyAnalyticsSummary',
    'totalViews: Number.isFinite(totalViews) ? totalViews : 0',
    "'[HealthSignals] Store processing failed'",
    "'[HealthSignals] Fatal error'",
    'tenantId: getAnalyticsIdContext(tId)',
    'storeId: getAnalyticsIdContext(sId)',
    'error: getAnalyticsErrorContext(storeError)',
    'error: getAnalyticsErrorContext(error)',
].forEach((token) => {
    assertIncludes(healthSignalsComputation, token, 'Health signals computation must use bounded diagnostics.');
});
assert(
    !healthSignalsComputation.includes('snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))'),
    'Health signals computation must not hydrate full analytics document payloads.',
);
[
    'logger.warn(`[HealthSignals] Error processing store ${tId}/${sId}:`, storeError)',
    "logger.error('[HealthSignals] Fatal error:', error)",
].forEach((token) => {
    assert(!healthSignalsComputation.includes(token), `Health signals computation must not keep raw diagnostic ${token}.`);
});
assertIncludes(
    securityDiagnostics,
    "import { secureError, secureLog } from './secureLogger';",
    'Security diagnostics must use secure logging.',
);
assertIncludes(
    securityDiagnostics,
    'getBoundedSecurityStringContext',
    'Security diagnostics must expose bounded string context.',
);
assertIncludes(
    securityDiagnostics,
    'sourceErrorName: getSecurityErrorName(error)',
    'Security diagnostics must log source error names only.',
);
assertIncludes(
    securityDiagnostics,
    'sourceErrorCode: getSecurityErrorCode(error)',
    'Security diagnostics must log bounded source error codes only.',
);
assertIncludes(
    securityDiagnostics,
    'sourceStatusCode: getSecurityErrorStatus(error)',
    'Security diagnostics must log numeric source status only.',
);
assertNoDirectConsole(securityDiagnostics, 'Security diagnostics must not direct-console failures.');
assertIncludes(inputValidation, 'firestore_query_invalid_key_blocked', 'Input validation must securely log blocked query keys.');
assertIncludes(inputValidation, 'getBoundedSecurityStringContext', 'Input validation must bound invalid query-key context.');
assertIncludes(inputValidation, "return { success: false, error: 'Invalid input' };", 'Input validation must return generic API validation failure text.');
assertIncludes(inputValidation, 'getSafeZodValidationDetails', 'Input validation must expose safe Zod validation details helper.');
assertIncludes(inputValidation, 'issueCount: error.issues.length', 'Safe Zod validation details must expose issue count only.');
assertIncludes(inputValidation, 'code: issue.code', 'Safe Zod validation details must expose issue codes only.');
assertIncludes(inputValidation, "field: issue.path.map(part => String(part)).join('.')", 'Safe Zod validation details must bound field paths.');
assert(!inputValidation.includes('message: issue.message'), 'Safe Zod validation details must not expose raw Zod issue messages.');
assert(!inputValidation.includes('firstError.message'), 'Input validation must not return raw Zod issue messages.');
assert(!inputValidation.includes('firstError.path'), 'Input validation must not return raw Zod issue paths.');
assertNoDirectConsole(inputValidation, 'Input validation must not direct-console blocked query keys.');
assertIncludes(magicBytesValidator, 'magic_bytes_validation_failed', 'Magic-bytes validator must securely log validation exceptions.');
assertIncludes(magicBytesValidator, "error: 'File validation failed'", 'Magic-bytes validator must return generic validation exception text.');
assert(!magicBytesValidator.includes('Magic bytes validation error:'), 'Magic-bytes validator must not keep raw console error text.');
assert(!magicBytesValidator.includes('error.message'), 'Magic-bytes validator must not return raw exception messages.');
assertNoDirectConsole(magicBytesValidator, 'Magic-bytes validator must not direct-console validation failures.');
assertIncludes(fileValidation, 'file_validation_embedded_script_blocked', 'File validation must code blocked embedded-script diagnostics.');
assertIncludes(fileValidation, 'file_validation_failed', 'File validation must code validation exceptions.');
assertIncludes(fileValidation, 'file_validation_disallowed_type_blocked', 'File validation must code disallowed type blocks.');
assertIncludes(fileValidation, 'file_validation_magic_type_missing', 'File validation must code missing magic-byte detections.');
assertIncludes(fileValidation, 'file_validation_type_mismatch', 'File validation must code claimed/detected type mismatches.');
assertIncludes(fileValidation, 'getBoundedSecurityStringContext', 'File validation must bound file-type diagnostics.');
assert(!fileValidation.includes("secureLog('[File Validation] Blocked disallowed file type'"), 'File validation must not raw-log disallowed type blocks.');
assert(!fileValidation.includes("secureLog('[File Validation] Could not detect file type from magic bytes'"), 'File validation must not raw-log missing magic-byte detections.');
assert(!fileValidation.includes("secureLog('[File Validation] File type mismatch'"), 'File validation must not raw-log type mismatches.');
assert(!fileValidation.includes("secureLog('[File Validation] Blocked image with embedded script'"), 'File validation must not raw-log embedded script blocks.');
assert(!fileValidation.includes("secureError('[File Validation] Error validating file'"), 'File validation must not raw-log validation exceptions.');
assertNoDirectConsole(fileValidation, 'File validation must not direct-console validation failures.');
[
    ['Generic webhook validator', webhookValidation, [
        'webhook_validator_missing_parameters',
        'webhook_validator_signature_length_mismatch',
        'webhook_validator_invalid_signature',
        'webhook_validator_validation_failed',
        'webhook_ip_validator_missing_ip',
        'webhook_ip_validator_ip_not_allowed',
        'logSecurityDiagnostic',
        'logSecurityFailure',
        'getBoundedSecurityStringContext',
    ], [
        "secureLog('[Webhook Validator] Missing required parameters'",
        "secureLog('[Webhook Validator] Signature length mismatch'",
        "secureLog('[Webhook Validator] Invalid signature'",
        "secureError('[Webhook Validator] Validation error'",
        "secureLog('[Webhook IP Validator] Missing IP address'",
        "secureLog('[Webhook IP Validator] IP not in allowlist'",
    ]],
    ['Razorpay webhook validator', razorpayWebhookValidator, [
        'razorpay_webhook_validator_missing_parameters',
        'razorpay_webhook_validator_signature_length_mismatch',
        'razorpay_webhook_validator_invalid_signature',
        'razorpay_webhook_validator_validation_failed',
        'logSecurityDiagnostic',
        'logSecurityFailure',
        'getBoundedSecurityStringContext',
    ], [
        "secureLog('[Webhook Validator] Missing required parameters'",
        "secureLog('[Webhook Validator] Signature length mismatch'",
        "secureLog('[Webhook Validator] Invalid signature received'",
        "secureError('[Webhook Validator] Error during signature validation'",
    ]],
].forEach(([label, source, required, oldPatterns]) => {
    required.forEach((token) => assertIncludes(source, token, `${label} must use bounded security diagnostics.`));
    oldPatterns.forEach((token) => assert(!source.includes(token), `${label} must not keep old raw diagnostic ${token}.`));
    assertNoDirectConsole(source, `${label} must not direct-console signature validation failures.`);
});
assertIncludes(
    databaseLoggerDiagnostics,
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'Database logger diagnostics must use secure logging.',
);
assertIncludes(
    databaseLoggerDiagnostics,
    'getBoundedDatabaseLoggerStringContext',
    'Database logger diagnostics must expose bounded string context.',
);
assertIncludes(
    databaseLoggerDiagnostics,
    'sourceErrorName: getDatabaseLoggerErrorName(error)',
    'Database logger diagnostics must log source error names only.',
);
assertIncludes(
    databaseLoggerDiagnostics,
    'sourceErrorCode: getDatabaseLoggerErrorCode(error)',
    'Database logger diagnostics must log bounded source error codes only.',
);
assertIncludes(
    databaseLoggerDiagnostics,
    'sourceStatusCode: getDatabaseLoggerErrorStatus(error)',
    'Database logger diagnostics must log numeric source status only.',
);
assert(!/\bconsole\./.test(databaseLoggerDiagnostics), 'Database logger diagnostics must not direct-console failures.');
[
    ['database operation logger', databaseOperationLogger],
    ['application logger', applicationLogger],
    ['error logger', errorLogger],
].forEach(([label, source]) => {
    assertIncludes(source, 'logDatabaseLogger', `${label} must use bounded database logger diagnostics.`);
    assert(!/\bconsole\./.test(source), `${label} must not direct-console raw payloads or errors.`);
});
assertIncludes(databaseOperationLogger, 'payloadKeyCount: getObjectKeyCount(payload)', 'Database operation logger must log payload key counts only.');
assertIncludes(databaseOperationLogger, 'resultKeyCount: getObjectKeyCount(result)', 'Database operation logger must log result key counts only.');
assert(!databaseOperationLogger.includes('Object.keys(payload'), 'Database operation logger must not log payload key names.');
assert(!databaseOperationLogger.includes('Object.keys(result'), 'Database operation logger must not log result key names.');
assertIncludes(applicationLogger, "logDatabaseLoggerFailure('application_log_write_failed'", 'Application logger must securely log write failures.');
assertIncludes(applicationLogger, "logDatabaseLoggerFailure('application_log_read_failed'", 'Application logger must securely log read failures.');
assertIncludes(applicationLogger, "logDatabaseLoggerFailure('application_log_read_by_id_failed'", 'Application logger must securely log read-by-id failures.');
assertIncludes(applicationLogger, 'res(null);', 'Application logger failures must resolve instead of hanging.');
assertIncludes(errorLogger, "logDatabaseLoggerFailure('error_log_write_failed'", 'Error logger must securely log write failures.');
assertIncludes(errorLogger, "logDatabaseLoggerFailure('error_log_read_failed'", 'Error logger must securely log read failures.');
assertIncludes(errorLogger, "logDatabaseLoggerFailure('error_log_read_by_id_failed'", 'Error logger must securely log read-by-id failures.');
assertIncludes(errorLogger, 'res(null);', 'Error logger failures must resolve instead of hanging.');
assertRealtimeDatabaseDirectImportBoundary();
assertRealtimeDatabaseLoggerBoundaryDocs();
assertIncludes(
    runtimeDiagnostics,
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'Runtime diagnostics must use secure logging.',
);
assertIncludes(
    runtimeDiagnostics,
    'getBoundedRuntimeStringContext',
    'Runtime diagnostics must expose bounded string context.',
);
assertIncludes(
    runtimeDiagnostics,
    'sourceErrorName: getRuntimeErrorName(error)',
    'Runtime diagnostics must log source error names only.',
);
assertIncludes(
    runtimeDiagnostics,
    'sourceErrorCode: getRuntimeErrorCode(error)',
    'Runtime diagnostics must log bounded source error codes only.',
);
assertIncludes(
    runtimeDiagnostics,
    'sourceStatusCode: getRuntimeErrorStatus(error)',
    'Runtime diagnostics must log numeric source status only.',
);
assertNoDirectConsole(runtimeDiagnostics, 'Runtime diagnostics must not direct-console failures.');
assertIncludes(randomIdRuntime, 'runtimeCrypto.randomUUID()', 'Runtime ID helper must prefer crypto.randomUUID().');
assertIncludes(randomIdRuntime, 'runtimeCrypto.getRandomValues(bytes)', 'Runtime ID helper must use crypto.getRandomValues() before fallback IDs.');
assertNoUnexpectedOperationalMathRandom();
assertNoStaleImplementationMarkers();
assertNoUnexpectedAppDirectConsole();
assertNoUnsafeBlankWindowOpen();
assertLifecycleMessagingLoggerRouting();
assertMonitoringAlertLoggerRouting();
assertDecisionBlocksAnalyticsLoggerRouting();
assertFeedbackWeeklyNarrativeDiagnosticsRouting();
assertKBQualityDiagnosticsRouting();
assertOwnerDashboardGeminiDiagnosticsRouting();
assertSmallFunctionsConsoleCleanup();
assertChatAggregationDiagnosticsRouting();
assertRealtimeTrackingDiagnosticsRouting();
assertSchedulerManualRetentionDiagnosticsRouting();
[
    ['performance utilities', performanceUtils],
    ['service worker registration', serviceWorkerRegister],
    ['global error boundary', globalError],
    ['error report button', errorReportButton],
    ['layout provider error boundary', layoutProvider],
    ['analytics export button', analyticsExportButton],
    ['shared formatters', formatters],
    ['shared export utilities', exportUtils],
    ['shared utility helpers', sharedUtils],
    ['AI search action buttons', aiSearchActionButtons],
    ['font family selector', fontFamilySelect],
    ['image upload input', imageUploadInput],
    ['platform asset details modal', platformAssetDetailsModal],
    ['platform KB job action menu', platformJobActionMenu],
    ['platform users dashboard', platformUsers],
    ['platform tenant details modal', platformTenantDetailsModal],
    ['platform tenants dashboard', platformTenantsDashboard],
    ['platform analytics backfill', platformAnalyticsBackfill],
    ['platform pricing plans', platformPricingPlans],
    ['platform stores dashboard', platformStoresDashboard],
    ['platform font presets', platformFontPresets],
].forEach(([label, source]) => {
    assertIncludes(source, 'logRuntime', `${label} must use bounded runtime diagnostics.`);
    assertNoDirectConsole(source, `${label} must not direct-console runtime failures.`);
});
assertNoDirectConsole(rootLayout, 'Root development CSP helper must not direct-console CSP details.');
[
    ['platform article modal', platformArticleModal],
    ['platform tenant details modal', platformTenantDetailsModal],
].forEach(([label, source]) => {
    assertNoDirectConsole(source, `${label} must not direct-console normal-path or runtime details.`);
});
assertIncludes(platformArticleModal, 'FAQ_SUGGESTIONS_REFRESH_FAILED', 'Platform article modal must use fixed FAQ suggestion failure copy.');
assertIncludes(platformArticleModal, 'ARTICLE_EMBEDDING_GENERATION_FAILED', 'Platform article modal must use fixed article embedding failure copy.');
assert(!platformArticleModal.includes('result?.error'), 'Platform article modal must not throw raw FAQ generation response text.');
assert(!platformArticleModal.includes('embeddingResult.error'), 'Platform article modal must not show raw article embedding response text.');
assert(!platformArticleModal.includes('error?.message'), 'Platform article modal must not show raw FAQ generation exception text.');
assertIncludes(performanceUtils, 'component_render_slow', 'Performance utilities must code slow-render diagnostics.');
assertIncludes(performanceUtils, 'component_import_retry_scheduled', 'Performance utilities must code import retry diagnostics.');
assertIncludes(rootLayout, 'blockedUrlLength', 'Root development CSP helper must log bounded blocked URL metadata only.');
assertIncludes(rootLayout, 'sourceFileLength', 'Root development CSP helper must log bounded source-file metadata only.');
assertIncludes(rootLayout, 'logDevServiceWorkerCleanupFailure', 'Root development service-worker cleanup must code bounded diagnostics.');
assertIncludes(rootLayout, 'get_registrations_failed', 'Root development service-worker registration lookup failures must be visible.');
assertIncludes(rootLayout, 'unregister_failed', 'Root development service-worker unregister failures must be visible.');
assertIncludes(rootLayout, 'hostLength', 'Root development service-worker diagnostics must bound host metadata.');
assert(!rootLayout.includes('CSP BLOCKED URL - ADD TO ALLOWLIST'), 'Root development CSP helper must not keep raw blocked URL console group text.');
assert(!rootLayout.includes('blockedURL: blockedURI'), 'Root development CSP helper must not log raw blocked URLs.');
assert(!rootLayout.includes('sourceFile: e.sourceFile'), 'Root development CSP helper must not log raw source files.');
assert(!rootLayout.includes('.catch(() => {});'), 'Root development service-worker cleanup failures must not be silently swallowed.');
assertIncludes(serviceWorkerRegister, 'service_worker_registration_failed', 'Service worker registration must code failed registration diagnostics.');
assertIncludes(serviceWorkerRegister, 'service_worker_unregister_failed', 'Service worker unregister must code failed cleanup diagnostics.');
assertIncludes(serviceWorkerRegister, 'activeWorker: getRegisteredSwLabel(activeUrl)', 'Service worker unregister diagnostics must use bounded active-worker labels.');
assertIncludes(serviceWorkerRegister, 'targetWorker: getTargetSwLabel(targetUrl)', 'Service worker unregister diagnostics must use bounded target-worker labels.');
assert(!serviceWorkerRegister.includes('reg.unregister().catch(() => { })'), 'Service worker unregister failures must not be silently swallowed.');
assertIncludes(globalError, 'global_error_boundary_rendered', 'Global error boundary must code crash diagnostics.');
assertIncludes(appError, 'app_error_boundary_rendered', 'App route error boundary must code crash diagnostics.');
assertIncludes(appError, "getBoundedRuntimeStringContext('location'", 'App route error boundary must bound location diagnostics.');
assertIncludes(appError, "getBoundedRuntimeStringContext('userAgent'", 'App route error boundary must bound user-agent diagnostics.');
assertIncludes(appError, "getBoundedRuntimeStringContext('digest'", 'App route error boundary must bound digest diagnostics.');
assertIncludes(appError, 'app_error_help_open_failed', 'App route error boundary must code help-tab open failures.');
assertIncludes(appError, 'app_error_help_redirect_failed', 'App route error boundary must code help fallback navigation failures.');
assertIncludes(appError, "window.open(HELP_ROUTE, '_blank', 'noopener,noreferrer')", 'App route error boundary must use a safe help-tab open.');
assertIncludes(appError, 'window.location.assign(HELP_ROUTE)', 'App route error boundary must fall back to same-tab help navigation.');
assertIncludes(appError, "getBoundedRuntimeStringContext('helpRoute'", 'App route error boundary must bound help-route diagnostics.');
assertIncludes(globalPagesError, 'global_pages_error_boundary_rendered', 'Global pages error boundary must code crash diagnostics.');
assertIncludes(globalPagesError, "getBoundedRuntimeStringContext('location'", 'Global pages error boundary must bound location diagnostics.');
assertIncludes(globalPagesError, "getBoundedRuntimeStringContext('userAgent'", 'Global pages error boundary must bound user-agent diagnostics.');
assertIncludes(globalPagesError, "getBoundedRuntimeStringContext('digest'", 'Global pages error boundary must bound digest diagnostics.');
assert(!appError.includes("logger.error('App Error Boundary'"), 'App route error boundary must not raw-log crash diagnostics.');
assert(!appError.includes("window.open('/help', '_blank')"), 'App route error boundary must not use a raw help-tab open.');
assert(!appError.includes('userAgent: window?.navigator?.userAgent'), 'App route error boundary must not log raw user agent.');
assert(!appError.includes('location: window?.location?.href'), 'App route error boundary must not log raw location.');
assert(!appError.includes('digest: error.digest'), 'App route error boundary must not log raw digest.');
assert(!globalPagesError.includes("logger.error('Global Pages Error Boundary'"), 'Global pages error boundary must not raw-log crash diagnostics.');
assert(!globalPagesError.includes('userAgent: window?.navigator?.userAgent'), 'Global pages error boundary must not log raw user agent.');
assert(!globalPagesError.includes('location: window?.location?.href'), 'Global pages error boundary must not log raw location.');
assert(!globalPagesError.includes('digest: error.digest'), 'Global pages error boundary must not log raw digest.');
assertIncludes(errorReportButton, 'error_report_send_failed', 'Error report button must code failed report diagnostics.');
assertIncludes(errorReportButton, 'error_report_copy_failed', 'Error report button must code failed copy diagnostics.');
assertIncludes(errorReportButton, 'copyRuntimeTextToClipboard(diagnostics)', 'Error report button must wait for acknowledged diagnostic-copy success.');
assertIncludes(layoutProvider, 'layout_error_boundary_render_failed', 'Layout provider must code error-boundary diagnostics.');
assertNoDirectConsole(mainLayout, 'Main authenticated layout must not direct-console expected redirects.');
assert(!mainLayout.includes('No session found in MainLayout'), 'Main authenticated layout must not keep raw no-session redirect text.');
assertIncludes(analyticsContext, 'chat_analytics_action_failed', 'Chat analytics async action wrapper must code action failures.');
assertIncludes(analyticsContext, 'logAnalyticsFailure', 'Chat analytics async action wrapper must use bounded analytics diagnostics.');
assertNoDirectConsole(analyticsContext, 'Chat analytics async action wrapper must not direct-console action failures.');
assert(!analyticsContext.includes('error.message'), 'Chat analytics async action wrapper must not surface raw error.message in notifications.');
assert(!chatAnalyticsService.includes('@lib/monitoring/logger'), 'Chat analytics callable service must not import raw logger diagnostics.');
assert(!chatAnalyticsService.includes('logger.'), 'Chat analytics callable service must not emit or document raw logger diagnostics.');
assert(!chatAnalyticsService.includes("logger.info('Triggering analytics backfill'"), 'Chat analytics callable service must not raw-log backfill tenant/store inputs.');
assertIncludes(systemHealthDashboard, 'System health data is not connected for this view.', 'Analytics health dashboard must not show fake healthy data without a source.');
assert(!systemHealthDashboard.includes('Mock data for now'), 'Analytics health dashboard must not keep fake health-report scaffolding.');
assert(!systemHealthDashboard.includes("component: 'Firestore'"), 'Analytics health dashboard must not manufacture Firestore health status.');
assertIncludes(analyticsExportButton, 'analytics_export_failed', 'Analytics export button must code failed export diagnostics.');
assertIncludes(analyticsExportButton, 'getBoundedRuntimeStringContext', 'Analytics export button must log bounded filename context.');
assert(!analyticsExportButton.includes('PDF export coming soon!'), 'Analytics export button must not promise unsupported PDF export.');
assertIncludes(businessCopyLocalization, 'business_copy_batch_translation_failed', 'Business copy localization must code batch translation failures.');
assertIncludes(businessCopyLocalization, 'logTranslationFailure', 'Business copy localization must use bounded translation diagnostics.');
assertNoDirectConsole(businessCopyLocalization, 'Business copy localization must not direct-console translation API failures.');
assert(!businessCopyLocalization.includes('response.statusText'), 'Business copy localization must not expose raw translation status text.');
assertIncludes(formatters, 'date_format_preference_read_failed', 'Shared formatters must code date preference fallback failures.');
assertIncludes(formatters, 'time_format_preference_read_failed', 'Shared formatters must code time preference fallback failures.');
assertIncludes(exportUtils, 'csv_export_failed', 'Shared export utilities must code CSV export failures.');
assertIncludes(exportUtils, 'excel_export_failed', 'Shared export utilities must code Excel export failures.');
assertIncludes(sharedUtils, 'image_compression_failed', 'Shared utility helpers must code image compression failures.');
assert(!sharedUtils.includes('console.log(manifestString)'), 'Shared utility helpers must not keep old manifest debug console probes.');
assertIncludes(aiSearchActionButtons, 'ai_search_answer_copy_failed', 'AI search action buttons must code clipboard failures.');
assertIncludes(aiSearchActionButtons, 'copyAiSearchAnswerToClipboard', 'AI search action buttons must centralize answer copy acknowledgement.');
assertIncludes(aiSearchActionButtons, 'ai_search_answer_copy_clipboard_unavailable', 'AI search action buttons must code unavailable clipboard failures.');
assertIncludes(aiSearchActionButtons, 'ai_search_answer_copy_fallback_failed', 'AI search action buttons must code failed fallback clipboard failures.');
assertIncludes(aiSearchActionButtons, 'copyAnswerlatticeSupportTextToClipboard', 'AI search action buttons must use shared Answerlattice support clipboard fallback helper.');
assertIncludes(aiSearchActionButtons, 'hasClipboardWrite', 'AI search action buttons must log clipboard support as bounded metadata.');
assertIncludes(aiSearchActionButtons, 'hasCopyFallback', 'AI search action buttons must log fallback copy support as bounded metadata.');
assertIncludes(answerlatticeSupportClipboard, 'hasAnswerlatticeSupportClipboardWrite', 'Answerlattice support clipboard helper must expose Clipboard API support detection.');
assertIncludes(answerlatticeSupportClipboard, 'hasAnswerlatticeSupportCopyFallback', 'Answerlattice support clipboard helper must expose textarea fallback support detection.');
assertIncludes(answerlatticeSupportClipboard, "const copied = document.execCommand('copy');", 'Answerlattice support clipboard helper must acknowledge textarea copy result.');
assertIncludes(answerlatticeSupportClipboard, 'new Error(failureCodes.unavailable)', 'Answerlattice support clipboard helper must throw surface unavailable codes.');
assertIncludes(answerlatticeSupportClipboard, 'new Error(failureCodes.fallbackFailed)', 'Answerlattice support clipboard helper must throw surface fallback failure codes.');
assert(!aiSearchActionButtons.includes('navigator.clipboard.writeText(answer)\n            .then'), 'AI search action buttons must not rely on promise catch after direct clipboard access.');
assertIncludes(notificationCenter, 'setNotifications([]);', 'Notification center must stay empty when no notification source is connected.');
assert(!notificationCenter.includes('Low Satisfaction Rate'), 'Notification center must not ship fake owner alert records.');
assert(!notificationCenter.includes('AI service encountered'), 'Notification center must not ship fake AI service alert copy.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'OWNER_BUSINESS_ASSISTANT_SAFE_ERROR', 'Owner Business Assistant hook must use a fixed owner-safe failure message.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'class OwnerBusinessAssistantSafeError extends Error', 'Owner Business Assistant hook must use a typed local safe error sentinel.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'new OwnerBusinessAssistantSafeError()', 'Owner Business Assistant hook must throw normalized typed safe errors.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'isOwnerBusinessAssistantSafeError(err)', 'Owner Business Assistant hook must detect normalized failures through typed sentinel checks.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'owner_business_assistant_answer_rejected', 'Owner Business Assistant hook must code rejected answer responses.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'owner_business_assistant_answer_failed', 'Owner Business Assistant hook must code unexpected answer failures.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY', 'Owner Business Assistant hook must use the shared request policy.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'readJsonResponseWithLimit', 'Owner Business Assistant hook must parse answer responses through a bounded reader.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'OWNER_BUSINESS_ASSISTANT_ANSWER_RESPONSE_JSON_MAX_BYTES', 'Owner Business Assistant hook must cap answer response parsing.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'owner_business_assistant_answer_response_parse_failed', 'Owner Business Assistant hook must code answer response parse failures.');
assertIncludes(ownerBusinessAssistantAnswerHook, 'owner_business_assistant_answer_response_invalid', 'Owner Business Assistant hook must code invalid answer response shapes.');
assert(!ownerBusinessAssistantAnswerHook.includes('response.json().catch(() => null)'), 'Owner Business Assistant hook must not silently swallow answer response parse failures.');
assert(!ownerBusinessAssistantAnswerHook.includes('payload?.error'), 'Owner Business Assistant hook must not build owner errors from raw response payloads.');
assert(!ownerBusinessAssistantAnswerHook.includes('err.message === OWNER_BUSINESS_ASSISTANT_SAFE_ERROR'), 'Owner Business Assistant hook must not branch on raw safe-error message text.');
[
    ['mobile project selector sheet', mobileProjectSelectorSheet, 'mobile_project_image_generate_failed'],
    ['mobile design editor screen', mobileDesignEditorScreen, 'mobile_design_background_image_prepare_failed'],
    ['mobile Business Health screen', mobileBusinessHealthScreen, 'mobile_business_health_answer_failed'],
    ['mobile basic settings screen', mobileBasicSettingsScreen, 'mobile_basic_settings_logo_prepare_failed'],
    ['mobile Business Copy setup screen', mobileBusinessCopySetupScreen, 'mobile_business_copy_generation_failed'],
    ['mobile item edit sheet', mobileItemEditSheet, 'mobile_item_image_prepare_failed'],
    ['owner assistant panel', ownerAssistantPanel, 'Business Health could not answer that.'],
    ['business settings screen', businessSettings, 'business_settings_logo_prepare_failed'],
    ['Business Copy setup tab', businessCopySetupTab, 'business_settings_business_copy_generation_failed'],
    ['review reply tool', reviewReplyTool, 'desktop_review_reply_generation_failed'],
    ['project edit modal', projectEditModal, 'projects_page_project_image_generation_failed'],
    ['AI image generator', aiImageGenerator, 'menu_editor_ai_image_generate_failed'],
    ['image upload modal', imageUploadModal, 'menu_editor_batch_image_generation_start_failed'],
    ['menu background settings', backgroundSettings, 'menu_background_image_prepare_failed'],
    ['owner action plan card', ownerActionPlanCard, "message.error(t('actionPlan.markDoneFailed'))"],
    ['mobile owner action plan card', mobileOwnerActionPlanCard, "Toast.show({ content: t('actionPlan.markDoneFailed') })"],
].forEach(([label, source, expectedToken]) => {
    assertIncludes(source, expectedToken, `${label} must keep bounded diagnostics or fixed owner-safe copy for failure paths.`);
    assertNoOwnerVisibleRawErrorMessage(source, label);
});
assertIncludes(imageUploadModal, 'menu_editor_item_image_prepare_failed', 'Image upload modal must code item image preparation failures.');
assertIncludes(imageUploadModal, 'menu_editor_batch_image_job_mark_failed', 'Image upload modal must code batch job status update failures.');
assert(!imageUploadModal.includes('@lib/monitoring/logger'), 'Image upload modal must not use raw client logger for image failure paths.');
assertIncludes(reviewReplyTool, 'copyDesktopReviewReplyText', 'Review Reply tool must use acknowledged copy helper.');
assertIncludes(reviewReplyTool, 'DESKTOP_REVIEW_REPLY_COPY_UNAVAILABLE', 'Review Reply tool must code unavailable clipboard copy failures.');
assertIncludes(reviewReplyTool, 'DESKTOP_REVIEW_REPLY_COPY_FALLBACK_FAILED', 'Review Reply tool must code fallback copy failures.');
assertIncludes(reviewReplyTool, 'hasClipboardWrite', 'Review Reply copy diagnostics must include clipboard support metadata.');
assertIncludes(reviewReplyTool, 'hasCopyFallback', 'Review Reply copy diagnostics must include fallback support metadata.');
assertIncludes(reviewReplyTool, "const copied = document.execCommand('copy');", 'Review Reply textarea fallback must require copy acknowledgement.');
assert(!reviewReplyTool.includes('await navigator.clipboard.writeText(reply);\n            setCopied(true);'), 'Review Reply copy must not show copied state after unguarded Clipboard API success.');
assert(!reviewReplyTool.includes("document.execCommand('copy');\n            setCopied(true);"), 'Review Reply copy fallback must not assume success.');
assertIncludes(mobileBusinessCopySetupScreen, 'mobile_business_copy_translation_repair_failed', 'Mobile Business Copy setup must code translation repair failures.');
assertIncludes(mobileBusinessCopySetupScreen, 'mobile_business_copy_store_update_rejected', 'Mobile Business Copy setup must code generated-copy store acknowledgement failures.');
assertIncludes(mobileBusinessCopySetupScreen, 'mobile_business_copy_translation_store_update_rejected', 'Mobile Business Copy setup must code translation-repair store acknowledgement failures.');
assertIncludes(mobileBusinessCopySetupScreen, 'BUSINESS_COPY_CAPACITY_MESSAGE', 'Mobile Business Copy setup must keep fixed capacity copy.');
assertIncludes(businessSettings, 'desktop_business_copy_store_update_rejected', 'Desktop Business Copy setup must code generated-copy store acknowledgement failures.');
assertIncludes(businessSettings, 'desktop_business_copy_translation_store_update_rejected', 'Desktop Business Copy setup must code translation-repair store acknowledgement failures.');
assertIncludes(businessCopySetupTab, 'business_settings_business_copy_translation_repair_failed', 'Business Copy setup tab must code translation repair failures.');
assertIncludes(businessCopySetupTab, 'BUSINESS_COPY_CAPACITY_MESSAGE', 'Business Copy setup tab must keep fixed capacity copy.');
assertIncludes(reviewReplyTool, 'REVIEW_REPLY_CAPACITY_MESSAGE', 'Review reply tool must keep fixed capacity copy.');
assertIncludes(reviewReplyTool, 'desktop_review_reply_copy_failed', 'Review reply tool must code clipboard copy failures.');
assertIncludes(reviewReplyTool, 'readJsonResponseWithLimit<ReviewReplySuggestionResponse>', 'Review reply tool must parse suggestion responses through a bounded reader.');
assertIncludes(reviewReplyTool, 'REVIEW_REPLY_RESPONSE_JSON_MAX_BYTES', 'Review reply tool must cap suggestion response parsing.');
assertIncludes(reviewReplyTool, 'REVIEW_REPLY_REQUEST_POLICY', 'Review reply tool must keep a shared suggestion request policy.');
assertIncludes(reviewReplyTool, "cache: 'no-store'", 'Review reply tool suggestion request must bypass browser cache.');
assertIncludes(reviewReplyTool, "credentials: 'same-origin'", 'Review reply tool suggestion request must keep credentials same-origin.');
assertIncludes(reviewReplyTool, "redirect: 'manual'", 'Review reply tool suggestion request must not follow redirects.');
assertIncludes(reviewReplyTool, '...REVIEW_REPLY_REQUEST_POLICY', 'Review reply tool must use the suggestion request policy.');
assertIncludes(reviewReplyTool, 'desktop_review_reply_response_parse_failed', 'Review reply tool must code malformed suggestion responses.');
assertIncludes(reviewReplyTool, 'desktop_review_reply_response_invalid', 'Review reply tool must code invalid suggestion response envelopes.');
assertIncludes(reviewReplyTool, 'isAcknowledgedReviewReplySuggestionResponse', 'Review reply tool must use an acknowledged suggestion response guard.');
assertIncludes(reviewReplyTool, "value.source === 'ai' || value.source === 'fallback'", 'Review reply tool must require acknowledged suggestion source.');
assertIncludes(reviewReplyTool, 'hasExpectedSource', 'Review reply invalid-response diagnostics must include source acknowledgement status.');
assertIncludes(reviewReplyTool, 'if (!isAcknowledgedReviewReplySuggestionResponse(data))', 'Review reply tool must reject unacknowledged suggestion responses before showing a reply.');
assert(!reviewReplyTool.includes("if (data?.success !== true || typeof data.reply !== 'string' || data.reply.trim().length === 0)"), 'Review reply tool must not accept reply-only success acknowledgement without source.');
assertIncludes(reviewReplyTool, "getBoundedAiServiceStringContext('reply', reply)", 'Review reply tool must log only bounded generated reply metadata on copy failures.');
assertIncludes(reviewReplyTool, "notification.error({ message: 'Could not copy reply.' });", 'Review reply tool must use fixed owner-safe copy failure text.');
assert(!reviewReplyTool.includes('navigator.clipboard.writeText(reply);\n        setCopied(true);'), 'Review reply tool must not keep unguarded clipboard copy success flow.');
assert(!reviewReplyTool.includes("axios.post('/api/reviews/suggest'"), 'Review reply tool must not use unbounded axios suggestion responses.');
assert(!reviewReplyTool.includes('err.response?.data?.error'), 'Review reply tool must not show raw review API response text.');
assertIncludes(reviewSuggestRoute, 'requireAnyStorePermission(', 'Review reply suggestion route must enforce store-role permission before AI work.');
assertIncludes(reviewSuggestRoute, '[PERMISSIONS.MANAGE_FEEDBACK]', 'Review reply suggestion route must require feedback management permission.');
assertOrder(
    reviewSuggestRoute,
    [
        'const bodyResult = await readBoundedJsonBody(request, REVIEW_SUGGEST_MAX_BODY_BYTES)',
        'const validation = SuggestSchema.safeParse(bodyResult.data);',
        'const permissionError = await requireAnyStorePermission(',
        'if (permissionError) return permissionError;',
        'const capacityCheck = await checkAICapacity(session.tId, session.sId, ACTION);',
    ],
    'Review reply suggestion route must validate input and permission before AI capacity/provider work',
);
[
    {
        content: businessCopyRoute,
        label: 'Business copy generation',
        permission: '[PERMISSIONS.MANAGE_PUBLIC_PRESENCE, PERMISSIONS.MANAGE_STORE]',
        before: 'const capacityCheck = await checkAICapacity(',
    },
    {
        content: campaignCaptionRoute,
        label: 'Campaign caption',
        permission: '[PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU]',
        before: 'if (projectId) {',
    },
    {
        content: menuCardDesignAdvisorRoute,
        label: 'Menu Card design advisor',
        permission: '[PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU]',
        before: 'const subscription = await getActiveSubscriptionForStore(',
    },
    {
        content: seoRoute,
        label: 'SEO generation',
        permission: '[PERMISSIONS.MANAGE_PUBLIC_PRESENCE, PERMISSIONS.MANAGE_STORE]',
        before: 'const capacityCheck = await checkAICapacity(',
    },
    {
        content: translationsRoute,
        label: 'Translation generation',
        permission: '[PERMISSIONS.GENERATE_DESCRIPTIONS]',
        before: "logger.info('Translation requested'",
    },
].forEach(({ before, content, label, permission }) => {
    assertIncludes(content, 'requireAnyStorePermission(', `${label} route must enforce store-role permission before AI work.`);
    assertIncludes(content, permission, `${label} route must require the expected permission set.`);
    assertOrder(
        content,
        [
            'const bodyResult = await readBoundedJsonBody(',
            'const validation = validateAPIInput(',
            'const permissionError = await requireAnyStorePermission(',
            'if (permissionError) return permissionError;',
            before,
        ],
        `${label} route must validate input and permission before expensive AI work`,
    );
});
assertIncludes(aiPackStatusRoute, '[PERMISSIONS.ACCESS_BILLING]', 'AI pack status route must require billing access before capacity reads.');
assertOrder(
    aiPackStatusRoute,
    [
        'if (!tenantId || !storeId) {',
        'const permissionError = await requireAnyStorePermission(',
        'if (permissionError) return permissionError;',
        'const capacityCheck = await checkAICapacity(',
    ],
    'AI pack status route must check billing permission before capacity reads',
);
assertIncludes(weeklyNarrativeLocalRoute, '[PERMISSIONS.VIEW_ANALYTICS]', 'Weekly narrative local route must require analytics permission.');
assertOrder(
    weeklyNarrativeLocalRoute,
    [
        'const rateLimit = await checkRateLimit({',
        'if (!rateLimit.allowed) {',
        'const permissionError = await requireAnyStorePermission(',
        'if (permissionError) return permissionError;',
        "logger.info('[Weekly Narrative Local] Generating weekly narrative'",
        "const { genAIClient } = await import('@lib/google/genAi');",
        "const { firestoreAdmin } = await import('@lib/firebase/firebaseAdmin');",
    ],
    'Weekly narrative route must check analytics permission before provider/firestore work',
);
assert(!todayView.includes('This feature is coming soon.'), 'Today view must not show future-promise feature copy.');
assertIncludes(todayView, 'Today is not available for this location.', 'Today disabled state must use stable availability copy.');
assert(!ownerDashboardTypes.includes('Monthly summary coming soon'), 'Owner dashboard summary copy must not promise future work.');
assertIncludes(ownerDashboardTypes, 'Monthly summary not ready', 'Owner dashboard summary copy must use ready-state wording.');
assert(!promptEnhancer.includes('setTimeout'), 'Prompt enhancer must not simulate asynchronous generated suggestions.');
assertIncludes(fontFamilySelect, 'font_family_presets_load_failed', 'Font selector must code preset load failures.');
assertIncludes(fontFamilySelect, 'font_family_load_failed', 'Font selector must code font load failures.');
assertIncludes(imageUploadInput, 'image_upload_batch_failed', 'Image upload input must code batch upload failures.');
assertIncludes(imageUploadInput, 'image_upload_prepare_media_failed', 'Image upload input must code media preparation failures.');
assertIncludes(imageUploadInput, 'image_upload_file_process_failed', 'Image upload input must code per-file processing failures.');
assertIncludes(imageUploadInput, 'image_upload_magic_bytes_validation_rejected', 'Image upload input must code rejected magic-byte validations.');
assertIncludes(imageUploadInput, 'logSecurityDiagnostic', 'Image upload input must use bounded security diagnostics for validation rejects.');
assertIncludes(imageUploadInput, 'IMAGE_PREPARE_FAILED_MESSAGE', 'Image upload input must use fixed media preparation copy.');
assertIncludes(imageUploadInput, 'IMAGE_INVALID_TYPE_MESSAGE', 'Image upload input must use fixed type failure copy.');
assertIncludes(imageUploadInput, 'IMAGE_INVALID_FILE_MESSAGE', 'Image upload input must use fixed file validation failure copy.');
assert(!imageUploadInput.includes('Security: File validation failed'), 'Image upload input must not keep old raw security validation diagnostic.');
assert(!imageUploadInput.includes('Image upload error:'), 'Image upload input must not keep old raw batch upload diagnostic.');
assert(!imageUploadInput.includes('Image upload error (${file.name})'), 'Image upload input must not keep old raw per-file upload diagnostic.');
assert(!imageUploadInput.includes('message.error(`${file.name}:'), 'Image upload input must not prefix failure toasts with raw file names.');
assert(!imageUploadInput.includes("validation.error || 'File validation failed'"), 'Image upload input must not surface raw magic-byte validation text.');
assert(!imageUploadInput.includes('error instanceof Error ? error.message'), 'Image upload input must not surface raw media preparation exception messages.');
assert(!prepareMediaImage.includes("throw new Error(validation.error || 'Use a valid image file.')"), 'Media image preparation must not throw raw magic-byte validation text.');
assertIncludes(itemPhotoCaptureAssistLib, 'item_photo_readiness_stats_failed', 'Item photo readiness helper must code stats-analysis failures.');
assertIncludes(itemPhotoCaptureAssistLib, 'getItemPhotoReadinessLogContext', 'Item photo readiness helper must bound prepared-image context.');
assert(!itemPhotoCaptureAssistLib.includes('getPreparedImageStats(prepared).catch(() => null)'), 'Item photo readiness helper must not silently swallow stats failures.');
assertIncludes(itemPhotoCaptureAssist, 'item_photo_capture_failed', 'Item photo capture assist must code capture failures.');
assertIncludes(itemPhotoCaptureAssist, 'ITEM_PHOTO_CAPTURE_FAILED_MESSAGE', 'Item photo capture assist must use fixed capture failure copy.');
assert(!itemPhotoCaptureAssist.includes('setErrorMessage(error instanceof Error ? error.message'), 'Item photo capture assist must not surface raw capture exception messages.');
assertIncludes(mediaImageAdjustModal, 'media_image_adjust_failed', 'Media image adjust modal must code apply failures.');
assertIncludes(mediaImageAdjustModal, 'MEDIA_IMAGE_ADJUST_FAILED_MESSAGE', 'Media image adjust modal must use fixed adjustment failure copy.');
assert(!mediaImageAdjustModal.includes('message.error(error instanceof Error ? error.message'), 'Media image adjust modal must not surface raw adjustment exception messages.');
assertIncludes(platformAssetDetailsModal, 'platform_asset_fetch_image_failed', 'Platform asset details modal must code remote image fetch failures.');
assertIncludes(platformAssetDetailsModal, 'getBoundedRuntimeStringContext', 'Platform asset details modal must bound remote URL context.');
assertIncludes(platformAssetDetailsModal, 'PLATFORM_ASSET_REMOTE_IMAGE_MAX_BYTES', 'Platform asset details modal must cap remote image responses.');
assertIncludes(platformAssetDetailsModal, 'readResponseUint8ArrayWithLimit', 'Platform asset details modal must read remote image responses through the bounded binary reader.');
assertIncludes(platformAssetDetailsModal, 'resolvePlatformAssetRemoteImageUrl', 'Platform asset details modal must validate remote image URLs before fetching.');
assertIncludes(platformAssetDetailsModal, 'normalizePlatformAssetRemoteImageMimeType', 'Platform asset details modal must normalize remote image MIME types.');
assertIncludes(platformAssetDetailsModal, 'PLATFORM_ASSET_REMOTE_IMAGE_ALLOWED_MIME_TYPES', 'Platform asset details modal must allowlist remote image MIME types.');
assertIncludes(platformAssetDetailsModal, 'PLATFORM_ASSET_REMOTE_IMAGE_FAILED_MESSAGE', 'Platform asset details modal must use fixed remote image failure copy.');
assert(!platformAssetDetailsModal.includes('String.fromCharCode(...bytes.subarray'), 'Platform asset details modal must not spread Uint8Array chunks in the base64 converter.');
assert(!platformAssetDetailsModal.includes('axios.get(deployedUrl'), 'Platform asset details modal must not fetch remote images through unbounded axios arraybuffers.');
assert(!platformAssetDetailsModal.includes("responseType: 'arraybuffer'"), 'Platform asset details modal must not keep the old unbounded arraybuffer fetch branch.');
assertIncludes(platformAssetTemplates, 'platform_asset_templates_load_failed', 'Platform asset templates must code load failures.');
assertIncludes(platformAssetTemplates, 'platform_asset_template_open_failed', 'Platform asset templates must code open failures.');
assertIncludes(platformAssetTemplates, 'platform_asset_template_metadata_update_failed', 'Platform asset templates must code metadata update failures.');
assertIncludes(platformAssetTemplates, 'platform_asset_template_delete_failed', 'Platform asset templates must code delete failures.');
assertIncludes(platformAssetTemplates, 'platform_asset_template_save_failed', 'Platform asset templates must code save failures.');
assertIncludes(platformAssetTemplates, 'PLATFORM_TEMPLATE_SAVE_FAILED_MESSAGE', 'Platform asset templates must use fixed save failure copy.');
assert(!platformAssetTemplates.includes('messageApi.error(error instanceof Error ? error.message'), 'Platform asset templates must not surface raw exception messages in failure toasts.');
assertIncludes(templateRegistryDal, 'class TemplateRegistryLocalError extends Error', 'Template registry DAL must use typed local errors.');
assertIncludes(templateRegistryDal, 'type TemplateRegistryLocalErrorCode = keyof typeof TEMPLATE_REGISTRY_LOCAL_ERROR_MESSAGES', 'Template registry DAL must derive local error codes from the fixed copy map.');
assertIncludes(templateRegistryDal, 'isTemplateRegistryLocalErrorCode(code)', 'Template registry DAL must only surface allowlisted local error codes.');
assertIncludes(templateRegistryDal, 'throwTemplateRegistryLocalError("TEMPLATE_NOT_FOUND")', 'Template registry DAL must throw typed template-not-found errors.');
assertIncludes(templateRegistryDal, 'throwTemplateRegistryLocalError("TEMPLATE_DOCUMENT_TOO_LARGE")', 'Template registry DAL must throw typed document-size errors.');
assertIncludes(templateRegistryDal, 'payloadBlob.size > MAX_DOCUMENT_BYTES', 'Template registry DAL must cap stored document reads before text decoding.');
assert(!templateRegistryDal.includes('return JSON.parse(await payloadBlob.text())'), 'Template registry DAL must not decode stored template blobs before the size guard.');
assert(!templateRegistryDal.includes('message.startsWith("Template ")'), 'Template registry DAL must not trust arbitrary Template-prefixed exception messages.');
assert(!templateRegistryDal.includes('error instanceof Error ? error.message'), 'Template registry DAL must not branch on raw Error.message for local failures.');
assertIncludes(templateRegistryDal, '"Template storage is not available for this account."', 'Template registry DAL must keep fixed permission failure copy.');
assertIncludes(templateRegistryDal, '"Template storage is full. Clear storage or upgrade Firebase Storage, then try again."', 'Template registry DAL must keep fixed quota failure copy.');
assertIncludes(platformJobActionMenu, 'platform_kb_job_delete_failed', 'Platform KB job action menu must code delete failures.');
assertIncludes(platformWeeklyDigest, 'platform_weekly_digest_load_failed', 'Platform weekly digest must code load failures.');
assertIncludes(platformWeeklyDigest, 'platform_weekly_digest_generate_failed', 'Platform weekly digest must code generation failures.');
assertIncludes(platformWeeklyDigest, 'WEEKLY_DIGEST_GENERATE_FAILED_MESSAGE', 'Platform weekly digest must use fixed generation failure copy.');
assert(!platformWeeklyDigest.includes('errorData.details ||'), 'Platform weekly digest must not surface raw API details in generation errors.');
assert(!platformWeeklyDigest.includes('message.error(error instanceof Error ? error.message'), 'Platform weekly digest must not surface raw exception messages in failure toasts.');
assertIncludes(platformUsers, 'platform_user_verify_request_rejected', 'Platform users dashboard must code rejected verification responses.');
assertIncludes(platformUsers, 'platform_user_verify_request_failed', 'Platform users dashboard must code verification request failures.');
assertIncludes(platformUsers, 'assertUserUpdateSucceeded(', 'Platform users dashboard must require user-write acknowledgement before local success state.');
assertIncludes(platformUsers, 'platform_user_update_rejected', 'Platform users dashboard must include bounded rejected user-write acknowledgement code.');
assertIncludes(platformUsers, 'platform_user_update_failed', 'Platform users dashboard must code user-update failures.');
assertIncludes(platformUsers, 'readCreateStaffCompatibilityResponse', 'Platform users dashboard must use bounded create-staff compatibility response parsing.');
assertIncludes(platformUsers, 'isCreateStaffCompatibilitySuccessResponse(data)', 'Platform users dashboard must require a shaped create-staff success acknowledgement.');
assertIncludes(platformUsers, 'isCreateStaffCompatibilityEmailExistsResponse(data)', 'Platform users dashboard must only accept the allowlisted EMAIL_EXISTS compatibility acknowledgement.');
assertIncludes(platformUsers, 'STAFF_CLIENT_REQUEST_POLICY', 'Platform users dashboard must use shared staff request policy for create-staff verification.');
assert(!platformUsers.includes('const data = await res.json()'), 'Platform users dashboard must not parse create-staff responses directly.');
assert(!platformUsers.includes('res.json().catch'), 'Platform users dashboard must not silently swallow create-staff response parse failures.');
assert(!platformUsers.includes("'success' in data && data.success === true"), 'Platform users dashboard must not accept generic create-staff success without mode and user identity.');
assertIncludes(usersDal, 'export function assertUserUpdateSucceeded', 'User DAL must expose an explicit update acknowledgement guard.');
assertIncludes(usersDal, "throw new Error(rejectionCode);", 'User DAL acknowledgement guard must fail closed.');
assertIncludes(staffClient, 'readCreateStaffCompatibilityResponse', 'Staff client must expose bounded create-staff compatibility response parser.');
assertIncludes(staffClient, 'STAFF_CLIENT_REQUEST_POLICY', 'Staff client must expose a shared browser request policy.');
assertIncludes(staffClient, 'cache: "no-store"', 'Staff client request policy must bypass browser cache.');
assertIncludes(staffClient, 'credentials: "same-origin"', 'Staff client request policy must keep credentials same-origin.');
assertIncludes(staffClient, 'redirect: "manual"', 'Staff client request policy must not follow redirects.');
assert((staffClient.match(/STAFF_CLIENT_REQUEST_POLICY/g) || []).length >= 9, 'Staff client must apply request policy to list, staff mutation, and role mutation calls.');
assertIncludes(staffClient, 'staff_create_compatibility_response_invalid', 'Staff client must code invalid create-staff compatibility response shapes.');
assertIncludes(staffClient, 'isCreateStaffCompatibilityRejectedResponse', 'Staff client must validate create-staff rejected response shapes.');
assertIncludes(staffClient, 'isCreateStaffCompatibilitySuccessResponse', 'Staff client must expose a create-staff success acknowledgement guard.');
assertIncludes(staffClient, 'isCreateStaffCompatibilityEmailExistsResponse', 'Staff client must expose the allowlisted EMAIL_EXISTS compatibility guard.');
assertIncludes(staffClient, 'CREATE_STAFF_COMPATIBILITY_SUCCESS_MODES', 'Staff client must restrict create-staff compatibility successes to create-staff modes.');
assertIncludes(staffClient, 'requireUser: true', 'Create-staff compatibility success must include the returned user envelope.');
assertIncludes(staffClient, 'requireUserId: true', 'Create-staff compatibility success must include returned user identity.');
assertIncludes(staffClient, 'type StaffMutationParseOptions', 'Staff client must support operation-specific mutation acknowledgement requirements.');
assertIncludes(staffClient, 'isStaffUserSummaryResponse', 'Staff client must validate returned staff user envelopes before UI state updates.');
assertIncludes(staffClient, 'hasConsistentStaffMutationIdentity', 'Staff client must verify returned staff user and userId acknowledgement identity.');
assertIncludes(staffClient, 'return value.user.id === value.userId;', 'Staff client must reject mismatched returned staff user/userId envelopes.');
assertIncludes(staffClient, 'expectedModes: ["new_user_created", "existing_user_added_to_store"]', 'Create staff client call must require create/add-to-store acknowledgement modes.');
assertIncludes(staffClient, 'expectedModes: ["user_updated"]', 'Update/reset staff client calls must require user-updated acknowledgement mode.');
assertIncludes(staffClient, 'expectedModes: ["store_mapping_removed", "user_deactivated"]', 'Remove staff client call must require removal/deactivation acknowledgement modes.');
assertIncludes(staffClient, 'expectedModes: ["session_revoked"]', 'Force sign-out staff client call must require session-revoked acknowledgement mode.');
assertIncludes(staffClient, 'requireUser: true', 'Staff mutation calls that update UI state must require returned user data.');
assertIncludes(staffClient, 'requireUserId: true', 'Staff mutation calls that update UI state must require returned userId acknowledgement.');
assertIncludes(staffServer, 'const isEligibleStaffTargetStore = (', 'Staff server must centralize target-store eligibility checks.');
assertIncludes(staffServer, 'if (!isEligibleStaffTargetStore(authorityStore, tenantId))', 'Staff authority checks must reject inactive/deleted/platform-blocked authority stores.');
assertIncludes(staffServer, 'if (!isEligibleStaffTargetStore(targetStore, tenantId))', 'Staff list must reject inactive/deleted/platform-blocked target stores.');
assertIncludes(staffServer, 'if (!isEligibleStaffTargetStore(store, tenantId))', 'Staff mapping validation must reject inactive/deleted/platform-blocked stores.');
assert((staffServer.match(/if \(!isEligibleStaffTargetStore\(store, input\.tenantId\)\)/g) || []).length >= 2, 'Role save/delete must reject inactive/deleted/platform-blocked target stores.');
assertNoRandomReactKeys(tooltipElement, 'Tooltip wrapper');
assertNoRandomReactKeys(platformUsers, 'Platform users dashboard');
assertIncludes(platformTenantsDashboard, 'platform_tenants_load_failed', 'Platform tenants dashboard must code tenant load failures.');
assertIncludes(platformTenantsDashboard, 'platform_tenants_summary_load_failed', 'Platform tenants dashboard must code summary load failures.');
assertNoRandomReactKeys(platformTenantsDashboard, 'Platform tenants dashboard');
assertIncludes(platformAnalyticsBackfill, 'platform_analytics_backfill_failed', 'Platform analytics backfill must code report generation failures.');
assert(!platformAnalyticsBackfill.includes('error.message ||'), 'Platform analytics backfill must not surface raw exception messages in failure toasts.');
assertIncludes(platformPricingPlans, 'platform_pricing_plans_load_failed', 'Platform pricing plans must code load failures.');
assertIncludes(platformPricingPlans, 'platform_pricing_plan_save_failed', 'Platform pricing plans must code save failures.');
assertIncludes(platformPricingPlans, 'platform_pricing_plan_deactivate_failed', 'Platform pricing plans must code deactivate failures.');
assertIncludes(platformStoresDashboard, 'platform_stores_tenants_load_failed', 'Platform stores dashboard must code tenant load failures.');
assertIncludes(platformStoresDashboard, 'platform_stores_load_failed', 'Platform stores dashboard must code store load failures.');
assertNoRandomReactKeys(platformStoresDashboard, 'Platform stores dashboard');
assertIncludes(platformFontPresets, 'platform_font_presets_load_failed', 'Platform font presets must code preset load failures.');
assertIncludes(platformFontPresets, 'platform_font_preset_preview_failed', 'Platform font presets must code preview generation failures.');
assertIncludes(platformTenantDetailsModal, 'platform_tenant_save_failed', 'Platform tenant details modal must code bounded tenant save failures.');
assertIncludes(platformTenantDetailsModal, 'assertTenantUpdateSucceeded(', 'Platform tenant details modal must require tenant write acknowledgement.');
assertIncludes(platformTenantDetailsModal, 'platform_tenant_update_rejected', 'Platform tenant details modal must code update acknowledgement rejection.');
assertIncludes(platformTenantDetailsModal, 'platform_tenant_create_rejected', 'Platform tenant details modal must code create acknowledgement rejection.');
assert(!platformTenantDetailsModal.includes('updateTenant(updatedChanges).then'), 'Platform tenant details modal must not close after unchecked tenant update fallback.');
assert(!platformTenantDetailsModal.includes('addTenant(updatedChanges).then'), 'Platform tenant details modal must not close after unchecked tenant create fallback.');
[
    [platformAssetDetailsModal, 'Error fetching image:'],
    [platformAssetDetailsModal, 'console.log("downloadURL"'],
    [platformJobActionMenu, 'Failed to delete job:'],
    [platformUsers, 'Verify failed:'],
    [platformUsers, 'Verify error:'],
    [platformArticleModal, 'No content changes detected.'],
    [platformTenantDetailsModal, 'Changes detected:'],
    [platformTenantDetailsModal, 'No changes detected.'],
    [platformTenantsDashboard, 'Error fetching tenants:'],
    [platformTenantsDashboard, 'console.log("summary"'],
    [platformAnalyticsBackfill, 'Report generation failed:'],
    [platformPricingPlans, 'Error fetching plans:'],
    [platformPricingPlans, 'Error saving plan:'],
    [platformPricingPlans, 'Error deactivating plan:'],
    [platformStoresDashboard, 'Error fetching stores:'],
    [platformFontPresets, 'logger.debug("res"'],
].forEach(([source, rawDiagnostic]) => {
    assert(!source.includes(rawDiagnostic), `Platform admin surface must not keep old raw diagnostic string ${rawDiagnostic}.`);
});
assertIncludes(
    localLogUtils,
    "import { secureError } from '@lib/security/secureLogger';",
    'Local log utility must use secure logging for file-write failures.',
);
assertIncludes(
    localLogUtils,
    'normalizeLocalLogFailure',
    'Local log utility must normalize file-write failures before logging.',
);
assertIncludes(
    localLogUtils,
    "'[Local Log] Failed to write local log entry'",
    'Local log utility must securely log local file-write failures.',
);
assertIncludes(localLogUtils, 'getLocalLogErrorName', 'Local log utility must bound error names.');
assertIncludes(localLogUtils, 'sourceErrorCode: getLocalLogErrorCode(error)', 'Local log utility must bound error codes.');
assertIncludes(localLogUtils, 'sourceStatusCode: getLocalLogErrorStatus(error)', 'Local log utility must bound error statuses.');
assertIncludes(localLogUtils, 'sanitizeLocalLogData', 'Local log utility must summarize data payloads before writing files.');
assertIncludes(localLogUtils, 'safeLogKey', 'Local log utility must sanitize object keys before writing files.');
assertIncludes(localLogUtils, 'summary.keys = keys.map(safeLogKey)', 'Local log utility must sanitize retained object-key summaries.');
assertIncludes(localLogUtils, "return normalized || 'local.log';", 'Local log utility must fall back to a safe local filename.');
assertIncludes(localLogUtils, 'const sanitizedLogFileName = safeLogFileName(logFileName);', 'Local log utility must sanitize filenames before path join.');
assertIncludes(localLogUtils, 'const logFilePath = join(logDirectory, sanitizedLogFileName);', 'Local log utility must only join sanitized local filenames.');
assertIncludes(localLogUtils, "JSON.stringify(getLocalLogStringContext('userId', userId))", 'Local log utility must bound user IDs in file headers.');
assertIncludes(localLogUtils, "JSON.stringify(getLocalLogStringContext('projectId', projectId))", 'Local log utility must bound project IDs in file headers.');
assertIncludes(localLogUtils, "JSON.stringify(sanitizeLocalLogData(data))", 'Local log utility must write sanitized data payloads only.');
assert(!localLogUtils.includes('join(logDirectory, logFileName)'), 'Local log utility must not join raw log filenames.');
assert(!localLogUtils.includes('Original log data'), 'Local log utility must not dump original log payloads on write failure.');
assert(!localLogUtils.includes('error instanceof Error ? error.message'), 'Local log utility must not write raw exception messages.');
assert(!localLogUtils.includes('error.stack'), 'Local log utility must not write raw exception stacks.');
assert(!localLogUtils.includes('JSON.stringify(error)'), 'Local log utility must not serialize raw error objects.');
assert(!localLogUtils.includes('JSON.stringify(data)'), 'Local log utility must not serialize raw data payloads.');
assert(!localLogUtils.includes('Response: ${JSON.stringify(responseCopy)}'), 'Local log utility must not serialize raw provider response payloads.');
assert(!localLogUtils.includes('User: ${userId}'), 'Local log utility must not write raw user IDs.');
assert(!localLogUtils.includes('Project: ${projectId}'), 'Local log utility must not write raw project IDs.');
assert(!localLogUtils.includes('FileId: ${fileId}'), 'Local log utility must not write raw file IDs.');
assert(!localLogUtils.includes('summary[key] = sanitizeLocalLogData'), 'Local log utility must not write raw object keys as file log fields.');
assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(localLogUtils), 'Local log utility must not direct-console local log payloads.');
assertIncludes(
    functionsLogUtils,
    "import * as functions from 'firebase-functions';",
    'Functions local log utility must use functions.logger for file-write failures.',
);
assertIncludes(
    functionsLogUtils,
    "const enableLocalLogs = process.env.NODE_ENV !== 'production';",
    'Functions local log utility must not write local log files in production.',
);
assertIncludes(
    functionsLogUtils,
    "'[Local Log] Failed to write local log entry'",
    'Functions local log utility must securely log local file-write failures.',
);
assertIncludes(functionsLogUtils, 'getLocalLogErrorName', 'Functions local log utility must bound error names.');
assertIncludes(functionsLogUtils, 'sourceErrorCode: getLocalLogErrorCode(error)', 'Functions local log utility must bound error codes.');
assertIncludes(functionsLogUtils, 'sourceStatusCode: getLocalLogErrorStatus(error)', 'Functions local log utility must bound error statuses.');
assertIncludes(functionsLogUtils, 'sanitizeLocalLogData', 'Functions local log utility must summarize data payloads before writing files.');
assertIncludes(functionsLogUtils, 'safeLogKey', 'Functions local log utility must sanitize object keys before writing files.');
assertIncludes(functionsLogUtils, 'summary.keys = keys.map(safeLogKey)', 'Functions local log utility must sanitize retained object-key summaries.');
assertIncludes(functionsLogUtils, "return normalized || 'local.log';", 'Functions local log utility must fall back to a safe local filename.');
assertIncludes(functionsLogUtils, 'const sanitizedLogFileName = safeLogFileName(logFileName);', 'Functions local log utility must sanitize filenames before path join.');
assertIncludes(functionsLogUtils, 'const logFilePath = join(logDirectory, sanitizedLogFileName);', 'Functions local log utility must only join sanitized local filenames.');
assertIncludes(functionsLogUtils, "JSON.stringify(getLocalLogStringContext('userId', userId))", 'Functions local log utility must bound user IDs in file headers.');
assertIncludes(functionsLogUtils, "JSON.stringify(getLocalLogStringContext('projectId', projectId))", 'Functions local log utility must bound project IDs in file headers.');
assertIncludes(functionsLogUtils, "JSON.stringify(sanitizeLocalLogData(data))", 'Functions local log utility must write sanitized data payloads only.');
assert(!functionsLogUtils.includes('join(logDirectory, logFileName)'), 'Functions local log utility must not join raw log filenames.');
assert(!functionsLogUtils.includes('Original log data'), 'Functions local log utility must not dump original log payloads on write failure.');
assert(!functionsLogUtils.includes('error instanceof Error ? error.message'), 'Functions local log utility must not write raw exception messages.');
assert(!functionsLogUtils.includes('error.stack'), 'Functions local log utility must not write raw exception stacks.');
assert(!functionsLogUtils.includes('JSON.stringify(error)'), 'Functions local log utility must not serialize raw error objects.');
assert(!functionsLogUtils.includes('JSON.stringify(data)'), 'Functions local log utility must not serialize raw data payloads.');
assert(!functionsLogUtils.includes('Response: ${JSON.stringify(responseCopy)}'), 'Functions local log utility must not serialize raw provider response payloads.');
assert(!functionsLogUtils.includes('User: ${userId}'), 'Functions local log utility must not write raw user IDs.');
assert(!functionsLogUtils.includes('Project: ${projectId}'), 'Functions local log utility must not write raw project IDs.');
assert(!functionsLogUtils.includes('FileId: ${fileId}'), 'Functions local log utility must not write raw file IDs.');
assert(!functionsLogUtils.includes('summary[key] = sanitizeLocalLogData'), 'Functions local log utility must not write raw object keys as file log fields.');
assertNoDirectConsole(functionsLogUtils, 'Functions local log utility must not direct-console local log payloads.');
assertIncludes(
    envDiagnostics,
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'Env diagnostics must use secure logging.',
);
assertIncludes(envDiagnostics, 'logEnvValidationDiagnostic', 'Env diagnostics must expose bounded diagnostic logging.');
assertIncludes(envDiagnostics, 'logEnvValidationFailure', 'Env diagnostics must expose bounded failure logging.');
assert(!/\bconsole\./.test(envDiagnostics), 'Env diagnostics must not direct-console validation state.');
assertIncludes(envValidation, 'env_required_variables_missing_vercel', 'Env validation must code Vercel required-var failures.');
assertIncludes(envValidation, 'env_required_variables_missing_production', 'Env validation must code production required-var failures.');
assertIncludes(envValidation, 'env_required_variables_missing_development', 'Env validation must code development required-var diagnostics.');
assertIncludes(envValidation, 'env_payment_variables_missing_development', 'Env validation must code development payment-var diagnostics.');
assertIncludes(envValidation, 'missingCount: result.missing.length', 'Env validation must log missing counts instead of raw missing-variable lists.');
assert(!/\bconsole\./.test(envValidation), 'Env validation must not direct-console missing env details.');
assertIncludes(
    i18nDiagnostics,
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'i18n diagnostics must use secure logging.',
);
assertIncludes(
    i18nDiagnostics,
    'getBoundedI18nStringContext',
    'i18n diagnostics must expose bounded string context.',
);
assertIncludes(
    i18nDiagnostics,
    'sourceErrorName: getI18nErrorName(error)',
    'i18n diagnostics must log source error names only.',
);
assertIncludes(
    i18nDiagnostics,
    'sourceErrorCode: getI18nErrorCode(error)',
    'i18n diagnostics must log bounded source error codes only.',
);
assertIncludes(
    i18nDiagnostics,
    'sourceStatusCode: getI18nErrorStatus(error)',
    'i18n diagnostics must log numeric source status only.',
);
assertNoDirectConsole(i18nDiagnostics, 'i18n diagnostics must not direct-console failures.');
[
    ['active i18n request config', i18nRequest],
    ['legacy i18n request config', legacyI18nRequest],
    ['Intl client wrapper', intlClientWrapper],
].forEach(([label, source]) => {
    assertIncludes(source, 'logI18n', `${label} must use bounded i18n diagnostics.`);
    assertNoDirectConsole(source, `${label} must not direct-console locale errors or missing messages.`);
});
assertIncludes(i18nRequest, 'i18n_locale_messages_load_failed', 'i18n request must code locale-message fallback failures.');
assertIncludes(i18nRequest, 'i18n_missing_message', 'i18n request must code missing-message diagnostics.');
assertIncludes(i18nRequest, 'i18n_request_config_failed', 'i18n request must code request config failures.');
assert(!i18nRequest.includes('i18n Configuration Error'), 'i18n request must not keep old raw configuration logger text.');
assert(!i18nRequest.includes('windowRef'), 'i18n request must not log browser location/user-agent context.');
assertIncludes(legacyI18nRequest, 'i18n_old_request_config_failed', 'Legacy i18n request must code request config failures.');
assert(!legacyI18nRequest.includes('error payload'), 'Legacy i18n request must not log raw error payloads.');
assertIncludes(intlClientWrapper, 'i18n_client_missing_message', 'Intl client wrapper must code missing-message diagnostics.');
assertIncludes(intlClientWrapper, 'i18n_client_runtime_error', 'Intl client wrapper must code runtime translation errors.');
assertIncludes(
    storageDiagnostics,
    "import { secureError } from \"@lib/security/secureLogger\";",
    'Storage diagnostics must use secure logging.',
);
assertIncludes(
    storageDiagnostics,
    'getBoundedStringLogContext',
    'Storage diagnostics must expose bounded string context.',
);
assertIncludes(
    storageDiagnostics,
    'new Error(failureCode)',
    'Storage diagnostics must normalize logged storage failures.',
);
assertNoDirectConsole(storageDiagnostics, 'Storage diagnostics must not direct-console failures.');
[
    ['delete storage helper', deleteFromStorage],
    ['base64 storage upload helper', uploadBase64ToStorage],
    ['JSON storage upload helper', uploadJSONToStorage],
    ['font storage upload helper', uploadFontToStorage],
    ['blob storage upload helper', uploadBlobFileToStorage],
    ['OBP photo storage helper', uploadOBPPhoto],
    ['Firebase upload storage helper', firebaseStorageHelper],
].forEach(([label, source]) => {
    assertIncludes(source, 'logStorageHelperFailure', `${label} must use bounded storage diagnostics.`);
    assertIncludes(source, 'getBoundedStringLogContext', `${label} must log string lengths instead of raw paths/URLs.`);
    assertNoDirectConsole(source, `${label} must not direct-console URLs, paths, or errors.`);
    assert(!source.includes('res.metadata.fullPath'), `${label} must not log raw Storage fullPath.`);
    assert(!source.includes('File available at'), `${label} must not log raw download URLs.`);
    assert(!source.includes('error while uploading file'), `${label} must not log raw upload errors.`);
});
assertIncludes(deleteFromStorage, "error: 'Failed to delete file'", 'Delete storage helper must return generic failure text.');
assert(!deleteFromStorage.includes('error: errorMessage'), 'Delete storage helper must not return raw provider error messages.');
assertIncludes(uploadBase64ToStorage, "throw new Error('Failed to upload file')", 'Base64 storage helper must throw generic failure text.');
assert(!uploadBase64ToStorage.includes('error.message'), 'Base64 storage helper must not expose raw provider error messages.');
assertIncludes(uploadJSONToStorage, 'const uploadJSONToStorage = async', 'JSON storage helper must await upload/download failures.');
assertIncludes(uploadJSONToStorage, 'return await getDownloadURL(storageRef);', 'JSON storage helper must await download URL resolution.');
assertIncludes(uploadFontToStorage, 'const uploadFontToStorage = async', 'Font storage helper must await upload/download failures.');
assertIncludes(uploadFontToStorage, 'return await getDownloadURL(storageRef);', 'Font storage helper must await download URL resolution.');
assertIncludes(uploadBlobFileToStorage, 'resolve(null);', 'Blob storage helper must settle failed upload/download paths.');
assertIncludes(uploadBlobFileToStorage, 'storage_blob_download_url_failed', 'Blob storage helper must log download URL failures without hanging.');
assertIncludes(firebaseStorageHelper, 'firebase_storage_upload_failed', 'Firebase upload helper must log upload failures with normalized code.');
assertIncludes(firebaseStorageHelper, 'firebase_storage_download_url_failed', 'Firebase upload helper must log download URL failures with normalized code.');
assertIncludes(firebaseStorageHelper, "reject(new Error('Failed to upload file'))", 'Firebase upload helper must reject with generic failure text.');
assert(!firebaseStorageHelper.includes("reject(error);"), 'Firebase upload helper must not reject raw provider errors.');
assert(!firebaseStorageHelper.includes('Upload failed:'), 'Firebase upload helper must not log raw upload errors.');
assertIncludes(uploadOBPPhoto, 'storage_obp_photo_batch_delete_failed', 'OBP photo batch delete failures must use bounded diagnostics.');
assert(!uploadOBPPhoto.includes('[deleteOBPPhotos] Some OBP photo deletes failed.'), 'OBP photo helper must not keep raw batch delete warning.');
assertIncludes(
    staticAssetDiagnostics,
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'Static asset diagnostics must use secure logging.',
);
assertIncludes(
    staticAssetDiagnostics,
    'getBoundedStaticAssetStringContext',
    'Static asset diagnostics must expose bounded string context.',
);
assertIncludes(
    staticAssetDiagnostics,
    'sourceErrorName: getStaticAssetErrorName(error)',
    'Static asset diagnostics must log source error names only.',
);
assertIncludes(
    staticAssetDiagnostics,
    'sourceErrorCode: getStaticAssetErrorCode(error)',
    'Static asset diagnostics must log bounded source error codes only.',
);
assertIncludes(
    staticAssetDiagnostics,
    'sourceStatusCode: getStaticAssetErrorStatus(error)',
    'Static asset diagnostics must log numeric source status only.',
);
assertNoDirectConsole(staticAssetDiagnostics, 'Static asset diagnostics must not direct-console failures.');
assertIncludes(staticAssetData, 'logStaticAssetFailure', 'Static asset DAL must use bounded static asset failure diagnostics.');
assertIncludes(staticAssetData, 'logStaticAssetDiagnostic', 'Static asset DAL must use bounded static asset diagnostic events.');
assertIncludes(staticAssetData, 'static_asset_category_file_cleanup_failed', 'Static asset category cleanup failures must be coded.');
assertIncludes(staticAssetData, 'static_asset_subcategory_file_cleanup_failed', 'Static asset subcategory cleanup failures must be coded.');
assertIncludes(staticAssetData, 'static_asset_item_update_item_missing', 'Static asset item update missing-item paths must be coded.');
assertIncludes(staticAssetData, 'static_asset_item_delete_item_missing', 'Static asset item delete missing-item paths must be coded.');
assertNoDirectConsole(staticAssetData, 'Static asset DAL must not direct-console asset IDs, URLs, or provider errors.');
assert(!staticAssetData.includes('Document written with ID'), 'Static asset DAL must not log raw Firestore document IDs on success.');
assert(!staticAssetData.includes('Subcategory not found.'), 'Static asset DAL must not keep raw missing-subcategory console text.');
assert(!staticAssetData.includes('Unbale to delete siome files'), 'Static asset DAL must not keep misspelled raw cleanup diagnostic text.');
assertNoDirectConsole(tenantData, 'Tenant DAL must not direct-console normal misses or stale delete diagnostics.');
assert(!tenantData.includes('User not found.'), 'Tenant email lookup misses must stay quiet.');
assert(!tenantData.includes('Tenant Logo Deleted'), 'Tenant DAL must not keep stale commented raw logo delete diagnostics.');
assert(!tenantData.includes('Tenant Deleted'), 'Tenant DAL must not keep stale commented raw delete diagnostics.');
assertIncludes(
    imageProviderDiagnostics,
    "import { secureError } from '@lib/security/secureLogger';",
    'Image provider diagnostics must use secure logging.',
);
assertIncludes(
    imageProviderDiagnostics,
    'getBoundedImageProviderStringContext',
    'Image provider diagnostics must expose bounded string context.',
);
assertIncludes(
    imageProviderDiagnostics,
    "'[Image Provider] Operation failed'",
    'Image provider diagnostics must use normalized provider failure logging.',
);
assertNoDirectConsole(imageProviderDiagnostics, 'Image provider diagnostics must not direct-console failures.');
assertIncludes(imageProviderRequests, 'IMAGE_PROVIDER_REQUEST_TIMEOUT_MS = 10000', 'Image provider requests must use a bounded provider timeout.');
assertIncludes(imageProviderRequests, 'normalizeImageProviderPage', 'Image provider requests must normalize pages.');
assertIncludes(imageProviderRequests, 'normalizeImageProviderQuery', 'Image provider requests must bound search queries.');
assertIncludes(imageProviderRequests, 'normalizeImageProviderOrientation', 'Image provider requests must normalize orientations.');
assertIncludes(imageProviderRequests, 'url.searchParams.set', 'Image provider requests must encode outbound provider params.');
[
    ['Unsplash provider', unsplashProvider, 'image_provider_unsplash_search_failed'],
    ['Unsplash topics provider', unsplashProvider, 'image_provider_unsplash_topics_failed'],
    ['Pexels provider', pexelsProvider, 'image_provider_pexels_search_failed'],
    ['Pixabay provider', pixabayProvider, 'image_provider_pixabay_search_failed'],
].forEach(([label, source, failureCode]) => {
    assertIncludes(source, 'buildImageProviderUrl', `${label} must build encoded provider URLs.`);
    assertIncludes(source, 'IMAGE_PROVIDER_REQUEST_TIMEOUT_MS', `${label} must apply bounded provider timeouts.`);
    assertIncludes(source, 'normalizeImageProvider', `${label} must normalize provider inputs before outbound calls.`);
    assertIncludes(source, 'logImageProviderFailure', `${label} must use bounded image-provider diagnostics.`);
    assertIncludes(source, 'getImageProviderRequestLogContext', `${label} must log bounded request metadata.`);
    assertIncludes(source, failureCode, `${label} must include bounded failure code ${failureCode}.`);
    assertNoDirectConsole(source, `${label} must not direct-console provider errors.`);
    assert(!source.includes('rej(error.response.data)'), `${label} must not reject raw provider response data.`);
    assert(!source.includes('rej(error?.response?.data'), `${label} must not reject raw provider response data.`);
    assert(!source.includes('query=${searchQuery}'), `${label} must not interpolate raw search queries into provider URLs.`);
    assert(!source.includes('q=${searchQuery}'), `${label} must not interpolate raw search queries into provider URLs.`);
    assert(!source.includes('orientation=${orientation}&page=${page}'), `${label} must not interpolate raw orientation/page into provider URLs.`);
    assert(!source.includes('Error in api/unsplash/getImages'), `${label} must remove old raw provider diagnostic text.`);
});
assertIncludes(pexelsProvider, 'headers: {', 'Pexels provider must pass Authorization under Axios headers.');
assertIncludes(pexelsProvider, 'Authorization: process.env.NEXT_PUBLIC_PEXELS_API_CLIENTID ||', 'Pexels provider must send the configured provider key as an Axios header.');
assertIncludes(
    hookDiagnostics,
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'Shared hook diagnostics must use secure logging.',
);
assertIncludes(
    hookDiagnostics,
    'getBoundedHookStringContext',
    'Shared hook diagnostics must expose bounded string context.',
);
assertIncludes(
    hookDiagnostics,
    "'[Hook] Operation failed'",
    'Shared hook diagnostics must use normalized hook failure logging.',
);
assertIncludes(
    hookDiagnostics,
    'logHookDiagnostic',
    'Shared hook diagnostics must expose normalized development diagnostics.',
);
assertIncludes(
    hookDiagnostics,
    "'[Hook] Diagnostic'",
    'Shared hook diagnostics must use a stable diagnostic label.',
);
assertNoDirectConsole(hookDiagnostics, 'Shared hook diagnostics must not direct-console failures.');
[
    ['content view tracking hook', useContentViewTracking, 'content_view_tracking_persist_failed'],
    ['fullscreen hook', useFullscreen, 'fullscreen_toggle_failed'],
    ['recent colors hook', useRecentColors, 'recent_colors_load_failed'],
    ['recent colors hook', useRecentColors, 'recent_colors_save_failed'],
    ['recent colors hook', useRecentColors, 'favorite_colors_save_failed'],
    ['recent colors hook', useRecentColors, 'recent_colors_clear_failed'],
    ['safe app selector hook', useAppSelector, 'redux_selector_access_failed'],
    ['safe app dispatch hook', useAppDispatch, 'redux_dispatch_access_failed'],
    ['safe app dispatch hook', useAppDispatch, 'redux_dispatch_noop_called'],
    ['ingestion jobs listener hook', useIngestionJobsListener, 'ingestion_jobs_listener_snapshot_failed'],
    ['ingestion jobs listener hook', useIngestionJobsListener, 'ingestion_jobs_listener_setup_failed'],
    ['image batch job listener hook', useImageBatchJobListener, 'image_batch_job_listener_snapshot_failed'],
    ['image batch job listener hook', useImageBatchJobListener, 'image_batch_job_listener_setup_failed'],
    ['recently viewed storage helper', recentlyViewedHelper, 'recently_viewed_parse_failed'],
    ['recently viewed storage helper', recentlyViewedHelper, 'recently_viewed_read_failed'],
    ['recently viewed storage helper', recentlyViewedHelper, 'recently_viewed_write_failed'],
    ['recently viewed storage helper', recentlyViewedHelper, 'recently_viewed_clear_failed'],
    ['content feedback storage helper', contentFeedbackStorage, 'content_feedback_storage_parse_failed'],
    ['content feedback storage helper', contentFeedbackStorage, 'content_feedback_storage_read_failed'],
    ['content feedback storage helper', contentFeedbackStorage, 'content_feedback_storage_write_failed'],
    ['content feedback storage helper', contentFeedbackStorage, 'content_feedback_storage_clear_failed'],
].forEach(([label, source, failureCode]) => {
    assertIncludes(source, 'logHookFailure', `${label} must use shared hook diagnostics.`);
    assertIncludes(source, failureCode, `${label} must include bounded failure code ${failureCode}.`);
    assertNoDirectConsole(source, `${label} must not direct-console browser or Redux failures.`);
});
[
    [
        'ingestion jobs listener hook',
        useIngestionJobsListener,
        [
            "getBoundedHookStringContext('tenantId', tenantId)",
            "getBoundedHookStringContext('storeId', storeId)",
        ],
    ],
    [
        'image batch job listener hook',
        useImageBatchJobListener,
        [
            "getBoundedHookStringContext('projectId', projectId)",
            "getBoundedHookStringContext('tenantId', tenantId)",
            "getBoundedHookStringContext('storeId', storeId)",
        ],
    ],
].forEach(([label, source, boundedNeedles]) => {
    boundedNeedles.forEach((boundedNeedle) => {
        assertIncludes(source, boundedNeedle, `${label} must keep listener identifiers bounded.`);
    });
});
[
    'ingestion_jobs_listener_active_job_found',
    'logHookDiagnostic',
    "getBoundedHookStringContext('jobId'",
    "getBoundedHookStringContext('jobStatus'",
    'developmentOnly: true',
].forEach((token) => {
    assertIncludes(useIngestionJobsListener, token, `Ingestion jobs listener must include bounded lifecycle diagnostic token ${token}.`);
});
assert(!useIngestionJobsListener.includes('import { logger }'), 'Ingestion jobs listener must not import raw logger diagnostics.');
assert(!useIngestionJobsListener.includes('logger.debug('), 'Ingestion jobs listener must not route lifecycle diagnostics through raw logger.debug.');
[
    'image_batch_job_listener_scope_cleanup',
    'image_batch_job_listener_initializing',
    'image_batch_job_listener_previous_cleanup',
    'image_batch_job_listener_setup_started',
    'image_batch_job_listener_snapshot_received',
    'image_batch_job_listener_active_job_updated',
    'image_batch_job_listener_empty_snapshot',
    'image_batch_job_listener_cleanup',
    'logHookDiagnostic',
    'developmentOnly: true',
].forEach((token) => {
    assertIncludes(useImageBatchJobListener, token, `Image batch job listener must include bounded lifecycle diagnostic token ${token}.`);
});
assert(!useImageBatchJobListener.includes('import { logger }'), 'Image batch job listener must not import raw logger diagnostics.');
assert(!useImageBatchJobListener.includes('logger.debug('), 'Image batch job listener must not route lifecycle diagnostics through raw logger.debug.');
[
    [useContentViewTracking, 'Unable to persist recently viewed'],
    [useFullscreen, 'Fullscreen error:'],
    [useRecentColors, 'Error loading color history:'],
    [useRecentColors, 'Error saving recent colors:'],
    [useRecentColors, 'Error saving favorite colors:'],
    [useRecentColors, 'Error clearing recent colors:'],
    [useAppSelector, 'Error in useSafeAppSelector:'],
    [useAppDispatch, 'Error accessing Redux dispatch:'],
    [useAppDispatch, 'Redux dispatch called without Redux context'],
    [useIngestionJobsListener, "logger.error('Ingestion jobs listener error'"],
    [useIngestionJobsListener, "logger.error('Failed to setup ingestion jobs listener'"],
    [useIngestionJobsListener, "logger.debug('Active ingestion job found'"],
    [useIngestionJobsListener, 'jobId: currentActiveJob.id'],
    [useImageBatchJobListener, "logger.error('Batch job listener error'"],
    [useImageBatchJobListener, "logger.error('Failed to setup batch job listener'"],
    [useImageBatchJobListener, 'jobId: updatedJob.id'],
    [useImageBatchJobListener, "{ projectId, snapshotSize: querySnapshot.size }"],
    [useImageBatchJobListener, "logger.debug('No batch jobs found', { projectId })"],
    [useImageBatchJobListener, "logger.debug('Cleaning up batch job listener', { projectId })"],
    [recentlyViewedHelper, 'Failed to parse recently viewed entries'],
    [contentFeedbackStorage, 'Failed to parse feedback'],
    [contentFeedbackStorage, 'localStorage unavailable:'],
    [contentFeedbackStorage, 'Failed to write ${contentType} feedback'],
    [contentFeedbackStorage, 'Failed to clear ${contentType} feedback'],
].forEach(([source, rawDiagnostic]) => {
    assert(!source.includes(rawDiagnostic), `Shared hook must not keep old raw diagnostic string ${rawDiagnostic}.`);
});
assertIncludes(
    firebaseDiagnostics,
    "import { secureError } from '@lib/security/secureLogger';",
    'Firebase bootstrap diagnostics must use secure logging.',
);
assertIncludes(
    firebaseDiagnostics,
    'getBoundedFirebaseStringContext',
    'Firebase bootstrap diagnostics must expose bounded string context.',
);
assertIncludes(
    firebaseDiagnostics,
    'getFirebaseAuthSessionLogContext',
    'Firebase bootstrap diagnostics must log session presence and lengths instead of raw identity values.',
);
assertIncludes(
    firebaseDiagnostics,
    'createFirebaseBootstrapError',
    'Firebase bootstrap diagnostics must provide generic coded errors for auth sync.',
);
assertIncludes(
    firebaseDiagnostics,
    'sourceErrorName: getFirebaseErrorName(error)',
    'Firebase bootstrap diagnostics must log source error names only.',
);
assertIncludes(
    firebaseDiagnostics,
    'sourceErrorCode: getFirebaseErrorCode(error)',
    'Firebase bootstrap diagnostics must log bounded source error codes only.',
);
assertIncludes(
    firebaseDiagnostics,
    'sourceStatusCode: getFirebaseErrorStatus(error)',
    'Firebase bootstrap diagnostics must log numeric source status only.',
);
assertNoDirectConsole(firebaseDiagnostics, 'Firebase bootstrap diagnostics must not direct-console failures.');
assertIncludes(
    firebaseAdminDiagnostics,
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'Firebase Admin diagnostics must use secure logging.',
);
assertIncludes(
    firebaseAdminDiagnostics,
    'getBoundedFirebaseAdminStringContext',
    'Firebase Admin diagnostics must expose bounded string context.',
);
assertIncludes(
    firebaseAdminDiagnostics,
    'sourceErrorName: getFirebaseAdminErrorName(error)',
    'Firebase Admin diagnostics must log source error names only.',
);
assertIncludes(
    firebaseAdminDiagnostics,
    'sourceErrorCode: getFirebaseAdminErrorCode(error)',
    'Firebase Admin diagnostics must log bounded source error codes only.',
);
assertIncludes(
    firebaseAdminDiagnostics,
    'sourceStatusCode: getFirebaseAdminErrorStatus(error)',
    'Firebase Admin diagnostics must log numeric source status only.',
);
assertNoDirectConsole(firebaseAdminDiagnostics, 'Firebase Admin diagnostics must not direct-console failures.');
[
    ['MenuList Firebase Admin', firebaseAdmin],
    ['Answerlattice Firebase Admin', answerlatticeFirebaseAdmin],
    ['CampaignCue Firebase Admin', campaigncueFirebaseAdmin],
    ['SignalDesk Firebase Admin', signaldeskFirebaseAdmin],
].forEach(([label, source]) => {
    assertIncludes(source, 'logFirebaseAdmin', `${label} must use bounded Firebase Admin diagnostics.`);
    assertNoDirectConsole(source, `${label} must not direct-console Firebase Admin credentials or initialization.`);
});
assertIncludes(firebaseAdmin, 'firebase_admin_initialized', 'MenuList Firebase Admin must code initialization diagnostics.');
assertIncludes(answerlatticeFirebaseAdmin, 'answerlattice_admin_env_credential_invalid', 'Answerlattice Firebase Admin must code invalid env credential diagnostics.');
assertIncludes(answerlatticeFirebaseAdmin, 'answerlattice_admin_file_credential_load_failed', 'Answerlattice Firebase Admin must code file credential diagnostics.');
assertIncludes(answerlatticeFirebaseAdmin, 'answerlattice_admin_local_adc_initialize_failed', 'Answerlattice Firebase Admin must code local ADC diagnostics.');
assertIncludes(campaigncueFirebaseAdmin, 'campaigncue_admin_env_credential_invalid', 'CampaignCue Firebase Admin must code invalid env credential diagnostics.');
assertIncludes(campaigncueFirebaseAdmin, 'campaigncue_admin_file_credential_load_failed', 'CampaignCue Firebase Admin must code file credential diagnostics.');
assertIncludes(campaigncueFirebaseAdmin, 'campaigncue_admin_local_adc_initialize_failed', 'CampaignCue Firebase Admin must code local ADC diagnostics.');
assertIncludes(signaldeskFirebaseAdmin, 'signaldesk_admin_env_credential_invalid', 'SignalDesk Firebase Admin must code invalid env credential diagnostics.');
assertIncludes(signaldeskFirebaseAdmin, 'signaldesk_admin_file_credential_load_failed', 'SignalDesk Firebase Admin must code file credential diagnostics.');
assertIncludes(signaldeskFirebaseAdmin, 'signaldesk_admin_local_adc_initialize_failed', 'SignalDesk Firebase Admin must code local ADC diagnostics.');
[
    ['Firebase client bootstrap', firebaseClient],
    ['App Check bootstrap', appCheck],
    ['Firebase Auth sync hook', firebaseAuthSyncHook],
    ['Session provider auth bootstrap', sessionProvider],
].forEach(([label, source]) => {
    assertIncludes(source, 'logFirebaseBootstrapFailure', `${label} must use bounded Firebase bootstrap diagnostics.`);
    assert(!/\bconsole\.(?:error|warn|log|info|debug|trace)\s*\(/.test(source), `${label} must not direct-console bootstrap diagnostics.`);
});
assert(!/\bconsole\.(?:error|warn|log|info|debug|trace)\s*\(/.test(firebaseAuthSyncHelper), 'Firebase Auth sync helper must not direct-console bootstrap diagnostics.');
assertIncludes(firebaseClient, 'initAppCheck(firebaseApp)', 'Firebase client must initialize App Check with the explicit initialized app.');
assertIncludes(firebaseClient, 'app_check_module_load_failed', 'Firebase client must securely log App Check module load failures.');
assertIncludes(firebaseClient, 'firebase_functions_emulator_connect_failed', 'Firebase client must securely log emulator connection failures.');
assertIncludes(appCheck, 'app_check_site_key_missing', 'App Check must securely log missing site-key configuration.');
assertIncludes(appCheck, 'app_check_initialize_failed', 'App Check must securely log initialization failures.');
assertIncludes(appCheck, 'app_check_custom_provider_failed', 'App Check custom provider must securely log initialization failures.');
assert(!appCheck.includes('APP_CHECK_BADGE'), 'App Check must not keep console styling constants.');
assert(!appCheck.includes('window.location.hostname}. This is expected'), 'App Check must not log raw hostnames on local skip.');
assert(!firebaseAuthSyncHook.includes('maskDebugEmail'), 'Firebase Auth sync hook must not log masked emails.');
assert(!firebaseAuthSyncHook.includes('firebaseAuth.currentUser?.email'), 'Firebase Auth sync hook must not inspect current user email for diagnostics.');
assertIncludes(firebaseAuthSyncHook, "setError(new Error('Firebase Auth sync failed'))", 'Firebase Auth sync hook must keep owner-visible sync errors generic.');
assertIncludes(firebaseAuthSyncHelper, 'createFirebaseBootstrapError', 'Firebase Auth sync helper must throw coded generic bootstrap errors.');
assertIncludes(firebaseAuthSyncHelper, 'firebase_auth_sync_http_failed', 'Firebase Auth sync helper must code set-claims HTTP failures.');
assertIncludes(firebaseAuthSyncHelper, 'firebase_auth_claims_refresh_http_failed', 'Firebase Auth sync helper must code claims refresh HTTP failures.');
assertIncludes(firebaseAuthSyncHelper, 'AUTH_BROWSER_REQUEST_POLICY', 'Firebase Auth sync helper must use the shared browser auth request policy.');
assert((firebaseAuthSyncHelper.match(/AUTH_BROWSER_REQUEST_POLICY/g) || []).length >= 3, 'Firebase Auth sync helper must apply the shared policy to sync and refresh set-claims calls.');
assertIncludes(firebaseAuthSyncHelper, 'statusCode: response.status', 'Firebase Auth sync helper must preserve status as numeric diagnostic context.');
assertIncludes(firebaseAuthSyncHelper, 'readJsonResponseWithLimit<unknown>', 'Firebase Auth sync helper must parse set-claims responses through a bounded reader.');
assertIncludes(firebaseAuthSyncHelper, 'FIREBASE_AUTH_SYNC_RESPONSE_JSON_MAX_BYTES', 'Firebase Auth sync helper must cap set-claims response parsing.');
assertIncludes(firebaseAuthSyncHelper, 'firebase_auth_sync_response_parse_failed', 'Firebase Auth sync helper must code malformed set-claims responses.');
assertIncludes(firebaseAuthSyncHelper, 'firebase_auth_sync_response_invalid', 'Firebase Auth sync helper must code invalid set-claims response shapes.');
assertIncludes(firebaseAuthSyncHelper, 'getOptionalCustomToken', 'Firebase Auth sync helper must type-check returned custom tokens before use.');
assert(!firebaseAuthSyncHelper.includes('Failed to sync Firebase Auth:'), 'Firebase Auth sync helper must not expose raw sync status text.');
assert(!firebaseAuthSyncHelper.includes('Failed to refresh Firebase Auth claims:'), 'Firebase Auth sync helper must not expose raw refresh status text.');
assert(!firebaseAuthSyncHelper.includes('Firebase Auth network retry'), 'Firebase Auth sync helper must not direct-console transient retry details.');
assert(!firebaseAuthSyncHelper.includes('Firebase Auth token check failed'), 'Firebase Auth sync helper must not direct-console token-check fallback details.');
assert(!firebaseAuthSyncHelper.includes('const data = await response.json()'), 'Firebase Auth sync helper must not parse unbounded set-claims responses.');
assertIncludes(sessionProvider, 'firebase_auth_session_provider_sync_failed', 'Session provider must securely log Firebase Auth bootstrap failures.');
assertIncludes(sessionProvider, 'session_provider_store_bootstrap_failed', 'Session provider must code store bootstrap failures.');
assertIncludes(sessionProvider, 'session_provider_master_outlet_policy_load_failed', 'Session provider must code master outlet policy failures.');
assertIncludes(sessionProvider, "getBoundedFirebaseStringContext('masterStoreId'", 'Session provider must bound master store diagnostics.');
assert(!sessionProvider.includes("logger.error('[MenuList] Firebase Auth sync failed before store bootstrap'"), 'Session provider must not logger.error raw auth sync failures.');
assert(!sessionProvider.includes("logger.error('[MenuList] Store bootstrap failed'"), 'Session provider must not logger.error raw store bootstrap failures.');
assert(!sessionProvider.includes("logger.error('[MenuList] Master outlet policy load failed'"), 'Session provider must not logger.error raw master outlet policy failures.');
assert(!sessionProvider.includes('import { clearUserContext, logger, setUserContext }'), 'Session provider must not import raw logger diagnostics.');
assert(!sessionProvider.includes('[MenuList session debug]'), 'Session provider must not direct-console session debug payloads.');
assertIncludes(
    authDiagnostics,
    "import { secureError, secureLog } from '@lib/security/secureLogger';",
    'Auth diagnostics must use secure logging.',
);
assertIncludes(
    authDiagnostics,
    'getBoundedAuthStringContext',
    'Auth diagnostics must expose bounded string context.',
);
assertIncludes(
    authDiagnostics,
    'getAuthSessionLogContext',
    'Auth diagnostics must expose bounded session context.',
);
assertIncludes(
    authDiagnostics,
    'sourceErrorName: getAuthErrorName(error)',
    'Auth diagnostics must log source error names only.',
);
assertIncludes(
    authDiagnostics,
    'sourceErrorCode: getAuthErrorCode(error)',
    'Auth diagnostics must log bounded source error codes only.',
);
assertIncludes(
    authDiagnostics,
    'sourceStatusCode: getAuthErrorStatus(error)',
    'Auth diagnostics must log numeric source status only.',
);
assertNoDirectConsole(authDiagnostics, 'Auth diagnostics must not direct-console failures.');
[
    'auth_state_changed',
    'auth_signed_out',
    'logAuthDiagnostic',
    "getBoundedAuthStringContext('userId'",
    "getBoundedAuthStringContext('email'",
    'developmentOnly: true',
].forEach((token) => {
    assertIncludes(useAuthHook, token, `useAuth must include bounded auth-state diagnostic token ${token}.`);
});
assert(!useAuthHook.includes('import { logger }'), 'useAuth must not import raw logger diagnostics.');
assert(!useAuthHook.includes("logger.debug('User authentication state changed'"), 'useAuth must not raw-log auth-state changes.');
assert(!useAuthHook.includes("logger.debug('User signed out'"), 'useAuth must not raw-log sign-outs.');
assert(!useAuthHook.includes('userId: user.uid'), 'useAuth auth-state diagnostics must not log raw Firebase user IDs.');
assert(!useAuthHook.includes('email: user.email'), 'useAuth auth-state diagnostics must not log raw Firebase emails.');
[
    ['Auth index', authIndex],
    ['Auth client sign-out helper', authClient],
    ['Active session helper', getActiveSessionHelper],
    ['Profile action sign-out caller', profileActionsModal],
].forEach(([label, source]) => {
    assertNoDirectConsoleAny(source, `${label} must not direct-console auth/session diagnostics.`);
});
assertIncludes(authIndex, 'google_oauth_credentials_missing', 'Auth index must securely log missing Google OAuth configuration.');
assert(!authIndex.includes('Google OAuth credentials not configured - Google login will be disabled'), 'Auth index must not keep raw Google OAuth console warning text.');
[
    'oauth_email_validation_failed',
    'oauth_invalid_email_login_log_failed',
    'oauth_user_created',
    'oauth_new_user_signup_log_failed',
    'oauth_user_create_failed',
    'oauth_user_creation_failure_log_failed',
    'oauth_success_log_failed',
    'oauth_failure_log_failed',
    'auth_session_dangerous_db_user_key_blocked',
    'auth_signout_failed',
    'auth_entity_block_context_fetch_failed',
    'auth_user_context_fetched',
].forEach((failureCode) => {
    assertIncludes(authIndex, failureCode, `Auth index must include bounded diagnostic ${failureCode}.`);
});
assertIncludes(authIndex, 'getAuthEmailLogContext', 'Auth index must use bounded email diagnostics.');
assertIncludes(authIndex, "getBoundedAuthStringContext('entityId', id)", 'Auth entity-block fetch must bound entity IDs.');
assertIncludes(authIndex, "{ developmentOnly: true }", 'Auth fetched-user diagnostics must be development-only.');
assert(!authIndex.includes('maskDebugEmail'), 'Auth index must not keep masked email debug logging.');
assert(!authIndex.includes('[MenuList auth fetched user]'), 'Auth index must not keep raw fetched-user debug logging.');
assert(!authIndex.includes("secureLog('[Auth]"), 'Auth index must not log raw auth context through secureLog.');
assert(!authIndex.includes("secureError('[Auth]"), 'Auth index must not pass raw auth context to secureError.');
[
    "[Auth] Email validation failed",
    "[Auth] New OAuth user created",
    "[Auth] Failed to log invalid email",
    "[Auth] Failed to log new user signup",
    "[Auth] Failed to create new user",
    "[Auth] Failed to log user creation failure",
    "[Auth] Failed to log OAuth success",
    "[Auth] Failed to log OAuth failure",
    "[Auth] Blocked dangerous key in dbUser",
    "[Auth] Signout error",
    "[Auth] Failed to fetch entity block context",
].forEach((rawAuthLog) => {
    assert(!authIndex.includes(rawAuthLog), `Auth index must not keep raw auth diagnostic string ${rawAuthLog}.`);
});
[
    'answerlattice_firebase_admin_missing_for_auth_sync',
    'answerlattice_user_lookup_failed_for_auth_sync',
    'set_claims_invalid_or_oversized_body',
    'set_claims_invalid_input',
    'set_claims_inactive_answerlattice_auth_profile_rejected',
    'set_claims_store_switch_outside_user_stores_rejected',
    'answerlattice_firebase_custom_token_sync_failed',
    'set_claims_uid_email_mismatch_rejected',
    'set_claims_existing_firebase_user_synced',
    'firebase_user_lookup_failed_during_auth_sync',
    'firebase_auth_user_created_for_oauth_login',
    'set_claims_oauth_custom_token_created',
    'set_claims_failed',
].forEach((diagnosticCode) => {
    assertIncludes(setClaimsRoute, diagnosticCode, `Set-claims route must include bounded diagnostic ${diagnosticCode}.`);
});
assertIncludes(setClaimsRoute, 'getSetClaimsLogContext', 'Set-claims route must centralize bounded claim diagnostics.');
assert(!setClaimsRoute.includes('secureLog('), 'Set-claims route must not log raw auth context through secureLog.');
assert(!setClaimsRoute.includes('secureError('), 'Set-claims route must not pass raw auth context to secureError.');
[
    '[Auth] Rejected inactive Answerlattice auth profile',
    '[Auth] Rejected set-claims store switch outside user stores',
    '[Auth] Answerlattice Firebase custom-token sync failed',
    '[Auth] Rejected set-claims UID/email mismatch',
    '[Auth] Custom claims set for existing Firebase user',
    '[Auth] Firebase user lookup failed during auth sync',
    '[Auth] Created Firebase Auth user for OAuth login',
    '[Auth] Custom token created for OAuth user',
].forEach((rawAuthLog) => {
    assert(!setClaimsRoute.includes(rawAuthLog), `Set-claims route must not keep raw auth diagnostic string ${rawAuthLog}.`);
});
assertIncludes(authClient, 'nextauth_signout_failed', 'Auth client must securely log NextAuth sign-out failures.');
assertIncludes(authClient, 'firebase_signout_failed', 'Auth client must securely log Firebase sign-out failures.');
assertIncludes(authClient, 'getBoundedAuthStringContext', 'Auth client must bound sign-out callback URL context.');
assertIncludes(authBrowserRequestPolicy, "cache: 'no-store'", 'Shared browser auth request policy must bypass browser cache.');
assertIncludes(authBrowserRequestPolicy, "credentials: 'same-origin'", 'Shared browser auth request policy must keep credentials same-origin.');
assertIncludes(authBrowserRequestPolicy, "redirect: 'manual'", 'Shared browser auth request policy must not follow auth redirects to HTML.');
assertIncludes(getActiveSessionHelper, 'auth_session_fetch_failed', 'Active session helper must securely log failed client session fetches.');
assertIncludes(getActiveSessionHelper, 'AUTH_BROWSER_REQUEST_POLICY', 'Active session helper must use the shared browser auth request policy.');
assertIncludes(getActiveSessionHelper, 'createAuthDiagnosticError', 'Active session helper must create generic status-coded session fetch errors.');
assertIncludes(getActiveSessionHelper, 'readJsonResponseWithLimit<unknown>', 'Active session helper must parse client session JSON through a bounded reader.');
assertIncludes(getActiveSessionHelper, 'AUTH_SESSION_RESPONSE_JSON_MAX_BYTES', 'Active session helper must cap client session response parsing.');
assertIncludes(getActiveSessionHelper, 'auth_session_response_parse_failed', 'Active session helper must code malformed client session response parsing.');
assertIncludes(getActiveSessionHelper, 'auth_session_response_invalid', 'Active session helper must code invalid client session response shapes.');
assertIncludes(getActiveSessionHelper, 'getAuthSessionLogContext(effectiveSession)', 'Active session helper must log bounded session context on success diagnostics.');
assert(!getActiveSessionHelper.includes('response.json().catch(() => null)'), 'Active session helper must not silently swallow client session response parse failures.');
assert(!getActiveSessionHelper.includes('sId: effectiveSession'), 'Active session helper must not log raw store IDs.');
assert(!getActiveSessionHelper.includes('tId: effectiveSession'), 'Active session helper must not log raw tenant IDs.');
[
    [firebaseAuthSyncHelper, 'Firebase auth sync helper', ['/api/auth/set-claims']],
    [loginPage, 'Login page auth handoff', ['/api/auth/validate-claim', '/api/auth/set-claims', '/api/auth/claim-account']],
    [phoneOtpPanel, 'Phone OTP auth panel', ['/api/auth/phone-otp/start', '/api/auth/phone-otp/verify']],
    [sessionExpiryMonitor, 'Session expiry monitor', ['/api/auth/access-status']],
].forEach(([source, label, endpoints]) => {
    endpoints.forEach((endpoint) => {
        assertIncludes(source, endpoint, `${label} must keep auth endpoint ${endpoint}.`);
    });
    assertIncludes(source, 'AUTH_BROWSER_REQUEST_POLICY', `${label} must use the shared browser auth request policy.`);
});
assertMenuListBrowserSurfacesUseAllowedFirebaseAuthDirectMethods();
assertBrowserFirebaseAuthBoundaryDocs();
assertIncludes(internalUserApi, 'internal_user_login_failed', 'Internal user API helper must code login failures.');
assertIncludes(internalUserApi, 'internal_user_token_lookup_failed', 'Internal user API helper must code token lookup failures.');
assertIncludes(internalUserApi, 'logAuthFailure', 'Internal user API helper must use bounded auth diagnostics.');
assertNoDirectConsole(internalUserApi, 'Internal user API helper must not direct-console auth failures.');
assert(!internalUserApi.includes('NEXT_PUBLIC_UPDATE_ADDRESS'), 'Internal user API helper must not keep stale commented URL diagnostics.');
[
    'mobile_more_store_switch_failed',
    'mobile_more_store_switch_rejected',
    'mobile_account_profile_update_failed',
    'mobile_account_profile_update_rejected',
    'mobile_account_password_change_failed',
    'mobile_account_password_change_rejected',
].forEach((failureCode) => {
    assertIncludes(mobileMoreScreen, failureCode, `Mobile More auth flow must include ${failureCode}.`);
});
assertIncludes(mobileMoreScreen, 'logAuthFailure', 'Mobile More auth flows must use bounded auth diagnostics.');
assertIncludes(mobileMoreScreen, 'getBoundedAuthStringContext', 'Mobile More auth flows must use bounded auth context.');
assertIncludes(mobileMoreScreen, 'AUTH_ACCOUNT_REQUEST_POLICY', 'Mobile More store switching must use the shared auth account request policy.');
assert(!mobileMoreScreen.includes('throw new Error(data.error'), 'Mobile More auth flows must not throw raw API response text.');
assert(!mobileMoreScreen.includes('error?.message'), 'Mobile More auth flows must not show raw exception text.');
assert(!mobileMoreScreen.includes('Toast.show({ content: error'), 'Mobile More auth flows must not toast raw exception values.');
assert(!mobileMoreScreen.includes("logger.error('[MobileMore] Store switch failed'"), 'Mobile More store switching must not raw-log failures.');
[
    'header_store_switch_failed',
    'header_store_switch_rejected',
    'getHeaderStoreSwitchLogContext',
    'logAuthFailure(HEADER_STORE_SWITCH_FAILED',
    "getBoundedAuthStringContext('targetStoreId'",
    "getBoundedAuthStringContext('loginStoreId'",
    "getBoundedAuthStringContext('tenantId'",
    "getBoundedAuthStringContext('userId'",
].forEach((token) => {
    assertIncludes(storeSwitcher, token, `Header StoreSwitcher must include bounded store-switch diagnostic token ${token}.`);
});
assertIncludes(storeSwitcher, 'AUTH_ACCOUNT_REQUEST_POLICY', 'Header StoreSwitcher must use the shared auth account request policy.');
assert(!storeSwitcher.includes('throw new Error(data.error'), 'Header StoreSwitcher must not throw raw switch-store response text.');
assert(!storeSwitcher.includes("logger.error('[StoreSwitcher] Switch failed'"), 'Header StoreSwitcher must not raw-log switch failures.');
assert(!storeSwitcher.includes('import { logger }'), 'Header StoreSwitcher must not import raw logger diagnostics.');
[
    'desktop_account_profile_update_failed',
    'desktop_account_profile_update_rejected',
    'desktop_account_password_change_failed',
    'desktop_account_password_change_rejected',
].forEach((failureCode) => {
    assertIncludes(userProfileModal, failureCode, `Desktop profile modal must include ${failureCode}.`);
});
assertIncludes(userProfileModal, 'logAuthFailure', 'Desktop profile modal must use bounded auth diagnostics.');
assertIncludes(userProfileModal, 'getBoundedAuthStringContext', 'Desktop profile modal must use bounded auth context.');
assertIncludes(userProfileModal, 'hasCurrentPassword: Boolean(values?.currentPassword)', 'Desktop profile modal must log password presence only.');
assertIncludes(userProfileModal, 'hasNewPassword: Boolean(values?.newPassword)', 'Desktop profile modal must log password presence only.');
assert(!userProfileModal.includes('dispatch(showErrorToast(data.error'), 'Desktop profile modal must not show raw API response text.');
assert(!userProfileModal.includes('error?.message'), 'Desktop profile modal must not show raw exception text.');
assert(!userProfileModal.includes('passwordLength'), 'Desktop profile modal must not log password length.');
assertIncludes(addSupportTicket, 'support_ticket_submit_failed', 'Support ticket submit must code failed submissions.');
assertIncludes(addSupportTicket, 'logSupportTicketFailure', 'Support ticket submit must use bounded diagnostics.');
assertIncludes(addSupportTicket, 'getBoundedSupportTicketStringContext', 'Support ticket submit must use bounded context.');
assert(!addSupportTicket.includes('Submission failed: ${error.message}'), 'Support ticket submit must not show raw exception text.');
assert(!addSupportTicket.includes('error?.message'), 'Support ticket submit must not show raw exception text.');
assertIncludes(supportTicketDiagnostics, "secureError('[Support Ticket] Operation failed'", 'Support ticket diagnostics must use secureError.');
assertIncludes(supportTicketDiagnostics, 'getBoundedSupportTicketStringContext', 'Support ticket diagnostics must expose bounded context.');
assert(!userUtils.includes('extractUserDataFromFirebaseUser'), 'User utilities must not expose Firebase user token extraction helpers.');
assert(!userUtils.includes('stsTokenManager'), 'User utilities must not read Firebase stsTokenManager.');
assert(!userUtils.includes('refreshToken'), 'User utilities must not expose Firebase refresh tokens.');
assert(!userUtils.includes('accessToken'), 'User utilities must not expose Firebase access tokens.');
assertIncludes(
    swrLocalStorageProvider,
    "import { secureError } from '@lib/security/secureLogger';",
    'SWR localStorage cache provider must use secure logging.',
);
assertIncludes(
    swrLocalStorageProvider,
    'logSwrLocalStorageFailure',
    'SWR localStorage cache provider must centralize failure logging.',
);
assertIncludes(
    swrLocalStorageProvider,
    "'[SWR Cache] Local storage operation failed'",
    'SWR localStorage cache provider must use bounded failure text.',
);
assertIncludes(
    swrLocalStorageProvider,
    'new Error(`swr_local_storage_${failureType}`)',
    'SWR localStorage cache provider must normalize logged errors.',
);
assertIncludes(
    swrLocalStorageProvider,
    'keyPresent: Boolean(key)',
    'SWR localStorage cache provider must log key presence instead of raw keys.',
);
assertIncludes(
    swrLocalStorageProvider,
    'keyLength: key.length',
    'SWR localStorage cache provider must log key length instead of raw keys.',
);
assertIncludes(
    swrLocalStorageProvider,
    'keyPrefixPresent: Boolean(keyPrefix)',
    'SWR localStorage cache provider must log prefix presence instead of raw prefixes.',
);
assertIncludes(
    swrLocalStorageProvider,
    'keyPrefixLength: keyPrefix.length',
    'SWR localStorage cache provider must log prefix length instead of raw prefixes.',
);
assertIncludes(
    swrLocalStorageProvider,
    'hasData: Boolean(metadata.hasData)',
    'SWR localStorage cache provider must log data presence instead of cached values.',
);
assertIncludes(
    swrLocalStorageProvider,
    'errorName: metadata.error instanceof Error ? metadata.error.name : typeof metadata.error',
    'SWR localStorage cache provider must log error name instead of raw exceptions.',
);
assertIncludes(
    swrLocalStorageProvider,
    "if (process.env.NODE_ENV === 'production')",
    'SWR localStorage cache provider diagnostics must be development-only.',
);
assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(swrLocalStorageProvider), 'SWR localStorage cache provider must not direct-console cache failures.');
[
    ['client DAL composer', apiCallComposerClient],
    ['client DAL composer without loader', apiCallComposerClientWithoutLoader],
].forEach(([label, source]) => {
    assertIncludes(source, "import { secureError } from", `${label} must use secure logging.`);
    assertIncludes(source, 'if (!Boolean(session?.user))', `${label} must require an active session.`);
    assert(!source.includes('const isPublicApi = functionName'), `${label} must not treat every named DAL call as public.`);
    assertIncludes(source, "new Error('dal_client_call_failed')", `${label} must normalize logged errors.`);
    assertIncludes(source, "if (typeof arg === 'string') return { type: 'string', length: arg.length };", `${label} must log string argument length instead of raw values.`);
    assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(source), `${label} must not direct-console DAL calls.`);
});
assertIncludes(apiCallComposerClient, 'getSafeUiErrorMessage(error, fallbackMessage)', 'Client DAL composer with loader must show safe owner errors.');
assertIncludes(apiCallComposerClientWithoutLoader, 'getSafeUiErrorMessage(error, fallbackMessage)', 'Client DAL composer without loader must show safe owner errors.');
assertIncludes(uiErrorMessages, 'const MAX_SAFE_UI_ERROR_LENGTH = 160;', 'UI error helper must cap owner-visible exception messages.');
assertIncludes(uiErrorMessages, 'TECHNICAL_ERROR_SHAPE_PATTERN', 'UI error helper must reject technical-looking message shapes.');
assertIncludes(uiErrorMessages, 'rawMessage.length > MAX_SAFE_UI_ERROR_LENGTH', 'UI error helper must reject long exception messages.');
assertIncludes(uiErrorMessages, 'TECHNICAL_ERROR_PATTERNS.some', 'UI error helper must keep technical provider/runtime patterns generic.');
[
    '/firestore/i',
    '/razorpay/i',
    '/googleapis/i',
    '/https?:\\/\\//i',
    '/\\/api\\//i',
].forEach((pattern) => {
    assertIncludes(uiErrorMessages, pattern, `UI error helper must reject ${pattern} messages.`);
});
assertIncludes(dragAndDropHook, "import { getSafeUiErrorMessage } from '@lib/errors/uiErrorMessages';", 'Drag-and-drop hook must sanitize custom upload validation copy.');
assertIncludes(dragAndDropHook, "getSafeUiErrorMessage(validation.error, DROP_FILE_FALLBACK_ERROR)", 'Drag-and-drop hook must not show unchecked custom validator text.');
assertIncludes(dragAndDropHook, "const DROP_FILE_TYPE_ERROR = 'File type is not allowed.';", 'Drag-and-drop hook must keep type failures generic.');
assertIncludes(dragAndDropHook, 'errors.forEach((safeError) => message.error(safeError));', 'Drag-and-drop hook must emit sanitized upload errors.');
[
    'message.error(error)',
    'Invalid file: ${file.name}',
    'File type not allowed: ${file.name}',
    'File too large: ${file.name}',
].forEach((rawPattern) => {
    assert(!dragAndDropHook.includes(rawPattern), `Drag-and-drop hook must not surface raw upload details via ${rawPattern}.`);
});
assertIncludes(apiCallComposerServer, "import { secureError } from", 'Server DAL composer must use secure logging.');
assertIncludes(apiCallComposerServer, "new Error('dal_server_call_failed')", 'Server DAL composer must normalize logged errors.');
assertIncludes(apiCallComposerServer, 'ignoredSessionFunction: isIgnoredFunctionCall', 'Server DAL composer must preserve ignored-session metadata.');
assertIncludes(apiCallComposerServer, "if (typeof arg === 'string') return { type: 'string', length: arg.length };", 'Server DAL composer must log string argument length instead of raw values.');
assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(apiCallComposerServer), 'Server DAL composer must not direct-console DAL calls.');
assertIncludes(
    publicApi,
    "import { secureError } from '@lib/security/secureLogger';",
    'Public API helper must use secure logging for infrastructure failures.',
);
assertIncludes(
    publicApi,
    "'[Public API] Rate limit check failed, allowing request'",
    'Public API helper must securely log rate-limit infrastructure failures.',
);
assert(!publicApi.includes('console.error'), 'Public API helper must not direct-console infrastructure failures.');
assertIncludes(
    publicApi,
    "reason: 'missing_token'",
    'Turnstile middleware must reject missing tokens when the secret is configured.',
);
assertIncludes(
    publicApi,
    "import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';",
    'Turnstile middleware must use the bounded response parser.',
);
assertIncludes(
    publicApi,
    'const TURNSTILE_RESPONSE_JSON_MAX_BYTES = 8 * 1024;',
    'Turnstile middleware must cap provider response JSON.',
);
assertIncludes(
    publicApi,
    'readJsonResponseWithLimit<TurnstileVerificationResponse>',
    'Turnstile middleware must parse provider responses through the bounded reader.',
);
assertIncludes(
    publicApi,
    'public_turnstile_response_parse_failed',
    'Turnstile middleware must log malformed provider responses with a stable code.',
);
assertIncludes(
    publicApi,
    'public_turnstile_http_rejected',
    'Turnstile middleware must log provider HTTP rejection with a stable code.',
);
assertIncludes(
    publicApi,
    'public_turnstile_verification_failed',
    'Turnstile middleware must log provider request failures with a stable code.',
);
assert(!publicApi.includes('response.json().catch(() => ({} as any))'), 'Turnstile middleware must not silently swallow provider response parse failures.');
assertIncludes(contactRoute, 'verifyTurnstileToken(body.captchaToken, request)', 'Answerlattice contact route must verify captchaToken.');
assertIncludes(feedbackRoute, 'verifyTurnstileToken(data.captchaToken, req)', 'Guest feedback route must verify captchaToken.');
assertIncludes(feedbackRoute, 'readBoundedJsonBody(req, PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES', 'Guest feedback route must use bounded JSON body parsing.');
assert(!feedbackRoute.includes('req.json()'), 'Guest feedback route must not parse unbounded JSON.');
assertIncludes(contactForm, 'captchaToken: captchaToken || undefined', 'Answerlattice contact form must submit captchaToken.');
assertIncludes(contactForm, 'ANSWERLATTICE_CONTACT_FAILED_MESSAGE', 'Answerlattice contact form must use fixed submit failure copy.');
assertIncludes(contactForm, 'ANSWERLATTICE_SECURITY_CHECK_REQUIRED_MESSAGE', 'Answerlattice contact form must use fixed captcha failure copy.');
assert(!contactForm.includes('throw new Error(result?.error'), 'Answerlattice contact form must not throw raw API response text.');
assert(!contactForm.includes('submitError instanceof Error ? submitError.message'), 'Answerlattice contact form must not show raw exception messages.');
assertIncludes(answerlatticeOnboardingForm, 'ANSWERLATTICE_ONBOARDING_FAILED_MESSAGE', 'Answerlattice onboarding form must use fixed workspace failure copy.');
assert(!answerlatticeOnboardingForm.includes('throw new Error(data.error'), 'Answerlattice onboarding form must not throw raw onboard API response text.');
assert(!answerlatticeOnboardingForm.includes('setError(err.message'), 'Answerlattice onboarding form must not show raw exception messages.');
assertIncludes(feedbackForm, 'captchaToken: captchaToken || undefined', 'Guest feedback form must submit captchaToken.');
assertIncludes(feedbackForm, 'GUEST_FEEDBACK_SUBMIT_FAILED_MESSAGE', 'Guest feedback form must use fixed submit failure copy.');
assert(!feedbackForm.includes('validationMessage || data.error'), 'Guest feedback form must not show raw feedback API response text.');
assertIncludes(loginPage, 'CLAIM_ACCOUNT_SETUP_FAILED_MESSAGE', 'Login claim setup must use fixed failure copy.');
assertIncludes(loginPage, 'LOGIN_FAILED_MESSAGE', 'Login credentials failure must use fixed failure copy.');
assertIncludes(loginPage, 'getLoginPageErrorMessage', 'Login page must render only allowlisted local error copy.');
assertIncludes(loginPage, 'displayErrorMessage', 'Login page must render sanitized local error copy.');
assertIncludes(loginPage, 'readJsonResponseWithLimit<unknown>', 'Login page must parse auth responses through a bounded reader.');
assertIncludes(loginPage, 'LOGIN_PAGE_RESPONSE_JSON_MAX_BYTES', 'Login page must cap auth response parsing.');
assertIncludes(loginPage, 'AUTH_BROWSER_REQUEST_POLICY', 'Login page auth requests must use the shared browser auth request policy.');
[
    '/api/auth/set-claims',
    '/api/auth/claim-account',
    '/api/auth/validate-claim?token=',
].forEach((authEndpoint) => {
    assertIncludes(loginPage, authEndpoint, `Login page must keep ${authEndpoint} request coverage.`);
});
assert((loginPage.match(/AUTH_BROWSER_REQUEST_POLICY/g) || []).length >= 8, 'Login page must apply the shared policy to validate-claim, claim-account, and set-claims calls.');
assertIncludes(loginPage, 'login_page_response_parse_failed', 'Login page must code malformed auth response parsing.');
assertIncludes(loginPage, 'login_page_response_invalid', 'Login page must code invalid auth response shapes.');
assertIncludes(loginPage, 'getOptionalResponseString', 'Login page must type-check returned auth response strings before use.');
assertIncludes(loginPage, 'isSuccessfulClaimValidationResponse', 'Login page must require a shaped validate-claim preview acknowledgement before claim setup UI.');
assertIncludes(loginPage, 'logClaimValidationResponseInvalid', 'Login page must log invalid validate-claim preview acknowledgements without raw token values.');
assertIncludes(loginPage, "value.preview === 'claim-token'", 'Login validate-claim acknowledgement must include the claim-token preview marker.');
assertIncludes(loginPage, "value.status === 'valid'", 'Login validate-claim acknowledgement must include valid token status.');
assertIncludes(loginPage, '&& isNonEmptyString(value.businessName)', 'Login validate-claim acknowledgement must include a non-empty business preview name.');
assertIncludes(loginPage, 'getOptionalMaskedClaimPhone', 'Login claim preview must only display masked phone values.');
assertIncludes(loginPage, 'isSuccessfulClaimAccountResponse', 'Login page must require a shaped claim-account acknowledgement before local success state.');
assertIncludes(loginPage, 'login_page_claim_account_response_invalid', 'Login page must code invalid claim-account acknowledgement diagnostics.');
assertIncludes(loginPage, 'login_page_validate_claim_response_invalid', 'Login page must code invalid validate-claim acknowledgement diagnostics.');
assertIncludes(loginPage, "isSuccessfulClaimAccountResponse(claimData, 'google')", 'Login Google claim linking must require the google claim-account mode.');
assertIncludes(loginPage, "isSuccessfulClaimAccountResponse(data, 'email-password')", 'Login email claim setup must require the email-password claim-account mode.');
assertIncludes(loginPage, "isSuccessfulClaimAccountResponse(data, 'whatsapp-phone')", 'Login phone claim setup must require the whatsapp-phone claim-account mode.');
assertIncludes(loginPage, '&& isClaimIdentityValue(value.tenantId)', 'Login claim-account acknowledgement must include tenant identity.');
assertIncludes(loginPage, '&& isClaimIdentityValue(value.storeId)', 'Login claim-account acknowledgement must include store identity.');
assertIncludes(validateClaim, 'status: "valid"', 'Validate-claim route must return explicit valid status for accepted preview tokens.');
assertIncludes(validateClaim, 'preview: "claim-token"', 'Validate-claim route must return explicit claim-token preview acknowledgement.');
assert(!loginPage.includes('showErrorToast(data.error'), 'Login claim setup must not show raw claim-account API response text.');
assert(!loginPage.includes('showErrorToast(response.error'), 'Login page must not show raw NextAuth response errors.');
assert(!loginPage.includes('.then(res => res.json())'), 'Login page must not parse validate-claim responses through unbounded promise JSON.');
assert(!loginPage.includes('setClaimsResponse.json()'), 'Login page must not parse unbounded set-claims responses.');
assert(!loginPage.includes('claimRes.json()'), 'Login page must not parse unbounded claim-account responses.');
assert(!loginPage.includes('response.ok && data?.valid === true'), 'Login claim preview must not accept valid=true without the preview acknowledgement.');
assert(!loginPage.includes('claimData?.success === true'), 'Login Google claim linking must not accept success without mode and identity acknowledgement.');
assert(!loginPage.includes('res.ok && data?.success === true'), 'Login claim setup must not accept success without mode and identity acknowledgement.');
assert(!loginPage.includes('{error.message && <div'), 'Login page must not render raw error.message state.');
assert(!loginPage.includes('{error.message}'), 'Login page must not render raw error.message text.');
assertIncludes(forgotPassword, 'getForgotPasswordErrorMessage', 'Forgot-password page must render only allowlisted local error copy.');
assertIncludes(forgotPassword, 'displayErrorMessage', 'Forgot-password page must render sanitized local error copy.');
assert(!forgotPassword.includes('{error.message ? <div'), 'Forgot-password page must not render raw error.message state.');
assert(!forgotPassword.includes('{error.message}</div>'), 'Forgot-password page must not render raw error.message text.');
assertIncludes(phoneOtpPanel, 'PHONE_OTP_SEND_FAILED_MESSAGE', 'Phone OTP start must use fixed failure copy.');
assertIncludes(phoneOtpPanel, 'PHONE_OTP_VERIFY_FAILED_MESSAGE', 'Phone OTP verify must use fixed failure copy.');
assertIncludes(phoneOtpPanel, 'getPhoneOtpVerifyErrorMessage', 'Phone OTP panel must allowlist verify failure copy.');
assertIncludes(phoneOtpPanel, 'AUTH_BROWSER_REQUEST_POLICY', 'Phone OTP panel must use the shared browser auth request policy.');
assert((phoneOtpPanel.match(/AUTH_BROWSER_REQUEST_POLICY/g) || []).length >= 3, 'Phone OTP panel must apply the shared policy to start and verify calls.');
assertIncludes(phoneOtpPanel, 'readJsonResponseWithLimit<T>', 'Phone OTP panel must parse start/verify responses through a bounded reader.');
assertIncludes(phoneOtpPanel, 'PHONE_OTP_RESPONSE_JSON_MAX_BYTES', 'Phone OTP panel must cap start/verify response parsing.');
assertIncludes(phoneOtpPanel, 'phone_otp_response_parse_failed', 'Phone OTP panel must code malformed start/verify response parsing.');
assertIncludes(phoneOtpPanel, 'phone_otp_response_invalid', 'Phone OTP panel must code invalid start/verify response shapes.');
assertIncludes(phoneOtpPanel, 'isSuccessfulPhoneOtpStartResponse(data, purpose)', 'Phone OTP start must require action, purpose, and challenge acknowledgement.');
assertIncludes(phoneOtpPanel, 'isSuccessfulPhoneOtpVerifyResponse(data, challengeId)', 'Phone OTP verify must require action, challenge, and login-token acknowledgement.');
assertIncludes(phoneOtpPanel, "value.action === 'start'", 'Phone OTP start acknowledgement must include the start action.');
assertIncludes(phoneOtpPanel, 'value.purpose === expectedPurpose', 'Phone OTP start acknowledgement must echo the requested purpose.');
assertIncludes(phoneOtpPanel, "value.action === 'verify'", 'Phone OTP verify acknowledgement must include the verify action.');
assertIncludes(phoneOtpPanel, 'value.challengeId === expectedChallengeId', 'Phone OTP verify acknowledgement must echo the current challenge id.');
assert(!phoneOtpPanel.includes('response.json().catch(() => ({})'), 'Phone OTP panel must not silently swallow start/verify response parse failures.');
assert(!phoneOtpPanel.includes('data?.success !== true || !isNonEmptyString(data.challengeId)'), 'Phone OTP start must not accept challenge id without action and purpose acknowledgement.');
assert(!phoneOtpPanel.includes('data?.success !== true || !isNonEmptyString(data.loginToken)'), 'Phone OTP verify must not accept login token without action and challenge acknowledgement.');
assert(!phoneOtpPanel.includes('throw new Error(data.error'), 'Phone OTP panel must not throw raw phone API response text.');
assert(!phoneOtpPanel.includes('setError(requestError instanceof Error ? requestError.message'), 'Phone OTP panel must not show raw start exception text.');
assert(!phoneOtpPanel.includes('setError(verifyError instanceof Error ? verifyError.message'), 'Phone OTP panel must not show raw verify exception text.');
assertIncludes(sessionExpiryMonitor, 'readJsonResponseWithLimit<AccessStatusResponse>', 'Session expiry monitor must parse access-status responses through a bounded reader.');
assertIncludes(sessionExpiryMonitor, 'ACCESS_STATUS_RESPONSE_JSON_MAX_BYTES', 'Session expiry monitor must cap access-status response parsing.');
assertIncludes(sessionExpiryMonitor, 'ACCESS_STATUS_REQUEST_POLICY', 'Session expiry monitor must use a shared access-status request policy.');
assertIncludes(sessionExpiryMonitor, '...AUTH_BROWSER_REQUEST_POLICY', 'Session expiry monitor access-status requests must inherit the shared browser auth request policy.');
assertIncludes(sessionExpiryMonitor, 'isManualRedirectResponse', 'Session expiry monitor must classify manual redirect responses before parsing.');
assertIncludes(sessionExpiryMonitor, 'auth_access_status_response_redirected', 'Session expiry monitor must code redirected access-status responses.');
assertIncludes(sessionExpiryMonitor, 'auth_access_status_response_parse_failed', 'Session expiry monitor must code malformed access-status responses.');
assertIncludes(sessionExpiryMonitor, 'auth_access_status_response_invalid', 'Session expiry monitor must code invalid access-status responses.');
assert(!sessionExpiryMonitor.includes('response.json().catch(() => ({})'), 'Session expiry monitor must not silently swallow access-status response parse failures.');
assertIncludes(turnstileWidget, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'Client Turnstile widget must use the public site key env.');
assertIncludes(stagingEnv, 'TURNSTILE_SECRET_KEY=', 'Staging env template must expose server Turnstile secret placeholder.');
assertIncludes(stagingEnv, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY=', 'Staging env template must expose client Turnstile site key placeholder.');
assertIncludes(productionEnv, 'TURNSTILE_SECRET_KEY=', 'Production env template must expose server Turnstile secret placeholder.');
assertIncludes(productionEnv, 'NEXT_PUBLIC_TURNSTILE_SITE_KEY=', 'Production env template must expose client Turnstile site key placeholder.');

assert(
    /const MAX_FAILED_ATTEMPTS\s*=\s*5/.test(authSecurity),
    'Wrong-password matrix must lock after 5 failed attempts.',
);
assertIncludes(
    authSecurity,
    'currentFailedCount + 1 >= MAX_FAILED_ATTEMPTS',
    'Wrong-password matrix must include the current failed attempt when locking.',
);
[
    'auth_security_account_lock_check_failed',
    'auth_security_failed_login_log_failed',
    'auth_security_successful_login_log_failed',
    'auth_security_summary_load_failed',
    'logAuthFailure',
    'getBoundedAuthStringContext',
].forEach((token) => {
    assertIncludes(authSecurity, token, 'Auth security helper must use bounded auth diagnostics.');
});
[
    "secureError('[Auth Security] Error checking account lock'",
    "secureError('[Auth Security] Error logging failed login'",
    "secureError('[Auth Security] Error logging successful login'",
    "secureError('[Auth Security] Error getting security summary'",
].forEach((token) => {
    assert(!authSecurity.includes(token), `Auth security helper must not keep old raw diagnostic ${token}.`);
});
assertIncludes(
    authIndex,
    "await logFailedLogin(email, 'invalid_password', 'credentials');",
    'Wrong-password matrix must log invalid_password failures.',
);
assert(
    (authIndex.match(/Invalid email\/phone or password/g) || []).length >= 2,
    'Credential failures must use a generic auth error.',
);
[
    'getAuthMiddlewareSecurityContext',
    'getBoundedSecurityRouteContext(session, request)',
    "getBoundedSecurityStringContext('endpoint', request.nextUrl.pathname)",
    "getBoundedSecurityStringContext('method', request.method)",
    'CORS Validation Failed',
    'Authentication Failed',
    'Authorization Failed - Account Access Ended',
    'Authorization Failed - Platform Role',
    'Authorization Failed - Store Role',
    'Horizontal Privilege Escalation Attempt - Tenant',
    'Horizontal Privilege Escalation Attempt - Store',
].forEach((token) => {
    assertIncludes(authMiddleware, token, `Auth middleware must include bounded security token ${token}.`);
});
[
    'buildSecurityContext',
    "ip: request.headers.get('x-forwarded-for')",
    "userAgent: request.headers.get('user-agent')",
    'userId: session.user?.id || session.uId,\n                email: session.user?.email',
    'email: session.user?.email,\n                tenantId: session.tId',
    'endpoint: request.nextUrl.pathname,\n                    error:',
].forEach((token) => {
    assert(!authMiddleware.includes(token), `Auth middleware must not keep raw security context token ${token}.`);
});

assertIncludes(
    forgotPassword,
    'If this email is connected to MenuList, a reset link has been sent.',
    'Password reset for existing/non-existing emails must use generic success wording.',
);
assert(
    !/(user not found|email not found|no user record)/i.test(forgotPassword),
    'Password reset UI must not contain user-enumerating copy.',
);

assertIncludes(
    claimAccount,
    'claimToken: null',
    'One-time claim/verification token must be cleared after successful use.',
);
assertIncludes(
    claimAccount,
    'Claim Token Not Found',
    'Duplicate one-time claim/verification link clicks must hit the generic not-found path.',
);
assertIncludes(
    claimAccount,
    'claimFailure("Unable to complete account claim.", 404)',
    'Duplicate one-time claim/verification link clicks must return a generic failure.',
);
assertIncludes(
    claimAccount,
    'auth/email-already-exists',
    'Duplicate signup matrix must handle Firebase duplicate-email failures.',
);
assertIncludes(
    claimAccount,
    'claimFailure("Unable to complete account claim.", 409)',
    'Duplicate signup matrix must return a generic conflict failure.',
);
assertIncludes(
    claimAccount,
    'const assertMessagingUserClaimIsAvailable = (',
    'Claim account must re-check claim token availability before ownership writes.',
);
assertIncludes(
    claimAccount,
    'data.claimToken !== claimToken',
    'Claim account transaction must reject stale or already consumed claim tokens.',
);
assertIncludes(
    claimAccount,
    'return db.runTransaction(async (transaction) => {',
    'Claim account must use a Firestore transaction for final claim-token consumption.',
);
assertIncludes(
    claimAccount,
    'const latestMessagingUserDoc = await transaction.get(params.messagingUserRef);',
    'Claim account transaction must re-read the messaging user doc before writes.',
);
assert((claimAccount.match(/runClaimAccountTransaction\(\{/g) || []).length >= 3, 'All claim-account modes must use the final claim transaction guard.');
assert(!claimAccount.includes('batch.update(messagingUserDoc.ref'), 'Claim account must not rely on non-transactional messaging-user ownership batches.');
assert(!claimAccount.includes('batch.update(tenantRef'), 'Claim account must not rely on non-transactional tenant ownership batches.');
assert(!claimAccount.includes('batch.update(storeRef'), 'Claim account must not rely on non-transactional store ownership batches.');
assertIncludes(
    claimAccount,
    'logAuthFailure("claim_account_unexpected_error", error, buildClaimFailureLogContext(request))',
    'Claim account unexpected failures must use bounded auth diagnostics.',
);
assertIncludes(
    claimAccount,
    'const ipHash = hashPublicRateLimitValue(ip);',
    'Claim account must hash request IP before building rate-limit provider keys.',
);
assertIncludes(
    claimAccount,
    'const rl = await checkRateLimit({ key: `auth-claim:${ipHash}`, ...getRateLimitForFeature(\'AUTH_SENSITIVE\') });',
    'Claim account must store hashed IP rate-limit keys.',
);
assertIncludes(
    claimAccount,
    'getBoundedSecurityRouteContext(null, request)',
    'Claim account unexpected failure diagnostics must bound request metadata.',
);
assertIncludes(
    claimAccount,
    'getBoundedAuthStringContext("claimToken", claimToken)',
    'Claim account missing-token diagnostics must bound claim token metadata.',
);
assert(!claimAccount.includes('logger.error("[claim-account] Error"'), 'Claim account must not raw-log unexpected failures.');
assert(!claimAccount.includes('new Error(String(error))'), 'Claim account must not stringify unexpected thrown values.');
assert(!claimAccount.includes('key: `auth-claim:${ip}`'), 'Claim account must not store raw request IP in rate-limit keys.');
assert(!claimAccount.includes('claimToken.slice'), 'Claim account must not log raw claim token prefixes.');
assert(!claimAccount.includes('buildSecurityContext'), 'Claim account must not spread raw request security context into security logs.');
assertIncludes(
    validateClaim,
    'logAuthFailure(\n      "validate_claim_unexpected_error"',
    'Validate-claim unexpected failures must use bounded auth diagnostics.',
);
assertIncludes(
    validateClaim,
    'const ipHash = hashPublicRateLimitValue(ip);',
    'Validate-claim must hash request IP before building rate-limit provider keys.',
);
assertIncludes(
    validateClaim,
    'const rl = await checkRateLimit({ key: `auth-validate:${ipHash}`, ...getRateLimitForFeature(\'AUTH_SENSITIVE\') });',
    'Validate-claim must store hashed IP rate-limit keys.',
);
assertIncludes(
    validateClaim,
    'getBoundedAuthStringContext("claimToken", token)',
    'Validate-claim diagnostics must bound claim token metadata.',
);
assertIncludes(
    validateClaim,
    'getBoundedAuthStringContext("requestIp", getRequestIp(request))',
    'Validate-claim diagnostics must bound request IP metadata.',
);
assert(!validateClaim.includes('logger.error("[validate-claim] Error"'), 'Validate-claim must not raw-log unexpected failures.');
assert(!validateClaim.includes('key: `auth-validate:${ip}`'), 'Validate-claim must not store raw request IP in rate-limit keys.');
assertIncludes(
    changePassword,
    'logAuthFailure(\n        "change_password_firebase_api_key_missing"',
    'Change-password missing Firebase API key diagnostics must use bounded auth diagnostics.',
);
assertIncludes(
    changePassword,
    'logAuthFailure(\n        "change_password_current_password_verification_failed"',
    'Change-password verification failures must use bounded auth diagnostics.',
);
assertIncludes(
    changePassword,
    'logAuthFailure(\n      "change_password_unexpected_error"',
    'Change-password unexpected failures must use bounded auth diagnostics.',
);
assertIncludes(
    changePassword,
    'getAuthSessionLogContext(session)',
    'Change-password diagnostics must bound session metadata.',
);
assertIncludes(
    changePassword,
    'logger.info("[change-password] Password changed", getChangePasswordLogContext(request, session))',
    'Change-password success breadcrumbs must use bounded auth diagnostics.',
);
assertIncludes(
    changePassword,
    'const FIREBASE_AUTH_SIGN_IN_WITH_PASSWORD_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";',
    'Change-password must keep Firebase password verification endpoint host/path fixed.',
);
assertIncludes(
    changePassword,
    'const normalizeFirebaseAuthApiKey = (value?: string) => {',
    'Change-password must normalize Firebase API keys before provider calls.',
);
assertIncludes(
    changePassword,
    'new URL(FIREBASE_AUTH_SIGN_IN_WITH_PASSWORD_URL)',
    'Change-password must construct Firebase password verification URL with URL.',
);
assertIncludes(
    changePassword,
    'endpoint.searchParams.set("key", apiKey);',
    'Change-password must encode Firebase API key with searchParams.',
);
assertIncludes(
    changePassword,
    'fetch(buildFirebasePasswordVerificationEndpoint(firebaseApiKey), {',
    'Change-password must fetch the encoded Firebase password verification endpoint.',
);
assertIncludes(
    changePassword,
    'redirect: "manual"',
    'Change-password must not follow Firebase password verification redirects.',
);
assertIncludes(
    changePassword,
    'const userRateLimitHash = hashPublicRateLimitValue(userId);',
    'Change-password must hash authenticated user ID before rate-limit key construction.',
);
assertIncludes(
    changePassword,
    'key: `auth-pwd:${userRateLimitHash}`',
    'Change-password must not store raw authenticated user IDs in rate-limit keys.',
);
assert(!changePassword.includes('logger.error("[change-password] Current password verification failed"'), 'Change-password must not raw-log verification exceptions.');
assert(!changePassword.includes('logger.error("[change-password] Error"'), 'Change-password must not raw-log unexpected exceptions.');
assertIncludes(
    changePassword,
    'getBoundedSecurityRouteContext(session, request)',
    'Change-password security logs must use bounded route security context.',
);
assert(!changePassword.includes('buildSecurityContext'), 'Change-password must not spread raw session security context into security logs.');
assert(!changePassword.includes('logger.info("[change-password] Password changed", {\n      ...buildSecurityContext(session, request)'), 'Change-password must not raw-log full security context on success.');
assert(!changePassword.includes('key: `auth-pwd:${userId || getRequestIp(request)}`'), 'Change-password must not store raw request IP fallback in rate-limit keys.');
assert(!changePassword.includes('key: `auth-pwd:${userId}`'), 'Change-password must not store raw authenticated user IDs in rate-limit keys.');
assert(!changePassword.includes('accounts:signInWithPassword?key=${firebaseApiKey}'), 'Change-password must not interpolate Firebase API keys into provider URLs.');

assertIncludes(
    switchStore,
    'logAuthFailure("switch_store_route_failed", error, getSwitchStoreLogContext(session, targetStoreIdForLog))',
    'Switch-store unexpected failures must use bounded auth diagnostics.',
);
assertIncludes(
    switchStore,
    'getBoundedAuthStringContext("targetStoreId", targetStoreId)',
    'Switch-store diagnostics must bound target store metadata.',
);
assertIncludes(
    switchStore,
    'getBoundedSecurityRouteContext(session, request)',
    'Switch-store security breadcrumbs must use bounded route security context.',
);
assert(!switchStore.includes('secureError("[SwitchStore] Failed"'), 'Switch-store must not raw-log catch failures.');
assert(!switchStore.includes('buildSecurityContext'), 'Switch-store must not spread raw session security context into security logs.');
assert(!switchStore.includes('targetStoreId,\n                tenantId,'), 'Switch-store security breadcrumb must not log raw target store and tenant IDs.');
assertIncludes(
    switchStore,
    'const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || "unknown");',
    'Switch-store must hash session user ID before rate-limit key construction.',
);
assertIncludes(
    switchStore,
    'key: `switch-store:${userRateLimitHash}`',
    'Switch-store must not store raw session user IDs in rate-limit keys.',
);
assertIncludes(
    switchStore,
    'const targetStoreSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${targetStoreId}`).get();',
    'Switch-store must read the canonical target store before success.',
);
assertIncludes(
    switchStore,
    'isPlatformEntityBlocked(targetStoreData)',
    'Switch-store must reject blocked target stores before success.',
);
assert(!switchStore.includes('key: `switch-store:${session.uId || session.user?.id}`'), 'Switch-store must not store raw session user IDs in rate-limit keys.');

[
    ['claim-account', claimAccount],
    ['change-password', changePassword],
    ['switch-store', switchStore],
    ['phone-otp/start', phoneOtpStart],
    ['phone-otp/verify', phoneOtpVerify],
].forEach(([label, source]) => {
    assertIncludes(source, 'readBoundedJsonBody', `${label} must use bounded JSON body parsing.`);
    assert(!source.includes('request.json()'), `${label} must not parse unbounded JSON.`);
});

assertIncludes(myCodexSessionRoute, 'MYCODEX_LOGIN_FORM_MAX_BODY_BYTES = 8 * 1024', 'MyCodex login must cap form submissions.');
assertIncludes(myCodexSessionRoute, 'readBoundedFormDataBody(request, MYCODEX_LOGIN_FORM_MAX_BODY_BYTES', 'MyCodex login must use bounded form-data parsing.');
assert(!myCodexSessionRoute.includes('await request.formData()'), 'MyCodex login must not parse unbounded form data.');
assertIncludes(myCodexClientContainer, 'MYCODEX_DOCUMENT_RESPONSE_JSON_MAX_BYTES = 4 * 1024 * 1024', 'MyCodex favorite document playback must cap document response JSON.');
assertIncludes(myCodexClientContainer, 'readJsonResponseWithLimit<unknown>', 'MyCodex favorite document playback must use bounded response parsing.');
assertIncludes(myCodexClientContainer, 'readMyCodexDocumentResponse', 'MyCodex favorite document playback must use a typed document response reader.');
assertIncludes(myCodexClientContainer, 'isMyCodexDocumentResponse', 'MyCodex favorite document playback must shape-check document responses.');
assertIncludes(myCodexClientContainer, 'mycodex_document_response_parse_failed', 'MyCodex favorite document playback must log parse failures with fixed diagnostics.');
assertIncludes(myCodexClientContainer, 'mycodex_document_response_invalid', 'MyCodex favorite document playback must log invalid document response shapes.');
assertIncludes(myCodexClientContainer, "getBoundedRuntimeStringContext('favoritePath', entry.path)", 'MyCodex favorite document playback must log only bounded favorite path metadata.');
assertIncludes(myCodexClientContainer, "getBoundedRuntimeStringContext('favoriteTitle', entry.title)", 'MyCodex favorite document playback must log only bounded favorite title metadata.');
assert(!myCodexClientContainer.includes('await response.json() as { markdown?: unknown }'), 'MyCodex favorite document playback must not parse unbounded JSON.');
assert(!myCodexClientContainer.includes('response.json().catch'), 'MyCodex favorite document playback must not swallow unbounded JSON parsing.');
assertOrder(
    myCodexSessionRoute,
    [
        'const requestIp = getRequestIp(request);',
        'const rateLimit = await checkRateLimit({',
        'readBoundedFormDataBody(request, MYCODEX_LOGIN_FORM_MAX_BODY_BYTES',
        'validateAPIInput(MyCodexLoginSchema',
        'validateMyCodexCredentials(username, password)',
    ],
    'MyCodex login must rate-limit and body-cap before credential validation',
);
assertOrder(
    myCodexClientContainer,
    [
        'const response = await fetch(buildUrl(`/api/document?path=${encodeURIComponent(entry.path)}`), {',
        "cache: 'no-store'",
        "credentials: 'same-origin'",
        "redirect: 'manual'",
        'const payload = await readMyCodexDocumentResponse(response, entry);',
        'if (!response.ok || !payload)',
    ],
    'MyCodex favorite document playback must use bounded same-origin no-store fetch before rendering markdown',
);

assertOrder(
    claimAccount,
    [
        'const ipHash = hashPublicRateLimitValue(ip);',
        "checkRateLimit({ key: `auth-claim:${ipHash}`",
        'readBoundedJsonBody(request, CLAIM_ACCOUNT_MAX_BODY_BYTES',
        'const { claimToken, email, password, useWhatsappPhone } = body;',
        '.where("claimToken", "==", claimToken)',
    ],
    'Claim account must rate-limit and body-cap before claim-token lookup',
);

assertOrder(
    changePassword,
    [
        'const userRateLimitHash = hashPublicRateLimitValue(userId);',
        'getRateLimitForFeature("AUTH_SENSITIVE")',
        'readBoundedJsonBody(request, CHANGE_PASSWORD_MAX_BODY_BYTES',
        'validateAPIInput(ChangePasswordSchema, body)',
        'authAdmin.getUserByEmail(email)',
    ],
    'Change password must rate-limit and body-cap before credential verification',
);

assertOrder(
    switchStore,
    [
        'verifyTenantAccess(session, tenantId, currentStoreId, request)',
        'const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || "unknown");',
        'const rateLimit = await checkRateLimit({',
        'readBoundedJsonBody(request, SWITCH_STORE_MAX_BODY_BYTES',
        'validateAPIInput(schema, body)',
        'db.doc(`${DB_COLLECTIONS.STORES}/${currentStoreId}`).get()',
    ],
    'Switch-store must throttle and body-cap before store reads',
);

assertOrder(
    phoneOtpStart,
    [
        "const sendRateConfig = getRateLimitForFeature('AUTH_PHONE_OTP_SEND');",
        'key: `auth-phone-otp-send:ip:${ipHash}`',
        'readBoundedJsonBody(request, PHONE_OTP_START_MAX_BODY_BYTES',
        'bodySchema.safeParse(rawBody)',
        'key: `auth-phone-otp-send:phone:${phoneHash}`',
        'createPhoneOtpChallenge({',
    ],
    'Phone OTP start must IP-throttle and body-cap before phone challenge creation',
);
assertIncludes(phoneOtpStart, 'getPhoneOtpStartClientError(error)', 'Phone OTP start must map custom errors to client-safe text.');
assertIncludes(phoneOtpStart, "'phone_otp_start_route_failed'", 'Phone OTP start unexpected failures must use bounded auth diagnostics.');
assertIncludes(phoneOtpStart, "getBoundedAuthStringContext('requestIp', getRequestIp(request))", 'Phone OTP start diagnostics must bound request IP metadata.');
assertIncludes(phoneOtpStart, "action: 'start'", 'Phone OTP start route must return explicit start acknowledgement.');
assertIncludes(phoneOtpStart, 'purpose: parsed.data.purpose', 'Phone OTP start route must echo the accepted purpose.');
assert(!phoneOtpStart.includes('error.message'), 'Phone OTP start must not return custom exception messages to the browser.');
assert(!phoneOtpStart.includes("secureError('[Phone OTP] Start route failed'"), 'Phone OTP start must not raw secureError unexpected failures.');

assertOrder(
    phoneOtpVerify,
    [
        "const verifyRateConfig = getRateLimitForFeature('AUTH_PHONE_OTP_VERIFY');",
        'key: `auth-phone-otp-verify:ip:${ipHash}`',
        'readBoundedJsonBody(request, PHONE_OTP_VERIFY_MAX_BODY_BYTES',
        'bodySchema.safeParse(rawBody)',
        'key: `auth-phone-otp-verify:challenge:${challengeHash}`',
        'verifyPhoneOtpChallenge({',
    ],
    'Phone OTP verify must IP-throttle and body-cap before challenge verification',
);
assertIncludes(phoneOtpVerify, "'phone_otp_verify_route_failed'", 'Phone OTP verify unexpected failures must use bounded auth diagnostics.');
assertIncludes(phoneOtpVerify, "getBoundedAuthStringContext('requestIp', getRequestIp(request))", 'Phone OTP verify diagnostics must bound request IP metadata.');
assertIncludes(phoneOtpVerify, "action: 'verify'", 'Phone OTP verify route must return explicit verify acknowledgement.');
assertIncludes(phoneOtpVerify, 'challengeId: parsed.data.challengeId', 'Phone OTP verify route must echo the verified challenge id.');
assert(!phoneOtpVerify.includes("secureError('[Phone OTP] Verify route failed'"), 'Phone OTP verify must not raw secureError unexpected failures.');
assertIncludes(phoneOtpHelper, "'phone_otp_user_not_found'", 'Phone OTP consumed-token helper must use stable user-not-found diagnostics.');
assertIncludes(phoneOtpHelper, "getBoundedAuthStringContext('userId', tokenData.userId)", 'Phone OTP consumed-token helper must bound token user metadata.');
assert(!phoneOtpHelper.includes("secureError('[Phone OTP] Consumed token did not resolve to auth user'"), 'Phone OTP helper must not raw-log consumed-token user IDs.');

if (failures.length > 0) {
    console.error('Auth/security failure matrix verification failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Auth/security failure matrix verification passed.');
