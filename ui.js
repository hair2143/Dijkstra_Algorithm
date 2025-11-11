// ui.js
// UI event wiring, mode management, and algorithm runner
// Connects DOM controls to Graph and Dijkstra

// Global state variables
let mode = 'add-node';
let edgeFirstNode = null;
let startNodeId = null;
let endNodeId = null;
let running = false;

// DOM element references
let btnAddNode, btnAddEdge, btnPickStart, btnPickEnd, btnRandom, btnRun, btnReset, btnClear, speedInput, canvas;
let btnStep;
let nodeCountInput, avgWeightInput, randomGraphBtn;

// stepping control
let autoMode = true;
let isStepping = false;
let resolveStep = null;

async function waitForStep(ms){
  // if auto mode, just sleep
  // When in autoMode we honor a timed sleep
  if(autoMode) return sleep(ms);
  // If not in explicit stepping mode, proceed immediately
  if(!isStepping) return;
  // Otherwise wait until the Step button resolves
  return new Promise(res => { resolveStep = res; });
}

// Initialize UI after DOM is loaded
function initUI(){
  // Get DOM elements
  btnAddNode = document.getElementById('mode-add-node');
  btnAddEdge = document.getElementById('mode-add-edge');
  btnPickStart = document.getElementById('mode-pick-start');
  btnPickEnd = document.getElementById('mode-pick-end');
  btnRandom = document.getElementById('random-graph');
  btnRun = document.getElementById('run');
  btnStep = document.getElementById('stepBtn');
  btnReset = document.getElementById('reset');
  btnClear = document.getElementById('clear');
  speedInput = document.getElementById('speed');
  canvas = document.getElementById('graph-canvas');
  nodeCountInput = document.getElementById('nodeCount');
  avgWeightInput = document.getElementById('avgWeight');
  randomGraphBtn = document.getElementById('randomGraphBtn');

  if(!canvas){
    console.error('Canvas element not found!');
    return;
  }

  if(!btnRun){
    console.error('Button elements not found!');
    return;
  }

  console.log('UI initialized');

  // Initialize Graph with the canvas so drawing functions have access to context
  if(typeof Graph !== 'undefined' && Graph && typeof Graph.init === 'function'){
    Graph.init(canvas);
  }

  // Mode button listeners
  btnAddNode.onclick = () => setMode('add-node');
  btnAddEdge.onclick = () => setMode('add-edge');
  btnPickStart.onclick = () => setMode('pick-start');
  btnPickEnd.onclick = () => setMode('pick-end');

  // Action button listeners
  btnClear.onclick = () => {
    if(running) return;
    Graph.clear();
    startNodeId = null;
    endNodeId = null;
    Graph.currentNode = null;
    removeCompletionBanner();
    // reset stepping/auto state
    autoMode = true; isStepping = false; resolveStep = null;
    if(btnStep) btnStep.disabled = false; if(btnRun) btnRun.disabled = false;
    updateSidebar();
  };

  btnReset.onclick = () => {
    if(running) return;
    Graph.resetStates();
    Graph.currentNode = null;
    removeCompletionBanner();
    // reset stepping state
    autoMode = true; isStepping = false; resolveStep = null;
    if(btnStep) btnStep.disabled = false; if(btnRun) btnRun.disabled = false;
    updateSidebar();
  };

  btnRandom.onclick = () => {
    if(running) return;
    generateRandomGraph();
  };

  // Large random graph generator button
  if(randomGraphBtn){
    randomGraphBtn.onclick = () => {
      if(running) return;
      const n = parseInt(nodeCountInput && nodeCountInput.value, 10) || 0;
      const avg = parseFloat(avgWeightInput && avgWeightInput.value) || 2.5;
      if(n < 2 || n > 1000){ alert('Please enter node count between 2 and 1000'); return; }
      // Heuristic density selection when the user doesn't provide one:
      // - small graphs can be denser; large graphs must be sparse to remain performant
      let density;
      if(n > 500) density = 0.02;
      else if(n > 200) density = 0.05;
      else density = 0.2;
      generateLargeRandomGraph(n, avg, density);
    };
  }
  // Step button: start stepping or advance a paused step
  btnStep.onclick = async () => {
    // if currently auto-running, ignore step
    if(running && autoMode) return;

    if(!running){
      // start stepping run
      autoMode = false;
      isStepping = true;
      // disable other controls except step
      disableControls(true);
      btnStep.disabled = false;
      btnRun.disabled = true;

      // prepare nodes like Run does
      if(startNodeId == null){ alert('Please pick a start node first (Pick Start mode)');
        // restore controls
        autoMode = true; isStepping = false; disableControls(false); return; }

      running = true;
      try{
        await runDijkstra(startNodeId, endNodeId, parseInt(speedInput.value,10)||300, {
          onVisit: (u, dist, visited) => {
            // reuse existing callbacks logic (call same handlers as Run)
            Graph.currentNode = u;
            const uNode = Graph.nodes.find(n => n.id === u);
            if(uNode){ uNode.state = 'processing'; uNode.dist = dist.get(u); }
            highlightLine(4); explainStep('Selecting node ' + Graph.labelFor(u));
            updateSidebar(); Graph.draw();
            setTimeout(() => { highlightLine(5); explainStep('Marking node ' + Graph.labelFor(u) + ' as visited'); }, Math.max(40, (parseInt(speedInput.value,10)||300)/3));
          },
          onUpdate: (u,v,dist,visited) => {
            Graph.nodes.forEach(n => { n.dist = dist.has(n.id) ? dist.get(n.id) : Infinity; n.visited = visited.has(n.id); if(n.visited && n.state!=='path' && n.state!=='start' && n.state!=='end') n.state='visited'; });
            updateSidebar(); Graph.draw();
            try{
              const labelV = Graph.labelFor(v); const t = Math.max(40, (parseInt(speedInput.value,10)||300)/4);
              highlightLine(6); explainStep('Checking neighbor ' + labelV + ' of ' + Graph.labelFor(u));
              setTimeout(()=>{ highlightLine(7); explainStep('Evaluating relaxation condition for ' + labelV); }, t);
              setTimeout(()=>{ highlightLine(8); explainStep('Updating distance for ' + labelV); }, t*2);
              setTimeout(()=>{ highlightLine(9); explainStep('Enqueuing ' + labelV + ' with new priority'); }, t*3);
            }catch(e){}
          },
          onFinish: (dist, prev, path) => {
            Graph.currentNode = null; Graph.nodes.forEach(n=>{ if(n.visited && n.state!=='path' && n.state!=='start' && n.state!=='end') n.state='visited'; });
            if(path && path.length>0) path.forEach(nodeId=>{ const n=Graph.nodes.find(x=>x.id===nodeId); if(n) n.state='path'; });
              highlightLine(3); explainStep('Algorithm finished');
              // update and show MST table derived from prev/dist
              try{ if(typeof updateMSTTable === 'function') updateMSTTable(prev, dist); }catch(e){}
              showCompletion(dist, path, endNodeId); updateSidebar(); Graph.draw();
            running = false; disableControls(false); btnRun.disabled = false; autoMode = true; isStepping = false; resolveStep = null;
          }
        });
      }catch(e){ console.error(e); running=false; disableControls(false); btnRun.disabled=false; autoMode=true; isStepping=false; resolveStep=null; }
      return;
    }

    // running and in stepping mode -> advance the waiting promise
    if(resolveStep) { resolveStep(); resolveStep = null; }
  };

  // Run Dijkstra algorithm
  btnRun.onclick = async () => {
    if(running) return;
    // clear any previous completion banner
    removeCompletionBanner();
    if(startNodeId == null){
      alert('Please pick a start node first (Pick Start mode)');
      return;
    }
    if(Graph.nodes.length === 0){
      alert('No graph to run on. Add some nodes first.');
      return;
    }

    running = true;
    disableControls(true);
  if(btnStep) btnStep.disabled = true;

    // Reset all node states (except start/end)
    Graph.nodes.forEach(n => {
      n.state = (n.id === startNodeId ? 'start' : (n.id === endNodeId ? 'end' : 'default'));
      n.dist = Infinity;
      n.visited = false;
    });
    updateSidebar();
    Graph.draw();

  // Calculate speed: use slider value (ms per step). Larger value = slower animation.
  // Clamp to reasonable bounds so animations remain visible.
  let speed = parseInt(speedInput.value, 10) || 300;
  speed = Math.max(10, Math.min(2000, speed));

    try {
      await runDijkstra(startNodeId, endNodeId, speed, {
        onVisit: (u, dist, visited) => {
            // Highlight selecting node line
            highlightLine(4);
            explainStep('Selecting node ' + Graph.labelFor(u));
          // set current node for sidebar display
          Graph.currentNode = u;
          const uNode = Graph.nodes.find(n => n.id === u);
          if(uNode){
            uNode.state = 'processing';
            uNode.dist = dist.get(u);
          }
            updateSidebar();
            Graph.draw();
            // after a short portion of the step, mark visited (line 5)
            setTimeout(() => { highlightLine(5); explainStep('Marking node ' + Graph.labelFor(u) + ' as visited'); }, Math.max(40, speed/3));
        },
        onUpdate: (u, v, dist, visited) => {
            // Update distances and visited flags
          Graph.nodes.forEach(n => {
            n.dist = dist.has(n.id) ? dist.get(n.id) : Infinity;
            n.visited = visited.has(n.id);
            // if node has been visited, reflect state (unless it's part of path/start/end)
            if(n.visited && n.state !== 'path' && n.state !== 'start' && n.state !== 'end'){
              n.state = 'visited';
            }
          });
            updateSidebar();
            Graph.draw();
            // Sequence through checking/updating lines 6->7->8->9 in sync with animation
            try{
              const labelV = Graph.labelFor(v);
              const t = Math.max(40, speed/4);
              highlightLine(6);
              explainStep('Checking neighbor ' + labelV + ' of ' + Graph.labelFor(u));
              setTimeout(()=>{ highlightLine(7); explainStep('Evaluating relaxation condition for ' + labelV); }, t);
              setTimeout(()=>{ highlightLine(8); explainStep('Updating distance for ' + labelV); }, t*2);
              setTimeout(()=>{ highlightLine(9); explainStep('Enqueuing ' + labelV + ' with new priority'); }, t*3);
            }catch(e){ /* ignore UI highlight errors */ }
        },
        onFinish: (dist, prev, path) => {
          // Clear current node indicator
          Graph.currentNode = null;
          // Mark all visited nodes
          Graph.nodes.forEach(n => {
            if(n.visited && n.state !== 'path' && n.state !== 'start' && n.state !== 'end'){
              n.state = 'visited';
            }
          });
          // If a path to an end node exists, mark it. Otherwise we'll still show final distances.
          if(path && path.length > 0){
            path.forEach(nodeId => {
              const n = Graph.nodes.find(x => x.id === nodeId);
              if(n) n.state = 'path';
            });
          }
          // Show completion banner with either the shortest path (if end selected) or final distances
          highlightLine(3);
          explainStep('Algorithm finished');
          // update MST table derived from prev/dist
          try{ if(typeof updateMSTTable === 'function') updateMSTTable(prev, dist); }catch(e){}
          showCompletion(dist, path, endNodeId);

          updateSidebar();
          Graph.draw();
          running = false;
          disableControls(false);
          if(btnStep) btnStep.disabled = false;
        }
      });
    } catch(e){
      console.error('Dijkstra error:', e);
      // ensure current node cleared on error
      Graph.currentNode = null;
      running = false;
      disableControls(false);
    }
  };

  // Canvas click listener for graph editing
  canvas.addEventListener('click', (ev) => {
    if(running) return;

    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    if(mode === 'add-node'){
      // Prevent adding a node too close to existing nodes (no overlap)
      const minDist = 40; // px
      const close = Graph.nodes.find(n => Math.hypot(n.x - x, n.y - y) < minDist);
      if(close){
        // flash existing node to indicate collision
        flashNode(close);
        return;
      }
      Graph.addNode(x, y);
      updateSidebar();
    }
    else if(mode === 'add-edge'){
      const n = Graph.findNodeAt(x, y);
      if(!n) return;

      if(!edgeFirstNode){
        edgeFirstNode = n;
        flashNode(n);
      } else {
        if(edgeFirstNode.id === n.id){
          edgeFirstNode = null;
          Graph.draw();
          return;
        }
        const weightStr = prompt('Enter edge weight (positive number):', '1');
        const weight = parseFloat(weightStr);
        if(!isNaN(weight) && weight > 0){
          Graph.addEdge(edgeFirstNode.id, n.id, weight);
        }
        edgeFirstNode = null;
        updateSidebar();
      }
    }
    else if(mode === 'pick-start'){
      const n = Graph.findNodeAt(x, y);
      if(!n) return;

      startNodeId = n.id;
      Graph.startNode = startNodeId;

      Graph.nodes.forEach(node => {
        if(node.id === startNodeId){
          node.state = 'start';
        } else if(node.state === 'start'){
          node.state = 'default';
        }
      });
      updateSidebar();
      Graph.draw();
    }
    else if(mode === 'pick-end'){
      const n = Graph.findNodeAt(x, y);
      if(!n) return;

      endNodeId = n.id;
      Graph.endNode = endNodeId;

      Graph.nodes.forEach(node => {
        if(node.id === endNodeId){
          node.state = 'end';
        } else if(node.state === 'end'){
          node.state = 'default';
        }
      });
      updateSidebar();
      Graph.draw();
    }
  });

  // Initialize UI state
  setMode('add-node');
  updateSidebar();
  Graph.draw();
  // show initial speed value and keep it updated
  const speedValueEl = document.getElementById('speed-value');
  if(speedValueEl && speedInput){
    speedValueEl.textContent = String(speedInput.value);
    speedInput.addEventListener('input', () => {
      speedValueEl.textContent = String(speedInput.value);
    });
  }

  // expose waitForStep and stepping flags to dijkstra.js
  window.waitForStep = waitForStep;
  window.autoMode = () => autoMode;
  // expose highlighting & explanation helpers to algorithm module
  window.highlightLine = highlightLine;
  window.showExplanation = showExplanation;
}

