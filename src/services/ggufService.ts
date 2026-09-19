import { Wllama } from "@wllama/wllama/esm/index.js";

export interface GGUFModelOption {
  id: string;
  name: string;
  repo: string;
  file: string;
  size: string;
  description: string;
  quant: string;
}

export const PRESET_GGUF_MODELS: GGUFModelOption[] = [
  {
    id: "slimezu-slack",
    name: "Slack GGUF (slimezu/Slack)",
    repo: "slimezu/Slack",
    file: "Slack.gguf",
    quant: "imatrix",
    size: "1.46 GB",
    description: "Specialized edge reasoning & code troubleshooting model (slimezu/Slack) executing in browser WebAssembly memory."
  }
];

export type ModelLoadStatus = "idle" | "downloading" | "loading" | "ready" | "error";

export interface ServerGgufStatus {
  exists: boolean;
  isComplete: boolean;
  status: "not_started" | "downloading" | "ready" | "error";
  percent: number;
  speed: string;
  etaSeconds: number;
  size: number;
  targetSize: number;
}

class LocalGGUFEngine {
  private wllama: Wllama | null = null;
  private initPromise: Promise<boolean> | null = null;
  private currentModelId: string | null = null;
  public status: ModelLoadStatus = "idle";
  public downloadProgress: number = 0;
  public statusMessage: string = "";

  public isReady(): boolean {
    return this.status === "ready" && this.wllama !== null && this.wllama.isModelLoaded();
  }

  public async checkServerStatus(): Promise<ServerGgufStatus | null> {
    try {
      const res = await fetch("/api/gguf-status");
      if (res.ok) {
        return await res.json();
      }
    } catch (_) {}
    return null;
  }

  public async triggerServerDownload(): Promise<void> {
    try {
      await fetch("/api/start-gguf-download", { method: "POST" });
    } catch (_) {}
  }

  private async getOrCreateWllama(): Promise<Wllama> {
    if (this.wllama) {
      return this.wllama;
    }
    this.wllama = new Wllama({
      default: "/wllama.wasm",
      "single-thread/wllama.wasm": "/wllama.wasm",
      "multi-thread/wllama.wasm": "/wllama.wasm",
    });
    return this.wllama;
  }

  public async initEngine(
    model: GGUFModelOption = PRESET_GGUF_MODELS[0],
    onProgress?: (progress: number, message: string) => void
  ): Promise<boolean> {
    // If an initialization is already ongoing, reuse the promise to prevent duplicate init race conditions
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (this.isReady()) {
          onProgress?.(100, "Slack GGUF is already loaded in WebAssembly RAM.");
          return true;
        }

        this.status = "loading";
        this.statusMessage = "Initializing WebAssembly runtime...";
        onProgress?.(10, this.statusMessage);

        const instance = await this.getOrCreateWllama();

        // If instance already has a model loaded, verify
        if (instance.isModelLoaded()) {
          this.status = "ready";
          this.currentModelId = model.id;
          this.statusMessage = "Active: Slack GGUF (Local WebAssembly Engine)";
          onProgress?.(100, this.statusMessage);
          return true;
        }

        const progressCallback = ({ loaded, total }: { loaded: number; total: number }) => {
          const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
          this.downloadProgress = pct;
          this.statusMessage = `Reading ./Slack.gguf from disk into WebAssembly RAM (${pct}% - ${(loaded / (1024 * 1024)).toFixed(1)}MB / ${(total / (1024 * 1024)).toFixed(1)}MB)...`;
          onProgress?.(pct, this.statusMessage);
        };

        this.statusMessage = "Loading local ./Slack.gguf weights into WebAssembly memory...";
        onProgress?.(15, this.statusMessage);

        // Load strictly from local endpoint /Slack.gguf (served directly from disk)
        await instance.loadModelFromUrl("/Slack.gguf", {
          progressCallback,
          n_ctx: 1024,
          n_threads: 2,
          n_batch: 256,
        });

        this.status = "ready";
        this.currentModelId = model.id;
        this.statusMessage = "Active: Slack GGUF (Local WebAssembly Engine)";
        onProgress?.(100, this.statusMessage);
        return true;
      } catch (err: any) {
        console.error("Failed to load local Slack GGUF model:", err);
        this.status = "error";
        const errMsg = err?.message || String(err);
        this.statusMessage = `Local Slack.gguf error: ${errMsg}`;
        onProgress?.(0, this.statusMessage);
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public async generateChatCompletion(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.wllama || !this.wllama.isModelLoaded()) {
      throw new Error("GGUF Model is not loaded into memory yet. Please initialize the model first.");
    }

    try {
      let accumulated = "";

      const response = await this.wllama.createChatCompletion({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        max_tokens: 512,
        temperature: 0.3,
        stream: false
      });

      if (response && response.choices && response.choices[0]?.message?.content) {
        accumulated = response.choices[0].message.content;
        onToken?.(accumulated);
        return accumulated;
      }

      return accumulated || "No response generated by local GGUF model.";
    } catch (err: any) {
      console.error("GGUF inference error:", err);
      throw new Error(`Local GGUF Inference Error: ${err.message || err}`);
    }
  }

  public async unload(): Promise<void> {
    if (this.wllama) {
      try {
        await this.wllama.exit();
      } catch (_) {}
      this.wllama = null;
    }
    this.status = "idle";
    this.currentModelId = null;
    this.statusMessage = "";
    this.downloadProgress = 0;
  }
}

export const ggufEngine = new LocalGGUFEngine();
