import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store'; import * as Clipboard from 'expo-clipboard';
import { api, setToken } from './api'; import { Field, Btn, run, tr, C } from './ui';

function Hero() {
  return (<LinearGradient colors={['#2E9E3F', '#0B5FC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: 64, paddingBottom: 44, alignItems: 'center', borderBottomLeftRadius: 38, borderBottomRightRadius: 38 }}>
    <Image source={require('../assets/logo.png')} style={{ width: 96, height: 96 }} />
    <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 10 }}>Gouvance</Text>
    <Text style={{ color: '#EAF6EE', marginTop: 4 }}>{tr('La communauté numérique de Bukavu')}</Text></LinearGradient>);
}
const Title = ({ children }) => <Text style={{ fontSize: 24, fontWeight: '800', color: '#12263F', marginBottom: 6 }}>{tr(children)}</Text>;
const Sub = ({ children }) => <Text style={{ color: '#5B6B7F', marginBottom: 16, lineHeight: 21 }}>{tr(children)}</Text>;
const Link = ({ t, onPress }) => <TouchableOpacity onPress={onPress} style={{ marginTop: 16, alignItems: 'center' }}><Text style={{ color: C.blue, fontWeight: '700' }}>{tr(t)}</Text></TouchableOpacity>;

export default function Auth({ onLogin, lang, setLang }) {
  const [mode, setMode] = useState('boot'); const [f, setF] = useState({}); const [cred, setCred] = useState(null);
  const set = k => v => setF(o => ({ ...o, [k]: v }));
  useEffect(() => { SecureStore.getItemAsync('pend').then(p => setMode(p ? 'pending' : 'login')); }, []);
  // Tant que la demande est en attente, on interroge le serveur (même si l'application a été fermée entre-temps)
  const check = async () => {
    try {
      const p = await SecureStore.getItemAsync('pend'); if (!p) return; setToken(p);
      const r = await api('/auth/pending-status');
      if (r.status === 'approved') { setCred(r); setMode('approved'); }
      else if (r.status === 'active') { setF(o => ({ ...o, gouvance_id: r.gouvance_id })); setMode('login'); }
      else if (r.status === 'blocked') { await SecureStore.deleteItemAsync('pend'); Alert.alert('Gouvance', tr("Ce compte est bloqué. Contactez l'administration.")); setMode('login'); }
    } catch (e) { if (/expir|introuvable/i.test(e.message)) { await SecureStore.deleteItemAsync('pend'); setMode('register'); } }
  };
  useEffect(() => { if (mode !== 'pending') return undefined; check(); const id = setInterval(check, 15000); return () => clearInterval(id); }, [mode]);

  let body = null;
  if (mode === 'login') body = (<>
    <Title>Bienvenue</Title><Sub>Connectez-vous avec votre code ID et votre code PIN.</Sub>
    <Field placeholder="Code ID" value={f.gouvance_id || ''} autoCapitalize="characters" onChangeText={set('gouvance_id')} />
    <Field placeholder="Code PIN" value={f.pin || ''} secureTextEntry keyboardType="number-pad" onChangeText={set('pin')} />
    <Btn t="Se connecter" onPress={run(async () => { const r = await api('/auth/login', 'POST', { gouvance_id: (f.gouvance_id || '').trim().toUpperCase(), pin: f.pin, space: 'citizen' }); await SecureStore.deleteItemAsync('pend'); onLogin(r); })} />
    <Link t="Pas encore de compte ? S'inscrire" onPress={() => setMode('register')} /></>);
  if (mode === 'register') body = (<>
    <Title>Créer un compte</Title><Sub>Indiquez votre nom et votre adresse Gmail. Un code de vérification vous sera envoyé par email.</Sub>
    <Field placeholder="Nom complet" onChangeText={set('full_name')} />
    <Field placeholder="Adresse Gmail" keyboardType="email-address" onChangeText={set('email')} />
    <Btn t="Continuer" onPress={run(async () => { await api('/auth/register', 'POST', { full_name: f.full_name, email: f.email }); setMode('verify'); })} />
    <Link t="J'ai déjà un compte" onPress={() => setMode('login')} /></>);
  if (mode === 'verify') body = (<>
    <Title>Code de vérification</Title><Sub>Saisissez le code à 6 chiffres reçu par email.</Sub>
    <Field placeholder="000000" keyboardType="number-pad" maxLength={6} onChangeText={set('code')} />
    <Btn t="Vérifier" onPress={run(async () => {
      const r = await api('/auth/verify-email', 'POST', { email: f.email, code: f.code });
      if (r.pending_token) await SecureStore.setItemAsync('pend', r.pending_token);
      if (r.status === 'active') { setCred(r); setMode('approved'); } else setMode('pending'); })} />
    <Link t="Renvoyer le code" onPress={run(async () => { await api('/auth/register', 'POST', { full_name: f.full_name, email: f.email }); Alert.alert('Gouvance', tr('Un nouveau code a été envoyé.')); })} />
    <Link t="Modifier mon adresse email" onPress={() => setMode('register')} /></>);
  if (mode === 'pending') body = (<>
    <Title>Demande envoyée</Title>
    <Sub>Votre compte est en attente d'approbation par l'administrateur. Vous pouvez fermer l'application : vos identifiants s'afficheront ici dès que votre compte sera approuvé.</Sub>
    <View style={{ alignItems: 'center', marginVertical: 14 }}><ActivityIndicator size="large" color={C.blue} /></View>
    <Btn alt t="Actualiser" onPress={run(check)} />
    <Link t="J'ai déjà mes identifiants" onPress={() => setMode('login')} /></>);
  if (mode === 'approved' && cred) body = (<>
    <Title>Félicitations !</Title><Sub>Votre compte a été approuvé. Voici vos identifiants de connexion :</Sub>
    <View style={{ borderWidth: 2, borderColor: C.blue, borderRadius: 18, padding: 16, backgroundColor: '#fff' }}>
      {[['Code ID', cred.gouvance_id], ['Code PIN', cred.pin]].map(([l, v]) => (<View key={l} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flex: 1 }}><Text style={{ color: '#5B6B7F', fontSize: 12 }}>{tr(l)}</Text><Text style={{ fontSize: 24, fontWeight: '800', color: '#12263F', letterSpacing: 1 }}>{v}</Text></View>
        <TouchableOpacity onPress={async () => { await Clipboard.setStringAsync(String(v)); Alert.alert('Gouvance', tr(l) + ' ' + tr('copié')); }} style={{ backgroundColor: '#EAF2FC', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 }}><Text style={{ color: C.blue, fontWeight: '700' }}>{tr('Copier')}</Text></TouchableOpacity></View>))}</View>
    <Text style={{ color: '#5B6B7F', marginTop: 10 }}>{tr('Conservez ces codes. Vous pourrez modifier votre code PIN dans votre profil.')}</Text>
    <Btn t="Continuer" onPress={() => { setF({ gouvance_id: cred.gouvance_id, pin: cred.pin }); setMode('login'); }} /></>);
  if (mode === 'boot') body = <View style={{ alignItems: 'center', marginTop: 40 }}><ActivityIndicator color={C.blue} /></View>;

  return (<ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
    <Hero />
    <View style={{ padding: 24, flex: 1 }}>{body}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 6 }}>{['fr', 'sw', 'en'].map(l => <TouchableOpacity key={l} onPress={() => setLang(l)}><Text style={{ marginHorizontal: 12, color: lang === l ? C.blue : '#8A99AB', fontWeight: lang === l ? '800' : '400' }}>{l.toUpperCase()}</Text></TouchableOpacity>)}</View>
    <View style={{ alignItems: 'center', paddingBottom: 24 }}><Text style={{ color: '#8A99AB', fontSize: 12 }}>From</Text><Image source={require('../assets/nexti-gib.png')} style={{ width: 110, height: 66 }} resizeMode="contain" /></View></ScrollView>);
}
