import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  Cpu, 
  Wrench, 
  Sparkles, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Code, 
  Layers, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  ShieldAlert, 
  ArrowRight,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Activity,
  Award,
  Settings,
  HelpCircle,
  Phone,
  PhoneOff,
  Zap,
  Menu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Vapi from "@vapi-ai/web";
import { Role, Message, WizardResult, ConnectionStep, Microcontroller, SensorModule } from "./types";
import { ggufEngine } from "./services/ggufService";
// Resistor Color Guide helpers
const DIGIT_COLORS: { [key: string]: { num: number; hex: string; text: string; lightDot?: boolean } } = {
  black: { num: 0, hex: "#111111", text: "Black (0)" },
  brown: { num: 1, hex: "#8b5a2b", text: "Brown (1)" },
  red: { num: 2, hex: "#FF0000", text: "Red (2)" },
  orange: { num: 3, hex: "#FF8C00", text: "Orange (3)" },
  yellow: { num: 4, hex: "#FFD700", text: "Yellow (4)" },
  green: { num: 5, hex: "#228B22", text: "Green (5)" },
  blue: { num: 6, hex: "#0000FF", text: "Blue (6)" },
  violet: { num: 7, hex: "#8A2BE2", text: "Violet (7)" },
  gray: { num: 8, hex: "#808080", text: "Gray (8)" },
  white: { num: 9, hex: "#FFFFFF", text: "White (9)", lightDot: true },
};

const MULTIPLIER_COLORS: { [key: string]: { val: number; hex: string; desc: string; lightDot?: boolean } } = {
  black: { val: 1, hex: "#111111", desc: "Black (x1 Ω)" },
  brown: { val: 10, hex: "#8b5a2b", desc: "Brown (x10 Ω)" },
  red: { val: 100, hex: "#FF0000", desc: "Red (x100 Ω)" },
  orange: { val: 1000, hex: "#FF8C00", desc: "Orange (x1 kΩ)" },
  yellow: { val: 10000, hex: "#FFD700", desc: "Yellow (x10 kΩ)" },
  green: { val: 100000, hex: "#228B22", desc: "Green (x100 kΩ)" },
  blue: { val: 1000000, hex: "#0000FF", desc: "Blue (x1 MΩ)" },
  gold: { val: 0.1, hex: "#D4AF37", desc: "Gold (x0.1 Ω)" },
  silver: { val: 0.01, hex: "#C0C0C0", desc: "Silver (x0.01 Ω)" },
};

const TOLERANCE_COLORS: { [key: string]: { val: string; hex: string } } = {
  brown: { val: "±1%", hex: "#8b5a2b" },
  red: { val: "±2%", hex: "#FF0000" },
  gold: { val: "±5%", hex: "#D4AF37" },
  silver: { val: "±10%", hex: "#C0C0C0" },
};

// Battery calculation specifications
const BATTERY_CELLS: { [key: string]: { label: string; volts: number; mah: number; color: string } } = {
  "alkaline-aa": { label: "AA / AAA Alkaline Cell", volts: 1.5, mah: 2500, color: "bg-amber-600 text-black border-amber-700" },
  "lithium-18650": { label: "18650 Li-Ion Cell", volts: 3.7, mah: 2600, color: "bg-emerald-600 text-white border-emerald-700" },
  "nine-volt": { label: "9V PP3 Alkaline Block", volts: 9.0, mah: 550, color: "bg-neutral-700 text-white border-neutral-800" },
  "nimh-aaa": { label: "NiMH AAA Rechargeables", volts: 1.2, mah: 1000, color: "bg-indigo-600 text-white border-indigo-700" },
  "lipo-1s": { label: "1S LiPo Flat Pack", volts: 3.7, mah: 1200, color: "bg-blue-600 text-white border-blue-700" },
  "coin-cr2032": { label: "CR2032 Lithium Coin", volts: 3.0, mah: 220, color: "bg-zinc-500 text-black border-zinc-650" },
};

const LOAD_PROFILES: { [key: string]: { label: string; mA: number } } = {
  "arduino-idle": { label: "Arduino Board idle", mA: 50 },
  "esp32-tx": { label: "ESP32 WiFi broadcasting", mA: 240 },
  "pico-lowpower": { label: "Raspberry Pi Pico low-power", mA: 15 },
  "microbit-leds": { label: "micro:bit 5x5 LED frame active", mA: 80 },
  "servo-peak": { label: "Heavy SG90 Servo Sweep active", mA: 600 },
  "custom": { label: "Custom load intensity", mA: 100 },
};

// Microcontrollers List
const MICROCONTROLLERS: Microcontroller[] = [
  {
    id: "arduino-uno",
    name: "Arduino Uno R3",
    type: "arduino",
    description: "The classic starter microcontroller board. Built on ATmega328P, runs on 5V logic. Excellent durability.",
    pins: ["5V", "3.3V", "GND", "A0", "A1", "A2", "A3", "A4 (SDA)", "A5 (SCL)", "D2", "D3 (PWM)", "D4", "D5 (PWM)", "D6 (PWM)", "D7", "D8", "D9 (PWM)", "D10 (PWM)", "D11 (PWM)", "D12", "D13 (Onboard LED)"]
  },
  {
    id: "esp32-nodemcu",
    name: "ESP32 NodeMCU",
    type: "esp32",
    description: "32-bit dual-core processor with onboard Wi-Fi & Bluetooth. Runs on 3.3V. Perfect for IoT.",
    pins: ["3V3", "GND", "GPIO2 (Onboard LED)", "GPIO4", "GPIO5", "GPIO12", "GPIO13", "GPIO14", "GPIO15", "GPIO18 (SCK)", "GPIO19 (MISO)", "GPIO21 (SDA)", "GPIO22 (SCL)", "GPIO23 (MOSI)", "GPIO25", "GPIO26", "GPIO32", "GPIO33", "GPIO34 (Input-Only)", "GPIO35 (Input-Only)"]
  },
  {
    id: "raspberry-pi-pico",
    name: "Raspberry Pi Pico",
    type: "pico",
    description: "High-performance RP2040 dual-core chip. Supports C++ and MicroPython. 3.3V logic level.",
    pins: ["3V3 (OUT)", "GND", "VSYS", "GPIO0 (TX)", "GPIO1 (RX)", "GPIO2 (SDA)", "GPIO3 (SCL)", "GPIO4", "GPIO5", "GPIO6", "GPIO7", "GPIO8", "GPIO9", "GPIO10", "GPIO11", "GPIO12", "GPIO13", "GPIO14", "GPIO15", "GPIO16", "GPIO25 (Onboard LED)", "ADC0 (GPIO26)", "ADC1 (GPIO27)", "ADC2 (GPIO28)"]
  },
  {
    id: "microbit-v2",
    name: "BBC micro:bit V2",
    type: "microbit",
    description: "Educational pocket-sized controller with built-in sensors, 5x5 LED grid, and touch logo. 3.3V logic.",
    pins: ["3V", "GND", "Pin 0 (ADC/Touch)", "Pin 1 (ADC)", "Pin 2 (ADC)", "Pin 3", "Pin 4", "Pin 8", "Pin 9", "Pin 12", "Pin 13 (SCK)", "Pin 14 (MISO)", "Pin 15 (MOSI)", "Pin 16", "Pin 19 (SCL)", "Pin 20 (SDA)"]
  },
  {
    id: "custom",
    name: "Custom Board (Type Name Below)",
    type: "custom",
    description: "Enter any board, microcontroller, single-board computer, or custom lab kit to generate accurate pin mappings.",
    pins: ["VCC", "GND", "GPIO"]
  }
];

// Sensors and Modules List
const SENSORS: SensorModule[] = [
  {
    id: "hc-sr04",
    name: "HC-SR04 Ultrasonic Distance Sensor",
    category: "distance",
    description: "Measures distance using ultrasonic sonar waves. Range: 2cm to 400cm. Uses high pulse duration logic.",
    pins: ["VCC", "TRIG", "ECHO", "GND"]
  },
  {
    id: "dht11",
    name: "DHT11 Temp & Humidity Sensor",
    category: "environment",
    description: "Low-cost electronic sensor for measuring temperature & humidity. Uses single-wire digital signaling.",
    pins: ["VCC", "DATA", "NC (Not Connected)", "GND"]
  },
  {
    id: "sg90-servo",
    name: "SG90 Micro Servo Motor",
    category: "actuator",
    description: "Rotational feedback actuator for precise position control from 0 to 180 degrees. Requires PWM inputs.",
    pins: ["VCC (Red/Orange)", "GND (Brown/Black)", "PWM SIGNAL (Yellow/White)"]
  },
  {
    id: "i2c-lcd-1602",
    name: "16x2 I2C LCD Display",
    category: "display",
    description: "16-character by 2-line visual matrix liquid crystal display with I2C address board reducer helper.",
    pins: ["VCC", "GND", "SDA (Data)", "SCL (Clock)"]
  },
  {
    id: "ldr-module",
    name: "LDR Light Photoresistor Module",
    category: "environment",
    description: "Detects surrounding light intensity level and feeds back proportional analog voltages or discrete logic thresholds.",
    pins: ["VCC", "GND", "AO (Analog Output)", "DO (Digital Output)"]
  },
  {
    id: "active-buzzer",
    name: "Active Buzzer Module",
    category: "actuator",
    description: "Pre-driven sound transducer that generates an elegant constant tone directly when powered by logic levels.",
    pins: ["VCC", "I/O Signal", "GND"]
  },
  {
    id: "custom",
    name: "Custom Sensor or Module (Type Name Below)",
    category: "other",
    description: "Enter any sensor or output module name to auto-configure custom wiring code blueprints.",
    pins: ["VCC", "GND", "SIG"]
  }
];

