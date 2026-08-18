# REST API plan

## Objective

Add a versioned, authenticated, and maintainable REST API for Uptime Gizmo without changing the existing Vue application, Socket.IO event contracts, public status-page endpoints, push endpoints, or Prometheus integration.

The API should provide stable HTTP resources for automation, integrations, AI agents, and external administration tools. It should use the project's existing Express server, database models, API-key system, rate limiting, and HTTP/HTTPS configuration.

This document describes the target design and implementation sequence. It is a plan; an endpoint is not considered available until its route, validation, authorization, tests, and documentation have been implemented.

## Current state

Uptime Gizmo already exposes HTTP routes through Express. The current routes include:

- `/api/entry-page`
- `/api/push/:pushToken`
- `/api/badge/:id/status`
- `/api/badge/:id/uptime/:duration?`
- `/api/badge/:id/ping/:duration?`
- `/api/badge/:id/avg-response/:duration?`
- `/api/badge/:id/cert-exp`
- `/api/badge/:id/response`
- `/api/status-page/:slug`
- `/api/status-page/heartbeat/:slug`
- `/api/status-page/:slug/incident-history`
- `/metrics`

These routes are established public, badge, push, status-page, and metrics interfaces. They must remain backward compatible. The new management API should use a separate versioned prefix rather than changing their response formats or authentication behavior.

The authenticated application currently performs management operations through Socket.IO events registered in [server/server.js](../../server/server.js) and [server/socket-handlers](../../server/socket-handlers). The REST API should call the same domain models and shared service logic where practical, but it must not invoke Socket.IO events internally or duplicate authorization rules in the frontend.

## Scope

### In scope

- A versioned management API under `/api/v1`.
- Read and write operations for monitors, heartbeats, statistics, tags, maintenance windows, status pages, incidents, notifications, API keys, proxies, Docker hosts, and remote browsers where the existing domain behavior supports them.
- API-key authentication compatible with the existing API-key records.
- Resource ownership and administrative authorization checks.
- Consistent request validation, response envelopes, error handling, pagination, filtering, and sorting.
- OpenAPI documentation generated or maintained from the implemented contract.
- Automated route, authorization, validation, and regression tests.

### Out of scope for the first release

- Replacing the existing Socket.IO API used by the web application.
- Removing or versioning existing public endpoints.
- Introducing a second persistence layer or a separate API service.
- Adding OAuth2, OpenID Connect, webhooks, or external API gateways.
- Exposing passwords, notification secrets, monitor credentials, API-key secrets, or other sensitive fields.
- Creating a broad admin API for internal database maintenance unless an explicit use case and authorization model are defined.

## Design principles

1. **Stable contracts.** Once `/api/v1` is released, additive changes are preferred. Breaking changes require a new version or a documented migration.
2. **Least privilege.** Every authenticated request must be evaluated against the owning user or an explicit administrative capability.
3. **One domain behavior.** REST and Socket.IO operations should converge on shared model/service behavior so validation and side effects do not diverge.
4. **Explicit state transitions.** Actions such as pause, resume, resolve, and enable should use named action endpoints instead of accepting arbitrary state mutations.
5. **Safe defaults.** Pagination limits, field selection, sort fields, and filters must be bounded and allow-listed.
6. **Operational clarity.** Errors must be machine-readable, logs must be useful without containing secrets, and responses must make ownership and state visible.
7. **Compatibility first.** Existing public routes, status pages, push URLs, metrics, Socket.IO events, and UI behavior remain unchanged.

## Target architecture

```text
HTTP/HTTPS server
        ↓
Express middleware: JSON parsing, request identity, rate limits
        ↓
/api/v1 router
        ↓
Authentication and authorization middleware
        ↓
Request schemas and route handlers
        ↓
Shared service/domain layer
        ↓
Existing models, database, notifications, and Socket.IO events
```

The implementation should follow the existing server structure:

```text
server/
├── routers/
│   ├── api-router.js              # Existing public and utility API
│   ├── status-page-router.js      # Existing public status-page API
│   └── v1/                        # New versioned REST API
│       ├── index.js
│       ├── monitor-router.js
│       ├── maintenance-router.js
│       ├── status-page-router.js
│       └── ...
├── services/                      # Shared behavior introduced as needed
├── auth.js
├── model/
└── server.js
```

