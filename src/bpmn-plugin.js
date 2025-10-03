// src/bpmn-plugin.js

export function bpmnPlugin() {
  return {
    id: "bpmn",
    diagram: {
      db: {
        clear() {},
      },
      parser: {
        parse(text) {
          // Parse into a structured model
          this.definitions = [];
          const lines = text.trim().split("\n");
          for (const line of lines) {
            const taskMatch = line.match(/task\s+(\w+)\s+"([^"]+)"(?:\s+actor="([^"]+)")?/);
            const startMatch = line.match(/startEvent\s+(\w+)\s+"([^"]+)"/);
            const endMatch = line.match(/endEvent\s+(\w+)\s+"([^"]+)"/);
            const gatewayMatch = line.match(/gateway\s+(\w+)\s+"([^"]+)"/);
            const arrowMatch = line.match(/(\w+)\s*-->\s*(?:\|([^|]+)\|)?\s*(\w+)/);

            if (taskMatch) {
              this.definitions.push({
                type: "task",
                id: taskMatch[1],
                label: taskMatch[2],
                actor: taskMatch[3] || null,
              });
            } else if (startMatch) {
              this.definitions.push({
                type: "startEvent",
                id: startMatch[1],
                label: startMatch[2],
              });
            } else if (endMatch) {
              this.definitions.push({
                type: "endEvent",
                id: endMatch[1],
                label: endMatch[2],
              });
            } else if (gatewayMatch) {
              this.definitions.push({
                type: "gateway",
                id: gatewayMatch[1],
                label: gatewayMatch[2],
              });
            } else if (arrowMatch) {
              this.definitions.push({
                type: "flow",
                from: arrowMatch[1],
                to: arrowMatch[3],
                label: arrowMatch[2] || null,
              });
            }
          }
        },
      },
      renderer: {
        async draw(text, id) {
          const container = document.getElementById(id);
          container.innerHTML = "";
          renderBPMN(id, this.definitions);
        },
      },
      styles: () => "",
    },
  };
}

function renderBPMN(containerId, elements) {
  const svgNS = "http://www.w3.org/2000/svg";
  const container = document.getElementById(containerId);

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "800");
  svg.setAttribute("height", "600");

  const defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML = `
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3"
      orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#000"></path>
    </marker>`;
  svg.appendChild(defs);

  // crude fixed layout (improve later)
  const positions = {
    start: { x: 150, y: 80 },
    T1: { x: 150, y: 200 },
    G1: { x: 150, y: 320 },
    T2: { x: 350, y: 320 },
    end: { x: -50, y: 320 },
  };

  // --- helpers
  const drawTask = (el) => {
    const { x, y } = positions[el.id];
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", x - 50);
    rect.setAttribute("y", y - 25);
    rect.setAttribute("width", "100");
    rect.setAttribute("height", "50");
    rect.setAttribute("rx", "5");
    rect.setAttribute("ry", "5");
    rect.setAttribute("fill", "#fff3e0");
    rect.setAttribute("stroke", "#f57c00");
    rect.setAttribute("stroke-width", "2");
    svg.appendChild(rect);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("alignment-baseline", "middle");
    text.setAttribute("font-size", "14");
    text.textContent = el.label;
    svg.appendChild(text);

    if (el.actor) {
      const bg = document.createElementNS(svgNS, "rect");
      bg.setAttribute("x", x + 5);
      bg.setAttribute("y", y + 10);
      bg.setAttribute("width", el.actor.length * 6 + 10);
      bg.setAttribute("height", 16);
      bg.setAttribute("fill", "#fff");
      bg.setAttribute("stroke", "#ccc");
      bg.setAttribute("rx", "2");
      svg.appendChild(bg);

      const actorText = document.createElementNS(svgNS, "text");
      actorText.setAttribute("x", x + 5 + el.actor.length * 6);
      actorText.setAttribute("y", y + 22);
      actorText.setAttribute("text-anchor", "end");
      actorText.setAttribute("font-size", "10");
      actorText.setAttribute("fill", "#555");
      actorText.textContent = el.actor;
      svg.appendChild(actorText);
    }
  };

  const drawCircle = (el) => {
    const { x, y } = positions[el.id];
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "30");
    circle.setAttribute("fill", "#e3f2fd");
    circle.setAttribute("stroke", "#1976d2");
    circle.setAttribute("stroke-width", "2");
    svg.appendChild(circle);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("alignment-baseline", "middle");
    text.setAttribute("font-size", "14");
    text.textContent = el.label;
    svg.appendChild(text);
  };

  const drawGateway = (el) => {
    const { x, y } = positions[el.id];
    const diamond = document.createElementNS(svgNS, "polygon");
    diamond.setAttribute(
      "points",
      `${x},${y-40} ${x+40},${y} ${x},${y+40} ${x-40},${y}`
    );
    diamond.setAttribute("fill", "#e8f5e9");
    diamond.setAttribute("stroke", "#43a047");
    diamond.setAttribute("stroke-width", "2");
    svg.appendChild(diamond);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("alignment-baseline", "middle");
    text.setAttribute("font-size", "14");
    text.textContent = el.label;
    svg.appendChild(text);
  };

  const drawArrow = (el) => {
    const { x: x1, y: y1 } = positions[el.from];
    const { x: x2, y: y2 } = positions[el.to];
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", "black");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("marker-end", "url(#arrow)");
    svg.appendChild(line);

    if (el.label) {
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("x", (x1 + x2) / 2);
      text.setAttribute("y", (y1 + y2) / 2 - 5);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", "12");
      text.setAttribute("fill", "#555");
      text.textContent = el.label;
      svg.appendChild(text);
    }
  };

  // --- render
  elements.forEach((el) => {
    if (el.type === "startEvent" || el.type === "endEvent") drawCircle(el);
    if (el.type === "task") drawTask(el);
    if (el.type === "gateway") drawGateway(el);
  });
  elements.filter((el) => el.type === "flow").forEach(drawArrow);

  container.appendChild(svg);
}
