#!/usr/bin/env python3
import aws_cdk as cdk

from hr_leave_portal.backend_stack import BackendStack
from hr_leave_portal.agent_runtime_stack import AgentRuntimeStack

app = cdk.App()

backend = BackendStack(app, "HrLeavePortalBackend")

AgentRuntimeStack(
    app,
    "HrLeavePortalAgentRuntime",
    table=backend.table,
    user_pool=backend.user_pool,
    user_pool_client=backend.user_pool_client,
)

app.synth()