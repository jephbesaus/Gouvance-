import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import * as Contacts from 'expo-contacts'; import { Audio } from 'expo-av'; import * as FileSystem from 'expo-file-system'; import * as ImagePicker from 'expo-image-picker';
import { api, uploadBase64, fileUrl, wsUrl } from './api'; import { Field, Btn, Card, H, C, run, tr } from './ui';

const ago = d => { if (!d) return 'hors ligne'; const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 1 ? 'vu à l\'instant' : m < 60 ? 'en ligne il y a ' + m + ' min' : 'en ligne il y a ' + Math.round(m / 60) + ' h'; };

export default function Chat({ back, start }) {
  const [peer, setPeer] = useState(start || null); const [convs, setConvs] = useState([]); const [q, setQ] = useState(''); const [found, setFound] = useState(null);
  const handlers = useRef([]); const ws = useRef(null);
  const loadConvs = async () => setConvs(await api('/chat/conversations'));
  useEffect(() => { run(loadConvs)();
    ws.current = new WebSocket(wsUrl()); ws.current.onmessage = e => { const d = JSON.parse(e.data); handlers.current.forEach(h => h(d)); loadConvs().catch(() => {}); };
    return () => ws.current && ws.current.close(); }, []);
  if (peer) return <Thread gid={peer} on={handlers} back={() => { setPeer(null); run(loadConvs)(); }} />;
  return (<><H>Messages</H>
    <Field placeholder="ID Gouvance ou numéro de téléphone" value={q} onChangeText={setQ} />
    <Btn alt t="Chercher" onPress={run(async () => { const r = await api('/chat/find', 'POST', /^GV/i.test(q) ? { gouvance_id: q.toUpperCase() } : { phone: q }); setFound(r); })} />
    <Btn alt t="Retrouver mes contacts" onPress={run(async () => { const p = await Contacts.requestPermissionsAsync(); if (!p.granted) throw new Error('Autorisez les contacts'); const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const phones = []; data.forEach(c => (c.phoneNumbers || []).forEach(n => phones.push(n.number))); const r = await api('/chat/match', 'POST', { phones }); setFound(r.length ? r : { message: "Aucun de vos contacts n'est encore sur Gouvance" }); })} />
    {found && (found.message ? <Text>{found.message}</Text> : found.map(u => <Card key={u.gouvance_id}><Text style={{ fontWeight: '700' }}>{u.full_name}</Text><Text>{u.bio || u.gouvance_id}</Text><Btn t="Écrire" onPress={() => setPeer(u.gouvance_id)} /><Btn alt t="Suivre / ne plus suivre" onPress={run(async () => { const r = await api('/me/follow', 'POST', { gouvance_id: u.gouvance_id }); Alert.alert('Gouvance', r.following ? 'Vous suivez cette personne' : 'Vous ne suivez plus cette personne'); })} /></Card>))}
    {convs.map(c => <TouchableOpacity key={c.gouvance_id} onPress={() => setPeer(c.gouvance_id)}><Card><Text style={{ fontWeight: '700' }}>{c.full_name}{c.unread ? '  (' + c.unread + ')' : ''}</Text>
      <Text numberOfLines={1}>{c.kind === 'text' ? c.body : c.kind === 'image' ? tr('Photo') : tr('Message vocal')}</Text></Card></TouchableOpacity>)}
    <Btn alt t="Retour" onPress={back} /></>);
}

function Thread({ gid, on, back }) {
  const [d, setD] = useState(null); const [msgs, setMsgs] = useState([]); const [txt, setTxt] = useState(''); const [rec, setRec] = useState(null);
  const load = async () => { const r = await api('/chat/with/' + gid); setD(r.peer); setMsgs(r.messages); await api('/chat/read', 'POST', { from: gid }); };
  useEffect(() => { run(load)(); const h = e => { if (e.t === 'msg' && e.from === gid) { setMsgs(m => [...m, e.m]); api('/chat/read', 'POST', { from: gid }).catch(() => {}); }
    if (e.t === 'read' && e.by === gid) setMsgs(m => m.map(x => x.mine && !x.read_at ? { ...x, read_at: new Date().toISOString() } : x)); };
    on.current.push(h); return () => { on.current = on.current.filter(x => x !== h); }; }, []);
  const send = body => api('/chat/send', 'POST', { to: gid, ...body }).then(m => setMsgs(x => [...x, m]));
  const photo = run(async () => { const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) await send({ kind: 'image', media_url: await uploadBase64(r.assets[0].base64) }); });
  const toggleRec = run(async () => {
    if (!rec) { await Audio.requestPermissionsAsync(); await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true }); const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); setRec(recording); return; }
    await rec.stopAndUnloadAsync(); const uri = rec.getURI(); setRec(null);
    await send({ kind: 'voice', media_url: await uploadBase64(await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })) }); });
  const play = run(async m => { const { sound } = await Audio.Sound.createAsync({ uri: fileUrl(m.media_url) }); await sound.playAsync(); });
  return (<>
    <H>{d ? d.full_name : '...'}</H>
    {d && <Text style={{ color: d.online ? C.green : '#5B6B7F', marginBottom: 6 }}>{d.online ? tr('en ligne') : ago(d.last_seen)}{d.bio ? ' - ' + d.bio : ''}</Text>}
    {msgs.map(m => <View key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', backgroundColor: m.mine ? '#DCEBFB' : '#F1F4F8', borderRadius: 12, padding: 10, marginVertical: 4, maxWidth: '82%' }}>
      {m.kind === 'text' && <Text>{m.body}</Text>}
      {m.kind === 'image' && <Image source={{ uri: fileUrl(m.media_url) }} style={{ width: 200, height: 200, borderRadius: 8 }} />}
      {m.kind === 'voice' && <TouchableOpacity onPress={() => play(m)}><Text style={{ color: C.blue }}>{tr('Écouter le message vocal')}</Text></TouchableOpacity>}
      {m.mine && m.read_at && <Text style={{ color: C.green, fontSize: 12, textAlign: 'right' }}>{tr('lu')}</Text>}</View>)}
    <Field placeholder="Votre message" value={txt} onChangeText={setTxt} />
    <Btn t="Envoyer" onPress={run(async () => { if (!txt.trim()) return; const b = txt; setTxt(''); await send({ kind: 'text', body: b }); })} />
    <Btn alt t="Envoyer une photo" onPress={photo} /><Btn alt t={rec ? 'Arrêter et envoyer le vocal' : 'Enregistrer un vocal'} onPress={toggleRec} />
    <Btn alt t="Retour" onPress={back} /></>);
}
