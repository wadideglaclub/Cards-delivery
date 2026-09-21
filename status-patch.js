
(function(){
  console.log('WD Patch v5 - Only table badges red/gray, dashboard untouched');
  var currentEditId = null;

  function getRequests(){
    try{ return JSON.parse(localStorage.getItem("wadi_degla_requests_final")||"[]"); }catch(e){ return []; }
  }
  function saveRequests(list){
    try{
      localStorage.setItem("wadi_degla_requests_final", JSON.stringify(list));
      if(window.__wdFlush) window.__wdFlush();
    }catch(e){}
  }

  function injectStatusField(){
    if(document.getElementById('wd-status-field')) return;
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(!saveBtn) return;
    var formContainer = saveBtn.parentElement;
    var attempts=0;
    while(formContainer && attempts<5){
      if(formContainer.querySelectorAll('input').length>=2) break;
      formContainer=formContainer.parentElement;
      attempts++;
    }
    if(!formContainer) return;
    var inputs = formContainer.querySelectorAll('input');
    var membershipNumber = inputs[0] ? inputs[0].value.trim() : '';
    var requests = getRequests();
    var currentReq = null;
    if(membershipNumber){
      for(var k=0;k<requests.length;k++){
        if(requests[k].membershipNumber===membershipNumber){
          currentReq=requests[k];
          currentEditId=requests[k].id;
          break;
        }
      }
    }
    var currentStatus = currentReq ? currentReq.status : "قيد انتظار الكارنيهات";
    var wrapper = document.createElement('div');
    wrapper.id='wd-status-field';
    wrapper.style.cssText='margin:16px 0;';
    wrapper.innerHTML=`
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#000;">
        📋 حالة الكارنيهات <span style="color:#dc2626">*</span>
      </div>
      <select id="wd-status-select" style="width:100%;height:48px;border:2px solid #000;border-radius:12px;padding:0 12px;font-size:14px;font-weight:700;background:#fff;color:#000;">
        <option value="قيد انتظار الكارنيهات" ${currentStatus==="قيد انتظار الكارنيهات"?'selected':''}>قيد انتظار الكارنيهات</option>
        <option value="تم الطباعة" ${currentStatus==="تم الطباعة"?'selected':''}>تم الطباعة</option>
        <option value="تم الغاء الطلب" ${currentStatus==="تم الغاء الطلب"?'selected':''}>تم الغاء الطلب</option>
        <option value="تم الاستلام" ${currentStatus==="تم الاستلام"?'selected':''}>تم الاستلام</option>
      </select>
    `;
    saveBtn.parentElement.parentNode.insertBefore(wrapper, saveBtn.parentElement);
    var select=document.getElementById('wd-status-select');
    if(select){
      window.__wdEditStatus=select.value;
      select.addEventListener('change', function(){ window.__wdEditStatus=this.value; });
      if(!saveBtn.dataset.statusHooked){
        saveBtn.dataset.statusHooked='1';
        saveBtn.addEventListener('click', function(){
          var sel=document.getElementById('wd-status-select');
          var newStatus=sel?sel.value:null;
          var editId=currentEditId;
          if(newStatus && editId){
            setTimeout(function(){
              var reqs=getRequests();
              for(var r=0;r<reqs.length;r++){
                if(reqs[r].id===editId){ reqs[r].status=newStatus; break; }
              }
              saveRequests(reqs);
              setTimeout(function(){ location.reload(); }, 500);
            }, 1000);
          }
        });
      }
    }
  }

  function colorizeOnlyTable(){
    // ONLY color badges inside tables in قائمة الطلبات
    // Do NOT touch dashboard cards
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table){
      var cells = table.querySelectorAll('td');
      cells.forEach(function(cell){
        // Find badge div inside td
        var badge = cell.querySelector('div');
        if(!badge) return;
        var txt = (badge.textContent||'').trim();
        
        // Only change the two new statuses
        if(txt === 'تم الغاء الطلب'){
          badge.style.background = '#FEE2E2';
          badge.style.color = '#DC2626';
          badge.style.border = '1px solid #FECACA';
          badge.style.fontWeight = '700';
        } else if(txt === 'تم الطباعة'){
          badge.style.background = '#E5E7EB';
          badge.style.color = '#4B5563';
          badge.style.border = '1px solid #D1D5DB';
          badge.style.fontWeight = '700';
        }
        // Leave قيد انتظار and تم الاستلام and تم الإرسال with original colors (don't touch)
      });
    });
  }

  // Remove any previous highlight styles from dashboard
  function cleanDashboardHighlights(){
    // Find dashboard cards and remove inline highlight styles we added before
    // Dashboard cards have structure with "عدد طلبات" text
    var dashboardText = document.querySelectorAll('div');
    dashboardText.forEach(function(el){
      // If element is small and contains status text but is inside a dashboard card (has sibling with number)
      // We should NOT have colored it - reset if it was colored by old code
      // Only reset if parent is dashboard card (has blue/yellow/green left border)
      var parent = el.closest('div[style*="border-left"], div[style*="borderLeft"]');
      // Safer: just don't touch anything outside tables now
    });
  }

  var observer = new MutationObserver(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      setTimeout(injectStatusField, 300);
    }
    colorizeOnlyTable();
  });
  
  observer.observe(document.body, {childList:true, subtree:true});
  
  setInterval(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      injectStatusField();
    }
    colorizeOnlyTable();
  }, 1000);
  
  setTimeout(colorizeOnlyTable, 1000);
  console.log('WD Patch v5 Ready - Dashboard clean, table only red/gray');
})();
