import React from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet, Alert } from 'react-native';
import { tr } from './translate'; export { tr };
export const C = { green: '#2E9E3F', blue: '#0B5FC4', ink: '#12263F', line: '#D9E2EC' };
export const Field = p => <TextInput placeholderTextColor="#8A99AB" autoCapitalize="none" style={u.input} {...p} placeholder={tr(p.placeholder)} />;
export const Btn = ({ t, onPress, alt }) => <TouchableOpacity onPress={onPress} style={[u.btn, alt && u.alt]}><Text style={[u.bt, alt && { color: C.blue }]}>{tr(t)}</Text></TouchableOpacity>;
export const Card = ({ children }) => <View style={u.card}>{children}</View>;
export const Paper = ({ children }) => <View style={{ backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.blue, borderRadius: 16, padding: 16, marginVertical: 10 }}>{children}</View>;
export const H = ({ children }) => <Text style={u.h}>{typeof children === 'string' ? tr(children) : children}</Text>;
export const Chips = ({ items, value, onPick }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{items.map(([k, l]) => <TouchableOpacity key={k} onPress={() => onPick(k)} style={[u.chip, value === k && u.on]}><Text style={value === k && { color: '#fff' }}>{tr(l)}</Text></TouchableOpacity>)}</View>;
export const run = fn => async () => { try { await fn(); } catch (e) { Alert.alert('Gouvance', tr(e.message)); } };
const u = StyleSheet.create({ input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16, color: C.ink },
 btn: { backgroundColor: C.blue, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 }, alt: { backgroundColor: '#EAF2FC' }, bt: { color: '#fff', fontWeight: '700', fontSize: 16 },
 card: { backgroundColor: '#F4F8FC', borderRadius: 14, padding: 16, marginVertical: 10 }, h: { fontSize: 20, fontWeight: '700', color: C.ink, marginVertical: 12 },
 chip: { borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, margin: 4 }, on: { backgroundColor: C.green, borderColor: C.green } });
