const axios = require("axios");
const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("✅ Nitrado-Status-Bot läuft"));
app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`🌐 Webserver aktiv auf Port ${process.env.PORT}`);
});

const nitradoToken     = process.env.NITRADO_API_TOKEN;
const astraeosServerId = process.env.Astraeos_Server_ID;
const valgueroServerId = process.env.Valguero_Server_ID;
const astraeosWebhook  = process.env.Webhook_Astraeos;
const valgueroWebhook  = process.env.Webhook_Valguero;

const servers = [
  { id: astraeosServerId, name: "Astraeos", webhook: astraeosWebhook },
  { id: valgueroServerId, name: "Valguero", webhook: valgueroWebhook },
];

let lastStatus = {};

async function fetchServerStatus(server) {
  try {
    const res = await axios.get(`https://api.nitrado.net/services/${server.id}`, {
      headers: { Authorization: `Bearer ${nitradoToken}` },
    });
    return res.data?.data?.service?.status || "unknown";
  } catch (err) {
    console.error(`❌ Fehler beim Abrufen von ${server.name}:`, err.message);
    return "unreachable";
  }
}

async function sendToDiscord(webhook, embed) {
  try {
    await axios.post(webhook, { embeds: [embed] });
  } catch (err) {
    console.error("❌ Fehler beim Senden an Discord:", err.message);
  }
}

async function checkServers() {
  for (const server of servers) {
    const status = await fetchServerStatus(server);
    const previous = lastStatus[server.id];
    const timestamp = new Date().toLocaleString("de-DE");

    if (!previous) {
      lastStatus[server.id] = status;
      console.log(`[INIT] ${server.name}: ${status}`);
      continue;
    }

    if (status !== previous) {
      console.log(`[UPDATE] ${server.name}: ${previous} → ${status}`);

      let color = 0x808080;
      let description = "";

      switch (status) {
        case "started":
          color = 0x2ecc71;
          description = "✅ Der Server wurde **gestartet**.";
          break;
        case "stopped":
          color = 0xe74c3c;
          description = "🟥 Der Server wurde **gestoppt**.";
          break;
        case "restarting":
          color = 0xf1c40f;
          description = "🔁 Der Server wird **neu gestartet**.";
          break;
        case "updating":
          color = 0x3498db;
          description = "⬆️ Der Server wird **aktualisiert (Update läuft)**.";
          break;
        case "unreachable":
          color = 0xff0000;
          description = "⚠️ Der Server ist **nicht erreichbar (Crash?)**.";
          break;
        default:
          description = `ℹ️ Status geändert: **${previous} → ${status}**`;
      }

      const embed = {
        title: `🖥️ ${server.name} Status-Update`,
        description: description,
        color: color,
        fields: [
          { name: "Vorheriger Status", value: `\`${previous}\``, inline: true },
          { name: "Neuer Status", value: `\`${status}\``, inline: true },
        ],
        footer: { text: `Zeit: ${timestamp}` },
        timestamp: new Date().toISOString(),
      };

      await sendToDiscord(server.webhook, embed);
      lastStatus[server.id] = status;
    }
  }
}

setInterval(checkServers, 5 * 60 * 1000);

checkServers();
