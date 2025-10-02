export const bpmnPlugin = {
  id: "bpmnFlowPlugin",
  
  // Preprocessor: detect `bpmnFlow` diagrams
  preprocess: (text) => {
    if (text.trim().startsWith("bpmnFlow")) {
      return {
        type: "bpmnFlow",
        content: text.replace(/^bpmnFlow/, "").trim()
      };
    }
    // Return null for diagrams we don't handle
    return null;
  },

  renderer: {
    draw: async (diagramObj, elementId) => {
      const container = document.getElementById(elementId);
      if (!container) return;

      const lines = diagramObj.content.split("\n").map(l => l.trim()).filter(Boolean);
      
      // Simple SVG rendering of BPMN elements
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="250">`;

      lines.forEach((line, i) => {
        if (line.startsWith("startEvent")) {
          svg += `<circle cx="${50}" cy="${50 + i*70}" r="20" class="bpmn-start"/>`;
        } else if (line.startsWith("task")) {
          svg += `<rect x="120" y="${30 + i*70}" width="120" height="60" rx="8" ry="8" class="bpmn-task"/>`;
        } else if (line.startsWith("gateway")) {
          svg += `<polygon points="280,${30 + i*70} 320,${60 + i*70} 280,${90 + i*70} 240,${60 + i*70}" class="bpmn-gateway"/>`;
        } else if (line.startsWith("endEvent")) {
          svg += `<circle cx="400" cy="${60 + i*70}" r="20" class="bpmn-end"/>`;
        }
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
  `
};
