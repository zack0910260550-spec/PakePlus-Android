/***** 保留原本功能：在 App 內開啟 _blank 連結與 window.open *****/
console.log('%cbuild from PakePlus： https://github.com/Sjj1024/PakePlus','color:orangered;font-weight:bolder');

const hookClick = (e) => {
  const origin = e.target.closest('a[href]');
  const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');
  if ((origin && origin.href && origin.target === '_blank') ||
      (origin && origin.href && isBaseTargetBlank)) {
    e.preventDefault();
    location.href = origin.href;
  }
};
window.open = function (url, target, features) { location.href = url; };
document.addEventListener('click', hookClick, { capture: true });

/***** TV 強化：樣式、焦點導航、影片控制、返回鍵 *****/

// 1) TV 觀感：放大字體、焦點可見、隱藏卷軸
(() => {
  const style = document.createElement('style');
  style.textContent = `
    html, body { font-size: 20px; }
    a, button, input, select, textarea, video { outline: none; }
    *:focus { box-shadow: 0 0 0 3px #3ba1ff99 !important; }
    ::-webkit-scrollbar { width: 0; height: 0; }
  `;
  document.head.appendChild(style);
})();

// 2) 可聚焦元素與循環焦點
function getFocusable(){
  const sel = 'a,button,[role="button"],input,select,textarea,[tabindex]:not([tabindex="-1"]),video';
  return Array.from(document.querySelectorAll(sel)).filter(el=>{
    const s = getComputedStyle(el);
    return s.visibility!=='hidden' && s.display!=='none' && !el.disabled;
  });
}
function focusCycle(next=true){
  const list = getFocusable();
  if (!list.length) return;
  const idx = Math.max(0, list.indexOf(document.activeElement));
  const n = (idx + (next?1:-1) + list.length) % list.length;
  list[n].focus();
}
function pageScroll(dy){ window.scrollBy({ top: dy, behavior: 'smooth' }); }

// 3) 影片輔助：自動播放 & 嘗試全螢幕
function videoEl(){ return document.querySelector('video'); }
function ensureVideoPlayFull(){
  const v = videoEl(); if(!v) return;
  const go = () => {
    v.play().catch(()=>{});
    if (v.requestFullscreen) v.requestFullscreen().catch(()=>{});
  };
  (v.readyState>=2) ? go() : v.addEventListener('canplay', go, { once:true });
}
document.addEventListener('DOMContentLoaded', ensureVideoPlayFull);

// 4) 遙控器鍵位映射
document.addEventListener('keydown', (e)=>{
  const v = videoEl();
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = /INPUT|TEXTAREA|SELECT/.test(tag);

  switch(e.key){
    case 'ArrowRight':
      e.preventDefault();
      if (v && document.fullscreenElement) { v.currentTime = Math.min((v.currentTime||0)+10, (v.duration||1)); }
      else if (getFocusable().length) { focusCycle(true); }
      else { pageScroll(0.6*window.innerHeight); }
      break;

    case 'ArrowLeft':
      e.preventDefault();
      if (v && document.fullscreenElement) { v.currentTime = Math.max(0, (v.currentTime||0)-10); }
      else if (getFocusable().length) { focusCycle(false); }
      else { pageScroll(-0.6*window.innerHeight); }
      break;

    case 'ArrowDown':
      e.preventDefault();
      if (v && document.fullscreenElement) { v.volume = Math.max(0, Math.min(1, (v.volume||0.8)-0.05)); }
      else { pageScroll(0.6*window.innerHeight); }
      break;

    case 'ArrowUp':
      e.preventDefault();
      if (v && document.fullscreenElement) { v.volume = Math.max(0, Math.min(1, (v.volume||0.8)+0.05)); }
      else { pageScroll(-0.6*window.innerHeight); }
      break;

    case 'Enter': // OK鍵
      if (!typing) {
        if (document.activeElement && document.activeElement.tagName === 'VIDEO') {
          e.preventDefault();
          v && (v.paused ? v.play().catch(()=>{}) : v.pause());
        } else if (document.activeElement) {
          e.preventDefault();
          document.activeElement.click();
        }
      }
      break;

    case ' ': // 空白鍵：播放/暫停
      if (v) { e.preventDefault(); v.paused ? v.play().catch(()=>{}) : v.pause(); }
      break;

    case 'Escape':
    case 'Backspace': // 返回鍵：先退全螢幕，再上一頁
      e.preventDefault();
      if (document.fullscreenElement) { document.exitFullscreen().catch(()=>{}); }
      else if (history.length > 1) { history.back(); }
      break;

    default:
      // 數字鍵 0~9：跳轉到 0~90% 進度
      if (/^[0-9]$/.test(e.key) && v && v.duration) {
        e.preventDefault();
        v.currentTime = v.duration * (parseInt(e.key,10)/10);
      }
  }
}, true);

// 5) 若網站把連結強迫外開，強制改成內開
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('a[target="_blank"]').forEach(a=>a.setAttribute('target','_self'));
});

