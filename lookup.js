(function () {
  var CARD_ID = "wd-membership-lookup";
  var WORKBOOK_FILE = "./Cards_2026.xlsx";
  var timer = null;
  var loadPromise = null;
  var reqSeq = 0;

  function normalizeDigits(value) {
    return String(value == null ? "" : value)
      .replace(/[٠-٩]/g, function (d) {
        return "٠١٢٣٤٥٦٧٨٩".indexOf(d);
      })
      .replace(/[^0-9]/g, "");
  }

  function candidates(num) {
    var list = [num];
    if (num.length < 10) list.push(num.padStart(10, "0"));
    var stripped = num.replace(/^0+/, "");
    if (stripped && list.indexOf(stripped) === -1) list.push(stripped);
    return list;
  }

  function loadSheetJs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.onload = function () {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error("XLSX library did not load"));
      };
      script.onerror = function () {
        reject(new Error("Could not load XLSX library"));
      };
      document.head.appendChild(script);
    });
  }

  function loadWorkbookIndex() {
    if (loadPromise) return loadPromise;

    loadPromise = Promise.all([
      loadSheetJs(),
      fetch(new URL(WORKBOOK_FILE, document.baseURI).href).then(function (res) {
        if (!res.ok) throw new Error("Workbook request failed: " + res.status);
        return res.arrayBuffer();
      })
    ]).then(function (parts) {
      var XLSX = parts[0];
      var workbook = XLSX.read(parts[1], { type: "array", cellDates: false });
      var sheetName = workbook.SheetNames.indexOf("ALL MEMBERSHIPS TO PRINT") !== -1
        ? "ALL MEMBERSHIPS TO PRINT"
        : workbook.SheetNames[0];
      var sheet = workbook.Sheets[sheetName];
      var rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: ""
      });
      if (!rows.length) throw new Error("The workbook is empty");

      var header = rows[0].map(function (value) {
        return String(value || "").trim().toLowerCase();
      });
      var numberColumn = header.indexOf("membershipnumber");
      var branchColumn = header.indexOf("branchname");
      if (numberColumn === -1 || branchColumn === -1) {
        throw new Error("MembershipNumber or BranchName column is missing");
      }

      var locations = new Map();
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i] || [];
        var number = normalizeDigits(row[numberColumn]);
        var branch = String(row[branchColumn] == null ? "" : row[branchColumn]).trim();
        if (number && branch && !locations.has(number)) {
          locations.set(number, branch);
        }
      }
      return locations;
    });

    return loadPromise;
  }

  function buildCard() {
    var card = document.createElement("div");
    card.id = CARD_ID;
    card.dir = "rtl";
    card.style.cssText =
      "max-width:1400px;margin:12px auto 0;padding:0 16px;font-family:'Tajawal',sans-serif";

    var box = document.createElement("div");
    box.style.cssText =
      "background:#fff;border:2px solid #0F0F0F;border-bottom:4px solid #FFD700;border-radius:20px;padding:16px";
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
      var labelNode = document.createElement("div");
      labelNode.textContent = label;
      labelNode.style.cssText = "font-size:12px;font-weight:700;margin-bottom:6px";
      var input = document.createElement("input");
      input.style.cssText =
        "width:100%;height:44px;border:2px solid #0F0F0F;border-radius:12px;padding:0 12px;font-size:14px;font-family:inherit;background:#fff";
      wrap.appendChild(labelNode);
      wrap.appendChild(input);
      grid.appendChild(wrap);
      return input;
    }

    var numberInput = field("رقم العضوية");
    numberInput.setAttribute("placeholder", "اكتب رقم العضوية");
    numberInput.setAttribute("inputmode", "numeric");

    var branchInput = field("مكان الفرع");
    branchInput.readOnly = true;
    branchInput.style.background = "#F8F8F5";
    branchInput.setAttribute("placeholder", "يظهر تلقائياً");

    var status = document.createElement("div");
    status.style.cssText = "font-size:12px;font-weight:700;margin-top:8px;color:#6b7280";
    box.appendChild(status);

    numberInput.addEventListener("input", function () {
      var number = normalizeDigits(numberInput.value);
      branchInput.value = "";
      branchInput.style.color = "";
      clearTimeout(timer);
      if (!number) {
        status.textContent = "";
        return;
      }
      status.textContent = "جارٍ البحث...";
      status.style.color = "#6b7280";
      timer = setTimeout(function () {
        search(number, branchInput, status);
      }, 350);
    });

    if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
      grid.style.gridTemplateColumns = "1fr";
    }
    return card;
  }

  function search(number, branchInput, status) {
    var seq = ++reqSeq;
    loadWorkbookIndex().then(function (locations) {
      if (seq !== reqSeq) return;
      var branch = null;
      var possible = candidates(number);
      for (var i = 0; i < possible.length; i++) {
        branch = locations.get(possible[i]);
        if (branch) break;
      }

      if (branch) {
        branchInput.value = branch;
        branchInput.style.color = "";
        status.textContent = "تم العثور على العضوية " + number;
        status.style.color = "#16a34a";
      } else {
        branchInput.value = "برجاء طباعة الكارنيهات";
        branchInput.style.color = "#dc2626";
        status.textContent = "رقم العضوية غير موجود في الشيت الجديد";
        status.style.color = "#dc2626";
      }
    }).catch(function () {
      if (seq !== reqSeq) return;
      branchInput.value = "برجاء طباعة الكارنيهات";
      branchInput.style.color = "#dc2626";
      status.textContent = "تعذر تحميل الشيت الجديد";
      status.style.color = "#dc2626";
    });
  }

  function mount() {
    if (document.getElementById(CARD_ID)) return;
    var header = document.querySelector("header");
    if (!header || !header.parentNode) return;
    header.parentNode.insertBefore(buildCard(), header.nextSibling);
  }

  function boot() {
    mount();
    new MutationObserver(mount).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();