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

async function mount(t, {
  speech = true,
  storage = {},
  isIOS = false,
  isIPadOS = false,
  standalone = false,
  autoRecognitionStart = true,
  autoAbortEnd = true,
  recognitionStartThrows = 0,
  controlledRecognitionTimers = false,
  controlledDictationTimers = false,
  synthesis = true,
  synthesisThrows = false,
  synthesisBusy = false,
  controlledPromptTimers = false,
} = {}) {
  const sessions = [];
  const prompts = [];
  const errors = [];
  const recognitionTimers = [];
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
      this.startCalls = (this.startCalls || 0) + 1;
      if (recognitionStartThrows > 0) {
        recognitionStartThrows -= 1;
        throw new Error("Recognition did not start");
      }
      this.started = true;
      if (autoRecognitionStart) queueMicrotask(() => this.onstart?.({}));
    }
    stop() {
      this.stopped = true;
    }
    abort() {
      this.aborted = true;
      if (autoAbortEnd) queueMicrotask(() => this.onend?.({}));
    }
    interim(transcript) {
      this.onresult?.(speechEvent(transcript, false));
    }
    result(transcript) {
      this.onresult?.(speechEvent(transcript, true));
    }
    end() {
      this.onend?.({});
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

  class FakeSpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.volume = 1;
      this.rate = 1;
      this.pitch = 1;
    }
  }
  const synthesizer = {
    speaking: false,
    pending: synthesisBusy,
    cancelCalls: 0,
    speak(utterance) {
      if (synthesisThrows) throw new Error("The speech output service is unavailable");
      prompts.push(utterance);
      this.speaking = true;
    },
    cancel() {
      this.cancelCalls += 1;
      this.speaking = false;
    },
    getVoices: () => [],
  };

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
        matches: standalone && /\(display-mode:\s*standalone\)/.test(query),
        media: query,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
      });
      Object.defineProperty(window.navigator, "standalone", { value: standalone });
      if (isIPadOS) {
        Object.defineProperty(window.navigator, "userAgent", {
          value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        });
        Object.defineProperty(window.navigator, "platform", { value: "MacIntel" });
        Object.defineProperty(window.navigator, "maxTouchPoints", { value: 5 });
      } else if (isIOS) {
        Object.defineProperty(window.navigator, "userAgent", {
          value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/140.0.0 Mobile/15E148 Safari/605.1.15",
        });
        Object.defineProperty(window.navigator, "platform", { value: "iPhone" });
        Object.defineProperty(window.navigator, "maxTouchPoints", { value: 5 });
      }
      if (controlledRecognitionTimers || controlledDictationTimers || controlledPromptTimers) {
        const realSetTimeout = window.setTimeout.bind(window);
        const realClearTimeout = window.clearTimeout.bind(window);
        const interceptedDelays = new Set([
          ...(controlledRecognitionTimers ? [60000, 20000] : []),
          ...(controlledDictationTimers ? [120, 2500] : []),
          ...(controlledPromptTimers ? [10000, 800] : []),
        ]);
        window.setTimeout = (callback, delay = 0, ...args) => {
          if (!interceptedDelays.has(delay)) return realSetTimeout(callback, delay, ...args);
          const timer = { id: 1000000 + recognitionTimers.length, delay, active: true, fire: () => callback(...args) };
          recognitionTimers.push(timer);
          return timer.id;
        };
        window.clearTimeout = (id) => {
          const timer = recognitionTimers.find((entry) => entry.id === id);
          if (timer) timer.active = false;
          else realClearTimeout(id);
        };
      }
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
      if (synthesis) {
        window.SpeechSynthesisUtterance = FakeSpeechSynthesisUtterance;
        window.speechSynthesis = synthesizer;
      }
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
  const openDictation = async (input) => {
    input.parentElement.querySelector(".grl-voice-button").click();
    await waitFor(() => action("apply-dictation"), "system dictation entry");
    await pause();
    const field = document.getElementById("grl-voice-dictation");
    assert.ok(field);
    return field;
  };
  const fillDictation = async (text) => {
    const field = document.getElementById("grl-voice-dictation");
    assert.ok(field);
    field.value = text;
    field.dispatchEvent(new window.Event("input", { bubbles: true }));
    await pause();
    return field;
  };
  const submitDictation = async () => {
    assert.ok(action("apply-dictation"));
    action("apply-dictation").click();
    await waitFor(() => ["success", "choice", "error"].includes(document.getElementById("grl-voice-panel").dataset.state),
      "completed dictation interpretation");
  };
  const pendingTimers = (delay) => recognitionTimers.filter((timer) => timer.active && timer.delay === delay);
  const fireTimer = async (delay) => {
    const timer = pendingTimers(delay)[0];
    assert.ok(timer, `An active ${delay}ms recognition timer exists`);
    timer.active = false;
    timer.fire();
    await pause(45);
  };
  const panelText = () => document.getElementById("grl-voice-panel")?.textContent || "";
  return { window, document, desktop, action, nativeEdit, clickText, begin, speak, chooseLanguage, restart,
    openDictation, fillDictation, submitDictation, pendingTimers, fireTimer, sessions, prompts, synthesizer, panelText };
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

