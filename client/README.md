# Intervyou.AI - Real-time Voice Interviewer Client Dashboard

Welcome to the client interface for **Intervyou.AI**, a high-fidelity, real-time voice and video technical interviewer dashboard powered by [Pipecat](https://docs.pipecat.ai/) and WebRTC.

This client replaces basic, unstyled layouts with a stunning, glassmorphic 3-column workspace equipped with interactive configurations, streaming previews, and diagnostics.

---

## 🎨 Dashboard Workspace Layout

The application organizes your interview workspace into a beautifully structured, 3-column responsive grid:

1. **Left Column: Setup & Profile Configuration**
   * **Streaming Protocol**: Switch between *Daily Transport* and *SmallWebRTC* instantly.
   * **Interviewer Persona**: Pick from three distinct AI personalities:
     * 😊 **Warm & Supportive (Friendly)**: Conversational and encouraging.
     * 💼 **Professional & Fair (Decent)**: Neutral, formal, and engaging.
     * 🔥 **Direct & Challenging (Strict)**: Rigorous technical vetting and critical reviews.
   * **Job Description Config**: Write or paste target job descriptions. Tracks character bounds in real-time.
   * **Quick Fill Badges**: One-click loaders to instantly populate realistic, verified sample JDs (React Developer, Python Backend, AI Full Stack).

2. **Center Column: Live Stream Avatar**
   * **Active Video Frame**: Large, glowing view displaying the bot's live video avatar (rendered from sprite sequences).
   * **Visual Glow Indicators**:
     * **Grey border**: Disconnected state.
     * **Amber border**: Connecting/saving config state.
     * **Emerald border**: Live session active.
   * **Pulsing Speech Waves**: Active waveforms showing sound transmission dynamically.
   * **Action Bar**: Modern toggle triggers to activate/mute your microphone and start/stop the interview session.

3. **Right Column: Live Transcript Dialogue**
   * Interactive, scrollable chat logs separating Bot and Candidate responses into sleek bubble-wrap boxes with custom avatar highlights.

4. **Footer Panel: Developer Diagnostics Console**
   * A collapsible monospace console showing timestamps, raw RTVI triggers, transport state changes, and latency parameters.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js** v18+ installed on your system.
* The Pipecat bot server running locally (see [Server Setup Guide](../server/README.md)).

### 1. Install Dependencies
Navigate to the `client` directory and install the necessary Node packages:
```bash
cd client
npm install
```

### 2. Configure Environment Variables
By default, the client communicates with the bot server and configuration backend locally. Ensure your `client/.env` contains:
```ini
VITE_BOT_START_URL="http://localhost:7860/start"
VITE_CONFIG_SERVER_URL="http://localhost:7861"
```

### 3. Launch the Client
Start the Vite development hot-reload server:
```bash
npm run dev
```

The application will launch. Open [http://localhost:5173](http://localhost:5173) in a modern web browser to enter the live dashboard!

---

## ⚙️ Layout Integrity & Resolution Protection

This client utilizes advanced flexbox constraints (`min-height: 0` rules and `max-height/max-width: 100%` bounds). This layout architecture guarantees that loading high-resolution bot avatar video tracks (such as the 1024x576 aspect ratio sequence) scales down cleanly within the viewport. Your media controls, microphone status buttons, and active waveforms are protected and will never be pushed off-screen or hidden.

---

## 🛠️ Troubleshooting

### "Please enter a Job Description (JD) to build a structured interview"
* To evaluate you correctly, the AI requires a target role context. Ensure you enter a description that is at least **50 characters long**.
* *Tip*: Simply click any of the **Quick Fill** buttons (e.g. `React Dev`) to load a valid sample role instantly.

### "Failed to save configuration: VITE_CONFIG_SERVER_URL error"
* The client attempts to push your custom JD and Bot Nature settings to the python configuration microservice running at port `7861` before initializing WebRTC. 
* If the config server is offline or unreachable, the client will write a warning to the Event Log console and proceed using the server's default configuration seamlessly.