// Set current mode and highlight active button
function setMode(m){
  mode = m;
  [btnAddNode, btnAddEdge, btnPickStart, btnPickEnd].forEach(b => b.classList.remove('active'));
  if(m === 'add-node') btnAddNode.classList.add('active');
  if(m === 'add-edge') btnAddEdge.classList.add('active');
  if(m === 'pick-start') btnPickStart.classList.add('active');
  if(m === 'pick-end') btnPickEnd.classList.add('active');
  edgeFirstNode = null;
}

// Disable/enable controls during algorithm run
function disableControls(flag){
  [btnAddNode, btnAddEdge, btnPickStart, btnPickEnd, btnRandom, btnReset, btnClear].forEach(b => b.disabled = flag);
  btnRun.disabled = flag;
}

// Code panel helpers
function highlightLine(n){
  document.querySelectorAll('#codePanel .code-line').forEach((s,i)=>{
    if(s.classList) s.classList.remove('active');
  });
  const el = document.getElementById('line' + n);
  if(el && el.classList) el.classList.add('active');
  // also ensure explanation box is visible / scrolled
  const exp = document.getElementById('explanationBox');
  if(exp){ const parent = exp.parentNode; if(parent) parent.scrollTop = parent.scrollHeight; }
}

function explainStep(text){
  const el = document.getElementById('code-explain');
  if(el) el.textContent = text || '';
}

