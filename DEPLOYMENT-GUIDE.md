# WeAddBots.com — Deployment & Launch Guide

*Generated: February 2, 2026*
*For: WeAddBots / Creating Value LLC*

---

## What Changed

This update replaces the entire site content. Every HTML page has been rewritten with expanded content, structured data, and Business Cortex voice. Here's the before/after:

| Metric | Before | After |
|--------|--------|-------|
| Visible word count (homepage) | ~150 words | ~1,015 words |
| Total site word count | ~400 words | ~7,000+ words |
| Schema.org JSON-LD blocks | 0 | 21 |
| FAQ sections with schema | 0 | 3 pages (15 questions) |
| Pages with answer-first structure | 0 | 6 pages |
| GHL form integrations | 2 (preserved) | 2 (preserved exactly) |
| Clicky analytics | All pages | All pages (deferred) |
| llms.txt | Basic | Enhanced per GEO guide |
| robots.txt | Default | AI crawlers explicitly allowed |
| sitemap.xml | Basic | With `<lastmod>` freshness signals |
| Total gzipped size | ~50 KB | ~50.4 KB |

---

## Complete File Manifest

### Files to Deploy (14 total)

```
weaddbots-site/
├── index.html                              (22,606 bytes)  Homepage
├── about.html                              (16,382 bytes)  About page
├── services.html                           (25,934 bytes)  Services page
├── contact.html                            (29,319 bytes)  Contact + Free AI Assessment
├── 404.html                                 (4,895 bytes)  Custom error page
├── privacy.html                            (10,687 bytes)  Privacy policy
├── terms.html                               (9,509 bytes)  Terms of service
├── styles.css                              (30,196 bytes)  Complete CSS framework
├── robots.txt                                 (364 bytes)  AI crawler permissions
├── llms.txt                                 (1,979 bytes)  AI site summary
├── sitemap.xml                              (1,256 bytes)  With lastmod dates
├── events/
│   ├── index.html                          (12,336 bytes)  Events hub
│   └── memphis-ai-meetup-feb-2026.html     (28,451 bytes)  Feb 2026 event
└── functions/
    └── api/
        └── submit.js                        (3,058 bytes)  GHL v2 API + upsert
```

### What Replaces What

| New File | Replaces | Notes |
|----------|----------|-------|
| `index.html` | Existing `index.html` | Full rewrite, schema added |
| `about.html` | Existing `about.html` | Full rewrite, Person/Org schema |
| `services.html` | Existing `services.html` | Full rewrite, 3 Service + HowTo schemas |
| `contact.html` | Existing `contact.html` | Full rewrite, GHL form preserved exactly |
| `404.html` | Existing `404.html` (if any) | New custom error page |
| `privacy.html` | Existing `privacy.html` (if any) | New or updated |
| `terms.html` | Existing `terms.html` (if any) | New or updated |
| `styles.css` | Existing `styles.css` | Complete rewrite — expanded CSS framework |
| `robots.txt` | Existing `robots.txt` | Updated with AI crawler rules |
| `llms.txt` | Existing `llms.txt` | Enhanced structure |
| `sitemap.xml` | Existing `sitemap.xml` | Added `<lastmod>` dates |
| `events/index.html` | Existing events index | Rewrite |
| `events/memphis-ai-meetup-feb-2026.html` | Existing event page | Rewrite with Event schema |
| `functions/api/submit.js` | Existing `functions/api/submit.js` | Same logic, clean version |

### Files NOT Included (Keep Existing)

These files from the current repo should remain untouched:

- `img/` directory (favicon, social images) — keep all existing images
- `.github/` directory — keep if exists
- Any other static assets not listed above

---

## Deployment Steps

### Step 1: Backup Current Site

```bash
# Clone current production repo
git clone https://github.com/finnious/weaddbots-site.git weaddbots-backup
cd weaddbots-backup
git log --oneline -5   # Note the current commit hash
```

### Step 2: Apply Updates

```bash
# In your local repo clone
cd weaddbots-site

# Copy all files from the update package, overwriting existing
# (Preserve the img/ directory and any other assets not in the update)
cp -r /path/to/update/* .

# Verify nothing in img/ was overwritten
git status
```

### Step 3: Review Changes

```bash
# Review what changed
git diff --stat

# Spot-check key files
git diff index.html | head -100
git diff functions/api/submit.js
```

### Step 4: Commit & Push

