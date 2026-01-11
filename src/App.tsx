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
      setStatus({ type: "err", msg: "Faqat TXT yoki DOCX fayl yuklash mumkin." });
      return;
    }

    if (f.size > MAX_BYTES) {
      setStatus({ type: "err", msg: `Fayl juda katta: ${bytesToMB(f.size)}MB (maks. 10MB)` });
      return;
    }

    setFile(f);
    setText("");
    setStatus({ type: "info", msg: `Tanlandi: ${f.name} (${bytesToMB(f.size)}MB)` });
  }

  async function analyze() {
    try {
      setLoading(true);
      setStatus({ type: "info", msg: "Tahlil qilinmoqda..." });

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

      setStatus({ type: "ok", msg: "Tahlil yakunlandi ✅" });
    } catch (e: any) {
      setStatus({ type: "err", msg: e?.message || "Server xatosi" });
    } finally {
      setLoading(false);
    }
  }

  async function exportAnalysis() {
    if (!hasResult) return;

    const runs = diffParts.map((p) => ({
      text: p.value,
      kind: p.removed ? "removed" : p.added ? "added" : "same",
    }));

    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runs,
        inputExt,
        baseName,
      }),
    });

    if (!res.ok) {
      alert("Yuklab olishda xato yuz berdi");
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
          <div className="font-semibold">📝 Matn tahlili</div>
          <div className="flex gap-2">
            {hasResult && (
              <button
                onClick={exportAnalysis}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 text-sm"
              >
                Yuklab olish
              </button>
            )}
            <button
              onClick={resetAll}
              className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm"
            >
              Yangi tahlil
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {!hasResult && (
          <div className="bg-white border rounded-3xl p-8">
            <div className="text-center mb-4 font-semibold">DOCX yoki TXT yuklang</div>

            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={pickFile}
                className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50"
              >
                Fayl tanlash
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
              />
            </div>

            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (file) setFile(null);
              }}
              placeholder="Yoki matnni shu yerga yozing..."
              className="w-full min-h-[150px] border rounded-xl p-4"
            />

            <div className="mt-4 text-center">
              <button
                disabled={!canAnalyze}
                onClick={analyze}
                className={`px-6 py-3 rounded-2xl font-semibold ${
                  canAnalyze
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className="mt-4 text-sm text-center">
            {status.msg}
          </div>
        )}

        {hasResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white border rounded-3xl p-5">
              <div className="font-semibold mb-2">Asl matn</div>
              <div className="whitespace-pre-wrap">{original}</div>
            </div>

            <div className="bg-white border rounded-3xl p-5">
              <div className="font-semibold mb-2 text-blue-700">Vizual tahlil</div>
              <div className="whitespace-pre-wrap leading-7">
                {diffParts.map((p, i) => {
                  if (p.removed)
                    return (
                      <span
                        key={i}
                        className="text-rose-600 line-through bg-rose-50 px-1 rounded"
                      >
                        {p.value}
                      </span>
                    );
                  if (p.added)
                    return (
                      <span
                        key={i}
                        className="text-emerald-700 bg-emerald-50 px-1 rounded font-semibold"
                      >
                        {p.value}
                      </span>
                    );
                  return <span key={i}>{p.value}</span>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