The exact service directory may be adjusted to match existing conventions. A service should be introduced when a behavior is used by more than one transport or when a route would otherwise contain a transaction, ownership check, notification side effect, and Socket.IO broadcast all at once.

## URL and HTTP conventions

### Base URL

The initial base path is:

```text
/api/v1
```

Examples:

```text
GET    /api/v1/monitors
GET    /api/v1/monitors/42
POST   /api/v1/monitors/42/pause
GET    /api/v1/maintenances?limit=50&cursor=...
```

Do not add a trailing slash requirement. Routes should behave consistently with or without a trailing slash only if Express configuration makes that behavior explicit; do not rely on accidental router matching.

### Methods and status codes

| Operation | Method | Success status |
| --- | --- | ---: |
| List resources | `GET` | `200` |
| Read a resource | `GET` | `200` |
| Create a resource | `POST` | `201` |
| Replace a resource | `PUT` | `200` |
| Partially update a resource | `PATCH` | `200` |
| Delete a resource | `DELETE` | `204` or `200` with an explicit response body |
| Trigger a named action | `POST` | `200` or `202` when asynchronous |

Use `400` for malformed or invalid input, `401` for missing or invalid credentials, `403` for an authenticated caller without permission, `404` for a missing or inaccessible resource, `409` for a state or uniqueness conflict, `422` for structurally valid but semantically invalid input when that distinction is useful, `429` for rate limiting, and `5xx` for server failures.

### Content types

Management endpoints accept and return JSON:

```http
Content-Type: application/json
Accept: application/json
```

The server already enables `express.json()` during startup. Payload size limits should be reviewed before accepting large status-page images or other binary-like fields through JSON.

## Authentication and authorization

### Authentication

Use the existing `apiAuth` middleware from [server/auth.js](../../server/auth.js). It currently supports the configured API-key mode and falls back to username/password Basic Auth when API keys are not enabled.

The recommended API-key request format is:

```http
Authorization: Basic <base64(username:api-key)>
```

The username is not used for API-key verification by the current implementation, but clients should send a stable placeholder such as `api` rather than relying on an undocumented empty username.

Do not introduce a second API-key format in the first version. Do not accept API keys through query parameters, request bodies, or URL paths.

### Authorization

Authentication alone is insufficient. Each route must enforce:

- The API key is active and not expired.
- The target resource belongs to the authenticated user, unless the project has an explicit administrative role model for that operation.
- Related resources also belong to the same user. For example, a monitor cannot be attached to another user's maintenance window.
- Destructive actions require the same ownership and permission checks as the equivalent Socket.IO operation.
- Secrets are write-only where possible and are never returned after creation.

The existing API-key verifier validates key state and expiry, but route-level ownership context must still be added to the request. If the current middleware does not expose the API-key owner, extend it in a backward-compatible way or add a dedicated API-auth middleware that attaches a sanitized principal to `req.user`.

Do not infer ownership from a client-provided `user_id` field. The authenticated principal is authoritative.

### Authentication errors

Return `401` for absent or invalid credentials and include a standard challenge where appropriate:

```http
WWW-Authenticate: Basic realm="Uptime Gizmo API"
```

Return `403` only after the caller has been authenticated but lacks permission.

## Response contract

### Single resource

```json
{
  "ok": true,
  "data": {
    "id": 42,
    "name": "Primary website",
    "type": "http"
  }
}
```

### Collection

```json
{
  "ok": true,
  "data": [
    {
      "id": 42,
      "name": "Primary website"
    }
  ],
  "pagination": {
    "limit": 50,
    "nextCursor": "eyJpZCI6NDJ9",
    "hasMore": false
  }
}
```

For an empty collection, return `200` with an empty `data` array. Do not use `404` for an empty list.

### Error response

