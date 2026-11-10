"""Unit tests for api/services/leave_service.py.

Same moto setup as test_employee_service.py: env vars and the mocked PK/SK
table exist before the module (which builds its Table at import) is imported.
"""

import importlib
import sys

import boto3
import pytest
from boto3.dynamodb.conditions import Key
from moto import mock_aws

TABLE_NAME = "test-hr-table"
REGION = "us-east-1"
MODULE = "api.services.leave_service"


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
def leave_service(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.delenv("AWS_PROFILE", raising=False)
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)
    monkeypatch.setenv("POWERTOOLS_TRACE_DISABLED", "1")
    monkeypatch.setenv("TABLE_NAME", TABLE_NAME)

    with mock_aws():
        create_hr_table(boto3.resource("dynamodb", region_name=REGION))

        sys.modules.pop(MODULE, None)
        module = importlib.import_module(MODULE)
        yield module
        sys.modules.pop(MODULE, None)


@pytest.fixture
def table(leave_service):
    return boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)


def items_for(table, employee_id: str) -> list[dict]:
    """Read back an employee's whole partition: all their leave lives under one PK."""
    return table.query(KeyConditionExpression=Key("PK").eq(employee_id))["Items"]


def test_save_writes_leave_item_keyed_by_employee_and_start_date(leave_service, table):
    # Arrange
    data = {"endDate": "2026-07-10", "note": "Summer trip"}

    # Act
    leave_service.save("emp00001", "2026-07-06", data)

    # Assert
    stored = items_for(table, "emp00001")
    assert stored == [
        {
            "PK": "emp00001",
            "SK": "2026-07-06",
            "employeeId": "emp00001",
            "startDate": "2026-07-06",
            "endDate": "2026-07-10",
            "note": "Summer trip",
        }
    ]


def test_save_defaults_note_to_empty_string_when_note_omitted(leave_service, table):
    # Act
    leave_service.save("emp00001", "2026-07-06", {"endDate": "2026-07-10"})

    # Assert
    assert items_for(table, "emp00001")[0]["note"] == ""


def test_save_twice_with_same_keys_overwrites_instead_of_duplicating(leave_service, table):
    # Arrange
    employee_id, start_date = "emp00001", "2026-09-15"

    # Act
    leave_service.save(employee_id, start_date, {"endDate": "2026-09-18", "note": "v1"})
    leave_service.save(employee_id, start_date, {"endDate": "2026-09-25", "note": "v2"})

    # Assert
    stored = items_for(table, employee_id)
    assert len(stored) == 1  # same PK+SK, so it replaced
    assert stored[0]["note"] == "v2"
    assert stored[0]["endDate"] == "2026-09-25"


def test_list_for_employee_without_month_returns_all_leave_sorted_by_start_date(leave_service, table):
    # Arrange: written out of order; ordering must come from SK (the start date).
    leave_service.save("emp00001", "2026-09-01", {"endDate": "2026-09-05"})
    leave_service.save("emp00001", "2026-07-06", {"endDate": "2026-07-10"})
    leave_service.save("emp00001", "2026-08-03", {"endDate": "2026-08-07"})
    leave_service.save("emp00002", "2026-07-01", {"endDate": "2026-07-02"})  # someone else

    # Act
    result = leave_service.list_for_employee("emp00001", None)

    # Assert
    assert [item["startDate"] for item in result] == [
        "2026-07-06",
        "2026-08-03",
        "2026-09-01",
    ]


def test_list_for_employee_with_month_returns_only_that_months_leave(leave_service, table):
    # Arrange: two July items and one August item, so the filter has something to exclude.
    leave_service.save("emp00001", "2026-07-20", {"endDate": "2026-07-22"})
    leave_service.save("emp00001", "2026-08-03", {"endDate": "2026-08-07"})
    leave_service.save("emp00001", "2026-07-06", {"endDate": "2026-07-10"})

    # Act
    result = leave_service.list_for_employee("emp00001", "2026-07")

    # Assert
    assert [item["startDate"] for item in result] == ["2026-07-06", "2026-07-20"]


def test_list_for_employee_returns_empty_list_when_employee_has_no_leave(leave_service, table):
    # Arrange
    leave_service.save("emp00002", "2026-07-06", {"endDate": "2026-07-10"})

    # Act
    result = leave_service.list_for_employee("emp00001", None)

    # Assert
    assert result == []
