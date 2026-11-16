"use strict";

// Runtime tests use the shipped React application, rather than a replacement
// form. Install jsdom locally, or set GRL_JSDOM_PATH to an existing installation.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require(process.env.GRL_JSDOM_PATH || "jsdom");

const ROOT = path.resolve(__dirname, "..");
const APP_HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const pause = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, description, timeout = 1800) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeout) {
      assert.fail(`Timed out waiting for ${description}`);
    }
    await pause(10);
  }
}

function speechEvent(transcript, isFinal = true) {
  const result = [{ transcript, confidence: 0.94 }];
  result.isFinal = isFinal;
  return { resultIndex: 0, results: [result] };
}

async function mount(t, { speech = true, storage = {} } = {}) {
  const sessions = [];
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error.message));
  virtualConsole.on("error", (...args) => errors.push(args.join(" ")));

  class FakeSpeechRecognition {
    constructor() {
      sessions.push(this);
      this.started = false;
      this.aborted = false;
    }
    start() {
      this.started = true;
      queueMicrotask(() => this.onstart?.({}));
    }
    stop() {
      this.stopped = true;
    }
    abort() {
      this.aborted = true;
      queueMicrotask(() => this.onend?.({}));
    }
    interim(transcript) {
      this.onresult?.(speechEvent(transcript, false));
    }
    final(transcript) {
      this.onresult?.(speechEvent(transcript, true));
      this.onend?.({});
    }
    error(code) {
      this.onerror?.({ error: code });
      this.onend?.({});
    }
  }

  const dom = new JSDOM(APP_HTML, {
    url: "https://gipsdrill.github.io/GRL-Driver-Invoice-Calculator/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
      window.TextEncoder = TextEncoder;
      window.TextDecoder = TextDecoder;
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
      window.matchMedia = (query) => ({
        matches: false,
        media: query,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
      });
      window.CSS ||= {};
      window.CSS.escape = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
      Object.defineProperty(window, "isSecureContext", { value: true });

      // jsdom does not render layout. Supply only the visibility information
      // needed for the enhancement's stale-field checks, not visual assertions.
      window.HTMLElement.prototype.getClientRects = function () {
        if (!this.isConnected || this.closest("[hidden]")) return [];
        return [{ x: 0, y: 0, top: 0, left: 0, right: 180, bottom: 44, width: 180, height: 44 }];
      };
      if (speech) window.SpeechRecognition = FakeSpeechRecognition;
    },
  });
  const { window } = dom;
  const document = window.document;
  t.after(() => {
    window.close();
    assert.deepEqual(errors, [], "No uncaught runtime errors in the actual app");
  });
  await waitFor(() => document.querySelector(".day-card"), "React application mount");
  for (const filename of ["voice-parser.js", "voice-input.js"]) {
    window.eval(fs.readFileSync(path.join(ROOT, filename), "utf8"));
  }
  await pause(50);
  if (speech) {
    await waitFor(() => document.querySelector(".grl-voice-button"), "voice controls");
  }

  const desktop = (field, day = "Monday", week = 1) => {
    const prefix = field === "date" ? "Date" : field === "start" ? "Start time" : "End time";
    return document.querySelector(`input[aria-label="${prefix} for ${day}, week ${week}"]`);
  };
  const action = (name) => document.querySelector(`#grl-voice-panel [data-voice-action="${name}"]`);
  const nativeEdit = async (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    input.dispatchEvent(new window.Event("change", { bubbles: true }));
    await pause();
  };
  const clickText = async (label) => {
    const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent.trim() === label);
    assert.ok(button, `Button ${label} exists`);
    button.click();
    await pause();
  };
  const begin = async (input, expectedLanguage = "pl-PL") => {
    const button = input.parentElement.querySelector(".grl-voice-button");
    assert.ok(button, "Target field has a microphone");
    const count = sessions.length;
    button.click();
    await waitFor(() => sessions.length > count, "recognition session start");
    await pause();
    const recognition = sessions.at(-1);
    assert.equal(recognition.lang, expectedLanguage, "Recognition uses the chosen language");
    assert.equal(recognition.started, true);
    return recognition;
  };
  const speak = async (input, transcript, expectedLanguage = "pl-PL") => {
    const recognition = await begin(input, expectedLanguage);
    recognition.final(transcript);
    await pause(45);
    return recognition;
  };
  const chooseLanguage = async (value) => {
    const select = document.getElementById("grl-voice-language");
    assert.ok(select, "The voice panel provides a language selector");
    select.value = value;
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
    await pause();
  };
  const restart = async (expectedLanguage) => {
    const count = sessions.length;
    assert.ok(action("retry"), "Language change offers an explicit restart action");
    action("retry").click();
    await waitFor(() => sessions.length > count, "recognition restart");
    await pause();
    const recognition = sessions.at(-1);
    assert.equal(recognition.lang, expectedLanguage);
    assert.equal(recognition.started, true);
    return recognition;
  };
  const panelText = () => document.getElementById("grl-voice-panel")?.textContent || "";
  return { window, document, desktop, action, nativeEdit, clickText, begin, speak, chooseLanguage, restart, sessions, panelText };
}

