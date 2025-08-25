/***** 1) 保留原本：所有外開連結在 App 內開 *****/
const hookClick = (e) => {
  const a = e.target.closest('a[href]');
  const baseBlank = document.querySelector('head base[target="_blank"]');
  if ((a && a.target === '_blank') || (a && baseBlank)) {
    e.preventDefault(); location.href = a.href;
  }
};
window.open = (url)=>{ location.href = url; };
document.addEventListener('click', hookClick, { capture:true });

/***** 2) TV 觀感與可點元素初始化 *****/
(() => {
  const css = document.createElement('style');
  css.textContent = `
    html,body{font-size:20px;line-height:1.5}
    a,button,input,select,textarea,video{outline:0}
    *:focus{box-shadow:0 0 0 3px #2ea3ff99 !important;border-radius:6px}
    ::-webkit-scrollbar{width:0;height:0}
    .tv-help{position:fixed;right:12px;bottom:12px;padding:6px 10px;background:#0008;color:#fff;font-size:12px;border-radius:6px}
  `;
  document.head.appendChild(css);

  // 讓「看起來可點」的東西都能被聚焦
  const clickableSel = 'a,button,[role="button"],input,select,textarea,video';
  document.querySelectorAll(clickableSel).forEach(el=>{
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
  });

  // 頁面第一次載入時，把焦點放到第一個元素
  const first = document.querySelector(clickableSel);
  if (first) first.focus();

  // 小提示 (可刪)
  const tip = document.createElement('div');
  tip.className = 'tv-help';
  tip.textContent = '↑↓頁面捲動／全螢幕時調音量｜←→ 快退/快進｜OK=點擊/播放｜返回=退出全螢幕或上一頁';
  setTimeout(()=> tip.remove(), 5000);
  document.body.appendChild(tip);
})();

/***** 3) 空間導覽：用方向鍵選「該方向最近的元素」 *****/
function rectCenter(r){ return {x:r.left+r.width/2, y:r.top+r.height/2}; }
function focusables(){
  const sel='a,button,[role="button"],input,select,textarea,[tabindex]:not([tabindex="-1"]),video';
  return Array.from(document.querySelectorAll(sel))
    .filter(el=>{
      const s=getComputedStyle(el);
      const r=el.getBoundingClientRect();
      return s.display!=='none' && s.visibility!=='hidden' && r.width>4 && r.height>4 && !el.disabled;
    });
}
function bestInDirection(dir){
  const list = focusables(); if(!list.length) return null;
  const cur  = document.activeElement && list.includes(document.activeElement)
               ? document.activeElement : null;
  const cb   = cur ? cur.getBoundingClientRect() : {left:0,top:0,width:0,height:0};
  const c    = cur ? rectCenter(cb) : {x:window.innerWidth/2, y:window.innerHeight/3};
  let best=null, bestScore=Infinity;
  for(const el of list){
    if (el===cur) continue;
    const r = el.getBoundingClientRect(), p = rectCenter(r);
    const dx = p.x - c.x, dy = p.y - c.y;
    // 方向過濾
    if (dir==='right' && dx<=4) continue;
    if (dir==='left'  && dx>=-4) continue;
    if (dir==='down'  && dy<=4) continue;
    if (dir==='up'    && dy>=-4) continue;
    // 分數：方向夠正 + 距離近
    const ang = Math.atan2(Math.abs(dir==='left'||dir==='right'?dy:dx), Math.abs(dir==='left'||dir==='right'?dx:dy));
    const dist = Math.hypot(dx,dy);
    const score = ang*200 + dist; // 角度越小越好，其次距離
    if (score < bestScore) { bestScore=score; best=el; }
  }
  return best;
}
function move(dir){
  const target = bestInDirection(dir);
  if (target){
    target.focus(); target.scrollIntoView({block:'center', inline:'center', behavior:'smooth'});
  }else{
    // 沒有更好的目標時 → 捲動頁面
    const dy = (dir==='down'?1:dir==='up'?-1:0)*window.innerHeight*0.6;
    if (dy) window.scrollBy({top:dy, behavior:'smooth'});
  }
}

/***** 4) 影片輔助：自動播放/全螢幕、快進快退、長按 *****/
function video(){ return document.querySelector('video'); }
function autoPlayFull(){
  const v = video(); if(!v) return;
  const go = ()=>{ v.play().catch(()=>{}); v.requestFullscreen?.().catch(()=>{}); };
  (v.readyState>=2)?go():v.addEventListener('canplay', go, {once:true});
}
document.addEventListener('DOMContentLoaded', autoPlayFull);

// 長按左右連續快轉
let seekTimer=null;
function startSeek(delta){
  stopSeek();
  seekTimer=setInterval(()=>{
    const v=video(); if(v&&document.fullscreenElement){ v.currentTime = Math.max(0, Math.min((v.currentTime||0)+delta, v.duration||1)); }
  }, 200);
}
function stopSeek(){ if(seekTimer){ clearInterval(seekTimer); seekTimer=null; }}

/***** 5) 遙控器鍵位 *****/
document.addEventListener('keydown', (e)=>{
  const v = video();
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = /INPUT|TEXTAREA|SELECT/.test(tag);

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Backspace','Escape',' '].includes(e.key)) e.preventDefault();

  if (e.key==='ArrowRight'){
    if (v && document.fullscreenElement){ v.currentTime = Math.min((v.currentTime||0)+10, v.duration||1); }
    else move('right');
  }
  else if (e.key==='ArrowLeft'){
    if (v && document.fullscreenElement){ v.currentTime = Math.max(0,(v.currentTime||0)-10); }
    else move('left');
  }
  else if (e.key==='ArrowDown'){
    if (v && document.fullscreenElement){ v.volume=Math.max(0,Math.min(1,(v.volume||0.8)-0.05)); }
    else move('down');
  }
  else if (e.key==='ArrowUp'){
    if (v && document.fullscreenElement){ v.volume=Math.max(0,Math.min(1,(v.volume||0.8)+0.05)); }
    else move('up');
  }
  else if (e.key==='Enter'){
    if (!typing){
      if (document.activeElement && document.activeElement.tagName==='VIDEO'){ v && (v.paused ? v.play().catch(()=>{}) : v.pause()); }
      else { document.activeElement?.click(); }
    }
  }
  else if (e.key===' ' && v){ v.paused ? v.play().catch(()=>{}) : v.pause(); }
  else if (e.key==='Escape' || e.key==='Backspace'){
    if (document.fullscreenElement){ document.exitFullscreen().catch(()=>{}); }
    else if (history.length>1){ history.back(); }
  }

  // 數字鍵 0~9：跳指定百分比
  if (/^[0-9]$/.test(e.key) && v && v.duration){
    v.currentTime = v.duration * (parseInt(e.key,10)/10);
  }
}, true);

// 監聽長按左右
document.addEventListener('keydown', (e)=>{
  if (e.repeat && (e.key==='ArrowLeft' || e.key==='ArrowRight')){
    startSeek(e.key==='ArrowRight'?+2:-2); // 長按加速：每 0.2s 跳 2s
  }
});
document.addEventListener('keyup', (e)=>{
  if (e.key==='ArrowLeft' || e.key==='ArrowRight') stopSeek();
});

/***** 6) 強制把 target=_blank 轉成 _self（避免外跳） *****/
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('a[target="_blank"]').forEach(a=>a.setAttribute('target','_self'));
});
