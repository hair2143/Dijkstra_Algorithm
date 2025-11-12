// map.js - Real-World Map Mode (Leaflet + Dijkstra)

// More comprehensive Chennai-ish nodes for routing (approx coordinates)
const MAP_NODES = [
  { id: 0, name: 'Chennai Central', lat: 13.0827, lng: 80.2707 },
  { id: 1, name: 'Chennai Airport', lat: 12.9941, lng: 80.1709 },
  { id: 2, name: 'Guindy', lat: 13.0187, lng: 80.2140 },
  { id: 3, name: 'VIT Chennai', lat: 12.9886, lng: 80.2150 },
  { id: 4, name: 'Anna Nagar', lat: 13.0828, lng: 80.2060 },
  { id: 5, name: 'Adyar', lat: 13.0100, lng: 80.2620 },
  { id: 6, name: 'T. Nagar', lat: 13.0410, lng: 80.2359 },
  { id: 7, name: 'Nungambakkam', lat: 13.0678, lng: 80.2382 },
  { id: 8, name: 'Velachery', lat: 12.9869, lng: 80.2269 },
  { id: 9, name: 'Tambaram', lat: 12.9192, lng: 80.1270 },
  { id: 10, name: 'Mount Road', lat: 13.0800, lng: 80.2700 },
  { id: 11, name: 'Medavakkam', lat: 12.9600, lng: 80.2060 }
];

let map, nodeMarkers = [], routeLayer = null;

function haversineKm(a, b){
  const R = 6371; // km
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat/2), sinDLon = Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon), Math.sqrt(1 - (sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon)));
  return R * c;
}

// Build adjacency list connecting nearby nodes (threshold km)
function buildEdges(thresholdKm = 18){
  const edges = [];
  for(let i=0;i<MAP_NODES.length;i++){
    for(let j=i+1;j<MAP_NODES.length;j++){
      const a = MAP_NODES[i], b = MAP_NODES[j];
      const d = haversineKm(a, b);
      if(d <= thresholdKm){
        // use a small multiplier to simulate road vs straight-line
        const w = Math.round(d * 1000) / 1000; // km precision
        edges.push({ a: a.id, b: b.id, weight: w });
      }
    }
  }
  return edges;
}

// Manual road graph with approximate road distances (km) connecting major Chennai locations.
// Bidirectional roads: add both directions as edges (Dijkstra uses undirected edges).
function buildManualEdges(){
  // helper to resolve id by name (case-insensitive)
  const idFor = name => {
    const n = MAP_NODES.find(x => x.name.toLowerCase() === name.toLowerCase());
    return n ? n.id : null;
  };

  // list of undirected connections with approximate distances (km)
  const connections = [
    ['Anna Nagar','Nungambakkam',4],
    ['Nungambakkam','T. Nagar',3.5],
    ['T. Nagar','Guindy',5],
    ['Guindy','Adyar',6],
    ['Adyar','Velachery',6],
    ['Velachery','VIT Chennai',6],
    ['Velachery','Tambaram',10],
    ['Tambaram','VIT Chennai',12],
    ['Guindy','Chennai Airport',12],
    ['Chennai Central','Mount Road',1.5],
    ['Mount Road','Nungambakkam',3],
    ['Nungambakkam','Guindy',8],
    ['Tambaram','Medavakkam',8],
    ['Medavakkam','VIT Chennai',10],
    ['T. Nagar','Anna Nagar',6],
    ['Anna Nagar','Chennai Central',6]
  ];

  const edges = [];
  connections.forEach(c => {
    const aId = idFor(c[0]); const bId = idFor(c[1]); const w = c[2];
    if(aId !== null && bId !== null){
      edges.push({ a: aId, b: bId, weight: w });
    }
  });
  return edges;
}