```bash
git add -A
git commit -m "On-page content audit: expanded content, 21 schema blocks, AEO/GEO optimization

- Homepage: 1,015 words, Organization/WebSite/FAQ/Breadcrumb schemas
- About: 952 words, Person/Organization/Breadcrumb schemas
- Services: 1,273 words, 3 Service/HowTo/Breadcrumb schemas
- Events: Event/FAQ/Breadcrumb schemas, RSVP form preserved
- Contact: ProfessionalService/FAQ/Breadcrumb schemas, GHL form preserved
- New: 404, privacy, terms pages
- Enhanced: robots.txt (AI crawlers), llms.txt, sitemap.xml (lastmod)
- CSS: Complete framework rewrite (30KB raw, ~6.3KB gzipped)
- Total gzipped site: ~50.4 KB"

git push origin main
```

### Step 5: Verify Cloudflare Pages Build

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → weaddbots-site
2. Watch for the new deployment to trigger automatically
3. Verify build succeeds (should be near-instant for a static site)
4. Check the preview URL before promoting to production (if configured)

---

## Post-Deployment Validation

### Immediate Checks (Do These First)

**1. Visual spot-check every page:**

| URL | What to Verify |
|-----|----------------|
| https://weaddbots.com/ | Hero, service cards, FAQ accordion, nav, footer |
| https://weaddbots.com/about | Founder bio, community section, nav/footer |
| https://weaddbots.com/services | 3 service sections, comparison table, process steps |
| https://weaddbots.com/contact | Contact form submits, FAQ accordion, sidebar |
| https://weaddbots.com/events/ | Events hub, upcoming events card |
| https://weaddbots.com/events/memphis-ai-meetup-feb-2026 | Event details, RSVP form submits, FAQ |
| https://weaddbots.com/privacy | Content loads, links work |
| https://weaddbots.com/terms | Content loads, links work |
| https://weaddbots.com/404-test | Custom 404 page displays |

**2. Test mobile responsiveness:**
- Check every page on mobile (or Chrome DevTools → mobile view)
- Verify hamburger menu opens/closes
- Verify forms are usable on mobile
- Verify FAQ accordions work on mobile

**3. Test both forms:**

Contact form (`/contact`):
- Fill in: first name, email, select "Free AI Assessment"
- Submit → should show success message
- Verify lead appears in GoHighLevel with correct tags and custom fields

Event RSVP (`/events/memphis-ai-meetup-feb-2026`):
- Fill in: first name, email
- Submit → should show success message
- Verify lead appears in GoHighLevel with event name, date, venue custom fields

**4. Verify key files:**

| URL | Expected |
|-----|----------|
| https://weaddbots.com/robots.txt | Shows AI crawler allow rules |
| https://weaddbots.com/llms.txt | Shows enhanced site summary |
| https://weaddbots.com/sitemap.xml | Shows all pages with `<lastmod>` dates |

### Schema Validation

Run each indexable page through the Schema.org validator:

**Tool:** https://validator.schema.org/

| Page | Expected Schemas |
|------|-----------------|
| `/` | Organization, WebSite, BreadcrumbList, FAQPage (5 Qs) |
| `/about` | Person, Organization, BreadcrumbList |
| `/services` | Service ×3, HowTo, BreadcrumbList |
| `/contact` | ProfessionalService, FAQPage (5 Qs), BreadcrumbList |
| `/events/` | BreadcrumbList |
| `/events/memphis-ai-meetup-feb-2026` | Event, FAQPage (5 Qs), BreadcrumbList |

Also validate using Google's Rich Results Test: https://search.google.com/test/rich-results

### PageSpeed Check

Run each main page through PageSpeed Insights: https://pagespeed.web.dev/

Target: **90+ on mobile and desktop** (the site was 100 mobile before; with expanded content it should still be very high given no images, no external CDN, deferred analytics).

---

## Search Console & Webmaster Tools Submission

**This is the most critical step for fixing the zero-visibility issue identified in the content audit.**

### Google Search Console

**If not already set up:**

1. Go to https://search.google.com/search-console/
2. Add property: `https://weaddbots.com`
3. Verify ownership via:
   - **DNS TXT record** (preferred — add to Cloudflare DNS): Google provides a `google-site-verification=XXXXX` TXT record
   - Or **HTML file upload**: Upload the verification file to the site root

**Once verified:**

4. **Submit sitemap:**
   - Go to Sitemaps → Add: `https://weaddbots.com/sitemap.xml`
   - Verify it's accepted (status: "Success")

