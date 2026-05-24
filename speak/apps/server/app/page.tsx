"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Hold the button or press space");
  const [turns, setTurns] = useState<Turn[]>([]);
  const stopRef = useRef<(() => Promise<Blob>) | null>(null);
  const downRef = useRef(false);

  const onPressIn = useCallback(async () => {
    if (busy || recording) return;
    try {
      setStatus("Listening…");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.start();
      stopRef.current = () =>
        new Promise<Blob>((resolve, reject) => {
          recorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop());
            try {
              const raw = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
              resolve(await encodeWav(raw));
            } catch (err) {
              reject(err);
            }
          };
          recorder.stop();
        });
      setRecording(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }, [busy, recording]);

  const onPressOut = useCallback(async () => {
    if (!recording || !stopRef.current) return;
    const stop = stopRef.current;
    stopRef.current = null;
    setRecording(false);
    setBusy(true);
    try {
      setStatus("Transcribing…");
      const audio = await stop();
      const form = new FormData();
      form.append("file", audio, "input.wav");
      const asrRes = await fetch("/api/asr", { method: "POST", body: form });
      if (!asrRes.ok) throw new Error(`asr: ${asrRes.status} ${await asrRes.text()}`);
      const { text: userText } = (await asrRes.json()) as { text: string };
      const trimmed = userText.trim();
      if (!trimmed) {
        setStatus("Didn't catch that");
        return;
      }
      const userTurn: Turn = { role: "user", content: trimmed };
      const history = [...turns, userTurn];
      setTurns(history);

      setStatus("Thinking…");
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!chatRes.ok) throw new Error(`chat: ${chatRes.status} ${await chatRes.text()}`);
      const { text: reply } = (await chatRes.json()) as { text: string };
      const assistantTurn: Turn = { role: "assistant", content: reply.trim() };
      setTurns((prev) => [...prev, assistantTurn]);

      setStatus("Speaking…");
      const ttsRes = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: assistantTurn.content }),
      });
      if (!ttsRes.ok) throw new Error(`tts: ${ttsRes.status} ${await ttsRes.text()}`);
      const blob = await ttsRes.blob();
      const url = URL.createObjectURL(blob);
      const audioEl = new Audio(url);
      audioEl.onended = () => URL.revokeObjectURL(url);
      await audioEl.play();

      setStatus("Ready");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [recording, turns]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || downRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      e.preventDefault();
      downRef.current = true;
      onPressIn();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !downRef.current) return;
      e.preventDefault();
      downRef.current = false;
      onPressOut();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onPressIn, onPressOut]);

  const bg = busy ? "#7280a8" : recording ? "#e0245e" : "#5468ff";
  const label = busy ? "…" : recording ? "Listening" : "Hold to speak";

  return (
    <div style={s.root}>
      <header style={s.header}>
        <h1 style={s.title}>speak</h1>
        <p style={s.status}>{status}</p>
      </header>
      <div style={s.transcript}>
        {turns.length === 0 ? (
          <p style={s.placeholder}>Hold the button (or press space) and start talking.</p>
        ) : (
          turns.map((t, i) => (
            <div
              key={i}
              style={{
                ...s.bubble,
                alignSelf: t.role === "user" ? "flex-end" : "flex-start",
                background: t.role === "user" ? "#5468ff" : "#1c2030",
                color: t.role === "user" ? "white" : "#e6e8f0",
              }}
            >
              {t.content}
            </div>
          ))
        )}
      </div>
      <div style={s.buttonWrap}>
        <button
          onMouseDown={!busy ? onPressIn : undefined}
          onMouseUp={!busy ? onPressOut : undefined}
          onMouseLeave={recording ? onPressOut : undefined}
          onTouchStart={!busy ? onPressIn : undefined}
          onTouchEnd={!busy ? onPressOut : undefined}
          style={{ ...s.button, background: bg }}
        >
          <span style={s.dot}>●</span>
          <span style={s.label}>{label}</span>
          <span style={s.hint}>or hold space</span>
        </button>
      </div>
    </div>
  );
}

const TARGET_SAMPLE_RATE = 16000;

async function encodeWav(input: Blob): Promise<Blob> {
  const arrayBuffer = await input.arrayBuffer();
  const AC: typeof AudioContext =
    (window.AudioContext as typeof AudioContext) ||
    ((window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new AC();
  const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
  await ctx.close();
  const mono = downmixToMono(decoded);
  const resampled = await resample(mono, decoded.sampleRate, TARGET_SAMPLE_RATE);
  return wavBlobFromFloat32(resampled, TARGET_SAMPLE_RATE);
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const length = buffer.length;
  const out = new Float32Array(length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) out[i] += data[i];
  }
  for (let i = 0; i < length; i++) out[i] /= buffer.numberOfChannels;
  return out;
}

async function resample(samples: Float32Array, fromRate: number, toRate: number): Promise<Float32Array> {
  if (fromRate === toRate) return samples;
  const length = Math.ceil((samples.length * toRate) / fromRate);
  const offline = new OfflineAudioContext(1, length, toRate);
  const buf = offline.createBuffer(1, samples.length, fromRate);
  buf.getChannelData(0).set(samples);
  const src = offline.createBufferSource();
  src.buffer = buf;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

function wavBlobFromFloat32(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#0e1014", color: "white", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" },
  header: { padding: "16px 24px 8px" },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  status: { margin: "4px 0 0", color: "#9aa0b4", fontSize: 13 },
  transcript: { flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" },
  placeholder: { color: "#5a6080", fontSize: 14, textAlign: "center", marginTop: 40 },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 14, fontSize: 15, lineHeight: 1.4 },
  buttonWrap: { display: "flex", justifyContent: "center", padding: "28px 0" },
  button: { width: 240, height: 240, borderRadius: 120, border: "none", color: "white", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, userSelect: "none", touchAction: "none" },
  dot: { fontSize: 32 },
  label: { fontSize: 18, fontWeight: 600 },
  hint: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 },
};
