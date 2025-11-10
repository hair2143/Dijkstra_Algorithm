// graph.js
// Minimal Graph model and canvas drawing utilities used by ui.js and dijkstra.js

const Graph = {
  nodes: [],
  edges: [],
  nextId: 0,
  startNode: null,
  endNode: null,
  currentNode: null,
  canvas: null,
  ctx: null,
  dpr: window.devicePixelRatio || 1,

  init(canvasEl){
    if(!canvasEl) return;
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    // initial resize/draw
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize(){
    if(!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.draw();
  },

  addNode(x, y){
    const id = this.nextId++;
    const label = String(id);
    this.nodes.push({ x, y, id, label, dist: Infinity, visited: false, state: 'default' });
    this.draw();
    return id;
  },

  addEdge(a, b, weight){
    // avoid self-loop and duplicate
    if(a === b) return;
    const exists = this.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    if(exists) return;
    this.edges.push({ a, b, weight });
    this.draw();
  },

  findNodeAt(x, y){
    for(let i = this.nodes.length - 1; i >= 0; i--){
      const n = this.nodes[i];
      if(Math.hypot(n.x - x, n.y - y) <= 20) return n;
    }
    return null;
  },

  labelFor(id){
    const n = this.nodes.find(x => x.id === id);
    return n ? n.label : String(id);
  },

  clear(){
    this.nodes = [];
    this.edges = [];
    this.nextId = 0;
    this.startNode = null;
    this.endNode = null;
    this.currentNode = null;
    this.draw();
  },

  resetStates(){
    this.nodes.forEach(n => {
      n.state = (n.id === this.startNode ? 'start' : (n.id === this.endNode ? 'end' : 'default'));
      n.dist = Infinity;
      n.visited = false;
    });
    this.draw();
  },

  draw(){
    if(!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    // clear (use unscaled size)
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    // draw edges
    this.edges.forEach(e => {
      const a = this.nodes.find(n => n.id === e.a);
      const b = this.nodes.find(n => n.id === e.b);
      if(!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = e._highlight ? '#10b981' : '#374151';
      ctx.lineWidth = e._highlight ? 5 : 3;
      ctx.stroke();
      // weight label
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      ctx.fillStyle = '#c7f2ff';
      ctx.font = '12px sans-serif';
      ctx.fillText(String(e.weight), mx + 6, my - 6);
    });

    // draw nodes
    this.nodes.forEach(n => {
      ctx.beginPath();
      // Colors per spec: Default = blue, Current/processing = yellow, Visited = gray, Path = green
      let fill = '#60a5fa'; // default blue
      let stroke = '#1e3a8a';
      if(n.state === 'start'){ fill = '#60a5fa'; stroke = '#0b5cff'; }
      else if(n.state === 'end'){ fill = '#60a5fa'; stroke = '#0b5cff'; }
      else if(n.state === 'processing'){ fill = '#f59e0b'; stroke = '#b45309'; } // yellow
      else if(n.state === 'visited'){ fill = '#9ca3af'; stroke = '#6b7280'; } // gray
      else if(n.state === 'path'){ fill = '#10b981'; stroke = '#065f46'; } // green

      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label centered
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, n.x, n.y);
    });
  }
};

// expose globally
window.Graph = Graph;
