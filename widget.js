/* =========================================================
   RAAJ MULTIMEDIA - Embeddable Shop Widget v1.0
   Partners embed with ONE line of code:
   <script src="https://yoursite.com/widget.js" data-agent="RAAJ10"></script>
   ========================================================= */

(function(){
  'use strict';

  /* --- BRAND CONSTANTS --- */
  const BRAND='RAAJ MULTIMEDIA';const SUBTITLE='Raaj Data Data Services';
  const PRIMARY='0241113791';const SECONDARY='0208094005';
  const MOMO_NAME='Mohammed A. Suraj';const CEO='M. S. Abubakar';
  const NET_COLORS={MTN:'#FFC300',Telecel:'#E4002B',AirtelTigo:'#0066B3'};
  const NET_TEXT={MTN:'#000',Telecel:'#fff',AirtelTigo:'#fff'};

  /* --- DEFAULT PRICES (fallback when Supabase unavailable) --- */
  const DEFAULT_BUNDLES={
    MTN:[{gb:1,price:5},{gb:2,price:9},{gb:3,price:13},{gb:5,price:21},{gb:8,price:32},{gb:10,price:39},{gb:15,price:57},{gb:20,price:74},{gb:30,price:108},{gb:50,price:175},{gb:100,price:320}],
    Telecel:[{gb:1,price:6},{gb:2,price:10},{gb:3,price:15},{gb:5,price:23},{gb:10,price:42},{gb:15,price:60},{gb:20,price:78},{gb:30,price:112},{gb:50,price:180},{gb:100,price:330}],
    AirtelTigo:[{gb:1,price:5},{gb:2,price:9},{gb:5,price:22},{gb:8,price:33},{gb:10,price:40},{gb:15,price:58},{gb:20,price:76},{gb:30,price:110},{gb:50,price:178},{gb:100,price:325}]
  };
  const DEFAULT_CHECKERS={WASSCE:{price:25,stock:0},BECE:{price:15,stock:0},CSSPS:{price:10,stock:0}};
  const DEFAULT_AIRTIME={MTN:{min:1,max:500,on:true},Telecel:{min:1,max:500,on:true},AirtelTigo:{min:1,max:500,on:true}};

  /* --- CONFIG FROM SCRIPT TAG --- */
  const scripts=document.querySelectorAll('script[src*="widget.js"]');
  const tag=scripts[scripts.length-1]||document.currentScript;
  const agentCode=(tag?.dataset?.agent||tag?.getAttribute('data-agent')||'').toUpperCase();
  const supaUrl=tag?.dataset?.supabaseUrl||tag?.getAttribute('data-supabase-url')||'https://hvqhxfnhnqgxlasgllwf.supabase.co';
  const supaKey=tag?.dataset?.supabaseKey||tag?.getAttribute('data-supabase-key')||'';
  const shopUrl=tag?.dataset?.shopUrl||tag?.getAttribute('data-shop-url')||'';
  const widgetTheme=tag?.dataset?.theme||tag?.getAttribute('data-theme')||'dark';
  const widgetWidth=tag?.dataset?.width||tag?.getAttribute('data-width')||'100%';
  const widgetHeight=tag?.dataset?.height||tag?.getAttribute('data-height')||'';

  /* --- STATE --- */
  let bundles=JSON.parse(JSON.stringify(DEFAULT_BUNDLES));
  let checkers=JSON.parse(JSON.stringify(DEFAULT_CHECKERS));
  let airtime=JSON.parse(JSON.stringify(DEFAULT_AIRTIME));
  let afaEnabled=true, afaAmount=35, afaMode='manual', afaMomoNumber=PRIMARY, afaMomoName=MOMO_NAME, afaPaystackLink='';
  let bundlesMode='redirect', redirectPrimary='https://cheapdata.shop/shop/raaj-data-services-1772546369430';
  let redirectSecondary='https://agent.budgetdata.store/raajdataservices';
  let redirectToggle=true, airtimeRedirectToggle=true;
  let announcements=[], adverts=[];
  let activeTab='Data';

  /* --- FETCH LIVE DATA FROM SUPABASE --- */
  async function fetchLiveConfig(){
    try{
      if(!supaUrl||!supaKey)return;
      const{createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase=createClient(supaUrl,supaKey);

      // Fetch products (bundles)
      const{data:products}=await supabase.from('products').select('*').eq('available',true).order('price');
      if(products&&products.length>0){
        let newB={MTN:[],Telecel:[],AirtelTigo:[]};
        for(let p of products){
          if(p.network==='Services')continue;
          let gb=parseInt((p.size||p.bundle||'').replace('GB',''));if(isNaN(gb))continue;
          if(!newB[p.network])newB[p.network]=[];
          if(!newB[p.network].find(x=>x.gb===gb))newB[p.network].push({gb,price:p.price});
        }
        for(let k of Object.keys(newB)){newB[k].sort((a,b)=>a.gb-b.gb)}
        if(newB.MTN.length>0||newB.Telecel.length>0)bundles=newB;

        // Extract checkers from Services rows
        for(let p of products){
          if(p.network==='Services'){
            const name=(p.size||p.bundle||'').replace(' Checker','');
            if(DEFAULT_CHECKERS[name])checkers[name]={price:p.price,stock:checkers[name]?.stock||0};
          }
        }
      }

      // Try to fetch store config from a settings table (optional)
      try{
        const{data:cfg}=await supabase.from('store_config').select('*').limit(1).single();
        if(cfg){
          if(cfg.bundles_mode)bundlesMode=cfg.bundles_mode;
          if(cfg.redirect_primary)redirectPrimary=cfg.redirect_primary;
          if(cfg.redirect_secondary)redirectSecondary=cfg.redirect_secondary;
          if(cfg.afa_enabled!==undefined)afaEnabled=cfg.afa_enabled;
          if(cfg.afa_amount)afaAmount=cfg.afa_amount;
          if(cfg.afa_mode)afaMode=cfg.afa_mode;
          if(cfg.redirect_toggle!==undefined)redirectToggle=cfg.redirect_toggle;
          if(cfg.airtime_redirect_toggle!==undefined)airtimeRedirectToggle=cfg.airtime_redirect_toggle;
        }
      }catch(e){/* store_config table may not exist */}

      renderWidget();
    }catch(e){
      console.log('[Raaj Widget] Cloud fetch failed, using defaults',e.message);
      renderWidget();
    }
  }

  /* --- BUILD SHOP URL --- */
  function getShopUrl(){
    if(shopUrl)return shopUrl;
    // Try to detect from script src
    if(tag&&tag.src){
      const u=new URL(tag.src,window.location.href);
      return u.origin+(u.pathname.replace('/widget.js',''));
    }
    return '';
  }

  /* --- CONTAINER --- */
  const container=document.createElement('div');
  container.id='raaj-widget-container';
  container.style.cssText=`width:${widgetWidth};${widgetHeight?'height:'+widgetHeight+';':''}margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`;
  tag?.parentNode?.insertBefore(container,tag?.nextSibling)||document.body.appendChild(container);

  // Shadow DOM for style isolation
  const shadow=container.attachShadow({mode:'open'});
  const style=document.createElement('style');
  style.textContent=`
    :host{display:block;--bg:#0a0a0a;--card:#111;--border:rgba(255,255,255,.1);--text:#fff;--muted:rgba(255,255,255,.5);--accent:#FFC300;--radius:16px;}
    *{margin:0;padding:0;box-sizing:border-box}
    .rw{background:var(--bg);color:var(--text);border-radius:var(--radius);overflow:hidden;max-width:480px;margin:0 auto}
    .rw-head{background:#000;padding:16px 20px;border-bottom:1px solid var(--border)}
    .rw-head h1{font-size:18px;font-weight:800}
    .rw-head h1 span{color:var(--accent)}
    .rw-head p{font-size:11px;color:var(--muted);margin-top:2px}
    .rw-head .badge{display:inline-block;background:var(--accent);color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;margin-top:6px}
    .rw-announce{background:rgba(255,195,0,.1);border-bottom:1px solid rgba(255,195,0,.2);padding:10px 16px;font-size:11px;color:var(--accent)}
    .rw-tabs{display:flex;gap:4px;padding:10px 16px;overflow-x:auto;background:#000;border-bottom:1px solid var(--border)}
    .rw-tab{height:32px;padding:0 14px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;white-space:nowrap;transition:all .2s}
    .rw-tab.active{background:var(--accent);color:#000;border-color:var(--accent)}
    .rw-body{padding:16px;min-height:200px}
    .rw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
    .rw-card{border-radius:12px;padding:14px 12px;text-align:center;cursor:pointer;transition:transform .15s,box-shadow .15s;position:relative;overflow:hidden}
    .rw-card:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,.4)}
    .rw-card .gb{font-size:20px;font-weight:800;line-height:1.1}
    .rw-card .price{font-size:13px;font-weight:700;margin-top:4px}
    .rw-card .net{font-size:9px;font-weight:700;opacity:.7;margin-top:2px}
    .rw-card.oos{opacity:.4;pointer-events:none}
    .rw-card.oos::after{content:'SOLD OUT';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-20deg);font-size:11px;font-weight:900;color:red;background:rgba(0,0,0,.7);padding:4px 12px;border-radius:4px}
    .rw-section{margin-bottom:20px}
    .rw-section-title{font-size:13px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .rw-section-title .dot{width:8px;height:8px;border-radius:50%}
    .rw-input{width:100%;height:40px;border-radius:10px;background:#000;border:1px solid var(--border);padding:0 12px;color:var(--text);font-size:13px;outline:none}
    .rw-input:focus{border-color:var(--accent)}
    .rw-input::placeholder{color:var(--muted)}
    .rw-btn{width:100%;height:44px;border-radius:22px;font-size:13px;font-weight:700;border:none;cursor:pointer;transition:transform .15s}
    .rw-btn:hover{transform:scale(1.02)}
    .rw-btn-primary{background:var(--accent);color:#000}
    .rw-btn-outline{background:transparent;color:var(--text);border:1px solid var(--border)}
    .rw-form{margin-top:12px}
    .rw-form-row{margin-bottom:10px}
    .rw-form-row label{display:block;font-size:10px;color:var(--muted);margin-bottom:4px;font-weight:700;text-transform:uppercase}
    .rw-foot{padding:12px 16px;border-top:1px solid var(--border);text-align:center;font-size:10px;color:var(--muted)}
    .rw-foot a{color:var(--accent);text-decoration:none}
    .rw-ad{background:rgba(255,195,0,.05);border:1px solid rgba(255,195,0,.15);border-radius:12px;padding:14px;margin-bottom:14px}
    .rw-ad h3{font-size:13px;font-weight:700;color:var(--accent)}
    .rw-ad p{font-size:11px;color:var(--muted);margin-top:4px}
    .rw-ad a{display:inline-block;margin-top:8px;background:var(--accent);color:#000;padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;text-decoration:none}
    .rw-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111;color:var(--text);padding:12px 24px;border-radius:14px;font-size:12px;font-weight:700;z-index:99999;box-shadow:0 4px 30px rgba(0,0,0,.5);animation:rwToastIn .3s ease}
    @keyframes rwToastIn{from{transform:translateX(-50%) translateY(20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
    .rw-checker-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .rw-checker-card{background:#000;border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center}
    .rw-checker-card h4{font-size:13px;font-weight:700}
    .rw-checker-card .c-price{font-size:16px;font-weight:800;color:var(--accent);margin-top:4px}
    .rw-checker-card .c-stock{font-size:10px;margin-top:4px}
    .rw-afa-form{max-width:300px;margin:0 auto}
    .rw-airtime-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .rw-airtime-card{background:#000;border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center}
    .rw-airtime-card h4{font-size:13px;font-weight:700}
    .rw-ml{font-size:9px;color:var(--muted);margin-top:4px}
    .rw-phone-input{margin:12px 0}
    .rw-loader{text-align:center;padding:40px;color:var(--muted);font-size:13px}
    .rw-loader .spin{display:inline-block;width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:rwSpin .8s linear infinite}
    @keyframes rwSpin{to{transform:rotate(360deg)}}
  `;
  shadow.appendChild(style);

  const widgetRoot=document.createElement('div');
  widgetRoot.className='rw';
  shadow.appendChild(widgetRoot);

  /* --- TOAST --- */
  function showToast(msg){
    const t=document.createElement('div');
    t.className='rw-toast';t.textContent=msg;
    shadow.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300)},2500);
  }

  /* --- PURCHASE HANDLERS --- */
  function buyBundle(network,gb,price){
    const phone=prompt('Enter phone number (e.g. 024XXXXXXX):');
    if(!phone||phone.length<10){showToast('Invalid phone number');return}

    // Create transaction ID
    const txId='TX-'+Date.now().toString(36).toUpperCase();

    if(bundlesMode==='redirect'&&redirectToggle){
      // Redirect mode: go to cheapdata/budgetdata
      const redirectUrl=redirectPrimary+'?network='+network+'&bundle='+gb+'GB&phone='+phone+(agentCode?'&ref='+agentCode:'');
      showToast('Redirecting to purchase...');
      setTimeout(()=>window.open(redirectUrl,'_blank'),500);
    }else if(shopUrl||getShopUrl()){
      // Hybrid/Paystack: redirect to main shop with pre-filled params
      const shopBase=getShopUrl();
      const shopLink=shopBase+(shopBase.includes('index.html')?'':'index.html')+'?widget=1&network='+network+'&gb='+gb+'&phone='+phone+(agentCode?'&ref='+agentCode:'');
      showToast('Opening shop...');
      setTimeout(()=>window.open(shopLink,'_blank'),500);
    }else{
      // Fallback: show MoMo instructions
      showToast('Pay GH¢'+price+' to '+PRIMARY+' ('+MOMO_NAME+'). Ref: '+phone);
      alert('Send GH¢'+price+' to '+PRIMARY+' ('+MOMO_NAME+')\nReference: '+phone+'\nNetwork: '+network+'\nBundle: '+gb+'GB\n\nThen WhatsApp 0241113791 your payment screenshot.');
    }

    // Track this transaction (for agent commission)
    trackTx(txId,'data',network,gb,price,phone);
  }

  function buyAirtime(network){
    const amount=parseFloat(prompt('Enter airtime amount (GH¢):'));
    if(!amount||amount<1){showToast('Enter valid amount');return}
    const cfg=airtime[network]||{min:1,max:500};
    if(amount<cfg.min||amount>cfg.max){showToast('Amount must be GH¢'+cfg.min+'-'+cfg.max);return}
    const phone=prompt('Phone number to credit:');
    if(!phone||phone.length<10){showToast('Invalid phone');return}

    if(airtimeRedirectToggle&&bundlesMode==='redirect'&&redirectToggle){
      showToast('Redirecting...');
      const redirectUrl=redirectPrimary+'?network='+network+'&bundle=Airtime&phone='+phone+'&amount='+amount+(agentCode?'&ref='+agentCode:'');
      setTimeout(()=>window.open(redirectUrl,'_blank'),500);
    }else if(getShopUrl()){
      const shopBase=getShopUrl();
      const shopLink=shopBase+(shopBase.includes('index.html')?'':'index.html')+'?widget=1&tab=Airtime&network='+network+'&phone='+phone+'&amount='+amount+(agentCode?'&ref='+agentCode:'');
      showToast('Opening shop...');
      setTimeout(()=>window.open(shopLink,'_blank'),500);
    }else{
      showToast('Pay GH¢'+amount+' to '+PRIMARY);
      alert('Send GH¢'+amount+' to '+PRIMARY+' ('+MOMO_NAME+')\nRef: '+phone+'\nFor: '+network+' Airtime\n\nWhatsApp 0241113791 screenshot.');
    }
    trackTx('AT-'+Date.now().toString(36).toUpperCase(),'airtime',network,amount,amount,phone);
  }

  function buyChecker(name){
    if(!checkers[name]||checkers[name].stock<=0){showToast('Out of stock');return}
    const phone=prompt('Enter phone number:');
    if(!phone||phone.length<10){showToast('Invalid phone');return}
    const price=checkers[name].price;

    if(getShopUrl()){
      const shopBase=getShopUrl();
      const shopLink=shopBase+(shopBase.includes('index.html')?'':'index.html')+'?widget=1&tab=Checkers&checker='+name+'&phone='+phone+(agentCode?'&ref='+agentCode:'');
      showToast('Opening shop...');
      setTimeout(()=>window.open(shopLink,'_blank'),500);
    }else{
      showToast('Pay GH¢'+price+' to '+PRIMARY);
      alert('Send GH¢'+price+' to '+PRIMARY+' ('+MOMO_NAME+')\nReference: '+phone+'\nFor: '+name+' Result Checker\n\nWhatsApp 0241113791 screenshot.');
    }
    trackTx('CK-'+Date.now().toString(36).toUpperCase(),'checker','Services',name,price,phone);
  }

  function submitAFA(){
    const name=prompt('Full Name (as on Ghana Card):');
    if(!name)return;
    const phone=prompt('Phone Number:');
    if(!phone)return;
    const ghCard=prompt('Ghana Card Number:');
    if(!ghCard)return;
    const dob=prompt('Date of Birth (DD/MM/YYYY):');
    if(!dob)return;

    if(afaMode==='paystack'&&afaPaystackLink){
      showToast('Redirecting to payment...');
      const link=afaPaystackLink+'?name='+encodeURIComponent(name)+'&phone='+encodeURIComponent(phone)+'&ghcard='+encodeURIComponent(ghCard)+'&dob='+encodeURIComponent(dob)+(agentCode?'&ref='+agentCode:'');
      setTimeout(()=>window.open(link,'_blank'),500);
    }else if(getShopUrl()){
      const shopBase=getShopUrl();
      const shopLink=shopBase+(shopBase.includes('index.html')?'':'index.html')+'?widget=1&tab=AFA&name='+encodeURIComponent(name)+'&phone='+encodeURIComponent(phone)+'&ghcard='+encodeURIComponent(ghCard)+'&dob='+encodeURIComponent(dob)+(agentCode?'&ref='+agentCode:'');
      showToast('Opening shop...');
      setTimeout(()=>window.open(shopLink,'_blank'),500);
    }else{
      showToast('Pay GH¢'+afaAmount+' to '+PRIMARY);
      alert('Send GH¢'+afaAmount+' to '+PRIMARY+' ('+MOMO_NAME+')\nReference: '+phone+'\nFor: AFA Registration\n\nThen WhatsApp 0241113791 with:\n- Name: '+name+'\n- Ghana Card: '+ghCard+'\n- DOB: '+dob);
    }
    trackTx('AFA-'+Date.now().toString(36).toUpperCase(),'afa','AFA','Registration',afaAmount,phone);
  }

  /* --- TRACK TRANSACTION (sends to parent shop if available) --- */
  function trackTx(id,product,network,gb,price,phone){
    const tx={id,product,network,gb,price,phone,agentCode,date:new Date().toISOString(),status:product==='data'&&bundlesMode==='redirect'?'Processing':'Pending'};
    // Try to post to parent shop's Supabase
    if(supaUrl&&supaKey){
      try{
        fetch(supaUrl+'/rest/v1/transactions',{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':supaKey,'Authorization':'Bearer '+supaKey,'Prefer':'return=minimal'},
          body:JSON.stringify(tx)
        }).catch(()=>{});
      }catch(e){}
    }
    console.log('[Raaj Widget] Transaction:',tx);
  }

  /* --- RENDER --- */
  function renderWidget(){
    const activeAnnouncement=announcements.find(a=>a.target==='customers'&&a.active!==false);
    const activeAdverts=adverts.filter(a=>a.active!==false);

    let html=`<div class="rw-head">
      <h1><span>${BRAND.split(' ')[0]}</span> ${BRAND.split(' ').slice(1).join(' ')}</h1>
      <p>${SUBTITLE}</p>
      ${agentCode?`<span class="badge">Agent: ${agentCode}</span>`:'<span class="badge">Official Partner</span>'}
    </div>`;

    // Announcement banner
    if(activeAnnouncement){
      html+=`<div class="rw-announce">📢 ${activeAnnouncement.message}</div>`;
    }

    // Tabs
    const tabs=['Data','Airtime','Checkers','AFA'];
    if(!afaEnabled)tabs.splice(tabs.indexOf('AFA'),1);
    html+=`<div class="rw-tabs">${tabs.map(t=>`<button class="rw-tab ${activeTab===t?'active':''}" onclick="this.getRootNode().host.__setTab('${t}')">${t}</button>`).join('')}</div>`;

    html+=`<div class="rw-body">`;

    // Active adverts
    if(activeAdverts.length>0&&activeTab==='Data'){
      for(const ad of activeAdverts.slice(0,1)){
        html+=`<div class="rw-ad"><h3>${ad.title||''}</h3><p>${ad.body||''}</p>${ad.cta?`<a href="${ad.cta_link||'#'}" target="_blank">${ad.cta}</a>`:''}</div>`;
      }
    }

    // DATA TAB
    if(activeTab==='Data'){
      for(const net of['MTN','Telecel','AirtelTigo']){
        const b=bundles[net]||[];
        if(b.length===0)continue;
        const color=NET_COLORS[net];const textColor=NET_TEXT[net];
        html+=`<div class="rw-section"><div class="rw-section-title"><span class="dot" style="background:${color}"></span>${net} Data Bundles</div>`;
        html+=`<div class="rw-grid">`;
        for(const bundle of b){
          html+=`<div class="rw-card" style="background:${color};color:${textColor}" onclick="this.getRootNode().host.__buyBundle('${net}',${bundle.gb},${bundle.price})">
            <div class="gb">${bundle.gb}GB</div>
            <div class="price">GH¢${bundle.price}</div>
            <div class="net">${net}</div>
          </div>`;
        }
        html+=`</div></div>`;
      }
    }

    // AIRTIME TAB
    else if(activeTab==='Airtime'){
      html+=`<div class="rw-section"><div class="rw-section-title">📱 Buy Airtime</div>`;
      html+=`<div class="rw-airtime-grid">`;
      for(const net of['MTN','Telecel','AirtelTigo']){
        const cfg=airtime[net]||{min:1,max:500,on:true};
        const color=NET_COLORS[net];
        if(!cfg.on){
          html+=`<div class="rw-airtime-card rw-card oos" style="border-color:${color}"><h4 style="color:${color}">${net}</h4><div class="c-price">Out of Stock</div></div>`;
        }else{
          html+=`<div class="rw-airtime-card" style="border-color:${color}" onclick="this.getRootNode().host.__buyAirtime('${net}')">
            <h4 style="color:${color}">${net}</h4>
            <div class="c-price" style="color:${color}">Buy Airtime</div>
            <div class="rw-ml">GH¢${cfg.min} - GH¢${cfg.max}</div>
          </div>`;
        }
      }
      html+=`</div></div>`;
    }

    // CHECKERS TAB
    else if(activeTab==='Checkers'){
      html+=`<div class="rw-section"><div class="rw-section-title">🎓 Result Checkers</div>`;
      html+=`<div class="rw-checker-grid">`;
      for(const[name,cfg]of Object.entries(checkers)){
        const inStock=cfg.stock>0;
        html+=`<div class="rw-checker-card ${inStock?'':'oos'}" ${inStock?`onclick="this.getRootNode().host.__buyChecker('${name}')"`:''} >
          <h4>${name}</h4>
          <div class="c-price">GH¢${cfg.price}</div>
          <div class="c-stock" style="color:${inStock?'#10b981':'#ef4444'}">${inStock?'✅ In Stock ('+cfg.stock+')':'❌ Out of Stock'}</div>
        </div>`;
      }
      html+=`</div></div>`;
    }

    // AFA TAB
    else if(activeTab==='AFA'&&afaEnabled){
      html+=`<div class="rw-section"><div class="rw-section-title">🇬🇭 AFA Registration</div>
      <div class="rw-afa-form">
        <div class="rw-form-row"><label>Full Name (as on Ghana Card)</label><input class="rw-input" id="rw-afa-name" placeholder="e.g. Mohammed Suraj"></div>
        <div class="rw-form-row"><label>Phone Number</label><input class="rw-input" id="rw-afa-phone" placeholder="024XXXXXXX"></div>
        <div class="rw-form-row"><label>Ghana Card Number</label><input class="rw-input" id="rw-afa-ghcard" placeholder="GHA-XXXXXXXXX-X"></div>
        <div class="rw-form-row"><label>Date of Birth</label><input class="rw-input" id="rw-afa-dob" placeholder="DD/MM/YYYY"></div>
        <div style="margin:12px 0;padding:12px;background:#000;border-radius:10px;border:1px solid rgba(255,255,255,.1)">
          <div style="font-size:12px;font-weight:700">Amount: <span style="color:#FFC300">GH¢${afaAmount}</span></div>
          <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:4px">Pay to: <b>${afaMomoNumber}</b> (${afaMomoName})<br>Use your phone number as reference</div>
        </div>
        <button class="rw-btn rw-btn-primary" onclick="this.getRootNode().host.__submitAFA()">Register AFA - GH¢${afaAmount}</button>
      </div></div>`;
    }

    html+=`</div>`; // close rw-body

    // Footer
    html+=`<div class="rw-foot">
      ${BRAND} | ${SUBTITLE}<br>
      📞 ${PRIMARY} | ${SECONDARY}<br>
      📍 Bolgatanga, Upper East Region | CEO: ${CEO}<br>
      <a href="https://wa.me/233${PRIMARY.slice(1)}" target="_blank">WhatsApp Us</a>
    </div>`;

    widgetRoot.innerHTML=html;
  }

  /* --- EXPOSE FUNCTIONS FOR ONCLICK --- */
  container.__setTab=function(t){activeTab=t;renderWidget()};
  container.__buyBundle=buyBundle;
  container.__buyAirtime=buyAirtime;
  container.__buyChecker=buyChecker;
  container.__submitAFA=function(){
    // Read from shadow DOM inputs if available
    const nameEl=shadow.getElementById('rw-afa-name');
    const phoneEl=shadow.getElementById('rw-afa-phone');
    const ghEl=shadow.getElementById('rw-afa-ghcard');
    const dobEl=shadow.getElementById('rw-afa-dob');

    if(nameEl&&nameEl.value&&phoneEl&&phoneEl.value){
      // Form-based AFA
      const name=nameEl.value,phone=phoneEl.value,ghCard=ghEl?.value||'',dob=dobEl?.value||'';
      if(phone.length<10){showToast('Enter valid phone');return}
      if(afaMode==='paystack'&&afaPaystackLink){
        showToast('Redirecting to payment...');
        const link=afaPaystackLink+'?name='+encodeURIComponent(name)+'&phone='+encodeURIComponent(phone)+'&ghcard='+encodeURIComponent(ghCard)+'&dob='+encodeURIComponent(dob)+(agentCode?'&ref='+agentCode:'');
        setTimeout(()=>window.open(link,'_blank'),500);
      }else{
        showToast('Pay GH¢'+afaAmount+' to '+PRIMARY);
        alert('Send GH¢'+afaAmount+' to '+afaMomoNumber+' ('+afaMomoName+')\nReference: '+phone+'\nFor: AFA Registration\n\nThen WhatsApp '+PRIMARY+' with:\n- Name: '+name+'\n- Ghana Card: '+ghCard+'\n- DOB: '+dob);
      }
      trackTx('AFA-'+Date.now().toString(36).toUpperCase(),'afa','AFA','Registration',afaAmount,phone);
    }else{
      submitAFA(); // fallback to prompt-based
    }
  };

  /* --- LOADING STATE --- */
  widgetRoot.innerHTML=`<div class="rw-loader"><div class="spin"></div><br>Loading ${BRAND}...</div>`;

  /* --- FETCH & RENDER --- */
  fetchLiveConfig();

  /* --- AUTO-REFRESH (every 5 min) --- */
  setInterval(fetchLiveConfig,300000);

  /* --- EXPOSE FOR EXTERNAL CONTROL --- */
  window.RaajWidget={
    refresh:fetchLiveConfig,
    setTab:function(t){activeTab=t;renderWidget()},
    getAgentCode:()=>agentCode,
    getBundles:()=>bundles
  };

})();