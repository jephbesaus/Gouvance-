import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store'; import * as Clipboard from 'expo-clipboard'; import * as ImagePicker from 'expo-image-picker';
import { api, setToken, uploadBase64 } from './api'; import { Field, Btn, Chips, run, tr, C } from './ui'; import Select from './Select'; import { PROVINCES, VILLES, COMMUNES, QUARTIERS } from './geo';

const Title = ({ children }) => <Text style={{ fontSize: 24, fontWeight: '800', color: '#12263F', marginBottom: 6 }}>{tr(children)}</Text>;
const Sub = ({ children }) => <Text style={{ color: '#5B6B7F', marginBottom: 16, lineHeight: 21 }}>{tr(children)}</Text>;
const Link = ({ t, onPress }) => <TouchableOpacity onPress={onPress} style={{ marginTop: 16, alignItems: 'center' }}><Text style={{ color: C.blue, fontWeight: '700' }}>{tr(t)}</Text></TouchableOpacity>;
function Dots() { const [n, setN] = useState(1); useEffect(() => { const t = setInterval(() => setN(x => (x % 3) + 1), 350); return () => clearInterval(t); }, []); return <Text style={{ fontSize: 44, color: C.blue, letterSpacing: 6, textAlign: 'center' }}>{'•'.repeat(n)}</Text>; }
// Bandeau compact : petite barre dégradée, logo, nom et message
const Hero = () => (<View style={{ alignItems: 'center', paddingTop: 54, paddingBottom: 10 }}>
  <LinearGradient colors={['#2E9E3F', '#0B5FC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8 }} />
  <Image source={require('../assets/logo.png')} style={{ width: 72, height: 72 }} />
  <Text style={{ fontSize: 30, fontWeight: '800', marginTop: 6 }}><Text style={{ color: '#2E9E3F' }}>Gou</Text><Text style={{ color: '#0B5FC4' }}>vance</Text></Text>
  <Text style={{ color: '#5B6B7F', marginTop: 2 }}>{tr('La communauté numérique de Gouvance')}</Text></View>);

export default function Auth({ onLogin, lang, setLang }) {
  const [mode, setMode] = useState('login'); const [f, setF] = useState({}); const [cred, setCred] = useState(null); const [cap, setCap] = useState(null); const [step, setStep] = useState(0); const [avs, setAvs] = useState([]);
  const set = k => v => setF(o => ({ ...o, [k]: v }));
  const loadCap = async () => setCap(await api('/auth/captcha'));
  const villes = VILLES[f.province] || []; const communes = COMMUNES[f.ville] || []; const quartiers = QUARTIERS[f.ville + '|' + f.commune] || [];
  useEffect(() => { if (mode === 'onboard' && step === 1 && f.commune) api('/geo/avenues?commune=' + encodeURIComponent(f.commune) + '&quartier=' + encodeURIComponent(f.quartier || '')).then(setAvs).catch(() => {}); }, [mode, step, f.commune, f.quartier]);
  let body = null;
  if (mode === 'login') body = (<><Title>Bienvenue</Title><Sub>Connectez-vous avec votre code ID et votre code PIN.</Sub>
    <Field placeholder="Code ID" value={f.gouvance_id || ''} autoCapitalize="characters" onChangeText={set('gouvance_id')} /><Field placeholder="Code PIN" value={f.pin || ''} secureTextEntry keyboardType="number-pad" onChangeText={set('pin')} />
    <Btn t="Se connecter" onPress={run(async () => onLogin(await api('/auth/login', 'POST', { gouvance_id: (f.gouvance_id || '').trim().toUpperCase(), pin: f.pin, space: 'citizen' })))} />
    <Link t="Pas encore de compte ? S'inscrire" onPress={() => setMode('register')} /></>);
  if (mode === 'register') body = (<><Title>Créer un compte</Title><Sub>Indiquez votre nom et votre adresse Gmail. Un code de vérification vous sera envoyé par email.</Sub>
    <Field placeholder="Nom complet" onChangeText={set('full_name')} /><Field placeholder="Adresse Gmail" keyboardType="email-address" onChangeText={set('email')} />
    <Btn t="Continuer" onPress={run(async () => { await api('/auth/register', 'POST', { full_name: f.full_name, email: f.email }); setMode('verify'); })} /><Link t="J'ai déjà un compte" onPress={() => setMode('login')} /></>);
  if (mode === 'verify') body = (<><Title>Code de vérification</Title><Sub>Saisissez le code à 6 chiffres reçu par email.</Sub>
    <Field placeholder="000000" keyboardType="number-pad" maxLength={6} onChangeText={set('code')} />
    <Btn t="Vérifier" onPress={run(async () => { const r = await api('/auth/verify-email', 'POST', { email: f.email, code: f.code }); set('reg')(r.reg_token); await loadCap(); setMode('password'); })} />
    <Link t="Renvoyer le code" onPress={run(async () => { await api('/auth/register', 'POST', { full_name: f.full_name, email: f.email }); Alert.alert('Gouvance', tr('Un nouveau code a été envoyé.')); })} /><Link t="Modifier mon adresse email" onPress={() => setMode('register')} /></>);
  if (mode === 'password') body = (<><Title>Sécurisez votre compte</Title><Sub>Choisissez un mot de passe et confirmez que vous n'êtes pas un robot.</Sub>
    <Field placeholder="Mot de passe" secureTextEntry onChangeText={set('password')} /><Field placeholder="Confirmer le mot de passe" secureTextEntry onChangeText={set('password2')} />
    <View style={{ backgroundColor: '#F6F8FB', borderRadius: 14, padding: 14, marginBottom: 12 }}><Text style={{ color: '#5B6B7F', marginBottom: 6 }}>{tr('Je ne suis pas un robot')}</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#12263F', marginBottom: 8 }}>{cap ? cap.question : '...'}</Text><Field placeholder="Votre réponse" keyboardType="number-pad" onChangeText={set('answer')} />
      <TouchableOpacity onPress={run(loadCap)}><Text style={{ color: C.blue, fontWeight: '700' }}>{tr('Autre question')}</Text></TouchableOpacity></View>
    <Btn t="Continuer" onPress={run(async () => {
      if (f.password !== f.password2) throw new Error('Les mots de passe ne sont pas identiques');
      setMode('creating'); const t0 = Date.now();
      try { const r = await api('/auth/complete', 'POST', { reg_token: f.reg, password: f.password, captcha: { ts: cap.ts, sig: cap.sig, answer: f.answer } });
        await new Promise(res => setTimeout(res, Math.max(0, 2200 - (Date.now() - t0)))); setCred(r); setMode('creds'); } catch (e) { setMode('password'); await loadCap(); throw e; } })} /></>);
  if (mode === 'creating') body = <View style={{ marginTop: 30 }}><Title>Création de votre compte</Title><Sub>Génération de vos identifiants...</Sub><Dots /></View>;
  if (mode === 'creds' && cred) body = (<><Title>Félicitations !</Title><Sub>Votre compte est prêt. Voici vos identifiants de connexion :</Sub>
    <View style={{ borderWidth: 2, borderColor: C.blue, borderRadius: 18, padding: 16, backgroundColor: '#fff' }}>
      {[['Code ID', cred.gouvance_id], ['Code PIN', cred.pin]].map(([l, v]) => (<View key={l} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}><View style={{ flex: 1 }}><Text style={{ color: '#5B6B7F', fontSize: 12 }}>{tr(l)}</Text><Text style={{ fontSize: 24, fontWeight: '800', color: '#12263F', letterSpacing: 1 }}>{v}</Text></View>
        <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(String(v)); Alert.alert('Gouvance', tr(l) + ' ' + tr('copié')); }} style={{ backgroundColor: '#EAF2FC', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 }}><Text style={{ color: C.blue, fontWeight: '700' }}>{tr('Copier')}</Text></TouchableOpacity></View>))}</View>
    <Text style={{ color: '#5B6B7F', marginTop: 10 }}>{tr('Conservez ces codes. Vous pourrez modifier votre code PIN dans votre profil.')}</Text>
    <Btn t="Continuer" onPress={() => { setToken(cred.token); setStep(0); setMode('onboard'); }} /></>);
  if (mode === 'onboard') body = step === 0 ? (<><Title>Quel est votre genre ?</Title><Sub>Cette information reste dans votre profil.</Sub>
      <Chips value={f.gender} onPick={set('gender')} items={[['F', 'Femme'], ['M', 'Masculin'], ['X', 'Personnalisé']]} /><Btn t="Continuer" onPress={() => { if (!f.gender) return Alert.alert('Gouvance', tr('Choisissez une option')); setStep(1); }} /></>)
    : step === 1 ? (<><Title>Où habitez-vous ?</Title><Sub>Sélectionnez votre province, votre ville, votre commune et votre quartier, puis tapez votre avenue.</Sub>
      <Select label="Province" value={f.province} options={PROVINCES} allowOther={false} onChange={v => setF(o => ({ ...o, province: v, ville: '', commune: '', quartier: '' }))} />
      <Select label="Ville" value={f.ville} options={villes} onChange={v => setF(o => ({ ...o, ville: v, commune: '', quartier: '' }))} />
      <Select label="Commune" value={f.commune} options={communes} onChange={v => setF(o => ({ ...o, commune: v, quartier: '' }))} />
      <Select label="Quartier" value={f.quartier} options={quartiers} onChange={set('quartier')} />
      <Field placeholder="Tapez le nom de votre avenue" value={f.avenue || ''} onChangeText={set('avenue')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{avs.filter(a => a.toLowerCase().includes((f.avenue || '').toLowerCase())).slice(0, 8).map(a => <TouchableOpacity key={a} onPress={() => set('avenue')(a)} style={{ backgroundColor: '#EAF2FC', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, margin: 3 }}><Text style={{ color: C.blue }}>{a}</Text></TouchableOpacity>)}</View>
      <Btn t="Continuer" onPress={() => { if (!f.province || !f.ville || !f.commune || !f.quartier || !(f.avenue || '').trim()) return Alert.alert('Gouvance', tr('Complétez tous les champs')); setStep(2); }} /></>)
    : (<><Title>Votre photo de profil</Title><Sub>Prenez un selfie ou choisissez une photo.</Sub>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>{f.photo ? <Image source={{ uri: f.photo.uri }} style={{ width: 130, height: 130, borderRadius: 65 }} /> : <View style={{ width: 130, height: 130, borderRadius: 65, backgroundColor: '#DCE6F2' }} />}</View>
      <Btn alt t="Prendre un selfie" onPress={run(async () => { const g = await ImagePicker.requestCameraPermissionsAsync(); if (!g.granted) throw new Error('Autorisez la caméra'); const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, cameraType: ImagePicker.CameraType.front }); if (!r.canceled) set('photo')(r.assets[0]); })} />
      <Btn alt t="Choisir dans la galerie" onPress={run(async () => { const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, mediaTypes: ImagePicker.MediaTypeOptions.Images }); if (!r.canceled) set('photo')(r.assets[0]); })} />
      <Btn t="Terminer" onPress={run(async () => { if (!f.photo) throw new Error('Ajoutez votre photo de profil'); const photo_url = await uploadBase64(f.photo.base64);
        const b = { province: f.province, ville: f.ville, commune: f.commune, quartier: f.quartier, avenue: f.avenue.trim(), photo_url }; if (f.gender === 'M' || f.gender === 'F') b.gender = f.gender;
        await api('/me/profile', 'PATCH', b); onLogin(cred); })} /></>);
  return (<ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled"><Hero />
    <View style={{ padding: 24, flex: 1 }}>{body}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>{['fr', 'sw', 'en'].map(l => <TouchableOpacity key={l} onPress={() => setLang(l)}><Text style={{ marginHorizontal: 12, color: lang === l ? C.blue : '#8A99AB', fontWeight: lang === l ? '800' : '400' }}>{l.toUpperCase()}</Text></TouchableOpacity>)}</View>
    <View style={{ alignItems: 'center', paddingBottom: 20 }}><Text style={{ color: '#8A99AB', fontSize: 12 }}>From</Text><Image source={require('../assets/nexti-gib.png')} style={{ width: 100, height: 60 }} resizeMode="contain" /></View></ScrollView>);
}
