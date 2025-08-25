/***** 0) 內開連結（保留你原本的行為） *****/
const hookClick = (e) => {
  const a = e.target.closest('a[href]');
  const baseBlank = document.querySelector('head base[target="_blank"]');
  if ((a && a.target === '_blank') || (a && baseBlank)) {
    e.preventDefault(); location.href = a.href;
  }
};
window.open = (url)=>{ location.href = url; };
document.addEventListener('click', hookClick, { capture:true });

/***** 1) 螢幕常亮（替代 WAKE_LOCK 權限） *****/
(async function keepAwake(){
  if ('wakeLock' in navigator) {
    let lock;
    const req = async ()=>{ try { lock = await navigator.wakeLock.request('screen'); } catch(e){} };
    const rel = ()=>{ try { lock && lock.release && lock.release(); } catch(e){} };
    document.addEventListener('visibilitychange', ()=> {
      if (document.visibilityState === 'visible') req(); else rel();
    });
    await req();
  }
})();

/***** 2) UI 放大 + 焦點樣式 + 讓頂部導航可聚焦 *****/
(() => {
  const css = document.createElement('style');
  css.textContent = `
    html,body{font-size:20px;line-height:1.5}
    a,button,input,select,textarea,video{outline:0}
    *:focus{box-shadow:0 0 0 3px #2ea3ff99 !important;border-radius:6px}
    ::-webkit-scrollbar{width:0;height:0}
    header a, header button, .nav a, .menu a { padding:8px 12px; display:inline-block }
  `;
  document.head.appendChild(css);

  const topSel = [
    'header nav a','.nav a','.menu a',
    'header a','header button',
    'input[type="search"]','input[placeholder*="搜"]'
  ].join(',');
  document.querySelectorAll(topSel).forEach(el=>{
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
  });
})();

/***** 3) 封面圖修復（lazyload / 防盜鏈 / srcset） *****/
function fixOneImg(img){
  if (!img) return;
  const isPlaceholder = (s)=> !s || /placeholder|data:image\/svg|base64/i.test(s);
  const cur = img.getAttribute('src');
  const ds  = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-url');
  const ss  = img.getAttribute('data-srcset') || img.getAttribute('srcset');

  if (isPlaceholder(cur) && ds) img.setAttribute('src', ds);
  if (ss && !img.getAttribute('srcset')) img.setAttribute('srcset', ss);

  img.loading = 'eager';
  img.referrerPolicy = 'no-referrer';
  img.crossOrigin = 'anonymous';

  img.addEventListener('error', async ()=>{
    try{
      const url = ds || cur || (ss ? ss.split(' ')[0] : '');
      if (!url) return;
      const res = await fetch(url, {mode:'cors', credentials:'omit'});
      if (!res.ok) return;
      const blob = await res.blob();
      img.src = URL.createObjectURL(blob);
    }catch(e){}
  }, {once:true});
}
function forceLoadImages(){
  document.querySelectorAll('img').forEach(fixOneImg);
  window.dispatchEvent(new Event('scroll'));
  window.dispatchEvent(new Event('resize'));
  window.scrollBy(0,1); window.scrollBy(0,-1);
}
document.addEventListener('DOMContentLoaded', ()=>setTimeout(forceLoadImages, 300));
setInterval(forceLoadImages, 2000);

/***** 4) 空間導覽（方向鍵找最近元素） *****/
function rectCenter(r){ return {x:r.left+r.width/2, y:r.top+r.height/2}; }
function focusables(){
  const sel='a,button,[role="button"],input,select,textarea,[tabindex]:not([tabindex="-1"]),video';
  return Array.from(document.querySelectorAll(sel))
    .filter(el=>{
      const s=getComputedStyle(el), r=el.getBoundingClientRect();
      return s.display!=='none' && s.visibility!=='hidden' && r.width>4 && r.height>4 && !el.disabled;
    });
}
function bestInDirection(dir){
  const list = focusables(); if(!list.length) return null;
  const cur  = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null;
  const cb   = cur ? cur.getBoundingClientRect() : {left:0,top:0,width:0,height:0};
  const c    = cur ? rectCenter(cb) : {x:window.innerWidth/2, y:window.innerHeight/3};
  let best=null, bestScore=Infinity;
  for(const el of list){
    if (el===cur) continue;
    const r = el.getBoundingClientRect(), p = rectCenter(r);
    const dx = p.x - c.x, dy = p.y - c.y;
    if (dir==='right' && dx<=4) continue;
    if (dir==='left'  && dx>=-4) continue;
    if (dir==='down'  && dy<=4) continue;
    if (dir==='up'    && dy>=-4) continue;
    const ang = Math.atan2(Math.abs(dir==='left'||dir==='right'?dy:dx), Math.abs(dir==='left'||dir==='right'?dx:dy));
    const dist = Math.hypot(dx,dy);
    const score = ang*200 + dist;
    if (score < bestScore) { bestScore=score; best=el; }
  }
  return best;
}
function move(dir){
  const target = bestInDirection(dir);
  if (target){
    target.focus(); target.scrollIntoView({block:'center', inline:'center', behavior:'smooth'});
  }else{
    const dy = (dir==='down'?1:dir==='up'?-1:0)*window.innerHeight*0.6;
    if (dy) window.scrollBy({top:dy, behavior:'smooth'});
  }
}
function focusTopBar(){
  const top = document.querySelector('header nav a, .nav a, .menu a, input[type="search"], input[placeholder*="搜"]');
  if (top){ top.focus(); top.scrollIntoView({block:'center'}); }
}

