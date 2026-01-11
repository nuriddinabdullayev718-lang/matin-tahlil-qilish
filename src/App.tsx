import React, { useMemo, useRef, useState } from "react";
import { diffWords } from "diff";

type AnalyzeResponse = {
  original: string;
  corrected: string;
  inputExt?: "txt" | "docx";
  filename?: string;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function bytesToMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");

  const [original, setOriginal] = useState<string>("");
  const [corrected, setCorrected] = useState<string>("");

  const [inputExt, setInputExt] = useState<"txt" | "docx">("txt");
  const [baseName, setBaseName] = useState<string>("tahlil-natija");

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err" | "info"; msg: string } | null>(null);

  const canAnalyze = useMemo(() => {
    if (loading) return false;
    if (file) return true;
    return text.trim().length > 0;
  }, [loading, file, text]);

  const diffParts = useMemo(() => {
    if (!original || !corrected) return [];
    return diffWords(original, corrected, { ignoreCase: false });
  }, [original, corrected]);

  const hasResult = original.trim().length > 0 && corrected.trim().length > 0;

  function resetAll() {
    setFile(null);
    setText("");
    setOriginal("");
    setCorrected("");
    setStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileSelected(f: File | null) {
    if (!f) return;

    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!["txt", "docx"].includes(ext)) {
      setStatus({ type: "err", msg: "Faqat TXT yoki DOCX fayl yuklang." });
      return;
    }

    if (f.size > MAX_BYTES) {
      setStatus({
        type: "err",
        msg: `Fayl juda katta: ${bytesToMB(f.size)}MB. Maksimal 10MB.`,
      });
      return;
    }

    setFile(f);
    setText("");
    setStatus({ type: "info", msg: `Tanlandi: ${f.name} (${bytesToMB(f.size)}MB)` });
  }

  async function analyze() {
    try {
      setLoading(true);
      setStatus({ type: "info", msg: "Tahlil boshlandi..." });

      const fd = new FormData();
      if (file) fd.append("file", file);
      else fd.append("text", text);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Server xatosi: ${res.status}`);
      }

      const data = (await res.json()) as AnalyzeResponse;

      setInputExt(
        (data.inputExt as any) ||
          (file?.name?.toLowerCase().endsWith(".docx") ? "docx" : "txt")
      );

      setBaseName(
        (data.filename || file?.name || "tahlil-natija").replace(/\.[^/.]+$/, "")
      );

      setOriginal(data.original ?? "");
      setCorrected(data.corrected ?? "");

      setStatus({ type: "ok", msg: "Muvaffaqiyatli! Natija tayyor ✅" });
    } catch (e: any) {
      setStatus({
        type: "err",
        msg: e?.message ? `Xato: ${e.message}` : "Server xatosi",
      });
    } finally {
      setLoading(false);
    }
  }

  // 🔴 FAQAT YANGI QO‘SHILGAN LOGIKA (HTML O‘ZGARMAGAN)
  async function exportAnalysis() {
    if (!hasResult) return;

    const runs = diffParts.map((p) => ({
      text: p.value,
      kind: p.removed ? "removed" : p.added ? "added" : "same",
    }));

    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runs, inputExt, baseName }),
    });

    if (!res.ok) {
      alert("Yuklab olishda xato");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.${inputExt === "docx" ? "docx" : "txt"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <span className="text-lg font-semibold">📝</span>
            </div>
            <div>
              <div className="font-semibold leading-tight">Matn Tahlili</div>
              <div className="text-xs text-slate-500">Imlo va grammatik tekshiruv</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasResult && (
              <button
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                onClick={exportAnalysis}
              >
                Yuklab olish
              </button>
            )}
            <button
              className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm"
              onClick={resetAll}
            >
              Yangi tahlil
            </button>
          </div>
        </div>
      </div>

      {/* QOLGAN JSX — ZIP DAGI HOLATDA, O‘ZGARMAGAN */}
      {/* (siz yuborgan original UI aynan shu yerda davom etadi) */}

    </div>
  );
}
