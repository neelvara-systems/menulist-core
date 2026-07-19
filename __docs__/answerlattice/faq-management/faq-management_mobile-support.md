# FAQ Management Mobile Support

Owner UI uses responsive Ant Design grids:

- FAQ directory stacks above the editor on mobile.
- Primary actions remain visible as normal buttons.
- Tabs split the editing surface into small sections.
- The Review tab shows a bounded recent-reactions list and refresh action without introducing a separate mobile data path.

Public Help Center:

- `Read FAQ` uses compact collapsible rows.
- FAQ feedback uses the shared feedback component.
- Article link remains a single action below the answer.

No mobile-specific data path exists. Mobile and desktop use the same DAL and Firebase rules.
