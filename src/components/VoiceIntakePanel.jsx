import { useRef, useState } from "react";
import { createEmsReportFromAudioBase64 } from "../services/ems.js";

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const parts = reader.result.split(",");
        resolve(parts[1] || "");
      } else {
        reject(new Error("Failed to read audio data"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function convertWebMToWav(webmBlob) {
  const audioContext = new AudioContext();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const targetSampleRate = 16000;
  const resampleRatio = targetSampleRate / audioBuffer.sampleRate;
  const newLength = Math.floor(audioBuffer.length * resampleRatio);

  const offlineAudioContext = new OfflineAudioContext(
    1,
    newLength,
    targetSampleRate,
  );

  const source = offlineAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineAudioContext.destination);
  source.start(0);

  const renderedBuffer = await offlineAudioContext.startRendering();

  const numberOfChannels = 1;
  const length = renderedBuffer.length * numberOfChannels * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);

  let offset = 0;

  function writeString(value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
    offset += value.length;
  }

  writeString("RIFF");
  view.setUint32(
    offset,
    36 + renderedBuffer.length * numberOfChannels * 2,
    true,
  );
  offset += 4;
  writeString("WAVE");

  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numberOfChannels, true);
  offset += 2;
  view.setUint32(offset, targetSampleRate, true);
  offset += 4;
  view.setUint32(offset, targetSampleRate * numberOfChannels * 2, true);
  offset += 4;
  view.setUint16(offset, numberOfChannels * 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;

  writeString("data");
  view.setUint32(offset, renderedBuffer.length * numberOfChannels * 2, true);
  offset += 4;

  const channelData = renderedBuffer.getChannelData(0);
  for (let index = 0; index < renderedBuffer.length; index += 1) {
    let sample = channelData[index];
    if (sample < -1) {
      sample = -1;
    } else if (sample > 1) {
      sample = 1;
    }
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

export default function VoiceIntakePanel(props) {
  const { address, disabled, onSaveReport } = props || {};
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [report, setReport] = useState("");

  const canUseMedia =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    !!navigator.mediaDevices.getUserMedia;

  const handleToggleRecording = async () => {
    if (!canUseMedia || disabled || submitting) {
      return;
    }

    if (recording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      setRecording(false);
      return;
    }

    setError(null);
    setTranscription("");
    setReport("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => {
          track.stop();
        });

        const webmBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        try {
          setSubmitting(true);
          const wavBlob = await convertWebMToWav(webmBlob);
          const base64 = await blobToBase64(wavBlob);
          const result = await createEmsReportFromAudioBase64(base64, 0.5);
          setTranscription(result.transcription);
          setReport(result.ai_response);
          if (onSaveReport && result.ai_response) {
            await onSaveReport(result.ai_response);
          }
        } catch (err) {
          setError("Failed to process voice intake");
        } finally {
          setSubmitting(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError("Microphone unavailable or permission denied");
    }
  };

  const disabledReason = !canUseMedia
    ? "Browser does not support microphone recording"
    : disabled
      ? "Select an address before recording"
      : submitting
        ? "Processing..."
        : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-200">
            EMS Voice Intake
          </div>
          <div className="text-xs text-gray-400">
            Press record, describe the call, then stop to generate a report.
          </div>
          {address && (
            <div className="mt-1 text-xs text-gray-500">
              Attached to: {address}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleToggleRecording}
            disabled={!canUseMedia || disabled || submitting}
            className={
              "min-h-[44px] rounded-md px-4 py-2 text-xs font-medium transition-colors duration-150 " +
              (!canUseMedia || disabled || submitting
                ? "cursor-not-allowed bg-gray-700 text-gray-500"
                : recording
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-700")
            }
          >
            {recording
              ? "Stop and Generate Report"
              : submitting
                ? "Processing..."
                : "🎙️ Start Voice Intake"}
          </button>
          {disabledReason && (
            <div className="text-[10px] text-gray-500">{disabledReason}</div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {transcription && (
        <div className="rounded-md border border-gray-700 bg-gray-900/60 px-3 py-2 text-xs text-gray-200">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Wispr transcription
          </div>
          <div className="max-h-20 overflow-y-auto whitespace-pre-wrap">
            {transcription}
          </div>
        </div>
      )}

      {report && (
        <div className="rounded-md border border-blue-700 bg-blue-950/40 px-3 py-3 text-xs text-blue-50">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-blue-300">
            AI EMS scene report
          </div>
          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] leading-snug">
            {report}
          </div>
          <div className="mt-1 text-[10px] text-blue-300">
            Saved to call notes for this address.
          </div>
        </div>
      )}
    </div>
  );
}
