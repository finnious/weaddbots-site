# Memphis AI Meetup — Publishing Runbook v2

*Single source of truth for adding events, publishing to the website, and running the weekly email.*
*Location: `C:\Dev-Projects\weaddbots\docs\meetup-publishing-runbook-v2.md`*
*Last updated: April 17, 2026*

**Patch log (2026-04-17):**
- Fixed canonical event page path: `events/memphis-ai-meetup.html` (flat file, not a folder)
- Locked ID casing rule: "first geographic token, PascalCased" with examples
- Added explicit archival-file protection in HTML sync prompt
- Switched script examples from `dotenv` dep to native Node `--env-file` (Node ≥ 20)
- Clarified LinkedIn start/end time derivation from the combined `time` field
- Bounded the HTML sync rendering window to "next 12 Monday-starting weeks beginning the Monday after today" (was "every Monday-starting week between today and Dec 31" — 38+ cards was unusable UX while still answering the "is this a real ongoing thing?" question at a glance).
- Excluded the current week from rendering on the event page. Current week is covered by the weekly email; the event page is forward-looking.

---

## What Changed from v1

- **One weekly email replaces the announcement + reminder pattern.** Sent Monday 8am via scheduled GHL workflow. Covers this week's event(s) with full venue + the next 4 weeks' events with area only.
- **No more "next meetup" tagging.** Event identity is always the event ID. Announcement/reminder tags are gone.
- **`meetup-events.json` stores only real events** (confirmed + past) plus a `skipped_weeks` list. Placeholders are computed, not stored.
- **Multi-event weeks are supported.** Add as many events as you want to a week.
- **GHL Custom Values are written by Claude Code via API**, not manually in the GHL UI.
- **Two Custom Values replace six.** `WAB_Weekly_This_Week` and `WAB_Weekly_Future_Weeks` hold pre-rendered content blocks.

---

## Part 1 — Data Model

### `meetup-events.json` Structure

**Location:** `C:\Dev-Projects\weaddbots\meetup-events.json`

```json
{
  "last_updated": "2026-04-17",
  "events": [
    {
      "id": "WAB-2026-04-22-BroadAve",
      "status": "confirmed",
      "date_iso": "2026-04-22",
      "day_of_week": "Wednesday",
      "date_display": "April 22, 2026",
      "time": "8:15 – 8:45 AM",
      "area": "Broad Ave Arts District",
      "venue_private": "City & State, 2625 Broad Ave, Memphis, TN 38112",
      "venue_public": false
    },
    {
      "id": "WAB-2026-04-24-Germantown",
      "status": "confirmed",
      "date_iso": "2026-04-24",
      "day_of_week": "Friday",
      "date_display": "April 24, 2026",
      "time": "9:15 – 9:45 AM",
      "area": "Germantown",
      "venue_private": "Congregation Coffee, 7567 Poplar Ave, Germantown, TN 38138",
      "venue_public": true
    }
  ],
  "skipped_weeks": [
    {
      "week_start": "2026-11-23",
      "reason": "Thanksgiving week"
    },
    {
      "week_start": "2026-12-21",
      "reason": "Holidays"
    },
    {
      "week_start": "2026-12-28",
      "reason": "Holidays"
    }
  ]
}
```

### Field Reference

**Event fields:**

| Field | Values | Notes |
|---|---|---|
| `id` | `WAB-YYYY-MM-DD-Area` | Unique per event. Area suffix is the **first geographic token** of the area, PascalCased. Examples: `BroadAve` (from "Broad Ave Arts District"), `EastMemphis`, `UofM` (from "Near University of Memphis"), `Germantown`, `Downtown` (from "Downtown Memphis"). |
| `status` | `"confirmed"` or `"past"` | `past` events stay in JSON for history, removed from HTML. |
| `date_iso` | `YYYY-MM-DD` | Primary sort key. |
| `day_of_week` | e.g., `"Wednesday"` | Human display. |
| `date_display` | e.g., `"April 22, 2026"` | Human display. |
| `time` | e.g., `"8:15 – 8:45 AM"` | Use en dash, not hyphen. |
| `area` | e.g., `"Broad Ave Arts District"` | PUBLIC everywhere. |
| `venue_private` | Full name + address | Revealed via email only, unless `venue_public: true`. |
| `venue_public` | `true` or `false` | Default `false`. When `true`, venue shows on website, LinkedIn, and announcement emails. |

