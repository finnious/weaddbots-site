/* 5-Minute Bot Check — scoring, plan copy, and personal-email check.
   Plan wording is the quiz template draft (2026-10-16). */
(function (root) {
    'use strict';

    var OPTIONS = [
        { score: 0, label: 'I do it myself every time' },
        { score: 1, label: "I've got shortcuts, but it's still me" },
        { score: 2, label: 'A tool does part of it' },
        { score: 3, label: 'It runs without me' }
    ];

    var BANDS = {
        'Owner Does It All': "Right now most of the week runs through you. That's normal for a growing business, and it's also the easiest place to win back time. Start with one area, not five.",
        'Patched Together': "You've got tools. They just don't pass work to each other yet, so you're the glue. The fix is connecting what you already pay for.",
        'Mostly Running': "You're past building. Now it's about tightening the spots that still need you and making sure nothing breaks quietly."
    };

    var AREAS = [
        {
            name: 'Lead response',
            question: 'When a new lead calls, texts, or fills out a form, what happens next?',
            steps: [
                'Send an instant text or email reply to every new form, call, or text, even after hours.',
                'Route each new lead to one place, so none of them sit in a voicemail or an inbox.',
                "Set a follow-up reminder if a lead hasn't heard from a person within one business day."
            ]
        },
        {
            name: 'Follow-ups (quotes, invoices, reminders)',
            question: 'How do follow-ups go out (quotes, invoices, reminders)?',
            steps: [
                'Send a quote follow-up automatically 2 days after it goes out.',
                'Send invoice reminders before and after the due date without you touching them.',
                'Send appointment reminders the day before.'
            ]
        },
        {
            name: 'Tool handoffs',
            question: 'How do your tools hand information to each other?',
            steps: [
                "Pick the one tool that's the source of truth for customer info.",
                'Have form entries create the contact there automatically.',
                'Stop retyping between your calendar, CRM, and invoicing. Connect two of them first.'
            ]
        },
        {
            name: 'Notes and recaps',
            question: 'How do notes and recaps get written?',
            steps: [
                'Record or dictate job notes and let AI write the clean version.',
                'Turn meeting notes into a short recap email automatically.',
                'Keep one template for job reports, so every write-up looks the same.'
            ]
        },
        {
            name: 'Owner away',
            question: "When you're away, what happens to the day-to-day?",
            steps: [
                'Write down the 5 things only you do each week.',
                'Automate the reminders and handoffs around those 5 things.',
                "Do a test day where you don't answer anything, and see what stalls."
            ]
        }
    ];

    var PERSONAL_EMAIL_NOTE = 'Looks like a personal email. Use your business email and your plan can be built around your business.';
    var CONTACT_URL = 'https://www.weaddbots.com/contact?src=quiz';
    var PLAN_CLOSE = 'Want to talk through it? Grab 20 minutes with me: ' + CONTACT_URL + ' — Scott';

    /* Keys the submit worker resolves to GHL contact fieldKey contact.{key}. */
    var GHL_KEYS = {
        score: 'score',
        band: 'band',
        weakest_area: 'weakest_area',
        email_type: 'email_type'
    };

    var PERSONAL_HOSTS = {
        gmail: true,
        googlemail: true,
        yahoo: true,
        ymail: true,
        rocketmail: true,
        icloud: true,
        outlook: true,
        hotmail: true,
        live: true,
        msn: true,
        aol: true,
        protonmail: true
    };

    var PUBLIC_SUFFIXES = {
        com: true,
        net: true,
        org: true,
        me: true,
        co: true,
        ca: true,
        de: true,
        fr: true,
        it: true,
        es: true,
        nl: true,
        ie: true,
        us: true,
        'co.uk': true,
        'com.au': true,
        'co.jp': true,
        'co.nz': true,
        'com.br': true,
        'co.in': true,
        'co.za': true,
        'com.mx': true
    };

    function bandFor(score) {
        if (score <= 5) return 'Owner Does It All';
        if (score <= 10) return 'Patched Together';
        return 'Mostly Running';
    }

    function scoreQuiz(values) {
        if (!values || values.length !== AREAS.length) {
            throw new Error('Expected 5 answers');
        }
        var total = 0;
        var weakestIndex = 0;
        for (var i = 0; i < values.length; i++) {
            var value = values[i];
            if (value !== 0 && value !== 1 && value !== 2 && value !== 3) {
                throw new Error('Answer out of range');
            }
            total += value;
            if (value < values[weakestIndex]) weakestIndex = i;
        }
        var area = AREAS[weakestIndex];
        var band = bandFor(total);
        return {
            score: total,
            band: band,
            weakest: area.name,
            intro: BANDS[band],
            steps: area.steps.slice()
        };
    }

    function emailDomain(email) {
        var value = String(email || '').trim().toLowerCase();
        var at = value.lastIndexOf('@');
        if (at < 0 || at === value.length - 1) return '';
        return value.slice(at + 1).replace(/\.+$/, '');
    }

    function isPersonalEmail(email) {
        var domain = emailDomain(email);
        if (!domain || domain.indexOf('.') === -1) return false;
        if (domain === 'me.com' || domain === 'mac.com' || domain === 'pm.me' || domain === 'proton.me' || domain === 'protonmail.ch') {
            return true;
        }
        var parts = domain.split('.');
        if ((parts[0] === 'mail' || parts[0] === 'email') && parts.length > 2) {
            parts = parts.slice(1);
        }
        var host = parts[0];
        var rest = parts.slice(1).join('.');
        if (host === 'proton' && (rest === 'me' || rest === 'com' || rest === 'ch')) return true;
        if (!PERSONAL_HOSTS[host]) return false;
        return !!PUBLIC_SUFFIXES[rest];
    }

    function splitName(name) {
        var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        return {
            first: parts[0] || '',
            last: parts.slice(1).join(' ')
        };
    }

    function buildPlan(result, firstName, business) {
        return {
            header: 'Your plan, built from your answers — for ' + firstName + ' at ' + business,
            meta: 'Score: ' + result.score + '/15 · ' + result.band + ' · Weakest area: ' + result.weakest,
            intro: result.intro,
            steps: result.steps.slice(),
            close: PLAN_CLOSE
        };
    }

    function scoreLine(score) {
        return 'You scored ' + score + ' out of 15.';
    }

    function bandLine(result) {
        return result.band + '. Your biggest time sink is ' + result.weakest + '.';
    }

    root.BotCheck = {
        OPTIONS: OPTIONS,
        AREAS: AREAS,
        BANDS: BANDS,
        GHL_KEYS: GHL_KEYS,
        PERSONAL_EMAIL_NOTE: PERSONAL_EMAIL_NOTE,
        CONTACT_URL: CONTACT_URL,
        PLAN_CLOSE: PLAN_CLOSE,
        bandFor: bandFor,
        scoreQuiz: scoreQuiz,
        isPersonalEmail: isPersonalEmail,
        splitName: splitName,
        buildPlan: buildPlan,
        scoreLine: scoreLine,
        bandLine: bandLine
    };
})(typeof window !== 'undefined' ? window : globalThis);