test("microphones survive React updates and week switches without duplication", async (t) => {
  const app = await mount(t);
  const countInputs = () => app.document.querySelectorAll('input[type="date"], input[type="time"]').length;
  const countButtons = () => app.document.querySelectorAll(".grl-voice-button").length;
  assert.equal(countInputs(), 87);
  assert.equal(countButtons(), countInputs());
  await app.nativeEdit(app.desktop("start"), "06:30");
  assert.equal(countButtons(), countInputs());
  await app.clickText("Week 1");
  await pause(40);
  assert.equal(countButtons(), countInputs());
  await app.clickText("Week 1 + Week 2");
  await pause(40);
  assert.equal(countButtons(), countInputs());
  for (const input of app.document.querySelectorAll('input[type="date"], input[type="time"]')) {
    assert.equal(input.parentElement.querySelectorAll(".grl-voice-button").length, 1);
  }
});

test("final speech updates real React state, calculation, Save and Load; interim text does not", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const recognition = await app.begin(start);
  recognition.interim("godzina szósta trzydzieści rano");
  await pause();
  assert.equal(start.value, "", "Interim speech cannot change payable hours");
  recognition.final("godzina szósta trzydzieści rano");
  await pause(45);
  assert.equal(start.value, "06:30");
  assert.equal(app.document.querySelector('.day-card .mobile-fields input[type="time"]').value, "06:30");
  await app.speak(app.desktop("end"), "koniec godzina osiemnasta");
  assert.equal(app.desktop("end").value, "18:00");
  await app.clickText("Calculate All");
  assert.equal(app.document.querySelector(".work-table tbody tr .result-cell").textContent, "10.75");
  assert.equal(app.document.querySelector(".work-table tbody tr .salary-cell").textContent, "£177.38");
  await app.clickText("Save");
  const saved = JSON.parse(app.window.localStorage.getItem("workData"));
  assert.equal(saved.entries[0].start, "06:30");
  assert.equal(saved.entries[0].end, "18:00");
  await app.nativeEdit(start, "09:00");
  await app.clickText("Load");
  assert.equal(start.value, "06:30");
  assert.equal(app.document.querySelector('.day-card .mobile-fields input[type="time"]').value, "06:30");
});

test("ambiguous spoken hour requires an explicit AM or PM choice", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  await app.nativeEdit(start, "07:00");
  await app.speak(start, "szósta");
  assert.equal(start.value, "07:00");
  const choices = [...app.document.querySelectorAll('#grl-voice-panel [data-voice-action="apply"]')];
  assert.deepEqual(choices.map((button) => button.dataset.value).sort(), ["06:00", "18:00"]);
  choices.find((button) => button.dataset.value === "18:00").click();
  await pause(45);
  assert.equal(start.value, "18:00");
});

