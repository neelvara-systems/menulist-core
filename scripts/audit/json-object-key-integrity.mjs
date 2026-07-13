function describePath(pathParts) {
  return pathParts.length ? pathParts.join('.') : '<root>';
}

export function assertNoDuplicateJsonObjectKeys(source, label = 'JSON document') {
  let index = 0;

  function fail(message) {
    throw new SyntaxError(`${label}: ${message} at character ${index}`);
  }

  function skipWhitespace() {
    while (/\s/.test(source[index] || '')) index += 1;
  }

  function parseString() {
    const start = index;
    index += 1;
    let escaped = false;
    while (index < source.length) {
      const character = source[index];
      index += 1;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === '"') {
        return JSON.parse(source.slice(start, index));
      }
    }
    fail('unterminated string');
  }

  function parseValue(pathParts) {
    skipWhitespace();
    const character = source[index];
    if (character === '{') return parseObject(pathParts);
    if (character === '[') return parseArray(pathParts);
    if (character === '"') {
      parseString();
      return;
    }
    const primitive = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(source.slice(index));
    if (!primitive) fail('invalid value');
    index += primitive[0].length;
  }

  function parseObject(pathParts) {
    index += 1;
    skipWhitespace();
    const keys = new Set();
    if (source[index] === '}') {
      index += 1;
      return;
    }
    while (index < source.length) {
      if (source[index] !== '"') fail('object key must be a string');
      const key = parseString();
      if (keys.has(key)) {
        throw new SyntaxError(`${label}: duplicate object key ${JSON.stringify(key)} at ${describePath(pathParts)}`);
      }
      keys.add(key);
      skipWhitespace();
      if (source[index] !== ':') fail('missing colon after object key');
      index += 1;
      parseValue([...pathParts, key]);
      skipWhitespace();
      if (source[index] === '}') {
        index += 1;
        return;
      }
      if (source[index] !== ',') fail('missing comma between object entries');
      index += 1;
      skipWhitespace();
    }
    fail('unterminated object');
  }

  function parseArray(pathParts) {
    index += 1;
    skipWhitespace();
    if (source[index] === ']') {
      index += 1;
      return;
    }
    let itemIndex = 0;
    while (index < source.length) {
      parseValue([...pathParts, String(itemIndex)]);
      itemIndex += 1;
      skipWhitespace();
      if (source[index] === ']') {
        index += 1;
        return;
      }
      if (source[index] !== ',') fail('missing comma between array items');
      index += 1;
      skipWhitespace();
    }
    fail('unterminated array');
  }

  if (typeof source !== 'string') throw new TypeError(`${label}: source must be a string`);
  parseValue([]);
  skipWhitespace();
  if (index !== source.length) fail('unexpected trailing content');
}
