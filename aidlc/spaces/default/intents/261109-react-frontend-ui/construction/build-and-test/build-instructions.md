# Build Instructions

## Prerequisites
- Node 22 and npm 10 (checked with v22.20.0 / 10.9.3).
- Python venv `.venv` with aws-cdk-lib 2.275.0 and pytest (this repo's `.venv` is a Linux/WSL venv; on Windows run Python through `wsl -d Ubuntu`).

## Frontend
From `frontend/`:
1. `npm install` (use `npm ci` in clean environments)
2. `npm run lint`
3. `npm test -- --run`
4. `npm run build` (runs `tsc -b` then `vite build`, output in `frontend/dist`)

Local development: copy `frontend/public/config.example.json` to `frontend/public/config.json` and fill in the stack outputs (API URL, user pool id, client id, region, agent runtime ARN), then `npm run dev`.

## CDK
1. Build the frontend first so `frontend/dist` exists.
2. Test: `.venv/bin/python -m pytest tests/unit/test_frontend_stack.py` (in WSL).
3. Synthesize: `cdk synth` (or `python app.py`).
4. Deploy: `cdk deploy HrLeavePortalFrontend` (the Backend and AgentRuntime stacks must be deployable in the same account and region; their SSM parameters `/hr-leave-portal/fastapi-layer-arn` and `/hr-leave-portal/agent-image-uri` must exist).

## Troubleshooting
- `global is not defined` in the browser: `vite.config.ts` must keep `define: { global: 'window' }` (needed by amazon-cognito-identity-js).
- Deployed site shows a blank page: check `/config.json` loads and has all keys.
- Chat fails with a network error: likely CORS on the AgentCore runtime; set `agentEndpoint` in `config.json` to a proxy.
- `ModuleNotFoundError: hr_leave_portal.hr_leave_portal_stack` when running all tests: stale boilerplate test (see test-results.md).
