# Answer Retrieval Quality Mobile Support

## Supported surfaces

- Embedded widget on narrow client-product viewports
- Help Chat inside the existing mobile shell
- Authenticated Help Center search
- AI Search result display where mounted on responsive layouts
- Governance editor/review through the existing responsive dashboard surface

## Behavior

- Approved source links render below the answer and open as external links.
- KB references remain visually separate from canonical sources.
- Missing plan, role, or state context renders as a compact `Context needed` notice.
- Citation titles wrap rather than changing the message width.
- Existing widget close, send, feedback, and guidance controls retain their touch behavior.

No separate mobile data path, native dependency, route bypass, or additional Firestore read was added. The final external proof must include an authenticated narrow-width Help Center/Help Chat smoke and an embedded-widget smoke with one canonical citation and one scope-clarification response.
