# SecurityOS External Tool Review

> Reviewed: July 29, 2026
> Status: reference-only; no tool below is installed or integrated

SecurityOS Phase one is an original repo-native evidence contract. No source code, query pack, rule set, prompts, or generated configuration was copied from these projects.

This is an engineering provenance record, not formal legal advice. Re-check the exact version, license, terms, data flow, and pricing before any future adoption.

| Source | Useful pattern | License/availability observed | Data/cost concern | Decision |
| --- | --- | --- | --- | --- |
| [OpenAI Codex Security](https://github.com/openai/codex-security) | Scope policy, untrusted-repository handling, private result storage, human patch review | Apache-2.0 repository; service access and authentication are separately required | CLI/SDK uses ChatGPT sign-in or API credentials and keeps scan state | `REFERENCE_ONLY` |
| [Google OSV-Scanner](https://github.com/google/osv-scanner) | Lockfile/dependency vulnerability inventory; offline database mode | Apache-2.0 | Normal operation queries external advisory/package services with package metadata; offline mode requires a separately obtained database | `DEFERRED_CANDIDATE` |
| [Gitleaks](https://github.com/gitleaks/gitleaks) | Local repository secret discovery | MIT | Findings can contain credentials and commit history context; retention and false-positive handling are required | `DEFERRED_CANDIDATE` |
| [GitHub CodeQL](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning) | JavaScript/TypeScript data-flow analysis and CI alerts | Availability depends on repository type and GitHub Code Security entitlement | Adds workflow/account processing and uploaded alert state | `DEFERRED_ACCOUNT_DECISION` |
| [Semgrep](https://github.com/semgrep/semgrep) | Project-specific static rules and security hot-spot discovery | Community engine is LGPL-2.1; platform/pro rules have separate terms | Remote configs may emit metrics; deeper cross-file security capabilities are platform features | `DEFERRED_LICENSE_AND_DATA_REVIEW` |
| [Trivy](https://github.com/aquasecurity/trivy) | Vulnerability, misconfiguration, secret, container, and SBOM coverage | Apache-2.0 | Broad scope overlaps narrower tools and can create duplicate findings and databases | `DEFERRED_OVERLAP_REVIEW` |
| [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | Control taxonomy and verification vocabulary | Open OWASP standard; verify release license before redistributing its text | A checklist does not prove implementation or runtime safety | `REFERENCE_TAXONOMY_ONLY` |

## Adoption Gate

Before installing or invoking any external security tool:

1. Pin the exact version and verify its license plus bundled notices.
2. Document every file, identifier, hash, package coordinate, finding, and metric that leaves the device.
3. Confirm credentials, state directory, retention, update channel, and network endpoints.
4. Run it first on a disposable fixture, not production or customer data.
5. Measure false positives and overlap with existing repo verifiers.
6. Keep fixes, CI changes, and findings human-reviewed.
7. Add it to the dependency freeze only after explicit founder approval.

Apache-2.0 generally permits use and modification subject to its conditions, including redistribution and notice obligations. It does not grant broad trademark rights. SecurityOS avoids that compliance branch in Phase one by copying none of the upstream implementation.
