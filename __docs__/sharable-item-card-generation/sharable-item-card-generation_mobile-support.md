# Sharable Item Card Generation Mobile Support

Mobile support is required and implemented in `ItemEditSheet`.

Controls:
- Share card
- Download card

Behavior:
- Uses native Web Share with a PNG file when supported.
- Falls back to browser download when file sharing is unavailable.
- Keeps the action inside the owner edit sheet, not the public menu PDP.
