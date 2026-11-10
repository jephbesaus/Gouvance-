import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; import * as FileSystem from 'expo-file-system'; import * as Sharing from 'expo-sharing';
import { api, uploadBase64, fileUrl } from './api'; import { Field, Btn, Card, H, Chips, C, run, tr } from './ui';

export default function Feed({ user, back, onChat }) {
  const [items, setItems] = useState([]); const [q, setQ] = useState(''); const [tab, setTab] = useState('all'); const [compose, setCompose] = useState(false);
  const load = async (more) => { const p = new URLSearchParams(); if (q) p.set('q', q); if (tab === 'market') p.set('kind', 'market'); if (more && items.length) p.set('before', items[items.length - 1].id);
    const r = await api('/feed?' + p); setItems(more ? [...items, ...r] : r); };
  useEffect(() => { run(() => load(false))(); }, [tab]);
  if (compose) return <Compose back={() => { setCompose(false); run(() => load(false))(); }} />;
  return (<>
    <Text style={{ fontSize: 26, fontWeight: '800', textAlign: 'center' }}><Text style={{ color: C.green }}>Gou</Text><Text style={{ color: C.blue }}>vance</Text></Text>
    <Field placeholder="Rechercher une publication ou un nom" value={q} onChangeText={setQ} onSubmitEditing={run(() => load(false))} />
    <Chips value={tab} onPick={setTab} items={[['all', 'Actualités'], ['market', 'Marketplace']]} />
    <Btn t="Publier" onPress={() => setCompose(true)} />
    {items.map(p => <Post key={p.id} p={p} me={user} onChat={onChat} onChange={() => run(() => load(false))()} />)}
    {items.length >= 20 && <Btn alt t="Voir plus" onPress={run(() => load(true))} />}
    <Btn alt t="Retour" onPress={back} /></>);
}

function Post({ p, me, onChange, onChat }) {
  const [prof, setProf] = useState(false);
  const [liked, setLiked] = useState(p.liked); const [n, setN] = useState(p.likes); const [open, setOpen] = useState(false); const [cm, setCm] = useState([]); const [txt, setTxt] = useState('');
  const isAdmin = me.roles.some(r => r.role === 'admin');
  const loadC = async () => setCm(await api('/posts/' + p.id + '/comments'));
  return (<Card>
    <TouchableOpacity onPress={() => setProf(!prof)}><Text style={{ fontWeight: '700' }}>{p.full_name}{p.certified ? '  (compte certifié)' : ''}</Text></TouchableOpacity>
    {prof && <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, marginVertical: 6, borderWidth: 1, borderColor: C.line }}>
      {p.photo_url && <Image source={{ uri: fileUrl(p.photo_url) }} style={{ width: 70, height: 70, borderRadius: 35, marginBottom: 6 }} />}<Text>{p.bio || ' '}</Text>
      <Btn alt t="Écrire" onPress={() => onChat && onChat(p.gouvance_id)} /><Btn alt t="Suivre / ne plus suivre" onPress={run(async () => { const r = await api('/me/follow', 'POST', { gouvance_id: p.gouvance_id }); Alert.alert('Gouvance', r.following ? 'Vous suivez cette personne' : 'Vous ne suivez plus cette personne'); })} /></View>}
    {p.kind === 'market' && <Text style={{ color: C.green, fontWeight: '700' }}>Marketplace - {p.price} FC</Text>}
    {p.image_url && <Image source={{ uri: fileUrl(p.image_url) }} style={{ width: '100%', height: 240, borderRadius: 10, marginVertical: 8 }} resizeMode="cover" />}
    {p.body && <Text style={{ color: C.ink }}>{p.body}</Text>}
    <View style={{ flexDirection: 'row', marginTop: 10 }}>
      <TouchableOpacity onPress={run(async () => { const r = await api('/posts/' + p.id + '/like', 'POST'); setLiked(r.liked); setN(n + (r.liked ? 1 : -1)); })}><Text style={{ color: liked ? C.blue : '#5B6B7F', marginRight: 22 }}>{tr("J'aime")} ({n})</Text></TouchableOpacity>
      <TouchableOpacity onPress={run(async () => { setOpen(!open); if (!open) await loadC(); })}><Text style={{ color: '#5B6B7F', marginRight: 22 }}>{tr('Commenter')} ({p.comments})</Text></TouchableOpacity>
      {p.image_url && <TouchableOpacity onPress={run(async () => { const f = await FileSystem.downloadAsync(fileUrl(p.image_url), FileSystem.cacheDirectory + 'gv' + p.id + '.jpg'); await Sharing.shareAsync(f.uri); })}><Text style={{ color: '#5B6B7F', marginRight: 22 }}>{tr('Télécharger')}</Text></TouchableOpacity>}
      {(isAdmin || p.author_id === me.user.id) && <TouchableOpacity onPress={run(async () => { await api('/posts/' + p.id, 'DELETE'); onChange(); })}><Text style={{ color: '#B3261E' }}>{tr('Supprimer')}</Text></TouchableOpacity>}
    </View>
    {open && <>{cm.map(c => <Text key={c.id} style={{ marginTop: 6 }}><Text style={{ fontWeight: '700' }}>{c.full_name} </Text>{c.body}</Text>)}
      <Field placeholder="Votre commentaire" value={txt} onChangeText={setTxt} />
      <Btn alt t="Envoyer" onPress={run(async () => { await api('/posts/' + p.id + '/comments', 'POST', { body: txt }); setTxt(''); await loadC(); })} /></>}
  </Card>);
}

function Compose({ back }) {
  const [d, setD] = useState({ kind: 'post' }); const [img, setImg] = useState(null);
  const pick = run(async () => { const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!r.canceled) setImg(r.assets[0]); });
  return (<><H>Nouvelle publication</H>
    <Chips value={d.kind} onPick={k => setD({ ...d, kind: k })} items={[['post', 'Actualité'], ['market', 'Article à vendre']]} />
    <Field placeholder="Texte" multiline onChangeText={x => setD({ ...d, body: x })} />
    {d.kind === 'market' && <Field placeholder="Prix (FC)" keyboardType="number-pad" onChangeText={x => setD({ ...d, price: parseInt(x, 10) })} />}
    <Btn alt t={img ? 'Photo choisie - changer' : 'Ajouter une photo'} onPress={pick} />
    {img && <Image source={{ uri: img.uri }} style={{ width: '100%', height: 200, borderRadius: 10 }} />}
    <Btn t="Publier" onPress={run(async () => { const image_url = img ? await uploadBase64(img.base64) : null; await api('/posts', 'POST', { ...d, image_url }); back(); })} />
    <Btn alt t="Annuler" onPress={back} /></>);
}
