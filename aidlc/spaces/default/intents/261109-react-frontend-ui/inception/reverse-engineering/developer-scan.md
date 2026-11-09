## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - api/ (handler.py, models.py, controllers/employee_controller.py, services/employee_service.py)
  - hr_leave_portal/ (backend_stack.py, agent_runtime_stack.py)
  - app.py, cdk.json, pyproject.toml, README.md
  - scripts/ (build_layer.sh, build_and_push_agent.sh)
  - MyHRAgent/ (agentcore/agentcore.json, aws-targets.json, app/agent/main.py, parse.py, Dockerfile, pyproject.toml, memory/session.py, model/load.py, tools/*.py)
  - tests/unit/test_hr_leave_portal_stack.py
- **Skimmed only**: src/hr_leave_portal/ (empty package), source.bat, fastapi-layer.zip (committed binary), stray root file with escape-sequence name, uv.lock files, MyHRAgent/app/agent/README.md
- **Left out**: .venv/, api/**/__pycache__/, cdk.out/ (absent), node_modules/ (absent)

### Packages Found
- hr_leave_portal — CDK app package — Python — BackendStack and AgentRuntimeStack
- api — Lambda code — Python — FastAPI app behind Mangum (controllers, services, models)
- MyHRAgent/app/agent — container app — Python — Strands agent on AgentCore Runtime

### Build System
- **Type**: uv (root pyproject, uv_build backend), CDK Python app (`python3 app.py`); agent: hatchling + uv, Docker (linux/arm64)
- **Config Files**: pyproject.toml, uv.lock, cdk.json, MyHRAgent/app/agent/pyproject.toml, Dockerfile, MyHRAgent/agentcore/agentcore.json
- **Build Dependencies**: scripts/build_layer.sh publishes the FastAPI Lambda layer and writes its ARN to SSM `/hr-leave-portal/fastapi-layer-arn`; scripts/build_and_push_agent.sh pushes ECR image `hr-agent` and writes URI to SSM `/hr-leave-portal/agent-image-uri`. Both are read at synth time by the stacks.

### APIs Discovered
- REST (API Gateway REST API -> Lambda, FastAPI) — api/controllers/employee_controller.py — 5 endpoints: POST/GET /employees, GET/PUT/DELETE /employees/{employee_id}
- AgentCore Runtime HTTP (`runtimeName hrAgent`) — MyHRAgent/app/agent/main.py — 1 entrypoint (streaming)
- Missing: `api/handler.py` imports `controllers.leave_controller`, which does not exist in the repo (see risks)

### Frameworks & Libraries
- aws-cdk-lib >=2.273,<3 — infra
- FastAPI >=0.162, Mangum >=0.22, Pydantic — API (dev group plus Lambda layer)
- boto3 — DynamoDB/SNS/Bedrock
- strands-agents >=1.62,<2 — agent framework
- bedrock-agentcore[strands-agents] >=1.18.1,<2 — AgentCore app and memory
- aws-opentelemetry-distro ~=0.21 — agent tracing
- Python: root requires >=3.14; Lambda runtime PYTHON_3_14; agent container python 3.12

### Test Coverage
- **Test Directories**: tests/unit/
- **Test Frameworks**: pytest 8.4.2
- **Coverage Config**: absent. The only test file imports a nonexistent `hr_leave_portal.hr_leave_portal_stack.HrLeavePortalStack` and asserts SQS/SNS; it is stale and would fail.

### Code Quality Indicators
- **Linting**: none configured
- **CI/CD**: none found
- **Documentation**: root README is the CDK template boilerplate (describes SQS/SNS, outdated); agent README present, not deeply read

### Technical Debt Signals
- Missing `api/controllers/leave_controller.py`: handler import fails at Lambda cold start; no REST leave endpoints (api/handler.py:5)
- `api/services/employee_service.py` does not write GSI1PK/GSI1SK, but agent tools do and `list_employees_by_hire_date` queries the GSI; the REST API and agent write differing item shapes
- CORS `allow_origins=["*"]` in FastAPI and CDK (backend_stack.py)
- Hard-coded SNS topic ARN with account id 600189963926 (agent_runtime_stack.py:14)
- Hard-coded model IDs: `us.amazon.nova-2-lite-v1:0` (model/load.py), `global.anthropic.claude-sonnet-5` (email_tools.py)
- IAM `bedrock:InvokeModel*` on `*` resource
- DynamoDB table and Cognito pool `RemovalPolicy.DESTROY`
- Delete via agent tool does not verify existence; the REST API returns 404
- Committed `fastapi-layer.zip`, stray root file with escape-sequence name, `source.bat`
- `tests/` stale; README stale; `pyproject.toml` has placeholder description and a `hr-leave-portal = hr_leave_portal:main` script with no `main`
- No Cognito groups or role enforcement; the `role` field is data only
- Leave items use `PK=employeeId, SK=startDate` (agent only); same table as employees (`PK=USER`)

## Handoff Summary
- **Intent-relevant finding**:
  - REST API: API Gateway `LambdaRestApi` "HrApi" (CDK construct id), Cognito User Pools authorizer on ALL methods (backend_stack.py `default_method_options`), so every call needs `Authorization: <Cognito token>` (ID/access token per authorizer; User Pool authorizer with no scopes accepts the ID token). CORS preflight allows all origins and methods (`Cors.ALL_ORIGINS`/`ALL_METHODS`; allowed headers default). Stage is default `prod`; `ApiUrl` CfnOutput. Employee JSON shape: `{employeeId, name, department, startDate (YYYY-MM-DD), role}` (PK/SK also returned in the item). `GET /employees` returns `{"employees": [...]}`; DELETE returns `{"message": ...}`; 404 `{"detail": "Employee not found"}`. Input body `EmployeeIn {name, department, startDate, role="employee"}`. Leave endpoints are NOT present (`LeaveIn {startDate, endDate, note}` model exists only).
  - Cognito: UserPool (admin-created users only, email sign-in), app client with USER_PASSWORD and USER_SRP flows, no client secret; no hosted domain; outputs `UserPoolId`, `UserPoolClientId`.
  - Agent: AgentCore Runtime "hrAgent" with protocol HTTP, authorizer = Cognito JWT using the same user pool and client (agent_runtime_stack.py), so the browser can invoke it with the Cognito token as a Bearer token over HTTPS to the AgentCore InvokeAgentRuntime endpoint (`https://bedrock-agentcore.<region>.amazonaws.com/runtimes/<url-encoded runtime ARN>/invocations?qualifier=DEFAULT`, header `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` >=33 chars; this endpoint shape comes from AWS docs knowledge, not from the repo; CORS support for browser calls is unverified). Payload per parse.py: `{"prompt": "<text>", "actorId": "<string>"}` or `{"messages": [...Bedrock-converse-style...], "actorId": ...}`. Response is a streamed sequence of text chunks (async generator yielding `event["data"]`). Runtime ARN is exposed as CfnOutput `AgentRuntimeArn` of stack `HrLeavePortalAgentRuntime`. Session id from context; memory enabled only when env `MEMORY_AGENTMEMORY_ID` set (not set by the CDK stack).
  - CDK conventions: Python, `app.py`, stacks `HrLeavePortalBackend` (BackendStack) and `HrLeavePortalAgentRuntime`; inter-stack data passed as constructor args and attributes (`backend.table`, `user_pool`, `user_pool_client`, `api`); SSM-parameter indirection for build artifacts; CfnOutputs for URLs and ids; no env/region specified on the stacks (environment-agnostic) while the SNS ARN is hard-coded to us-east-1; stack classes live in `hr_leave_portal/`. New UI stack should follow this layout (e.g. `hr_leave_portal/frontend_stack.py`, registered in app.py).
- **Risks / follow-up**:
  - `leave_controller` missing: backend Lambda would fail on import, so the deployed API state is unknown. The UI cannot rely on REST leave endpoints; leave data is reachable only through the agent unless a controller is added.
  - Browser-to-AgentCore direct invocation with a Cognito JWT needs CORS verification; a proxy (e.g. Lambda) may be required.
  - SNS email topic belongs to another stack (`HrLeavePortalNotifications`) not in this repo.
  - Stale test and README; no CI.
  - No Node/React tooling exists yet (no package.json).
