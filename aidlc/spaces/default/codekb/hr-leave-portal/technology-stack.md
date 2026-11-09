# Technology Stack

| Area | Technology | Version / constraint |
|---|---|---|
| Language | Python | root >=3.14 (`.python-version`); Lambda 3.14; agent container 3.12 |
| IaC | AWS CDK (Python) | aws-cdk-lib >=2.273,<3; constructs >=10.5,<11 |
| API | FastAPI, Mangum, Pydantic | fastapi >=0.162, mangum >=0.22 |
| Gateway | API Gateway REST (LambdaRestApi) | |
| Auth | Cognito User Pool | USER_PASSWORD, USER_SRP |
| Data | DynamoDB single table, GSI1 | on-demand |
| Agent | Strands Agents, bedrock-agentcore | strands-agents >=1.62,<2; bedrock-agentcore >=1.18.1,<2 |
| Models | Bedrock `us.amazon.nova-2-lite-v1:0` (agent), `global.anthropic.claude-sonnet-5` (email draft) | |
| Messaging | SNS (external topic) | |
| Packaging | uv, hatchling, Docker (linux/arm64), ECR | |
| Tests | pytest 8.4.2 | |
| Frontend | none yet (no Node tooling in repo) | |
