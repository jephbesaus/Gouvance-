import React, { useState, useEffect } from 'react';
import { Text, Alert, Image, View, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; import * as Clipboard from 'expo-clipboard';
import Scan from './Scan'; import { familyCardPdf } from './cards'; import { FamilyCard, SignaturePad } from './CardViews'; import { LinearGradient } from 'expo-linear-gradient';
import { api, uploadBase64, fileUrl } from './api'; import { useBack } from './back'; import { Avatar } from './Feed'; import { Icon } from './icons';
import { Field, Btn, Card, Paper, H, Chips, C, run, tr } from './ui';

const KIND = { father: 'Père', mother: 'Mère', child: 'Enfant' };

export default function Census({ user, back, onMap }) {
  const [v, setV] = useState('menu'); const [tab, setTab] = useState('rec'); const [tabs, setTabs] = useState([]);
  const isRec = user.roles.some(r => r.role === 'recenseur'); const isStaff = user.roles.length > 0;
  useBack(v !== 'menu' ? () => setV('menu') : null);
  useEffect(() => { api('/census/tabs').then(setTabs).catch(() => {}); }, []);
  if (v === 'family') return <Family user={user} />;
  if (v === 'form') return <Form onDone={() => setV('menu')} />;
  if (v === 'search') return <Search />;
  if (v === 'scan') return <Scan back={() => setV('menu')} />;
  const custom = tabs.find(t => 't' + t.id === tab);
  return (<View><H>Recensement</H>
    <Chips value={tab} onPick={setTab} items={[['rec', 'Recensement'], ['sal', 'Salongo'], ...tabs.map(t => ['t' + t.id, t.title])]} />
    {tab === 'rec' && <>
      <Btn t="Espace famille (ID famille + PIN)" onPress={() => setV('family')} />
      {onMap && <Btn alt t="Carte de Bukavu" onPress={onMap} />}
      {isRec && <Btn alt t="Recenser une famille" onPress={() => setV('form')} />}
      {isStaff && <Btn alt t="Scanner une carte (QR)" onPress={() => setV('scan')} />}
      {isStaff && <Btn alt t="Rechercher une famille" onPress={() => setV('search')} />}</>}
    {tab === 'sal' && <SalongoInfo onFamily={() => setV('family')} />}
    {custom && <Paper><Text style={{ fontSize: 18, fontWeight: '800', color: '#12263F', marginBottom: 8 }}>{custom.title}</Text><Text style={{ lineHeight: 23, color: '#12263F' }}>{custom.body}</Text></Paper>}</View>);
}

function SalongoInfo({ onFamily }) {
  const [s, setS] = useState([]);
  useEffect(() => { api('/salongo/sessions').then(setS).catch(() => {}); }, []);
  return (<View><Text style={{ color: '#42526B', lineHeight: 22, marginBottom: 8 }}>{tr("Le Salongo est le travail de salubrité du samedi. Chaque famille confirme sa participation depuis son espace famille. Les familles absentes reçoivent une amende.")}</Text>
    {!s.length && <Text style={{ color: '#5B6B7F' }}>{tr('Aucune session pour le moment.')}</Text>}
    {s.map(x => <Card key={x.id}><Text style={{ fontWeight: '700' }}>{new Date(x.day).toLocaleDateString('fr-FR')}</Text><Text>{tr('Amende')} : {x.fine} FC - {x.closed ? tr('Terminé') : tr('Ouvert')}</Text></Card>)}
    <Btn t="Confirmer pour ma famille" onPress={onFamily} /></View>);
}

function Form({ onDone }) {
  const [d, setD] = useState({}); const [ph, setPh] = useState({}); const [kids, setKids] = useState([{ name: '' }]); const [sig, setSig] = useState(''); const [res, setRes] = useState(null);
  const set = k => x => setD(o => ({ ...o, [k]: x }));
  const shot = async k => { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) throw new Error('Autorisez la caméra'); const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 }); if (!r.canceled) setPh(o => ({ ...o, [k]: r.assets[0] })); };
  const pic = k => (<View key={'p' + k}><Btn alt t={ph[k] ? 'Photo prise - refaire' : 'Prendre la photo'} onPress={run(() => shot(k))} />{ph[k] && <Image source={{ uri: ph[k].uri }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }} />}</View>);
  const up = async (k, who) => { if (!ph[k]) throw new Error('Photo manquante : ' + who); return uploadBase64(ph[k].base64); };
  if (res) return (<View><H>Famille enregistrée</H><Paper>
    {[['ID famille', res.code], ['PIN famille', res.pin]].map(([l, v]) => (<View key={l} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}><View style={{ flex: 1 }}><Text style={{ color: '#5B6B7F', fontSize: 12 }}>{tr(l)}</Text><Text style={{ fontSize: 24, fontWeight: '800', color: '#12263F' }}>{v}</Text></View>
      <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(String(v)); Alert.alert('Gouvance', tr(l) + ' ' + tr('copié')); }} style={{ backgroundColor: '#EAF2FC', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 }}><Text style={{ color: C.blue, fontWeight: '700' }}>{tr('Copier')}</Text></TouchableOpacity></View>))}</Paper>
    <Text style={{ color: '#5B6B7F', marginVertical: 8 }}>{tr("Remettez ces deux codes au responsable de la famille : il les utilisera dans l'espace famille.")}</Text><Btn t="Terminer" onPress={onDone} /></View>);
  return (<View><H>Nouvelle famille</H>
    {[['family_name', 'Nom de la famille'], ['commune', 'Commune'], ['avenue', 'Avenue'], ['quartier', 'Quartier'], ['phone', 'Téléphone de contact']].map(([k, p]) => <Field key={k} placeholder={p} onChangeText={set(k)} />)}
    <Field placeholder="Nom du père" onChangeText={set('father')} />{pic('father')}
    <Field placeholder="Nom de la mère" onChangeText={set('mother')} />{pic('mother')}
    {kids.map((k, i) => (<View key={i}><Field placeholder={"Nom de l'enfant " + (i + 1)} onChangeText={x => setKids(ks => ks.map((o, j) => (j === i ? { name: x } : o)))} />{pic('c' + i)}</View>))}
    <Btn alt t="Ajouter un enfant" onPress={() => setKids([...kids, { name: '' }])} />
    <Text style={{ fontWeight: '700', color: '#12263F', marginVertical: 8 }}>{tr('Signature du recenseur (avec le doigt)')}</Text><SignaturePad onChange={setSig} />
    <Btn t="Valider" onPress={run(async () => {
      if (!sig) throw new Error('Signez avec le doigt dans le cadre');
      const members = [];
      if (d.father) members.push({ kind: 'father', full_name: d.father, gender: 'M', photo_url: await up('father', 'père') });
      if (d.mother) members.push({ kind: 'mother', full_name: d.mother, gender: 'F', photo_url: await up('mother', 'mère') });
      for (let i = 0; i < kids.length; i++) if (kids[i].name.trim()) members.push({ kind: 'child', full_name: kids[i].name.trim(), photo_url: await up('c' + i, kids[i].name) });
      setRes(await api('/census/families', 'POST', { ...d, members, signature: sig })); })} /></View>);
}

