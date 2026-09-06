(function () {
  var BRANCH_KEY = "wadi_degla_branches";
  var EMP_KEY = "wadi_degla_employees";
  var DEFAULT_BRANCHES = ["أكتوبر 1", "أكتوبر 2", "شيراتون", "المعادي", "النخيل", "اللوتس", "أسيوط", "المنيا", "دمياط", "إسكندرية", "طنطا", "المنصورة"];
  var DEFAULT_EMPLOYEES = ["أندرو أكرم", "مينا ايليا", "نيفين كميل", "اسكندره صابر", "عماد ناجى", "محمد عبد الجواد", "بيشوى عيد", "رامى لطيف"];

  function read(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(v) && v.length) return v;
    } catch (e) {}
    return fallback.slice();
  }
  function write(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  var overlay = null;
  var draft = null;

  function close(save) {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    if (save && draft) {
      // الكتابة الفعلية والمزامنة تتم فقط عند الضغط على «حفظ وإغلاق»
      write(EMP_KEY, draft[EMP_KEY]);
      write(BRANCH_KEY, draft[BRANCH_KEY]);
      var done = function () { window.location.reload(); };
      if (typeof window.__wdFlush === "function") {
        var t = setTimeout(done, 4000);
        window.__wdFlush().then(function () { clearTimeout(t); done(); }, function () { clearTimeout(t); done(); });
      } else {
        done();
      }
    }
    draft = null;
  }

  function section(title, key, fallback, addLabel) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "background:#F8F8F5;border:1px solid #e4e4e7;border-radius:18px;padding:16px;margin-bottom:16px";
    var h = document.createElement("div");
    h.textContent = title;
    h.style.cssText = "font-weight:800;font-size:15px;margin-bottom:12px";
    wrap.appendChild(h);

    var list = document.createElement("div");
    wrap.appendChild(list);

    function render() {
      list.innerHTML = "";
      var items = draft[key];
      items.forEach(function (name, idx) {
        var row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:8px 12px;margin-bottom:8px";
        var label = document.createElement("span");
        label.textContent = name;
        label.style.cssText = "flex:1;font-weight:700;font-size:14px";
        var del = document.createElement("button");
        del.textContent = "حذف";
        del.style.cssText = "background:#dc2626;color:#fff;border:0;border-radius:10px;padding:6px 14px;font-weight:700;font-size:13px;cursor:pointer";
        del.onclick = function () {
          if (!confirm("تأكيد حذف: " + name + "؟")) return;
          if (draft[key].length <= 1) {
            alert("لا يمكن حذف كل العناصر - يجب أن يتبقى عنصر واحد على الأقل");
            return;
          }
          draft[key].splice(idx, 1);
          render();
        };
        row.appendChild(label);
        row.appendChild(del);
        list.appendChild(row);
      });
    }
    render();

    var addRow = document.createElement("div");
    addRow.style.cssText = "display:flex;gap:8px;margin-top:12px";
    var input = document.createElement("input");
    input.placeholder = addLabel;
    input.style.cssText = "flex:1;height:44px;border:1px solid #e4e4e7;border-radius:12px;padding:0 12px;font-size:14px;background:#fff";
    var add = document.createElement("button");
    add.textContent = "إضافة";
    add.style.cssText = "background:#0F0F0F;color:#FFD700;border:0;border-radius:12px;padding:0 20px;font-weight:800;font-size:14px;cursor:pointer";
    add.onclick = function () {
      var val = (input.value || "").trim();
      if (!val) return;
      if (draft[key].indexOf(val) !== -1) {
        alert("الاسم موجود بالفعل");
        return;
      }
      draft[key].push(val);
      input.value = "";
      render();
    };
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") add.click();
    });
    addRow.appendChild(input);
    addRow.appendChild(add);
    wrap.appendChild(addRow);
    return wrap;
  }

  function open() {
    if (overlay) return;
    // مسودة مؤقتة: أي إضافة أو حذف لا يُحفظ إلا بزر «حفظ وإغلاق»
    draft = {};
    draft[EMP_KEY] = read(EMP_KEY, DEFAULT_EMPLOYEES);
    draft[BRANCH_KEY] = read(BRANCH_KEY, DEFAULT_BRANCHES);

    overlay = document.createElement("div");
    overlay.dir = "rtl";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit";
    overlay.onclick = function (e) {
      if (e.target === overlay) close(false);
    };

    var card = document.createElement("div");
    card.style.cssText =
      "background:#fff;border-radius:24px;max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:20px";

    var head = document.createElement("div");
    head.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px";
    var title = document.createElement("div");
    title.textContent = "إدارة النظام";
    title.style.cssText = "font-weight:900;font-size:18px";
    var x = document.createElement("button");
    x.textContent = "✕";
    x.style.cssText = "background:#F8F8F5;border:1px solid #e4e4e7;border-radius:10px;width:36px;height:36px;font-size:15px;cursor:pointer";
    x.onclick = function () { close(false); };
    head.appendChild(title);
    head.appendChild(x);
    card.appendChild(head);

    card.appendChild(section("الموظفين", EMP_KEY, DEFAULT_EMPLOYEES, "اسم الموظف الجديد"));
    card.appendChild(section("الفروع", BRANCH_KEY, DEFAULT_BRANCHES, "اسم الفرع الجديد"));

    var note = document.createElement("div");
    note.textContent = "أي تعديل لا يُحفظ إلا عند الضغط على الزرار الأصفر «حفظ وإغلاق» — علامة ✕ تُغلق بدون حفظ.";
    note.style.cssText = "font-size:12px;color:#71717a;margin-bottom:12px";
    card.appendChild(note);

    var reload = document.createElement("button");
    reload.textContent = "حفظ وإغلاق";
    reload.style.cssText =
      "width:100%;height:48px;background:#FFD700;color:#0F0F0F;border:0;border-radius:14px;font-weight:900;font-size:15px;cursor:pointer";
    reload.onclick = function () {
      close(true);
    };
    card.appendChild(reload);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function injectButton() {
    if (document.getElementById("wd-admin-btn")) return;
    var buttons = document.querySelectorAll("nav button");
    var target = null;
    for (var i = 0; i < buttons.length; i++) {
      if ((buttons[i].textContent || "").indexOf("لوحة التحكم") !== -1) {
        target = buttons[i];
        break;
      }
    }
    if (!target) return;
    var btn = document.createElement("button");
    btn.id = "wd-admin-btn";
    btn.className = target.className;
    btn.textContent = "⚙️ إدارة النظام";
    btn.onclick = open;
    target.parentNode.insertBefore(btn, target.nextSibling);
  }

  function start() {
    injectButton();
    new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