/***** 5) 影片輔助：自動播放/全螢幕、長按快進退、媒體鍵 *****/
function video(){ return document.querySelector('video'); }
function autoPlayFull(){
  const v = video(); if(!v) return;
  const go = ()=>{ v.play().catch(()=>{}); v.requestFullscreen?.().catch(()=>{}); };
  (v.readyState>=2)?go():v.addEventListener('canplay', go, {once:true});
}
document.addEventListener('DOMContentLoaded', autoPlayFull);

let seekTimer=null;
function startSeek(delta){
  stopSeek();
  seekTimer=setInterval(()=>{
    const v=video(); if(v&&document.fullscreenElement){ v.currentTime = Math.max(0, Math.min((v.currentTime||0)+delta, v.duration||1)); }
  }, 200);
}
function stopSeek(){ if(seekTimer){ clearInterval(seekTimer); seekTimer=null; }}

/***** 6) 鍵位對應（方向鍵、OK、返回、空白鍵、媒體鍵、數字鍵） *****/
let lastUp=0;
document.addEventListener('keydown', (e)=>{
  const v = video();
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Backspace','Escape',' '].includes(e.key)) e.preventDefault();

  if (e.key==='ArrowUp'){
    const now = Date.now();
    if (now - lastUp < 300) { focusTopBar(); } else { move('up'); }
    lastUp = now;
  } else if (e.key==='ArrowDown'){ move('down'); }
  else if (e.key==='ArrowLeft'){
    if (v && document.fullscreenElement){ v.currentTime = Math.max(0,(v.currentTime||0)-10); }
    else move('left');
  } else if (e.key==='ArrowRight'){
    if (v && document.fullscreenElement){ v.currentTime = Math.min((v.currentTime||0)+10, v.duration||1); }
    else move('right');
  } else if (e.key==='Enter'){ // OK
    if (document.activeElement?.tagName === 'VIDEO'){ v && (v.paused ? v.play().catch(()=>{}) : v.pause()); }
    else { document.activeElement?.click(); }
  } else if (e.key===' ' && v){ v.paused ? v.play().catch(()=>{}) : v.pause(); }
  else if (e.key==='Escape' || e.key==='Backspace'){
    if (document.fullscreenElement){ document.exitFullscreen().catch(()=>{}); }
    else if (history.length>1){ history.back(); }
  }

  // 媒體鍵
  if (e.code === 'MediaPlayPause' && v){ v.paused ? v.play().catch(()=>{}) : v.pause(); }
  if (e.code === 'MediaTrackNext'  && v && document.fullscreenElement){ v.currentTime = Math.min((v.currentTime||0)+10, v.duration||1); }
  if (e.code === 'MediaTrackPrevious' && v && document.fullscreenElement){ v.currentTime = Math.max(0,(v.currentTime||0)-10); }
  if (e.key === 'ContextMenu' || e.key === 'Help'){ focusTopBar(); } // 菜單鍵/說明鍵 → 聚焦頂部

  // 數字鍵 0~9 跳百分比
  if (/^[0-9]$/.test(e.key) && v && v.duration){ v.currentTime = v.duration * (parseInt(e.key,10)/10); }
}, true);

// 長按左右連續快轉
document.addEventListener('keydown', (e)=>{
  if (e.repeat && (e.key==='ArrowLeft' || e.key==='ArrowRight')){
    startSeek(e.key==='ArrowRight'?+2:-2);
  }
});
document.addEventListener('keyup', (e)=>{
  if (e.key==='ArrowLeft' || e.key==='ArrowRight') stopSeek();
});

/***** 7) 避免外跳：把 target=_blank 改成 _self *****/
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('a[target="_blank"]').forEach(a=>a.setAttribute('target','_self'));
});
