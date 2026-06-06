"use client";

import {
  isMemorialAuthenticated,
  setMemorialAuthenticated,
} from "@/lib/memorial-auth-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatPhoneInput(value: string): string {
  let v = value.replace(/[^0-9]/g, "");
  if (v.length > 3 && v.length <= 7) {
    v = `${v.slice(0, 3)}-${v.slice(3)}`;
  } else if (v.length > 7) {
    v = `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7, 11)}`;
  }
  return v;
}

export default function MemorialAuthClient() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isMemorialAuthenticated()) {
      router.replace("/memorial/hall");
    }
  }, [router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) {
      alert("휴대폰 번호를 입력해주세요.");
      return;
    }
    if (!/^01[0-9]-[0-9]{4}-[0-9]{4}$/.test(trimmed)) {
      alert("휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setMemorialAuthenticated(trimmed);
      router.push("/memorial/hall");
    }, 2000);
  };

  return (
    <div className="ping-ui flex min-h-dvh items-center justify-center bg-gradient-to-b from-[var(--ping-bg)] to-[var(--ping-surface)] p-5 font-ping text-[#191F28]">
      <div className="w-full max-w-[500px] rounded-3xl bg-white p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-md:p-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--ping-primary-light)] text-[40px]">
          🔒
        </div>
        <h2 className="mb-3 text-[28px] font-extrabold max-md:text-2xl">
          본인인증이 필요합니다
        </h2>
        <p className="mb-8 text-base leading-relaxed text-[#6B7684] max-md:text-[15px]">
          추모관 등록과 이용을 위해 본인인증이 필요합니다.
          <br />
          본인인증을 완료하면 누구나 추모관을 안전하게 이용할 수 있습니다.
        </p>
        <form className="text-left" onSubmit={onSubmit}>
          <label className="mb-2 block text-sm font-semibold text-[#4E5968]">
            휴대폰 번호
          </label>
          <input
            type="tel"
            className="mb-5 w-full rounded-xl border-2 border-[#E5E8EB] px-4 py-3.5 text-base outline-none focus-visible:border-[var(--ping-primary)] focus-visible:shadow-[0_0_0_3px_var(--ping-primary-light)]"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            maxLength={13}
            required
            disabled={submitting}
          />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border-0 bg-[var(--ping-primary)] py-4 text-[17px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#D1D6DB]"
            disabled={submitting}
          >
            <span>{submitting ? "⏳" : "📱"}</span>
            <span>{submitting ? "인증 중..." : "PASS 인증하기"}</span>
          </button>
        </form>
        <div className="mt-6 rounded-xl bg-[#F9FAFB] p-4 text-left text-[13px] leading-relaxed text-[#6B7684]">
          <strong className="text-[#191F28]">PASS 인증 안내</strong>
          <br />• <strong>추모관 이용자:</strong> 본인인증 후 이용 가능합니다.
          <br />• <strong>추모하실 분:</strong> 본인인증을 통해 누구나 추모가 가능합니다.
          <br />• 휴대폰에 PASS 앱이 설치되어 있어야 합니다.
          <br />• 인증은 세션 동안 유효하며, 브라우저를 닫으면 다시 인증이 필요합니다.
        </div>
        <div className="mt-6 flex justify-center">
          <Link href="/products/ping" className="ping-back-btn touch-manipulation" aria-label="뒤로">
            <span className="ping-chevron-left" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
