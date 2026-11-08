// Трансферный рынок: переговоры (клуб → игрок/агент), продления контрактов, свободные агенты,
// предложения агентов, заявки ИИ-клубов на ваших игроков, трансферы между ИИ-клубами.
(function (root) {
  'use strict';
  const E = () => root.FMEngine;
  const P = () => root.FMPeople;
  const U = () => root.FMEngine.util;

  const AGENTS = ['Луис Ортега', 'Пол Хэдли', 'Андрей Савин', 'Марио Кастелли', 'Йенс Брандт', 'Самуэль Окафор', 'Рафаэл Сантос', 'Кевин Морроу', 'Диего Ланса', 'Арно Дюваль'];
  const ORIGINS = {
    'Бразилия': [['Gabriel', 'Vitor', 'Kauã', 'Endrick', 'Luan', 'Rayan', 'Thiago', 'Igor'], ['Souza', 'Ferreira', 'Lima', 'Carvalho', 'Moura', 'Ribeiro', 'Barbosa']],
    'Аргентина': [['Valentín', 'Thiago', 'Santiago', 'Franco', 'Bautista', 'Matías'], ['Fernández', 'Acosta', 'Romero', 'Benítez', 'Sosa', 'Medina']],
    'Франция': [['Mathis', 'Enzo', 'Rayan', 'Warren', 'Désiré', 'Lenny'], ['Diallo', 'Camara', 'Martin', 'Lefèvre', 'Koné', 'Moreau']],
    'Нидерланды': [['Jorrel', 'Daan', 'Milan', 'Ruben', 'Quinten'], ['de Vries', 'Bakker', 'Visser', 'van Dijk', 'Smit']],
    'Португалия': [['Rodrigo', 'Tiago', 'Gonçalo', 'Diogo', 'Afonso'], ['Silva', 'Costa', 'Pereira', 'Santos', 'Neves']],
    'Нигерия': [['Chidera', 'Samuel', 'Victor', 'Tolu', 'Ademola'], ['Okonkwo', 'Eze', 'Adeyemi', 'Nwankwo', 'Balogun']],
    'Колумбия': [['Juan', 'Kevin', 'Yaser', 'Jhon', 'Andrés'], ['Mosquera', 'Rentería', 'Asprilla', 'Cuesta', 'Palacios']],
  };
  const MAX_SQUAD = 32;
  const fullRound = (state) => state.season * 100 + state.round;
  const windowEnd = (state) => { const w = E().WINDOWS.find(([a, b]) => state.round >= a && state.round <= b); return state.season * 100 + (w ? w[1] : state.round); };

  // ---------- цены ----------
  function askingPrice(state, p) {
    const sq = E().clubPlayers(state, p.clubId).sort((a, b) => b.ovr - a.ovr);
    const star = sq.indexOf(p) < 3;
    let k = star ? 1.6 : 1.3;
    if (p.wantsOut) k *= 0.85;
    if (p.listed) k *= 0.85;
    return U().r1(E().playerValue(p, state) * k);
  }

  // Какую роль игрок ждёт в вашей команде
  function desiredRole(state, p) {
    const better = E().clubPlayers(state, state.userClub).filter((x) => x.id !== p.id && x.ovr > p.ovr).length;
    if (better <= 9) return 'key';
    if (better <= 15) return 'rotation';
    return p.age <= 20 ? 'youth' : 'backup';
  }
  const prefYears = (p) => (p.age <= 23 ? 5 : p.age <= 28 ? 4 : p.age <= 31 ? 3 : 2);

  function contractDemand(state, p, kind) {
    const { r3, r2, rf } = U();
    const me = state.clubs[state.userClub];
    const fair = E().wageFor(p);
    const diff = p.ovr - me.rep;
    const prem = diff > 0 ? 1 + diff * 0.05 : 1 - Math.min(0.12, -diff * 0.008);
    let base = fair * prem;
    const cur = p.contract.wage;
    if (kind === 'renew') base = Math.max(base, cur * 1.08);
    else if (kind === 'buy') base = Math.max(base, cur * 1.15);
    else base = Math.max(base, cur * 0.9);
    if (kind === 'renew' && p.morale < 45) base *= 1.15;
    if (kind === 'renew' && p.wantsOut) base *= 1.3;
    if (p.agentInterest) base *= 0.95;
    const wage = r3(base);
    return {
      wage, min: r3(base * rf(0.88, 0.96)), years: prefYears(p), role: desiredRole(state, p),
      agentFee: kind === 'renew' ? r2(base * 4) : r2(base * (kind === 'free' ? 20 : 12)),
    };
  }

  // ---------- переговоры ----------
  function canStartBuy(state, p) {
    const me = state.clubs[state.userClub];
    if (!p) return { ok: false, why: 'Игрок не найден.' };
    if (p.clubId === state.userClub) return { ok: false, why: 'Это ваш игрок.' };
    if (E().clubPlayers(state, state.userClub).length >= MAX_SQUAD) return { ok: false, why: `В составе уже ${MAX_SQUAD} игрока. Сначала кого-то продайте.` };
    if (p.clubId) {
      if (!E().windowOpen(state)) return { ok: false, why: 'Трансферное окно закрыто. Свободных агентов можно подписывать в любое время.' };
      if (p.blockedUntil && p.blockedUntil >= fullRound(state)) return { ok: false, why: `«${state.clubs[p.clubId].name}» прекратил переговоры по этому игроку до конца окна.` };
      if (E().clubPlayers(state, p.clubId).length <= 18) return { ok: false, why: 'Клуб не готов отпустить игрока: у него слишком маленький состав.' };
    }
    if (p.ovr > me.rep + 6 && !p.agentInterest && !p.wantsOut) return { ok: false, why: `${p.name} не рассматривает переход в клуб вашего уровня.` };
    return { ok: true };
  }

  function startBuy(state, pid) {
    const p = state.players[pid];
    const chk = canStartBuy(state, p);
    if (!chk.ok) return chk;
    const { rf, r1 } = U();
    if (p.clubId) {
      const ask = askingPrice(state, p);
      state.neg = { pid, kind: 'buy', stage: 'club', ask, min: r1(ask * rf(0.82, 0.97) * (p.wantsOut ? 0.88 : 1)), patience: 3, log: [] };
      say(state, 'them', `«${state.clubs[p.clubId].name}» оценивает ${p.name} в ${fmt(ask)}.`);
    } else {
      state.neg = { pid, kind: 'free', stage: 'player', patience: 3, log: [], fee: 0 };
      state.neg.demand = contractDemand(state, p, 'free');
      say(state, 'them', agentLine(state, p, state.neg.demand));
    }
    return { ok: true };
  }

  function startRenew(state, pid) {
    const p = state.players[pid];
    if (!p || p.clubId !== state.userClub) return { ok: false, why: 'Это не ваш игрок.' };
    const left = p.contract.until - state.season;
    if (left >= 3) return { ok: false, why: `Контракт ${p.name} действует ещё ${left + 1} сезона: продлевать рано.` };
    if (p.wantsOut && p.morale < 35) return { ok: false, why: `${p.name} хочет уйти и отказывается обсуждать новый контракт.` };
    if (p.renewBlocked && p.renewBlocked >= fullRound(state)) return { ok: false, why: `Агент ${p.name} взял паузу в переговорах. Попробуйте через несколько туров.` };
    state.neg = { pid, kind: 'renew', stage: 'player', patience: 3, log: [], fee: 0 };
    state.neg.demand = contractDemand(state, p, 'renew');
    say(state, 'them', agentLine(state, p, state.neg.demand));
    return { ok: true };
  }

  function agentLine(state, p, d) {
    return `Агент ${p.name}: «Мы рассчитываем на зарплату ${fmtWage(d.wage)} в неделю, контракт на ${d.years} ${years(d.years)} и роль: ${P().ROLES[d.role].label.toLowerCase()}. Комиссия агента — ${fmt(d.agentFee)}».`;
  }

  function offerFee(state, amount) {
    const n = state.neg;
    if (!n || n.stage !== 'club') return { ok: false, why: 'Нет активных переговоров с клубом.' };
    const p = state.players[n.pid];
    const me = state.clubs[state.userClub];
    amount = U().r1(+amount);
    if (!(amount > 0)) return { ok: false, why: 'Введите сумму.' };
    if (amount > me.cash) return { ok: false, why: `В кассе только ${fmt(me.cash)}.` };
    say(state, 'you', `Предлагаем ${fmt(amount)}.`);
    if (amount >= n.min) {
      n.fee = amount; n.stage = 'player';
      n.demand = contractDemand(state, p, 'buy');
      say(state, 'them', `Клуб принимает предложение ${fmt(amount)}. Теперь нужно договориться с игроком.`);
      say(state, 'them', agentLine(state, p, n.demand));
      return { ok: true, result: 'accept' };
    }
    if (amount >= n.ask * 0.6) {
      n.patience--;
      n.ask = U().r1(Math.max(n.min * 1.02, (n.ask * 2 + amount) / 3));
      if (n.patience <= 0) return walk(state, 'Клуб устал от торга и прекращает переговоры.');
      say(state, 'them', `Этого мало. Клуб готов уступить игрока за ${fmt(n.ask)}.`);
      return { ok: true, result: 'counter' };
    }
    n.patience -= 2;
    if (n.patience <= 0) return walk(state, 'Клуб счёл предложение оскорбительным и прекращает переговоры.');
    say(state, 'them', 'Предложение даже не обсуждается. Нужна серьёзная сумма.');
    return { ok: true, result: 'reject' };
  }

  function offerContract(state, offer) {
    const n = state.neg;
    if (!n || n.stage !== 'player') return { ok: false, why: 'Нет активных переговоров с игроком.' };
    const p = state.players[n.pid];
    const me = state.clubs[state.userClub];
    const d = n.demand;
    const wage = U().r3(+offer.wage), yrs = +offer.years, role = offer.role;
    if (!(wage > 0) || !(yrs >= 1 && yrs <= 5) || !P().ROLES[role]) return { ok: false, why: 'Заполните условия контракта.' };
    if ((n.fee || 0) + d.agentFee > me.cash) return { ok: false, why: `Не хватает денег на сделку: нужно ${fmt((n.fee || 0) + d.agentFee)} вместе с комиссией агента.` };
    say(state, 'you', `Зарплата ${fmtWage(wage)} в неделю, ${yrs} ${years(yrs)}, роль: ${P().ROLES[role].label.toLowerCase()}.`);
    let score = wage / d.wage;
    if (yrs < d.years) score -= (d.years - yrs) * (p.age >= 30 ? 0.07 : 0.03);
    else if (yrs > d.years) score += p.age >= 30 ? Math.min(0.06, (yrs - d.years) * 0.03) : -(yrs - d.years) * 0.015;
    const rd = P().ROLES[role].rank - P().ROLES[d.role].rank;
    score += rd > 0 ? 0.04 * rd : 0.1 * rd;
    const need = d.min / d.wage;
    if (score >= need) return complete(state, wage, yrs, role);
    n.patience--;
    if (n.patience <= 0) {
      if (n.kind === 'renew') p.renewBlocked = fullRound(state) + 5;
      return walk(state, `Агент: «Мы не договоримся. ${p.name} рассмотрит другие варианты».`);
    }
    if (score >= need - 0.12) {
      const parts = [];
      if (wage < d.wage) parts.push(`зарплата не ниже ${fmtWage(d.wage)}`);
      if (yrs < d.years) parts.push(`срок ${d.years} ${years(d.years)}`);
      if (rd < 0) parts.push(`роль: ${P().ROLES[d.role].label.toLowerCase()}`);
      say(state, 'them', `Агент: «Мы близки. Нужно: ${parts.join(', ') || 'чуть лучше условия'}».`);
      return { ok: true, result: 'counter' };
    }
    say(state, 'them', 'Агент: «Это предложение далеко от наших ожиданий».');
    return { ok: true, result: 'reject' };
  }

  function complete(state, wage, yrs, role) {
    const n = state.neg;
    const p = state.players[n.pid];
    const me = state.clubs[state.userClub];
    const d = n.demand;
    const r2 = U().r2;
    me.cash = r2(me.cash - (n.fee || 0) - d.agentFee);
    me.finance.transfersOut += (n.fee || 0) + d.agentFee;
    if (n.kind === 'buy') {
      const seller = state.clubs[p.clubId];
      seller.cash = r2(seller.cash + n.fee); seller.finance.transfersIn += n.fee;
      seller.lineup = null;
      E().addNews(state, `Трансфер: ${p.name} переходит из «${seller.name}» в «${me.name}» за ${fmt(n.fee)}.`, 'transfer');
      p.clubId = me.id;
      P().assignRoles(state, seller.id);
    } else if (n.kind === 'free') {
      E().addNews(state, `«${me.name}» подписал свободного агента ${p.name}.`, 'transfer');
      p.clubId = me.id;
    } else {
      E().addNews(state, `${p.name} продлил контракт с «${me.name}» до лета ${state.season + yrs}.`, 'squad');
    }
    p.contract = { wage, until: state.season + yrs - 1 };
    p.promisedRole = role;
    p.morale = Math.min(100, Math.max(p.morale, 70) + 8);
    p.wantsOut = false; p.listed = false; p.scouted = true; p.agentInterest = false; p.youth = false;
    P().assignRoles(state, me.id);
    say(state, 'them', n.kind === 'renew' ? `${p.name} подписал новый контракт!` : `Сделка закрыта! ${p.name} — игрок «${me.name}».`);
    n.stage = 'done';
    return { ok: true, result: 'done' };
  }

  function walk(state, text) {
    const n = state.neg;
    const p = state.players[n.pid];
    say(state, 'them', text);
    if (n.kind === 'buy' && n.stage === 'club') p.blockedUntil = windowEnd(state);
    n.stage = 'failed';
    return { ok: true, result: 'walk' };
  }
  function cancelNeg(state) { state.neg = null; }
  function say(state, who, text) { state.neg.log.push({ who, text }); }

  // ---------- свои игроки ----------
  function toggleList(state, pid) {
    const p = state.players[pid];
    if (!p || p.clubId !== state.userClub) return { ok: false };
    p.listed = !p.listed;
    if (p.listed && !p.wantsOut) p.morale = Math.max(0, p.morale - 6);
    if (p.listed && p.wantsOut) p.morale = Math.min(100, p.morale + 8);
    return { ok: true, listed: p.listed };
  }

  // Расторжение: выплата половины оставшихся зарплат
  function releaseCost(state, p) {
    const weeksLeft = (p.contract.until - state.season + 1) * 38 - state.round;
    return U().r2(Math.max(0, weeksLeft) * p.contract.wage * 0.5);
  }
  function releasePlayer(state, pid) {
    const p = state.players[pid];
    const me = state.clubs[state.userClub];
    if (!p || p.clubId !== me.id) return { ok: false, why: 'Это не ваш игрок.' };
    if (E().clubPlayers(state, me.id).length <= 16) return { ok: false, why: 'В составе должно остаться минимум 16 игроков.' };
    const cost = releaseCost(state, p);
    if (cost > me.cash) return { ok: false, why: `Нужно выплатить ${fmt(cost)}, а в кассе ${fmt(me.cash)}.` };
    me.cash = U().r2(me.cash - cost); me.finance.wages += cost;
    p.clubId = null; p.listed = false; p.promisedRole = null;
    me.lineup = (me.lineup || []).map((id) => (id === pid ? null : id));
    E().addNews(state, `«${me.name}» расторг контракт с ${p.name}. Компенсация: ${fmt(cost)}.`, 'transfer');
    return { ok: true, cost };
  }

  function scoutPlayer(state, pid) {
    const p = state.players[pid];
    const me = state.clubs[state.userClub];
    const cost = 0.05;
    if (!p || p.scouted || p.clubId === me.id) return { ok: false, why: 'Отчёт уже есть.' };
    if (me.cash < cost) return { ok: false, why: 'Не хватает денег на скаута.' };
    me.cash = U().r2(me.cash - cost);
    p.scouted = true;
    const [lo, hi] = P().potRange(state, p);
    return { ok: true, text: `Скаут посмотрел ${p.name}: потенциал ${lo}–${hi}.${P().isWonderkid(p) ? ' Это настоящий вундеркинд!' : ''}` };
  }

  // Ответ на заявку ИИ-клуба
  function respondBid(state, msgId, action, amount) {
    const m = state.inbox.find((x) => x.id === msgId);
    if (!m || m.resolved) return { ok: false, why: 'Предложение уже неактуально.' };
    const p = state.players[m.pid];
    const buyer = state.clubs[m.club];
    if (!p || p.clubId !== state.userClub) { m.resolved = 'expired'; return { ok: false, why: 'Игрок уже не в вашем клубе.' }; }
    if (action === 'reject') {
      m.resolved = 'rejected';
      if (p.wantsOut) p.morale = Math.max(0, p.morale - 8);
      return { ok: true, text: 'Предложение отклонено.' };
    }
    let price = m.amount;
    if (action === 'counter') {
      amount = U().r1(+amount);
      if (!(amount > 0)) return { ok: false, why: 'Введите сумму.' };
      if (amount > m.amount * m.maxMult || amount > buyer.cash) {
        m.resolved = 'withdrawn';
        E().addNews(state, `«${buyer.name}» отказался платить за ${p.name} ${fmt(amount)}.`, 'transfer');
        return { ok: true, text: `«${buyer.name}» не готов платить столько и выходит из переговоров.` };
      }
      price = amount;
    }
    if (!E().windowOpen(state)) { m.resolved = 'expired'; return { ok: false, why: 'Трансферное окно закрыто.' }; }
    if (E().clubPlayers(state, state.userClub).length <= 16) return { ok: false, why: 'В составе должно остаться минимум 16 игроков.' };
    sell(state, p, buyer, price);
    m.resolved = 'accepted';
    return { ok: true, text: `${p.name} продан в «${buyer.name}» за ${fmt(price)}.` };
  }

  function sell(state, p, buyer, price) {
    const me = state.clubs[state.userClub];
    const r2 = U().r2;
    me.cash = r2(me.cash + price); me.finance.transfersIn += price;
    buyer.cash = r2(buyer.cash - price); buyer.finance.transfersOut += price;
    moveToAI(state, p, buyer);
    me.lineup = (me.lineup || []).map((id) => (id === p.id ? null : id));
    E().addNews(state, `Трансфер: ${p.name} продан в «${buyer.name}» за ${fmt(price)}.`, 'transfer');
    P().assignRoles(state, me.id);
  }
  function moveToAI(state, p, club) {
    const { ri, r3 } = U();
    p.clubId = club.id;
    p.contract = { wage: r3(Math.max(p.contract.wage, E().wageFor(p) * 1.05)), until: state.season + ri(2, 4) - 1 };
    p.listed = false; p.wantsOut = false; p.promisedRole = null; p.agentInterest = false;
    p.morale = Math.max(p.morale, 70);
    club.lineup = null;
    P().assignRoles(state, club.id);
  }

  // ---------- еженедельно ----------
  function weekly(state) {
    const { rnd } = U();
    const open = E().windowOpen(state);
    // просроченные заявки
    for (const m of state.inbox) if ((m.type === 'bid' || m.type === 'agent') && !m.resolved && m.expires < state.round + 1) m.resolved = 'expired';
    if (open) { incomingBids(state); aiTransfers(state); }
    if (rnd() < (open ? 0.2 : 0.06)) agentOffer(state);
    if (open && rnd() < 0.18) rumour(state);
    // напоминание об истекающих контрактах
    if (state.round === 12 || state.round === 26) {
      const exp = E().clubPlayers(state, state.userClub).filter((p) => p.contract.until === state.season).sort((a, b) => b.ovr - a.ovr);
      if (exp.length) E().addMail(state, { type: 'contract', title: 'Истекающие контракты',
        text: `Летом заканчиваются контракты у ${exp.length} игрок(ов): ${exp.map((p) => `${p.name} (${p.ovr})`).join(', ')}. Если не продлить, они уйдут бесплатно.` });
    }
  }

  function incomingBids(state) {
    const { rnd, rf, r1, weighted } = U();
    const active = new Set(state.inbox.filter((m) => m.type === 'bid' && !m.resolved).map((m) => m.pid));
    for (const p of E().clubPlayers(state, state.userClub)) {
      if (active.has(p.id)) continue;
      const ch = 0.003 + (p.listed ? 0.22 : 0) + (p.wantsOut ? 0.06 : 0) + (p.ovr >= 83 ? 0.008 : 0) + (P().isWonderkid(p) ? 0.01 : 0);
      if (rnd() >= ch) continue;
      const value = E().playerValue(p, state);
      const amount = r1(value * (p.listed ? rf(0.75, 0.95) : rf(0.95, 1.3)));
      const buyers = Object.values(state.clubs).filter((c) => c.id !== state.userClub && c.cash >= amount && c.rep + 8 >= p.ovr);
      if (!buyers.length) continue;
      const buyer = weighted(buyers, (c) => c.rep - 60);
      E().addMail(state, { type: 'bid', pid: p.id, club: buyer.id, amount, maxMult: rf(1.05, 1.3), expires: state.round + 2,
        title: `Предложение за ${p.name}`, text: `«${buyer.name}» предлагает ${fmt(amount)} за ${p.name}. Оценочная стоимость: ${fmt(value)}. Ответить нужно в течение двух туров.` });
      if (!p.listed) E().addNews(state, `Слухи: «${buyer.name}» сделал предложение по ${p.name}.`, 'rumour');
    }
  }

  function agentOffer(state) {
    const { rnd, pick, weighted, ri } = U();
    const me = state.clubs[state.userClub];
    const mine = E().clubPlayers(state, me.id).sort((a, b) => b.ovr - a.ovr);
    const xiAvg = mine.slice(0, 11).reduce((s, p) => s + p.ovr, 0) / Math.max(1, Math.min(11, mine.length));
    const agent = pick(AGENTS);
    let p = null, note = '';
    const r = rnd();
    if (r < 0.45 && E().windowOpen(state)) {
      const cands = Object.values(state.players).filter((x) => x.clubId && x.clubId !== me.id && x.ovr >= xiAvg - 4 && x.ovr <= Math.min(xiAvg + 6, me.rep + 9)
        && (x.wantsOut || x.contract.until === state.season || rnd() < 0.25) && askingPrice(state, x) <= me.cash * 1.15 && !x.agentInterest);
      if (cands.length) {
        p = weighted(cands, (x) => x.ovr - 60);
        note = p.wantsOut ? 'Игрок хочет сменить клуб, и его клуб готов к торгу.' : p.contract.until === state.season ? 'Контракт игрока истекает летом: клуб может уступить его недорого.' : `${p.name} давно мечтает играть за «${me.name}».`;
      }
    } else if (r < 0.7) {
      const fa = E().freeAgents(state).filter((x) => x.ovr >= xiAvg - 8 && !x.agentInterest);
      if (fa.length) { p = weighted(fa, (x) => x.ovr - 50); note = 'Игрок свободен: платить клубу не нужно, только зарплата и бонус за подпись.'; }
    }
    if (!p) {
      const origin = pick(Object.keys(ORIGINS));
      const [first, last] = ORIGINS[origin];
      p = E().makeYouth(state, null, null, { golden: rnd() < 0.7 });
      p.name = pick(first) + ' ' + pick(last);
      p.origin = origin;
      p.age = ri(16, 18);
      note = `Молодой талант из академии (${origin}). Контракт с прежним клубом не подписан, игрок свободен.`;
    }
    p.agentInterest = true; p.scouted = true;
    const [lo, hi] = P().potRange(state, p);
    const where = p.clubId ? `«${state.clubs[p.clubId].name}»` : 'свободный агент';
    E().addMail(state, { type: 'agent', pid: p.id, expires: state.round + 6, title: `Агент предлагает: ${p.name}`,
      text: `Агент ${agent} предлагает вам ${p.name} (${E().POS_RU_FULL[p.pos].toLowerCase()}, ${p.age} лет, ${where}). Рейтинг ${p.ovr}, потенциал ${lo}–${hi}. ${note} Игрок готов к переговорам.` });
  }

  function rumour(state) {
    const { pick } = U();
    const clubs = Object.values(state.clubs).filter((c) => c.id !== state.userClub);
    const buyer = pick(clubs);
    const stars = Object.values(state.players).filter((p) => p.clubId && p.clubId !== buyer.id && p.ovr >= 80 && p.ovr <= buyer.rep + 4);
    if (!stars.length) return;
    const p = pick(stars);
    E().addNews(state, `Слухи: «${buyer.name}» присматривается к ${p.name} из «${state.clubs[p.clubId].name}».`, 'rumour');
  }

  function aiTransfers(state) {
    const { rnd, pick, weighted } = U();
    const clubs = Object.values(state.clubs).filter((c) => c.id !== state.userClub);
    for (let t = 0; t < 2; t++) {
      if (rnd() > 0.4) continue;
      const buyer = pick(clubs);
      const xi = E().autoLineup(state, buyer.id, buyer.formation).map((id) => state.players[id]).filter(Boolean);
      const worst = xi.filter((p) => p.pos !== 'GK').sort((a, b) => a.ovr - b.ovr)[0];
      if (!worst) continue;
      const pos = worst.pos;
      // сначала свободные агенты
      const fa = E().freeAgents(state).filter((p) => p.pos === pos && p.ovr >= worst.ovr + 1 && p.ovr <= buyer.rep + 5 && !p.agentInterest);
      if (fa.length && E().clubPlayers(state, buyer.id).length < MAX_SQUAD - 2) {
        const p = fa.sort((a, b) => b.ovr - a.ovr)[0];
        moveToAI(state, p, buyer);
        E().addNews(state, `«${buyer.name}» подписал свободного агента ${p.name}.`, 'transfer');
        continue;
      }
      const cands = Object.values(state.players).filter((p) => p.clubId && p.clubId !== buyer.id && p.clubId !== state.userClub && p.pos === pos
        && p.ovr >= worst.ovr + 3 && p.ovr <= buyer.rep + 5 && state.clubs[p.clubId].rep <= buyer.rep + 4
        && E().clubPlayers(state, p.clubId).length > 19 && askingPrice(state, p) <= buyer.cash * 0.7);
      if (!cands.length) continue;
      const p = weighted(cands, (x) => 1 / askingPrice(state, x));
      const price = askingPrice(state, p);
      const seller = state.clubs[p.clubId];
      buyer.cash = U().r2(buyer.cash - price); seller.cash = U().r2(seller.cash + price);
      buyer.finance.transfersOut += price; seller.finance.transfersIn += price;
      seller.lineup = null;
      moveToAI(state, p, buyer);
      P().assignRoles(state, seller.id);
      E().addNews(state, `Трансфер: ${p.name} переходит из «${seller.name}» в «${buyer.name}» за ${fmt(price)}.`, 'transfer');
    }
  }

  function windowClosed(state) {
    for (const m of state.inbox) if (!m.resolved && (m.type === 'bid' || (m.type === 'agent' && state.players[m.pid] && state.players[m.pid].clubId))) m.resolved = 'expired';
    const n = state.neg;
    if (n && n.kind === 'buy' && n.stage !== 'done') state.neg = null;
  }

  // ---------- межсезонье ----------
  function expireContracts(state) {
    const { rnd, ri, r3 } = U();
    for (const p of Object.values(state.players)) {
      if (!p.clubId || p.contract.until > state.season) continue;
      if (p.clubId === state.userClub) {
        if (state.report) state.report.released.push({ id: p.id, name: p.name, age: p.age, ovr: p.ovr });
        E().addNews(state, `${p.name} покидает клуб: контракт истёк.`, 'transfer');
        p.clubId = null; p.promisedRole = null; p.listed = false;
        continue;
      }
      const sq = E().clubPlayers(state, p.clubId).sort((a, b) => b.ovr - a.ovr);
      const keep = (sq.indexOf(p) < 18 || p.age <= 21) && p.age < 34 && rnd() < 0.8;
      if (keep) p.contract = { wage: r3(Math.max(p.contract.wage, E().wageFor(p))), until: state.season + ri(1, 3) };
      else {
        if (p.ovr >= 78) E().addNews(state, `${p.name} не продлил контракт с «${state.clubs[p.clubId].name}» и стал свободным агентом.`, 'transfer');
        p.clubId = null; p.promisedRole = null;
      }
    }
    const me = state.clubs[state.userClub];
    if (me.lineup) me.lineup = me.lineup.map((id) => (state.players[id] && state.players[id].clubId === me.id ? id : null));
  }

  // ИИ-клубы подбирают свободных агентов перед сезоном
  function preseason(state) {
    for (const c of Object.values(state.clubs)) {
      if (c.id === state.userClub) continue;
      const sq = E().clubPlayers(state, c.id).sort((a, b) => b.ovr - a.ovr);
      const median = sq[Math.floor(sq.length / 2)] ? sq[Math.floor(sq.length / 2)].ovr : 60;
      let signed = 0;
      for (const p of E().freeAgents(state).filter((x) => !x.agentInterest).sort((a, b) => b.ovr - a.ovr)) {
        if (signed >= 2 || E().clubPlayers(state, c.id).length >= 26) break;
        if (p.ovr >= median - 1 && p.ovr <= c.rep + 5 && p.age <= 33) { moveToAI(state, p, c); signed++; }
      }
    }
  }

  // ---------- форматирование ----------
  function fmt(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace('.', ',') + ' млн €'; }
  function fmtWage(v) { return v >= 1 ? fmt(v) : Math.round(v * 1000) + ' тыс. €'; }
  function years(n) { return n === 1 ? 'год' : n < 5 ? 'года' : 'лет'; }

  root.FMMarket = {
    MAX_SQUAD, askingPrice, contractDemand, desiredRole, canStartBuy, startBuy, startRenew, offerFee, offerContract, cancelNeg,
    toggleList, releaseCost, releasePlayer, scoutPlayer, respondBid, weekly, windowClosed, expireContracts, preseason,
    fmt, fmtWage, years,
  };
})(typeof window !== 'undefined' ? window : globalThis);