function Search() {
  const [q, setQ] = useState({}); const [res, setRes] = useState(null); const [det, setDet] = useState(null);
  return (<View><H>Rechercher</H><Field placeholder="ID famille (G000000000)" onChangeText={x => setQ(o => ({ ...o, code: x }))} /><Field placeholder="ou téléphone du responsable" onChangeText={x => setQ(o => ({ ...o, phone: x }))} />
    <Btn t="Rechercher" onPress={run(async () => setRes(await api('/census/search?' + new URLSearchParams(q))))} />
    {res && (res.message ? <Text style={{ marginTop: 10 }}>{tr(res.message)}</Text> : res.map(f => (<Card key={f.code}><Text style={{ fontWeight: '700' }}>{f.code} - {f.family_name}</Text><Text>{f.avenue} / {f.quartier}</Text><Text>{f.paid ? tr('Actif') : tr('Non vérifiée')}</Text>
      <Btn alt t="Détails" onPress={run(async () => setDet(await api('/census/families/' + f.code)))} /></Card>)))}
    {det && <Card><Text style={{ fontWeight: '700' }}>{det.code} - {det.family_name}</Text><Text>{det.commune} / {det.avenue} / {det.quartier}</Text>
      {det.members.map(m => <View key={m.id} style={{ marginTop: 8 }}><Text>{tr(KIND[m.kind] || m.kind)} : {m.full_name}{m.deceased ? ' (décédé)' : ''}</Text>
        {!m.deceased && <Btn alt t="Déclarer un décès" onPress={() => Alert.alert('Confirmer', 'Déclarer le décès de ' + m.full_name + ' ?', [{ text: 'Annuler' }, { text: 'Confirmer', onPress: run(async () => { await api('/census/members/' + m.id + '/deceased', 'POST'); setDet(await api('/census/families/' + det.code)); }) }])} />}</View>)}</Card>}</View>);
}

