# Code Structure

## Layout
| Path | Classification | Notes |
|---|---|---|
| app.py | Configuration | CDK entry; instantiates `HrLeavePortalBackend` and `HrLeavePortalAgentRuntime` |
| cdk.json | Configuration | `python3 app.py`, feature flags |
| hr_leave_portal/backend_stack.py | Configuration (IaC) | Table, Lambda, Cognito, API Gateway |
| hr_leave_portal/agent_runtime_stack.py | Configuration (IaC) | AgentCore Runtime, IAM |
| api/handler.py | Controller/Handler | FastAPI app, CORS, Mangum `lambda_handler` |
| api/models.py | Model | `EmployeeIn`, `LeaveIn` |
| api/controllers/employee_controller.py | Controller | 5 routes |
| api/services/employee_service.py | Service/Repository | DynamoDB access |
| MyHRAgent/app/agent/main.py | Controller/Handler | `BedrockAgentCoreApp` entrypoint |
| MyHRAgent/app/agent/parse.py | Utility | Payload parsing |
| MyHRAgent/app/agent/memory/session.py | Configuration | Optional AgentCore memory |
| MyHRAgent/app/agent/model/load.py | Configuration | Bedrock model |
| MyHRAgent/app/agent/tools/*.py | Service | employee, leave, email tools |
| MyHRAgent/agentcore/*.json | Configuration | Agent project config (`managedBy: CDK`) |
| scripts/*.sh | Utility | Layer and image build/publish |
| tests/unit/ | Test | Stale CDK test |
| src/hr_leave_portal/ | Static | Empty package |

## Patterns
- Controller -> service layering in api/ (flat imports like `from models import ...`, since Lambda code root is `api/`).
- Agent tools are `@tool` functions with direct boto3 table access (no shared module with api/).
- Stack-per-concern, passing resources via constructor arguments.
- Not present: `api/controllers/leave_controller.py`, frontend code, `package.json`.
