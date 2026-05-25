# @canonica/web

Typed browser helper for the Canonica widget runtime.

This package source is maintained in the Canonica repo. Public registry publishing is a release operation; private beta installs can use the exact snippet from the Canonica dashboard.

```ts
import { createCanonicaWebClient } from '@canonica/web';

const canonica = createCanonicaWebClient({
  apiKey: 'cn_your_widget_key',
});

await canonica.init();

canonica.page({
  contextKey: 'billing_invoices',
  feature: 'billing',
  page: 'invoices',
  workflow: 'manage_subscription',
  entityHints: ['invoice', 'subscription'],
});
```

The helper only validates safe page context and wraps the existing `window.CanonicaWidget` runtime. It does not add backend reads or writes.
