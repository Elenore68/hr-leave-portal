export interface Employee {
  employeeId: string
  name: string
  department: string
  startDate: string
  role: string
}

export interface EmployeeInput {
  name: string
  department: string
  startDate: string
  role?: string
}

export interface Leave {
  employeeId: string
  startDate: string
  endDate: string
  note: string
}

export interface LeaveInput {
  startDate: string
  endDate: string
  note?: string
}

export interface TimeOffRequestInput {
  user_id: string
  start_date: string
  end_date: string
}

export interface HrRequestInput {
  user_id: string
  prompt: string
}

export interface HrRequestStarted {
  executionArn: string
}
