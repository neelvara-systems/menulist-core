'use strict';

const Module = require('node:module');
const path = require('node:path');

const nextPackageDirectory = path.dirname(require.resolve('next/package.json'));
const serverOnlyEmptyModule = path.join(
  nextPackageDirectory,
  'dist',
  'compiled',
  'server-only',
  'empty.js',
);
const resolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveNextServerOnly(request, parent, isMain, options) {
  if (request === 'server-only') return serverOnlyEmptyModule;
  return resolveFilename.call(this, request, parent, isMain, options);
};
