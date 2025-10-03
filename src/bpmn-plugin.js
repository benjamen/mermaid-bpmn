// bpmn-plugin.js

function renderBPMN(dsl) {
  const lines = dsl.trim().split("\n");

  const nodes = [];
  const edges = [];

  lines.forEach(line => {
    const match = line.match(/(startEvent|task|gateway|endEvent)\s+(\w+)\s*"(.+?)"(?:\s*\[actor:\s*(.+?)\])?/);
    if (match) nodes.push({ 
      type: match[1], 
      id: match[2], 
      label: match[3], 
      actor: match[4] || null 
    });
  });

  lines.forEach(line => {
    const match = line.match(/(\w+)\s*-->\s*(\w+)(?:\s*\|(.+?)\|)?/);
    if (match) edges.push({ from: match[1], to: match[2], label: match[3] || "" });
  });

  if (nodes.length === 0) return `<div style="color:red;">No nodes found in DSL</div>`;

  const adjacency = {};
  nodes.forEach(n => adjacency[n.id] = []);
  edges.forEach(e => {
    if (adjacency[e.from]) adjacency[e.from].push(e.to);
  });

  // BFS layout with parent tracking
  const nodeX = {}, nodeY = {}, parentsMap = {};
  const levelNodes = {};
  const visited = new Set();

  let startNode = nodes.find(n=>n.type==="startEvent") || nodes[0];
  const queue = [{ id: startNode.id, level: 0 }];
  while(queue.length>0){
    const {id, level} = queue.shift();
    if(visited.has(id)) continue;
    visited.add(id);
    if(!levelNodes[level]) levelNodes[level]=[];
    levelNodes[level].push(id);
    nodeY[id] = 50 + level*120;
    const children = adjacency[id]||[];
    children.forEach(childId => {
      if(!parentsMap[childId]) parentsMap[childId]=[];
      parentsMap[childId].push(id);
      if(!visited.has(childId)) queue.push({id: childId, level: level+1});
    });
  }

  // Horizontal positioning with branch centering
  const minSpacing=150;
  Object.entries(levelNodes).forEach(([level, ids])=>{
    ids.forEach(id=>{
      const parents = parentsMap[id]||[];
      if(parents.length>0){
        nodeX[id] = parents.reduce((sum,p)=>sum+(nodeX[p]??0),0)/parents.length;
      } else nodeX[id] = 100;
    });
    const sorted = ids.slice().sort((a,b)=>nodeX[a]-nodeX[b]);
    for(let i=1;i<sorted.length;i++){
      if(nodeX[sorted[i]]-nodeX[sorted[i-1]]<minSpacing) nodeX[sorted[i]]=nodeX[sorted[i-1]]+minSpacing;
    }
    ids.forEach(id=>{ if(nodeX[id]<50) nodeX[id]=50; });
  });

  const allX = Object.values(nodeX);
  const allY = Object.values(nodeY);
  const svgWidth = Math.max(...allX)+150;
  const svgHeight = Math.max(...allY)+150;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
<path d="M0,0 L0,6 L9,3 z" fill="#000"/>
</marker>
</defs>`;

  // Draw edges as polylines
  edges.forEach(e=>{
    const x1=nodeX[e.from]??0, y1=nodeY[e.from]??0;
    const x2=nodeX[e.to]??0, y2=nodeY[e.to]??0;
    const midY = (y1 + y2)/2;
    const points = [
      [x1, y1],
      [x1, midY],
      [x2, midY],
      [x2, y2]
    ];
    const path = `M${points.map(p=>p.join(',')).join(' L')}`;
    svg += `<path d="${path}" stroke="black" stroke-width="2" fill="transparent" marker-end="url(#arrow)"/>`;
    if(e.label){
      const labelX = (x1+x2)/2;
      const labelY = midY - 10;
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="12" fill="black">${e.label}</text>`;
    }
  });

  // Draw nodes and actor labels
  nodes.forEach(n=>{
    const x=nodeX[n.id]??0, y=nodeY[n.id]??0;
    let shape="", width=100, height=50;
    switch(n.type){
      case "startEvent": case "endEvent":
        shape=`<circle cx="${x}" cy="${y}" r="30" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"/>`; width=height=60; break;
      case "task":
        shape=`<rect x="${x-50}" y="${y-25}" width="${width}" height="${height}" rx="5" ry="5" fill="#fff3e0" stroke="#f57c00" stroke-width="2"/>`; break;
      case "gateway":
        shape=`<polygon points="${x},${y-40} ${x+40},${y} ${x},${y+40} ${x-40},${y}" fill="#e8f5e9" stroke="#43a047" stroke-width="2"/>`; width=height=80; break;
      default:
        shape=`<rect x="${x-50}" y="${y-25}" width="${width}" height="${height}" fill="#ddd" stroke="#999"/>`;
    }
    svg+=shape;
    svg+=`<text x="${x}" y="${y}" text-anchor="middle" alignment-baseline="middle" font-size="14">${n.label}</text>`;

    if(n.actor && n.type==="task"){
      const actorTextX = x+width/2-5;
      const actorTextY = y+height/2-5;
      const padding=4;
      const approxWidth = n.actor.length*6 + padding*2;
      const approxHeight = 12 + padding;
      svg+=`<rect x="${actorTextX - approxWidth}" y="${actorTextY}" width="${approxWidth}" height="${approxHeight}" fill="#fff" stroke="#ccc" rx="2"/>`;
      svg+=`<text x="${actorTextX}" y="${actorTextY+padding/2}" text-anchor="end" alignment-baseline="hanging" font-size="10" fill="#555">${n.actor}</text>`;
    }
  });

  svg+=`</svg>`;
  return svg;
}

export const bpmnPlugin = {
  type:"diagram",
  name:"bpmnFlow",
  preprocess:text=>text,
  parser:text=>text,
  renderer:text=>renderBPMN(text)
};
