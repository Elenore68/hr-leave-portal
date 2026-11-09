# Test Results

## Build
| Command (cwd) | Exit | Result |
|---|---|---|
| `npm run lint` (frontend/) | 0 | no errors or warnings |
| `npm run build` (frontend/) | 0 | `tsc -b` and `vite build` OK; 117 modules; JS 374.80 kB (117.11 kB gzip), CSS 17.99 kB |
| full CDK synth of 3 stacks (run during code generation, WSL) | 0 | OK |

## Unit tests
| Command (cwd) | Exit | Total | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| `npm test -- --run` (frontend/) | 0 | 18 | 18 | 0 | 0 |
| `pytest tests/unit/test_frontend_stack.py` (WSL) | 0 | 3 | 3 | 0 | 0 |

Frontend files: auth (1), config (2), api (3), agent (5), ProtectedRoute (2), AssistantPage (2), EmployeesPage (3). All ran in Node with jsdom (a DOM emulator), not in a real browser.

## Existing suite
| Command (cwd) | Exit | Result |
|---|---|---|
| `pytest tests` (WSL) | non-zero | collection error: `tests/unit/test_hr_leave_portal_stack.py` imports `hr_leave_portal.hr_leave_portal_stack.HrLeavePortalStack`, which does not exist |

This file is CDK boilerplate that already failed before this work (the module was never in the repo; it was recorded in the reverse-engineering scan). This work did not touch it.

## Coverage
No project-wide coverage floor applies to the express scope and none is configured. No coverage report was produced.

## Target Verification Matrix
| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T1 | Testing Contract: one test per requirement area, happy path per component | tests exist for each component area | 18 frontend + 3 CDK tests | test run output above | build-and-test | Met |
| T2 | Testing Contract: keep the existing test suite green | existing suite passes | existing `test_hr_leave_portal_stack.py` fails at collection (pre-existing, unrelated to this work) | `pytest tests` output above | build-and-test | Not Met |
| T3 | Testing Contract: run selected tests in CI before merge | CI runs tests | the plan runs no CI Pipeline | n/a | n/a | N/A (the plan runs no CI Pipeline) |
| T4 | FR1 to FR6 in a real browser | behavior works in a browser | checked only in jsdom; not in a real browser engine | vitest output | build-and-test | Unverified (no real browser run; said at the gate) |
| T5 | OQ1: AgentCore accepts browser calls (CORS) | chat reply received | not run against a deployed runtime | none | none scheduled | Unverified |

## Loop-Back Log
None.
