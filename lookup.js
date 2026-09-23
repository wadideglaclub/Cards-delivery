(function () {
  var CARD_ID = "wd-membership-lookup";
  var timer = null;
  var reqSeq = 0;

  function normalize(v) {
    return String(v || "")
      .replace(/[ظ -ظ©]/g, function (d) { return "ظ ظ،ظ¢ظ£ظ¤ظ¥ظ¦ظ§ظ¨ظ©".indexOf(d); })
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
    title.textContent = "ًں”ژ ط¨ط­ط« ط¹ظ† ظپط±ط¹ ط§ظ„ط¹ط¶ظˆظٹط©";
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

    var numInput = field("ط±ظ‚ظ… ط§ظ„ط¹ط¶ظˆظٹط©");
    numInput.setAttribute("placeholder", "ط§ظƒطھط¨ ط±ظ‚ظ… ط§ظ„ط¹ط¶ظˆظٹط©");
    numInput.setAttribute("inputmode", "numeric");

    var branchInput = field("ظ…ظƒط§ظ† ط§ظ„ظپط±ط¹");
    branchInput.readOnly = true;
    branchInput.style.background = "#F8F8F5";
    branchInput.setAttribute("placeholder", "ظٹط¸ظ‡ط± طھظ„ظ‚ط§ط¦ظٹط§ظ‹");

    var status = document.createElement("div");
    status.style.cssText = "font-size:12px;font-weight:700;margin-top:8px;color:#6b7280";
    box.appendChild(status);

    numInput.addEventListener("input", function () {
      var num = normalize(numInput.value);
      branchInput.value = "";
      branchInput.style.color = "";
      clearTimeout(timer);
      if (!num) { status.textContent = ""; return; }
      status.textContent = "ط¬ط§ط±ظچ ط§ظ„ط¨ط­ط«...";
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
      status.textContent = "ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± ط¬ط§ظ‡ط²";
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
          status.textContent = "ط®ط·ط£ ظپظٹ ط§ظ„ط¨ط­ط«";
          status.style.color = "#dc2626";
          return;
        }
        var row = res.data && res.data[0];
        if (row) {
          branchInput.value = row.branch_name;
          branchInput.style.color = "";
          status.textContent = "طھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ط¹ط¶ظˆظٹط© " + row.membership_number;
          status.style.color = "#16a34a";
        } else {
          branchInput.value = "ط¨ط±ط¬ط§ط، ط·ط¨ط§ط¹ط© ط§ظ„ظƒط§ط±ظ†ظٹظ‡ط§طھ";
          branchInput.style.color = "#dc2626";
          status.textContent = "ط±ظ‚ظ… ط§ظ„ط¹ط¶ظˆظٹط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ ظپظٹ ط§ظ„ظƒط´ظپ";
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
