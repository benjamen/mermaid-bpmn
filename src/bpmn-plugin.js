// bpmn-plugin.js

function renderBPMN(dsl) {
  const lines = dsl.trim().split("\n");

  const nodes = [];
  const edges = [];

  // Parse nodes
  lines.forEach(line => {
    const nodeMatch = line.match(/(startEvent|task|gateway|endEvent)\s+(\w+)\s*"(.+)"/);
    if (nodeMatch) {
      nodes.push({ type: nodeMatch[1], id: nodeMatch[2], label: nodeMatch[3] });
    }
  });

  // Parse edges
  lines.forEach(line => {
    const edgeMatch = line.match(/(\w+)\s*-->\s*(\w+)(?:\s*\|(.+?)\|)?/);
    if (edgeMatch) {
      edges.push({ from: edgeMatch[1], to: edgeMatch[2], label: edgeMatch[3] || "" });
    }
  });

  // Debug: warn if no nodes or edges
  if (nodes.length === 0) console.warn("No nodes detected in DSL.");
  if (edges.length === 0) console.warn("No edges detected in DSL.");

  // Compute vertical levels using DFS
  const levels = {};
  function dfs(id, depth) {
    if (!id) return;
    levels[id] = Math.max(levels[id] || 0, depth);
    edges.filter(e => e.from === id).forEach(e => dfs(e.to, depth + 1));
  }

  const startNode = nodes.find(n => n.type === "startEvent");
  if (!startNode) {
    console.warn("No startEvent node found. Using first node as start.");
    dfs(nodes[0]?.id, 0);
  } else {
    dfs(startNode.id, 0);
  }

  // Compute Y positions
  const nodeY = {};
  Object.entries(levels).forEach(([id, depth]) => {
    nodeY[id] = 50 + depth * 100;
  });

  // Compute horizontal positions per level
  const levelCounts = {};
  const nodeX = {};
  Object.entries(levels).forEach(([id, depth]) => {
    if (!levelCounts[depth]) levelCounts[depth] = 0;
    nodeX[id] = 100 + levelCounts[depth] * 200; // horizontal spacing
    levelCounts[depth]++;
  });

  // Start SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="600">
<defs>
  <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,6 L9,3 z" fill="#000"/>
  </marker>
</defs>
`;

  // Draw edges safely
  edges.forEach(e => {
    const x1 = nodeX[e.from] ?? 0;
    const y1 = nodeY[e.from] ?? 0;
    const x2 = nodeX[e.to] ?? 0;
    const y2 = nodeY[e.to] ?? 0;

    if (!nodes.find(n => n.id === e.from)) console.warn(`Edge from unknown node: ${e.from}`);
    if (!nodes.find(n => n.id === e.to)) console.warn(`Edge to unknown node: ${e.to}`);

    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="2" marker-end="url(#arrow)"/>`;

    if (e.label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 5;
      svg += `<text x="${midX}" y="${midY}" text-anchor="middle" font-size="12" fill="black">${e.label}</text>`;
    }
  });

  // Draw nodes safely
  nodes.forEach(n => {
    const x = nodeX[n.id] ?? 0;
    const y = nodeY[n.id] ?? 0;
    let shape = "";

    switch(n.type) {
      case "startEvent":
      case "endEvent":
        shape = `<circle cx="${x}" cy="${y}" r="30" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"/>`;
        break;
      case "task":
        shape = `<rect x="${x-50}" y="${y-25}" width="100" height="50" rx="5" ry="5" fill="#fff3e0" stroke="#f57c00" stroke-width="2"/>`;
        break;
      case "gateway":
        shape = `<polygon points="${x},${y-40} ${x+40},${y} ${x},${y+40} ${x-40},${y}" fill="#e8f5e9" stroke="#43a047" stroke-width="2"/>`;
        break;
    }

    svg += shape;
    svg += `<text x="${x}" y="${y}" text-anchor="middle" alignment-baseline="middle" font-size="14">${n.label}</text>`;
  });

  svg += `</svg>`;
  return svg;
}

// Mermaid-compatible plugin object
export const bpmnPlugin = {
  type: "diagram",
  name: "bpmnFlow",
  preprocess: (text) => text,
  parser: (text) => text,
  renderer: (text) => renderBPMN(text)
};
