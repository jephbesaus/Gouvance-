import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, Modal, Share } from 'react-native'; import { rtSubscribe } from './rt';
import * as ImagePicker from 'expo-image-picker'; import * as FileSystem from 'expo-file-system'; import * as Sharing from 'expo-sharing';
import { Video, ResizeMode } from 'expo-av';
import { api, uploadBase64, uploadVideo, fileUrl } from './api';
import { Field, Btn, H, Chips, C, run, tr } from './ui'; import { Icon, Badge } from './icons';

const fmt = n => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n || 0));
const ago = d => { const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 1) return "à l'instant"; if (m < 60) return 'il y a ' + m + ' min'; const h = Math.floor(m / 60); return h < 24 ? 'il y a ' + h + ' h' : 'il y a ' + Math.floor(h / 24) + ' j'; };

export function Avatar({ uri, name, size = 42 }) {
  if (uri) return <Image source={{ uri: fileUrl(uri) }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#DCE6F2' }} />;
  return (<View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#DCE6F2', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.blue, fontWeight: '800', fontSize: size / 2.6 }}>{String(name || '?').slice(0, 2).toUpperCase()}</Text></View>);
}
function Media({ uri }) {
  if (/\.mp4$/i.test(uri)) return <Video source={{ uri }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14, marginTop: 10, backgroundColor: '#000' }} useNativeControls resizeMode={ResizeMode.CONTAIN} />;
  return <FullImage uri={uri} />;
}
export function ImageViewer({ uri, onClose }) { return <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}><TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>{uri ? <Image source={{ uri }} style={{ width: '100%', height: '85%' }} resizeMode="contain" /> : null}</TouchableOpacity></Modal>; }
function FullImage({ uri }) {
  const [big, setBig] = useState(false); const [ratio, setRatio] = useState(4 / 3);
  return <><TouchableOpacity activeOpacity={0.9} onPress={() => setBig(true)}><Image source={{ uri }} style={{ width: '100%', aspectRatio: ratio, borderRadius: 14, marginTop: 10, backgroundColor: '#EEF2F7' }} resizeMode="cover" onLoad={e => { const z = e && e.nativeEvent && e.nativeEvent.source; if (z && z.width && z.height) setRatio(Math.min(Math.max(z.width / z.height, 0.75), 1.9)); }} /></TouchableOpacity><ImageViewer uri={big ? uri : null} onClose={() => setBig(false)} /></>;
}

export default function Feed({ user, onChat }) {
  const [items, setItems] = useState([]); const [q, setQ] = useState(''); const [tab, setTab] = useState('all'); const [loaded, setLoaded] = useState(false);
  const load = async more => {
    const p = new URLSearchParams(); if (q) p.set('q', q); if (tab === 'market') p.set('kind', 'market'); if (tab === 'reels') p.set('media', 'video'); if (more && items.length) p.set('before', items[items.length - 1].id);
    const r = await api('/feed?' + p); setItems(more ? [...items, ...r] : r); setLoaded(true);
  };
  useEffect(() => { run(() => load(false))(); }, [tab]);
  useEffect(() => rtSubscribe(e => { if (e.t === 'feed') load(false).catch(() => {}); }), [tab]);
  return (<View style={{ paddingHorizontal: 16 }}>
    <Field placeholder="Rechercher une publication ou un nom" value={q} onChangeText={setQ} onSubmitEditing={run(() => load(false))} returnKeyType="search" />
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E6ECF3', marginBottom: 4 }}>{[['all', 'Actualités'], ['reels', 'Réels'], ['market', 'Marketplace']].map(([k, l]) => <TouchableOpacity key={k} onPress={() => setTab(k)} style={{ marginRight: 22, paddingVertical: 10, borderBottomWidth: 3, borderColor: tab === k ? '#0B5FC4' : 'transparent' }}><Text style={{ fontWeight: tab === k ? '800' : '500', color: tab === k ? '#12263F' : '#8A99AB', fontSize: 15 }}>{tr(l)}</Text></TouchableOpacity>)}</View>
    {loaded && !items.length && <Text style={{ color: '#5B6B7F', marginTop: 16 }}>{tr('Aucune publication pour le moment.')}</Text>}
    {items.map(p => <Post key={p.id} p={p} me={user} onChat={onChat} onChange={() => run(() => load(false))()} />)}
    {items.length >= 20 && <Btn alt t="Voir plus" onPress={run(() => load(true))} />}</View>);
}

