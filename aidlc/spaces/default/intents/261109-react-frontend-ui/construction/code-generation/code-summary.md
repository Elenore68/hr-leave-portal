# Code Summary

## Files created

- `frontend/` (Vite 7 + React + TypeScript strict + Tailwind 3): `package.json` (exact pins), `tsconfig*.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `index.html`, `.gitignore`, `public/config.example.json`, `README.md`
- `frontend/src/lib/`: `config.ts`, `auth.ts`, `types.ts`, `api.ts`, `agent.ts`
- `frontend/src/context/AuthContext.tsx`, `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/test/setup.ts`
- `frontend/src/components/`: `Button`, `Card`, `Input`, `Badge`, `Modal`, `Spinner`, `Layout`, `ProtectedRoute`
- `frontend/src/pages/`: `SignInPage`, `EmployeesPage`, `AssistantPage`
- `hr_leave_portal/frontend_stack.py`: private S3 bucket + CloudFront (Origin Access Control), SPA error mapping, `BucketDeployment` of `frontend/dist` plus generated `config.json`, `SiteUrl` output
- `tests/unit/test_frontend_stack.py`

## Files modified

- `app.py`: registers `HrLeavePortalFrontend`
- `hr_leave_portal/agent_runtime_stack.py`: one line, `self.agent_runtime = agent_runtime`

## Key decisions

- REST API receives the Cognito ID token; the AgentCore runtime receives the access token as Bearer. Both live in `src/lib/auth.ts` and `src/lib/agent.ts`.
- Agent endpoint is built from the runtime ARN and region, with an optional `agentEndpoint` override in `config.json` so a proxy can replace the direct call.
- Streaming handles plain text chunks and SSE `data:` lines.
- Modern design from FR6: Poppins, purple/lavender/gold palette, gradients, glass cards, rounded corners.
- Bucket removal policy is DESTROY with auto-delete, matching the backend stack.

## Tests

- Frontend: 18 Vitest tests in 7 files, all passing; lint and `npm run build` pass.
- CDK: 3 pytest tests pass (run through WSL because `.venv` is a Linux venv); full synth of all 3 stacks passed.
- Not executed: nothing deployed, nothing run in a real browser, no real call to the AgentCore runtime or REST API.

## Deviations from the plan

- Newest tool versions were not used where engine or peer limits blocked them (TypeScript 5.9.3, jsdom 26.1.0, jest-dom 6.9.1).
- 18 tests instead of about 12 to 15.
- Existing `tests/test_hr_leave_portal_stack.py` still fails at collection (imports a non-existent stack); untouched.

## Risks

- AgentCore may not send CORS headers for browser calls (OQ1). Fix: set `agentEndpoint` to a proxy.
- ID vs access token assumption for the two APIs (A4, A5).
- API Gateway 401/403 responses have no CORS headers, so the browser may show a generic network error.
