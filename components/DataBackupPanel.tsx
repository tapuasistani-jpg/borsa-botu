"use client";

import { useRef, useState } from "react";
import { downloadBackupFile, importBackupJson } from "@/lib/data-backup";

interface DataBackupPanelProps {
  onImported: () => void;
}

export default function DataBackupPanel({ onImported }: DataBackupPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  function handleExport() {
    downloadBackupFile();
    setMessage("Yedek dosyasi indirildi.");
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  function handleFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = importBackupJson(String(reader.result ?? ""));
      if (result.ok) {
        setMessage("Yedek basariyla yuklendi. Sayfa yenileniyor...");
        onImported();
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMessage(result.error ?? "Import basarisiz.");
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="panel-section">
      <h2 className="section-title">Veri Yedekleme</h2>
      <div className="panel-card">
        <p className="panel-note">
          Portfoy, basari skoru, izleme listesi ve Telegram durumunu JSON olarak
          disa aktar / ice aktar.
        </p>
        <div className="backup-actions">
          <button type="button" className="btn-primary btn-sm" onClick={handleExport}>
            Disa Aktar (JSON)
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={handleImportClick}>
            Ice Aktar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleFileChange}
          />
        </div>
        {message && <p className="panel-note">{message}</p>}
      </div>
    </section>
  );
}
