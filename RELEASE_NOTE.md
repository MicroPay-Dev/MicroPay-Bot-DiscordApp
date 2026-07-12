# RELEASE NOTES

Current Target: v1.0.0 Production Ready

## v0.3.0 (Sprint 3 — completed this update)

Focus: Payment, QRIS, Buyer Role, Product Engine, repo merge.

What's new for server admins:
1. Run `/setup-payment` once to set the admin review role, QRIS image URL, and (optional) log channel.
2. Run `/setup-buyer-role` to set the role granted automatically after a payment is approved.
3. Add products with `/product-add` (name, price, optional delivery content sent to the buyer).
4. Buyers run `/order` to open a private order ticket, pick a product, get the QRIS image,
   then upload a screenshot of payment proof in the same channel.
5. Admins (with the configured admin role) approve/reject via buttons posted under the proof.
   Approval grants the buyer role and delivers the product automatically.

## Next: v1.0.0

Focus: Sprint 4 — transcripts, JOKI QUEST, AUTO QUEST VIP, logs polish, Railway hardening.
