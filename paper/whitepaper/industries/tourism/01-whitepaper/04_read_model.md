# Foremoz Tourism Whitepaper v0.3 - Read Model

## Core Read Models

- rm_tourism_profile
- rm_tourism_event
- rm_tourism_ticket
- rm_tourism_attendance
- rm_tourism_performance
- rm_tourism_plan_state
- rm_checkpoint

## Projection Notes

- handler wajib idempotent
- query disajikan dari read model
- write path hanya lewat append event
