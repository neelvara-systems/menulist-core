# Answer Retrieval Quality Website Boundary

## Public product explanation

The website may explain the flow as:

`approved answer -> applicable context check -> public sources -> answer, clarification, or safe fallback`

The visible distinction should remain:

| Generic answer surface | Answerlattice |
| --- | --- |
| Returns likely text | Prefers approved canonical truth |
| Shows retrieved links | Shows reviewer-approved canonical sources separately |
| Ignores missing customer context | Requests required plan, role, or state context |
| Treats confidence as model certainty | Uses governed validation and retrieval evidence |
| Falls through after every miss | Abstains when governance requires it |

## Proof before publication

Any screenshot or demo should show:

1. one approved canonical answer;
2. one public citation without a private source ID;
3. one scope-missing clarification;
4. one safe fallback;
5. the owner review surface that approved the public link.

Do not publish numerical accuracy, deflection, or resolution claims until a representative customer evaluation set supports them.
