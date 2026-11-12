import React, { useState, useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, fileUrl } from './api'; import { Field, Btn, Card, H, run, tr } from './ui'; import { Alert } from 'react-native';
export default function Wallet({ user }) {
  const [bal, setBal] = useState(null); const [hist, setHist] = useState([]); const [d, setD] = useState({}); const [who, setWho] = useState(null); const [rec, setRec] = useState(null);
  const set = k => v => setD(x => ({ ...x, [k]: v }));
  const staff = user.roles.some(r => r.role === 'recenseur' || r.role === 'admin');
  useEffect(() => { api('/wallet/balance').then(r => setBal(r.balance)).catch(() => {}); api('/wallet/history').then(setHist).catch(() => {}); }, [rec]);
  const label = x => x.kind === 'transfer' ? (x.from_user === user.user.id ? 'Envoyé' : 'Reçu') : x.kind === 'admin_credit' ? 'Recharge' : x.kind === 'census_fee' ? 'Recensement' : 'Amende Salongo';
  return (<><H>Portefeuille</H>
    <LinearGradient colors={['#0B5FC4', '#2E9E3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 20, marginBottom: 12 }}>
      <Text style={{ color: '#E6F1FF' }}>{tr('Solde')}</Text><Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }}>{bal == null ? '...' : bal} FC</Text>
      <Text style={{ color: '#E6F1FF', marginTop: 6 }}>{user.user.name} - {user.user.gouvance_id}</Text></LinearGradient>
    <Text style={{ color: '#5B6B7F', marginBottom: 8 }}>L'argent arrive sur ce portefeuille uniquement par l'administration ou par un recenseur, avec votre ID. Il n'y a pas de dépôt direct.</Text>
    <Field placeholder="Créer ou changer le PIN du portefeuille (4 chiffres)" secureTextEntry keyboardType="number-pad" maxLength={4} onChangeText={set('newpin')} />
    <Btn alt t="Enregistrer le PIN" onPress={run(async () => { await api('/wallet/set-pin', 'POST', { pin: d.newpin }); Alert.alert('Gouvance', 'PIN enregistré'); })} />
    <H>{staff ? 'Recharger un compte ou envoyer à un ID' : 'Envoyer à un ID'}</H>
    <Field placeholder="ID Gouvance du destinataire" autoCapitalize="characters" onChangeText={set('to')} />
    <Btn alt t="Rechercher" onPress={run(async () => setWho(await api('/wallet/lookup', 'POST', { gouvance_id: (d.to || '').trim().toUpperCase() })))} />
    {who && <Card><View style={{ flexDirection: 'row', alignItems: 'center' }}>{who.photo_url ? <Image source={{ uri: fileUrl(who.photo_url) }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 10 }} /> : null}<View><Text style={{ fontWeight: '700' }}>{who.full_name}</Text><Text>{who.gouvance_id}</Text></View></View></Card>}
    {who && <><Field placeholder="Montant (FC)" keyboardType="number-pad" onChangeText={set('amount')} /><Field placeholder="PIN du portefeuille (4 chiffres)" secureTextEntry keyboardType="number-pad" onChangeText={set('wpin')} />
      <Btn t="Envoyer" onPress={run(async () => setRec(await api('/wallet/transfer', 'POST', { to: who.gouvance_id, amount: d.amount, wallet_pin: d.wpin })))} /></>}
    {rec && <Card><Text style={{ fontWeight: '700', color: '#2E9E3F' }}>Transfert réussi</Text><Text>{rec.amount} FC envoyés à {rec.name} ({rec.to})</Text><Text>{new Date(rec.date).toLocaleString('fr-FR')}</Text><Text style={{ fontWeight: '700' }}>Reçu : {rec.code}</Text></Card>}
    <H>Historique</H>
    {!hist.length && <Text style={{ color: '#5B6B7F' }}>Aucune opération pour le moment.</Text>}
    {hist.slice(0, 15).map(x => <Text key={x.code} style={{ color: '#42526B', marginBottom: 4 }}>{new Date(x.created_at).toLocaleDateString('fr-FR')} - {label(x)} : {x.amount} FC</Text>)}</>);
}
