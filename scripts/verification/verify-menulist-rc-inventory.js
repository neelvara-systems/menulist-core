const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const inventoryPath = path.join(
  root,
  '__docs__/audits/menulist-rc-certification-inventory.csv',
);

function fail(message) {
  console.error(`MenuList RC inventory verification failed: ${message}`);
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

if (!fs.existsSync(inventoryPath)) fail('generated CSV is missing');
const parsed = parseCsv(fs.readFileSync(inventoryPath, 'utf8'));
if (parsed.length < 2) fail('generated CSV contains no inventory rows');
const headers = parsed[0];
const required = [
  'inventory_id',
  'item_type',
  'product_area',
  'route_or_component',
  'control_or_action',
  'test_result',
  'final_verification_status',
  'evidence_or_notes',
];
for (const column of required) {
  if (!headers.includes(column)) fail(`required column ${column} is missing`);
}
const objects = parsed.slice(1).map((cells) => Object.fromEntries(
  headers.map((header, index) => [header, cells[index] ?? '']),
));
const ids = new Set();
for (const row of objects) {
  if (ids.has(row.inventory_id)) fail(`duplicate inventory ID ${row.inventory_id}`);
  ids.add(row.inventory_id);
  if (!row.product_area) fail(`row ${row.inventory_id} has no product classification`);
  if (!row.final_verification_status) fail(`row ${row.inventory_id} has no status`);
}
const functionExports = objects.filter((row) => row.item_type === 'firebase-function-export');
if (functionExports.length < 20) fail(`only ${functionExports.length} Firebase Function exports were discovered`);
const signIn = objects.find((row) => row.item_type === 'page' && row.route_or_component === '/signin');
if (!signIn || signIn.product_area !== 'MenuList') fail('MenuList /signin page classification is missing');
const mixedAnswerlattice = objects.find((row) => (
  row.product_area === 'MenuList'
  && /answerlattice/i.test(`${row.route_or_component} ${row.screen_or_tab}`)
));
if (mixedAnswerlattice) fail(`Answerlattice boundary misclassified at ${mixedAnswerlattice.inventory_id}`);

console.log(`MenuList RC inventory verified: ${objects.length} rows, ${functionExports.length} Function exports.`);
