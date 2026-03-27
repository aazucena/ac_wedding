# directus-extension-api-gateway

A Directus bundled extension that turns webhook flows into a clean, versioned, documented HTTP API — without exposing internal flow UUIDs to callers.

## Motivation

Directus webhook flows are a convenient way to build server-side logic, but out of the box they're only reachable at `/flows/trigger/<uuid>`. That means:

- Every caller needs to know the internal UUID of the flow — a detail that leaks implementation and breaks if the flow is recreated.
- There's no method enforcement: any HTTP verb reaches any flow.
- There's no schema validation on the request body.
- Auth is all-or-nothing at the Directus level — you can't mark individual endpoints as public or protected.
- There's nothing to hand to a frontend developer: no spec, no type definitions, no docs.

As a project grows, the frontend code accumulates raw UUIDs and manual type definitions copied by hand. The breaking point comes when a flow is recreated (which Directus does on schema import) — every UUID has to be hunted down and updated across every caller.

This extension solves all of that in one place:

- Flows are reachable by a **stable, human-readable key** (`/api/v1/send_welcome_email`) that survives flow recreation.
- The endpoint layer enforces the **HTTP method**, validates the **request body schema**, and checks **auth** before the request ever reaches the flow.
- An **OpenAPI 3.0 spec** is generated live from the registry, so the frontend always has an accurate contract.
- A **Swagger UI** is served at `/api/docs` for interactive exploration — all assets are proxied same-origin to satisfy Directus's CSP.
- A **code export** endpoint generates TypeScript interfaces, Zod schemas, JSON Schema, OpenAPI fragments, and more from the field definitions stored in the registry.

## How it works

The extension has three parts:

**Hook** — runs on server start and on flow lifecycle events.
- Creates (or migrates) the `api_endpoints` table.
- On startup: syncs the table to match the current set of webhook flows — user-configured data (schemas, tags, descriptions) survives the sync.
- On flow create: auto-registers a new row with a key derived from the flow name.
- On flow delete: removes the corresponding row.

**Endpoint** (`/api/*`) — Express routes mounted inside Directus.
- `GET /api/keys` — registry dump used by the frontend SDK client.
- `GET /api/openapi.json` — live OpenAPI 3.0 spec built from enabled endpoint rows.
- `GET /api/docs` — Swagger UI shell; assets served same-origin at `/api/docs/swagger-ui.*`.
- `GET /api/v1/export/:key` — generates typed source code from the stored field definitions.
- `ALL /api/:version/:key` — the proxy: validates method + schema + auth, then forwards to `/flows/trigger/:flowId`.

**Module** — admin UI panel in the Directus sidebar.
- Lists all registered endpoints with status, method, and version.
- Overview dashboard with stats and quick links to the spec and docs.
- Per-endpoint editor: key, enabled toggle, auth flag, deprecated flag, version, tags, description.
- Drag-and-drop field repeater for request and response schemas.
- Live export preview with language and variant selector.

## API reference

| Route | Method | Description |
|---|---|---|
| `/api/keys` | GET | Map of `key → { id, method, request_schema, response_schema }` |
| `/api/openapi.json` | GET | OpenAPI 3.0 spec for all enabled endpoints |
| `/api/docs` | GET | Swagger UI (interactive docs) |
| `/api/v1/export/:key` | GET | Generated source code (`?lang=typescript&format=interface`) |
| `/api/:version/:key` | ANY | Proxy to the matching webhook flow |

### Proxy behaviour

1. Key is normalised to `snake_case` (kebab-case input is accepted).
2. HTTP method is enforced — `405` if wrong.
3. For `POST`/`PUT`/`PATCH`: request body is validated against `request_schema` via `jsonschema` — `422` with error details if invalid.
4. If `auth_required` is set: `Authorization` header must be present — `401` otherwise.
5. Request is forwarded to `POST /flows/trigger/:flowId`. The upstream response (JSON or plain text) is relayed back with its original status code.
6. If the endpoint is marked `deprecated`, a `Deprecation: true` header is added to the response.

### Export query params

| Param | Default | Options |
|---|---|---|
| `lang` | `typescript` | `typescript`, `javascript`, `python`, `rust`, `go`, `kotlin`, `java`, `csharp`, `php`, `cpp`, `ruby`, `graphql`, `openapi`, `postman`, `json`, `sql` |
| `format` | `interface` | `interface`, `type`, `zod`, `class`, ... (varies by lang) |
| `download` | — | If present, response is sent as a file attachment |

## Source layout

```
src/
├── shared/
│   └── schema-export.ts       # Field → JSON Schema + code generation
├── hook/
│   ├── index.ts               # Hook entry (server.start, items.create/delete)
│   └── lib/
│       ├── sync.ts            # syncTable(): create/migrate/sync api_endpoints
│       └── utils.ts           # toFlowKey(), parseOptions()
├── endpoint/
│   ├── index.ts               # Endpoint entry (thin shell)
│   └── lib/
│       ├── types.ts           # EndpointRow, TABLE, parseJson/FieldArray/Tags
│       ├── swagger.ts         # registerSwaggerRoutes() — /docs + asset proxy
│       ├── openapi.ts         # registerOpenApiRoute() — GET /openapi.json
│       ├── proxy.ts           # registerProxyRoute()   — ALL /:version/:key
│       └── export.ts          # registerExportRoute()  — GET /v1/export/:key
└── module/
    ├── index.ts               # Module entry
    ├── module.vue             # Root shell: sidebar + composable wiring
    ├── types.ts               # Interfaces, constants, GatewayContext injection key
    ├── utils.ts               # toSnake(), parseTagArray(), parseFieldArray()
    ├── shims.d.ts             # Vue SFC shim
    ├── components/
    │   ├── OverviewPage.vue   # Dashboard: stats, endpoint table, quick links
    │   └── FlowDetail.vue     # Per-endpoint editor + field repeater + export panel
    └── composables/
        ├── useFlows.ts        # Flow list loading + selection state
        ├── useMetadata.ts     # Key editing, save/discard, tags, enabled/deprecated toggles
        ├── useFields.ts       # Field repeater CRUD + drawer state
        └── useExport.ts       # Export format/variant selection + code generation
```

## Development

```bash
# from the extension directory
pnpm build      # production build → dist/
pnpm dev        # watch mode (no minify)
npx tsc --noEmit  # type check (Vue files excluded — checked by the IDE)
```

Requires Directus `^10.10.0`.