**Skipped week fields:**

| Field | Values |
|---|---|
| `week_start` | Monday of the week, ISO format |
| `reason` | Short human-readable explanation |

### Status Lifecycle

1. Event added with `status: "confirmed"`.
2. After the event date passes, flip to `status: "past"`.
3. Past events are removed from HTML on next sync but retained in JSON.

### Multiple Events Per Week

Fully supported. Two events in the same week means two separate entries in `events[]`. The website renders both cards under the same week on the events page. The weekly email includes both under "this week" with full venue for each.

### Placeholder Weeks (Auto-Generated)

No placeholders stored in JSON. The HTML sync generates TBA cards for any Monday-starting week between today and Dec 31 that has:
- Zero events in `events[]` for that week
- No entry in `skipped_weeks`

Skipped weeks render as muted cards ("No meetup — [reason]") on the website.

---

## Part 2 — Weekly Event Publishing Workflow

**When:** Any day you add, change, or remove an event.
**Where:** Claude Code, running locally in `C:\Dev-Projects\weaddbots`.

### Step 1 — Tell Claude Code about the event

Paste into Claude Code:

```
Add a new Memphis AI Meetup event.

Day & date: [e.g., Wednesday, April 22, 2026]
Time: [e.g., 8:15 – 8:45 AM]
Area: [e.g., Broad Ave Arts District]
Venue name: [e.g., City & State]
Venue address: [e.g., 2625 Broad Ave, Memphis, TN 38112]
venue_public: [true | false]

Do this:
1. Validate the week is not in skipped_weeks. If it is, stop and tell me.
2. Validate there isn't already an event with the same id. If there is, stop and tell me.
3. Generate the event id as WAB-YYYY-MM-DD-AreaSuffix, where AreaSuffix is the first geographic token of the area, PascalCased. Examples: "Broad Ave Arts District" → BroadAve; "East Memphis" → EastMemphis; "Near University of Memphis" → UofM; "Germantown" → Germantown; "Downtown Memphis" → Downtown.
4. Add the event to meetup-events.json with status "confirmed".
5. Update last_updated to today's date.
6. Show me the diff.
7. Ask if you should sync the website.
```

### Step 2 — Website sync

When Claude Code asks "Sync the website?":

- Reply **yes** → Claude Code runs the HTML sync prompt below, commits, pushes.
- Reply **no** → JSON change sits locally until you're ready.

**The HTML sync prompt (Claude Code runs this internally):**

```
Read meetup-events.json and sync all changes to events/memphis-ai-meetup.html (canonical event page, flat file at this path) and every page with an event-banner div class. Also update events/index.html and sitemap.xml.

DO NOT MODIFY these archival or legacy files under any circumstance:
- events/memphis-ai-meetup-feb-2026.html (and any other events/memphis-ai-meetup-*-YYYY.html archive pages)
- memphis-ai-meetup.html at the repo root if it still exists (it should be deleted separately; do not modify it)

Rules:
- For the next 12 Monday-starting weeks beginning with the Monday AFTER today (do not render the current week — that's covered by the weekly email):
  - If one or more confirmed events exist that week, render a card for each event.
  - Else if the week appears in skipped_weeks, render a muted card: "No meetup — [reason]".
  - Else render a TBA card: "Week of [Month D–D] — Area TBD".
- Venue visibility per event depends on venue_public:
  - venue_public: false (or missing) → Show area only on card and in schema. Subtitle: "RSVP to get the exact venue".
  - venue_public: true → Show venue name + area on card. Use full venue name in JSON-LD schema location.
- The soonest upcoming confirmed event gets class="date-card next-up" and the "Next Up" badge.
- Past events (status: "past"): remove from HTML. Keep in JSON for history.
- JSON-LD schema entries use schema_location_name for private venues, full venue name for public venues. Never include street addresses for private venues.
- Quick Details sidebar: update "Next:" to reflect the soonest confirmed event's day and date.
- Update the freshness date on the event page to today's date.
- Update sitemap.xml <lastmod> for the meetup page and events index.
- Commit with message: "update: sync meetup events from meetup-events.json [YYYY-MM-DD]" and push.
```

