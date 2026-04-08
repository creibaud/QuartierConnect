# API Reference — QuartierConnect

Base URL (dev): `http://localhost:5000`
Base URL (prod via Caddy): `http://localhost/api`
Interactive docs: `GET /docs`

All protected routes require: `Authorization: Bearer <accessToken>`

---

## Auth

### POST /auth/register
Auth: Public
Body: `{ email: string, password: string }`
Response: `{ otpauthUrl: string }` — scan with an authenticator app to set up TOTP
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@demo.fr","password":"Demo1234!"}'
```

### POST /auth/login
Auth: Public — rate limited: 5 attempts / 15 min per IP (global throttler: 100 req / 15 min)
Body: `{ email: string, password: string, totpCode: string }`
Response: `{ accessToken: string, refreshToken: string, user: { id, email, role } }`
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@demo.fr","password":"Demo1234!","totpCode":"123456"}'
```

### POST /auth/refresh
Auth: Public
Body: `{ refreshToken: string }`
Response: `{ accessToken: string, refreshToken: string }`
```bash
curl -X POST http://localhost:5000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

### POST /auth/logout
Auth: Bearer JWT
Body: none
Response: `{ success: true }`
```bash
curl -X POST http://localhost:5000/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

### POST /auth/sso/generate
Auth: Bearer JWT
Body: `{ surface: string, state?: string }`
Response: `{ ssoToken: string, expiresIn: 300, expiresAt: string }`
```bash
curl -X POST http://localhost:5000/auth/sso/generate \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"surface":"java-desktop"}'
```

### POST /auth/sso/exchange
Auth: Public
Body: `{ ssoToken: string, state?: string }`
Response: `{ accessToken: string, refreshToken: string, user: object }` — token invalidated after first use
```bash
curl -X POST http://localhost:5000/auth/sso/exchange \
  -H "Content-Type: application/json" \
  -d '{"ssoToken":"<uuid>"}'
```

---

## Neighborhoods

### GET /neighborhoods
Auth: Public
Query: `?page=1&limit=20`
Response: `Neighborhood[]`
```bash
curl http://localhost:5000/neighborhoods
```

### GET /neighborhoods/:id
Auth: Public
Response: `Neighborhood` — 404 if not found
```bash
curl http://localhost:5000/neighborhoods/664f1a2b3c4d5e6f7a8b9c0d
```

### POST /neighborhoods
Auth: Bearer JWT — role: admin
Body: `{ name: string, city: string, description?: string, coordinates?: [number, number] }`
Response: `Neighborhood` (201)
```bash
curl -X POST http://localhost:5000/neighborhoods \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Belleville","city":"Paris","coordinates":[48.8714,2.3848]}'
```

### PATCH /neighborhoods/:id
Auth: Bearer JWT — role: admin
Body: `{ name?: string, city?: string, description?: string, coordinates?: [number, number] }`
Response: `Neighborhood`
```bash
curl -X PATCH http://localhost:5000/neighborhoods/664f1a2b3c4d5e6f7a8b9c0d \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}'
```

### DELETE /neighborhoods/:id
Auth: Bearer JWT — role: admin
Response: `{ success: true }`
```bash
curl -X DELETE http://localhost:5000/neighborhoods/664f1a2b3c4d5e6f7a8b9c0d \
  -H "Authorization: Bearer <adminToken>"
```

---

## Services

### GET /services
Auth: Public
Query: `?category=gardening&type=free&page=1&limit=20`
Response: `Service[]`
```bash
curl "http://localhost:5000/services?category=childcare&type=paid"
```

### GET /services/:id
Auth: Public
Response: `Service` — 404 if not found
```bash
curl http://localhost:5000/services/664f1a2b3c4d5e6f7a8b9c0d
```

### POST /services
Auth: Bearer JWT
Body: `{ title: string, description: string, category: string, type: "free"|"paid"|"exchange", neighborhoodId?: string }`
Response: `Service` (201)
```bash
curl -X POST http://localhost:5000/services \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Aide au jardinage","description":"Week-ends","category":"gardening","type":"free"}'
```

### PATCH /services/:id
Auth: Bearer JWT — owner or admin
Body: `{ title?: string, description?: string, category?: string, type?: string }`
Response: `Service`
```bash
curl -X PATCH http://localhost:5000/services/664f1a2b3c4d5e6f7a8b9c0d \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated"}'
```

### DELETE /services/:id
Auth: Bearer JWT — role: admin
Response: `{ success: true }`
```bash
curl -X DELETE http://localhost:5000/services/664f1a2b3c4d5e6f7a8b9c0d \
  -H "Authorization: Bearer <adminToken>"
```

