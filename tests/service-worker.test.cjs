const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function worker() {
  const events = {}, deleted = [], cached = [];
  const scope = "https://gipsdrill.github.io/GRL-Driver-Invoice-Calculator/";
  const self = {
    registration: { scope }, location: { origin: "https://gipsdrill.github.io" },
    addEventListener: (type, fn) => { events[type] = fn; },
    skipWaiting: async () => {}, clients: { claim: async () => {} },
  };
  const caches = {
    keys: async () => ["grl-driver-invoice-v5", "grl-driver-invoice-v6", "grl-driver-invoice-v7", "grl-driver-invoice-v8", "rotamaster-v3", "goodform-assets"],
    delete: async (key) => { deleted.push(key); return true; },
    open: async () => ({ addAll: async (urls) => { cached.push(...urls); } }),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8"), { self, caches, URL });
  const run = async (name) => {
    let completion;
    events[name]({ waitUntil: (promise) => { completion = promise; } });
    await completion;
  };
  return { run, deleted, cached, scope };
}

test("cache activation preserves other applications on the same GitHub Pages origin", async () => {
  const w = worker();
  await w.run("activate");
  assert.deepEqual(w.deleted, ["grl-driver-invoice-v5", "grl-driver-invoice-v6", "grl-driver-invoice-v7"]);
});

test("new voice assets and the actual stylesheet version are available in the app shell", async () => {
  const w = worker();
  await w.run("install");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  for (const file of ["voice-parser.js?v=3", "voice-input.js?v=3", "voice-input.css?v=3", "nextgen.css?v=5"]) {
    assert.ok(html.includes(`./${file}`));
    assert.ok(w.cached.includes(w.scope + file));
    assert.ok(fs.existsSync(path.join(__dirname, "..", file.split("?")[0])));
  }
});
