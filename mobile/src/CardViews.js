import React, { useState, useRef } from 'react';
import { View, Text, Image, PanResponder, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect, Line, Polygon } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { fileUrl } from './api'; import { Badge } from './icons'; import { tr } from './translate';

const star = (cx, cy, R) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.4 : R; pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); } return pts.join(' '); };
// Drapeau de la République démocratique du Congo
export function Flag({ w = 84, h = 56 }) {
  return (<Svg width={w} height={h} viewBox="0 0 120 80"><Rect width="120" height="80" fill="#00A3DD" />
    <Line x1="-6" y1="86" x2="126" y2="-6" stroke="#F7D618" strokeWidth="17" /><Line x1="-6" y1="86" x2="126" y2="-6" stroke="#CE1021" strokeWidth="10" />
    <Polygon points={star(20, 19, 11)} fill="#F7D618" /></Svg>);
}
const Photo = ({ uri, name, w, h, r }) => uri
  ? <Image source={{ uri: fileUrl(uri) }} style={{ width: w, height: h, borderRadius: r, backgroundColor: '#DCE6F2' }} />
  : <View style={{ width: w, height: h, borderRadius: r, backgroundColor: '#DCE6F2', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#0B5FC4', fontWeight: '800', fontSize: w / 3 }}>{String(name || '?').slice(0, 2).toUpperCase()}</Text></View>;

// Carte citoyen : verre clair, photo carrée, QR à droite avec la mention « Scanner »
export function CitizenCard({ p }) {
  return (<LinearGradient colors={['#2E9E3F', '#0B5FC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 30, padding: 3 }}>
    <LinearGradient colors={['#FFFFFF', '#E9F3FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 27, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ borderRadius: 26, borderWidth: 3, borderColor: '#fff', elevation: 4, overflow: 'hidden' }}><Photo uri={p.photo_url} name={p.full_name} w={116} h={116} r={0} /></View>
        <View style={{ marginLeft: 16, flex: 1 }}><Text style={{ fontSize: 30, fontWeight: '800' }}><Text style={{ color: '#2E9E3F' }}>Gou</Text><Text style={{ color: '#0B5FC4' }}>vance</Text></Text>
          <Text style={{ color: '#5B6B7F', marginTop: 2 }}>{tr('Carte citoyen')}</Text></View></View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 18 }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}><Text style={{ fontSize: 19, fontWeight: '800', color: '#12263F' }}>{p.full_name}</Text><Badge kind={p.badge} size={18} /></View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#0B5FC4', marginTop: 4 }}>{p.gouvance_id}</Text></View>
        <View style={{ alignItems: 'center' }}><View style={{ backgroundColor: '#fff', padding: 6, borderRadius: 12 }}><QRCode value={'GVID:' + p.gouvance_id} size={84} color="#12263F" backgroundColor="#FFFFFF" /></View>
          <Text style={{ fontSize: 12, color: '#5B6B7F', marginTop: 4 }}>{tr('Scanner')}</Text></View></View>
    </LinearGradient></LinearGradient>);
}

const KIND = { father: 'Père', mother: 'Mère', child: 'Enfant' };
const Field = ({ l, v }) => <View style={{ marginBottom: 6 }}><Text style={{ fontSize: 10, color: '#6B7A8F' }}>{tr(l)}</Text><Text style={{ fontSize: 14, fontWeight: '700', color: '#12263F' }}>{v || '-'}</Text></View>;
const d10 = d => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');

// Carte de recensement familial (modèle carte d'identité : drapeau, puce = code famille, photo, QR, signature)
export function FamilyCard({ f }) {
  const head = (f.members || []).find(m => m.kind === 'father') || (f.members || [])[0] || {};
  const father = (f.members || []).find(m => m.kind === 'father'), mother = (f.members || []).find(m => m.kind === 'mother');
  return (<View style={{ backgroundColor: '#fff', borderRadius: 22, borderWidth: 2, borderColor: '#0B5FC4', overflow: 'hidden' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
      <Flag />
      <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontSize: 10, fontWeight: '800', color: '#12263F' }}>RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</Text>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#0B5FC4' }}>{tr('CARTE DE RECENSEMENT FAMILIAL')}</Text><Text style={{ fontSize: 11, color: '#5B6B7F' }}>Ville de Bukavu</Text></View>
      <Image source={require('../assets/logo.png')} style={{ width: 38, height: 38 }} /></View>
    <View style={{ height: 1.5, backgroundColor: '#12263F', marginHorizontal: 14 }} />
    <View style={{ flexDirection: 'row', padding: 14 }}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <LinearGradient colors={['#F6DD8A', '#D9A93A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1, borderColor: '#B98B22' }}>
          <Text style={{ fontSize: 10, color: '#6A4E0F' }}>{tr('Numéro')}</Text><Text style={{ fontSize: 17, fontWeight: '800', color: '#3F2E05', letterSpacing: 1 }}>{f.code}</Text></LinearGradient>
        <Field l="Nom de la famille" v={f.family_name} />
        <Field l="Père" v={father && father.full_name} /><Field l="Mère" v={mother && mother.full_name} />
        <Field l="Commune / Avenue / Quartier" v={[f.commune, f.avenue, f.quartier].filter(Boolean).join(' / ')} />
        <View style={{ flexDirection: 'row' }}><View style={{ flex: 1 }}><Field l="Date d'enregistrement" v={d10(f.created_at)} /></View><View style={{ flex: 1 }}><Field l="Vérifiée le" v={f.paid ? d10(f.paid_at) : 'Non vérifiée'} /></View></View></View>
      <View style={{ alignItems: 'center' }}>
        <Photo uri={head.photo_url} name={head.full_name} w={92} h={112} r={12} />
        {f.paid && f.qr ? <View style={{ marginTop: 10, alignItems: 'center' }}><QRCode value={f.qr} size={78} color="#12263F" backgroundColor="#FFFFFF" /><Text style={{ fontSize: 11, color: '#5B6B7F', marginTop: 3 }}>{tr('Scanner')}</Text></View>
          : <Text style={{ fontSize: 10, color: '#B3261E', marginTop: 10, textAlign: 'center', width: 92 }}>{tr('Carte non vérifiée : pas de QR')}</Text>}</View></View>
    <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 10 }}>{(f.members || []).slice(0, 8).map((m, i) => <View key={i} style={{ marginRight: 6 }}><Photo uri={m.photo_url} name={m.full_name} w={34} h={34} r={17} /></View>)}</View>
    <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12 }}>
      <View style={{ flex: 1 }}>{f.signature ? <Svg width={140} height={56} viewBox="0 0 300 120"><Path d={f.signature} stroke="#12263F" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg> : <View style={{ height: 56 }} />}
        <View style={{ height: 1, backgroundColor: '#9AA7B6', width: 140 }} /><Text style={{ fontSize: 10, color: '#6B7A8F', marginTop: 2 }}>{tr('Recenseur')} : {f.recenseur || '-'}</Text></View>
      <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end' }}><View style={{ height: 1, backgroundColor: '#9AA7B6', width: 120 }} /><Text style={{ fontSize: 10, color: '#6B7A8F', marginTop: 2 }}>{tr('Responsable de la famille')}</Text></View></View>
    <View style={{ backgroundColor: '#0B2A5B', paddingVertical: 8, alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Gouvance - NEXTI GIB</Text></View></View>);
}

// Zone de signature au doigt (le trait est enregistré en SVG et reproduit sur la carte)
export function SignaturePad({ onChange }) {
  const [paths, setPaths] = useState([]); const [live, setLive] = useState(''); const cur = useRef(''); const cb = useRef(onChange); cb.current = onChange;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onStartShouldSetPanResponderCapture: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => { cur.current = 'M' + e.nativeEvent.locationX.toFixed(1) + ' ' + e.nativeEvent.locationY.toFixed(1); setLive(cur.current); },
    onPanResponderMove: e => { cur.current += ' L' + e.nativeEvent.locationX.toFixed(1) + ' ' + e.nativeEvent.locationY.toFixed(1); setLive(cur.current); },
    onPanResponderRelease: () => { const p = cur.current; cur.current = ''; setLive(''); setPaths(a => { const n = [...a, p]; cb.current(n.join(' ')); return n; }); },
  })).current;
  return (<View>
    <View {...pan.panHandlers} style={{ width: 300, height: 120, borderRadius: 14, borderWidth: 1.5, borderColor: '#B7C4D6', backgroundColor: '#FAFCFF', alignSelf: 'center' }}>
      <View pointerEvents="none"><Svg width={300} height={120} viewBox="0 0 300 120"><Path d={paths.join(' ') + ' ' + live} stroke="#12263F" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg></View></View>
    <TouchableOpacity onPress={() => { setPaths([]); setLive(''); cb.current(''); }} style={{ alignSelf: 'center', marginTop: 6 }}><Text style={{ color: '#0B5FC4', fontWeight: '700' }}>{tr('Effacer la signature')}</Text></TouchableOpacity></View>);
}