Use one documented shape for new versioned endpoints:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The monitor URL must use http or https.",
    "fields": {
      "url": "Invalid URL scheme"
    },
    "requestId": "req_01J..."
  }
}
```

The existing `sendHttpError()` helper may continue serving legacy routes. For `/api/v1`, introduce a compatible structured error helper rather than changing old response formats. Error messages must not contain SQL, stack traces, credentials, tokens, or local filesystem paths.

## Resource model and endpoint inventory

The following inventory is the proposed first-release surface. Each endpoint must be confirmed against the existing model and permission behavior before implementation.

### Monitors

```text
GET    /api/v1/monitors
POST   /api/v1/monitors
GET    /api/v1/monitors/:id
PATCH  /api/v1/monitors/:id
DELETE /api/v1/monitors/:id
POST   /api/v1/monitors/:id/pause
POST   /api/v1/monitors/:id/resume
GET    /api/v1/monitors/:id/heartbeats
GET    /api/v1/monitors/:id/statistics
GET    /api/v1/monitors/:id/events
DELETE /api/v1/monitors/:id/events
DELETE /api/v1/monitors/:id/heartbeats
```

List query parameters should be explicitly allow-listed. The initial set may include `limit`, `cursor`, `status`, `type`, `tag`, `search`, `sort`, and `order`. Never pass arbitrary query strings directly into SQL.

Pause and resume are named actions because they represent domain transitions and may emit notifications or Socket.IO updates. They should be idempotent: pausing an already paused monitor should return the current paused state rather than create a second side effect.

### Tags

```text
GET    /api/v1/tags
POST   /api/v1/tags
PATCH  /api/v1/tags/:id
DELETE /api/v1/tags/:id
POST   /api/v1/monitors/:monitorId/tags
DELETE /api/v1/monitors/:monitorId/tags/:tagId
```

Tag attachment and removal must validate both the monitor and tag ownership.

### Maintenance windows

```text
GET    /api/v1/maintenances
POST   /api/v1/maintenances
GET    /api/v1/maintenances/:id
PATCH  /api/v1/maintenances/:id
DELETE /api/v1/maintenances/:id
POST   /api/v1/maintenances/:id/pause
POST   /api/v1/maintenances/:id/resume
PUT    /api/v1/maintenances/:id/monitors
PUT    /api/v1/maintenances/:id/status-pages
```

Validate time zones, start and end ordering, recurrence fields, and referenced resource ownership before writing.

### Status pages and incidents

```text
GET    /api/v1/status-pages
POST   /api/v1/status-pages
GET    /api/v1/status-pages/:slug
PATCH  /api/v1/status-pages/:slug
DELETE /api/v1/status-pages/:slug
POST   /api/v1/status-pages/:slug/incidents
PATCH  /api/v1/status-pages/:slug/incidents/:incidentId
DELETE /api/v1/status-pages/:slug/incidents/:incidentId
POST   /api/v1/status-pages/:slug/incidents/:incidentId/resolve
GET    /api/v1/status-pages/:slug/incidents
```

Slug uniqueness, public/private visibility, incident ownership, and status-page domain mapping must follow existing status-page behavior. Image data and custom CSS require explicit size and content validation.

### Notifications

```text
GET    /api/v1/notifications
POST   /api/v1/notifications
PATCH  /api/v1/notifications/:id
DELETE /api/v1/notifications/:id
POST   /api/v1/notifications/:id/test
```

Notification provider credentials must be write-only. A response may include provider type and non-sensitive configuration, but must return masked or omitted secrets.

### API keys

```text
GET    /api/v1/api-keys
POST   /api/v1/api-keys
DELETE /api/v1/api-keys/:id
POST   /api/v1/api-keys/:id/enable
POST   /api/v1/api-keys/:id/disable
```

The clear-text key must be returned exactly once in the create response over HTTPS. It must never be stored or logged in clear text. Existing key format, expiry, active state, and rate-limit behavior must remain compatible with [server/model/api_key.js](../../server/model/api_key.js) and [server/auth.js](../../server/auth.js).

### Integration resources

Where supported by existing models and configuration, add equivalent CRUD and test endpoints for:

```text
/api/v1/proxies
/api/v1/docker-hosts
/api/v1/remote-browsers
```

These resources often contain credentials or connection URLs. Apply the same secret redaction and ownership rules as notifications.

## Validation

Every write endpoint must validate the complete request before performing side effects. Validation should cover:

- Required and optional fields.
- Primitive types and allowed enum values.
- URL schemes and hostname formats.
- Numeric ranges and integer constraints.
- Date, duration, and time-zone formats.
- Maximum string, array, object, image, and JSON sizes.
- Unknown fields, according to whether the endpoint uses strict or forward-compatible input.
- Cross-resource ownership and referential integrity.

Prefer a single schema implementation per resource so REST and future integrations do not accumulate subtly different validation rules. If a validation library is introduced, evaluate bundle size, CommonJS compatibility, maintenance status, and how it reports nested field errors before adding it as a dependency.

## Pagination, filtering, and concurrency

Collection endpoints should use cursor pagination for data that changes frequently, especially monitors, heartbeats, events, and incidents. Offset pagination may be used for small, stable administrative collections when the model already exposes it safely.

Recommended defaults:

- Default `limit`: `50`.
- Maximum `limit`: `100` unless a resource has a lower safe bound.
- Stable ordering: explicit `created_at`, `updated_at`, or domain timestamp plus a unique tie-breaker.
- Invalid sort fields: reject with `400`; never interpolate them directly into SQL.

For updates, support optimistic concurrency where practical. An `If-Match` or resource version check is preferable for status-page configuration, monitor editing, and other fields where last-write-wins could silently overwrite an operator's changes. If concurrency control is not implemented in the first release, document last-write-wins behavior explicitly.

## Side effects and Socket.IO compatibility

REST mutations must preserve the side effects users receive through the existing web application:

- Persist the domain change through the existing model or shared service.
- Emit the same relevant Socket.IO updates to affected authenticated clients.
- Trigger notifications only through the existing notification path.
- Reuse existing cache invalidation and statistics update behavior.
- Return only after the synchronous part of the mutation is complete; use `202` only for a deliberately asynchronous operation.

Do not implement REST by creating a synthetic Socket.IO client and emitting an internal event. That would couple HTTP behavior to transport details and make authorization and error handling difficult to reason about.

## HTTP and HTTPS behavior

The existing `UptimeGizmoServer` creates either an HTTP or HTTPS server before attaching Express. New REST routes are therefore transport-independent: the same route is served over whichever protocol the instance is configured to use.

The implementation must:

- Avoid hard-coding `http://` or `https://` in route logic.
- Never return API keys or credentials over a connection that is not protected by TLS in production.
- Preserve the existing reverse-proxy and forwarded-host behavior.
- Document proxy termination requirements when TLS terminates before Uptime Gizmo.
- Keep CORS restrictive for authenticated browser clients; public endpoints may retain their existing explicit CORS behavior.

