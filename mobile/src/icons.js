import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
const I = {
  home: [{ p: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }, { p: 'M9 22V12h6v10' }],
  chat: [{ p: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }],
  search: [{ c: [11, 11, 8] }, { p: 'M21 21l-4.35-4.35' }],
  users: [{ p: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }, { c: [9, 7, 4] }, { p: 'M23 21v-2a4 4 0 0 0-3-3.87' }, { p: 'M16 3.13a4 4 0 0 1 0 7.75' }],
  user: [{ p: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }, { c: [12, 7, 4] }],
  bell: [{ p: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }, { p: 'M13.73 21a2 2 0 0 1-3.46 0' }],
  plus: [{ p: 'M12 5v14M5 12h14' }],
  heart: [{ p: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }],
  eye: [{ p: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }, { c: [12, 12, 3] }],
  next: [{ p: 'M9 18l6-6-6-6' }],
  wallet: [{ p: 'M21 12V7H5a2 2 0 0 1 0-4h14v4' }, { p: 'M3 5v14a2 2 0 0 0 2 2h16v-5' }, { p: 'M18 12a2 2 0 0 0 0 4h4v-4z' }],
  shield: [{ p: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }],
  lock: [{ r: [3, 11, 18, 11, 2] }, { p: 'M7 11V7a5 5 0 0 1 10 0v4' }],
  globe: [{ c: [12, 12, 10] }, { p: 'M2 12h20' }, { p: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }],
  info: [{ c: [12, 12, 10] }, { p: 'M12 16v-4M12 8h.01' }],
  help: [{ c: [12, 12, 10] }, { p: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }, { p: 'M12 17h.01' }],
  file: [{ p: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }, { p: 'M14 2v6h6M8 13h8M8 17h8' }],
  logout: [{ p: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }, { p: 'M16 17l5-5-5-5' }, { p: 'M21 12H9' }],
  card: [{ r: [2, 5, 20, 14, 2] }, { p: 'M2 10h20' }],
  download: [{ p: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }, { p: 'M7 10l5 5 5-5' }, { p: 'M12 15V3' }],
  image: [{ r: [3, 3, 18, 18, 2] }, { c: [8.5, 8.5, 1.5] }, { p: 'M21 15l-5-5L5 21' }],
  type: [{ p: 'M4 7V4h16v3M9 20h6M12 4v16' }],
  video: [{ p: 'M23 7l-7 5 7 5V7z' }, { r: [1, 5, 15, 14, 2] }],
  tag: [{ p: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' }, { p: 'M7 7h.01' }],
  chart: [{ p: 'M18 20V10M12 20V4M6 20v-6' }],
  map: [{ p: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z' }, { p: 'M8 2v16M16 6v16' }],
  send: [{ p: 'M22 2L11 13' }, { p: 'M22 2l-7 20-4-9-9-4 20-7z' }],
  mic: [{ p: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }, { p: 'M19 10v2a7 7 0 0 1-14 0v-2' }, { p: 'M12 19v4M8 23h8' }],
  play: [{ p: 'M5 3l14 9-14 9V3z' }],
  pause: [{ p: 'M6 4h4v16H6zM14 4h4v16h-4z' }],
  check: [{ p: 'M20 6L9 17l-5-5' }],
  x: [{ p: 'M18 6L6 18M6 6l12 12' }],
  back: [{ p: 'M15 18l-6-6 6-6' }],
  badge: [{ p: 'M12 15l-3.5 2 1-4-3-2.7 4-.3L12 6l1.5 3.9 4 .3-3 2.7 1 4z' }],
};
export function Icon({ name, size = 24, color = '#12263F', fill = 'none', sw = 2 }) {
  return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">{(I[name] || []).map((e, i) => e.p
    ? <Path key={i} d={e.p} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill={fill} />
    : e.c ? <Circle key={i} cx={e.c[0]} cy={e.c[1]} r={e.c[2]} stroke={color} strokeWidth={sw} fill="none" />
    : <Rect key={i} x={e.r[0]} y={e.r[1]} width={e.r[2]} height={e.r[3]} rx={e.r[4]} stroke={color} strokeWidth={sw} fill="none" />)}</Svg>);
}
// Badge de certification : noir = administration (admin, bourgmestre, chefs, recenseurs) ; bleu = citoyen vérifié
const seal = (() => { let d = ''; for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2, r = 10.2 + 1.1 * Math.cos(a * 10); d += (i ? 'L' : 'M') + (12 + r * Math.cos(a)).toFixed(2) + ' ' + (12 + r * Math.sin(a)).toFixed(2); } return d + 'Z'; })();
export function Badge({ kind, size = 16 }) {
  if (!kind) return null;
  return (<Svg width={size} height={size} viewBox="0 0 24 24" style={{ marginLeft: 4 }}>
    <Path d={seal} fill={kind === 'admin' ? '#111111' : '#1D8CF8'} />
    <Path d="M7.5 12.5l3 3 6-6.5" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>);
}
