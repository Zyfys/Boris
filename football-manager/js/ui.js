// Интерфейс игры. Состояние карьеры — объект S (сохраняется в localStorage), состояние экрана — переменные ниже.
(function () {
  'use strict';
  const E = window.FMEngine, P = window.FMPeople, M = window.FMMarket;
  const DATA = window.FM_DATA;
  const SAVE_KEY = 'brovka-save-v2';

  let S = null;
  let tab = 'overview';
  let detail = null; // { type: 'player' | 'club', id }
  let startPick = 'ARS';
  let live = null;
  let tf = { pos: '', q: '', maxPrice: '', minOvr: '', maxAge: '', scope: 'all', wonder: false };
  let viewRound = null;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const app = () => $('#app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = M.fmt, wage = M.fmtWage;
  const seasonLabel = (y) => `${y}/${String(y + 1).slice(2)}`;

  // ---------- сохранение ----------
  function save() { try { localStorage.setItem(SAVE_KEY, E.serialize(S)); } catch (e) { /* хранилище недоступно */ } }
  function loadSave() { try { const j = localStorage.getItem(SAVE_KEY); return j ? E.deserialize(j) : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ничего */ } }

  // ---------- мелкие компоненты ----------
  function crest(clubOrId, size) {
    const c = typeof clubOrId === 'string' ? (S ? S.clubs[clubOrId] : null) : clubOrId;
    if (!c) return '';
    const px = { lg: 60, sm: 22, xl: 96 }[size] || 34;
    return `<span class="crest">${window.FMCrest.crestSVG(c, px)}</span>`;
  }
  const clubLink = (id) => (id && S.clubs[id]
    ? `<a href="#" class="club-cell link" data-club="${id}">${crest(id, 'sm')}<span>${esc(S.clubs[id].name)}</span></a>`
    : '<span class="club-cell muted">свободный агент</span>');
  const playerLink = (p) => `<a href="#" class="link" data-player="${p.id}">${esc(p.name)}</a>`;
  const posBadge = (pos) => `<span class="pos ${pos}">${E.POS_RU[pos]}</span>`;
  function fitBar(f) {
    const cls = f >= 85 ? '' : f >= 70 ? 'mid' : 'low';
    return `<span class="fit" title="Готовность ${Math.round(f)}%"><i class="${cls}" style="width:${Math.round(f)}%"></i></span>`;
  }
  function moraleTag(p) { const m = P.moraleLabel(p.morale); return `<span class="tag ${m.cls}" title="Настроение ${Math.round(p.morale)}">${m.label}</span>`; }
  function status(p) {
    const t = [];
    if (p.injury > 0) t.push(`<span class="tag bad">травма ${p.injury} нед.</span>`);
    if (p.suspended > 0) t.push(`<span class="tag warn">дискв. ${p.suspended}</span>`);
    if (P.isWonderkid(p) && (p.clubId === S.userClub || p.scouted)) t.push('<span class="tag star">вундеркинд</span>');
    if (p.wantsOut) t.push('<span class="tag bad">хочет уйти</span>');
    if (p.listed) t.push('<span class="tag warn">на трансфере</span>');
    return t.join(' ');
  }
  function potText(p) { const [lo, hi] = P.potRange(S, p); return lo === hi ? String(lo) : `${lo}–${hi}`; }
  const contractText = (p) => `до лета ${p.contract.until + 1}`;
  function stars(rep) {
    const n = Math.max(1, Math.min(5, Math.round((rep - 60) / 7)));
    return `<span class="stars" aria-label="Уровень ${n} из 5">${'★'.repeat(n)}<span class="muted">${'★'.repeat(5 - n)}</span></span>`;
  }
  function toast(text) {
    const t = $('#toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 3600);
  }
  function modal(html, buttons) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}<div class="actions"></div></div></div>`;
    const actions = $('.actions', root);
    (buttons || [{ label: 'Закрыть' }]).forEach((b) => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.label;
      el.addEventListener('click', () => { if (!b.keep) root.innerHTML = ''; if (b.onClick) b.onClick(); });
      actions.appendChild(el);
    });
    const first = actions.querySelector('.primary') || actions.querySelector('button');
    if (first) first.focus();
    return root;
  }
  const closeModal = () => { $('#modal-root').innerHTML = ''; };

  // Переходы по ссылкам на игроков и клубы — в любом месте страницы
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-player],[data-club]');
    if (!a || !S || a.closest('.match-screen')) return;
    e.preventDefault();
    if (a.closest('#modal-root')) closeModal();
    detail = a.dataset.player ? { type: 'player', id: a.dataset.player } : { type: 'club', id: a.dataset.club };
    if (detail.type === 'club' && detail.id === S.userClub) { detail = null; tab = 'squad'; }
    render();
    window.scrollTo(0, 0);
  });

  // ---------- стартовый экран ----------
  function renderStart() {
    const league = DATA.leagues[0];
    const saved = loadSave();
    const clubs = league.clubs.slice().sort((a, b) => b.rep - a.rep);
    app().innerHTML = `
      <section class="hero">
        <span class="label">Футбольный менеджер · ${esc(league.name)} · сезон ${seasonLabel(league.season)}</span>
        <h1>Бровка</h1>
        <p>Возьмите клуб Премьер-лиги с реальным составом сезона 2025/26. Собирайте состав, торгуйтесь с клубами и агентами, растите вундеркиндов, следите за настроением игроков и выполняйте цель руководства.</p>
      </section>
      ${saved ? `<section class="panel">
        <div class="row">
          ${crest(saved.clubs[saved.userClub], 'lg')}
          <div class="grow"><strong>Сохранённая игра: ${esc(saved.clubs[saved.userClub].name)}</strong><br>
          <span class="muted">${esc(saved.manager)} · сезон ${seasonLabel(saved.season)} · тур ${Math.min(saved.round + 1, saved.fixtures.length)} из ${saved.fixtures.length}</span></div>
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
            <button class="club-card" data-pick="${c.id}" aria-pressed="${c.id === startPick}">
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
    $$('.club-card').forEach((el) => el.addEventListener('click', () => {
      startPick = el.dataset.pick;
      $$('.club-card').forEach((x) => x.setAttribute('aria-pressed', String(x === el)));
      info();
    }));
    const cont = $('#btn-continue');
    if (cont) cont.addEventListener('click', () => { S = saved; tab = 'overview'; detail = null; render(); });
    $('#btn-start').addEventListener('click', () => {
      const go = () => {
        S = E.newGame(DATA, league.id, startPick, $('#mgr-name').value.trim() || 'Тренер');
        S.assistant = true;
        tab = 'overview'; detail = null;
        save(); render();
      };
      if (saved) modal('<h2>Начать новую игру?</h2><p>Сохранённая карьера будет удалена.</p>', [{ label: 'Отмена' }, { label: 'Начать заново', cls: 'primary', onClick: go }]);
      else go();
    });
  }

  // ---------- каркас ----------
  function unread() { return S.inbox.filter((m) => !m.read).length; }
  function header() {
    const me = S.clubs[S.userClub];
    const open = E.windowOpen(S);
    return `
      <header class="board">
        <div class="title">${crest(me, 'lg')}<div><h2>${esc(me.name)}</h2><span class="board-sub">${esc(S.manager)} · ${esc(S.leagueName)}</span></div></div>
        <div class="meta">
          <div><span class="k">Сезон</span><span class="v">${seasonLabel(S.season)}</span></div>
          <div><span class="k">Тур</span><span class="v">${Math.min(S.round + 1, S.fixtures.length)}/${S.fixtures.length}</span></div>
          <div><span class="k">Место</span><span class="v">${S.round ? E.positionOf(S, S.userClub) : '—'}</span></div>
          <div><span class="k">Касса</span><span class="v ${me.cash < 0 ? 'neg' : ''}">${money(me.cash)}</span></div>
          <div><span class="k">Окно</span><span class="v ${open ? 'window-on' : ''}">${open ? 'открыто' : 'закрыто'}</span></div>
        </div>
      </header>`;
  }
  const TABS = [['overview', 'Обзор'], ['inbox', 'Почта'], ['squad', 'Состав'], ['training', 'Тренировки'], ['fixtures', 'Календарь'], ['table', 'Таблица'], ['transfers', 'Трансферы'], ['club', 'Клуб']];

  function render() {
    if (!S) return renderStart();
    let body;
    if (detail && detail.type === 'player' && S.players[detail.id]) body = viewPlayer(S.players[detail.id]);
    else if (detail && detail.type === 'club' && S.clubs[detail.id]) body = viewClubPage(S.clubs[detail.id]);
    else { detail = null; body = VIEWS[tab](); }
    const n = unread();
    app().innerHTML = header() + `
      <nav class="tabs" role="tablist">${TABS.map(([id, l]) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${!detail && tab === id}">${l}${id === 'inbox' && n ? ` <span class="badge">${n}</span>` : ''}</button>`).join('')}</nav>
      <main id="view">${body}</main>`;
    $$('.tab').forEach((el) => el.addEventListener('click', () => { tab = el.dataset.tab; detail = null; render(); }));
    if (detail) BIND[detail.type] && BIND[detail.type]();
    else BIND[tab] && BIND[tab]();
  }
  const VIEWS = {}, BIND = {};

  // ---------- Обзор ----------
  const NEWS_KIND = { transfer: ['Трансфер', ''], rumour: ['Слухи', 'warn'], result: ['Результат', ''], star: ['Звезда тура', 'star'], club: ['Клуб', 'good'], squad: ['Команда', ''], info: ['Новость', ''] };
  function formOf(clubId, n) {
    const row = E.table(S).find((r) => r.id === clubId);
    const map = { 'В': 'W', 'Н': 'D', 'П': 'L' };
    return `<span class="form">${row.form.slice(-n).map((x) => `<b class="${map[x]}">${x}</b>`).join('')}</span>`;
  }
  function reportHtml(r) {
    if (!r) return '';
    const list = (arr, fn) => (arr.length ? `<ul class="plain">${arr.map((x) => `<li>${fn(x)}</li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Нет.</p>');
    const pl = (x) => (S.players[x.id] ? playerLink(S.players[x.id]) : esc(x.name));
    return `<div class="report">
      <div><h3>Выросли</h3>${list(r.improved, (x) => `${pl(x)} <span class="mono good-t">${x.from} → ${x.to}</span>`)}</div>
      <div><h3>Сдали</h3>${list(r.declined, (x) => `${pl(x)} <span class="mono bad-t">${x.from} → ${x.to}</span> <span class="muted">${x.age} лет</span>`)}</div>
      <div><h3>Ушли: истёк контракт</h3>${list(r.released, (x) => `${esc(x.name)} <span class="muted">(${x.ovr})</span>`)}</div>
      <div><h3>Контракт горит (следующее лето)</h3>${list(r.nextYear, (x) => `${pl(x)} <span class="muted">${x.ovr}, ${x.age} лет</span>`)}</div>
      <div><h3>Потеряли мотивацию</h3>${list(r.unhappy, (x) => `${pl(x)} <span class="muted">настроение ${x.morale}${x.wantsOut ? ', хочет уйти' : ''}</span>`)}</div>
      <div><h3>Ветераны 33+</h3>${list(r.veterans, (x) => `${pl(x)} <span class="muted">${x.age} лет, ${x.ovr}</span>`)}</div>
      <div><h3>Таланты</h3>${list(r.talents, (x) => `${pl(x)} <span class="muted">${x.age} лет, ${x.ovr}</span>`)}</div>
      <div><h3>Завершили карьеру</h3>${list(r.retired || [], (x) => `${esc(x.name)} <span class="muted">${x.age} лет</span>`)}</div>
    </div>`;
  }
  VIEWS.overview = function () {
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
          <div><span class="label">Лучший бомбардир лиги</span><span>${esc(r.scorer)}</span></div>
        </div>
        <p style="margin:0">${esc(r.verdict)}</p>
        <h2>Отчёт по команде</h2>${reportHtml(S.report)}
        <div class="row"><button class="btn primary big" id="btn-newseason">Начать сезон ${seasonLabel(S.season + 1)}</button></div></section>`;
    } else {
      const f = E.userFixture(S);
      const home = f.h === S.userClub;
      const opp = home ? f.a : f.h;
      const oppPos = E.positionOf(S, opp);
      top = `<section class="panel">
        <div class="row"><span class="label grow">Следующий матч · тур ${S.round + 1} · ${home ? 'дома' : 'в гостях'}</span>${S.round ? `<span class="muted">Соперник: ${oppPos}-е место ${formOf(opp, 5)}</span>` : ''}</div>
        <div class="next-match">
          <a href="#" data-club="${f.h}" class="side link">${crest(f.h, 'lg')}<strong>${esc(S.clubs[f.h].name)}</strong></a>
          <div class="vs">VS</div>
          <a href="#" data-club="${f.a}" class="side link">${crest(f.a, 'lg')}<strong>${esc(S.clubs[f.a].name)}</strong></a>
        </div>
        <p class="muted" style="margin:0;text-align:center">Стадион «${esc(S.clubs[f.h].stadium)}»</p>
        <div class="row" style="justify-content:center">
          <button class="btn primary big" id="btn-play">Играть матч</button>
          <button class="btn" id="btn-quick">Быстрый результат</button>
        </div>
      </section>`;
    }
    const t = E.table(S);
    const myIdx = t.findIndex((r) => r.id === S.userClub);
    const from = Math.max(0, Math.min(myIdx - 3, t.length - 7));
    const n = unread();
    const urgent = S.inbox.filter((m) => !m.resolved && (m.type === 'bid' || m.type === 'agent') ).length;
    return `<div class="grid-2">
      <div class="stack">${top}
        <section class="panel"><h2>Новости</h2><ul class="news">${S.news.slice(0, 18).map((x) => {
          const [l, c] = NEWS_KIND[x.kind] || NEWS_KIND.info;
          return `<li><span class="tag ${c}">${l}</span> ${esc(x.text)} <span class="label">т.${x.round}</span></li>`;
        }).join('')}</ul></section>
      </div>
      <div class="stack">
        ${n ? `<section class="panel attention"><div class="row"><div class="grow"><strong>${n} непрочитанных писем</strong>${urgent ? `<br><span class="muted">Ждут ответа: ${urgent}</span>` : ''}</div><button class="btn primary" id="btn-inbox">Открыть почту</button></div></section>` : ''}
        <section class="panel"><h2>Задача от руководства</h2>
          <div class="stat-row">
            <div><span class="label">Цель</span><span class="v">≤ ${S.expectation}</span></div>
            <div><span class="label">Сейчас</span><span class="v">${S.round ? myIdx + 1 : '—'}</span></div>
            <div><span class="label">Касса</span><span class="v">${money(me.cash)}</span></div>
          </div>
          <p class="muted" style="margin:0">Финиш ниже цели больше чем на 6 мест или долг свыше 60 млн € приведут к отставке.</p>
        </section>
        <section class="panel"><h2>Таблица</h2>${tableHtml(t.slice(from, from + 7), from, true)}
          <button class="btn small ghost" id="btn-totable">Вся таблица</button></section>
      </div>
    </div>`;
  };
  function startSeason() { E.startNewSeason(S); delete S.seasonSummary; S.report = null; save(); render(); toast('Новый сезон начался! Летнее трансферное окно открыто.'); }
  BIND.overview = () => {
    const on = (id, fn) => { const el = $('#' + id); if (el) el.addEventListener('click', fn); };
    on('btn-play', () => openMatch(false));
    on('btn-quick', () => openMatch(true));
    on('btn-totable', () => { tab = 'table'; render(); });
    on('btn-inbox', () => { tab = 'inbox'; render(); });
    on('btn-newseason', startSeason);
    on('btn-restart', () => { clearSave(); S = null; render(); });
  };

  // ---------- Почта ----------
  const MAIL_KIND = { bid: ['Предложение', 'warn'], agent: ['Агент', 'star'], morale: ['Игрок', 'bad'], youth: ['Академия', 'good'], contract: ['Контракты', 'warn'], board: ['Руководство', 'bad'], info: ['Клуб', ''] };
  const RESOLVED = { accepted: 'Принято', rejected: 'Отклонено', withdrawn: 'Клуб отказался', expired: 'Истекло', dismissed: 'Отклонено', done: 'Готово' };
  VIEWS.inbox = function () {
    if (!S.inbox.length) return '<section class="panel"><p class="muted">Писем пока нет.</p></section>';
    return `<section class="panel"><h2>Почта</h2><div class="mail-list">${S.inbox.map((m) => {
      const [l, c] = MAIL_KIND[m.type] || MAIL_KIND.info;
      const p = m.pid && S.players[m.pid];
      let actions = '';
      if (!m.resolved) {
        if (m.type === 'bid') actions = `<div class="row">
          <button class="btn small primary" data-bid="${m.id}" data-act="accept">Принять ${money(m.amount)}</button>
          <input type="number" min="0" step="0.5" id="cnt-${m.id}" value="${(m.amount * 1.2).toFixed(1)}" style="width:110px" aria-label="Встречная сумма, млн €">
          <button class="btn small" data-bid="${m.id}" data-act="counter">Встречное</button>
          <button class="btn small ghost" data-bid="${m.id}" data-act="reject">Отклонить</button></div>`;
        if (m.type === 'agent' && p) actions = `<div class="row">
          <button class="btn small primary" data-neg="${p.id}" data-mail="${m.id}">Начать переговоры</button>
          <button class="btn small ghost" data-dismiss="${m.id}">Не интересно</button></div>`;
      }
      return `<article class="mail ${m.read ? '' : 'unread'}">
        <div class="row"><span class="tag ${c}">${l}</span><strong class="grow">${esc(m.title)}</strong><span class="label">${seasonLabel(m.season)} · т.${m.round}</span></div>
        <p>${esc(m.text)}</p>
        ${p ? `<p style="margin:0">${posBadge(p.pos)} ${playerLink(p)} <span class="muted">${p.age} лет · ${p.ovr} · ${p.clubId ? esc(S.clubs[p.clubId].name) : 'свободный агент'}</span></p>` : ''}
        ${m.resolved ? `<span class="tag">${RESOLVED[m.resolved] || 'Закрыто'}</span>` : actions}
      </article>`;
    }).join('')}</div></section>`;
  };
  BIND.inbox = () => {
    S.inbox.forEach((m) => { m.read = true; });
    save();
    $$('[data-bid]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.bid, act = b.dataset.act;
      const amount = act === 'counter' ? $('#cnt-' + id).value : null;
      const r = M.respondBid(S, id, act, amount);
      toast(r.ok ? r.text : r.why); save(); render();
    }));
    $$('[data-dismiss]').forEach((b) => b.addEventListener('click', () => {
      const m = S.inbox.find((x) => x.id === b.dataset.dismiss);
      m.resolved = 'dismissed'; save(); render();
    }));
    $$('[data-neg]').forEach((b) => b.addEventListener('click', () => {
      const m = S.inbox.find((x) => x.id === b.dataset.mail);
      startNegotiation(b.dataset.neg, () => { if (m) m.resolved = 'done'; });
    }));
  };

  // ---------- Состав ----------
  function playerLabel(p, slotPos) {
    const off = p.pos !== slotPos ? ' (не своя поз.)' : '';
    const st = p.injury > 0 ? ' — травма' : p.suspended > 0 ? ' — дискв.' : '';
    return `${p.name} · ${E.POS_RU[p.pos]} ${p.ovr} · ${Math.round(p.fitness)}%${off}${st}`;
  }
  function pitchHtml(club, xi, squad) {
    const slots = E.slotsOf(club.formation);
    const lines = { FW: [], MF: [], DF: [], GK: [] };
    slots.forEach((pos, i) => lines[pos].push(i));
    const sorted = squad.slice().sort((a, b) => E.POS.indexOf(a.pos) - E.POS.indexOf(b.pos) || b.ovr - a.ovr);
    return `<div class="pitch">${['FW', 'MF', 'DF', 'GK'].map((pos) => `<div class="line">${lines[pos].map((i) => {
      const p = S.players[xi[i]];
      const opts = sorted.map((x) => `<option value="${x.id}" ${p && x.id === p.id ? 'selected' : ''} ${E.available(x) ? '' : 'disabled'}>${esc(playerLabel(x, pos))}</option>`).join('');
      return `<div class="slot ${p && p.pos !== pos ? 'warnslot' : ''}">${posBadge(pos)}<select id="slot-${i}" data-idx="${i}" aria-label="Позиция ${E.POS_RU[pos]}">${p ? '' : '<option value="">— пусто —</option>'}${opts}</select></div>`;
    }).join('')}</div>`).join('')}</div>`;
  }
  VIEWS.squad = function () {
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
        ${pitchHtml(club, club.lineup, squad)}
        <div class="row">
          <button class="btn" id="btn-auto">Лучший состав</button>
          <label class="row" style="gap:6px"><input type="checkbox" id="chk-assistant" ${S.assistant ? 'checked' : ''}> Помощник выбирает состав перед каждым матчем</label>
        </div>
        <div class="stat-row">
          <div><span class="label">Атака</span><span class="v">${pw.att.toFixed(1)}</span></div>
          <div><span class="label">Оборона</span><span class="v">${pw.def.toFixed(1)}</span></div>
          <div><span class="label">Контроль центра</span><span class="v">${pw.mid.toFixed(1)}</span></div>
        </div>
        <p class="muted" style="margin:0">Игрок не на своей позиции теряет 13–25% силы. Усталость и плохое настроение тоже снижают игру. Нажмите на имя игрока, чтобы открыть его карточку.</p>
      </section>
      <section class="panel"><h2>Игроки (${squad.length})</h2>
        <div class="tbl-wrap"><table>
          <thead><tr><th></th><th>Поз</th><th>Игрок</th><th class="n">Возр</th><th class="n">Рейт</th><th>Готов.</th><th>Настроение</th><th class="n">И</th><th class="n">Г</th><th>Контракт</th></tr></thead>
          <tbody>${rows.map((p) => `<tr>
            <td>${inXI.has(p.id) ? '<span title="В основе">●</span>' : ''}</td>
            <td>${posBadge(p.pos)}</td>
            <td class="name">${playerLink(p)} ${status(p)}</td>
            <td class="n">${p.age}</td><td class="n ovr">${p.ovr}</td>
            <td>${fitBar(p.fitness)}</td><td>${moraleTag(p)}</td>
            <td class="n">${p.stats.apps}</td><td class="n">${p.stats.goals}</td>
            <td class="${p.contract.until === S.season ? 'bad-t' : ''}">${contractText(p)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>
    </div>`;
  };
  BIND.squad = () => {
    const club = S.clubs[S.userClub];
    $('#sel-formation').addEventListener('change', (e) => { club.formation = e.target.value; club.lineup = E.autoLineup(S, club.id, club.formation); save(); render(); });
    $('#sel-mentality').addEventListener('change', (e) => { club.mentality = e.target.value; save(); render(); });
    $('#btn-auto').addEventListener('click', () => { club.lineup = E.autoLineup(S, club.id, club.formation); save(); render(); toast('Помощник собрал лучший состав с учётом усталости и настроения.'); });
    $('#chk-assistant').addEventListener('change', (e) => { S.assistant = e.target.checked; save(); });
    $$('.pitch select').forEach((el) => el.addEventListener('change', () => {
      const idx = +el.dataset.idx, pid = el.value;
      const j = club.lineup.indexOf(pid);
      if (j >= 0 && j !== idx) club.lineup[j] = club.lineup[idx];
      club.lineup[idx] = pid;
      save(); render();
    }));
  };

  // ---------- Тренировки ----------
  VIEWS.training = function () {
    const squad = E.clubPlayers(S, S.userClub).sort((a, b) => a.age - b.age || b.pot - a.pot);
    const focusOpts = (p) => Object.entries(P.TRAINING_FOCUS).map(([k, l]) => `<option value="${k}" ${p.training.focus === k ? 'selected' : ''}>${l}</option>`).join('');
    const intOpts = (p) => Object.entries(P.INTENSITY).map(([k, v]) => `<option value="${k}" ${p.training.intensity === k ? 'selected' : ''}>${v.label}</option>`).join('');
    return `<section class="panel">
      <div class="row"><h2 class="grow">Тренировки</h2>
        <label class="label" for="tr-all">Нагрузка для всех</label>
        <select id="tr-all"><option value="">—</option>${Object.entries(P.INTENSITY).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
      <p class="muted" style="margin:0">Молодые растут быстрее, особенно если играют и довольны. Фокус ускоряет рост выбранного навыка. Интенсивная нагрузка даёт +35% к развитию, но утомляет и повышает риск травм. Лёгкая бережёт ветеранов. После 30 лет навыки постепенно снижаются.</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Поз</th><th>Игрок</th><th class="n">Возр</th><th class="n">Рейт</th><th class="n">Потенциал</th><th class="n">За сезон</th><th>Готов.</th><th>Фокус</th><th>Нагрузка</th></tr></thead>
        <tbody>${squad.map((p) => {
          const d = p.ovr - p.ovrStart;
          return `<tr><td>${posBadge(p.pos)}</td><td class="name">${playerLink(p)} ${P.isWonderkid(p) ? '<span class="tag star">вундеркинд</span>' : ''}</td>
          <td class="n">${p.age}</td><td class="n ovr">${p.ovr}</td><td class="n">${potText(p)}</td>
          <td class="n ${d > 0 ? 'good-t' : d < 0 ? 'bad-t' : 'muted'}">${d > 0 ? '+' : ''}${d}</td>
          <td>${fitBar(p.fitness)}</td>
          <td><select data-focus="${p.id}" aria-label="Фокус ${esc(p.name)}">${focusOpts(p)}</select></td>
          <td><select data-int="${p.id}" aria-label="Нагрузка ${esc(p.name)}">${intOpts(p)}</select></td></tr>`;
        }).join('')}</tbody></table></div>
    </section>`;
  };
  BIND.training = () => {
    $$('[data-focus]').forEach((el) => el.addEventListener('change', () => { S.players[el.dataset.focus].training.focus = el.value; save(); }));
    $$('[data-int]').forEach((el) => el.addEventListener('change', () => { S.players[el.dataset.int].training.intensity = el.value; save(); }));
    $('#tr-all').addEventListener('change', (e) => {
      if (!e.target.value) return;
      E.clubPlayers(S, S.userClub).forEach((p) => { p.training.intensity = e.target.value; });
      save(); render(); toast('Нагрузка изменена для всей команды.');
    });
  };

  // ---------- Карточка игрока ----------
  function viewPlayer(p) {
    const own = p.clubId === S.userClub;
    const w = P.WEIGHTS[p.pos];
    const keys = P.ATTRS.slice().sort((a, b) => (w[b] || 0) - (w[a] || 0));
    const attrBar = (k) => {
      const v = p.attrs[k];
      const cls = v >= 85 ? 'a-top' : v >= 70 ? 'a-good' : v >= 55 ? 'a-mid' : 'a-low';
      return `<div class="attr ${w[k] ? '' : 'minor'}"><span>${P.ATTR_RU[k]}</span><span class="track"><i class="${cls}" style="width:${v}%"></i></span><b class="mono">${v}</b></div>`;
    };
    const ml = P.moraleLabel(p.morale);
    const value = E.playerValue(p, S);
    const role = p.role ? P.ROLES[p.role].label : '—';
    const chk = own ? null : M.canStartBuy(S, p);
    const ask = p.clubId && !own ? M.askingPrice(S, p) : null;
    const left = p.contract.until - S.season;
    const actions = own ? `
        <button class="btn primary" id="pl-renew" ${left >= 3 ? 'disabled title="Продлевать рано"' : ''}>Продлить контракт</button>
        <button class="btn" id="pl-list">${p.listed ? 'Снять с трансфера' : 'Выставить на трансфер'}</button>
        <button class="btn" id="pl-talk" ${p.promise ? 'disabled' : ''}>Пообещать игровое время</button>
        <button class="btn ghost" id="pl-release">Расторгнуть контракт</button>`
      : `<button class="btn primary" id="pl-buy" ${chk.ok ? '' : `title="${esc(chk.why)}"`}>${p.clubId ? 'Начать переговоры' : 'Предложить контракт'}</button>
        ${p.scouted ? '' : '<button class="btn" id="pl-scout">Отправить скаута (50 тыс. €)</button>'}`;
    return `<div class="stack">
      <div class="row"><button class="btn ghost small" id="btn-back">← Назад</button></div>
      <section class="panel player-head">
        <div class="ph-rating"><span class="big-ovr">${p.ovr}</span><span class="label">рейтинг</span></div>
        <div class="grow" style="min-width:0">
          <div class="row" style="gap:8px">${posBadge(p.pos)}<span class="label">${E.POS_RU_FULL[p.pos]} · ${p.age} лет${p.origin ? ' · ' + esc(p.origin) : ''}</span></div>
          <h1 class="pname">${esc(p.name)}</h1>
          <div class="row" style="gap:8px">${clubLink(p.clubId)} ${status(p)}</div>
        </div>
        <div class="ph-pot"><span class="label">Потенциал</span><span class="mono pot">${potText(p)}</span>${!own && !p.scouted ? '<span class="muted" style="font-size:12px">оценка без скаута</span>' : ''}</div>
      </section>
      ${chk && !chk.ok ? `<p class="muted" style="margin:0">${esc(chk.why)}</p>` : ''}
      <div class="row">${actions}</div>
      <div class="grid-2">
        <section class="panel"><h2>Навыки</h2><div class="attrs">${keys.map(attrBar).join('')}</div>
          ${own ? `<h3>Тренировки</h3><div class="row">
            <label class="label" for="pl-focus">Фокус</label><select id="pl-focus">${Object.entries(P.TRAINING_FOCUS).map(([k, l]) => `<option value="${k}" ${p.training.focus === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <label class="label" for="pl-int">Нагрузка</label><select id="pl-int">${Object.entries(P.INTENSITY).map(([k, v]) => `<option value="${k}" ${p.training.intensity === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>` : ''}
        </section>
        <div class="stack">
          <section class="panel"><h2>Контракт и настроение</h2>
            <dl class="kv">
              <dt>Зарплата</dt><dd>${wage(p.contract.wage)} в неделю</dd>
              <dt>Контракт</dt><dd class="${left <= 0 && p.clubId ? 'bad-t' : ''}">${p.clubId ? contractText(p) : 'нет клуба'}</dd>
              <dt>Роль</dt><dd>${role}${p.promisedRole ? ' <span class="muted">(обещана)</span>' : ''}</dd>
              <dt>Стоимость</dt><dd>${money(value)}</dd>
              ${ask ? `<dt>Цена клуба</dt><dd>≈ ${money(ask)}</dd>` : ''}
              <dt>Настроение</dt><dd><span class="tag ${ml.cls}">${ml.label}</span> <span class="fit wide"><i class="${p.morale >= 62 ? '' : p.morale >= 42 ? 'mid' : 'low'}" style="width:${Math.round(p.morale)}%"></i></span></dd>
              <dt>Готовность</dt><dd>${fitBar(p.fitness)} ${Math.round(p.fitness)}%</dd>
              ${p.promise ? `<dt>Обещание</dt><dd>${p.promise.need} матча до ${p.promise.until}-го тура</dd>` : ''}
            </dl>
          </section>
          <section class="panel"><h2>Статистика</h2>
            <div class="stat-row">
              <div><span class="label">Матчи</span><span class="v">${p.stats.apps}</span></div>
              <div><span class="label">Голы</span><span class="v">${p.stats.goals}</span></div>
              <div><span class="label">Передачи</span><span class="v">${p.stats.assists}</span></div>
              <div><span class="label">ЖК / КК</span><span class="v">${p.stats.yellow}/${p.stats.red}</span></div>
            </div>
            ${p.history.length ? `<div class="tbl-wrap"><table><thead><tr><th>Сезон</th><th>Клуб</th><th class="n">И</th><th class="n">Г</th><th class="n">П</th><th class="n">Рейт</th></tr></thead><tbody>
              ${p.history.slice().reverse().map((h) => `<tr><td>${h.season}</td><td>${esc(h.club)}</td><td class="n">${h.apps}</td><td class="n">${h.goals}</td><td class="n">${h.assists}</td><td class="n">${h.ovr}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">История появится после первого сезона.</p>'}
          </section>
        </div>
      </div>
    </div>`;
  }
  BIND.player = () => {
    const p = S.players[detail.id];
    const on = (id, fn) => { const el = $('#' + id); if (el) el.addEventListener('click', fn); };
    on('btn-back', () => { detail = null; render(); });
    on('pl-renew', () => {
      const r = M.startRenew(S, p.id);
      if (!r.ok) return toast(r.why);
      renderNeg();
    });
    on('pl-list', () => { const r = M.toggleList(S, p.id); toast(r.listed ? `${p.name} выставлен на трансфер: ждите предложений.` : `${p.name} снят с трансфера.`); save(); render(); });
    on('pl-talk', () => { const r = P.promisePlaytime(S, p); toast(r.ok ? r.text : r.why); save(); render(); });
    on('pl-release', () => {
      const cost = M.releaseCost(S, p);
      modal(`<h2>Расторгнуть контракт с ${esc(p.name)}?</h2><p>Клуб выплатит игроку компенсацию ${money(cost)} (половину оставшейся зарплаты). Игрок станет свободным агентом.</p>`,
        [{ label: 'Отмена' }, { label: 'Расторгнуть', cls: 'primary', onClick: () => { const r = M.releasePlayer(S, p.id); toast(r.ok ? `Контракт расторгнут. Выплачено ${money(r.cost)}.` : r.why); save(); detail = null; render(); } }]);
    });
    on('pl-buy', () => startNegotiation(p.id));
    on('pl-scout', () => { const r = M.scoutPlayer(S, p.id); toast(r.ok ? r.text : r.why); save(); render(); });
    const f = $('#pl-focus'); if (f) f.addEventListener('change', () => { p.training.focus = f.value; save(); });
    const i = $('#pl-int'); if (i) i.addEventListener('change', () => { p.training.intensity = i.value; save(); });
  };

  // ---------- Переговоры ----------
  let negDone = null;
  function startNegotiation(pid, onDone) {
    const r = M.startBuy(S, pid);
    if (!r.ok) return toast(r.why);
    negDone = onDone || null;
    renderNeg();
  }
  function renderNeg() {
    const n = S.neg;
    if (!n) return closeModal();
    const p = S.players[n.pid];
    const me = S.clubs[S.userClub];
    const title = n.kind === 'renew' ? `Новый контракт: ${esc(p.name)}` : `Переговоры: ${esc(p.name)}`;
    const log = `<div class="neg-log">${n.log.map((l) => `<p class="${l.who}">${esc(l.text)}</p>`).join('')}</div>`;
    let form = '';
    if (n.stage === 'club') {
      form = `<div class="neg-form">
        <span class="label">Этап 1 из 2 · договориться с «${esc(S.clubs[p.clubId].name)}»</span>
        <div class="row"><label for="neg-fee">Ваше предложение, млн €</label>
        <input id="neg-fee" type="number" min="0" step="0.5" value="${(n.ask * 0.85).toFixed(1)}" style="width:130px"></div>
        <p class="muted" style="margin:0">Клуб просит ${money(n.ask)}. В кассе ${money(me.cash)}. Терпение клуба: ${'●'.repeat(Math.max(0, n.patience))}${'○'.repeat(Math.max(0, 3 - n.patience))}</p></div>`;
    } else if (n.stage === 'player') {
      const d = n.demand;
      form = `<div class="neg-form">
        <span class="label">${n.kind === 'buy' ? 'Этап 2 из 2 · ' : ''}договориться с игроком и агентом</span>
        <div class="row">
          <label for="neg-wage">Зарплата, тыс. € в неделю</label>
          <input id="neg-wage" type="number" min="1" step="1" value="${Math.round(d.wage * 800)}" style="width:110px">
        </div>
        <div class="row">
          <label for="neg-years">Срок</label>
          <select id="neg-years">${[1, 2, 3, 4, 5].map((y) => `<option value="${y}" ${y === d.years ? 'selected' : ''}>${y} ${M.years(y)}</option>`).join('')}</select>
          <label for="neg-role">Роль</label>
          <select id="neg-role">${Object.entries(P.ROLES).map(([k, r]) => `<option value="${k}" ${k === d.role ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
        </div>
        <p class="muted" style="margin:0">Сейчас получает ${wage(p.contract.wage)}. Комиссия агента: ${money(d.agentFee)}${n.fee ? `, сумма трансфера: ${money(n.fee)}` : ''}. Обещанную роль игрок будет ждать: если не дать игрового времени, настроение упадёт. Терпение: ${'●'.repeat(Math.max(0, n.patience))}${'○'.repeat(Math.max(0, 3 - n.patience))}</p></div>`;
    }
    const finished = n.stage === 'done' || n.stage === 'failed';
    const root = modal(`<h2>${title}</h2>
      <div class="row" style="gap:8px">${posBadge(p.pos)}<span class="muted">${p.age} лет · рейтинг ${p.ovr} · потенциал ${potText(p)} · ${p.clubId && p.clubId !== S.userClub ? esc(S.clubs[p.clubId].name) : p.clubId ? 'ваш игрок' : 'свободный агент'}</span></div>
      ${log}${form}`, finished
      ? [{ label: 'Закрыть', cls: 'primary', onClick: () => { const ok = n.stage === 'done'; M.cancelNeg(S); if (ok && negDone) negDone(); negDone = null; save(); render(); } }]
      : [{ label: 'Прекратить переговоры', onClick: () => { M.cancelNeg(S); negDone = null; save(); render(); } },
        { label: n.stage === 'club' ? 'Предложить сумму' : 'Предложить контракт', cls: 'primary', keep: true, onClick: () => {
          const r = n.stage === 'club' ? M.offerFee(S, $('#neg-fee').value)
            : M.offerContract(S, { wage: (+$('#neg-wage').value) / 1000, years: $('#neg-years').value, role: $('#neg-role').value });
          if (!r.ok) return toast(r.why);
          save(); renderNeg();
        } }]);
    const lg = $('.neg-log', root); if (lg) lg.scrollTop = lg.scrollHeight;
  }

  // ---------- Страница клуба ----------
  function viewClubPage(c) {
    const sq = E.clubPlayers(S, c.id).sort((a, b) => E.POS.indexOf(a.pos) - E.POS.indexOf(b.pos) || b.ovr - a.ovr);
    const pos = S.round ? E.positionOf(S, c.id) : '—';
    const results = [];
    S.fixtures.forEach((r, i) => r.forEach((f) => { if ((f.h === c.id || f.a === c.id) && f.hg !== null) results.push({ i, f }); }));
    const avg = sq.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11).reduce((s, p) => s + p.ovr, 0) / 11;
    return `<div class="stack">
      <div class="row"><button class="btn ghost small" id="btn-back">← Назад</button></div>
      <section class="panel"><div class="row">${crest(c, 'xl')}<div class="grow"><h1 class="pname">${esc(c.name)}</h1>
        <span class="muted">Стадион «${esc(c.stadium)}» · уровень ${stars(c.rep)}</span>
        <div class="stat-row" style="margin-top:8px">
          <div><span class="label">Место</span><span class="v">${pos}</span></div>
          <div><span class="label">Сила основы</span><span class="v">${avg.toFixed(1)}</span></div>
          <div><span class="label">Игроков</span><span class="v">${sq.length}</span></div>
          <div><span class="label">Форма</span>${S.round ? formOf(c.id, 5) : '—'}</div>
        </div></div></div></section>
      <div class="grid-2">
        <section class="panel"><h2>Состав</h2><div class="tbl-wrap"><table>
          <thead><tr><th>Поз</th><th>Игрок</th><th class="n">Возр</th><th class="n">Рейт</th><th class="n">Потенц.</th><th class="n">И</th><th class="n">Г</th><th class="n">Стоимость</th></tr></thead>
          <tbody>${sq.map((p) => `<tr><td>${posBadge(p.pos)}</td><td class="name">${playerLink(p)} ${status(p)}</td><td class="n">${p.age}</td><td class="n ovr">${p.ovr}</td><td class="n">${potText(p)}</td><td class="n">${p.stats.apps}</td><td class="n">${p.stats.goals}</td><td class="n">${money(E.playerValue(p, S))}</td></tr>`).join('')}</tbody>
        </table></div></section>
        <section class="panel"><h2>Результаты</h2>${results.length ? `<div class="tbl-wrap"><table><tbody>${results.slice(-10).reverse().map(({ i, f }) => `<tr><td class="n muted">${i + 1}</td><td>${clubLink(f.h)}</td><td class="mono" style="text-align:center">${resultBadge(f, c.id)}</td><td>${clubLink(f.a)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Сезон ещё не начался.</p>'}</section>
      </div></div>`;
  }
  BIND.club = () => { $('#btn-back').addEventListener('click', () => { detail = null; render(); }); };

  // ---------- Календарь ----------
  function resultBadge(f, clubId) {
    if (f.hg === null) return '<span class="muted">—</span>';
    const home = f.h === clubId;
    const my = home ? f.hg : f.ag, th = home ? f.ag : f.hg;
    return `<span class="res ${my > th ? 'W' : my === th ? 'D' : 'L'}">${f.hg}:${f.ag}</span>`;
  }
  VIEWS.fixtures = function () {
    if (viewRound === null || viewRound >= S.fixtures.length) viewRound = Math.max(0, Math.min(S.round - 1, S.fixtures.length - 1));
    const mine = S.fixtures.map((r, i) => ({ i, f: r.find((m) => m.h === S.userClub || m.a === S.userClub) }));
    const round = S.fixtures[viewRound];
    return `<div class="grid-2">
      <section class="panel"><h2>Матчи «${esc(S.clubs[S.userClub].name)}»</h2>
        <div class="tbl-wrap"><table><thead><tr><th class="n">Тур</th><th></th><th>Соперник</th><th>Счёт</th></tr></thead><tbody>
        ${mine.map(({ i, f }) => {
          const home = f.h === S.userClub; const opp = home ? f.a : f.h;
          return `<tr class="${i === S.round ? 'me' : ''}"><td class="n">${i + 1}</td><td><span class="tag">${home ? 'дома' : 'выезд'}</span></td><td>${clubLink(opp)}</td><td>${resultBadge(f, S.userClub)}</td></tr>`;
        }).join('')}
        </tbody></table></div></section>
      <section class="panel">
        <div class="row"><h2 class="grow">Тур ${viewRound + 1}</h2>
          <button class="btn small" id="rd-prev" ${viewRound <= 0 ? 'disabled' : ''} aria-label="Предыдущий тур">←</button>
          <button class="btn small" id="rd-next" ${viewRound >= S.fixtures.length - 1 ? 'disabled' : ''} aria-label="Следующий тур">→</button></div>
        <div class="tbl-wrap"><table><tbody>
        ${round.map((f) => `<tr class="${f.h === S.userClub || f.a === S.userClub ? 'me' : ''}"><td>${clubLink(f.h)}</td><td class="mono" style="text-align:center">${f.hg === null ? '–:–' : f.hg + ':' + f.ag}</td><td>${clubLink(f.a)}</td></tr>`).join('')}
        </tbody></table></div></section>
    </div>`;
  };
  BIND.fixtures = () => {
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
        return `<tr class="${zone} ${r.id === S.userClub ? 'me' : ''}"><td class="n">${pos}</td><td>${clubLink(r.id)}</td><td class="n">${r.p}</td>
        ${compact ? '' : `<td class="n">${r.w}</td><td class="n">${r.d}</td><td class="n">${r.l}</td><td class="n">${r.gf}:${r.ga}</td>`}
        <td class="n">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="n"><strong>${r.pts}</strong></td>
        ${compact ? '' : `<td><span class="form">${r.form.slice(-5).map((x) => `<b class="${map[x]}">${x}</b>`).join('')}</span></td>`}</tr>`;
      }).join('')}</tbody></table></div>`;
  }
  VIEWS.table = function () {
    const scorers = E.topScorers(S, 15);
    return `<div class="grid-2">
      <section class="panel"><h2>${esc(S.leagueName)} ${seasonLabel(S.season)}</h2>${tableHtml(E.table(S), 0, false)}
        <p class="muted" style="margin:0;font-size:13px"><span style="color:var(--cl)">■</span> Лига чемпионов · <span style="color:var(--el)">■</span> Лига Европы · <span style="color:var(--rel)">■</span> зона вылета</p></section>
      <section class="panel"><h2>Бомбардиры</h2>
        ${scorers.length ? `<div class="tbl-wrap"><table><thead><tr><th class="n">#</th><th>Игрок</th><th>Клуб</th><th class="n">Г</th><th class="n">П</th></tr></thead><tbody>
        ${scorers.map((p, i) => `<tr class="${p.clubId === S.userClub ? 'me' : ''}"><td class="n">${i + 1}</td><td class="name">${playerLink(p)}</td><td><a href="#" data-club="${p.clubId}" class="link">${crest(p.clubId, 'sm')}</a></td><td class="n">${p.stats.goals}</td><td class="n">${p.stats.assists}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">Голов пока нет: сезон ещё не начался.</p>'}
      </section></div>`;
  };

  // ---------- Трансферы ----------
  VIEWS.transfers = function () {
    const me = S.clubs[S.userClub];
    const open = E.windowOpen(S);
    let list = Object.values(S.players).filter((p) => p.clubId !== S.userClub);
    if (tf.scope === 'free') list = list.filter((p) => !p.clubId);
    if (tf.scope === 'clubs') list = list.filter((p) => p.clubId);
    if (tf.pos) list = list.filter((p) => p.pos === tf.pos);
    if (tf.q) { const q = tf.q.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.clubId && S.clubs[p.clubId].name.toLowerCase().includes(q))); }
    if (tf.minOvr) list = list.filter((p) => p.ovr >= +tf.minOvr);
    if (tf.maxAge) list = list.filter((p) => p.age <= +tf.maxAge);
    if (tf.maxPrice) list = list.filter((p) => !p.clubId || M.askingPrice(S, p) <= +tf.maxPrice);
    if (tf.wonder) list = list.filter((p) => p.age <= 21 && P.potRange(S, p)[1] >= 83);
    list.sort((a, b) => b.ovr - a.ovr || a.age - b.age);
    const total = list.length;
    list = list.slice(0, 60);
    const nextWin = S.round < 19 ? 'зимнее окно откроется перед 20-м туром' : 'летнее окно откроется перед новым сезоном';
    const mine = E.clubPlayers(S, S.userClub).filter((p) => p.listed || p.wantsOut);
    return `<div class="stack"><section class="panel">
      <div class="row"><h2 class="grow">Трансферный рынок</h2>
        <span class="tag ${open ? 'good' : 'warn'}">${open ? 'окно открыто' : 'окно закрыто: ' + nextWin}</span>
        <span>Касса: <strong class="mono">${money(me.cash)}</strong></span></div>
      <div class="row">
        <input id="tf-q" type="search" placeholder="Имя или клуб" value="${esc(tf.q)}" aria-label="Поиск">
        <select id="tf-scope" aria-label="Кого показать"><option value="all" ${tf.scope === 'all' ? 'selected' : ''}>Все игроки</option><option value="clubs" ${tf.scope === 'clubs' ? 'selected' : ''}>Игроки клубов</option><option value="free" ${tf.scope === 'free' ? 'selected' : ''}>Свободные агенты</option></select>
        <select id="tf-pos" aria-label="Позиция"><option value="">Все позиции</option>${E.POS.map((p) => `<option value="${p}" ${tf.pos === p ? 'selected' : ''}>${{ GK: 'Вратари', DF: 'Защитники', MF: 'Полузащитники', FW: 'Нападающие' }[p]}</option>`).join('')}</select>
        <input id="tf-ovr" type="number" min="40" max="99" placeholder="Рейтинг от" value="${esc(tf.minOvr)}" aria-label="Минимальный рейтинг" style="width:110px">
        <input id="tf-age" type="number" min="15" max="40" placeholder="Возраст до" value="${esc(tf.maxAge)}" aria-label="Максимальный возраст" style="width:110px">
        <input id="tf-price" type="number" min="0" placeholder="Цена до, млн" value="${esc(tf.maxPrice)}" aria-label="Максимальная цена" style="width:120px">
        <label class="row" style="gap:6px"><input type="checkbox" id="tf-wonder" ${tf.wonder ? 'checked' : ''}> Только таланты</label>
      </div>
      <p class="muted" style="margin:0">Показано ${list.length} из ${total}. Переговоры идут в два этапа: сначала цена с клубом, потом контракт с игроком и агентом. Свободных агентов можно подписать в любой момент.</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Поз</th><th>Игрок</th><th>Клуб</th><th class="n">Возр</th><th class="n">Рейт</th><th class="n">Потенц.</th><th class="n">Стоимость</th><th class="n">Цена</th><th>Контракт</th><th></th></tr></thead>
        <tbody>${list.map((p) => {
          const chk = M.canStartBuy(S, p);
          return `<tr><td>${posBadge(p.pos)}</td><td class="name">${playerLink(p)} ${status(p)}</td><td>${clubLink(p.clubId)}</td>
          <td class="n">${p.age}</td><td class="n ovr">${p.ovr}</td><td class="n">${potText(p)}</td><td class="n">${money(E.playerValue(p, S))}</td>
          <td class="n"><strong>${p.clubId ? money(M.askingPrice(S, p)) : 'бесплатно'}</strong></td><td>${p.clubId ? contractText(p) : '—'}</td>
          <td><button class="btn small ${chk.ok ? 'primary' : ''}" data-neg="${p.id}" ${chk.ok ? '' : `title="${esc(chk.why)}"`}>Переговоры</button></td></tr>`;
        }).join('')}</tbody></table></div>
    </section>
    <section class="panel"><h2>Ваши игроки на продажу</h2>
      ${mine.length ? `<div class="tbl-wrap"><table><tbody>${mine.map((p) => `<tr><td>${posBadge(p.pos)}</td><td class="name">${playerLink(p)} ${status(p)}</td><td class="n">${p.ovr}</td><td class="n">${money(E.playerValue(p, S))}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted" style="margin:0">Никого. Выставить игрока на трансфер можно в его карточке: предложения придут в почту, пока открыто окно.</p>'}
    </section></div>`;
  };
  BIND.transfers = () => {
    const upd = (key, id, prop) => $('#' + id).addEventListener('change', (e) => { tf[key] = prop ? e.target[prop] : e.target.value; render(); });
    upd('pos', 'tf-pos'); upd('minOvr', 'tf-ovr'); upd('maxPrice', 'tf-price'); upd('maxAge', 'tf-age'); upd('scope', 'tf-scope'); upd('wonder', 'tf-wonder', 'checked');
    let t;
    $('#tf-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { tf.q = e.target.value; render(); const q = $('#tf-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 350); });
    $$('[data-neg]').forEach((el) => el.addEventListener('click', () => startNegotiation(el.dataset.neg)));
  };

  // ---------- Клуб (свой) ----------
  VIEWS.club = function () {
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
          <tr><td>Покупки и комиссии за сезон</td><td class="n">−${money(me.finance.transfersOut)}</td></tr>
        </tbody></table></div>
        <p class="muted" style="margin:0">В конце сезона клубы получают призовые за место в таблице: от 2 до 70 млн €.</p>
      </section>
      <section class="panel"><h2>Клуб</h2>
        <div class="row">${crest(me, 'xl')}<div><strong>${esc(me.name)}</strong><br><span class="muted">Стадион «${esc(me.stadium)}» · уровень ${stars(me.rep)}</span></div></div>
        <h3>История</h3>
        ${S.history.length ? `<div class="tbl-wrap"><table><thead><tr><th>Сезон</th><th class="n">Место</th><th class="n">Цель</th><th>Чемпион</th><th>Бомбардир</th></tr></thead><tbody>
        ${S.history.map((h) => `<tr><td>${h.season}</td><td class="n">${h.pos}</td><td class="n">${h.expectation}</td><td>${esc(h.champion)}</td><td>${esc(h.scorer)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Первый сезон ещё идёт.</p>'}
        <div class="row"><button class="btn ghost" id="btn-quit">Выйти в главное меню</button></div>
      </section></div>`;
  };
  const bindOwnClub = () => { $('#btn-quit').addEventListener('click', () => { save(); S = null; render(); }); };
  // вкладка «Клуб» и страница чужого клуба используют разные обработчики
  const bindClubPage = BIND.club;
  BIND.club = () => (detail ? bindClubPage() : bindOwnClub());

  // ---------- Матч ----------
  function openMatch(quick) {
    const club = S.clubs[S.userClub];
    if (S.assistant) club.lineup = E.autoLineup(S, club.id, club.formation);
    const problems = E.validateLineup(S, club.id);
    const f = E.userFixture(S);
    const m = E.createMatch(S, f);
    if (quick) { m.autoUser = true; E.simulateMatch(S, m); return afterMatch(m); }
    live = { match: m, timer: null, speed: 2, side: f.h === S.userClub ? 'home' : 'away' };
    renderMatch();
    if (problems.length) toast(problems.join(' '));
    run();
  }
  const SPEEDS = { 1: 450, 2: 170, 3: 45 };
  function run() {
    stop();
    live.timer = setInterval(() => { E.stepMatch(S, live.match); if (live.match.done) stop(); updateMatch(); }, SPEEDS[live.speed]);
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
        <div class="stack">
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
    $$('[data-speed]', scr).forEach((b) => b.addEventListener('click', () => {
      live.speed = +b.dataset.speed;
      $$('[data-speed]', scr).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (live.timer) run();
    }));
    $('#ms-skip').addEventListener('click', () => { stop(); while (!live.match.done) E.stepMatch(S, live.match); updateMatch(); });
    $('#ms-form').addEventListener('change', (e) => { mySide.formation = e.target.value; S.clubs[S.userClub].formation = e.target.value; updateMatch(); });
    $('#ms-ment').addEventListener('change', (e) => { mySide.mentality = e.target.value; });
    $('#ms-sub').addEventListener('click', () => {
      const out = $('#ms-out').value, inn = $('#ms-in').value;
      if (!out || !inn) return;
      if (E.makeSub(S, live.match, live.side, out, inn)) updateMatch(); else toast('Замена невозможна.');
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
    for (let i = feed.children.length; i < m.events.length; i++) {
      const e = m.events[i];
      const li = document.createElement('li');
      li.className = e.type;
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
    if (m.done) { $('#ms-done').hidden = false; $('#ms-pause').disabled = true; $('#ms-skip').disabled = true; $('#ms-done').focus(); }
  }

  function afterMatch(m) {
    const roundIdx = S.round;
    const mailBefore = S.inbox.length;
    E.finishRound(S, m);
    const round = S.fixtures[roundIdx];
    let seasonEnd = false;
    if (E.seasonOver(S) && !S.seasonSummary && !S.gameOver) { S.seasonSummary = E.endSeason(S); seasonEnd = true; }
    save();
    tab = 'overview'; detail = null;
    render();
    const f = m.fixture;
    const newMail = S.inbox.length - mailBefore;
    const scorers = (side) => m[side].scorers.map((s) => `${esc(S.players[s.pid] ? S.players[s.pid].name : '?')} ${s.minute}'`).join(', ');
    modal(`<span class="label">Тур ${roundIdx + 1}</span>
      <h2>${esc(S.clubs[f.h].name)} ${f.hg}:${f.ag} ${esc(S.clubs[f.a].name)}</h2>
      ${m.home.scorers.length || m.away.scorers.length ? `<p class="muted" style="margin:0">${scorers('home') || '—'} | ${scorers('away') || '—'}</p>` : ''}
      <div class="tbl-wrap"><table><tbody>${round.map((x) => `<tr class="${x === f ? 'me' : ''}"><td>${clubLink(x.h)}</td><td class="mono" style="text-align:center">${x.hg}:${x.ag}</td><td>${clubLink(x.a)}</td></tr>`).join('')}</tbody></table></div>
      ${newMail > 0 ? `<p style="margin:0"><strong>Новых писем: ${newMail}.</strong></p>` : ''}
      ${seasonEnd ? '<p><strong>Сезон завершён!</strong> Итоги и отчёт по команде — на главном экране.</p>' : ''}
      ${S.gameOver && !seasonEnd ? `<p><strong>${esc(S.gameOver)}</strong></p>` : ''}`);
  }

  // ---------- запуск ----------
  render();
  window.__brovka = { get state() { return S; } };
})();
