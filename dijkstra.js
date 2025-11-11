

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


async function runDijkstra(startId, endId, speed, callbacks){

  const nodes = Graph.nodes;
  const adj = new Map(); nodes.forEach(n=>adj.set(n.id, []));
  Graph.edges.forEach(e=>{ adj.get(e.a).push({to:e.b,w:e.weight}); adj.get(e.b).push({to:e.a,w:e.weight}); });

  const dist = new Map(); const prev = new Map(); const visited = new Set();
  nodes.forEach(n=>{ dist.set(n.id, Infinity); prev.set(n.id, null); n.dist = Infinity; });

  // Line 1: initialize distances
  if(window && typeof window.highlightLine === 'function') window.highlightLine(1);
  if(window && typeof window.showExplanation === 'function') window.showExplanation('Initializing distances of all nodes to infinity (∞).');
  if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(speed);
  else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

  // Line 2: set start distance to 0
  dist.set(startId, 0); const startNode = Graph.nodes.find(n=>n.id===startId); if(startNode) startNode.dist = 0;
  if(window && typeof window.highlightLine === 'function') window.highlightLine(2);
  if(window && typeof window.showExplanation === 'function') window.showExplanation(`Setting start node (${startId}) distance to 0.`);
  if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(speed);
  else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

  const pq = new MinPQ(); pq.push(startId, 0);

  while(!pq.isEmpty()){
    const top = pq.pop(); if(!top) break;
    const u = top.nodeId; if(visited.has(u)) continue;

    // Line 4: selecting smallest
    if(window && typeof window.highlightLine === 'function') window.highlightLine(4);
    if(window && typeof window.showExplanation === 'function') window.showExplanation(`Selecting the unvisited node with the smallest tentative distance.`);

    visited.add(u);
    if(callbacks && callbacks.onVisit) callbacks.onVisit(u, new Map(dist), new Set(visited));
    if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(speed);
    else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

    const neigh = adj.get(u) || [];
    for(const edge of neigh){
      const v = edge.to; const w = edge.w;
      if(visited.has(v)) continue;

      // Line 6: exploring neighbor
      if(window && typeof window.highlightLine === 'function') window.highlightLine(6);
      if(window && typeof window.showExplanation === 'function') window.showExplanation(`Exploring all neighbors of the current node to update their distances.`);
      if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(Math.max(40, Math.floor(speed/3)));
      else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

      const nd = dist.get(u) + w;
      if(nd < dist.get(v)){
        // Line 7: checking shorter path
        if(window && typeof window.highlightLine === 'function') window.highlightLine(7);
        if(window && typeof window.showExplanation === 'function') window.showExplanation(`Checking if we found a shorter path to ${Graph.labelFor(v)}.`);
        if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(Math.max(40, Math.floor(speed/3)));
        else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

        // Line 8: updating neighbor's distance
        if(window && typeof window.highlightLine === 'function') window.highlightLine(8);
        if(window && typeof window.showExplanation === 'function') window.showExplanation(`Updating the neighbor's distance with the smaller value.`);
        if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(Math.max(40, Math.floor(speed/3)));
        else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

        dist.set(v, nd); prev.set(v, u);
        const nodeObj = Graph.nodes.find(x=>x.id===v); if(nodeObj) nodeObj.dist = nd;
        pq.push(v, nd);

        if(callbacks && callbacks.onUpdate) callbacks.onUpdate(u, v, new Map(dist), new Set(visited));

        // Line 9: enqueue
        if(window && typeof window.highlightLine === 'function') window.highlightLine(9);
        if(window && typeof window.showExplanation === 'function') window.showExplanation(`Enqueuing ${Graph.labelFor(v)} with new priority.`);
        if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(Math.max(40, Math.floor(speed/3)));
        else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

        highlightEdge(u,v, Math.max(200, Math.floor(speed*0.6)));
      }
    }

    if(endId !== null && u === endId) break;
  }


  const path = [];
  if(endId !== null){
    let cur = endId; if(prev.get(cur)!==null || cur===startId){ while(cur!=null){ path.push(cur); cur = prev.get(cur); } path.reverse(); }
  }

  if(callbacks && callbacks.onFinish) callbacks.onFinish(new Map(dist), prev, path);
  // final explanation
  if(window && typeof window.highlightLine === 'function') window.highlightLine(3);
  if(window && typeof window.showExplanation === 'function') window.showExplanation('Algorithm finished — all shortest paths calculated.');
  return {dist, prev, path};
}

