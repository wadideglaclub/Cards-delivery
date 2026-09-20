
(function(){
  console.log('WD Status Patch v2 loading...');
  var STATUSES = ["قيد انتظار الكارنيهات","تم الطباعة","تم الغاء الطلب"];
  var currentEditId = null;

  function getRequests(){
    try{
      var data = JSON.parse(localStorage.getItem("wadi_degla_requests_final")||"[]");
      return Array.isArray(data) ? data : [];
    }catch(e){ return []; }
  }

  function saveRequests(list){
    try{
      localStorage.setItem("wadi_degla_requests_final", JSON.stringify(list));
      if(typeof window.__wdFlush === "function"){
        window.__wdFlush().then(function(){ console.log('Flushed to Supabase'); }).catch(function(){});
      }
      // Also trigger storage event
      window.dispatchEvent(new Event('storage'));
    }catch(e){ console.error(e); }
  }

  function injectStatusField(){
    if(document.getElementById('wd-status-field')) {
      // Update currentEditId if needed
      return;
    }
    
    // Find save button "حفظ التعديلات"
    var buttons = Array.from(document.querySelectorAll('button'));
    var saveBtn = null;
    for(var i=0;i<buttons.length;i++){
      var txt = buttons[i].textContent || '';
      if(txt.indexOf('حفظ التعديلات')!==-1){
        saveBtn = buttons[i];
        break;
      }
    }
    
    if(!saveBtn){
      return; // Not in edit mode
    }
    
    // Find form container - parent of save button
    var formContainer = saveBtn.parentElement;
    var attempts = 0;
    while(formContainer && attempts < 5){
      if(formContainer.querySelectorAll('input').length >= 2){
        break;
      }
      formContainer = formContainer.parentElement;
      attempts++;
    }
    
    if(!formContainer) return;
    
    // Get membership number from first input
    var inputs = formContainer.querySelectorAll('input');
    var membershipNumber = inputs[0] ? inputs[0].value.trim() : '';
    console.log('Membership:', membershipNumber);
    
    var requests = getRequests();
    var currentReq = null;
    if(membershipNumber){
      for(var k=0;k<requests.length;k++){
        if(requests[k].membershipNumber === membershipNumber){
          currentReq = requests[k];
          currentEditId = requests[k].id;
          break;
        }
      }
    }
    
    // Also try to find by id in URL or global
    if(!currentReq){
      // Look for request that was recently edited - last one with same membership
      for(var k2=0;k2<requests.length;k2++){
        if(requests[k2].membershipNumber && membershipNumber && requests[k2].membershipNumber.includes(membershipNumber.substring(0,4))){
          currentReq = requests[k2];
          currentEditId = requests[k2].id;
        }
      }
    }
    
    console.log('Current request:', currentReq, 'ID:', currentEditId);
    
    var wrapper = document.createElement('div');
    wrapper.id = 'wd-status-field';
    wrapper.style.cssText = 'background:#FFFBEB;border:2px solid #FFC700;border-radius:14px;padding:14px;margin:16px 0;';
    wrapper.innerHTML = `
      <div style="font-size:13px;font-weight:800;margin-bottom:8px;display:flex;align-items:center;gap:6px;color:#000;">
        <span>📋 حالة الكارنيهات</span>
        <span style="color:#dc2626">*</span>
        <span style="font-size:10px;background:#000;color:#FFC700;padding:2px 8px;border-radius:20px;margin-right:8px;">جديد</span>
      </div>
      <select id="wd-status-select" style="width:100%;height:48px;border:2px solid #000;border-radius:12px;padding:0 12px;font-size:14px;font-weight:700;background:#fff;">
        <option value="قيد انتظار الكارنيهات" ${currentReq && currentReq.status==="قيد انتظار الكارنيهات" ? 'selected' : ''}>قيد انتظار الكارنيهات</option>
        <option value="تم الطباعة" ${currentReq && currentReq.status==="تم الطباعة" ? 'selected' : ''}>تم الطباعة</option>
        <option value="تم الغاء الطلب" ${currentReq && currentReq.status==="تم الغاء الطلب" ? 'selected' : ''}>تم الغاء الطلب</option>
        <option value="تم الاستلام" ${currentReq && currentReq.status==="تم الاستلام" ? 'selected' : ''}>تم الاستلام</option>
      </select>
      <div style="font-size:11px;color:#92400e;margin-top:8px;background:#FEF3C7;padding:6px 8px;border-radius:8px;">
        ⚠️ اختر الحالة الجديدة ثم اضغط حفظ التعديلات - الحالة الحالية: <b>${currentReq ? currentReq.status : 'غير معروفة'}</b>
      </div>
    `;
    
    // Insert before save button's parent
    saveBtn.parentElement.parentNode.insertBefore(wrapper, saveBtn.parentElement);
    
    var select = document.getElementById('wd-status-select');
    if(select){
      window.__wdEditStatus = select.value;
      select.addEventListener('change', function(){
        window.__wdEditStatus = this.value;
        console.log('Status changed to:', window.__wdEditStatus);
      });
      
      if(!saveBtn.dataset.statusHooked){
        saveBtn.dataset.statusHooked = '1';
        // Capture original click
        saveBtn.addEventListener('click', function(){
          var sel = document.getElementById('wd-status-select');
          var newStatus = sel ? sel.value : null;
          var editId = currentEditId;
          console.log('Save clicked, new status:', newStatus, 'ID:', editId);
          
          if(newStatus && editId){
            setTimeout(function(){
              var reqs = getRequests();
              var updated = false;
              for(var r=0;r<reqs.length;r++){
                if(reqs[r].id === editId){
                  console.log('Updating', reqs[r].membershipNumber, 'from', reqs[r].status, 'to', newStatus);
                  reqs[r].status = newStatus;
                  updated = true;
                  break;
                }
              }
              if(updated){
                saveRequests(reqs);
                setTimeout(function(){
                  alert('✅ تم تحديث الحالة إلى: ' + newStatus + '\nسيتم تحديث الصفحة الآن');
                  location.reload();
                }, 500);
              }
            }, 1000);
          }
        });
      }
    }
  }

  // Observe for edit modal
  var observer = new MutationObserver(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      console.log('Edit form detected');
      setTimeout(injectStatusField, 300);
    }
  });
  
  observer.observe(document.body, {childList:true, subtree:true});
  
  // Also poll
  setInterval(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      injectStatusField();
    }
  }, 1000);
  
  console.log('WD Status Patch v2 Ready - waiting for edit form');
})();