function showExplanation(msg){
  const box = document.getElementById('explanationBox');
  if(!box) return;
  box.innerHTML = `<strong>Explanation:</strong> ${msg}`;
  // auto-scroll the explanation box to bottom so recent text is visible
  box.scrollTop = box.scrollHeight;
}

// Visual feedback when selecting first edge node
function flashNode(n){
  const saved = n.state;
  n.state = 'processing';
  Graph.draw();
  setTimeout(() => {
    n.state = saved;
    Graph.draw();
  }, 300);
}

// Update sidebar with current state
function updateSidebar(){
  const currentNodeEl = document.getElementById('current-node');
  const startEl = document.getElementById('start-node');
  const endEl = document.getElementById('end-node');

  // Current node
  if(Graph.currentNode !== null && Graph.currentNode !== undefined){
    const label = Graph.labelFor(Graph.currentNode);
    currentNodeEl.textContent = label;
  } else {
    currentNodeEl.textContent = '—';
  }

  // Start and end nodes
  startEl.textContent = (startNodeId == null ? '—' : Graph.labelFor(startNodeId));
  endEl.textContent = (endNodeId == null ? '—' : Graph.labelFor(endNodeId));

  // Distance table
  const tbody = document.querySelector('#dist-table tbody');
  tbody.innerHTML = '';

  Graph.nodes.forEach(n => {
    const tr = document.createElement('tr');

    const tdN = document.createElement('td');
    tdN.textContent = n.label;

    const tdD = document.createElement('td');
    if(n.dist === Infinity){
      tdD.textContent = '∞';
    } else {
      tdD.textContent = n.dist;
    }

    const tdV = document.createElement('td');
    tdV.textContent = (n.visited ? '✓' : '');

    tr.appendChild(tdN);
    tr.appendChild(tdD);
    tr.appendChild(tdV);
    tbody.appendChild(tr);
  });

  // Update degrees table (if present)
  try{ updateDegreeTable(); }catch(e){}
}

