import React, { useState, useEffect } from 'react';
import { Text, Image, View, Alert, Linking, TouchableOpacity, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; import * as SecureStore from 'expo-secure-store'; import * as LocalAuthentication from 'expo-local-authentication'; import * as Clipboard from 'expo-clipboard';
import { citizenCardPdf } from './cards';
import { api, uploadBase64, fileUrl, APP_URL } from './api';
import { Field, Btn, Paper, H, Chips, C, run, tr } from './ui';
import { CitizenCard } from './CardViews'; import { Icon, Badge } from './icons'; import { useBack } from './back'; import { Avatar } from './Feed';

const ABOUT = "Gouvance est la plateforme numérique de la ville de Bukavu, dédiée au recensement de la population. Elle permet aux citoyens de s'inscrire, de faire recenser leur famille, de payer les frais de recensement et les amendes de Salongo depuis un portefeuille interne, de suivre l'actualité de la ville, de publier sur le marché en ligne (Marketplace) et d'échanger entre habitants. Les bourgmestres, les chefs d'avenue et les chefs de quartier suivent les effectifs de leur zone.";
const PRIV = "Vos données (identité, famille, photos) servent uniquement au recensement et aux services de Gouvance. Elles ne sont jamais vendues. Sont interdits : la fraude, l'usurpation d'identité, les contenus pornographiques, la violence, le harcèlement et toute publication illégale. Tout compte qui enfreint ces règles est bloqué et ses publications sont supprimées par l'administrateur.";
const HELP = "Besoin d'aide ? Contactez l'administration de Gouvance par la messagerie de l'application, ou rendez-vous auprès de votre chef d'avenue.";
const BADGES = "Badge noir : membre de l'administration (administrateur, bourgmestre, chef d'avenue ou de quartier, recenseur).\n\nBadge bleu : citoyen dont l'identité a été vérifiée par l'administration.";

const Group = ({ title, children }) => (<View style={{ marginBottom: 14 }}>{title ? <Text style={{ color: '#8A99AB', fontWeight: '700', marginBottom: 6, marginLeft: 4 }}>{tr(title)}</Text> : null}<View style={{ backgroundColor: '#F6F8FB', borderRadius: 18, paddingHorizontal: 16 }}>{children}</View></View>);
const Row = ({ icon, label, value, onPress, right }) => (<TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.6 : 1} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
  <Icon name={icon} size={22} color="#5B6B7F" /><Text style={{ flex: 1, marginLeft: 14, fontSize: 16, color: '#12263F' }}>{tr(label)}</Text>
  {value ? <Text style={{ color: '#8A99AB', marginRight: 6 }}>{value}</Text> : null}{right || (onPress ? <Icon name="next" size={18} color="#B0BCC9" /> : null)}</TouchableOpacity>);
const Sec = ({ title, children }) => <><H>{title}</H>{children}</>;

