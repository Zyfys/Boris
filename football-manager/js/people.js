// Игроки: атрибуты, потенциал, развитие и тренировки, настроение, роли в команде, отчёт по итогам сезона.
(function (root) {
  'use strict';
  const E = () => root.FMEngine;
  const U = () => root.FMEngine.util;

  const ATTRS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'gk'];
  const ATTR_RU = { pac: 'Скорость', sho: 'Удар', pas: 'Пас', dri: 'Дриблинг', def: 'Отбор', phy: 'Физика', gk: 'Вратарская игра' };
  // Вклад атрибутов в общий рейтинг по позициям (сумма = 1)
  const WEIGHTS = {
    GK: { gk: 0.85, pas: 0.05, phy: 0.05, pac: 0.05 },
    DF: { def: 0.45, phy: 0.2, pac: 0.15, pas: 0.15, dri: 0.05 },
    MF: { pas: 0.35, dri: 0.2, def: 0.15, sho: 0.1, phy: 0.1, pac: 0.1 },
    FW: { sho: 0.4, dri: 0.2, pac: 0.2, phy: 0.1, pas: 0.1 },
  };
  const OFFSETS = {
    GK: { gk: 0, pas: -25, phy: -18, pac: -25, sho: -50, dri: -40, def: -40 },
    DF: { def: 0, phy: 0, pac: -3, pas: -8, dri: -15, sho: -25, gk: -62 },
    MF: { pas: 0, dri: -2, def: -10, sho: -8, phy: -8, pac: -5, gk: -62 },
    FW: { sho: 0, dri: -2, pac: 0, phy: -8, pas: -10, def: -40, gk: -62 },
  };
  const ROLES = {
    key: { label: 'Ключевой игрок', share: 0.7, rank: 3 },
    rotation: { label: 'Игрок ротации', share: 0.4, rank: 2 },
    backup: { label: 'Запасной', share: 0.15, rank: 1 },
    youth: { label: 'Перспективный', share: 0.05, rank: 0 },
  };
  const TRAINING_FOCUS = { auto: 'По позиции', pac: 'Скорость', sho: 'Удар', pas: 'Пас', dri: 'Дриблинг', def: 'Отбор', phy: 'Физика', gk: 'Вратарская игра' };
  const INTENSITY = { low: { label: 'Лёгкая', dev: 0.7, fit: 2, inj: 0 }, normal: { label: 'Обычная', dev: 1.0, fit: 0, inj: 0.001 }, high: { label: 'Интенсивная', dev: 1.35, fit: -3, inj: 0.004 } };

  function ovrFrom(pos, a) { let s = 0; for (const k in WEIGHTS[pos]) s += a[k] * WEIGHTS[pos][k]; return s; }
  function recalc(p) { p.ovr = Math.round(ovrFrom(p.pos, p.attrs)); }

  function initAttrs(p) {
    const { ri, clamp } = U();
    const a = {};
    for (const k of ATTRS) a[k] = clamp(p.ovr + OFFSETS[p.pos][k] + ri(-7, 7), 5, 99);
    for (let i = 0; i < 4; i++) {
      const d = p.ovr - ovrFrom(p.pos, a);
      if (Math.abs(d) < 0.5) break;
      for (const k in WEIGHTS[p.pos]) a[k] = clamp(Math.round(a[k] + d), 5, 99);
    }
    p.attrs = a;
    recalc(p);
  }

  function initPotential(p, golden) {
    const { ri, clamp } = U();
    const a = p.age;
    let g;
    if (a <= 18) g = ri(4, 20); else if (a <= 20) g = ri(3, 15); else if (a <= 23) g = ri(1, 9); else if (a <= 26) g = ri(0, 4); else g = 0;
    if (golden) g = Math.max(g, ri(20, 32));
    p.pot = clamp(p.ovr + g, p.ovr, 95);
    p.potNoise = ri(-6, 6); // ошибка скаутов
  }

  function initPlayer(state, p, opts) {
    const { ri, rf, rnd } = U();
    initAttrs(p);
    initPotential(p, opts.golden);
    p.morale = ri(60, 80);
    p.training = { focus: 'auto', intensity: 'normal' };
    p.dev = 0;
    p.ovrStart = p.ovr;
    if (opts.contract) p.contract = opts.contract;
    else {
      let years = p.age >= 32 ? ri(1, 2) : p.youth ? ri(2, 3) : ri(2, 5);
      if (!p.youth && p.age < 32 && rnd() < 0.08) years = 1; // кому-то контракт истекает уже этим летом
      p.contract = { wage: U().r3(E().wageFor(p) * rf(0.85, 1.15)), until: state.season + years - 1 };
    }
  }

  const isWonderkid = (p) => p.age <= 20 && p.pot >= 83;

  // Оценка потенциала: свои игроки и проверенные скаутом — точнее
  function potRange(state, p) {
    const own = p.clubId === state.userClub;
    const known = own || p.scouted;
    const center = p.pot + (known ? 0 : p.potNoise);
    const err = known ? 2 : 5;
    return [Math.max(p.ovr, Math.round(center - err)), Math.min(99, Math.max(p.ovr, Math.round(center + err)))];
  }

  // ---------- настроение ----------
  const moraleMult = (p) => 0.95 + 0.08 * (p.morale == null ? 70 : p.morale) / 100;
  function moraleLabel(m) {
    if (m >= 80) return { label: 'Отличное', cls: 'good' };
    if (m >= 62) return { label: 'Хорошее', cls: 'good' };
    if (m >= 42) return { label: 'Нормальное', cls: '' };
    if (m >= 25) return { label: 'Плохое', cls: 'warn' };
    return { label: 'Ужасное', cls: 'bad' };
  }

  function assignRoles(state, clubId) {
    const sq = E().clubPlayers(state, clubId).sort((a, b) => b.ovr - a.ovr);
    sq.forEach((p, i) => {
      const natural = i < 11 ? 'key' : i < 16 ? 'rotation' : (p.age <= 20 ? 'youth' : 'backup');
      p.role = p.promisedRole && ROLES[p.promisedRole].rank > ROLES[natural].rank ? p.promisedRole : natural;
    });
  }

  // Разговор с игроком: обещание игрового времени
  function promisePlaytime(state, p) {
    if (p.promise) return { ok: false, why: 'Вы уже дали этому игроку обещание.' };
    p.promise = { until: state.round + 6, apps: p.stats.apps, need: 3, season: state.season };
    p.morale = Math.min(100, p.morale + 12);
    if (p.wantsOut && p.morale > 40) p.wantsOut = false;
    return { ok: true, text: `${p.name} доволен разговором. Вы пообещали ему не менее 3 матчей в ближайшие 6 туров.` };
  }

  // ---------- еженедельные изменения ----------
  function weekly(state, results) {
    const { rnd, ri, clamp, weighted } = U();
    const rounds = state.round + 1;
    for (const id in state.players) {
      const p = state.players[id];
      const own = p.clubId === state.userClub;
      const club = p.clubId ? state.clubs[p.clubId] : null;
      const tr = own ? p.training : { focus: 'auto', intensity: 'normal' };
      const I = INTENSITY[tr.intensity];

      // настроение
      if (club) {
        let m = p.morale;
        if (rounds >= 4 && p.injury <= 0) {
          const share = p.stats.apps / rounds;
          m += clamp((share - ROLES[p.role || 'backup'].share) * 4, -1.2, 0.8);
        }
        if (results[p.clubId] === 1) m += 0.8; else if (results[p.clubId] === -1) m -= 0.9;
        if (p.contract.wage < E().wageFor(p) * 0.6) m -= 0.8;
        if (p.contract.until === state.season && p.role === 'key' && state.round >= 10) m -= 0.4;
        m += (65 - m) * 0.05;
        p.morale = clamp(m, 0, 100);

        if (p.promise && state.round + 1 >= p.promise.until) {
          const got = p.stats.apps - p.promise.apps;
          if (p.promise.season !== state.season || got >= p.promise.need) p.morale = Math.min(100, p.morale + 5);
          else {
            p.morale = Math.max(0, p.morale - 22);
            if (own) E().addMail(state, { type: 'morale', pid: p.id, title: `${p.name} разочарован`, text: `Вы обещали ${p.name} игровое время, но он сыграл лишь ${got} матч(а). Игрок недоволен и не доверяет вашим словам.` });
          }
          p.promise = null;
        }
        if (!p.wantsOut && p.morale < 22 && p.role !== 'youth') {
          p.wantsOut = true;
          if (own) {
            E().addMail(state, { type: 'morale', pid: p.id, title: `${p.name} хочет уйти`, text: `${p.name} попросил выставить его на трансфер: игрок недоволен своим положением в команде. Можно поговорить с ним и пообещать игровое время или продать.` });
            E().addNews(state, `СМИ: ${p.name} недоволен ситуацией в «${club.name}» и хочет сменить клуб.`, 'rumour');
          }
        } else if (p.wantsOut && p.morale > 50) {
          p.wantsOut = false;
          if (own) E().addNews(state, `${p.name} снова счастлив в клубе и больше не просится на трансфер.`, 'squad');
        } else if (own && p.morale < 30 && p.role === 'key' && rnd() < 0.08) {
          E().addMail(state, { type: 'morale', pid: p.id, title: `${p.name} недоволен`, text: `Ключевой игрок ${p.name} жалуется на ситуацию в команде. Настроение: ${moraleLabel(p.morale).label.toLowerCase()}.` });
        }
      }

      // тренировки и развитие
      if (own) {
        p.fitness = clamp(p.fitness + I.fit, 30, 100);
        if (p.injury <= 0 && rnd() < I.inj) {
          p.injury = ri(1, 3);
          E().addNews(state, `${p.name} получил травму на тренировке (≈${p.injury} нед.).`, 'squad');
        }
      }
      const age = p.age;
      const rate = age <= 18 ? 0.3 : age <= 20 ? 0.26 : age <= 23 ? 0.17 : age <= 26 ? 0.07 : age <= 29 ? 0.02 : 0;
      if (rate > 0 && p.pot > p.ovr && p.injury <= 0) {
        const share = club ? Math.min(1, p.stats.apps / rounds) : 0.2;
        const play = 0.6 + 0.6 * share;
        const morale = 0.85 + 0.3 * p.morale / 100;
        p.dev += rate * Math.min(1, (p.pot - p.ovr) / 6) * I.dev * play * morale;
        while (p.dev >= 1) { p.dev -= 1; improve(p, tr.focus, 1); }
      }
      // спад после 30
      if (age >= 30) {
        const ch = age <= 31 ? 0.05 : age <= 33 ? 0.11 : 0.17;
        if (rnd() < ch * (tr.intensity === 'low' ? 0.8 : 1)) {
          const k = weighted(Object.keys(WEIGHTS[p.pos]), (x) => (x === 'pac' || x === 'phy' ? 3 : 1));
          p.attrs[k] = Math.max(5, p.attrs[k] - ri(1, 3));
          recalc(p);
        }
      }
    }
    for (const cid in state.clubs) if (rnd() < 0.25) assignRoles(state, cid);
  }

  function improve(p, focus, amount) {
    const { weighted } = U();
    const w = WEIGHTS[p.pos];
    const keys = Object.keys(w).concat(focus !== 'auto' && !w[focus] ? [focus] : []);
    const k = weighted(keys, (x) => (w[x] || 0.1) * (x === focus ? 4 : 1) * (p.attrs[x] >= 97 ? 0 : 1));
    p.attrs[k] = Math.min(99, p.attrs[k] + amount);
    const before = p.ovr;
    recalc(p);
    if (p.ovr > p.pot) p.pot = p.ovr;
    return p.ovr - before;
  }

  // ---------- конец сезона ----------
  function seasonReport(state, label) {
    const sq = E().clubPlayers(state, state.userClub);
    const delta = (p) => p.ovr - (p.ovrStart == null ? p.ovr : p.ovrStart);
    return {
      season: label,
      improved: sq.filter((p) => delta(p) >= 2).sort((a, b) => delta(b) - delta(a)).map((p) => ({ id: p.id, name: p.name, from: p.ovrStart, to: p.ovr })),
      declined: sq.filter((p) => delta(p) <= -2).sort((a, b) => delta(a) - delta(b)).map((p) => ({ id: p.id, name: p.name, from: p.ovrStart, to: p.ovr, age: p.age })),
      expiring: sq.filter((p) => p.contract.until === state.season).map((p) => ({ id: p.id, name: p.name, ovr: p.ovr, age: p.age })),
      nextYear: sq.filter((p) => p.contract.until === state.season + 1).map((p) => ({ id: p.id, name: p.name, ovr: p.ovr, age: p.age })),
      unhappy: sq.filter((p) => p.morale < 42 || p.wantsOut).map((p) => ({ id: p.id, name: p.name, morale: Math.round(p.morale), wantsOut: !!p.wantsOut })),
      veterans: sq.filter((p) => p.age >= 33).map((p) => ({ id: p.id, name: p.name, age: p.age, ovr: p.ovr })),
      talents: sq.filter((p) => isWonderkid(p)).map((p) => ({ id: p.id, name: p.name, age: p.age, ovr: p.ovr })),
      top: sq.slice().sort((a, b) => b.stats.goals - a.stats.goals)[0],
      released: [], retired: [],
    };
  }

  // Старение между сезонами; возвращает список завершивших карьеру
  function seasonAging(state) {
    const { rnd, ri, clamp } = U();
    const retired = [];
    for (const p of Object.values(state.players)) {
      p.age++;
      if (p.age >= 27) p.pot = Math.max(p.ovr, Math.min(p.pot, p.ovr + 1));
      else if (p.age <= 22) p.pot = clamp(p.pot + ri(-3, 3), p.ovr, 95); // талант может раскрыться или застопориться
      p.stats = { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0 };
      p.fitness = 100; p.suspended = 0; p.pendingBan = 0; p.injury = Math.max(0, p.injury - 6);
      p.promise = null;
      if (p.age >= 35 && rnd() < 0.4 + (p.age - 35) * 0.15) retired.push(p);
      else if (!p.clubId && p.age >= 33 && rnd() < 0.5) retired.push(p);
    }
    if (state.report) state.report.retired = retired.filter((p) => p.clubId === state.userClub).map((p) => ({ name: p.name, age: p.age }));
    return retired;
  }

  root.FMPeople = {
    ATTRS, ATTR_RU, WEIGHTS, ROLES, TRAINING_FOCUS, INTENSITY,
    initPlayer, recalc, isWonderkid, potRange, moraleMult, moraleLabel, assignRoles, promisePlaytime,
    weekly, seasonReport, seasonAging, improve,
  };
})(typeof window !== 'undefined' ? window : globalThis);
