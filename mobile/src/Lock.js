import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Btn } from './ui';
export default function Lock({ onOk }) {
  const go = async () => { const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Déverrouiller Gouvance' }); if (r.success) onOk(); };
  useEffect(() => { go(); }, []);
  return (<View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 30 }}>
    <Text style={{ fontSize: 30, fontWeight: '800', textAlign: 'center', color: '#0B5FC4', marginBottom: 20 }}>Gouvance</Text><Btn t="Déverrouiller" onPress={go} /></View>);
}
