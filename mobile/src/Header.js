import React, { useRef, useEffect, useState } from 'react';
import { Animated, View, Text, TouchableOpacity } from 'react-native';
import { api } from './api';
export default function Header({ onMenu, onBell }) {
  const a = useRef(new Animated.Value(0)).current; const [n, setN] = useState(0);
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 2200, useNativeDriver: false }), Animated.timing(a, { toValue: 0, duration: 2200, useNativeDriver: false })])).start();
    api('/me/notifications').then(r => setN(r.filter(x => !x.read).length)).catch(() => {});
  }, []);
  const c1 = a.interpolate({ inputRange: [0, 1], outputRange: ['#2E9E3F', '#0B5FC4'] }), c2 = a.interpolate({ inputRange: [0, 1], outputRange: ['#0B5FC4', '#2E9E3F'] });
  return (<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
    <TouchableOpacity onPress={onMenu} style={{ padding: 8 }}><Text style={{ fontSize: 28, color: '#12263F' }}>≡</Text></TouchableOpacity>
    <Text style={{ fontSize: 30, fontWeight: '800' }}><Animated.Text style={{ color: c1 }}>Gou</Animated.Text><Animated.Text style={{ color: c2 }}>vance</Animated.Text></Text>
    <TouchableOpacity onPress={onBell} style={{ padding: 8 }}><Text style={{ fontSize: 14, color: '#0B5FC4' }}>Alertes{n ? ' (' + n + ')' : ''}</Text></TouchableOpacity></View>);
}
