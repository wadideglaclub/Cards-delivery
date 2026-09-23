
// Optimized lookup - مع رسالة برجاء طباعة الكارنيهات لو الفرع مش موجود
(function(){
  let branchMap = null;
  let branches = ['Maadi','Heliopolis','Nakhil','October 1','October 2','Muharram Bek - Alex','Lotus','Damietta','Assiut','Minya','Mansoura','Tanta'];
  const NOT_FOUND_MSG = 'برجاء طباعه الكارنيهات';
  
  async function loadCSV(){
    if(branchMap) return branchMap;
    try{
      const response = await fetch('./membership_branch_clean.csv');
      if(!response.ok) throw new Error('CSV not found');
      const text = await response.text();
      branchMap = {};
      const lines = text.split('\n');
      for(let i=1;i<lines.length;i++){
        const line = lines[i].trim();
        if(!line) continue;
        const parts = line.split(',');
        if(parts.length < 2) continue;
        let mem = parts[0].replace(/"/g,'').trim();
        let branch = parts[1].replace(/"/g,'').trim();
        if(!mem || !branch) continue;
        let norm = mem.replace(/^0+/, '').toUpperCase();
        branchMap[mem] = branch;
        branchMap[norm] = branch;
        branchMap[mem.toUpperCase()] = branch;
        // also numeric only
        let numeric = mem.replace(/[^0-9]/g,'').replace(/^0+/, '');
        if(numeric) branchMap[numeric] = branch;
      }
      console.log('CSV loaded:', Object.keys(branchMap).length, 'entries');
      return branchMap;
    }catch(e){
      console.log('CSV load failed, using fallback', e);
      branchMap = {};
      return branchMap;
    }
  }

  function getBranchByMembership(membershipNumber){
    if(!membershipNumber) return null;
    if(!branchMap) return null;
    let key = String(membershipNumber).trim();
    let norm = key.replace(/^0+/, '').toUpperCase();
    let numeric = key.replace(/[^0-9]/g,'').replace(/^0+/, '');
    
    return branchMap[key] || branchMap[norm] || branchMap[key.toUpperCase()] || branchMap[numeric] || null;
  }

  function getBranchWithFallback(membershipNumber){
    const branch = getBranchByMembership(membershipNumber);
    if(branch) return branch;
    // لو مالقاش الفرع - زي ما كانت
    if(membershipNumber && String(membershipNumber).trim().length >= 3){
      return NOT_FOUND_MSG;
    }
    return null;
  }

  async function getBranchAsync(membershipNumber){
    if(!branchMap){
      await loadCSV();
    }
    return getBranchWithFallback(membershipNumber);
  }

  // Expose
  window.getBranchByMembership = getBranchByMembership;
  window.getBranchWithFallback = getBranchWithFallback;
  window.getBranchAsync = getBranchAsync;
  window.getAllBranches = () => branches;
  window.BRANCH_NOT_FOUND_MSG = NOT_FOUND_MSG;
  window.BRANCH_LOOKUP_READY = false;

  // Load immediately
  loadCSV().then(() => {
    window.BRANCH_LOOKUP_READY = true;
    window.MEMBERSHIP_BRANCH_MAP = branchMap;
    console.log('Branch lookup ready with fallback message');
  });

  // Auto-fill logic - يملى الفرع او رسالة برجاء الطباعة
  function setupAutoFill(){
    function attach(){
      document.querySelectorAll('input').forEach(function(input){
        if(input.dataset.lookupAttached) return;
        const ph = (input.placeholder||'').toLowerCase();
        const id = (input.id||'').toLowerCase();
        const name = (input.name||'').toLowerCase();
        const labelText = (input.closest('div')?.textContent||'').toLowerCase();
        
        // ده حقل رقم العضوية؟
        const isMembership = ph.includes('عضوية') || id.includes('membership') || name.includes('membership') || 
                             labelText.includes('رقم العضوية') || ph.includes('membership number');
        
        // كمان لو input رقمي كبير ممكن يكون عضوية
        if(isMembership || (input.type === 'text' && !input.dataset.branchField)){
          // اتأكد انه مش حقل فرع
          if(labelText.includes('من فرع') || labelText.includes('إلى فرع') || labelText.includes('مكان الفرع')) return;
          
          input.dataset.lookupAttached = '1';
          
          async function fillBranch(){
            const val = input.value.trim();
            if(val.length < 3) return;
            const branch = await getBranchAsync(val);
            if(branch){
              // دور على حقل الفرع
              let filled = false;
              
              // طريقة 1: دور على input قريب مكتوب عليه فرع
              document.querySelectorAll('input, div, span').forEach(function(el){
                if(filled) return;
                if(el === input) return;
                let txt = '';
                if(el.tagName === 'INPUT'){
                  let parentTxt = (el.closest('div')?.textContent || el.parentElement?.textContent || '').toLowerCase();
                  if(parentTxt.includes('من فرع') || parentTxt.includes('مكان الفرع') || parentTxt.includes('فرع العضوية') || parentTxt.includes('branch')){
                    // ده حقل الفرع
                    if(el.tagName === 'INPUT'){
                      el.value = branch;
                      el.dispatchEvent(new Event('input',{bubbles:true}));
                      el.dispatchEvent(new Event('change',{bubbles:true}));
                      filled = true;
                      console.log('Filled branch field:', branch);
                    }
                  }
                } else if(el.tagName === 'DIV' || el.tagName === 'SPAN'){
                  // لو فيه div بيعرض الفرع
                  let parent = el.parentElement;
                  if(parent && (parent.textContent.toLowerCase().includes('من فرع') || parent.textContent.toLowerCase().includes('مكان الفرع'))){
                    if(el.textContent.length < 50 && !el.querySelector('input')){
                      // ممكن يكون مكان عرض الفرع
                      if(el.textContent.includes('جاري') || el.textContent.includes('...') || branchMap === null){
                        // لا
                      }
                    }
                  }
                }
              });

              // طريقة 2: دور على اي عنصر فيه كلمة "من فرع" وجنبه قيمة
              if(!filled){
                document.querySelectorAll('div').forEach(function(div){
                  if(filled) return;
                  if(div.querySelector('table')) return;
                  let t = div.textContent || '';
                  if((t.includes('من فرع') || t.includes('مكان الفرع')) && t.length < 200){
                    // لاقي ال div اللي فيه القيمة
                    let next = div.nextElementSibling;
                    if(next && next.tagName === 'DIV' && next.textContent.length < 100){
                      next.textContent = branch;
                      filled = true;
                    }
                    // او نفس ال div فيه span للقيمة
                    let spans = div.querySelectorAll('span, div');
                    spans.forEach(function(s){
                      if(s.textContent.length < 50 && s.textContent.length > 2 && !s.querySelector('input')){
                        if(s.textContent !== 'من فرع' && !s.textContent.includes('من فرع')){
                          // ممكن يكون قيمة الفرع القديمة
                          // s.textContent = branch;
                        }
                      }
                    });
                  }
                });
              }

              // لو الفرع مش موجود، اعرض رسالة برجاء الطباعة في نفس مكان الفرع
              if(branch === NOT_FOUND_MSG){
                console.log('Branch not found, showing fallback message');
                // حاول تملى نفس حقل الفرع بالرسالة
                document.querySelectorAll('input').forEach(function(bInput){
                  if(bInput === input) return;
                  let pTxt = (bInput.closest('div')?.textContent || '').toLowerCase();
                  if(pTxt.includes('من فرع') || pTxt.includes('مكان الفرع') || pTxt.includes('فرع')){
                    bInput.value = branch;
                    bInput.style.color = '#DC2626';
                    bInput.style.fontWeight = '700';
                  }
                });
              }
            }
          }
          
          input.addEventListener('blur', fillBranch);
          // debounce on input
          let debounce;
          input.addEventListener('input', function(){
            clearTimeout(debounce);
            debounce = setTimeout(fillBranch, 800);
          });
        }
      });
    }
    setInterval(attach, 1000);
    attach();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setupAutoFill);
  } else {
    setupAutoFill();
  }

  // كمان hook للكود القديم اللي كان بيعرض "برجاء طباعة الكارنيهات"
  // لو فيه function قديمة بتدور على الفرع، نعمل override
  window.showBranchOrFallback = function(membershipNumber, element){
    getBranchAsync(membershipNumber).then(function(branch){
      if(element){
        element.textContent = branch || NOT_FOUND_MSG;
        if(branch === NOT_FOUND_MSG){
          element.style.color = '#DC2626';
        }
      }
    });
  };
})();
