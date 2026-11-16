/* Polish and UK English date/time interpretation. No audio, network or form mutations. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GRLVoiceParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const NUMBERS = new Map();
  const add = (value, forms) => forms.split(" ").forEach((form) => NUMBERS.set(form, value));
  add(0, "zero zerowa zerowej zerowy zerowego");
  add(1, "jeden jedna jednej pierwsza pierwszej pierwszy pierwszego");
  add(2, "dwa dwie druga drugiej drugi drugiego");
  add(3, "trzy trzecia trzeciej trzeci trzeciego");
  add(4, "cztery czwarta czwartej czwarty czwartego");
  add(5, "piec piata piatej piaty piatego");
  add(6, "szesc szosta szostej szosty szostego");
  add(7, "siedem siodma siodmej siodmy siodmego");
  add(8, "osiem osma osmej osmy osmego");
  add(9, "dziewiec dziewiata dziewiatej dziewiaty dziewiatego");
  add(10, "dziesiec dziesiata dziesiatej dziesiaty dziesiatego");
  add(11, "jedenascie jedenasta jedenastej jedenasty jedenastego");
  add(12, "dwanascie dwunasta dwunastej dwunasty dwunastego");
  add(13, "trzynascie trzynasta trzynastej trzynasty trzynastego");
  add(14, "czternascie czternasta czternastej czternasty czternastego");
  add(15, "pietnascie pietnasta pietnastej pietnasty pietnastego");
  add(16, "szesnascie szesnasta szesnastej szesnasty szesnastego");
  add(17, "siedemnascie siedemnasta siedemnastej siedemnasty siedemnastego");
  add(18, "osiemnascie osiemnasta osiemnastej osiemnasty osiemnastego");
  add(19, "dziewietnascie dziewietnasta dziewietnastej dziewietnasty dziewietnastego");
  add(20, "dwadziescia dwudziesta dwudziestej dwudziesty dwudziestego");
  add(30, "trzydziesci trzydziesta trzydziestej trzydziesty trzydziestego");
  add(40, "czterdziesci czterdziesta czterdziestej czterdziesty czterdziestego");
  add(50, "piecdziesiat piecdziesiata piecdziesiatej piecdziesiaty piecdziesiatego");
  add(60, "szescdziesiat szescdziesiata szescdziesiatej szescdziesiaty szescdziesiatego");
  add(70, "siedemdziesiat siedemdziesiata siedemdziesiatej siedemdziesiaty siedemdziesiatego");
  add(80, "osiemdziesiat osiemdziesiata osiemdziesiatej osiemdziesiaty osiemdziesiatego");
  add(90, "dziewiecdziesiat dziewiecdziesiata dziewiecdziesiatej dziewiecdziesiaty dziewiecdziesiatego");

  const MONTHS = new Map();
  [
    "styczen stycznia styczniu", "luty lutego lutym", "marzec marca marcu",
    "kwiecien kwietnia kwietniu", "maj maja maju", "czerwiec czerwca czerwcu",
    "lipiec lipca lipcu", "sierpien sierpnia sierpniu", "wrzesien wrzesnia wrzesniu",
    "pazdziernik pazdziernika pazdzierniku", "listopad listopada listopadzie",
    "grudzien grudnia grudniu",
  ].forEach((forms, index) => forms.split(" ").forEach((form) => MONTHS.set(form, index + 1)));

  const pad = (value) => String(value).padStart(2, "0");
  const invalidTime = () => ({ status: "invalid", message: "Podaj jedną godzinę, np. „szósta trzydzieści rano” lub „osiemnasta”." });
  const invalidDate = () => ({ status: "invalid", message: "Podaj poprawną datę, np. „szesnasty listopada dwa tysiące dwadzieścia sześć”, albo „wczoraj”." });

  function normalize(text) {
    if (typeof text !== "string" || text.length > 240) return "";
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l").replace(/[\u00a0\s]+/g, " ").trim()
      .replace(/[.!?,;]+$/, "").trim();
  }

  // Only a complete, grammatically bounded number is accepted; nothing is extracted
  // from surrounding prose. Ranges are checked by the caller.
  function smallNumber(text, allowMinuteZero) {
    if (/^\d{1,2}$/.test(text)) return Number(text);
    if (NUMBERS.has(text)) return NUMBERS.get(text);
    const parts = text.split(" ");
    if (parts.length !== 2) return null;
    const first = NUMBERS.get(parts[0]);
    const second = /^\d$/.test(parts[1]) ? Number(parts[1]) : NUMBERS.get(parts[1]);
    if (allowMinuteZero && (parts[0] === "zero" || parts[0] === "0") && second >= 0 && second <= 9) return second;
    if (first >= 20 && first % 10 === 0 && second >= 1 && second <= 9) return first + second;
    return null;
  }

  function hourNumber(text) {
    if (/^polnoc(?:y)?$/.test(text)) return { hour: 0, explicit: true };
    if (/^poludnie$/.test(text)) return { hour: 12, explicit: true };
    const value = smallNumber(text);
    if (value === null || value > 23) return null;
    return { hour: value, explicit: value === 0 || value > 12 || /^0\d$/.test(text) };
  }

  function hoursForPeriod(hour, period, explicit) {
    if (!period) return explicit ? [hour] : [hour % 12, hour % 12 + 12];
    if (period === "am") return hour <= 12 ? [hour % 12] : [];
    if (period === "morning") return hour < 12 ? [hour] : [];
    if (period === "pm") return hour === 0 ? [] : [hour <= 12 ? hour % 12 + 12 : hour];
    if (period === "evening") return hour === 0 || hour === 12 ? [] : [hour < 12 ? hour + 12 : hour];
    if (period === "noon") return hour === 12 ? [12] : [];
    if (period === "night") {
      if (hour <= 5 || hour >= 22) return [hour];
      if (hour >= 10 && hour <= 12) return [(hour + 12) % 24];
    }
    return [];
  }

  function timeResult(hour, minute, offset, period, explicit) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return invalidTime();
    const candidates = hoursForPeriod(hour, period, explicit).map((h) => {
      const total = (h * 60 + minute + offset + 1440) % 1440;
      return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
    });
    const values = [...new Set(candidates)].sort();
    if (!values.length) return invalidTime();
    if (values.length === 1) return { status: "ok", value: values[0] };
    return {
      status: "ambiguous",
      choices: values.map((value) => ({ value, label: value })),
      message: "Wybierz właściwą godzinę albo powtórz z określeniem „rano” lub „po południu”.",
    };
  }

  function parseTime(text, options) {
    if (options && options.language === "en-GB") return parseEnglishTime(text);
    let value = normalize(text);
    if (!value) return invalidTime();
    value = value.replace(/\ba\s*\.\s*m\.?$/, "am").replace(/\bp\s*\.\s*m\.?$/, "pm");
    value = value.replace(/^(?:start|poczatek|rozpoczecie|koniec|zakonczenie)\s+/, "")
      .replace(/^o\s+/, "").replace(/^(?:godzina|godzine|godziny|godzinie)\s+/, "");

    let period = null;
    const periodPatterns = [
      [/(?: rano| nad ranem| przed poludniem)$/, "morning"],
      [/ po poludniu$/, "pm"], [/ wieczorem$/, "evening"],
      [/(?: w nocy| noca)$/, "night"], [/ w poludnie$/, "noon"],
      [/ am$/, "am"], [/ pm$/, "pm"],
    ];
    for (const [pattern, name] of periodPatterns) {
      if (pattern.test(value)) { value = value.replace(pattern, ""); period = name; break; }
    }

    // Named anchors already designate a particular half of the day.
    if (/^polnoc(?:y)?$/.test(value)) {
      return !period || ["am", "morning", "night"].includes(period)
        ? { status: "ok", value: "00:00" } : invalidTime();
    }
    if (value === "poludnie") {
      return !period || ["pm", "noon"].includes(period)
        ? { status: "ok", value: "12:00" } : invalidTime();
    }

    let match = value.match(/^(?:w pol|wpol|pol) do (.+)$/);
    let offset = -30;
    if (!match) { match = value.match(/^za kwadrans (.+)$/); offset = -15; }
    if (!match) { match = value.match(/^kwadrans po (.+)$/); offset = 15; }
    if (match) {
      const hour = hourNumber(match[1]);
      return hour ? timeResult(hour.hour, 0, offset, period, hour.explicit) : invalidTime();
    }

    match = value.match(/^(\d{1,2})[:.](\d{2})$/);
    if (match) {
      const hour = Number(match[1]);
      return timeResult(hour, Number(match[2]), 0, period, hour === 0 || hour > 12 || /^0\d$/.test(match[1]));
    }

    // A whole number such as "dwadzieścia pięć" must not be reinterpreted as 20:05.
    const whole = smallNumber(value);
    if (whole !== null) {
      const hour = hourNumber(value);
      return hour ? timeResult(hour.hour, 0, 0, period, hour.explicit) : invalidTime();
    }

    const words = value.split(" ");
    const readings = [];
    for (let split = 1; split < words.length; split += 1) {
      const hour = hourNumber(words.slice(0, split).join(" "));
      const minute = smallNumber(words.slice(split).join(" "), true);
      if (hour && minute !== null && minute <= 59) readings.push(timeResult(hour.hour, minute, 0, period, hour.explicit));
    }
    // Conflicting syntactic readings are not guessed at.
    const valid = readings.filter((reading) => reading.status !== "invalid");
    if (valid.length !== 1) return invalidTime();
    return valid[0];
  }

  function calendarDate(year, month, day) {
    if (![year, month, day].every(Number.isInteger) || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return null;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= days[month - 1] ? `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}` : null;
  }

  function parseYear(text) {
    if (/^\d{4}$/.test(text)) return Number(text);
    if (/^dwutysiecz(?:ny|nego)$/.test(text)) return 2000;
    const parts = text.split(" ");
    let thousands = 0;
    if (parts[0] === "tysiac") { thousands = 1000; parts.shift(); }
    else if (["tysiace", "tysiecy"].includes(parts[1])) {
      const count = smallNumber(parts[0]);
      if (count === null || count < 2 || count > 9) return null;
      thousands = count * 1000;
      parts.splice(0, 2);
    }
    if (!thousands) return null;
    const hundreds = { sto: 100, dwiescie: 200, trzysta: 300, czterysta: 400, piecset: 500, szescset: 600, siedemset: 700, osiemset: 800, dziewiecset: 900 };
    let rest = 0;
    if (hundreds[parts[0]]) rest += hundreds[parts.shift()];
    if (parts.length) {
      const remainder = smallNumber(parts.join(" "));
      if (remainder === null || remainder === 0) return null;
      rest += remainder;
    }
    return thousands + rest;
  }

  function localDate(date) {
    return calendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  function parseDate(text, options) {
    const opts = options || {};
    if (opts.language === "en-GB") return parseEnglishDate(text, opts);
    const now = opts.now === undefined ? new Date() : opts.now;
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return invalidDate();
    let value = normalize(text).replace(/^(?:data|date)\s+/, "")
      .replace(/^(?:na dzien|dnia|dzien)\s+/, "");
    if (!value) return invalidDate();
    const relative = { dzis: 0, dzisiaj: 0, wczoraj: -1, jutro: 1, przedwczoraj: -2, pojutrze: 2 };
    if (Object.prototype.hasOwnProperty.call(relative, value)) {
      const target = new Date(now.getTime());
      // Local calendar arithmetic remains correct across midnight and DST changes.
      target.setHours(12, 0, 0, 0);
      target.setDate(target.getDate() + relative[value]);
      const result = localDate(target);
      return result ? { status: "ok", value: result } : invalidDate();
    }

    let year;
    let month;
    let day;
    let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) { year = Number(match[1]); month = Number(match[2]); day = Number(match[3]); }
    else {
      match = value.match(/^(\d{1,2})([./-])(\d{1,2})(?:\2(\d{4}))?$/)
        || value.match(/^(\d{1,2})( )(\d{1,2})(?: (\d{4}))?$/);
      if (match) { day = Number(match[1]); month = Number(match[3]); year = match[4] ? Number(match[4]) : undefined; }
      else {
        value = value.replace(/ (?:roku|rok|r)$/, "");
        const words = value.split(" ");
        const positions = words.map((word, index) => MONTHS.has(word) ? index : -1).filter((index) => index >= 0);
        if (positions.length !== 1) return invalidDate();
        const position = positions[0];
        day = smallNumber(words.slice(0, position).join(" "));
        month = MONTHS.get(words[position]);
        const rest = words.slice(position + 1).join(" ");
        year = rest ? parseYear(rest) : undefined;
        if (day === null || year === null) return invalidDate();
      }
    }

    const inferredYear = year === undefined;
    if (inferredYear) {
      const reference = typeof opts.referenceDate === "string" && opts.referenceDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      year = reference && calendarDate(Number(reference[1]), Number(reference[2]), Number(reference[3]))
        ? Number(reference[1]) : now.getFullYear();
    }
    const result = calendarDate(year, month, day);
    if (!result) return invalidDate();
    if (inferredYear) {
      const label = `${pad(day)}.${pad(month)}.${String(year).padStart(4, "0")}`;
      return {
        status: "ambiguous", choices: [{ value: result, label }],
        message: `Nie podano roku. Potwierdź datę ${label} albo powiedz pełną datę.`,
      };
    }
    return { status: "ok", value: result };
  }

  const EN_NUMBERS = new Map();
  "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen"
    .split(" ").forEach((word, index) => EN_NUMBERS.set(word, index));
  "twenty thirty forty fifty sixty seventy eighty ninety".split(" ")
    .forEach((word, index) => EN_NUMBERS.set(word, (index + 2) * 10));
  const EN_ORDINALS = new Map();
  "first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth fifteenth sixteenth seventeenth eighteenth nineteenth twentieth"
    .split(" ").forEach((word, index) => EN_ORDINALS.set(word, index + 1));
  EN_ORDINALS.set("thirtieth", 30);
  const EN_MONTHS = new Map();
  ["january jan", "february feb", "march mar", "april apr", "may", "june jun",
    "july jul", "august aug", "september sep sept", "october oct", "november nov", "december dec"]
    .forEach((names, index) => names.split(" ").forEach((name) => EN_MONTHS.set(name, index + 1)));
  const invalidEnglishTime = () => ({ status: "invalid", message: "Say one time, such as “six thirty in the morning” or “eighteen thirty”." });
  const invalidEnglishDate = () => ({ status: "invalid", message: "Say a valid date, such as “sixteenth November twenty twenty-six”, or “yesterday”. Numeric dates use day/month/year." });

  function normalizeEnglish(text) {
    return normalize(text).replace(/[’‘]/g, "'").replace(/([a-z])-(?=[a-z])/g, "$1 ");
  }

  function englishNumber(text, minute) {
    if (/^\d{1,2}$/.test(text)) return Number(text);
    if (EN_NUMBERS.has(text)) return EN_NUMBERS.get(text);
    const parts = text.split(" ");
    if (parts.length !== 2) return null;
    const first = EN_NUMBERS.get(parts[0]);
    const second = /^\d$/.test(parts[1]) ? Number(parts[1]) : EN_NUMBERS.get(parts[1]);
    if (minute && ["oh", "o", "zero", "0"].includes(parts[0]) && second >= 0 && second <= 9) return second;
    return first >= 20 && first % 10 === 0 && second >= 1 && second <= 9 ? first + second : null;
  }

  function englishHour(text) {
    if (text === "midnight") return { hour: 0, explicit: true, named: true };
    if (text === "noon" || text === "midday") return { hour: 12, explicit: true, named: true };
    const hour = englishNumber(text);
    return hour !== null && hour <= 23
      ? { hour, explicit: hour === 0 || hour > 12 || /^0\d$/.test(text) } : null;
  }

  function englishTimeResult(hour, minute, offset, period, explicit) {
    if (period === "english-night") {
      if (hour <= 5 || hour === 12) period = "am";
      else if (hour <= 11 || hour >= 18) period = "pm";
      else return invalidEnglishTime();
    }
    const result = timeResult(hour, minute, offset, period, explicit);
    if (result.status === "invalid") return invalidEnglishTime();
    if (result.status === "ambiguous") result.message = "Choose the correct time, or repeat it with AM, PM, or a time of day.";
    return result;
  }

  function parseEnglishTime(text) {
    let value = normalizeEnglish(text);
    if (!value) return invalidEnglishTime();
    value = value.replace(/(\d)([ap])\.?m\.?$/, "$1 $2m")
      .replace(/\b([ap])\s*\.\s*m\.?$/, "$1m");
    const prefix = value.match(/^(?:(start|end|finish)(?: time)?|(from|to))\s+/);
    if (prefix) {
      value = value.slice(prefix[0].length);
      // "From six to seven" is a range, not six minutes before seven.
      if (prefix[2] === "from" && /\bto\b/.test(value)) return invalidEnglishTime();
    }
    value = value.replace(/^at\s+/, "");
    let period = null;
    for (const [pattern, name] of [
      [/ in the morning$/, "am"], [/ in the afternoon$/, "pm"],
      [/ in the evening$/, "evening"], [/ at night$/, "english-night"],
      [/ am$/, "am"], [/ pm$/, "pm"],
    ]) {
      if (pattern.test(value)) { value = value.replace(pattern, ""); period = name; break; }
    }
    value = value.replace(/ o(?:'| )?clock$/, "");
    if (value === "midnight") {
      return !period || ["am", "english-night"].includes(period)
        ? { status: "ok", value: "00:00" } : invalidEnglishTime();
    }
    if (value === "noon" || value === "midday") {
      return !period || period === "pm" ? { status: "ok", value: "12:00" } : invalidEnglishTime();
    }
    const atHour = (hour, minute, offset) => {
      if (!hour) return invalidEnglishTime();
      if (hour.named && period && (hour.hour === 12 ? period !== "pm" : !["am", "english-night"].includes(period))) return invalidEnglishTime();
      return englishTimeResult(hour.hour, minute, offset, period, hour.explicit);
    };

    let match = value.match(/^half(?: past)? (.+)$/);
    let offset = 30;
    let anchor = match && match[1];
    if (!match) {
      match = value.match(/^(?:a )?quarter (past|to) (.+)$/);
      if (match) { offset = match[1] === "past" ? 15 : -15; anchor = match[2]; }
    }
    if (!match) {
      match = value.match(/^(.+?)(?: minutes?)? (past|to) (.+)$/);
      if (match) {
        const minutes = englishNumber(match[1]);
        if (minutes === null || minutes < 1 || minutes > 59) return invalidEnglishTime();
        offset = match[2] === "past" ? minutes : -minutes;
        anchor = match[3];
      }
    }
    if (match) {
      const hour = englishHour(anchor);
      return atHour(hour, 0, offset);
    }
    match = value.match(/^(\d{1,2})[:.](\d{2})$/);
    if (match) {
      const hour = Number(match[1]);
      return englishTimeResult(hour, Number(match[2]), 0, period, hour === 0 || hour > 12 || /^0\d$/.test(match[1]));
    }
    if (englishNumber(value) !== null) {
      const hour = englishHour(value);
      return atHour(hour, 0, 0);
    }
    const words = value.split(" ");
    const readings = [];
    for (let split = 1; split < words.length; split += 1) {
      const hour = englishHour(words.slice(0, split).join(" "));
      const minute = englishNumber(words.slice(split).join(" "), true);
      if (hour && minute !== null && minute <= 59) {
        const reading = atHour(hour, minute, 0);
        if (reading.status !== "invalid") readings.push(reading);
      }
    }
    return readings.length === 1 ? readings[0] : invalidEnglishTime();
  }

  function englishDay(text) {
    const numeric = text.match(/^(\d{1,2})(st|nd|rd|th)?$/);
    let day;
    if (numeric) {
      day = Number(numeric[1]);
      const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th");
      if (numeric[2] && numeric[2] !== suffix) return null;
    } else if (EN_ORDINALS.has(text)) day = EN_ORDINALS.get(text);
    else {
      const parts = text.split(" ");
      if (parts.length === 2 && ["twenty", "thirty"].includes(parts[0]) && EN_ORDINALS.has(parts[1])) {
        const unit = EN_ORDINALS.get(parts[1]);
        day = unit <= 9 ? EN_NUMBERS.get(parts[0]) + unit : null;
      } else day = englishNumber(text);
    }
    return day >= 1 && day <= 31 ? day : null;
  }

  function englishYear(text) {
    if (/^\d{4}$/.test(text)) return Number(text);
    const parts = text.split(" ");
    const thousandCount = englishNumber(parts[0]);
    if (parts[1] === "thousand" && thousandCount >= 1 && thousandCount <= 9) {
      const rest = parts.slice(2);
      let total = thousandCount * 1000;
      if (!rest.length) return total;
      if (rest[0] === "and") rest.shift();
      if (!rest.length) return null;
      const hundredCount = englishNumber(rest[0]);
      if (rest[1] === "hundred" && hundredCount >= 1 && hundredCount <= 9) {
        total += hundredCount * 100;
        rest.splice(0, 2);
        if (!rest.length) return total;
        if (rest[0] === "and") rest.shift();
      }
      const last = englishNumber(rest.join(" "));
      return last >= 1 && last <= 99 ? total + last : null;
    }
    // Spoken year pairs: "twenty twenty-six", "nineteen ninety-nine", "twenty oh six".
    for (let split = 1; split <= 2 && split < parts.length; split += 1) {
      const century = englishNumber(parts.slice(0, split).join(" "));
      const tail = parts.slice(split).join(" ");
      if (century === null || century < 10 || century > 99) continue;
      if (tail === "hundred") return century * 100;
      const remainder = englishNumber(tail, true);
      if (remainder >= 10 || (remainder !== null && /^(?:oh|o|zero) /.test(tail))) return century * 100 + remainder;
    }
    return null;
  }

  function parseEnglishDate(text, opts) {
    const now = opts.now === undefined ? new Date() : opts.now;
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return invalidEnglishDate();
    let value = normalizeEnglish(text).replace(/,/g, " ").replace(/\s+/g, " ").trim()
      .replace(/^(?:invoice date|date)\s+/, "").replace(/^on\s+/, "");
    if (!value) return invalidEnglishDate();
    const relative = { today: 0, yesterday: -1, tomorrow: 1, "day before yesterday": -2, "day after tomorrow": 2 };
    const relativeKey = value.replace(/^the /, "");
    if (Object.prototype.hasOwnProperty.call(relative, relativeKey)) {
      const target = new Date(now.getTime());
      target.setHours(12, 0, 0, 0);
      target.setDate(target.getDate() + relative[relativeKey]);
      const result = localDate(target);
      return result ? { status: "ok", value: result } : invalidEnglishDate();
    }
    let year;
    let month;
    let day;
    let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) { year = Number(match[1]); month = Number(match[2]); day = Number(match[3]); }
    else {
      match = value.match(/^(\d{1,2})([./-])(\d{1,2})(?:\2(\d{4}))?$/)
        || value.match(/^(\d{1,2})( )(\d{1,2})(?: (\d{4}))?$/);
      if (match) { day = Number(match[1]); month = Number(match[3]); year = match[4] ? Number(match[4]) : undefined; }
      else {
        const words = value.split(" ");
        const positions = words.map((word, index) => EN_MONTHS.has(word) ? index : -1).filter((index) => index >= 0);
        if (positions.length !== 1) return invalidEnglishDate();
        const position = positions[0];
        month = EN_MONTHS.get(words[position]);
        if (position > 0) {
          day = englishDay(words.slice(0, position).join(" ").replace(/^the /, "").replace(/ of$/, ""));
          const rest = words.slice(position + 1).join(" ");
          year = rest ? englishYear(rest) : undefined;
        } else {
          const after = words.slice(1).join(" ").replace(/^the /, "").split(" ");
          const readings = [];
          for (let split = 1; split <= after.length; split += 1) {
            const candidateDay = englishDay(after.slice(0, split).join(" "));
            const rest = after.slice(split).join(" ");
            const candidateYear = rest ? englishYear(rest) : undefined;
            if (candidateDay !== null && candidateYear !== null) readings.push([candidateDay, candidateYear]);
          }
          if (readings.length !== 1) return invalidEnglishDate();
          [day, year] = readings[0];
        }
        if (day === null || year === null) return invalidEnglishDate();
      }
    }
    const inferredYear = year === undefined;
    if (inferredYear) {
      const reference = typeof opts.referenceDate === "string" && opts.referenceDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      year = reference && calendarDate(Number(reference[1]), Number(reference[2]), Number(reference[3]))
        ? Number(reference[1]) : now.getFullYear();
    }
    const result = calendarDate(year, month, day);
    if (!result) return invalidEnglishDate();
    if (inferredYear) {
      const label = `${pad(day)}/${pad(month)}/${String(year).padStart(4, "0")}`;
      return { status: "ambiguous", choices: [{ value: result, label }], message: `No year was given. Confirm ${label}, or say the complete date.` };
    }
    return { status: "ok", value: result };
  }

  return Object.freeze({ normalize, parseTime, parseDate });
});
