import React, { useState, useEffect } from 'react';
import { Text, Alert, Image } from 'react-native';
import { api, fileUrl } from './api'; import { Field, Btn, Card, H, Chips, run } from './ui';

export default function Admin({ back }) {
  const [ky, setKy] = useState(null); const [pending, setPending] = useState(null); const [d, setD] = useState({ role: 'bourgmestre' }); const set = k => x => setD(o => ({ ...o, [k]: x }));
  const loadP = async () => setPending(await api('/admin/pending'));
  return (<><H>Administration</H>
    <Btn alt t="Afficher les inscriptions en attente" onPress={run(loadP)} />
    {pending && pending.map(u => <Card key={u.id}><Text style={{ fontWeight: '700' }}>{u.full_name} ({u.gender})</Text><Text>{u.email} - {u.commune} / {u.avenue}</Text>
      <Btn t="Approuver (générer ID + PIN)" onPress={run(async () => { const r = await api('/admin/users/' + u.id + '/approve', 'POST'); Alert.alert('ID : ' + r.gouvance_id, 'PIN : ' + r.pin + '\nNotez-les et transmettez-les à l\'utilisateur.'); loadP(); })} />
      <Btn alt t="Bloquer" onPress={run(async () => { await api('/admin/users/' + u.id + '/block', 'POST'); loadP(); })} /></Card>)}
    <Btn alt t="Vérifications d'identité en attente" onPress={run(async () => setKy(await api('/admin/kyc')))} />
    {ky && (ky.length ? ky.map(u => <Card key={u.id}><Text style={{ fontWeight: '700' }}>{u.full_name} ({u.gouvance_id})</Text>{['id_front_url', 'id_back_url', 'selfie_url'].map(k => <Image key={k} source={{ uri: fileUrl(u.kyc_review[k]) }} style={{ width: '100%', height: 160, borderRadius: 8, marginTop: 6 }} resizeMode="contain" />)}<Btn t="Valider" onPress={run(async () => { await api('/admin/kyc/' + u.id, 'POST', { approve: true }); setKy(await api('/admin/kyc')); })} /><Btn alt t="Refuser" onPress={run(async () => { await api('/admin/kyc/' + u.id, 'POST', { approve: false }); setKy(await api('/admin/kyc')); })} /></Card>) : <Text>Aucune vérification en attente.</Text>)}
    <AdminTabs />
    <H>Nommer / retirer un rôle</H><Field placeholder="ID Gouvance de la personne" onChangeText={set('gouvance_id')} />
    <Chips value={d.role} onPick={set('role')} items={[['bourgmestre', 'Bourgmestre'], ['chef_avenue', "Chef d'avenue"], ['chef_quartier', 'Chef de quartier'], ['recenseur', 'Recenseur']]} />
    <Field placeholder="Commune / avenue / quartier (ex : Kimbangu)" onChangeText={set('scope')} />
    <Btn t="Nommer" onPress={run(async () => { await api('/admin/roles', 'POST', d); Alert.alert('Gouvance', 'Rôle attribué'); })} />
    <Btn alt t="Retirer ce rôle" onPress={run(async () => { await api('/admin/roles', 'DELETE', d); Alert.alert('Gouvance', 'Rôle retiré'); })} />
    <H>Envoyer du solde (FC virtuels)</H><Field placeholder="ID Gouvance" onChangeText={set('to')} /><Field placeholder="Montant" keyboardType="number-pad" onChangeText={set('amount')} />
    <Btn t="Envoyer" onPress={run(async () => { const r = await api('/admin/wallet/credit', 'POST', { gouvance_id: d.to, amount: d.amount }); Alert.alert('Envoyé', 'Reçu : ' + r.code); })} />
    <H>Salongo</H><Field placeholder="Date du samedi (AAAA-MM-JJ)" onChangeText={set('day')} /><Field placeholder="Amende (FC)" keyboardType="number-pad" onChangeText={set('fine')} />
    <Btn t="Créer la session" onPress={run(async () => { const r = await api('/salongo/sessions', 'POST', { day: d.day, fine: d.fine }); Alert.alert('Session créée', 'Numéro ' + r.id + ' (notez-le pour la clôture)'); })} />
    <Field placeholder="Numéro de session à clôturer" keyboardType="number-pad" onChangeText={set('sid')} />
    <Btn alt t="Clôturer et facturer les absents" onPress={run(async () => { const r = await api('/salongo/sessions/' + d.sid + '/close', 'POST'); Alert.alert('Salongo', r.amendes + ' amende(s) envoyée(s)'); })} />
    <Btn alt t="Retour" onPress={back} /></>);
}

function AdminTabs() {
  const [list, setList] = useState([]); const [d, setD] = useState({});
  const load = async () => setList(await api('/census/tabs'));
  useEffect(() => { run(load)(); }, []);
  return (<><H>Onglets de l'espace Recensement</H>
    <Field placeholder="Titre de l'onglet" value={d.title || ''} onChangeText={x => setD(o => ({ ...o, title: x }))} />
    <Field placeholder="Contenu affiché aux utilisateurs" multiline value={d.body || ''} onChangeText={x => setD(o => ({ ...o, body: x }))} />
    <Btn t="Créer l'onglet" onPress={run(async () => { await api('/admin/tabs', 'POST', d); setD({}); await load(); Alert.alert('Gouvance', 'Onglet créé'); })} />
    {list.map(x => <Card key={x.id}><Text style={{ fontWeight: '700' }}>{x.title}</Text><Text>{x.body}</Text><Btn alt t="Supprimer l'onglet" onPress={run(async () => { await api('/admin/tabs/' + x.id, 'DELETE'); await load(); })} /></Card>)}</>);
}
