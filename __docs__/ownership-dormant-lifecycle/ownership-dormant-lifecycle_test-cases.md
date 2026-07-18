# Ownership And Dormant Lifecycle Test Cases

| Case | Expected result |
| --- | --- |
| Assign Owner role | Full operational access; transfer warning is visible |
| Assign Owner in multi-store editor | Same transfer warning is visible |
| Assign Owner on mobile | Same transfer warning is visible |
| Remove/demote the last active Owner | Transaction rejects with `LAST_OWNER` |
| Owner removes/deactivates self | Request rejects |
| Manager changes an Owner target | Request rejects without role-assignment authority |
| Edit/deactivate default Owner role | Request rejects |
| Store exceeds stale threshold | Bounded reminder path may run |
| Store is merely stale | Store/account/subscription/public active state is unchanged |
| Store is already inactive | Confidence/stale scan excludes it |
| Business ownership transfer requested | Support verifies and coordinates the full boundary |
