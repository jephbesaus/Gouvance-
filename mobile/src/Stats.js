import React, { useState, useEffect } from 'react';
import { Text, View, Image } from 'react-native';
import { api, fileUrl } from './api'; import { Field, Btn, Card, H, C, run, tr } from './ui';
const M = ({ l, v }) => <View style={{ width: '48%', backgroundColor: '#F4F8FC', borderRadius: 12, padding: 12, marginBottom: 8 }}><Text style={{ color: '#5B6B7F', fontSize: 13 }}>{tr(l)}</Text><Text style={{ fontSize: 24, fontWeight: '700', color: C.blue }}>{v}</Text></View>;
export default function Stats({ back }) {
  const [s, setS] = useState(null); const [pop, setPop] = useState([]); const [people, setPeople] = useState([]); const [q, setQ] = useState('');
  const load = async () => { setS(await api('/stats/summary')); setPop(await api('/stats/population')); setPeople(await api('/stats/people?q=' + encodeURIComponent(q))); };
  useEffect(() => { run(load)(); }, []);
  const byAv = {}; pop.forEach(x => { byAv[x.avenue || 'non précisée'] = byAv[x.avenue || 'non précisée'] || { M: 0, F: 0 }; byAv[x.avenue || 'non précisée'][x.gender || 'M'] += x.total; });
  return (<><H>Statistiques</H>
    {s && <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}><M l="Citoyens inscrits" v={s.citoyens} /><M l="Familles" v={s.familles} /><M l="Hommes" v={s.hommes} /><M l="Femmes" v={s.femmes} /><M l="Enfants recensés" v={s.enfants} /><M l="Décès enregistrés" v={s.decedes} /><M l="Personnes recensées" v={s.personnes_recensees} /><M l="Familles vérifiées" v={s.familles_verifiees} /></View>}
    <H>Par avenue</H>{Object.keys(byAv).map(a => <Card key={a}><Text style={{ fontWeight: '700' }}>{a}</Text><Text>Hommes : {byAv[a].M} - Femmes : {byAv[a].F}</Text></Card>)}
    <H>Personnes</H><Field placeholder="Rechercher un nom" value={q} onChangeText={setQ} /><Btn alt t="Rechercher" onPress={run(load)} />
    {people.map(p => <Card key={p.gouvance_id}><View style={{ flexDirection: 'row', alignItems: 'center' }}>{p.photo_url && <Image source={{ uri: fileUrl(p.photo_url) }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 10 }} />}<View><Text style={{ fontWeight: '700' }}>{p.full_name}</Text><Text>{p.gender === 'F' ? 'Femme' : 'Homme'} - {p.avenue || '-'} / {p.quartier || '-'}</Text></View></View></Card>)}
    <Btn alt t="Retour" onPress={back} /></>);
}
