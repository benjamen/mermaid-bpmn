// src/bpmn-plugin.js
//
// BPMN Plugin – parses DSL into nodes/edges and renders them to SVG
//

function preprocess(dslText) {
  const lines = dslText.trim().split("\n");
  const nodes = [];
  const edges = [];

  lines.forEach(line => {
    if (line.startsWith("startEvent")) {
      const [, id, ...labelParts] = line.split(" ");
      const label = labelParts.join(" ").replace(/"/g, "");
      nodes.push({ id, type: "startEvent", label });
    } else if (line.startsWith("task")) {
      const [, id, ...rest] = line.split(" ");
      const label = rest[0]?.replace(/"/g, "") || "";
      const actor = rest.slice(1).join(" ").replace(/"/g, "") || null;
      nodes.push({ id, type: "task", label, actor });
    } else if (line.startsWith("gateway")) {
      const [, id, ...labelParts] = line.split(" ");
      const label = labelParts.join(" ").replace(/"/g, "");
      nodes.push({ id, type: "gateway", label });
    } else if (line.startsWith("endEvent")) {
      const [, id, ...labelParts] = line.split(" ");
      const label = labelParts.join(" ").replace(/"/g, "");
      nodes.push({ id, type: "endEvent", label });
    } else if (line.includes("-->")) {
      const edgeMatch = line.match(/(\w+)\s*-->\s*(?:\|(.+?)\|)?\s*(\w+)/);
      if (edgeMatch) {
        const [, from, label, to] = edgeMatch;
        edges.push({ from, to, label: label || null });
      }
    }
  });

  return { nodes, edges };
}

function render({ nodes, edges }, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const nodeY = {};
  const nodeX = {};
  const spacingY = 120;
  const spacingX = 200;

  nodes.forEach((n, i) => {
    nodeY[n.id] = 80 + i * spacingY;
    nodeX[n.id] = 150; // simple vertical layout
  });

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${nodes.length * spacingY + 100}">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="#000"></path>
      </marker>
    </defs>`;

  // edges
  edges.forEach(e => {
    const x1 = nodeX[e.from];
    const y1 = nodeY[e.from];
    const x2 = nodeX[e.to];
    const y2 = nodeY[e.to];

    svg += `<path d="M${x1},${y1} L${x1},${(y1 + y2) / 2} L${x2},${(y1 + y2) / 2} L${x2},${y2}"
              stroke="black" stroke-width="2" fill="transparent" marker-end="url(#arrow)"/>`;

    if (e.label) {
      svg += `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 5}" text-anchor="middle" font-size="12" fill="#555">${e.label}</text>`;
    }
  });

  // nodes
  nodes.forEach(n => {
    const x = nodeX[n.id];
    const y = nodeY[n.id];

    if (n.type === "startEvent") {
      svg += `<circle cx="${x}" cy="${y}" r="30" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"></circle>`;
      svg += `<text x="${x}" y="${y}" text-anchor="middle" alignment-baseline="middle" font-size="14">${n.label}</text>`;
    } else if (n.type === "endEvent") {
      svg += `<circle cx="${x}" cy="${y}" r="30" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"></circle>`;
      svg += `<text x="${x}" y="${y}" text-anchor="middle" alignment-baseline="middle" font-size="14">${n.label}</text>`;
    } else if (n.type === "task") {
      svg += `<rect x="${x - 50}" y="${y - 25}" width="100" height="50" rx="5" ry="5" fill="#fff3e0" stroke="#f57c00" stroke-width="2"></rect>`;
      svg += `<text x="${x}" y="${y}" text-anchor="middle" alignment-baseline="middle" font-size="14">${n.label}</text>`;
      if (n.actor) {
        const textWidth = n.actor.length * 6.5;
        const rectX = x + 50 - textWidth - 8;
        const rectY = y + 18;
        svg += `<rect x="${rectX}" y="${rectY - 12}" width="${textWidth + 6}" height="16" fill="#fff" stroke="#ccc" rx="2"></rect>`;
        svg += `<text x="${rectX + textWidth + 3}" y="${rectY - 2}" text-anchor="end" font-size="10" fill="#555">${n.actor}</text>`;
      }
    } else if (n.type === "gateway") {
      svg += `<polygon points="${x},${y - 40} ${x + 40},${y} ${x},${y + 40} ${x - 40},${y}" fill="#e8f5e9" stroke="#43a047" stroke-width="2"></polygon>`;
      svg += `<text x="${x}" y="${y}" text-anchor="middle" alignment-baseline="middle" font-size="14">${n.label}</text>`;
    }
  });

  svg += `</svg>`;
  container.innerHTML = svg;
}

export const bpmnPlugin = {
  preprocess,
  render
};
