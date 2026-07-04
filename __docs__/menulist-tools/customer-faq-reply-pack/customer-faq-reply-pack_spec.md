# Customer FAQ Reply Pack - Spec

**Status:** Implemented V0 public browser-local tool
**Last Updated:** July 4, 2026

---

## Owner Job

Create reusable FAQ and auto-reply text from repeated customer questions and owner-entered business facts.

The owner enters:

- business name
- city or area
- repeated customer questions
- source facts answers should use
- current customer link
- menu/service context
- hours
- prices or quote path
- location/contact
- best customer action
- availability notes

The tool returns:

- FAQ overview
- menu/service answer
- hours answer
- price answer
- location/contact answer
- order/booking answer
- availability notes answer
- fallback answer
- report rows with evidence text
- one MenuList next action

## V0 Scope

V0 is public and free. It runs in the browser without login and uses deterministic string assembly from owner-entered facts. No AI answer is generated.

V0 must not:

- read customer conversation logs
- create a chatbot
- configure automation
- send messages
- fetch or inspect entered links
- store report data
- mutate WhatsApp, Google, Instagram, Facebook, directories, websites, or maps
- promise ranking, citations, traffic, conversions, auto-resolution, or support automation outcomes

## V1 Owner Scope

V1 lives inside the shared Business Health/Public Truth owner card. It uses current MenuList store/project truth to show missing answer facts for menu/service, hours, prices, location/contact, actions, and current customer link.

## V2 Paid/Add-On Scope

V2 becomes paid only when recurring value exists:

- saved history
- monthly FAQ readiness report
- multi-location FAQ consistency
- agency/client export
- managed setup help
- seasonal answer review

Paid value is recurrence, history, agency reporting, and multi-location consistency, not a better one-time public check.

## Evidence Contract

Every row needs evidence text that says what was actually checked. Examples:

- Checked owner-entered questions and business facts only.
- Public HTTPS URL format was checked locally. The URL was not opened or fetched.
- FAQ replies were generated from owner-entered facts only. No AI answer was generated.
- No customer conversation logs were read, no chatbot was created, no automation was configured, and no message was sent.

## Product Fit

This tool is part of MenuList Tools. It is not a chatbot, inbox, helpdesk, broadcast sender, or marketing automation product.
