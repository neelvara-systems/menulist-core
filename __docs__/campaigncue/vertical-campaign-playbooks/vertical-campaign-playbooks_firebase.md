# Vertical Campaign Playbooks - Firebase And Cost

The playbook and recipe registries are bundled TypeScript constants.
The feature adds no Firebase read, write, delete, listener, or Storage operation.

| Operation | Added reads | Added writes | Storage | Provider calls |
| --- | ---: | ---: | ---: | ---: |
| Resolve vertical playbook | 0 | 0 | 0 | 0 |
| Rank playbook recipes | 0 | 0 | 0 | 0 |
| Show owner recommendation | 0 | 0 | 0 | 0 |

Campaign creation still uses the existing campaign, trust report, event, dashboard summary, and idempotency write path. No playbook document is copied into each workspace.

If administrators eventually need remotely editable recipes, that requires a separate signed/versioned registry design and must not introduce one document read per recipe or per card.
