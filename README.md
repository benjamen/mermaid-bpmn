# Mermaid-BPMN

A thin wrapper around [Mermaid](https://mermaid.js.org) to render **BPMN-like flows** in diagrams.  
Zero backend, runs fully in-browser. Deployed easily via **GitHub Pages**.

## 🚀 Demo
Once you enable Pages, you’ll get a live editor at:
https://<your-username>.github.io/mermaid-bpmn/

## ✍️ Usage
Write a diagram like:
```mermaid
bpmnFlow
startEvent "Order Received"
task "Check Payment"
gateway "Payment OK?"
task "Ship Order"
endEvent "Done"

start --> T1 --> G1
G1 -->|yes| T2 --> end
G1 -->|no| end
```

Click render → see BPMN-like diagram.

## 📦 Install
Clone and open `index.html`, or serve via GitHub Pages.

## 🔑 License
MIT