---

## Events

### GET /events
Auth: Public
Query: `?category=culture&date=2026-05-15&page=1&limit=20`
Response: `Event[]`
```bash
curl "http://localhost:5000/events?category=community&date=2026-05-15"
```

### GET /events/:id
Auth: Public
Response: `Event` — 404 if not found
```bash
curl http://localhost:5000/events/664f1a2b3c4d5e6f7a8b9c0e
```

### POST /events
Auth: Bearer JWT
Body: `{ title: string, description: string, category: string, date: string }`
Response: `Event` (201)
```bash
curl -X POST http://localhost:5000/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Vide-grenier","description":"Grand vide-grenier","category":"community","date":"2026-05-15T09:00:00.000Z"}'
```

### POST /events/:id/interest
Auth: Bearer JWT
Response: `{ interested: number }` (201) — idempotent via `$addToSet`
```bash
curl -X POST http://localhost:5000/events/664f1a2b3c4d5e6f7a8b9c0e/interest \
  -H "Authorization: Bearer <token>"
```

---

## Incidents

### GET /incidents
Auth: Bearer JWT
Query: `?status=open&page=1&limit=20` — status: `open|in_progress|resolved`
Response: `Incident[]`
```bash
curl "http://localhost:5000/incidents?status=open" \
  -H "Authorization: Bearer <token>"
```

### GET /incidents/:id
Auth: Bearer JWT
Response: `Incident` — 404 if not found or soft-deleted
```bash
curl http://localhost:5000/incidents/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer <token>"
```

### POST /incidents
Auth: Bearer JWT
Body: `{ title: string, description: string, neighborhoodId?: string }`
Response: `Incident[]` (201) — initial status is `open`
```bash
curl -X POST http://localhost:5000/incidents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Lampadaire cassé","description":"Rue Victor Hugo"}'
```

### PATCH /incidents/:id/status
Auth: Bearer JWT — role: moderator or admin
Body: `{ status: "open"|"in_progress"|"resolved" }`
State machine: `open → in_progress → resolved` (other transitions return 400)
Response: `Incident`
```bash
curl -X PATCH http://localhost:5000/incidents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/status \
  -H "Authorization: Bearer <modToken>" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'
```

### DELETE /incidents/:id
Auth: Bearer JWT — role: moderator or admin
Response: `{ success: true }` — soft delete (sets `deletedAt`)
```bash
curl -X DELETE http://localhost:5000/incidents/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Authorization: Bearer <modToken>"
```

### POST /incidents/sync
Auth: Bearer JWT (Desktop client)
Body: `{ incidents: [{ id: string, title: string, description: string, createdBy: string, neighborhoodId?: string }] }`
Response: `{ upserted: number, skipped: number }` — only incidents owned by the JWT user are upserted
```bash
curl -X POST http://localhost:5000/incidents/sync \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"incidents":[{"id":"uuid","title":"Nid de poule","description":"Rue X","createdBy":"<userId>"}]}'
```

---

## Contracts

### GET /contracts
Auth: Bearer JWT
Response: `Contract[]` — contracts created by or assigned to the current user
```bash
curl http://localhost:5000/contracts \
  -H "Authorization: Bearer <token>"
```

### GET /contracts/:id
Auth: Bearer JWT — must be creator or signatory
Response: `Contract` — 403 if access denied, 404 if not found
```bash
curl http://localhost:5000/contracts/664f1a2b3c4d5e6f7a8b9c0d \
  -H "Authorization: Bearer <token>"
```

### POST /contracts
Auth: Bearer JWT
Body: `{ title: string, content: string, signatories: string[] }`
Response: `Contract` (201) — SHA-256 hash of content auto-calculated
```bash
curl -X POST http://localhost:5000/contracts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Contrat jardinage","content":"Je m'\''engage à...","signatories":["<userId2>"]}'
```

### POST /contracts/:id/sign
Auth: Bearer JWT — must be a listed signatory
Body: `{ totpCode: string }`
Response: `Contract` (201) — status becomes `pending_signature` until all have signed, then `signed`
```bash
curl -X POST http://localhost:5000/contracts/664f1a2b3c4d5e6f7a8b9c0d/sign \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"totpCode":"123456"}'
```

---

## Messaging

### GET /messaging/conversations
Auth: Bearer JWT
Response: `Conversation[]`
```bash
curl http://localhost:5000/messaging/conversations \
  -H "Authorization: Bearer <token>"
```

