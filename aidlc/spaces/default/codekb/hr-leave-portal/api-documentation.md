# API Documentation

## REST API (API Gateway `HrApi`, Lambda FastAPI)
- **Base URL**: CfnOutput `ApiUrl` of stack `HrLeavePortalBackend` (default stage `prod`, trailing slash).
- **Auth**: Cognito User Pools authorizer on every method (`default_method_options`). Send the Cognito token in the `Authorization` header. Preflight (OPTIONS) is handled by API Gateway.
- **CORS**: all origins, all methods (CDK `default_cors_preflight_options`; FastAPI middleware also `*`). Note: error responses from the authorizer (401/403) carry no CORS headers unless gateway responses are configured (not configured).
- **Content type**: JSON.

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | /employees | `EmployeeIn` | 201 employee | 422 validation |
| GET | /employees | none | 200 `{"employees": [employee...]}` | |
| GET | /employees/{employee_id} | none | 200 employee | 404 `{"detail":"Employee not found"}` |
| PUT | /employees/{employee_id} | `EmployeeIn` | 200 employee (create or replace) | 422 |
| DELETE | /employees/{employee_id} | none | 200 `{"message":"Employee deleted successfully"}` | 404 |

Shapes:
- `EmployeeIn`: `{name: string, department: string, startDate: "YYYY-MM-DD", role?: string = "employee"}`
- Employee response: `{PK:"USER", SK:id, employeeId, name, department, startDate, role}`. Agent-written items also carry `GSI1PK`, `GSI1SK`.
- `LeaveIn` `{startDate, endDate, note=""}` is defined in models.py but no leave routes exist. `api/handler.py` imports a missing `leave_controller`.
- FastAPI docs routes (`/docs`, `/openapi.json`) exist but also require auth through the gateway.

## AgentCore Runtime (`hrAgent`)
- **Protocol**: HTTP. Runtime ARN is CfnOutput `AgentRuntimeArn` of stack `HrLeavePortalAgentRuntime`.
- **Auth**: Cognito JWT authorizer using the same user pool and client as the REST API.
- **Entrypoint**: `invoke(payload, context)`, an async generator; session id from `context.session_id` (fallback `default-session`).
- **Payload**: `{"prompt": string, "actorId"?: string}` or `{"messages": [{role, content:[{text}]}...], "actorId"?: string}` (trailing toolUse blocks stripped; last message supplies the prompt). `actorId` defaults to `"default"`.
- **Response**: streamed text chunks (`event["data"]`), concatenate to build the reply.
- **Invocation endpoint** (from AWS documentation, not from this repo; confirm in design): `POST https://bedrock-agentcore.<region>.amazonaws.com/runtimes/<url-encoded ARN>/invocations?qualifier=DEFAULT`, `Authorization: Bearer <JWT>`, `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` of at least 33 characters. Browser CORS support is unverified.
- **Agent tools**: create/save/get/list/delete employee, list by hire date, save/list leave, generate leave email, send email to HR.

## Cognito
UserPoolId and UserPoolClientId are CfnOutputs of `HrLeavePortalBackend`. Flows: USER_PASSWORD, USER_SRP. No client secret, no hosted UI domain, no self sign-up.
