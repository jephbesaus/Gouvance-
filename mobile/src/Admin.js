import React, { useState, useEffect } from 'react';
import { Text, Alert, Image } from 'react-native';
import { api, fileUrl } from './api'; import { Avatar } from './Feed'; import { Field, Btn, Card, H, Chips, run } from './ui';

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
    <AdminExtra />
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

function AdminExtra() {
  const [q, setQ] = useState(''); const [users, setUsers] = useState([]); const [sel, setSel] = useState({}); const [m, setM] = useState({}); const [roles, setRoles] = useState(null); const [money, setMoney] = useState(null); const [cnt, setCnt] = useState(null);
  const load = run(async () => { setUsers(await api('/admin/users?q=' + encodeURIComponent(q))); setCnt(await api('/admin/users/count')); }); useEffect(() => { load(); }, []);
  const act = (p, b) => run(async () => { await api(p, 'POST', b || {}); await load(); });
  const ids = Object.keys(sel).filter(k => sel[k]);
  return (<><H>Utilisateurs</H>{cnt && <Text style={{ marginBottom: 6 }}>Total : {cnt.total} - Actifs : {cnt.actifs} - Hommes : {cnt.hommes} - Femmes : {cnt.femmes}</Text>}
    <Field placeholder="Rechercher (nom, ID, email)" value={q} onChangeText={setQ} onSubmitEditing={load} /><Btn alt t="Rechercher" onPress={load} />
    {users.map(u => (<Card key={u.id}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar uri={u.photo_url} name={u.full_name} size={44} /><View style={{ marginLeft: 10, flex: 1 }}><Text style={{ fontWeight: '700' }}>{u.full_name}</Text><Text>{u.gouvance_id} - {u.avenue || '-'}</Text><Text>Solde : {u.balance} FC - {u.kyc_status === 'verified' ? 'Vérifié' : 'Non vérifié'}{u.restricted ? ' - Restreint' : ''}{u.status === 'blocked' ? ' - Bloqué' : ''}</Text>{u.roles ? <Text style={{ color: '#0B5FC4' }}>{u.roles}</Text> : null}</View></View>
      <Btn alt t={sel[u.id] ? 'Retirer de la sélection' : 'Sélectionner'} onPress={() => setSel(o => ({ ...o, [u.id]: !o[u.id] }))} />
      <Btn alt t="Marquer comme vérifié" onPress={act('/admin/users/' + u.id + '/verify')} /><Btn alt t={u.restricted ? 'Lever la restriction' : 'Restreindre le portefeuille'} onPress={act('/admin/users/' + u.id + '/restrict', { restricted: !u.restricted })} />
      <Btn alt t={u.status === 'blocked' ? 'Débloquer' : 'Bloquer'} onPress={act('/admin/users/' + u.id + (u.status === 'blocked' ? '/unblock' : '/block'))} /></Card>))}
    <H>Message aux utilisateurs</H><Field placeholder="Titre" onChangeText={x => setM(o => ({ ...o, title: x }))} /><Field placeholder="Message" multiline onChangeText={x => setM(o => ({ ...o, body: x }))} />
    <Btn t={'Envoyer aux sélectionnés (' + ids.length + ')'} onPress={run(async () => { const r = await api('/admin/broadcast', 'POST', { ids, title: m.title, body: m.body }); Alert.alert('Gouvance', r.sent + ' message(s) envoyé(s)'); })} />
    <Btn alt t="Envoyer à tous les utilisateurs" onPress={run(async () => { const r = await api('/admin/broadcast', 'POST', { all: true, title: m.title, body: m.body }); Alert.alert('Gouvance', r.sent + ' message(s) envoyé(s)'); })} />
    <H>Rôles nommés</H><Btn alt t="Afficher la liste" onPress={run(async () => setRoles(await api('/admin/roles/list')))} />{(roles || []).map((x, i) => <Text key={i} style={{ marginTop: 4 }}>{x.role} {x.scope !== '*' ? '(' + x.scope + ')' : ''} : {x.full_name} - {x.gouvance_id}</Text>)}
    <H>Demandes de dépôt et de retrait</H><Btn alt t="Afficher les demandes en attente" onPress={run(async () => setMoney(await api('/admin/money')))} />
    {(money || []).map(x => <Card key={x.id}><Text style={{ fontWeight: '700' }}>{x.kind === 'deposit' ? 'Dépôt' : 'Retrait'} {x.amount} FC - {x.full_name}</Text><Text>{x.operator} {x.phone}{x.kind === 'withdraw' ? ' - à envoyer : ' + x.net + ' FC' : ''}</Text>
      <Btn t="Traité" onPress={run(async () => { await api('/admin/money/' + x.id + '/done', 'POST'); setMoney(await api('/admin/money')); })} /><Btn alt t="Refuser" onPress={run(async () => { await api('/admin/money/' + x.id + '/reject', 'POST'); setMoney(await api('/admin/money')); })} /></Card>)}
    <H>Réglages</H><Btn alt t="Activer l'espace bourgmestre" onPress={run(async () => { await api('/admin/settings', 'POST', { key: 'bourgmestre', value: '1' }); Alert.alert('Gouvance', 'Espace bourgmestre activé'); })} /><Btn alt t="Masquer l'espace bourgmestre" onPress={run(async () => { await api('/admin/settings', 'POST', { key: 'bourgmestre', value: '0' }); Alert.alert('Gouvance', 'Espace bourgmestre masqué'); })} /></>);
}
