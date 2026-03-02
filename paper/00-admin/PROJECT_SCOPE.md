# PROJECT_SCOPE.md
Foremoz Fitness – Operational Coverage Definition

## 1. Objective

Foremoz Fitness is a vertical SaaS system designed for fitness centers, gyms, and training studios.

The system focuses on operational excellence, not marketplace distribution.

---

## 2. Target Businesses

Covered:

- Traditional gyms.
- Fitness centers.
- Boutique studios.
- Personal training studios.
- Yoga / HIIT / CrossFit studios.
- Multi-branch fitness operators.

Not covered:

- Equipment retail shops.
- Supplement e-commerce stores.
- Marketplace aggregation platforms.
- Enterprise-level accounting systems.

---

## 3. Core Functional Coverage

### 3.1 Membership Lifecycle

- Member registration.
- Membership plan assignment.
- Subscription purchase.
- Subscription extension.
- Freeze / unfreeze.
- Expiration handling.

---

### 3.2 Attendance Management

- QR-based check-in.
- Manual check-in.
- Attendance logging.
- Daily attendance reporting.

---

### 3.3 Class Booking

- Class scheduling.
- Capacity management.
- Member booking.
- Guest booking.
- Booking cancellation.
- Attendance confirmation per class.

---

### 3.4 Personal Training (PT)

- PT session package creation.
- PT session consumption tracking.
- Trainer assignment.
- Remaining session tracking.

---

### 3.5 Payment Recording

- Manual payment recording.
- Proof upload.
- Admin confirmation.
- Revenue reporting (operational level).

No advanced accounting logic is included.

---

## 4. Multi-Tenant Model

Each fitness center operates as:

- A Tenant.
- With optional Branch chains.
- Under isolated namespace.

Structure:

Namespace: foremoz:fitness:<tenant>
Chain: branch:<branch_id>

---

## 5. Deployment Model

- PWA-first deployment.
- Cloud-native API architecture.
- EventDB as write layer.
- Projection-based read model.

---

## 6. Out of Scope (Strict)

- Full ERP integration.
- Payroll.
- Inventory and warehouse systems.
- Complex CRM automation.
- Marketplace discovery.
- AI personalization (future phase only).

---

## 7. Long-Term Positioning

Foremoz Fitness is:

- The first operational vertical of Foremoz.
- Powered by EventDB.
- Designed for scalable service industries.

Future verticals may include:

- Clinic.
- Salon.
- Academy.
- Coworking space.

Each vertical must remain independent and modular.