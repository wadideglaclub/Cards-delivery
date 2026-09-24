(function() {
  function getRole() {
    try { return (sessionStorage.getItem('wd_role') || localStorage.getItem('wd_role') || 'admin').toLowerCase(); }
    catch (e) { return 'admin'; }
  }
  var isStaff = getRole() === 'staff';
  window.WD_ROLE = getRole();
  window.WD_IS_STAFF = isStaff;
  window.WD_IS_ADMIN = !isStaff;
  
  if (!isStaff) {
    // Admin - protect lookup box only
    setInterval(function() {
      var el = document.getElementById('wd-membership-lookup');
      if (el) { el.style.setProperty('display', 'block', 'important'); }
    }, 1000);
    return;
  }
  
  // Staff restrictions - hide admin tabs after page loads
  function applyStaff() {
    // Hide elements that contain admin-only text, but carefully
    var tabs = document.querySelectorAll('button, a, [role="tab"], .tab');
    tabs.forEach(function(el) {
      var txt = (el.textContent || '').trim();
      if (txt.length > 0 && txt.length < 40) {
        if (txt.includes('لوحة التحكم') || txt.includes('الفروع') && txt.includes('12 فرع') || txt.includes('استيراد شيت')) {
          if (!el.closest('#wd-membership-lookup')) {
            el.style.display = 'none';
          }
        }
      }
    });
    
    // Hide status dropdown ONLY in edit modal
    var modals = document.querySelectorAll('[id*="modal"], [class*="modal"], [id*="edit"], [class*="edit"]');
    modals.forEach(function(modal) {
      var selects = modal.querySelectorAll('select');
      selects.forEach(function(sel) {
        var parent = sel.parentElement;
        var label = parent ? parent.textContent : '';
        if (label.includes('الحالة') || label.includes('حالة الكارنيهات')) {
          parent.style.display = 'none';
        }
      });
    });
  }
  
  function boot() {
    applyStaff();
    new MutationObserver(applyStaff).observe(document.body, { childList: true, subtree: true });
    setInterval(applyStaff, 1500);
    // Always protect lookup box
    setInterval(function() {
      var el = document.getElementById('wd-membership-lookup');
      if (el) { el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('visibility', 'visible', 'important'); }
    }, 800);
  }
  
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 1000);
  
  console.log('Staff mode active - limited permissions');
})();