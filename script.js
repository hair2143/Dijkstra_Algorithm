/* Dijkstra Visualizer - script.js
   - Canvas-based graph editor
   - Modes: add node, add edge, pick start, pick end
   - Run Dijkstra with min-heap, animate steps
*/

const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  draw();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Graph data
let nodes = []; // {x,y,id}
let edges = []; // {a,b,weight}
let nextId = 0;
let startNode = null, endNode = null;

// Algorithm state
let animTimer = null;
let speedInput = document.getElementById('speed');

// Modes
let mode = 'add-node';
const btns = {
  addNode: document.getElementById('mode-add-node'),
  addEdge: document.getElementById('mode-add-edge'),
  pickStart: document.getElementById('mode-pick-start'),
  pickEnd: document.getElementById('mode-pick-end'),
}

function setMode(m){
  mode = m;
  Object.values(btns).forEach(b=>b.classList.remove('active'));
  if(m==='add-node') btns.addNode.classList.add('active');
  if(m==='add-edge') btns.addEdge.classList.add('active');
  if(m==='pick-start') btns.pickStart.classList.add('active');
  if(m==='pick-end') btns.pickEnd.classList.add('active');
}

btns.addNode.onclick = ()=>setMode('add-node');
btns.addEdge.onclick = ()=>setMode('add-edge');
btns.pickStart.onclick = ()=>setMode('pick-start');
btns.pickEnd.onclick = ()=>setMode('pick-end');

document.getElementById('clear').onclick = ()=>{ clearAll(); };
document.getElementById('reset').onclick = ()=>{ resetRun(); };
document.getElementById('run').onclick = ()=>{ runDijkstra(); };
document.getElementById('random-graph').onclick = ()=>{ generateRandomGraph(); };

canvas.addEventListener('click', (ev)=>{
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  if(mode==='add-node'){
    addNode(x,y);
  } else if(mode==='add-edge'){
    onAddEdgeClick(x,y);
  } else if(mode==='pick-start'){
    const n = findNodeAt(x,y); if(n) { startNode = n.id; updateUI(); draw(); }
  } else if(mode==='pick-end'){
    const n = findNodeAt(x,y); if(n) { endNode = n.id; updateUI(); draw(); }
  }
});

function addNode(x,y){
  const id = nextId++;
  nodes.push({x,y,id});
  draw();
  updateUI();
}

function findNodeAt(x,y){
  for(let i=nodes.length-1;i>=0;i--){
    const n = nodes[i];
    const dx = n.x - x, dy = n.y - y;
    if(Math.hypot(dx,dy) <= 20) return n;
  }
  return null;
}

// Add edge by selecting two nodes sequentially
let edgeSelection = null;
function onAddEdgeClick(x,y){
  const n = findNodeAt(x,y);
  if(!n) return;
  if(!edgeSelection){ edgeSelection = n; highlightTemp(n); }
  else if(edgeSelection.id === n.id){ edgeSelection = null; draw(); }
  else {
    const w = prompt('Enter weight for edge (non-negative number):','1');
    const weight = parseFloat(w);
    if(!isNaN(weight) && weight >= 0){
      edges.push({a:edgeSelection.id,b:n.id,weight});
    }
    edgeSelection = null; draw(); updateUI();
  }
}

function highlightTemp(node){ draw(); ctx.beginPath(); ctx.arc(node.x,node.y,24,0,Math.PI*2); ctx.strokeStyle='rgba(125,211,252,0.6)'; ctx.lineWidth=2; ctx.stroke(); }

function clearAll(){ nodes=[]; edges=[]; nextId=0; startNode=null; endNode=null; resetRun(); draw(); updateUI(); }
function resetRun(){ if(animTimer) { clearTimeout(animTimer); animTimer=null; } updateUI(); draw(); }


