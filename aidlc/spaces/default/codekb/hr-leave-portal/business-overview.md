# Business Overview

## Domain
Internal HR leave management: employee records and leave requests for HR staff.

## Purpose
- Maintain employee records (name, department, start date, role).
- Record and list leave requests per employee.
- Offer an AI HR assistant (hrAgent) that performs the same operations in natural language and drafts or sends leave emails to HR via SNS.

## Key Functionality
| Capability | Surface |
|---|---|
| Employee CRUD | REST API `/employees` and agent tools |
| List employees by hire-date range | Agent tool only (GSI1) |
| Record / list leave (optionally by month) | Agent tools only (REST controller missing) |
| Draft leave email, send to HR | Agent tools only |

## Users
HR staff authenticated through a Cognito user pool (admin-created users, email sign-in). No role-based permissions are enforced.

## Status
Backend and agent exist; no front end yet. See api-documentation.md for contracts.
