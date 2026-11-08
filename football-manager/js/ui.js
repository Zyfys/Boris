// Интерфейс игры. Состояние хранится в объекте S, сохраняется в localStorage.
(function () {
  'use strict';
  const E = window.FMEngine;
  const DATA = window.FM_DATA;
  const SAVE_KEY = 'brovka-save-v1';

  let S = null;
  let tab = 'overview';
  let startPick = null;
  let live = null; // { match, timer, speed }
  let transferFilter = { pos: '', q: '', maxPrice: '', minOvr: '' };
  let viewRound = null;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = () => $('#app');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',') + ' млн €';
  const moneyK = (v) => (v >= 1 ? money(v) : Math.round(v * 1000) + ' тыс. €');
  const seasonLabel = () => `${S.season}/${String(S.season + 1).slice(2)}`;

  // ---------- сохранение ----------
  function save() { try { localStorage.setItem(SAVE_KEY, E.serialize(S)); } catch (e) { /* хранилище недоступно */ } }
  function loadSave() {
    try { const j = localStorage.getItem(SAVE_KEY); return j ? E.deserialize(j) : null; } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ничего */ } }

  // ---------- мелкие компоненты ----------
  function crest(clubOrId, size) {
    const c = typeof clubOrId === 'string' ? (S ? S.clubs[clubOrId] : null) : clubOrId;
    if (!c) return '';
    return `<span class="crest ${size || ''}" style="--c1:${c.colors[0]};--c2:${c.colors[1]}" aria-hidden="true">${esc(c.id)}</span>`;
  }
  const clubCell = (id) => `<span class="club-cell">${crest(id, 'sm')}<span>${esc(S.clubs[id].name)}</span></span>`;
  const posBadge = (pos) => `<span class="pos ${pos}">${E.POS_RU[pos]}</span>`;
  function fitBar(f) {
    const cls = f >= 85 ? '' : f >= 70 ? 'mid' : 'low';
    return `<span class="fit" title="Физическая готовность ${Math.round(f)}%"><i class="${cls}" style="width:${Math.round(f)}%"></i></span>`;
  }
  function status(p) {
    if (p.injury > 0) return `<span class="tag bad">травма ${p.injury} нед.</span>`;
    if (p.suspended > 0) return `<span class="tag warn">дискв. ${p.suspended}</span>`;
    if (p.youth) return '<span class="tag">академия</span>';
    return '';
  }
  function stars(rep) {
    const n = Math.max(1, Math.min(5, Math.round((rep - 60) / 7)));
    return '<span class="stars" aria-label="Уровень ' + n + ' из 5">' + '★'.repeat(n) + '<span class="muted">' + '★'.repeat(5 - n) + '</span></span>';
  }
  function toast(text) {
    const t = $('#toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 3200);
  }
  function modal(html, buttons) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}<div class="actions"></div></div></div>`;
    const actions = $('.actions', root);
    (buttons || [{ label: 'Закрыть' }]).forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.label;
      el.addEventListener('click', () => { if (b.keep !== true) root.innerHTML = ''; if (b.onClick) b.onClick(); });
      actions.appendChild(el);
    });
    const first = actions.querySelector('.primary') || actions.querySelector('button');
    if (first) first.focus();
  }
  const closeModal = () => { $('#modal-root').innerHTML = ''; };

  // ---------- стартовый экран ----------
  function renderStart() {
    const league = DATA.leagues[0];
    const saved = loadSave();
    const clubs = league.clubs.slice().sort((a, b) => b.rep - a.rep);
    if (!startPick) startPick = 'ARS';
    app().innerHTML = `
      <section class="hero">
        <span class="label">Футбольный менеджер · ${esc(league.name)} · сезон ${league.season}/${String(league.season + 1).slice(2)}</span>
        <h1>Бровка</h1>
        <p>Возьмите клуб Премьер-лиги с реальным составом сезона 2025/26. Выбирайте схему и стартовый состав, покупайте игроков в трансферные окна, следите за бюджетом и выполняйте цель руководства. Матчи идут поминутно с текстовой трансляцией.</p>
      </section>
      ${saved ? `<section class="panel">
        <div class="row">
          ${crest(saved.clubs[saved.userClub], '')}
          <div class="grow"><strong>Сохранённая игра: ${esc(saved.clubs[saved.userClub].name)}</strong><br>
          <span class="muted">${esc(saved.manager)} · сезон ${saved.season}/${String(saved.season + 1).slice(2)} · тур ${Math.min(saved.round + 1, saved.fixtures.length)} из ${saved.fixtures.length}</span></div>
          <button class="btn primary" id="btn-continue">Продолжить</button>
        </div>
      </section>` : ''}
      <section class="panel">
        <div class="row">
          <label for="mgr-name" class="label">Имя тренера</label>
          <input id="mgr-name" type="text" value="Борис" maxlength="40" class="grow" style="max-width:280px">
        </div>
        <h2>Выберите клуб</h2>
        <div class="clubs" role="group" aria-label="Клубы">
          ${clubs.map((c) => `
            <button class="club-card" data-club="${c.id}" aria-pressed="${c.id === startPick}">
              ${crest(c, '')}
              <strong>${esc(c.name)}</strong>
              <small>${stars(c.rep)} · бюджет ${c.budget} млн €</small>
            </button>`).join('')}
        </div>
        <div class="row">
          <span class="muted grow" id="pick-info"></span>
          <button class="btn primary big" id="btn-start">${saved ? 'Новая игра' : 'Начать карьеру'}</button>
        </div>
      </section>`;
    const info = () => {
      const c = league.clubs.find((x) => x.id === startPick);
      $('#pick-info').textContent = `${c.name}, стадион «${c.stadium}». Бюджет на трансферы: ${c.budget} млн €.`;
    };
    info();
    app().querySelectorAll('.club-card').forEach((el) => el.addEventListener('click', () => {
      startPick = el.dataset.club;
      app().querySelectorAll('.club-card').forEach((x) => x.setAttribute('aria-pressed', String(x === el)));
      info();
    }));
    const cont = $('#btn-continue');
    if (cont) cont.addEventListener('click', () => { S = saved; tab = 'overview'; render(); });
    $('#btn-start').addEventListener('click', () => {
      const go = () => {
        S = E.newGame(DATA, league.id, startPick, $('#mgr-name').value.trim() || 'Тренер');
        S.assistant = true;
        tab = 'overview';
        save(); render();
      };
      if (saved) modal('<h2>Начать новую игру?</h2><p>Сохранённая карьера будет удалена.</p>', [{ label: 'Отмена' }, { label: 'Начать заново', cls: 'primary', onClick: go }]);
      else go();
    });
  }

  // ---------- основной экран ----------
  function header() {
    const me = S.clubs[S.userClub];
    const pos = E.positionOf(S, S.userClub);
    const played = S.round;
    const open = E.windowOpen(S);
    return `
      <header class="board">
        <div class="title">${crest(me, 'lg')}<div><h2>${esc(me.name)}</h2><span style="color:#9FB0A4">${esc(S.manager)} · ${esc(S.leagueName)}</span></div></div>
        <div class="meta">
          <div><span class="k">Сезон</span><span class="v">${seasonLabel()}</span></div>
          <div><span class="k">Тур</span><span class="v">${Math.min(played + 1, S.fixtures.length)}/${S.fixtures.length}</span></div>
          <div><span class="k">Место</span><span class="v">${played ? pos : '—'}</span></div>
          <div><span class="k">Касса</span><span class="v ${me.cash < 0 ? 'neg' : ''}">${money(me.cash)}</span></div>
          <div><span class="k">Окно</span><span class="v ${open ? 'window-on' : ''}">${open ? 'открыто' : 'закрыто'}</span></div>
        </div>
      </header>`;
  }
  const TABS = [['overview', 'Обзор'], ['squad', 'Состав и тактика'], ['fixtures', 'Календарь'], ['table', 'Таблица'], ['transfers', 'Трансферы'], ['club', 'Клуб']];

  function render() {
    if (!S) return renderStart();
    const body = { overview: viewOverview, squad: viewSquad, fixtures: viewFixtures, table: viewTable, transfers: viewTransfers, club: viewClub }[tab]();
    app().innerHTML = header() + `
      <nav class="tabs" role="tablist">${TABS.map(([id, l]) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${tab === id}">${l}</button>`).join('')}</nav>
      <main id="view">${body}</main>`;
    app().querySelectorAll('.tab').forEach((el) => el.addEventListener('click', () => { tab = el.dataset.tab; render(); }));
    bind[tab] && bind[tab]();
  }

  // ---------- Обзор ----------
  function formOf(clubId, n) {
    const row = E.table(S).find((r) => r.id === clubId);
    const map = { 'В': 'W', 'Н': 'D', 'П': 'L' };
    return `<span class="form">${row.form.slice(-n).map((x) => `<b class="${map[x]}">${x}</b>`).join('')}</span>`;
  }
  function viewOverview() {
    const me = S.clubs[S.userClub];
    let top;
    if (S.gameOver) {
      top = `<section class="panel"><h2>Карьера в клубе окончена</h2><p>${esc(S.gameOver)}</p>
        <div class="row"><button class="btn primary" id="btn-restart">Начать новую карьеру</button></div></section>`;
    } else if (S.seasonSummary) {
      const r = S.seasonSummary;
      top = `<section class="panel"><span class="label">Итоги сезона ${r.season}</span>
        <h2>Чемпион — ${esc(r.champion)}</h2>
        <div class="stat-row">
          <div><span class="label">Ваше место</span><span class="v">${r.pos}</span></div>
          <div><span class="label">Цель</span><span class="v">≤ ${r.expectation}</span></div>
          <div><span class="label">Очки</span><span class="v">${r.pts}</span></div>
          <div><span class="label">Лучший бомбардир</span><span>${esc(r.scorer)}</span></div>
        </div>
        <p>${esc(r.verdict)}</p>
        <div class="row"><button class="btn primary big" id="btn-newseason">Начать сезон ${S.season + 1}/${String(S.season + 2).slice(2)}</button></div></section>`;
    } else {
      const f = E.userFixture(S);
      const home = f.h === S.userClub;
      const opp = home ? f.a : f.h;
      const t = E.table(S);
      const oppPos = t.findIndex((r) => r.id === opp) + 1;
      top = `<section class="panel">
        <div class="row"><span class="label grow">Следующий матч · тур ${S.round + 1} · ${home ? 'дома' : 'в гостях'}</span>${S.round ? `<span class="muted">Соперник: ${oppPos}-е место ${formOf(opp, 5)}</span>` : ''}</div>
        <div class="next-match">
          <div class="side">${crest(f.h, 'lg')}<strong>${esc(S.clubs[f.h].name)}</strong></div>
          <div class="vs">VS</div>
          <div class="side">${crest(f.a, 'lg')}<strong>${esc(S.clubs[f.a].name)}</strong></div>
        </div>
        <p class="muted" style="margin:0;text-align:center">Стадион «${esc(S.clubs[f.h].stadium)}»</p>
        <div class="row" style="justify-content:center">
          <button class="btn primary big" id="btn-play">Играть матч</button>
          <button class="btn" id="btn-quick">Быстрый результат</button>
          <button class="btn ghost" id="btn-tosquad">Состав</button>
        </div>
      </section>`;
    }
    const t = E.table(S);
    const myIdx = t.findIndex((r) => r.id === S.userClub);
    const from = Math.max(0, Math.min(myIdx - 3, t.length - 7));
    const mini = t.slice(from, from + 7);
    return `<div class="grid-2">
      <div style="display:grid;gap:16px">${top}
        <section class="panel"><h2>Новости</h2><ul class="news">${S.news.slice(0, 14).map((n) => `<li><span class="label">${n.season}/${String(n.season + 1).slice(2)} · т.${n.round}</span>${esc(n.text)}</li>`).join('')}</ul></section>
      </div>
      <div style="display:grid;gap:16px">
        <section class="panel"><h2>Задача от руководства</h2>
          <div class="stat-row">
            <div><span class="label">Цель</span><span class="v">≤ ${S.expectation}</span></div>
            <div><span class="label">Сейчас</span><span class="v">${S.round ? myIdx + 1 : '—'}</span></div>
            <div><span class="label">Касса</span><span class="v">${money(me.cash)}</span></div>
          </div>
          <p class="muted" style="margin:0">Финиш ниже цели больше чем на 6 мест или долг свыше 60 млн € приведут к отставке.</p>
        </section>
        <section class="panel"><h2>Таблица</h2>${tableHtml(mini, from, true)}
          <button class="btn small ghost" id="btn-totable">Вся таблица</button></section>
      </div>
    </div>`;
  }

  function startSeason() { E.startNewSeason(S); delete S.seasonSummary; save(); render(); toast('Новый сезон начался!'); }
  const bind = {};
  bind.overview = () => {
    const on = (id, fn) => { const el = $('#' + id); if (el) el.addEventListener('click', fn); };
    on('btn-play', () => openMatch(false));
    on('btn-quick', () => openMatch(true));
    on('btn-tosquad', () => { tab = 'squad'; render(); });
    on('btn-totable', () => { tab = 'table'; render(); });
    on('btn-newseason', startSeason);
    on('btn-restart', () => { clearSave(); S = null; render(); });
  };

  // ---------- Состав ----------
  function playerLabel(p, slotPos) {
    const off = p.pos !== slotPos ? ' (не своя поз.)' : '';
    const st = p.injury > 0 ? ' — травма' : p.suspended > 0 ? ' — дискв.' : '';
    return `${p.name} · ${E.POS_RU[p.pos]} ${p.ovr} · ${Math.round(p.fitness)}%${off}${st}`;
  }
  function slotSelect(p, slotPos, idx, squad, prefix) {
    const opts = squad.map((x) => `<option value="${x.id}" ${p && x.id === p.id ? 'selected' : ''} ${E.available(x) ? '' : 'disabled'}>${esc(playerLabel(x, slotPos))}</option>`).join('');
    return `<select id="${prefix}-${idx}" data-idx="${idx}" aria-label="Позиция ${E.POS_RU[slotPos]} ${idx + 1}">${p ? '' : '<option value="">— пусто —</option>'}${opts}</select>`;
  }
  function pitchHtml(club, xi, squad, prefix) {
    const slots = E.slotsOf(club.formation);
    const lines = { FW: [], MF: [], DF: [], GK: [] };
    slots.forEach((pos, i) => lines[pos].push(i));
    const order = ['FW', 'MF', 'DF', 'GK'];
    const sorted = squad.slice().sort((a, b) => E.POS.indexOf(a.pos) - E.POS.indexOf(b.pos) || b.ovr - a.ovr);
    return `<div class="pitch">${order.map((pos) => `<div class="line">${lines[pos].map((i) => {
      const p = S.players[xi[i]];
      const warn = p && p.pos !== pos;
      return `<div class="slot ${warn ? 'warnslot' : ''}">${posBadge(pos)}${slotSelect(p, pos, i, sorted, prefix)}</div>`;
    }).join('')}</div>`).join('')}</div>`;
  }
  function viewSquad() {
    const club = S.clubs[S.userClub];
    if (!club.lineup) club.lineup = E.autoLineup(S, club.id, club.formation);
    const squad = E.clubPlayers(S, club.id);
    const inXI = new Set(club.lineup);
    const pw = E.teamPower(S, { xi: club.lineup, formation: club.formation, mentality: club.mentality });
    const rows = squad.slice().sort((a, b) => (inXI.has(b.id) - inXI.has(a.id)) || E.POS.indexOf(a.pos) - E.POS.indexOf(b.pos) || b.ovr - a.ovr);
    return `<div class="grid-2">
      <section class="panel">
        <div class="row">
          <label class="label" for="sel-formation">Схема</label>
          <select id="sel-formation">${Object.keys(E.FORMATIONS).map((f) => `<option ${f === club.formation ? 'selected' : ''}>${f}</option>`).join('')}</select>
          <label class="label" for="sel-mentality">Настрой</label>
          <select id="sel-mentality">${Object.entries(E.MENTALITY).map(([k, m]) => `<option value="${k}" ${k === club.mentality ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
        </div>
        ${pitchHtml(club, club.lineup, squad, 'slot')}
        <div class="row">
          <button class="btn" id="btn-auto">Лучший состав</button>
          <label class="row" style="gap:6px"><input type="checkbox" id="chk-assistant" ${S.assistant ? 'checked' : ''}> Помощник выбирает состав перед каждым матчем</label>
        </div>
        <div class="stat-row">
          <div><span class="label">Атака</span><span class="v">${pw.att.toFixed(1)}</span></div>
          <div><span class="label">Оборона</span><span class="v">${pw.def.toFixed(1)}</span></div>
          <div><span class="label">Контроль центра</span><span class="v">${pw.mid.toFixed(1)}</span></div>
        </div>
        <p class="muted" style="margin:0">Игрок не на своей позиции теряет 13–25% силы. Усталые игроки играют слабее: давайте основным отдых.</p>
      </section>
      <section class="panel"><h2>Игроки (${squad.length})</h2>
        <div class="tbl-wrap"><table>
          <thead><tr><th></th><th>Поз</th><th>Игрок</th><th class="n">Возр</th><th class="n">Рейт</th><th>Готов.</th><th class="n">И</th><th class="n">Г</th><th class="n">П</th><th class="n">Стоим.</th><th class="n">З/п в нед.</th><th></th></tr></thead>
          <tbody>${rows.map((p) => `<tr>
            <td>${inXI.has(p.id) ? '<span title="В основе">●</span>' : ''}</td>
            <td>${posBadge(p.pos)}</td>
            <td class="name">${esc(p.name)} ${status(p)}</td>
            <td class="n">${p.age}</td><td class="n ovr">${p.ovr}</td>
            <td>${fitBar(p.fitness)}</td>
            <td class="n">${p.stats.apps}</td><td class="n">${p.stats.goals}</td><td class="n">${p.stats.assists}</td>
            <td class="n">${money(E.playerValue(p))}</td><td class="n">${moneyK(p.wage)}</td>
            <td><button class="btn small" data-sell="${p.id}">Продать</button></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>
    </div>`;
  }
  function onSlotChange(lineup, idx, pid) {
    const j = lineup.indexOf(pid);
    if (j >= 0 && j !== idx) lineup[j] = lineup[idx];
    lineup[idx] = pid;
  }
  bind.squad = () => {
    const club = S.clubs[S.userClub];
    $('#sel-formation').addEventListener('change', (e) => { club.formation = e.target.value; club.lineup = E.autoLineup(S, club.id, club.formation); save(); render(); });
    $('#sel-mentality').addEventListener('change', (e) => { club.mentality = e.target.value; save(); render(); });
    $('#btn-auto').addEventListener('click', () => { club.lineup = E.autoLineup(S, club.id, club.formation); save(); render(); toast('Помощник собрал лучший состав с учётом усталости.'); });
    $('#chk-assistant').addEventListener('change', (e) => { S.assistant = e.target.checked; save(); });
    app().querySelectorAll('.pitch select').forEach((el) => el.addEventListener('change', () => {
      onSlotChange(club.lineup, +el.dataset.idx, el.value); save(); render();
    }));
    app().querySelectorAll('[data-sell]').forEach((el) => el.addEventListener('click', () => trySell(el.dataset.sell)));
  };
  function trySell(pid) {
    const p = S.players[pid];
    const offer = E.sellOffer(S, pid);
    if (!offer.ok) return toast(offer.why);
    modal(`<h2>Предложение по игроку</h2><p>«${esc(S.clubs[offer.buyer].name)}» предлагает за <strong>${esc(p.name)}</strong> ${money(offer.price)}.</p>
      <p class="muted">Оценочная стоимость: ${money(E.playerValue(p))}. Зарплата игрока уйдёт из фонда: ${moneyK(p.wage)} в неделю.</p>`,
    [{ label: 'Отказаться' }, { label: 'Продать', cls: 'primary', onClick: () => { const r = E.sellPlayer(S, pid, offer); toast(r.ok ? `${p.name} продан.` : r.why); save(); render(); } }]);
  }

  // ---------- Календарь ----------
  function resultBadge(f, clubId) {
    if (f.hg === null) return '<span class="muted">—</span>';
    const home = f.h === clubId;
    const my = home ? f.hg : f.ag, th = home ? f.ag : f.hg;
    const c = my > th ? 'W' : my === th ? 'D' : 'L';
    return `<span class="res ${c}">${f.hg}:${f.ag}</span>`;
  }
  function viewFixtures() {
    if (viewRound === null || viewRound >= S.fixtures.length) viewRound = Math.max(0, Math.min(S.round - 1, S.fixtures.length - 1));
    const mine = S.fixtures.map((r, i) => ({ i, f: r.find((m) => m.h === S.userClub || m.a === S.userClub) }));
    const round = S.fixtures[viewRound];
    return `<div class="grid-2">
      <section class="panel"><h2>Матчи «${esc(S.clubs[S.userClub].name)}»</h2>
        <div class="tbl-wrap"><table><thead><tr><th class="n">Тур</th><th></th><th>Соперник</th><th>Счёт</th></tr></thead><tbody>
        ${mine.map(({ i, f }) => {
          const home = f.h === S.userClub; const opp = home ? f.a : f.h;
          return `<tr class="${i === S.round ? 'me' : ''}"><td class="n">${i + 1}</td><td><span class="tag">${home ? 'дома' : 'выезд'}</span></td><td>${clubCell(opp)}</td><td>${resultBadge(f, S.userClub)}</td></tr>`;
        }).join('')}
        </tbody></table></div></section>
      <section class="panel">
        <div class="row"><h2 class="grow">Тур ${viewRound + 1}</h2>
          <button class="btn small" id="rd-prev" ${viewRound <= 0 ? 'disabled' : ''} aria-label="Предыдущий тур">←</button>
          <button class="btn small" id="rd-next" ${viewRound >= S.fixtures.length - 1 ? 'disabled' : ''} aria-label="Следующий тур">→</button></div>
        <div class="tbl-wrap"><table><tbody>
        ${round.map((f) => `<tr class="${f.h === S.userClub || f.a === S.userClub ? 'me' : ''}"><td>${clubCell(f.h)}</td><td class="mono" style="text-align:center">${f.hg === null ? '–:–' : f.hg + ':' + f.ag}</td><td>${clubCell(f.a)}</td></tr>`).join('')}
        </tbody></table></div></section>
    </div>`;
  }
  bind.fixtures = () => {
    $('#rd-prev').addEventListener('click', () => { viewRound--; render(); });
    $('#rd-next').addEventListener('click', () => { viewRound++; render(); });
  };

  // ---------- Таблица ----------
  function tableHtml(rows, offset, compact) {
    const n = Object.keys(S.clubs).length;
    const map = { 'В': 'W', 'Н': 'D', 'П': 'L' };
    return `<div class="tbl-wrap"><table>
      <thead><tr><th class="n">#</th><th>Клуб</th><th class="n">И</th>${compact ? '' : '<th class="n">В</th><th class="n">Н</th><th class="n">П</th><th class="n">Мячи</th>'}<th class="n">±</th><th class="n">О</th>${compact ? '' : '<th>Форма</th>'}</tr></thead>
      <tbody>${rows.map((r, i) => {
        const pos = offset + i + 1;
        const zone = pos <= 4 ? 'zone-cl' : pos === 5 ? 'zone-el' : pos > n - 3 ? 'zone-rel' : '';
        return `<tr class="${zone} ${r.id === S.userClub ? 'me' : ''}"><td class="n">${pos}</td><td>${clubCell(r.id)}</td><td class="n">${r.p}</td>
        ${compact ? '' : `<td class="n">${r.w}</td><td class="n">${r.d}</td><td class="n">${r.l}</td><td class="n">${r.gf}:${r.ga}</td>`}
        <td class="n">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="n"><strong>${r.pts}</strong></td>
        ${compact ? '' : `<td><span class="form">${r.form.slice(-5).map((x) => `<b class="${map[x]}">${x}</b>`).join('')}</span></td>`}</tr>`;
      }).join('')}</tbody></table></div>`;
  }
  function viewTable() {
    const scorers = E.topScorers(S, 15);
    return `<div class="grid-2">
      <section class="panel"><h2>Премьер-лига ${seasonLabel()}</h2>${tableHtml(E.table(S), 0, false)}
        <p class="muted" style="margin:0;font-size:13px"><span style="color:var(--cl)">■</span> Лига чемпионов · <span style="color:var(--el)">■</span> Лига Европы · <span style="color:var(--rel)">■</span> зона вылета</p></section>
      <section class="panel"><h2>Бомбардиры</h2>
        ${scorers.length ? `<div class="tbl-wrap"><table><thead><tr><th class="n">#</th><th>Игрок</th><th>Клуб</th><th class="n">Г</th><th class="n">П</th></tr></thead><tbody>
        ${scorers.map((p, i) => `<tr class="${p.clubId === S.userClub ? 'me' : ''}"><td class="n">${i + 1}</td><td class="name">${esc(p.name)}</td><td>${crest(p.clubId, 'sm')}</td><td class="n">${p.stats.goals}</td><td class="n">${p.stats.assists}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">Голов пока нет: сезон ещё не начался.</p>'}
      </section></div>`;
  }

  // ---------- Трансферы ----------
  function viewTransfers() {
    const me = S.clubs[S.userClub];
    const open = E.windowOpen(S);
    const tf = transferFilter;
    let list = Object.values(S.players).filter((p) => p.clubId !== S.userClub);
    if (tf.pos) list = list.filter((p) => p.pos === tf.pos);
    if (tf.q) { const q = tf.q.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q) || S.clubs[p.clubId].name.toLowerCase().includes(q)); }
    if (tf.minOvr) list = list.filter((p) => p.ovr >= +tf.minOvr);
    if (tf.maxPrice) list = list.filter((p) => E.askingPrice(S, p) <= +tf.maxPrice);
    list.sort((a, b) => b.ovr - a.ovr || a.age - b.age);
    const total = list.length;
    list = list.slice(0, 60);
    const nextWin = S.round < 19 ? 'зимнее окно откроется перед 20-м туром' : 'летнее окно откроется перед новым сезоном';
    return `<section class="panel">
      <div class="row"><h2 class="grow">Трансферный рынок</h2>
        <span class="tag ${open ? 'good' : 'warn'}">${open ? 'окно открыто' : 'окно закрыто: ' + nextWin}</span>
        <span>Касса: <strong class="mono">${money(me.cash)}</strong></span></div>
      <div class="row">
        <input id="tf-q" type="search" placeholder="Имя или клуб" value="${esc(tf.q)}" aria-label="Поиск">
        <select id="tf-pos" aria-label="Позиция"><option value="">Все позиции</option>${E.POS.map((p) => `<option value="${p}" ${tf.pos === p ? 'selected' : ''}>${{ GK: 'Вратари', DF: 'Защитники', MF: 'Полузащитники', FW: 'Нападающие' }[p]}</option>`).join('')}</select>
        <input id="tf-ovr" type="number" min="40" max="99" placeholder="Рейтинг от" value="${esc(tf.minOvr)}" aria-label="Минимальный рейтинг" style="width:120px">
        <input id="tf-price" type="number" min="0" placeholder="Цена до, млн" value="${esc(tf.maxPrice)}" aria-label="Максимальная цена" style="width:130px">
      </div>
      <p class="muted" style="margin:0">Показано ${list.length} из ${total}. Звёзды клуба стоят дороже; сильные игроки не пойдут в клуб низкого уровня.</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Поз</th><th>Игрок</th><th>Клуб</th><th class="n">Возр</th><th class="n">Рейт</th><th class="n">Стоимость</th><th class="n">Цена</th><th class="n">З/п</th><th></th></tr></thead>
        <tbody>${list.map((p) => {
          const chk = E.canBuy(S, p.id);
          return `<tr><td>${posBadge(p.pos)}</td><td class="name">${esc(p.name)} ${status(p)}</td><td>${clubCell(p.clubId)}</td>
          <td class="n">${p.age}</td><td class="n ovr">${p.ovr}</td><td class="n">${money(E.playerValue(p))}</td><td class="n"><strong>${money(E.askingPrice(S, p))}</strong></td><td class="n">${moneyK(p.wage * 1.1)}</td>
          <td><button class="btn small ${chk.ok ? 'primary' : ''}" data-buy="${p.id}" ${chk.ok ? '' : `title="${esc(chk.why)}"`}>Купить</button></td></tr>`;
        }).join('')}</tbody></table></div>
    </section>`;
  }
  bind.transfers = () => {
    const upd = (key, id) => $('#' + id).addEventListener('change', (e) => { transferFilter[key] = e.target.value; render(); });
    upd('pos', 'tf-pos'); upd('minOvr', 'tf-ovr'); upd('maxPrice', 'tf-price');
    let t;
    $('#tf-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { transferFilter.q = e.target.value; render(); const q = $('#tf-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 350); });
    app().querySelectorAll('[data-buy]').forEach((el) => el.addEventListener('click', () => {
      const p = S.players[el.dataset.buy];
      const chk = E.canBuy(S, p.id);
      if (!chk.ok) return toast(chk.why);
      modal(`<h2>Купить ${esc(p.name)}?</h2>
        <p>${esc(S.clubs[p.clubId].name)} просит ${money(chk.price)}. Зарплата игрока: ${moneyK(p.wage * 1.1)} в неделю.</p>
        <p class="muted">После покупки в кассе останется ${money(S.clubs[S.userClub].cash - chk.price)}.</p>`,
      [{ label: 'Отмена' }, { label: 'Купить', cls: 'primary', onClick: () => { const r = E.buyPlayer(S, p.id); toast(r.ok ? `${p.name} теперь ваш игрок!` : r.why); save(); render(); } }]);
    }));
  };

  // ---------- Клуб ----------
  function viewClub() {
    const me = S.clubs[S.userClub];
    const wages = E.wageBill(S, me.id);
    const gate = me.rep * 0.02;
    const weekly = me.sponsor + gate / 2 - wages;
    return `<div class="grid-2">
      <section class="panel"><h2>Финансы</h2>
        <div class="stat-row">
          <div><span class="label">Касса</span><span class="v">${money(me.cash)}</span></div>
          <div><span class="label">Баланс в неделю</span><span class="v" style="color:${weekly >= 0 ? 'var(--good)' : 'var(--bad)'}">${weekly >= 0 ? '+' : ''}${money(weekly)}</span></div>
        </div>
        <div class="tbl-wrap"><table><tbody>
          <tr><td>ТВ и спонсоры, в неделю</td><td class="n">${money(me.sponsor)}</td></tr>
          <tr><td>Билеты, за домашний матч</td><td class="n">${money(gate)}</td></tr>
          <tr><td>Фонд зарплат, в неделю</td><td class="n">−${money(wages)}</td></tr>
          <tr><td>Доходы за сезон</td><td class="n">${money(me.finance.income)}</td></tr>
          <tr><td>Зарплаты за сезон</td><td class="n">−${money(me.finance.wages)}</td></tr>
          <tr><td>Продажи игроков за сезон</td><td class="n">${money(me.finance.transfersIn)}</td></tr>
          <tr><td>Покупки игроков за сезон</td><td class="n">−${money(me.finance.transfersOut)}</td></tr>
        </tbody></table></div>
        <p class="muted" style="margin:0">В конце сезона клубы получают призовые за место в таблице: от 2 до 70 млн €.</p>
      </section>
      <section class="panel"><h2>Клуб</h2>
        <div class="row">${crest(me, 'lg')}<div><strong>${esc(me.name)}</strong><br><span class="muted">Стадион «${esc(me.stadium)}» · уровень ${stars(me.rep)}</span></div></div>
        <h3>История</h3>
        ${S.history.length ? `<div class="tbl-wrap"><table><thead><tr><th>Сезон</th><th class="n">Место</th><th class="n">Цель</th><th>Чемпион</th><th>Бомбардир</th></tr></thead><tbody>
        ${S.history.map((h) => `<tr><td>${h.season}</td><td class="n">${h.pos}</td><td class="n">${h.expectation}</td><td>${esc(h.champion)}</td><td>${esc(h.scorer)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Первый сезон ещё идёт.</p>'}
        <div class="row"><button class="btn ghost" id="btn-quit">Выйти в главное меню</button></div>
      </section></div>`;
  }
  bind.club = () => { $('#btn-quit').addEventListener('click', () => { save(); S = null; render(); }); };

  // ---------- Матч ----------
  function openMatch(quick) {
    const club = S.clubs[S.userClub];
    if (S.assistant) club.lineup = E.autoLineup(S, club.id, club.formation);
    const problems = E.validateLineup(S, club.id);
    const f = E.userFixture(S);
    const m = E.createMatch(S, f);
    if (quick) {
      m.autoUser = true;
      E.simulateMatch(S, m);
      return afterMatch(m);
    }
    live = { match: m, timer: null, speed: 2, side: f.h === S.userClub ? 'home' : 'away' };
    renderMatch();
    if (problems.length) toast(problems.join(' '));
    run();
  }
  const SPEEDS = { 1: 450, 2: 170, 3: 45 };
  function run() {
    stop();
    live.timer = setInterval(() => {
      E.stepMatch(S, live.match);
      if (live.match.done) stop();
      updateMatch();
    }, SPEEDS[live.speed]);
  }
  function stop() { if (live && live.timer) { clearInterval(live.timer); live.timer = null; } }

  function renderMatch() {
    const m = live.match;
    const mySide = m[live.side];
    const scr = document.createElement('div');
    scr.className = 'match-screen'; scr.id = 'match-screen';
    scr.innerHTML = `<div class="match-inner">
      <div class="scoreboard">
        <div class="team">${crest(m.home.id, 'lg')}<span>${esc(S.clubs[m.home.id].name)}</span></div>
        <div class="score"><span id="ms-score">0:0</span><span class="minute" id="ms-min">0'</span></div>
        <div class="team away">${crest(m.away.id, 'lg')}<span>${esc(S.clubs[m.away.id].name)}</span></div>
      </div>
      <div class="progress"><i id="ms-prog" style="width:0%"></i></div>
      <div class="row">
        <button class="btn" id="ms-pause">Пауза</button>
        <div class="speed" role="group" aria-label="Скорость">${[1, 2, 3].map((s) => `<button data-speed="${s}" aria-pressed="${live.speed === s}">${'▶'.repeat(s)}</button>`).join('')}</div>
        <button class="btn" id="ms-skip">До конца матча</button>
        <span class="grow"></span>
        <button class="btn primary" id="ms-done" hidden>Итоги тура</button>
      </div>
      <div class="grid-2">
        <section class="panel"><h2>Трансляция</h2><ul class="feed" id="ms-feed"></ul></section>
        <div style="display:grid;gap:16px;align-content:start">
          <section class="panel"><h2>Статистика</h2><div class="bars" id="ms-bars"></div></section>
          <section class="panel"><h2>Ваша команда</h2>
            <div class="row">
              <label class="label" for="ms-form">Схема</label>
              <select id="ms-form">${Object.keys(E.FORMATIONS).map((f) => `<option ${f === mySide.formation ? 'selected' : ''}>${f}</option>`).join('')}</select>
              <label class="label" for="ms-ment">Настрой</label>
              <select id="ms-ment">${Object.entries(E.MENTALITY).map(([k, v]) => `<option value="${k}" ${k === mySide.mentality ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
            </div>
            <div class="xi-list" id="ms-xi"></div>
            <h3 id="ms-subs-h">Замены</h3>
            <div class="row">
              <select id="ms-out" class="grow" aria-label="Кого заменить"></select>
              <select id="ms-in" class="grow" aria-label="Кто выходит"></select>
              <button class="btn" id="ms-sub">Заменить</button>
            </div>
          </section>
        </div>
      </div></div>`;
    document.body.appendChild(scr);
    document.body.style.overflow = 'hidden';
    $('#ms-pause').addEventListener('click', () => {
      if (live.match.done) return;
      if (live.timer) { stop(); $('#ms-pause').textContent = 'Продолжить'; } else { run(); $('#ms-pause').textContent = 'Пауза'; }
    });
    scr.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
      live.speed = +b.dataset.speed;
      scr.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (live.timer) run();
    }));
    $('#ms-skip').addEventListener('click', () => { stop(); while (!live.match.done) E.stepMatch(S, live.match); updateMatch(); });
    $('#ms-form').addEventListener('change', (e) => { mySide.formation = e.target.value; S.clubs[S.userClub].formation = e.target.value; updateMatch(); });
    $('#ms-ment').addEventListener('change', (e) => { mySide.mentality = e.target.value; });
    $('#ms-sub').addEventListener('click', () => {
      const out = $('#ms-out').value, inn = $('#ms-in').value;
      if (!out || !inn) return;
      if (E.makeSub(S, live.match, live.side, out, inn)) updateMatch();
      else toast('Замена невозможна.');
    });
    $('#ms-done').addEventListener('click', () => {
      const m2 = live.match; stop();
      scr.remove(); document.body.style.overflow = '';
      live = null;
      afterMatch(m2);
    });
    updateMatch();
  }

  function updateMatch() {
    const m = live.match;
    const mySide = m[live.side];
    $('#ms-score').textContent = `${m.home.goals}:${m.away.goals}`;
    $('#ms-min').textContent = m.done ? 'Матч окончен' : m.minute + "'";
    $('#ms-prog').style.width = (m.minute / 90 * 100) + '%';
    const feed = $('#ms-feed');
    const shown = feed.children.length;
    const evs = m.events;
    for (let i = shown; i < evs.length; i++) {
      const e = evs[i];
      const li = document.createElement('li');
      li.className = e.type + (e.side ? ' ' + e.side : '');
      const team = e.side ? `${S.clubs[m[e.side].id].name}. ` : '';
      li.innerHTML = `<span class="m">${e.minute}'</span><span>${e.side && e.type !== 'goal' ? `<span class="muted">${esc(team)}</span>` : ''}${esc(e.text)}</span>`;
      feed.prepend(li);
    }
    const poss = m.minute ? Math.round(m.home.possession / m.minute * 100) : 50;
    const bar = (lbl, a, b) => {
      const tot = a + b || 1;
      return `<div class="bar"><span class="lbl">${lbl}</span><span>${a}</span><span class="track"><i style="width:${a / tot * 100}%;background:var(--accent)"></i><i style="width:${b / tot * 100}%;background:var(--muted)"></i></span><span style="text-align:right">${b}</span></div>`;
    };
    $('#ms-bars').innerHTML = bar('Владение, %', poss, 100 - poss) + bar('Удары', m.home.shots, m.away.shots) + bar('В створ', m.home.onTarget, m.away.onTarget);
    const slots = E.slotsOf(mySide.formation);
    $('#ms-xi').innerHTML = mySide.xi.map((pid, i) => {
      const p = S.players[pid];
      return p ? `<div>${posBadge(slots[i])}<span>${esc(p.name)}${p.pos !== slots[i] ? ' <span class="muted">(' + E.POS_RU[p.pos] + ')</span>' : ''}${mySide.yellows[p.id] ? ' <i class="ycard" title="Жёлтая карточка"></i>' : ''}</span>${fitBar(p.fitness)}</div>`
        : `<div>${posBadge(slots[i])}<span class="muted">— удалён / нет игрока</span><span></span></div>`;
    }).join('');
    const left = E.MAX_SUBS - mySide.subs;
    $('#ms-subs-h').textContent = `Замены (осталось ${left})`;
    const outSel = $('#ms-out'), inSel = $('#ms-in');
    const keepOut = outSel.value, keepIn = inSel.value;
    outSel.innerHTML = mySide.xi.filter(Boolean).map((pid) => { const p = S.players[pid]; return `<option value="${pid}">${esc(p.name)} (${E.POS_RU[p.pos]}, ${Math.round(p.fitness)}%)</option>`; }).join('');
    inSel.innerHTML = E.benchFor(S, mySide).sort((a, b) => E.POS.indexOf(a.pos) - E.POS.indexOf(b.pos) || b.ovr - a.ovr)
      .map((p) => `<option value="${p.id}">${esc(p.name)} (${E.POS_RU[p.pos]} ${p.ovr})</option>`).join('');
    if (keepOut && outSel.querySelector(`option[value="${keepOut}"]`)) outSel.value = keepOut;
    if (keepIn && inSel.querySelector(`option[value="${keepIn}"]`)) inSel.value = keepIn;
    const dis = m.done || left <= 0;
    $('#ms-sub').disabled = dis; outSel.disabled = dis; inSel.disabled = dis;
    if (m.done) {
      $('#ms-done').hidden = false; $('#ms-pause').disabled = true; $('#ms-skip').disabled = true;
      $('#ms-done').focus();
    }
  }

  function afterMatch(m) {
    const roundIdx = S.round;
    E.finishRound(S, m);
    const round = S.fixtures[roundIdx];
    let seasonEnd = false;
    if (E.seasonOver(S) && !S.seasonSummary && !S.gameOver) { S.seasonSummary = E.endSeason(S); seasonEnd = true; }
    save();
    tab = 'overview';
    render();
    const f = m.fixture;
    const scorers = (side) => m[side].scorers.map((s) => `${esc(S.players[s.pid] ? S.players[s.pid].name : '?')} ${s.minute}'`).join(', ');
    modal(`<span class="label">Тур ${roundIdx + 1}</span>
      <h2>${esc(S.clubs[f.h].name)} ${f.hg}:${f.ag} ${esc(S.clubs[f.a].name)}</h2>
      ${m.home.scorers.length || m.away.scorers.length ? `<p class="muted" style="margin:0">${scorers('home') || '—'} | ${scorers('away') || '—'}</p>` : ''}
      <div class="tbl-wrap"><table><tbody>${round.map((x) => `<tr class="${x === f ? 'me' : ''}"><td>${clubCell(x.h)}</td><td class="mono" style="text-align:center">${x.hg}:${x.ag}</td><td>${clubCell(x.a)}</td></tr>`).join('')}</tbody></table></div>
      ${seasonEnd ? '<p><strong>Сезон завершён!</strong> Итоги — на главном экране.</p>' : ''}
      ${S.gameOver && !seasonEnd ? `<p><strong>${esc(S.gameOver)}</strong></p>` : ''}`);
  }

  // ---------- запуск ----------
  const saved = loadSave();
  if (saved) S = null; // начинаем со стартового экрана, где можно продолжить
  render();
  window.__brovka = { get state() { return S; } };
})();
