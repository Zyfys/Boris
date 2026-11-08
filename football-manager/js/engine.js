// Игровой движок: ядро, матч, турнирная таблица, сезон. Без DOM — работает и в браузере, и в Node.
// Игроки (атрибуты, развитие, настроение) — js/people.js, рынок и переговоры — js/market.js.
(function (root) {
  'use strict';

  const SAVE_VERSION = 2;

  // ---------- утилиты ----------
  const rnd = () => Math.random();
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const rf = (a, b) => a + rnd() * (b - a);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const r3 = (v) => Math.round(v * 1000) / 1000;
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function weighted(items, wf) {
    const w = items.map((x) => Math.max(0, wf(x)));
    const tot = w.reduce((s, v) => s + v, 0);
    if (tot <= 0) return pick(items);
    let r = rnd() * tot;
    for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  const util = { rnd, ri, rf, pick, clamp, shuffle, weighted, r1, r2, r3 };
  const P = () => root.FMPeople;
  const M = () => root.FMMarket;

  // ---------- справочники ----------
  const POS = ['GK', 'DF', 'MF', 'FW'];
  const POS_RU = { GK: 'ВР', DF: 'ЗЩ', MF: 'ПЗ', FW: 'НП' };
  const POS_RU_FULL = { GK: 'Вратарь', DF: 'Защитник', MF: 'Полузащитник', FW: 'Нападающий' };
  const FORMATIONS = {
    '4-4-2': { DF: 4, MF: 4, FW: 2 },
    '4-3-3': { DF: 4, MF: 3, FW: 3 },
    '4-2-3-1': { DF: 4, MF: 5, FW: 1 },
    '3-5-2': { DF: 3, MF: 5, FW: 2 },
    '3-4-3': { DF: 3, MF: 4, FW: 3 },
    '5-3-2': { DF: 5, MF: 3, FW: 2 },
  };
  const MENTALITY = {
    defensive: { label: 'Оборонительная', att: 0.88, def: 1.09 },
    balanced: { label: 'Сбалансированная', att: 1.0, def: 1.0 },
    attacking: { label: 'Атакующая', att: 1.12, def: 0.91 },
  };
  // Трансферные окна: индексы туров (0 = перед 1-м туром)
  const WINDOWS = [[0, 3], [19, 21]];

  const YOUTH_FIRST = ['Jack', 'Harry', 'Leo', 'Oliver', 'Charlie', 'Alfie', 'Jayden', 'Kai', 'Mason', 'Tom', 'Ethan', 'Noah', 'Rhys', 'Callum', 'Luca', 'Mateo', 'Samuel', 'Kian', 'Tyler', 'Reece', 'Oscar', 'Finley', 'Dylan', 'Archie', 'Max', 'Rio', 'Tobi', 'Ezra', 'Dante', 'Ibrahim'];
  const YOUTH_LAST = ['Smith', 'Walsh', 'Hughes', 'Clarke', 'Bennett', 'Okoye', 'Mensah', 'Doyle', 'Carter', 'Reid', 'Foster', 'Murray', 'Silva', 'Adeyemi', 'Parker', 'Morgan', 'Price', 'Grant', 'Lloyd', 'Kelly', 'Barnes', 'Osei', 'Nkemelu', 'Palmer', 'Ward', 'Bamford', 'Achterberg', 'Hollis', 'Nwosu', 'Quinn'];

  // ---------- деньги ----------
  function ageFactor(age) {
    if (age <= 20) return 1.45;
    if (age <= 23) return 1.25;
    if (age <= 27) return 1.0;
    if (age <= 29) return 0.78;
    if (age <= 31) return 0.55;
    if (age <= 33) return 0.35;
    return 0.2;
  }
  // Стоимость в млн €: молодые стоят дороже за счёт потенциала, короткий контракт снижает цену
  function playerValue(p, state) {
    const eff = p.age <= 23 && p.pot ? p.ovr + (p.pot - p.ovr) * 0.4 : p.ovr;
    let v = 0.3 * Math.pow(1.22, eff - 60) * ageFactor(p.age);
    if (state && p.contract && p.clubId) {
      const left = p.contract.until - state.season;
      if (left <= 0) v *= 0.55; else if (left === 1) v *= 0.8;
    }
    return Math.max(0.1, r1(v));
  }
  // Справедливая зарплата в млн € в неделю
  function wageFor(p) { return r3(0.003 + 0.0022 * Math.pow(1.2, p.ovr - 60)); }

  // ---------- игроки ----------
  function makePlayer(state, clubId, name, pos, age, ovr, opts) {
    const id = 'p' + (state.nextId++);
    const p = {
      id, name, pos, age, ovr, clubId,
      fitness: 100, injury: 0, suspended: 0, youth: !!(opts && opts.youth),
      stats: { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0 },
      career: { apps: 0, goals: 0 },
      history: [],
    };
    state.players[id] = p;
    P().initPlayer(state, p, opts || {});
    return p;
  }

  function makeYouth(state, clubId, pos, opts) {
    const club = state.clubs[clubId];
    const base = 50 + Math.round((club ? club.rep - 60 : 10) * 0.35);
    const golden = (opts && opts.golden) || rnd() < 0.06;
    const p = makePlayer(state, clubId, pick(YOUTH_FIRST) + ' ' + pick(YOUTH_LAST), pos || pick(['DF', 'MF', 'MF', 'FW', 'DF']),
      ri(16, 18), clamp(base + ri(-4, 6) + (golden ? 4 : 0), 46, 72), { youth: true, golden });
    return p;
  }

  // ---------- создание игры ----------
  function newGame(data, leagueId, clubId, managerName) {
    const league = data.leagues.find((l) => l.id === leagueId);
    if (!league) throw new Error('Нет лиги ' + leagueId);
    const state = {
      version: SAVE_VERSION,
      leagueId, leagueName: league.name, country: league.country,
      manager: managerName || 'Тренер',
      userClub: clubId,
      season: league.season,
      round: 0,
      nextId: 1, nextMsg: 1,
      clubs: {}, players: {},
      fixtures: [], news: [], inbox: [], history: [],
      neg: null, report: null,
      gameOver: false,
    };
    for (const c of league.clubs) {
      state.clubs[c.id] = {
        id: c.id, name: c.name, rep: c.rep, colors: c.colors, stadium: c.stadium,
        cash: c.budget, formation: pick(['4-3-3', '4-2-3-1', '4-4-2', '4-3-3']), mentality: 'balanced',
        lineup: null, sponsor: 0, finance: { income: 0, wages: 0, transfersIn: 0, transfersOut: 0 },
      };
      const lines = c.players.split('\n').map((s) => s.trim()).filter(Boolean);
      for (const line of lines) {
        const [name, pos, age, ovr] = line.split('|');
        if (!POS.includes(pos)) throw new Error('Неверная позиция у ' + name);
        makePlayer(state, c.id, name, pos, +age, +ovr, {});
      }
    }
    for (const cid of Object.keys(state.clubs)) {
      fillSquad(state, cid);
      const club = state.clubs[cid];
      // ТВ и спонсоры в неделю: чуть меньше фонда зарплат, остальное — билеты и призовые
      club.sponsor = r2(wageBill(state, cid) * 0.85 + club.rep * 0.004);
      P().assignRoles(state, cid);
    }
    for (const p of Object.values(state.players)) p.ovrStart = p.ovr;
    const user = state.clubs[clubId];
    user.formation = '4-3-3';
    user.lineup = autoLineup(state, clubId, user.formation);
    state.fixtures = makeFixtures(Object.keys(state.clubs));
    state.expectation = expectedPosition(state, clubId);
    addNews(state, `${state.manager} назначен главным тренером клуба «${user.name}». Цель от руководства: место не ниже ${state.expectation}-го.`, 'club');
    addMail(state, { type: 'info', title: 'Добро пожаловать в клуб', text: `Совет директоров «${user.name}» ждёт место не ниже ${state.expectation}-го. Трансферный бюджет: ${user.cash} млн €. Летнее окно открыто до 4-го тура. Проверьте контракты игроков: у некоторых они истекают уже этим летом.` });
    return state;
  }

  function fillSquad(state, clubId) {
    const squad = clubPlayers(state, clubId);
    const count = (pos) => squad.filter((p) => p.pos === pos).length;
    const need = { GK: 2, DF: 7, MF: 7, FW: 4 };
    for (const pos of POS) for (let i = count(pos); i < need[pos]; i++) squad.push(makeYouth(state, clubId, pos));
    while (squad.length < 22) squad.push(makeYouth(state, clubId));
  }

  function expectedPosition(state, clubId) {
    const sorted = Object.values(state.clubs).sort((a, b) => b.rep - a.rep);
    const rank = sorted.findIndex((c) => c.id === clubId) + 1;
    return clamp(rank + 1, 1, sorted.length - 3);
  }

  // Двухкруговой турнир (метод круга)
  function makeFixtures(ids) {
    const teams = shuffle(ids);
    if (teams.length % 2) teams.push(null);
    const n = teams.length;
    const first = [];
    let arr = teams.slice();
    for (let r = 0; r < n - 1; r++) {
      const round = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        if (a && b) round.push((r + i) % 2 === 0 ? { h: a, a: b } : { h: b, a: a });
      }
      first.push(round);
      arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
    }
    const second = first.map((round) => round.map((m) => ({ h: m.a, a: m.h })));
    return [...first, ...shuffle(second)].map((round) => round.map((m) => ({ ...m, hg: null, ag: null })));
  }

  // ---------- выборки ----------
  function clubPlayers(state, clubId) {
    const out = [];
    for (const id in state.players) { const p = state.players[id]; if (p.clubId === clubId) out.push(p); }
    return out;
  }
  function freeAgents(state) { return clubPlayers(state, null); }
  function wageBill(state, clubId) { return clubPlayers(state, clubId).reduce((s, p) => s + p.contract.wage, 0); }
  const available = (p) => p && p.injury <= 0 && p.suspended <= 0;
  function slotsOf(formation) {
    const f = FORMATIONS[formation];
    return ['GK', ...Array(f.DF).fill('DF'), ...Array(f.MF).fill('MF'), ...Array(f.FW).fill('FW')];
  }
  function effRating(p, slotPos) {
    if (!p) return 0;
    let r = p.ovr;
    if (p.pos !== slotPos) {
      if (p.pos === 'GK' || slotPos === 'GK') r *= 0.4;
      else if (Math.abs(POS.indexOf(p.pos) - POS.indexOf(slotPos)) === 1) r *= 0.87;
      else r *= 0.75;
    }
    return r * (0.86 + 0.14 * p.fitness / 100) * P().moraleMult(p);
  }

  function autoLineup(state, clubId, formation) {
    const slots = slotsOf(formation);
    const pool = clubPlayers(state, clubId).filter(available);
    const used = new Set();
    const lineup = Array(slots.length).fill(null);
    const pri = ['GK', 'FW', 'DF', 'MF'];
    const order = slots.map((s, i) => i).sort((a, b) => pri.indexOf(slots[a]) - pri.indexOf(slots[b]));
    for (const i of order) {
      const cands = pool.filter((p) => !used.has(p.id) && p.pos === slots[i]);
      cands.sort((a, b) => effRating(b, slots[i]) - effRating(a, slots[i]));
      if (cands[0]) { lineup[i] = cands[0].id; used.add(cands[0].id); }
    }
    for (const i of order) {
      if (lineup[i]) continue;
      const cands = pool.filter((p) => !used.has(p.id));
      cands.sort((a, b) => effRating(b, slots[i]) - effRating(a, slots[i]));
      if (cands[0]) { lineup[i] = cands[0].id; used.add(cands[0].id); }
    }
    return lineup;
  }

  // Проверка и починка состава пользователя перед матчем
  function validateLineup(state, clubId) {
    const club = state.clubs[clubId];
    const slots = slotsOf(club.formation);
    const problems = [];
    if (!club.lineup || club.lineup.length !== slots.length) {
      club.lineup = autoLineup(state, clubId, club.formation);
      return ['Состав собран автоматически.'];
    }
    const used = new Set();
    for (let i = 0; i < slots.length; i++) {
      const p = state.players[club.lineup[i]];
      if (!p || p.clubId !== clubId || !available(p) || used.has(p.id)) {
        if (p && p.clubId === clubId && !available(p)) problems.push(`${p.name} не может играть (${p.injury > 0 ? 'травма' : 'дисквалификация'}).`);
        club.lineup[i] = null;
      } else used.add(p.id);
    }
    for (let i = 0; i < slots.length; i++) {
      if (club.lineup[i]) continue;
      const cands = clubPlayers(state, clubId).filter((p) => available(p) && !used.has(p.id));
      cands.sort((a, b) => effRating(b, slots[i]) - effRating(a, slots[i]));
      if (cands[0]) { club.lineup[i] = cands[0].id; used.add(cands[0].id); problems.push(`На позицию ${POS_RU[slots[i]]} поставлен ${cands[0].name}.`); }
    }
    return problems;
  }

  // ---------- сила команды ----------
  function teamPower(state, side) {
    const slots = slotsOf(side.formation);
    const sum = { GK: 0, DF: 0, MF: 0, FW: 0 }, cnt = { GK: 0, DF: 0, MF: 0, FW: 0 };
    side.xi.forEach((pid, i) => {
      cnt[slots[i]]++;
      if (pid) sum[slots[i]] += effRating(state.players[pid], slots[i]);
    });
    const avg = (k) => (cnt[k] ? sum[k] / cnt[k] : 0);
    const f = FORMATIONS[side.formation];
    const attMod = 1 + 0.03 * (f.FW - 2) + 0.01 * (f.MF - 4) - 0.01 * (f.DF - 4);
    const defMod = 1 + 0.03 * (f.DF - 4) + 0.01 * (f.MF - 4) - 0.015 * (f.FW - 2);
    const midMod = 1 + 0.04 * (f.MF - 4);
    const att = (avg('FW') * 0.5 + avg('MF') * 0.35 + avg('DF') * 0.15) * attMod;
    const def = (avg('DF') * 0.45 + avg('MF') * 0.25 + avg('GK') * 0.3) * defMod;
    const mid = (avg('MF') * 0.7 + avg('DF') * 0.15 + avg('FW') * 0.15) * midMod;
    const m = MENTALITY[side.mentality];
    return { att: att * m.att, def: def * m.def, mid };
  }

  // ---------- матч ----------
  function createMatch(state, fixture) {
    const mk = (cid) => {
      const club = state.clubs[cid];
      if (cid !== state.userClub) {
        club.lineup = autoLineup(state, cid, club.formation);
        club.mentality = 'balanced';
      }
      return {
        id: cid, formation: club.formation, mentality: club.mentality,
        xi: club.lineup.slice(), played: new Set(club.lineup.filter(Boolean)), subs: 0,
        goals: 0, shots: 0, onTarget: 0, possession: 0, yellows: {}, scorers: [],
      };
    };
    return { fixture, minute: 0, home: mk(fixture.h), away: mk(fixture.a), events: [], done: false };
  }

  const MAX_SUBS = 5;
  function makeSub(state, match, sideKey, outId, inId, silent) {
    const side = match[sideKey];
    const idx = side.xi.indexOf(outId);
    const pin = state.players[inId];
    if (idx < 0 || !pin || side.subs >= MAX_SUBS || side.played.has(inId) || !available(pin) || pin.clubId !== side.id) return false;
    side.xi[idx] = inId; side.played.add(inId); side.subs++;
    if (!silent) logEvent(match, 'sub', sideKey, `Замена: ${pin.name} выходит вместо ${state.players[outId].name}.`);
    return true;
  }
  function benchFor(state, side) { return clubPlayers(state, side.id).filter((p) => available(p) && !side.played.has(p.id)); }
  function aiSubs(state, match, sideKey) {
    const side = match[sideKey];
    if (side.subs >= MAX_SUBS || ![58, 68, 77, 84].includes(match.minute)) return;
    const slots = slotsOf(side.formation);
    let worst = -1, worstScore = Infinity;
    side.xi.forEach((pid, i) => {
      if (!pid || slots[i] === 'GK') return;
      const s = effRating(state.players[pid], slots[i]);
      if (s < worstScore) { worstScore = s; worst = i; }
    });
    if (worst < 0) return;
    const cands = benchFor(state, side).filter((p) => p.pos === slots[worst]).sort((a, b) => b.ovr - a.ovr);
    if (cands[0] && effRating(cands[0], slots[worst]) > worstScore + 1) makeSub(state, match, sideKey, side.xi[worst], cands[0].id);
  }

  function logEvent(match, type, side, text) { match.events.push({ minute: match.minute, type, side, text }); }

  const T = {
    chance: ['{p} пробивает — мимо ворот.', '{p} бьёт головой, но выше перекладины.', 'Удар {p} блокируют защитники.', '{p} не попадает по мячу в выгодной позиции.', '{p} пытается обвести вратаря, но теряет мяч.'],
    save: ['{p} бьёт в створ — {gk} спасает!', 'Отличный сейв {gk} после удара {p}.', '{gk} забирает мяч после удара {p}.', '{gk} в прыжке переводит удар {p} на угловой.'],
    post: ['{p} попадает в штангу!', 'Перекладина! {p} был так близко.'],
    goal: ['ГОЛ! {p} отправляет мяч в сетку!', 'ГОЛ! {p} не оставляет шансов вратарю!', 'ГОЛ! Удар {p} в девятку!', 'ГОЛ! {p} добивает мяч после отскока!', 'ГОЛ! {p} замыкает прострел!'],
  };
  const tpl = (arr, vars) => pick(arr).replace(/\{(\w+)\}/g, (_, k) => vars[k] || '');

  function pickPlayer(state, side, weights, attr, exclude) {
    const slots = slotsOf(side.formation);
    const items = side.xi.map((pid, i) => ({ pid, slot: slots[i] })).filter((x) => x.pid && x.pid !== exclude);
    if (!items.length) return null;
    const it = weighted(items, (x) => {
      const p = state.players[x.pid];
      const v = attr && p.attrs ? p.attrs[attr] : p.ovr;
      return (weights[x.slot] || 0) * Math.pow(v / 80, 3);
    });
    return state.players[it.pid];
  }
  function goalkeeper(state, side) {
    const i = slotsOf(side.formation).indexOf('GK');
    return state.players[side.xi[i]] || { name: 'вратарь' };
  }

  // Одна минута матча
  function stepMatch(state, match) {
    if (match.done) return;
    match.minute++;
    const pw = { home: teamPower(state, match.home), away: teamPower(state, match.away) };
    const midTot = pw.home.mid + pw.away.mid || 1;
    match.home.possession += pw.home.mid / midTot;
    match.away.possession += pw.away.mid / midTot;

    for (const [ak, dk] of [['home', 'away'], ['away', 'home']]) {
      const A = match[ak], D = match[dk];
      const homeBoost = ak === 'home' ? 1.12 : 0.92;
      const ratio = pw[ak].att / Math.max(1, pw[dk].def);
      const control = Math.sqrt((pw[ak].mid / midTot) / 0.5);
      const xg = clamp(1.0 * homeBoost * control * Math.pow(ratio, 5), 0.12, 4.5);
      if (rnd() < (xg * 3) / 90) {
        A.shots++;
        const shooter = pickPlayer(state, A, { FW: 6, MF: 3, DF: 1 }, 'sho');
        if (!shooter) continue;
        const gk = goalkeeper(state, D);
        const r = rnd();
        if (r < 1 / 3) {
          A.onTarget++; A.goals++;
          const assist = rnd() < 0.75 ? pickPlayer(state, A, { MF: 5, FW: 3, DF: 2 }, 'pas', shooter.id) : null;
          A.scorers.push({ minute: match.minute, pid: shooter.id, assist: assist && assist.id });
          shooter.stats.goals++; shooter.career.goals++;
          if (assist) assist.stats.assists++;
          logEvent(match, 'goal', ak, tpl(T.goal, { p: shooter.name }) + (assist ? ` Передача: ${assist.name}.` : ''));
        } else if (r < 0.62) {
          A.onTarget++;
          logEvent(match, 'save', ak, tpl(T.save, { p: shooter.name, gk: gk.name }));
        } else if (r < 0.68) logEvent(match, 'post', ak, tpl(T.post, { p: shooter.name }));
        else logEvent(match, 'chance', ak, tpl(T.chance, { p: shooter.name }));
      }
      // карточки
      if (rnd() < 0.016) {
        const p = pickPlayer(state, A, { DF: 4, MF: 4, FW: 2, GK: 0.3 });
        if (p) {
          A.yellows[p.id] = (A.yellows[p.id] || 0) + 1;
          p.stats.yellow++;
          if (A.yellows[p.id] >= 2) sendOff(state, match, ak, p, 'вторая жёлтая — удаление!');
          else {
            logEvent(match, 'yellow', ak, `Жёлтая карточка: ${p.name}.`);
            if (p.stats.yellow % 5 === 0) { p.pendingBan = (p.pendingBan || 0) + 1; logEvent(match, 'info', ak, `${p.name} пропустит следующий матч из-за перебора жёлтых.`); }
          }
        }
      }
      if (rnd() < 0.0007) {
        const p = pickPlayer(state, A, { DF: 4, MF: 3, FW: 1 });
        if (p) sendOff(state, match, ak, p, 'прямая красная карточка!');
      }
      // травмы
      if (rnd() < 0.0011) {
        const p = pickPlayer(state, A, { DF: 1, MF: 1, FW: 1, GK: 0.3 });
        if (p) {
          p.injury = ri(1, 6);
          logEvent(match, 'injury', ak, `${p.name} травмирован и не может продолжать (≈${p.injury} нед.).`);
          const slots = slotsOf(A.formation);
          const idx = A.xi.indexOf(p.id);
          const bench = benchFor(state, A);
          const repl = bench.filter((x) => x.pos === slots[idx]).sort((a, b) => b.ovr - a.ovr)[0] || bench.sort((a, b) => b.ovr - a.ovr)[0];
          if (!(repl && makeSub(state, match, ak, p.id, repl.id))) A.xi[idx] = null;
        }
      }
    }
    for (const k of ['home', 'away']) {
      for (const pid of match[k].xi) if (pid) { const p = state.players[pid]; p.fitness = Math.max(45, p.fitness - 0.14); }
      if (match[k].id !== state.userClub || match.autoUser) aiSubs(state, match, k);
    }
    if (match.minute === 45) logEvent(match, 'info', null, `Перерыв. Счёт ${match.home.goals}:${match.away.goals}.`);
    if (match.minute >= 90) {
      match.done = true;
      logEvent(match, 'info', null, `Финальный свисток! ${match.home.goals}:${match.away.goals}.`);
    }
  }

  function sendOff(state, match, sideKey, p, why) {
    const side = match[sideKey];
    const idx = side.xi.indexOf(p.id);
    if (idx >= 0) side.xi[idx] = null;
    p.stats.red++;
    p.pendingBan = (p.pendingBan || 0) + (why.startsWith('прямая') ? 2 : 1);
    logEvent(match, 'red', sideKey, `${p.name}: ${why}`);
  }

  function simulateMatch(state, match) { while (!match.done) stepMatch(state, match); return match; }

  function applyMatch(state, match) {
    const f = match.fixture;
    f.hg = match.home.goals; f.ag = match.away.goals;
    f.scorers = { h: match.home.scorers.map((s) => s.pid), a: match.away.scorers.map((s) => s.pid) };
    for (const k of ['home', 'away']) {
      for (const pid of match[k].played) {
        const p = state.players[pid];
        if (p) { p.stats.apps++; p.career.apps++; }
      }
    }
  }

  // ---------- тур ----------
  function currentRound(state) { return state.fixtures[state.round] || null; }
  function userFixture(state) {
    const r = currentRound(state);
    return r ? r.find((m) => m.h === state.userClub || m.a === state.userClub) : null;
  }

  function finishRound(state, userMatch) {
    const round = currentRound(state);
    const leaderBefore = state.round ? table(state)[0].id : null;
    const matches = [];
    if (userMatch) { applyMatch(state, userMatch); matches.push(userMatch); }
    for (const f of round) {
      if (userMatch && f === userMatch.fixture) continue;
      const m = createMatch(state, f);
      simulateMatch(state, m);
      applyMatch(state, m);
      matches.push(m);
    }
    roundNews(state, round, matches, leaderBefore);
    weeklyUpdate(state, round);
    state.round++;
    if (state.round === WINDOWS[1][0]) addNews(state, 'Открылось зимнее трансферное окно.', 'transfer');
    if (state.round === WINDOWS[0][1] + 1 || state.round === WINDOWS[1][1] + 1) { addNews(state, 'Трансферное окно закрылось.', 'transfer'); M().windowClosed(state); }
    if (userMatch) {
      const res = userMatch.fixture;
      const home = res.h === state.userClub;
      const my = home ? res.hg : res.ag, their = home ? res.ag : res.hg;
      const word = my > their ? 'Победа' : my === their ? 'Ничья' : 'Поражение';
      addNews(state, `${word}: «${state.clubs[res.h].name}» ${res.hg}:${res.ag} «${state.clubs[res.a].name}».`, 'result');
    }
    // Увольнение посреди сезона
    if (state.round >= 15 && !state.gameOver) {
      const pos = positionOf(state, state.userClub);
      if (pos > state.expectation + 9 && pos >= Object.keys(state.clubs).length - 2) {
        state.warnings = (state.warnings || 0) + 1;
        if (state.warnings === 1) addMail(state, { type: 'board', title: 'Совет директоров недоволен', text: 'Положение команды в таблице вызывает тревогу. Нужны результаты в ближайших матчах.' });
        if (state.warnings >= 6) { state.gameOver = 'Совет директоров уволил вас из-за неудовлетворительных результатов.'; addNews(state, state.gameOver, 'club'); }
      } else state.warnings = 0;
    }
  }

  // Новости тура: хет-трики, матч тура, смена лидера, отставки тренеров
  function roundNews(state, round, matches, leaderBefore) {
    const rn = state.round + 1;
    for (const m of matches) {
      for (const k of ['home', 'away']) {
        const cnt = {};
        for (const s of m[k].scorers) cnt[s.pid] = (cnt[s.pid] || 0) + 1;
        for (const [pid, n] of Object.entries(cnt)) if (n >= 3) {
          const p = state.players[pid];
          addNews(state, `${n === 3 ? 'Хет-трик' : n + ' голов в одном матче'}! ${p.name} («${state.clubs[m[k].id].name}») отличился ${n} раза.`, 'star');
        }
      }
    }
    const big = matches.slice().sort((a, b) => Math.abs(b.home.goals - b.away.goals) - Math.abs(a.home.goals - a.away.goals) || (b.home.goals + b.away.goals) - (a.home.goals + a.away.goals))[0];
    if (big && Math.abs(big.home.goals - big.away.goals) >= 3) {
      addNews(state, `Разгром тура: «${state.clubs[big.home.id].name}» ${big.home.goals}:${big.away.goals} «${state.clubs[big.away.id].name}».`, 'result');
    }
    const t = table(state);
    if (leaderBefore && t[0].id !== leaderBefore && rn >= 5) addNews(state, `Смена лидера! После ${rn}-го тура первое место у «${state.clubs[t[0].id].name}».`, 'result');
    if (rn >= 12) {
      state.sacked = state.sacked || {};
      for (const r of t.slice(-3)) {
        if (r.id === state.userClub || state.sacked[r.id] === state.season) continue;
        if (rnd() < 0.05) { state.sacked[r.id] = state.season; addNews(state, `«${state.clubs[r.id].name}» отправил в отставку главного тренера после серии неудач.`, 'club'); }
      }
    }
  }

  function weeklyUpdate(state, round) {
    const playedIds = new Set();
    const results = {};
    for (const f of round) {
      playedIds.add(f.h); playedIds.add(f.a);
      results[f.h] = f.hg > f.ag ? 1 : f.hg < f.ag ? -1 : 0;
      results[f.a] = -results[f.h];
    }
    for (const p of Object.values(state.players)) {
      p.fitness = Math.min(100, p.fitness + 12);
      if (p.injury > 0) {
        p.injury--;
        if (p.injury === 0 && p.clubId === state.userClub) addNews(state, `${p.name} восстановился после травмы.`, 'squad');
      }
      // дисквалифицированный пропустил этот тур — срок уменьшается; новые наказания — со следующего тура
      if (p.suspended > 0 && playedIds.has(p.clubId)) p.suspended--;
      if (p.pendingBan) { p.suspended += p.pendingBan; p.pendingBan = 0; }
    }
    P().weekly(state, results);
    for (const c of Object.values(state.clubs)) {
      const home = round.find((f) => f.h === c.id);
      const inc = c.sponsor + (home ? c.rep * 0.02 : 0);
      const w = wageBill(state, c.id);
      c.finance.income += inc; c.finance.wages += w;
      c.cash = r2(c.cash + inc - w);
    }
    M().weekly(state);
  }

  // ---------- таблица ----------
  function table(state) {
    const rows = {};
    for (const id of Object.keys(state.clubs)) rows[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
    for (const round of state.fixtures) for (const f of round) {
      if (f.hg === null) continue;
      const H = rows[f.h], A = rows[f.a];
      H.p++; A.p++; H.gf += f.hg; H.ga += f.ag; A.gf += f.ag; A.ga += f.hg;
      if (f.hg > f.ag) { H.w++; A.l++; H.pts += 3; H.form.push('В'); A.form.push('П'); }
      else if (f.hg < f.ag) { A.w++; H.l++; A.pts += 3; A.form.push('В'); H.form.push('П'); }
      else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('Н'); A.form.push('Н'); }
    }
    return Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || state.clubs[a.id].name.localeCompare(state.clubs[b.id].name));
  }
  function positionOf(state, clubId) { return table(state).findIndex((r) => r.id === clubId) + 1; }
  function topScorers(state, n) {
    return Object.values(state.players).filter((p) => p.stats.goals > 0 && p.clubId)
      .sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists).slice(0, n || 15);
  }

  function windowOpen(state) { return WINDOWS.some(([a, b]) => state.round >= a && state.round <= b); }

  // ---------- конец сезона ----------
  function seasonOver(state) { return state.round >= state.fixtures.length; }

  function endSeason(state) {
    const t = table(state);
    const pos = t.findIndex((r) => r.id === state.userClub) + 1;
    const champion = state.clubs[t[0].id];
    const scorer = topScorers(state, 1)[0];
    const n = t.length;
    t.forEach((r, i) => {
      const c = state.clubs[r.id];
      const prize = (n - i) * 2.2 + (i === 0 ? 25 : i < 4 ? 12 : 0);
      c.cash = r2(c.cash + prize);
      c.finance.income += prize;
      c.rep = clamp(c.rep + (i < 4 ? 1 : i >= n - 3 ? -1 : 0), 50, 99);
    });
    const label = `${state.season}/${String(state.season + 1).slice(2)}`;
    // запись в историю игроков
    for (const p of Object.values(state.players)) {
      if (p.stats.apps > 0 && p.clubId) p.history.push({ season: label, club: state.clubs[p.clubId].name, apps: p.stats.apps, goals: p.stats.goals, assists: p.stats.assists, ovr: p.ovr });
    }
    const rec = { season: label, champion: champion.name, pos, expectation: state.expectation, scorer: scorer ? `${scorer.name} (${scorer.stats.goals})` : '—', pts: t[pos - 1].pts };
    state.history.push(rec);
    let verdict;
    if (pos > state.expectation + 6 || state.clubs[state.userClub].cash < -60) {
      verdict = 'Совет директоров принял решение о вашей отставке.';
      state.gameOver = verdict;
    } else if (pos <= state.expectation) verdict = 'Руководство довольно: цель на сезон выполнена!';
    else verdict = 'Цель не выполнена, но руководство даёт вам ещё один шанс.';
    addNews(state, `Сезон ${label} завершён. Чемпион — «${champion.name}». Ваше место: ${pos}. ${verdict}`, 'club');
    // отчёт: кто вырос, кто сдал, у кого горит контракт; затем — истечение контрактов
    state.report = P().seasonReport(state, label);
    M().expireContracts(state);
    return { ...rec, verdict, gameOver: !!state.gameOver };
  }

  function startNewSeason(state) {
    state.season++;
    state.round = 0;
    const retired = P().seasonAging(state);
    for (const p of retired) {
      if (p.clubId === state.userClub) addNews(state, `${p.name} (${p.age}) завершил карьеру.`, 'squad');
      delete state.players[p.id];
    }
    const intake = [];
    for (const cid of Object.keys(state.clubs)) {
      const c = state.clubs[cid];
      const k = cid === state.userClub ? ri(2, 4) : 2;
      for (let i = 0; i < k; i++) { const y = makeYouth(state, cid); if (cid === state.userClub) intake.push(y); }
      c.finance = { income: 0, wages: 0, transfersIn: 0, transfersOut: 0 };
      c.lineup = null;
    }
    for (const m of state.inbox) if (!m.resolved && (m.type === 'bid' || m.type === 'agent')) m.resolved = 'expired';
    M().preseason(state);
    for (const cid of Object.keys(state.clubs)) fillSquad(state, cid);
    for (const cid of Object.keys(state.clubs)) P().assignRoles(state, cid);
    for (const p of Object.values(state.players)) p.ovrStart = p.ovr;
    const user = state.clubs[state.userClub];
    user.lineup = autoLineup(state, user.id, user.formation);
    state.fixtures = makeFixtures(Object.keys(state.clubs));
    state.expectation = expectedPosition(state, state.userClub);
    const label = `${state.season}/${String(state.season + 1).slice(2)}`;
    addNews(state, `Новый сезон ${label}. Цель от руководства: место не ниже ${state.expectation}-го.`, 'club');
    if (intake.length) {
      const best = intake.slice().sort((a, b) => b.pot - a.pot)[0];
      addMail(state, { type: 'youth', title: 'Выпускники академии', pid: best.id,
        text: `В основную команду переведены воспитанники: ${intake.map((y) => `${y.name} (${POS_RU[y.pos]}, ${y.age})`).join(', ')}. ${P().isWonderkid(best) ? `Тренеры академии в восторге от ${best.name}: это может быть будущая звезда.` : 'Посмотрите их карточки и решите, кому дать шанс.'}` });
    }
  }

  // ---------- новости и почта ----------
  function addNews(state, text, kind) {
    state.news.unshift({ season: state.season, round: state.round, text, kind: kind || 'info' });
    if (state.news.length > 120) state.news.length = 120;
  }
  function addMail(state, msg) {
    const m = { id: 'm' + (state.nextMsg++), season: state.season, round: state.round, read: false, resolved: false, ...msg };
    state.inbox.unshift(m);
    if (state.inbox.length > 80) state.inbox.length = 80;
    return m;
  }

  // ---------- сохранение ----------
  function serialize(state) { return JSON.stringify(state); }
  function deserialize(json) {
    const s = JSON.parse(json);
    if (!s || s.version !== SAVE_VERSION) throw new Error('Несовместимое сохранение');
    return s;
  }

  root.FMEngine = {
    SAVE_VERSION, POS, POS_RU, POS_RU_FULL, FORMATIONS, MENTALITY, MAX_SUBS, WINDOWS, util,
    newGame, autoLineup, validateLineup, slotsOf, effRating, available, makePlayer, makeYouth,
    clubPlayers, freeAgents, wageBill, playerValue, wageFor,
    createMatch, stepMatch, simulateMatch, makeSub, benchFor, teamPower,
    currentRound, userFixture, finishRound, table, positionOf, topScorers, windowOpen,
    seasonOver, endSeason, startNewSeason, serialize, deserialize, addNews, addMail,
  };
})(typeof window !== 'undefined' ? window : globalThis);
