# TinkerBot ATL AI

An AI hardware and circuit troubleshooting laboratory assistant for Atal Tinkering Labs (ATL), microcontrollers (Arduino, ESP32, Raspberry Pi, Pico, micro:bit), sensors, and IoT protocols.

**Created by Mohammad Daniyal Ahmad and Ridith Shetty**

---

## Deploying on Render

### Service Type: **Web Service**

When setting up your service on Render, configure these fields in the **Settings**:

- **Name:** `tinkerbot-atl-ai`
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`  *(Important: Render defaults to only `npm install`, which skips compiling the server file! Make sure to set `npm install && npm run build`)*
- **Start Command:** `npm start` *(or `node dist/server.cjs`)*

### Troubleshooting `Cannot find module '.../dist/server.cjs'`
This error happens when Render runs the start command before `dist/server.cjs` has been created:
1. **Root cause:** The **Build Command** in Render was left as `npm install` instead of `npm install && npm run build`.
2. **Fix:** Go to Render Dashboard -> **Settings** -> scroll to **Build & Deploy** -> set **Build Command** to:
   ```bash
   npm install && npm run build
   ```
3. A `prestart` hook is also included in `package.json` that will automatically compile the server bundle if missing.

### Environment Variables
In your Render Dashboard (**Environment** tab), add:

- `GEMINI_API_KEY` = `your_gemini_api_key`
- `NODE_ENV` = `production`
- `PORT` = `3000` *(Render will also automatically assign dynamic port)*

---

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```
