import { PipecatClient, RTVIEvent } from '@pipecat-ai/client-js';
import {
  AVAILABLE_TRANSPORTS,
  DEFAULT_TRANSPORT,
  TRANSPORT_CONFIG,
  createTransport,
} from './config';

class VoiceChatClient {
  constructor() {
    this.client = null;
    this.transportType = DEFAULT_TRANSPORT;
    this.isConnected = false;

    // Define premium job templates
    this.templates = {
      react: 'We are seeking a Senior Frontend Engineer proficient in React, Next.js, and modern CSS. You will design, build, and optimize high-performance web applications, ensuring excellent user experience and responsive visual interfaces.',
      python: 'Looking for a Senior Python Developer to architect scalable backend systems, design robust APIs, and integrate real-time AI agents. Expertise in FastAPI, PostgreSQL, asyncio, and Docker is highly desirable.',
      fullstack: 'Join us as a Full Stack AI Engineer. You will work on building real-time voice and video applications with Pipecat, WebRTC, and LLMs. Experience with node.js, python, and cloud infrastructure is a must.'
    };

    this.setupDOM();
    this.setupEventListeners();
    this.addEvent('initialized', 'Client dashboard initialized');
  }

  setupDOM() {
    this.transportSelect = document.getElementById('transport-select');
    this.connectBtn = document.getElementById('connect-btn');
    this.micBtn = document.getElementById('mic-btn');
    this.micStatus = document.getElementById('mic-status');
    this.conversationLog = document.getElementById('conversation-log');
    this.eventsLog = document.getElementById('events-log');
    this.botVideoContainer = document.getElementById('bot-video-container');

    this.jdTextarea = document.getElementById('jd-textarea');
    this.botNatureSelect = document.getElementById('bot-nature-select');
    this.charCounter = document.getElementById('char-counter');
    
    // Status selectors
    this.connectionStatusText = document.getElementById('connection-status-text');
    this.statusIndicatorDot = document.querySelector('.status-indicator-dot');
    this.speechVisualizer = document.getElementById('speech-visualizer');

    // Populate transport selector with available transports
    this.transportSelect.innerHTML = '';
    AVAILABLE_TRANSPORTS.forEach((transport) => {
      const option = document.createElement('option');
      option.value = transport;
      option.textContent =
        transport.charAt(0).toUpperCase() + transport.slice(1);
      if (transport === 'smallwebrtc') {
        option.textContent = 'SmallWebRTC';
      } else if (transport === 'daily') {
        option.textContent = 'Daily Transport';
      }
      this.transportSelect.appendChild(option);
    });

    // Hide transport selector container if only one transport
    if (AVAILABLE_TRANSPORTS.length === 1) {
      this.transportSelect.closest('.form-group').style.display = 'none';
    }

    // Add placeholder message
    this.addConversationMessage(
      'Ready for interview. Provide a Job Description and click Connect to start.',
      'placeholder'
    );
  }

