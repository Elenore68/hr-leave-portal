# Dependencies

## External (Python)
- Root runtime: aws-cdk-lib, constructs, botocore[crt].
- Root dev group: boto3, fastapi, mangum, pytest==8.4.2, uvicorn.
- Lambda layer (built by script): fastapi, pydantic, mangum, aws-lambda-powertools[tracer].
- Agent: aws-opentelemetry-distro ~=0.21, bedrock-agentcore[strands-agents], botocore[crt] ~=1.43, strands-agents.
- Lockfiles: uv.lock (root and agent).

## Cloud / Out-of-repo
- SSM parameters `/hr-leave-portal/fastapi-layer-arn` and `/hr-leave-portal/agent-image-uri`, created by scripts before `cdk deploy`.
- SNS topic `HrLeavePortalNotifications-HrEmailTopic...` (account 600189963926, us-east-1), owned by another stack.
- ECR repo `hr-agent`; Bedrock model access.

## Internal
- `HrLeavePortalAgentRuntime` -> `HrLeavePortalBackend` (table, user pool, client).
- api: handler -> controllers -> services; controllers -> models. Circular imports: none found.
- Agent: main -> tools, parse, memory.session, model.load. api/ and agent do not share code; both depend on the same table schema.
