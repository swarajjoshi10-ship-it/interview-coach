# Intervyou.AI

A low-latency, multimodal Voice AI agent engineered for automated technical candidate screening using WebRTC, real-time streaming, and stateful multi-agent orchestration.

## Problem Statement

Initial technical screening in recruitment is highly repetitive, expensive, and slow to scale. Traditional text-based chatbots fail to capture conversational nuance, while standard REST-based AI pipelines suffer from high latency (3-5s), breaking natural human interaction. This project provides a scalable, sub-second latency voice interviewing system capable of natural interruptions, active listening, and dynamic technical evaluations.

## Features

* **Sub-Second Streaming Pipelines**: Asynchronous token streaming and buffered text-to-speech reduce Time-To-First-Token (TTFT) to ~100ms and overall conversational latency to <1s.
* **Turn-Taking & Interruption Handling**: Integrated local Voice Activity Detection (VAD) instantly halts audio synthesis and token generation upon detecting candidate speech.
* **Frame-Driven Architecture**: Utilizes Pipecat to construct discrete, non-blocking media pipelines (Audio → STT → LLM → TTS → WebRTC).
* **Stateful Profile Microservice**: Decoupled configuration server manages dynamic conversation states, interviewer personas, and job descriptions concurrently with the WebRTC engine.
* **Multimodal Synchronization**: Custom animation generators multiplex sequential avatar frames with synthesized audio tracks into unified WebRTC outgoing streams.

## Architecture

The system is decoupled into three primary layers:
1. **Frontend Client**: A Vite-based vanilla JavaScript application managing MediaStream API hardware access, WebRTC peer negotiations, and reactive UI states.
2. **Signaling & Orchestration Engine (`bot.py`)**: A Python asyncio runner managing Pipecat pipelines. It ingests UDP audio chunks, dispatches them through a Deepgram STT, routes context to Groq LLM inference, synthesizes via ElevenLabs TTS, and multiplexes an animated avatar sequence.
3. **Configuration State Layer (`config_server.py`)**: A FastAPI microservice maintaining runtime session data, injected dynamically into the LLM context prompts.

## Workflow

1. **Initialization**: Client boots and fetches the target Job Description and Persona state via the config microservice.
2. **WebRTC Negotiation**: Client and Python backend exchange SDP offers and ICE candidates to establish a direct P2P media tunnel.
3. **Listening State**: Server processes incoming WebRTC audio chunks using Silero VAD to detect active speech boundaries.
4. **Inference & Synthesis**: Upon silence detection, the pipeline resolves the transcript, triggers the LLM, and streams TTS audio packets synchronously back to the client.
5. **Interruption Recovery**: If VAD detects candidate speech during bot output, asynchronous cancelation frames immediately flush audio buffers and reset context queues.

## Tech Stack

* **AI/LLM**: Groq (Llama 3), Pipecat, Deepgram (STT), ElevenLabs (TTS), Silero VAD
* **Backend**: Python 3.11, Asyncio, FastAPI
* **Frontend**: Vanilla JavaScript, Vite, HTML5 WebRTC API, CSS Flexbox
* **Cloud/DevOps**: uv (Python Package Manager), WebRTC (Daily / SmallWebRTC)

## Project Structure

```text
interview-coach/
├── server/
│   ├── bot.py                # Main Pipecat async media pipeline
│   ├── config_server.py      # Stateful session configuration microservice
│   ├── interview_config.json # Base persona prompts and context
│   ├── env.example           # Sanitized environment templates
│   └── assets/               # Sequential animation frames for the avatar
└── client/
    ├── src/
    │   ├── app.js            # WebRTC connection logic and UI reactive states
    │   ├── config.js         # Transport configuration mappings
    │   └── style.css         # Component styling and layout protections
    └── index.html            # Core DOM structure
```

## Installation

**Prerequisites**: [uv](https://docs.astral.sh/uv/) and Node.js v18+.

1. Clone the repository.
2. Setup Backend:
   ```bash
   cd server
   cp env.example .env
   # Populate .env with API keys (Groq, ElevenLabs, Deepgram)
   uv sync
   ```
3. Setup Frontend:
   ```bash
   cd client
   npm install
   ```

## Usage

Start the system across three isolated terminal instances:

1. **Config Service**: `uv run config_server.py` (Inside `/server`)
2. **Media Pipeline**: `uv run bot.py` (Inside `/server`)
3. **Frontend Client**: `npm run dev` (Inside `/client`)

## Challenges Faced

* **Latency Optimization**: Coordinating chunked network calls between Deepgram, Groq, and ElevenLabs required precise asynchronous generators to prevent blocking IO loops.
* **Double-Speech Mitigation**: Ensuring the LLM immediately stops generating tokens when the candidate interrupts required building discrete cancelation frames across the Pipecat transport layer.
* **Layout Overflow Protection**: Enforcing `min-height: 0` constraints on CSS flex containers to ensure dynamically loading WebRTC video tracks didn't push controls off-screen on smaller viewports.

## Future Improvements

* **RAG Integration**: Mount a vector database (e.g., Qdrant) to index resumes and dynamically ground interview questions in real-time.
* **Multi-Agent Evaluation**: Spin up an asynchronous secondary LLM agent to grade candidate answers concurrently without blocking the main conversational flow.
* **WebSocket Fallback**: Implement native WebSocket fallbacks for strict corporate network boundaries that block UDP WebRTC packets.

## License

MIT License
