import React, { useState, useRef } from 'react';
import { Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from './api'; import { Btn, Card, H, C } from './ui';

export default function Scan({ back }) {
  const [perm, ask] = useCameraPermissions(); const [res, setRes] = useState(null); const busy = useRef(false);
  if (!perm) return null;
  if (!perm.granted) return (<><H>Scanner une carte</H><Btn t="Autoriser la caméra" onPress={ask} /><Btn alt t="Retour" onPress={back} /></>);
  const onScan = ({ data }) => {
    if (busy.current) return; busy.current = true; const code = String(data).replace('GVFAM:', '');
    if (!/^G\d{9}\.[a-f0-9]{16}$/.test(code)) return setRes({ message: 'Aucun résultat trouvé' });
    api('/census/verify/' + code).then(setRes).catch(e => setRes({ message: e.message }));
  };
  return (<><H>Scanner une carte</H>
    {!res && <CameraView style={{ height: 340, borderRadius: 14 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />}
    {res && <Card>{res.status ? <><Text style={{ color: C.green, fontWeight: '700', fontSize: 18 }}>Actif</Text><Text>{res.code} - famille {res.family_name}</Text><Text>{res.avenue} / {res.quartier}</Text></> : <Text>{res.message || 'Aucun résultat trouvé'}</Text>}</Card>}
    <Btn t="Scanner à nouveau" onPress={() => { busy.current = false; setRes(null); }} /><Btn alt t="Retour" onPress={back} /></>);
}
