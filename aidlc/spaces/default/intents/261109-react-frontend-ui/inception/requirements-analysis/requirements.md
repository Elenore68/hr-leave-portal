# Requirements: React Front End for HR Leave Portal

## Intent Analysis

Give HR users a web UI for the existing HR Leave Portal backend: sign in, manage employees through the REST API, and chat with the AgentCore-hosted `hrAgent`. Deploy the UI with a new CDK stack in the existing Python CDK app. Depth: Minimal.

## Sources

- Initial description: "Build a React front end for the backend system that already exists in this repo. Also include integration with our AI hrAgent hosted in AgentCore and Create a CDK stack to deploy the new UI." [desc]
- Workflow-selected scope: express [scope]
- Q1 A: Login, employee management, AI chat [Q1]
- Q2 A: browser calls the agent directly [Q2]
- Q3 A: Vite + React + TypeScript in `frontend/` [Q3]
- Q4 A: email/password against the existing Cognito pool [Q4]
- Q5 A: private S3 + CloudFront, default domain [Q5]
- Q6 A: CDK writes runtime `config.json` from existing stacks [Q6]
- Q7 A: one experience for all signed-in users [Q7]
- Existing system facts come from the code knowledge base (`architecture.md`, `api-documentation.md`).

## Functional Requirements

### FR1 Authentication
- FR1.1 The UI provides a sign-in screen using email and password against the existing Cognito user pool and app client (USER_PASSWORD or SRP flow). [Q4]
- FR1.2 The UI has no sign-up or self-service registration screen. [Q4]
- FR1.3 Unauthenticated users cannot reach any other screen and are redirected to sign-in. [Q4]
- FR1.4 Users can sign out, which clears stored tokens. [Q4]
- FR1.5 The UI refreshes or re-prompts when the token expires; an API 401 returns the user to sign-in. [Q4]

### FR2 Employee management
- FR2.1 List employees via `GET /employees`. [Q1]
- FR2.2 Create an employee via `POST /employees` with name, department, start date (YYYY-MM-DD) and optional role. [Q1]
- FR2.3 View and edit an employee via `GET` and `PUT /employees/{id}`. [Q1]
- FR2.4 Delete an employee via `DELETE /employees/{id}` after a confirmation step. [Q1]
- FR2.5 Show API errors (including 404 "Employee not found" and validation errors) as readable messages. [Q1]
- FR2.6 Every API call sends the Cognito token in the `Authorization` header. [Q4]

### FR3 AI assistant chat
- FR3.1 Provide a chat screen where the user sends a prompt to the `hrAgent` and sees the reply. [Q1]
- FR3.2 Invoke the AgentCore Runtime directly from the browser: `POST` to the runtime invocations endpoint with `Authorization: Bearer <Cognito JWT>`, payload `{prompt, actorId}`, and a session id header of at least 33 characters. [Q2]
- FR3.3 Concatenate the streamed text chunks and render them incrementally. [Q2]
- FR3.4 Keep one session id per chat session; "New chat" starts a new one. [Q2]
- FR3.5 Show a readable error when the agent call fails (network, auth, CORS, runtime error). [Q2]
- FR3.6 Use the signed-in user's identity (Cognito subject or email) as `actorId`. [assumption]

### FR4 Application shell
- FR4.1 Navigation between Employees and Assistant screens, visible after sign-in. [Q1]
- FR4.2 All signed-in users see the same screens and actions. [Q7]
- FR4.3 The app reads API base URL, Cognito pool and client IDs, region and agent runtime ARN from a runtime `/config.json`, not from build-time constants. [Q6]

### FR5 CDK deployment stack
- FR5.1 Add a new Python CDK stack (for example `hr_leave_portal/frontend_stack.py`) registered in `app.py`, following the existing stack style. [Q5]
- FR5.2 The stack creates a private S3 bucket (block public access, encryption, no website hosting) served through CloudFront with Origin Access Control over HTTPS on the default CloudFront domain. [Q5]
- FR5.3 The distribution serves `index.html` for unknown paths (single-page app routing) and sets default root object. [Q5]
- FR5.4 The stack builds or takes the `frontend/dist` output, deploys it to the bucket with `BucketDeployment`, and invalidates the CloudFront cache. [Q5]
- FR5.5 The stack generates `config.json` from the existing stacks' resources and outputs (API URL, user pool id, client id, agent runtime ARN, region) and deploys it with the site. [Q6]
- FR5.6 The stack outputs the CloudFront URL. [Q5]
- FR5.7 If the UI origin must be allowed by the backend (CORS), document it; backend CORS already allows `*` for the REST API. [assumption]

