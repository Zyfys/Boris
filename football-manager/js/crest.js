// Генератор собственных значков клубов (SVG): форма щита и узор выбираются по коду клуба,
// цвета — клубные. Это не копии настоящих эмблем.
(function (root) {
  'use strict';
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function lum(hex) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  const SHAPES = [
    'M50 4 L92 14 L92 52 C92 78 72 92 50 100 C28 92 8 78 8 52 L8 14 Z',
    'M10 6 H90 V50 Q90 84 50 100 Q10 84 10 50 Z',
    'M50 3 L94 25 V75 L50 99 L6 75 V25 Z',
    'M50 4 A46 46 0 1 1 49.9 4 Z',
    'M14 4 H86 L94 20 V56 C94 80 72 94 50 100 C28 94 6 80 6 56 V20 Z',
  ];
  function pattern(kind, c1, c2) {
    switch (kind) {
      case 0: return `<rect width="100" height="104" fill="${c1}"/>`;
      case 1: return `<rect width="100" height="104" fill="${c1}"/>${[18, 42, 66].map((x) => `<rect x="${x}" width="12" height="104" fill="${c2}"/>`).join('')}`;
      case 2: return `<rect width="50" height="104" fill="${c1}"/><rect x="50" width="50" height="104" fill="${c2}"/>`;
      case 3: return `<rect width="100" height="104" fill="${c1}"/>${[16, 72].map((y) => `<rect y="${y}" width="100" height="12" fill="${c2}"/>`).join('')}`;
      case 4: return `<rect width="100" height="104" fill="${c1}"/><path d="M-10 20 L20 -10 L110 80 L80 110 Z" fill="${c2}"/>`;
      case 5: return `<rect width="100" height="104" fill="${c1}"/><path d="M0 70 L50 40 L100 70 L100 88 L50 58 L0 88 Z" fill="${c2}"/>`;
      default: return `<rect width="100" height="104" fill="${c1}"/><rect width="50" height="52" fill="${c2}"/><rect x="50" y="52" width="50" height="52" fill="${c2}"/>`;
    }
  }
  function crestSVG(club, size) {
    const h = hash(club.id);
    const [c1, c2] = club.colors;
    const shape = SHAPES[h % SHAPES.length];
    const pat = (h >> 3) % 7;
    const dark = lum(c1) < lum(c2) ? c1 : c2;
    const other = dark === c1 ? c2 : c1;
    const light = lum(other) - lum(dark) > 0.3 ? other : lum(dark) < 0.25 ? '#FFFFFF' : '#111111';
    const uid = 'cr' + club.id + (size || '');
    const star = club.rep >= 90 ? `<path d="M50 -9 L53 -1 L61 -1 L55 4 L57 12 L50 7 L43 12 L45 4 L39 -1 L47 -1 Z" fill="#E9C03A" stroke="#3a2a00" stroke-width="1"/>` : '';
    return `<svg class="crest-svg" width="${size}" height="${Math.round(size * 1.08)}" viewBox="0 -12 100 116" aria-hidden="true">
      <defs><clipPath id="${uid}"><path d="${shape}"/></clipPath></defs>
      <g clip-path="url(#${uid})">${pattern(pat, c1, c2)}
        <rect x="0" y="38" width="100" height="26" fill="${dark}" opacity="0.92"/>
      </g>
      <path d="${shape}" fill="none" stroke="#0d1410" stroke-width="4"/>
      <text x="50" y="57.5" text-anchor="middle" font-family="'Russo One', 'Arial Narrow', sans-serif" font-size="20" fill="${light}" letter-spacing="1">${club.id}</text>
      ${star}
    </svg>`;
  }
  root.FMCrest = { crestSVG };
})(typeof window !== 'undefined' ? window : globalThis);
