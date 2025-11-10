// dijkstra.js
// Implements Dijkstra algorithm with a min-heap and step-by-step async animation

class MinPQ {
  constructor(){ this.heap = []; }
  _swap(i,j){ [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]; }
  _parent(i){ return Math.floor((i-1)/2); }
  _left(i){ return 2*i+1; }
  _right(i){ return 2*i+2; }
  push(nodeId,priority){ this.heap.push({nodeId,priority}); let i=this.heap.length-1; while(i>0){ const p=this._parent(i); if(this.heap[p].priority <= this.heap[i].priority) break; this._swap(p,i); i=p; } }
  pop(){ if(this.heap.length===0) return null; const root = this.heap[0]; const last=this.heap.pop(); if(this.heap.length>0){ this.heap[0]=last; this._siftDown(0);} return root; }
  _siftDown(i){ const n=this.heap.length; while(true){ let l=this._left(i), r=this._right(i), small=i; if(l<n && this.heap[l].priority < this.heap[small].priority) small=l; if(r<n && this.heap[r].priority < this.heap[small].priority) small=r; if(small===i) break; this._swap(i,small); i=small; } }
  isEmpty(){ return this.heap.length===0; }
}

// runDijkstra: asynchronous animation. callbacks used to update UI/draw.
async function runDijkstra(startId, endId, speed, callbacks){
  // callbacks: onVisit(nodeId), onUpdate(distMap, visitedSet), onFinish(dist, prev, path)
  const nodes = Graph.nodes;
  const adj = new Map(); nodes.forEach(n=>adj.set(n.id, []));
  Graph.edges.forEach(e=>{ adj.get(e.a).push({to:e.b,w:e.weight}); adj.get(e.b).push({to:e.a,w:e.weight}); });

  const dist = new Map(); const prev = new Map(); const visited = new Set();
  nodes.forEach(n=>{ dist.set(n.id, Infinity); prev.set(n.id, null); n.dist = Infinity; });
  dist.set(startId, 0); Graph.nodes.find(n=>n.id===startId).dist = 0;

  const pq = new MinPQ(); pq.push(startId, 0);

  while(!pq.isEmpty()){
    const top = pq.pop(); if(!top) break;
    const u = top.nodeId; if(visited.has(u)) continue;
    // visit u
    visited.add(u);
    // callback for visiting (pass dist and visited)
    if(callbacks && callbacks.onVisit) callbacks.onVisit(u, new Map(dist), new Set(visited));
    await sleep(speed);
    // process neighbors
    const neigh = adj.get(u) || [];
    for(const edge of neigh){
      const v = edge.to; const w = edge.w;
      if(visited.has(v)) continue;
      const nd = dist.get(u) + w;
      if(nd < dist.get(v)){
        dist.set(v, nd); prev.set(v, u);
        const nodeObj = Graph.nodes.find(x=>x.id===v); if(nodeObj) nodeObj.dist = nd;
        pq.push(v, nd);
        // callback for update: (u, v, dist, visited)
        if(callbacks && callbacks.onUpdate) callbacks.onUpdate(u, v, new Map(dist), new Set(visited));
        // highlight the corresponding edge briefly
        highlightEdge(u,v, speed*0.6);
        await sleep(speed);
      }
    }
    // mark visited state handled by UI via onUpdate/onVisit
    if(endId !== null && u === endId) break; // reached destination
  }

  // reconstruct path
  const path = [];
  if(endId !== null){
    let cur = endId; if(prev.get(cur)!==null || cur===startId){ while(cur!=null){ path.push(cur); cur = prev.get(cur); } path.reverse(); }
  }

  if(callbacks && callbacks.onFinish) callbacks.onFinish(new Map(dist), prev, path);
  return {dist, prev, path};
}

function highlightEdge(aId,bId, duration=300){
  // find edge in Graph.edges and set temporary _highlight flag
  const candidates = Graph.edges.filter(e=> (e.a===aId && e.b===bId) || (e.a===bId && e.b===aId));
  candidates.forEach(e=> e._highlight = true);
  Graph.draw();
  setTimeout(()=>{ candidates.forEach(e=> delete e._highlight); Graph.draw(); }, duration);
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

window.runDijkstra = runDijkstra;
