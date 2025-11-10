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

// Initialize UI after DOM is loaded
function initUI(){
  // Get DOM elements
  btnAddNode = document.getElementById('mode-add-node');
  btnAddEdge = document.getElementById('mode-add-edge');
  btnPickStart = document.getElementById('mode-pick-start');
  btnPickEnd = document.getElementById('mode-pick-end');
  btnRandom = document.getElementById('random-graph');
  btnRun = document.getElementById('run');
  btnReset = document.getElementById('reset');
  btnClear = document.getElementById('clear');
  speedInput = document.getElementById('speed');
  canvas = document.getElementById('graph-canvas');

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
    updateSidebar();
  };

  btnReset.onclick = () => {
    if(running) return;
    Graph.resetStates();
    Graph.currentNode = null;
    removeCompletionBanner();
    updateSidebar();
  };

  btnRandom.onclick = () => {
    if(running) return;
    generateRandomGraph();
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
          // set current node for sidebar display
          Graph.currentNode = u;
          const uNode = Graph.nodes.find(n => n.id === u);
          if(uNode){
            uNode.state = 'processing';
            uNode.dist = dist.get(u);
          }
          updateSidebar();
          Graph.draw();
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
          showCompletion(dist, path, endNodeId);

          updateSidebar();
          Graph.draw();
          running = false;
          disableControls(false);
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

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initUI);
console.log('ui.js loaded');
