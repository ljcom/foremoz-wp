# Foremoz Performance Whitepaper v0.3 - Architecture

## High-Level Architecture

Web Surface -> Vertical API -> EventDB -> Projector -> Read Model

Komponen:
- frontend (Vite/PWA)
- API command + read query
- EventDB write layer (immutable)
- projector + checkpoint
- Postgres read model

## Namespace Convention

- namespace: foremoz:performance:<tenant_id>
- chain: branch:<branch_id> atau core

## Projection Rule

- event diproses in-order per namespace+chain
- checkpoint disimpan untuk resume
- read model adalah query source, bukan source of truth
