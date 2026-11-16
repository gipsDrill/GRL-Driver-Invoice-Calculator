"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const parser = require("../voice-parser.js");
const language = "en-GB";
const now = new Date(2026, 10, 16, 23, 58);
const time = (text) => parser.parseTime(text, { language });
const date = (text, options) => parser.parseDate(text, { language, now, ...options });

const exactTimes = [
  ["six thirty in the morning", "06:30"], ["six thirty AM", "06:30"],
  ["6:30am", "06:30"], ["6:30a.m.", "06:30"], ["six thirty a.m.", "06:30"],
  ["six PM", "18:00"], ["6pm", "18:00"], ["eighteen thirty", "18:30"],
  ["half past six in the morning", "06:30"], ["half six in the morning", "06:30"],
  ["quarter past six AM", "06:15"], ["a quarter to seven AM", "06:45"],
  ["ten past six AM", "06:10"], ["ten to seven AM", "06:50"],
  ["ten minutes to seven in the evening", "18:50"], ["one minute past six AM", "06:01"],
  ["twenty-five past six PM", "18:25"], ["quarter to midnight", "23:45"],
  ["quarter past noon", "12:15"], ["half past twelve PM", "12:30"],
  ["noon", "12:00"], ["midday", "12:00"], ["midnight", "00:00"],
  ["at noon", "12:00"], ["twelve o'clock PM", "12:00"], ["six o’clock AM", "06:00"],
  ["six o clock in the evening", "18:00"], ["six oh five AM", "06:05"],
  ["six zero five AM", "06:05"], ["six zero zero AM", "06:00"],
  ["twenty-one thirty", "21:30"], ["zero thirty", "00:30"],
  ["06:30", "06:30"], ["06.30", "06:30"], ["18:00", "18:00"], ["00:05", "00:05"],
  ["18.30.", "18:30"], ["6 30 AM", "06:30"], ["twelve AM", "00:00"],
  ["six at night", "18:00"], ["three at night", "03:00"], ["twelve at night", "00:00"],
  ["twelve in the morning", "00:00"], ["six in the afternoon", "18:00"],
  ["start six thirty AM", "06:30"], ["end eighteen", "18:00"],
  ["finish time eighteen thirty", "18:30"], ["start time at six thirty AM", "06:30"],
  ["end time six PM", "18:00"], ["from six AM", "06:00"], ["to six PM", "18:00"],
];
for (const [spoken, expected] of exactTimes) {
  test(`English time: ${spoken}`, () => assert.deepEqual(time(spoken), { status: "ok", value: expected }));
}

for (const [spoken, expected] of [
  ["six", ["06:00", "18:00"]], ["six thirty", ["06:30", "18:30"]],
  ["6:30", ["06:30", "18:30"]], ["half six", ["06:30", "18:30"]],
  ["quarter past six", ["06:15", "18:15"]], ["quarter to seven", ["06:45", "18:45"]],
  ["ten past six", ["06:10", "18:10"]], ["ten to seven", ["06:50", "18:50"]],
  ["twelve", ["00:00", "12:00"]], ["12:30", ["00:30", "12:30"]],
  ["quarter to twelve", ["11:45", "23:45"]], ["six o'clock", ["06:00", "18:00"]],
]) {
  test(`English ambiguous time: ${spoken}`, () => {
    const result = time(spoken);
    assert.equal(result.status, "ambiguous");
    assert.deepEqual(result.choices.map((choice) => choice.value), expected);
    assert.match(result.message, /Choose/);
  });
}

for (const spoken of [
  "", null, 630, "6:60", "24:00", "99:99", "-6:30", "6:3", "630", "twenty five", "six sixty",
  "18:00AM", "eighteen in the morning", "six AM PM", "six PM in the morning", "twelve in the evening",
  "midnight PM", "noon AM", "quarter past noon AM", "half past midnight PM", "thirteen at night",
  "start six AM end six PM", "start time six thirty finish eighteen", "6:30 18:00", "from six to seven",
  "from 6:00 to 18:00", "not six AM", "around six AM", "six thirty perhaps AM", "six AM tomorrow",
  "six AM and fifteen minutes", "zero to seven", "sixty past six", "quarter past six or seven",
  "six in the afternoon in the morning", "06:30; delete everything", "twenty-six thirty", "yesterday",
]) {
  test(`English invalid time: ${String(spoken)}`, () => {
    const result = time(spoken);
    assert.equal(result.status, "invalid");
    assert.match(result.message, /Say one time/);
  });
}

