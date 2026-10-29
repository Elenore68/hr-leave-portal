from fastapi import APIRouter

from models import LeaveIn
from services import leave_service

router = APIRouter(tags=["leave"])


@router.post("/employees/{employee_id}/leave", status_code=201)
def create_leave(employee_id: str, payload: LeaveIn):
    body = payload.model_dump(mode="json")
    return leave_service.save(employee_id, body["startDate"], body)


@router.get("/employees/{employee_id}/leave")
def list_leave(employee_id: str, month: str | None = None):
    return {"leave": leave_service.list_for_employee(employee_id, month)}