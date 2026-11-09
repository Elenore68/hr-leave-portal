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
