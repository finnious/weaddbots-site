#!/usr/bin/env node
/**
 * Reads meetup-events.json and updates all hardcoded meetup references
 * across the site. Run after adding/changing events in the JSON.
 *
 * Usage: node scripts/update-meetup.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'meetup-events.json');

// --- Load and find next confirmed event ---

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const next = data.events.find(e => e.status === 'confirmed');

if (!next) {
  console.error('No confirmed event found in meetup-events.json');
  process.exit(1);
}

const { date_iso, day_of_week, date_display, time, area } = next;

// Parse time range ("10:15 – 10:45 AM")
const [startTime, endTimeWithPeriod] = time.split(/\s*[–-]\s*/);
const endTime = endTimeWithPeriod.trim();

// Parse date parts
const dateObj = new Date(date_iso + 'T12:00:00');
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const month = monthNames[dateObj.getMonth()];
const monthAbbr = monthShort[dateObj.getMonth()];
const day = dateObj.getDate();
const year = dateObj.getFullYear();
const dayAbbr = day_of_week.slice(0, 3);

function to24(timeStr, fullTime) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '09:00';
  let [, h, m, period] = match;
  h = parseInt(h);
  // If no AM/PM on this piece, infer from the full time string
  if (!period) {
    period = (fullTime || timeStr).match(/AM|PM/i)?.[0] || 'AM';
  }
  if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

function eventParts(event) {
  const dateObj = new Date(event.date_iso + 'T12:00:00');
  const [startRaw, endRaw] = event.time.split(/\s*[–-]\s*/);
  const startTime = startRaw.trim();
  const endTime = endRaw.trim();
  const bits = (event.venue_private || '').split(',').map((part) => part.trim());
  const regionZip = (bits[3] || '').split(/\s+/).filter(Boolean);
  return {
    month: monthNames[dateObj.getMonth()],
    monthAbbr: monthShort[dateObj.getMonth()],
    day: dateObj.getDate(),
    year: dateObj.getFullYear(),
    startTime,
    endTime,
    startISO: `${event.date_iso}T${to24(startTime, event.time)}:00-05:00`,
    endISO: `${event.date_iso}T${to24(endTime, event.time)}:00-05:00`,
    timeHtml: event.time.replace('–', '&ndash;'),
    id: event.id || `WAB-${event.date_iso}-${event.area}`,
    venueName: (event.venue_public && bits[0]) ? bits[0] : event.area,
    street: bits[1] || '',
    locality: bits[2] || event.area,
    region: regionZip[0] || 'TN',
    postal: regionZip[1] || '',
  };
}

console.log(`Updating site for: ${day_of_week}, ${month} ${day} — ${area} (${time})`);

// Tentative weeks with no set day, time, or venue. These stay out of
// meetup-events.json and out of schema.org Event data so search engines
// never see a fake date. A string is a TBA week. An object keeps the same
// dashed card and replaces the TBA line (used for a skipped holiday week).
// Week of Nov 30 is omitted because Thu Dec 3 covers that week. Week of
// Dec 7 is omitted because Thu Dec 10 covers that week.
// sort is the Monday (or named day) of that week in 2026, so these cards
// interleave with confirmed events in calendar order.
const TBA_WEEKS = [
  { week: 'Week of Nov 23', sort: '2026-11-23', body: 'No meetup this week &mdash; Happy Thanksgiving!' },
  { week: 'Week of Dec 14', sort: '2026-12-14' },
  { week: 'Week of Dec 21', sort: '2026-12-21' },
  { week: 'Week of Dec 28', sort: '2026-12-28' },
];
const UPCOMING_START = '<!-- meetup-upcoming-cards:start -->';
const UPCOMING_END = '<!-- meetup-upcoming-cards:end -->';
const UPCOMING_BLOCK_RE = /[ \t]*<!-- meetup-upcoming-cards:start -->[\s\S]*?<!-- meetup-upcoming-cards:end -->/;
const LEGACY_CARDS_RE = /[ \t]*<label class="date-card next-up">[\s\S]*?<!-- meetup-tba-placeholders:end -->/;
const EVENT_DESCRIPTION = "Free weekly in-person AI meetup for Memphis business owners. Practical conversations about AI automation — what's working, what's not, and how to get started. No pitch, no upsell.";

