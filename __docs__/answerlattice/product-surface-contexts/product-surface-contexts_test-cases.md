# Product Surface Contexts Test Cases

## Owner Management

- Create a new product surface.
- Edit route patterns, tags, entity hints, and entities.
- Archive a surface.
- Rebuild the context summary.
- Refresh the page and confirm surfaces load.

## Content Linking

- Link a KB article to a surface.
- Link a changelog entry to a surface.
- Link a support ticket to a surface.
- Rebuild summary and verify compact related content.

## Runtime

- Search with exact `contextKey`.
- Search with matching feature/page/workflow.
- Search with partial context.
- Search without context.
- Search with invalid context fields.

## Cost

- Confirm runtime does not query broad KB/changelog/ticket collections.
- Confirm summary rebuild uses bounded queries.
- Confirm no realtime listeners are introduced.
