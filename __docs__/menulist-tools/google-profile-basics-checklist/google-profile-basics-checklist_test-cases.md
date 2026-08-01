# Google Profile Basics Checklist - Test Cases

**Last Updated:** July 4, 2026

## V0 Report Cases

| Case | Expected |
| --- | --- |
| All basics selected and valid customer link | Ready |
| Missing category, hours, and menu/service link | Missing basics |
| Phone present but customer link invalid | Unclear |
| Business identity missing | Missing basics or unclear depending on remaining facts |
| City entered and name-matches selected but business name blank | Business identity remains unclear |
| No selections | Missing basics |

## Boundary Cases

| Case | Expected |
| --- | --- |
| Owner enters Google profile URL | URL format may be checked locally only; URL is not opened |
| Owner enters customer link | Link format is checked locally only |
| Google profile exists | Not inspected |
| Ranking question | Not checked |
| Review request | Not checked |
| Profile update request | Not performed |

## Required Negative Assertions

- No Google fetch
- No Google profile update
- No Google Search or Maps inspection
- No ranking check
- No review inspection
- No external URL fetch
- No AI/provider call
- No report storage

## Verification

```bash
npm run verify:google-profile-basics-checklist
npm run verify:public-truth-tools
```
