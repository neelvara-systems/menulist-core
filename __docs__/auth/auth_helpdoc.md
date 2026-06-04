# Authentication — Help Documentation

**Last Updated:** June 3, 2026

## Quick Summary

MenuList supports four ways to sign in: **WhatsApp phone code**, **Google Sign-In**, **email + password**, and **Staff ID + passcode** for staff who do not have their own email.

---

## How-To Guides

### How to sign in with WhatsApp phone code

1. Go to **menulist.ai**
2. Click **Sign In**
3. Enter your WhatsApp phone number in the email, phone, or staff ID field
4. Click **Send WhatsApp code**
5. Enter the one-time code sent to WhatsApp
6. You're signed in

### How to sign in with Google

1. Go to **menulist.ai**
2. Click **Sign In**
3. Choose the Google option
4. Select your Google account
5. You're signed in

### How to sign in with email and password

1. Go to **menulist.ai** and click **Sign In**
2. Enter your email
3. Enter your password
4. Click **Log in**

### How to sign in with WhatsApp number and passcode

1. Go to **menulist.ai** and click **Sign In**
2. Enter the WhatsApp number used during onboarding
3. Click **Use passcode instead**
4. Enter the passcode you chose
5. Click **Log in**

### How to sign in with Staff ID

1. Ask the owner for your Staff ID and passcode. Staff IDs look like `S-8812345678`.
2. Go to **menulist.ai** and click **Sign In**
3. Enter the Staff ID in the first field
4. Enter the passcode in the password field
5. Click **Log in**

If the passcode is lost, the owner can create a new one from **Users**.

### How to sign out

1. Click your profile icon (top right)
2. Click **Sign Out**
3. Confirm logout

### How to check which account you're using

1. Click your profile icon (top right)
2. Your name and login method are displayed

### How to edit your profile

1. Click your profile icon (top right)
2. Click **My Profile**
3. Edit your name or phone number
4. Click **Save Changes**

### How to change your password

Desktop:

1. Click your profile icon (top right)
2. Click **My Profile**
3. Click **Change Password**
4. Enter your current password and new password
5. Click **Change Password**

Mobile:

1. Open **More**
2. Tap **Account access**
3. Enter your current password or passcode
4. Enter and confirm the new password
5. Tap **Change password**

> Note: Password change is available for email/password, Staff ID, and WhatsApp-number passcode accounts. If you sign in with Google, your password is managed by Google.

### How to claim your business (messaging onboarding)

If you received a link from WhatsApp to claim your digital menu:

1. Click the link — you'll see a welcome message with your business name
2. Choose **Sign in with Google**, **Set up with email and password**, or **Use WhatsApp number**
3. Follow the prompts to create your account
4. Your digital menu is now linked to your account!

---

## Troubleshooting

### "Access Denied" after signing in

**Why:** Your account may not be authorized for this store.
**Fix:** Contact your account administrator to grant access.

### Sign-in page keeps refreshing

**Fix:** Clear your browser cookies for menulist.ai and try again.

### I signed up with the wrong Google account

**Fix:** Sign out, then sign in with the correct Google account. Contact support to merge accounts if needed.

### I forgot my password

1. Go to the login page
2. Click **Forgot password**
3. Enter your email
4. Check your inbox for a reset link

### I am a staff member and just got added

If the owner gave you a Staff ID and passcode, use those on the MenuList sign-in page. Staff IDs usually start with `S-`.

If the owner gave you only a phone number and passcode, enter the phone number in the first field.

If the owner used your email:

1. Open the setup email from MenuList
2. Choose your password from the reset link
3. Go to the MenuList login page
4. Sign in with your email and new password

If the setup email is missing, use **Forgot password** or ask the owner to reset your access from **Users**.

---

## Security Notes

- Your Google password is never shared with MenuList
- Sessions expire automatically for security
- All data access requires authentication — no public admin access
- Multi-tenant isolation ensures you only see your own data
- Passwords are never stored in plaintext — Firebase Auth handles all password security

## Need More Help?

- **Email:** support@menulist.ai
