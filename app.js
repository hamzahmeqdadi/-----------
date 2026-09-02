/* ===================== RENDER LISTS ===================== */
function dhikrCardHTML(item, idPrefix, idx){
  const id = idPrefix + idx;
  const needsCounter = item.count && item.count > 1;
  return `
  <div class="dhikr-card">
    <div class="dhikr-text">${item.text}</div>
    <div class="dhikr-meta">
      <div class="dhikr-source">${item.source}${item.count ? ' · تُقرأ ' + arabicCount(item.count) : ''}</div>
      ${needsCounter ? counterHTML(id, item.count) : ''}
    </div>
  </div>`;
}
function arabicCount(n){
  if(n===1) return 'مرة واحدة';
  if(n===3) return '3 مرات';
  if(n===7) return '7 مرات';
  if(n===10) return '10 مرات';
  if(n===100) return '100 مرة';
  return n + ' مرات';
}
function counterHTML(id, total){
  return `
  <div class="counter" data-id="${id}" data-total="${total}" data-count="0">
    <button class="reset" onclick="resetCounter('${id}')">إعادة</button>
    <span class="count-label"><span class="cur">0</span>/${total}</span>
    <button class="tap" onclick="tapCounter('${id}')" aria-label="عدّ الذكر">
      <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20"/></svg>
      <span class="tick">◆</span>
    </button>
  </div>`;
}
function tapCounter(id){
  const wrap = document.querySelector(`.counter[data-id="${id}"]`);
  let count = parseInt(wrap.dataset.count) + 1;
  const total = parseInt(wrap.dataset.total);
  if(count > total) count = total;
  wrap.dataset.count = count;
  wrap.querySelector('.cur').textContent = count;
  const circle = wrap.querySelector('circle');
  const btn = wrap.querySelector('.tap');
  const pct = count/total;
  circle.style.strokeDashoffset = 126 - (126*pct);
  if(count >= total){ btn.classList.add('done'); if(navigator.vibrate) navigator.vibrate(30); }
}
function resetCounter(id){
  const wrap = document.querySelector(`.counter[data-id="${id}"]`);
  wrap.dataset.count = 0;
  wrap.querySelector('.cur').textContent = 0;
  wrap.querySelector('circle').style.strokeDashoffset = 126;
  wrap.querySelector('.tap').classList.remove('done');
}

document.getElementById('sabahList').innerHTML = sabahAdhkar.map((it,i)=>dhikrCardHTML(it,'sabah',i)).join('');
document.getElementById('masaaList').innerHTML = masaaAdhkar.map((it,i)=>dhikrCardHTML(it,'masaa',i)).join('');
document.getElementById('nawmList').innerHTML = nawmAdhkar.map((it,i)=>dhikrCardHTML(it,'nawm',i)).join('');
document.getElementById('adiyaList').innerHTML = adiya.map(d=>`
  <div class="hadith-card">
    <div class="section-sub" style="text-align:right;margin-bottom:8px;opacity:0.8;font-family:var(--ui);font-weight:700;color:var(--gold);">${d.title}</div>
    <div class="hadith-text">${d.text}</div>
    <div class="hadith-source">${d.source}</div>
  </div>`).join('');
document.getElementById('hadithList').innerHTML = hadiths.map(h=>`
  <div class="hadith-card">
    <div class="hadith-text">«${h.text}»</div>
    <div class="hadith-source">${h.source}</div>
  </div>`).join('');

/* ===================== TABS + DAY/NIGHT THEME ===================== */
const tabButtons = document.querySelectorAll('nav.tabs button');
tabButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    tabButtons.forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('section.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    applyThemeForTab(btn.dataset.tab);
  });
});
function applyThemeForTab(tab){
  if(tab === 'masaa' || tab === 'nawm'){ document.body.classList.add('night'); }
  else if(tab === 'sabah'){ document.body.classList.remove('night'); }
  // adiya/hadith/salat keep whatever the clock/time-of-day already set
}

