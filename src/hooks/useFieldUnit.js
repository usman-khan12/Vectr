import { useCallback, useEffect, useState } from "react";
import { fieldUnit } from "../services/websocket.js";

let connectionStarted = false;

export function useFieldUnit() {
  const [connected, setConnected] = useState(fieldUnit.connected);
  const [status, setStatus] = useState(null);
  const [lastVoiceNote, setLastVoiceNote] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(() => {
    setConnecting(true);
    fieldUnit
      .connect()
      .catch((error) => {
        console.error("useFieldUnit connect error", error);
      })
      .finally(() => {
        setConnecting(false);
      });
  }, []);

  const disconnect = useCallback(() => {
    fieldUnit.disconnect();
  }, []);

  const dispatch = useCallback((address, lat, lng, notes) => {
    if (!address) {
      return;
    }
    try {
      fieldUnit.dispatchToField(
        address,
        lat,
        lng,
        Array.isArray(notes) ? notes : [],
      );
    } catch (error) {
      console.error("useFieldUnit dispatch error", error);
    }
  }, []);

  const sendNote = useCallback((note) => {
    if (!note) {
      return;
    }
    try {
      fieldUnit.sendNote(note);
    } catch (error) {
      console.error("useFieldUnit sendNote error", error);
    }
  }, []);

  useEffect(() => {
    if (!connectionStarted) {
      connectionStarted = true;
      connect();
    }

    const handleStatus = (payload) => {
      if (!payload) {
        return;
      }
      if (typeof payload.connected === "boolean") {
        setConnected(payload.connected);
      }
      const nextStatus = {
        voice_ready: Boolean(payload.voice_ready),
        display_ready: Boolean(payload.display_ready),
      };
      setStatus(nextStatus);
    };

    const handleVoiceNote = (payload) => {
      if (!payload || !payload.content) {
        return;
      }
      const timestamp = payload.timestamp || new Date().toISOString();
      setLastVoiceNote({
        content: payload.content,
        timestamp,
      });
    };

    const handleConnected = () => {
      setConnected(true);
      setConnecting(false);
    };

    const handleDisconnected = () => {
      setConnected(false);
      setConnecting(true);
    };

    fieldUnit.on("status", handleStatus);
    fieldUnit.on("voice_note", handleVoiceNote);
    fieldUnit.on("__connected", handleConnected);
    fieldUnit.on("__disconnected", handleDisconnected);

    return () => {
      fieldUnit.off("status", handleStatus);
      fieldUnit.off("voice_note", handleVoiceNote);
      fieldUnit.off("__connected", handleConnected);
      fieldUnit.off("__disconnected", handleDisconnected);
    };
  }, [connect]);

  return {
    connected,
    status,
    connecting,
    connect,
    disconnect,
    dispatch,
    sendNote,
    lastVoiceNote,
  };
}
