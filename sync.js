(function () {
  var SUPABASE_URL = "https://nlhjibxhxzwehlzlixgb.supabase.co";
  var SUPABASE_KEY = "sb_publishable_iiqsJZG2MfcrPNCpt8iiQA_kfDlzxd1";
  var KEYS = ["wadi_degla_requests_final", "wadi_degla_card_locations", "wadi_degla_employees", "wadi_degla_branches"];
  var clientId = Math.random().toString(36).slice(2) + Date.now();
  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
  var lastSeen = {};
  var timers = {};

  function applyRow(row, reloadOnChange) {
    var text = JSON.stringify(row.data == null ? [] : row.data);
    if (lastSeen[row.key] === text) return false;
    lastSeen[row.key] = text;
    window.__origSetItem.call(window.localStorage, row.key, text);
    if (reloadOnChange && row.writer !== clientId) {
      window.location.reload();
    }
    return true;
  }

  function push(key, value) {
    var parsed;
    try { parsed = JSON.parse(value); } catch (e) { return; }
    lastSeen[key] = JSON.stringify(parsed);
    clearTimeout(timers[key]);
    timers[key] = setTimeout(function () {
      client
        .from("app_state")
        .upsert({ key: key, data: parsed, writer: clientId, updated_at: new Date().toISOString() }, { onConflict: "key" })
        .then(function (res) {
          if (res.error) console.error("sync error", res.error);
        });
    }, 300);
  }

  window.__origSetItem = window.localStorage.setItem.bind(window.localStorage);
  var proto = Object.getPrototypeOf(window.localStorage) || Storage.prototype;
  proto.setItem = function (key, value) {
    var out = window.__origSetItem(key, value);
    if (KEYS.indexOf(key) !== -1) push(key, value);
    return out;
  };

  function loadAll(reloadOnChange) {
    return client
      .from("app_state")
      .select("key,data,writer")
      .in("key", KEYS)
      .then(function (res) {
        if (res.error) { console.error("sync load error", res.error); return; }
        (res.data || []).forEach(function (row) { applyRow(row, reloadOnChange); });
      });
  }

  function boot() {
    var seeds = [];
    KEYS.forEach(function (key) {
      if (lastSeen[key] === undefined) {
        var local = window.localStorage.getItem(key);
        if (local && local !== "[]") {
          seeds.push({ key: key, data: JSON.parse(local), writer: clientId, updated_at: new Date().toISOString() });
          lastSeen[key] = local;
        }
      }
    });
    var ready = seeds.length
      ? client.from("app_state").upsert(seeds, { onConflict: "key" })
      : Promise.resolve();

    Promise.resolve(ready).then(function () {
      client
        .channel("app_state_sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, function (payload) {
          if (payload.new) applyRow(payload.new, true);
        })
        .subscribe();

      setInterval(function () { loadAll(true); }, 15000);

      var s = document.createElement("script");
      s.type = "module";
      s.src = "/app.js";
      document.body.appendChild(s);
    });
  }

  window.__wdSupabase = client;
  loadAll(false).then(boot, boot);
})();
