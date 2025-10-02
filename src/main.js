import mermaid from "mermaid";
import { bpmnPlugin } from "./bpmn-plugin.js";

mermaid.initialize({
  startOnLoad: true,
  plugins: [bpmnPlugin]
});

const editor = document.getElementById("editor");
const diagram = document.getElementById("diagram");

window.renderDiagram = () => {
  const text = editor.value;
  diagram.innerHTML = `<div class="mermaid">${text}</div>`;
  mermaid.init(undefined, diagram);
};

document.getElementById("renderBtn").addEventListener("click", window.renderDiagram);
window.renderDiagram();
