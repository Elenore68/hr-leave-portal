# Code Quality Assessment

| Dimension | Rating | Notes |
|---|---|---|
| Naming clarity | good | Clear module and function names |
| Function size | good | Small functions |
| Error handling | fair | 404s handled in API; agent tools do not check existence; `parse.py` validates payloads |
| Test presence | poor | One stale test importing nonexistent `HrLeavePortalStack`, asserting SQS/SNS |
| Duplication | fair | Employee DynamoDB logic duplicated between api service and agent tools, with differing GSI attributes |
| Dead code | fair | Unused `LeaveIn`; `src/hr_leave_portal` empty; bogus `hr-leave-portal` script entry |

## Tooling
- Linting/formatting: none configured. CI/CD: none. Coverage: none.
- Documentation: root README is CDK boilerplate and outdated; agent README exists.

## Technical Debt
- Missing `leave_controller` (api/handler.py:5) breaks the Lambda import.
- CORS wildcard; hard-coded SNS ARN and account id; wildcard Bedrock IAM resource.
- DESTROY removal policies on table and user pool.
- Hard-coded model IDs; committed `fastapi-layer.zip`, `source.bat`, and a stray escape-sequence-named root file.
- No role-based authorization despite a `role` field.