function highlightEdge(aId,bId, duration=300){

  const candidates = Graph.edges.filter(e=> (e.a===aId && e.b===bId) || (e.a===bId && e.b===aId));
  candidates.forEach(e=> e._highlight = true);
  Graph.draw();
  setTimeout(()=>{ candidates.forEach(e=> delete e._highlight); Graph.draw(); }, duration);
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

window.runDijkstra = runDijkstra;

// Prim's algorithm (MST) with step/auto support and explanations
async function runPrim(startId, callbacks){
  const nodes = Graph.nodes;
  const edges = Graph.edges.map(e => ({ from: e.a, to: e.b, weight: e.weight }));
  const visited = new Set();
  const edgesInMST = [];
  let totalCost = 0;

  // Line 1: pick any node as start
  if(window && typeof window.highlightLine === 'function') window.highlightLine(1);
  if(window && typeof window.showExplanation === 'function') window.showExplanation(`Starting MST from node ${startId}.`);
  if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(300);
  else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

  visited.add(startId);
  // mark node as MST-visited for visuals
  const startNode = Graph.nodes.find(n=>n.id===startId); if(startNode) startNode.state = 'mst-visited';
  if(callbacks && callbacks.onUpdate) callbacks.onUpdate();

  while(visited.size < nodes.length){
    // Line 3: find smallest connecting edge
    if(window && typeof window.highlightLine === 'function') window.highlightLine(3);
    if(window && typeof window.showExplanation === 'function') window.showExplanation('Finding the smallest edge connecting visited and unvisited nodes...');
    if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(300);
    else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

    let minEdge = null;
    for(const edge of edges){
      const { from, to, weight } = edge;
      const fromVisited = visited.has(from);
      const toVisited = visited.has(to);
      if((fromVisited && !toVisited) || (toVisited && !fromVisited)){
        if(!minEdge || weight < minEdge.weight) minEdge = { from, to, weight };
      }
    }

    if(!minEdge) break; // graph may be disconnected

    // Line 5: add edge to MST
    if(window && typeof window.highlightLine === 'function') window.highlightLine(5);
    if(window && typeof window.showExplanation === 'function') window.showExplanation(`Adding edge (${Graph.labelFor(minEdge.from)}, ${Graph.labelFor(minEdge.to)}) with weight ${minEdge.weight} to MST.`);
    edgesInMST.push(minEdge);
    totalCost += minEdge.weight;
    // visually highlight MST edge
    if(window && typeof window.highlightEdgeMST === 'function') window.highlightEdgeMST(minEdge.from, minEdge.to, 800, true);
    // update external UI table
    if(window && typeof window.updateMSTTable === 'function') window.updateMSTTable(edgesInMST, totalCost);
    if(window && typeof window.autoMode === 'function' && window.autoMode()) await sleep(300);
    else if(window && typeof window.waitForStep === 'function') await window.waitForStep();

    // mark endpoints visited
    visited.add(minEdge.from); visited.add(minEdge.to);
    const n1 = Graph.nodes.find(n=>n.id===minEdge.from); if(n1) n1.state = 'mst-visited';
    const n2 = Graph.nodes.find(n=>n.id===minEdge.to); if(n2) n2.state = 'mst-visited';
    if(callbacks && callbacks.onUpdate) callbacks.onUpdate();
  }

  // finish
  if(window && typeof window.highlightLine === 'function') window.highlightLine(3);
  if(window && typeof window.showExplanation === 'function') window.showExplanation(`✅ MST complete! Total cost: ${totalCost}.`);
  if(window && typeof window.updateMSTTable === 'function') window.updateMSTTable(edgesInMST, totalCost);
  if(callbacks && callbacks.onFinish) callbacks.onFinish(edgesInMST, totalCost);
  return { edgesInMST, totalCost };
}

window.runPrim = runPrim;