  setupEventListeners() {
    this.transportSelect.addEventListener('change', (e) => {
      this.transportType = e.target.value;
      this.addEvent('transport-changed', this.transportType);
    });

    this.connectBtn.addEventListener('click', () => {
      if (this.isConnected) {
        this.disconnect();
      } else {
        if (this.validateConfig()) {
          this.connect();
        }
      }
    });

    this.micBtn.addEventListener('click', () => {
      if (this.client) {
        const newState = !this.client.isMicEnabled;
        this.client.enableMic(newState);
        this.updateMicButton(newState);
      }
    });

    // Reactive character counter
    this.jdTextarea.addEventListener('input', () => {
      this.updateCharCounter();
    });

    // Job template buttons handler
    document.querySelectorAll('.btn-template').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const role = e.target.getAttribute('data-role');
        if (this.templates[role]) {
          this.jdTextarea.value = this.templates[role];
          this.updateCharCounter();
          
          // Visual highlight active template
          document.querySelectorAll('.btn-template').forEach((b) => b.classList.remove('active'));
          e.target.classList.add('active');
          
          this.addEvent('template-selected', `Loaded JD template for "${e.target.textContent}"`);
        }
      });
    });
  }

  updateCharCounter() {
    const len = this.jdTextarea.value.length;
    this.charCounter.textContent = `${len} / 1500`;
    if (len >= 1500) {
      this.charCounter.style.color = 'hsl(var(--accent-rose))';
    } else if (len >= 50) {
      this.charCounter.style.color = 'hsl(var(--accent-emerald))';
    } else {
      this.charCounter.style.color = 'hsl(var(--text-muted))';
    }
  }

  updateVisualState(state) {
    // Reset all status classes
    this.statusIndicatorDot.className = 'status-indicator-dot';
    this.botVideoContainer.className = 'glowing-container';

    switch (state) {
      case 'disconnected':
        this.statusIndicatorDot.classList.add('disconnected');
        this.botVideoContainer.classList.add('state-disconnected');
        this.connectionStatusText.textContent = 'Disconnected';
        this.speechVisualizer.classList.add('hidden');
        break;
      case 'connecting':
        this.statusIndicatorDot.classList.add('connecting');
        this.botVideoContainer.classList.add('state-connecting');
        this.connectionStatusText.textContent = 'Connecting...';
        this.speechVisualizer.classList.add('hidden');
        break;
      case 'connected':
        this.statusIndicatorDot.classList.add('connected');
        this.botVideoContainer.classList.add('state-connected');
        this.connectionStatusText.textContent = 'Connected (Live)';
        this.speechVisualizer.classList.remove('hidden');
        break;
    }
  }

  async connect() {
    try {
      const config = this.getConfig();
      this.updateVisualState('connecting');
      
      this.addEvent('connecting', `Using ${this.transportType} transport`);
      this.addEvent('config', `Bot Nature: ${config.botNature}, JD Length: ${config.jd.length} chars`);

      const configServerUrl = import.meta.env.VITE_CONFIG_SERVER_URL || 'http://localhost:7861';
      try {
        this.addEvent('saving-config', 'Saving interview configuration...');
        const response = await fetch(`${configServerUrl}/api/interview-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            botNature: config.botNature,
            jd: config.jd,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Failed to save config: ${response.statusText}`);
        }

        const result = await response.json();
        this.addEvent('config-saved', `Configuration saved on server: ${result.message}`);
      } catch (error) {
        this.addEvent('config-error', `Failed to save config: ${error.message}`);
        console.warn('Config save failed, continuing with defaults:', error);
      }

      // Create transport using config
      const transport = await createTransport(this.transportType);

      // Create client
      this.client = new PipecatClient({
        transport,
        enableMic: true,
        enableCam: false,
        callbacks: {
          onConnected: () => {
            this.onConnected();
          },
          onDisconnected: () => {
            this.onDisconnected();
          },
          onTransportStateChanged: (state) => {
            this.addEvent('transport-state', state);
          },
          onBotReady: () => {
            this.addEvent('bot-ready', 'Bot is ready to start the interview');
          },
          onUserTranscript: (data) => {
            if (data.final) {
              this.addConversationMessage(data.text, 'user');
            }
          },
          onBotTranscript: (data) => {
            this.addConversationMessage(data.text, 'bot');
          },
          onError: (error) => {
            this.addEvent('error', error.message);
            this.updateVisualState('disconnected');
          },
        },
      });

      // Setup audio
      this.setupAudio();

      // Connect using config
      const connectParams = TRANSPORT_CONFIG[this.transportType];
      await this.client.connect(connectParams);
    } catch (error) {
      this.addEvent('error', error.message);
      this.updateVisualState('disconnected');
      console.error('Connection error:', error);
    }
  }

  async disconnect() {
    if (this.client) {
      this.addEvent('disconnecting', 'Shutting down connection...');
      await this.client.disconnect();
    }
  }

  setupAudio() {
    this.client.on(RTVIEvent.TrackStarted, (track, participant) => {
      if (!participant?.local) {
        if (track.kind === 'audio') {
          this.addEvent('track-started', 'Bot audio track active');
          const audio = document.createElement('audio');
          audio.autoplay = true;
          audio.srcObject = new MediaStream([track]);
          document.body.appendChild(audio);
        } else if (track.kind === 'video') {
          this.addEvent('track-started', 'Bot video avatar stream active');
          this.setupVideoTrack(track);
        }
      }
    });

    this.client.on(RTVIEvent.TrackStopped, (track, participant) => {
      if (!participant?.local && track.kind === 'video') {
        this.addEvent('track-stopped', 'Bot video avatar stream stopped');
        this.clearVideoTrack();
      }
    });
  }

  setupVideoTrack(track) {
    // Check if we're already displaying this track
    const existingVideo = this.botVideoContainer.querySelector('video');
    if (existingVideo?.srcObject) {
      const oldTrack = existingVideo.srcObject.getVideoTracks()[0];
      if (oldTrack?.id === track.id) return;
    }

    // Clear placeholder and any existing video
    this.botVideoContainer.innerHTML = '';

    // Create video element
    const videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = true;

    // Create a new MediaStream with the track and set it as the video source
    videoEl.srcObject = new MediaStream([track]);
    this.botVideoContainer.appendChild(videoEl);
  }

  clearVideoTrack() {
    const video = this.botVideoContainer.querySelector('video');
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    this.botVideoContainer.innerHTML = `
      <div class="video-placeholder">
        <div class="placeholder-avatar-ring">
          <div class="placeholder-avatar-core">🤖</div>
        </div>
        <h3>AI Bot Offline</h3>
        <p>Setup the job details and click Connect to start the session</p>
      </div>
    `;
  }

  onConnected() {
    this.isConnected = true;
    this.connectBtn.textContent = 'Disconnect';
    this.connectBtn.classList.add('disconnect');
    
    // Toggles connect button icon in index.html
    const btnIcon = this.connectBtn.querySelector('.btn-icon');
    if (btnIcon) btnIcon.textContent = '🛑';

    this.micBtn.disabled = false;
    this.transportSelect.disabled = true;
    this.botNatureSelect.disabled = true;
    this.jdTextarea.disabled = true;
    
    // Disable template buttons
    document.querySelectorAll('.btn-template').forEach((btn) => btn.disabled = true);

    this.updateMicButton(this.client.isMicEnabled);
    this.updateVisualState('connected');
    this.addEvent('connected', 'Successfully connected to interview pipeline');

    // Clear placeholder
    if (this.conversationLog.querySelector('.placeholder')) {
      this.conversationLog.innerHTML = '';
    }
  }

  onDisconnected() {
    this.isConnected = false;
    this.connectBtn.textContent = 'Connect';
    this.connectBtn.classList.remove('disconnect');

    // Restore connect button icon in index.html
    const btnIcon = this.connectBtn.querySelector('.btn-icon');
    if (btnIcon) btnIcon.textContent = '⚡';

    this.micBtn.disabled = true;
    this.transportSelect.disabled = false;
    this.botNatureSelect.disabled = false;
    this.jdTextarea.disabled = false;
    
    // Re-enable template buttons
    document.querySelectorAll('.btn-template').forEach((btn) => btn.disabled = false);

    this.updateMicButton(false);
    this.clearVideoTrack();
    this.updateVisualState('disconnected');
    this.addEvent('disconnected', 'Session ended');
  }

  updateMicButton(enabled) {
    this.micStatus.textContent = enabled ? 'Mic is On' : 'Mic is Off';
    if (enabled) {
      this.micBtn.className = 'btn-control mic-active';
    } else {
      this.micBtn.className = 'btn-control mic-disabled';
    }
  }

  addConversationMessage(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `conversation-message ${role}`;

    if (role === 'placeholder') {
      messageDiv.textContent = text;
    } else {
      const roleSpan = document.createElement('div');
      roleSpan.className = 'role';
      roleSpan.textContent = role === 'user' ? 'You' : 'Bot';

      const textDiv = document.createElement('div');
      textDiv.className = 'bubble';
      textDiv.textContent = text;

      messageDiv.appendChild(roleSpan);
      messageDiv.appendChild(textDiv);
    }

    this.conversationLog.appendChild(messageDiv);
    this.conversationLog.scrollTop = this.conversationLog.scrollHeight;
  }

  addEvent(eventName, data) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-entry';

    const timestamp = new Date().toLocaleTimeString();
    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'timestamp';
    timestampSpan.textContent = timestamp;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'event-name';
    nameSpan.textContent = eventName;

    const dataSpan = document.createElement('span');
    dataSpan.className = 'event-data';
    dataSpan.textContent =
      typeof data === 'string' ? data : JSON.stringify(data);

    eventDiv.appendChild(timestampSpan);
    eventDiv.appendChild(nameSpan);
    eventDiv.appendChild(dataSpan);

    this.eventsLog.appendChild(eventDiv);
    this.eventsLog.scrollTop = this.eventsLog.scrollHeight;
  }

  validateConfig() {
    const jd = this.jdTextarea.value.trim();
    if (!jd) {
      alert('Please enter a Job Description (JD) or select a Quick Fill template before starting the interview.');
      this.jdTextarea.focus();
      return false;
    }
    if (jd.length < 50) {
      alert(`Job Description must be at least 50 characters long to build a structured interview. Currently: ${jd.length} characters.`);
      this.jdTextarea.focus();
      return false;
    }
    return true;
  }

  getConfig() {
    return {
      botNature: this.botNatureSelect.value,
      jd: this.jdTextarea.value.trim(),
    };
  }
}

// Initialize when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new VoiceChatClient();
});
