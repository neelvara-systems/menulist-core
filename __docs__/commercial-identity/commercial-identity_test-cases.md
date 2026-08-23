# Commercial Identity Test Cases

1. Tax calculation rejects supplier configuration when legal identity is not
   explicitly verified.
2. Tax calculation still rejects missing or invalid supplier name, address,
   GSTIN, state code, SAC, or merchant identity after verification.
3. QA and production env templates keep legal identity verification false.
4. Terms, Privacy, Refund Policy, and footer use the canonical operator wording.
5. Active public identity sources do not call Neelvara Systems a private
   limited company, LLP, OPC, corporation, holding company, or registered
   parent.
6. Billing documents continue to render the frozen legal supplier from the tax
   snapshot rather than the MenuList or Neelvara public brand constant.
7. TypeScript, focused lint, environment verification, tax-policy tests,
   billing-document tests, legal-boundary verification, and diff checks pass.
