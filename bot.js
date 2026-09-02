/* bot.js — чат-бот «Помощник Садовода» (v1.20) */
(function () {
  'use strict';
  const SG = window.SG;
  if (!SG) { console.warn('bot.js: SG API не найден'); return; }

  const HEAT = ['Томат', 'Перец', 'Баклажан', 'Дыня', 'Арбуз'];
  const MONTHS_LOW = ['январ','феврал','март','апрел','ма','июн','июл','август','сентябр','октябр','ноябр','декабр'];
  const monthName = () => MONTHS_LOW[new Date().getMonth()];
  const MAX_CREATE = 6;
  const BOY = 'stickers/boy.png';

  /* ---------- стили виджета ---------- */
  const style = document.createElement('style');
  style.textContent = `
    .sg-fab{position:fixed;right:14px;bottom:84px;z-index:66;border:none;border-radius:999px;
      padding:12px 18px;background:linear-gradient(180deg,#C9F3B9,#A9E8A0);color:#274A22;
      font:700 14px "Manrope",sans-serif;box-shadow:0 14px 26px rgba(70,60,40,.2);cursor:pointer}
    .sg-fab:hover{transform:translateY(-2px)}
    .sg-panel{position:fixed;right:14px;bottom:140px;z-index:67;width:min(380px,calc(100vw - 28px));
      height:min(540px,70vh);display:flex;flex-direction:column;background:#FFFDF6;border-radius:16px;
      box-shadow:0 24px 60px rgba(0,0,0,.25);overflow:hidden}
    .sg-panel.hidden{display:none}
    .sg-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
      background:linear-gradient(180deg,#EAF5DF,#F6EFDD);font:700 15px "Manrope",sans-serif;color:#274A22}
    .sg-head-l{display:flex;align-items:center;gap:10px}
    .sg-head-l img{width:88px;height:88px;object-fit:contain}
    .sg-close{border:none;border-radius:10px;width:30px;height:30px;background:#fff;cursor:pointer;box-shadow:0 4px 10px rgba(70,60,40,.12)}
    .sg-msgs{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
    .sg-msg{max-width:92%;padding:9px 11px;border-radius:14px;font-size:13.5px;line-height:1.45}
    .sg-msg.bot{align-self:flex-start;background:#F5F8EC;border:1px solid rgba(120,140,90,.14);display:flex;gap:8px;align-items:flex-start}
    .sg-msg.user{align-self:flex-end;background:#E9F4FF;border:1px solid rgba(70,130,180,.14)}
    .sg-ava{flex-shrink:0}
    .sg-ava img{width:44px;height:44px;object-fit:contain}
    .sg-body{flex:1}
    .sg-msg ol{margin:6px 0 0;padding-left:18px}
    .sg-msg li{margin:4px 0}
    .sg-quick{display:flex;flex-wrap:wrap;gap:6px;padding:10px;border-top:1px solid rgba(90,100,70,.12);background:#FFFDF6}
    .sg-quick button{border:none;border-radius:999px;padding:8px 11px;font:600 12px "Manrope",sans-serif;
      background:linear-gradient(180deg,#FFF6DF,#F8EBC8);color:#4A3B19;cursor:pointer;box-shadow:0 4px 10px rgba(70,60,40,.10)}
    .sg-input{display:flex;gap:6px;padding:10px;border-top:1px solid rgba(90,100,70,.12);background:#FFFDF6}
    .sg-input input{flex:1;border:none;border-radius:12px;padding:10px 12px;background:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 4px 10px rgba(70,60,40,.07);font-size:14px}
    .sg-input button{border:none;border-radius:12px;padding:10px 14px;background:linear-gradient(180deg,#C2EBA8,#99D77F);font-weight:700;cursor:pointer}
    .sg-plan{margin:4px 0;padding:6px 8px;border-radius:10px;background:rgba(138,155,110,.10);font-size:12.5px}
  `;
  document.head.appendChild(style);

  /* ---------- DOM виджета ---------- */
  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'sg-fab'; fab.textContent = '💬 Помощь';
  const panel = document.createElement('section');
  panel.className = 'sg-panel hidden';
  panel.innerHTML = `
    <div class="sg-head">
      <span class="sg-head-l"><img src="${BOY}" alt="">Помощник Садовода</span>
      <button type="button" class="sg-close" aria-label="Закрыть">✕</button>
    </div>
    <div class="sg-msgs"></div>
    <div class="sg-quick"></div>
    <div class="sg-input"><input placeholder="Например: что посадить на грядке 2?" /><button type="button">➤</button></div>`;
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  const msgs = panel.querySelector('.sg-msgs');
  const quick = panel.querySelector('.sg-quick');
  const inp = panel.querySelector('.sg-input input');
  const send = panel.querySelector('.sg-input button');

  let flow = null;

  fab.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) { SG.reachGoal('bot_open'); if (!msgs.children.length) greet(); }
  });
  panel.querySelector('.sg-close').addEventListener('click', () => panel.classList.add('hidden'));
  send.addEventListener('click', () => handleUser(inp.value));
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleUser(inp.value); });

  function addMsg(html, who) {
    const d = document.createElement('div');
    d.className = 'sg-msg ' + (who || 'bot');
    if (!who) d.innerHTML = '<span class="sg-ava"><img src="' + BOY + '" alt=""></span><div class="sg-body">' + html + '</div>';
    else d.innerHTML = html;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function setQuick(list) {
    quick.innerHTML = '';
    (list || []).forEach(q => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = q.t;
      b.addEventListener('click', () => { setQuick(defaultQuick()); q.fn(); });
      quick.appendChild(b);
    });
  }
  function defaultQuick() {
    return [
      { t: '🌱 Что посадить на…?', fn: () => addMsg(instructionObjects()) },
      { t: '📋 Помоги посадить', fn: () => startPlan('') },
      { t: '❓ Справка', fn: help }
    ];
  }
  function greet() {
    addMsg('Привет! Я Помощник Садовода<br>• «Что посадить на грядке 2?» — подберу 5 культур, ты выбираешь номером 1–5. Если слот занят — спрошу, хочешь ли заменить культуру.<br>• «Помоги посадить» — составлю план по всей схеме.<br>Регистр букв не важен.');
    setQuick(defaultQuick());
  }
  function help() {
    addMsg('Команды:<br>• «Что посадить на грядке 2?» / «что посадить: теплица 1» — покажу 5 культур списком; ответь номером 1–5. Для теплицы я спрошу номер грядки; если грядка занята — предложу «Да/Нет» заменить культуру.<br>• «Помоги посадить растения на схеме» — перечисли культуры (через запятую, количество числом: «томат 2, укроп»), затем план; если слотов нет — создам до 6 объектов, теплолюбивые — в теплицу.<br>Регистр букв не важен.');
  }
  function listObjects() {
    return SG.objects.length ? SG.objects.map(o => o.name).join(', ') : 'схема пока пуста';
  }
  function instructionObjects() {
    return 'Напиши команду с уникальным именем объекта со схемы.<br>' +
      'Формат: «что посадить на грядке 2», «что посадить: теплица 1» (я спрошу номер грядки), «что посадить на дереве 3».<br>' +
      'Регистр не важен. Сейчас на схеме: ' + listObjects() + '.';
  }

  /* ---------- NLU ---------- */
  function normName(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function stripTriggers(t) {
    return String(t).replace(/помоги посадить|помоги|план посадки|распланируй|посадить растения|что посадить|что посеять|подбери|порекомендуй/g, '');
  }
  function parseCrops(text) {
    const map = new Map();
    String(text).split(/[,;]|\s+и\s+/).forEach(tok => {
      tok = tok.trim(); if (!tok) return;
      let qty = 1, namePart = tok;
      const q = tok.match(/(?:^|\s)(\d+)\s*$/);
      if (q) { qty = Math.max(1, parseInt(q[1], 10)); namePart = tok.slice(0, q.index); }
      const xm = namePart.match(/\s*[xх]\s*(\d+)\s*$/i);
      if (xm) { qty = Math.max(1, parseInt(xm[1], 10)); namePart = namePart.slice(0, xm.index); }
      const nn = normName(namePart);
      if (!nn) return;
      const p = SG.plants.find(p => normName(p.name) === nn) ||
                SG.plants.find(p => normName(p.name).includes(nn) && nn.length >= 4);
      if (p) map.set(p.name, (map.get(p.name) || 0) + qty);
    });
    return map;
  }
  function objById(id) { return SG.objects.find(o => o.id === id) || null; }
  function slotLabel(obj, bedIndex) {
    return obj.name + (bedIndex != null ? ', грядка ' + (bedIndex + 1) : '');
  }
  function occupiedCulture(obj, bedIndex) {
    if (bedIndex != null) return (obj.greenhouseBedCultures || [])[bedIndex] || null;
    return obj.culture || null;
  }
  function findObjectByPhrase(text) {
    const t = normName(text);
    let best = null;
    SG.objects.forEach(o => {
      const n = normName(o.name);
      if (n && t.includes(n) && (!best || n.length > best.len)) best = { o, len: n.length };
    });
    if (best) return { obj: best.o, bedIndex: null };
    let m = t.match(/теплиц[аеы]?\s*(\d+)(?:[^0-9]*грядк[аеы]?\s*(\d+))?/);
    if (m) {
      const gh = SG.objects.find(o => o.type === 'greenhouse' && normName(o.name).includes('теплица ' + m[1]));
      if (gh) return { obj: gh, bedIndex: m[2] ? parseInt(m[2], 10) - 1 : null };
    }
    m = t.match(/грядк[аеы]?\s*(\d+)/);
    if (m) {
      const b = SG.objects.find(o => o.type === 'bed' && normName(o.name) === 'грядка ' + m[1]);
      if (b) return { obj: b, bedIndex: null };
    }
    m = t.match(/(дерево|кустарник)\s*(\d+)/);
    if (m) {
      const want = (m[1] === 'дерево' ? 'дерево ' : 'кустарник ') + m[2];
      const o = SG.objects.find(o => (o.type === 'tree' || o.type === 'bush') && normName(o.name) === want);
      if (o) return { obj: o, bedIndex: null };
    }
    return null;
  }
  function shortInfo(c) {
    const p = SG.plants.find(p => p.name === c);
    if (!p) return '';
    return 'посадка: ' + p.sowing + '; полив: ' + (p.care && p.care.watering ? p.care.watering : '—');
  }
  function slotTypes(obj) {
    if (obj.type === 'tree') return ['дерево'];
    if (obj.type === 'bush') return ['кустарник'];
    return ['овощ', 'зелень', 'ягода'];
  }
  function scoreCulture(culture, obj, bedIndex) {
    const p = SG.plants.find(p => p.name === culture);
    if (!p) return -Infinity;
    if (!slotTypes(obj).some(t => p.type.includes(t))) return -Infinity;
    const level = SG.levelAtRect(obj);
    const req = SG.lightReq(culture);
    if (!req.includes(level)) return -Infinity;
    let s = 2 + (req[0] === level ? 1 : 0);
    for (const nc of SG.neighborsOf(obj, bedIndex)) {
      const r = SG.findRule(culture, nc.culture);
      if (r) { if (r.relation === 'bad') return -Infinity; s += 1; }
    }
    const prev = SG.historyLast(obj, bedIndex);
    if (prev) {
      if (normName(prev) === normName(culture)) return -Infinity;
      const rot = SG.findRotation(prev, culture);
      if (rot) { if (rot.recommendation === 'плохо') return -Infinity; if (rot.recommendation === 'хорошо') s += 2; }
    }
    if (HEAT.includes(culture)) s += (obj.type === 'greenhouse' ? 2 : -2);
    if (p.sowing.toLowerCase().includes(monthName())) s += 1;
    return s;
  }

  /* ---------- Сценарий 1 ---------- */
  function recommendFor(text) {
    if (!SG.objects.length) {
      addMsg('Схема пуста. Добавь объекты на вкладке «Схема» или скажи «помоги посадить» — я расставлю сам.');
      return;
    }
    const found = findObjectByPhrase(text);
    if (!found) { addMsg(instructionObjects()); return; }
    const { obj, bedIndex } = found;

    /* теплица без указанной грядки — предлагаем выбрать грядку */
    if (obj.type === 'greenhouse' && bedIndex == null) {
      const beds = obj.greenhouseBedCultures || [];
      const free = [];
      beds.forEach((c, i) => { if (!c) free.push(i); });
      flow = { type: 'gh-bed', objId: obj.id };
      if (free.length) {
        addMsg('В «' + obj.name + '» свободны: ' + free.map(i => 'грядка ' + (i + 1)).join(', ') + '.<br>Ответь номером грядки, куда посадить.');
        setQuick(free.map(i => ({ t: 'Грядка ' + (i + 1), fn: () => chooseGhBed(obj, i) })).concat(defaultQuick()));
      } else {
        addMsg('В «' + obj.name + '» все грядки заняты: ' + beds.map((c, i) => 'грядка ' + (i + 1) + ' — ' + c).join(', ') + '.<br>Ответь номером грядки, где хочешь заменить культуру.');
        setQuick(beds.map((c, i) => ({ t: 'Грядка ' + (i + 1), fn: () => chooseGhBed(obj, i) })).concat(defaultQuick()));
      }
      return;
    }

    /* слот занят — предупреждение и Да/Нет */
    const occ = occupiedCulture(obj, bedIndex);
    if (occ) {
      flow = { type: 'occ-confirm', objId: obj.id, bedIndex };
      addMsg(slotLabel(obj, bedIndex) + ' занята культурой ' + occ + ', хотите изменить культуру?');
      setQuick([
        { t: 'Да', fn: () => showRecommendations(obj, bedIndex) },
        { t: 'Нет', fn: () => addMsg('Хорошо, оставляем «' + occ + '».') },
        ...defaultQuick()
      ]);
      return;
    }
    showRecommendations(obj, bedIndex);
  }

  function chooseGhBed(obj, i) {
    const occ = (obj.greenhouseBedCultures || [])[i] || null;
    if (occ) {
      flow = { type: 'occ-confirm', objId: obj.id, bedIndex: i };
      addMsg('Грядка ' + (i + 1) + ' занята культурой ' + occ + ', хотите изменить культуру?');
      setQuick([
        { t: 'Да', fn: () => showRecommendations(obj, i) },
        { t: 'Нет', fn: () => addMsg('Хорошо, оставляем «' + occ + '».') },
        ...defaultQuick()
      ]);
      return;
    }
    showRecommendations(obj, i);
  }

  function showRecommendations(obj, bedIndex) {
    flow = null;
    const scored = SG.plants.map(p => p.name)
      .map(c => ({ c, s: scoreCulture(c, obj, bedIndex) }))
      .filter(x => x.s > -Infinity)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
    if (!scored.length) {
      addMsg('Для «' + slotLabel(obj, bedIndex) + '» сейчас нет подходящих культур: мешают свет, соседи или севооборот.');
      return;
    }
    flow = { type: 'rec', objId: obj.id, bedIndex, list: scored.map(x => x.c) };
    addMsg('Для «' + slotLabel(obj, bedIndex) + '» подходят:<ol>' +
      scored.map((x, i) => '<li><b>' + (i + 1) + '. ' + x.c + '</b> — ' + shortInfo(x.c) + '</li>').join('') +
      '</ol>Ответь номером от 1 до 5 — посажу выбранную культуру.');
    setQuick(scored.map((x, i) => ({ t: (i + 1) + '. ' + x.c, fn: () => plantChosen(flow, i) })).concat(defaultQuick()));
    SG.reachGoal('bot_recommend');
  }

  function plantChosen(st, i) {
    if (!st || !st.list || !st.list[i]) { addMsg('Не понял номер.'); return; }
    const c = st.list[i];
    const snap = SG.snapshot();
    if (SG.assignCulture(st.objId, st.bedIndex, c)) {
      SG.refresh();
      addMsg('Готово: «' + c + '» посажена 🌱');
      setQuick([{ t: '↩️ Отменить', fn: () => { SG.restore(snap); addMsg('Отменено.'); } }, ...defaultQuick()]);
    } else addMsg('Не удалось посадить.');
    flow = null;
  }

  /* ---------- Сценарий 2 ---------- */
  function startPlan(text) {
    const map = parseCrops(text || '');
    if (map.size) { buildPlan(map); return; }
    flow = { type: 'plan-ask' };
    const rec = SG.plants.filter(p => p.sowing.toLowerCase().includes(monthName())).slice(0, 8);
    addMsg('Перечисли культуры через запятую; количество — числом после названия: «томат 2, укроп, клубника 3».<br>' +
      'Регистр букв не важен.<br>Сейчас актуальны: ' + rec.map(p => p.name).join(', ') + '.');
  }
  function emptySlots() {
    const slots = [];
    SG.objects.forEach(o => {
      if (o.type === 'bed' && !o.culture) slots.push({ obj: o, bedIndex: null });
      if (o.type === 'greenhouse') (o.greenhouseBedCultures || []).forEach((c, i) => { if (!c) slots.push({ obj: o, bedIndex: i }); });
      if (o.type === 'tree' && !o.culture) slots.push({ obj: o, bedIndex: null });
      if (o.type === 'bush' && !o.culture) slots.push({ obj: o, bedIndex: null });
    });
    return slots;
  }
  function overlaps(r) {
    return SG.objects.some(o =>
      r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.l && r.y + r.l > o.y);
  }
  function findSpotFor(type, culture, extra) {
    const t = SG.types[type];
    let best = null;
    for (let y = 0; y <= SG.plot.lengthM - t.l + 0.001; y += 1) {
      for (let x = 0; x <= SG.plot.widthM - t.w + 0.001; x += 1) {
        const rect = { x, y, w: t.w, l: t.l };
        if (overlaps(rect)) continue;
        if (extra && extra.some(r => rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.l && rect.y + rect.l > r.y)) continue;
        const req = SG.lightReq(culture);
        if (!req.includes(SG.levelAtRect(rect))) continue;
        let s = 1;
        for (const nc of SG.neighborsOf(rect, null)) {
          const r = SG.findRule(culture, nc.culture);
          if (r) { if (r.relation === 'bad') { s = -Infinity; break; } s += 1; }
        }
        if (s === -Infinity) continue;
        if (HEAT.includes(culture) && type === 'greenhouse') s += 2;
        if (best === null || s > best.s) best = { x, y, s };
      }
    }
    return best;
  }
  function buildPlan(map) {
    const slots = emptySlots();
    const demand = [];
    map.forEach((q, c) => { for (let i = 0; i < q; i++) demand.push(c); });

    const pairs = [];
    slots.forEach((sl, si) => {
      demand.forEach(c => {
        const s = scoreCulture(c, sl.obj, sl.bedIndex);
        if (s > -Infinity) pairs.push({ si, c, s });
      });
    });
    pairs.sort((a, b) => b.s - a.s);

    const usedSlots = new Set(), usedDemand = new Set();
    const plan = [];
    pairs.forEach(p => {
      if (usedSlots.has(p.si)) return;
      const di = demand.findIndex((c, i) => c === p.c && !usedDemand.has(i));
      if (di === -1) return;
      usedSlots.add(p.si); usedDemand.add(di);
      plan.push({ objId: slots[p.si].obj.id, bedIndex: slots[p.si].bedIndex, culture: p.c, where: slotName(slots[p.si]) });
    });

    const rest = demand.filter((c, i) => !usedDemand.has(i));
    const creates = [];
    const tempRects = [];
    for (const c of rest) {
      if (creates.length >= MAX_CREATE) break;
      let type = 'bed';
      const p = SG.plants.find(p => p.name === c);
      if (p && p.type.includes('дерево')) type = 'tree';
      else if (p && p.type.includes('кустарник')) type = 'bush';
      else if (HEAT.includes(c)) type = 'greenhouse';
      const spot = findSpotFor(type, c, tempRects);
      if (!spot) continue;
      tempRects.push({ x: spot.x, y: spot.y, w: SG.types[type].w, l: SG.types[type].l });
      creates.push({ type, culture: c, x: spot.x, y: spot.y });
    }
    const leftover = rest.filter(c => !creates.some(cr => cr.culture === c));

    if (!plan.length && !creates.length) {
      addMsg('Не удалось разместить культуры: нет подходящих слотов и мест (свет/соседи). Освободи слоты или измени культуры.');
      return;
    }
    let html = '<b>План посадки:</b><br>' +
      plan.map(p => '<div class="sg-plan">→ ' + p.where + ' — <b>' + p.culture + '</b></div>').join('') +
      creates.map(p => '<div class="sg-plan">＋ создать ' + SG.types[p.type].label + ' (' + p.x + ';' + p.y + ') — <b>' + p.culture + '</b>' + (HEAT.includes(p.culture) ? ' (теплолюбивая → теплица)' : '') + '</div>').join('') +
      (leftover.length ? '<br>Не поместилось: ' + leftover.join(', ') + '.' : '');
    addMsg(html);
    SG.reachGoal('bot_plan_build');
    setQuick([
      { t: '✅ Применить план', fn: () => {
          const snap = SG.snapshot();
          creates.forEach(cr => {
            const obj = SG.createObjectAt(cr.type, cr.x, cr.y);
            if (obj) {
              if (cr.type === 'greenhouse') SG.assignCulture(obj.id, 0, cr.culture);
              else SG.assignCulture(obj.id, null, cr.culture);
            }
          });
          plan.forEach(p => SG.assignCulture(p.objId, p.bedIndex, p.culture));
          SG.refresh();
          SG.reachGoal('bot_plan_apply');
          addMsg('План применён 🌱');
          setQuick([{ t: '↩️ Отменить план', fn: () => { SG.restore(snap); addMsg('План отменён.'); } }, ...defaultQuick()]);
        } },
      { t: 'Отмена', fn: () => addMsg('План отменён.') },
      ...defaultQuick()
    ]);
  }
  function slotName(sl) { return slotLabel(sl.obj, sl.bedIndex); }

  /* ---------- маршрутизатор ---------- */
  function handleUser(text) {
    text = String(text || '').trim();
    if (!text) return;
    addMsg(text, 'user');
    const t = normName(text);

    /* ждём номер 1–5 для рекомендации */
    if (flow && flow.type === 'rec' && /^[1-5]$/.test(t)) { plantChosen(flow, parseInt(t, 10) - 1); return; }

    /* ждём Да/Нет о замене культуры */
    if (flow && flow.type === 'occ-confirm') {
      const st = flow; flow = null;
      if (/^(да|д|yes)$/.test(t)) { const obj = objById(st.objId); if (obj) showRecommendations(obj, st.bedIndex); return; }
      if (/^(нет|н|no)$/.test(t)) { addMsg('Хорошо, оставляем как есть.'); return; }
      /* иначе — новая команда */
    }

    /* ждём номер грядки в теплице */
    if (flow && flow.type === 'gh-bed') {
      const st = flow;
      const m = t.match(/(\d+)/);
      const obj = objById(st.objId);
      if (obj && m) {
        const i = parseInt(m[1], 10) - 1;
        const beds = obj.greenhouseBedCultures || [];
        if (i >= 0 && i < beds.length) { flow = null; chooseGhBed(obj, i); return; }
      }
      addMsg('Ответь номером грядки в теплице, например «1».');
      return;
    }

    /* ждём список культур для плана */
    if (flow && flow.type === 'plan-ask') {
      const map = parseCrops(stripTriggers(text));
      if (map.size) { flow = null; buildPlan(map); return; }
      addMsg('Не распознал культуры. Пример: «томат 2, укроп, клубника 3». Регистр не важен.');
      return;
    }

    if (/что посадить|что посеять|подбери|порекоменд/.test(t)) { recommendFor(t); return; }
    if (/помоги посадить|план посадки|распланиру/.test(t)) { startPlan(stripTriggers(t)); return; }
    help();
  }

  greet();
})();