test("keyboard focus follows a voice choice and returns to its microphone on Escape", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const microphone = start.parentElement.querySelector(".grl-voice-button");
  microphone.focus();
  await app.speak(start, "szósta");
  const choice = app.action("apply");
  assert.ok(choice);
  assert.equal(app.document.activeElement, choice, "First interpretation receives keyboard focus");
  const selectedValue = choice.dataset.value;
  choice.click();
  await pause(45);
  assert.equal(start.value, selectedValue);
  const panel = app.document.getElementById("grl-voice-panel");
  assert.ok(panel.contains(app.document.activeElement), "Focus remains in the updated result panel");
  assert.equal(app.document.activeElement, app.action("undo"), "Focus moves to the replacement action");
  app.document.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await pause();
  assert.equal(panel.hidden, true);
  assert.equal(app.document.activeElement, microphone, "Escape restores the originating microphone focus");
});

test("mobile card speech targets the correct week and supports an overnight shift", async (t) => {
  const app = await mount(t);
  const mondayWeek2 = [...app.document.querySelectorAll(".day-card")].find((card) =>
    card.querySelector(".day-label strong").textContent === "Monday" &&
    card.querySelector(".day-label span").textContent === "Week 2");
  assert.ok(mondayWeek2);
  const [start, end] = mondayWeek2.querySelectorAll('input[type="time"]');
  const date = mondayWeek2.querySelector('input[type="date"]');
  await app.speak(start, "osiemnasta trzydzieści");
  await app.speak(end, "szósta rano");
  await app.speak(date, "szesnasty listopada 2026");
  assert.equal(app.desktop("start", "Monday", 2).value, "18:30");
  assert.equal(app.desktop("end", "Monday", 2).value, "06:00");
  assert.equal(app.desktop("date", "Monday", 2).value, "2026-11-16");
  assert.equal(app.desktop("start", "Monday", 1).value, "");
  await app.clickText("Calculate All");
  const row = app.desktop("start", "Monday", 2).closest("tr");
  assert.equal(row.querySelector(".result-cell").textContent, "10.75");
  assert.equal(row.querySelector(".salary-cell").textContent, "£177.38");
});

test("invalid speech and denied microphone permission preserve the original field", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  await app.nativeEdit(start, "07:00");
  await app.speak(start, "godzina dwudziesta piąta");
  assert.equal(start.value, "07:00");
  assert.equal(app.action("apply"), null);
  const recognition = await app.begin(start);
  recognition.error("not-allowed");
  await pause();
  assert.equal(start.value, "07:00");
  assert.match(app.panelText(), /mikrofon|uprawni|zezw|dostęp/i);
  assert.equal(start.parentElement.querySelector(".grl-voice-button").getAttribute("aria-pressed"), "false");
});

test("recognition network, audio and language failures leave data editable", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  await app.nativeEdit(start, "07:00");
  for (const code of ["network", "audio-capture", "no-speech", "service-not-allowed", "language-not-supported"]) {
    const recognition = await app.begin(start);
    recognition.error(code);
    await pause();
    assert.equal(start.value, "07:00", code);
    assert.ok(app.action("retry"), `Retry is available after ${code}`);
    assert.equal(start.disabled, false, `Manual input is available after ${code}`);
    assert.equal(start.parentElement.querySelector(".grl-voice-button").getAttribute("aria-pressed"), "false");
  }
  await app.nativeEdit(start, "09:15");
  assert.equal(app.document.querySelector('.day-card .mobile-fields input[type="time"]').value, "09:15");
});

test("a spoken Start or End command cannot fill the opposite field", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const end = app.desktop("end");
  await app.nativeEdit(start, "07:00");
  await app.nativeEdit(end, "17:00");
  await app.speak(start, "koniec godzina osiemnasta");
  assert.equal(start.value, "07:00");
  assert.equal(end.value, "17:00");
  assert.match(app.panelText(), /inne pole|właściwym polu/i);
  await app.speak(end, "start szósta trzydzieści rano");
  assert.equal(start.value, "07:00");
  assert.equal(end.value, "17:00");
  assert.match(app.panelText(), /inne pole|właściwym polu/i);
});

