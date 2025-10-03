// main.js
import mermaid from "mermaid";
import { bpmnPlugin } from "./bpmn-plugin.js";

mermaid.initialize({
  startOnLoad: false,
  plugins: [bpmnPlugin]
});

const editor = document.getElementById("editor");
const diagram = document.getElementById("diagram");

// ---- Helpers ----
function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, val);
  }
  return el;
}

function drawArrow(svg, x1, y1, x2, y2) {
  const path = createSvgElement("path", {
    d: `M${x1},${y1} L${x2},${y2}`,
    stroke: "black",
    "stroke-width": "2",
    fill: "transparent",
    "marker-end": "url(#arrow)"
  });
  svg.appendChild(path);
}

// ---- Renderer ----
function renderDiagram(parsed) {
  diagram.innerHTML = "";

  const svg = createSvgElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "800",
    height: "600"
  });

  // defs for arrows
  const defs = createSvgElement("defs");
  const marker = createSvgElement("marker", {
    id: "arrow",
    markerWidth: "10",
    markerHeight: "10",
    refX: "10",
    refY: "3",
    orient: "auto",
    markerUnits: "strokeWidth"
  });
  const arrowPath = createSvgElement("path", {
    d: "M0,0 L0,6 L9,3 z",
    fill: "#000"
  });
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // Layout variables
  let x = 250;
  let y = 70;
  const vSpacing = 120;
  const hSpacing = 160;

  const nodePositions = {};

  parsed.nodes.forEach((node, idx) => {
    if (node.type === "startEvent") {
      const circle = createSvgElement("circle", {
        cx: x,
        cy: y,
        r: 25,
        fill: "#e3f2fd",
        stroke: "#1976d2",
        "stroke-width": 2
      });
      svg.appendChild(circle);

      const text = createSvgElement("text", {
        x,
        y,
        "text-anchor": "middle",
        "alignment-baseline": "middle",
        "font-size": "14"
      });
      text.textContent = node.label || "Start";
      svg.appendChild(text);

      nodePositions[node.id] = { x, y };
      y += vSpacing;
    }

    else if (node.type === "task") {
      const rect = createSvgElement("rect", {
        x: x - 50,
        y: y - 25,
        width: 100,
        height: 50,
        rx: 5,
        ry: 5,
        fill: "#fff3e0",
        stroke: "#f57c00",
        "stroke-width": 2
      });
      svg.appendChild(rect);

      const text = createSvgElement("text", {
        x,
        y,
        "text-anchor": "middle",
        "alignment-baseline": "middle",
        "font-size": "14"
      });
      text.textContent = node.label;
      svg.appendChild(text);

      if (node.actor) {
        const labelRect = createSvgElement("rect", {
          x: x + 20,
          y: y + 15,
          width: 80,
          height: 16,
          fill: "#fff",
          stroke: "#ccc",
          rx: 2
        });
        svg.appendChild(labelRect);

        const actorText = createSvgElement("text", {
          x: x + 95,
          y: y + 23,
          "text-anchor": "end",
          "alignment-baseline": "middle",
          "font-size": "10",
          fill: "#555"
        });
        actorText.textContent = node.actor;
        svg.appendChild(actorText);
      }

      nodePositions[node.id] = { x, y };
      y += vSpacing;
    }

    else if (node.type === "gateway") {
      const points = [
        `${x},${y - 40}`,
        `${x + 40},${y}`,
        `${x},${y + 40}`,
        `${x - 40},${y}`
      ].join(" ");
      const diamond = createSvgElement("polygon", {
        points,
        fill: "#e8f5e9",
        stroke: "#43a047",
        "stroke-width": 2
      });
      svg.appendChild(diamond);

      const text = createSvgElement("text", {
        x,
        y,
        "text-anchor": "middle",
        "alignment-baseline": "middle",
        "font-size": "14"
      });
      text.textContent = node.label;
      svg.appendChild(text);

      nodePositions[node.id] = { x, y };
      y += vSpacing;
    }

    else if (node.type === "endEvent") {
      const circle = createSvgElement("circle", {
        cx: x,
        cy: y,
        r: 25,
        fill: "#e3f2fd",
        stroke: "#1976d2",
        "stroke-width": 2
      });
      svg.appendChild(circle);

      const text = createSvgElement("text", {
        x,
        y,
        "text-anchor": "middle",
        "alignment-baseline": "middle",
        "font-size": "14"
      });
      text.textContent = node.label || "End";
      svg.appendChild(text);

      nodePositions[node.id] = { x, y };
      y += vSpacing;
    }
  });

  // draw edges
  parsed.edges.forEach(edge => {
    const from = nodePositions[edge.from];
    const to = nodePositions[edge.to];
    if (from && to) {
      drawArrow(svg, from.x, from.y + 25, to.x, to.y - 25);

      if (edge.label) {
        const text = createSvgElement("text", {
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2,
          "text-anchor": "middle",
          "alignment-baseline": "middle",
          "font-size": "12",
          fill: "#333"
        });
        text.textContent = edge.label;
        svg.appendChild(text);
      }
    }
  });

  diagram.appendChild(svg);
}

// ---- Main render hook ----
window.renderDiagram = async () => {
  const rawText = editor.value;

  const diagramObj = bpmnPlugin.preprocess(rawText);
  if (diagramObj) {
    renderDiagram(diagramObj);
  } else {
    diagram.innerHTML = `<div class="mermaid">${rawText}</div>`;
    mermaid.init(undefined, diagram);
  }
};

document.getElementById("renderBtn").addEventListener("click", window.renderDiagram);

// initial render
window.renderDiagram();
