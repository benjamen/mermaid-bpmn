// bpmn-plugin.js
// Robust BPMN renderer: correct parsing, branch-aware layout, polyline routing, actor backgrounds.

function getNodeSizeByType(type) {
  // default width/height for types (used for attachment points)
  switch (type) {
    case "startEvent":
    case "endEvent": return { width: 60, height: 60 };
    case "gateway": return { width: 80, height: 80 };
    case "task": default: return { width: 100, height: 50 };
  }
}

function parseDSL(dsl) {
  const lines = dsl.trim().split("\n").map(l => l.trim()).filter(Boolean);
  const nodes = [];
  const edges = [];

  // Node parsing: (startEvent|task|gateway|endEvent) ID "Label" [actor: Name]
  const nodeRe = /^(startEvent|task|gateway|endEvent)\s+([A-Za-z0-9_]+)\s*"(.+?)"(?:\s*\[actor:\s*(.+?)\])?$/;

  // Edge parsing: handle `A -->|label| B` *and* `A --> B |label|` variants;
  // groups: 1=from, 2=labelBefore (optional), 3=to, 4=labelAfter (optional)
  const edgeRe = /^\s*([A-Za-z0-9_]+)\s*-->\s*(?:\|(.+?)\|\s*)?([A-Za-z0-9_]+)\s*(?:\|\s*(.+?)\s*\|)?\s*$/;

  lines.forEach(line => {
    let m = nodeRe.exec(line);
    if (m) {
      nodes.push({ type: m[1], id: m[2], label: m[3], actor: m[4] ? m[4].trim() : null });
      return;
    }
    m = edgeRe.exec(line);
    if (m) {
      const from = m[1], label = (m[2] || m[4] || "").trim(), to = m[3];
      edges.push({ from, to, label });
      return;
    }

    // ignore other lines like "bpmnFlow" but warn if it looks like a malformed DSL line
    if (!/^bpmnFlow$/i.test(line)) console.warn("Unrecognized DSL line (ignored):", line);
  });

  return { nodes, edges };
}

function ensureAllNodesVisited(nodes, visitedSet, levelNodes, nodeY) {
  // Place unvisited nodes on a new level below existing ones so they show up
  const maxLevel = Math.max(...Object.keys(levelNodes).map(l => +l), 0);
  const unvisited = nodes.filter(n => !visitedSet.has(n.id));
  if (unvisited.length === 0) return;
  const next = maxLevel + 1;
  levelNodes[next] = levelNodes[next] || [];
  unvisited.forEach(n => {
    levelNodes[next].push(n.id);
    nodeY[n.id] = 50 + next * 120;
  });
}

function renderBPMN(dsl) {
  const { nodes, edges } = parseDSL(dsl);

  if (nodes.length === 0) return `<div style="color:red;">No nodes found in DSL</div>`;

  // Build adjacency and parent map
  const adjacency = {};
  const parentsMap = {};
  nodes.forEach(n => { adjacency[n.id] = []; parentsMap[n.id] = []; });

  edges.forEach(e => {
    if (!adjacency[e.from]) {
      console.warn(`Edge references unknown from-node: ${e.from}`);
      // still create adjacency for robustness
      adjacency[e.from] = [e.to];
      parentsMap[e.to] = (parentsMap[e.to] || []).concat(e.from);
    } else {
      adjacency[e.from].push(e.to);
      parentsMap[e.to] = (parentsMap[e.to] || []).concat(e.from);
    }
  });

  // BFS to create levels (parents-first)
  const levelNodes = {}; // level -> [ids]
  const nodeY = {};
  const nodeX = {};
  const visited = new Set();

  let start = nodes.find(n => n.type === "startEvent") || nodes[0];
  if (!start) return `<div style="color:red;">No start node found</div>`;

  const queue = [{ id: start.id, level: 0 }];
  while (queue.length) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    levelNodes[level] = levelNodes[level] || [];
    levelNodes[level].push(id);
    nodeY[id] = 50 + level * 120;

    const children = adjacency[id] || [];
    children.forEach(childId => {
      if (!visited.has(childId)) queue.push({ id: childId, level: level + 1 });
    });
  }

  // If any nodes weren't reached (disconnected), append them in next level
  ensureAllNodesVisited(nodes, visited, levelNodes, nodeY);

  // Layout: assign X, level-by-level (parents first), then shift so leftmost >= margin
  const minSpacing = 150;
  const marginLeft = 50;
  const baseStartX = 200;

  const sortedLevels = Object.keys(levelNodes).map(Number).sort((a,b)=>a-b);
  sortedLevels.forEach(lvl => {
    const ids = levelNodes[lvl];
    // first, assign X from parents' average if parents exist
    ids.forEach(id => {
      const parents = parentsMap[id] || [];
      if (parents.length > 0) {
        const sum = parents.reduce((s, p) => s + (nodeX[p] ?? baseStartX), 0);
        nodeX[id] = sum / parents.length;
      } else {
        // placeholder; will layout evenly below
        nodeX[id] = null;
      }
    });

    // For any nodes without parent-derived X, lay them left-to-right
    let curX = baseStartX - ((ids.length - 1) * minSpacing) / 2; // center-start
    ids.forEach(id => {
      if (nodeX[id] === null) {
        nodeX[id] = curX;
        curX += minSpacing;
      }
    });

    // Collision avoidance: ensure separation >= minSpacing
    const order = ids.slice().sort((a,b)=> (nodeX[a]||0) - (nodeX[b]||0));
    for (let i = 1; i < order.length; i++) {
      const prev = nodeX[order[i-1]];
      if (nodeX[order[i]] - prev < minSpacing) {
        nodeX[order[i]] = prev + minSpacing;
      }
    }

    // ensure left margin
    ids.forEach(id => { if (nodeX[id] < marginLeft) nodeX[id] = marginLeft; });
  });

  // After all Xs set, if leftmost < marginLeft shift everything right
  const xs = Object.values(nodeX).filter(v=>typeof v === "number");
  const minX = Math.min(...xs);
  if (minX < marginLeft) {
    const shift = marginLeft - minX;
    Object.keys(nodeX).forEach(k => nodeX[k] += shift);
  }

  // Compute full SVG bounds
  const allX = Object.values(nodeX);
  const allY = Object.values(nodeY);
  const svgWidth = Math.max(...allX) + 150;
  const svgHeight = Math.max(...allY) + 150;

  // Helper for node dimensions
  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);

  // Begin SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