function Post({ p, me, onChange, onChat }) {
  const [liked, setLiked] = useState(p.liked); const [n, setN] = useState(p.likes); const [open, setOpen] = useState(false); const [cm, setCm] = useState([]); const [txt, setTxt] = useState(''); const [prof, setProf] = useState(false);
  const isAdmin = me.roles.some(r => r.role === 'admin');
  const loadC = async () => setCm(await api('/posts/' + p.id + '/comments'));
  return (<View style={{ borderBottomWidth: 1, borderColor: '#E6ECF3', paddingVertical: 14 }}>
    <TouchableOpacity onPress={() => setProf(!prof)} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Avatar uri={p.photo_url} name={p.full_name} />
      <View style={{ marginLeft: 10, flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontWeight: '700', fontSize: 16, color: '#12263F' }}>{p.full_name}</Text><Badge kind={p.badge} size={17} /></View>
        <Text style={{ color: '#8A99AB', fontSize: 12 }}>{ago(p.created_at)}</Text></View></TouchableOpacity>
    {prof && !p.is_family && <View style={{ backgroundColor: '#F6F8FB', borderRadius: 14, padding: 12, marginTop: 8 }}>
      <Text style={{ color: '#42526B' }}>{p.bio || p.gouvance_id}</Text>
      <Btn alt t="Écrire" onPress={() => onChat && onChat(p.gouvance_id)} />
      <Btn alt t="Suivre / ne plus suivre" onPress={run(async () => { const r = await api('/me/follow', 'POST', { gouvance_id: p.gouvance_id }); Alert.alert('Gouvance', r.following ? 'Vous suivez cette personne.' : 'Vous ne suivez plus cette personne.'); })} /></View>}
    {p.kind === 'market' && <Text style={{ color: C.green, fontWeight: '800', marginTop: 10 }}>Marketplace - {p.price} FC</Text>}
    {p.body ? <Text style={{ color: '#12263F', fontSize: 16, lineHeight: 23, marginTop: 10 }}>{p.body}</Text> : null}
    {p.image_url ? <Media uri={fileUrl(p.image_url)} /> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
      <TouchableOpacity onPress={run(async () => { const r = await api('/posts/' + p.id + '/like', 'POST'); setLiked(r.liked); setN(n + (r.liked ? 1 : -1)); })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 22 }}>
        <Icon name="heart" size={22} color={liked ? '#E0245E' : '#5B6B7F'} fill={liked ? '#E0245E' : 'none'} /><Text style={{ marginLeft: 6, color: '#5B6B7F' }}>{fmt(n)}</Text></TouchableOpacity>
      <TouchableOpacity onPress={run(async () => { setOpen(!open); if (!open) await loadC(); })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 22 }}>
        <Icon name="chat" size={22} color="#5B6B7F" /><Text style={{ marginLeft: 6, color: '#5B6B7F' }}>{fmt(p.comments)}</Text></TouchableOpacity>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 22 }}><Icon name="eye" size={22} color="#5B6B7F" /><Text style={{ marginLeft: 6, color: '#5B6B7F' }}>{fmt(p.views)}</Text></View>
      <TouchableOpacity onPress={() => Share.share({ message: (p.body || '') + (p.image_url ? '\n' + fileUrl(p.image_url) : '') })} style={{ marginRight: 22 }}><Icon name="send" size={22} color="#5B6B7F" /></TouchableOpacity>
      {p.image_url && !/\.mp4$/i.test(p.image_url) ? <TouchableOpacity onPress={run(async () => { const f = await FileSystem.downloadAsync(fileUrl(p.image_url), FileSystem.cacheDirectory + 'gv' + p.id + '.jpg'); await Sharing.shareAsync(f.uri); })} style={{ marginRight: 22 }}><Icon name="download" size={22} color="#5B6B7F" /></TouchableOpacity> : null}
      {(isAdmin || p.author_id === me.user.id) && <TouchableOpacity onPress={run(async () => { await api('/posts/' + p.id, 'DELETE'); onChange(); })}><Text style={{ color: '#B3261E' }}>{tr('Supprimer')}</Text></TouchableOpacity>}</View>
    {open && <View style={{ marginTop: 8 }}>{cm.map(c => <Text key={c.id} style={{ marginTop: 6, color: '#12263F' }}><Text style={{ fontWeight: '700' }}>{c.full_name} </Text>{c.body}</Text>)}
      <Field placeholder="Votre commentaire" value={txt} onChangeText={setTxt} />
      <Btn alt t="Envoyer" onPress={run(async () => { await api('/posts/' + p.id + '/comments', 'POST', { body: txt }); setTxt(''); await loadC(); })} /></View>}</View>);
}

export function Compose({ mode, done }) {
  const [d, setD] = useState({ kind: mode === 'market' ? 'market' : 'post' }); const [img, setImg] = useState(null); const [vid, setVid] = useState(null);
  const pick = run(async () => { const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) setImg(r.assets[0]); });
  const pickVid = run(async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 30, quality: 0.5 }); if (r.canceled) return;
    const a = r.assets[0]; if (a.fileSize && a.fileSize > 30 * 1024 * 1024) throw new Error('Vidéo trop lourde (30 Mo et 30 secondes maximum)'); setVid(a);
  });
  useEffect(() => { if (mode === 'photo' || mode === 'market') pick(); if (mode === 'video') pickVid(); }, []);
  return (<><H>Nouvelle publication</H>
    <Chips value={d.kind} onPick={k => setD({ ...d, kind: k })} items={[['post', 'Actualité'], ['market', 'Article à vendre']]} />
    <Field placeholder="Écrivez votre texte" multiline onChangeText={x => setD({ ...d, body: x })} />
    {d.kind === 'market' && <Field placeholder="Prix (FC)" keyboardType="number-pad" onChangeText={x => setD({ ...d, price: parseInt(x, 10) })} />}
    <Btn alt t={img ? 'Photo choisie - changer' : 'Ajouter une photo'} onPress={pick} />
    <Btn alt t={vid ? 'Vidéo choisie - changer' : 'Ajouter une vidéo (30 s maximum)'} onPress={pickVid} />
    {vid && <Text style={{ color: '#5B6B7F', marginTop: 6 }}>Vidéo prête à être publiée.</Text>}
    {img && <Image source={{ uri: img.uri }} style={{ width: '100%', height: 220, borderRadius: 14, marginTop: 8 }} />}
    <Btn t="Publier" onPress={run(async () => { const image_url = vid ? await uploadVideo(vid.uri) : img ? await uploadBase64(img.base64) : null; await api('/posts', 'POST', { ...d, image_url }); done(); })} /></>);
}
