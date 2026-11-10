import React, { useState } from 'react';
import { Text, Alert, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; import Scan from './Scan'; import { familyCardPdf } from './cards';
import { api, uploadBase64, fileUrl } from './api'; import { Field, Btn, Card, Paper, H, run, tr } from './ui';

export default function Census({ user, back }) {
  const [v, setV] = useState('menu'); const isRec = user.roles.some(r => r.role === 'recenseur');
  if (v === 'family') return <Family back={() => setV('menu')} />;
  if (v === 'form') return <Form back={() => setV('menu')} />;
  if (v === 'scan') return <Scan back={() => setV('menu')} />;
  if (v === 'search') return <Search back={() => setV('menu')} />;
  return (<><H>Recensement</H>
    <Btn t="Espace famille (ID famille + PIN)" onPress={() => setV('family')} />
    {isRec && <Btn t="Recenser une famille" onPress={() => setV('form')} />}
    {isRec && <Btn alt t="Scanner une carte (QR)" onPress={() => setV('scan')} />}
    {isRec && <Btn alt t="Rechercher une famille" onPress={() => setV('search')} />}
    <Btn alt t="Retour" onPress={back} /></>);
}

function Form({ back }) {
  const [d, setD] = useState({}); const [ph, setPh] = useState({}); const [kids, setKids] = useState([{ name: '' }]); const set = k => x => setD(o => ({ ...o, [k]: x }));
  const shot = async k => { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) throw new Error('Autorisez la caméra'); const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 }); if (!r.canceled) setPh(o => ({ ...o, [k]: r.assets[0] })); };
  const pic = k => (<View key={'p' + k}><Btn alt t={ph[k] ? 'Photo prise - refaire' : 'Prendre la photo'} onPress={run(() => shot(k))} />{ph[k] && <Image source={{ uri: ph[k].uri }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }} />}</View>);
  const up = async (k, who) => { if (!ph[k]) throw new Error('Photo manquante : ' + who); return uploadBase64(ph[k].base64); };
  return (<><H>Nouvelle famille</H>
    {[['family_name', 'Nom de la famille'], ['commune', 'Commune'], ['avenue', 'Avenue'], ['quartier', 'Quartier'], ['phone', 'Téléphone de contact']].map(([k, p]) => <Field key={k} placeholder={p} onChangeText={set(k)} />)}
    <Field placeholder="Nom du père" onChangeText={set('father')} />{pic('father')}
    <Field placeholder="Nom de la mère" onChangeText={set('mother')} />{pic('mother')}
    {kids.map((k, i) => (<View key={i}><Field placeholder={'Nom de l\'enfant ' + (i + 1)} onChangeText={x => setKids(ks => ks.map((o, j) => j === i ? { name: x } : o))} />{pic('c' + i)}</View>))}
    <Btn alt t="Ajouter un enfant" onPress={() => setKids([...kids, { name: '' }])} />
    <Btn t="Valider" onPress={run(async () => {
      const members = [];
      if (d.father) members.push({ kind: 'father', full_name: d.father, gender: 'M', photo_url: await up('father', 'père') });
      if (d.mother) members.push({ kind: 'mother', full_name: d.mother, gender: 'F', photo_url: await up('mother', 'mère') });
      for (let i = 0; i < kids.length; i++) if (kids[i].name.trim()) members.push({ kind: 'child', full_name: kids[i].name.trim(), photo_url: await up('c' + i, kids[i].name) });
      const r = await api('/census/families', 'POST', { ...d, members });
      Alert.alert('Famille enregistrée', 'ID : ' + r.code + '\nPIN : ' + r.pin + '\nRemettez ces codes au responsable de la famille.'); back(); })} />
    <Btn alt t="Retour" onPress={back} /></>);
}