test("iPhone Home Screen defaults to focused system dictation and applies Polish values only on submit", async (t) => {
  const app = await mount(t, { isIOS: true, standalone: true });
  const card = app.document.querySelector(".day-card");
  const [start, end] = card.querySelectorAll('input[type="time"]');
  const text = await app.openDictation(start);
  assert.equal(text.type, "text", "System keyboard dictation uses an ordinary text field");
  assert.equal(app.document.activeElement, text);
  assert.equal(app.document.getElementById("grl-voice-panel").dataset.method, "dictation");
  assert.equal(app.sessions.length, 0, "iOS standalone does not invoke the unreliable Web Speech service by default");
  await app.fillDictation("szósta trzydzieści rano");
  assert.equal(start.value, "", "Typing or keyboard dictation cannot change work data before submit");
  assert.equal(app.desktop("start").value, "");
  await app.submitDictation();
  assert.equal(start.value, "06:30");
  assert.equal(app.desktop("start").value, "06:30");
  await app.openDictation(end);
  await app.fillDictation("osiemnasta");
  await app.submitDictation();
  const date = card.querySelector('input[type="date"]');
  await app.openDictation(date);
  await app.fillDictation("szesnasty listopada 2026");
  assert.equal(date.value, "");
  await app.submitDictation();
  assert.equal(date.value, "2026-11-16");
  await app.openDictation(start);
  await app.fillDictation("siódma rano");
  await app.submitDictation();
  assert.equal(start.value, "07:00", "A fourth consecutive entry can revisit the same field");
  app.action("undo").click();
  await pause(45);
  assert.equal(start.value, "06:30");
  assert.equal(app.sessions.length, 0);
  await app.clickText("Calculate All");
  assert.equal(app.document.querySelector(".work-table tbody tr .result-cell").textContent, "10.75");
  assert.equal(app.document.querySelector(".work-table tbody tr .salary-cell").textContent, "£177.38");
});

test("ordinary iPhone and iPadOS tabs default to dictation while non-iOS standalone keeps Web Speech", async (t) => {
  for (const options of [{ isIOS: true, standalone: false }, { isIPadOS: true, standalone: false }]) {
    const app = await mount(t, options);
    const text = await app.openDictation(app.desktop("start"));
    assert.equal(app.document.activeElement, text);
    assert.equal(app.sessions.length, 0);
    assert.equal(app.document.getElementById("grl-voice-panel").dataset.method, "dictation");
    app.action("cancel").click();
  }
  const otherPlatform = await mount(t, { standalone: true });
  const recognition = await otherPlatform.begin(otherPlatform.desktop("start"));
  assert.equal(otherPlatform.sessions.length, 1);
  assert.equal(otherPlatform.document.getElementById("grl-voice-panel").dataset.method, "speech");
  assert.equal(recognition.started, true);
  otherPlatform.action("cancel").click();
});

test("English system dictation uses the remembered language and UK dates without changing inputs prematurely", async (t) => {
  const app = await mount(t, { isIOS: true, standalone: true, storage: { grlVoiceLanguageV1: "en-GB" } });
  const start = app.desktop("start");
  const text = await app.openDictation(start);
  assert.match(text.lang, /^en(?:-GB)?$/);
  await app.fillDictation("six thirty AM");
  assert.equal(start.value, "");
  await app.submitDictation();
  assert.equal(start.value, "06:30");
  const date = app.desktop("date");
  await app.openDictation(date);
  await app.fillDictation("04/05/2026");
  assert.equal(date.value, "");
  await app.submitDictation();
  assert.equal(date.value, "2026-05-04");
  assert.equal(app.sessions.length, 0);
});