5. **Request indexing for each page:**
   - Go to URL Inspection → enter each URL
   - Click "Request Indexing" for each:
     - `https://weaddbots.com/`
     - `https://weaddbots.com/about`
     - `https://weaddbots.com/services`
     - `https://weaddbots.com/contact`
     - `https://weaddbots.com/events/`
     - `https://weaddbots.com/events/memphis-ai-meetup-feb-2026`
   - Note: Google limits indexing requests to ~10/day

6. **Check for issues:**
   - Coverage report → look for excluded pages or errors
   - Mobile Usability report → should be all green
   - Rich Results report → should show FAQ and Event results

### Bing Webmaster Tools

**This is especially important — the GEO guide calls out Bing as ChatGPT's primary retrieval source.**

1. Go to https://www.bing.com/webmasters/
2. Sign in with Microsoft account
3. Add site: `https://weaddbots.com`
4. Verify ownership (DNS or meta tag — can use same Cloudflare DNS approach)

**Once verified:**

5. **Submit sitemap:**
   - Go to Sitemaps → Submit: `https://weaddbots.com/sitemap.xml`

6. **Submit URLs for indexing:**
   - Go to Submit URLs → add each page URL
   - Bing is typically faster than Google for initial indexing

7. **Import from Google Search Console** (optional but recommended):
   - Bing offers a GSC import feature that pulls in your site data

### Cloudflare Bot Access Check

**Critical:** Cloudflare's bot protection may be blocking AI crawlers. This was flagged in the content audit as a potential cause of zero visibility.

1. Go to Cloudflare Dashboard → weaddbots-site → Security → Bots
2. Check Bot Fight Mode settings:
   - If "Bot Fight Mode" is enabled, AI crawlers (GPTBot, ClaudeBot, PerplexityBot) may be getting challenge pages instead of your content
   - **Recommended:** Set to "Off" or create specific rules to allow verified bot user agents

3. Check Security → WAF → Custom Rules:
   - Ensure no rules are blocking known AI crawler user agents
   - Known AI crawler user agents to allow:
     - `GPTBot` (OpenAI/ChatGPT)
     - `ClaudeBot` (Anthropic)
     - `PerplexityBot` (Perplexity)
     - `Google-Extended` (Google AI)
     - `Googlebot` (Google Search)
     - `Bingbot` (Bing/ChatGPT retrieval)

4. Check Security → Settings:
   - Security Level should not be set to "I'm Under Attack!" (this challenges all visitors including bots)

5. **Test bot access:**
   - Use `curl` with a bot user agent to verify the site serves content:
   ```bash
   curl -A "GPTBot" https://weaddbots.com/ | head -50
   curl -A "ClaudeBot" https://weaddbots.com/ | head -50
   curl -A "Bingbot" https://weaddbots.com/ | head -50
   ```
   - All three should return HTML content, not a Cloudflare challenge page

---

## Ongoing Maintenance

### Weekly

- Update event page when new meetup details are confirmed
- Check GSC for indexing status and any crawl errors
- Monitor Bing Webmaster Tools for indexing progress

### Monthly

- Update `<lastmod>` dates in `sitemap.xml` for any pages with content changes
- Update "Last updated" visible timestamps on changed pages
- Review PageSpeed scores after any content additions
- Check schema validation if any structured data changes

### Quarterly

- Review and update the Business Cortex voice alignment
- Add new FAQ questions based on actual customer inquiries
- Create event recap content (citation magnets for AI engines)
- Consider adding new pages from the content audit roadmap:
  - `/faq` — Dedicated FAQ page with comprehensive questions
  - `/ai-automation-memphis` — Pillar content page
  - `/how-it-works` — Detailed process page
  - `/case-studies` — Client success stories
  - `/blog` or `/resources` — Content hub

### When Adding New Events

For each new event, duplicate the event page template:

1. Copy `events/memphis-ai-meetup-feb-2026.html`
2. Update: event name, date, location, description, FAQ
3. Update Event schema JSON-LD (name, startDate, location, description)
4. Update `events/index.html` to feature the new event
5. Add new URL to `sitemap.xml` with current `<lastmod>`
6. Request indexing in GSC and Bing Webmaster Tools

---

## Schema Inventory (Complete Reference)

**21 total JSON-LD blocks across 9 pages:**

