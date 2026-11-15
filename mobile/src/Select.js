import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Icon } from './icons'; import { C, tr } from './ui';
// Liste de sélection avec recherche ; « Autre » permet de saisir une valeur absente de la liste
export default function Select({ label, value, options = [], onChange, allowOther = true }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [other, setOther] = useState(false);
  const list = options.filter(o => o.toLowerCase().includes(q.toLowerCase()));
  if (other || (!options.length && allowOther)) return <TextInput value={value || ''} onChangeText={onChange} placeholder={tr(label)} placeholderTextColor="#8A99AB" style={{ borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16, color: '#12263F' }} />;
  return (<><TouchableOpacity onPress={() => { setQ(''); setOpen(true); }} style={{ borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
    <Text style={{ flex: 1, fontSize: 16, color: value ? '#12263F' : '#8A99AB' }}>{value || tr(label)}</Text><Icon name="next" size={18} color="#8A99AB" /></TouchableOpacity>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 44 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}><TouchableOpacity onPress={() => setOpen(false)} style={{ padding: 8 }}><Icon name="back" size={26} /></TouchableOpacity><Text style={{ fontSize: 18, fontWeight: '800', color: '#12263F' }}>{tr(label)}</Text></View>
      <TextInput value={q} onChangeText={setQ} placeholder={tr('Rechercher')} placeholderTextColor="#8A99AB" style={{ marginHorizontal: 14, borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 12, padding: 12, fontSize: 16 }} />
      <FlatList data={list} keyExtractor={x => x} renderItem={({ item }) => <TouchableOpacity onPress={() => { onChange(item); setOpen(false); }} style={{ padding: 16, borderBottomWidth: 1, borderColor: '#EEF2F7' }}><Text style={{ fontSize: 16, color: item === value ? C.blue : '#12263F', fontWeight: item === value ? '800' : '400' }}>{item}</Text></TouchableOpacity>}
        ListFooterComponent={allowOther ? <TouchableOpacity onPress={() => { setOpen(false); setOther(true); onChange(''); }} style={{ padding: 16 }}><Text style={{ color: C.blue, fontWeight: '700' }}>{tr('Autre (saisir)')}</Text></TouchableOpacity> : null} /></View></Modal></>);
}
