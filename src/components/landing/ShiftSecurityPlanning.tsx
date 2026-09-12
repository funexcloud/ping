import { ShieldCheck } from "lucide-react";

export function ShiftSecurityPlanning() {
  return (
    <div className="ping-bordered-panel rounded-3xl bg-white/90 backdrop-blur-md p-6 border border-slate-200/80 shadow-sm mt-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[var(--ping-primary,#0056f3)] flex-shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">안전한 발송 설계</h3>
          <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600">
            입력 정보, 결제, 발송 결과를 단계별로 분리해 필요한 순간에만 안전하게 확인하도록 설계했습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
