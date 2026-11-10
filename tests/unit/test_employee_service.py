"""Unit tests for api/services/employee_service.py.

The service builds its boto3 Table and reads TABLE_NAME at import time, so the
fixture starts moto, sets the env vars and creates the mocked table first, and
only then imports the module.
"""

import importlib
import re
import sys

import boto3
import pytest
from moto import mock_aws

TABLE_NAME = "test-hr-table"
REGION = "us-east-1"
MODULE = "api.services.employee_service"


def create_hr_table(dynamodb):
    """Mirror the real table in hr_leave_portal/backend_stack.py."""
    dynamodb.create_table(
        TableName=TABLE_NAME,
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "GSI1PK", "AttributeType": "S"},
            {"AttributeName": "GSI1SK", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "GSI1",
                "KeySchema": [
                    {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
        BillingMode="PAY_PER_REQUEST",
    )


@pytest.fixture
def employee_service(monkeypatch):
    # Dummy credentials: a call that escapes the mock fails instead of hitting AWS.
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)
    monkeypatch.setenv("POWERTOOLS_TRACE_DISABLED", "1")
    monkeypatch.setenv("TABLE_NAME", TABLE_NAME)

    with mock_aws():
        create_hr_table(boto3.resource("dynamodb", region_name=REGION))

        # Re-import so the module-level `table = ...` binds to this test's mock.
        sys.modules.pop(MODULE, None)
        module = importlib.import_module(MODULE)
        yield module
        sys.modules.pop(MODULE, None)


@pytest.fixture
def table(employee_service):
    # Depends on employee_service so it is created inside the live mock_aws context.
    return boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)


def employee_data(**overrides) -> dict:
    data = {
        "name": "Ada Lovelace",
        "department": "Engineering",
        "startDate": "2026-07-01",
        "role": "manager",
    }
    data.update(overrides)
    return data


def test_create_generates_eight_character_id_used_as_sort_key(employee_service, table):
    # Arrange
    data = employee_data()

    # Act
    created = employee_service.create(data)

    # Assert
    assert re.fullmatch(r"[0-9a-f]{8}", created["SK"])  # uuid4().hex[:8]
    assert created["PK"] == "USER"
    assert created["employeeId"] == created["SK"]
    stored = table.get_item(Key={"PK": "USER", "SK": created["SK"]})["Item"]
    assert stored == created


def test_create_called_twice_generates_two_different_ids(employee_service, table):
    # Arrange
    data = employee_data()

    # Act
    first = employee_service.create(data)
    second = employee_service.create(data)

    # Assert
    assert first["SK"] != second["SK"]
    assert table.scan()["Count"] == 2


def test_save_writes_expected_item_to_table(employee_service, table):
    # Arrange
    data = employee_data()

    # Act
    returned = employee_service.save("emp00001", data)

    # Assert
    expected = {
        "PK": "USER",
        "SK": "emp00001",
        "GSI1PK": "USER_BY_DATE",
        "GSI1SK": "2026-07-01",
        "employeeId": "emp00001",
        "name": "Ada Lovelace",
        "department": "Engineering",
        "startDate": "2026-07-01",
        "role": "manager",
    }
    assert table.get_item(Key={"PK": "USER", "SK": "emp00001"})["Item"] == expected
    assert returned == expected


def test_save_defaults_role_to_employee_when_role_omitted(employee_service, table):
    # Arrange
    data = employee_data()
    del data["role"]

    # Act
    employee_service.save("emp00002", data)

    # Assert
    stored = table.get_item(Key={"PK": "USER", "SK": "emp00002"})["Item"]
    assert stored["role"] == "employee"
