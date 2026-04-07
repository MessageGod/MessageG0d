# MG Feature Matrix (Implemented Prototype)

This prototype implements endpoint-level coverage for all major systems from the MG specification.

## Covered systems

- Authentication: register, login, forgot/reset password
- User profile + social controls: user fetch, block, report
- DM system: create DM, send/edit/delete message, reactions, read receipts, typing indicators, message search
- Server system: create and join server
- Roles/channels: role creation, channel creation with overrides
- Team system: owner-created teams with activation flag
- Global admin: root admin global ban, feature flags, audit logs
- GOD / MIDAS: assignment and scoped permissions endpoints
- Customization engine: user/server/channel theme config
- Bot system: register bots with scopes
- Economy + achievements: XP/coins mutation, unlock achievements
- Discovery + multi-server features: trending servers and aggregated feed
- Smart systems: basic moderation suggestion endpoint

## Notes

- Persistence is currently in-memory.
- WebSockets, storage, and queue integrations are intentionally left for the next implementation step.