function tbaWeek(entry) {
  if (typeof entry === 'string') {
    return { week: entry, sort: '9999-99-99', body: 'Date, time &amp; location TBA' };
  }
  return {
    week: entry.week,
    sort: entry.sort,
    body: entry.body || 'Date, time &amp; location TBA',
  };
}

function tbaCard(entry) {
  const week = tbaWeek(entry);
  return [
    '          <div class="date-card tba">',
    '            <div class="date-card-info">',
    `              <h4>&#128197; ${week.week}</h4>`,
    `              <p>${week.body}</p>`,
    '            </div>',
    '          </div>',
  ].join('\n');
}

function confirmedCard(event) {
  const parts = eventParts(event);
  const isNext = event === next;
  const place = (event.venue_public && event.venue_private)
    ? `${parts.timeHtml} &bull; ${parts.venueName}, ${event.area}`
    : `${parts.timeHtml} &bull; RSVP to get the exact venue`;
  const lines = [
    `          <label class="date-card${isNext ? ' next-up' : ''}">`,
    `            <input type="checkbox" name="event_dates" value="${parts.id}" data-date="${event.date_iso}" data-area="${event.area}" data-name="Memphis AI Meetup — ${parts.monthAbbr} ${parts.day}">`,
    '            <div class="date-card-info">',
    `              <h4>&#128197; ${event.day_of_week}, ${parts.monthAbbr} ${parts.day} &mdash; ${event.area}</h4>`,
    `              <p>${place}</p>`,
    '            </div>',
  ];
  if (isNext) lines.push('            <span class="next-badge">Next Up</span>');
  lines.push('          </label>');
  return lines.join('\n');
}

function upcomingItems() {
  const items = data.events
    .filter((event) => event.status === 'confirmed')
    .map((event) => ({
      sort: event.date_iso,
      label: `${event.day_of_week}, ${eventParts(event).monthAbbr} ${eventParts(event).day}${event === next ? ' (Next Up)' : ''}`,
      html: confirmedCard(event),
    }));
  for (const entry of TBA_WEEKS) {
    const week = tbaWeek(entry);
    items.push({ sort: week.sort, label: week.week, html: tbaCard(entry) });
  }
  items.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0));
  return items;
}

function buildUpcomingCardsBlock() {
  const cards = upcomingItems().map((item) => item.html).join('\n\n');
  return `          ${UPCOMING_START}\n${cards}\n          ${UPCOMING_END}`;
}

function ensureUpcomingCards(html) {
  const block = buildUpcomingCardsBlock();
  if (UPCOMING_BLOCK_RE.test(html)) return html.replace(UPCOMING_BLOCK_RE, block);
  if (LEGACY_CARDS_RE.test(html)) return html.replace(LEGACY_CARDS_RE, block);
  return html.replace(
    /<div class="notify-checkbox">/,
    `${block}\n\n          <div class="notify-checkbox">`
  );
}

function buildEventSchema(event) {
  const parts = eventParts(event);
  return [
    '    {',
    '      "@type": "Event",',
    `      "@id": "https://www.weaddbots.com/events/memphis-ai-meetup#event-${event.date_iso}",`,
    `      "name": "Memphis AI Meetup — ${parts.month} ${parts.day}, ${parts.year}",`,
    `      "description": ${JSON.stringify(EVENT_DESCRIPTION)},`,
    `      "startDate": "${parts.startISO}",`,
    `      "endDate": "${parts.endISO}",`,
    '      "eventStatus": "https://schema.org/EventScheduled",',
    '      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",',
    '      "location": {',
    '        "@type": "Place",',
    `        "name": ${JSON.stringify(parts.venueName)},`,
    '        "address": {',
    '          "@type": "PostalAddress",',
    `          "streetAddress": ${JSON.stringify(parts.street)},`,
    `          "addressLocality": ${JSON.stringify(parts.locality)},`,
    `          "addressRegion": ${JSON.stringify(parts.region)},`,
    `          "postalCode": ${JSON.stringify(parts.postal)},`,
    '          "addressCountry": "US"',
    '        }',
    '      },',
    '      "organizer": { "@id": "https://www.weaddbots.com/#organization" },',
    '      "performer": { "@id": "https://www.weaddbots.com/about#scott-finney" },',
    '      "isAccessibleForFree": true,',
    '      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD", "availability": "https://schema.org/InStock", "url": "https://www.weaddbots.com/events/memphis-ai-meetup" },',
    '      "image": "https://www.weaddbots.com/favicon.svg",',
    '      "superEvent": { "@id": "https://www.weaddbots.com/events/#meetup-series" }',
    '    }',
  ].join('\n');
}

