import os

import boto3
from boto3.dynamodb.conditions import Key

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


def save(employee_id: str, start_date: str, data: dict) -> dict:
    item = {
        "PK": employee_id,
        "SK": start_date,
        "employeeId": employee_id,
        "startDate": start_date,
        "endDate": data["endDate"],
        "note": data.get("note", ""),
    }
    table.put_item(Item=item)
    return item


def list_for_employee(employee_id: str, month: str | None) -> list[dict]:
    condition = Key("PK").eq(employee_id)
    if month:
        condition = condition & Key("SK").begins_with(month)

    response = table.query(KeyConditionExpression=condition)
    return response["Items"]
