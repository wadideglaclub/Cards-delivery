
// ===== Role Guard - Admin vs Staff =====
(function(){
  function getRole(){
    try{
      var role = sessionStorage.getItem('wd_role') || localStorage.getItem('wd_role') || '';
      return role.toLowerCase();
    }catch(e){ return ''; }
  }

  function isStaff(){
    return getRole() === 'staff';
  }

  function isAdmin(){
    var r = getRole();
    return r === 'admin' || r === '' || r === 'true'; // fallback old system = admin
  }

  function applyStaffRestrictions(){
    if(!isStaff()) return;

    // 1. Hide admin-only sections
    // Try to hide elements that contain admin keywords
    var style = document.createElement('style');
    style.id = 'staff-restrictions-style';
    style.textContent = `
      /* Hide admin dashboard, branches report, import section for staff */
      /* We will hide by JS, but add CSS backup */
      [data-role="admin-only"] { display: none !important; }
    `;
    document.head.appendChild(style);

    // Function to hide elements by text
    function hideByText(){
      // Hide buttons/links that say "لوحة التحكم" or "الفروع" or "استيراد شيت"
      var all = document.querySelectorAll('a, button, div, span');
      all.forEach(function(el){
        var t = (el.textContent || '').trim();
        // Hide dashboard and branches
        if(t.includes('لوحة التحكم') || t.includes('عرض جميع الفروع') || t.includes('الفروع - 12 فرع') || t.includes('استيراد شيت أماكن')){
          // Don't hide if it's inside the lookup card
          if(el.closest && el.closest('#wd-membership-lookup')) return;
          if(t.length < 50){ // avoid hiding long texts
            var parent = el.closest('button') || el.closest('a') || el;
            if(parent && parent.textContent.trim() === t){
              // Check if it's a main navigation item
              if(el.tagName === 'A' || el.tagName === 'BUTTON' || el.classList.contains('tab') || el.getAttribute('role') === 'tab'){
                parent.style.display = 'none';
              }
            }
          }
        }
      });

      // Hide status dropdown in edit modal for staff
      var statusSelects = document.querySelectorAll('select');
      statusSelects.forEach(function(sel){
        var label = '';
        try{
          var l = sel.previousElementSibling || sel.parentElement.querySelector('label');
          if(l) label = l.textContent || '';
        }catch(e){}
        var parentText = sel.parentElement ? sel.parentElement.textContent : '';
        if(label.includes('الحالة') || parentText.includes('حالة الكارنيهات') || label.includes('الحالة')){
          // This is the status dropdown - hide for staff in edit modal
          var wrapper = sel.closest('div');
          if(wrapper && document.querySelector('[id*="edit"], [class*="edit"]')){
            // Only hide in edit context, keep in filter maybe?
            // For staff: hide status dropdown completely in edit form
            if(wrapper.closest && (wrapper.closest('form') || wrapper.closest('[id*="modal"]') || wrapper.closest('[class*="modal"]'))){
              wrapper.style.display = 'none';
            }
          }
        }
      });
    }

    // Observer to keep restrictions applied
    var observer = new MutationObserver(function(){
      hideByText();
      // Protect lookup box
      var lookup = document.getElementById('wd-membership-lookup');
      if(lookup){
        lookup.style.setProperty('display','block','important');
        lookup.style.setProperty('visibility','visible','important');
      }
    });

    function boot(){
      hideByText();
      observer.observe(document.body, {childList:true, subtree:true, attributes:true});
      // Also every 1s
      setInterval(hideByText, 1000);
    }

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', boot);
    }else{
      boot();
    }

    console.log("Staff mode: limited to new requests + search + edit/delete without status dropdown");
  }

  // Protect lookup box always
  function protectLookup(){
    setInterval(function(){
      var el = document.getElementById('wd-membership-lookup');
      if(el){
        el.style.setProperty('display','block','important');
        el.style.setProperty('visibility','visible','important');
      }
    }, 800);
  }

  protectLookup();

  // Apply after small delay
  setTimeout(applyStaffRestrictions, 500);

  // Expose
  window.WD_ROLE = getRole();
  window.WD_IS_STAFF = isStaff();
  window.WD_IS_ADMIN = isAdmin();
})();