function syncConfirmedSchemas(html) {
  const confirmed = data.events.filter((event) => event.status === 'confirmed');
  const block = confirmed.map(buildEventSchema).join(',\n');
  const one = '\\{\\n      "@type": "Event",\\n      "@id": "https:\\/\\/www\\.weaddbots\\.com\\/events\\/memphis-ai-meetup#event-[0-9-]+",[\\s\\S]*?"superEvent": \\{ "@id": "https:\\/\\/www\\.weaddbots\\.com\\/events\\/#meetup-series" \\}\\n    \\}';
  const re = new RegExp(`    ${one}(?:,\\n    ${one})*`);
  if (!re.test(html)) {
    console.error('  Meetup Event schema block not found; left schema unchanged');
    return html;
  }
  html = html.replace(re, block);
  return html.replace(
    /("about": \{ "@id": "https:\/\/www\.weaddbots\.com\/events\/memphis-ai-meetup#event-)[0-9-]+(" \})/,
    `$1${next.date_iso}$2`
  );
}

// --- Collect all HTML files (excluding mnt/) ---

function getHtmlFiles(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'mnt' || entry.name === 'node_modules' || entry.name === '.git') continue;
      files = files.concat(getHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

const htmlFiles = getHtmlFiles(ROOT);
let totalUpdated = 0;

// --- Pattern 1: Event banners across all pages ---
// Display path: "Next Memphis AI Meetup:</strong> DAY, MONTH DAY. AREA. RSVP free."
// Also matches the prior em-dash format so one run migrates leftover pages.
const bannerRegex = /(Next Memphis AI Meetup:<\/strong>\s*)(?:[\w]{3},\s*[\w]+\s*\d{1,2}\s*&mdash;\s*[^<]+|[\w]{3},\s*[\w]+\s*\d{1,2}\.\s*[^.]+\.\s*RSVP free\.)(<\/span>)/g;
const bannerReplacement = `$1${dayAbbr}, ${monthAbbr} ${day}. ${area}. RSVP free.$2`;

// --- Pattern 2: events/index.html — featured event section ---
const eventsIndexPath = path.join(ROOT, 'events', 'index.html');

// --- Pattern 3: events/memphis-ai-meetup.html — schema, date card, sidebar ---
const meetupPagePath = path.join(ROOT, 'events', 'memphis-ai-meetup.html');

// --- Apply updates ---

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Banner replacement (all pages)
  content = content.replace(bannerRegex, bannerReplacement);

  // Locked winner-C intro "Next:" line (RSVP + events index)
  content = content.replace(
    /(<p>Next:\s*)[A-Za-z]+,\s*[A-Za-z]+\s*\d{1,2}\.\s*\d{1,2}:\d{2} to \d{1,2}:\d{2} AM\.[^<]*(<\/p>)/g,
    `$1${day_of_week}, ${monthAbbr} ${day}. ${startTime} to ${endTime}. Congregation Coffee, ${area}.$2`
  );

  // Location pages — "Next metro meetup" and Germantown venue box
  content = content.replace(
    /(Next metro meetup:\s*)[A-Za-z]+,\s*[A-Za-z]+\s*\d{1,2}\s*&bull;\s*\d{1,2}:\d{2}\s*&ndash;\s*\d{1,2}:\d{2}\s*(?:AM|PM)\s*&bull;\s*[A-Za-z ]+(\. RSVP)/g,
    `$1${day_of_week}, ${month} ${day} &bull; ${time.replace('–', '&ndash;')} &bull; ${area}$2`
  );
  content = content.replace(
    /(Next Germantown Meetup<\/h3>\s*<p[^>]*>)[A-Za-z]+,\s*[A-Za-z]+\s*\d{1,2}\s*&bull;\s*\d{1,2}:\d{2}\s*&ndash;\s*\d{1,2}:\d{2}\s*(?:AM|PM)\s*&bull;\s*Congregation Coffee(<\/p>)/,
    `$1${day_of_week}, ${month} ${day} &bull; ${time.replace('–', '&ndash;')} &bull; Congregation Coffee$2`
  );

  // Events index — featured event card
  if (file === eventsIndexPath) {
    // Section title: "Next Meetup — Month Day" (entity or unicode dash)
    content = content.replace(
      /(<h2 class="section-title">Next Meetup (?:&mdash;|—) )[\w]+ \d{1,2}(<\/h2>)/,
      `$1${monthAbbr} ${day}$2`
    );
    // Subtitle: "This week's free meetup is in AREA"
    content = content.replace(
      /(This week's free meetup is in )[\w\s]+(\. Come as you are\.)/,
      `$1${area}$2`
    );
    // Event card header h3
    content = content.replace(
      /(Memphis AI Meetup &mdash; )[\w\s]+(<\/h3>)/,
      `$1${area}$2`
    );
    // Event card header span (day, date • time)
    content = content.replace(
      /(<span>)[\w]+,\s*[\w]+\s*\d{1,2}\s*&bull;\s*\d{1,2}:\d{2}\s*&ndash;\s*\d{1,2}:\d{2}\s*(?:AM|PM)(<\/span>\s*<\/div>\s*<div class="event-card-body">)/,
      `$1${day_of_week}, ${monthAbbr} ${day} &bull; ${time.replace('–', '&ndash;')}$2`
    );
    // Event card meta — date line
    content = content.replace(
      /(&#128197;\s*)[\w]+,\s*[\w]+\s*\d{1,2},\s*\d{4}(<\/span>)/,
      `$1${day_of_week}, ${month} ${day}, ${year}$2`
    );
    // Event card meta — time line
    content = content.replace(
      /(&#9202;\s*)\d{1,2}:\d{2}\s*(?:AM|PM)?\s*&ndash;\s*\d{1,2}:\d{2}\s*(?:AM|PM)?(<\/span>)/,
      `$1${time.replace('–', '&ndash;')}$2`
    );
    // CTA: "Sep 10 — RSVP Free"
    content = content.replace(
      /(btn btn-white btn-lg">)[A-Za-z]+ \d{1,2} &mdash; RSVP Free(<\/a>)/,
      `$1${monthAbbr} ${day} &mdash; RSVP Free$2`
    );
  }

  // Meetup RSVP page — schema.org for every confirmed event, cards in
  // date order, sidebar still describes the next event only.
  if (file === meetupPagePath) {
    content = syncConfirmedSchemas(content);

    // Sidebar Quick Details stay on the next event (Dec 3), not later ones.
    content = content.replace(
      /(&#128197;\s*<strong>Next:<\/strong>\s*)[\w]+,\s*[\w]+\s*\d{1,2}/,
      `$1${day_of_week}, ${monthAbbr} ${day}`
    );
    content = content.replace(
      /(&#9202;\s*<strong>Time:<\/strong>\s*)\d{1,2}:\d{2}\s*&ndash;\s*\d{1,2}:\d{2}\s*(?:AM|PM)?/,
      `$1${time.replace('–', '&ndash;')}`
    );
    content = content.replace(
      /(&#128205;\s*<strong>Where:<\/strong>\s*)[\w\s]+(<\/span>)/,
      `$1${area}$2`
    );

    content = ensureUpcomingCards(content);
    const order = upcomingItems().map((item) => item.label);
    const schemaIds = [...content.matchAll(/"@type": "Event",\s*"@id": "https:\/\/www\.weaddbots\.com\/events\/memphis-ai-meetup#event-(\d{4}-\d{2}-\d{2})"/g)].map((match) => match[1]);
    console.log(`  Upcoming cards: ${order.join(' → ')}`);
    console.log(`  Schema events: ${schemaIds.join(', ')} (about stays #event-${date_iso})`);
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalUpdated++;
    console.log(`  Updated: ${path.relative(ROOT, file)}`);
  }
}

console.log(`\nDone. ${totalUpdated} file(s) updated.`);
console.log(`Next step: git add -A && git commit && git push`);
