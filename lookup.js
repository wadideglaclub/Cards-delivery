(function () {
  var CARD_ID = "wd-membership-lookup";
  var RESULTS_ID = "wd-membership-results";
  var WORKBOOK_FILE = "./Cards_2026.xlsx";
  var timer = null;
  var loadPromise = null;
  var requestNumber = 0;

  // تنظيف النص وتوحيد الأرقام العربية إلى إنجليزية مع الحفاظ على الحروف والرموز إن وجدت
  function cleanValue(value) {
    if (value == null) return "";
    return String(value)
      .trim()
      .replace(/[٠-٩]/g, function (digit) {
        return "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
      });
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
       * قراءة الشيت بالكامل من الصفوف والأعمدة المحددة:
       * العمود A (index 0) = رقم العضوية (من A2 إلى A257002)
       * العمود C (index 2) = مكان الفرع (من C2 إلى C257002)
       */
      var rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false
      });
      var resultsByNumber = new Map();

      // البدء من الصف الثاني (Index 1) حتى نهاية الشيت لضمان قراءة النطاق بالكامل
      for (var rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        var row = rows[rowIndex] || [];
        var membershipNumber = cleanValue(row[0]);
        var branchName = cleanValue(row[2]);

        if (!membershipNumber || !branchName) continue;

        // مفتاح البحث الأساسي والنظيف (مع دعم مطابقة الأرقام سواء بـ أصفار بادئة أو بدونها)
        var exactKey = membershipNumber.toLowerCase();
        var numericOnlyKey = membershipNumber.replace(/^0+/, "");
        if (!numericOnlyKey) numericOnlyKey = "0";

        var entry = {
          membershipNumber: membershipNumber,
          branchName: branchName,
          rowNumber: rowIndex + 1
        };

        // تخزين بالمفتاح الدقيق
        if (!resultsByNumber.has(exactKey)) {
          resultsByNumber.set(exactKey, []);
        }
        resultsByNumber.get(exactKey).push(entry);

        // تخزين بالمفتاح الرقمي المجرد (بدون أصفار بادئة) لضمان سهولة وسرعة المطابقة
        if (exactKey !== numericOnlyKey && exactKey !== numericOnlyKey.toLowerCase()) {
          if (!resultsByNumber.has(numericOnlyKey)) {
            resultsByNumber.set(numericOnlyKey, []);
          }
          // تجنب تكرار نفس الكجل في حال تطابقهم
          var exists = resultsByNumber.get(numericOnlyKey).some(function(item) {
            return item.membershipNumber === membershipNumber;
          });
          if (!exists) {
            resultsByNumber.get(numericOnlyKey).push(entry);
          }
        }
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
      var value = cleanValue(numberInput.value);
      branchInput.value = "";
      branchInput.style.color = "";
      resultsBox.innerHTML = "";
      clearTimeout(timer);

      if (!value) {
        status.textContent = "";
        return;
      }

      status.textContent = "جارٍ البحث في الشيت...";
      status.style.color = "#6b7280";
      timer = setTimeout(function () {
        search(value, branchInput, status, resultsBox);
      }, 300);
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

      var searchKey = number.toLowerCase();
      var numericKey = number.replace(/^0+/, "");
      if (!numericKey) numericKey = "0";

      var results = resultsByNumber.get(searchKey) || resultsByNumber.get(numericKey) || [];

      if (!results.length) {
        branchInput.value = "برجاء طباعة الكارنيهات";
        branchInput.style.color = "#dc2626";
        status.textContent = "رقم العضوية غير موجود في الشيت";
        status.style.color = "#dc2626";
        return;
      }

      branchInput.value = results[0].branchName;
      branchInput.style.color = "";
      status.textContent = "تم العثور على " + results.length + " نتيجة في الشيت";
      status.style.color = "#16a34a";
      renderResults(resultsBox, results, number);
    }).catch(function (err) {
      if (currentRequest !== requestNumber) return;
      branchInput.value = "برجاء طباعة الكارنيهات";
      branchInput.style.color = "#dc2626";
      status.textContent = "تعذر قراءة ملف البيانات";
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
