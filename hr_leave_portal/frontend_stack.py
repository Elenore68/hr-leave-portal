import os
import tempfile
import warnings

from aws_cdk import (
    Aws,
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
)
from constructs import Construct

DEFAULT_DIST_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"
)


def _resolve_dist_dir(dist_dir: str) -> str:
    """Return the built front end, or an empty placeholder dir with a warning.

    The real build (`npm run build` in frontend/) must run before `cdk deploy`.
    """
    if os.path.isdir(dist_dir):
        return dist_dir
    warnings.warn(
        f"{dist_dir} not found: deploying an EMPTY site. "
        "Run `npm ci && npm run build` in frontend/ before `cdk deploy HrLeavePortalFrontend`.",
        stacklevel=2,
    )
    return tempfile.mkdtemp(prefix="hr-frontend-empty-")


class FrontendStack(Stack):
    """Hosts the React app on a private S3 bucket behind CloudFront (OAC)."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        api,
        user_pool,
        user_pool_client,
        agent_runtime,
        dist_dir: str = DEFAULT_DIST_DIR,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        bucket = s3.Bucket(
            self,
            "SiteBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        distribution = cloudfront.Distribution(
            self,
            "SiteDistribution",
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
            # Single-page app routing: unknown paths return index.html.
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=status,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                )
                for status in (403, 404)
            ],
        )

        runtime_config = s3deploy.Source.json_data(
            "config.json",
            {
                "apiUrl": api.url,
                "userPoolId": user_pool.user_pool_id,
                "userPoolClientId": user_pool_client.user_pool_client_id,
                "region": Aws.REGION,
                "agentRuntimeArn": agent_runtime.agent_runtime_arn,
            },
        )

        s3deploy.BucketDeployment(
            self,
            "DeploySite",
            sources=[
                s3deploy.Source.asset(_resolve_dist_dir(dist_dir)),
                runtime_config,
            ],
            destination_bucket=bucket,
            distribution=distribution,
            distribution_paths=["/*"],
        )

        CfnOutput(self, "SiteUrl", value=f"https://{distribution.distribution_domain_name}")
