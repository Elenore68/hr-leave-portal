
from datetime import date

from pydantic import BaseModel, Field, model_validator


class EmployeeIn(BaseModel):
    name: str
    department: str
    startDate: date
    role: str = "employee"


class LeaveIn(BaseModel):
    startDate: date
    endDate: date
    note: str = ""


class TimeOffRequestIn(BaseModel):
    user_id: str = Field(min_length=1)
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class HrRequestIn(BaseModel):
    user_id: str = Field(min_length=1)
    prompt: str = Field(min_length=1, max_length=4000)
