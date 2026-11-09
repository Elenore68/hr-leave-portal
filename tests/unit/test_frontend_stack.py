import json

import aws_cdk as cdk
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_apigateway as apigw
from aws_cdk.assertions import Match, Template
from constructs import Construct

from hr_leave_portal.frontend_stack import FrontendStack


class _Inputs(cdk.Stack):
    """Minimal stand-in for the backend and agent runtime stacks."""

    def __init__(self, scope: Construct, construct_id: str) -> None:
        super().__init__(scope, construct_id)
        self.user_pool = cognito.UserPool(self, "Pool")
        self.user_pool_client = self.user_pool.add_client("Client")
        self.api = apigw.RestApi(self, "Api")
        self.api.root.add_method("GET")

        class _Runtime:
            agent_runtime_arn = "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/hrAgent-1"

        self.agent_runtime = _Runtime()


def _template(tmp_path) -> Template:
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html></html>")
    app = cdk.App()
    inputs = _Inputs(app, "Inputs")
    stack = FrontendStack(
        app,
        "Frontend",
        api=inputs.api,
        user_pool=inputs.user_pool,
        user_pool_client=inputs.user_pool_client,
        agent_runtime=inputs.agent_runtime,
        dist_dir=str(dist),
    )
    return Template.from_stack(stack)


def test_bucket_is_private(tmp_path):
    template = _template(tmp_path)
    template.has_resource_properties(
        "AWS::S3::Bucket",
        {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "BlockPublicPolicy": True,
                "IgnorePublicAcls": True,
                "RestrictPublicBuckets": True,
            }
        },
    )


def test_cloudfront_distribution_with_spa_routing(tmp_path):
    template = _template(tmp_path)
    template.resource_count_is("AWS::CloudFront::Distribution", 1)
    template.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": Match.object_like(
                {
                    "DefaultRootObject": "index.html",
                    "CustomErrorResponses": Match.array_with(
                        [Match.object_like({"ErrorCode": 404, "ResponsePagePath": "/index.html"})]
                    ),
                }
            )
        },
    )


def test_config_json_is_deployed(tmp_path):
    template = _template(tmp_path)
    template.resource_count_is("Custom::CDKBucketDeployment", 1)
    # config.json is a json_data source: deploy-time values (API URL, pool ids,
    # region) become substitution markers on the deployment resource.
    props = next(iter(template.find_resources("Custom::CDKBucketDeployment").values()))[
        "Properties"
    ]
    markers = json.dumps(props["SourceMarkers"])
    assert "AWS::Region" in markers
    assert markers.count("Fn::ImportValue") >= 3  # api url, user pool id, client id
