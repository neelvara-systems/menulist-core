# Phone OTP Auth Mobile Support

## Owner Fit

Phone OTP is the primary path because many Indian SMB owners know their WhatsApp number faster than they know their email login.

## Mobile Behavior

- Dashboard login uses one identity input; phone-like values switch into a one-row country code plus phone number OTP field and keep a passcode fallback.
- Phone input uses `type="tel"` and `inputMode="tel"` where the standalone OTP panel asks for the phone.
- Phone screens use a country dropdown and local phone input; owners do not type `+91` manually unless they paste an international number.
- OTP input uses `inputMode="numeric"` and `autocomplete="one-time-code"`.
- Inputs and buttons use at least 48px height on the dashboard sign-in OTP row.
- The create-menu page keeps the owner on the same screen after verification.
- Dashboard login keeps Google first and password/passcode fallbacks in the same form.

## PWA Shell Impact

No PWA shell route changes. This is a sign-in and public website auth surface.

## Failure Copy

The UI avoids technical wording. Errors say:

- Could not send code
- Invalid verification code
- Code expired
- Too many attempts

No provider, token, or Firebase details are shown to owners.