test("cancelled recognition ignores final results delivered by an old session", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const recognition = await app.begin(start);
  const lateResult = recognition.onresult;
  const lateEnd = recognition.onend;
  assert.ok(app.action("cancel"));
  app.action("cancel").click();
  await pause();
  lateResult?.call(recognition, speechEvent("06:30"));
  lateEnd?.call(recognition, {});
  await pause(45);
  assert.equal(start.value, "");
  assert.equal(recognition.aborted, true);
});

test("starting a different field prevents an earlier session from filling either field", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const end = app.desktop("end");
  const earlier = await app.begin(start);
  const lateResult = earlier.onresult;
  const lateEnd = earlier.onend;
  const current = await app.begin(end);
  lateResult?.call(earlier, speechEvent("06:30"));
  lateEnd?.call(earlier, {});
  await pause();
  assert.equal(start.value, "");
  assert.equal(end.value, "");
  current.final("osiemnasta");
  await pause(45);
  assert.equal(start.value, "");
  assert.equal(end.value, "18:00");
});

test("week navigation invalidates an in-flight voice result", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const recognition = await app.begin(start);
  const lateResult = recognition.onresult;
  const lateEnd = recognition.onend;
  await app.clickText("Week 2");
  lateResult?.call(recognition, speechEvent("06:30"));
  lateEnd?.call(recognition, {});
  await pause(45);
  assert.equal(app.desktop("start", "Monday", 2).value, "");
  await app.clickText("Week 1 + Week 2");
  assert.equal(app.desktop("start").value, "");
});

test("a manual edit while listening cannot be overwritten by a late result", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const recognition = await app.begin(start);
  const lateResult = recognition.onresult;
  const lateEnd = recognition.onend;
  await app.nativeEdit(start, "09:15");
  lateResult?.call(recognition, speechEvent("06:30"));
  lateEnd?.call(recognition, {});
  await pause(45);
  assert.equal(start.value, "09:15");
});

test("undo restores the previous value but never erases a subsequent manual edit", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  await app.nativeEdit(start, "07:00");
  await app.speak(start, "06:30");
  assert.equal(start.value, "06:30");
  assert.ok(app.action("undo"));
  app.action("undo").click();
  await pause(45);
  assert.equal(start.value, "07:00");
  await app.speak(start, "06:30");
  await app.nativeEdit(start, "09:15");
  app.action("undo")?.click();
  await pause(45);
  assert.equal(start.value, "09:15");
});

