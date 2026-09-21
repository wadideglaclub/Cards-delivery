
(function(){
  console.log('WD Status Patch v4 - Clean + Table Colors');
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
        window.__wdFlush().then(function(){}).catch(function(){});
      }
    }catch(e){}
  }

  // 1. Clean edit dropdown - no extra text, no hint box
  function injectStatusField(){
    if(document.getElementById('wd-status-field')) return;
    
    var buttons = Array.from(document.querySelectorAll('button'));
    var saveBtn = buttons.find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
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
    
    var wrapper = document.createElement('div');
    wrapper.id = 'wd-status-field';
    wrapper.style.cssText = 'margin:16px 0;';
    // Clean - no yellow box, just simple field like others
    wrapper.innerHTML = `
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#000;display:flex;align-items:center;gap:6px;">
        <span>📋 حالة الكارنيهات</span>
        <span style="color:#dc2626">*</span>
      </div>
      <select id="wd-status-select" style="width:100%;height:48px;border:2px solid #000;border-radius:12px;padding:0 12px;font-size:14px;font-weight:700;background:#fff;color:#000;">
        <option value="قيد انتظار الكارنيهات" ${currentStatus==="قيد انتظار الكارنيهات" ? 'selected' : ''}>قيد انتظار الكارنيهات</option>
        <option value="تم الطباعة" ${currentStatus==="تم الطباعة" ? 'selected' : ''}>تم الطباعة</option>
        <option value="تم الغاء الطلب" ${currentStatus==="تم الغاء الطلب" ? 'selected' : ''}>تم الغاء الطلب</option>
        <option value="تم الاستلام" ${currentStatus==="تم الاستلام" ? 'selected' : ''}>تم الاستلام</option>
      </select>
    `;
    
    saveBtn.parentElement.parentNode.insertBefore(wrapper, saveBtn.parentElement);
    
    var select = document.getElementById('wd-status-select');
    if(select){
      window.__wdEditStatus = select.value;
      select.addEventListener('change', function(){
        window.__wdEditStatus = this.value;
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
              for(var r=0;r<reqs.length;r++){
                if(reqs[r].id === editId){
                  reqs[r].status = newStatus;
                  break;
                }
              }
              saveRequests(reqs);
              setTimeout(function(){ location.reload(); }, 500);
            }, 1000);
          }
        });
      }
    }
  }

  // 2. Color badges in the table (قائمة الطلبات)
  function colorizeTableBadges(){
    // Find all status badges in table - they are divs/spans with text containing status
    var allElements = document.querySelectorAll('td div, td span, div');
    for(var i=0;i<allElements.length;i++){
      var el = allElements[i];
      var text = (el.textContent||'').trim();
      
      // Only target small badges, not large containers
      if(el.children.length>0) continue; // Skip containers
      if(text.length>30) continue; // Skip long texts
      if(!text) continue;
      
      // Check if this is a status badge
      if(text === 'قيد انتظار الكارنيهات' || text === 'قيد انتظار' || (text.indexOf('قيد انتظار')!==-1 && text.length<25)){
        el.style.background = '#FEF3C7';
        el.style.color = '#92400e';
        el.style.fontWeight = '700';
      }
      else if(text === 'تم الغاء الطلب' || text.indexOf('الغاء الطلب')!==-1){
        el.style.background = '#FEE2E2';
        el.style.color = '#DC2626';
        el.style.fontWeight = '700';
        el.style.border = '1px solid #FECACA';
      }
      else if(text === 'تم الطباعة'){
        el.style.background = '#E5E7EB';
        el.style.color = '#4B5563';
        el.style.fontWeight = '700';
        el.style.border = '1px solid #D1D5DB';
      }
      else if(text === 'تم الاستلام'){
        el.style.background = '#DCFCE7';
        el.style.color = '#166534';
        el.style.fontWeight = '700';
        el.style.border = '1px solid #BBF7D0';
      }
      else if(text === 'تم الإرسال' || text === 'تم الارسال'){
        el.style.background = '#DBEAFE';
        el.style.color = '#1E40AF';
        el.style.fontWeight = '700';
      }
    }
    
    // More robust: find table cells in the requests table
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table){
      var rows = table.querySelectorAll('tr');
      rows.forEach(function(row){
        var cells = row.querySelectorAll('td');
        // Status is usually 3rd or 4th column
        cells.forEach(function(cell){
          var div = cell.querySelector('div');
          if(!div) return;
          var txt = (div.textContent||'').trim();
          if(txt === 'تم الغاء الطلب'){
            div.style.background = '#FEE2E2';
            div.style.color = '#DC2626';
            div.style.border = '1px solid #FECACA';
          } else if(txt === 'تم الطباعة'){
            div.style.background = '#E5E7EB';
            div.style.color = '#4B5563';
            div.style.border = '1px solid #D1D5DB';
          } else if(txt === 'قيد انتظار الكارنيهات' || txt === 'قيد انتظار'){
            div.style.background = '#FEF3C7';
            div.style.color = '#92400e';
          }
        });
      });
    });
  }

  var observer = new MutationObserver(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      setTimeout(injectStatusField, 300);
    }
    colorizeTableBadges();
  });
  
  observer.observe(document.body, {childList:true, subtree:true});
  
  setInterval(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      injectStatusField();
    }
    colorizeTableBadges();
  }, 800);
  
  // Initial colorize
  setTimeout(colorizeTableBadges, 1000);
  
  console.log('WD Patch v4 Ready - Clean dropdown + Colored table');
})();
