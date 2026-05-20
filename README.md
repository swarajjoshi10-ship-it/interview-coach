# Intervyou.AI - Real-Time Multimodal Voice AI Agent

<img src="image.png" width="460px" style="border-radius: 0.75rem; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 1.5rem 0;">

This repository demonstrates a complete, low-latency multimodal voice AI agent (Intervyou.AI) designed to conduct technical job interviews. By combining real-time audio/video streaming, instant speech-to-text transcription, and a synchronized animated avatar, the system provides a highly immersive experience that mimics a live face-to-face video interview.

---

## 🎓 Core Technical Architecture & Learning Focus

This project serves as a showcase and learning sandbox for modern, real-time streaming artificial intelligence systems. Below is a detailed breakdown of the fundamental concepts and architectural pillars that power the application.

### 1. Real-Time AI Systems: REST vs. Low-Latency Streaming

Traditional AI integrations rely on standard **REST APIs** (blocking HTTP request-response loops). In contrast, conversational voice agents require continuous, bi-directional media pipelines:

| Feature | Standard REST APIs (e.g., ChatGPT Web) | Real-Time Voice AI (Intervyou.AI) |
| :--- | :--- | :--- |
| **Communication Protocol**| Unidirectional HTTP Post requests | Bi-directional streaming (WebRTC / WebSockets) |
| **Pacing Model** | Block text generation (Wait for full answer) | Chunk-by-chunk streaming audio playback |
| **Latency Profile** | High (3 - 8 seconds until full output) | Sub-second (500ms - 1.5s human-like response) |
| **Interruption Handling** | Impossible (User must wait until completion) | Smart interruption (Bot cuts speaking immediately) |
| **Media Streams** | Text only (rendered as Markdown) | Synchronized Audio + Video + Transcript channels |

---

### 2. The Pipecat Multimodal Framework

Building real-time voice agents requires executing complex pipelines concurrently. This repository implements **Pipecat**, a modern python framework specifically designed for frame-driven, state-managed conversational AI. 

Pipecat organizes operations as a linear sequence of **reusable processors** where data flows as discrete **Frames**:

```mermaid
graph LR
    User([Candidate Microphone]) -->|Audio Frames| In[Transport Input]
    In -->|STT Chunks| STT[Deepgram Speech-to-Text]
    STT -->|Transcript text| Context[User Context Aggregator]
    Context -->|Tokens| LLM[Groq / OpenAI LLM]
    LLM -->|Text stream| TTS[ElevenLabs Text-to-Speech]
    TTS -->|Synthesized Audio| Sprite[Talking Animation Processor]
    Sprite -->|Synchronized Audio + Video| Out[Transport Output]
    Out --> Bot([WebRTC Stream Playback])
```

Every action—such as the user pausing, the LLM starting to stream tokens, the synthesizer outputting raw PCM audio, or the robot beginning to speak—is encapsulated as a Frame (e.g., `BotStartedSpeakingFrame`, `OutputImageRawFrame`), allowing the pipeline to operate asynchronously with maximum efficiency.

---

### 3. WebRTC Fundamentals

To deliver high-fidelity voice and video without latency, the system utilizes **WebRTC** (Web Real-Time Communication), the standard technology that powers enterprise products like Google Meet and Zoom.

* **Signaling & ICE**: Peer connections are established using Daily or SmallWebRTC protocols to negotiate media codecs and bypass NAT/firewalls via ICE candidates.
* **Direct Audio/Video Channels**: Rather than making slow API requests over TCP, audio and video are negotiated directly as raw media tracks.
* **Aspect Ratio & Layout Protection**: To keep the dashboard robust, the client style layer implements standard `min-height: 0` constraints, allowing 1024x576 video aspect ratios to scale fluidly without pushing media controls or mic toggles off-screen.

---

### 4. Latency Optimization Strategies

To achieve sub-second response times resembling natural human dialogue, the bot implements several advanced latency minimization techniques:

1. **Fast-Inference LLMs**: Utilizes **Groq** (running highly-optimized Llama models) to reduce Time-To-First-Token (TTFT) to less than 100ms.
2. **Local Smart Turn Analyzer**: Employs locally compiled **Silero Voice Activity Detection (VAD)** boundaries to dynamically detect when the user has finished a thought, cutting off silence gaps without waiting for cloud round-trips.
3. **Audio Chunk Buffering**: Plays raw audio packets in tiny chunks rather than waiting for full sentences to synthesize, beginning text-to-speech output within milliseconds of the LLM generating words.
4. **Voice Warmup**: Keeps ElevenLabs connections warm and preloaded to prevent startup synthesis delays.

---

### 5. Multimodal Video/Avatar Integration

Intervyou.AI goes beyond simple voice chat by synchronizing visual feedback with audio. 

* **Animated Sprites**: The server loads a 25-frame sequential sequence of robot sprite images.
* **Frame-Driven Animation**: The custom `TalkingAnimation` processor monitors the pipeline for state changes:
  * When a `BotStartedSpeakingFrame` passes through, it triggers an active sequential playback loop of the robot sprites.
  * When a `BotStoppedSpeakingFrame` is captured, it immediately falls back to a neutral, static resting image.
* **WebRTC Video Packets**: These sprites are converted to raw byte arrays on-the-fly and streamed onto the WebRTC video track alongside the ElevenLabs audio stream, ensuring the avatar's lips match the spoken words perfectly in the browser.

---

## 📂 Project Structure

```
simple-chatbot/
├── server/              # Bot Server (Python Core)
│   ├── assets/          # Sprite PNG frames for the talking robot
│   ├── bot.py           # Primary Pipecat pipeline (Groq + ElevenLabs)
│   ├── config_server.py # Microservice handling dynamic JD settings
│   ├── env.example      # Reference backend keys config
│   └── pyproject.toml   # UV project specification
│
└── client/              # Unified Modern Frontend (Vite + Vanilla JS)
    ├── src/
    │   ├── app.js       # Client logic, triggers, and status glows
    │   ├── config.js    # Transport configurations (Daily vs SmallWebRTC)
    │   └── style.css    # Premium glassmorphic design tokens
    ├── index.html       # 3-column dashboard DOM blueprint
    └── README.md        # Client-specific setup details
```

---

## 🚀 Quick Start & Developer Run Guide

To launch the development stack, you only need to execute two commands: one to spin up the entire unified backend, and another to launch the frontend.

### 1. The Unified Backend Orchestration (`bot.py`)
Rather than forcing you to manage multiple terminal sessions for the AI signaling engine and the configuration microservice, the server employs a **unified single-process multi-threaded design**:
* When you run `bot.py`, it automatically spins up `config_server.py` in a dedicated background daemon thread (running on port `7861`).
* Simultaneously, the main thread boots the Pipecat runner (handling WebRTC connection negotiations on port `7860`).

#### Step-by-Step Backend Setup:
Enter the server directory and copy the environment variables:
```bash
cd server
cp env.example .env
```
*Populate the `.env` keys (Deepgram, ElevenLabs, and Groq API keys are required).*

Sync python dependencies using [uv](https://github.com/astral-sh/uv):
```bash
uv sync
```

Launch the entire unified backend (both signaling and config server):
```bash
uv run bot.py
```

---

### 2. The Developer Frontend Client (`npm run dev`)
The frontend client connects to the unified backend to sync job settings and stream audio/video.

#### Step-by-Step Frontend Setup:
Open a second terminal window, navigate to the `client` directory, and install dependencies:
```bash
cd client
npm install
```

Start the Vite development web server:
```bash
npm run dev
```

### 3. Open the Workspace
Once both services are running:
1. Open your browser to [http://localhost:5173](http://localhost:5173).
2. Choose an Interviewer Persona (*Friendly*, *Professional*, or *Strict*).
3. Click any of the **Quick Fill** role buttons (e.g. *React Dev*) to instantly load a valid 50+ character Job Description.
4. Click **Connect** to start your real-time voice interview with the synchronized AI avatar!
