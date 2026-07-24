#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { createLatestRequestGuard } from '../../src/lib/runtime/latestRequestGuard';

const guard = createLatestRequestGuard();
const oldWorkspaceRequest = guard.begin();
assert.equal(guard.isCurrent(oldWorkspaceRequest), true);

const newWorkspaceRequest = guard.begin();
assert.equal(guard.isCurrent(oldWorkspaceRequest), false, 'an older workspace response must not settle');
assert.equal(guard.isCurrent(newWorkspaceRequest), true);

guard.invalidate();
assert.equal(guard.isCurrent(newWorkspaceRequest), false, 'effect cleanup must invalidate an in-flight response');

const manualRefresh = guard.begin();
assert.equal(guard.isCurrent(manualRefresh), true);

console.log('Latest-request guard tests passed');