test("system dictation rejects uncertain text, retains its method on retry, and preserves AM/PM choice and undo", async (t) => {
  const app = await mount(t, { isIOS: true, standalone: true });
  const start = app.desktop("start");
  await app.nativeEdit(start, "07:00");
  await app.openDictation(start);
  await app.fillDictation("start szósta rano i koniec osiemnasta");
  await app.submitDictation();
  assert.equal(start.value, "07:00", "A combined command cannot be partially accepted");
  assert.ok(app.action("retry"));
  app.action("retry").click();
  await pause();
  assert.equal(app.document.getElementById("grl-voice-panel").dataset.method, "dictation");
  assert.equal(app.sessions.length, 0, "Retry must not silently return to Web Speech");
  assert.ok(app.action("apply-dictation"));
  await app.fillDictation("szósta");
  await app.submitDictation();
  assert.equal(start.value, "07:00");
  const choices = [...app.document.querySelectorAll('#grl-voice-panel [data-voice-action="apply"]')];
  assert.deepEqual(choices.map((button) => button.dataset.value).sort(), ["06:00", "18:00"]);
  choices.find((button) => button.dataset.value === "18:00").click();
  await pause(45);
  assert.equal(start.value, "18:00");
  app.action("undo").click();
  await pause(45);
  assert.equal(start.value, "07:00");
});

test("system dictation cannot overwrite manual edits or a different week through stale submit controls", async (t) => {
  const app = await mount(t, { isIOS: true, standalone: true });
  const start = app.desktop("start");
  await app.openDictation(start);
  await app.fillDictation("06:30");
  const staleSubmit = app.action("apply-dictation");
  await app.nativeEdit(start, "09:15");
  staleSubmit.click();
  await pause(45);
  assert.equal(start.value, "09:15");
  await app.openDictation(start);
  await app.fillDictation("06:30");
  const oldWeekSubmit = app.action("apply-dictation");
  await app.clickText("Week 2");
  oldWeekSubmit.click();
  await pause(45);
  assert.equal(app.desktop("start", "Monday", 2).value, "");
  await app.clickText("Week 1 + Week 2");
  assert.equal(app.desktop("start").value, "09:15");
});

test("changing dictation language clears old text and invalidates pending interpretations", async (t) => {
  const app = await mount(t, { isIOS: true, standalone: true });
  const start = app.desktop("start");
  await app.openDictation(start);
  await app.fillDictation("szósta");
  await app.submitDictation();
  const oldChoice = app.action("apply");
  assert.ok(oldChoice);
  await app.chooseLanguage("en-GB");
  const text = app.document.getElementById("grl-voice-dictation");
  assert.equal(text.value, "");
  assert.match(text.lang, /^en(?:-GB)?$/);
  assert.equal(app.action("apply"), null);
  assert.equal(app.document.getElementById("grl-voice-panel").dataset.method, "dictation");
  oldChoice.click();
  await pause(45);
  assert.equal(start.value, "");
  await app.fillDictation("six thirty AM");
  await app.submitDictation();
  assert.equal(start.value, "06:30");
  assert.equal(app.sessions.length, 0);
});

test("missing or failed Web Speech offers system dictation while explicit speech remains available", async (t) => {
  const unsupported = await mount(t, { speech: false });
  const unsupportedStart = unsupported.desktop("start");
  unsupportedStart.parentElement.querySelector(".grl-voice-button").click();
  await pause();
  assert.ok(unsupported.action("dictate"));
  unsupported.action("dictate").click();
  await pause();
  assert.equal(unsupported.document.activeElement, unsupported.document.getElementById("grl-voice-dictation"));
  await unsupported.fillDictation("06:30");
  await unsupported.submitDictation();
  assert.equal(unsupportedStart.value, "06:30");

  const app = await mount(t);
  const start = app.desktop("start");
  const failed = await app.begin(start);
  failed.error("service-not-allowed");
  await pause();
  assert.ok(app.action("dictate"));
  app.action("dictate").click();
  await pause();
  assert.equal(app.document.getElementById("grl-voice-panel").dataset.method, "dictation");
  assert.equal(app.sessions.length, 1);
  assert.ok(app.action("speech"));
  app.action("speech").click();
  await waitFor(() => app.sessions.length === 2, "explicit Web Speech action");
  await pause();
  assert.equal(app.sessions[1].lang, "pl-PL");
  app.sessions[1].final("szósta trzydzieści rano");
  await pause(45);
  assert.equal(start.value, "06:30");
});

