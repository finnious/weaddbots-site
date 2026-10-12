/* Client-side scoring for the AI handoff calculator. No network calls. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.HandoffScore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var MAX_TASKS = 10;
  var MIN_TASKS = 3;

  var SAMPLE = [
    ['Paste the Monday numbers into the sales sheet', 1.5, 5, 5, 5],
    ['Copy new invoices from email into QuickBooks', 3, 5, 5, 4],
    ['Write the weekly update for customers', 2, 3, 2, 5],
    ['Decide which new leads are worth a call', 4, 2, 1, 3]
  ];

  function clampInt(n, min, max) {
    var v = Math.round(Number(n));
    if (!isFinite(v)) return min;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function cleanHours(n) {
    if (n === '' || n == null) return null;
    var v = Number(n);
    if (!isFinite(v)) return null;
    v = Math.round(v * 10) / 10;
    if (v < 0.5 || v > 80) return null;
    return v;
  }

  function scoreOf(repetitive, rules, textData) {
    return Math.round(((repetitive + rules + textData) / 15) * 100);
  }

  /* Conservative share of the weekly hours, by score band. */
  function reclaimRate(score) {
    if (score >= 90) return 0.55;
    if (score >= 75) return 0.4;
    if (score >= 60) return 0.3;
    if (score >= 45) return 0.15;
    if (score >= 25) return 0.05;
    return 0;
  }

  function modeOf(rules) {
    if (rules >= 4) return 'transport';
    if (rules <= 2) return 'translation';
    return 'split';
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function explain(mode, score) {
    var caution = score < 45 ? 'Most of this still needs a person. ' : '';
    if (mode === 'transport') {
      return caution + 'This is transport. You are moving information, and the meaning stays the same. A script fits. Keep a person on the weird ones.';
    }
    if (mode === 'translation') {
      return caution + 'This is translation. Someone has to read it and decide what it means. An AI agent fits, and you still check what comes back.';
    }
    return caution + 'This is part transport, part translation. A script can move the parts that never change. An agent can draft the parts that need a judgment. You keep the exceptions.';
  }

  function modeLabel(mode) {
    if (mode === 'transport') return 'Transport';
    if (mode === 'translation') return 'Translation';
    return 'Transport and translation';
  }

  function scoreTasks(tasks) {
    var ranked = tasks.map(function (t, index) {
      var score = scoreOf(t.r, t.u, t.d);
      var rate = reclaimRate(score);
      var hoursBack = round1(t.h * rate);
      var mode = modeOf(t.u);
      return {
        n: t.n,
        h: t.h,
        r: t.r,
        u: t.u,
        d: t.d,
        score: score,
        rate: rate,
        hoursBack: hoursBack,
        mode: mode,
        modeLabel: modeLabel(mode),
        explain: explain(mode, score),
        index: index
      };
    });
    ranked.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.hoursBack !== a.hoursBack) return b.hoursBack - a.hoursBack;
      return a.index - b.index;
    });
    var totalHours = round1(ranked.reduce(function (sum, t) { return sum + t.h; }, 0));
    var totalBack = round1(ranked.reduce(function (sum, t) { return sum + t.hoursBack; }, 0));
    return {
      ranked: ranked,
      totalHours: totalHours,
      totalBack: totalBack,
      firstIsWeak: ranked.length > 0 && ranked[0].score < 45
    };
  }

  function blankRow() {
    return { n: '', h: '', r: 3, u: 3, d: 3 };
  }

  function normalizeRow(row) {
    if (!Array.isArray(row) || row.length < 5) return null;
    var name = String(row[0] == null ? '' : row[0]).replace(/\s+/g, ' ').trim().slice(0, 80);
    var hours = row[1] === '' || row[1] == null ? '' : cleanHours(row[1]);
    if (hours == null) hours = '';
    return {
      n: name,
      h: hours,
      r: clampInt(row[2], 1, 5),
      u: clampInt(row[3], 1, 5),
      d: clampInt(row[4], 1, 5)
    };
  }

  function serialize(rows) {
    return JSON.stringify(rows.map(function (t) {
      return [t.n, t.h === '' || t.h == null ? '' : t.h, t.r, t.u, t.d];
    }));
  }

  function parse(raw) {
    if (!raw) return null;
    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return null;
    }
    if (!Array.isArray(data)) return null;
    var rows = [];
    for (var i = 0; i < data.length && rows.length < MAX_TASKS; i++) {
      var row = normalizeRow(data[i]);
      if (row) rows.push(row);
    }
    return rows.length ? rows : null;
  }

  function sampleRows() {
    return SAMPLE.map(function (row) {
      return normalizeRow(row);
    });
  }

  function readyTask(row) {
    var name = String(row.n || '').replace(/\s+/g, ' ').trim();
    var hours = cleanHours(row.h);
    if (!name || hours == null) return null;
    return {
      n: name.slice(0, 80),
      h: hours,
      r: clampInt(row.r, 1, 5),
      u: clampInt(row.u, 1, 5),
      d: clampInt(row.d, 1, 5)
    };
  }

  function formatHours(n) {
    var v = round1(Number(n));
    if (!isFinite(v)) v = 0;
    var text = Math.abs(v - Math.round(v)) < 0.001 ? String(Math.round(v)) : v.toFixed(1);
    return text + (v === 1 ? ' hour' : ' hours');
  }

  function formatPct(rate) {
    return Math.round(rate * 100) + '%';
  }

  function copyText(result, shareUrl) {
    var lines = ['Which job should I hand to AI?', shareUrl, ''];
    result.ranked.forEach(function (t, i) {
      var head;
      if (i === 0 && result.firstIsWeak) {
        head = 'Start here if you start anywhere: ' + t.n;
      } else if (i === 0) {
        head = 'Hand this one off first: ' + t.n;
      } else {
        head = (i + 1) + '. ' + t.n;
      }
      lines.push(head);
      lines.push(
        'Score ' + t.score + '. About ' + formatHours(t.hoursBack) +
        ' of ' + formatHours(t.h) + ' a week (' + formatPct(t.rate) + '). ' +
        t.modeLabel + '.'
      );
      lines.push(t.explain);
      lines.push('');
    });
    lines.push(
      'Hours you might get back: about ' + formatHours(result.totalBack) +
      ' of ' + formatHours(result.totalHours) + ' a week.'
    );
    lines.push('');
    lines.push('Score = (Repetitive + Rule-based + Text/data) / 15 x 100');
    lines.push('Hours back use a conservative percent of the weekly hours: 55% at 90-100, 40% at 75-89, 30% at 60-74, 15% at 45-59, 5% at 25-44, and 0% below 25.');
    lines.push('Rule-based 4 or 5 is transport (a script). 1 or 2 is translation (an AI agent). 3 is both.');
    return lines.join('\n');
  }

  return {
    MAX_TASKS: MAX_TASKS,
    MIN_TASKS: MIN_TASKS,
    SAMPLE: SAMPLE,
    blankRow: blankRow,
    clampInt: clampInt,
    cleanHours: cleanHours,
    scoreOf: scoreOf,
    reclaimRate: reclaimRate,
    modeOf: modeOf,
    scoreTasks: scoreTasks,
    serialize: serialize,
    parse: parse,
    sampleRows: sampleRows,
    readyTask: readyTask,
    formatHours: formatHours,
    formatPct: formatPct,
    copyText: copyText
  };
});