function Family({ user }) {
  const [d, setD] = useState({}); const [fam, setFam] = useState(null); const [sessions, setSessions] = useState([]); const [fines, setFines] = useState([]); const [notes, setNotes] = useState([]); const [tok, setTok] = useState(null);
  const [others, setOthers] = useState([]); const [post, setPost] = useState({}); const [pimg, setPimg] = useState(null);
  const load = async f => { const b = { family_token: f.token }; setFines(await api('/salongo/family/fines', 'POST', b)); setNotes(await api('/salongo/family/notifications', 'POST', b)); setSessions((await api('/salongo/sessions')).filter(s => !s.closed)); setOthers(await api('/census/public-families')); };
  if (!fam) return (<View><H>Espace famille</H><Text style={{ color: '#5B6B7F', marginBottom: 10 }}>{tr("Saisissez l'ID et le PIN remis par le recenseur.")}</Text>
    <Field placeholder="ID famille" autoCapitalize="characters" onChangeText={x => setD(o => ({ ...o, code: x.trim().toUpperCase() }))} /><Field placeholder="PIN famille" secureTextEntry keyboardType="number-pad" onChangeText={x => setD(o => ({ ...o, pin: x }))} />
    <Btn t="Entrer" onPress={run(async () => { const f = await api('/census/family-login', 'POST', { code: d.code, pin: d.pin }); setFam(f); await load(f); })} /></View>);
  return (<View>
    <View style={{ flexDirection: 'row', backgroundColor: '#E8F2FF', borderRadius: 18, padding: 14, marginBottom: 12 }}>
      <LinearGradient colors={['#0B5FC4', '#2E9E3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={23} color="#fff" /></LinearGradient>
      <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontSize: 13, fontWeight: '800' }}><Text style={{ color: '#2E9E3F' }}>Gou</Text><Text style={{ color: '#0B5FC4' }}>vance</Text></Text>
        <Text style={{ fontWeight: '700', color: '#12263F' }}>{tr('Bienvenue la famille')} {fam.family_name}</Text><Text style={{ color: '#42526B' }}>{tr("Vous êtes dans l'espace famille.")}</Text></View></View>
    <FamilyCard f={fam} />
    {!fam.paid && <><Field placeholder="PIN de votre portefeuille" secureTextEntry keyboardType="number-pad" onChangeText={x => setD(o => ({ ...o, w: x }))} />
      <Btn t={tr('Vérifier ma carte (payer)') + ' - ' + fam.fee + ' FC'} onPress={run(async () => { const r = await api('/census/pay', 'POST', { family_token: fam.token, wallet_pin: d.w }); Alert.alert('Gouvance', tr(r.message)); const f = await api('/census/family-login', 'POST', { code: d.code, pin: d.pin }); setFam(f); })} /></>}
    <Btn alt t="Télécharger ma carte en PDF" onPress={run(() => familyCardPdf(fam))} />
    <H>Membres de la famille</H>
    {fam.members.map((m, i) => (<View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F8FB', borderRadius: 16, padding: 10, marginBottom: 8 }}>
      <Avatar uri={m.photo_url} name={m.full_name} size={58} /><View style={{ marginLeft: 12 }}><Text style={{ fontWeight: '700', fontSize: 16, color: '#12263F' }}>{m.full_name}</Text><Text style={{ color: '#5B6B7F' }}>{tr(KIND[m.kind] || m.kind)}</Text></View></View>))}
    <H>Salongo</H>
    {sessions.map(s => <Btn key={s.id} alt t={"J'ai fait le Salongo du " + String(s.day).slice(0, 10)} onPress={run(async () => { const r = await api('/salongo/confirm', 'POST', { family_token: fam.token, session_id: s.id }); setTok(r.token); })} />)}
    {tok && <Card><Text>{tr('Jeton de la maison')} : {tok}</Text></Card>}
    {fines.filter(f => !f.paid).map(f => <Card key={f.id}><Text>{tr('Amende')} : {f.amount} FC</Text><Btn t="Payer l'amende" onPress={run(async () => { await api('/salongo/fines/' + f.id + '/pay', 'POST', { wallet_pin: d.w }); Alert.alert('Gouvance', tr('Amende payée')); await load(fam); })} /></Card>)}
    {notes.map(n => <Card key={n.id}><Text style={{ fontWeight: '700' }}>{n.title}</Text><Text>{n.body}</Text></Card>)}
    <H>Publier au nom de la famille</H>
    <Field placeholder="Écrivez votre texte" multiline onChangeText={x => setPost(o => ({ ...o, body: x }))} />
    <Btn alt t={pimg ? 'Photo choisie - changer' : 'Ajouter une photo'} onPress={run(async () => { const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) setPimg(r.assets[0]); })} />
    {pimg && <Image source={{ uri: pimg.uri }} style={{ width: '100%', height: 180, borderRadius: 14, marginTop: 6 }} />}
    <Btn t="Publier" onPress={run(async () => { const image_url = pimg ? await uploadBase64(pimg.base64) : null; await api('/census/family/post', 'POST', { family_token: fam.token, body: post.body, image_url }); setPimg(null); Alert.alert('Gouvance', tr('Publication envoyée.')); })} />
    <H>Autres familles recensées</H>
    {others.filter(o => o.code !== fam.code).map(o => (<View key={o.code} style={{ backgroundColor: '#F6F8FB', borderRadius: 16, padding: 12, marginBottom: 8 }}>
      <Text style={{ fontWeight: '700', color: '#12263F' }}>{tr('Famille')} {o.family_name} - {o.code}</Text><Text style={{ color: '#5B6B7F' }}>{[o.commune, o.avenue, o.quartier].filter(Boolean).join(' / ')} - {o.membres} {tr('membres')}</Text>
      <Text style={{ color: '#5B6B7F', marginTop: 2 }}>PIN : ••••••</Text></View>))}</View>);
}
