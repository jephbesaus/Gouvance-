import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Text, View, Image } from 'react-native';
import { WebView } from 'react-native-webview'; import * as Location from 'expo-location';
import { api, API, fileUrl } from './api'; import { Field, Btn, Card, H, Chips, C, run } from './ui';

// Carte OpenStreetMap (Leaflet) : plan ou satellite, zoom sur rues et maisons, sans clé payante.
const page = cs => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>html,body,#m{height:100%;margin:0}</style></head><body><div id="m"></div><script>
var cs=${JSON.stringify(cs)};var map=L.map('m').setView([-2.5083,28.8608],13);
var plan=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'OpenStreetMap'});
var sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri'});
plan.addTo(map);window.setLayer=function(s){map.removeLayer(plan);map.removeLayer(sat);(s=='sat'?sat:plan).addTo(map)};
cs.forEach(function(c){L.marker([c.lat,c.lng]).addTo(map).bindTooltip(c.name,{permanent:true}).on('click',function(){window.ReactNativeWebView.postMessage(String(c.id))})});
var me;window.setMe=function(a,b){if(me)map.removeLayer(me);me=L.circleMarker([a,b],{radius:8}).addTo(map);map.setView([a,b],17)};
window.goTo=function(a,b){map.setView([a,b],15)};true;</script></body></html>`;

export default function MapScreen({ user, back }) {
  const [cs, setCs] = useState(null); const [sel, setSel] = useState(null); const [places, setPlaces] = useState([]); const [people, setPeople] = useState([]); const [q, setQ] = useState(''); const [sat, setSat] = useState(false); const [np, setNp] = useState({ kind: 'quartier' });
  const web = useRef(null); const canEdit = user.roles.some(r => r.role === 'admin' || r.role === 'bourgmestre');
  useEffect(() => { run(async () => setCs(await api('/geo/communes')))(); }, []);
  const html = useMemo(() => cs && page(cs), [cs]);
  const pick = async id => { const c = cs.find(x => x.id === +id); if (!c) return; setSel(c); web.current && web.current.injectJavaScript(`goTo(${c.lat},${c.lng});true;`); setPlaces(await api('/geo/communes/' + c.id + '/places')); setPeople(await api('/geo/communes/' + c.id + '/people')); };
  const search = async () => setPeople(await api('/geo/communes/' + sel.id + '/people?q=' + encodeURIComponent(q)));
  if (!cs) return <Text>...</Text>;
  return (<><H>Carte de Bukavu</H>
    <View style={{ height: 320, borderRadius: 14, overflow: 'hidden' }}>
      <WebView ref={web} originWhitelist={['*']} source={{ html, baseUrl: API }} onMessage={e => run(() => pick(e.nativeEvent.data))()} javaScriptEnabled />
    </View>
    <View style={{ flexDirection: 'row' }}>
      <View style={{ flex: 1, marginRight: 6 }}><Btn alt t={sat ? 'Vue plan' : 'Vue satellite'} onPress={() => { const n = !sat; setSat(n); web.current.injectJavaScript(`setLayer('${n ? 'sat' : 'plan'}');true;`); }} /></View>
      <View style={{ flex: 1 }}><Btn alt t="Ma position" onPress={run(async () => { const p = await Location.requestForegroundPermissionsAsync(); if (!p.granted) throw new Error('Autorisez la localisation'); const l = await Location.getCurrentPositionAsync({}); web.current.injectJavaScript(`setMe(${l.coords.latitude},${l.coords.longitude});true;`); })} /></View>
    </View>
    <H>Communes</H>
    {cs.map(c => <Card key={c.id}><Text style={{ fontWeight: '700' }}>Commune de {c.name}</Text><Text>{c.habitants} habitant(s) inscrit(s)</Text><Btn alt t="Voir la commune" onPress={run(() => pick(c.id))} /></Card>)}
    {sel && <><H>{sel.name}</H>
      {places.map(p => <Text key={p.id} style={{ marginBottom: 4 }}>{p.kind === 'avenue' ? 'Avenue' : 'Quartier'} : {p.name}</Text>)}
      {!places.length && <Text>Aucun quartier ni avenue enregistré.</Text>}
      {canEdit && <><Field placeholder="Nom du quartier ou de l'avenue" onChangeText={x => setNp(o => ({ ...o, name: x }))} />
        <Chips value={np.kind} onPick={k => setNp(o => ({ ...o, kind: k }))} items={[['quartier', 'Quartier'], ['avenue', 'Avenue']]} />
        <Btn t="Ajouter" onPress={run(async () => { await api('/geo/places', 'POST', { commune_id: sel.id, name: np.name, kind: np.kind }); setPlaces(await api('/geo/communes/' + sel.id + '/places')); })} /></>}
      <H>Habitants</H><Field placeholder="Rechercher un nom" value={q} onChangeText={setQ} /><Btn alt t="Rechercher" onPress={run(search)} />
      {people.map(p => <Card key={p.gouvance_id}><View style={{ flexDirection: 'row', alignItems: 'center' }}>{p.photo_url && <Image source={{ uri: fileUrl(p.photo_url) }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />}<View><Text style={{ fontWeight: '700' }}>{p.full_name}</Text><Text>{p.avenue || ''}</Text></View></View></Card>)}</>}
    <Btn alt t="Retour" onPress={back} /></>);
}
