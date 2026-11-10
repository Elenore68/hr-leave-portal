"""CDK assertion tests for hr_leave_portal/backend_stack.py.

These synthesize BackendStack to its CloudFormation template and check the
resources. They catch infrastructure regressions (a dropped index, tracing
turned off, a detached authorizer) that the service unit tests cannot see.
"""

from pathlib import Path

import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Match, Template

from hr_leave_portal.backend_stack import (
    HR_STATE_MACHINE_ARN,
    LAYER_ARN_PARAM,
    BackendStack,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def template() -> Template:
    # The stack does Code.from_asset("api"), which resolves against the working
    # directory, so synthesize from the repo root wherever pytest was started.
    # Module scope: synthesize once and share the read-only template.
    with pytest.MonkeyPatch.context() as mp:
        mp.chdir(REPO_ROOT)
        app = cdk.App()
        stack = BackendStack(app, "TestBackendStack")
        return Template.from_stack(stack)


def api_function(template: Template) -> dict:
    functions = template.find_resources(
        "AWS::Lambda::Function", {"Properties": {"Handler": "handler.lambda_handler"}}
    )
    assert len(functions) == 1
    return next(iter(functions.values()))


def test_dynamodb_table_has_pk_sk_key_schema_and_gsi1_index(template):
    template.resource_count_is("AWS::DynamoDB::Table", 1)
    template.has_resource_properties(
        "AWS::DynamoDB::Table",
        {
            # Arrays match exactly, so this also pins the order: PK is HASH, SK is RANGE.
            "KeySchema": [
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            "BillingMode": "PAY_PER_REQUEST",
            # Subset match: PK and SK are also defined here.
            "AttributeDefinitions": Match.array_with(
                [
                    {"AttributeName": "GSI1PK", "AttributeType": "S"},
                    {"AttributeName": "GSI1SK", "AttributeType": "S"},
                ]
            ),
            # employee_service.list_by_hire_date queries this index.
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "GSI1",
                    "KeySchema": [
                        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                        {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
        },
    )


def test_api_lambda_has_active_tracing(template):
    function = api_function(template)
    assert function["Properties"]["TracingConfig"] == {"Mode": "Active"}


def test_api_lambda_has_exactly_one_layer_attached(template):
    assert len(api_function(template)["Properties"]["Layers"]) == 1


def test_api_lambda_layer_resolves_from_the_fastapi_powertools_ssm_parameter(template):
    # The layer ARN is an SSM lookup resolved at deploy time, so the template
    # cannot show the layer's contents. The honest check is the source: follow
    # the Ref into the Parameters block and assert which SSM parameter it reads.
    parameter_name = api_function(template)["Properties"]["Layers"][0]["Ref"]
    parameter = template.to_json()["Parameters"][parameter_name]

    assert parameter["Type"] == "AWS::SSM::Parameter::Value<String>"
    assert parameter["Default"] == LAYER_ARN_PARAM


def test_api_lambda_has_powertools_table_and_state_machine_environment_variables(template):
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {
            "Handler": "handler.lambda_handler",
            "Environment": {
                "Variables": {
                    # The table name is a CDK-generated Ref, so assert its shape only.
                    "TABLE_NAME": {"Ref": Match.any_value()},
                    "POWERTOOLS_SERVICE_NAME": "hr-api",
                    "POWERTOOLS_LOG_LEVEL": "INFO",
                    "HR_STATE_MACHINE_ARN": HR_STATE_MACHINE_ARN,
                }
            },
        },
    )


def test_api_lambda_may_start_executions_of_the_hr_state_machine_only(template):
    # hr_request_service calls stepfunctions.start_execution on this ARN.
    template.has_resource_properties(
        "AWS::IAM::Policy",
        {
            "PolicyDocument": {
                "Statement": Match.array_with(
                    [
                        {
                            "Action": "states:StartExecution",
                            "Effect": "Allow",
                            "Resource": HR_STATE_MACHINE_ARN,
                        }
                    ]
                )
            }
        },
    )


def test_rest_api_exists_with_a_cognito_user_pools_authorizer(template):
    template.resource_count_is("AWS::ApiGateway::RestApi", 1)
    template.resource_count_is("AWS::ApiGateway::Authorizer", 1)
    template.has_resource_properties(
        "AWS::ApiGateway::Authorizer",
        {
            "Type": "COGNITO_USER_POOLS",
            "IdentitySource": "method.request.header.Authorization",
            "ProviderARNs": [{"Fn::GetAtt": [Match.any_value(), "Arn"]}],
        },
    )


def test_proxy_methods_inherit_the_cognito_authorizer_by_default(template):
    # default_method_options never appears on the RestApi itself: CDK pushes it
    # down onto each generated method, so query the methods carrying it.
    authorizer_id = next(iter(template.find_resources("AWS::ApiGateway::Authorizer")))
    cognito_methods = template.find_resources(
        "AWS::ApiGateway::Method",
        {
            "Properties": {
                "HttpMethod": "ANY",
                "AuthorizationType": "COGNITO_USER_POOLS",
                "AuthorizerId": {"Ref": authorizer_id},
            }
        },
    )
    assert len(cognito_methods) == 2  # ANY on / and on /{proxy+}


def test_cors_preflight_options_methods_are_intentionally_unauthenticated(template):
    # Browsers send preflight without the Authorization header, so OPTIONS must
    # stay open or every CORS call fails. 4 methods: 2 authenticated ANY, 2 open OPTIONS.
    template.resource_count_is("AWS::ApiGateway::Method", 4)
    options_methods = template.find_resources(
        "AWS::ApiGateway::Method",
        {"Properties": {"HttpMethod": "OPTIONS", "AuthorizationType": "NONE"}},
    )
    assert len(options_methods) == 2


@pytest.mark.parametrize("response_type", ["DEFAULT_4XX", "DEFAULT_5XX"])
def test_gateway_error_responses_carry_cors_headers(template, response_type):
    # Authorizer rejections and gateway 5xx never reach the Lambda's CORS
    # middleware; without these the browser reports them as "Network error".
    template.has_resource_properties(
        "AWS::ApiGateway::GatewayResponse",
        {
            "ResponseType": response_type,
            "ResponseParameters": Match.object_like(
                {"gatewayresponse.header.Access-Control-Allow-Origin": "'*'"}
            ),
        },
    )
