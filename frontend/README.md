# HR Leave Portal front end

React + TypeScript + Vite + Tailwind single-page app. Sign in with Cognito, manage employees through the REST API, and chat with the `hrAgent` AgentCore runtime.

## Run locally

1. Copy `public/config.example.json` to `public/config.json` and fill in the values from the stack outputs (`ApiUrl`, `UserPoolId`, `UserPoolClientId`, `AgentRuntimeArn`). `public/config.json` is git-ignored.
2. `npm ci`
3. `npm run dev`

`config.json` keys: `apiUrl`, `userPoolId`, `userPoolClientId`, `region`, `agentRuntimeArn`, and optional `agentEndpoint` (overrides the direct AgentCore URL, for example a proxy).

## Checks

```
npm run lint
npm test -- --run
npm run build
```

## Deploy

The `HrLeavePortalFrontend` stack uploads `frontend/dist` and a generated `config.json` to a private S3 bucket behind CloudFront. Build first:

```
cd frontend
npm ci
npm run build
cd ..
cdk deploy HrLeavePortalFrontend
```

If `frontend/dist` is missing, synth falls back to an empty site and prints a warning.

## Auth notes

- REST API calls send the Cognito **ID token** in `Authorization` (no `Bearer`).
- AgentCore calls send the Cognito **access token** as `Authorization: Bearer <token>`. Both are chosen in `src/lib/auth.ts`, `src/lib/api.ts` and `src/lib/agent.ts`.
- Browsers call AgentCore directly. If the runtime does not allow CORS, set `agentEndpoint` to a proxy.
