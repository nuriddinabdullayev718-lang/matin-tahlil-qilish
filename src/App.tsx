import { useCallback, useMemo, useState } from "react";
import { UploadCloud, FileText, FileType, AlertCircle, Loader2, Download, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DiffViewer } from "@/components/DiffViewer";

type AnalyzeResponse = {
  original: string;
  corrected: string;
  chunks?: number;
};

export function UploadZone() {
  const { toast } = useToast();

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const validTypes = useMemo(
    () => [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    []
  );

  const resetAll = () => {
    setFile(null);
    setResult(null);
    setIsLoading(false);
  };

  const downloadCorrected = () => {
    if (!result?.corrected) return;
    const blob = new Blob([result.corrected], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `tuzatilgan_matn_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  const copyCorrected = async () => {
    if (!result?.corrected) return;
    await navigator.clipboard.writeText(result.corrected);
    toast({ title: "Nusxa olindi ✅", description: "To‘g‘rilangan matn clipboard’ga ko‘chirildi." });
  };

  const analyzeFile = async (f: File) => {
    if (!f) return;

    if (!validTypes.includes(f.type)) {
      toast({
        title: "Noto'g'ri format",
        description: "Iltimos, DOCX yoki TXT fayl yuklang.",
        variant: "destructive",
      });
      return;
    }

    // 10MB tekshiruv (frontend)
    if (f.size > 10 * 1024 * 1024) {
      toast({
        title: "Fayl juda katta",
        description: "Maksimal 10MB gacha yuklang.",
        variant: "destructive",
      });
      return;
    }

    setFile(f);
    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", f);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.details || "Server xatosi");
      }

      setResult(data as AnalyzeResponse);

      toast({
        title: "Tahlil yakunlandi ✅",
        description: data?.chunks ? `Bo‘laklar soni: ${data.chunks}` : "Natija tayyor.",
      });
    } catch (e: any) {
      toast({
        title: "Xatolik",
        description: e?.message || "Tahlilda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const f = e.dataTransfer.files?.[0];
    if (f) analyzeFile(f);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) analyzeFile(f);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Upload Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300
          ${isDragging ? "border-primary bg-primary/5 scale-[1.01] shadow-xl shadow-primary/10" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"}
          bg-white p-10 text-center group cursor-pointer
        `}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleFileSelect}
          accept=".txt,.docx"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 animate-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900">Tahlil qilinmoqda...</h3>
            <p className="text-slate-500 mt-1">Katta hujjat bo‘lsa biroz vaqt oladi.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
              <UploadCloud className="w-10 h-10 text-primary" />
            </div>

            <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">
              Faylni yuklang va tahlil qiling
            </h3>

            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              DOCX yoki TXT (10MB gacha). Tahlildan so‘ng natija yonma-yon ikki oynada chiqadi.
            </p>

            <div className="flex items-center gap-4 text-sm font-medium text-slate-500 bg-slate-50 px-6 py-3 rounded-xl border border-slate-100">
              <span className="flex items-center gap-1.5">
                <FileType className="w-4 h-4" /> DOCX
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> TXT
              </span>
              {file && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-slate-700">{file.name}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-900/80 text-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p>
          <strong>Eslatma:</strong> Natijada o‘ng tomonda xato so‘zlar <b>qizil chiziq</b> bilan, to‘g‘rilar <b>yashil</b> bilan ko‘rsatiladi.
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">Tahlil natijasi</h2>
              <p className="text-slate-500">
                Chapda — asl matn. O‘ngda — xatolar belgilangan to‘g‘rilangan matn.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyCorrected}
                className="inline-flex items-center px-4 py-2.5 border border-slate-200 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <Copy className="w-4 h-4 mr-2" />
                Nusxa olish
              </button>

              <button
                onClick={downloadCorrected}
                className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-xl shadow-lg shadow-primary/25 text-white bg-primary hover:bg-primary/90 transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Yuklab olish (TXT)
              </button>

              <button
                onClick={resetAll}
                className="inline-flex items-center px-4 py-2.5 border border-slate-200 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Tozalash
              </button>
            </div>
          </div>

          <DiffViewer original={result.original} corrected={result.corrected} />
        </div>
      )}
    </div>
  );
}
