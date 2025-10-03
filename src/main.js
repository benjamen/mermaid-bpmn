// src/main.js
import { bpmnPlugin } from "./bpmn-plugin.js";

const editor = document.getElementById("editor");
const diagram = document.getElementById("diagram");

window.renderDiagram = async () => {
  const rawText = editor.value;
  const diagramObj = bpmnPlugin.preprocess(rawText);

  if (diagramObj) {
    bpmnPlugin.render(diagramObj, "diagram");
  } else {
    diagram.innerHTML = `<div style="color:red">No diagram parsed.</div>`;
  }
};

document.getElementById("renderBtn").addEventListener("click", window.renderDiagram);

// auto-render on page load
window.renderDiagram();
