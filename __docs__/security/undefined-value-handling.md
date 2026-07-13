# Firestore Undefined Value and Write-Metadata Handling

**Last updated:** July 11, 2026
**Status:** Active global persistence contract

## Purpose

Firestore rejects `undefined`. A write boundary must either convert an
undefined value to `null` or omit the containing object field deliberately.
It must also preserve Firestore SDK value objects instead of copying them into
plain maps.

The canonical root implementation is:

- `src/lib/firestore/sanitizeForFirestore.ts`
- `src/lib/apiHelper/requestBodyComposition.ts`
- `src/lib/apiHelper/index.ts`

The isolated Functions packages mirror the value sanitizer because their
TypeScript build roots cannot import application source:

- `functions/src/lib/sanitizeForFirestore.ts`
- `functions-answerlattice/src/lib/sanitizeForFirestore.ts`

## Sanitizer Contract

`sanitizeForFirestore(value, options)` recursively copies only plain records
and arrays.

It guarantees:

1. Undefined array positions become `null`, preserving array indexes.
2. Undefined object fields become `null` by default.
3. `undefinedObjectValue: "omit"` omits undefined object fields while still
   preserving array indexes.
4. Date conversion is explicit through `dateTransform`.
5. Client-to-Admin Timestamp conversion is explicit through the discriminated
   `atomicTransform` hook.
6. Timestamp, FieldValue, DocumentReference, GeoPoint, Bytes, Date, typed
   arrays, and other non-plain value objects retain their prototype unless an
   explicit transform handles them.
7. Circular references, accessors, enumerable symbol keys, custom array
   properties, unsupported function/symbol/bigint values, and dangerous object
   keys fail closed.
8. Reused non-circular object references are valid. Only active ancestor cycles
   are rejected.

Do not implement recursive sanitization by treating every object as a plain
map. That corrupts SDK sentinels and can execute accessors.

## Client Write Composition

`requestBodyComposer` requires explicit lifecycle intent:

```ts
const created = await requestBodyComposer(input, { isNew: true });
const updated = await requestBodyComposer(patch, { isNew: false });
```

The composer:

- requires a plain object input;
- resolves product, tenant, store, actor, and role metadata;
- preserves valid numeric zero scopes;
- rejects malformed or non-canonical tenant/store scopes, including exponent,
  decimal, signed, and leading-zero string aliases;
- uses one `Timestamp` for the complete write composition;
- always writes `modifiedOn` and authoritative `modifiedBy`;
- writes `createdOn` and `createdBy` only for `isNew: true` and removes those
  immutable fields from update patches;
- never infers creation from a missing `id` or `createdOn` field;
- sanitizes the final payload through the canonical sanitizer.

Explicit lifecycle intent prevents partial merge updates from resetting
creation metadata. For true upserts, the caller must determine whether the
record exists or preserve creation metadata transactionally. Do not label an
unknown upsert as a create merely to obtain creation fields.

`replaceUndefined()` remains the public compatibility name for callers that
need value sanitization without session metadata. It delegates to the same
canonical sanitizer.

## Answerlattice Write Composition

Answerlattice client writes use:

```ts
await answerlatticeRequestBodyComposer(input, { isNew: true });
await answerlatticeRequestBodyComposer(patch, { isNew: false });
```

The wrapper fixes `pId` to `AL`, validates/minimizes source context, creates
bounded trace/request identifiers, and uses one scoped session snapshot for
source identity plus persistence metadata. Source context requires `uId`,
`name`, and `email`; source product scope is retained only for a valid
non-Answerlattice product with canonical numeric scope values.

## Server and Functions Writes

Server/Admin code should import the canonical sanitizer instead of maintaining
a local recursive copy:

```ts
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';

const payload = sanitizeForFirestore(input, {
  undefinedObjectValue: 'omit',
  dateTransform: (date) => admin.firestore.Timestamp.fromDate(date),
});
```

Functions code imports its package-local mirror. Date and Timestamp conversion
must follow the destination SDK contract. A conversion callback must return a
discriminated result:

```ts
atomicTransform: (value, path) => {
  if (!isClientTimestamp(value)) return { handled: false };
  return {
    handled: true,
    value: admin.firestore.Timestamp.fromDate(value.toDate()),
  };
}
```

Do not use constructor-name heuristics as the only SDK-value test.

## Update Semantics

Choose undefined behavior based on the write operation:

| Operation | Recommended behavior |
| --- | --- |
| Full create/replacement | Convert undefined fields to `null`, or validate them away before composition |
| Merge/update patch | Usually omit undefined object fields so unrelated stored values are not erased; composer-managed `createdOn`/`createdBy` are always omitted |
| Array payload | Convert undefined/sparse entries to `null`; never remove entries and shift indexes |
| Delete a field | Use the SDK `deleteField()`/FieldValue sentinel explicitly |

`null`, omitted, and delete-sentinel have different persistence meaning. The
sanitizer does not choose business semantics for the caller.

## Security and Reliability Rules

- Validate external input before sanitization. Sanitization is not schema
  validation or authorization.
- Enforce product/tenant/store access before every read or write.
- Never serialize through JSON to prepare Firestore data; JSON destroys SDK
  values and precision.
- Never flatten arbitrary class instances.
- Reject cycles and accessors before persistence.
- Do not log the sanitized payload when it may contain business or personal
  data.
- Keep all writes bounded. Sanitization does not make an oversized document
  safe.
- Use transactions/batches when multiple records form one invariant.

## Regression Gates

The primary adversarial gate is:

```bash
npm run test:request-body-composition-boundary
```

It covers create/update metadata, zero and malformed scopes, undefined/null
behavior, sparse arrays, Date and SDK sentinel preservation, custom class
identity, cycles, accessors, dangerous keys, functions, source-context
minimization, omit mode, date transforms, and both Functions mirrors.

Cross-feature validation also runs through:

```bash
npm run verify:async-data-flow-boundaries
npm run typecheck
npm --prefix functions run build
npm --prefix functions-answerlattice run build
```

Feature-specific verifiers remain required for affected persistence consumers.

## New Write Checklist

- [ ] Validate and authorize the input before persistence.
- [ ] Use the existing DAL and collection constants.
- [ ] Pass explicit `{ isNew: true }` or `{ isNew: false }` to a composer.
- [ ] Select null, omit, or delete semantics intentionally.
- [ ] Preserve SDK value objects and convert SDK-specific timestamps explicitly.
- [ ] Bound nested arrays, maps, strings, and document size.
- [ ] Prove tenant/store/product ownership.
- [ ] Add regression coverage for missing, undefined, null, malformed, repeated,
      and concurrent inputs as applicable.
- [ ] Run the relevant feature verifier, type checker, and package build.

## Cost

The sanitizer and composer are in-memory operations and add no Firebase reads
or writes. Callers must still document the cost and atomicity of the actual
Firestore operation.