### Step 3 — Deploy verification

After push, Claude Code waits ~60 seconds, then asks: **"Verify live site?"**

- Reply **yes** → Claude Code fetches `https://weaddbots.com/events/memphis-ai-meetup` and confirms the new event appears.
- If verification fails (stale Cloudflare cache or deploy still in flight), Claude Code offers to wait 30s and retry.

### Step 4 — LinkedIn asset generation

Once website is verified, Claude Code generates:

**File:** `meetup-assets/{event-id}-linkedin.md`

Example: `meetup-assets/WAB-2026-04-22-BroadAve-linkedin.md`

Contents:
- LinkedIn event title (ready to paste)
- LinkedIn venue field value (ready to paste — "Join Newsletter for Details" if venue_public=false, venue name if true)
- LinkedIn event start / end datetimes (in LinkedIn's expected format)
- LinkedIn event description (ready to paste, conversational tone, no hard CTA)
- Three Grok image prompt variants, each in a different visual style, each with this event's details baked in as text in the image

### LinkedIn Markdown File Template

```markdown
# LinkedIn Assets — {event-id}

## Event Title
Memphis AI Meetup — {area}

## Venue Field
{if venue_public=false: "Join Newsletter for Details"}
{if venue_public=true: "{venue name}, {area}"}

## Start Date/Time
{day_of_week}, {date_display} at {start_time}
(Derive start_time by splitting the event's time field on the en dash: "8:15 – 8:45 AM" → start "8:15 AM", end "8:45 AM". The AM/PM indicator lives on the end portion; apply it to both.)

## End Date/Time
{day_of_week}, {date_display} at {end_time}

## Description
{ready-to-paste event description}

---

## Grok Image Prompt — Style 1: Abstract Particles
{full prompt with event details baked in as on-image text}

## Grok Image Prompt — Style 2: Geometric / Architectural-Abstract
{full prompt with event details baked in as on-image text}

## Grok Image Prompt — Style 3: Atmospheric / Photography-Inspired
{full prompt with event details baked in as on-image text}
```

### Image Prompt Conventions

All three prompts share:
- **Aspect ratio:** 4:1 (1584×396 LinkedIn event cover)
- **Palette:** navy `#0A1628` + teal `#02C39A`, with white for text
- **Brand name:** "WeAddBots.com" always included as on-image text
- **Event details baked in as on-image text:** meetup name with area, date, time with area, WeAddBots.com — dynamically populated per event
- **Text treatment:** clean sans-serif, centered, readable hierarchy

Each style differs in:
- Background composition (particles, geometric, atmospheric)
- Mood/feel
- Supporting visual elements

---

## Part 3 — Monday Morning Email Workflow

**When:** Friday or Saturday (anytime before Monday 8am).
**What it does:** Writes two GHL Custom Values that the scheduled Monday 8am workflow uses.

### Step 1 — Prepare the weekly email

Paste into Claude Code:

```
Prepare this week's Memphis AI Meetup email.

Do this:
1. Read meetup-events.json.
2. Identify this week's events (Monday to Sunday of the current week based on today's date).
3. Identify the next 4 weeks of future events (any confirmed event dated after this week's Sunday, up to 4 future weeks).
4. If there are zero events this week AND this week is not in skipped_weeks, ask me whether to skip the email. Default behavior is skip the email entirely (no send Monday).
5. If there IS at least one event this week, build:
   - WAB_Weekly_This_Week block: for each event this week, render day/date, time, venue name, venue address. Multi-event weeks render each event in a separate block separated by a blank line.
   - WAB_Weekly_Future_Weeks block: for each future event (next 4 weeks), render day/date, time, area only. No venue. No address.
6. Show me a preview of the full email body as it will appear after GHL merges in the Custom Values.
7. Ask me to confirm before writing to GHL.
8. On confirm, call the GHL API and update the two Custom Values: WAB_Weekly_This_Week and WAB_Weekly_Future_Weeks.
9. Report back: the values were written, and the workflow is scheduled to fire Monday 8am.
```

### Step 2 — Review the preview

Claude Code will output the fully rendered email (with the weekly content substituted in). Check:
- This week's events show full venue + address
- Future weeks show area only (unless venue_public=true)
- No stale event from a prior week
- No events from beyond the 4-week window

### Step 3 — Approve → Claude Code writes to GHL

Claude Code calls the GHL API:
- Updates `WAB_Weekly_This_Week`
- Updates `WAB_Weekly_Future_Weeks`
- Confirms write succeeded

### Step 4 — Optional manual spot-check in GHL

Open GHL → Settings → Custom Values. Eyeball the two values. If they match the preview, you're done.

### Step 5 — Monday 8am: workflow fires automatically

The scheduled GHL workflow sends "Weekly Meetup Email" template to the Smart List. Template merges in the two Custom Values. No action needed from you.

### Re-preparing the Email

If you add, remove, or change an event between Friday prep and Monday 8am:

1. Re-run the "Prepare this week's email" prompt.
2. Claude Code regenerates both blocks and overwrites the Custom Values.
3. No harm done — latest write wins.

---

## Part 4 — Correction Email Workflow

**When:** You notice something wrong after the Monday 8am send.
**Philosophy:** Corrections erode the "Monday = the meetup email" trained expectation. Use sparingly.

### Step 1 — Generate the correction body

Paste into Claude Code:

```
Generate a correction email for this week's Memphis AI Meetup.

Reason for correction: [e.g., "venue moved to a different coffee shop", "time changed from 8:15 to 9:15", "event on Friday was canceled"]

Do this:
1. Read meetup-events.json for current event state.
2. Draft a short, plain-text correction email:
   - Subject line starts with "Correction —"
   - Opens with what changed and why (one line)
   - Lists the corrected event details (full venue for this week's events)
   - No marketing copy, no pitches
   - Signature + unsubscribe footer matching the standard template
3. Output the draft. Do NOT call the GHL API. Do NOT update Custom Values.
4. Tell me the GHL steps to send the correction manually if I decide to send it.
```

### Step 2 — Decide

You decide whether sending is worth it. If yes, Claude Code's output includes the GHL steps:
- Create a one-off email in GHL with the corrected body
- Trigger it manually to the Smart List

---

## Part 5 — GHL Setup (One-Time)

Do this once, before running the weekly email workflow.

### 5.1 — Archive legacy workflows

Go to GHL → Automation → Workflows. Archive (do not delete — keeps history):

- `WAB — Meetup Announcement`
- `WAB — Meetup Reminder`

### 5.2 — Archive legacy Custom Values

Go to GHL → Settings → Custom Values. Archive or delete:

- `WAB - Next Meetup Day`
- `WAB - Next Meetup Date`
- `WAB - Next Meetup Time`
- `WAB - Next Meetup Area`
- `WAB - Next Meetup Venue`
- `WAB - Next Meetup Address`

### 5.3 — Create new Custom Values

Go to GHL → Settings → Custom Values → Create. Create two text fields:

| Field Name | API Key (auto-generated) |
|---|---|
| `WAB - Weekly This Week` | `wab___weekly_this_week` (verify exact key after creation) |
| `WAB - Weekly Future Weeks` | `wab___weekly_future_weeks` (verify exact key after creation) |

Both fields are long-text. They hold pre-rendered content blocks, not single values.

### 5.4 — Archive old tags

In GHL → Settings → Tags, archive (do not delete):

- `WAB-Send-Announcement`
- `WAB-Send-Reminder`

Keep these active:

- `WAB-Newsletter`
- `WAB-Meetup-Attendee`
- `WAB-Unsubscribed`

### 5.5 — Create the weekly email template

Go to GHL → Marketing → Emails → Templates → Create.

**Template name:** `Weekly Meetup Email`

**Subject line:** `Memphis AI Meetup — Week of {{date of Monday, human format}}`

(Use a GHL date helper or hard-code the subject as `Memphis AI Meetup — Week Ahead` if date merge isn't straightforward.)

**Body (plain text):**

```
Hey {{contact.first_name}},

Here's what's happening at WeAddBots.com events this week:

{{ custom_values.wab___weekly_this_week }}

Coming up in the next few weeks:

{{ custom_values.wab___weekly_future_weeks }}

Same format every week — grab a coffee, sit down with other business owners, and talk about what's actually working with AI right now. No presentations, no pitches.

See you there.

Scott Finney
WeAddBots — AI Automation for Memphis Businesses
weaddbots.com



If you'd rather not get these emails anymore, no hard feelings:
https://www.weaddbots.com/unsubscribe?email={{contact.email}}
```

**Important:** Use the GHL merge field picker (the `{ }` button) to insert `{{ custom_values.wab___weekly_this_week }}` and `{{ custom_values.wab___weekly_future_weeks }}`. Do not type manually — the API key syntax GHL generates may differ slightly.

### 5.6 — Create the scheduled workflow

Go to GHL → Automation → Workflows → Create.

**Workflow name:** `WAB — Weekly Meetup Email`

**Trigger:** Schedule / Recurring
- Day: Monday
- Time: 8:00 AM Central
- Recurrence: Weekly

**Action 1:** Send Email
- Template: `Weekly Meetup Email`
- Recipients: Smart List "WAB — Meetup Email List"

**Publish.**

### 5.7 — Verify Smart List is still correct

Go to GHL → Contacts → Smart Lists → `WAB — Meetup Email List`.

Filter:
- Tag is `WAB-Newsletter` OR Tag is `WAB-Meetup-Attendee`
- Tag is NOT `WAB-Unsubscribed`

No changes needed from v1.

---

## Part 6 — GHL API Integration Notes

### 6.1 — Two places the GHL API key lives

Your GHL API key is already in use in the codebase. It lives in **two** separate locations, and both matter:

**Location A: Cloudflare Pages environment variables** (existing, already configured)
- Used by Cloudflare Functions in `functions/api/` (e.g., `submit.js`, `unsubscribe.js`)
- Set via: Cloudflare Pages → Settings → Environment Variables
- Referenced in code as `env.GHL_API_KEY` and `env.GHL_LOCATION_ID`
- **Do not modify this.** It's what makes the website work.

**Location B: Local `.env` in repo root** (new, for Claude Code scripts)
- Used by local Node scripts like `sync-meetup.js` and `prepare-weekly-email.js`
- Set via: `C:\Dev-Projects\weaddbots\.env`
- Referenced in code as `process.env.GHL_API_KEY` and `process.env.GHL_LOCATION_ID`
- **Must be gitignored.**

Contents of local `.env`:

```
GHL_API_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxx
GHL_LOCATION_ID=xxxxxxxxxxxxxxxx
GHL_CV_ID_THIS_WEEK=xxxxxxxxxxxxxxxx
GHL_CV_ID_FUTURE_WEEKS=xxxxxxxxxxxxxxxx
```

Verify `.env` is in `.gitignore`:

```
# .gitignore
.env
.env.local
```

Use the same API key value in both locations. When you rotate the key, rotate in both places.

### 6.2 — API base and existing patterns in this codebase

**API base:** `https://services.leadconnectorhq.com` (v2)

The v2 API is what `functions/api/submit.js` and `functions/api/unsubscribe.js` already use. Any new script should follow the same pattern.

**Required headers (exactly as used in existing functions):**

```
Authorization: Bearer {GHL_API_KEY}
Content-Type: application/json
Version: 2021-07-28
```

**Known working endpoints in this codebase (for reference):**

| Endpoint | Method | Used In | Purpose |
|---|---|---|---|
| `/contacts/upsert` | POST | `submit.js` | Create/update contact |
| `/contacts/{id}/tags` | POST | `unsubscribe.js` | Add tags to contact |

**Legacy code to clean up:** `functions/api/submit-rsvp.js` uses the deprecated v1 API (`rest.gohighlevel.com/v1/`). Migrate this to v2 at some point — not required for the weekly email workflow, but worth flagging.

### 6.3 — Custom Values endpoint (to be verified)

The endpoint for updating Custom Values is **not currently used anywhere in this codebase**. Before building `prepare-weekly-email.js`, verify the exact endpoint against GHL's current API docs.

**Expected pattern (verify before coding):**
- List Custom Values: `GET /locations/{locationId}/customValues/`
- Update a Custom Value: `PUT /locations/{locationId}/customValues/{customValueId}`

**Verification step — run from Claude Code before first use:**

```
Check the GHL LeadConnector v2 API docs at https://highlevel.stoplight.io/ for the exact endpoint, method, headers, and request body shape for updating a Custom Value at a location. Write the verified spec to docs/ghl-api-customvalues-spec.md before building any script that uses it.
```

Once verified, document the spec in the repo so future scripts don't have to re-verify.

### 6.4 — Finding the Custom Value IDs (one-time)

After creating the two new Custom Values in the GHL UI (Part 5.3), retrieve their IDs:

```
From Claude Code:

1. Load GHL_API_KEY and GHL_LOCATION_ID from .env.
2. GET the Custom Values list endpoint (verify path from spec doc).
3. Find the IDs for "WAB - Weekly This Week" and "WAB - Weekly Future Weeks".
4. Append to .env as:
   GHL_CV_ID_THIS_WEEK=...
   GHL_CV_ID_FUTURE_WEEKS=...
5. Report which IDs were found.
```

### 6.5 — The update script pattern (sketch)

Follow the same shape as `functions/api/submit.js` and `unsubscribe.js` — Node `fetch`, bearer auth, Version header, v2 base URL. Once the endpoint spec is verified in 6.3, the update call will look approximately like this:

```javascript
// scripts/prepare-weekly-email.js (sketch — verify endpoint before using)
// Run with: node --env-file=.env scripts/prepare-weekly-email.js
// Requires Node >= 20 for native --env-file support and native fetch.

const {
  GHL_API_KEY,
  GHL_LOCATION_ID,
  GHL_CV_ID_THIS_WEEK,
  GHL_CV_ID_FUTURE_WEEKS
} = process.env;

async function updateCustomValue(cvId, name, value) {
  const response = await fetch(
    `https://services.leadconnectorhq.com/locations/${GHL_LOCATION_ID}/customValues/${cvId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({ name, value })
    }
  );
  if (!response.ok) {
    throw new Error(`GHL API error ${response.status}: ${await response.text()}`);
  }
  return response.json();
}
```

### 6.6 — Related contact custom field IDs (reference)

The codebase also uses contact-level custom *fields* (different from location-level Custom *Values*). These are documented in `DEPLOYMENT-GUIDE.md` and used by form submissions:

| Field | ID |
|---|---|
| Inquiry Type | `eITRQJpf0jUlGI8aOm6o` |
| Area/Venue | `pGVZpiJGCT9XgPJalNSC` |
| Event Name | `vo9iUqMmSpGpCEFM5C66` |
| Event Date | `bpKUQhL2nQX6mC9mAcN7` |
| Source Page | `Q8mqK6YWLAExkUX84K1R` |

**Not used by the weekly email workflow** — listed here because the weekly email workflow's Custom Values system is often confused with the contact custom fields system. Keep them straight: contact custom fields live on individual contacts; location-level Custom Values are global account-level variables that email templates merge in.

### 6.7 — Error handling

If the GHL API write fails:
- Script logs the error with response body
- Script retries once after 5 seconds
- If retry fails, script exits with a clear message and prints the content blocks to stdout so you can paste them into GHL manually as a fallback
- Don't swallow errors silently — a silent failure means Monday's email fires with stale content

---

## Part 7 — Failure Modes & Recovery

| Problem | Fix |
|---|---|
| Venue leaked onto website | Check `venue_public` in `meetup-events.json`. Should be `false` or omitted. Re-run HTML sync. |
| Cloudflare didn't deploy | Check GitHub Actions tab. Force re-deploy from Cloudflare dashboard. |
| GHL merge fields showed raw `{{ custom_values.wab___weekly_this_week }}` in a sent email | Custom Values were empty at send time. Archive the template, confirm the merge field was inserted via picker, test. |
| Weekly email fired Monday 8am but content was from last week | Values weren't updated between Friday and Monday. Use correction email workflow if needed. |
| New event added Sunday night, didn't make it into Monday email | Run "Prepare this week's email" again before 8am Monday. Latest write wins. |
| Deployed website still shows old event | Cloudflare cache. Wait 60s, hard-refresh (Ctrl+F5). If persistent, Cloudflare dashboard → purge cache. |
| GHL API returned 401 | API key expired or wrong. Regenerate in GHL settings, update `.env`. |
| Two events on the same day | Supported. Both render as separate cards on the website and separate blocks in the weekly email. |
| Event needs to be canceled after email already fired | Use correction email workflow. |
| Venue_public accidentally set to true | Flip to false in JSON. Re-run website sync. Note: if the weekly email already fired with venue public, the venue is in subscribers' inboxes — correction email optional depending on severity. |

---

## Part 8 — Checklists

### Adding an Event (Any Day)

- [ ] Have inputs: day, date, time, area, venue name, venue address, venue_public flag
- [ ] Run Claude Code "Add a new Memphis AI Meetup event" prompt
- [ ] Review JSON diff
- [ ] Approve website sync
- [ ] Review commit + push
- [ ] Wait ~60s for Cloudflare
- [ ] Verify live site shows the new event correctly (venue hidden if private)
- [ ] Review generated `meetup-assets/{event-id}-linkedin.md`
- [ ] Create LinkedIn event manually (copy/paste from markdown)
- [ ] Pick one of the three Grok prompts, generate image, upload to LinkedIn event
- [ ] Publish LinkedIn promo post referencing the event

### Weekly Email Prep (Friday or Saturday)

- [ ] Run Claude Code "Prepare this week's email" prompt
- [ ] Review preview of rendered email
- [ ] Confirm this week's events show full venue
- [ ] Confirm future weeks show area only
- [ ] Approve GHL API write
- [ ] Spot-check Custom Values in GHL UI
- [ ] (Sunday night or Monday morning) If anything changed, re-run prep prompt

### Post-Meetup (Same Day or Next Day)

- [ ] Flip event's `status` from `confirmed` to `past` in `meetup-events.json`
- [ ] Run Claude Code website sync
- [ ] Verify live site (event removed, next-up badge moves to next event)

### First-Time Setup (One-Time)

- [ ] Archive legacy GHL workflows and tags
- [ ] Create two new Custom Values in GHL
- [ ] Create "Weekly Meetup Email" template in GHL
- [ ] Create scheduled workflow "WAB — Weekly Meetup Email"
- [ ] Verify Smart List filters unchanged
- [ ] Add GHL API key + location ID + CV IDs to `.env`
- [ ] Confirm `.env` is gitignored
- [ ] Test end-to-end: add a dummy event, prep email, verify GHL Custom Values update, send test email to yourself

---

*End of runbook. Single source of truth — supersedes `WeAddBots-Meetup-Publishing-Workflow.md` and the email sections of `GHL-Meetup-Email-Automation.md`.*