test("dictation Enter respects IME composition and Escape restores the microphone without applying text", async (t) => {
  const app = await mount(t, { isIOS: true, standalone: true });
  const start = app.desktop("start");
  let text = await app.openDictation(start);
  await app.fillDictation("szósta trzydzieści rano");
  text.dispatchEvent(new app.window.CompositionEvent("compositionstart", { bubbles: true }));
  text.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  await pause();
  assert.equal(start.value, "");
  text.dispatchEvent(new app.window.CompositionEvent("compositionend", { bubbles: true }));
  text.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true }));
  text.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: "Enter", keyCode: 229, bubbles: true, cancelable: true }));
  await pause();
  assert.equal(start.value, "");
  text.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  await waitFor(() => start.value === "06:30" && app.action("undo"), "Enter submits the settled dictation text");
  assert.equal(start.value, "06:30");
  assert.equal(app.document.activeElement, app.action("undo"), "Enter keeps focus on the result action after the dictation input is hidden");
  text = await app.openDictation(start);
  await app.fillDictation("18:00");
  text.dispatchEvent(new app.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await pause();
  assert.equal(start.value, "06:30");
  assert.equal(app.document.getElementById("grl-voice-panel").hidden, true);
  assert.equal(app.document.activeElement, start.parentElement.querySelector(".grl-voice-button"));
});

test("Web Speech allows sixty seconds to start then twenty seconds to listen and ignores a late start", async (t) => {
  const app = await mount(t, { autoRecognitionStart: false, controlledRecognitionTimers: true });
  const start = app.desktop("start");
  const recognition = await app.begin(start);
  assert.equal(app.pendingTimers(60000).length, 1);
  assert.equal(app.pendingTimers(20000).length, 0, "The listening budget must not run during a permission prompt");
  recognition.onstart({});
  await pause();
  assert.equal(app.pendingTimers(60000).length, 0);
  assert.equal(app.pendingTimers(20000).length, 1);
  recognition.final("szósta trzydzieści rano");
  await pause(45);
  assert.equal(start.value, "06:30");
  assert.equal(app.pendingTimers(20000).length, 0);

  const end = app.desktop("end");
  const stalled = await app.begin(end);
  const lateStart = stalled.onstart;
  const lateResult = stalled.onresult;
  const lateEnd = stalled.onend;
  await app.fireTimer(60000);
  assert.ok(app.action("dictate"));
  lateStart?.call(stalled, {});
  lateResult?.call(stalled, speechEvent("osiemnasta"));
  lateEnd?.call(stalled, {});
  await pause(45);
  assert.equal(end.value, "");
  assert.equal(app.pendingTimers(20000).length, 0, "A stale start callback cannot revive a timed-out session");
  assert.equal(end.parentElement.querySelector(".grl-voice-button").getAttribute("aria-pressed"), "false");

  const silent = await app.restart("pl-PL");
  silent.onstart({});
  await pause();
  await app.fireTimer(20000);
  assert.equal(end.value, "");
  assert.ok(app.action("dictate"));
  assert.equal(silent.aborted, true);
});

function compositionText(app, field, text) {
  field.dispatchEvent(new app.window.CompositionEvent("compositionstart", { bubbles: true }));
  field.value = text;
  field.dispatchEvent(new app.window.InputEvent("input", {
    bubbles: true, inputType: "insertCompositionText", data: text, isComposing: true,
  }));
}

function committedText(app, field, text) {
  field.value = text;
  field.dispatchEvent(new app.window.InputEvent("input", {
    bubbles: true, inputType: "insertFromComposition", data: text, isComposing: false,
  }));
}

