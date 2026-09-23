(function () {
  var CARD_ID = "wd-membership-lookup";
  var timer = null;
  var BRANCH_MAP = null;
  var CSV_URL = "./membership_A2_C257002.csv";

  async function loadCSV(){
    if(BRANCH_MAP) return BRANCH_MAP;
    try{
      var res = await fetch(CSV_URL);
      var text = await res.text();
      var lines = text.split('\n');
      BRANCH_MAP = {};
      for(var i=1;i<lines.length;i++){
        var line = lines[i].trim();
        if(!line) continue;
        // CSV: MembershipNumber,BranchName
        var comma = line.indexOf(',');
        if(comma === -1) continue;
        var mem = line.substring(0, comma).replace(/"/g,'').trim().toUpperCase();
        var branch = line.substring(comma+1).replace(/"/g,'').trim();
        if(!mem || !branch) continue;
        BRANCH_MAP[mem] = branch;
        var stripped = mem.replace(/^0+/, "");
        if(stripped && !BRANCH_MAP[stripped]) BRANCH_MAP[stripped] = branch;
        var numOnly = mem.replace(/[^0-9]/g, "").replace(/^0+/, "");
        if(numOnly && !BRANCH_MAP[numOnly]) BRANCH_MAP[numOnly] = branch;
      }
      console.log("✅ CSV loaded A2:A257002 C2:C257002 - " + Object.keys(BRANCH_MAP).length + " entries - Test 00400123456=" + findBranch("00400123456"));
      window.MEMBERSHIP_BRANCH_MAP = BRANCH_MAP;
      window.BRANCH_LOOKUP_READY = true;
      return BRANCH_MAP;
    }catch(e){
      console.error("CSV load failed", e);
      BRANCH_MAP = {};
      return BRANCH_MAP;
    }
  }

  function findBranch(raw){
    if(!raw || !BRANCH_MAP) return null;
    var input = String(raw).toUpperCase().trim().replace(/[٠-٩]/g, function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d);});
    if(!input) return null;
    if(BRANCH_MAP[input]) return BRANCH_MAP[input];
    var noZero = input.replace(/^0+/, "");
    if(noZero && BRANCH_MAP[noZero]) return BRANCH_MAP[noZero];
    var numOnly = input.replace(/[^0-9]/g, "").replace(/^0+/, "");
    if(numOnly && BRANCH_MAP[numOnly]) return BRANCH_MAP[numOnly];
    if(input.includes("WDI")){
      if(BRANCH_MAP[input]) return BRANCH_MAP[input];
      var noDash = input.replace(/-/g,"");
      if(BRANCH_MAP[noDash]) return BRANCH_MAP[noDash];
    }
    return null;
  }

  function buildCard(){
    if(document.getElementById(CARD_ID)){
      var ex = document.getElementById(CARD_ID);
      ex.style.setProperty('display','block','important');
      return ex;
    }
    var card = document.createElement("div");
    card.id = CARD_ID;
    card.dir = "rtl";
    card.style.cssText = "max-width:700px;margin:20px auto;padding:0 16px;font-family:'Tajawal','Cairo',sans-serif;display:block !important;";
    var box = document.createElement("div");
    box.style.cssText = "background:#fff;border:2px solid #0F0F0F;border-radius:28px;padding:24px 24px 30px 24px;position:relative;";
    var yellowLine = document.createElement("div");
    yellowLine.style.cssText = "position:absolute;bottom:0;left:20px;right:20px;height:6px;background:#FFD700;border-radius:0 0 20px 20px;";
    var title = document.createElement("div");
    title.innerHTML = "بحث عن فرع العضوية <span style='font-size:20px'>🔍</span>";
    title.style.cssText = "font-weight:900;font-size:20px;margin-bottom:20px;text-align:right;color:#000;";
    var label1 = document.createElement("div");
    label1.textContent = "رقم العضوية";
    label1.style.cssText = "font-size:14px;font-weight:800;margin-bottom:10px;text-align:right;";
    var numInput = document.createElement("input");
    numInput.id = "membership-search-input";
    numInput.placeholder = "اكتب رقم العضوية";
    numInput.style.cssText = "width:100%;height:56px;border:2px solid #0F0F0F;border-radius:16px;padding:0 16px;font-size:16px;background:#fff;text-align:right;outline:none;";
    var label2 = document.createElement("div");
    label2.textContent = "مكان الفرع";
    label2.style.cssText = "font-size:14px;font-weight:800;margin:10px 0;text-align:right;";
    var branchInput = document.createElement("input");
    branchInput.id = "branch-result-input";
    branchInput.readOnly = true;
    branchInput.placeholder = "يظهر تلقائياً";
    branchInput.style.cssText = "width:100%;height:56px;border:2px solid #0F0F0F;border-radius:16px;padding:0 16px;font-size:16px;background:#F8F8F5;text-align:right;font-weight:700;";
    var status = document.createElement("div");
    status.id = "search-status";
    status.style.cssText = "font-size:12px;font-weight:700;margin-top:10px;color:#6b7280;min-height:18px;text-align:right;";
    var inputWrap1 = document.createElement("div");
    inputWrap1.style.marginBottom = "20px";
    inputWrap1.appendChild(numInput);
    box.appendChild(title);
    box.appendChild(label1);
    box.appendChild(inputWrap1);
    box.appendChild(label2);
    box.appendChild(branchInput);
    box.appendChild(status);
    box.appendChild(yellowLine);
    card.appendChild(box);

    numInput.addEventListener("input", function(){
      var raw = numInput.value.trim();
      if(!raw){branchInput.value="";status.textContent="";return;}
      status.textContent = "🔍 جارٍ البحث في 257002 عضوية...";
      clearTimeout(timer);
      timer = setTimeout(async function(){
        if(!BRANCH_MAP) await loadCSV();
        var branch = findBranch(raw);
        if(branch){
          branchInput.value = branch;
          branchInput.style.background = "#dcfce7";
          branchInput.style.borderColor = "#16a34a";
          branchInput.style.color = "#166534";
          status.textContent = "✅ الفرع: " + branch;
          status.style.color = "#16a34a";
        }else{
          branchInput.value = "برجاء طباعة الكارنيهات";
          branchInput.style.background = "#fee2e2";
          branchInput.style.color = "#dc2626";
          branchInput.style.borderColor = "#dc2626";
          status.textContent = "⚠️ غير موجود - برجاء طباعة الكارنيهات";
          status.style.color = "#dc2626";
        }
      }, 250);
    });
    return card;
  }

  function mount(){
    if(document.getElementById(CARD_ID)){
      document.getElementById(CARD_ID).style.setProperty('display','block','important');
      return;
    }
    var card = buildCard();
    var header = document.querySelector("header");
    if(header && header.parentNode){header.parentNode.insertBefore(card, header.nextSibling);return;}
    var root = document.getElementById("root");
    if(root){if(root.firstChild) root.insertBefore(card, root.firstChild); else root.appendChild(card);return;}
    document.body.insertBefore(card, document.body.firstChild);
  }

  function boot(){
    mount();
    loadCSV();
    new MutationObserver(function(){
      var el = document.getElementById(CARD_ID);
      if(!el) mount(); else el.style.setProperty('display','block','important');
    }).observe(document.body, {childList:true, subtree:true});
    setInterval(function(){var el=document.getElementById(CARD_ID); if(!el) mount();}, 1000);
  }

  window.getBranchByMembership = function(raw){return findBranch(raw);};
  
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
