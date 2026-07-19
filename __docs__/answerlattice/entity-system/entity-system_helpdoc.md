# Entity System — Help Documentation

> **Version:** 2.1.0
> **Last Updated:** 2026-07-18
> **Audience:** Answerlattice customers (SaaS founders/support teams)
> **Language Governance:** Zero jargon, step-by-step instructions

---

## What Are Entities?

Entities are the product concepts that your knowledge base covers. When you write an article about "How to generate an API key," the entity is **API Keys** — the product concept the article explains.

When ontology is enabled, Answerlattice runs a best-effort extraction after article save. It links known entities and sends new product concepts to review.

---

## How Entities Work

1. You write a knowledge base article
2. Answerlattice attempts to match the product concepts (entities) in your article
3. When a user asks a question, Answerlattice identifies which product concept they're asking about
4. Answerlattice retrieves articles that cover that concept
5. The user gets the applicable governed answer or a bounded fallback

**Example:**
- Your article: "Webhook Retry Policy"
- Detected entities: Webhooks, Retry Policy, Rate Limits
- User asks: "Why are my webhooks failing?"
- Answerlattice detects: Webhooks entity
- Result: Your Webhook Retry Policy article is retrieved

---

## Managing Entities

### Viewing Your Entities

1. Go to your Answerlattice dashboard
2. Click **Governance** in the sidebar
3. Select **Entities**
4. You'll see all product concepts detected in your knowledge base

### Reviewing Entity Suggestions

When Answerlattice detects a new product concept it hasn't seen before, it creates a **candidate entity** for your review.

1. Go to **Governance → Entity Candidates**
2. Review suggested entities
3. For each suggestion:
   - **Approve** — adds the entity to your registry
   - **Merge** — combines with an existing entity (if it's a duplicate)
   - **Reject** — discards the suggestion

### Editing an Entity

1. Click on any entity in the entity list
2. You can change:
   - **Name** — the display name of the entity
   - **Description** — a short explanation of what this concept is
   - **Aliases** — other words users might use for this concept
3. Click **Save**

### Adding Aliases

Aliases help Answerlattice understand different ways users refer to the same concept.

**Example:**
- Entity: **API Keys**
- Aliases: "token", "access token", "auth key"

When a user asks about "token not working," Answerlattice knows they mean API Keys.

1. Open the entity
2. In the **Aliases** section, type the new alias
3. Click **Add**
4. Aliases are automatically lowercase

### Merging Duplicate Entities

Over time, similar entities may appear. You can merge them.

1. Select the two entities you want to merge
2. Choose which entity name to keep
3. Click **Merge**
4. The governed merge transfers bounded article, FAQ, product-surface, approved-answer, relationship, and search-index references together
5. The merged entity's name becomes an alias

### Deprecating an Entity

If a product feature is removed or renamed:

1. Open the entity
2. Click **Deprecate**
3. If an approved answer, article, FAQ, product surface, or relationship still uses the entity, Answerlattice stops and asks you to reassign or remove that dependency
4. After those dependencies are cleared, the entity is marked as deprecated and is no longer used for new matches

### Managing Relationships

1. Open an entity
2. In **Relationships**, choose a relationship type and another active entity
3. Add the relationship
4. Remove a relationship when it is no longer true

Answerlattice prevents self-links, duplicate relationships, cross-workspace links, and relationships to deprecated entities.

---

## Entity Coverage

The **Entity Coverage** section shows how well your knowledge base covers each product concept.

- **Strong:** Many articles, users find answers easily
- **Stable:** Adequate articles, working well
- **Weak:** Few articles but high demand — consider writing more content
- **Missing:** Users ask about it but no articles exist

This helps you prioritize which articles to write next.

---

## Frequently Asked Questions

**Do I need to tag entities manually?**
Usually not. With ontology enabled, post-save extraction attempts to match active known entities. Review new candidates and check unmapped articles when an extraction request fails.

**What if Answerlattice suggests a wrong entity?**
Reject it. You can also edit entity suggestions before approving them.

**Can I create entities manually?**
Yes. In the entity management section, click "Create Entity" and fill in the name, type, and description.

**How many entities should I have?**
Keep one governed entity per real product concept. Merge duplicates when two entities represent the same feature, plan, role, workflow, integration, state, or error.

**What happens when I rename an entity?**
Existing references keep the same entity ID. Add the old name as an alias when users may continue to search for it.
