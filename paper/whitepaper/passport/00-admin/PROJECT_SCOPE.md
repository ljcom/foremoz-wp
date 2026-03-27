# PROJECT_SCOPE.md
Foremoz Passport - Operational Coverage Definition

## 1. Objective

Foremoz Passport adalah produk untuk member agar bisa:

- memiliki identitas olahraga yang konsisten,
- join/subscribe ke banyak coach dan fitness,
- melacak performa pribadi,
- dan mengontrol siapa yang boleh melihat data personal.

## 2. Primary Actors

- member (passport owner)
- coach
- studio/fitness (place)

## 3. Core Functional Coverage

### 3.1 Passport Identity and Network

- passport profile.
- sport interests.
- relation dengan banyak coach.
- relation dengan banyak studio/fitness.

### 3.2 Multi-Join and Multi-Subscription

- join kelas di beberapa lokasi.
- subscribe paket dari beberapa coach.
- membership relation di lebih dari satu studio.

### 3.3 Personal Performance Tracking

- diet log.
- body weight tracking.
- muscle / body composition tracking.
- workout and activity notes.
- milestone progress.

### 3.4 Privacy and Sharing Control

- member mengatur izin share data ke coach.
- granular consent per data category.
- revoke consent kapan saja.
- consent history tercatat auditably.

## 4. Multi-tenant Model

- namespace: `foremoz:passport:<tenant_id>`
- chain: `branch:<branch_id>` atau `core`

## 5. Out of Scope

- payroll.
- inventory.
- deep accounting.
- generic enterprise CRM automation.
- public marketplace aggregation.
