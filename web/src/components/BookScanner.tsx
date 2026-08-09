import { useEffect, useRef, useState } from "react";
import { ScanText, X } from "lucide-react";
import type { ScanMode } from "../types";

type Props = { mode: ScanMode; onCode: (code: string) => void; onClose: () => void; onError: (message: string) => void };

export function BookScanner({ mode, onCode, onClose, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        if (mode === "barcode") {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, result => {
            if (active && result) onCode(result.getText());
          });
          controlsRef.current = controls;
        } else {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
          if (!active || !videoRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch { onError("Kameran kunde inte öppnas. Kontrollera kamerabehörigheten."); onClose(); }
    }
    start();
    return () => {
      active = false;
      controlsRef.current?.stop();
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [mode, onClose, onCode, onError]);

  async function readText() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    setReading(true); setMessage("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const { recognize } = await import("tesseract.js");
      const result = await recognize(canvas, "eng");
      const text = result.data.text.toUpperCase().replace(/[–—]/g, "-");
      const asin = text.match(/\b(?:B0[A-Z0-9]{8}|[A-Z0-9]{10})\b/)?.[0];
      const isbn = text.match(/(?:97[89][\s-]*)?(?:\d[\s-]*){9}[\dX]/)?.[0]?.replace(/[\s-]/g, "");
      const code = asin || isbn;
      if (!code) { setMessage("Ingen kod hittades. Håll kameran närmare texten och försök igen."); setReading(false); return; }
      onCode(code);
    } catch { setMessage("Texten kunde inte läsas. Försök igen med bättre ljus."); setReading(false); }
  }

  return <div className={`scanner ${mode === "text" ? "text-scanner" : ""}`}>
    <button onClick={onClose} aria-label="Stäng kamera"><X /></button>
    <video ref={videoRef} muted playsInline />
    <div className="scan-frame" />
    <div className="scan-copy"><strong>{mode === "text" ? "Placera ASIN- eller ISBN-texten i rutan" : "Rikta kameran mot streckkoden"}</strong><span>{message || (mode === "text" ? "Håll telefonen stilla och tryck på knappen" : "Skanningen sker automatiskt")}</span>
      {mode === "text" && <button className="capture-text" disabled={reading} onClick={readText}>{reading ? <><span className="mini-loader" /> Läser text…</> : <><ScanText /> Läs av texten</>}</button>}
    </div>
  </div>;
}
