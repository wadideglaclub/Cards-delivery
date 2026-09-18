/* Adds the logout action next to the Admin button after the app renders. */
(function () {
  function injectButton() {
    if (document.getElementById("wd-logout-btn")) return;
    var admin = document.getElementById("wd-admin-btn");
    if (!admin || !admin.parentNode) return;

    var button = document.createElement("button");
    button.id = "wd-logout-btn";
    button.className = admin.className;
    button.textContent = "↩️ خروج";
    button.title = "تسجيل الخروج";
    button.onclick = function () {
      localStorage.removeItem("wd_october1_auth");
      localStorage.removeItem("wd_login_time");
      location.replace("./index.html");
    };
    admin.parentNode.insertBefore(button, admin.nextSibling);
  }

  function start() {
    injectButton();
    new MutationObserver(injectButton).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
