import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Alert, SafeAreaView, StatusBar, AppState } from 'react-native';
import { setLang as setTrLang, tr } from './src/translate';
import Lock from './src/Lock'; import Header from './src/Header';
import * as SecureStore from 'expo-secure-store';
import MapScreen from './src/MapScreen'; import Stats from './src/Stats'; import Profile from './src/Profile'; import Chat from './src/Chat'; import Feed from './src/Feed'; import Census from './src/Census'; import Admin from './src/Admin';
import T from './src/i18n'; import { api, setToken, initApi } from './src/api';

const C = { green: '#2E9E3F', blue: '#0B5FC4', ink: '#12263F', bg: '#FFFFFF', line: '#D9E2EC' };
const Field = p => <TextInput placeholderTextColor="#8A99AB" autoCapitalize="none" style={s.input} {...p} placeholder={tr(p.placeholder)} />;
const Btn = ({ t, onPress, alt }) => <TouchableOpacity onPress={onPress} style={[s.btn, alt && s.btnAlt]}><Text style={[s.btnT, alt && { color: C.blue }]}>{tr(t)}</Text></TouchableOpacity>;

export default function App() {
  const [lang, setLang] = useState('fr'); const t = T[lang]; setTrLang(lang);
  const [scr, setScr] = useState('register'); const [f, setF] = useState({ gender: 'M' }); const [user, setUser] = useState(null); const [locked, setLocked] = useState(false); const [peer, setPeer] = useState(null); const [ready, setReady] = useState(false);
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  React.useEffect(() => { const sb = AppState.addEventListener('change', async st => { if (st === 'background' && user && (await SecureStore.getItemAsync('bio')) === '1') setLocked(true); }); return () => sb.remove(); }, [user]);
  React.useEffect(() => { SecureStore.getItemAsync('lang').then(l => l && setLang(l)); }, []);
  React.useEffect(() => { initApi().finally(() => setReady(true)); }, []);
  const run = fn => async () => { try { await fn(); } catch (e) { Alert.alert('Gouvance', tr(e.message)); } };

  const Head = () => (<View style={{ alignItems: 'center', marginVertical: 18 }}><Image source={require('./assets/logo.png')} style={{ width: 96, height: 96, borderRadius: 22 }} />
    <Text style={s.brand}><Text style={{ color: C.green }}>Gou</Text><Text style={{ color: C.blue }}>vance</Text></Text></View>);
  const Foot = () => (<View style={{ alignItems: 'center', marginTop: 28 }}><Text style={{ color: '#8A99AB', fontSize: 12 }}>From</Text><Image source={require('./assets/nexti-gib.png')} style={{ width: 110, height: 70 }} resizeMode="contain" /></View>);
  const Langs = () => (<View style={s.row}>{['fr', 'sw', 'en'].map(l => <TouchableOpacity key={l} onPress={() => setLang(l)}><Text style={[s.lang, lang === l && { color: C.blue, fontWeight: '700' }]}>{l.toUpperCase()}</Text></TouchableOpacity>)}</View>);

  let body;
  if (scr === 'register') body = (<>
    <Head /><Text style={s.h}>{t.register}</Text>
    <Field placeholder={t.name} onChangeText={set('full_name')} /><Field placeholder={t.email} keyboardType="email-address" onChangeText={set('email')} />
    <Field placeholder={t.commune} onChangeText={set('commune')} /><Field placeholder={t.avenue} onChangeText={set('avenue')} /><Field placeholder="Date de naissance (AAAA-MM-JJ)" onChangeText={set('birth_date')} />
    <View style={s.row}>{['M', 'F'].map(g => <TouchableOpacity key={g} onPress={() => set('gender')(g)} style={[s.chip, f.gender === g && s.chipOn]}><Text style={f.gender === g && { color: '#fff' }}>{t[g]}</Text></TouchableOpacity>)}</View>
    <Btn t={t.next} onPress={run(async () => { await api('/auth/register', 'POST', f); setScr('verify'); })} />
    <Btn alt t={t.haveId} onPress={() => setScr('login')} /><Langs /></>);
  if (scr === 'verify') body = (<><Head /><Text style={s.h}>{t.code}</Text><Field placeholder="000000" keyboardType="number-pad" onChangeText={set('code')} />
    <Btn t={t.verify} onPress={run(async () => { const r = await api('/auth/verify-email', 'POST', { email: f.email, code: f.code });
      if (r.status === 'active') Alert.alert('ID: ' + r.gouvance_id, 'PIN: ' + r.pin); else Alert.alert('Gouvance', t.pending); setScr('login'); })} /></>);
  if (scr === 'login') body = (<><Head /><Text style={s.h}>{t.space}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{['citizen', 'bourgmestre', 'chef_avenue', 'chef_quartier', 'recenseur'].map(k => <TouchableOpacity key={k} onPress={() => set('space')(k)} style={[s.chip, (f.space || 'citizen') === k && s.chipOn]}><Text style={(f.space || 'citizen') === k && { color: '#fff' }}>{t[k]}</Text></TouchableOpacity>)}</View>
    <Field placeholder={t.id} onChangeText={set('gouvance_id')} /><Field placeholder={t.pin} secureTextEntry keyboardType="number-pad" onChangeText={set('pin')} />
    <Btn t={t.login} onPress={run(async () => { const r = await api('/auth/login', 'POST', { gouvance_id: f.gouvance_id, pin: f.pin, space: f.space || 'citizen' });
      setToken(r.token); await SecureStore.setItemAsync('tk', r.token); setUser(r); setScr('home'); })} /><Langs /></>);
  if (scr === 'home') body = <Home t={t} user={user} setScr={setScr} logout={() => { setToken(null); setUser(null); setScr('login'); }} run={run} />;
  if (scr === 'notes') body = <Profile start="notes" lang={lang} setLang={l => { setLang(l); SecureStore.setItemAsync('lang', l); }} back={() => setScr('home')} logout={() => { setToken(null); setUser(null); setScr('login'); }} />;
  if (scr === 'map') body = <MapScreen user={user} back={() => setScr('home')} />;
  if (scr === 'stats') body = <Stats back={() => setScr('home')} />;
  if (scr === 'profile') body = <Profile lang={lang} setLang={l => { setLang(l); SecureStore.setItemAsync('lang', l); }} back={() => setScr('home')} logout={() => { setToken(null); setUser(null); setScr('login'); }} />;
  if (scr === 'chat') body = <Chat user={user} start={peer} back={() => { setPeer(null); setScr('home'); }} />;
  if (scr === 'feed') body = <Feed user={user} onChat={g => { setPeer(g); setScr('chat'); }} back={() => setScr('home')} />;
  if (scr === 'census') body = <Census user={user} back={() => setScr('home')} />;
  if (scr === 'admin') body = <Admin back={() => setScr('home')} />;
  if (scr === 'wallet') body = <Wallet t={t} setScr={setScr} run={run} me={user.user.id} />;
  if (!ready) return <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center' }}><Text style={{ textAlign: 'center', color: '#0B5FC4', fontSize: 28, fontWeight: '800' }}>Gouvance</Text></View>;
  if (locked) return <Lock onOk={() => setLocked(false)} />;
  const auth = ['register', 'verify', 'login'].includes(scr);
  return (<SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}><StatusBar barStyle="dark-content" /><ScrollView contentContainerStyle={{ flexGrow: 1, padding: 22 }} keyboardShouldPersistTaps="handled">{auth ? (<><View style={{ flex: 1, justifyContent: 'center' }}>{body}</View><Foot /></>) : body}</ScrollView></SafeAreaView>);
}

