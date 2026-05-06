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
const id = next.id || `WAB-${date_iso}-${area}`;

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

// Build ISO datetime for schema.org (Central Time)
const startISO = `${date_iso}T${to24(startTime)}:00-05:00`;
const endISO = `${date_iso}T${to24(endTime)}:00-05:00`;

function to24(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '09:00';
  let [, h, m, period] = match;
  h = parseInt(h);
  // If no AM/PM on this piece, infer from the full time string
  if (!period) {
    period = time.match(/AM|PM/i)?.[0] || 'AM';
  }
  if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
}

console.log(`Updating site for: ${day_of_week}, ${month} ${day} — ${area} (${time})`);

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
// Match: "Next Memphis AI Meetup:</strong> DAY, MONTH DAY &mdash; AREA"
const bannerRegex = /(Next Memphis AI Meetup:<\/strong>\s*)[\w]{3},\s*[\w]+\s*\d{1,2}\s*&mdash;\s*[\w\s]+(<\/span>)/g;
const bannerReplacement = `$1${dayAbbr}, ${monthAbbr} ${day} &mdash; ${area}$2`;

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

  // Events index — featured event card
  if (file === eventsIndexPath) {
    // Section title: "Next Meetup — Month Day"
    content = content.replace(
      /(<h2 class="section-title">Next Meetup &mdash; )[\w]+ \d{1,2}(<\/h2>)/,
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
  }

  // Meetup RSVP page — schema.org, date card, sidebar
  if (file === meetupPagePath) {
    // Schema.org Event @id
    content = content.replace(
      /"@id":\s*"https:\/\/www\.weaddbots\.com\/events\/memphis-ai-meetup#event-[\d-]+"/,
      `"@id": "https://www.weaddbots.com/events/memphis-ai-meetup#event-${date_iso}"`
    );
    // Schema.org Event name
    content = content.replace(
      /"name":\s*"Memphis AI Meetup — [\w\s]+\d{1,2},\s*\d{4}"/,
      `"name": "Memphis AI Meetup — ${month} ${day}, ${year}"`
    );
    // Schema.org startDate / endDate
    content = content.replace(
      /"startDate":\s*"[^"]+"/,
      `"startDate": "${startISO}"`
    );
    content = content.replace(
      /"endDate":\s*"[^"]+"/,
      `"endDate": "${endISO}"`
    );
    // Schema.org location name
    content = content.replace(
      /("location":\s*\{\s*"@type":\s*"Place",\s*"name":\s*")[\w\s]+(")/,
      `$1${area}$2`
    );
    // Schema.org addressLocality
    content = content.replace(
      /("addressLocality":\s*")[\w\s]+(")/,
      `$1${area}$2`
    );

    // "Next Up" date card — input value and data attributes
    content = content.replace(
      /(<label class="date-card next-up">\s*<input type="checkbox" name="event_dates" value=")[\w\d-]+(" data-date=")[\d-]+(" data-area=")[\w\s]+(" data-name=")Memphis AI Meetup — [\w\s\d]+(")/,
      `$1${id}$2${date_iso}$3${area}$4Memphis AI Meetup — ${monthAbbr} ${day}$5`
    );
    // "Next Up" date card — h4 text
    content = content.replace(
      /(date-card-info">\s*<h4>&#128197;\s*)[\w]+,\s*[\w]+\s*\d{1,2}\s*&mdash;\s*[\w\s]+(<\/h4>)/,
      `$1${day_of_week}, ${monthAbbr} ${day} &mdash; ${area}$2`
    );
    // "Next Up" date card — time text
    content = content.replace(
      /(\d{1,2}:\d{2}\s*&ndash;\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*&bull;\s*RSVP to get the exact venue)/,
      `${time.replace('–', '&ndash;')} &bull; RSVP to get the exact venue`
    );

    // Sidebar Quick Details
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
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    totalUpdated++;
    console.log(`  Updated: ${path.relative(ROOT, file)}`);
  }
}

console.log(`\nDone. ${totalUpdated} file(s) updated.`);
console.log(`Next step: git add -A && git commit && git push`);
