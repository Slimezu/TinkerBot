# TinkerBot ATL AI

An AI hardware and circuit troubleshooting laboratory assistant for Atal Tinkering Labs (ATL), microcontrollers (Arduino, ESP32, Raspberry Pi, Pico, micro:bit), sensors, and IoT protocols.

**Created by Mohammad Daniyal Ahmad and Ridith Shetty**

---

## Deploying on Render

### Service Type: **Web Service**

- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start`

### Environment Variables
In your Render Dashboard (**Settings -> Environment Variables**), add:

- `Groq_key` = `your_groq_api_key_here` (or `GROQ_API_KEY`)
- `NODE_ENV` = `production`
- `PORT` = `3000` (Render will also automatically assign `PORT`)

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
