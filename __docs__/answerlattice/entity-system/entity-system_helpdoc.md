# Entity System — Help Documentation

> **Version:** 2.0.0
> **Last Updated:** 2026-03-08
> **Audience:** Answerlattice customers (SaaS founders/support teams)
> **Language Governance:** Zero jargon, step-by-step instructions

---

## What Are Entities?

Entities are the product concepts that your knowledge base covers. When you write an article about "How to generate an API key," the entity is **API Keys** — the product concept the article explains.

Answerlattice automatically detects entities in your articles and uses them to find the right documentation when users ask questions.

---

## How Entities Work

1. You write a knowledge base article
2. Answerlattice detects the product concepts (entities) in your article
3. When a user asks a question, Answerlattice identifies which product concept they're asking about
4. Answerlattice retrieves articles that cover that concept
5. The user gets a relevant, accurate answer

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
4. All article references are automatically transferred
5. The merged entity's name becomes an alias

### Deprecating an Entity

If a product feature is removed or renamed:

1. Open the entity
2. Click **Deprecate**
3. The entity is marked as deprecated
4. Existing articles still reference it, but new articles won't suggest it

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
No. Answerlattice detects entities automatically when you create or update articles. You only need to review suggestions for new concepts.

**What if Answerlattice suggests a wrong entity?**
Reject it. You can also edit entity suggestions before approving them.

**Can I create entities manually?**
Yes. In the entity management section, click "Create Entity" and fill in the name, type, and description.

**How many entities should I have?**
A typical knowledge base with 100 articles has 40-70 entities. If you have significantly more, some may need to be merged.

**What happens when I rename an entity?**
The old name automatically becomes an alias. All existing references continue to work.
