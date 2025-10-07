import mermaid from "mermaid";
import { bpmnPlugin } from "./bpmn-plugin.js";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "default",
  extensions: [bpmnPlugin], // <- v10 uses 'extensions' array
});

const bpmnText = `
bpmnFlow
startEvent start "Start"
task T1 "Validate Order" actor="John Doe"
gateway G1 "Payment OK?"
task T2 "Ship Order" actor="Jane Smith"
endEvent end "End"

start --> T1
T1 --> G1
G1 -->|yes| T2
G1 -->|no| end
T2 --> end
`;

document.addEventListener("DOMContentLoaded", async () => {
  const el = document.getElementById("diagram");
  const definitions = bpmnPlugin.parser.parse(bpmnText);
  await bpmnPlugin.renderer.draw(definitions, "diagram");
});
