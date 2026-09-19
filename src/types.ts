export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
}

export interface ConnectionStep {
  fromPin: string;
  toPin: string;
  description: string;
}

export interface WizardResult {
  title: string;
  connections: ConnectionStep[];
  explanation: string;
  code: string;
  checklist: string[];
}

export interface Microcontroller {
  id: string;
  name: string;
  type: "arduino" | "esp32" | "raspberry" | "pico" | "microbit" | "custom";
  description: string;
  pins: string[];
}

export interface SensorModule {
  id: string;
  name: string;
  category: "environment" | "distance" | "motion" | "display" | "actuator" | "other";
  description: string;
  pins: string[];
}
