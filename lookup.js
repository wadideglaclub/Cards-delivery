
(function () {
  var CARD_ID = "wd-membership-lookup";
  var timer = null;
  var BRANCH_MAP = null;
  var CSV_URL = "./membership_full_A_C.csv";

  async function loadCSV(){
    if(BRANCH_MAP) return BRANCH_MAP;
    try{
      var res = await fetch(CSV_URL);
      var text = await res.text();
      var lines = text.split('\n');
      BRANCH_MAP = {};
      for(var i=1;i<lines.length;i++){
        var line = lines[i].trim();
        if(!line) continue;
        // Split by comma but handle quotes
        var parts = line.split(',');
        if(parts.length < 2) continue;
        var mem = parts[0].replace(/"/g,'').trim().toUpperCase();
        var branch = parts[1].replace(/"/g,'').trim();
        if(!mem || !branch) continue;
        BRANCH_MAP[mem] = branch;
        BRANCH_MAP[mem.replace(/^0+/, "")] = branch;
      }
      console.log("CSV loaded A2:C257002:", Object.keys(BRANCH_MAP).length);
      return BRANCH_MAP;
    }catch(e){
      console.error("CSV load failed", e);
      BRANCH_MAP = {};
      return BRANCH_MAP;
    }
  }

  function normalize(v) {
    return String(v || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
  }

  function buildCard() {
    var card = document.createElement("div");
    card.id = CARD_ID;
    card.dir = "rtl";
    card.style.cssText = "max-width:1400px;margin:12px auto 0;padding:0 16px;font-family:'Tajawal',sans-serif";
    var box = document.createElement("div");
    box.style.cssText = "background:#fff;border:2px solid #0F0F0F;border-bottom:4px solid #FFD700;border-radius:20px;padding:16px";
    card.appendChild(box);
    var title = document.createElement("div");
    title.textContent = "🔎 بحث عن فرع العضوية";
    title.style.cssText = "font-weight:800;font-size:15px;margin-bottom:12px";
    box.appendChild(title);
    var grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:12px";
    box.appendChild(grid);
    function field(label) {
      var wrap = document.createElement("div");
      var l = document.createElement("div");
      l.textContent = label;
      l.style.cssText = "font-size:12px;font-weight:700;margin-bottom:6px";
      var i = document.createElement("input");
      i.style.cssText = "width:100%;height:44px;border:2px solid #0F0F0F;border-radius:12px;padding:0 12px;font-size:14px;font-family:inherit;background:#fff";
      wrap.appendChild(l);
      wrap.appendChild(i);
      grid.appendChild(wrap);
      return i;
    }
    var numInput = field("رقم العضوية");
    numInput.setAttribute("placeholder", "اكتب رقم العضوية");
    var branchInput = field("مكان الفرع");
    branchInput.readOnly = true;
    branchInput.style.background = "#F8F8F5";
    branchInput.setAttribute("placeholder", "يظهر تلقائياً");
    var status = document.createElement("div");
    status.style.cssText = "font-size:12px;font-weight:700;margin-top:8px;color:#6b7280";
    box.appendChild(status);
    numInput.addEventListener("input", function () {
      var raw = numInput.value.trim();
      if (!raw) { status.textContent = ""; branchInput.value=""; return; }
      status.textContent = "جارٍ البحث في الشيت A2:A257002...";
      clearTimeout(timer);
      timer = setTimeout(async function () {
        if(!BRANCH_MAP) await loadCSV();
        var key = raw.toUpperCase().trim();
        var branch = BRANCH_MAP[key] || BRANCH_MAP[key.replace(/^0+/, "")] || BRANCH_MAP[raw.replace(/^0+/, "")] || null;
        if(!branch){
          var numOnly = raw.replace(/[^0-9]/g,"").replace(/^0+/,"");
          branch = BRANCH_MAP[numOnly] || null;
        }
        if (branch) {
          branchInput.value = branch;
          branchInput.style.background = "#dcfce7";
          branchInput.style.borderColor = "#16a34a";
          status.textContent = "✅ الفرع: " + branch;
          status.style.color = "#16a34a";
        } else {
          branchInput.value = "برجاء طباعة الكارنيهات";
          branchInput.style.color = "#dc2626";
          branchInput.style.background = "#fee2e2";
          branchInput.style.borderColor = "#dc2626";
          status.textContent = "⚠️ غير موجود - برجاء طباعة الكارنيهات";
          status.style.color = "#dc2626";
        }
      }, 350);
    });
    if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
      grid.style.gridTemplateColumns = "1fr";
    }
    return card;
  }

  function mount() {
    if (document.getElementById(CARD_ID)) return;
    var header = document.querySelector("header");
    if (!header || !header.parentNode) return;
    header.parentNode.insertBefore(buildCard(), header.nextSibling);
  }

  function boot() {
    mount();
    new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
    loadCSV();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