function Home({ t, user, setScr, logout }) {
  return (<>
    <Header onMenu={() => setScr('profile')} onBell={() => setScr('notes')} />
    <View style={s.card}><Text style={{ color: C.ink, fontSize: 16, lineHeight: 23 }}>{t.welcome}</Text><Text style={{ marginTop: 10, color: '#5B6B7F' }}>{user.user.name} - {user.user.gouvance_id}</Text></View>
    <Btn t={t.wallet} onPress={() => setScr('wallet')} />
    <Btn t="Carte et communes" onPress={() => setScr('map')} />
    <Btn t="Messages" onPress={() => setScr('chat')} />
    <Btn alt t="Mon profil" onPress={() => setScr('profile')} />
    {user.roles.some(r => ['admin', 'bourgmestre', 'chef_avenue', 'chef_quartier'].includes(r.role)) && <Btn t="Statistiques" onPress={() => setScr('stats')} />}
    <Btn t="Actualités et Marketplace" onPress={() => setScr('feed')} />
    <Btn t="Recensement et Salongo" onPress={() => setScr('census')} />
    {user.roles.some(r => r.role === 'admin') && <Btn alt t="Administration" onPress={() => setScr('admin')} />}
    {user.roles.map(r => <Text key={r.role + r.scope} style={s.role}>{t[r.role] || r.role}{r.scope !== '*' ? ' : ' + r.scope : ''}</Text>)}
    <Btn alt t={t.logout} onPress={logout} /></>);
}

