
(function(){
  console.log('WD Status Patch v3 - Colors loading...');
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
        window.__wdFlush().then(function(){ console.log('Flushed'); }).catch(function(){});
      }
      window.dispatchEvent(new Event('storage'));
    }catch(e){ console.error(e); }
  }

  function getStatusStyle(status){
    if(status === "تم الغاء الطلب"){
      return {
        border: "2px solid #DC2626",
        background: "#FEF2F2",
        color: "#DC2626",
        badgeBg: "#FEE2E2",
        badgeColor: "#DC2626",
        containerBorder: "2px solid #DC2626",
        containerBg: "#FEF2F2"
      };
    } else if(status === "تم الطباعة"){
      return {
        border: "2px solid #6B7280",
        background: "#F3F4F6",
        color: "#4B5563",
        badgeBg: "#E5E7EB",
        badgeColor: "#4B5563",
        containerBorder: "2px solid #6B7280",
        containerBg: "#F9FAFB"
      };
    } else if(status === "تم الاستلام"){
      return {
        border: "2px solid #16A34A",
        background: "#F0FDF4",
        color: "#16A34A",
        badgeBg: "#DCFCE7",
        badgeColor: "#16A34A",
        containerBorder: "2px solid #FFC700",
        containerBg: "#FFFBEB"
      };
    } else {
      // قيد انتظار - yellow default
      return {
        border: "2px solid #000",
        background: "#fff",
        color: "#000",
        badgeBg: "#FEF3C7",
        badgeColor: "#92400e",
        containerBorder: "2px solid #FFC700",
        containerBg: "#FFFBEB"
      };
    }
  }

  function injectStatusField(){
    if(document.getElementById('wd-status-field')) return;
    
    var buttons = Array.from(document.querySelectorAll('button'));
    var saveBtn = null;
    for(var i=0;i<buttons.length;i++){
      var txt = buttons[i].textContent || '';
      if(txt.indexOf('حفظ التعديلات')!==-1){
        saveBtn = buttons[i];
        break;
      }
    }
    
    if(!saveBtn) return;
    
    var formContainer = saveBtn.parentElement;
    var attempts = 0;
    while(formContainer && attempts < 5){
      if(formContainer.querySelectorAll('input').length >= 2) break;
      formContainer = formContainer.parentElement;
      attempts++;
    }
    if(!formContainer) return;
    
    var inputs = formContainer.querySelectorAll('input');
    var membershipNumber = inputs[0] ? inputs[0].value.trim() : '';
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
    
    var currentStatus = currentReq ? currentReq.status : "قيد انتظار الكارنيهات";
    var style = getStatusStyle(currentStatus);
    
    var wrapper = document.createElement('div');
    wrapper.id = 'wd-status-field';
    wrapper.style.cssText = `background:${style.containerBg};border:${style.containerBorder};border-radius:14px;padding:14px;margin:16px 0;transition:all 0.3s;`;
    wrapper.innerHTML = `
      <div style="font-size:13px;font-weight:800;margin-bottom:8px;display:flex;align-items:center;gap:6px;color:#000;">
        <span>📋 حالة الكارنيهات</span>
        <span style="color:#dc2626">*</span>
        <span style="font-size:10px;background:#000;color:#FFC700;padding:2px 8px;border-radius:20px;margin-right:8px;">جديد</span>
      </div>
      <select id="wd-status-select" style="width:100%;height:48px;border:${style.border};border-radius:12px;padding:0 12px;font-size:14px;font-weight:700;background:${style.background};color:${style.color};transition:all 0.3s;">
        <option value="قيد انتظار الكارنيهات" ${currentStatus==="قيد انتظار الكارنيهات" ? 'selected' : ''}>قيد انتظار الكارنيهات</option>
        <option value="تم الطباعة" ${currentStatus==="تم الطباعة" ? 'selected' : ''} style="background:#F3F4F6;color:#4B5563">تم الطباعة - رمادي</option>
        <option value="تم الغاء الطلب" ${currentStatus==="تم الغاء الطلب" ? 'selected' : ''} style="background:#FEF2F2;color:#DC2626">تم الغاء الطلب - أحمر</option>
        <option value="تم الاستلام" ${currentStatus==="تم الاستلام" ? 'selected' : ''}>تم الاستلام</option>
      </select>
      <div id="wd-status-hint" style="font-size:11px;margin-top:8px;padding:6px 8px;border-radius:8px;background:${style.badgeBg};color:${style.badgeColor};font-weight:600;">
        الحالة الحالية: <b>${currentStatus}</b> ${currentStatus==="تم الغاء الطلب" ? '🔴' : currentStatus==="تم الطباعة" ? '⚪' : '🟡'}
      </div>
    `;
    
    saveBtn.parentElement.parentNode.insertBefore(wrapper, saveBtn.parentElement);
    
    var select = document.getElementById('wd-status-select');
    var hint = document.getElementById('wd-status-hint');
    
    if(select){
      window.__wdEditStatus = select.value;
      
      select.addEventListener('change', function(){
        window.__wdEditStatus = this.value;
        var newStyle = getStatusStyle(this.value);
        
        // Update select style
        this.style.border = newStyle.border;
        this.style.background = newStyle.background;
        this.style.color = newStyle.color;
        
        // Update container
        wrapper.style.background = newStyle.containerBg;
        wrapper.style.border = newStyle.containerBorder;
        
        // Update hint
        if(hint){
          hint.style.background = newStyle.badgeBg;
          hint.style.color = newStyle.badgeColor;
          var emoji = this.value==="تم الغاء الطلب" ? '🔴 ملغي - أحمر' : this.value==="تم الطباعة" ? '⚪ مطبوع - رمادي' : this.value==="تم الاستلام" ? '🟢 مستلم' : '🟡 انتظار';
          hint.innerHTML = `سيتم تغيير الحالة إلى: <b>${this.value}</b> - ${emoji}`;
        }
        
        console.log('Status changed to:', this.value);
      });
      
      if(!saveBtn.dataset.statusHooked){
        saveBtn.dataset.statusHooked = '1';
        saveBtn.addEventListener('click', function(){
          var sel = document.getElementById('wd-status-select');
          var newStatus = sel ? sel.value : null;
          var editId = currentEditId;
          
          if(newStatus && editId){
            setTimeout(function(){
              var reqs = getRequests();
              var updated = false;
              for(var r=0;r<reqs.length;r++){
                if(reqs[r].id === editId){
                  reqs[r].status = newStatus;
                  updated = true;
                  break;
                }
              }
              if(updated){
                saveRequests(reqs);
                setTimeout(function(){
                  alert('✅ تم تحديث الحالة إلى: ' + newStatus);
                  location.reload();
                }, 500);
              }
            }, 1000);
          }
        });
      }
    }
  }

  var observer = new MutationObserver(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      setTimeout(injectStatusField, 300);
    }
  });
  
  observer.observe(document.body, {childList:true, subtree:true});
  
  setInterval(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      injectStatusField();
    }
  }, 1000);
  
  console.log('WD Status Patch v3 with Colors Ready');
})();
