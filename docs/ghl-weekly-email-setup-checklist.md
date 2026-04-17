# GHL One-Time Setup Checklist — Weekly Meetup Email

*Browser-only checklist. Do these in GHL's UI before the weekly email workflow can fire.*
*Location in repo: `C:\Dev-Projects\weaddbots\docs\ghl-weekly-email-setup-checklist.md`*

Each item is a one-time action. Work top-down. Each section has a "verify" step so you know it's done.

---

## 1. Archive legacy workflows

**URL:** GHL → Automation → Workflows

- [ ] Find `WAB — Meetup Announcement` → Archive (do not delete)
- [ ] Find `WAB — Meetup Reminder` → Archive (do not delete)

**Verify:** Both workflows are in the Archived tab, not the Active tab.

---

## 2. Archive legacy Custom Values

**URL:** GHL → Settings → Custom Values

These six are obsolete under the weekly email model. Archive or delete:

- [ ] `WAB - Next Meetup Day`
- [ ] `WAB - Next Meetup Date`
- [ ] `WAB - Next Meetup Time`
- [ ] `WAB - Next Meetup Area`
- [ ] `WAB - Next Meetup Venue`
- [ ] `WAB - Next Meetup Address`

**Verify:** None of these appear in the active Custom Values list.

---

## 3. Create new Custom Values

**URL:** GHL → Settings → Custom Values → Create

Create two **long-text** fields:

- [ ] Name: `WAB - Weekly This Week`
  - Type: Long text / paragraph (not short text — content may be several lines)
  - After creation, open it and note the auto-generated **API Key** (looks like `wab___weekly_this_week` or similar — GHL's exact casing varies)
  - After creation, note the **ID** (from the URL or API — you'll need this for `.env`)

- [ ] Name: `WAB - Weekly Future Weeks`
  - Type: Long text / paragraph
  - Note API Key
  - Note ID

**Verify:** Both show up in the Custom Values list. Copy the API keys and IDs somewhere safe — they go into `.env` and the email template.

---

## 4. Archive legacy tags

**URL:** GHL → Settings → Tags

Archive (do not delete):

- [ ] `WAB-Send-Announcement`
- [ ] `WAB-Send-Reminder`

Confirm these are still active (do not touch):

- [ ] `WAB-Newsletter` — active
- [ ] `WAB-Meetup-Attendee` — active
- [ ] `WAB-Unsubscribed` — active

**Verify:** Announcement and Reminder tags do not appear when searching active tags. The three keepers do.

---

## 5. Create the weekly email template

**URL:** GHL → Marketing → Emails → Templates → Create

- [ ] Name: `Weekly Meetup Email`
- [ ] Subject line: `Memphis AI Meetup — Week Ahead` (static — GHL's date merging is inconsistent; keep subject simple)
- [ ] Body (plain text, paste exactly):

```
Hey {{contact.first_name}},

Here's what's happening at WeAddBots.com events this week:

{{ [merge field: WAB - Weekly This Week] }}

Coming up in the next few weeks:

{{ [merge field: WAB - Weekly Future Weeks] }}

Same format every week — grab a coffee, sit down with other business owners, and talk about what's actually working with AI right now. No presentations, no pitches.

See you there.

Scott Finney
WeAddBots — AI Automation for Memphis Businesses
weaddbots.com



If you'd rather not get these emails anymore, no hard feelings:
https://www.weaddbots.com/unsubscribe?email={{contact.email}}
```

- [ ] **CRITICAL:** Where the template says `[merge field: ...]` above, click the `{ }` merge-field picker in GHL's editor and select the corresponding Custom Value. Do NOT type the merge syntax by hand — GHL's auto-generated API key may not match what you type.
- [ ] Send yourself a test email. Verify both merge fields resolve to placeholder content (they'll be empty until Claude Code writes to them).
- [ ] Verify the unsubscribe link resolves correctly to `https://www.weaddbots.com/unsubscribe?email=your@email.com`.

**Verify:** Test send arrives. First name, both Custom Value placeholders, and unsubscribe link all render.

---

## 6. Create the scheduled workflow

**URL:** GHL → Automation → Workflows → Create

- [ ] Name: `WAB — Weekly Meetup Email`
- [ ] Trigger: Schedule / Recurring
  - Day: Monday
  - Time: 8:00 AM Central
  - Recurrence: Weekly
- [ ] Action 1: Send Email
  - Template: `Weekly Meetup Email`
  - Recipients: Smart List `WAB — Meetup Email List`
- [ ] Save and **Publish**

**Verify:** Workflow shows Active status. Schedule shows next run as the upcoming Monday at 8:00 AM Central.

---

## 7. Verify Smart List is unchanged

**URL:** GHL → Contacts → Smart Lists → `WAB — Meetup Email List`

- [ ] Filter: Tag is `WAB-Newsletter` OR Tag is `WAB-Meetup-Attendee`
- [ ] Filter: Tag is NOT `WAB-Unsubscribed`
- [ ] Contact count looks right (should match approximately your pre-change count)

**Verify:** Smart List filters unchanged from v1. Count sanity-checks.

---

## 8. Save IDs to local `.env`

Once sections 3–7 are complete, open `C:\Dev-Projects\weaddbots\.env` and add:

```
GHL_API_KEY=<paste from Cloudflare Pages env vars — same value>
GHL_LOCATION_ID=<paste from Cloudflare Pages env vars — same value>
GHL_CV_ID_THIS_WEEK=<from section 3, WAB - Weekly This Week ID>
GHL_CV_ID_FUTURE_WEEKS=<from section 3, WAB - Weekly Future Weeks ID>
```

- [ ] File saved
- [ ] Verify `.env` is in `.gitignore` (should already be)
- [ ] Do NOT commit this file

---

## 9. End-to-end dry run

- [ ] Add a dummy event in `meetup-events.json` for a date next week
- [ ] Run Claude Code: "Prepare this week's email"
- [ ] Verify the preview renders
- [ ] Approve the GHL API write
- [ ] Spot-check Custom Values in GHL UI — both should now contain the rendered content
- [ ] Send yourself a test from the workflow (manually trigger, don't wait for Monday 8am)
- [ ] Verify email arrives, merge fields resolve, content is correct
- [ ] Remove the dummy event from JSON, re-sync, verify values update again

---

## Done

After all nine sections are complete, the weekly email is fully live. Next Monday at 8:00 AM Central, it fires automatically to your Smart List using whatever content you've written to the Custom Values.

Running your weekly prep (Friday or Saturday) now does the whole job. No more per-event workflows, no more tag juggling.
