from fastapi import APIRouter, Request

from models import HrRequestIn, TimeOffRequestIn
from services import hr_request_service

router = APIRouter(tags=["hr-requests"])


def _caller_email(request: Request) -> str | None:
    """Email of the signed-in user, from the Cognito authorizer claims."""
    event = request.scope.get("aws.event") or {}
    claims = (event.get("requestContext") or {}).get("authorizer", {}).get("claims") or {}
    return claims.get("email")


@router.post("/hr-requests/time-off", status_code=202)
def start_time_off_request(payload: TimeOffRequestIn, request: Request):
    data = payload.model_dump(mode="json")
    # The verified token identity wins over whatever the client sent.
    data["user_id"] = _caller_email(request) or data["user_id"]
    return hr_request_service.start_time_off_request(data)


@router.post("/hr-requests", status_code=202)
def start_hr_request(payload: HrRequestIn, request: Request):
    data = payload.model_dump(mode="json")
    data["user_id"] = _caller_email(request) or data["user_id"]
    return hr_request_service.start_hr_request(data)