// Dijkstra implementation returning path (list of node ids) and distance (km)
function dijkstra(nodes, edges, startId, endId){
  const n = nodes.length;
  const adj = {};
  nodes.forEach(nd=> adj[nd.id] = []);
  edges.forEach(e=>{ adj[e.a].push({ to: e.b, w: e.weight }); adj[e.b].push({ to: e.a, w: e.weight }); });

  const dist = {}; const prev = {};
  nodes.forEach(nd=>{ dist[nd.id] = Infinity; prev[nd.id] = null; });
  dist[startId] = 0;
  const visited = new Set();

  while(true){
    // select unvisited node with smallest dist
    let u = null; let best = Infinity;
    for(const id in dist){ if(!visited.has(Number(id)) && dist[id] < best){ best = dist[id]; u = Number(id); } }
    if(u === null) break;
    if(u === endId) break; // found
    visited.add(u);
    adj[u].forEach(edge => {
      const v = edge.to; const w = edge.w;
      // relax edge
      if(dist[u] + w < dist[v]){
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    });
  }

  // Build path by backtracking
  const path = [];
  if(dist[endId] === Infinity) return { path: [], distance: Infinity, prev, dist };
  let cur = endId;
  while(cur !== null){ path.push(cur); cur = prev[cur]; }
  path.reverse();
  return { path, distance: dist[endId], prev, dist };
}

function initMap(){
  map = L.map('map', { zoomControl: true }).setView([12.9, 80.1], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // show node markers
  nodeMarkers = [];
  MAP_NODES.forEach(nd=>{
    const m = L.circleMarker([nd.lat, nd.lng], { radius:8, color:'#1e90ff', fillColor:'#60a5fa', fillOpacity:1 });
    m.addTo(map).bindTooltip(nd.name, {permanent:false, direction:'top'});
    nodeMarkers.push(m);
  });
    // create empty layer group for routes/markers so we can clear easily
    try{
      routeLayer = L.layerGroup().addTo(map);
    }catch(e){
      console.error('Leaflet not available to create layer group', e);
      const info = document.getElementById('routeInfo'); if(info) info.textContent = 'Error: Leaflet not loaded';
    }
}

function clearRoute(){
  if(routeLayer){ try{ routeLayer.clearLayers(); }catch(e){} }
  const info = document.getElementById('routeInfo'); if(info) info.textContent = 'No route selected';
}

function drawRoute(path){
  if(!path || path.length === 0) return;
  const latlngs = path.map(id => { const n = MAP_NODES.find(x=>x.id===id); return [n.lat, n.lng]; });
  // clear previous route elements
  if(routeLayer){ try{ routeLayer.clearLayers(); }catch(e){} }

  const poly = L.polyline(latlngs, { color: '#10b981', weight: 5, opacity: 0.95 });
  routeLayer.addLayer(poly);

  // add start/end markers with popups
  const start = MAP_NODES.find(x=>x.id===path[0]);
  const end = MAP_NODES.find(x=>x.id===path[path.length-1]);
  const startM = L.circleMarker([start.lat, start.lng], { radius:10, color:'#065f46', fillColor:'#10b981', fillOpacity:1 }).addTo(routeLayer).bindPopup(`<strong>Start:</strong> ${start.name}`);
  const endM = L.circleMarker([end.lat, end.lng], { radius:10, color:'#9f1239', fillColor:'#f43f5e', fillOpacity:1 }).addTo(routeLayer).bindPopup(`<strong>End:</strong> ${end.name}`);

  // focus map to route
  const bounds = L.latLngBounds(latlngs);
  map.fitBounds(bounds.pad(0.2));
  return {startM, endM};
}

function findNodeByNameOrClosest(text){
  if(!text) return null;
  const t = text.trim().toLowerCase();
  // exact match
  for(const n of MAP_NODES) if(n.name.toLowerCase() === t) return n;
  // substring match
  for(const n of MAP_NODES) if(n.name.toLowerCase().includes(t)) return n;
  // fallback: return closest by name token start
  for(const n of MAP_NODES) if(n.name.toLowerCase().startsWith(t)) return n;
  return null;
}

window.addEventListener('load', ()=>{
  // If page opened via file://, some browsers (Chrome) block loading remote tiles — recommend running a local server.
  if(window.location && window.location.protocol === 'file:'){
    const info = document.getElementById('routeInfo');
    if(info) info.textContent = 'Warning: opening via file:// may block map tiles in some browsers (use a local server like: python -m http.server).';
  }
  initMap();
  const preset = document.getElementById('presetSelect');
  const srcIn = document.getElementById('sourceInput');
  const dstIn = document.getElementById('destInput');
  const findBtn = document.getElementById('findBtn');
  const reverseBtn = document.getElementById('reverseBtn');
  const clearBtn = document.getElementById('clearBtn');

  // prefer manual road graph where available, otherwise fall back to distance-based edges
  let edges = buildManualEdges();
  if(!edges || edges.length === 0) edges = buildEdges(18);

  preset.addEventListener('change', ()=>{
    if(!preset.value) return;
    const [s,d] = preset.value.split('|');
    srcIn.value = s; dstIn.value = d;
  });

  findBtn.addEventListener('click', ()=>{
    clearRoute();
    const aNode = findNodeByNameOrClosest(srcIn.value) || MAP_NODES[0];
    const bNode = findNodeByNameOrClosest(dstIn.value) || MAP_NODES[MAP_NODES.length-1];
    if(!aNode || !bNode){ alert('Could not match source or destination to known nodes. Try a preset.'); return; }
    const res = dijkstra(MAP_NODES, edges, aNode.id, bNode.id);
    if(!res || res.path.length === 0){ alert('No route found.'); return; }
    const markers = drawRoute(res.path);
    document.getElementById('routeInfo').innerHTML = `<strong>Route:</strong> ${MAP_NODES.find(x=>x.id===res.path[0]).name} → ${MAP_NODES.find(x=>x.id===res.path[res.path.length-1]).name}<br><strong>Distance:</strong> ${res.distance.toFixed(2)} km`;
    // popup with distance
    setTimeout(()=>{ alert(`Total distance: ${res.distance.toFixed(2)} km`); }, 80);
  });

  reverseBtn.addEventListener('click', ()=>{
    const t = srcIn.value; srcIn.value = dstIn.value; dstIn.value = t;
  });

  clearBtn.addEventListener('click', ()=>{ clearRoute(); });
});