## Rate limiting and abuse protection

Use the existing API rate-limiter foundation in [server/auth.js](../../server/auth.js). Add route-specific limits where the operation is expensive or has side effects:

- Reads: normal authenticated API limit.
- Creates and updates: lower per-key limit.
- Notification tests, remote-browser tests, Docker tests, and similar probes: substantially lower limit.
- Bulk operations: explicit maximum item count and a separate limit.

Return `429` with a structured error and, when available, a `Retry-After` header. Rate-limit logs should identify a sanitized key ID or request principal, never the clear-text key.

## Observability

Each request should have a request ID, either accepted from a trusted correlation header or generated by the server. Include it in the response error object and structured logs.

Log at minimum:

- HTTP method and normalized route template.
- Response status and duration.
- Authenticated principal or API-key ID, never the secret.
- Resource ID where safe.
- Validation, authorization, and unexpected failure categories.

Do not log request bodies for endpoints that can contain passwords, tokens, notification credentials, monitor authentication, private status-page content, or uploaded data.

## Implementation phases

### Phase 0 — Contract and inventory

1. Confirm the existing model methods, Socket.IO behavior, ownership checks, API-key owner relationship, and public-route compatibility.
2. Produce an endpoint matrix mapping each proposed route to its model method, authorization rule, side effects, and test owner.
3. Decide the structured error and pagination contracts.
4. Identify sensitive fields and define redaction rules.

**Exit criteria:** all first-release endpoints have an owner, authorization rule, validation source, and compatibility decision.

### Phase 1 — Router and middleware foundation