test("composition regression: an explicit click completes a second composed entry instead of silently ignoring it", async (t) => {
  const app = await mount(t, { isIOS: true, controlledDictationTimers: true });
  const start = app.desktop("start");
  await app.openDictation(start);
  await app.fillDictation("szósta trzydzieści rano");
  app.action("apply-dictation").click();
  if (app.pendingTimers(120).length) await app.fireTimer(120);
  else await pause(45); // The original v3 completes this non-composed first entry.
  assert.equal(start.value, "06:30");

  const end = app.desktop("end");
  const text = await app.openDictation(end);
  compositionText(app, text, "osiemnasta");
  let blurred = false;
  text.addEventListener("blur", () => {
    blurred = true;
    text.dispatchEvent(new app.window.CompositionEvent("compositionend", { bubbles: true }));
    committedText(app, text, "osiemnasta dwadzieścia siedem");
  }, { once: true });
  app.action("apply-dictation").click();
  assert.equal(blurred, true, "Explicit submit must request completion even while composing");
  assert.equal(end.value, "", "The partial hour must not be accepted during completion");
  await app.fireTimer(120);
  assert.equal(end.value, "18:27");
  assert.equal(start.value, "06:30");
  assert.equal(app.sessions.length, 0);
});

test("composition regression: a final input after compositionend replaces the partial hour before application", async (t) => {
  const app = await mount(t, { isIOS: true, controlledDictationTimers: true });
  const end = app.desktop("end");
  const text = await app.openDictation(end);
  compositionText(app, text, "osiemnasta");
  text.addEventListener("blur", () => {
    text.dispatchEvent(new app.window.CompositionEvent("compositionend", { bubbles: true }));
  }, { once: true });
  app.action("apply-dictation").click();
  assert.notEqual(app.document.activeElement, text, "The submit click ends editing even when Safari leaves buttons unfocused");
  const earlierQuiet = app.pendingTimers(120)[0];
  assert.ok(earlierQuiet);
  assert.equal(end.value, "");
  await pause(30);
  committedText(app, text, "osiemnasta dwadzieścia siedem");
  assert.equal(end.value, "", "Neither compositionend nor the final input may immediately commit an earlier value");
  assert.equal(earlierQuiet.active, false, "The final input restarts the settling interval");
  await app.fireTimer(120);
  assert.equal(end.value, "18:27");
});

test("composition regression: a text correction committed on blur is read after blur, not before", async (t) => {
  const app = await mount(t, { isIOS: true, controlledDictationTimers: true });
  const end = app.desktop("end");
  const text = await app.openDictation(end);
  await app.fillDictation("osiemnasta");
  text.addEventListener("blur", () => committedText(app, text, "osiemnasta dwadzieścia siedem"), { once: true });
  app.action("apply-dictation").click();
  assert.equal(end.value, "", "The stale pre-blur text must not become 18:00");
  await app.fireTimer(120);
  assert.equal(end.value, "18:27");
});

test("composition regression: a missing compositionend gives feedback and never applies a partial or late value", async (t) => {
  const app = await mount(t, { isIOS: true, controlledDictationTimers: true });
  const end = app.desktop("end");
  await app.nativeEdit(end, "17:00");
  const text = await app.openDictation(end);
  compositionText(app, text, "osiemnasta");
  app.action("apply-dictation").click();
  assert.equal(end.value, "17:00");
  if (app.pendingTimers(120).length) await app.fireTimer(120);
  assert.equal(end.value, "17:00");
  await app.fireTimer(2500);
  assert.equal(end.value, "17:00");
  assert.equal(text.value, "osiemnasta", "Unfinished dictation remains available for correction");
  assert.match(app.document.querySelector(".grl-voice-message").textContent, /zakończ|dokończ|finish|complete/i);
  assert.ok(app.action("apply-dictation"));

  text.dispatchEvent(new app.window.CompositionEvent("compositionend", { bubbles: true }));
  committedText(app, text, "osiemnasta dwadzieścia siedem");
  await pause(30);
  assert.equal(end.value, "17:00", "A late completion after timeout needs a new explicit submit");
  assert.equal(app.pendingTimers(120).length, 0);
  app.action("apply-dictation").click();
  await app.fireTimer(120);
  assert.equal(end.value, "18:27");
});