/* ===================== CLOCK / DAY PART ===================== */
function updateClock(){
  const now = new Date();
  document.getElementById('gDate').textContent = now.toLocaleDateString('ar-EG', {year:'numeric', month:'long', day:'numeric'});
  const h = now.getHours();
  let part, isNight;
  if(h>=4 && h<12){ part='الصباح'; isNight=false; }
  else if(h>=12 && h<17){ part='الظهيرة'; isNight=false; }
  else if(h>=17 && h<20){ part='المساء'; isNight=true; }
  else { part='الليل'; isNight=true; }
  document.getElementById('dayPart').textContent = part;
  // set initial theme + initial active tab to match time of day, only once at load
  if(!window.__themeInit){
    window.__themeInit = true;
    if(isNight){
      document.body.classList.add('night');
      tabButtons.forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('section.panel').forEach(p=>p.classList.remove('active'));
      document.querySelector('[data-tab="masaa"]').classList.add('active');
      document.getElementById('masaa').classList.add('active');
    }
  }
}
updateClock();
setInterval(updateClock, 60000);

/* ===================== PRAYER TIMES (astronomical calculation) ===================== */
const cities = {
  "عمّان، الأردن": {lat:31.9539, lon:35.9106, tz:3},
  "مكة المكرمة": {lat:21.4225, lon:39.8262, tz:3},
  "المدينة المنورة": {lat:24.5247, lon:39.5692, tz:3},
  "القاهرة، مصر": {lat:30.0444, lon:31.2357, tz:2},
  "الرياض، السعودية": {lat:24.7136, lon:46.6753, tz:3},
  "دبي، الإمارات": {lat:25.2048, lon:55.2708, tz:4},
  "إسطنبول، تركيا": {lat:41.0082, lon:28.9784, tz:3},
  "الدار البيضاء، المغرب": {lat:33.5731, lon:-7.5898, tz:1},
  "لندن، بريطانيا": {lat:51.5074, lon:-0.1278, tz:1},
};
const citySelect = document.getElementById('citySelect');
Object.keys(cities).forEach(name=>{
  const opt = document.createElement('option');
  opt.value = name; opt.textContent = name;
  citySelect.appendChild(opt);
});
citySelect.addEventListener('change', ()=>{
  if(citySelect.value){
    const c = cities[citySelect.value];
    computeAndRenderPrayerTimes(c.lat, c.lon, c.tz, citySelect.value);
  }
});
document.getElementById('btnGeo').addEventListener('click', tryGeolocate);

function tryGeolocate(){
  document.getElementById('ptLoc').textContent = 'جارٍ تحديد الموقع…';
  if(!navigator.geolocation){
    fallbackCity();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos=>{
      const tz = -new Date().getTimezoneOffset()/60;
      computeAndRenderPrayerTimes(pos.coords.latitude, pos.coords.longitude, tz, 'موقعك الحالي');
    },
    ()=>{ fallbackCity(); },
    {timeout:8000}
  );
}
function fallbackCity(){
  const c = cities["عمّان، الأردن"];
  computeAndRenderPrayerTimes(c.lat, c.lon, c.tz, "عمّان، الأردن (افتراضي)");
}