function Wallet({ t, setScr, run, me }) {
  const [hist, setHist] = useState([]);
  const [bal, setBal] = useState(null); const [d, setD] = useState({}); const [who, setWho] = useState(null); const [rec, setRec] = useState(null);
  const set = k => v => setD(x => ({ ...x, [k]: v }));
  React.useEffect(() => { api('/wallet/balance').then(r => setBal(r.balance)).catch(() => {}); api('/wallet/history').then(setHist).catch(() => {}); }, [rec]);
  return (<>
    <Text style={s.h}>{t.wallet}</Text><View style={s.card}><Text>{t.balance}</Text><Text style={{ fontSize: 30, fontWeight: '700', color: C.blue }}>{bal ?? '...'} FC</Text></View>
    {hist.slice(0, 8).map(x => <Text key={x.code} style={{ color: '#5B6B7F', marginBottom: 4 }}>{new Date(x.created_at).toLocaleDateString('fr-FR')} - {x.kind === 'transfer' ? (x.from_user === me ? 'Envoyé' : 'Reçu') : x.kind === 'admin_credit' ? 'Recharge' : x.kind === 'census_fee' ? 'Recensement' : 'Amende Salongo'} : {x.amount} FC</Text>)}
    <Field placeholder={t.setpin} secureTextEntry keyboardType="number-pad" maxLength={4} onChangeText={set('newpin')} />
    <Btn alt t={t.setpin} onPress={run(async () => { await api('/wallet/set-pin', 'POST', { pin: d.newpin }); Alert.alert('Gouvance', t.ok); })} />
    <Field placeholder={t.id} onChangeText={set('to')} /><Btn alt t={t.search} onPress={run(async () => setWho(await api('/wallet/lookup', 'POST', { gouvance_id: d.to })))} />
    {who && <View style={s.card}><Text style={{ fontWeight: '700' }}>{who.full_name}</Text><Text>{who.gouvance_id}</Text></View>}
    {who && <><Field placeholder={t.amount} keyboardType="number-pad" onChangeText={set('amount')} /><Field placeholder={t.walletPin} secureTextEntry keyboardType="number-pad" onChangeText={set('wpin')} />
      <Btn t={t.send} onPress={run(async () => setRec(await api('/wallet/transfer', 'POST', { to: who.gouvance_id, amount: d.amount, wallet_pin: d.wpin })))} /></>}
    {rec && <View style={s.card}><Text>{rec.amount} FC - {rec.name} ({rec.to})</Text><Text>{new Date(rec.date).toLocaleString()}</Text><Text style={{ fontWeight: '700' }}>{rec.code}</Text></View>}
    <Btn alt t={t.back} onPress={() => setScr('home')} /></>);
}

const s = StyleSheet.create({
  brand: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginTop: 6 }, h: { fontSize: 20, fontWeight: '700', color: C.ink, marginVertical: 12 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16, color: C.ink },
  btn: { backgroundColor: C.blue, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 }, btnAlt: { backgroundColor: '#EAF2FC' }, btnT: { color: '#fff', fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }, lang: { marginHorizontal: 12, color: '#8A99AB' },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, margin: 4 }, chipOn: { backgroundColor: C.green, borderColor: C.green },
  card: { backgroundColor: '#F4F8FC', borderRadius: 14, padding: 16, marginVertical: 10 }, role: { color: C.green, fontWeight: '700', marginTop: 6 } });
