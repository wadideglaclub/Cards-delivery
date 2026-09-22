
// ===== تقدر تغير أسماء أنواع الطلبات من هنا =====
window.REQUEST_LABELS = {
  receive: "طلب كارنيه من فرع آخر"       // كان: طلب كارنيه من فرع آخر
  send: "إرسال كارنيه إلى فرع آخر",      // كان: إرسال كارنيه إلى فرع آخر
  // لو عايز تبدلهم، بدل النص اللي بين القوسين
  // مثال: لو عايز الاثنين يبقوا إرسال، خليهم الاثنين نفس النص
};
// لو عايز تبدل مكانهم في القائمة (اللي فوق يبقى تحت)، خلي ده true
window.SWAP_REQUEST_ORDER = false;
// =================================================


(function(){
  console.log('WD Patch v7 - Show current status on edit');
  var currentEditId = null;
  var currentRowStatus = null; // الحالة من الصف اللي اتداس عليه

  function getRequests(){
    try{ return JSON.parse(localStorage.getItem("wadi_degla_requests_final")||"[]"); }catch(e){ return []; }
  }
  function saveRequests(list){
    try{
      localStorage.setItem("wadi_degla_requests_final", JSON.stringify(list));
      if(window.__wdFlush) window.__wdFlush();
    }catch(e){}
  }

  // اسمع كل دوسة تعديل في الجدول واحفظ الحالة من الصف
  document.addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if(!btn) return;
    // شوف لو الزرار ده جوه جدول (زرار القلم)
    var tr = btn.closest('tr');
    if(!tr) return;
    // دور على خانة الحالة في نفس الصف
    var badges = tr.querySelectorAll('td div, td span');
    var foundStatus = null;
    var statuses = ["قيد انتظار الكارنيهات","تم الطباعة","تم الغاء الطلب","تم الاستلام","تم الإرسال","تم الارسال"];
    badges.forEach(function(b){
      var txt = (b.textContent||'').trim();
      // طابق بالظبط
      statuses.forEach(function(s){
        if(txt === s || txt === s.replace('إ','ا')){ // عشان الهمزة
          if(txt.indexOf('الارسال')!==-1 || txt.indexOf('الإرسال')!==-1){
            foundStatus = 'تم الإرسال';
          } else {
            foundStatus = txt;
          }
        }
      });
      // كمان لو النص يحتوي الحالة
      if(!foundStatus){
        if(txt.indexOf('قيد انتظار')!==-1) foundStatus='قيد انتظار الكارنيهات';
        else if(txt.indexOf('تم الطباعة')!==-1) foundStatus='تم الطباعة';
        else if(txt.indexOf('تم الغاء')!==-1 || txt.indexOf('تم إلغاء')!==-1) foundStatus='تم الغاء الطلب';
        else if(txt.indexOf('تم الاستلام')!==-1) foundStatus='تم الاستلام';
        else if(txt.indexOf('تم الارسال')!==-1 || txt.indexOf('تم الإرسال')!==-1) foundStatus='تم الإرسال';
      }
    });
    if(foundStatus){
      currentRowStatus = foundStatus;
      console.log('Captured row status:', currentRowStatus);
      // لو فيه select مفتوح بالفعل حدثه
      var sel = document.getElementById('wd-status-select');
      if(sel){
        sel.value = currentRowStatus;
        window.__wdEditStatus = currentRowStatus;
      }
    }
    // حاول تجيب ال ID كمان من رقم العضوية في الصف
    try{
      var tds = tr.querySelectorAll('td');
      if(tds.length>0){
        // رقم العضوية عادة اول عمود او تاني عمود
        var membershipText = '';
        for(var i=0;i<Math.min(3, tds.length); i++){
          var t = (tds[i].textContent||'').trim();
          if(t.length>=5 && /\d/.test(t)){
            // ممكن يكون رقم العضوية
            membershipText = t;
          }
        }
        if(membershipText){
          var reqs = getRequests();
          // دور على الطلب اللي حالته مطابقة للصف ده
          for(var k=0;k<reqs.length;k++){
            if(reqs[k].membershipNumber && membershipText.indexOf(reqs[k].membershipNumber)!==-1 && reqs[k].status === foundStatus){
              currentEditId = reqs[k].id;
              break;
            }
          }
          // لو مالقيش بالحالة، خد اول واحد بنفس رقم العضوية
          if(!currentEditId){
            for(var k=0;k<reqs.length;k++){
              if(reqs[k].membershipNumber && membershipText.indexOf(reqs[k].membershipNumber)!==-1){
                currentEditId = reqs[k].id;
                break;
              }
            }
          }
        }
      }
    }catch(e){}
  }, true);

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
    
    // الاولوية للحالة اللي مسكناها من الصف
    var currentStatus = currentRowStatus || "قيد انتظار الكارنيهات";
    
    if(membershipNumber && !currentRowStatus){
      for(var k=0;k<requests.length;k++){
        if(requests[k].membershipNumber===membershipNumber){
          currentReq=requests[k];
          if(!currentEditId) currentEditId=requests[k].id;
          currentStatus = currentReq.status;
          break;
        }
      }
    } else if(currentEditId){
      for(var k=0;k<requests.length;k++){
        if(requests[k].id===currentEditId){
          currentReq=requests[k];
          if(!currentRowStatus) currentStatus = currentReq.status;
          break;
        }
      }
    }
    
    // لو عندنا حالة من الصف استخدمها
    if(currentRowStatus){
      currentStatus = currentRowStatus;
    }

    var wrapper = document.createElement('div');
    wrapper.id='wd-status-field';
    wrapper.style.cssText='margin:16px 0;';
    // عشان تم الإرسال قديم مش في القائمة الجديدة، نضيفه لو الحالة الحالية هي تم الإرسال
    var showOldSent = (currentStatus === 'تم الإرسال' || currentStatus === 'تم الارسال');
    
    wrapper.innerHTML=`
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#000;">
        📋 حالة الكارنيهات <span style="color:#dc2626">*</span>
      </div>
      <select id="wd-status-select" style="width:100%;height:48px;border:2px solid #000;border-radius:12px;padding:0 12px;font-size:14px;font-weight:700;background:#fff;color:#000;">
        ${showOldSent ? `<option value="تم الإرسال" selected>تم الإرسال</option>` : ''}
        <option value="قيد انتظار الكارنيهات" ${currentStatus==="قيد انتظار الكارنيهات"?'selected':''}>قيد انتظار الكارنيهات</option>
        <option value="تم الطباعة" ${currentStatus==="تم الطباعة"?'selected':''}>تم الطباعة</option>
        <option value="تم الغاء الطلب" ${currentStatus==="تم الغاء الطلب"?'selected':''}>تم الغاء الطلب</option>
        <option value="تم الاستلام" ${currentStatus==="تم الاستلام"?'selected':''}>تم الأستلام</option>
        <option value="تم الإرسال" ${currentStatus==="تم الإرسال"?'selected':''}>تم الإرسال</option>
      </select>
      ${currentRowStatus ? `<div style="font-size:11px;color:#666;margin-top:6px;">الحالة الحالية: ${currentRowStatus}</div>` : ''}
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
          // لو الحالة كانت تم الإرسال واتغيرت، حولها للحالة الجديدة
          if(newStatus==='تم الإرسال') newStatus='قيد انتظار الكارنيهات'; // نحول القديم للجديد افتراضيا
          var editId=currentEditId;
          if(newStatus && editId){
            setTimeout(function(){
              var reqs=getRequests();
              for(var r=0;r<reqs.length;r++){
                if(reqs[r].id===editId){ reqs[r].status=newStatus; break; }
              }
              saveRequests(reqs);
              currentRowStatus = null; // امسح بعد الحفظ
              setTimeout(function(){ location.reload(); }, 500);
            }, 1000);
          }
        });
      }
    }
  }

  function forceColorBadges(){
    if(!document.getElementById('wd-color-fix-style')){
      var style = document.createElement('style');
      style.id = 'wd-color-fix-style';
      style.innerHTML = `
        .wd-badge-cancel { background: #FEE2E2 !important; color: #DC2626 !important; border: 1px solid #FECACA !important; }
        .wd-badge-printed { background: #E5E7EB !important; color: #4B5563 !important; border: 1px solid #D1D5DB !important; }
      `;
      document.head.appendChild(style);
    }
    var tables = document.querySelectorAll('table');
    tables.forEach(function(table){
      var allDivs = table.querySelectorAll('td div, td span');
      allDivs.forEach(function(badge){
        if(badge.children.length>0) return;
        var txt = (badge.textContent||'').trim();
        if(txt === 'تم الغاء الطلب' || txt === 'تم إلغاء الطلب'){
          badge.style.setProperty('background', '#FEE2E2', 'important');
          badge.style.setProperty('background-color', '#FEE2E2', 'important');
          badge.style.setProperty('color', '#DC2626', 'important');
          badge.style.setProperty('border', '1px solid #FECACA', 'important');
        } else if(txt === 'تم الطباعة'){
          badge.style.setProperty('background', '#E5E7EB', 'important');
          badge.style.setProperty('background-color', '#E5E7EB', 'important');
          badge.style.setProperty('color', '#4B5563', 'important');
          badge.style.setProperty('border', '1px solid #D1D5DB', 'important');
        }
      });
    });
  }

  var observer = new MutationObserver(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      setTimeout(injectStatusField, 200);
    }
    forceColorBadges();
  });
  
  observer.observe(document.body, {childList:true, subtree:true});
  
  setInterval(function(){
    var saveBtn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').indexOf('حفظ التعديلات')!==-1);
    if(saveBtn && !document.getElementById('wd-status-field')){
      injectStatusField();
    }
    forceColorBadges();
  }, 800);
  
  console.log('WD Patch v7 Ready - Current row status on edit');
})();
