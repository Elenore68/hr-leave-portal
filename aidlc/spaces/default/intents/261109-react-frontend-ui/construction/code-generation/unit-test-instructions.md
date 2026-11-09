# Unit Test Instructions

Strategy: Minimal (one test per requirement area, a happy-path test per component, about 12 to 15 tests).

## Frontend (Vitest + Testing Library + jsdom)

- Setup: `npm install` in `frontend/` (Node 22, npm 10).
- Run the frontend unit tests (unit-scoped to `frontend/`):

```
npm test -- --run
```

run from `frontend/`.

- Files: `src/lib/config.test.ts`, `src/lib/api.test.ts`, `src/lib/agent.test.ts`, `src/components/ProtectedRoute.test.tsx`, `src/pages/EmployeesPage.test.tsx`, `src/pages/AssistantPage.test.tsx`.
- Mocking: mock `fetch` with `vi.stubGlobal`; mock `amazon-cognito-identity-js` and the `auth` module; the streamed agent response is mocked with a `ReadableStream`.
- Test data: inline fixtures, no files.
- Coverage target: no project-wide coverage floor applies to this scope; none is set in config.

## CDK (pytest)

Run only the new stack test:

```
.venv\Scripts\python.exe -m pytest tests/unit/test_frontend_stack.py
```

The stack test needs `frontend/dist` to exist (created by `npm run build`) or it uses a temporary asset directory fixture.

## Existing tests

The repo's existing Python test imports a non-existent `HrLeavePortalStack` and already fails. It is left as it is and reported in Build and Test.
