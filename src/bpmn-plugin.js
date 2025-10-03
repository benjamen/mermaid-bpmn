// bpmn-plugin.js

/**
 * Advanced BPMN renderer for Mermaid plugin.
 * Features:
 * - BFS layout with collision avoidance
 * - Curved edges for clarity
 * - Optional "actor" attribute on tasks rendered bottom-right
 * - Safe coordinates and validation
 * - Extensible for future BPMN elements
 */

function renderBPMN(dsl) {
  const lines = dsl.trim().split("\n");

  const nodes = [];
  const edges = [];

  // --- 1. Parse nodes ---
  lines.forEach(line => {
    // Actor parsing: task <id> "label" [actor: Name]
    const match = line.match(/(startEvent|task|gateway|endEvent)\s+(\w+)\s*"(.+?)"(?:\s*\[actor:\s*(.+?)\])?/);
    if (match) nodes.push({ 
      type: match[1], 
      id: match[2], 
      label: match[3], 
      actor: match[4] || null 
    });
  });

  // --- 2. Parse edges ---
  lines.forEach(line => {
    const match = line.match(/(\w+)\s*-->\s*(\w+)(?:\s*\|(.+?)\|)?/);
    if (match) edges.push({ from: match[1], to: match[2], label: match[3] || "" });
  });

  if (nodes.length === 0) return `<div style="color:red;">No nodes found in DSL</div>`;
  if (edges.length === 0) console.warn("No edges found; rendering nodes only.");

  // --- 3. Build adjacency map ---
  const adjacency = {};
  nodes.forEach(n => adjacency[n.id] = []);
  edges.forEach(e => {
    if (adjacency[e.from]) adjacency[e.from].push(e.to);
    else console.warn(`Edge from unknown node: ${e.from}`);
  });

  // --- 4. BFS layout ---
  const nodeY = {};
  const nodeX = {};
  const levelNodes = {};
  const visited = new Set();

  let startNode = nodes.find(n => n.type === "startEvent") || nodes[0];

  const queue = [{ id: startNode.id, level: 0 }];
  while (queue.length > 0) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    if (!levelNodes[level]) levelNodes[level] = [];
    levelNodes[level].push(id);

    const children = adjacency[id] || [];
    children.forEach(childId => {
      if (!visited.has(childId)) queue.push({ id: childId, level: level + 1 });
    });
  }

  // --- 5. Assign vertical positions ---
  Object.entries(levelNodes).forEach(([level, ids]) => {
    ids.forEach(id => {
      nodeY[id] = 50 + level * 120;
    });
  });

  // --- 6. Assign horizontal positions with collision avoidance ---
  const minSpacing = 150;
  Object.entries(levelNodes).forEach(([level, ids]) => {
    const totalNodes = ids.length;
    const totalWidth = (totalNodes - 1) * minSpacing;
    ids.forEach((id, index) => {
      nodeX[id] = 100 + index * minSpacing - totalWidth / 2;
    });

    // Adjust if nodes overlap
    for (let i = 1; i < ids.length; i++) {
      if (nodeX[ids[i]] - nodeX[ids[i - 1]] < minSpacing) {
        const shift = minSpacing - (nodeX[ids[i]] - nodeX[ids[i - 1]]);
        for (let j = i; j < ids.length; j++) nodeX[ids[j]] += shift;
      }
    }
  });

  // --- 7. Compute SVG dimensions dynamically ---
  const allX = Object.values(nodeX);
  const allY = Object.values(nodeY);
  const svgWidth = Math.max(...allX) + 150;
  const svgHeight = Math.max(...allY) + 150;

  // --- 8. Generate SVG ---
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
<defs>
  <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,6 L9,3 z" fill="#000"/>
  </marker>
</defs>
`;

  // --- 9. Draw edges with curves ---
  edges.forEach(e => {
    const x1 = nodeX[e.from] ?? 0;
    const y1 = nodeY[e.from] ?? 0;
    const x2 = nodeX[e.to] ?? 0;
    const y2 = nodeY[e.to] ?? 0;

    // Use simple quadratic curve
    const cx = (x1 + x2) / 2;
    const cy = y1 - 30; // curve above nodes
    svg += `<path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" stroke="black" stroke-width="2" fill="transparent" marker-end="url(#arrow)"/>`;

    // Edge label at midpoint
    if (e.label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 10;
      svg += `<text x="${midX}" y="${midY}" text-anchor="middle" font-size="12" fill="black">${e.label}</text>`;
    }
  });

  // --- 10. Draw nodes and actors ---
  nodes.forEach(n => {
    const x = nodeX[n.id] ?? 0;
    const y = nodeY[n.id] ?? 0;
    let shape = "";
    let width = 100;
    let height = 50;

    switch (n.type) {
      case "startEvent":
      case "endEvent":
        shape = `<circle cx="${x}" cy="${y}" r="30" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"/>`;
        width = height = 60;
        break;
      case "task":
        shape = `<rect x="${x-50}" y="${y-25}" width="${width}" height="${height}" rx="5" ry="5" fill="#fff3e0" stroke="#f57c00" stroke-width="2"/>`;
        break;
      case "gateway":
        shape = `<polygon points="${x},${y-40} ${x+40},${y} ${x},${y+40} ${x-40},${y}" fill="#e8f5e9" stroke="#43a047" stroke-width="2"/>`;
        width = height = 80;
        break;
      default:
        shape = `<rect x="${x-50}" y="${y-25}" width="${width}" height="${height}" fill="#ddd" stroke="#999"/>`;
    }

    svg += shape;
    svg += `<text x="${x}" y="${y}" text-anchor="middle" alignment-baseline="middle" font-size="14">${n.label}</text>`;

    // Draw actor if present (bottom-right of task)
    if (n.actor && n.type === "task") {
      svg += `<text x="${x + width/2 - 5}" y="${y + height/2 - 5}" text-anchor="end" alignment-baseline="hanging" font-size="10" fill="#555">${n.actor}</text>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

// Mermaid plugin
export const bpmnPlugin = {
  type: "diagram",
  name: "bpmnFlow",
  preprocess: (text) => text,
  parser: (text) => text,
  renderer: (text) => renderBPMN(text)
};
