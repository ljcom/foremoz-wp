# Foremoz Performance Whitepaper v0.3 - Read Model

## Core Read Models

- rm_performance_profile
- rm_performance_event
- rm_performance_ticket
- rm_performance_attendance
- rm_performance_performance
- rm_performance_plan_state
- rm_checkpoint

## Projection Notes

- handler wajib idempotent
- query disajikan dari read model
- write path hanya lewat append event
