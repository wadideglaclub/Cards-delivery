(function () {
  var CARD_ID = "wd-membership-lookup";
  var timer = null;
  var reqSeq = 0;

  function normalize(v) {
    return String(v || "")
      .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); })
      .replace(/[^0-9]/g, "");
  }

  function candidates(num) {
    var list = [num];
    if (num.length < 10) list.push(num.padStart(10, "0"));
    var stripped = num.replace(/^0+/, "");
    if (stripped && list.indexOf(stripped) === -1) list.push(stripped);
    return list;
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
      var l = document.createElement("div");
      l.textContent = label;
      l.style.cssText = "font-size:12px;font-weight:700;margin-bottom:6px";
      var i = document.createElement("input");
      i.style.cssText =
        "width:100%;height:44px;border:2px solid #0F0F0F;border-radius:12px;padding:0 12px;font-size:14px;font-family:inherit;background:#fff";
      wrap.appendChild(l);
      wrap.appendChild(i);
      grid.appendChild(wrap);
      return i;
    }

    var numInput = field("رقم العضوية");
    numInput.setAttribute("placeholder", "اكتب رقم العضوية");
    numInput.setAttribute("inputmode", "numeric");

    var branchInput = field("مكان الفرع");
    branchInput.readOnly = true;
    branchInput.style.background = "#F8F8F5";
    branchInput.setAttribute("placeholder", "يظهر تلقائياً");

    var status = document.createElement("div");
    status.style.cssText = "font-size:12px;font-weight:700;margin-top:8px;color:#6b7280";
    box.appendChild(status);

    numInput.addEventListener("input", function () {
      var num = normalize(numInput.value);
      branchInput.value = "";
      clearTimeout(timer);
      if (!num) { status.textContent = ""; return; }
      status.textContent = "جارٍ البحث...";
      status.style.color = "#6b7280";
      timer = setTimeout(function () { search(num, branchInput, status); }, 350);
    });

    if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
      grid.style.gridTemplateColumns = "1fr";
    }
    return card;
  }

  function search(num, branchInput, status) {
    var client = window.__wdSupabase;
    if (!client) {
      status.textContent = "الاتصال بقاعدة البيانات غير جاهز";
      status.style.color = "#dc2626";
      return;
    }
    var seq = ++reqSeq;
    client
      .from("memberships")
      .select("membership_number,branch_name")
      .in("membership_number", candidates(num))
      .limit(1)
      .then(function (res) {
        if (seq !== reqSeq) return;
        if (res.error) {
          status.textContent = "خطأ في البحث";
          status.style.color = "#dc2626";
          return;
        }
        var row = res.data && res.data[0];
        if (row) {
          branchInput.value = row.branch_name;
          status.textContent = "تم العثور على العضوية " + row.membership_number;
          status.style.color = "#16a34a";
        } else {
          branchInput.value = "";
          status.textContent = "رقم العضوية غير موجود في الكشف";
          status.style.color = "#dc2626";
        }
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
    new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
