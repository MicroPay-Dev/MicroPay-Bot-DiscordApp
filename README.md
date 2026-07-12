# MICROSTORE

Private Discord store bot — single guild, Railway-ready.

Status: Sprint 3 complete, working towards **v1.0.0 Production Ready** (Sprint 4).
See `PROJECT_INFO.md`, `ROADMAP.md`, `TODO.md`, and `CHANGELOG.md` for progress.

## Setup

```bash
npm install
cp .env.example .env   # fill in DISCORD_TOKEN, CLIENT_ID, GUILD_ID, ADMIN_ROLE_ID
npm run deploy-commands # registers slash commands
npm start
```

## Architecture

```
Discord Client -> Events/Commands -> Interactions -> Services -> Repositories -> SQLite
```

- `src/bot/commands/` — slash commands (`/setup-welcome`, `/setup-verify`,
  `/setup-buyer-role`, `/setup-payment`, `/product-add`, `/product-list`,
  `/order`, `/support`, `/vip-set-file`)
- `src/bot/events/` — `ready`, `guildMemberAdd` (welcome), `messageCreate`
  (payment proof detection), `interactionCreate` (router: commands, buttons,
  select menus, modal submits)
- `src/bot/interactions/` — button/select-menu/modal handlers (verify, order
  product select, support close, payment approve/reject, Joki Quest form
  steps 1-2, Web Panel form steps 1-2)
- `src/bot/tickets/` — order/support ticket creation flows
- `src/services/` — `TicketService`, `PaymentService`, `ProductService`,
  `BuyerService`, `LogService`, `JokiQuestService`, `AutoQuestVipService`,
  `WebPanelService` (matches API.md)
- `src/repositories/` — one repository per table (settings, products, orders,
  payments, tickets, logs, joki quest orders, web panel orders, vip files)
- `database/schema.sql` — single merged schema for all tables

## Payment flow (Sprint 3)

```
/order -> pick product -> QRIS image shown -> buyer uploads proof image
       -> admin clicks Approve/Reject -> on approve: buyer role granted +
          product delivered in-channel
```

## Product delivery (Sprint 4)

Delivery branches by `product.type` (set via `/product-add`):

- `joki_quest` -> 2-step modal form (Username Game, UID, Target Quest, Email
  Login, Password Login, Catatan Tambahan) posted as an embed for the admin
- `auto_quest_vip` -> sends the `.zip` configured via `/vip-set-file`
- `web_panel` -> 2-step modal form (Nama Website, Brand, Domain, Deskripsi,
  Fitur Tambahan, Catatan), default theme **CYBERPUNK**
- `general` (default) -> static `delivery_content` text from `/product-add`

## Deployment

Railway-ready via `railway.json` and `Procfile` (`npm start`).
