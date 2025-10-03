// src/main.js
import mermaid from "mermaid";
import { bpmnPlugin } from "./bpmn-plugin.js";

mermaid.initialize({
  startOnLoad: true,
  securityLevel: "loose",
  theme: "default",
});

mermaid.registerDiagram("bpmn", bpmnPlugin);

const bpmnText = `
bpmnFlow
startEvent start "Start"
task T1 "Validate Order" actor="Alice"
gateway G1 "Payment OK?"
task T2 "Ship Order" actor="Bob"
endEvent end "End"

start --> T1
T1 --> G1
G1 -->|yes| T2
G1 -->|no| end
T2 --> end
`;

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("diagram");
  mermaid.render("bpmn1", bpmnText, (svgCode) => {
    el.innerHTML = svgCode;
  });
});
