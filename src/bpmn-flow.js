export const bpmnPlugin = {
  id: 'bpmnFlow',
  parser: {
    parse: (text) => text.split("\n").map(line => line.trim()).filter(Boolean)
  },
  renderer: {
    draw: async (text, id) => {
      const container = document.getElementById(id);
      container.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="250">
          <circle cx="40" cy="60" r="20" class="bpmn-start"/>
          <rect x="100" y="40" width="120" height="60" rx="8" ry="8" class="bpmn-task"/>
          <polygon points="280,40 320,70 280,100 240,70" class="bpmn-gateway"/>
          <circle cx="400" cy="70" r="20" class="bpmn-end"/>
        </svg>
      `;
    }
  },
  styles: `
    .bpmn-task { fill: #e0f7fa; stroke: #006064; stroke-width: 2; }
    .bpmn-start { fill: white; stroke: green; stroke-width: 2; }
    .bpmn-end { fill: white; stroke: red; stroke-width: 3; }
    .bpmn-gateway { fill: #fff9c4; stroke: #f57f17; stroke-width: 2; }
  `
};