test("week-ending speech confirms seven dates and undo restores each original date", async (t) => {
  const app = await mount(t);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const original = ["2026-10-12", "", "2026-10-14", "2026-10-15", "", "2026-10-17", "2026-10-18"];
  for (let i = 0; i < days.length; i++) await app.nativeEdit(app.desktop("date", days[i]), original[i]);
  await app.nativeEdit(app.desktop("date", "Monday", 2), "2026-12-07");
  const helper = app.document.querySelector('.week-ending-controls input[type="date"]');
  await app.speak(helper, "22.11.2026");
  assert.deepEqual(days.map((day) => app.desktop("date", day).value), original);
  assert.ok(app.action("apply"), "Bulk week update needs a confirmation");
  app.action("apply").click();
  await pause(45);
  assert.deepEqual(days.map((day) => app.desktop("date", day).value), ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  assert.equal(app.desktop("date", "Monday", 2).value, "2026-12-07");
  assert.ok(app.action("undo"));
  app.action("undo").click();
  await pause(45);
  assert.deepEqual(days.map((day) => app.desktop("date", day).value), original);
  assert.equal(app.desktop("date", "Monday", 2).value, "2026-12-07");
});

test("a non-Sunday voice date cannot update a week-ending helper", async (t) => {
  const app = await mount(t);
  const helper = app.document.querySelector('.week-ending-controls input[type="date"]');
  await app.speak(helper, "23.11.2026");
  assert.equal(helper.value, "");
  assert.equal(app.action("apply"), null);
  assert.match(app.panelText(), /niedziel/i);
  assert.equal(app.desktop("date").value, "");
});

test("bulk undo does not erase a date edited after the voice update", async (t) => {
  const app = await mount(t);
  const helper = app.document.querySelector('.week-ending-controls input[type="date"]');
  await app.speak(helper, "22.11.2026");
  assert.ok(app.action("apply"));
  app.action("apply").click();
  await pause(45);
  await app.nativeEdit(app.desktop("date", "Wednesday"), "2026-12-02");
  app.action("undo")?.click();
  await pause(45);
  assert.equal(app.desktop("date", "Wednesday").value, "2026-12-02");
  assert.equal(app.desktop("date", "Monday").value, "2026-11-16");
});

test("unsupported recognition leaves all ordinary calculator controls functional", async (t) => {
  const app = await mount(t, { speech: false });
  await app.nativeEdit(app.desktop("start"), "06:30");
  await app.nativeEdit(app.desktop("end"), "18:00");
  await app.clickText("Calculate All");
  assert.equal(app.document.querySelector(".work-table tbody tr .result-cell").textContent, "10.75");
  assert.equal(app.document.querySelector(".work-table tbody tr .salary-cell").textContent, "£177.38");
});

test("English speech updates React and pay calculations, and its language choice survives reopening and reload", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const microphone = start.parentElement.querySelector(".grl-voice-button");
  const guide = app.document.querySelector(".grl-voice-guide");
  assert.ok(guide, "Brief speech instructions are available in the voice panel");
  assert.equal(guide.open, false, "The instructions are collapsed by default");
  assert.equal(guide.querySelector("summary").textContent, "Jak mówić?");
  assert.match(guide.querySelector("p").textContent, /szósta trzydzieści rano/);
  const initial = await app.begin(start);
  await app.chooseLanguage("en-GB");
  assert.equal(initial.aborted, true);
  assert.equal(app.sessions.length, 1, "Changing language does not start microphone access automatically");
  assert.equal(app.window.localStorage.getItem("grlVoiceLanguageV1"), "en-GB");
  assert.equal(guide.open, false);
  assert.equal(guide.querySelector("summary").textContent, "What can I say?");
  assert.match(guide.querySelector("p").textContent, /six thirty AM/);
  assert.match(guide.querySelector("p").textContent, /six PM/);
  assert.match(guide.querySelector("p").textContent, /UK day\/month\/year/);
  const english = await app.restart("en-GB");
  assert.equal(app.document.activeElement, app.action("stop"), "Restart preserves keyboard focus on Stop listening");
  english.final("six thirty AM");
  await pause(45);
  assert.equal(start.value, "06:30");
  assert.equal(app.document.querySelector('.day-card .mobile-fields input[type="time"]').value, "06:30");
  assert.equal(app.document.getElementById("grl-voice-panel").lang, "en");
  assert.match(app.document.querySelector(".grl-voice-message").textContent, /Entered 06:30/);
  assert.equal(app.document.activeElement, app.action("undo"), "An unambiguous result keeps focus on Undo");
  app.document.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await pause();
  assert.equal(app.document.getElementById("grl-voice-panel").hidden, true);
  assert.equal(app.document.activeElement, microphone, "Escape returns to the originating microphone");
  await app.speak(app.desktop("end"), "six PM", "en-GB");
  assert.equal(app.desktop("end").value, "18:00");
  await app.clickText("Calculate All");
  assert.equal(app.document.querySelector(".work-table tbody tr .result-cell").textContent, "10.75");
  assert.equal(app.document.querySelector(".work-table tbody tr .salary-cell").textContent, "£177.38");

  const reloaded = await mount(t, { storage: { grlVoiceLanguageV1: app.window.localStorage.getItem("grlVoiceLanguageV1") } });
  assert.equal(reloaded.document.getElementById("grl-voice-language").value, "en-GB");
  await reloaded.speak(reloaded.desktop("start"), "seven AM", "en-GB");
  assert.equal(reloaded.desktop("start").value, "07:00");
});

