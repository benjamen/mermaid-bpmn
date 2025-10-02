export const bpmnPlugin = {
  id: "bpmnFlowPlugin",

  // Preprocessor: detect bpmnFlow diagrams
  preprocess: (text) => {
    if (text.trim().startsWith("bpmnFlow")) {
      return {
        type: "bpmnFlow",
        content: text.replace(/^bpmnFlow/, "").trim()
      };
    }
    return null; // other diagram types
  },

  renderer: {
    draw: async (diagramObj, elementId) => {
      const container = document.getElementById(elementId);
      if (!container) return;

      const lines = diagramObj.content.split("\n").map(l => l.trim()).filter(Boolean);

      const nodes = [];
      const edges = [];

      // Parse nodes
      lines.forEach(line => {
        const match = line.match(/(startEvent|task|gateway|endEvent)\s+(\w+)(?:\s+"(.+)")?/);
        if (match) {
          nodes.push({
            type: match[1],
            id: match[2],
            label: match[3] || match[2]
          });
        }
      });

      // Parse connections
      lines.forEach(line => {
        const match = line.match(/(\w+)\s*-->\s*(\w+)/);
        if (match) edges.push({ from: match[1], to: match[2] });
      });

      // Simple layout: vertical spacing
      const nodeY = {};
      nodes.forEach((n, i) => nodeY[n.id] = 50 + i * 70);

      // Render SVG
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${50 + nodes.length*80}">`;

      // Draw edges (lines)
      edges.forEach(e => {
        const x1 = 200;
        const y1 = nodeY[e.from] + 30;
        const x2 = 200;
        const y2 = nodeY[e.to] + 30;
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="2" marker-end="url(#arrow)"/>`;
      });

      // Arrowhead marker
      svg += `
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="black"/>
          </marker>
        </defs>
      `;

      // Draw nodes
      nodes.forEach((n, i) => {
        const y = nodeY[n.id];
        if (n.type === "startEvent") svg += `<circle cx="200" cy="${y}" r="20" class="bpmn-start"/><text x="200" y="${y+5}" text-anchor="middle">${n.label}</text>`;
        if (n.type === "endEvent") svg += `<circle cx="200" cy="${y}" r="20" class="bpmn-end"/><text x="200" y="${y+5}" text-anchor="middle">${n.label}</text>`;
        if (n.type === "task") svg += `<rect x="150" y="${y-30}" width="100" height="60" rx="8" ry="8" class="bpmn-task"/><text x="200" y="${y+5}" text-anchor="middle">${n.label}</text>`;
        if (n.type === "gateway") svg += `<polygon points="200,${y-30} 230,${y} 200,${y+30} 170,${y}" class="bpmn-gateway"/><text x="200" y="${y+5}" text-anchor="middle">${n.label}</text>`;
      });

      svg += "</svg>";
      container.innerHTML = svg;
    }
  },

  styles: `
    .bpmn-task { fill: #e0f7fa; stroke: #006064; stroke-width: 2; }
    .bpmn-start { fill: white; stroke: green; stroke-width: 2; }
    .bpmn-end { fill: white; stroke: red; stroke-width: 3; }
    .bpmn-gateway { fill: #fff9c4; stroke: #f57f17; stroke-width: 2; }
    text { font-family: Arial, sans-serif; font-size: 12px; }
  `
};