<defs>
  <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="strokeWidth">
    <path d="M0,0 L0,6 L9,3 z" fill="#000"/>
  </marker>
</defs>
`;

  // Edge routing as polylines (vertical out from parent's bottom -> horizontal -> down to child top)
  edges.forEach(e => {
    const from = e.from, to = e.to;
    if (!nodeMap[from]) { console.warn("Missing from-node for edge:", e); return; }
    if (!nodeMap[to]) { console.warn("Missing to-node for edge:", e); return; }

    const fromType = nodeMap[from].type, toType = nodeMap[to].type;
    const { width: w1, height: h1 } = getNodeSizeByType(fromType);
    const { width: w2, height: h2 } = getNodeSizeByType(toType);

    const startX = nodeX[from];
    const startY = nodeY[from] + h1 / 2;   // bottom of parent
    const endX = nodeX[to];
    const endY = nodeY[to] - h2 / 2;       // top of child

    // mid Y ensures the horizontal segment is between levels
    const midY = (startY + endY) / 2;

    const path = `M${startX},${startY} L${startX},${midY} L${endX},${midY} L${endX},${endY}`;
    svg += `<path d="${path}" stroke="black" stroke-width="2" fill="transparent" marker-end="url(#arrow)"/>`;

    if (e.label) {
      const labelX = (startX + endX) / 2;
      const labelY = midY - 8;
      // small background for label (improves readability)
      svg += `<rect x="${labelX - 30}" y="${labelY - 12}" width="${Math.max(40, e.label.length*7)}" height="16" fill="#fff" opacity="0.9" rx="2"/>`;
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" alignment-baseline="middle" font-size="12" fill="#000">${e.label}</text>`;
    }
  });

  // Draw nodes + actor backgrounds
  nodes.forEach(n => {
    const x = nodeX[n.id] ?? 0;
    const y = nodeY[n.id] ?? 0;
    const { width, height } = getNodeSizeByType(n.type);

    switch (n.type) {
      case "startEvent":
      case "endEvent":
        svg += `<circle cx="${x}" cy="${y}" r="${width/2}" fill="#e3f2fd" stroke="#1976d2" stroke-width="2"/>`;
        break;
      case "gateway":
        // diamond centered at x,y; size ~ width/height
        svg += `<polygon points="${x},${y - height/2} ${x+width/2},${y} ${x},${y+height/2} ${x-width/2},${y}" fill="#e8f5e9" stroke="#43a047" stroke-width="2"/>`;
        break;
      case "task":
      default:
        const left = x - width/2;
        const top = y - height/2;
        svg += `<rect x="${left}" y="${top}" width="${width}" height="${height}" rx="6" ry="6" fill="#fff3e0" stroke="#f57c00" stroke-width="2"/>`;
        break;
    }

    // main label centered
    svg += `<text x="${x}" y="${y}" text-anchor="middle" alignment-baseline="middle" font-size="14">${n.label}</text>`;

    // actor label (bottom-right inside task box) with background
    if (n.actor && n.type === "task") {
      const left = x - width/2;
      const top = y - height/2;
      const paddingX = 6, paddingY = 4;
      const approxCharW = 7; // rough per-character width
      const actorText = n.actor;
      const rectW = Math.max(40, actorText.length * approxCharW + paddingX * 2);
      const rectH = 14 + paddingY * 2; // font-size 14 baseline
      const rectX = left + width - rectW - 6; // 6px inner margin from right edge
      const rectY = top + height - rectH - 6; // 6px inner margin from bottom edge

      // background with slight opacity so edges under it won't show through
      svg += `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="4" fill="#fff" stroke="#ccc"/>`;
      svg += `<text x="${rectX + paddingX}" y="${rectY + rectH / 2}" alignment-baseline="middle" text-anchor="start" font-size="12" fill="#333">${actorText}</text>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

export const bpmnPlugin = {
  type: "diagram",
  name: "bpmnFlow",
  preprocess: (t) => t,
  parser: (t) => t,
  renderer: (t) => renderBPMN(t)
};