### Homepage (`index.html`)
1. `Organization` — WeAddBots (@id, name, url, logo, description, founder, foundingDate, areaServed, sameAs)
2. `WebSite` — WeAddBots (url, potentialAction/SearchAction)
3. `BreadcrumbList` — Home
4. `FAQPage` — 5 questions

### About (`about.html`)
5. `Person` — Scott Finney (@id, name, jobTitle, url, sameAs, worksFor, knowsAbout)
6. `Organization` — WeAddBots (references founder @id)
7. `BreadcrumbList` — Home → About

### Services (`services.html`)
8. `Service` — Lead Response Automation (provider, areaServed, description)
9. `Service` — Task Automation
10. `Service` — Smart Workflows
11. `HowTo` — How AI Automation Works with WeAddBots (4 steps)
12. `BreadcrumbList` — Home → Services

### Contact (`contact.html`)
13. `ProfessionalService` — WeAddBots (legalName, priceRange, areaServed, ContactPoint, founder)
14. `FAQPage` — 5 questions
15. `BreadcrumbList` — Home → Contact

### Events Hub (`events/index.html`)
16. `BreadcrumbList` — Home → Events

### Event Page (`events/memphis-ai-meetup-feb-2026.html`)
17. `Event` — Memphis AI Meetup Feb 2026 (startDate, location, organizer, eventAttendanceMode)
18. `FAQPage` — 5 questions
19. `BreadcrumbList` — Home → Events → Memphis AI Meetup

### Privacy (`privacy.html`)
20. `BreadcrumbList` — Home → Privacy Policy

### Terms (`terms.html`)
21. `BreadcrumbList` — Home → Terms of Service

---

## GHL Integration Reference

### API Endpoint
```
POST https://services.leadconnectorhq.com/contacts/upsert
```
Proxied through: `POST /api/submit` (Cloudflare Pages Function)

### Custom Field IDs

| Field | ID | Used In |
|-------|----|---------|
| Inquiry Type | `eITRQJpf0jUlGI8aOm6o` | contact.html, event page |
| Area/Venue | `pGVZpiJGCT9XgPJalNSC` | event page |
| Event Name | `vo9iUqMmSpGpCEFM5C66` | event page |
| Event Date | `bpKUQhL2nQX6mC9mAcN7` | event page |
| Source Page | `Q8mqK6YWLAExkUX84K1R` | contact.html, event page |

### Environment Variable Required
```
GHL_API_KEY = [your GoHighLevel API key]
```
Set in: Cloudflare Pages → Settings → Environment Variables

---

## Content Audit Checklist — What's Done

From the original on-page content audit:

### Week 1 (Critical Foundation) ✅
- [x] Add Organization schema (JSON-LD) to homepage
- [x] Add LocalBusiness/ProfessionalService schema to contact page
- [x] Add Event schema to events page
- [x] Enhanced robots.txt for AI crawler access
- [x] Enhanced sitemap.xml with `<lastmod>` freshness signals

### Week 2 (Content Depth) ✅
- [x] Rewrite homepage with answer-first structure (1,015 words)
- [x] Add Scott Finney authorship and bio to about page
- [x] Expand service descriptions with examples, outcomes, process
- [x] Add FAQ sections to homepage, contact page, and event page
- [x] Add visible "Last updated" timestamps to main pages

### Week 3 (Schema + Entity) ✅
- [x] Add Person schema for Scott Finney (about page)
- [x] Add Service schema (services page — 3 schemas)
- [x] Add BreadcrumbList schema to all pages (9 pages)
- [x] Add sameAs links to LinkedIn in Organization schema
- [x] Enhance llms.txt with full recommended structure
- [x] All schemas validate (21 blocks, 0 errors)

### Still To Do (Post-Launch)
- [ ] Verify Google Search Console submission ← **DO THIS IMMEDIATELY**
- [ ] Verify Bing Webmaster Tools submission ← **DO THIS IMMEDIATELY**
- [ ] Confirm Cloudflare isn't blocking crawlers ← **DO THIS IMMEDIATELY**
- [ ] Validate schemas at validator.schema.org
- [ ] Run PageSpeed Insights on all pages
- [ ] Create `/faq` dedicated page
- [ ] Create `/ai-automation-memphis` pillar page
- [ ] Publish first meetup recap
- [ ] Create `/how-it-works` process page
- [ ] Write first case study (inventory management story)

---

*This guide should be kept alongside the repository. Update it whenever significant site changes are made.*
