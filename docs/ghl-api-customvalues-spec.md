# GHL LeadConnector v2 — Location Custom Values API Spec

*Verified reference for the two endpoints used by `scripts/prepare-weekly-email.js`.*
*Last verified: 2026-04-17*
*Source: GoHighLevel official OpenAPI spec at `apps/locations.json` in https://github.com/GoHighLevel/highlevel-api-docs (main branch).*
*Cross-referenced with the patterns used by `functions/api/submit.js` and `functions/api/unsubscribe.js` in this repo.*

---

## Conventions shared by both endpoints

- **Base URL:** `https://services.leadconnectorhq.com` (confirmed in the spec's `servers[0].url`; matches what `submit.js`/`unsubscribe.js` already use)
- **Auth:** `Authorization: Bearer <token>` — same scheme as existing Cloudflare Functions
- **API version pin:** `Version: 2021-07-28` — enum-locked in the spec; required on every call
- **Content type:** `Content-Type: application/json` on any request with a body
- **OAuth scopes (only relevant if using an OAuth app token):**
  - `locations/customValues.readonly` — list/get
  - `locations/customValues.write` — create/update/delete
  - Private Integration tokens (`pk_live_...`) must have these scopes enabled in the PIT configuration for write calls to succeed.

---

## A. List all Custom Values for a location

**Operation:** `get-custom-values`

### Pre-flight check (recommended one-time use)

This endpoint is the natural sanity check before any write. From the future `scripts/` directory, a small `scripts/check-ghl-connection.js` should call this endpoint and:

- Confirm `GHL_API_KEY` in `.env` has read access to the location identified by `GHL_LOCATION_ID`.
- Confirm `GHL_CV_ID_THIS_WEEK` and `GHL_CV_ID_FUTURE_WEEKS` in `.env` match real ids returned by the list (by comparing each env id against every returned `customValues[].id` and printing the matching `name` / `fieldKey` pair on success, or an explicit mismatch message on failure).
- Exit non-zero on any mismatch so a failing `check-ghl-connection.js` becomes a natural guard before `prepare-weekly-email.js` runs.

Build this script when `prepare-weekly-email.js` is built. Don't build it yet — this subsection documents the intent only.

### Endpoint

| | |
|---|---|
| Method | `GET` |
| URL | `https://services.leadconnectorhq.com/locations/{locationId}/customValues` |
| Path params | `locationId` (string, required) — the sub-account (formerly location) id |
| Query params | none |
| Request body | none |

### Headers

| Name | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <GHL_API_KEY>` | yes |
| `Version` | `2021-07-28` | yes |
| `Accept` | `application/json` | recommended |

### 2xx response shape

`200 OK` — body matches schema `CustomValuesListSuccessfulResponseDto`:

```json
{
  "customValues": [
    {
      "id": "rWQ709Pb62syqGLceg1x",
      "name": "Custom Field",
      "fieldKey": "{{ custom_values.custom_field }}",
      "value": "Value",
      "locationId": "rWQ709Pb6dasyqGLceg1x"
    }
  ]
}
```

Each array item is a `CustomValueSchema`. `fieldKey` is the merge-field syntax that appears in email templates — useful for matching items to template merges.

### Error response shapes

| Status | Schema | Example body |
|---|---|---|
| `400` | `BadRequestDTO` | `{"statusCode": 400, "message": "Bad Request"}` |
| `401` | `UnauthorizedDTO` | `{"statusCode": 401, "message": "Invalid token: access token is invalid", "error": "Unauthorized"}` |

### Node 22 snippet (native fetch, no deps)

```javascript
// Run: node --env-file=.env scripts/whatever.js
const { GHL_API_KEY, GHL_LOCATION_ID } = process.env;

const res = await fetch(
  `https://services.leadconnectorhq.com/locations/${GHL_LOCATION_ID}/customValues`,
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      Version: '2021-07-28',
      Accept: 'application/json'
    }
  }
);

if (!res.ok) {
  throw new Error(`GHL list customValues failed ${res.status}: ${await res.text()}`);
}

const { customValues } = await res.json();
// customValues: Array<{ id, name, fieldKey, value, locationId }>
```

---

## B. Update a single Custom Value by ID

**Operation:** `update-custom-value`

| | |
|---|---|
| Method | `PUT` (verified — not PATCH) |
| URL | `https://services.leadconnectorhq.com/locations/{locationId}/customValues/{id}` |
| Path params | `locationId` (string, required); `id` (string, required) — the custom-value id |
| Query params | none |
| Request body | `customValuesDTO` — see below |

### Headers

| Name | Value | Required |
|---|---|---|
| `Authorization` | `Bearer <GHL_API_KEY>` | yes |
| `Version` | `2021-07-28` | yes |
| `Content-Type` | `application/json` | yes |
| `Accept` | `application/json` | recommended |