export default function Profile({ user, lang, setLang, push, logout }) {
  const [p, setP] = useState(null); const [sec, setSec] = useState('main'); const [d, setD] = useState({}); const [bio, setBio] = useState(false); const [kyc, setKyc] = useState({});
  const roles = user.roles.map(r => r.role); const set = k => v => setD(o => ({ ...o, [k]: v }));
  useBack(sec !== 'main' ? () => setSec('main') : null);
  const load = async () => setP(await api('/me/profile'));
  useEffect(() => { run(load)(); SecureStore.getItemAsync('bio').then(v => setBio(v === '1')); }, []);
  const shot = async (cam) => {
    if (cam) { const g = await ImagePicker.requestCameraPermissionsAsync(); if (!g.granted) throw new Error('Autorisez la caméra'); }
    const f = cam ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync; const r = await f({ base64: true, quality: 0.5 });
    return r.canceled ? null : { uri: r.assets[0].uri, b: r.assets[0].base64 };
  };
  const toggleBio = run(async () => {
    if (bio) { await SecureStore.deleteItemAsync('bio'); setBio(false); return; }
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) throw new Error("Configurez d'abord une empreinte ou un code de verrouillage sur votre téléphone");
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirmer' }); if (r.success) { await SecureStore.setItemAsync('bio', '1'); setBio(true); }
  });
  if (!p) return <Text style={{ color: '#5B6B7F' }}>...</Text>;
  const kycLabel = p.kyc_status === 'verified' ? 'Vérifié' : p.kyc_status === 'review' ? 'En cours' : 'Non vérifié';

  if (sec === 'edit') return (<Sec title="Mes informations">
    <View style={{ alignItems: 'center', marginBottom: 10 }}><Avatar uri={p.photo_url} name={p.full_name} size={92} /></View>
    <Btn alt t="Changer ma photo de profil" onPress={run(async () => { const x = await shot(false); if (x) { await api('/me/profile', 'PATCH', { photo_url: await uploadBase64(x.b) }); load(); } })} />
    <Field placeholder={'Nom complet : ' + p.full_name} onChangeText={set('full_name')} />
    <Field placeholder={'Date de naissance (AAAA-MM-JJ) : ' + (p.birth_date ? String(p.birth_date).slice(0, 10) : '')} onChangeText={set('birth_date')} />
    <Text style={{ color: '#5B6B7F', marginBottom: 4 }}>{tr('Genre')}</Text>
    <Chips value={d.gender || p.gender} onPick={set('gender')} items={[['M', 'Homme'], ['F', 'Femme']]} />
    <Field placeholder={'Téléphone : ' + (p.phone || '')} keyboardType="phone-pad" onChangeText={set('phone')} />
    <Field placeholder={'Commune : ' + (p.commune || '')} onChangeText={set('commune')} />
    <Field placeholder={'Avenue : ' + (p.avenue || '')} onChangeText={set('avenue')} />
    <Field placeholder={'Quartier : ' + (p.quartier || '')} onChangeText={set('quartier')} />
    <Field placeholder={'Bio : ' + (p.bio || '')} onChangeText={set('bio')} />
    <Btn t="Enregistrer" onPress={run(async () => { const b = {}; ['full_name', 'birth_date', 'gender', 'phone', 'commune', 'avenue', 'quartier', 'bio'].forEach(k => { if (d[k]) b[k] = d[k]; }); await api('/me/profile', 'PATCH', b); Alert.alert('Gouvance', tr('Profil enregistré')); setD({}); load(); })} /></Sec>);
  if (sec === 'card') return (<Sec title="Ma carte Gouvance"><CitizenCard p={p} />
    <Btn alt t="Copier mon ID" onPress={run(async () => { await Clipboard.setStringAsync(p.gouvance_id); Alert.alert('Gouvance', tr('ID copié')); })} />
    <Btn t="Télécharger en PDF" onPress={run(() => citizenCardPdf(p))} /></Sec>);
  if (sec === 'about') return <Sec title="À propos de Gouvance"><Text style={{ lineHeight: 23, color: '#12263F' }}>{ABOUT}</Text></Sec>;
  if (sec === 'privacy') return <Sec title="Politique de confidentialité"><Text style={{ lineHeight: 23, color: '#12263F' }}>{PRIV}</Text></Sec>;
  if (sec === 'help') return <Sec title="Aide et support"><Text style={{ lineHeight: 23, color: '#12263F' }}>{HELP}</Text></Sec>;
  if (sec === 'badges') return <Sec title="Badges"><View style={{ flexDirection: 'row', marginBottom: 12 }}><Badge kind="admin" size={34} /><Badge kind="verified" size={34} /></View><Text style={{ lineHeight: 23, color: '#12263F' }}>{BADGES}</Text></Sec>;
  if (sec === 'lang') return <Sec title="Langue"><Chips value={lang} onPick={l => { setLang(l); api('/me/lang', 'PATCH', { lang: l }).catch(() => {}); }} items={[['fr', 'Français'], ['sw', 'Kiswahili'], ['en', 'English']]} /></Sec>;
  if (sec === 'pin') return (<Sec title="Changer mon code PIN"><Field placeholder="Ancien PIN" secureTextEntry keyboardType="number-pad" onChangeText={set('o')} /><Field placeholder="Nouveau PIN (4 à 8 chiffres)" secureTextEntry keyboardType="number-pad" onChangeText={set('n')} />
    <Btn t="Enregistrer" onPress={run(async () => { await api('/auth/change-pin', 'POST', { old_pin: d.o, new_pin: d.n }); Alert.alert('Gouvance', tr('PIN modifié')); setSec('main'); })} /></Sec>);
  if (sec === 'verify') return (<Sec title="Vérifier mon compte"><Text style={{ marginBottom: 8, color: '#5B6B7F' }}>{tr('Statut')} : {tr(kycLabel)}</Text>
    {[['front', "Pièce d'identité : recto"], ['back', "Pièce d'identité : verso"], ['self', 'Selfie en direct']].map(([k, l]) => <View key={k}><Btn alt t={kyc[k] ? l + ' - refaire' : l} onPress={run(async () => { const x = await shot(true); if (x) setKyc(o => ({ ...o, [k]: x })); })} />{kyc[k] && <Image source={{ uri: kyc[k].uri }} style={{ width: 90, height: 60, borderRadius: 6, marginBottom: 6 }} />}</View>)}
    <Btn t="Envoyer pour vérification" onPress={run(async () => { if (!kyc.front || !kyc.back || !kyc.self) throw new Error('Prenez les trois photos'); const u = x => uploadBase64(x.b);
      const r = await api('/kyc/submit', 'POST', { id_front_url: await u(kyc.front), id_back_url: await u(kyc.back), selfie_url: await u(kyc.self) }); Alert.alert('Gouvance', r.message); setSec('main'); load(); })} /></Sec>);

  return (<>
    <TouchableOpacity onPress={() => setSec('edit')} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F8FB', borderRadius: 18, padding: 14, marginBottom: 14 }}>
      <Avatar uri={p.photo_url} name={p.full_name} size={56} />
      <View style={{ flex: 1, marginLeft: 12 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 18, fontWeight: '800', color: '#12263F' }}>{p.full_name}</Text><Badge kind={p.badge} size={19} /></View>
        <Text style={{ color: '#5B6B7F' }}>{p.gouvance_id}</Text><Text style={{ color: '#8A99AB', fontSize: 12 }}>{tr("J'aime reçus")} : {p.likes_received} - {tr('Abonnés')} : {p.followers}</Text></View>
      <Icon name="next" size={20} color="#B0BCC9" /></TouchableOpacity>
    <Group><Row icon="wallet" label="Portefeuille" onPress={() => push('wallet')} /><Row icon="card" label="Ma carte Gouvance" onPress={() => setSec('card')} />
      <Row icon="shield" label="Vérifier mon compte" value={tr(kycLabel)} onPress={() => setSec('verify')} /><Row icon="badge" label="Badges" onPress={() => setSec('badges')} /></Group>
    <Group title="Sécurité"><Row icon="lock" label="Verrouillage par empreinte ou code du téléphone" right={<Switch value={bio} onValueChange={toggleBio} trackColor={{ true: C.green, false: '#D0D7E0' }} thumbColor="#FFFFFF" />} />
      <Row icon="lock" label="Changer mon code PIN" onPress={() => setSec('pin')} /></Group>
    <Group title="Préférences"><Row icon="bell" label="Notifications" onPress={() => push('notifs')} /><Row icon="globe" label="Langue" value={{ fr: 'Français', sw: 'Kiswahili', en: 'English' }[lang]} onPress={() => setSec('lang')} />
      <Row icon="file" label="Politique de confidentialité" onPress={() => setSec('privacy')} /><Row icon="info" label="À propos de Gouvance" onPress={() => setSec('about')} />
      <Row icon="help" label="Aide et support" onPress={() => setSec('help')} /><Row icon="download" label="Télécharger l'application" onPress={() => Linking.openURL(APP_URL)} /></Group>
    {roles.length > 0 && <Group title="Administration">
      {roles.includes('admin') && <Row icon="users" label="Panel administrateur" onPress={() => push('admin')} />}
      {roles.includes('bourgmestre') && <Row icon="chart" label="Panel bourgmestre" onPress={() => push('stats')} />}
      {(roles.includes('chef_avenue') || roles.includes('chef_quartier')) && <Row icon="chart" label={roles.includes('chef_avenue') ? "Panel chef d'avenue" : 'Panel chef de quartier'} onPress={() => push('stats')} />}
      {roles.includes('recenseur') && <Row icon="users" label="Espace recenseur" onPress={() => push('census')} />}</Group>}
    <Group><Row icon="logout" label="Déconnexion" onPress={logout} /></Group></>);
}
