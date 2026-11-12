import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Audio } from 'expo-av'; import * as FileSystem from 'expo-file-system'; import * as ImagePicker from 'expo-image-picker'; import * as Contacts from 'expo-contacts';
import { api, uploadBase64, fileUrl } from './api'; import { Field, Btn, C, run, tr } from './ui';
import { Icon, Badge } from './icons'; import { Avatar } from './Feed'; import { useBack } from './back'; import { rtSubscribe } from './rt';

const hm = d => { const x = new Date(d); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
const ago = d => { if (!d) return 'hors ligne'; const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 1 ? "vu à l'instant" : m < 60 ? 'vu il y a ' + m + ' min' : m < 1440 ? 'vu il y a ' + Math.round(m / 60) + ' h' : 'vu il y a ' + Math.round(m / 1440) + ' j'; };
const prev = c => (c.kind === 'text' ? c.body : c.kind === 'image' ? 'Photo' : 'Message vocal');

export default function Chat({ start, onThread }) {
  const [peer, setPeer] = useState(start || null); const [convs, setConvs] = useState([]); const [q, setQ] = useState(''); const [found, setFound] = useState(null);
  const loadConvs = async () => setConvs(await api('/chat/conversations'));
  useEffect(() => { run(loadConvs)(); return rtSubscribe(() => { loadConvs().catch(() => {}); }); }, []);
  useEffect(() => { if (start) setPeer(start); }, [start]);
  useEffect(() => { if (onThread) onThread(!!peer); return () => { if (onThread) onThread(false); }; }, [peer]);
  const close = () => { setPeer(null); loadConvs().catch(() => {}); };
  useBack(peer ? close : null);
  if (peer) return <Thread gid={peer} onClose={close} />;
  return (<ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
    <Text style={{ fontSize: 24, fontWeight: '800', color: '#12263F', marginBottom: 10 }}>{tr('Messages')}</Text>
    <Field placeholder="ID Gouvance ou numéro de téléphone" value={q} onChangeText={setQ} />
    <Btn alt t="Chercher" onPress={run(async () => setFound(await api('/chat/find', 'POST', /^GV/i.test(q.trim()) ? { gouvance_id: q.trim().toUpperCase() } : { phone: q })))} />
    <Btn alt t="Retrouver mes contacts" onPress={run(async () => {
      const p = await Contacts.requestPermissionsAsync(); if (!p.granted) throw new Error('Autorisez les contacts');
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] }); const phones = []; data.forEach(c => (c.phoneNumbers || []).forEach(n => phones.push(n.number)));
      const r = await api('/chat/match', 'POST', { phones }); setFound(r.length ? r : { message: "Aucun de vos contacts n'est encore sur Gouvance" }); })} />
    {found && (found.message ? <Text style={{ color: '#5B6B7F', marginVertical: 10 }}>{tr(found.message)}</Text> : found.map(u => (
      <TouchableOpacity key={u.gouvance_id} onPress={() => { setFound(null); setPeer(u.gouvance_id); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF2FC', borderRadius: 16, padding: 12, marginVertical: 6 }}>
        <Avatar uri={u.photo_url} name={u.full_name} size={44} /><View style={{ marginLeft: 12, flex: 1 }}><Text style={{ fontWeight: '700' }}>{u.full_name}</Text><Text style={{ color: '#5B6B7F' }}>{u.bio || u.gouvance_id}</Text></View><Icon name="chat" size={22} color={C.blue} /></TouchableOpacity>)))}
    <View style={{ marginTop: 10 }}>
      {!convs.length && <Text style={{ color: '#5B6B7F', marginTop: 10 }}>{tr("Aucune discussion pour le moment. Cherchez une personne par son ID ou son numéro pour commencer.")}</Text>}
      {convs.map(c => (<TouchableOpacity key={c.gouvance_id} onPress={() => setPeer(c.gouvance_id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEF2F7' }}>
        <Avatar uri={c.photo_url} name={c.full_name} size={52} />
        <View style={{ flex: 1, marginLeft: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontWeight: '700', fontSize: 16, color: '#12263F' }}>{c.full_name}</Text><Badge kind={c.badge} size={16} /></View>
          <Text numberOfLines={1} style={{ color: c.unread ? '#12263F' : '#5B6B7F', fontWeight: c.unread ? '700' : '400', marginTop: 2 }}>{c.kind === 'text' ? c.body : tr(prev(c))}</Text></View>
        <View style={{ alignItems: 'flex-end' }}><Text style={{ color: '#8A99AB', fontSize: 12 }}>{hm(c.created_at)}</Text>
          {c.unread ? <View style={{ marginTop: 4, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{c.unread}</Text></View> : null}</View></TouchableOpacity>))}</View></ScrollView>);
}

function Thread({ gid, onClose }) {
  const [d, setD] = useState(null); const [msgs, setMsgs] = useState([]); const [txt, setTxt] = useState(''); const [rec, setRec] = useState(null); const [playing, setPlaying] = useState(null);
  const sc = useRef(null); const sound = useRef(null);
  const load = async () => { const r = await api('/chat/with/' + gid); setD(r.peer); setMsgs(r.messages); await api('/chat/read', 'POST', { from: gid }); };
  useEffect(() => {
    run(load)();
    const off = rtSubscribe(e => {
      if (e.t === 'msg' && e.from === gid) { setMsgs(m => [...m, e.m]); api('/chat/read', 'POST', { from: gid }).catch(() => {}); }
      if (e.t === 'read' && e.by === gid) setMsgs(m => m.map(x => (x.mine && !x.read_at ? { ...x, read_at: new Date().toISOString() } : x)));
    });
    return () => { off(); if (sound.current) sound.current.unloadAsync().catch(() => {}); };
  }, [gid]);
  const send = body => api('/chat/send', 'POST', { to: gid, ...body }).then(m => setMsgs(x => [...x, m]));
  const sendText = run(async () => { const b = txt.trim(); if (!b) return; setTxt(''); await send({ kind: 'text', body: b }); });
  const photo = run(async () => { const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) await send({ kind: 'image', media_url: await uploadBase64(r.assets[0].base64) }); });
  const startRec = run(async () => {
    const p = await Audio.requestPermissionsAsync(); if (!p.granted) throw new Error('Autorisez le micro');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); setRec(recording);
  });
  const cancelRec = async () => { try { await rec.stopAndUnloadAsync(); } catch (e) {} setRec(null); };
  const sendRec = run(async () => {
    await rec.stopAndUnloadAsync(); const uri = rec.getURI(); setRec(null);
    await send({ kind: 'voice', media_url: await uploadBase64(await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })) });
  });
  const play = run(async m => {
    if (sound.current) { await sound.current.unloadAsync().catch(() => {}); sound.current = null; if (playing === m.id) { setPlaying(null); return; } }
    const { sound: s } = await Audio.Sound.createAsync({ uri: fileUrl(m.media_url) }, { shouldPlay: true }, st => { if (st.didJustFinish) setPlaying(null); });
    sound.current = s; setPlaying(m.id);
  });
  return (<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#EEF2F7' }}>
      <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><Icon name="back" size={26} /></TouchableOpacity>
      {d && <Avatar uri={d.photo_url} name={d.full_name} size={42} />}
      <View style={{ marginLeft: 10, flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 17, fontWeight: '800', color: '#12263F' }}>{d ? d.full_name : '...'}</Text>{d ? <Badge kind={d.badge} size={17} /> : null}</View>
        {d && <Text style={{ fontSize: 12, color: d.online ? C.green : '#8A99AB' }}>{d.online ? tr('en ligne') : tr(ago(d.last_seen))}</Text>}</View></View>
    <ScrollView ref={sc} onContentSizeChange={() => sc.current && sc.current.scrollToEnd({ animated: false })} contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
      {d && d.bio ? <Text style={{ textAlign: 'center', color: '#8A99AB', marginBottom: 10 }}>{d.bio}</Text> : null}
      {msgs.map(m => (<View key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginVertical: 4 }}>
        <View style={{ backgroundColor: m.mine ? C.blue : '#F1F4F8', borderRadius: 18, borderBottomRightRadius: m.mine ? 4 : 18, borderBottomLeftRadius: m.mine ? 18 : 4, padding: m.kind === 'image' ? 4 : 11 }}>
          {m.kind === 'text' && <Text style={{ color: m.mine ? '#fff' : '#12263F', fontSize: 16 }}>{m.body}</Text>}
          {m.kind === 'image' && <Image source={{ uri: fileUrl(m.media_url) }} style={{ width: 220, height: 220, borderRadius: 14 }} />}
          {m.kind === 'voice' && <TouchableOpacity onPress={() => play(m)} style={{ flexDirection: 'row', alignItems: 'center', width: 170 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: m.mine ? 'rgba(255,255,255,0.25)' : '#DCE6F2', alignItems: 'center', justifyContent: 'center' }}><Icon name={playing === m.id ? 'pause' : 'play'} size={18} color={m.mine ? '#fff' : C.blue} /></View>
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: m.mine ? 'rgba(255,255,255,0.45)' : '#C3D0E0', marginLeft: 10 }} /><Text style={{ color: m.mine ? '#E6F1FF' : '#5B6B7F', fontSize: 12, marginLeft: 8 }}>{tr('Vocal')}</Text></TouchableOpacity>}</View>
        <View style={{ flexDirection: 'row', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginTop: 2 }}>
          <Text style={{ fontSize: 11, color: '#8A99AB' }}>{hm(m.created_at)}</Text>{m.mine && m.read_at ? <Text style={{ fontSize: 11, color: C.green, fontWeight: '700', marginLeft: 6 }}>{tr('lu')}</Text> : null}</View></View>))}</ScrollView>
    {rec ? (<View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderColor: '#EEF2F7' }}>
      <TouchableOpacity onPress={cancelRec} style={{ padding: 8 }}><Icon name="x" size={24} color="#B3261E" /></TouchableOpacity>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#E0245E', marginLeft: 6 }} /><Text style={{ flex: 1, marginLeft: 10, color: '#12263F' }}>{tr('Enregistrement en cours...')}</Text>
      <TouchableOpacity onPress={sendRec} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' }}><Icon name="send" size={20} color="#fff" /></TouchableOpacity></View>)
    : (<View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, borderColor: '#EEF2F7' }}>
      <TouchableOpacity onPress={photo} style={{ padding: 8 }}><Icon name="image" size={26} color="#5B6B7F" /></TouchableOpacity>
      <TextInput value={txt} onChangeText={setTxt} multiline placeholder={tr('Votre message')} placeholderTextColor="#8A99AB" style={{ flex: 1, maxHeight: 110, backgroundColor: '#F1F4F8', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9, fontSize: 16, color: '#12263F', marginHorizontal: 6 }} />
      {txt.trim() ? <TouchableOpacity onPress={sendText} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' }}><Icon name="send" size={20} color="#fff" /></TouchableOpacity>
        : <TouchableOpacity onPress={startRec} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}><Icon name="mic" size={22} color="#fff" /></TouchableOpacity>}</View>)}</KeyboardAvoidingView>);
}
