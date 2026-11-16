"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const parser = require("../voice-parser.js");

const exactTimes = [
  ["godzina szósta trzydzieści rano", "06:30"],
  ["koniec godzina osiemnasta", "18:00"],
  ["start o godzinie szóstej trzydzieści rano", "06:30"],
  ["o ósmej trzydzieści pięć rano", "08:35"],
  ["dwudziesta pierwsza czterdzieści pięć", "21:45"],
  ["dwadzieścia jeden trzydzieści", "21:30"],
  ["szósta zero pięć rano", "06:05"],
  ["szósta zero zero rano", "06:00"],
  ["szósta po południu", "18:00"],
  ["szósta trzydzieści wieczorem", "18:30"],
  ["w pół do siódmej rano", "06:30"],
  ["wpół do siódmej wieczorem", "18:30"],
  ["za kwadrans siódma rano", "06:45"],
  ["kwadrans po szóstej rano", "06:15"],
  ["w pół do pierwszej po południu", "12:30"],
  ["pół do dwunastej w nocy", "23:30"],
  ["kwadrans po północy", "00:15"],
  ["północ", "00:00"],
  ["o północy", "00:00"],
  ["południe", "12:00"],
  ["dwunasta w południe", "12:00"],
  ["dwunasta w nocy", "00:00"],
  ["jedenasta w nocy", "23:00"],
  ["trzecia w nocy", "03:00"],
  ["zero trzydzieści", "00:30"],
  ["06:30", "06:30"],
  ["06.30.", "06:30"],
  ["18:00", "18:00"],
  ["00:05", "00:05"],
  ["6 30 rano", "06:30"],
  ["6:30 PM", "18:30"],
  ["6:30 p.m.", "18:30"],
  ["12 am", "00:00"],
  ["12 pm", "12:00"],
  ["GODZINA SZÓSTA TRZYDZIEŚCI RANO!", "06:30"],
];
for (const [spoken, expected] of exactTimes) {
  test(`time: ${spoken}`, () => assert.deepEqual(parser.parseTime(spoken), { status: "ok", value: expected }));
}

const ambiguousTimes = [
  ["szósta", ["06:00", "18:00"]],
  ["szósta trzydzieści", ["06:30", "18:30"]],
  ["6:30", ["06:30", "18:30"]],
  ["12:30", ["00:30", "12:30"]],
  ["dwunasta", ["00:00", "12:00"]],
  ["w pół do dwunastej", ["11:30", "23:30"]],
  ["za kwadrans pierwsza", ["00:45", "12:45"]],
];
for (const [spoken, values] of ambiguousTimes) {
  test(`ambiguous time: ${spoken}`, () => {
    const result = parser.parseTime(spoken);
    assert.equal(result.status, "ambiguous");
    assert.deepEqual(result.choices.map((choice) => choice.value), values);
  });
}

const invalidTimes = [
  "", null, 630, "6:60", "24:00", "99:99", "-6:30", "6:3", "630",
  "dwadzieścia pięć", "dwudziesta piąta", "szósta sześćdziesiąt",
  "start szósta rano koniec osiemnasta", "6:30 18:00", "szósta rano lub siódma rano",
  "szósta rano wieczorem", "osiemnasta rano", "trzynasta am", "dwunasta wieczorem",
  "północ po południu", "południe rano", "siódma w nocy",
  "nie szósta rano", "około szóstej rano", "szósta trzydzieści chyba rano",
  "6:30; usuń wszystko", "szósta rano i 15 minut", "2026-11-16", "szósta rano jutro",
];
for (const spoken of invalidTimes) {
  test(`invalid time: ${String(spoken)}`, () => assert.equal(parser.parseTime(spoken).status, "invalid"));
}

