
(function(){
  console.log('WD Patch v6 - Force red for canceled, gray for printed');
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
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#000;">📋 حالة الكارنيهات <span style="color:#dc2626">*</span></div>
      <select id="wd-status-select" style="width:100%;height:48px;border:2px solid #000;border-radius:12px;padding:0 12px;font-size:14px;font-weight:700;background:#fff;color:#000;">
        <option value="قيد انتظار الكارنيهات" ${currentStatus==="قيد انتظار الكارنيهات"?'selected':''}>قيد انتظار الكارنيهات</option>
        <option value="تم الطباعة" ${currentStatus==="تم الطباعة"?'selected':''}>تم الطباعة</option>
        <option value="تم الغاء الطلب" ${currentStatus==="تم الغاء الطلب"?'selected':''}>تم الغاء الطلب</option>
        <option value="تم الأستلام" ${currentStatus==="تم الاستلام"?'selected':''}>تم الاستلام</option>
        <option value="تم الإرسال" ${currentStatus==="تم الإرسال"?'selected':''}>تم الإرسال</option>
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

  function forceColorBadges(){
    // Inject global style to force colors with !important
    if(!document.getElementById('wd-color-fix-style')){
      var style = document.createElement('style');
      style.id = 'wd-color-fix-style';
      style.innerHTML = `
        /* Force red for canceled */
        .wd-badge-cancel {
          background: #FEE2E2 !important;
          color: #DC2626 !important;
          border: 1px solid #FECACA !important;
        }
        .wd-badge-printed {
          background: #E5E7EB !important;
          color: #4B5563 !important;
          border: 1px solid #D1D5DB !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Find all badges in tables
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table){
      var allDivs = table.querySelectorAll('td div, td span');
      allDivs.forEach(function(badge){
        if(badge.children.length>0) return; // skip containers
        var txt = (badge.textContent||'').trim();
        
        if(txt === 'تم الغاء الطلب'){
          // Force red with setProperty important
          badge.style.setProperty('background', '#FEE2E2', 'important');
          badge.style.setProperty('background-color', '#FEE2E2', 'important');
          badge.style.setProperty('color', '#DC2626', 'important');
          badge.style.setProperty('border', '1px solid #FECACA', 'important');
          badge.classList.add('wd-badge-cancel');
        } else if(txt === 'تم الطباعة'){
          badge.style.setProperty('background', '#E5E7EB', 'important');
          badge.style.setProperty('background-color', '#E5E7EB', 'important');
          badge.style.setProperty('color', '#4B5563', 'important');
          badge.style.setProperty('border', '1px solid #D1D5DB', 'important');
          badge.classList.add('wd-badge-printed');
        }
      });
    });
  }

  // Also fix via text search across whole document for safety, but ONLY inside tables
  function fixAllCanceledBadges(){
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var node;
    while(node = walker.nextNode()){
      if(node.nodeValue && node.nodeValue.trim() === 'تم الغاء الطلب'){
        nodes.push(node);
      }
    }
    nodes.forEach(function(textNode){
      var badge = textNode.parentElement;
      if(!badge) return;
      // Only if inside table
      if(!badge.closest('table')) return;
      badge.style.setProperty('background', '#FEE2E2', 'important');
      badge.style.setProperty('background-color', '#FEE2E2', 'important');
      badge.style.setProperty('color', '#DC2626', 'important');
      badge.style.setProperty('border', '1px solid #FECACA', 'important');
    });
  }

  var observer = new MutationObserver(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      setTimeout(injectStatusField, 300);
    }
    forceColorBadges();
    fixAllCanceledBadges();
  });
  
  observer.observe(document.body, {childList:true, subtree:true});
  
  setInterval(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      injectStatusField();
    }
    forceColorBadges();
    fixAllCanceledBadges();
  }, 800);
  
  setTimeout(function(){
    forceColorBadges();
    fixAllCanceledBadges();
  }, 1000);
  
  console.log('WD Patch v6 Ready - Forced red for canceled');
})();