### POST /messaging/conversations
Auth: Bearer JWT
Body: `{ participantIds: string[], title?: string }`
Response: `Conversation` (201)
```bash
curl -X POST http://localhost:5000/messaging/conversations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"participantIds":["<userId2>"],"title":"Discussion jardinage"}'
```

### GET /messaging/conversations/:id/messages
Auth: Bearer JWT
Query: `?page=1&limit=50`
Response: `Message[]`
```bash
curl "http://localhost:5000/messaging/conversations/664f1a2b3c4d5e6f7a8b9c0d/messages?page=1" \
  -H "Authorization: Bearer <token>"
```

### POST /messaging/conversations/:id/upload
Auth: Bearer JWT
Content-Type: `multipart/form-data`
Body: form field `file` (max 10 MB)
Response: `Message` (201) — file stored in GridFS, type `image` or `file`
```bash
curl -X POST http://localhost:5000/messaging/conversations/664f.../upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/photo.jpg"
```

WebSocket: connect to `ws://localhost:5000/messaging` with `{ auth: { token: "<accessToken>" } }`.
Namespace: `/messaging`. Rooms: `conversation:{id}`.
Events emitted by server: `new_message`. Client emits: `join_conversation`, `send_message`.

---

## Votes

### POST /votes
Auth: Bearer JWT
Body: `{ targetId: string, targetType: "service"|"event"|"incident"|"comment", voteType: "like"|"dislike"|"up"|"down" }`
Response: `{ action: "added"|"removed"|"changed", voteType: string }` (201)
Strategy: LikeDislike for services/events, UpDown for incidents/comments. Voting same type toggles off.
```bash
curl -X POST http://localhost:5000/votes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetId":"664f1a2b3c4d5e6f7a8b9c0d","targetType":"service","voteType":"like"}'
```

### GET /votes/score
Auth: Bearer JWT
Query: `?targetId=<id>&targetType=service`
Response: `{ score: number, breakdown: { like: number, dislike: number } }`
```bash
curl "http://localhost:5000/votes/score?targetId=664f1a2b3c4d5e6f7a8b9c0d&targetType=service" \
  -H "Authorization: Bearer <token>"
```

---

## Points

### GET /points/balance
Auth: Bearer JWT
Response: `{ userId: string, balance: number }`
```bash
curl http://localhost:5000/points/balance \
  -H "Authorization: Bearer <token>"
```

### GET /points/history
Auth: Bearer JWT
Query: `?page=1&limit=20`
Response: `PointsTransaction[]` — sent and received transactions, most recent first
```bash
curl "http://localhost:5000/points/history?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

### POST /points/transfer
Auth: Bearer JWT
Body: `{ recipientId: string, amount: number, note?: string }`
Response: `{ transaction: object, senderBalance: number, recipientBalance: number }` (201)
Fails with 400 if balance would go below -10.
```bash
curl -X POST http://localhost:5000/points/transfer \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"<userId2>","amount":10,"note":"Merci !"}'
```

---

## Recommendations (Social/Neo4j)

### GET /recommendations
Auth: Bearer JWT
Response: `{ type: "service"|"event", id: string, name: string, score: number, reason: string }[]`
Returns `[]` if Neo4j is unavailable.
```bash
curl http://localhost:5000/recommendations \
  -H "Authorization: Bearer <token>"
```

---

## DSL

### POST /dsl/query
Auth: Bearer JWT — role: moderator or admin
Body: `{ query: string }` — DSL query string (PLY Python engine)
Response: `{ type: string, collection: string, filter: object, limit?: number }` (201)
```bash
curl -X POST http://localhost:5000/dsl/query \
  -H "Authorization: Bearer <modToken>" \
  -H "Content-Type: application/json" \
  -d '{"query":"FIND incidents WHERE status = \"open\" LIMIT 10"}'
```

---

## Me (RGPD)

### GET /users/me/export
Auth: Bearer JWT
Response: `{ profile: object, incidents: object[], pointsBalance: object|null, transactions: object[] }`
RGPD Art. 20 — data portability. `passwordHash` and `totpSecret` are never included.
```bash
curl http://localhost:5000/users/me/export \
  -H "Authorization: Bearer <token>"
```

### DELETE /users/me
Auth: Bearer JWT
Body: `{ totpCode: string }` — TOTP obligatoire pour prévenir la suppression via token volé
Response: `{ success: true }`
RGPD Art. 17 — anonymises the account: email replaced with `deleted_<id>@anonymized.invalid`, passwordHash and totpSecret cleared, refreshToken revoked.
```bash
curl -X DELETE http://localhost:5000/users/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"totpCode":"123456"}'
```

---

## Users (Admin)

### GET /users
Auth: Bearer JWT — role: admin
Response: `User[]`
```bash
curl http://localhost:5000/users \
  -H "Authorization: Bearer <adminToken>"
