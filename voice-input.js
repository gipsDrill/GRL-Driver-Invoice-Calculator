/* Progressive Polish / British English voice entry for the existing calculator. */
(() => {
  "use strict";
  const parser = window.GRLVoiceParser;
  if (!parser || document.getElementById("grl-voice-panel")) return;

  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const defaultMethod = () => isIOS ? "dictation" : "speech";
  const buttons = new WeakMap();
  const DAYS = {
    Monday: "poniedziałek", Tuesday: "wtorek", Wednesday: "środa",
    Thursday: "czwartek", Friday: "piątek", Saturday: "sobota", Sunday: "niedziela",
  };
  const LANGUAGE_KEY = "grlVoiceLanguageV1";
  let language = "pl-PL";
  try {
    if (localStorage.getItem(LANGUAGE_KEY) === "en-GB") language = "en-GB";
  } catch (_) { /* Voice entry also works when browser storage is unavailable. */ }
  const COPY = {
    "pl-PL": {
      heading: "GŁOS", panel: "Wprowadzanie głosem po polsku", close: "Zamknij wprowadzanie głosem",
      language: "Język rozpoznawania mowy", microphone: "Wpisz głosem", tip: "Wpisz głosem po polsku",
      guideTitle: "Jak mówić?",
      guide: "Naciśnij mikrofon przy wybranym polu i ustaw PL lub EN. Powiedz jedną godzinę albo datę, np. „szósta trzydzieści rano”, „osiemnasta”, „wczoraj” lub „szesnasty listopada dwa tysiące dwadzieścia sześć”. Przy godzinach 1–12 dodaj „rano” lub „wieczorem”. Sprawdź wpisany wynik; w razie pomyłki użyj „Cofnij”.",
      invoice: "Data faktury", fields: { date: "Data", start: "Początek", end: "Koniec" }, week: "tydzień",
      weekEnding: (week) => `Koniec tygodnia ${week} · niedziela`,
      heard: (text) => `Usłyszano: „${text}”`, hearing: (text) => `Słyszę: „${text}”`,
      retry: "Spróbuj ponownie", repeat: "Powtórz", undo: "Cofnij", done: "Gotowe", use: "Wpisz",
      speak: "Powiedz po polsku", ready: "Wybrano polski. Naciśnij „Powiedz po polsku”, aby rozpocząć nowe nagranie.",
      manual: "Możesz też zamknąć ten panel i wpisać dane ręcznie.",
      changed: "Pole zostało zmienione. Naciśnij mikrofon ponownie.",
      sunday: "Koniec tygodnia musi przypadać w niedzielę. Podaj datę niedzieli.",
      bothWeeks: "Pokaż oba tygodnie i spróbuj ponownie.",
      rejected: "Kalkulator nie przyjął wartości. Wpisz ją ręcznie.",
      written: "Wpisano", weekWritten: "Ustawiono daty tygodnia do",
      save: "Sprawdź wpis. Jak zwykle użyj Calculate All, a następnie Save, aby zachować formularz.",
      changedUndo: "Dane zmieniły się po wpisaniu głosem. Nie cofnięto późniejszych zmian.",
      undone: "Cofnięto wpis głosowy.", restored: "Przywrócono poprzednie wartości pól.",
      empty: "Nie usłyszałem danych. Spróbuj jeszcze raz.",
      wrongField: "Polecenie wskazuje inne pole. Naciśnij mikrofon przy właściwym polu Start lub End.",
      confirmWeek: "Ta data ustawi wszystkie 7 dat w wybranym tygodniu. Potwierdź niedzielę.",
      confirm: "Wybierz poprawny wynik przed wpisaniem do formularza.",
      starting: "Uruchamiam mikrofon…",
      privacy: "Rozpoznawanie może wymagać internetu i przesyłać dźwięk do dostawcy przeglądarki. Kalkulator nie zapisuje nagrań.",
      unsupported: "Ta przeglądarka nie udostępnia rozpoznawania mowy. Użyj dyktowania klawiatury lub wpisz tekst.",
      https: "Otwórz kalkulator przez bezpieczny adres HTTPS, aby użyć mikrofonu.",
      listenTime: "Słucham. Powiedz np. „szósta trzydzieści rano” lub „osiemnasta”.",
      listenDate: "Słucham. Powiedz np. „wczoraj” lub pełną datę z rokiem.",
      noMatch: "Nie rozpoznałem daty ani godziny. Powtórz krótkie polecenie.",
      stop: "Zakończ słuchanie", processing: "Przetwarzam wypowiedź…",
      timeout: "Mikrofon nie zwrócił wyniku. Użyj dyktowania klawiatury lub wpisz tekst. Możesz też sprawdzić uprawnienia i internet.",
      startError: "Nie można uruchomić mikrofonu. Sprawdź uprawnienia przeglądarki i spróbuj ponownie.",
      unknownError: "Rozpoznawanie mowy nie zadziałało. Spróbuj ponownie lub wpisz dane ręcznie.",
      dictate: "Dyktuj klawiaturą / wpisz tekst", speech: "Spróbuj mikrofonu przeglądarki",
      dictation: "Naciśnij mikrofon klawiatury telefonu lub wpisz tekst, potem wybierz „Wpisz tekst”.",
      dictationLabel: "Godzina lub data — tekst z klawiatury",
      dictationPlaceholder: "Np. szósta trzydzieści rano", applyDictation: "Wpisz tekst",
      dictationHelp: "Język dyktowania wybierz osobno na klawiaturze; PL/EN ustawia interpretację tekstu. Brak mikrofonu na iPhonie? Ustawienia → Ogólne → Klawiatura → Włącz dyktowanie.",
      emptyText: "Wpisz lub podyktuj jedną godzinę albo datę.", code: "Kod",
      startTimeout: "Mikrofon nie rozpoczął słuchania. Możesz użyć dyktowania klawiatury lub wpisać tekst.",
      errors: {
        "not-allowed": "Brak zgody na mikrofon lub rozpoznawanie mowy. Zezwól w ustawieniach strony. Na iPhonie sprawdź też, czy Siri jest włączona.",
        "service-not-allowed": "Rozpoznawanie jest niedostępne w tej przeglądarce. Użyj dyktowania klawiatury lub wpisz tekst.",
        "audio-capture": "Mikrofon jest niedostępny. Sprawdź uprawnienia i czy inna aplikacja go nie używa.",
        network: "Nie udało się połączyć z usługą rozpoznawania. Sprawdź internet i spróbuj ponownie.",
        "no-speech": "Nie usłyszałem wypowiedzi. Spróbuj ponownie bliżej mikrofonu.",
        "language-not-supported": "Ta przeglądarka nie obsługuje rozpoznawania po polsku. Użyj innej przeglądarki lub wpisz dane ręcznie.",
        aborted: "Przerwano rozpoznawanie. Możesz spróbować ponownie.",
      },
    },
    "en-GB": {
      heading: "VOICE", panel: "Voice entry in English", close: "Close voice entry",
      language: "Speech recognition language", microphone: "Enter by voice", tip: "Enter by voice in English",
      guideTitle: "What can I say?",
      guide: "Tap the microphone beside a field and choose PL or EN. Say one time or date, for example “six thirty AM”, “six PM”, “half past six in the morning”, “yesterday” or “16 November 2026”. Include AM or PM for hours 1–12. Numeric dates use UK day/month/year. Check the result and use Undo if needed.",
      invoice: "Invoice date", fields: { date: "Date", start: "Start", end: "End" }, week: "week",
      weekEnding: (week) => `Week ${week} ending · Sunday`,
      heard: (text) => `Heard: “${text}”`, hearing: (text) => `Hearing: “${text}”`,
      retry: "Try again", repeat: "Repeat", undo: "Undo", done: "Done", use: "Use",
      speak: "Speak in English", ready: "English selected. Tap “Speak in English” to start a new recording.",
      manual: "You can also close this panel and enter the value manually.",
      changed: "The field has changed. Tap its microphone again.",
      sunday: "The week-ending date must be a Sunday. Say the date of a Sunday.",
      bothWeeks: "Show both weeks and try again.",
      rejected: "The calculator did not accept that value. Enter it manually.",
      written: "Entered", weekWritten: "Set the week's dates ending",
      save: "Check the value. Use Calculate All as usual, then Save to keep the form.",
      changedUndo: "The values have changed since voice entry. Your later edits have been kept.",
      undone: "Voice entry undone.", restored: "The previous field values have been restored.",
      empty: "No value was heard. Please try again.",
      wrongField: "That command names a different field. Tap the microphone beside the correct Start or End field.",
      confirmWeek: "This will set all 7 dates in the selected week. Confirm the Sunday date.",
      confirm: "Choose the correct result before it is entered into the form.",
      starting: "Starting the microphone…",
      privacy: "Recognition may need internet access and send audio to your browser's provider. The calculator does not save recordings.",
      unsupported: "This browser does not provide speech recognition. Use keyboard dictation or type the value.",
      https: "Open the calculator using its secure HTTPS address to use the microphone.",
      listenTime: "Listening. Say, for example, “six thirty AM” or “eighteen thirty”.",
      listenDate: "Listening. Say “yesterday” or a full date with a year. Numeric dates use UK day/month order.",
      noMatch: "No date or time was recognised. Repeat a short command.",
      stop: "Stop listening", processing: "Processing your speech…",
      timeout: "The microphone returned no result. Use keyboard dictation or type the value. You can also check permissions and internet access.",
      startError: "The microphone could not start. Check browser permissions and try again.",
      unknownError: "Speech recognition failed. Try again or enter the value manually.",
      dictate: "Keyboard dictation / type text", speech: "Try the browser microphone",
      dictation: "Tap your phone keyboard's microphone or type, then choose “Use text”.",
      dictationLabel: "Time or date — text from your keyboard",
      dictationPlaceholder: "For example, six thirty AM", applyDictation: "Use text",
      dictationHelp: "Choose the dictation language separately on your keyboard; PL/EN controls text interpretation. No iPhone microphone? Settings → General → Keyboard → Enable Dictation.",
      emptyText: "Type or dictate one time or date.", code: "Code",
      startTimeout: "The microphone did not start listening. You can use keyboard dictation or type the value.",
      errors: {
        "not-allowed": "Microphone or speech permission was denied. Allow access in site settings. On iPhone, also check that Siri is enabled.",
        "service-not-allowed": "Speech recognition is unavailable in this browser. Use keyboard dictation or type the value.",
        "audio-capture": "The microphone is unavailable. Check permissions and whether another app is using it.",
        network: "The recognition service could not be reached. Check your internet connection and try again.",
        "no-speech": "No speech was heard. Try again closer to the microphone.",
        "language-not-supported": "English speech recognition is not supported by this browser. Try another browser or enter the value manually.",
        aborted: "Speech recognition was interrupted. You can try again.",
      },
    },
  };
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  let session = null;
  let undo = null;
  let applying = false;
  let scheduled = false;
  let composing = false;

  const panel = document.createElement("section");
  panel.id = "grl-voice-panel";
  panel.hidden = true;
  panel.innerHTML = '<div class="grl-voice-heading"><span></span><select id="grl-voice-language"><option value="pl-PL" lang="pl">PL · Polski</option><option value="en-GB" lang="en">EN · English (UK)</option></select><button type="button" data-voice-action="cancel">×</button></div><h2></h2><p class="grl-voice-message" role="status" aria-live="polite" aria-atomic="true"></p><p class="grl-voice-transcript"></p><div class="grl-voice-dictation-wrap" hidden><label for="grl-voice-dictation"></label><div class="grl-voice-dictation-row"><input id="grl-voice-dictation" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"/><button type="button" data-voice-action="apply-dictation"></button></div></div><p class="grl-voice-code"></p><div class="grl-voice-actions"></div><details class="grl-voice-guide"><summary></summary><p></p></details><p class="grl-voice-help"></p>';
  document.body.append(panel);
  const title = panel.querySelector("h2");
  const message = panel.querySelector(".grl-voice-message");
  const transcript = panel.querySelector(".grl-voice-transcript");
  const actions = panel.querySelector(".grl-voice-actions");
  const help = panel.querySelector(".grl-voice-help");
  const languageSelect = panel.querySelector("#grl-voice-language");
  const dictationBox = panel.querySelector(".grl-voice-dictation-wrap");
  const dictationInput = panel.querySelector("#grl-voice-dictation");
  const errorCode = panel.querySelector(".grl-voice-code");

  function syncLanguage() {
    const copy = COPY[language];
    panel.lang = language.slice(0, 2);
    panel.setAttribute("aria-label", copy.panel);
    panel.querySelector(".grl-voice-heading > span").textContent = copy.heading;
    panel.querySelector('[data-voice-action="cancel"]').setAttribute("aria-label", copy.close);
    languageSelect.setAttribute("aria-label", copy.language);
    languageSelect.value = language;
    panel.querySelector(".grl-voice-guide summary").textContent = copy.guideTitle;
    panel.querySelector(".grl-voice-guide p").textContent = copy.guide;
    dictationInput.lang = language;
    dictationInput.placeholder = copy.dictationPlaceholder;
    dictationBox.querySelector("label").textContent = copy.dictationLabel;
    dictationBox.querySelector('[data-voice-action="apply-dictation"]').textContent = copy.applyDictation;
  }
  syncLanguage();

  const weekView = () => document.querySelector('.week-switch button[aria-pressed="true"]')?.textContent.trim() || "";

  function describe(input) {
    const copy = COPY[language];
    if (input.closest(".invoice-fields")) {
      return { key: "invoice-date", type: "date", label: copy.invoice };
    }
    if (input.closest(".week-ending-controls")) {
      const week = [...document.querySelectorAll('.week-ending-controls input[type="date"]')].indexOf(input) + 1;
      return { key: `week-${week}`, type: "date", week, bulk: true, label: copy.weekEnding(week) };
    }
    const row = input.closest("tr, .day-card");
    if (!row) return null;
    const day = row.querySelector(".day-label strong")?.textContent.trim();
    const week = Number(row.querySelector(".day-label span")?.textContent.match(/[12]/)?.[0]);
    if (!DAYS[day] || !week) return null;
    let field = "date";
    if (input.type === "time") {
      field = [...row.querySelectorAll('input[type="time"]')].indexOf(input) === 0 ? "start" : "end";
    }
    return { key: `${week}:${day}:${field}`, type: input.type, week, field,
      label: `${copy.fields[field]} · ${language === "en-GB" ? day : DAYS[day]} · ${copy.week} ${week}` };
  }

  function findField(key) {
    return [...document.querySelectorAll('#root input[type="date"], #root input[type="time"]')]
      .find((input) => describe(input)?.key === key);
  }

  function snapshot(input, info) {
    if (!info.bulk) return [{ key: info.key, before: input.value }];
    return [...document.querySelectorAll('.work-table input[type="date"]')]
      .filter((field) => describe(field)?.week === info.week)
      .map((field) => ({ key: describe(field).key, before: field.value }));
  }

  function intact(current) {
    return current.input.isConnected && describe(current.input)?.key === current.info.key &&
      current.view === weekView() && current.input.value === current.previous &&
      current.before.every((item) => findField(item.key)?.value === item.before);
  }

  function release(current) {
    clearTimeout(current?.startTimeout);
    clearTimeout(current?.timeout);
    clearTimeout(current?.finalTimeout);
    if (!current) return;
    if (current.recognition) {
      const recognition = current.recognition;
      current.recognition = null;
      recognition.onresult = recognition.onstart = recognition.onend = recognition.onerror = recognition.onnomatch = null;
      try { recognition.abort(); } catch (_) { /* Already stopped. */ }
    }
    current.button?.classList.remove("is-listening");
    current.button?.setAttribute("aria-pressed", "false");
  }

  function dismiss(restoreFocus = false) {
    const button = session?.button;
    release(session);
    session = null;
    undo = null;
    panel.hidden = true;
    dictationBox.hidden = true;
    dictationInput.value = "";
    composing = false;
    if (document.activeElement === dictationInput) dictationInput.blur();
    if (restoreFocus && button?.isConnected) button.focus({ preventScroll: true });
  }

  function action(text, name, handler, value) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.voiceAction = name;
    if (value !== undefined) button.dataset.value = value;
    button.textContent = text;
    button.addEventListener("click", handler);
    actions.append(button);
    return button;
  }

  function show(current, text) {
    current.restorePanelFocus = panel.contains(document.activeElement) || document.activeElement === current.button;
    panel.hidden = false;
    panel.dataset.state = current.state;
    panel.dataset.method = current.method;
    panel.dataset.errorCode = current.errorCode || "";
    title.textContent = current.info.label;
    message.textContent = text;
    transcript.textContent = current.text ? COPY[current.language].heard(current.text) : "";
    dictationBox.hidden = current.state !== "dictating";
    errorCode.textContent = current.errorCode ? `${COPY[current.language].code}: ${current.errorCode}` : "";
    actions.replaceChildren();
    fitDictationViewport();
  }

  // iOS keeps the layout viewport behind its keyboard. Position only the text
  // fallback inside the visible viewport; the panel can scroll when space is tight.
  function fitDictationViewport() {
    if (panel.hidden || panel.dataset.method !== "dictation") return;
    const viewport = window.visualViewport;
    panel.style.setProperty("--grl-voice-visible-top", `${Math.max(0, viewport?.offsetTop || 0) + 12}px`);
    panel.style.setProperty("--grl-voice-visible-height", `${Math.max(120, (viewport?.height || window.innerHeight) - 24)}px`);
  }

  function focusAction(current, force = false) {
    if (force || current.restorePanelFocus) actions.querySelector("button")?.focus({ preventScroll: true });
  }

  function fail(current, text, code = "") {
    if (session !== current) return;
    release(current);
    current.state = "error";
    current.errorCode = String(code).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
    show(current, text);
    const copy = COPY[current.language];
    action(copy.retry, "retry", () => start(current.input, current.button, current.method));
    action(current.method === "dictation" ? copy.speech : copy.dictate,
      current.method === "dictation" ? "speech" : "dictate",
      () => start(current.input, current.button, current.method === "dictation" ? "speech" : "dictation"));
    focusAction(current);
    help.textContent = current.method === "dictation" ? copy.dictationHelp : copy.manual;
  }

  function setField(input, value) {
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const format = (value, type, locale) => type === "date" ? value.split("-").reverse().join(locale === "en-GB" ? "/" : ".") : value;

  async function apply(current, value) {
    const copy = COPY[current.language];
    if (session !== current || !intact(current)) {
      if (session === current) fail(current, copy.changed);
      return;
    }
    if (current.info.bulk) {
      const [year, month, day] = value.split("-").map(Number);
      if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 0) {
        fail(current, copy.sunday);
        return;
      }
      if (current.before.length !== 7) {
        fail(current, copy.bothWeeks);
        return;
      }
    }
    release(current);
    current.state = "applying";
    applying = true;
    try { setField(current.input, value); } finally { applying = false; }
    // React must commit the normal form handler before a result is reported.
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (session !== current) return;
    if (!current.input.isConnected || current.input.value !== value) {
      fail(current, copy.rejected);
      return;
    }
    undo = current.before.map((item) => ({ ...item, after: findField(item.key)?.value }));
    current.state = "success";
    show(current, `${current.info.bulk ? copy.weekWritten : copy.written} ${format(value, current.info.type, current.language)}.`);
    action(copy.undo, "undo", () => undoChange(current));
    action(copy.done, "done", () => dismiss(true));
    focusAction(current);
    help.textContent = copy.save;
  }

  async function undoChange(current) {
    const copy = COPY[current.language];
    if (session !== current || !undo) return;
    if (!undo.every((item) => findField(item.key)?.value === item.after)) {
      undo = null;
      fail(current, copy.changedUndo);
      return;
    }
    const entries = undo;
    undo = null;
    current.state = "applying";
    applying = true;
    try {
      for (const item of entries) setField(findField(item.key), item.before);
    } finally { applying = false; }
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (session !== current) return;
    current.state = "success";
    show(current, copy.undone);
    action(copy.done, "done", () => dismiss(true));
    focusAction(current);
    help.textContent = copy.restored;
  }

  function interpret(current) {
    if (session !== current || !["listening", "dictating"].includes(current.state)) return;
    release(current);
    const copy = COPY[current.language];
    if (!current.text) {
      fail(current, current.method === "dictation" ? copy.emptyText : copy.empty,
        current.method === "dictation" ? "" : "no-final-result");
      return;
    }
    if (!intact(current)) { fail(current, copy.changed); return; }
    const normalized = parser.normalize(current.text);
    const endPrefix = current.language === "en-GB" ? /^(end|finish|to)\b/ : /^(koniec|zakonczenie)\b/;
    const startPrefix = current.language === "en-GB" ? /^(start|begin|from)\b/ : /^(start|poczatek|rozpoczecie)\b/;
    const spokenField = endPrefix.test(normalized) ? "end" : startPrefix.test(normalized) ? "start" : null;
    if (spokenField && current.info.field && spokenField !== current.info.field) {
      fail(current, copy.wrongField);
      return;
    }
    const options = { language: current.language, now: new Date(), referenceDate: current.previous };
    const result = current.info.type === "time" ? parser.parseTime(current.text, options) : parser.parseDate(current.text, options);
    if (result.status === "invalid") { fail(current, result.message); return; }
    if (result.status === "ok" && !current.info.bulk) { apply(current, result.value); return; }
    const choices = result.status === "ok" ? [{ value: result.value }] : result.choices;
    if (current.info.bulk && !choices.every((choice) => {
      const [year, month, day] = choice.value.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
    })) {
      fail(current, copy.sunday);
      return;
    }
    current.state = "choice";
    show(current, current.info.bulk ? copy.confirmWeek : result.message);
    for (const choice of choices) {
      action(`${copy.use} ${format(choice.value, current.info.type, current.language)}`, "apply", () => apply(current, choice.value), choice.value);
    }
    action(copy.repeat, "retry", () => start(current.input, current.button, current.method));
    focusAction(current, true);
    help.textContent = current.info.bulk && result.status === "ambiguous" ? result.message : copy.confirm;
  }

  function submitDictation() {
    const current = session;
    if (!current || current.state !== "dictating" || current.method !== "dictation" || composing) return;
    // Input/composition events never update the calculator. Only this explicit
    // action passes the complete text through the same interpretation pipeline.
    current.text = dictationInput.value.trim();
    dictationInput.blur();
    dictationBox.querySelector('[data-voice-action="apply-dictation"]').focus({ preventScroll: true });
    interpret(current);
  }

  function start(input, button, method) {
    if (!method && session?.button === button && ["listening", "dictating"].includes(session.state)) { dismiss(true); return; }
    const enteredFromPanel = panel.contains(document.activeElement);
    dismiss();
    const info = describe(input);
    if (!info || input.disabled || input.readOnly) return;
    const current = { input, button, info, previous: input.value, before: snapshot(input, info),
      view: weekView(), language, method: method || defaultMethod(), state: "listening", text: "", recognition: null };
    const copy = COPY[current.language];
    session = current;
    if (current.method === "dictation") {
      current.state = "dictating";
      show(current, copy.dictation);
      help.textContent = copy.dictationHelp;
      button.setAttribute("aria-pressed", "true");
      action(copy.speech, "speech", () => start(input, button, "speech"));
      // Keep focus synchronous with the user's tap: iOS otherwise may not open
      // its keyboard. The user starts keyboard dictation with its own microphone.
      dictationInput.focus();
      return;
    }
    show(current, copy.starting);
    help.textContent = copy.privacy;
    if (!Speech) { fail(current, copy.unsupported, "unsupported"); return; }
    if (!window.isSecureContext && location.protocol !== "file:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      fail(current, copy.https, "insecure-context"); return;
    }
    try {
      const recognition = new Speech();
      current.recognition = recognition;
      const active = () => session === current && current.state === "listening" && current.recognition === recognition;
      recognition.lang = current.language;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        if (!active() || current.started) return;
        current.started = true;
        clearTimeout(current.startTimeout);
        button.classList.add("is-listening");
        button.setAttribute("aria-pressed", "true");
        message.textContent = current.info.type === "time" ? copy.listenTime : copy.listenDate;
        current.timeout = setTimeout(() => {
          if (!active()) return;
          if (current.text) interpret(current);
          else fail(current, copy.timeout, "no-result-timeout");
        }, 20000);
      };
      recognition.onresult = (event) => {
        if (!active()) return;
        const finalParts = [], interimParts = [];
        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index];
          (result.isFinal ? finalParts : interimParts).push(result[0].transcript);
        }
        current.text = finalParts.join(" ").trim();
        transcript.textContent = copy.hearing([...finalParts, ...interimParts].join(" ").trim());
        clearTimeout(current.finalTimeout);
        if (current.text && !interimParts.length) {
          // Some mobile engines omit the end event. Do not leave the microphone open.
          current.finalTimeout = setTimeout(() => interpret(current), 800);
        }
      };
      recognition.onend = () => { if (active()) interpret(current); };
      recognition.onnomatch = () => { if (active()) fail(current, copy.noMatch, "no-match"); };
      recognition.onerror = (event) => { if (active()) fail(current, copy.errors[event.error] || copy.unknownError, event.error || "recognition-error"); };
      action(copy.stop, "stop", () => {
        if (session !== current || !current.recognition) return;
        message.textContent = copy.processing;
        try { current.recognition.stop(); } catch (_) { interpret(current); }
      });
      if (enteredFromPanel) focusAction(current, true);
      current.startTimeout = setTimeout(() => {
        if (active() && !current.started) fail(current, copy.startTimeout, "start-timeout");
      }, 60000);
      // Must run in the user's click handler; never start in a timer or on page load.
      recognition.start();
    } catch (error) {
      fail(current, copy.startError, `start-${error?.name || "error"}`);
    }
  }

  function enhance() {
    scheduled = false;
    document.querySelectorAll('#root input[type="date"], #root input[type="time"]').forEach((input) => {
      const info = describe(input);
      if (!info) return;
      const copy = COPY[language];
      const existing = buttons.get(input);
      if (existing?.isConnected) {
        existing.lang = language.slice(0, 2);
        existing.setAttribute("aria-label", `${copy.microphone}: ${info.label}`);
        existing.title = copy.tip;
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "grl-voice-button";
      button.lang = language.slice(0, 2);
      button.setAttribute("aria-label", `${copy.microphone}: ${info.label}`);
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-controls", panel.id);
      button.title = copy.tip;
      button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
      button.addEventListener("click", (event) => {
        event.preventDefault(); // A button within a label must not open the native picker.
        start(input, button);
      });
      input.parentElement.classList.add("grl-voice-field");
      input.parentElement.append(button); // Do not reparent a React-owned input.
      buttons.set(input, button);
    });
    if (session && ["listening", "dictating", "choice", "ready"].includes(session.state) && !intact(session)) dismiss();
  }

  languageSelect.addEventListener("change", () => {
    const previous = session;
    // Cancel before changing locale: late results must never cross languages.
    dismiss();
    language = languageSelect.value === "en-GB" ? "en-GB" : "pl-PL";
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch (_) { /* In-memory choice still works. */ }
    syncLanguage();
    enhance();
    if (!previous?.input.isConnected) return;
    const { input, button } = previous;
    const info = describe(input);
    if (!info) return;
    if (previous.method === "dictation") {
      start(input, button, "dictation");
      return;
    }
    const current = { input, button, info, language, previous: input.value,
      before: snapshot(input, info), view: weekView(), method: "speech", state: "ready", text: "", recognition: null };
    session = current;
    const copy = COPY[language];
    show(current, copy.ready);
    action(copy.speak, "retry", () => start(input, button, current.method));
    help.textContent = copy.privacy;
    focusAction(current, true);
  });

  panel.querySelector('[data-voice-action="cancel"]').addEventListener("click", () => dismiss(true));
  panel.querySelector('[data-voice-action="apply-dictation"]').addEventListener("click", submitDictation);
  dictationInput.addEventListener("compositionstart", () => { composing = true; });
  dictationInput.addEventListener("compositionend", () => { composing = false; });
  dictationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing && event.keyCode !== 229 && !composing) {
      event.preventDefault();
      submitDictation();
    }
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !panel.hidden) dismiss(true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) dismiss(); });
  window.addEventListener("pagehide", () => dismiss());
  document.addEventListener("click", (event) => {
    if (!session || event.target.closest(".grl-voice-button, #grl-voice-panel")) return;
    if (event.target.closest(".week-switch, .floating-week-nav, .action-bar")) dismiss();
  }, true);
  const manualEdit = (event) => {
    if (!applying && session && ["listening", "dictating", "choice", "ready"].includes(session.state) && event.target.closest("#root")) dismiss();
  };
  document.addEventListener("input", manualEdit, true);
  document.addEventListener("change", manualEdit, true);
  window.visualViewport?.addEventListener("resize", fitDictationViewport);
  window.visualViewport?.addEventListener("scroll", fitDictationViewport);
  window.addEventListener("resize", fitDictationViewport);
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(enhance);
  });
  observer.observe(document.getElementById("root"), { childList: true, subtree: true });
  enhance();
})();
