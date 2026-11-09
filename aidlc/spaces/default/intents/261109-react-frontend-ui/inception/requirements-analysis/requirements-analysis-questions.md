# Requirements Analysis Questions

Context: React UI for the existing HR Leave Portal backend (REST `/employees` API, Cognito), chat integration with the AgentCore `hrAgent`, and a CDK stack to deploy the UI. The REST API has no leave endpoints (the handler imports a leave controller that does not exist).

## Q1. Which screens should the UI include?

A. Login + Employee management (list/add/edit/delete) + AI assistant chat
B. Login + AI assistant chat only
C. Login + Employee management + AI chat + Leave screens (requires new backend leave endpoints)
X. Other (please specify)

[Answer]:A

## Q2. How should the browser call the hrAgent on AgentCore?

A. Directly from the browser (Cognito JWT as Bearer token); I will confirm CORS works on the runtime
B. Through a small proxy Lambda/API route added in the new CDK stack (avoids CORS issues, keeps the runtime ARN server-side)
C. You decide based on what is most likely to work
X. Other (please specify)

[Answer]:A

## Q3. Tooling for the React app

A. Vite + React + TypeScript, in a new `frontend/` folder
B. Vite + React + plain JavaScript, in a new `frontend/` folder
X. Other (please specify)

[Answer]:A

## Q4. Authentication in the UI

A. Sign in with email/password against the existing Cognito user pool (no sign-up screen; users are admin-created)
B. Cognito hosted UI (would require adding a domain to the existing backend stack)
X. Other (please specify)

[Answer]:A

## Q5. Hosting for the new CDK stack

A. Private S3 bucket + CloudFront (Origin Access Control), HTTPS on the default CloudFront domain
B. Same as A, with a custom domain and ACM certificate (please give domain in Other)
X. Other (please specify)

[Answer]:A

## Q6. How should the UI get API URL, Cognito IDs and agent ARN?

A. CDK stack reads them from the existing stacks' outputs/constructs and writes a runtime `config.json` into the deployed site
B. I will hand-edit `.env` values before building
X. Other (please specify)

[Answer]:A

## Q7. Role-based behavior

A. Single experience for all signed-in users
B. Show employee management only to users with the `hr` role (role field on employee records)
X. Other (please specify)

[Answer]:A
