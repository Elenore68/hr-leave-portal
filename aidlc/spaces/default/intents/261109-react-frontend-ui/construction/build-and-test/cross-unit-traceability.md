# Cross-Unit Traceability

Verdict: PASS. Every requirement ID is built (`aidlc engine sensor-traceability --stage build-and-test` returned `pass: true`, no uncovered IDs). The work has no Units; one stage-level code-generation covers everything.

| ID | Built in |
|---|---|
| FR1.1 | frontend/src/pages/SignInPage.tsx |
| FR1.2, FR1.5 | frontend/src/lib/auth.ts |
| FR1.3 | frontend/src/components/ProtectedRoute.tsx |
| FR1.4 | frontend/src/lib/auth.test.ts |
| FR2.1 to FR2.3 | frontend/src/pages/EmployeesPage.tsx |
| FR2.4 | frontend/src/pages/EmployeesPage.test.tsx |
| FR2.5, FR2.6 | frontend/src/lib/api.ts |
| FR3.1 | frontend/src/pages/AssistantPage.tsx |
| FR3.2, FR3.4 to FR3.6 | frontend/src/lib/agent.ts |
| FR3.3 | frontend/src/pages/AssistantPage.test.tsx |
| FR4.1, FR4.2 | frontend/src/components/Layout.tsx |
| FR4.3 | frontend/src/lib/config.ts |
| FR5.1 to FR5.7 | hr_leave_portal/frontend_stack.py |
| FR6.1 to FR6.7 | frontend/tailwind.config.ts |
| NFR1 | hr_leave_portal/frontend_stack.py |
| NFR2 | frontend/src/components/Input.tsx |
| NFR3, NFR5 | frontend/vite.config.ts |
| NFR4 | frontend/eslint.config.js |
| NFR6 | frontend/README.md |

Note: the code-generation traceability file maps each ID to one primary file; some IDs (FR6, NFR2, NFR3) are met across several files.
