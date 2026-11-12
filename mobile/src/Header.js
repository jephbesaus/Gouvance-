import React, { useRef, useEffect, useState } from 'react';
import { Animated, View, Text, TouchableOpacity, Image } from 'react-native';
import { api } from './api'; import { Icon } from './icons';
export default function Header({ onBell, tick }) {
  const a = useRef(new Animated.Value(0)).current; const [n, setN] = useState(0);
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 2200, useNativeDriver: false }), Animated.timing(a, { toValue: 0, duration: 2200, useNativeDriver: false })])).start();
    api('/me/notifications').then(r => setN(r.filter(x => !x.read).length)).catch(() => {});
  }, []);
  useEffect(() => { api('/me/notifications').then(r => setN(r.filter(x => !x.read).length)).catch(() => {}); }, [tick]);
  const c1 = a.interpolate({ inputRange: [0, 1], outputRange: ['#2E9E3F', '#0B5FC4'] }), c2 = a.interpolate({ inputRange: [0, 1], outputRange: ['#0B5FC4', '#2E9E3F'] });
  return (<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
    <Image source={require('../assets/logo.png')} style={{ width: 38, height: 38 }} />
    <Text style={{ fontSize: 28, fontWeight: '800' }}><Animated.Text style={{ color: c1 }}>Gou</Animated.Text><Animated.Text style={{ color: c2 }}>vance</Animated.Text></Text>
    <TouchableOpacity onPress={onBell} style={{ padding: 6 }}><Icon name="bell" size={26} />
      {n ? <View style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#2E9E3F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{n}</Text></View> : null}</TouchableOpacity></View>);
}