function Search({ back }) {
  const [q, setQ] = useState({}); const [res, setRes] = useState(null); const [det, setDet] = useState(null);
  return (<><H>Rechercher</H><Field placeholder="ID famille (G000000000)" onChangeText={x => setQ(o => ({ ...o, code: x }))} /><Field placeholder="ou téléphone du responsable" onChangeText={x => setQ(o => ({ ...o, phone: x }))} />
    <Btn t="Rechercher" onPress={run(async () => setRes(await api('/census/search?' + new URLSearchParams(q))))} />
    {res && (res.message ? <Text>{res.message}</Text> : res.map(f => <Card key={f.code}><Text style={{ fontWeight: '700' }}>{f.code} - {f.family_name}</Text><Text>{f.avenue} / {f.quartier}</Text><Text>{f.paid ? tr('Actif') : 'Non vérifiée'}</Text><Btn alt t="Détails" onPress={run(async () => setDet(await api('/census/families/' + f.code)))} /></Card>))}
    {det && <Card><Text style={{ fontWeight: '700' }}>{det.code} - {det.family_name}</Text><Text>{det.commune} / {det.avenue} / {det.quartier}</Text>
      {det.members.map(m => <View key={m.id} style={{ marginTop: 8 }}><Text>{m.kind} : {m.full_name}{m.deceased ? ' (décédé)' : ''}</Text>
        {!m.deceased && <Btn alt t="Déclarer un décès" onPress={() => Alert.alert('Confirmer', 'Déclarer le décès de ' + m.full_name + ' ?', [{ text: 'Annuler' }, { text: 'Confirmer', onPress: run(async () => { await api('/census/members/' + m.id + '/deceased', 'POST'); setDet(await api('/census/families/' + det.code)); }) }])} />}</View>)}</Card>}
    <Btn alt t="Retour" onPress={back} /></>);
}

function Family({ back }) {
  const [d, setD] = useState({}); const [fam, setFam] = useState(null); const [sessions, setSessions] = useState([]); const [fines, setFines] = useState([]); const [notes, setNotes] = useState([]); const [tok, setTok] = useState(null);
  const load = async f => { const b = { family_token: f.token }; setFines(await api('/salongo/family/fines', 'POST', b)); setNotes(await api('/salongo/family/notifications', 'POST', b)); setSessions((await api('/salongo/sessions')).filter(s => !s.closed)); };
  if (!fam) return (<><H>Espace famille</H><Field placeholder="ID famille" onChangeText={x => setD(o => ({ ...o, code: x }))} /><Field placeholder="PIN famille" secureTextEntry keyboardType="number-pad" onChangeText={x => setD(o => ({ ...o, pin: x }))} />
    <Btn t="Entrer" onPress={run(async () => { const f = await api('/census/family-login', 'POST', d); setFam(f); await load(f); })} /><Btn alt t="Retour" onPress={back} /></>);
  return (<><H>Famille {fam.family_name}</H>
    <Paper><Text style={{ fontWeight: '700' }}>Carte de recensement {fam.code}</Text>{fam.members.map((m, i) => <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>{m.photo_url && <Image source={{ uri: fileUrl(m.photo_url) }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />}<Text>{m.kind} : {m.full_name}</Text></View>)}<Text style={{ marginTop: 8 }}>{fam.paid ? 'Carte vérifiée (QR actif)' : 'Non vérifiée - montant à payer : ' + fam.fee + ' FC'}</Text></Paper>
    {!fam.paid && <><Field placeholder="PIN de votre portefeuille" secureTextEntry keyboardType="number-pad" onChangeText={x => setD(o => ({ ...o, w: x }))} />
      <Btn t="Vérifier ma carte (payer)" onPress={run(async () => { const r = await api('/census/pay', 'POST', { family_token: fam.token, wallet_pin: d.w }); Alert.alert('Gouvance', r.message); setFam({ ...fam, paid: true, paid_at: new Date().toISOString() }); })} /></>}
    <Btn alt t="Télécharger ma carte en PDF" onPress={run(() => familyCardPdf(fam))} />
    <H>Salongo</H>
    {sessions.map(s => <Btn key={s.id} alt t={'J\'ai fait le Salongo du ' + String(s.day).slice(0, 10)} onPress={run(async () => { const r = await api('/salongo/confirm', 'POST', { family_token: fam.token, session_id: s.id }); setTok(r.token); })} />)}
    {tok && <Card><Text>Jeton de la maison : {tok}</Text></Card>}
    {fines.filter(f => !f.paid).map(f => <Card key={f.id}><Text>Amende : {f.amount} FC</Text><Btn t="Payer l'amende" onPress={run(async () => { await api('/salongo/fines/' + f.id + '/pay', 'POST', { wallet_pin: d.w }); Alert.alert('Gouvance', 'Amende payée'); await load(fam); })} /></Card>)}
    {notes.map(n => <Card key={n.id}><Text style={{ fontWeight: '700' }}>{n.title}</Text><Text>{n.body}</Text></Card>)}
    <Btn alt t="Retour" onPress={back} /></>);
}