### FR6 Visual design (match shahadaljohani.online)
Design reference: the person's portfolio site https://shahadaljohani.online/ (a Vite + React + Tailwind site). Values below were read from its published stylesheet and page head; layout and imagery were not viewable, so they are matched by style, not copied. [desc, follow-up request]
- FR6.1 Use the Poppins font (weights 400, 500, 600), loaded from Google Fonts, with a system sans-serif fallback. [follow-up]
- FR6.2 Use the reference palette as design tokens: primary deep purple `#443592`, secondary purple `#6B5B95`, light lavender `#EFEEF6` and `#D9D6E8`, gold accent `#EFCB7B` / `#F4D03F`, soft pink `#D99BA4`, near-black `#0b0b0b`, white and `#F9FAFB` surfaces. [follow-up]
- FR6.3 Primary buttons and headers use the primary purple with white text; accents and highlights use gold; page backgrounds use light lavender or white. [follow-up]
- FR6.4 Use the reference's soft style: large rounded corners (rounded-xl to rounded-3xl on cards, full-rounded buttons and avatars), soft shadows, and subtle purple-to-lavender gradients on hero and sign-in areas. [follow-up]
- FR6.5 Build styling with Tailwind CSS, with the palette defined in the Tailwind config. [follow-up]
- FR6.6 The layout is responsive from mobile to desktop. [follow-up]
- FR6.7 Success, warning and error states use green, yellow and red chips as the reference does, with text so they are not color-only. [follow-up]

## Non-Functional Requirements

- NFR1 Security: tokens are held only in browser storage/memory used by the Cognito client library; no secrets in the bundle or `config.json`; the S3 bucket is not publicly readable; HTTPS only (redirect HTTP to HTTPS). [Q4, Q5]
- NFR2 Usability and accessibility: semantic HTML, labelled form fields, keyboard-operable controls, visible focus and error text not conveyed by color alone. [assumption]
- NFR3 Performance: the production bundle loads the sign-in screen in under 3 seconds on a broadband connection from CloudFront; assets are cache-friendly (hashed filenames). [assumption]
- NFR4 Maintainability: TypeScript strict mode, ESLint passes with no errors, API and agent calls isolated in separate modules. [Q3]
- NFR5 Testability: unit tests for API client, agent stream parsing and auth guard; tests run with a single `npm test` command. [Q3]
- NFR6 Deployability: `cdk synth` succeeds for the whole app, and a documented sequence (build frontend, `cdk deploy`) deploys the UI. [Q5]

## Constraints

- Existing backend (FastAPI Lambda, API Gateway with Cognito authorizer, DynamoDB) and hrAgent runtime are not modified by this work unless a requirement above states otherwise.
- CDK is Python and the new stack lives with the existing stacks in `hr_leave_portal/`.
- Frontend code lives in a new `frontend/` folder using Vite, React, TypeScript and Tailwind CSS.
- Cognito has no hosted UI domain; the app client has no secret.

## Assumptions

- A1 The existing stacks (`HrLeavePortalBackend`, `HrLeavePortalAgentRuntime`) are deployed or deployable in the same account and region, and their resources can be passed into the new stack as constructor arguments. Rationale: matches the existing cross-stack pattern.
- A2 The AgentCore Runtime endpoint accepts browser calls with a Cognito JWT. Rationale: the user chose direct calls (Q2 A). Risk: CORS support on the runtime is unverified (see Open Questions).
- A3 Employee `role` is a free field on the record, not a UI permission. Rationale: Q7 A.
- A4 The REST authorizer accepts the Cognito ID token (not the access token) in the `Authorization` header, as is usual for a Cognito User Pools authorizer. Rationale: standard API Gateway behaviour; verify during build.
- A5 The AgentCore JWT authorizer validates the token for the same client. If it requires the access token, the UI sends the access token to the agent. Rationale: Cognito JWT authorizers on AgentCore typically check `client_id` in access tokens; verify during build.

## Out of Scope

- Leave request screens and any new backend leave endpoints (the missing `leave_controller` is not fixed here).
- Role-based access control in the UI.
- Custom domain, ACM certificate, WAF.
- Self-service sign-up, password reset flows beyond what Cognito provides by default, MFA.
- Changes to the hrAgent code or its memory configuration.
- CI/CD pipeline for the UI.

## Open Questions

- OQ1 Does the AgentCore Runtime return CORS headers for browser calls? If not, direct calls fail and a proxy (Q2 B) becomes necessary. Verify during Code Generation; if it fails, report back rather than silently adding a proxy.
- OQ2 Whether the deployed REST API currently works, given `handler.py` imports a missing `leave_controller`. The employees screen depends on it.
