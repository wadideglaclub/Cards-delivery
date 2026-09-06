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

  function close() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
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
      var items = read(key, fallback);
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
          var next = read(key, fallback);
          next.splice(idx, 1);
          if (!next.length) {
            alert("لا يمكن حذف كل العناصر - يجب أن يتبقى عنصر واحد على الأقل");
            return;
          }
          write(key, next);
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
      var next = read(key, fallback);
      if (next.indexOf(val) !== -1) {
        alert("الاسم موجود بالفعل");
        return;
      }
      next.push(val);
      write(key, next);
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
    overlay = document.createElement("div");
    overlay.dir = "rtl";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit";
    overlay.onclick = function (e) {
      if (e.target === overlay) close();
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
    x.onclick = close;
    head.appendChild(title);
    head.appendChild(x);
    card.appendChild(head);

    card.appendChild(section("الموظفين", EMP_KEY, DEFAULT_EMPLOYEES, "اسم الموظف الجديد"));
    card.appendChild(section("الفروع", BRANCH_KEY, DEFAULT_BRANCHES, "اسم الفرع الجديد"));

    var note = document.createElement("div");
    note.textContent = "التعديلات تُحفظ على كل الأجهزة. اضغط تحديث لتطبيقها على القوائم.";
    note.style.cssText = "font-size:12px;color:#71717a;margin-bottom:12px";
    card.appendChild(note);

    var reload = document.createElement("button");
    reload.textContent = "تحديث الصفحة لتطبيق التعديلات";
    reload.style.cssText =
      "width:100%;height:48px;background:#FFD700;color:#0F0F0F;border:0;border-radius:14px;font-weight:900;font-size:15px;cursor:pointer";
    reload.onclick = function () {
      window.location.reload();
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
