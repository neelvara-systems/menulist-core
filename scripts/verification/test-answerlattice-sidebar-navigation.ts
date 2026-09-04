#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    ANSWERLATTICE_CUSTOMER_LANGUAGE,
} from '../../src/constants/answerlattice/customerLanguage';
import {
    ANSWERLATTICE_FLAT_SIDEBAR_NAV,
    ANSWERLATTICE_PRIMARY_SIDEBAR_SECTIONS,
    ANSWERLATTICE_ROUTES,
    ANSWERLATTICE_GOVERNANCE_TABS,
    getAnswerlatticeGovernanceRoute,
} from '../../src/constants/answerlattice/navigations';
import { projectAnswerlatticeSidebarNavigation } from '../../src/lib/answerlattice/sidebarNavigation';

const repositoryRoot = path.resolve(__dirname, '../..');

const getAuthorizedItems = (routes: string[]) => routes.map(route => {
    const item = ANSWERLATTICE_FLAT_SIDEBAR_NAV.find(candidate => candidate.route === route);
    assert.ok(item, `Expected registered Answerlattice route ${route}`);
    return item;
});

function testGroupedProjection(): void {
    const trustedAnswers = getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS);
    const suggestedUpdates = getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE);
    const knownIssues = ANSWERLATTICE_ROUTES.KNOWN_ISSUES;
    const authorizedItems = getAuthorizedItems([
        ANSWERLATTICE_ROUTES.ACTIVATION,
        trustedAnswers,
        suggestedUpdates,
        ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT,
        ANSWERLATTICE_ROUTES.SUPPORT_BOARD,
        ANSWERLATTICE_ROUTES.TICKETS,
        knownIssues,
    ]);
    const compact = projectAnswerlatticeSidebarNavigation(
        authorizedItems,
        ANSWERLATTICE_ROUTES.ACTIVATION,
        false,
    );

    assert.deepEqual(
        compact.primarySections.map(section => section.label),
        [
            ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.getLive,
            ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.improveAnswers,
            ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.runSupport,
        ],
        'Only authorized non-empty owner sections should render, in the defined order.',
    );
    assert.deepEqual(
        compact.primarySections.flatMap(section => section.items.map(item => item.route)),
        [
            ANSWERLATTICE_ROUTES.ACTIVATION,
            trustedAnswers,
            suggestedUpdates,
            ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT,
            ANSWERLATTICE_ROUTES.SUPPORT_BOARD,
            ANSWERLATTICE_ROUTES.TICKETS,
        ],
        'Primary routes must remain direct grouped links without parent accordion duplication.',
    );
    assert.deepEqual(compact.advancedItems.map(item => item.route), [knownIssues]);
    assert.deepEqual(compact.visibleAdvancedItems, [], 'Closed All tools must hide inactive advanced routes.');
    assert.equal(
        compact.primarySections.some(section => section.items.some(item => item.route === ANSWERLATTICE_ROUTES.BILLING)),
        false,
        'Presentation metadata must not reintroduce an unauthorized primary route.',
    );

    const activeAdvanced = projectAnswerlatticeSidebarNavigation(authorizedItems, knownIssues, false);
    assert.deepEqual(
        activeAdvanced.visibleAdvancedItems.map(item => item.route),
        [knownIssues],
        'A directly opened advanced route must remain visible while All tools is closed.',
    );

    const revealed = projectAnswerlatticeSidebarNavigation(authorizedItems, knownIssues, true);
    assert.deepEqual(
        revealed.visibleAdvancedItems.map(item => item.route),
        revealed.advancedItems.map(item => item.route),
        'All tools must reveal the complete authorized advanced inventory.',
    );
}

function testSectionContractAndShellBehavior(): void {
    assert.deepEqual(
        ANSWERLATTICE_PRIMARY_SIDEBAR_SECTIONS.map(section => section.label),
        [
            'Get Live',
            'Improve answers',
            'Run Support',
            'Customer help',
            'Workspace',
        ],
        'The founder-first section sequence must stay stable across desktop and mobile.',
    );

    const sidebarSource = fs.readFileSync(
        path.join(repositoryRoot, 'src/components/answerlattice/AnswerlatticeSidebar.tsx'),
        'utf8',
    );
    const layoutSource = fs.readFileSync(
        path.join(repositoryRoot, 'src/components/answerlattice/AnswerlatticeDashboardLayout.tsx'),
        'utf8',
    );
    const headerSource = fs.readFileSync(
        path.join(repositoryRoot, 'src/components/answerlattice/AnswerlatticeHeader.tsx'),
        'utf8',
    );
    const sharedShellSource = fs.readFileSync(
        path.join(repositoryRoot, 'src/components/shared/dashboardShell/DashboardSidebarShell.tsx'),
        'utf8',
    );

    assert.doesNotMatch(sidebarSource, /expandedParents|revealedToolGroups|::all-tools/);
    assert.match(sidebarSource, /key: 'answerlattice-all-tools'/);
    assert.match(sidebarSource, /setAllToolsRevealed\(current => !current\)/);
    assert.doesNotMatch(layoutSource, /sidebarShellExpanded|onExpandedChange=/);
    assert.doesNotMatch(
        headerSource,
        /<ProfileActionsModal[\s\S]*?<Button\s+aria-label="Open profile"/,
        'The shared profile trigger button must not contain another button.',
    );
    assert.match(headerSource, /<span\s+aria-hidden="true"/);
    assert.match(
        headerSource,
        /const DESKTOP_HEADER_CONTROL_HEIGHT = 36;/,
        'Desktop header controls must use the compact visual-height contract.',
    );
    assert.match(
        headerSource,
        /aria-label="Open navigation"[\s\S]*?height: 44[\s\S]*?width: 44/,
        'The mobile navigation trigger must retain its 44px touch target.',
    );
    assert.match(
        layoutSource,
        /aria-label="Close navigation"[\s\S]*?height: 44[\s\S]*?minWidth: 44/,
        'The mobile navigation drawer must expose a visible 44px close action.',
    );
    assert.match(
        headerSource,
        /background: token\.colorFillTertiary[\s\S]*?color: token\.colorTextSecondary/,
        'The parent breadcrumb must stay visually quieter than the current destination.',
    );
    assert.doesNotMatch(
        headerSource,
        /borderInlineStartWidth: 2/,
        'Compact header separators must not overpower the navigation controls.',
    );
    assert.match(
        sharedShellSource,
        /minHeight: mobile \? 44 : undefined/,
        'Mobile sidebar destinations must retain a 44px minimum target.',
    );
}

testGroupedProjection();
testSectionContractAndShellBehavior();
process.stdout.write('Answerlattice grouped sidebar navigation tests passed.\n');
