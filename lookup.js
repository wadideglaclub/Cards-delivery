(function () {
  var CARD_ID = "wd-membership-lookup";
  var RESULTS_ID = "wd-membership-results";
  var WORKBOOK_FILE = "./Cards_2026.xlsx";
  var timer = null;
  var loadPromise = null;
  var requestNumber = 0;

  function normalizeDigits(value) {
    return String(value == null ? "" : value)
      .replace(/[٠-٩]/g, function (digit) {
        return "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
      })
      .replace(/[^0-9]/g, "");
  }

  // The sheet contains leading zeros and some 11-digit values.
  // Matching by the value without leading zeros makes both forms work.
  function lookupKey(value) {
    var digits = normalizeDigits(value).replace(/^0+/, "");
    return digits || "0";
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
      fetch(new URL(WORKBOOK_FILE, document.baseURI).href).then(function (response) {
        if (!response.ok) {
          throw new Error("Workbook request failed: " + response.status);
        }
        return response.arrayBuffer();
      })
    ]).then(function (parts) {
      var XLSX = parts[0];
      var workbook = XLSX.read(parts[1], {
        type: "array",
        cellDates: false
      });
      var sheetName = workbook.SheetNames.indexOf("ALL MEMBERSHIPS TO PRINT") !== -1
        ? "ALL MEMBERSHIPS TO PRINT"
        : workbook.SheetNames[0];
      var sheet = workbook.Sheets[sheetName];

      /*
       * The new sheet is intentionally read by fixed Excel columns:
       * A = MembershipNumber
       * C = BranchName
       */
      var rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false
      });
      var resultsByNumber = new Map();

      for (var rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        var row = rows[rowIndex] || [];
        var membershipNumber = String(row[0] == null ? "" : row[0]).trim();
        var branchName = String(row[2] == null ? "" : row[2]).trim();
        var key = lookupKey(membershipNumber);

        if (!normalizeDigits(membershipNumber) || !branchName) continue;
        if (!resultsByNumber.has(key)) resultsByNumber.set(key, []);
        resultsByNumber.get(key).push({
          membershipNumber: membershipNumber,
          branchName: branchName,
          rowNumber: rowIndex + 1
        });
      }

      return resultsByNumber;
    });

    return loadPromise;
  }

  function createField(label, grid) {
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

  function renderResults(resultsBox, results, searchedNumber) {
    resultsBox.innerHTML = "";
    if (!results.length) return;

    var heading = document.createElement("div");
    heading.textContent = "كل النتائج للعضوية " + searchedNumber;
    heading.style.cssText =
      "font-weight:800;font-size:13px;margin:14px 0 8px;color:#0F0F0F";
    resultsBox.appendChild(heading);

    results.forEach(function (result) {
      var item = document.createElement("div");
      item.style.cssText =
        "display:flex;justify-content:space-between;gap:12px;align-items:center;" +
        "background:#F8F8F5;border:1px solid #e4e4e7;border-radius:12px;" +
        "padding:10px 12px;margin-top:7px;font-size:13px";

      var number = document.createElement("strong");
      number.textContent = "رقم العضوية: " + result.membershipNumber;
      number.style.cssText = "direction:ltr;text-align:left;word-break:break-all";

      var branch = document.createElement("span");
      branch.textContent = "المكان: " + result.branchName;
      branch.style.cssText = "font-weight:800;text-align:right";

      item.appendChild(number);
      item.appendChild(branch);
      resultsBox.appendChild(item);
    });
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

    var numberInput = createField("رقم العضوية", grid);
    numberInput.setAttribute("placeholder", "اكتب رقم العضوية");
    numberInput.setAttribute("inputmode", "numeric");

    var branchInput = createField("مكان الفرع", grid);
    branchInput.readOnly = true;
    branchInput.style.background = "#F8F8F5";
    branchInput.setAttribute("placeholder", "يظهر تلقائياً");

    var status = document.createElement("div");
    status.style.cssText = "font-size:12px;font-weight:700;margin-top:8px;color:#6b7280";
    box.appendChild(status);

    var resultsBox = document.createElement("div");
    resultsBox.id = RESULTS_ID;
    box.appendChild(resultsBox);

    numberInput.addEventListener("input", function () {
      var value = normalizeDigits(numberInput.value);
      branchInput.value = "";
      branchInput.style.color = "";
      resultsBox.innerHTML = "";
      clearTimeout(timer);

      if (!value) {
        status.textContent = "";
        return;
      }

      status.textContent = "جارٍ البحث في الشيت الجديد...";
      status.style.color = "#6b7280";
      timer = setTimeout(function () {
        search(value, branchInput, status, resultsBox);
      }, 350);
    });

    if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
      grid.style.gridTemplateColumns = "1fr";
    }
    return card;
  }

  function search(number, branchInput, status, resultsBox) {
    var currentRequest = ++requestNumber;

    loadWorkbookIndex().then(function (resultsByNumber) {
      if (currentRequest !== requestNumber) return;

      var results = resultsByNumber.get(lookupKey(number)) || [];
      if (!results.length) {
        branchInput.value = "برجاء طباعة الكارنيهات";
        branchInput.style.color = "#dc2626";
        status.textContent = "رقم العضوية غير موجود في العمود A";
        status.style.color = "#dc2626";
        return;
      }

      branchInput.value = results[0].branchName;
      branchInput.style.color = "";
      status.textContent = "تم العثور على " + results.length + " نتيجة في الشيت";
      status.style.color = "#16a34a";
      renderResults(resultsBox, results, number);
    }).catch(function () {
      if (currentRequest !== requestNumber) return;
      branchInput.value = "برجاء طباعة الكارنيهات";
      branchInput.style.color = "#dc2626";
      status.textContent = "تعذر تحميل Cards_2026.xlsx";
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