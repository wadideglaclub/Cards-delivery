
// Optimized lookup - loads CSV file for fast search
(function(){
  let branchMap = null;
  let branches = ['Maadi','Heliopolis','Nakhil','October 1','October 2','Muharram Bek - Alex','Lotus','Damietta','Assiut','Minya','Mansoura','Tanta'];
  
  async function loadCSV(){
    if(branchMap) return branchMap;
    try{
      // Try to load the CSV file
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
      }
      console.log('CSV loaded:', Object.keys(branchMap).length/2, 'memberships');
      return branchMap;
    }catch(e){
      console.log('CSV load failed, using fallback small map', e);
      return null;
    }
  }

  function getBranchByMembership(membershipNumber){
    if(!membershipNumber) return null;
    if(!branchMap) return null; // not loaded yet
    let key = String(membershipNumber).trim();
    let norm = key.replace(/^0+/, '').toUpperCase();
    return branchMap[key] || branchMap[norm] || branchMap[key.toUpperCase()] || null;
  }

  async function getBranchAsync(membershipNumber){
    if(!branchMap){
      await loadCSV();
    }
    return getBranchByMembership(membershipNumber);
  }

  // Expose
  window.getBranchByMembership = getBranchByMembership;
  window.getBranchAsync = getBranchAsync;
  window.getAllBranches = () => branches;
  window.BRANCH_LOOKUP_READY = false;

  // Load immediately
  loadCSV().then(() => {
    window.BRANCH_LOOKUP_READY = true;
    window.MEMBERSHIP_BRANCH_MAP = branchMap;
    console.log('Branch lookup ready');
  });

  // Auto-fill logic
  function setupAutoFill(){
    function attach(){
      document.querySelectorAll('input').forEach(function(input){
        if(input.dataset.lookupAttached) return;
        const ph = (input.placeholder||'').toLowerCase();
        const isMem = ph.includes('ط¹ط¶ظˆظٹط©') || input.id?.toLowerCase().includes('membership');
        if(isMem || input.type === 'number' || (input.closest('label')?.textContent||'').includes('ط§ظ„ط¹ط¶ظˆظٹط©')){
          input.dataset.lookupAttached = '1';
          input.addEventListener('blur', async function(){
            const branch = await getBranchAsync(this.value);
            if(branch){
              // Find branch display
              document.querySelectorAll('input, select, div').forEach(function(el){
                let txt = (el.closest('div')?.textContent||'').toLowerCase();
                if(txt.includes('ظ…ظ† ظپط±ط¹') || txt.includes('ظپط±ط¹ ط§ظ„ط¹ط¶ظˆظٹط©')){
                  if(el.tagName === 'INPUT' && el !== input){
                    el.value = branch;
                    el.dispatchEvent(new Event('input',{bubbles:true}));
                  }
                }
              });
              console.log('Branch found:', branch);
            }
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
})();
