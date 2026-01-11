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

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("");
  const [original, setOriginal] = useState<string>("");
  const [corrected, setCorrected] = useState<string>("");

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
      setStatus({ type: "err", msg: `Fayl juda katta: ${bytesToMB(f.size)}MB. Maksimal 10MB.` });
      return;
    }

    setFile(f);
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

      setOriginal(data.original ?? "");
      setCorrected(data.corrected ?? "");
      setStatus({ type: "ok", msg: "Muvaffaqiyatli! Natija tayyor ✅" });
    } catch (e: any) {
      setStatus({
        type: "err",
        msg:
          e?.message?.includes("Server xatosi") || e?.message
            ? `Xato: ${e.message}`
            : "Server xatosi",
      });
    } finally {
      setLoading(false);
    }
  }

  const hasResult = original.trim().length > 0 && corrected.trim().length > 0;

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
                onClick={() => downloadText("togrilangan-matn.txt", corrected)}
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

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Tezkor va samarali
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight">
            Matnni tahlil qiling va{" "}
            <span className="text-blue-600 underline underline-offset-8">xatolarni to‘g‘rilang</span>
          </h1>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            DOCX yoki TXT fayl yuklang (10MB gacha) yoki matnni yozing — tizim xatolarni topib,
            to‘g‘rilangan variantni chiqaradi.
          </p>
        </div>

        {/* Status */}
        {status && (
          <div
            className={[
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              status.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : status.type === "err"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-white text-slate-700",
            ].join(" ")}
          >
            {status.msg}
          </div>
        )}

        {/* Upload Card */}
        {!hasResult && (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
            <div
              className="rounded-3xl border-2 border-dashed border-slate-200 hover:border-slate-300 transition p-8 md:p-10 text-center"
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onFileSelected(f);
              }}
            >
              <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <span className="text-2xl">☁️</span>
              </div>

              <div className="mt-4 text-lg font-semibold">Faylni bu yerga tashlang</div>
              <div className="mt-1 text-sm text-slate-500">Yoki kompyuteringizdan tanlash uchun bosing.</div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                  onClick={pickFile}
                >
                  DOCX / TXT tanlash
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.docx"
                  className="hidden"
                  onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
                />
              </div>

              <div className="mt-5 text-slate-500 text-sm">yoki</div>

              <div className="mt-3">
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (file) setFile(null); // matn yozsa, faylni bekor qilamiz
                  }}
                  placeholder="Matnni shu yerga yozib ham tahlil qilishingiz mumkin..."
                  className="w-full min-h-[160px] rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 p-4 text-sm"
                />
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Eslatma: Maksimal fayl hajmi <span className="font-semibold">10MB</span>. DOCX va TXT qo‘llab-quvvatlanadi.
                  {file ? (
                    <div className="mt-1 text-slate-700">
                      Tanlangan fayl: <span className="font-semibold">{file.name}</span> ({bytesToMB(file.size)}MB)
                    </div>
                  ) : null}
                </div>

                <button
                  disabled={!canAnalyze}
                  onClick={analyze}
                  className={[
                    "px-5 py-3 rounded-2xl text-sm font-semibold shadow-sm",
                    canAnalyze
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result Panels */}
        {hasResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Original */}
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="font-semibold">Asl Matn</div>
                <div className="text-xs text-slate-500">{original.length.toLocaleString()} belgi</div>
              </div>
              <div className="p-5">
                <div className="whitespace-pre-wrap leading-7 text-[15px]">
                  {original || <span className="text-slate-400">—</span>}
                </div>
              </div>
            </div>

            {/* Corrected with highlights */}
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="font-semibold text-blue-700">To‘g‘rilangan Matn</div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
                    onClick={() => downloadText("togrilangan-matn.txt", corrected)}
                  >
                    Yuklab olish
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="whitespace-pre-wrap leading-7 text-[15px]">
                  {diffParts.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    diffParts.map((p, idx) => {
                      // removed: qizil chiziq (xato)
                      if (p.removed) {
                        return (
                          <span
                            key={idx}
                            className="text-rose-600 line-through decoration-2 decoration-rose-500/70 bg-rose-50 rounded px-1"
                          >
                            {p.value}
                          </span>
                        );
                      }
                      // added: yashil (to‘g‘ri)
                      if (p.added) {
                        return (
                          <span key={idx} className="text-emerald-700 bg-emerald-50 rounded px-1 font-semibold">
                            {p.value}
                          </span>
                        );
                      }
                      // unchanged
                      return <span key={idx}>{p.value}</span>;
                    })
                  )}
                </div>

                <div className="mt-5 text-xs text-slate-500">
                  Belgilash: <span className="text-rose-600 line-through">qizil chiziq</span> — xato,{" "}
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-1 rounded">yashil</span> — to‘g‘ri variant.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Matn Tahlili</div>
          <div>Maksimal fayl: 10MB • Formatlar: DOCX, TXT</div>
        </div>
      </div>
    </div>
  );
}
