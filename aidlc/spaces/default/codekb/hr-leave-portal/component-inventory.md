# Component Inventory

## BackendStack
CDK stack `HrLeavePortalBackend`. Owns DynamoDB table `HrTable` (PK/SK, GSI1, on-demand, DESTROY), Lambda `ApiFunction` (Python 3.14, 512 MB, 10 s, FastAPI layer from SSM), Cognito pool and client, `HrApi` REST API. Exposes `table`, `user_pool`, `user_pool_client`, `api`. Depends on SSM `/hr-leave-portal/fastapi-layer-arn`.

## AgentRuntimeStack
CDK stack `HrLeavePortalAgentRuntime`. Owns AgentCore `Runtime` "hrAgent" (Cognito authorizer, env TABLE_NAME, HR_EMAIL_TOPIC_ARN) and IAM for DynamoDB, Bedrock, SNS, ECR. Depends on BackendStack resources and SSM `/hr-leave-portal/agent-image-uri`.

## FastAPI App
`api/handler.py` app with CORS and routers; `lambda_handler` via Mangum. Depends on employee_controller and the missing leave_controller.

## Employee Controller
Five `/employees` routes. Depends on models and employee_service.

## Employee Service
DynamoDB operations create, save, get, list_all, delete. Reads env TABLE_NAME.

## API Models
Pydantic `EmployeeIn`, `LeaveIn`.

## HR Agent
`MyHRAgent/app/agent/main.py`: Strands `Agent` on `BedrockAgentCoreApp`, system prompt, 10 tools. Depends on tools, parse, memory/session, model/load.

## Employee Tools
Six DynamoDB tools including GSI1 hire-date query.

## Leave Tools
`save_leave`, `list_leave` (PK=employeeId, SK=startDate).

## Email Tools
`generate_leave_email` (Bedrock invoke), `send_email_to_hr` (SNS publish). Requires env HR_EMAIL_TOPIC_ARN at import.

## Build Scripts
`build_layer.sh` (Lambda layer to SSM), `build_and_push_agent.sh` (ECR image to SSM).
