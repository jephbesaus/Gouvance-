import React, { useState } from 'react';
import { Text, Alert, Image, View, TouchableOpacity, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; import QRCode from 'react-native-qrcode-svg'; import { LinearGradient } from 'expo-linear-gradient';
import { api, uploadBase64, fileUrl } from './api'; import { Field, Btn, Card, H, Chips, C, run, tr } from './ui';
import { FamilyCard } from './CardViews'; import { familyCardPdf, fichePdf } from './cards'; import { Avatar } from './Feed'; import { Icon } from './icons'; import { ageOf, fmtDate } from './util2';

const KINDS = [['probleme', 'Problème'], ['deces', 'Décès'], ['naissance', 'Naissance'], ['mariage', 'Mariage'], ['incendie', 'Incendie'], ['innovation', 'Innovation'], ['autre', 'Autre']];
const Stat = ({ n, l }) => <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>{n}</Text><Text style={{ color: '#E6F1FF', fontSize: 12 }}>{tr(l)}</Text></View>;
const Line = ({ l, v }) => v ? <Text style={{ color: '#42526B', marginTop: 2 }}><Text style={{ color: '#8A99AB' }}>{tr(l)} : </Text>{v}</Text> : null;

export default function FamilySpace() {
  const [d, setD] = useState({}); const [fam, setFam] = useState(null); const [st, setSt] = useState([]); const [fines, setFines] = useState([]); const [notes, setNotes] = useState([]); const [others, setOthers] = useState([]);
  const [rep, setRep] = useState({ kind: 'probleme' }); const [post, setPost] = useState({}); const [pimg, setPimg] = useState(null); const [qr, setQr] = useState(null); const set = k => v => setD(o => ({ ...o, [k]: v }));
  const load = async f => { const b = { family_token: f.token }; setSt(await api('/salongo/family/status', 'POST', b)); setFines(await api('/salongo/family/fines', 'POST', b)); setNotes(await api('/salongo/family/notifications', 'POST', b)); setOthers(await api('/census/public-families')); };
  if (!fam) return (<View><H>Espace famille</H><Text style={{ color: '#5B6B7F', marginBottom: 10 }}>{tr("Saisissez l'ID de la famille (commence par FM) et le PIN remis par le recenseur.")}</Text>
    <Field placeholder="ID famille (FM...)" autoCapitalize="characters" onChangeText={x => set('code')(x.trim().toUpperCase())} /><Field placeholder="PIN famille" secureTextEntry keyboardType="number-pad" onChangeText={set('pin')} />
    <Btn t="Entrer" onPress={run(async () => { const f = await api('/census/family-login', 'POST', { code: d.code, pin: d.pin }); setFam(f); await load(f); })} /></View>);
  const m = fam.members; const hom = m.filter(x => x.gender === 'M').length, fem = m.filter(x => x.gender === 'F').length, enf = m.filter(x => x.kind === 'child').length;
  return (<View>
    <View style={{ flexDirection: 'row', backgroundColor: '#E8F2FF', borderRadius: 18, padding: 14, marginBottom: 12 }}>
      <LinearGradient colors={['#0B5FC4', '#2E9E3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={23} color="#fff" /></LinearGradient>
      <View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontSize: 13, fontWeight: '800' }}><Text style={{ color: '#2E9E3F' }}>Gou</Text><Text style={{ color: '#0B5FC4' }}>vance</Text></Text><Text style={{ fontWeight: '700', color: '#12263F', fontSize: 16 }}>{tr('Bonjour la famille')} {fam.family_name}</Text></View></View>
    <LinearGradient colors={['#0B5FC4', '#2E9E3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 16, marginBottom: 12 }}>
      <Text style={{ color: '#E6F1FF', fontSize: 12 }}>{tr('Tableau de bord')} - {fam.code}</Text><View style={{ flexDirection: 'row', marginTop: 8 }}><Stat n={m.length} l="Membres" /><Stat n={hom} l="Hommes" /><Stat n={fem} l="Femmes" /><Stat n={enf} l="Enfants" /></View></LinearGradient>
    {fam.photo_url ? <Image source={{ uri: fileUrl(fam.photo_url) }} style={{ width: '100%', aspectRatio: 1.6, borderRadius: 16, marginBottom: 12 }} /> : null}
    <FamilyCard f={fam} />
    <Btn alt t="Télécharger ma carte en PDF" onPress={run(() => familyCardPdf(fam))} /><Btn alt t="Télécharger la fiche de recensement (PDF)" onPress={run(() => fichePdf(fam))} />
    <H>Membres de la famille</H>
    {m.map(x => (<View key={x.id} style={{ backgroundColor: '#F6F8FB', borderRadius: 16, padding: 12, marginBottom: 10 }}><View style={{ flexDirection: 'row' }}>
      <Avatar uri={x.photo_url} name={x.full_name} size={64} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ fontWeight: '800', fontSize: 16, color: '#12263F' }}>{x.full_name}</Text>
        <Text style={{ color: C.blue, fontWeight: '700' }}>{x.position || (x.kind === 'father' ? 'Père' : x.kind === 'mother' ? 'Mère' : 'Enfant')}{x.deceased ? ' (décédé)' : ''}</Text>
        <Line l="Âge" v={ageOf(x.birth_date) != null ? ageOf(x.birth_date) + ' ans' : null} /><Line l="Né(e) le" v={x.birth_date ? fmtDate(x.birth_date) : null} /><Line l="Lieu de naissance" v={x.birth_place} /><Line l="Profession" v={x.profession} /><Line l="Nationalité" v={x.nationality} /></View>
      {x.qr ? <TouchableOpacity onPress={() => setQr(x)}><QRCode value={x.qr} size={56} /></TouchableOpacity> : null}</View></View>))}
    <H>Salongo</H>
    {st.map(s => (<View key={s.id} style={{ borderRadius: 14, padding: 12, marginBottom: 8, backgroundColor: s.confirmed ? '#E4F4E7' : s.closed ? '#FBE9E7' : '#F6F8FB' }}>
      <Text style={{ fontWeight: '700', color: '#12263F' }}>{new Date(s.day).toLocaleDateString('fr-FR')}</Text>
      {s.confirmed ? <Text style={{ color: C.green, fontWeight: '800' }}>{tr('Vous avez confirmé votre présence au Salongo.')}</Text>
        : s.closed ? <Text style={{ color: '#B3261E', fontWeight: '700' }}>{tr("La famille n'a pas fait le Salongo.")}</Text>
        : s.checked ? <><Field placeholder="Jeton Salongo remis par l'agent" autoCapitalize="characters" onChangeText={x => set('tk' + s.id)(x)} /><Btn t="Valider ma présence" onPress={run(async () => { await api('/salongo/confirm', 'POST', { family_token: fam.token, session_id: s.id, token: d['tk' + s.id] }); await load(fam); })} /></>
        : <Text style={{ color: '#5B6B7F' }}>{tr("Présence pas encore enregistrée par un agent Salongo.")}</Text>}</View>))}
    {fines.filter(f => !f.paid).map(f => <Card key={f.id}><Text style={{ fontWeight: '700' }}>{tr('Sanction')} : {f.amount} FC</Text>{f.note ? <Text>{f.note}</Text> : null}<Field placeholder="PIN de votre portefeuille" secureTextEntry keyboardType="number-pad" onChangeText={set('w')} />
      <Btn t="Payer la sanction" onPress={run(async () => { await api('/salongo/fines/' + f.id + '/pay', 'POST', { wallet_pin: d.w }); Alert.alert('Gouvance', tr('Amende payée')); await load(fam); })} /></Card>)}
    {notes.map(n => <Card key={n.id}><Text style={{ fontWeight: '700' }}>{n.title}</Text><Text>{n.body}</Text></Card>)}
    <H>Contacter le chef d'avenue</H><Chips value={rep.kind} onPick={k => setRep(o => ({ ...o, kind: k }))} items={KINDS} />
    <Field placeholder="Décrivez la situation (eau, courant, décès, naissance...)" multiline onChangeText={x => setRep(o => ({ ...o, body: x }))} />
    <Btn t="Envoyer au chef d'avenue" onPress={run(async () => { await api('/census/family/report', 'POST', { family_token: fam.token, kind: rep.kind, body: rep.body }); Alert.alert('Gouvance', tr('Message envoyé au chef d\'avenue.')); })} />
    <H>Publier au nom de la famille</H><Field placeholder="Écrivez votre texte" multiline onChangeText={x => setPost(o => ({ ...o, body: x }))} />
    <Btn alt t={pimg ? 'Photo choisie - changer' : 'Ajouter une photo'} onPress={run(async () => { const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) setPimg(r.assets[0]); })} />
    <Btn t="Publier" onPress={run(async () => { const image_url = pimg ? await uploadBase64(pimg.base64) : null; await api('/census/family/post', 'POST', { family_token: fam.token, body: post.body, image_url }); setPimg(null); Alert.alert('Gouvance', tr('Publication envoyée.')); })} />
    <H>Autres familles recensées</H>
    {others.filter(o => o.code !== fam.code).map(o => (<View key={o.code} style={{ backgroundColor: '#F6F8FB', borderRadius: 16, padding: 12, marginBottom: 8 }}><Text style={{ fontWeight: '700', color: '#12263F' }}>{tr('Famille')} {o.family_name} - {o.code}</Text>
      <Text style={{ color: '#5B6B7F' }}>{[o.commune, o.avenue, o.quartier].filter(Boolean).join(' / ')} - {o.membres} {tr('membres')}</Text><Text style={{ color: '#5B6B7F', marginTop: 2 }}>PIN : ••••••</Text></View>))}
    <Modal visible={!!qr} transparent animationType="fade" onRequestClose={() => setQr(null)}><TouchableOpacity activeOpacity={1} onPress={() => setQr(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }}>
      {qr && <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 22, alignItems: 'center' }}><QRCode value={qr.qr} size={240} /><Text style={{ fontWeight: '800', marginTop: 12 }}>{qr.full_name}</Text><Text style={{ color: '#5B6B7F' }}>{tr('Scanner')}</Text></View>}</TouchableOpacity></Modal></View>);
}