test("language switching discards stale Polish audio and pending English choices before switching back", async (t) => {
  const app = await mount(t);
  const start = app.desktop("start");
  const polish = await app.begin(start);
  const latePolishResult = polish.onresult;
  const latePolishEnd = polish.onend;
  await app.chooseLanguage("en-GB");
  assert.equal(app.sessions.length, 1);
  latePolishResult?.call(polish, speechEvent("06:30"));
  latePolishEnd?.call(polish, {});
  await pause(45);
  assert.equal(start.value, "");
  assert.match(app.action("retry").textContent, /Speak in English/);

  const english = await app.restart("en-GB");
  const lateEnglishResult = english.onresult;
  const lateEnglishEnd = english.onend;
  english.final("six");
  await pause(45);
  assert.equal(app.document.querySelectorAll('#grl-voice-panel [data-voice-action="apply"]').length, 2);
  assert.equal(start.value, "");
  await app.chooseLanguage("pl-PL");
  assert.equal(app.action("apply"), null, "The previous language's pending values are removed");
  assert.equal(app.document.querySelector(".grl-voice-transcript").textContent, "");
  assert.equal(app.sessions.length, 2, "A fresh user action is needed after switching back");
  lateEnglishResult?.call(english, speechEvent("six PM"));
  lateEnglishEnd?.call(english, {});
  await pause(45);
  assert.equal(start.value, "");
  const resumedPolish = await app.restart("pl-PL");
  resumedPolish.final("szósta trzydzieści rano");
  await pause(45);
  assert.equal(start.value, "06:30");
  assert.equal(app.window.localStorage.getItem("grlVoiceLanguageV1"), "pl-PL");
  assert.match(start.parentElement.querySelector(".grl-voice-button").getAttribute("aria-label"), /Wpisz głosem/);
});

test("English dates use UK day-first order and require confirmation when the year is missing", async (t) => {
  const app = await mount(t, { storage: { grlVoiceLanguageV1: "en-GB" } });
  const date = app.desktop("date");
  await app.speak(date, "04/05/2026", "en-GB");
  assert.equal(date.value, "2026-05-04", "04/05 means 4 May in the selected UK locale");
  assert.equal(app.document.querySelector('.day-card .mobile-fields input[type="date"]').value, "2026-05-04");
  await app.speak(date, "sixteenth of November", "en-GB");
  assert.equal(date.value, "2026-05-04", "An assumed year cannot overwrite the field before confirmation");
  assert.match(app.document.querySelector(".grl-voice-message").textContent, /No year|Confirm/i);
  const choice = app.action("apply");
  assert.ok(choice);
  assert.equal(choice.dataset.value, "2026-11-16");
  assert.match(choice.textContent, /^Use /);
  choice.click();
  await pause(45);
  assert.equal(date.value, "2026-11-16");
});

test("English recognition failure and microphone accessibility labels use the selected language", async (t) => {
  const app = await mount(t, { storage: { grlVoiceLanguageV1: "en-GB" } });
  const start = app.desktop("start");
  const microphone = start.parentElement.querySelector(".grl-voice-button");
  assert.equal(microphone.lang, "en");
  assert.match(microphone.getAttribute("aria-label"), /Enter by voice: Start.*Monday.*week 1/);
  await app.nativeEdit(start, "07:00");
  const recognition = await app.begin(start, "en-GB");
  recognition.error("language-not-supported");
  await pause();
  const status = app.document.querySelector(".grl-voice-message").textContent;
  assert.match(status, /English speech recognition is not supported/);
  assert.doesNotMatch(status, /Polish|polsku|polski/i);
  assert.equal(app.action("retry").textContent, "Try again");
  assert.equal(start.value, "07:00");
  assert.equal(microphone.getAttribute("aria-pressed"), "false");
});
