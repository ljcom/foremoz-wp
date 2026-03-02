# Diagrams Needed (v0.1)

Add the following diagrams to complete visual documentation:

1. `architecture-overview.mmd`
- PWA frontend -> Gym API -> EventDB -> Projector -> Read model flow.
- Show namespace and chain boundaries.

2. `event-flow-membership.mmd`
- Member registration -> subscription activation -> payment confirmation -> check-in eligibility.

3. `event-flow-booking.mmd`
- Class schedule -> class booking -> cancellation/attendance confirmation -> availability projection.

4. `projection-checkpoint.mmd`
- Event stream consumption and `rm_checkpoint` update lifecycle.

5. `multi-tenant-branch-layout.mmd`
- namespace isolation and chain split (`branch:<branch_id>`, `core`).