const now = new Date(2026, 10, 16, 23, 58, 0);
const exactDates = [
  ["dzisiaj", "2026-11-16"], ["dziś", "2026-11-16"], ["wczoraj", "2026-11-15"],
  ["jutro", "2026-11-17"], ["przedwczoraj", "2026-11-14"], ["pojutrze", "2026-11-18"],
  ["16.11.2026", "2026-11-16"], ["16/11/2026", "2026-11-16"], ["16-11-2026", "2026-11-16"],
  ["16 11 2026", "2026-11-16"], ["2026-11-16", "2026-11-16"],
  ["szesnasty listopada 2026", "2026-11-16"],
  ["data szesnastego listopada dwa tysiące dwadzieścia sześć", "2026-11-16"],
  ["na dzień dwudziesty pierwszy października dwa tysiące dwudziestego szóstego roku", "2026-10-21"],
  ["dwudziestego dziewiątego lutego dwa tysiące dwadzieścia cztery", "2024-02-29"],
  ["31 grudnia tysiąc dziewięćset dziewięćdziesiąt dziewięć", "1999-12-31"],
  ["pierwszy stycznia dwutysięcznego roku", "2000-01-01"],
  ["29 lutego 2000", "2000-02-29"],
  ["2026-01-01.", "2026-01-01"],
];
for (const [spoken, expected] of exactDates) {
  test(`date: ${spoken}`, () => assert.deepEqual(parser.parseDate(spoken, { now }), { status: "ok", value: expected }));
}

test("missing year must be confirmed, using valid field year when present", () => {
  const result = parser.parseDate("szesnasty listopada", { now, referenceDate: "2027-03-04" });
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.choices, [{ value: "2027-11-16", label: "16.11.2027" }]);
  assert.match(result.message, /2027/);
});
test("numeric missing year is also ambiguous", () => {
  assert.equal(parser.parseDate("16.11", { now }).status, "ambiguous");
  assert.equal(parser.parseDate("16 11", { now }).choices[0].value, "2026-11-16");
});
test("invalid reference date is ignored; current year still requires confirmation", () => {
  assert.equal(parser.parseDate("16 listopada", { now, referenceDate: "2027-02-30" }).choices[0].value, "2026-11-16");
});
test("missing year never jumps to a leap year", () => {
  assert.equal(parser.parseDate("29 lutego", { now }).status, "invalid");
  assert.equal(parser.parseDate("29 lutego", { now, referenceDate: "2024-01-01" }).choices[0].value, "2024-02-29");
});
test("relative dates cross months and years", () => {
  assert.equal(parser.parseDate("jutro", { now: new Date(2026, 11, 31, 23, 59) }).value, "2027-01-01");
  assert.equal(parser.parseDate("wczoraj", { now: new Date(2026, 0, 1, 0, 1) }).value, "2025-12-31");
});

const invalidDates = [
  "", null, "31 listopada 2026", "29 lutego 2026", "29 lutego 1900", "2026-02-30",
  "00.11.2026", "16.00.2026", "16.13.2026", "32.01.2026", "1.1.0000",
  "16.11.26", "16/11-2026", "2026-1-1", "16 listopada 26", "poniedziałek",
  "następna niedziela", "wczoraj lub dzisiaj", "nie jutro", "16 listopada i 17 listopada",
  "16 listopada 2026 o 6 rano", "16 listopada 2026 proszę", "16 listopada dwa tysiące nie wiem",
  "16 listopada dwa tysiące zero", "16 listopada 2026 2027", "16 11 2026 6 30",
];
for (const spoken of invalidDates) {
  test(`invalid date: ${String(spoken)}`, () => assert.equal(parser.parseDate(spoken, { now }).status, "invalid"));
}
test("invalid clock is rejected", () => assert.equal(parser.parseDate("dziś", { now: new Date(NaN) }).status, "invalid"));
test("long input is bounded", () => {
  assert.equal(parser.parseTime("szósta rano ".repeat(40)).status, "invalid");
  assert.equal(parser.parseDate("jutro ".repeat(80), { now }).status, "invalid");
});

for (const timezone of ["Europe/London", "America/Los_Angeles", "Pacific/Kiritimati"]) {
  test(`local dates and DST: ${timezone}`, () => {
    const script = `
      const p = require(${JSON.stringify(path.resolve(__dirname, "../voice-parser.js"))});
      const cases = [[new Date(2026, 2, 29, 0, 5), 'wczoraj', '2026-03-28'],
        [new Date(2026, 9, 25, 23, 55), 'jutro', '2026-10-26'],
        [new Date(2026, 10, 16, 0, 1), 'dzisiaj', '2026-11-16'],
        [new Date(2026, 10, 16, 23, 59), 'dzisiaj', '2026-11-16']];
      for (const [now, text, expected] of cases) {
        if (p.parseDate(text, {now}).value !== expected) process.exit(1);
      }
    `;
    const result = spawnSync(process.execPath, ["-e", script], { env: { ...process.env, TZ: timezone }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  });
}
