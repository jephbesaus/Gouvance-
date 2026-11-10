import React, { useState, useEffect } from 'react';
import { Text, Image, View, Alert, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store'; import * as LocalAuthentication from 'expo-local-authentication'; import * as Clipboard from 'expo-clipboard'; import { citizenCardPdf } from './cards';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadBase64, fileUrl, APP_URL } from './api'; import { Field, Btn, Card, Paper, H, Chips, C, run } from './ui';
const ABOUT = "Gouvance est la plateforme numérique de la ville de Bukavu dédiée au recensement de la population. Elle permet aux citoyens de s'inscrire, de faire recenser leur famille, de payer les frais de recensement et les amendes de Salongo depuis un portefeuille interne, de suivre les actualités de la ville, de publier sur le marketplace et de communiquer entre habitants. Les bourgmestres, chefs d'avenue et chefs de quartier suivent les effectifs de leur zone.";
const PRIV = "Vos données (identité, famille, photos) servent uniquement au recensement et aux services de Gouvance. Elles ne sont pas vendues. Sont interdits : la fraude, la fausse identité, les contenus pornographiques, la violence, le harcèlement et toute publication illégale. Un compte qui enfreint ces règles est bloqué et ses publications supprimées par l'administrateur.";
export default function Profile({ lang, setLang, back, logout, start }) {
  const [p, setP] = useState(null); const [sec, setSec] = useState(start || 'main'); const [bio, setBio] = useState(false); const [d, setD] = useState({}); const [notes, setNotes] = useState([]); const [kyc, setKyc] = useState({});
  const set = k => x => setD(o => ({ ...o, [k]: x }));
  const load = async () => setP(await api('/me/profile'));
  useEffect(() => { run(load)(); SecureStore.getItemAsync('bio').then(v => setBio(v === '1')); if (start === 'notes') run(async () => { setNotes(await api('/me/notifications')); await api('/me/notifications/read', 'POST'); })(); }, []);
  const shot = async (k, cam) => { const f = cam ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync; if (cam) { const g = await ImagePicker.requestCameraPermissionsAsync(); if (!g.granted) throw new Error('Autorisez la caméra'); } const r = await f({ base64: true, quality: 0.5 }); return r.canceled ? null : { uri: r.assets[0].uri, b: r.assets[0].base64 }; };
  if (!p) return <Text>...</Text>;
  const sub = (t, body) => (<><H>{t}</H>{body}<Btn alt t="Retour" onPress={() => setSec('main')} /></>);
  if (sec === 'card') return sub('Ma carte Gouvance', <><Paper><View style={{ alignItems: 'center' }}>
    <Text style={{ fontSize: 22, fontWeight: '800' }}><Text style={{ color: C.green }}>Gou</Text><Text style={{ color: C.blue }}>vance</Text></Text>
    {p.photo_url ? <Image source={{ uri: fileUrl(p.photo_url) }} style={{ width: 100, height: 120, borderRadius: 10, marginTop: 10 }} /> : <View style={{ width: 100, height: 120, borderRadius: 10, backgroundColor: '#DCE6F2', marginTop: 10 }} />}
    <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>{p.full_name}</Text><Text>Né(e) le {p.birth_date ? String(p.birth_date).slice(0, 10) : '-'}</Text>
    <Text style={{ marginTop: 8, fontSize: 20, fontWeight: '700', color: C.blue }}>{p.gouvance_id}</Text></View></Paper>
    <Btn alt t="Copier mon ID" onPress={run(async () => { await Clipboard.setStringAsync(p.gouvance_id); Alert.alert('Gouvance', 'ID copié'); })} />
    <Btn t="Télécharger en PDF" onPress={run(() => citizenCardPdf(p))} /></>);
  if (sec === 'about') return sub('À propos de Gouvance', <Text style={{ lineHeight: 22 }}>{ABOUT}</Text>);
  if (sec === 'privacy') return sub('Politique de confidentialité', <Text style={{ lineHeight: 22 }}>{PRIV}</Text>);
  if (sec === 'notes') return sub('Notifications', notes.length ? notes.map(n => <Card key={n.id}><Text style={{ fontWeight: '700' }}>{n.title}</Text><Text>{n.body}</Text></Card>) : <Text>Aucune notification.</Text>);
  if (sec === 'pin') return sub('Changer mon code PIN', <><Field placeholder="Ancien PIN" secureTextEntry keyboardType="number-pad" onChangeText={set('o')} /><Field placeholder="Nouveau PIN (4 à 8 chiffres)" secureTextEntry keyboardType="number-pad" onChangeText={set('n')} />
    <Btn t="Enregistrer" onPress={run(async () => { await api('/auth/change-pin', 'POST', { old_pin: d.o, new_pin: d.n }); Alert.alert('Gouvance', 'PIN modifié'); setSec('main'); })} /></>);
  if (sec === 'verify') return sub('Vérifier mon compte', <><Text style={{ marginBottom: 8 }}>Statut : {p.kyc_status === 'verified' ? 'vérifié' : p.kyc_status === 'review' ? 'en cours de contrôle' : 'non vérifié'}</Text>
    {[['front', "Pièce d'identité : recto"], ['back', "Pièce d'identité : verso"], ['self', 'Selfie en direct']].map(([k, l]) => <View key={k}><Btn alt t={kyc[k] ? l + ' - refaire' : l} onPress={run(async () => { const x = await shot(k, true); if (x) setKyc(o => ({ ...o, [k]: x })); })} />{kyc[k] && <Image source={{ uri: kyc[k].uri }} style={{ width: 90, height: 60, borderRadius: 6, marginBottom: 6 }} />}</View>)}
    <Btn t="Envoyer pour vérification" onPress={run(async () => { if (!kyc.front || !kyc.back || !kyc.self) throw new Error('Prenez les trois photos'); const u = x => uploadBase64(x.b);
      const r = await api('/kyc/submit', 'POST', { id_front_url: await u(kyc.front), id_back_url: await u(kyc.back), selfie_url: await u(kyc.self) }); Alert.alert('Gouvance', r.message); setSec('main'); load(); })} /></>);
  return (<><H>Mon profil</H>
    <Card><View style={{ alignItems: 'center' }}>{p.photo_url ? <Image source={{ uri: fileUrl(p.photo_url) }} style={{ width: 90, height: 90, borderRadius: 45 }} /> : <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#DCE6F2' }} />}
      <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 8 }}>{p.full_name}</Text><Text style={{ color: '#5B6B7F' }}>{p.gouvance_id} - {p.email}</Text><Text style={{ marginTop: 6 }}>J'aime reçus : {p.likes_received} - Abonnés : {p.followers} - Abonnements : {p.following}</Text></View></Card>
    <Btn alt t="Changer ma photo de profil" onPress={run(async () => { const x = await shot('p', false); if (x) { await api('/me/profile', 'PATCH', { photo_url: await uploadBase64(x.b) }); load(); } })} />
    <Btn alt t="Ma carte Gouvance" onPress={() => setSec('card')} />
    <H>Informations</H>
    <Field placeholder={'Bio : ' + (p.bio || '')} onChangeText={set('bio')} /><Field placeholder={'Téléphone : ' + (p.phone || '')} keyboardType="phone-pad" onChangeText={set('phone')} />
    <Field placeholder={'Commune : ' + (p.commune || '')} onChangeText={set('commune')} /><Field placeholder={'Avenue : ' + (p.avenue || '')} onChangeText={set('avenue')} /><Field placeholder={'Quartier : ' + (p.quartier || '')} onChangeText={set('quartier')} />
    <Btn t="Enregistrer" onPress={run(async () => { const b = {}; ['bio', 'phone', 'commune', 'avenue', 'quartier'].forEach(k => { if (d[k]) b[k] = d[k]; }); await api('/me/profile', 'PATCH', b); Alert.alert('Gouvance', 'Profil enregistré'); load(); })} />
    <H>Langue</H><Chips value={lang} onPick={run2 => { setLang(run2); api('/me/lang', 'PATCH', { lang: run2 }).catch(() => {}); }} items={[['fr', 'Français'], ['sw', 'Kiswahili'], ['en', 'English']]} />
    <H>Sécurité</H><Btn alt t="Changer mon code PIN" onPress={() => setSec('pin')} /><Btn alt t="Vérifier mon compte" onPress={() => setSec('verify')} />
    <Btn alt t={bio ? 'Désactiver le verrouillage de l\'application' : 'Activer le verrouillage (empreinte ou code du téléphone)'} onPress={run(async () => {
      if (bio) { await SecureStore.deleteItemAsync('bio'); setBio(false); return; }
      if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) throw new Error('Configurez d\'abord une empreinte ou un code de verrouillage sur votre téléphone');
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirmer' }); if (r.success) { await SecureStore.setItemAsync('bio', '1'); setBio(true); } })} />
    <Btn alt t="Notifications" onPress={run(async () => { setNotes(await api('/me/notifications')); await api('/me/notifications/read', 'POST'); setSec('notes'); })} />
    <Btn alt t="Télécharger l'application" onPress={() => Linking.openURL(APP_URL)} />
    <Btn alt t="À propos de Gouvance" onPress={() => setSec('about')} /><Btn alt t="Politique de confidentialité" onPress={() => setSec('privacy')} />
    <Btn alt t="Retour" onPress={back} /><Btn alt t="Déconnexion" onPress={logout} /></>);
}
