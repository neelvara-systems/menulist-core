import assert from 'node:assert/strict';
import { formatSignedCurrency } from '../../src/app/sites/answerlattice/roi-calculator/AnswerlatticeRoiCalculator';

assert.equal(formatSignedCurrency(3450.4), '₹3,450');
assert.equal(formatSignedCurrency(0), '₹0');
assert.equal(
    formatSignedCurrency(-1750.4),
    '-₹1,750',
    'a plan-cost shortfall must remain visible instead of being clamped to zero',
);

console.log('Answerlattice public ROI calculator tests passed.');