function draw(){
  ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
  // edges
  edges.forEach(e=>{
    const a = nodes.find(n=>n.id===e.a);
    const b = nodes.find(n=>n.id===e.b);
    if(!a||!b) return;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
    ctx.strokeStyle = '#2a3640'; ctx.lineWidth=3; ctx.stroke();

    const mx = (a.x+b.x)/2, my=(a.y+b.y)/2;
    ctx.fillStyle = '#c7f2ff'; ctx.font='12px sans-serif'; ctx.fillText(e.weight, mx+6, my-6);
  });
  // nodes
  nodes.forEach(n=>{
    ctx.beginPath(); ctx.fillStyle = (n.id===startNode? '#0ea5a4' : n.id===endNode? '#7dd3fc' : '#111827');
    ctx.strokeStyle='#60a5fa'; ctx.lineWidth=1; ctx.arc(n.x,n.y,18,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#e6eef8'; ctx.font='12px sans-serif'; ctx.fillText(String(n.id), n.x-4, n.y+4);
  });
}

// UI table updates
const distTableBody = document.querySelector('#dist-table tbody');
function updateUI(dist=null, visited=null, current=null){
  document.getElementById('current-node').textContent = (current===null? '—' : current);
  document.getElementById('start-node').textContent = (startNode==null? '—' : startNode);
  document.getElementById('end-node').textContent = (endNode==null? '—' : endNode);
  distTableBody.innerHTML = '';
  nodes.forEach(n=>{
    const tr = document.createElement('tr');
    const tdn = document.createElement('td'); tdn.textContent = n.id;
    const tdd = document.createElement('td'); tdd.textContent = (dist && dist.has(n.id) ? (dist.get(n.id)===Infinity? '∞' : dist.get(n.id)) : '—');
    const tdv = document.createElement('td'); tdv.textContent = (visited && visited.has(n.id) ? '✓' : '');
    tr.appendChild(tdn); tr.appendChild(tdd); tr.appendChild(tdv);
    distTableBody.appendChild(tr);
  });
}


class MinHeap {
  constructor(){ this.data = []; }
  push(item,priority){ this.data.push({item,priority}); this._siftUp(this.data.length-1); }
  pop(){ if(this.data.length===0) return null; const root = this.data[0]; const last = this.data.pop(); if(this.data.length>0){ this.data[0]=last; this._siftDown(0);} return root; }
  size(){ return this.data.length; }
  _siftUp(i){ while(i>0){ const p = Math.floor((i-1)/2); if(this.data[p].priority <= this.data[i].priority) break; [this.data[p],this.data[i]]=[this.data[i],this.data[p]]; i=p; } }
  _siftDown(i){ const n=this.data.length; while(true){ let l=2*i+1,r=2*i+2,small=i; if(l<n && this.data[l].priority < this.data[small].priority) small=l; if(r<n && this.data[r].priority < this.data[small].priority) small=r; if(small===i) break; [this.data[i],this.data[small]]=[this.data[small],this.data[i]]; i=small; } }
}

// Dijkstra with animation
function runDijkstra(){
  if(nodes.length===0) return alert('Add some nodes first.');
  if(startNode==null) return alert('Pick a start node.');
  // Build adjacency
  const adj = new Map(); nodes.forEach(n=>adj.set(n.id, []));
  edges.forEach(e=>{ adj.get(e.a).push({to:e.b,w:e.weight}); adj.get(e.b).push({to:e.a,w:e.weight}); });

  const dist = new Map(); const prev = new Map(); const visited = new Set();
  nodes.forEach(n=>{ dist.set(n.id, Infinity); prev.set(n.id, null); });
  dist.set(startNode, 0);

  const heap = new MinHeap(); heap.push(startNode,0);

  const steps = []; // capture steps for animation

  while(heap.size()){ const node = heap.pop(); const u = node.item; const du = node.priority; if(visited.has(u)) continue; visited.add(u);
    steps.push({type:'visit',node:u,dist:new Map(dist),visited:new Set(visited)});
    adj.get(u).forEach(edge=>{
      if(visited.has(edge.to)) return;
      const nd = du + edge.w;
      if(nd < dist.get(edge.to)){
        dist.set(edge.to, nd); prev.set(edge.to, u); heap.push(edge.to, nd);
        steps.push({type:'update',from:u,to:edge.to,dist:new Map(dist),visited:new Set(visited)});
      }
    });
  }

  // capture final path
  const path = [];
  if(endNode!=null && prev.size>0){
    let cur = endNode; if(prev.get(cur)!==null || cur===startNode){ while(cur!=null){ path.push(cur); cur = prev.get(cur); } path.reverse(); }
  }

  // animate steps
  let i=0;
  function step(){
    if(i>=steps.length){
 
      updateUI(dist, visited, null); draw(); if(path.length>0) drawPath(path);
      return;
    }
    const s = steps[i++];
    updateUI(s.dist, s.visited, s.type==='visit'? s.node : null);
  
    draw();
    if(s.type==='visit'){
      const nobj = nodes.find(n=>n.id===s.node);
      if(nobj){ ctx.beginPath(); ctx.fillStyle='rgba(59,130,246,0.5)'; ctx.arc(nobj.x,nobj.y,22,0,Math.PI*2); ctx.fill(); }
    }
    if(s.type==='update'){
      const a = nodes.find(n=>n.id===s.from); const b = nodes.find(n=>n.id===s.to);
      if(a&&b){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle='rgba(16,185,129,0.9)'; ctx.lineWidth=4; ctx.stroke(); }
    }

    animTimer = setTimeout(step, parseInt(speedInput.value));
  }
  step();
}

function drawPath(path){
  for(let i=0;i<path.length-1;i++){
    const a = nodes.find(n=>n.id===path[i]); const b = nodes.find(n=>n.id===path[i+1]);
    if(a&&b){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle='rgba(16,185,129,0.95)'; ctx.lineWidth=6; ctx.stroke(); }
  }
  // highlight nodes
  path.forEach(id=>{ const n = nodes.find(x=>x.id===id); if(n){ ctx.beginPath(); ctx.fillStyle='rgba(16,185,129,0.9)'; ctx.arc(n.x,n.y,18,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#042027'; ctx.fillText(id, n.x-4,n.y+4); } });
}

// Random graph generator
function generateRandomGraph(){
  clearAll();
  const n = parseInt(prompt('Number of nodes (max 20)','8')) || 8;
  const r = Math.min(20, Math.max(2,n));
  const wmin = 1, wmax = 10;
  for(let i=0;i<r;i++){
    const x = 60 + Math.random()*(canvas.clientWidth-120);
    const y = 60 + Math.random()*(canvas.clientHeight-120);
    addNode(x,y);
  }
  // connect randomly
  for(let i=0;i<r;i++){
    for(let j=i+1;j<r;j++){
      if(Math.random() < 0.35){ edges.push({a: i, b: j, weight: Math.floor(wmin + Math.random()*(wmax-wmin))}); }
    }
  }
  // choose start/end
  startNode = 0; endNode = r-1; updateUI(); draw();
}


updateUI(); draw();
