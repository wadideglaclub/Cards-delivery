
(function(){
  var STATUSES = ["قيد انتظار الكارنيهات","تم الطباعة","تم الغاء الطلب"];
  var currentEditId = null;

  function getRequests(){
    try{
      var data = JSON.parse(localStorage.getItem("wadi_degla_requests_final")||"[]");
      return data;
    }catch(e){ return []; }
  }

  function saveRequests(list){
    try{
      localStorage.setItem("wadi_degla_requests_final", JSON.stringify(list));
      if(typeof window.__wdFlush === "function"){
        window.__wdFlush();
      }
    }catch(e){}
  }

  function findPhoneInput(){
    var inputs = document.querySelectorAll('input');
    for(var i=0;i<inputs.length;i++){
      var inp = inputs[i];
      // phone input has placeholder or type tel or near label رقم تليفون
      var label = inp.parentElement && inp.parentElement.parentElement ? inp.parentElement.parentElement.textContent : "";
      // Check if this is phone field by checking surrounding text or inputmode
      if((inp.placeholder && inp.placeholder.indexOf('01')!==-1) || (document.body.innerHTML.indexOf('رقم تليفون')!==-1 && inp.type==='tel')){
        return inp;
      }
      // fallback: look for input that has 11 digit value
      // We'll search by label text
      if(label && label.indexOf('تليفون')!==-1){
        return inp;
      }
    }
    // Last resort: find input after owner name
    var allInputs = Array.from(document.querySelectorAll('input'));
    // Usually order: membershipNumber, ownerName, phone
    if(allInputs.length>=3){
      // Heuristic: phone is 3rd or 4th input in new form
      return allInputs[2];
    }
    return null;
  }

  function injectStatusField(){
    if(document.getElementById('wd-status-field')) return;
    
    // Find form - look for container that has phone input
    var inputs = document.querySelectorAll('input');
    var phoneInput = null;
    var phoneWrapper = null;
    
    // Try to find phone input by looking for 01 pattern or by position
    for(var i=0;i<inputs.length;i++){
      var inp = inputs[i];
      // Check parent structure
      var parent = inp.closest('div');
      if(parent){
        var text = parent.parentElement ? parent.parentElement.textContent : '';
        if(text.indexOf('تليفون')!==-1 || text.indexOf('واتساب')!==-1){
          phoneInput = inp;
          phoneWrapper = parent.parentElement;
          break;
        }
      }
    }
    
    // Fallback: find by input index in the new request form
    if(!phoneInput){
      // The form has multiple inputs, phone is usually before notes textarea
      var form = document.querySelector('form') || document.body;
      var allInputs = form.querySelectorAll('input');
      // In the form, phone is one of the last inputs before textarea
      for(var j=allInputs.length-1;j>=0;j--){
        if(allInputs[j].value && /^01\d{9}$/.test(allInputs[j].value)){
          phoneInput = allInputs[j];
          phoneWrapper = phoneInput.closest('div').parentElement;
          break;
        }
      }
    }
    
    if(!phoneInput && inputs.length>0){
      // Final fallback: 3rd input
      phoneInput = inputs[2];
      if(phoneInput) phoneWrapper = phoneInput.closest('div');
    }

    if(!phoneWrapper){
      return;
    }

    // Find current request being edited
    var membershipInput = document.querySelectorAll('input')[0];
    var membershipNumber = membershipInput ? membershipInput.value.trim() : '';
    var requests = getRequests();
    var currentReq = null;
    if(membershipNumber){
      for(var k=0;k<requests.length;k++){
        if(requests[k].membershipNumber === membershipNumber || requests[k].membershipNumber.indexOf(membershipNumber)!==-1){
          currentReq = requests[k];
          currentEditId = requests[k].id;
          break;
        }
      }
    }

    var wrapper = document.createElement('div');
    wrapper.id = 'wd-status-field';
    wrapper.style.cssText = 'margin-top:14px;margin-bottom:8px;';
    wrapper.innerHTML = `
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span>📋 حالة الكارنيهات</span>
        <span style="color:#dc2626">*</span>
      </div>
      <select id="wd-status-select" style="width:100%;height:44px;border:2px solid #0F0F0F;border-radius:12px;padding:0 12px;font-size:14px;font-family:inherit;background:#fff;font-weight:600;">
        ${STATUSES.map(s => `<option value="${s}" ${currentReq && currentReq.status===s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <div style="font-size:11px;color:#71717a;margin-top:6px;">اختر الحالة الجديدة للطلب - سيتم حفظها عند الضغط على حفظ التعديلات</div>
    `;
    
    // Insert after phone wrapper
    if(phoneWrapper && phoneWrapper.parentNode){
      // Try to insert after phone wrapper's parent container
      var insertAfter = phoneWrapper;
      // Find the next sibling container that might be notes
      var attempts = 0;
      while(insertAfter && attempts<5){
        if(insertAfter.nextSibling){
          insertAfter.parentNode.insertBefore(wrapper, insertAfter.nextSibling);
          break;
        }
        insertAfter = insertAfter.parentElement;
        attempts++;
      }
      if(attempts>=5){
        phoneWrapper.parentNode.appendChild(wrapper);
      }
    }

    var select = document.getElementById('wd-status-select');
    if(select){
      window.__wdEditStatus = select.value;
      select.addEventListener('change', function(){
        window.__wdEditStatus = this.value;
        console.log('Status changed to:', window.__wdEditStatus);
      });
      
      // Hook into save button
      var saveBtns = document.querySelectorAll('button');
      for(var b=0;b<saveBtns.length;b++){
        var btn = saveBtns[b];
        if(btn.textContent.indexOf('حفظ التعديلات')!==-1 || btn.textContent.indexOf('حفظ')!==-1){
          if(!btn.dataset.statusHooked){
            btn.dataset.statusHooked = '1';
            btn.addEventListener('click', function(){
              setTimeout(function(){
                var sel = document.getElementById('wd-status-select');
                if(sel && currentEditId){
                  var newStatus = sel.value;
                  var reqs = getRequests();
                  var updated = false;
                  for(var r=0;r<reqs.length;r++){
                    if(reqs[r].id === currentEditId){
                      reqs[r].status = newStatus;
                      updated = true;
                      break;
                    }
                  }
                  if(updated){
                    saveRequests(reqs);
                    console.log('Status updated to', newStatus);
                    // Show success
                    setTimeout(function(){
                      alert('تم تحديث حالة الكارنيه إلى: ' + newStatus);
                    }, 300);
                  }
                }
              }, 800);
            });
          }
        }
      }
    }
  }

  function observe(){
    var observer = new MutationObserver(function(){
      // Check if we are in edit mode (has membership number input filled)
      var inputs = document.querySelectorAll('input');
      if(inputs.length>=2){
        // If first input has value (membership number), we might be in edit mode
        var firstVal = inputs[0] ? inputs[0].value.trim() : '';
        if(firstVal && firstVal.length>3){
          injectStatusField();
        }
      }
    });
    observer.observe(document.body, {childList:true, subtree:true});
    
    // Also try every 1 second
    setInterval(function(){
      var inputs = document.querySelectorAll('input');
      if(inputs.length>=2 && inputs[0].value.trim()){
        injectStatusField();
      }
    }, 1000);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', observe);
  } else {
    observe();
  }
  
  console.log('Wadi Degla Status Patch Loaded - Statuses:', ["قيد انتظار الكارنيهات","تم الطباعة","تم الغاء الطلب"]);
})();