test("composition regression: pending completion cannot survive cancellation, a target change or a locale change", async (t) => {
  for (const change of ["cancel", "target", "locale"]) {
    const app = await mount(t, { isIOS: true, controlledDictationTimers: true });
    const start = app.desktop("start");
    const end = app.desktop("end");
    const text = await app.openDictation(start);
    compositionText(app, text, "szósta");
    app.action("apply-dictation").click();
    const pendingQuiet = app.pendingTimers(120)[0];
    const pendingDeadline = app.pendingTimers(2500)[0];
    assert.ok(pendingDeadline, "An explicit composing submit has a bounded pending completion");
    if (change === "cancel") app.action("cancel").click();
    else if (change === "target") await app.openDictation(end);
    else await app.chooseLanguage("en-GB");

    text.dispatchEvent(new app.window.CompositionEvent("compositionend", { bubbles: true }));
    committedText(app, text, "szósta trzydzieści rano");
    // Exercise callback guards as well as clearTimeout: a callback already
    // delivered by the host must not act on a newer or dismissed session.
    pendingQuiet?.fire();
    pendingDeadline.fire();
    await pause(45);
    assert.equal(start.value, "", `${change}: original target is unchanged`);
    assert.equal(end.value, "", `${change}: new target is unchanged`);
    const panel = app.document.getElementById("grl-voice-panel");
    if (change === "cancel") assert.equal(panel.hidden, true);
    if (change === "target") assert.match(panel.querySelector("h2").textContent, /Koniec/);
    if (change === "locale") assert.equal(panel.lang, "en");
    assert.equal(app.pendingTimers(120).length, 0);
    assert.equal(app.pendingTimers(2500).length, 0);
  }
});

async function openIOSPrompt(app, input) {
  await app.openDictation(input);
  const count = app.prompts.length;
  assert.ok(app.action("speech"));
  app.action("speech").click();
  await pause();
  assert.equal(app.prompts.length, count + 1, "Every iOS browser speech attempt has its own spoken prompt");
  const prompt = app.prompts.at(-1);
  assert.equal(app.document.getElementById("grl-voice-panel").dataset.state, "prompting");
  assert.match(prompt.text, /\S/, "The prompt contains spoken words");
  assert.ok(prompt.volume > 0, "The prompt must be audible, not a silent synthesis workaround");
  return prompt;
}

async function finishIOSPrompt(app, prompt) {
  const previous = app.sessions.filter((recognition) => recognition.started).length;
  assert.equal(typeof prompt.onend, "function");
  app.synthesizer.speaking = false;
  prompt.onend({});
  await waitFor(() => app.sessions.filter((recognition) => recognition.started).length > previous,
    "recognition begins after the spoken prompt finishes");
  await pause();
  return app.sessions.at(-1);
}

test("iOS browser speech: three consecutive Polish entries each wait for an audible prompt and a natural end", async (t) => {
  const app = await mount(t, { isIOS: true, standalone: true, controlledPromptTimers: true });
  const entries = [
    [app.desktop("start"), "szósta trzydzieści rano", "06:30"],
    [app.desktop("end"), "osiemnasta", "18:00"],
    [app.desktop("date"), "szesnasty listopada 2026", "2026-11-16"],
  ];
  for (const [index, [input, transcript, value]] of entries.entries()) {
    const prompt = await openIOSPrompt(app, input);
    assert.equal(prompt.lang, "pl-PL");
    assert.equal(app.sessions.filter((recognition) => recognition.started).length, index,
      "The microphone cannot start before this prompt ends");
    const latePromptEnd = prompt.onend;
    const recognition = await finishIOSPrompt(app, prompt);
    assert.equal(recognition.lang, "pl-PL");
    assert.equal(recognition.continuous, false);
    latePromptEnd({});
    assert.equal(recognition.startCalls, 1, "A duplicate prompt completion cannot start recognition twice");
    recognition.result(transcript);
    assert.equal(app.pendingTimers(800).length, 0, "iOS must not abort and interpret a final result on the old 800 ms fallback");
    await pause(index === 0 ? 850 : 25);
    assert.equal(input.value, "", "A final transcript alone does not finish the native listening session");
    assert.equal(app.document.getElementById("grl-voice-panel").dataset.state, "listening");
    recognition.end();
    await waitFor(() => input.value === value && app.action("undo"), "natural end commits the complete utterance");
    assert.equal(recognition.aborted, false, "Natural completion must not issue abort");
    assert.notEqual(recognition.stopped, true, "Natural completion must not issue stop");
  }
  assert.equal(app.prompts.length, 3);
  await app.clickText("Calculate All");
  assert.equal(app.document.querySelector(".work-table tbody tr .result-cell").textContent, "10.75");
  assert.equal(app.document.querySelector(".work-table tbody tr .salary-cell").textContent, "£177.38");
});

