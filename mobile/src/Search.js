import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { api } from './api'; import { Field, Btn, H, run } from './ui'; import { Badge } from './icons'; import { Avatar } from './Feed';
export default function Search({ onChat }) {
  const [q, setQ] = useState(''); const [res, setRes] = useState(null);
  const go = run(async () => setRes(await api('/people?q=' + encodeURIComponent(q))));
  return (<View style={{ paddingHorizontal: 16 }}><H>Recherche</H>
    <Field placeholder="Rechercher un nom ou un ID Gouvance" value={q} onChangeText={setQ} onSubmitEditing={go} returnKeyType="search" />
    <Btn t="Rechercher" onPress={go} />
    {res && !res.length && <Text style={{ marginTop: 12, color: '#5B6B7F' }}>Aucun résultat trouvé</Text>}
    {(res || []).map(u => (<View key={u.gouvance_id} style={{ backgroundColor: '#F6F8FB', borderRadius: 16, padding: 14, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar uri={u.photo_url} name={u.full_name} size={46} />
        <View style={{ marginLeft: 12, flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontWeight: '700', fontSize: 16 }}>{u.full_name}</Text><Badge kind={u.badge} size={17} /></View>
          <Text style={{ color: '#5B6B7F' }}>{u.bio || u.gouvance_id}</Text></View></View>
      <Btn t="Écrire" onPress={() => onChat(u.gouvance_id)} />
      <Btn alt t="Suivre / ne plus suivre" onPress={run(async () => { const r = await api('/me/follow', 'POST', { gouvance_id: u.gouvance_id }); Alert.alert('Gouvance', r.following ? 'Vous suivez cette personne.' : 'Vous ne suivez plus cette personne.'); })} /></View>))}</View>);
}