// Update the Node Degrees table
function updateDegreeTable(){
  const tableBody = document.querySelector('#degreeTable tbody');
  if(!tableBody) return;
  tableBody.innerHTML = '';
  Graph.nodes.forEach(n => {
    const row = document.createElement('tr');
    const tdN = document.createElement('td'); tdN.textContent = Graph.labelFor(n.id);
    const tdD = document.createElement('td'); tdD.textContent = String(n.degree || 0);
    row.appendChild(tdN); row.appendChild(tdD);
    tableBody.appendChild(row);
  });
}

// Build the Shortest Path Tree table from prev (Map) and dist (Map) after Dijkstra
function updateMSTTable(prev, dist){
  const tableBody = document.querySelector('#mstTable tbody');
  if(!tableBody) return;
  tableBody.innerHTML = '';
  let totalCost = 0;

  // Prev is expected to be a Map (node -> parent)
  Graph.nodes.forEach(n => {
    const nodeId = n.id;
    const parent = (prev && prev.has && prev.has(nodeId)) ? prev.get(nodeId) : (prev && prev[nodeId] !== undefined ? prev[nodeId] : null);
    const parentLabel = (parent === null || parent === undefined) ? '—' : Graph.labelFor(parent);
    const nodeDist = (dist && dist.get) ? dist.get(nodeId) : (dist && dist[nodeId] !== undefined ? dist[nodeId] : Infinity);
    let weight = '—';
    if(parent !== null && parent !== undefined){
      const pDist = (dist && dist.get) ? dist.get(parent) : (dist && dist[parent] !== undefined ? dist[parent] : Infinity);
      if(typeof nodeDist === 'number' && typeof pDist === 'number' && isFinite(nodeDist) && isFinite(pDist)){
        weight = nodeDist - pDist;
        if(!isFinite(weight)) weight = '—';
        else totalCost += weight;
      }
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${Graph.labelFor(nodeId)}</td>
      <td>${parentLabel}</td>
      <td>${weight}</td>
      <td>${(nodeDist===Infinity? '∞' : nodeDist)}</td>`;
    tableBody.appendChild(row);
  });

  const totalRow = document.createElement('tr');
  totalRow.innerHTML = `
    <td colspan="2"><strong>Total MST Cost</strong></td>
    <td colspan="2"><strong>${totalCost}</strong></td>`;
  tableBody.appendChild(totalRow);

  // Highlight MST edges on the graph based on prev
  // Clear previous flags
  Graph.edges.forEach(e => { delete e._mst; });
  if(prev && prev.forEach){
    prev.forEach((p, node) => {
      if(p !== null && p !== undefined){
        const edge = Graph.edges.find(e => (e.a===node && e.b===p) || (e.b===node && e.a===p));
        if(edge) edge._mst = true;
      }
    });
  } else if(prev){
    // fallback for plain object
    Object.keys(prev).forEach(k=>{
      const p = prev[k];
      if(p !== null && p !== undefined){
        const node = Number(k);
        const edge = Graph.edges.find(e => (e.a===node && e.b===p) || (e.b===node && e.a===p));
        if(edge) edge._mst = true;
      }
    });
  }
  Graph.draw();
}

// Show completion banner
function showCompletion(distMap, path, endId){
  // remove previous banner if any
  removeCompletionBanner();
  const banner = document.createElement('div');
  banner.id = 'completion-banner';
  banner.style.padding = '10px';
  banner.style.background = 'rgba(16, 185, 129, 0.08)';
  banner.style.border = '1px solid rgba(16,185,129,0.25)';
  banner.style.borderRadius = '6px';
  banner.style.marginBottom = '10px';
  banner.style.color = '#065f46';
  banner.style.fontWeight = '600';

  const container = document.createElement('div');

  if(endId != null && path && path.length > 0){
    // Show shortest path to the end node
    const cost = distMap.get(path[path.length - 1]);
    const title = document.createElement('div');
    title.textContent = `Shortest Path: ${path.map(id => Graph.labelFor(id)).join(' → ')}`;
    title.style.marginBottom = '6px';
    container.appendChild(title);
    const costEl = document.createElement('div');
    costEl.textContent = `Cost: ${cost === Infinity ? '∞' : cost}`;
    container.appendChild(costEl);
  } else {
    // No specific end selected or no path: show final distances to all nodes
    const title = document.createElement('div');
    title.textContent = 'Run complete — final distances:';
    title.style.marginBottom = '6px';
    container.appendChild(title);

    const list = document.createElement('ul');
    list.style.margin = '0';
    list.style.paddingLeft = '18px';
    list.style.maxHeight = '180px';
    list.style.overflow = 'auto';
    Graph.nodes.forEach(n => {
      const li = document.createElement('li');
      const d = distMap && distMap.has(n.id) ? distMap.get(n.id) : Infinity;
      li.textContent = `${Graph.labelFor(n.id)} : ${d === Infinity ? '∞' : d}`;
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  // Add optional manual dismiss button
  const controls = document.createElement('div');
  controls.style.marginTop = '8px';
  const btn = document.createElement('button');
  btn.textContent = 'Dismiss';
  btn.style.background = '#065f46';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.padding = '6px 10px';
  btn.style.borderRadius = '4px';
  btn.style.cursor = 'pointer';
  btn.onclick = () => { removeCompletionBanner(); };
  controls.appendChild(btn);
  container.appendChild(controls);

  banner.appendChild(container);
  document.querySelector('.sidebar').prepend(banner);
}

// Remove the persistent completion banner, if present
function removeCompletionBanner(){
  const prev = document.getElementById('completion-banner');
  if(prev && prev.parentNode) prev.parentNode.removeChild(prev);
}

// Random graph generator
function generateRandomGraph(){
  Graph.clear();
  const nodeCount = 3 + Math.floor(Math.random() * 6);  // 3 to 8 nodes
  const positions = [];

  // Generate random node positions (avoid too much overlap)
  for(let i = 0; i < nodeCount; i++){
    let x, y, valid = false;
    while(!valid){
      x = 60 + Math.random() * (canvas.clientWidth - 120);
      y = 60 + Math.random() * (canvas.clientHeight - 120);
      valid = true;
      for(let j = 0; j < positions.length; j++){
        const dx = positions[j].x - x;
        const dy = positions[j].y - y;
        if(Math.hypot(dx, dy) < 60){
          valid = false;
          break;
        }
      }
    }
    positions.push({x, y});
    Graph.addNode(x, y);
  }

  // Add random edges with weights
  for(let i = 0; i < nodeCount; i++){
    for(let j = i + 1; j < nodeCount; j++){
      if(Math.random() < 0.45){  // 45% chance of edge
        const weight = 1 + Math.floor(Math.random() * 19);  // 1-20
        Graph.addEdge(i, j, weight);
      }
    }
  }

  // Set start/end nodes
  if(Graph.nodes.length > 0){
    startNodeId = 0;
    endNodeId = Math.min(nodeCount - 1, nodeCount - 1);
    Graph.startNode = startNodeId;
    Graph.endNode = endNodeId;

    Graph.nodes.forEach(node => {
      if(node.id === startNodeId) node.state = 'start';
      if(node.id === endNodeId) node.state = 'end';
    });
  }

  updateSidebar();
  Graph.draw();
}

// Scalable random graph generator: creates up to 1000 nodes and keeps graph connected
function generateLargeRandomGraph(n, avgWeight=2.5, density=0.25){
  // safety limits
  const maxNodes = 1000; n = Math.max(2, Math.min(maxNodes, Math.floor(n)));

  // Clear existing graph
  Graph.clear();
  // Set performance flags
  Graph.showEdgeWeights = n <= 200;
  Graph.showNodeLabels = n <= 500;

  const cw = canvas.clientWidth || 800;
  const ch = canvas.clientHeight || 600;
  const margin = 30;

  const nodeIds = [];

  // Position nodes: grid placement for large n, random with collision avoidance for small n
  if(n <= 300){
    const positions = [];
    for(let i=0;i<n;i++){
      let x,y,valid=false,tries=0;
      while(!valid && tries < 200){
        x = margin + Math.random() * (cw - margin*2);
        y = margin + Math.random() * (ch - margin*2);
        valid = true;
        for(const p of positions){ if(Math.hypot(p.x-x,p.y-y) < 24){ valid=false; break; } }
        tries++;
      }
      positions.push({x,y});
      const id = Graph.addNode(x,y);
      nodeIds.push(id);
    }
  } else {
    // grid layout
    const cols = Math.ceil(Math.sqrt((cw/ch) * n));
    const rows = Math.ceil(n/cols);
    const cellW = (cw - margin*2) / cols;
    const cellH = (ch - margin*2) / rows;
    let idx = 0;
    for(let r=0;r<rows && idx<n;r++){
      for(let c=0;c<cols && idx<n;c++){
        const jitterX = (Math.random()-0.5) * Math.min(20, cellW*0.3);
        const jitterY = (Math.random()-0.5) * Math.min(20, cellH*0.3);
        const x = margin + c*cellW + cellW/2 + jitterX;
        const y = margin + r*cellH + cellH/2 + jitterY;
        const id = Graph.addNode(x,y);
        nodeIds.push(id);
        idx++;
      }
    }
  }

  // Create edges. Strategy depends on n to keep performance reasonable
  const edgesAdded = new Set();
  const addEdgeSafe = (a,b,w) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if(edgesAdded.has(key)) return false;
    edgesAdded.add(key);
    Graph.addEdge(a,b,w);
    return true;
  };

  if(n <= 300){
    for(let i=0;i<n;i++){
      for(let j=i+1;j<n;j++){
        if(Math.random() < density){
          const weight = Math.max(1, Math.round(Math.random() * avgWeight * 2));
          addEdgeSafe(nodeIds[i], nodeIds[j], weight);
        }
      }
    }
  } else {
    // sparse neighbor-based connections for large graphs
    const k = Math.max(1, Math.floor(density * 10));
    for(let i=0;i<n;i++){
      let tries = 0; let attempts = 0;
      while(attempts < k && tries < k*6){
        const j = Math.floor(Math.random() * n);
        if(j === i) { tries++; continue; }
        const weight = Math.max(1, Math.round(Math.random() * avgWeight * 2));
        if(addEdgeSafe(nodeIds[i], nodeIds[j], weight)) attempts++;
        tries++;
      }
    }
  }

  // Ensure connectivity via union-find on node indices
  const parent = new Array(n); for(let i=0;i<n;i++) parent[i]=i;
  const find = (x) => parent[x]===x?x:(parent[x]=find(parent[x]));
  const union = (a,b) => { const ra=find(a), rb=find(b); if(ra!==rb) parent[ra]=rb; };
  // map nodeId -> index
  const idToIndex = {}; nodeIds.forEach((id,idx)=> idToIndex[id]=idx);
  Graph.edges.forEach(e => {
    const ia = idToIndex[e.a], ib = idToIndex[e.b];
    if(ia!==undefined && ib!==undefined) union(ia, ib);
  });

  const groups = {};
  for(let i=0;i<n;i++){ const r=find(i); groups[r]=groups[r]||[]; groups[r].push(i); }
  const roots = Object.keys(groups).map(k=>Number(k));
  for(let i=0;i<roots.length-1;i++){
    const aidx = groups[roots[i]][0];
    const bidx = groups[roots[i+1]][0];
    const a = nodeIds[aidx], b = nodeIds[bidx];
    const weight = Math.max(1, Math.round(Math.random() * avgWeight * 2));
    addEdgeSafe(a,b,weight);
    union(aidx,bidx);
  }

  // set start node
  if(nodeIds.length>0){ startNodeId = nodeIds[0]; Graph.startNode = startNodeId; const n0 = Graph.nodes.find(x=>x.id===startNodeId); if(n0) n0.state='start'; }

  updateSidebar(); Graph.draw();
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initUI);
console.log('ui.js loaded');
