import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, AppState, BackHandler, Modal, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { setLang as setTrLang, tr } from './src/translate';
import { setToken, initApi } from './src/api';
import { runBack } from './src/back'; import { Icon } from './src/icons'; import { rtConnect, rtClose, rtSubscribe } from './src/rt'; import { LinearGradient } from 'expo-linear-gradient';
import Lock from './src/Lock'; import Header from './src/Header'; import Auth from './src/Auth';
import Feed, { Compose } from './src/Feed'; import Chat from './src/Chat'; import Search from './src/Search';
import Census from './src/Census'; import Profile from './src/Profile'; import Wallet from './src/Wallet'; import Notifs from './src/Notifs';
import MapScreen from './src/MapScreen'; import Stats from './src/Stats'; import Admin from './src/Admin';

const C = { green: '#2E9E3F', blue: '#0B5FC4' };
const TABS = [['home', 'home', 'Accueil'], ['chat', 'chat', 'Messages'], ['search', 'search', 'Recherche'], ['census', 'users', 'Recensement'], ['profile', 'user', 'Profil']];

export default function App() {
  const [lang, setLang] = useState('fr'); setTrLang(lang);
  const [ready, setReady] = useState(false); const [user, setUser] = useState(null); const [locked, setLocked] = useState(false);
  const [tab, setTab] = useState('home'); const [stack, setStack] = useState([]); const [peer, setPeer] = useState(null); const [sheet, setSheet] = useState(false); const [banner, setBanner] = useState(null); const [tick, setTick] = useState(0); const [threadOpen, setThreadOpen] = useState(false);
  const st = useRef({}); st.current = { stack, tab, user, threadOpen };

  useEffect(() => { SecureStore.getItemAsync('lang').then(l => { if (l) setLang(l); }); initApi().finally(() => setReady(true)); }, []);
  useEffect(() => { const sb = AppState.addEventListener('change', async s => { if (s === 'background' && st.current.user && (await SecureStore.getItemAsync('bio')) === '1') setLocked(true); }); return () => sb.remove(); }, []);
  useEffect(() => {
    if (!user) return undefined;
    rtConnect();
    const off = rtSubscribe(e => {
      if (e.t !== 'msg') return;
      setTick(x => x + 1);
      const s = st.current; if (s.tab === 'chat' && s.threadOpen && !s.stack.length) return;
      const m = e.m || {}; setBanner({ from: e.from, title: e.name || 'Nouveau message', body: m.kind === 'text' ? m.body : m.kind === 'image' ? 'Photo' : 'Message vocal' });
    });
    return () => { off(); rtClose(); };
  }, [user]);
  useEffect(() => { if (!banner) return undefined; const t = setTimeout(() => setBanner(null), 5000); return () => clearTimeout(t); }, [banner]);
  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (runBack()) return true;
      const { stack: s, tab: t, user: u } = st.current;
      if (s.length) { setStack(x => x.slice(0, -1)); return true; }
      if (u && t !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => h.remove();
  }, []);

  const chg = l => { setLang(l); SecureStore.setItemAsync('lang', l); };
  const push = (name, props) => setStack(s => [...s, { name, props: props || {} }]);
  const pop = () => setStack(s => s.slice(0, -1));
  const openChat = g => { setStack([]); setPeer(g); setTab('chat'); };
  const onLogin = r => { setToken(r.token); setUser(r); setTab('home'); setStack([]); };
  const logout = () => { setToken(null); setUser(null); setStack([]); setTab('home'); setPeer(null); };

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center' }}><Text style={{ textAlign: 'center', color: C.blue, fontSize: 30, fontWeight: '800' }}>Gouvance</Text></View>;
  if (locked) return <Lock onOk={() => setLocked(false)} />;
  const top = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 48;
  if (!user) return <View style={{ flex: 1, backgroundColor: '#fff' }}><StatusBar barStyle="dark-content" backgroundColor="#fff" /><Auth onLogin={onLogin} lang={lang} setLang={chg} /></View>;

  const pushed = stack[stack.length - 1];
  const screen = s => {
    switch (s.name) {
      case 'notifs': return <Notifs onOpenChat={openChat} />;
      case 'wallet': return <Wallet user={user} />;
      case 'map': return <MapScreen user={user} back={pop} />;
      case 'stats': return <Stats back={pop} />;
      case 'admin': return <Admin back={pop} />;
      case 'census': return <Census user={user} back={pop} onMap={() => push('map')} />;
      case 'compose': return <Compose mode={s.props.mode} done={pop} />;
      default: return null;
    }
  };
  const tabContent = () => {
    if (tab === 'home') return <Feed user={user} onChat={openChat} />;
    if (tab === 'chat') return <Chat user={user} start={peer} onThread={setThreadOpen} />;
    if (tab === 'search') return <Search onChat={openChat} />;
    if (tab === 'census') return <Census user={user} back={() => setTab('home')} onMap={() => push('map')} />;
    return <Profile user={user} lang={lang} setLang={chg} push={push} logout={logout} />;
  };

  return (<View style={{ flex: 1, backgroundColor: '#fff', paddingTop: top }}>
    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
    {!pushed && !(tab === 'chat' && threadOpen) && <Header onBell={() => push('notifs')} tick={tick} />}
    {!pushed && tab === 'chat' ? <View style={{ flex: 1 }}>{tabContent()}</View>
      : <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: pushed || tab === 'census' || tab === 'profile' ? 18 : 0, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">{pushed ? screen(pushed) : tabContent()}</ScrollView>}
    {!pushed && tab === 'home' && <TouchableOpacity onPress={() => setSheet(true)} activeOpacity={0.85} style={{ position: 'absolute', right: 18, bottom: 86, width: 58, height: 58, borderRadius: 29, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', elevation: 6 }}><Icon name="plus" size={28} color="#fff" /></TouchableOpacity>}
    {!pushed && !(tab === 'chat' && threadOpen) && <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: '#E6ECF3', backgroundColor: '#fff', paddingTop: 8, paddingBottom: Platform.OS === 'android' ? 10 : 22 }}>
      {TABS.map(([k, ic, lb]) => (<TouchableOpacity key={k} onPress={() => { setTab(k); if (k !== 'chat') setPeer(null); }} style={{ flex: 1, alignItems: 'center' }}>
        <Icon name={ic} size={24} color={tab === k ? C.blue : '#9AA7B6'} /><Text style={{ fontSize: 11, marginTop: 2, color: tab === k ? C.blue : '#9AA7B6', fontWeight: tab === k ? '700' : '400' }}>{tr(lb)}</Text></TouchableOpacity>))}</View>}
    {banner && <TouchableOpacity activeOpacity={0.9} onPress={() => { const b = banner; setBanner(null); openChat(b.from); }} style={{ position: 'absolute', top: top + 6, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', elevation: 12, borderWidth: 1, borderColor: '#E1EAF5' }}>
      <LinearGradient colors={['#0B5FC4', '#2E9E3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={22} color="#fff" /></LinearGradient>
      <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontSize: 12, fontWeight: '800' }}><Text style={{ color: C.green }}>Gou</Text><Text style={{ color: C.blue }}>vance</Text></Text><Text style={{ fontWeight: '700', color: '#12263F' }}>{banner.title}</Text><Text numberOfLines={1} style={{ color: '#42526B' }}>{banner.body}</Text></View></TouchableOpacity>}
    <Modal transparent visible={sheet} animationType="slide" onRequestClose={() => setSheet(false)}>
      <TouchableOpacity activeOpacity={1} onPress={() => setSheet(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#12263F', marginBottom: 10 }}>{tr('Que voulez-vous publier ?')}</Text>
          {[['image', 'Photo', 'photo'], ['type', 'Texte', 'text'], ['video', 'Vidéo', 'video'], ['tag', 'Article à vendre', 'market']].map(([ic, lb, m]) => (
            <TouchableOpacity key={m} onPress={() => { setSheet(false); push('compose', { mode: m }); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}><Icon name={ic} size={24} color={C.blue} /><Text style={{ marginLeft: 14, fontSize: 16, color: '#12263F' }}>{tr(lb)}</Text></TouchableOpacity>))}</View></TouchableOpacity></Modal></View>);
}
