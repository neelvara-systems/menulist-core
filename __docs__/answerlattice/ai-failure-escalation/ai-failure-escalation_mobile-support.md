# AI Failure Escalation - Mobile Support

> **Last Updated:** 2026-07-18

## End-User Widget

The explicit support-request flow is part of the responsive embedded widget. It does not require a separate mobile route.

Required behavior:

- **Solved** and **Still need help** controls meet the 44px touch target;
- support-request fields stack without horizontal overflow;
- reply email is required; name and details are optional;
- submission has a stable loading state and cannot duplicate the ticket;
- success shows the created request reference;
- failure preserves the form and displays retryable copy;
- internal debug data is never shown to the end user;
- screenshot-processing failure is visible as text-only answering.

## Founder Review

The created item uses the existing support-ticket workflow. Founder/mobile support for ticket handling belongs to the ticket feature audit and is not reimplemented here.

## External Verification

Hosted narrow-viewport proof on a real allowed origin remains required. Source contracts and the widget control dimensions are covered by the Feature 16 verifier set.
