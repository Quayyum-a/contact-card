# Creator Card Microservice — Engineering PRD & Implementation Plan

**Author:** Quayyum
**Purpose:** Working PRD for the `the17thstudio/node-template` technical assessment (Creator Card link-in-bio API)
**Status:** Ready for implementation
**Submission deadline:** _[fill in — not stated in source materials]_

> **Heads-up on a mix-up source:** the template repo (`the17thstudio/node-template`) ships with its own `assessment.md` describing a *different* exercise — a payment-instruction parser (`POST /payment-instructions`). That is a leftover from a previous assessment cohort and is **not** your task. Your task is the Creator Card API exactly as specified in `CREATOR_CARD_PRD.md` / the brief you were given. The template's architecture conventions (services, endpoints, messages, VSL specs) still apply — just not that file's business logic. Worth a one-line mention in your submission notes so a reviewer isn't confused if they open the repo and see it.

This PRD was built by reading your two spec documents **and** cloning and reading the actual template source code (not just its docs/README, which in a few places describe behavior the code doesn't actually have). Section 6 is the part you most need to internalize before writing any code — it's the difference between "looks right locally" and "passes all 16 test cases."

---

## 1. Executive Summary

Build a 3-endpoint REST API (`POST /creator-cards`, `GET /creator-cards/:slug`, `DELETE /creator-cards/:slug`) that lets a creator publish a public, shareable "link-in-bio + rate card" profile. Persistence is MongoDB via the template's repository pattern; validation is split between the template's VSL validator (field-level) and your services (business rules: slug uniqueness, conditional access codes, retrieval access control). No auth. No URL versioning. Deployed publicly on Render/Heroku/similar.

The functional spec is fully defined already (entity shape, 3 endpoints, 7 custom error codes, 16 test cases). The engineering risk isn't "what to build," it's "how to make the template's actual runtime behavior produce the **exact** JSON the spec demands." That gap is real and is documented in Section 6.

---

## 2. Goals / Definition of Done

- [ ] All 3 endpoints implemented and passing all 16 documented test cases (12 valid, 4 invalid)
- [ ] Response bodies match the spec **exactly** — including a top-level `"code"` field on every business-rule error, which the template does not produce out of the box (see §6.1)
- [ ] `_id` → `id` mapping correct in every response; `access_code` present on create, absent on retrieval
- [ ] `deleted` serializes as `null` when not deleted (template's internal default is `0`, not `null` — see §6.3)
- [ ] Slug uniqueness enforced globally, auto-generation deterministic and collision-safe
- [ ] Deleted cards are unretrievable (`NF01`) and the DELETE response still reflects the card's *original* field values, not a mutated one (see §6.2 — this is the single easiest test case to silently fail)
- [ ] No regex used anywhere in slug/url custom validation logic, consistent with the template's house convention (see §6.5)
- [ ] Deployed, publicly reachable, no auth, endpoints at root (no `/v1` or `/api` prefix)
- [ ] Code follows template conventions: two-parameter services, validate-first, single exit point, `throwAppError` + `messages/`, no `console.log`

## 3. Out of Scope / Non-Goals

- Authentication/authorization of any kind (explicitly forbidden by the brief)
- Updating/editing an existing card (not in the 3-endpoint spec — don't build it)
- Rate limiting, pagination, search/listing of cards (not requested)
- The template's existing `onboarding/login` example — leave it in place unless it gets in your way; it's unrelated to this domain and doesn't need to be removed for grading, just don't let it block your `app.js` registration changes

---

## 4. Data Model

| Field | Type | Constraints | DB representation | API representation |
|---|---|---|---|---|
| `id` | string (ULID) | 26 chars | `_id` | `id` |
| `title` | string | 3–100 chars | as-is | as-is |
| `description` | string | optional, max 500 | as-is | as-is |
| `slug` | string | 5–50 chars, unique, `[a-zA-Z0-9_-]+` | `unique:true, index:true` | as-is (see §6.2 for delete caveat) |
| `creator_reference` | string | exactly 20 chars | as-is | as-is |
| `links[]` | array `{title, url}` | title 1–100, url max 200 + `http(s)://` prefix | as-is | as-is |
| `service_rates` | object `{currency, rates[]}` | optional | as-is | as-is |
| `status` | string | `draft`\|`published` | as-is | as-is |
| `access_type` | string | `public`\|`private`, default `public` | as-is | as-is |
| `access_code` | string\|null | exactly 6 alphanumeric, required iff private | as-is | **present** on create/delete responses, **omitted entirely** on retrieval |
| `created` | number | epoch ms | auto-set by repository | as-is |
| `updated` | number | epoch ms | auto-set by repository | as-is |
| `deleted` | number\|null | epoch ms or null | **defaults to `0`**, not `null` | must be normalized to `null` when `0` |

---

## 5. API Contract

This is unchanged from your brief — restated compactly here for reference while building; treat your original spec doc as the source of truth for exact field text.

### `POST /creator-cards`
Validates and creates a card. Auto-generates `slug` from `title` if omitted (lowercase → spaces to hyphens → strip disallowed chars → if still <5 chars or taken, append `-` + random 6-char alphanumeric suffix). Returns `200` with the created card (including `access_code` if private).

### `GET /creator-cards/:slug`
Public retrieval. Order of checks matters and must be enforced exactly: not-found (`NF01`) → draft (`NF02`) → private-no-code (`AC03`) → private-wrong-code (`AC04`) → success. `access_code` never appears in the response body.

### `DELETE /creator-cards/:slug`
Soft-deletes by `creator_reference` + `slug`. Returns the deleted card in the same shape as creation, with `deleted` populated. Subsequent `GET` on that slug must return `NF01`.

---

## 6. Critical Architecture Risks (read this before writing code)

I cloned the actual template repo and read `core/errors`, `core/express/server.js`, `core/mongoose`, and `core/repository-factory` directly. Several things the docs describe are not what the code does. These are the four things most likely to make you fail test cases even with otherwise-correct business logic.

### 6.1 The framework does **not** put a `code` field in error responses — you must add it

The README shows an example error response with `"code": "NOTFOUND"`. The actual error handler in `core/express/server.js` does this:

```js
responseComponents.body.status = 'error';
responseComponents.body.message = error.isApplicationError ? error.message : 'Some error occured.';
responseComponents.body.errors = error.details || undefined;
responseComponents.body.data = error.context;
```

There is no `code` assignment at all. `throwAppError(message, 'SL02')` sets `error.errorCode = 'SL02'` internally, but nothing copies it into the response body. Your spec requires:

```json
{ "status": "error", "message": "Slug is already taken", "code": "SL02" }
```

To get that, you need a **one-line, surgical patch to core**, despite the general "don't modify core" convention. This is exactly the kind of justified, narrow deviation the assessment invites ("may come up for discussion at the interview stage") — document it clearly in your README/PR description rather than silently doing it.

**The patch**, in `core/express/server.js`, inside the `catch (error)` block, right after the existing body assignments:

```diff
        responseComponents.body.message = error.isApplicationError
          ? error.message
          : 'Some error occured.';
+       if (error.isApplicationError && error.errorCode) {
+         responseComponents.body.code = error.errorCode;
+       }
        responseComponents.body.errors = error.details || undefined;
        responseComponents.body.data = error.context;
```

This is additive only — it doesn't change any existing field, doesn't break the validator's existing `errors[]` array behavior, and doesn't affect any other endpoint. Pass your literal business codes straight into `throwAppError`, e.g. `throwAppError(CreatorCardMessages.SLUG_TAKEN, 'SL02')` — `errorCode` is just a string parameter, it is **not** restricted to the `ERROR_CODE` enum (that enum is just a convenience set of common defaults).

### 6.2 The HTTP status for thrown errors is resolved by a separate mapping you also need to extend

```js
const statusCode = !error.isApplicationError
  ? 500
  : errorCodeMappings[error.errorCode] || 400;
```

`errorCodeMappings` is `ERROR_STATUS_CODE_MAPPING` from `core/errors/constants.js`, keyed by whatever string you pass as the error code — it has no required relationship to the `ERROR_CODE` enum. Unmapped codes fall back to `400`, which conveniently already gives you the right status for `SL02`, `AC01`, and `AC05` with zero extra work. But `NF01`/`NF02` need `404` and `AC03`/`AC04` need `403`, so add entries:

```diff
 const ERROR_STATUS_CODE_MAPPING = {
   AUTHORIZATION_ERROR: 401,
   ...
   RATE_LIMIT_ERROR: 429,
+  NF01: 404,
+  NF02: 404,
+  AC03: 403,
+  AC04: 403,
 };
```

(`SL02`, `AC01`, `AC05` need no entry — the `|| 400` fallback already does the right thing.) Also note: `helpers.http_statuses` (used for *success* responses) only goes up to `403`/`500` in this template — there's no `HTTP_404_NOT_FOUND` constant despite the README listing one. That's fine, you never need it for success paths here; just don't reach for it by mistake for an error path — errors are resolved through the mapping above, not through `helpers.http_statuses`.

### 6.3 Soft-delete mutates unique fields — snapshot before you delete, or your DELETE response will be wrong

The repository's `paranoid` soft-delete is more than `deleted: Date.now()`. Look at `core/repository-factory/delete-one.js`:

```js
uniqueFields.forEach((field) => {
  setOp[field] = { $concat: [`&del:${Date.now()}-`, { $toString: `$${field}` }] };
});
```

Any field you marked `unique: true` on the model (i.e. `slug`) gets **prefixed and mangled** at delete time — e.g. `"ada-designs-things"` becomes `"&del:1771234567890-ada-designs-things"` in the database. This is intentional design: it frees the slug for reuse by a future card while preserving the DB-level uniqueness constraint. But it means: **fetch and hold the card's full data *before* calling the delete repository method**, and build your DELETE response from that pre-delete snapshot — not from a post-delete re-read, and not by trusting the mutated document. If you serialize after deleting, your `slug` field in the response will contain the `&del:...-` garbage prefix and fail Test Case 6.

### 6.4 `deleted` defaults to `0`, not `null` — normalize it in your serializer

`core/mongoose/database-model.js`'s paranoid handling adds `deleted: { type: Number, default: 0, index: true }` if your schema doesn't already define it compatibly. Your spec wants `deleted: null` when not deleted. Your serializer must map `0 → null` and leave any real epoch-ms timestamp as-is:

```js
deleted: doc.deleted ? doc.deleted : null
```

### 6.5 `created`/`updated` are auto-populated by the repository — but your schema must still declare them

`core/repository-factory/create.js` already does:

```js
cloneData.created = Date.now();
cloneData.updated = cloneData.created;
```

automatically on every `repository.create()` call — you don't write this logic yourself, and the documented "timestamps plugin" referenced in `documentation.md` doesn't actually exist anywhere in the repo, so don't go looking for it or build one. The catch: Mongoose's default strict mode silently **drops** any field not declared in the schema. If your `creator-card` model schema doesn't explicitly declare `created: { type: Number }` and `updated: { type: Number }`, those auto-injected values will be silently discarded on save. Declare them.

### 6.6 VSL has real gaps — don't assume `isUnique`/`indexed`/multi-prefix constraints work

I checked `core/validator-vsl/validator-contraints.js` (the actual implemented constraint functions) against what `documentation.md` claims:

- `isUnique` and `indexed` are **documented but not implemented** as VSL constraints anywhere in the constraint file. Don't write `slug string<isUnique>` in a spec expecting it to do anything — set `unique: true, index: true` directly on the Mongoose schema field instead, exactly as the doc's own model example shows.
- `startsWith` only checks a single literal prefix, with no OR logic. Your `links[].url` rule ("must start with `http://` OR `https://`") can't be expressed as one VSL constraint. Validate `url` for type/maxLength via VSL, then enforce the `http://`/`https://` prefix check explicitly in your service code (this is exactly the kind of validator-can't-express-it business rule your brief tells you to handle yourself).
- There is no character-class/regex constraint in VSL for the slug's allowed-character rule (`letters, numbers, hyphens, underscores`). Enforce this manually in your service.

### 6.7 No regex policy — implement slug logic with plain string methods

The repo's own house convention (stated explicitly for the *other* baked-in assessment, but consistent with how `validator-contraints.js` itself is written — no regex anywhere in it except a single hardcoded email pattern) is: no `.match()`, no regex literals, no `.test()`. Your brief doesn't explicitly forbid regex, but given the codebase's consistent style, default to **not using regex** for the slug character-filtering and lowercase/hyphenation logic — it's safer and matches the reviewer's expectations. A simple allowed-character check using `charCodeAt` ranges (or an explicit allowed-character string + `.includes()`) covers everything you need:

```js
const ALLOWED = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
function isAllowedSlugChar(ch) {
  return ALLOWED.includes(ch);
}
```

### 6.8 Two missing `package.json` files will break `npm install` resolution

The root `package.json` declares `"@app/models": "file:models"` and `"@app/repository": "file:repository"` as local file dependencies, exactly like `"@app/messages"` and `"@app/services"`. But unlike `messages/` and `services/` (which each have their own `package.json`), **`models/` and `repository/` are missing theirs**. Before you run `npm install`, add minimal ones matching the existing pattern, or `require('@app/repository/creator-cards')` may fail to resolve:

```json
{
  "name": "@app/repository",
  "version": "1.0.0",
  "main": "index.js",
  "license": "ISC"
}
```
(same idea for `models/package.json`, name `@app/models`)

### 6.9 Don't rely on the generic duplicate-key handler for `SL02`

`core/repository-factory/create.js` already catches Mongo's `E11000` duplicate-key error and throws `ERROR_CODE.DUPLRCRD` (→ HTTP `409`, generic message). That's the wrong status and wrong code for your spec's `SL02` (`400`). So: **always pre-check slug uniqueness explicitly** with a `findOne` before calling `create`, and throw `SL02` yourself. Treat the unique index purely as a safety net against a race condition between two near-simultaneous requests — if you want to harden against that race, wrap the `create` call and translate a caught `DUPLRCRD` into your own `SL02` rethrow, but the primary path should never reach it under normal single-request testing.

---

## 7. File-by-File Implementation Manifest

```
models/
  creator-card.js              # schema: _id ULID, title, description?, slug (unique+index),
                                # creator_reference, links[], service_rates?, status, access_type,
                                # access_code?, created (Number), updated (Number)
                                # NOTE: do not add required:true / enum:[] / minLength here — service-layer validates
  package.json                 # add — currently missing (see §6.8)
  index.js                     # export { CreatorCard }

repository/
  package.json                 # add — currently missing (see §6.8)
  creator-cards/
    index.js                   # module.exports = repositoryFactory('CreatorCard', {})

messages/
  creator-cards.js              # SLUG_TAKEN, ACCESS_CODE_REQUIRED, ACCESS_CODE_FORBIDDEN,
                                 # CARD_NOT_FOUND, CARD_IS_DRAFT, PRIVATE_NO_CODE, PRIVATE_WRONG_CODE,
                                 # INVALID_URL_PREFIX, INVALID_SLUG_CHARS
  index.js                     # add CreatorCardMessages export

services/
  creator-cards/
    create-card.js              # VSL validate -> resolve/generate slug -> conditional access_code rules
                                 # -> create -> serialize
    retrieve-card.js             # find by slug -> ordered access checks (NF01/NF02/AC03/AC04) -> serialize
    delete-card.js                # find by slug+creator_reference (pre-snapshot!) -> delete -> serialize snapshot
  utils/
    generate-slug.js             # title -> slug algorithm (no regex, §6.7)
    serialize-creator-card.js    # _id->id, deleted 0->null, access_code conditional inclusion
    is-allowed-slug-char.js      # char-by-char allowed-set check (no regex)

endpoints/
  creator-cards/
    create.js                    # POST /creator-cards
    retrieve.js                  # GET /creator-cards/:slug  (use rc.params.slug + rc.query.access_code)
    delete.js                    # DELETE /creator-cards/:slug (rc.params.slug + rc.body.creator_reference)

specs/
  creator-cards/
    data/
      create-card.go             # VSL field-level spec (for documentation/codegen parity)
    endpoint/
      create-card.endpoint.go
      retrieve-card.endpoint.go
      delete-card.endpoint.go

app.js
  # add { path: './endpoints/creator-cards/' } to ENDPOINT_CONFIGS

core/express/server.js           # patch per §6.1
core/errors/constants.js         # patch per §6.2
```

---

## 8. VSL Spec (field-level validation — used inside `create-card.js`)

```js
const spec = `root { // Creator Card creation
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;
```

Notes:
- The slug character-set rule (`[a-zA-Z0-9_-]+`) and the `url` `http(s)://` prefix rule are **intentionally not in VSL** (§6.6) — enforce both manually in the service, right after `validator.validate()` runs, before any DB access.
- `amount` being a *positive integer with no decimals* needs an explicit `Number.isInteger(amount)` check in the service in addition to `min:1`, since VSL's `min` constraint doesn't reject `5000000.5`.

## 9. Service Skeletons

```js
// services/creator-cards/create-card.js
const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-cards');
const { CreatorCardMessages } = require('@app/messages');
const generateSlug = require('../utils/generate-slug');
const serializeCreatorCard = require('../utils/serialize-creator-card');

const parsedSpec = validator.parse(spec); // spec from §8

async function createCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    // --- business rules VSL can't express ---
    (data.links || []).forEach((link) => {
      if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        throwAppError(CreatorCardMessages.INVALID_URL_PREFIX, 'VALIDATIONERR');
      }
    });

    if (data.access_type === 'private' && !data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
    }
    if ((data.access_type === 'public' || !data.access_type) && data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_FORBIDDEN, 'AC05');
    }

    // --- slug resolution ---
    let finalSlug;
    if (data.slug) {
      const existing = await CreatorCard.findOne({ query: { slug: data.slug } });
      if (existing) throwAppError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
      finalSlug = data.slug;
    } else {
      finalSlug = await generateSlug({ title: data.title, repository: CreatorCard });
    }

    const created = await CreatorCard.create({ ...data, slug: finalSlug });
    result = serializeCreatorCard(created, { includeAccessCode: true });
  } catch (error) {
    appLogger.errorX(error, 'create-card-error');
    throw error;
  }

  return result;
}

module.exports = createCard;
```

```js
// services/creator-cards/retrieve-card.js  (order matters — §6/Access Rules)
async function retrieveCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedRetrieveSpec); // { slug, access_code? }
  let result;

  try {
    const card = await CreatorCard.findOne({ query: { slug: data.slug } });
    if (!card) throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    if (card.status === 'draft') throwAppError(CreatorCardMessages.CARD_IS_DRAFT, 'NF02');

    if (card.access_type === 'private') {
      if (!data.access_code) throwAppError(CreatorCardMessages.PRIVATE_NO_CODE, 'AC03');
      if (data.access_code !== card.access_code) {
        throwAppError(CreatorCardMessages.PRIVATE_WRONG_CODE, 'AC04');
      }
    }

    result = serializeCreatorCard(card, { includeAccessCode: false });
  } catch (error) {
    appLogger.errorX(error, 'retrieve-card-error');
    throw error;
  }

  return result;
}
```

```js
// services/creator-cards/delete-card.js  — note the snapshot-before-delete (§6.3)
async function deleteCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedDeleteSpec); // { slug (param), creator_reference }
  let result;

  try {
    const card = await CreatorCard.findOne({ query: { slug: data.slug } });
    if (!card) throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');

    const snapshot = { ...card }; // capture BEFORE delete mutates unique fields
    await CreatorCard.deleteOne({ query: { _id: card._id } });

    result = serializeCreatorCard(snapshot, {
      includeAccessCode: true,
      overrideDeleted: Date.now(),
    });
  } catch (error) {
    appLogger.errorX(error, 'delete-card-error');
    throw error;
  }

  return result;
}
```

These skeletons are intentionally incomplete (no module boilerplate/exports shown) — flesh them out following the exact two-parameter/validate-first/single-exit/`throwAppError` conventions from `documentation.md` §"Services."

## 10. Slug Auto-Generation Algorithm (no regex)

```js
async function generateSlug({ title, repository }) {
  const lowered = title.toLowerCase();
  let candidate = '';
  for (const ch of lowered.split('')) {
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      candidate += '-';
    } else if (isAllowedSlugChar(ch)) {
      candidate += ch;
    }
    // anything else is dropped silently
  }

  const needsSuffix = async (slugCandidate) => {
    if (slugCandidate.length < 5) return true;
    const existing = await repository.findOne({ query: { slug: slugCandidate } });
    return !!existing;
  };

  let finalSlug = candidate;
  if (await needsSuffix(finalSlug)) {
    finalSlug = `${candidate}-${randomAlphanumeric(6)}`;
    // loop again in the rare case the suffixed slug also collides
    while (await needsSuffix(finalSlug)) {
      finalSlug = `${candidate}-${randomAlphanumeric(6)}`;
    }
  }
  return finalSlug;
}
```

`randomAlphanumeric(6)` can be built from `@app-core/randomness`'s `randomBytes`/`randomNumbers`, or a simple charset-indexing loop — no regex needed either way.

---

## 11. Implementation Plan (time-boxed, given a near deadline)

| Phase | Work | Est. time |
|---|---|---|
| 0 | Fork repo, `npm install` (fix missing `package.json`s first, §6.8), confirm `node bootstrap.js` boots against a local/Atlas MongoDB | 20 min |
| 1 | Patch `core/express/server.js` + `core/errors/constants.js` per §6.1/§6.2; write a throwaway endpoint to confirm `{status,message,code}` now renders correctly for a custom code | 20 min |
| 2 | Model + repository + messages files | 20 min |
| 3 | `create-card` service (VSL spec, manual url/slug-char checks, access_code rules, slug generation, serializer) | 60 min |
| 4 | `retrieve-card` service (ordered access checks) | 25 min |
| 5 | `delete-card` service (pre-delete snapshot!) | 20 min |
| 6 | 3 endpoint files + `app.js` registration | 20 min |
| 7 | Run all 16 test cases locally with curl/Postman, fix discrepancies | 60–90 min |
| 8 | MongoDB Atlas setup, deploy to Render/Heroku, re-run all 16 against the live URL | 30–45 min |
| 9 | Write submission notes (mention the core patch transparently, link repo + live endpoint) | 15 min |

Total: roughly 4–5 focused hours, assuming no major MongoDB/deploy surprises.

## 12. Test Case Traceability

| # | Case | Endpoint | Key thing being verified |
|---|---|---|---|
| 1 | Full creation | create | `access_type` defaults public, `id` not `_id` |
| 2 | Slug auto-gen | create | algorithm in §10 |
| 3 | Private card creation | create | `access_code` returned in response |
| 4 | Retrieve public published | retrieve | `access_code` absent, `id` present |
| 5 | Retrieve private w/ correct pin | retrieve | query param flow, no `access_code` leak |
| 6 | Delete | delete | **slug in response is original, not mangled (§6.3)** |
| 7 | Duplicate slug | create | `SL02` / 400 |
| 8 | Missing access_code on private | create | `AC01` / 400 |
| 9 | access_code on public | create | `AC05` / 400 |
| 10 | Bad enum value | create | VSL's own 400, no custom code needed |
| 11 | Retrieve non-existent | retrieve | `NF01` / 404 |
| 12 | Retrieve draft | retrieve | `NF02` / 404 (distinct from NF01) |
| 13 | Private, no pin | retrieve | `AC03` / 403 |
| 14 | Private, wrong pin | retrieve | `AC04` / 403 |
| 15 | Delete non-existent | delete | `NF01` / 404 |
| 16 | Retrieve deleted | retrieve | `NF01` / 404 — confirms paranoid find excludes it |

## 13. Deployment Checklist

- [ ] MongoDB Atlas free-tier cluster; `MONGODB_URI` set in deployment env
- [ ] `PORT` read from platform env (Render/Heroku inject this automatically)
- [ ] `Procfile` already present (`web: node bootstrap.js`) — no change needed
- [ ] No `JWT_SECRET`/`RESEND_*`/auth env vars required for this assessment — leave blank or unset, app boots fine without them (queue/Redis is a safe no-op if `REDIS_URL` unset, confirmed in `core/queue/create-queue.js`)
- [ ] Confirm deployed root path has no `/v1` or `/api` prefix — `path: '/creator-cards'` as registered in `app.js`'s `ENDPOINT_CONFIGS`
- [ ] Re-run all 16 test cases against the live URL before submitting

## 14. Open Questions / Risks to Flag

1. **The core patch (§6.1/§6.2):** confirm in your submission notes that you modified `core/express/server.js` and `core/errors/constants.js`, and why — this is the single highest-risk deviation from "don't touch core," but appears structurally necessary to satisfy the literal response contract. If you have any channel to ask the reviewer beforehand, this is the one thing worth a quick clarifying question.
2. **Regex policy (§6.7):** your specific brief doesn't explicitly forbid regex (that constraint appears verbatim only in the other assessment baked into the repo). Defaulting to no-regex is the safer assumption given the codebase's house style, but it's worth a one-line note in your README either way.
3. **Submission deadline:** not present in any source document you gave me — fill in once known, and consider front-loading Phase 1 (the core patch) since it's the riskiest/most novel part and you want time to recover if it doesn't behave as expected in your environment.
