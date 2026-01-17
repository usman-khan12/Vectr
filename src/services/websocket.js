const DEFAULT_RECONNECT_DELAY_MS = 3000;

export class FieldUnitConnection {
  constructor(url) {
    this.url =
      url || import.meta.env.VITE_FIELD_UNIT_WS_URL || "ws://localhost:8765";
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.shouldReconnect = true;
    this.reconnectDelay = DEFAULT_RECONNECT_DELAY_MS;
    this.connectingPromise = null;
  }

  on(eventType, callback) {
    if (!eventType || typeof callback !== "function") {
      return;
    }
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
  }

  off(eventType, callback) {
    const set = this.listeners.get(eventType);
    if (!set) {
      return;
    }
    set.delete(callback);
    if (set.size === 0) {
      this.listeners.delete(eventType);
    }
  }

  emit(eventType, payload) {
    const set = this.listeners.get(eventType);
    if (!set) {
      return;
    }
    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error("FieldUnitConnection listener error", eventType, error);
      }
    });
  }

  connect() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return this.connectingPromise || Promise.resolve();
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.shouldReconnect = true;
    const url =
      this.url ||
      import.meta.env.VITE_FIELD_UNIT_WS_URL ||
      "ws://localhost:8765";

    this.connectingPromise = new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(url);
        this.socket = socket;

        socket.addEventListener("open", () => {
          this.connected = true;
          this.emit("__connected", { connected: true });
          console.info("FieldUnitConnection connected", url);
          this.connectingPromise = null;
          resolve();
        });

        socket.addEventListener("message", (event) => {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (error) {
            console.error(
              "FieldUnitConnection failed to parse message",
              event.data,
              error,
            );
            return;
          }
          if (!data || typeof data.type !== "string") {
            console.warn(
              "FieldUnitConnection received message without type",
              data,
            );
            return;
          }
          this.emit(data.type, data);
        });

        socket.addEventListener("error", (event) => {
          console.error("FieldUnitConnection socket error", event);
        });

        socket.addEventListener("close", () => {
          this.connected = false;
          this.emit("__disconnected", { connected: false });
          this.socket = null;
          this.connectingPromise = null;
          if (this.shouldReconnect) {
            console.warn("FieldUnitConnection closed, scheduling reconnect");
            setTimeout(() => {
              this.connect().catch((error) => {
                console.error("FieldUnitConnection reconnect failed", error);
              });
            }, this.reconnectDelay);
          }
        });
      } catch (error) {
        console.error("FieldUnitConnection connect error", error);
        this.connectingPromise = null;
        reject(error);
      }
    });

    return this.connectingPromise;
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error("FieldUnitConnection disconnect error", error);
      }
      this.socket = null;
    }
    this.connected = false;
  }

  send(message) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error("FieldUnitConnection cannot send, socket not open");
      throw new Error("Field unit not connected");
    }
    try {
      const payload = JSON.stringify(message);
      this.socket.send(payload);
    } catch (error) {
      console.error("FieldUnitConnection send error", error);
      throw error;
    }
  }

  dispatchToField(address, lat, lng, notes) {
    const payload = {
      type: "dispatch",
      address,
      lat,
      lng,
      notes: Array.isArray(notes) ? notes : [],
      timestamp: new Date().toISOString(),
    };
    this.send(payload);
  }

  sendNote(note) {
    const payload = {
      type: "note_added",
      note,
      timestamp: new Date().toISOString(),
    };
    this.send(payload);
  }
}

export const fieldUnit = new FieldUnitConnection();