test("iOS browser speech: English uses an English prompt and recognition locale before filling the real form", async (t) => {
  const app = await mount(t, { isIPadOS: true, storage: { grlVoiceLanguageV1: "en-GB" } });
  const start = app.desktop("start");
  const prompt = await openIOSPrompt(app, start);
  assert.equal(prompt.lang, "en-GB");
  assert.match(prompt.text, /preparing.*microphone/i);
  assert.equal(app.sessions.some((recognition) => recognition.started), false);
  const recognition = await finishIOSPrompt(app, prompt);
  assert.equal(recognition.lang, "en-GB");
  recognition.final("six thirty AM");
  await waitFor(() => start.value === "06:30" && app.action("undo"), "English speech result");
  assert.equal(recognition.aborted, false);
  assert.equal(app.document.querySelector('.day-card .mobile-fields input[type="time"]').value, "06:30");
});

test("iOS browser speech: cancellation aborts without applying and a fresh attempt waits for native cleanup", async (t) => {
  const app = await mount(t, { isIOS: true, autoAbortEnd: false });
  const end = app.desktop("end");
  await app.nativeEdit(end, "17:00");
  const recognition = await finishIOSPrompt(app, await openIOSPrompt(app, end));
  recognition.result("osiemnasta");
  const lateEnd = recognition.onend;
  const lateResult = recognition.onresult;
  assert.ok(app.action("cancel-listening"));
  app.action("cancel-listening").click();
  await pause();
  assert.equal(recognition.aborted, true);
  assert.notEqual(recognition.stopped, true);
  assert.equal(app.document.getElementById("grl-voice-panel").hidden, true);
  await app.openDictation(end);
  app.action("speech").click();
  await pause();
  assert.equal(app.prompts.length, 1, "An unfinished native abort blocks another spoken prompt");
  assert.equal(app.sessions.filter((item) => item.started).length, 1, "The old native recognizer is still closing");
  assert.equal(app.document.getElementById("grl-voice-panel").dataset.errorCode, "recognition-closing");
  lateResult?.(speechEvent("osiemnasta dwadzieścia siedem"));
  lateEnd?.({});
  await pause(45);
  assert.equal(end.value, "17:00");
  recognition.end(); // The live cleanup handler receives the actual native end.
  await pause();
  assert.ok(app.action("retry"));
  app.action("retry").click();
  await pause();
  assert.equal(app.prompts.length, 2, "Only a fresh explicit retry follows native cleanup");
  const next = await finishIOSPrompt(app, app.prompts[1]);
  next.final("osiemnasta");
  await waitFor(() => end.value === "18:00", "recording after cleanup succeeds");
  assert.equal(next.aborted, false);
});

test("iOS browser speech: cancelled or stale prompt callbacks cannot open the microphone", async (t) => {
  for (const change of ["cancel", "pagehide", "locale", "target", "manual"]) {
    const app = await mount(t, { isIOS: true });
    const start = app.desktop("start");
    const prompt = await openIOSPrompt(app, start);
    const lateEnd = prompt.onend;
    const lateError = prompt.onerror;
    if (change === "cancel") app.action("cancel").click();
    if (change === "pagehide") app.window.dispatchEvent(new app.window.Event("pagehide"));
    if (change === "locale") await app.chooseLanguage("en-GB");
    if (change === "target") await app.openDictation(app.desktop("end"));
    if (change === "manual") await app.nativeEdit(start, "09:15");
    const panel = app.document.getElementById("grl-voice-panel");
    const state = { hidden: panel.hidden, method: panel.dataset.method, language: panel.lang };
    lateEnd?.({});
    lateError?.({ error: "synthesis-failed" });
    await pause(45);
    assert.equal(app.sessions.some((recognition) => recognition.started), false, `${change}: no late microphone start`);
    assert.ok(app.synthesizer.cancelCalls > 0, `${change}: outstanding prompt was cancelled`);
    assert.equal(start.value, change === "manual" ? "09:15" : "");
    assert.equal(app.desktop("end").value, "");
    assert.deepEqual({ hidden: panel.hidden, method: panel.dataset.method, language: panel.lang }, state,
      `${change}: late callbacks do not replace the current panel`);
  }
});

