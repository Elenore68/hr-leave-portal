#!/usr/bin/env python3
import aws_cdk as cdk

from hr_leave_portal.backend_stack import BackendStack
from hr_leave_portal.agent_runtime_stack import AgentRuntimeStack
from hr_leave_portal.frontend_stack import FrontendStack

app = cdk.App()

backend = BackendStack(app, "HrLeavePortalBackend")

agent_runtime_stack = AgentRuntimeStack(
    app,
    "HrLeavePortalAgentRuntime",
    table=backend.table,
    user_pool=backend.user_pool,
    user_pool_client=backend.user_pool_client,
)

# Build the React app first: `cd frontend && npm ci && npm run build`.
FrontendStack(
    app,
    "HrLeavePortalFrontend",
    api=backend.api,
    user_pool=backend.user_pool,
    user_pool_client=backend.user_pool_client,
    agent_runtime=agent_runtime_stack.agent_runtime,
)

app.synth()
