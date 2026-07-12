# TODO

## Sprint 3 — DONE
- [x] Payment Engine (QRIS Workflow, Upload Proof, Approve/Reject)
- [x] Buyer Role auto-grant
- [x] Product Engine (add/list, delivery content)
- [x] Merge Scaffold + Sprint1 + Sprint2 into one workspace

## Sprint 4 — Revision (DONE)
- [x] JOKI QUEST revised (Discord Email, Password Discord, Code Backup/Auth, Catatan + wipe button)
- [x] Order quantity selection modal + QRIS shows total price
- [x] Welcome message & welcome role fully configurable
- [x] Verification logging added
- [x] Dashboard API endpoints (settings, products, orders, payments, logs)
- [x] Idempotent database migrations

## Sprint 5 (DONE)
- [x] Ticket transcript export (fetch history, format, save file)
- [x] Dashboard transcript endpoints (list + download)
- [x] Automatic export on ticket close (support + order)

## Sprint 6 (DONE / v0.7.0)
- [x] YouTube channel monitoring (RSS-based polling)
- [x] YouTube commands (/youtube-add, /youtube-remove, /youtube-list)
- [x] Dashboard YouTube endpoints (list, add, remove, video history)
- [x] Auto-notification when new videos detected

## Sprint 8 (DONE / v0.9.0) — Phase 2
- [x] Discord OAuth2 login (session-based, no extra DB dependency)
- [x] Cyberpunk-themed dashboard frontend (HUD-panel signature design)
- [x] Product Manager UI (create + list products)
- [x] Settings UI (welcome, verify, roles, admin role, log channel, QRIS)
- [x] Analytics, YouTube manager, Orders/Payments viewer, Logs & Transcripts,
      Backups manager — all wired into the same dashboard app
- [x] Fixed pre-existing bug: dashboard products POST used snake_case
      `delivery_content` while `productRepo.add` expected camelCase
      `deliveryContent` — content was silently dropped before this fix

## PHASE 2 COMPLETION STATUS
**✅ 100% DONE** — Dashboard, OAuth2, Product Manager, Settings all implemented.

## ALL ROADMAP PHASES COMPLETE
MVP ✅ · Phase 2 ✅ · Phase 3 ✅
Remaining work is deployment hardening only — see KNOWN_ISSUES.md.
