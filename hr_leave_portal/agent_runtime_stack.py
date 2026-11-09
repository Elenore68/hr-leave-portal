from aws_cdk import (
    Aws,
    CfnOutput,
    Fn,
    Stack,
    aws_bedrockagentcore as agentcore,
    aws_iam as iam,
    aws_ssm as ssm,
)
from constructs import Construct


AGENT_IMAGE_URI_PARAM = "/hr-leave-portal/agent-image-uri"

HR_EMAIL_TOPIC_ARN = (
    "arn:aws:sns:us-east-1:600189963926:"
    "HrLeavePortalNotifications-HrEmailTopic915EFFDB-lH4K7ShHXyn6"
)


class AgentRuntimeStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        table,
        user_pool,
        user_pool_client,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        agent_image_uri = ssm.StringParameter.value_for_string_parameter(
            self, AGENT_IMAGE_URI_PARAM
        )

        agent_artifact = agentcore.AgentRuntimeArtifact.from_image_uri(
            agent_image_uri
        )

        cognito_auth = agentcore.RuntimeAuthorizerConfiguration.using_cognito(
            user_pool, [user_pool_client]
        )

        agent_runtime = agentcore.Runtime(
            self,
            "HrAgentRuntime",
            runtime_name="hrAgent",
            agent_runtime_artifact=agent_artifact,
            protocol_configuration=agentcore.ProtocolType.HTTP,
            authorizer_configuration=cognito_auth,
            environment_variables={
                "TABLE_NAME": table.table_name,
                "HR_EMAIL_TOPIC_ARN": HR_EMAIL_TOPIC_ARN,
                "AWS_DEFAULT_REGION": Aws.REGION,
            },
        )

        self.agent_runtime = agent_runtime

        table.grant_read_write_data(agent_runtime.role)

        agent_runtime.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream",
                ],
                resources=["*"],
            )
        )

        agent_runtime.add_to_role_policy(
            iam.PolicyStatement(
                actions=["sns:Publish"],
                resources=[HR_EMAIL_TOPIC_ARN],
            )
        )

        repo_with_tag = Fn.select(1, Fn.split("/", agent_image_uri))
        agent_repo_name = Fn.select(0, Fn.split(":", repo_with_tag))

        agent_runtime.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ecr:GetAuthorizationToken"],
                resources=["*"],
            )
        )

        agent_runtime.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "ecr:BatchGetImage",
                    "ecr:GetDownloadUrlForLayer",
                    "ecr:BatchCheckLayerAvailability",
                ],
                resources=[
                    f"arn:aws:ecr:{Aws.REGION}:{Aws.ACCOUNT_ID}:repository/{agent_repo_name}"
                ],
            )
        )

        CfnOutput(
            self,
            "AgentRuntimeArn",
            value=agent_runtime.agent_runtime_arn,
        )
