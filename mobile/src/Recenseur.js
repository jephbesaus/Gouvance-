import React, { useState, useEffect } from 'react';
import { Text, Alert, Image, View, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; import * as Clipboard from 'expo-clipboard';
import { api, uploadBase64 } from './api'; import { Field, Btn, Card, Paper, H, Chips, C, run, tr } from './ui'; import { SignaturePad } from './CardViews'; import { fichePdf } from './cards'; import Scan from './Scan'; import { useBack } from './back'; import { ageOf, toIso } from './util2';

const POS = [['Père', 'Père'], ['Mère', 'Mère'], ['Enfant', 'Enfant'], ['Autre', 'Autre']];
const copy = async (l, v) => { await Clipboard.setStringAsync(String(v)); Alert.alert('Gouvance', tr(l) + ' ' + tr('copié')); };

export default function Recenseur({ user }) {
  const [v, setV] = useState('menu'); useBack(v !== 'menu' ? () => setV('menu') : null);
  if (v === 'form') return <Form user={user} onDone={() => setV('menu')} />; if (v === 'hist') return <History />; if (v === 'check') return <Check />; if (v === 'scan') return <Scan back={() => setV('menu')} />;
  return (<View><H>Espace recenseur</H><Btn t="Recenser une famille" onPress={() => setV('form')} /><Btn alt t="Historique des recensements" onPress={() => setV('hist')} /><Btn alt t="Vérifier un recensement" onPress={() => setV('check')} /><Btn alt t="Scanner une carte (QR)" onPress={() => setV('scan')} /></View>);
}

function Form({ user, onDone }) {
  const [pr, setPr] = useState({}); const [d, setD] = useState({ occupant: 'Propriétaire' }); const [ph, setPh] = useState({}); const [mem, setMem] = useState([{ position: 'Père', nationality: 'Congolaise' }, { position: 'Mère', nationality: 'Congolaise' }]);
  const [sig, setSig] = useState(''); const [pin, setPin] = useState(''); const [ask, setAsk] = useState(false); const [res, setRes] = useState(null); const [avs, setAvs] = useState([]);
  const set = k => x => setD(o => ({ ...o, [k]: x })); const up = (i, k) => x => setMem(a => a.map((m, j) => (j === i ? { ...m, [k]: x } : m)));
  useEffect(() => { api('/me/profile').then(p => { setPr(p); setD(o => ({ ...o, fait_a: p.ville })); if (p.commune) api('/geo/avenues?commune=' + encodeURIComponent(p.commune) + '&quartier=' + encodeURIComponent(p.quartier || '')).then(setAvs).catch(() => {}); }); }, []);
  const shot = async k => { const g = await ImagePicker.requestCameraPermissionsAsync(); if (!g.granted) throw new Error('Autorisez la caméra'); const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 }); if (!r.canceled) setPh(o => ({ ...o, [k]: r.assets[0] })); };
  const n = (f) => mem.filter(f).length; const stats = { Père: n(m => m.position === 'Père'), Mère: n(m => m.position === 'Mère'), Garçons: n(m => m.position === 'Enfant' && m.gender === 'M'), Filles: n(m => m.position === 'Enfant' && m.gender === 'F'), Total: n(m => m.full_name) };
  const head = [tr('République démocratique du Congo'), 'Province ' + (pr.province ? 'du ' + pr.province : ''), 'Mairie de ' + (pr.ville || ''), 'Commune ' + (pr.commune ? 'de ' + pr.commune : ''), 'Quartier ' + (pr.quartier || '')];
  const full = () => ({ ...d, province: pr.province, ville: pr.ville, commune: pr.commune, quartier: pr.quartier, recenseur: user.user.name, created_at: new Date().toISOString(), members: mem.map(m => ({ ...m, birth_date: toIso(m.birth_date) })), signature: sig });
  if (res) return (<View><H>Famille enregistrée</H><Paper><Text style={{ color: C.green, fontWeight: '800', marginBottom: 8 }}>{tr('Le solde de')} {res.fee} FC {tr('a été retiré de votre compte pour le recensement de la famille')} {d.family_name}. {tr('La Gouvance vous remercie.')}</Text>
    {[['ID famille', res.code], ['PIN famille', res.pin]].map(([l, x]) => (<View key={l} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}><View style={{ flex: 1 }}><Text style={{ color: '#5B6B7F', fontSize: 12 }}>{tr(l)}</Text><Text style={{ fontSize: 24, fontWeight: '800', color: '#12263F' }}>{x}</Text></View>
      <TouchableOpacity onPress={() => copy(l, x)} style={{ backgroundColor: '#EAF2FC', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 }}><Text style={{ color: C.blue, fontWeight: '700' }}>{tr('Copier')}</Text></TouchableOpacity></View>))}</Paper>
    <Btn alt t="Télécharger la fiche (PDF)" onPress={run(() => fichePdf({ ...full(), code: res.code }))} /><Btn t="OK" onPress={onDone} /></View>);
  return (<View>
    <View style={{ alignItems: 'center', marginBottom: 8 }}>{head.map((t, i) => <Text key={i} style={{ fontWeight: i === 0 ? '800' : '600', color: '#12263F', textAlign: 'center' }}>{t}</Text>)}<Text style={{ fontSize: 18, fontWeight: '800', color: C.blue, marginTop: 8, textAlign: 'center' }}>FICHE DE RECENSEMENT DE LA POPULATION</Text></View>
    <Text style={{ fontWeight: '700', marginTop: 8 }}>1. Avenue</Text><Field placeholder="Tapez le nom de l'avenue" value={d.avenue || ''} onChangeText={set('avenue')} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{avs.filter(a => a.toLowerCase().includes((d.avenue || '').toLowerCase())).slice(0, 6).map(a => <TouchableOpacity key={a} onPress={() => set('avenue')(a)} style={{ backgroundColor: '#EAF2FC', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, margin: 3 }}><Text style={{ color: C.blue }}>{a}</Text></TouchableOpacity>)}</View>
    <Text style={{ fontWeight: '700', marginTop: 8 }}>2. Qualité de l'occupant</Text><Chips value={d.occupant} onPick={set('occupant')} items={[['Propriétaire', 'Propriétaire'], ['Locataire', 'Locataire'], ['Autre', 'Autre']]} />
    <Field placeholder="Nom de la famille" onChangeText={set('family_name')} /><Field placeholder="Téléphone du responsable" keyboardType="phone-pad" onChangeText={set('phone')} />
    <Btn alt t={ph.fam ? 'Photo passeport de la famille - refaire' : 'Photo passeport de la famille'} onPress={run(() => shot('fam'))} />{ph.fam && <Image source={{ uri: ph.fam.uri }} style={{ width: 110, height: 80, borderRadius: 10, marginBottom: 8 }} />}
    <Text style={{ fontWeight: '800', fontSize: 16, marginVertical: 8 }}>3. Membres du ménage</Text>
    {mem.map((m, i) => (<View key={i} style={{ backgroundColor: '#F6F8FB', borderRadius: 16, padding: 12, marginBottom: 10 }}><Text style={{ fontWeight: '800', color: C.blue }}>N° {i + 1}</Text>
      <Field placeholder="Nom et post-nom" value={m.full_name || ''} onChangeText={up(i, 'full_name')} /><Chips value={m.position} onPick={up(i, 'position')} items={POS} /><Chips value={m.gender} onPick={up(i, 'gender')} items={[['F', 'F'], ['M', 'M']]} />
      <Field placeholder="Date de naissance (JJ/MM/AAAA)" value={m.birth_date || ''} onChangeText={up(i, 'birth_date')} /><Text style={{ marginBottom: 8, color: '#12263F' }}>{tr('Âge')} : {ageOf(m.birth_date) != null ? ageOf(m.birth_date) + ' ans' : '-'}</Text>
      <Field placeholder="Lieu de naissance" value={m.birth_place || ''} onChangeText={up(i, 'birth_place')} /><Field placeholder="Profession" value={m.profession || ''} onChangeText={up(i, 'profession')} /><Field placeholder="Nationalité" value={m.nationality || ''} onChangeText={up(i, 'nationality')} />
      <Field placeholder="Observation (OK ou vide)" value={m.observation || ''} onChangeText={up(i, 'observation')} />
      <Btn alt t={ph[i] ? 'Photo passeport prise - refaire' : 'Photo passeport'} onPress={run(() => shot(i))} />{ph[i] && <Image source={{ uri: ph[i].uri }} style={{ width: 70, height: 90, borderRadius: 8 }} />}
      {i > 1 && <Btn alt t="Retirer ce membre" onPress={() => { setMem(a => a.filter((_, j) => j !== i)); }} />}</View>))}
    <Btn alt t="Ajouter un membre" onPress={() => setMem([...mem, { position: 'Enfant', nationality: 'Congolaise' }])} />
    <Paper><Text style={{ fontWeight: '800', marginBottom: 6 }}>{tr('Statistiques')}</Text>{Object.entries(stats).map(([k, x]) => <Text key={k}>{k} : {x}</Text>)}</Paper>
    <Text style={{ marginVertical: 8, color: '#42526B' }}>{tr('Nous certifions que les renseignements ci-dessus sont sincères et exacts.')}</Text>
    <Field placeholder="Fait à" value={d.fait_a || ''} onChangeText={set('fait_a')} /><Field placeholder="Nom du chef d'avenue" onChangeText={set('chef_name')} />
    <Text style={{ fontWeight: '700', marginVertical: 6 }}>{tr('Signature du recenseur (avec le doigt)')}</Text><SignaturePad onChange={setSig} />
    {!ask ? <Btn t="Enregistrer" onPress={run(async () => {
      if (!d.family_name || !(d.avenue || '').trim()) throw new Error("Indiquez le nom de la famille et l'avenue"); const ok = mem.filter(m => m.full_name);
      if (!ok.length) throw new Error('Ajoutez au moins un membre'); for (let i = 0; i < mem.length; i++) if (mem[i].full_name && !ph[i]) throw new Error('Photo passeport manquante : ' + mem[i].full_name); if (!sig) throw new Error('Signez avec le doigt dans le cadre'); setAsk(true); })} />
    : <Paper><Text style={{ fontWeight: '800', color: '#12263F' }}>{tr('Confirmer le paiement')}</Text><Text style={{ marginVertical: 6 }}>{tr('Montant à payer')} : 1000 FC</Text><Field placeholder="PIN de votre portefeuille" secureTextEntry keyboardType="number-pad" onChangeText={setPin} />
      <Btn t="OK" onPress={run(async () => {
        const photos = { fam: ph.fam ? await uploadBase64(ph.fam.base64) : null }; const members = [];
        for (let i = 0; i < mem.length; i++) if (mem[i].full_name) members.push({ ...mem[i], birth_date: toIso(mem[i].birth_date), photo_url: await uploadBase64(ph[i].base64) });
        setRes(await api('/census/families', 'POST', { ...d, province: pr.province, ville: pr.ville, commune: pr.commune, quartier: pr.quartier, photo_url: photos.fam, members, signature: sig, wallet_pin: pin })); })} /></Paper>}</View>);
}

