---
name: Package sessions design
description: How the packages feature was redesigned to use per-session service selection.
---

## Rule

`packagesTable.sessions` is a nullable JSONB column of `Array<{ label: string; serviceNames: string[] }>`. When non-empty, the sell endpoint creates one appointment per session using that session's service names. When null/empty, it falls back to the legacy `serviceItems` approach.

**Why:** Operators needed to specify different services per week (e.g., Week 1: Banho; Week 4: Banho + Tosa) rather than a flat quantity-based list.

**How to apply:**
- Sell endpoint (`POST /packages/:id/sell`): check `pkgSessions.length > 0` before sessions path.
- UI form always works with sessions[]; openEdit initialises from `pkg.sessions` if set, otherwise [].
- `extraServiceIds` is populated per appointment when session has more than one service name.
- `serviceItems` kept in DB for backward compat; new UI PATCH sends only sessions.
