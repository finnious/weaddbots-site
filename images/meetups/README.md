# Meetup photos (local SEO)

Real photos from Memphis AI Meetup — no stock imagery.

## Folder layout

One folder per area slug:

- `germantown/`
- `midtown/`
- `east-memphis/`
- `downtown/`
- `collierville/`
- `olive-branch/`
- `uofm/`

## Filename pattern (required)

`YYYY-MM-DD-{venue-slug}-memphis-ai-meetup-{area}.jpg`

Example: `2026-08-20-congregation-coffee-memphis-ai-meetup-germantown.jpg`

## Alt text pattern

`Memphis AI Meetup at {Venue} in {Area} TN — {short visual}, {Month Day, Year}`

## Caption pattern

`{Area} · {Venue} · {Mon D, YYYY} — Memphis AI Meetup`

## Privacy

- Prefer room / venue / over-shoulder context
- Clear faces only when appropriate; blur or remove on request within 48h
- No client-confidential screens in frame

## Optional sidecar JSON

Same basename with `.json`:

```json
{
  "event_id": "WAB-2026-08-20-Germantown",
  "date_iso": "2026-08-20",
  "area": "Germantown",
  "venue_name": "Congregation Coffee",
  "venue_address": "3060 Forest Hill Irene Rd, Germantown, TN 38138",
  "alt": "Memphis AI Meetup at Congregation Coffee in Germantown TN — group conversation, August 20, 2026",
  "faces_clear": true,
  "publishable": true,
  "attendance_count_estimate": 6
}
```

`attendance_count_estimate` supports later attendance logging without blocking SEO publish.