test("iOS browser speech: prompt or start failures preserve data and keep recovery available", async (t) => {
  for (const failure of ["unavailable", "throw", "error", "busy", "start"]) {
    const app = await mount(t, {
      isIOS: true,
      synthesis: failure !== "unavailable",
      synthesisThrows: failure === "throw",
      synthesisBusy: failure === "busy",
      recognitionStartThrows: failure === "start" ? 1 : 0,
    });
    const start = app.desktop("start");
    await app.nativeEdit(start, "07:00");
    await app.openDictation(start);
    app.action("speech").click();
    await pause();
    if (failure === "error") {
      assert.equal(app.prompts.length, 1);
      app.synthesizer.speaking = false;
      app.prompts[0].onerror({ error: "synthesis-failed" });
      await pause();
    }
    if (failure === "start") {
      assert.equal(app.prompts.length, 1);
      app.synthesizer.speaking = false;
      app.prompts[0].onend({});
      await pause();
    }
    assert.equal(app.sessions.some((recognition) => recognition.started), false, `${failure}: no recording after a failed prompt`);
    assert.equal(start.value, "07:00");
    assert.ok(app.action("dictate"), `${failure}: keyboard dictation remains available`);
    assert.equal(app.document.getElementById("grl-voice-panel").dataset.state, "error");
    if (failure === "busy") {
      assert.equal(app.prompts.length, 0, "An unrelated synthesis queue is not interrupted by another prompt");
      assert.equal(app.synthesizer.cancelCalls, 0, "The app must not cancel speech that it does not own");
      assert.equal(app.document.getElementById("grl-voice-panel").dataset.errorCode, "prompt-busy");
    }
    if (failure === "start") {
      app.action("retry").click();
      await pause();
      assert.equal(app.prompts.length, 2, "A synchronous start throw must not leave a recognizer awaiting an end that will never arrive");
      const recovered = await finishIOSPrompt(app, app.prompts[1]);
      recovered.final("szósta trzydzieści rano");
      await waitFor(() => start.value === "06:30", "explicit retry after a synchronous start failure");
      continue;
    }
    app.action("dictate").click();
    await pause();
    await app.fillDictation("szósta trzydzieści rano");
    await app.submitDictation();
    assert.equal(start.value, "06:30");
    if (failure === "busy") assert.equal(app.synthesizer.cancelCalls, 0);
  }
});

test("iOS browser speech: prompt and listening timeouts cannot start late or apply without a natural end", async (t) => {
  const app = await mount(t, { isIOS: true, controlledPromptTimers: true, controlledRecognitionTimers: true });
  const start = app.desktop("start");
  const prompt = await openIOSPrompt(app, start);
  const lateEnd = prompt.onend;
  assert.equal(app.pendingTimers(10000).length, 1);
  assert.equal(app.pendingTimers(60000).length, 0, "Recognition startup time begins after the prompt");
  await app.fireTimer(10000);
  assert.equal(app.document.getElementById("grl-voice-panel").dataset.state, "error");
  assert.ok(app.action("dictate"));
  lateEnd?.({});
  await pause();
  assert.equal(app.sessions.some((recognition) => recognition.started), false);
  assert.equal(start.value, "");
  app.action("retry").click();
  await pause();
  assert.equal(app.prompts.length, 2);
  const recognition = await finishIOSPrompt(app, app.prompts[1]);
  recognition.final("szósta trzydzieści rano");
  await waitFor(() => start.value === "06:30", "retry completes after a fresh spoken prompt");
  assert.equal(app.pendingTimers(10000).length, 0);

  const end = app.desktop("end");
  const unfinished = await finishIOSPrompt(app, await openIOSPrompt(app, end));
  unfinished.result("osiemnasta");
  assert.equal(app.pendingTimers(20000).length, 1);
  await app.fireTimer(20000);
  assert.equal(end.value, "", "A final transcript must not be committed when native recognition never ends");
  assert.equal(unfinished.aborted, true);
  assert.equal(app.document.getElementById("grl-voice-panel").dataset.state, "error");
  assert.ok(app.action("dictate"));
});

test("non-iOS browser speech keeps direct startup and its final-result fallback without speech synthesis", async (t) => {
  const app = await mount(t, { controlledPromptTimers: true });
  const start = app.desktop("start");
  const recognition = await app.begin(start);
  assert.equal(app.prompts.length, 0);
  assert.equal(recognition.startCalls, 1);
  recognition.result("szósta trzydzieści rano");
  assert.equal(start.value, "");
  assert.equal(app.pendingTimers(800).length, 1);
  await app.fireTimer(800);
  assert.equal(start.value, "06:30");
  assert.equal(recognition.aborted, true, "The existing fallback still closes the unfinished non-iOS session");
});
