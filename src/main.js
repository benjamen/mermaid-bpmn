import mermaid from "mermaid";
import { bpmnPlugin } from "./bpmn-plugin.js";

mermaid.initialize({
  startOnLoad: false, // we will render manually
  plugins: [bpmnPlugin]
});

const editor = document.getElementById("editor");
const diagram = document.getElementById("diagram");

window.renderDiagram = async () => {
  const rawText = editor.value;
  
  // Call plugin preprocessor manually
  const diagramObj = bpmnPlugin.preprocess(rawText);
  
  if (diagramObj) {
    await bpmnPlugin.renderer.draw(diagramObj, "diagram");
  } else {
    diagram.innerHTML = `<div class="mermaid">${rawText}</div>`;
    mermaid.init(undefined, diagram);
  }
};

document.getElementById("renderBtn").addEventListener("click", window.renderDiagram);

// initial render
window.renderDiagram();