1. Add `/api/v1` router registration.
2. Add versioned error, request ID, principal, and validation helpers.
3. Extend API authentication only as needed to expose a sanitized principal and preserve existing callers.
4. Add route-level rate-limit hooks.
5. Add a minimal health-safe route or authenticated identity route only if operationally necessary; do not expose database or environment details.

**Exit criteria:** an authenticated, tested versioned route can return a resource and a structured error without affecting legacy routes.

### Phase 2 — Read-only resources

Implement monitor, maintenance, status-page, incident, tag, notification, and integration list/detail endpoints. Add pagination, filtering, field redaction, ownership checks, and tests before write operations.

**Exit criteria:** read-only automation clients can retrieve all approved resource data without receiving secrets or other users' records.

### Phase 3 — Safe mutations and state actions

Implement create, update, delete, pause, resume, resolve, enable, disable, and test operations. Extract shared services when necessary to preserve Socket.IO updates and notification side effects.

**Exit criteria:** each mutation has validation, authorization, transaction/error behavior, idempotency expectations, side-effect tests, and a documented response.

### Phase 4 — Documentation and compatibility release

1. Add OpenAPI documentation for the implemented subset only.
2. Add examples for API-key authentication, pagination, errors, monitor lifecycle, and destructive operations.
3. Add a changelog entry and migration notes.
4. Verify old public routes and the Vue application remain unchanged.

**Exit criteria:** the published contract matches the implementation and can be used without reading server source code.

## Testing and verification

### Automated tests

For every endpoint, cover:

- Success response and response shape.
- Missing, malformed, and boundary input.
- Missing, invalid, expired, and disabled credentials.
- Cross-user resource access.
- Resource not found behavior.
- Duplicate or conflicting operations.
- Sensitive-field redaction.
- Rate limiting for expensive operations.
- Database failure and notification failure behavior where relevant.
- Socket.IO refresh/broadcast behavior for mutations.

Use the existing backend test conventions under `test/backend-test`. Prefer isolated database fixtures and local fakes for external notification, Docker, browser, and network integrations.

### Manual verification

- HTTP and HTTPS deployments.
- Reverse-proxy deployment with forwarded headers.
- API-key mode and Basic Auth fallback mode.
- Disabled-auth development mode, ensuring no production assumption is introduced.
- Empty collections, large collections, long strings, Unicode, and invalid UTF-8 handling.
- Public status pages and legacy push/badge/metrics endpoints.
- Existing web UI login, dashboard loading, monitor editing, maintenance, status-page editing, and API-key management.

### Quality gates

Run the narrowest relevant checks after each phase and the full applicable suite before release:

```text
pnpm run lint
pnpm run build
Relevant backend tests
API integration tests
```

The exact package-manager command should follow the repository's active package scripts. Do not mark the plan complete if tests were skipped because the route contract or authorization behavior remains unverified.

## Security checklist

- [ ] All management routes use authentication middleware.
- [ ] Every resource query is scoped to the authenticated principal.
- [ ] API keys are never accepted in URLs or logged.
- [ ] Clear-text API keys are returned only once and only on creation.
- [ ] Passwords, tokens, cookies, monitor credentials, notification secrets, and private configuration are redacted.
- [ ] Input sizes and query limits are bounded.
- [ ] Sort and filter fields are allow-listed.
- [ ] Mutations are protected against cross-user references.
- [ ] Expensive test actions have separate rate limits.
- [ ] Error messages do not expose SQL, stack traces, filesystem paths, or secrets.
- [ ] HTTPS and reverse-proxy deployment behavior is documented.
- [ ] Legacy public endpoints retain their existing security and compatibility behavior.

## Definition of done

The REST API plan is complete only when the implemented `/api/v1` subset has:

1. A reviewed and documented request/response contract.
2. Consistent authentication, authorization, validation, error, pagination, and rate-limit behavior.
3. Tests for success, failure, ownership, redaction, and relevant side effects.
4. No regression in Socket.IO, public status pages, push URLs, badge endpoints, metrics, or the existing web UI.
5. OpenAPI documentation that describes only routes that are actually available.
6. Deployment guidance for both HTTP development environments and HTTPS production environments.

