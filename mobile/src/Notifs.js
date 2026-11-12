import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from './api'; import { H, run, tr } from './ui'; import { Icon } from './icons';
const ago = d => { const m = Math.floor((Date.now() - new Date(d)) / 60000); if (m < 1) return "à l'instant"; if (m < 60) return 'il y a ' + m + ' min'; const h = Math.floor(m / 60); return h < 24 ? 'il y a ' + h + ' h' : 'il y a ' + Math.floor(h / 24) + ' j'; };
export default function Notifs({ onOpenChat }) {
  const [items, setItems] = useState(null);
  useEffect(() => { run(async () => { setItems(await api('/me/notifications')); await api('/me/notifications/read', 'POST'); })(); }, []);
  return (<><H>Notifications</H>
    {items && !items.length && <Text style={{ color: '#5B6B7F' }}>{tr('Aucune notification.')}</Text>}
    {(items || []).map(n => { const msg = n.data && n.data.type === 'message';
      return (<TouchableOpacity key={n.id} activeOpacity={msg ? 0.6 : 1} onPress={() => msg && onOpenChat(n.data.from)}
        style={{ flexDirection: 'row', backgroundColor: n.read ? '#F6F8FB' : '#E8F2FF', borderRadius: 18, padding: 14, marginBottom: 10 }}>
        <LinearGradient colors={['#0B5FC4', '#2E9E3F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}><Icon name="bell" size={24} color="#fff" /></LinearGradient>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '800' }}><Text style={{ color: '#2E9E3F' }}>Gou</Text><Text style={{ color: '#0B5FC4' }}>vance</Text></Text>
          <Text style={{ fontWeight: '700', color: '#12263F', marginTop: 2 }}>{n.title}</Text>
          <Text style={{ color: '#42526B', marginTop: 2 }}>{n.body}</Text>
          <Text style={{ color: '#8A99AB', fontSize: 12, marginTop: 4 }}>{ago(n.created_at)}</Text></View></TouchableOpacity>); })}</>);
}
