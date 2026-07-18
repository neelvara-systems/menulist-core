# Account And Tenant Lifecycle Mobile Support

- Mobile More uses the shared `signOutSession` lifecycle.
- Logout clears the selected outlet and mobile menu processing session state.
- The mobile shell receives null tenant/store/permission/cache state as soon as
  the NextAuth session ends, so another user cannot inherit rendered owner
  truth without a reload.
- Staff and privacy-request policy remains shared with desktop; no separate
  mobile deletion contract or extra setting is introduced.
