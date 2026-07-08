# MenuList Launch Announcement 30s Vertical

**Status:** Draft project
**Format:** 9:16, 1080 x 1920, 30fps
**Output:** `renders/menulist-launch-announcement-30s-vertical-audio-v2.mp4`

## Purpose

Native vertical version of the MenuList 30-sec Launch Announcement for Reels, Shorts, TikTok, WhatsApp sharing, and vertical ad review.

This project reuses the approved 16:9 audio v2 master and real MenuList icon from:

```text
../menulist-launch-announcement-30s/
```

## Run

```bash
source ~/.nvm/nvm.sh
nvm use 22
npm run check
npx hyperframes render --output renders/menulist-launch-announcement-30s-vertical-audio-v2.mp4 --quality standard --fps 30 --workers 1 --experimental-fast-capture=false
```

## Public Status

Internal review draft only. Public publishing still requires founder listening approval and final platform caption review.