// Astronomical prayer time calculation (Muslim World League: Fajr 18°, Isha 17°)
function computeAndRenderPrayerTimes(lat, lon, tz, label){
  const now = new Date();
  const times = calcTimes(now, lat, lon, tz, 18, 17);
  document.getElementById('ptLoc').textContent = 'الموقع: ' + label;
  document.getElementById('ptDate').textContent = now.toLocaleDateString('ar-EG', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  const order = [['fajr','الفجر'],['sunrise','الشروق'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']];
  const nowMin = now.getHours()*60 + now.getMinutes();
  let nextKey = null;
  for(const [k] of order){
    if(times[k] > nowMin){ nextKey = k; break; }
  }
  const grid = document.getElementById('ptGrid');
  grid.innerHTML = order.map(([k,label])=>{
    const mins = times[k];
    const timeStr = minutesToTime(mins);
    const isNext = k===nextKey;
    let untilStr = '';
    if(isNext){
      let diff = mins - nowMin; if(diff<0) diff += 1440;
      const hh = Math.floor(diff/60), mm = diff%60;
      untilStr = `بعد ${hh>0? hh+' س ':''}${mm} د`;
    }
    return `<div class="pt-cell ${isNext?'next':''}"><div class="name">${label}</div><div class="time">${timeStr}</div><div class="until">${untilStr}</div></div>`;
  }).join('');
}
function minutesToTime(mins){
  mins = ((mins%1440)+1440)%1440;
  let h = Math.floor(mins/60), m = Math.round(mins%60);
  if(m===60){m=0;h+=1;}
  const period = h<12 ? 'ص' : 'م';
  let h12 = h%12; if(h12===0) h12=12;
  return `${h12}:${String(m).padStart(2,'0')} ${period}`;
}

function calcTimes(date, lat, lon, tz, fajrAngle, ishaAngle){
  const D2R = Math.PI/180, R2D = 180/Math.PI;
  const jDate = julianDate(date) - lon/(15*24);
  function computeDay(jd){
    const D = jd - 2451545.0;
    const g = (357.529 + 0.98560028*D) % 360;
    const q = (280.459 + 0.98564736*D) % 360;
    const L = (q + 1.915*Math.sin(g*D2R) + 0.020*Math.sin(2*g*D2R)) % 360;
    const e = 23.439 - 0.00000036*D;
    const RA = (Math.atan2(Math.cos(e*D2R)*Math.sin(L*D2R), Math.cos(L*D2R)) * R2D)/15;
    const decl = Math.asin(Math.sin(e*D2R)*Math.sin(L*D2R)) * R2D;
    let eqt = q/15 - fixHour(RA);
    return {decl, eqt};
  }
  function fixHour(h){ h = h - 24*Math.floor(h/24); return h; }
  function sunAngleTime(angle, jd, lat, decl, direction){
    const cosH = (-Math.sin(angle*D2R) - Math.sin(decl*D2R)*Math.sin(lat*D2R)) / (Math.cos(decl*D2R)*Math.cos(lat*D2R));
    if(cosH > 1 || cosH < -1) return 12; // polar edge fallback
    const H = Math.acos(cosH) * R2D / 15;
    return direction==='ccw' ? 12 - H : 12 + H;
  }
  const {decl, eqt} = computeDay(jDate);
  const noon = 12 - lon/15 - eqt + tz - lon/15*0 ; // solar noon in local tz frame handled below
  // Simplify: local solar noon (hours) = 12 + tz - lon/15 - eqt  -- standard formula
  const dhuhrHour = 12 + tz - lon/15 - eqt;
  const fajrHour = dhuhrHour - sunAngleDiff(fajrAngle, lat, decl);
  const sunriseHour = dhuhrHour - sunAngleDiff(0.833, lat, decl);
  const asrHour = dhuhrHour + asrDiff(lat, decl, 1);
  const maghribHour = dhuhrHour + sunAngleDiff(0.833, lat, decl);
  const ishaHour = dhuhrHour + sunAngleDiff(ishaAngle, lat, decl);

  function sunAngleDiff(angle, lat, decl){
    const cosH = (-Math.sin(angle*D2R) - Math.sin(decl*D2R)*Math.sin(lat*D2R)) / (Math.cos(decl*D2R)*Math.cos(lat*D2R));
    const clamped = Math.max(-1, Math.min(1, cosH));
    return Math.acos(clamped) * R2D / 15;
  }
  function asrDiff(lat, decl, shadowFactor){
    const x = shadowFactor + Math.tan(Math.abs(lat-decl)*D2R);
    const angle = -Math.atan(1/x) * R2D + 90; // altitude angle
    const altitude = 90 - Math.atan(1/x)*R2D;
    const cosH = (Math.sin(altitude*D2R) - Math.sin(decl*D2R)*Math.sin(lat*D2R)) / (Math.cos(decl*D2R)*Math.cos(lat*D2R));
    const clamped = Math.max(-1, Math.min(1, cosH));
    return Math.acos(clamped) * R2D / 15;
  }

  return {
    fajr: Math.round(fajrHour*60),
    sunrise: Math.round(sunriseHour*60),
    dhuhr: Math.round(dhuhrHour*60),
    asr: Math.round(asrHour*60),
    maghrib: Math.round(maghribHour*60),
    isha: Math.round(ishaHour*60),
  };
}
function julianDate(date){
  let y = date.getFullYear(), m = date.getMonth()+1, d = date.getDate();
  if(m<=2){ y-=1; m+=12; }
  const A = Math.floor(y/100), B = 2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d + B - 1524.5;
}

// initial load
tryGeolocate();