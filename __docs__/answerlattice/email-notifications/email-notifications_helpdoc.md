# Email Notification Help

## What customers receive

When email delivery is enabled and the ticket includes a valid requester email, Answerlattice can send a confirmation after ticket creation, a notice after an eligible support reply, and a notice after a real ticket status change.

## Test the sender

1. Add a valid support email to the Answerlattice workspace.
2. Open Activation.
3. Use the notification test action.
4. Check the expected inbox and spam folder.

The test is limited to three attempts per workspace per hour.

## If an email does not arrive

- Confirm the ticket operation itself succeeded.
- Confirm notifications are enabled and all four SMTP variables are configured.
- Confirm the requester email or workspace support email is valid.
- Check the operational notification status and bounded failure code.
- Check the SMTP provider logs and recipient spam handling.
- Do not resend by editing ticket truth unnecessarily.

## Important behavior

- Ticket activity remains visible in Answerlattice even if email fails.
- Replying to the email does not add a message to the ticket.
- A requester replying to their own ticket does not trigger an email back to the same requester.
- Email acceptance by the sender does not prove customer resolution.
