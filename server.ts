import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const TARGET_SIZE = 1464179680; // Size of Slack.gguf

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn("Could not initialize GoogleGenAI:", e);
    }
  }
  return aiClient;
}

app.use(express.json());

// Helper to locate completed local GGUF
function getLocalGgufPath(): string | null {
  const candidates = [
    path.resolve("./Slack.gguf"),
    path.resolve("/app/applet/Slack.gguf"),
    path.resolve("./public/Slack.gguf"),
    path.resolve("/app/applet/public/Slack.gguf"),
    path.resolve("/tmp/Slack.gguf")
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).size >= TARGET_SIZE) {
        return p;
      }
    } catch (_) {}
  }
  return null;
}

// Endpoint to check background status of Slack.gguf
app.get("/api/gguf-status", (req, res) => {
  try {
    const readyPath = getLocalGgufPath();
    if (readyPath) {
      return res.json({
        exists: true,
        size: TARGET_SIZE,
        targetSize: TARGET_SIZE,
        percent: 100,
        isComplete: true,
        status: "ready",
        speed: "0 MB/s",
        etaSeconds: 0,
        path: "/Slack.gguf"
      });
    }

    if (fs.existsSync("/tmp/gguf_download_status.json")) {
      const raw = fs.readFileSync("/tmp/gguf_download_status.json", "utf-8");
      const data = JSON.parse(raw);
      return res.json({
        exists: true,
        size: data.downloadedBytes || 0,
        targetSize: TARGET_SIZE,
        percent: data.percent || 0,
        isComplete: data.status === "ready",
        status: data.status || "downloading",
        speed: data.speed || "0 MB/s",
        etaSeconds: data.etaSeconds || 0,
        path: "/Slack.gguf"
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
  res.json({ exists: false, size: 0, targetSize: TARGET_SIZE, percent: 0, isComplete: false, status: "not_started" });
});

// Trigger download in background if not already running
app.post("/api/start-gguf-download", (req, res) => {
  if (getLocalGgufPath()) {
    return res.json({ status: "ready", message: "Slack.gguf is already cached and verified locally!" });
  }
  try {
    const proc = spawn("python3", ["./scripts/download_gguf.py"], {
      detached: true,
      stdio: "ignore"
    });
    proc.unref();
    res.json({ status: "started", message: "Background multi-stream GGUF download initialized." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Slack.gguf directly from disk with Range request support (blazing local speed!)
app.get("/Slack.gguf", (req, res) => {
  const localGguf = getLocalGgufPath();
  if (localGguf) {
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.sendFile(localGguf);
  }

  res.status(404).json({ error: "Slack.gguf is not found on disk at /app/applet/Slack.gguf." });
});

// API route 1: Chat endpoint (Instant cloud fallback while GGUF is caching/loading)
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  const userMessages = Array.isArray(messages) ? messages : [];
  const lastUserMsg = [...userMessages].reverse().find(m => m.role === "user")?.content || "Hello!";

  const systemInstruction = "You are TinkerBot, an expert AI mentor for Atal Tinkering Lab (ATL). Created by Mohammad Daniyal Ahmad and Ridith Shetty. Help students and makers troubleshoot Arduino, ESP32, Raspberry Pi, circuits, sensors, and code with clear step-by-step guidance.";

  const ai = getAI();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\nUser Question:\n${lastUserMsg}` }] }
        ],
        config: {
          temperature: 0.4,
          maxOutputTokens: 1024
        }
      });
      const text = response.text || "TinkerBot generated a response.";
      return res.json({ text, source: "cloud-fallback" });
    } catch (err: any) {
      console.warn("Gemini API generation error:", err?.message || err);
    }
  }

  // Graceful rule-based response if offline or key missing
  res.json({
    text: `### TinkerBot ATL Response\n\nI received your query: "${lastUserMsg.slice(0, 100)}...".\n\n**Quick ATL Checklist:**\n1. **Power & Common Ground**: Ensure your sensor and microcontroller share a common GND rail.\n2. **Operating Voltage**: Confirm whether your sensor requires 3.3V (ESP32/Raspberry Pi) or 5V (Arduino Uno).\n3. **Pin Configuration**: Double-check that your code matches your breadboard wiring.\n4. **Serial Baud Rate**: Ensure Serial.begin matches the Serial Monitor (standard: 115200 baud).\n\n*Slack GGUF on-device WebAssembly engine is active or caching in the background.*`,
    source: "edge-rule-fallback"
  });
});

// API route 2: Hardware Connection & Code Generator Wizard (Edge-native template generator)
app.post("/api/generate-wizard", (req, res) => {
  try {
    const { microcontroller, sensor, action } = req.body;
    const m = (microcontroller || "Arduino Uno").toLowerCase();
    const s = (sensor || "HC-SR04 Ultrasonic Sensor").toLowerCase();
    const act = action || "Read sensor data and output to Serial Monitor";

    // Dynamic microcontroller pin configuration
    const isESP32 = m.includes("esp32");
    const isPi = m.includes("raspberry") || m.includes("pi");
    const isPico = m.includes("pico");

    let connections = [
      { fromPin: "VCC", toPin: isESP32 || isPi ? "3.3V / 5V" : "5V", description: "Power supply rail (solid voltage required)" },
      { fromPin: "GND", toPin: "GND", description: "Common ground reference across circuit" }
    ];

    let codeSample = "";
    if (s.includes("ultrasonic") || s.includes("sr04")) {
      connections.push(
        { fromPin: "TRIG", toPin: isESP32 ? "GPIO 5" : isPico ? "GP2" : "D9", description: "Ultrasonic pulse trigger output" },
        { fromPin: "ECHO", toPin: isESP32 ? "GPIO 18" : isPico ? "GP3" : "D10", description: "Echo return input pulse" }
      );
      codeSample = `// TinkerBot: Ultrasonic Sensor on ${microcontroller}
const int trigPin = ${isESP32 ? "5" : isPico ? "2" : "9"};
const int echoPin = ${isESP32 ? "18" : isPico ? "3" : "10"};

void setup() {
  Serial.begin(115200);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  Serial.println("TinkerBot: Ultrasonic ready!");
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  float distanceCm = duration * 0.034 / 2.0;

  Serial.print("Distance: ");
  Serial.print(distanceCm);
  Serial.println(" cm");
  delay(250);
}`;
    } else if (s.includes("dht") || s.includes("temp") || s.includes("humid")) {
      connections.push({ fromPin: "DATA / OUT", toPin: isESP32 ? "GPIO 4" : isPico ? "GP15" : "D2", description: "One-wire digital data signal" });
      codeSample = `// TinkerBot: Temperature & Humidity on ${microcontroller}
#include <DHT.h>
#define DHTPIN ${isESP32 ? "4" : isPico ? "15" : "2"}
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  Serial.println("TinkerBot: DHT Sensor Started");
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) {
    Serial.println("Failed to read from DHT sensor! Check pull-up resistor.");
    delay(2000);
    return;
  }
  Serial.print("Temp: "); Serial.print(t); Serial.print(" C | Humidity: "); Serial.print(h); Serial.println(" %");
  delay(2000);
}`;
    } else {
      connections.push(
        { fromPin: "SIGNAL / OUT", toPin: isESP32 ? "GPIO 34 (ADC1)" : isPico ? "GP26 (ADC0)" : "A0", description: "Analog or digital signal feedback line" }
      );
      codeSample = `// TinkerBot: Hardware Setup for ${sensor} on ${microcontroller}
const int sensorPin = ${isESP32 ? "34" : isPico ? "26" : "A0"};

void setup() {
  Serial.begin(115200);
  pinMode(sensorPin, INPUT);
  Serial.println("TinkerBot initialized for ${sensor}!");
}

void loop() {
  int rawValue = analogRead(sensorPin);
  Serial.print("Sensor reading: ");
  Serial.println(rawValue);
  delay(200);
}`;
    }

    res.json({
      title: `${sensor} + ${microcontroller} Quick Configuration`,
      connections,
      explanation: `Configured for ${microcontroller} with ${sensor}. Follow TinkerBot's Universal Hardware Debugging Protocol: verify common ground, verify voltage levels (${isESP32 || isPi ? "3.3V" : "5V"}), and ensure baud rate is set to 115200 in the Serial Monitor.`,
      code: codeSample,
      checklist: [
        "1. Power & Ground Check: Ensure VCC has solid voltage and GND is common with the board.",
        "2. Pin Mapping: Double check that GPIO and pin numbers correspond correctly in your sketch.",
        `3. Logic Level Compatibility: Ensure sensor signal does not exceed ${isESP32 || isPi ? "3.3V" : "5V"}.`,
        "4. Serial Monitor: Confirm the baud rate is set to 115200 in your IDE Serial Monitor."
      ]
    });
  } catch (err: any) {
    console.error("Error in /api/generate-wizard:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Configure Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In the bundled production build, server.cjs lives directly inside the 'dist' folder.
    // Therefore, __dirname points directly to the 'dist' directory.
    const distPath = typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Do not serve index.html for missing static assets or files with extensions
      if (req.path.startsWith("/assets/") || req.path.includes(".")) {
        return res.status(404).send("Asset Not Found");
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
