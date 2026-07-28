const Module = require('node:module');

const originalLoad = Module._load;

Module._load = function loadWithTestCacheBoundary(request, parent, isMain) {
  const loaded = originalLoad.call(this, request, parent, isMain);
  if (request !== 'next/cache') return loaded;
  return {
    ...loaded,
    revalidateTag: () => undefined,
  };
};