// Simplified Common Hardware Solutions (Replaced confusing protocol list)
const HARDWARE_ALERTS = [
  {
    title: "I2C Device Communication",
    short: "SDA & SCL wire guidance",
    desc: "LCD prints blank matrices or I2C sensors fail to register.",
    solution: "Ensure a shared GND between microcontroller logic and the module. Confirm that SDA connects to SDA (typically A4 on Arduino Uno) and SCL to SCL (A5 on Uno). Run an I2C scanner sketch if the hardware address is uncertain."
  },
  {
    title: "ESP32 Board Power Glitches",
    short: "Reset loop / brownout fixes",
    desc: "ESP32 resets constantly once Wi-Fi launches or relays toggle.",
    solution: "The ESP32 demands dynamic peaks of regular power (~500mA). Avoid driving servos or sensors directly from the 3.3V board pin. Always use an external source, ensuring a connected common Ground wire."
  },
  {
    title: "Vibrating / Jittering Servos",
    short: "Servo motor power issues",
    desc: "Servos wiggle continuously and draw down the controller voltage.",
    solution: "Microcontrollers supply sparse current on digital pins. Connect the servo's power leads directly to a stable external source (e.g., 4 AA battery pack at 5-6V). Bridge the black wire of the battery pack to the controller Ground pin."
  },
  {
    title: "Garbled Port Text",
    short: "Serial terminal baud speed sync",
    desc: "The output logs render question marks or symbols.",
    solution: "Verify that the baud rate defined inside your sketch (e.g. Serial.begin(9600) or Serial.begin(115200)) perfectly matches the select rate options in the monitor tab."
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"chat" | "wizard" | "utilities" | "battery">("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome to the ATL Hardware Laboratory. 🚀 I'm **TinkerBot**, your universal hardware assistant and circuit troubleshooter, **Created by Mohammad Daniyal Ahmad and Ridith Shetty**.\n\nType your wiring bugs or choose the **Pinout Wizard** to instantly draw clean micro-controller connection plans!\n\nNo accounts, registration, or logins are needed here.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Lab Tools & Utilities States
  const [resistorB1, setResistorB1] = useState("brown");
  const [resistorB2, setResistorB2] = useState("black");
  const [resistorB3, setResistorB3] = useState("red");
  const [resistorB4, setResistorB4] = useState("gold");

  const [boardVolts, setBoardVolts] = useState<"3.3" | "5">("5");
  const [moduleVolts, setModuleVolts] = useState<"3.3" | "5">("3.3");

  const [serialLogInput, setSerialLogInput] = useState("");
  const [serialBaud, setSerialBaud] = useState("9600");
  const [serialDiagnostic, setSerialDiagnostic] = useState<string | null>(null);

  // Battery Estimator States
  const [cellType, setCellType] = useState<string>("alkaline-aa");
  const [cellCount, setCellCount] = useState<number>(4);
  const [batteryConfig, setBatteryConfig] = useState<"series" | "parallel">("series");
  const [loadProfile, setLoadProfile] = useState<string>("arduino-idle");
  const [customLoadmA, setCustomLoadmA] = useState<number>(100);

  // Vapi voice call states
  const [vapiPublicKey, setVapiPublicKey] = useState(() => {
    return localStorage.getItem("tinkerbot_vapi_public_key") || import.meta.env.VITE_VAPI_PUBLIC_KEY || "db795368-7691-46b7-a614-6ebbb9a9a69f";
  });
  const [vapiAssistantId, setVapiAssistantId] = useState(() => {
    return localStorage.getItem("tinkerbot_vapi_assistant_id") || import.meta.env.VITE_VAPI_ASSISTANT_ID || "c888ea5e-9a7e-4e96-b8ad-8312faa88326";
  });
  const [isVapiActive, setIsVapiActive] = useState(false);
  const [isVapiConnecting, setIsVapiConnecting] = useState(false);
  const [isVapiSpeaking, setIsVapiSpeaking] = useState(false);
  const [isVapiMuted, setIsVapiMuted] = useState(false);
  const [currentLiveTranscript, setCurrentLiveTranscript] = useState<string>("");
  const [vapiError, setVapiError] = useState<string | null>(null);
  const [showVapiSettings, setShowVapiSettings] = useState(false);
  const [voiceModeActive, setVoiceModeActive] = useState(false);

  // Wizard States
  const [selectedController, setSelectedController] = useState<string>("arduino-uno");
  const [customControllerText, setCustomControllerText] = useState("");
  const [selectedSensor, setSelectedSensor] = useState<string>("hc-sr04");
  const [customSensorText, setCustomSensorText] = useState("");
  const [wizardAction, setWizardAction] = useState("");
  const [wizardResult, setWizardResult] = useState<WizardResult | null>(null);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedCodeBlockId, setCopiedCodeBlockId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false]);

  // Selected Alert for Details Modal
  const [selectedAlert, setSelectedAlert] = useState<typeof HARDWARE_ALERTS[0] | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const vapiRef = useRef<any>(null);

  // Save Vapi credentials to localStorage on updates
  useEffect(() => {
    localStorage.setItem("tinkerbot_vapi_public_key", vapiPublicKey);
  }, [vapiPublicKey]);

  useEffect(() => {
    localStorage.setItem("tinkerbot_vapi_assistant_id", vapiAssistantId);
  }, [vapiAssistantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, isVapiActive]);

  // Clean-up Vapi instance on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  // Vapi Voice Control Handlers
  const startVapiCall = async () => {
    if (!vapiPublicKey || !vapiAssistantId) {
      setVapiError("Please configure your Vapi Public Key and Vapi Assistant ID inside the hardware dashboard to begin the voice session.");
      setShowVapiSettings(true);
      return;
    }
    setVapiError(null);
    setIsVapiConnecting(true);
    setCurrentLiveTranscript("");

    // Resume AudioContext if browser suspended it before user click
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          await ctx.resume();
        }
      }
    } catch (_) {}

    try {
      // Clean up previous instance
      if (vapiRef.current) {
        try { vapiRef.current.stop(); } catch (_) {}
      }
      
      const vapi = new Vapi(vapiPublicKey.trim());
      vapiRef.current = vapi;
      
      vapi.on("call-start", () => {
        console.log("Vapi Call Started");
        setIsVapiActive(true);
        setIsVapiConnecting(false);
        setVapiError(null);
      });
      
      vapi.on("call-end", () => {
        console.log("Vapi Call Ended");
        setIsVapiActive(false);
        setIsVapiConnecting(false);
        setIsVapiSpeaking(false);
        setCurrentLiveTranscript("");
      });
      
      vapi.on("speech-start", () => {
        setIsVapiSpeaking(true);
      });
      
      vapi.on("speech-end", () => {
        setIsVapiSpeaking(false);
      });
      
      vapi.on("message", (msg: any) => {
        console.log("Vapi incoming message:", msg);
        if (msg.type === "transcript") {
          const role = msg.role === "user" ? "user" : "assistant";
          const transcriptText = (msg.transcript || "").trim();
          if (!transcriptText) return;

          if (msg.transcriptType === "partial") {
            setCurrentLiveTranscript(`${role === "user" ? "You: " : "TinkerBot: "} ${transcriptText}`);
          } else if (msg.transcriptType === "final") {
            setCurrentLiveTranscript("");
            setMessages(prev => {
              const id = `vapi-msg-${Date.now()}`;
              if (prev.length > 0 && prev[prev.length - 1].content === transcriptText) {
                return prev;
              }
              return [...prev, {
                id,
                role: role as any,
                content: transcriptText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }];
            });
          }
        }
      });
      
      vapi.on("error", (e: any) => {
        console.error("Vapi System Error:", e);
        setIsVapiConnecting(false);
        const errMsg = e?.error?.message || e?.message || (typeof e === "string" ? e : JSON.stringify(e));
        if (errMsg.includes("Meeting has ended") || errMsg.includes("Room not found") || errMsg.includes("expired") || errMsg.includes("ejected") || errMsg.includes("Meeting ended")) {
          setVapiError("Call session ended. Click 'Connect Voice Agent' to start a new voice session.");
        } else if (errMsg.includes("microphone") || errMsg.includes("Permission denied") || errMsg.includes("NotAllowedError")) {
          setVapiError("Microphone permission denied. Please allow microphone access in your browser address bar.");
        } else if (errMsg.includes("401") || errMsg.includes("403") || errMsg.includes("Unauthorized")) {
          setVapiError("Invalid Vapi Public Key. Click the Settings icon to update your Vapi Public Key.");
          setShowVapiSettings(true);
        } else if (errMsg.includes("404") || errMsg.includes("Assistant not found")) {
          setVapiError("Assistant ID not found on Vapi. Click Settings to check your Assistant ID.");
          setShowVapiSettings(true);
        } else {
          setVapiError(errMsg || "Vapi voice connection failed. Please check microphone permission & credentials.");
        }
        setIsVapiActive(false);
        setIsVapiSpeaking(false);
      });

      // Pass assistant ID cleanly so Vapi loads the assistant's voice and firstMessage configured in Vapi dashboard
      await vapi.start(vapiAssistantId.trim());
    } catch (err: any) {
      console.error("Vapi start failed:", err);
      setIsVapiConnecting(false);
      setVapiError(err?.message || "Vapi client initiation failed.");
    }
  };

  const stopVapiCall = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    }
    setIsVapiActive(false);
    setIsVapiConnecting(false);
    setIsVapiSpeaking(false);
    setCurrentLiveTranscript("");
  };

  const toggleVapiMute = () => {
    if (vapiRef.current && isVapiActive) {
      const nextMute = !isVapiMuted;
      try {
        vapiRef.current.setMuted(nextMute);
        setIsVapiMuted(nextMute);
      } catch (e) {
        console.error("Mute toggle failed:", e);
      }
    }
  };

  // Browser speech synthesis to speak any assistant message aloud on click
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/```[\s\S]*?```/g, "").replace(/[*_#`]/g, "").trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Chat message sender
  const sendMessage = async (overrideText?: string) => {
    const textToSend = (overrideText || inputVal).trim();
    if (!textToSend || isSending) return;

    if (!overrideText) {
      setInputVal("");
    }

    const newUserMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsSending(true);

    // Use fast direct server mentor API
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages })
      });
      const data = await response.json();
      const replyText = data.text || "TinkerBot is ready to assist your ATL project!";
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const notReadyMsg: Message = {
        id: `info-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Could not reach chat server. Please retry in a moment.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, notReadyMsg]);
    } finally {
      setIsSending(false);
    }
  };

  // Run the Wizard Generator Route
  const generateWizard = async () => {
    setWizardLoading(true);
    setWizardResult(null);
    setCompletedSteps([false, false, false, false]);

    try {
      const controllerData = MICROCONTROLLERS.find(c => c.id === selectedController);
      const isCustomController = selectedController === "custom";
      const controllerName = isCustomController 
        ? (customControllerText.trim() || "Custom Microcontroller") 
        : (controllerData?.name || selectedController);

      const isCustomSensor = selectedSensor === "custom";
      const sensorName = isCustomSensor 
        ? (customSensorText.trim() || "Custom Sensor/Module") 
        : (SENSORS.find(s => s.id === selectedSensor)?.name || selectedSensor);

      const response = await fetch("/api/generate-wizard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          microcontroller: controllerName,
          sensor: sensorName,
          action: wizardAction
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to configure hardware blueprint mapping.");
      }

      const resData = await response.json();
      setWizardResult(resData);
    } catch (error: any) {
      alert("Error generating dynamic schematic: " + (error.message || "Failed request."));
    } finally {
      setWizardLoading(false);
    }
  };

  // Copy code and message utilities
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => {
      setCopiedMsgId((current) => (current === msgId ? null : current));
    }, 2000);
  };

  const handleCopyCodeBlock = (blockId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeBlockId(blockId);
    setTimeout(() => {
      setCopiedCodeBlockId((current) => (current === blockId ? null : current));
    }, 2000);
  };

  // Toggle checklist actions
  const toggleStep = (index: number) => {
    const updated = [...completedSteps];
    updated[index] = !updated[index];
    setCompletedSteps(updated);
  };

  // Parse markdown code blocks elegantly
  const formatMsgContent = (text: string, msgId: string = "msg") => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const header = lines[0].replace("```", "").trim();
        const codeText = lines.slice(1, lines.length - 1).join("\n");
        const blockId = `${msgId}-code-${index}`;
        const isBlockCopied = copiedCodeBlockId === blockId;
        return (
          <div key={index} className="my-4 overflow-hidden rounded-xl border border-[#222] bg-[#0c0c0c] font-mono text-sm shadow-lg">
            <div className="flex items-center justify-between bg-[#141414] px-4 py-2 text-xs text-neutral-400 border-b border-[#1c1c1c]">
              <span className="flex items-center gap-1.5 uppercase font-semibold text-neutral-300">
                <Code className="h-3.5 w-3.5 text-indigo-400" />
                {header || "code"}
              </span>
              <button 
                onClick={() => handleCopyCodeBlock(blockId, codeText)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  isBlockCopied
                    ? "text-emerald-400 bg-emerald-950/60 border border-emerald-700/50"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
                id={`btn-copy-code-${blockId}`}
                title="Copy code snippet"
              >
                {isBlockCopied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto p-4 text-emerald-400 leading-relaxed font-mono text-xs max-h-[350px] overflow-y-auto">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      } else {
        return (
          <div 
            key={index} 
            className="whitespace-pre-line text-[14px] leading-relaxed text-neutral-300 font-sans"
            dangerouslySetInnerHTML={{
              __html: part
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em class="italic text-neutral-200">$1</em>')
                .replace(/`(.*?)`/g, '<code class="bg-[#141414] border border-[#222] text-[#f1f5f9] px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
                .replace(/^[-*]\s+(.*)$/gm, '<div class="flex items-start gap-2 my-1.5"><span class="text-neutral-500 mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-600 flex-shrink-0"></span><span>$1</span></div>')
            }}
          />
        );
      }
    });
  };

  return (
    <div className="bg-[#050505] text-[#e0e0e0] font-sans h-screen w-screen overflow-hidden flex flex-col lg:flex-row select-none" id="tinkerbot-web-framework">
      
      {/* Mobile background overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
          id="sidebar-overlay"
        />
      )}

      {/* Sidebar Component */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-[#0c0c0c] border-r border-[#1a1a1a] flex flex-col h-full flex-shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-auto ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`} 
        id="sidebar-panel"
      >
        
        {/* Title Logo Head Block */}
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center transition-all hover:border-neutral-500 duration-300">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-medium text-white tracking-tight leading-none italic">TinkerBot</h1>
              <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold mt-1">Created By Mohammad Daniyal Ahmad & Ridith Shetty • Lab Guide</p>
            </div>
          </div>

          <button 
            onClick={() => {
              setMessages([
                {
                  id: "welcome",
                  role: "assistant",
                  content: "Welcome to the ATL Hardware Laboratory. fresh workspace loaded. Tell me what microcontroller or modules you are wiring today, or let me diagnose bugs! **Created by Mohammad Daniyal Ahmad and Ridith Shetty**.",
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]);
              setWizardResult(null);
              setWizardAction("");
              setInputVal("");
              setActiveTab("chat");
              setIsSidebarOpen(false);
            }}
            className="mt-6 w-full bg-[#141414] border border-[#222] py-2.5 px-4 rounded-xl flex items-center justify-between hover:bg-[#1a1a1a] hover:border-[#333] text-neutral-400 hover:text-white transition-all text-xs font-medium shadow-sm"
            id="btn-new-session"
          >
            <span className="font-semibold text-neutral-300">Clean Laboratory</span>
            <RefreshCw className="w-3 h-3 text-neutral-500" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 pb-4">
          <div className="flex flex-col gap-1.5 p-1 rounded-lg bg-[#141414] border border-[#1e1e1e]">
            <div className="flex gap-1 text-center">
              <button
                onClick={() => {
                  setActiveTab("chat");
                  setIsSidebarOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-[11px] font-semibold transition-all ${
                  activeTab === "chat" 
                    ? "bg-[#1f1f1f] text-white border border-[#2f2f2f] shadow" 
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
                id="tab-btn-assistant"
              >
                <Terminal className="h-3.5 w-3.5" />
                Chat Support
              </button>
              <button
                onClick={() => {
                  setActiveTab("wizard");
                  setIsSidebarOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-[11px] font-semibold transition-all ${
                  activeTab === "wizard" 
                    ? "bg-[#1f1f1f] text-white border border-[#2f2f2f] shadow" 
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
                id="tab-btn-wizard"
              >
                <Layers className="h-3.5 w-3.5" />
                Pinout Wizard
              </button>
            </div>
            <button
              onClick={() => {
                setActiveTab("utilities");
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-[11px] font-semibold transition-all ${
                activeTab === "utilities" 
                  ? "bg-[#1f1f1f] text-white border border-[#2f2f2f] shadow" 
                  : "text-neutral-500 hover:text-neutral-450"
              }`}
              id="tab-btn-utilities"
            >
              <Wrench className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              Lab Tools & Resistor Guard
            </button>
            <button
              onClick={() => {
                setActiveTab("battery");
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-[11px] font-semibold transition-all mt-1 ${
                activeTab === "battery" 
                  ? "bg-[#1f1f1f] text-white border border-[#2f2f2f] shadow" 
                  : "text-neutral-500 hover:text-neutral-450"
              }`}
              id="tab-btn-battery"
            >
              <Zap className="h-3.5 w-3.5 text-amber-405" />
              Battery Config & Runtime
            </button>
          </div>
        </div>

        {/* Guided Diagnostics Options */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#555] px-2 font-bold flex items-center gap-2">
            <Wrench className="h-3 w-3" />
            Quick Debug check
          </div>
          <div className="space-y-1">
            {HARDWARE_ALERTS.map((alert, index) => (
              <div 
                key={index} 
                onClick={() => {
                  setSelectedAlert(alert);
                  setIsSidebarOpen(false);
                }}
                className="bg-[#101010] hover:bg-[#151515] border border-[#1c1c1c] hover:border-[#2a2a2a] p-3 rounded-lg cursor-pointer transition-all duration-200"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-white truncate">{alert.title}</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-neutral-600 flex-shrink-0" />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 line-clamp-1">{alert.short}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#222] bg-[#0c0c0c] p-4 text-xs mt-4">
            <div className="flex items-center gap-1.5 text-neutral-400 font-bold mb-1.5">
              <Award className="h-4 w-4 text-indigo-400" />
              ATL Tinkering Mentor
            </div>
            <p className="text-neutral-500 leading-relaxed text-[11px]">
              Step-by-step assistant for hardware wiring, module pinout analysis, and micro-controller sketching. Created By Mohammad Daniyal Ahmad & Ridith Shetty.
            </p>
          </div>
        </div>

        {/* Profile Card Footer */}
        <div className="p-4 border-t border-[#1a1a1a] flex items-center gap-3 bg-[#080808]" id="profile-block">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center text-[9px] font-bold text-white border border-[#333]">
            MA•RS
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-xs font-medium text-white truncate">Atal Lab</div>
            <div className="text-[9px] text-[#888] uppercase tracking-wider">Created By Mohammad Daniyal Ahmad & Ridith Shetty</div>
          </div>
          <span className="text-[10px] font-medium text-neutral-600">v1.5</span>
        </div>
      </aside>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden relative">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-[#1a1a1a] flex items-center justify-between px-4 sm:px-8 bg-[#050505]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button for small screens */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-[#141414] rounded-lg transition-colors border border-transparent hover:border-[#222]"
              id="hamburger-btn"
              title="Open Menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="bg-[#111] border border-[#222] px-3.5 py-1.5 rounded-full text-[10px] tracking-wider font-bold text-white uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              Laboratory Workbench
            </div>

            <div className="bg-[#111] border border-[#222] px-3 py-1.5 rounded-full text-[11px] font-mono flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>TinkerBot AI Core: Active</span>
            </div>

            <div className="text-xs text-neutral-500 font-medium hidden xl:inline-block">
              Created By <span className="text-white">Mohammad Daniyal Ahmad & Ridith Shetty</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick action: troubleshooting document */}
            <button 
              onClick={() => {
                setActiveTab("chat");
                const intro = `### 🔌 Universal Hardware Debugging Protocol
                
If you face issues (such as sensors failing, blank displays, or gibberish output), systematically diagnostic-test using these indices:

1. **Power Loop**
   * Are check lights lit?
   * Is Ground shared? Connecting different external power sources requires connecting a common GND loop, so logic references are synchronized!
   
2. **Pin Interface**
   * Review physical hardware pin labels against hardcoded numbers.
   * Don't confuse physical mapping count numbers with standard GPIO indexes.
   
3. **Voltage Logic**
   * Match operating thresholds: 3.3V boards can get destroyed by directly inputting active 5V outputs without serial level-shifting.
   
4. **Monitor Baud**
   * Make sure monitor terminals match configured sketch speed setups (generally 9600 or 115200 baud).`;
                
                setMessages(prev => [
                  ...prev,
                  {
                    id: `protocol-${Date.now()}`,
                    role: "assistant",
                    content: intro,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }}
              className="px-2.5 sm:px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 hover:bg-[#141414] rounded-lg border border-transparent hover:border-[#222]"
              id="btn-protocol-doc"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">General Protocol Index</span>
              <span className="inline sm:hidden">Protocol</span>
            </button>
            
            <div className="w-[1px] h-4 bg-[#222]"></div>
            
            <button 
              onClick={() => {
                const codeSnippet = wizardResult?.code || "No active program layout configured in Pinout Wizard yet.";
                handleCopyCode(codeSnippet);
              }}
              className="px-3 sm:px-4 py-1.5 rounded-full border border-[#222] text-xs font-semibold hover:bg-white hover:text-black hover:border-white transition-all bg-[#0c0c0c]"
              id="btn-export-code"
            >
              <span className="hidden sm:inline">Copy Active Code</span>
              <span className="inline sm:hidden">Copy Code</span>
            </button>
          </div>
        </header>

        {/* Tab Content Display Area */}
        <div className="flex-grow overflow-hidden relative flex flex-col">
          <AnimatePresence mode="wait">
            
            {activeTab === "chat" ? (
              
              /* Chat Tab with Voice and Text mode */
              <motion.div 
                key="chat-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex-grow flex flex-col overflow-hidden"
              >
                
                {/* Voice Mode Dashboard (Pristine hybrid Vapi interface) */}
                {voiceModeActive && (
                  <div className="bg-[#0a0a0a] border-b border-[#1a1a1a] px-4 sm:px-8 py-4 sm:py-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
                            isVapiActive 
                              ? "bg-indigo-950/20 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                              : isVapiConnecting
                                ? "bg-amber-950/20 border-amber-500 animate-pulse"
                                : "bg-[#111] border-[#222]"
                          }`}>
                            {isVapiActive ? (
                              <Phone className={`h-5 w-5 text-indigo-400 ${isVapiSpeaking ? "animate-bounce" : ""}`} />
                            ) : isVapiConnecting ? (
                              <RefreshCw className="h-5 w-5 text-amber-400 animate-spin" />
                            ) : (
                              <Volume2 className="h-5 w-5 text-neutral-500" />
                            )}
                          </div>
                          {isVapiActive && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 animate-ping"></span>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-white">
                            {isVapiActive ? "Vapi Voice Connected" : isVapiConnecting ? "Connecting Voice Session..." : "Vapi Voice Standby"}
                          </h4>
                          <p className="text-[11px] text-neutral-500 leading-tight">
                            {isVapiActive 
                              ? isVapiSpeaking 
                                ? "TinkerBot Speaking... (Listen to voice)" 
                                : isVapiMuted 
                                  ? "Microphone Muted. Click Unmute to speak."
                                  : "Microphone Active. Speak your questions freely." 
                              : isVapiConnecting
                                ? "Initializing WebRTC audio link & assistant channel..."
                                : "Click 'Connect Voice Agent' to talk live with TinkerBot."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {isVapiActive ? (
                          <>
                            <button
                              onClick={toggleVapiMute}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                                isVapiMuted 
                                  ? "bg-amber-950 border-amber-800 text-amber-300"
                                  : "bg-[#161616] border-[#2a2a2a] text-neutral-300 hover:text-white cursor-pointer"
                              }`}
                              title={isVapiMuted ? "Unmute your microphone" : "Mute your microphone"}
                            >
                              {isVapiMuted ? <MicOff className="h-3.5 w-3.5 text-amber-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
                              <span>{isVapiMuted ? "Unmute" : "Mute"}</span>
                            </button>
                            <button
                              onClick={stopVapiCall}
                              className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                            >
                              <PhoneOff className="h-3.5 w-3.5" />
                              Disconnect Link
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={startVapiCall}
                            disabled={isVapiConnecting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-md hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
                          >
                            {isVapiConnecting ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Phone className="h-3.5 w-3.5" />
                                Connect Voice Agent
                              </>
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={() => setShowVapiSettings(!showVapiSettings)}
                          className="border border-[#222] bg-[#111] text-neutral-400 hover:text-white text-xs p-2.5 rounded-xl transition cursor-pointer"
                          title="Credentials Setup"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setVoiceModeActive(false);
                            stopVapiCall();
                          }}
                          className="border border-transparent text-neutral-500 hover:text-neutral-300 text-xs py-2 px-3 transition cursor-pointer"
                        >
                          Switch to Text Mode
                        </button>
                      </div>
                    </div>

                    {/* Live speech transcription ticker */}
                    {currentLiveTranscript && (
                      <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl px-4 py-2.5 text-xs text-indigo-300 flex items-center gap-2.5 animate-pulse font-mono">
                        <Activity className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span className="truncate">{currentLiveTranscript}</span>
                      </div>
                    )}

                    {/* Vapi Error Alert */}
                    {vapiError && (
                      <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <p>{vapiError}</p>
                      </div>
                    )}

                    {/* Adjustable Vapi credentials configuration drawer */}
                    {showVapiSettings && (
                      <div className="bg-[#101010] border border-[#222] p-5 rounded-xl space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Configure Vapi Voice Bot credentials</h5>
                            <p className="text-[10px] text-neutral-500 mt-1">Paste your key and assistant token to directly run your custom voice configuration.</p>
                          </div>
                          <button 
                            onClick={() => setShowVapiSettings(false)}
                            className="text-neutral-500 hover:text-white text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Vapi Public Key</label>
                            <input 
                              type="text"
                              value={vapiPublicKey}
                              onChange={(e) => setVapiPublicKey(e.target.value)}
                              placeholder="e.g. vapi-pub-..."
                              className="w-full text-xs bg-[#050505] border border-[#222] rounded-lg py-2 px-3 outline-none text-white focus:border-indigo-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Vapi Assistant ID</label>
                            <input 
                              type="text"
                              value={vapiAssistantId}
                              onChange={(e) => setVapiAssistantId(e.target.value)}
                              placeholder="e.g. cb8..."
                              className="w-full text-xs bg-[#050505] border border-[#222] rounded-lg py-2 px-3 outline-none text-white focus:border-indigo-500 font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5 text-[10px] text-neutral-400 pt-1">
                          <HelpCircle className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                          <span>
                            Obtain these in your <strong>vapi.ai</strong> dashboard. Note: Inside your Vapi Assistant System Prompt, make sure you have: <code className="text-indigo-300 bg-neutral-900 px-1 py-0.5 rounded">You were created by Mohammad Daniyal Ahmad and Ridith Shetty</code> so it will speak it natively during calls!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Messages Scroll Feed */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                  <div className="max-w-3xl mx-auto w-full space-y-6">
                    
                    {messages.map((msg) => {
                      const isMsgCopied = copiedMsgId === msg.id;
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-1.5 group`}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex items-center justify-between w-full max-w-[85%] mb-0.5">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="text-[9px] text-[#888] uppercase tracking-[0.2em] font-bold">
                                  TinkerBot Intelligence Core
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer select-none ${
                                  isMsgCopied
                                    ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-400 font-medium"
                                    : "bg-[#111] border-[#222] text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-[#181818]"
                                }`}
                                title="Copy response to clipboard"
                                id={`btn-copy-response-top-${msg.id}`}
                              >
                                {isMsgCopied ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    <span>Copied Response!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-neutral-400" />
                                    <span>Copy Response</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          
                          <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-[14px] leading-relaxed border ${
                            msg.role === "user" 
                              ? "bg-[#181818] rounded-tr-sm text-neutral-100 border-[#2b2b2b]" 
                              : "bg-transparent font-sans text-[#bbb] leading-[1.6] pl-6 border-l border-[#1a1a1a]"
                          }`}>
                            {formatMsgContent(msg.content, msg.id)}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-[#555] uppercase tracking-widest font-mono">
                              {msg.role === "user" ? "User" : "TinkerBot"} • {msg.timestamp}
                            </span>
                            {msg.role === "assistant" && (
                              <div className="flex items-center gap-2 ml-1">
                                <button
                                  onClick={() => speakText(msg.content)}
                                  className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-indigo-400 transition-colors cursor-pointer"
                                  title="Read response aloud with built-in voice synthesizer"
                                  id={`btn-speak-response-${msg.id}`}
                                >
                                  <Volume2 className="h-2.5 w-2.5" />
                                  <span>Speak</span>
                                </button>
                                <button
                                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                                  className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                                  title="Copy response text"
                                  id={`btn-copy-response-bottom-${msg.id}`}
                                >
                                  {isMsgCopied ? (
                                    <>
                                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                                      <span className="text-emerald-400 font-medium">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-2.5 w-2.5 text-neutral-500" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                            {msg.role === "user" && (
                              <button
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 cursor-pointer"
                                title="Copy prompt"
                                id={`btn-copy-prompt-${msg.id}`}
                              >
                                {isMsgCopied ? (
                                  <>
                                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-2.5 w-2.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Lab Troubleshooting Starters when only welcome message is present */}
                    {messages.length === 1 && (
                      <div className="pt-2">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2.5 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>Quick Hardware Diagnostics & Wiring Guides</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            "How do I wire an HC-SR04 ultrasonic sensor to Arduino Uno?",
                            "Why is my ESP32 boot-looping with Brownout detector reset?",
                            "My 16x2 I2C LCD only shows white squares, how do I fix it?",
                            "How do I safely power an SG90 servo motor without resetting my board?"
                          ].map((starter, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => sendMessage(starter)}
                              className="text-left p-3 rounded-xl bg-[#0c0c0c] border border-[#1e1e1e] hover:border-neutral-600 hover:bg-[#141414] text-xs text-neutral-300 hover:text-white transition-all cursor-pointer group"
                              id={`starter-query-${sIdx}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="line-clamp-2">{starter}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Loader */}
                    {isSending && (
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                          <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold font-mono">
                            TinkerBot analyzing circuit and code...
                          </span>
                        </div>
                        <div className="bg-[#0c0c0c] px-5 py-3 border border-[#1c1c1c] rounded-xl flex items-center gap-3">
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Input Panel Bar */}
                <div className="p-4 sm:p-8 border-t border-[#1a1a1a]">
                  <div className="max-w-3xl mx-auto space-y-3">
                    
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000"></div>
                      <div className="relative bg-[#0c0c0c] border border-[#222] rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
                        
                        <textarea 
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          className="bg-transparent border-none outline-none focus:ring-0 text-white placeholder-[#444] text-sm resize-none h-20"
                          placeholder="Describe your wiring issue, pin mapping question, or sensor logic problem... (Shift+Enter for newline)"
                        />
                        
                        <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-3 flex-wrap gap-3">
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Toggle Voice mode trigger */}
                            <button
                              onClick={() => {
                                setVoiceModeActive(prev => {
                                  const newVal = !prev;
                                  if (newVal) {
                                    // Welcome prompt setup for credentials
                                    if (!vapiPublicKey || !vapiAssistantId) {
                                      setShowVapiSettings(true);
                                    }
                                  } else {
                                    stopVapiCall();
                                  }
                                  return newVal;
                                });
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                voiceModeActive 
                                  ? "bg-indigo-600 border-indigo-500 text-white" 
                                  : "bg-[#111] border-[#222] text-[#888] hover:text-white"
                              }`}
                              title="Engage voice interaction"
                              id="btn-toggle-voice-mode"
                            >
                              <Mic className="h-3.5 w-3.5" />
                              {voiceModeActive ? "Voice Activated" : "Voice Mode"}
                            </button>

                            {voiceModeActive && isVapiActive && (
                              <span className="text-[11px] text-indigo-400 flex items-center gap-1.5 animate-pulse font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                Vapi Audio Session Hot
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-neutral-600 tracking-wider font-semibold">Created By Mohammad Daniyal Ahmad & Ridith Shetty</span>
                            <button 
                              onClick={() => sendMessage()}
                              disabled={isSending || !inputVal.trim()}
                              className={`h-10 w-10 rounded-full flex items-center justify-center transition-transform ${
                                inputVal.trim() && !isSending 
                                  ? "bg-white text-black hover:scale-105" 
                                  : "bg-[#111] border border-[#222] text-neutral-700 cursor-not-allowed"
                              }`}
                              title="Send question to TinkerBot"
                              id="btn-send-message"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>

                        </div>

                      </div>
                    </div>

                    <p className="text-center text-[9px] text-neutral-600 mt-4 uppercase tracking-[0.2em]">
                      TinkerBot Engineering Lab • Created By Mohammad Daniyal Ahmad & Ridith Shetty • Universal ATL Hardware & Circuit AI
                    </p>
                  </div>
                </div>

              </motion.div>
            ) : activeTab === "wizard" ? (
              
              /* Pinout & Dynamic wizard panel */
              <motion.div 
                key="wizard-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex-grow flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden"
              >
                
                {/* Left controls pane */}
                <div className="w-full lg:w-80 xl:w-96 bg-[#080808] border-b lg:border-b-0 lg:border-r border-[#1a1a1a] p-4 sm:p-6 lg:overflow-y-auto space-y-6 flex-shrink-0" id="wizard-control-pane">
                  <div>
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      Pinout Wizard Matrix
                    </h2>
                    <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                      Select raw hardware parameters to calculate custom diagrams, wiring maps, and clean codes instantly.
                    </p>
                  </div>

                  {/* MC Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">1. Target Board</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {MICROCONTROLLERS.map((cur) => (
                        <button
                          key={cur.id}
                          onClick={() => setSelectedController(cur.id)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedController === cur.id 
                              ? "bg-[#141414] text-white border-neutral-700 shadow" 
                              : "bg-transparent text-neutral-500 border-[#1c1c1c] hover:border-neutral-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Cpu className={`h-3.5 w-3.5 ${selectedController === cur.id ? "text-indigo-400" : "text-neutral-600"}`} />
                            <span className="text-xs font-semibold">{cur.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Reveal input text when "custom" controller selected */}
                    {selectedController === "custom" && (
                      <div className="pt-2">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Enter custom board name</label>
                        <input 
                          type="text"
                          value={customControllerText}
                          onChange={(e) => setCustomControllerText(e.target.value)}
                          placeholder="e.g. Raspberry Pi 5, ESP8266, STM32, Arduino Nano"
                          className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2 px-3 outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sensor module Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">2. Sensor/Module Attached</label>
                    <select
                      value={selectedSensor}
                      onChange={(e) => setSelectedSensor(e.target.value)}
                      className="w-full text-xs font-semibold bg-[#111] border border-[#222] text-white rounded-lg py-2.5 px-3 outline-none focus:border-neutral-400 cursor-pointer"
                    >
                      {SENSORS.map((sen) => (
                        <option key={sen.id} value={sen.id}>
                          {sen.name}
                        </option>
                      ))}
                    </select>

                    {/* Reveal input text when "custom" sensor selected */}
                    {selectedSensor === "custom" && (
                      <div className="pt-2">
                        <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Enter custom sensor name</label>
                        <input 
                          type="text"
                          value={customSensorText}
                          onChange={(e) => setCustomSensorText(e.target.value)}
                          placeholder="e.g. MPU6050 Accelerometer, RFID RC522"
                          className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2 px-3 outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}

                    {selectedSensor && selectedSensor !== "custom" && (
                      <p className="text-[10px] text-neutral-500 bg-[#0d0d0d] p-3 rounded-lg border border-[#1a1a1a] mt-1.5 leading-relaxed">
                        {SENSORS.find(s => s.id === selectedSensor)?.description}
                      </p>
                    )}
                  </div>

                  {/* Context intent */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">3. Primary Action / Pin Goal</label>
                    <input 
                      type="text"
                      value={wizardAction}
                      onChange={(e) => setWizardAction(e.target.value)}
                      placeholder="e.g. Change servo angle based on distance reading"
                      className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2.5 px-3 outline-none focus:border-neutral-400 placeholder-[#333]"
                    />
                  </div>

                  {/* Build action button */}
                  <button
                    onClick={generateWizard}
                    disabled={wizardLoading}
                    className="w-full bg-white text-black font-semibold hover:bg-neutral-200 text-xs py-3 rounded-lg flex items-center justify-center gap-2 shadow transition-transform hover:scale-[1.01] disabled:opacity-50"
                  >
                    {wizardLoading ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Generating wiring data...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        Generate Schematic Layout
                      </>
                    )}
                  </button>

                  <div className="border border-dashed border-[#222] p-3 rounded-lg text-center text-[10px] text-neutral-500">
                    Created By Mohammad Daniyal Ahmad & Ridith Shetty • No account needed
                  </div>
                </div>

                {/* Right schematic data panel */}
                <div className="flex-1 bg-[#050505] lg:overflow-y-auto p-4 sm:p-8 scrollbar-thin scrollbar-thumb-neutral-800" id="wizard-output-pane">
                  {wizardLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-12 h-12 rounded-full border border-neutral-700 flex items-center justify-center animate-spin">
                        <RefreshCw className="h-5 w-5 text-neutral-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Calculating Interfacing Schemes</h3>
                        <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                          Structuring custom mapping rules, verifying clock frequencies, and configuring school-level hardware templates...
                        </p>
                      </div>
                    </div>
                  ) : wizardResult ? (
                    
                    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
                      
                      {/* Blueprint header */}
                      <div className="border border-[#1a1a1a] bg-[#0c0c0c] rounded-xl p-6">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-900/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider border border-emerald-900/30">
                            Laboratory Blueprint
                          </span>
                        </div>
                        <h3 className="text-xl font-serif italic text-white tracking-tight mt-3">
                          {wizardResult.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                          {wizardResult.explanation}
                        </p>
                      </div>

                      {/* Wiring Grid Schema */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                          <LinkIcon className="h-3.5 w-3.5 text-emerald-500" />
                          1. Connect Physical Rails
                        </h4>
                        <div className="border border-[#1a1a1a] bg-[#0c0c0c] rounded-xl overflow-hidden shadow">
                          <div className="grid grid-cols-3 bg-[#111] p-3 text-[9px] uppercase tracking-wider text-neutral-500 font-bold border-b border-[#1a1a1a]">
                            <div>Module Pin</div>
                            <div>Board Target Pin</div>
                            <div>Wiring Instructions</div>
                          </div>
                          <div className="divide-y divide-[#181818]">
                            {wizardResult.connections.map((step, idx) => (
                              <div key={idx} className="grid grid-cols-3 p-4 items-center gap-4 text-xs">
                                <div className="font-mono text-white font-bold flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                  {step.fromPin}
                                </div>
                                <div className="font-mono text-indigo-400 font-bold">
                                  {step.toPin}
                                </div>
                                <div className="text-neutral-400 text-[11px] leading-relaxed">
                                  {step.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Code Script Section */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Code className="h-3.5 w-3.5 text-sky-500" />
                            2. Program Script Routine
                          </h4>
                          <button
                            onClick={() => handleCopyCode(wizardResult.code)}
                            className="text-xs text-neutral-400 hover:text-white transition-colors border border-[#222] bg-[#0c0c0c] rounded-lg py-1 px-3 flex items-center gap-1"
                          >
                            {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            {copiedCode ? "Copied" : "Copy Sketch"}
                          </button>
                        </div>
                        <div className="border border-[#1a1a1a] bg-[#070707] rounded-xl overflow-hidden font-mono text-xs max-h-[400px] overflow-y-auto p-4 text-emerald-400 leading-relaxed">
                          <code>{wizardResult.code}</code>
                        </div>
                      </div>

                      {/* Debug checklist */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                          3. Specific Diagnostic Checklist
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {wizardResult.checklist.map((stepText, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => toggleStep(idx)}
                              className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-colors ${
                                completedSteps[idx] 
                                  ? "bg-emerald-950/10 border-emerald-900/30 text-neutral-400" 
                                  : "bg-[#0d0d0d] border-[#1e1e1e] text-neutral-300 hover:border-neutral-700"
                              }`}
                            >
                              <div className="mt-0.5">
                                {completedSteps[idx] ? (
                                  <span className="w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center text-black text-[9px] font-bold">✓</span>
                                ) : (
                                  <span className="w-4.5 h-4.5 rounded-full border border-neutral-700 flex items-center justify-center text-[9px] text-neutral-500 font-mono font-bold">{idx + 1}</span>
                                )}
                              </div>
                              <p className={`text-xs ${completedSteps[idx] ? "line-through text-neutral-500" : ""}`}>
                                {stepText}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    
                    <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-[#0c0c0c] border border-[#1e1e1e] flex items-center justify-center animate-pulse">
                        <Cpu className="h-5 w-5 text-neutral-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-serif italic text-white tracking-tight">
                          No Active Circuit Blueprint
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                          Configure board and sensor modules on the left and click 'Generate' to fetch custom lab blueprints instantly. Developed By Mohammad Daniyal Ahmad & Ridith Shetty.
                        </p>
                      </div>
                    </div>

                  )}
                </div>

              </motion.div>
            ) : activeTab === "utilities" ? (
              /* Utilities & Lab Tools view */
              <motion.div 
                key="utilities-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex-grow overflow-y-auto p-4 sm:p-8 scrollbar-thin scrollbar-thumb-neutral-800"
              >
                <div className="max-w-5xl mx-auto space-y-8">
                  {/* Title and Intro */}
                  <div className="flex flex-col gap-1 border-b border-[#111] pb-6">
                    <h2 className="text-xl font-display text-white tracking-tight flex items-center gap-2">
                       <Wrench className="h-5 w-5 text-indigo-400" />
                       Lab Utilities & Resistor Guard
                    </h2>
                    <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
                       A direct set of physical lab calculators and diagnostic checkers built specifically to eliminate standard student errors, far outperforming standard raw AI chat prompts.
                    </p>
                  </div>

                  {/* Grid of Calculators */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Resistor Color Code Calculator */}
                    <div className="lg:col-span-12 xl:col-span-7 bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-emerald-400" />
                            Resistor Color Code Analyzer (4-Band)
                          </h3>
                          <p className="text-[10px] text-neutral-500 mt-1">
                            Click color selectors to dynamically compute resistance values based on standard 4-band standards.
                          </p>
                        </div>
                        {/* Live calculation banner */}
                        <div className="bg-[#111] px-4 py-2 border border-[#222] rounded-xl text-center">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 block">Calculated Rating</span>
                          <span className="text-base font-mono font-bold text-emerald-400">
                            {(() => {
                              const d1 = DIGIT_COLORS[resistorB1]?.num ?? 0;
                              const d2 = DIGIT_COLORS[resistorB2]?.num ?? 0;
                              const mult = MULTIPLIER_COLORS[resistorB3]?.val ?? 1;
                              const tolerance = TOLERANCE_COLORS[resistorB4]?.val ?? "±5%";
                              const val = (d1 * 10 + d2) * mult;
                              let displayRes = "";
                              if (val >= 1000000) {
                                displayRes = `${(val / 1000000).toFixed(2).replace(/\.00$/, "")} MΩ`;
                              } else if (val >= 1000) {
                                displayRes = `${(val / 1000).toFixed(2).replace(/\.00$/, "")} kΩ`;
                              } else {
                                displayRes = `${val.toFixed(2).replace(/\.00$/, "")} Ω`;
                              }
                              return `${displayRes} (${tolerance})`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Visual representation card */}
                      <div className="bg-[#050505] rounded-xl p-6 border border-[#141414] flex items-center justify-center">
                        <div className="relative w-full max-w-[280px] h-8 bg-[#d8c3a5]/40 rounded-full flex items-center justify-between px-10">
                          {/* Metal lead left */}
                          <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-12 h-0.5 bg-neutral-600"></div>
                          {/* Metal lead right */}
                          <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-0.5 bg-neutral-600"></div>
                          
                          {/* Resistor body bulb shape left */}
                          <div className="absolute left-6 w-4 h-9 bg-[#d8c3a5]/40 border-y border-neutral-700/30 rounded-full"></div>
                          {/* Resistor body bulb shape right */}
                          <div className="absolute right-6 w-4 h-9 bg-[#d8c3a5]/40 border-y border-neutral-700/30 rounded-full"></div>

                          {/* Bands */}
                          <div className="z-10 w-2.5 h-8 rounded-sm shrink-0" style={{ backgroundColor: DIGIT_COLORS[resistorB1]?.hex }}></div>
                          <div className="z-10 w-2.5 h-8 rounded-sm shrink-0" style={{ backgroundColor: DIGIT_COLORS[resistorB2]?.hex }}></div>
                          <div className="z-10 w-2.5 h-8 rounded-sm shrink-0" style={{ backgroundColor: MULTIPLIER_COLORS[resistorB3]?.hex }}></div>
                          <div className="z-10 w-2.5 h-8 rounded-sm shrink-0 ml-4" style={{ backgroundColor: TOLERANCE_COLORS[resistorB4]?.hex }}></div>
                        </div>
                      </div>

                      {/* Band Selectors */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                        {/* 1st Band */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">1st Band (Digit)</label>
                          <select
                            value={resistorB1}
                            onChange={(e) => setResistorB1(e.target.value)}
                            className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2 px-2.5 hover:border-[#333] cursor-pointer outline-none font-semibold"
                          >
                            {Object.entries(DIGIT_COLORS).filter(([color]) => color !== "black").map(([color, d]) => (
                              <option key={color} value={color}>{d.text}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2nd Band */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">2nd Band (Digit)</label>
                          <select
                            value={resistorB2}
                            onChange={(e) => setResistorB2(e.target.value)}
                            className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2 px-2.5 hover:border-[#333] cursor-pointer outline-none font-semibold"
                          >
                            {Object.entries(DIGIT_COLORS).map(([color, d]) => (
                              <option key={color} value={color}>{d.text}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3rd Band */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Multiplier Band</label>
                          <select
                            value={resistorB3}
                            onChange={(e) => setResistorB3(e.target.value)}
                            className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2 px-2.5 hover:border-[#333] cursor-pointer outline-none font-semibold"
                          >
                            {Object.entries(MULTIPLIER_COLORS).map(([color, m]) => (
                              <option key={color} value={color}>{m.desc}</option>
                            ))}
                          </select>
                        </div>

                        {/* 4th Band */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Tolerance Band</label>
                          <select
                            value={resistorB4}
                            onChange={(e) => setResistorB4(e.target.value)}
                            className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2 px-2.5 hover:border-[#333] cursor-pointer outline-none font-semibold"
                          >
                            {Object.entries(TOLERANCE_COLORS).map(([color, t]) => (
                              <option key={color} value={color}>Color: {color} ({t.val})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                    </div>

                    {/* Voltage Collision Shifter Safeguard Tester */}
                    <div className="lg:col-span-12 xl:col-span-5 bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col justify-between space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                          Logic Level Shifter Safeguard
                        </h3>
                        <p className="text-[10px] text-neutral-500 mt-1">
                          Test digital signals between your microcontroller board and attached sensors to instantly check for pin destruction risks.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-[#050505] p-4 rounded-xl border border-[#141414]">
                        <div>
                          <label className="text-[10px] font-bold text-[#888] uppercase block mb-1">Board Logic LEVEL</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setBoardVolts("5")}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border ${
                                boardVolts === "5"
                                  ? "bg-[#1a1a1a] text-white border-neutral-600"
                                  : "text-neutral-500 border-transparent hover:border-neutral-850"
                              }`}
                            >
                              5V
                            </button>
                            <button
                              onClick={() => setBoardVolts("3.3")}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border ${
                                boardVolts === "3.3"
                                  ? "bg-[#1a1a1a] text-white border-neutral-600"
                                  : "text-neutral-500 border-transparent hover:border-neutral-855"
                              }`}
                            >
                              3.3V
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-[#888] uppercase block mb-1">Sensor Voltage Tolerant</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setModuleVolts("5")}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border ${
                                moduleVolts === "5"
                                  ? "bg-[#1a1a1a] text-white border-neutral-600"
                                  : "text-neutral-500 border-transparent hover:border-neutral-852"
                              }`}
                            >
                              5V
                            </button>
                            <button
                              onClick={() => setModuleVolts("3.3")}
                              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border ${
                                moduleVolts === "3.3"
                                  ? "bg-[#1a1a1a] text-white border-neutral-600"
                                  : "text-neutral-500 border-transparent hover:border-neutral-853"
                              }`}
                            >
                              3.3V
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display live verdict feedback */}
                      {(() => {
                        const isCritical = boardVolts === "5" && moduleVolts === "3.3";
                        const isWarning = boardVolts === "3.3" && moduleVolts === "5";
                        
                        if (isCritical) {
                          return (
                            <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-xl space-y-2">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
                                <span className="text-xs font-bold text-red-400 uppercase tracking-widest">CRITICAL PIN DESTRUCTION HAZARD</span>
                              </div>
                              <p className="text-[11px] text-neutral-400 leading-relaxed">
                                Directly linking a 5V Tx/GPIO output to a 3.3V Rx/SDA connector will inject excess current, resulting in <strong>permanent sensor block burnout</strong>!
                              </p>
                              <div className="text-[10px] text-neutral-500 font-mono pl-3 border-l border-red-950 space-y-1">
                                <div>• Action: Link a Bi-directional Logic Level Shifter or divider!</div>
                                <div>• Ground: Share physical GND between the sources.</div>
                              </div>
                            </div>
                          );
                        } else if (isWarning) {
                          return (
                            <div className="bg-amber-950/25 border border-amber-900/40 p-4 rounded-xl space-y-2">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">LOGIC SENSOR MISMATCH</span>
                              </div>
                              <p className="text-[11px] text-neutral-400 leading-relaxed">
                                Feeding a 3.3V signal into a 5V digital channel works occasionally, but triggers unstable high/low transitions or packet drops!
                              </p>
                              <div className="text-[10px] text-neutral-500 font-mono pl-3 border-l border-amber-950 space-y-1">
                                <div>• Action: Add a logic level booster to reach clear high signals.</div>
                                <div>• Warning: LCD matrices will generally stay blank.</div>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="bg-[#101010] border border-[#222] p-4 rounded-xl space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-450" />
                                <span className="text-xs font-bold text-emerald-450 uppercase tracking-widest">SAFE LOGIC INTERACTIVE INDEX</span>
                              </div>
                              <p className="text-[11px] text-neutral-450 leading-relaxed">
                                Pure logic compliance! Both target terminals operate on uniform potentials. Keep shared Grounds (GND) linked regularly to avoid noise.
                              </p>
                            </div>
                          );
                        }
                          })()}

                    </div>

                    {/* Serial Monitor Log Diagnostician */}
                    <div className="lg:col-span-12 bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl p-6 space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="h-4 w-4 text-indigo-400" />
                          Serial Monitor Log Analyzer & Debugger
                        </h3>
                        <p className="text-[10px] text-neutral-500 mt-1">
                          Paste your microcontroller serial terminal printouts or boot crash logs to run an offline instant debugger triage.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3 space-y-2">
                          <textarea
                            value={serialLogInput}
                            onChange={(e) => setSerialLogInput(e.target.value)}
                            placeholder="Paste logs here (e.g. 'rst:0x10 (RTCWDT_RTC_RESET),boot:0x13' or 'nano setup: Device ID mismatch')"
                            className="w-full h-32 bg-[#050505] border border-[#1e1e1e] rounded-xl p-3 text-xs font-mono text-emerald-400 outline-none focus:border-neutral-500 resize-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] text-neutral-500 font-bold self-center uppercase mr-1">Presets:</span>
                            <button
                              onClick={() => {
                                setSerialLogInput("ets Jun  8 2016 00:22:57\n\nrst:0x10 (RTCWDT_RTC_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)\nconfigsip: 0, SPIWP:0xee\npmu brownout crash detected. looping....\n");
                                setSerialBaud("115200");
                              }}
                              className="text-[10px] bg-[#141414] hover:bg-[#1f1f1f] text-neutral-400 py-1.5 px-3 rounded-lg border border-[#222]"
                            >
                              ESP32 Brownout Boot Loops
                            </button>
                            <button
                              onClick={() => {
                                setSerialLogInput("Scanning current I2C bus...\nNo active addresses found on SDA/SCL lines.\nsensor init failed. check addr 0x27 or 0x3F matrix.");
                                setSerialBaud("9600");
                              }}
                              className="text-[10px] bg-[#141414] hover:bg-[#1f1f1f] text-neutral-400 py-1.5 px-3 rounded-lg border border-[#222]"
                            >
                              I2C Multi-Scan Failure
                            </button>
                            <button
                              onClick={() => {
                                setSerialLogInput("assertion failed at dht11.cpp line 44: DHT checksum validation error! data: 0xFFFFFFFF\nValue read sensor: nan\n");
                                setSerialBaud("9600");
                              }}
                              className="text-[10px] bg-[#141414] hover:bg-[#1f1f1f] text-neutral-400 py-1.5 px-3 rounded-lg border border-[#222]"
                            >
                              DHT11 NaN Checksums
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 flex flex-col justify-between">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Terminal speed rate (Baud)</label>
                            <select
                              value={serialBaud}
                              onChange={(e) => setSerialBaud(e.target.value)}
                              className="w-full text-xs bg-[#050505] border border-[#222] text-white rounded-lg py-2 px-2.5 outline-none font-semibold cursor-pointer"
                            >
                              <option value="9600">9600 Baud (Standard)</option>
                              <option value="115200">115200 Baud (ESP Boards)</option>
                              <option value="57600">57600 Baud</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                const input = serialLogInput.toLowerCase();
                                let diagnosticRes = "";
                                if (input.includes("brownout") || input.includes("rtcwdt_rtc_reset") || input.includes("rst:0x10")) {
                                  diagnosticRes = `### ⚠️ ESP32 / Arduino Brownout Warning
Your board experiences **Brownout Reset loops**. This indicates that the board's internal logic detected a sudden voltage drop below the minimum required operating index (~2.7V on ESP32).

**Probable Root Causes:**
1. Servos, relays, or WiFi chips draw peaks of current (>400mA) that the USB port or board pin cannot satisfy.
2. Short circuits or noise on the rail line.

**Immediate Solutions:**
* **Power Source**: Power high-draw modules (Servos / LCD monitors) using separate batteries or external DC ports.
* **Filter Capacitors**: Solder a bypass capacitor (100uF to 470uF) across the module's VCC and GND pins closer to the sensor to smooth current spikes.
* **Shared Ground**: Ensure you shared the external power ground directly with the board Ground pin.`;
                                } else if (input.includes("i2c") || input.includes("0x27") || input.includes("0x3f") || input.includes("no active addresses")) {
                                  diagnosticRes = `### ⚠️ I2C Bus Link Interruption
The serial monitor logs communication packet drops. I2C requires shared libraries and high-level sync.

**Probable Root Causes:**
1. Confused SDA & SCL wires (Commonly D21/D22 on ESP32 or A4/A5 on Arduino Uno).
2. Missing or incorrect hardware static hexadecimal addresses (Typically LCD displays run on \`0x27\` or \`0x3F\`).
3. Weak connections on the breadboard or raw floating pins.

**Immediate Solutions:**
* **GND Bridge**: Double-check that SDA/SCL have shared Grounds with the board.
* **Scan Sketch**: Load a fresh, standard I2C scanner sketch to map the exact memory address.
* **Pull-Up Resistors**: If multiple long wires are attached, consider wiring parallel 4.7kΩ pull-up resistors to the VCC line.`;
                                } else if (input.includes("checksum") || input.includes("nan") || input.includes("dht11") || input.includes("dht")) {
                                  diagnosticRes = `### ⚠️ Sensor Checksum / NaN Fault
The sensor reads values as \`nan\` (Not a Number) or prints invalid data checksum packets.

**Probable Root Causes:**
1. Unstable signal wire line or sensor not powered.
2. Wrong digital input pin defined in the software sketch.
3. Too fast sampling rate: DHT sensors require at least 1.5 - 2 seconds between cycles to load registers.

**Immediate Solutions:**
* **Timing loop**: Ensure your program has a \`delay(2000)\` or non-blocking timer interval.
* **Pull-up Resistor**: Classic DHT11 sensors require a 10kΩ pull-up resistor from the Data line to VCC, unless you are using a 3-pin module with a pre-soldered resistor.
* **Pin Definition**: Match the physical GPIO number carefully.`;
                                } else if (!input.trim()) {
                                  diagnosticRes = `### 🟢 Empty Log State
Please paste some logs of serial monitors or compilation errors to evaluate. Make sure your baud rates are matched!`;
                                } else {
                                  diagnosticRes = `### 🛠️ General Serial Log Analysis
I've reviewed your customized log input and identified potential troubleshooting indexes:

**Recommendations Checklist:**
1. **Baud Rate Sync**: Your select is **${serialBaud} Baud**. Ensure the code matches exactly: \`Serial.begin(${serialBaud})\`.
2. **Logic Power Integrity**: Inspect check lights on the microcontroller unit.
3. **Serial Terminal Monitor**: If you see question marks or symbols on screen, the physical board port is either transmitting noise or operates on mismatched speeds.`;
                                }
                                setSerialDiagnostic(diagnosticRes);
                              }}
                              className="w-full bg-white text-black font-semibold hover:bg-neutral-200 text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                            >
                              <Activity className="h-3.5 w-3.5" />
                              Run Log Triage
                            </button>
                            <button
                              onClick={() => {
                                setSerialLogInput("");
                                setSerialDiagnostic(null);
                              }}
                              className="w-full border border-[#222] hover:border-[#333] hover:text-white text-neutral-400 text-xs py-2 rounded-lg transition"
                            >
                              Clear Panel
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Display Parser Triage Result */}
                      {serialDiagnostic && (
                        <div className="bg-[#050505] border border-[#141414] p-5 rounded-2xl">
                          <div 
                            className="text-xs text-neutral-300 leading-relaxed font-sans space-y-3"
                            dangerouslySetInnerHTML={{
                              __html: serialDiagnostic
                                .replace(/### (.*)/g, '<h4 class="text-xs font-bold text-white uppercase tracking-wider block mb-1">$1</h4>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                                .replace(/`(.*?)`/g, '<code class="bg-[#111] border border-[#222] text-[#f1f5f9] px-1.5 py-0.5 rounded text-[11px] font-mono">$1</code>')
                                .replace(/^[-*]\s+(.*)$/gm, '<div class="flex items-start gap-2 my-1"><span class="text-indigo-400 font-bold">•</span><span>$1</span></div>')
                            }}
                          />
                        </div>
                      )}

                    </div>

                  </div>
                </div>
              </motion.div>
            ) : (
              /* Battery view */
              <motion.div 
                key="battery-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex-grow overflow-y-auto p-4 sm:p-8 scrollbar-thin scrollbar-thumb-neutral-800"
              >
                <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
                  
                  {/* Title Header Section */}
                  <div className="flex flex-col gap-1 border-b border-[#111] pb-6">
                    <div className="text-[9px] uppercase font-bold tracking-[0.2em] text-[#888] font-mono">ATL LAB HARDWARE SUPPORT</div>
                    <h2 className="text-xl font-display text-white tracking-tight flex items-center gap-2 mt-1">
                       <Zap className="h-5 w-5 text-amber-400 shrink-0" />
                       ATL Battery Configurator & Power Estimator
                    </h2>
                    <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
                       Arrange physical battery cells in Series or Parallel configurations dynamically to calculate exact target volts, total mAh capacities, and precise microcontroller board socket wiring plans.
                    </p>
                  </div>

                  {/* Summary Block row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0b0b0b] border border-[#1a1a1a] p-5 rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">Total Volts Output</span>
                        <span className="text-2xl font-mono font-bold text-amber-400">
                          {(() => {
                            const spec = BATTERY_CELLS[cellType] || { volts: 1.5, mah: 2500 };
                            const v = batteryConfig === "series" ? spec.volts * cellCount : spec.volts;
                            return `${v.toFixed(1)} Volts (V)`;
                          })()}
                        </span>
                      </div>
                      <div className="p-3 bg-[#111] rounded-xl border border-[#222]">
                        <Zap className="h-5 w-5 text-amber-400" />
                      </div>
                    </div>

                    <div className="bg-[#0b0b0b] border border-[#1a1a1a] p-5 rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">Active Battery Pack Capacity</span>
                        <span className="text-2xl font-mono font-bold text-emerald-450">
                          {(() => {
                            const spec = BATTERY_CELLS[cellType] || { volts: 1.5, mah: 2500 };
                            const c = batteryConfig === "parallel" ? spec.mah * cellCount : spec.mah;
                            return `${c.toLocaleString()} mAh`;
                          })()}
                        </span>
                      </div>
                      <div className="p-3 bg-[#111] rounded-xl border border-[#222]">
                        <Activity className="h-5 w-5 text-emerald-450" />
                      </div>
                    </div>
                  </div>

                  {/* Two Column Control Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Controls Column */}
                    <div className="lg:col-span-7 bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl p-6 space-y-6">
                      <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider border-b border-[#181818] pb-3">
                        Configuration Controls
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Battery Chem Selector */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Cell Battery Type</label>
                          <select
                            value={cellType}
                            onChange={(e) => setCellType(e.target.value)}
                            className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2.5 px-3 outline-none font-semibold cursor-pointer focus:border-amber-500 font-sans"
                          >
                            {Object.entries(BATTERY_CELLS).map(([key, item]) => (
                              <option key={key} value={key}>
                                {item.label} ({item.volts}V, {item.mah}mAh)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Cell Count Selector */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Cell Count: {cellCount}</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 6, 8].map((num) => (
                              <button
                                key={num}
                                onClick={() => setCellCount(num)}
                                className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold font-mono border transition ${
                                  cellCount === num
                                    ? "bg-amber-400 text-black border-amber-400 font-extrabold shadow"
                                    : "bg-[#111] text-neutral-400 border-[#222] hover:border-neutral-700"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Series vs Parallel Wire Layout */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Wiring Arrangement</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setBatteryConfig("series")}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border flex flex-col justify-center items-center gap-0.5 transition ${
                                batteryConfig === "series"
                                  ? "bg-[#1e1509] text-amber-400 border-amber-900/60 font-bold"
                                  : "bg-[#111] text-neutral-500 border-[#222] hover:text-neutral-300"
                              }`}
                            >
                              <span className="font-bold text-[11px]">Series Pack</span>
                              <span className="text-[8px] text-neutral-500">Adds Volts (V)</span>
                            </button>
                            <button
                              onClick={() => setBatteryConfig("parallel")}
                              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border flex flex-col justify-center items-center gap-0.5 transition ${
                                batteryConfig === "parallel"
                                  ? "bg-[#091a10] text-[#10b981] border-emerald-950 font-bold"
                                  : "bg-[#111] text-neutral-500 border-[#222] hover:text-neutral-300"
                              }`}
                            >
                              <span className="font-bold text-[11px]">Parallel Pack</span>
                              <span className="text-[8px] text-neutral-500">Adds Capacity (Ah)</span>
                            </button>
                          </div>
                        </div>

                        {/* Load profile */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Board Current Load (mA)</label>
                          <select
                            value={loadProfile}
                            onChange={(e) => setLoadProfile(e.target.value)}
                            className="w-full text-xs bg-[#111] border border-[#222] text-white rounded-lg py-2.5 px-3 outline-none font-semibold cursor-pointer focus:border-indigo-500 font-sans"
                          >
                            {Object.entries(LOAD_PROFILES).map(([key, item]) => (
                              <option key={key} value={key}>
                                {item.label} ({item.mA}mA)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Custom mA range slider if "custom" load selected */}
                      {loadProfile === "custom" && (
                        <div className="bg-[#050505] p-4 rounded-xl border border-[#141414] space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase text-neutral-400">
                            <span>Adjust Custom Load Intensity</span>
                            <span className="font-mono text-indigo-400">{customLoadmA} mA</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="2000"
                            step="10"
                            value={customLoadmA}
                            onChange={(e) => setCustomLoadmA(parseInt(e.target.value))}
                            className="w-full select-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                      )}

                      {/* Display battery voltage warnings and direct pin recommendations */}
                      {(() => {
                        const spec = BATTERY_CELLS[cellType] || { volts: 1.5 };
                        const totalVoltage = batteryConfig === "series" ? spec.volts * cellCount : spec.volts;

                        let verdictTitle = "";
                        let verdictColor = "";
                        let verdictText = "";
                        let socketActions: string[] = [];

                        if (totalVoltage < 3.0) {
                          verdictTitle = "VOLTAGE TOO LOW FOR STANDALONE RUNTIME";
                          verdictColor = "border-red-900/40 bg-red-950/20 text-red-400";
                          verdictText = "Connecting this setup directly into microcontrollers is highly unstable. Most boards will experience boot loops or complete linear regulator dropout.";
                          socketActions = [
                            "Increase cell count in series configuration to reach safely regulated levels.",
                            "Avoid running 3.3V microcontrollers directly under peak sensor loads with low cell voltages."
                          ];
                        } else if (totalVoltage >= 3.0 && totalVoltage <= 5.5) {
                          verdictTitle = "SAFE DIRECT 5V / 3.3V POWER INPUT REFERENCE";
                          verdictColor = "border-emerald-950 bg-emerald-950/20 text-emerald-400";
                          verdictText = `Output of ${totalVoltage.toFixed(1)}V matches standard microcontroller digital potentials perfectly. Connect with care.`;
                          socketActions = [
                            "Wire to standard 5V or 3.3V pins directly to bypass linear regulator voltage drops.",
                            "WARNING: Do NOT plug this voltage into standard Jack barrel or VIN inputs (as VIN requires at least 6.5V to drop down safely to 5V)."
                          ];
                        } else if (totalVoltage > 5.5 && totalVoltage < 6.5) {
                          verdictTitle = "REGULATOR DROP-OUT SECTOR ('NO-MAN'S LAND')";
                          verdictColor = "border-amber-900/40 bg-amber-950/20 text-text-amber-500";
                          verdictText = `Output voltage of ${totalVoltage.toFixed(1)}V is slightly too high for direct 5V reference rails (destructive), but too low for VIN regulators to function properly.`;
                          socketActions = [
                            "Avoid feeding this to VIN. The linear regulator will drop out and trigger intermittent reboot loops.",
                            "Either add another cell in series to hit 7V+ (safe for VIN pins), or integrate a Buck Step-down module for constant 5.0V output."
                          ];
                        } else if (totalVoltage >= 6.5 && totalVoltage <= 12.0) {
                          verdictTitle = "PERFECT VIN PIN WIRING VOLTAGE POTENTIAL";
                          verdictColor = "border-[#2e2a52] bg-indigo-950/25 text-indigo-400";
                          verdictText = `Excellent supply range. The internal regulator on Board can safely operate without heating up or wasting too much energy.`;
                          socketActions = [
                            "Directly connect your positive wire link to the VIN (Voltage In) pin on board.",
                            "Connect the negative battery wire directly to universal GND.",
                            "On-board reference will regulate this down to clean 5V reference rails automatically."
                          ];
                        } else {
                          // > 12.0V
                          verdictTitle = "HIGH HEAT PIN BURNOUT RISK";
                          verdictColor = "border-red-900/40 bg-red-950/20 text-red-400";
                          verdictText = `Your calculated ${totalVoltage.toFixed(1)}V exceeds standard board VIN input guidelines.`;
                          socketActions = [
                            "Do NOT connect directly into VIN. High input potential causes the linear regulator to overheat rapidly, risking direct board failure.",
                            "Use a Buck-Boost Step Down Regulator or decrease the cell count to lower the thermal dissipation indices."
                          ];
                        }

                        return (
                          <div className={`p-5 rounded-xl border ${verdictColor} space-y-3`}>
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                              <span className="text-xs font-bold uppercase tracking-widest">{verdictTitle}</span>
                            </div>
                            <p className="text-[11px] text-neutral-350 leading-relaxed font-sans">{verdictText}</p>
                            
                            <div className="text-[10px] text-neutral-400 font-mono space-y-1.5 pl-3 border-l-2 border-neutral-800">
                              <div className="text-[9px] uppercase text-[#888] tracking-wider mb-1 font-sans">Student Power Action Plan:</div>
                              {socketActions.map((action, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                  <span>•</span>
                                  <span>{action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                    </div>

                    {/* Schematic visualization column */}
                    <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-6">
                      
                      {/* Dynamic Wire Map Card */}
                      <div className="bg-[#0c0c0c] border border-[#1e1e1e] rounded-2xl p-6 flex flex-col justify-between space-y-4">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">Dynamic Assembly Diagram ({cellCount}x cells)</span>
                        
                        {/* Battery Pack representation */}
                        <div className="flex flex-col items-center justify-center py-6 bg-[#050505] rounded-xl border border-[#141414] relative overflow-hidden">
                          {/* Grid container to wrap batteries */}
                          <div className="flex flex-wrap gap-3 max-w-[240px] justify-center relative">
                            {Array.from({ length: cellCount }).map((_, idx) => {
                              const spec = BATTERY_CELLS[cellType] || { volts: 1.5, mah: 2500, color: "bg-amber-600 text-black border-amber-700" };
                              return (
                                <div
                                  key={idx}
                                  className="relative w-10 h-20 rounded-md bg-[#0c0c0c] border border-neutral-800 flex flex-col justify-between items-center pb-2 pt-3 shadow-lg"
                                >
                                  {/* Positive pip at top */}
                                  <div className="absolute -top-1 w-4.5 h-1.5 bg-neutral-400 rounded-t-sm"></div>
                                  <span className="text-[9px] font-mono leading-none text-neutral-500 font-bold">+</span >
                                  
                                  {/* Visual casing stripe */}
                                  <div className={`w-full h-7 ${spec.color.split(" ")[0]} text-[8px] text-center text-white/95 font-extrabold flex items-center justify-center font-mono leading-none tracking-tighter uppercase shadow`}>
                                    {spec.volts.toFixed(1)}V
                                  </div>

                                  <span className="text-[9px] font-mono leading-none text-neutral-500 font-bold">-</span >
                                </div>
                              );
                            })}
                          </div>

                          {/* Parallel or Series wiring overlays */}
                          <div className="text-[9px] font-mono font-semibold text-neutral-450 mt-5 flex items-center gap-1.5 bg-[#111] px-3 py-1.5 rounded-lg border border-[#222]">
                            <span 
                              className="w-1.5 h-1.5 rounded-full animate-ping shrink-0 animate-pulse" 
                              style={{ backgroundColor: batteryConfig === "series" ? "#f59e0b" : "#10b981" }}
                            ></span>
                            {batteryConfig === "series" ? "Series Link (Voltage added, capacity flat)" : "Parallel Link (Voltage flat, capacity added)"}
                          </div>
                        </div>
                      </div>

                      {/* Calculated Runtime Card */}
                      <div className="bg-[#0b0c0a] border border-[#202517] p-6 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500 block">Calculated Runtime</span>
                          <span className="text-xl font-bold text-emerald-400 font-mono block">
                            {(() => {
                              const spec = BATTERY_CELLS[cellType] || { volts: 1.5, mah: 2500 };
                              const totCap = batteryConfig === "parallel" ? spec.mah * cellCount : spec.mah;
                              const loadmA = loadProfile === "custom" ? customLoadmA : (LOAD_PROFILES[loadProfile]?.mA || 50);
                              
                              // Battery drop/efficiency factor
                              const eff = 0.82; 
                              const totalHours = (totCap / loadmA) * eff;

                              if (totalHours < 1.0) {
                                return `${(totalHours * 60).toFixed(0)} minutes`;
                              } else if (totalHours > 24) {
                                const d = Math.floor(totalHours / 24);
                                const h = Math.round(totalHours % 24);
                                return `${d} days, ${h} hours continuous`;
                              } else {
                                return `${totalHours.toFixed(1)} hours continuous`;
                              }
                            })()}
                          </span>
                          <span className="text-[10.5px] text-neutral-500 block leading-relaxed">
                            Includes an 18% standard system conversion overhead penalty representing typical linear/switching regulator efficiencies.
                          </span>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Modal View for alert solution detail */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" id="alert-details-modal">
          <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#1a1a1a] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{selectedAlert.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="text-neutral-500 hover:text-white transition text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold block">Symptom</span>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {selectedAlert.desc}
                </p>
              </div>
              
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#bbb] font-bold block">Triage Protocol</span>
                <div className="bg-[#050505] border border-[#1a1a1a] p-3.5 rounded-lg text-xs font-mono text-neutral-300 mt-2 space-y-2 max-h-[220px] overflow-y-auto font-sans">
                  {selectedAlert.solution.split("\n").map((line, idx) => (
                    <div key={idx} className="flex gap-2 leading-relaxed">
                      <span className="text-neutral-600 select-none font-sans font-bold">{idx + 1}.</span>
                      <p>{line.replace(/^\d+\.\s+/, "")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#080808] px-6 py-4 border-t border-[#1a1a1a] flex justify-end gap-2">
              <button 
                onClick={() => {
                  const diagnosticPrompt = `Let's debug the "${selectedAlert.title}" problem step-by-step for my microcontroller board.`;
                  setSelectedAlert(null);
                  setActiveTab("chat");
                  sendMessage(diagnosticPrompt);
                }}
                className="bg-white text-black text-xs font-semibold py-2 px-4 rounded-lg hover:bg-neutral-200 transition"
              >
                Debug with TinkerBot
              </button>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="border border-[#222] text-neutral-400 hover:text-white text-xs py-2 px-3 rounded-lg transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
