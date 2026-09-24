import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { randomUUID } from "crypto";
import fs from "fs";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
const DATA_FILE = "./messages.json";
const rooms = new Map();

app.use(express.static("public"));

function loadMessages() {
  try { 
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); 
    }
  } catch (err) {
    console.error("Error reading messages.json:", err);
  }
  return {};
}

function saveMessages(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing messages.json:", err);
  }
}

const history = loadMessages();

function send(ws, payload) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function broadcast(room, payload) {
  for (const client of wss.clients) {
    if (client.room === room) send(client, payload);
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "join") {
      const room = String(msg.room || "").trim().toUpperCase().slice(0, 32);
      const name = String(msg.name || "").trim().slice(0, 24);
      if (!room || !name) return send(ws, { type: "error", text: "Nama dan kode room wajib diisi." });

      ws.room = room;
      ws.name = name;
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);

      send(ws, { type: "joined", room, name, history: history[room] || [] });
      broadcast(room, { type: "system", text: `${name} masuk ke chat.` });
      return;
    }

    if (msg.type === "chat") {
      if (!ws.room || !ws.name) return;
      const text = String(msg.text || "").trim().slice(0, 1000);
      if (!text) return;

      const item = {
        id: randomUUID(),
        name: ws.name,
        text,
        time: new Date().toISOString()
      };

      if (!history[ws.room]) {
        history[ws.room] = [];
      }
      history[ws.room].push(item);
      history[ws.room] = history[ws.room].slice(-200);
      saveMessages(history);
      broadcast(ws.room, { type: "message", ...item });
    }
  });

  ws.on("close", () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws);
      if (rooms.get(ws.room).size === 0) rooms.delete(ws.room);
      broadcast(ws.room, { type: "system", text: `${ws.name || "Seseorang"} keluar dari chat.` });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Boom Chat running on port ${PORT}`);
});
