# Code Generation Plan: React front end, hrAgent chat, CDK frontend stack

## Summary

- Builds: modern React (Vite + TypeScript + Tailwind) UI with sign-in, employee management and hrAgent chat, plus a CDK stack that hosts it on S3 + CloudFront
- Touches: new `frontend/` folder, new `hr_leave_portal/frontend_stack.py`, `app.py` (register stack), one line in `agent_runtime_stack.py` (expose the runtime)
- Tests: about 12 Vitest unit tests for the frontend and 1 CDK assertion test

## Testing Contract
```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "express",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c8f84e35190e007d9863fad236154d0269ab9bf633fc2a3ff106ed965ba4a9b9",
  "contract_sha256": "sha256:bb76c1b22f8307be6e5780d50cabab891684449d5b164bd0e825e9e4e5c61e5b"
}
```

## Design decisions

- Tokens: the REST API (Cognito authorizer) gets the **ID token**; the AgentCore runtime (Cognito JWT authorizer with allowed client) gets the **access token**. Both are assumptions A4/A5 in requirements and are isolated in one place (`src/lib/auth.ts`) so they are easy to flip.
- Agent endpoint is built from `config.json` (`agentRuntimeArn`, `region`, optional `agentEndpoint` override) so a proxy can replace the direct call later without code changes. CORS on the runtime is unverified (OQ1).
- Visual design: Poppins, palette and soft rounded style from FR6, in a modern look (glass-like cards, gradient hero, subtle motion), defined as Tailwind tokens.
- Zero-Unit work: all files go to the workspace root; leave existing files untouched except the two named Python edits.

## Steps

- [x] Step 1: Project skeleton. Create `frontend/` (Vite + React + TypeScript + Tailwind): `package.json` (pinned versions), `tsconfig*.json`, `vite.config.ts`, `tailwind.config.ts` (palette tokens, Poppins), `postcss.config.js`, `index.html`, `eslint` config, `.gitignore` entries for `frontend/node_modules` and `frontend/dist`. (FR4.3, FR6.1, FR6.2, FR6.5, NFR4)
- [x] Step 2: Test runner. Add Vitest + Testing Library + jsdom config in `vite.config.ts` and `src/test/setup.ts`; unit-scoped command `npm test -- --run` inside `frontend/`, recorded in `unit-test-instructions.md`. (NFR5)
- [x] Step 3: Config layer (business logic). `src/lib/config.ts` loads `/config.json` at startup and validates required keys. (FR4.3)
- [x] Step 4: Config tests. `src/lib/config.test.ts`: happy path and missing-key error. Run. (FR4.3)
- [x] Step 5: Auth layer (business logic). `src/lib/auth.ts` using `amazon-cognito-identity-js`: sign in, sign out, current session, ID token and access token getters, new-password-required challenge handled with a clear message. `src/context/AuthContext.tsx` and `ProtectedRoute`. (FR1.1 to FR1.5)
- [x] Step 6: Auth tests. `ProtectedRoute` redirects unauthenticated users; `auth.ts` sign-out clears the session (mocked library). Run. (FR1.3, FR1.4)
- [x] Step 7: Data model + API client (repository). `src/lib/types.ts` (`Employee`, `EmployeeInput`) and `src/lib/api.ts` with list/get/create/update/delete, `Authorization` header with the ID token, error mapping (404, 422, network), 401 triggers sign-out. (FR2.1 to FR2.6)
- [x] Step 8: API client tests. Mocked `fetch`: list returns the unwrapped `employees` array and sends the header; 404 maps to a readable message; 401 triggers the unauthorized callback. Run. (FR2.1, FR2.5, FR2.6, FR1.5)
- [x] Step 9: Agent client (API / endpoint). `src/lib/agent.ts`: builds the invocations URL from the runtime ARN (URL-encoded) and region unless `agentEndpoint` is set, sends `{prompt, actorId}` with Bearer access token and a 33+ character session id header, reads the streamed body incrementally and yields text chunks, maps failures (including a CORS/network failure) to a readable error. (FR3.2 to FR3.6)
- [x] Step 10: Agent client tests. URL/headers/payload built correctly; stream chunks are concatenated in order; failure produces a readable error; session id is at least 33 chars. Run. (FR3.2, FR3.3, FR3.4, FR3.5)
- [x] Step 11: UI, shell and design system. `src/index.css` (Tailwind layers, Poppins, gradients), components `Button`, `Card`, `Input`, `Badge`, `Modal`, `Spinner`, `Layout` (top nav with Employees and Assistant, user menu, sign out), `data-testid` on interactive elements. (FR4.1, FR4.2, FR6.1 to FR6.4, FR6.6, FR6.7, NFR2)
- [x] Step 12: UI, pages. `SignInPage` (gradient hero, form), `EmployeesPage` (search, table/cards, add/edit modal, delete confirmation, empty/loading/error states), `AssistantPage` (chat bubbles, streaming text, suggested prompts, new chat, error banner), `App.tsx` routes. (FR1 to FR3, FR4, FR6)
- [x] Step 13: UI tests. `EmployeesPage` renders the list from a mocked API and deletes only after confirmation; `AssistantPage` shows streamed reply text from a mocked agent client. Run. (FR2.1, FR2.4, FR3.1, FR3.3)
- [x] Step 14: CDK layer (deployment). Add `hr_leave_portal/frontend_stack.py`: private encrypted S3 bucket (block public access, SSL enforced), CloudFront distribution with Origin Access Control, redirect to HTTPS, default root object, 403/404 to `/index.html` for SPA routing, `BucketDeployment` of `frontend/dist` plus generated `config.json` (api URL, user pool id, client id, region, agent runtime ARN) with cache invalidation, `CfnOutput` for the site URL. Register in `app.py` with the backend and agent runtime as inputs; add `self.agent_runtime = agent_runtime` in `agent_runtime_stack.py`. (FR5.1 to FR5.7, NFR1, NFR6)
- [x] Step 15: CDK test. `tests/unit/test_frontend_stack.py` (pytest, existing test folder if present, otherwise `tests/`): synthesizes the stack and asserts bucket public access is blocked, a CloudFront distribution exists, and `config.json` content is deployed. Run together with the existing Python test suite. (FR5.2, FR5.5)
- [x] Step 16: Build and checks. Run `npm install`, `npm run lint`, `npm test -- --run`, `npm run build` in `frontend/`, then `cdk synth` for all stacks. Fix failures. (NFR4, NFR5, NFR6)
- [x] Step 17: Documentation and traceability. `frontend/README.md` (run locally with a `public/config.json`, build, deploy order), `code-summary.md`, `traceability.json`. (NFR6)

## Story-to-step traceability

| Requirement | Steps |
|---|---|
| FR1 | 5, 6, 12 |
| FR2 | 7, 8, 12, 13 |
| FR3 | 9, 10, 12, 13 |
| FR4 | 1, 3, 4, 11, 12 |
| FR5 | 14, 15 |
| FR6 | 1, 11, 12 |
| NFR1 to NFR6 | 1, 2, 11, 14, 16, 17 |
