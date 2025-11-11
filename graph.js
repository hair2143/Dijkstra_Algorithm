

const Graph = {
  nodes: [],
  edges: [],
  nextId: 0,
  startNode: null,
  endNode: null,
  currentNode: null,
  showEdgeWeights: true,
  showNodeLabels: true,
  showNodeDegrees: true,
  canvas: null,
  ctx: null,
  dpr: window.devicePixelRatio || 1,

  init(canvasEl){
    if(!canvasEl) return;
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
 
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
    this.nodes.push({ x, y, id, label, dist: Infinity, visited: false, state: 'default', degree: 0 });
    this.draw();
    // notify UI to update degree table if available
    try{ if(window && typeof window.updateDegreeTable === 'function') window.updateDegreeTable(); }catch(e){}
    return id;
  },

  addEdge(a, b, weight){
 
    if(a === b) return;
    const exists = this.edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    if(exists) return;
    this.edges.push({ a, b, weight });
    // update node degree counters
    const na = this.nodes.find(n => n.id === a);
    const nb = this.nodes.find(n => n.id === b);
    if(na) na.degree = (na.degree || 0) + 1;
    if(nb) nb.degree = (nb.degree || 0) + 1;
    this.draw();
    // notify UI to update degree table if available
    try{ if(window && typeof window.updateDegreeTable === 'function') window.updateDegreeTable(); }catch(e){}
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
    try{ if(window && typeof window.updateDegreeTable === 'function') window.updateDegreeTable(); }catch(e){}
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

    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    
    this.edges.forEach(e => {
      const a = this.nodes.find(n => n.id === e.a);
      const b = this.nodes.find(n => n.id === e.b);
      if(!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      // MST edges get a distinct yellow highlight; otherwise keep existing highlight behavior
      if(e._mst){
        ctx.strokeStyle = '#f59e0b'; // yellow for MST
        ctx.lineWidth = 6;
      } else {
        ctx.strokeStyle = e._highlight ? '#10b981' : '#374151';
        ctx.lineWidth = e._highlight ? 5 : 3;
      }
      ctx.stroke();
      // weight label (optional for large graphs)
      if(this.showEdgeWeights){
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.fillStyle = '#c7f2ff';
        ctx.font = '12px sans-serif';
        ctx.fillText(String(e.weight), mx + 6, my - 6);
      }
    });

    // draw nodes
    this.nodes.forEach(n => {
      ctx.beginPath();
     
      let fill = '#60a5fa'; 
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

      // Label centered (optional for large graphs)
      if(this.showNodeLabels){
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);
      }

      // Degree label (optional)
      if(this.showNodeDegrees){
        ctx.fillStyle = '#dbeafe';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const deg = (typeof n.degree === 'number') ? n.degree : 0;
        ctx.fillText(String(deg), n.x, n.y + 20);
      }
    });
  }
};


window.Graph = Graph;