function History() {
  const [q, setQ] = useState(''); const [list, setList] = useState([]); const load = run(async () => setList(await api('/census/history?q=' + encodeURIComponent(q)))); useEffect(() => { load(); }, []);
  return (<View><H>Historique des recensements</H><Field placeholder="Rechercher une famille ou un ID" value={q} onChangeText={setQ} onSubmitEditing={load} /><Btn alt t="Rechercher" onPress={load} />
    {!list.length && <Text style={{ color: '#5B6B7F' }}>{tr('Aucun recensement pour le moment.')}</Text>}
    {list.map(f => <Card key={f.code}><Text style={{ fontWeight: '700' }}>{f.family_name} - {f.code}</Text><Text>{f.avenue} / {f.quartier} - {f.membres} {tr('membres')}</Text><Text style={{ color: '#8A99AB' }}>{new Date(f.created_at).toLocaleDateString('fr-FR')}</Text>
      <Btn alt t="Fiche de recensement (PDF)" onPress={run(async () => fichePdf(await api('/census/families/' + f.code)))} /></Card>)}</View>);
}
function Check() {
  const [c, setC] = useState(''); const [r, setR] = useState(null);
  return (<View><H>Vérifier un recensement</H><Text style={{ color: '#5B6B7F', marginBottom: 8 }}>{tr("Entrez l'ID de la famille pour savoir si elle a déjà été recensée.")}</Text><Field placeholder="ID famille (FM...)" autoCapitalize="characters" onChangeText={setC} /><Btn t="Vérifier" onPress={run(async () => setR(await api('/census/check/' + encodeURIComponent(c.trim()))))} />
    {r && (r.found ? <Paper><Text style={{ color: C.green, fontWeight: '800' }}>{tr('Cette famille a déjà été recensée.')}</Text><Text style={{ fontWeight: '700', marginTop: 4 }}>{r.family_name} - {r.code}</Text><Text>{r.commune} / {r.avenue} / {r.quartier}</Text><Text>{tr('Recenseur')} : {r.recenseur || '-'}</Text><Text>{new Date(r.created_at).toLocaleDateString('fr-FR')}</Text></Paper> : <Text style={{ color: '#B3261E', marginTop: 10 }}>{tr(r.message)}</Text>)}</View>);
}
