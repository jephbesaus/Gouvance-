import React, { useState, useEffect } from 'react';
import { Text, Image, View, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadBase64 } from './api'; import { Field, Btn, Paper, H, C, run, tr } from './ui';
// Espace de l'agent Salongo : enregistre la personne présente (ID famille, nom, photo prise sur place) et remet un jeton
export default function Agent() {
  const [ses, setSes] = useState(null); const [d, setD] = useState({}); const [img, setImg] = useState(null); const [tk, setTk] = useState(null);
  useEffect(() => { api('/salongo/sessions').then(l => setSes(l.find(x => !x.closed) || false)).catch(() => {}); }, []);
  if (tk) return (<View><H>Ticket Salongo</H><Paper><Text style={{ color: '#5B6B7F' }}>{tk.family_name}</Text><Text style={{ fontSize: 34, fontWeight: '800', color: C.green, letterSpacing: 2, marginVertical: 8 }}>{tk.token}</Text><Text style={{ color: '#42526B' }}>{tr('Remettez ce jeton à la famille : elle le saisira dans son espace pour valider sa présence.')}</Text></Paper><Btn t="Enregistrer une autre famille" onPress={() => { setTk(null); setD({}); setImg(null); }} /></View>);
  return (<View><H>Espace agent Salongo</H>
    {ses === false && <Text style={{ color: '#B3261E' }}>{tr("Aucune session de Salongo n'est ouverte.")}</Text>}
    {ses && <><Text style={{ color: '#5B6B7F', marginBottom: 8 }}>{tr('Session du')} {new Date(ses.day).toLocaleDateString('fr-FR')}</Text>
      <Field placeholder="ID de la famille (FM...)" autoCapitalize="characters" onChangeText={x => setD(o => ({ ...o, code: x.trim().toUpperCase() }))} /><Field placeholder="Nom de la personne présente" onChangeText={x => setD(o => ({ ...o, name: x }))} />
      <Btn alt t={img ? 'Photo prise - refaire' : 'Prendre la photo de la personne'} onPress={run(async () => { const g = await ImagePicker.requestCameraPermissionsAsync(); if (!g.granted) throw new Error('Autorisez la caméra'); const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 }); if (!r.canceled) setImg(r.assets[0]); })} />
      {img && <Image source={{ uri: img.uri }} style={{ width: 110, height: 140, borderRadius: 10 }} />}
      <Btn t="Enregistrer la présence" onPress={run(async () => { if (!img) throw new Error('Prenez la photo de la personne'); setTk(await api('/salongo/checkin', 'POST', { session_id: ses.id, family_code: d.code, person_name: d.name, photo_url: await uploadBase64(img.base64) })); })} /></>}</View>);
}