### Request body shape (`customValuesDTO`)

```json
{
  "name": "WAB - Weekly This Week",
  "value": "Wednesday, April 22 — 10:15–10:45 AM\nCongregation Coffee, 3060 Forest Hill Irene Rd, Germantown, TN 38138"
}
```

**Both `name` and `value` are `required` per the spec.** Do not omit `name` — the spec does not declare this as a partial-update endpoint. Send the current name verbatim (match whatever was set at creation, preserving spaces and hyphens).

### 2xx response shape

`200 OK` — body matches schema `CustomValueIdSuccessfulResponseDto`:

```json
{
  "customValue": {
    "id": "rWQ709Pb62syqGLceg1x",
    "name": "WAB - Weekly This Week",
    "fieldKey": "{{ custom_values.wab___weekly_this_week }}",
    "value": "Wednesday, April 22 — 10:15–10:45 AM\n...",
    "locationId": "rWQ709Pb6dasyqGLceg1x"
  }
}
```

Note the response envelope is `{customValue: ...}` (singular), distinct from the list response's `{customValues: [...]}`.

### Error response shapes

| Status | Schema | Example body |
|---|---|---|
| `400` | `BadRequestDTO` | `{"statusCode": 400, "message": "Bad Request"}` |
| `401` | `UnauthorizedDTO` | `{"statusCode": 401, "message": "Invalid token: access token is invalid", "error": "Unauthorized"}` |
| `422` | `UnprocessableDTO` | `{"statusCode": 422, "message": ["Unprocessable Entity"], "error": "Unprocessable Entity"}` |

### Node 22 snippet (native fetch, no deps)

```javascript
// Run: node --env-file=.env scripts/prepare-weekly-email.js
const {
  GHL_API_KEY,
  GHL_LOCATION_ID,
  GHL_CV_ID_THIS_WEEK
} = process.env;

const res = await fetch(
  `https://services.leadconnectorhq.com/locations/${GHL_LOCATION_ID}/customValues/${GHL_CV_ID_THIS_WEEK}`,
  {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GHL_API_KEY}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      name: 'WAB - Weekly This Week',
      value: 'Wednesday, April 22 — 10:15–10:45 AM\nCongregation Coffee, 3060 Forest Hill Irene Rd, Germantown, TN 38138'
    })
  }
);

if (!res.ok) {
  throw new Error(`GHL update customValue failed ${res.status}: ${await res.text()}`);
}

const { customValue } = await res.json();
// customValue: { id, name, fieldKey, value, locationId }
```

---

## Known uncertainties

1. **Stoplight docs are being deprecated.** HighLevel is moving canonical API docs to `marketplace.gohighlevel.com/docs/`. The marketplace page for `update-custom-value` is client-rendered and could not be scraped server-side for full body/response details. The spec above is sourced from GoHighLevel's public OpenAPI repo, which is the machine-readable source behind both sites, but the repo's update cadence vs. the live API is not publicly documented. Re-verify if behavior disagrees with this spec.
2. **Partial updates not supported per spec, but behavior unverified.** The OpenAPI spec marks both `name` and `value` as required on `PUT`. The API may in practice accept `{value}` alone, but relying on that would be off-spec. This document assumes you always send `{name, value}`.
3. **Response envelope on UPDATE.** The spec says `{customValue: CustomValueSchema}` on 200. This matches create/get-one. Confirmed in the OpenAPI schema; not confirmed against a live API call in this session.
4. **Scope enforcement on Private Integration Tokens.** The existing `functions/api/submit.js` uses a bearer token scoped for `/contacts/upsert`. Whether the same token (`GHL_API_KEY` in `.env`) has `locations/customValues.write` enabled cannot be verified without a live call. If the first write returns 401 or 403, open the PIT in GHL Settings → Private Integrations and enable the two Custom Values scopes, then retry. Also verify the token value in `.env` matches the token currently active in Cloudflare Pages environment variables — rotating one and not the other is a common drift trap, and a stale `.env` copy will produce the same 401/403 symptom even when the scopes are correct on the live token.
5. **Rate limits and 5xx shapes.** The spec does not document `429` or `5xx` response shapes for these endpoints. Scripts should treat any non-2xx defensively and surface the raw response text in the error message (as the snippets above do).
6. **`Version: 2021-07-28`.** The spec's header enum lists only this one value. No newer version is advertised; no deprecation notice seen. Monitor release notes.

---

## Quick-reference summary

| | List | Update |
|---|---|---|
| Method | `GET` | `PUT` |
| Path | `/locations/{locationId}/customValues` | `/locations/{locationId}/customValues/{id}` |
| Body | none | `{name, value}` — both required |
| Response root | `{customValues: [...]}` | `{customValue: {...}}` |
| Scope | `locations/customValues.readonly` | `locations/customValues.write` |