```

### PATCH /users/:id/role
Auth: Bearer JWT — role: admin
Body: `{ role: "resident"|"moderator"|"admin" }`
Response: `User`
```bash
curl -X PATCH http://localhost:5000/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890/role \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"role":"moderator"}'
```

---

## Community Votes

### POST /community-votes
Auth: Bearer JWT
Body: `{ title: string, description?: string, voteType: "binary"|"single_choice"|"multiple_choice"|"weighted", options: [{ id: string, label: string }], endsAt: string (ISO-8601), isAnonymous?: boolean, quorum?: number }`
Response: `CommunityVote` (201)
```bash
curl -X POST http://localhost:5000/community-votes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Faut-il installer des bancs ?","voteType":"binary","options":[{"id":"yes","label":"Oui"},{"id":"no","label":"Non"}],"endsAt":"2026-07-01T00:00:00.000Z"}'
```

### GET /community-votes
Auth: Bearer JWT
Query: `?page=1&limit=20`
Response: `CommunityVote[]`
```bash
curl http://localhost:5000/community-votes \
  -H "Authorization: Bearer <token>"
```

### GET /community-votes/:id
Auth: Bearer JWT
Response: `CommunityVote` — 404 if not found
```bash
curl http://localhost:5000/community-votes/664f1a2b3c4d5e6f7a8b9c0d \
  -H "Authorization: Bearer <token>"
```

### POST /community-votes/:id/cast
Auth: Bearer JWT
Body: `{ choices: string[], weights?: Record<string, number> }` — weights for `weighted` type only
Response: `{ success: true }` (201) — 409 if already voted, 400 if vote closed or invalid choice
```bash
curl -X POST http://localhost:5000/community-votes/664f1a2b3c4d5e6f7a8b9c0d/cast \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"choices":["yes"]}'
```

### GET /community-votes/:id/results
Auth: Bearer JWT
Response: `{ totalVoters: number, options: [{ id, label, count, percentage }], quorumReached: boolean }`
```bash
curl http://localhost:5000/community-votes/664f1a2b3c4d5e6f7a8b9c0d/results \
  -H "Authorization: Bearer <token>"
```

### POST /community-votes/:id/close
Auth: Bearer JWT — must be creator or admin
Response: `CommunityVote` (201) — sets `status: "closed"`, 403 if unauthorized
```bash
curl -X POST http://localhost:5000/community-votes/664f1a2b3c4d5e6f7a8b9c0d/close \
  -H "Authorization: Bearer <token>"
```

---

## Documents (GridFS)

### GET /documents/me
Auth: Bearer JWT
Response: `UploadedDocument[]` — documents uploaded by the current user
```bash
curl http://localhost:5000/documents/me \
  -H "Authorization: Bearer <token>"
```

### POST /documents/upload
Auth: Bearer JWT
Content-Type: `multipart/form-data`
Query: `?neighborhoodId=<id>` (optional)
Body: form field `file` (max 20 MB)
Response: `UploadedDocument` (201) — fileId, fileName, contentType, size, uploadedBy, uploadedAt
```bash
curl -X POST "http://localhost:5000/documents/upload?neighborhoodId=664f..." \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/document.pdf"
```

### GET /documents/:id/download
Auth: Bearer JWT — must be the uploader
Response: file stream with `Content-Disposition: attachment`
```bash
curl http://localhost:5000/documents/664f1a2b3c4d5e6f7a8b9c0d/download \
  -H "Authorization: Bearer <token>" \
  -o output.pdf
```

### DELETE /documents/:id
Auth: Bearer JWT — owner or admin
Response: `{ success: true }` — soft delete (audit log entry created)
```bash
curl -X DELETE http://localhost:5000/documents/664f1a2b3c4d5e6f7a8b9c0d \
  -H "Authorization: Bearer <token>"
```

### GET /documents/:id/audit
Auth: Bearer JWT — role: moderator or admin
Response: `AuditEntry[]` — upload/download/delete history for this file
```bash
curl http://localhost:5000/documents/664f1a2b3c4d5e6f7a8b9c0d/audit \
  -H "Authorization: Bearer <modToken>"
```

---

## Health

### GET /health
Auth: Public
Response: `{ status: "ok", timestamp: string, version: string }`
```bash
curl http://localhost:5000/health
```