for (const [spoken, expected] of [
  ["today", "2026-11-16"], ["yesterday", "2026-11-15"], ["tomorrow", "2026-11-17"],
  ["day before yesterday", "2026-11-14"], ["the day before yesterday", "2026-11-14"],
  ["day after tomorrow", "2026-11-18"], ["the day after tomorrow", "2026-11-18"],
  ["the sixteenth of November twenty twenty-six", "2026-11-16"], ["16 November 2026", "2026-11-16"],
  ["November 16th 2026", "2026-11-16"], ["November 16th, 2026", "2026-11-16"],
  ["November the sixteenth two thousand and twenty six", "2026-11-16"],
  ["sixteenth November two thousand twenty-six", "2026-11-16"],
  ["twenty-first October twenty twenty six", "2026-10-21"],
  ["October twenty-first twenty twenty six", "2026-10-21"],
  ["29 February two thousand and twenty-four", "2024-02-29"],
  ["first January two thousand", "2000-01-01"], ["31 December nineteen ninety-nine", "1999-12-31"],
  ["1 January twenty oh six", "2006-01-01"], ["1 January nineteen hundred", "1900-01-01"],
  ["1 January two thousand one hundred and one", "2101-01-01"],
  ["1 January two thousand and one", "2001-01-01"], ["1 January two thousand one hundred", "2100-01-01"],
  ["16/11/2026", "2026-11-16"], ["16.11.2026", "2026-11-16"], ["16-11-2026", "2026-11-16"],
  ["16 11 2026", "2026-11-16"], ["2026-11-16", "2026-11-16"],
  ["03/04/2026", "2026-04-03"], ["12/11/2026", "2026-11-12"],
  ["date 16 November 2026", "2026-11-16"], ["invoice date on 16 November 2026", "2026-11-16"],
  ["on the sixteenth of November 2026", "2026-11-16"], ["16 Nov 2026", "2026-11-16"],
  ["29 February 2000", "2000-02-29"],
]) {
  test(`English date: ${spoken}`, () => assert.deepEqual(date(spoken), { status: "ok", value: expected }));
}

for (const spoken of ["16 November", "November sixteenth", "the sixteenth of November", "16/11", "16 11"]) {
  test(`English missing year: ${spoken}`, () => {
    const result = date(spoken);
    assert.equal(result.status, "ambiguous");
    assert.deepEqual(result.choices, [{ value: "2026-11-16", label: "16/11/2026" }]);
    assert.match(result.message, /No year was given/);
  });
}
test("English missing year uses only a valid reference date and asks for confirmation", () => {
  assert.equal(date("16 November", { referenceDate: "2027-01-01" }).choices[0].value, "2027-11-16");
  assert.equal(date("16 November", { referenceDate: "2027-02-30" }).choices[0].value, "2026-11-16");
  assert.equal(date("29 February").status, "invalid");
  assert.equal(date("29 February", { referenceDate: "2024-01-01" }).status, "ambiguous");
});

for (const spoken of [
  "", null, "31 November 2026", "29 February 2026", "29 February 1900", "2026-02-30", "00/11/2026",
  "16/00/2026", "16/13/2026", "32/01/2026", "12/31/2026", "11/16/2026", "01/01/0000",
  "16/11/26", "16/11-2026", "2026-1-1", "16 November 26", "16 November twenty six",
  "Monday", "next Sunday", "yesterday or today", "not tomorrow", "16 November and 17 November",
  "16 November 2026 at six AM", "16 November 2026 please", "16 November two thousand perhaps",
  "16 November two thousand and", "16 November two thousand zero", "16 November 2026 2027",
  "November 16th 2026 December", "November 21th 2026", "the thirty-second of November 2026",
  "16 November twenty twenty twenty", "16 11 2026 6 30",
]) {
  test(`English invalid date: ${String(spoken)}`, () => {
    const result = date(spoken);
    assert.equal(result.status, "invalid");
    assert.match(result.message, /Say a valid date/);
  });
}

test("English date handles invalid clock and oversized utterances without guessing", () => {
  assert.equal(date("today", { now: new Date(NaN) }).status, "invalid");
  assert.equal(date("tomorrow ".repeat(50)).status, "invalid");
  assert.equal(time("six AM ".repeat(50)).status, "invalid");
});
test("Language is explicit; Polish remains the default", () => {
  assert.deepEqual(parser.parseTime("godzina szósta trzydzieści rano"), { status: "ok", value: "06:30" });
  assert.equal(parser.parseTime("six thirty AM").status, "invalid");
  assert.equal(time("szósta trzydzieści rano").status, "invalid");
  assert.equal(date("wczoraj").status, "invalid");
  assert.equal(parser.parseDate("wczoraj", { language: "pl-PL", now }).value, "2026-11-15");
});

for (const timezone of ["Europe/London", "America/Los_Angeles", "Pacific/Kiritimati"]) {
  test(`English dates retain local calendar semantics: ${timezone}`, () => {
    const script = `
      const p = require(${JSON.stringify(path.resolve(__dirname, "../voice-parser.js"))});
      const cases = [[new Date(2026, 2, 29, 0, 5), 'yesterday', '2026-03-28'],
        [new Date(2026, 9, 25, 23, 55), 'tomorrow', '2026-10-26'],
        [new Date(2026, 10, 16, 0, 1), 'today', '2026-11-16'],
        [new Date(2026, 10, 16, 23, 59), 'today', '2026-11-16'],
        [new Date(2026, 11, 31, 23, 59), 'tomorrow', '2027-01-01']];
      for (const [now, text, expected] of cases) {
        if (p.parseDate(text, {language: 'en-GB', now}).value !== expected) process.exit(1);
      }
    `;
    const result = spawnSync(process.execPath, ["-e", script], { env: { ...process.env, TZ: timezone }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  });
}
