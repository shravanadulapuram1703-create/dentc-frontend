# Direct Messaging API Contract

> **📌 For the full backend hand-off** (architecture, schema, gaps, phasing, acceptance criteria) see
> [`docs/messaging/MESSAGING_BACKEND_HANDOFF.md`](../messaging/MESSAGING_BACKEND_HANDOFF.md).
> This file is the wire contract only — useful as an implementer's quick reference.

## Overview

This document defines the concrete wire contract for the **user-to-user Direct Messaging** feature: REST
endpoints for durable state and a **WebSocket** channel for real-time delivery. It is the interface targeted
by `src/features/messaging/transport/realTransport.ts`; the broader design rationale lives in
[`MESSAGING_BACKEND_REQUIREMENTS.md`](../messaging/MESSAGING_BACKEND_REQUIREMENTS.md).

All field names are **snake_case**. All requests are **tenant-scoped** from the JWT. Base path:
`/api/v1/messaging`.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [REST Endpoints](#2-rest-endpoints)
3. [Common Object Shapes](#3-common-object-shapes)
4. [WebSocket Connection](#4-websocket-connection)
5. [WebSocket Event Catalogue](#5-websocket-event-catalogue)
6. [Error Handling](#6-error-handling)
7. [Idempotency & Ordering](#7-idempotency--ordering)
8. [Connection Lifecycle](#8-connection-lifecycle)

---

## 1. Authentication

- **REST:** `Authorization: Bearer <access_token>` (existing DentC JWT).
- **WebSocket:** token in query string — `wss://<host>/api/v1/messaging/ws?token=<access_token>`.
  Invalid/expired → close code `4401`.

---

## 2. REST Endpoints

### Conversations

```
GET    /api/v1/messaging/conversations?page=1&size=30&search=&archived=false
POST   /api/v1/messaging/conversations              { "participant_id": <int> }
GET    /api/v1/messaging/conversations/{id}
PATCH  /api/v1/messaging/conversations/{id}         { "pinned"?, "muted"?, "archived"?, "blocked"? }
DELETE /api/v1/messaging/conversations/{id}         (per-user soft delete)
POST   /api/v1/messaging/conversations/{id}/read    { "up_to_message_id"?: <uuid> }
```

`GET /conversations` → `{ "items": Conversation[], "meta": { "page", "size", "total", "pages" } }`.

### Messages

```
GET    /api/v1/messaging/conversations/{id}/messages?before=<uuid>&limit=30
POST   /api/v1/messaging/conversations/{id}/messages
         { "body": <string>, "client_id": <string>, "reply_to_id"?: <uuid>,
           "attachment_ids"?: <uuid[]>, "forwarded_from"?: <string> }
PATCH  /api/v1/messaging/conversations/{id}/messages/{mid}   { "body": <string> }
DELETE /api/v1/messaging/conversations/{id}/messages/{mid}?for_everyone=<bool>
POST   /api/v1/messaging/conversations/{id}/messages/{mid}/reactions   { "emoji": <string> }
POST   /api/v1/messaging/messages/{mid}/forward   { "participant_ids": <int[]> }
```

`GET …/messages` → `{ "items": Message[] (ascending), "has_more": <bool>, "cursor": <uuid|null> }`.

### Attachments (two-phase upload)

```
POST /api/v1/messaging/attachments            { "name", "mime_type", "size", "kind" }
   → { "attachment_id", "upload_url", "storage_key" }
POST /api/v1/messaging/attachments/{id}/complete
   → { "attachment_id", "url", "width"?, "height"? }
```

### Presence & Search

```
GET  /api/v1/messaging/presence?user_ids=12,34,56
   → { "12": { "status": "online", "last_seen": "…" }, … }
GET  /api/v1/messaging/search?q=crown&limit=20
   → { "items": [ { "conversation_id", "message": Message, "snippet" } ], "has_more" }
POST /api/v1/messaging/reports   { "reported_user_id"?, "message_id"?, "reason", "details"? }
```

> The "New message" user picker uses the **existing** `GET /api/v1/users?search=&is_active=true&page=&size=`
> (returns `PaginatedResponseUserRead`). No new directory endpoint is required.

---

## 3. Common Object Shapes

**Conversation**
```json
{
  "id": "uuid",
  "type": "direct",
  "participant_ids": ["12", "83867"],
  "peer": { "id": "83867", "name": "Dhileep Jinna", "username": "dhileep",
            "email": "dhileep.jin2829@dental.local", "role": "provider",
            "avatar_url": null, "initials": "DJ" },
  "last_message": null,
  "unread_count": 0,
  "pinned": false, "muted": false, "archived": false, "blocked": false,
  "created_at": "2026-07-19T15:32:00Z",
  "updated_at": "2026-07-19T15:32:00Z"
}
```

**Message**
```json
{
  "id": "uuid (uuidv7)",
  "conversation_id": "uuid",
  "sender_id": "12",
  "body": "Is the 2pm crown appointment confirmed?",
  "status": "sent",                         // sending|sent|delivered|read|failed (sender view)
  "client_id": "msg_k2a…",
  "reply_to": { "message_id": "uuid", "sender_id": "83867", "sender_name": "Dhileep Jinna",
                "preview": "…" },
  "forwarded_from": null,
  "attachments": [
    { "id": "uuid", "kind": "image", "name": "xray.png", "mime_type": "image/png",
      "size": 84213, "url": "https://…signed", "width": 1200, "height": 800 }
  ],
  "reactions": [ { "emoji": "👍", "user_ids": ["83867"] } ],
  "edited_at": null,
  "deleted_for_everyone": false,
  "created_at": "2026-07-19T15:32:04Z"
}
```

---

## 4. WebSocket Connection

```
wss://<host>/api/v1/messaging/ws?token=<access_token>
```

On connect the server sends `connection.ack`, then a `sync` warm-up snapshot:

```json
{ "type": "connection.ack", "session_id": "sess_abc", "server_time": "2026-07-19T15:30:00Z" }
{ "type": "sync",
  "conversations": [ /* Conversation[] with unread + last_message */ ],
  "unread": [ { "conversation_id": "uuid", "unread_count": 2 } ] }
```

---

## 5. WebSocket Event Catalogue

### Server → Client

```json
{ "type": "message.new", "conversation_id": "uuid", "message": { /* Message */ } }
{ "type": "message.updated", "conversation_id": "uuid", "message": { /* Message */ } }
{ "type": "message.deleted", "conversation_id": "uuid", "message_id": "uuid", "for_everyone": true }
{ "type": "message.status", "conversation_id": "uuid", "message_id": "uuid", "status": "delivered" }
{ "type": "receipt.read", "conversation_id": "uuid", "reader_id": "83867",
  "up_to_message_id": "uuid", "read_at": "…" }
{ "type": "reaction.updated", "conversation_id": "uuid", "message_id": "uuid",
  "reactions": [ { "emoji": "👍", "user_ids": ["83867"] } ] }
{ "type": "typing", "conversation_id": "uuid", "user_id": "83867", "is_typing": true }
{ "type": "presence", "user_id": "83867", "status": "online", "last_seen": "…" }
{ "type": "conversation.updated", "conversation": { /* Conversation */ } }
{ "type": "error", "error": { "code": "RATE_LIMITED", "message": "Slow down", "retry_after": 3 } }
```

### Client → Server

```json
{ "type": "ping" }
{ "type": "typing", "conversation_id": "uuid", "is_typing": true }
{ "type": "receipt.delivered", "message_id": "uuid" }
{ "type": "presence", "status": "away" }
```

> Durable writes (send/edit/delete/react/read) are **REST**; the WS layer carries the resulting broadcasts.
> Only `ping`, `typing`, `presence`, and `receipt.delivered` are client→server WS frames.

---

## 6. Error Handling

REST error envelope (matches DentC `ErrorResponse`):

```json
{ "error": { "code": "MESSAGE_TOO_LONG", "message": "Message exceeds 8000 characters.", "details": null } }
```

Codes: `VALIDATION_ERROR (400)`, `UNAUTHENTICATED (401)`, `FORBIDDEN`/`BLOCKED (403)`, `NOT_FOUND (404)`,
`CONFLICT (409)`, `ATTACHMENT_TOO_LARGE (413)`, `UNSUPPORTED_MEDIA_TYPE (415)`, `RATE_LIMITED (429)`,
`INTERNAL (500)`. WS errors use `{ "type": "error", "error": { code, message, retry_after? } }`.

---

## 7. Idempotency & Ordering

- **Idempotent sends:** `client_id` is unique per conversation. Retrying a send with the same `client_id`
  returns the original message (no duplicate). The client uses `client_id` to reconcile its optimistic row.
- **Ordering:** messages sort by `created_at` then `id` (UUIDv7 = monotonic). Clients de-dupe by `id`, so
  at-least-once WS delivery is safe.

---

## 8. Connection Lifecycle

```
connect ──▶ connection.ack ──▶ sync ──▶ [steady state: events + ping/30s]
   ▲                                          │
   └──────── reconnect (exp backoff ≤5) ◀──── close (network / 4401 auth-expired)
```

- Client pings every ~30s; server refreshes presence TTL. Missed heartbeats → presence `offline`.
- On `4401`, the client refreshes the token from `localStorage` and reconnects.
- On reconnect, the `sync` snapshot + REST history reconcile any missed events (durable source of truth).
