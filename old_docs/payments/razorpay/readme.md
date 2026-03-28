Phase 1: A Provider-Agnostic Foundation: Configure the environment and define flexible, provider-agnostic TypeScript types and data structures. This is the most important phase for future-proofing.
Phase 2: The Generic Plan Handler: Create the backend logic to find or create payment plans for a specific provider.
Phase 3: The Generic Subscription Flow: Build the API endpoint that takes a provider parameter and delegates the subscription creation to the correct module.
Phase 4: The Generic Top-Up Flow: Build the API for one-time payments, also delegating to the specified provider module.
Phase 5: The Webhook Router: Create separate, secure webhook endpoints for each provider to update our generic Firestore documents.
