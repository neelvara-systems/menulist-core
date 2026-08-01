import assert from 'node:assert/strict';

import antdComponentTheme from '../../src/lib/antd/componentTheme';

const components = antdComponentTheme({
    colorPrimary: '#123456',
});

assert.equal(components.Menu?.itemSelectedBg, 'unset');
assert.equal(components.Segmented?.controlHeightLG, 40);
assert.equal(components.Switch?.trackMinWidth, 48);
assert.equal(components.Splitter?.splitBarDraggableSize, 80);

console.log('Ant Design component theme contract tests passed.');
