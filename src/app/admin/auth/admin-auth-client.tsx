"use client";

import {
  adminApiFetch,
  isAdminAuthenticated,
  resolveAdminRedirect,
  setAdminAuthenticated,
} from "@/lib/admin-auth-session";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminAuthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = resolveAdminRedirect(searchParams.get("redirect"));

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.replace(redirect);
    }
  }, [router, redirect]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await adminApiFetch("/api/admin/auth/login", {
        method: "POST",
        json: { password },
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (res.ok && json.ok) {
        setAdminAuthenticated();
        router.push(redirect);
        return;
      }
      if (json.error === "ui_password_unconfigured") {
        setError(json.message || "서버에 관리자 비밀번호가 설정되지 않았습니다.");
      } else {
        setError("비밀번호가 올바르지 않습니다.");
      }
      setPassword("");
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ping-ui ping-body-gradient flex min-h-dvh items-center justify-center font-ping">
      <div className="w-[90%] max-w-[450px] animate-[fadeInUp_0.5s_ease-out] rounded-[20px] border border-slate-400/10 bg-slate-800/95 p-12 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[20px] bg-gradient-to-br from-[var(--ping-primary)] to-[var(--ping-primary-dark)] shadow-[0_10px_30px_rgba(0,151,169,0.28)]">
          <span className="text-3xl text-white" aria-hidden>
            🔒
          </span>
        </div>
        <h1 className="mb-2 text-center text-3xl font-black text-white">관리자 인증</h1>
        <p className="mb-8 text-center text-slate-400">
          이 페이지는 관리자만 접근할 수 있습니다.
        </p>
        <form onSubmit={(e) => void onSubmit(e)}>
          <label className="mb-2 block text-sm font-semibold text-slate-200" htmlFor="adminPassword">
            관리자 비밀번호
          </label>
          <input
            id="adminPassword"
            type="password"
            className="mb-2 w-full rounded-[10px] border border-slate-400/20 bg-slate-900/50 px-4 py-3.5 text-base text-white placeholder:text-slate-500 focus-visible:border-[var(--ping-primary)] focus-visible:shadow-[0_0_0_3px_rgba(0,151,169,0.14)] focus-visible:outline-none"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            disabled={submitting}
          />
          {error ? (
            <p className="mb-4 text-sm text-red-500">{error}</p>
          ) : (
            <div className="mb-4 h-5" />
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[10px] bg-gradient-to-br from-[var(--ping-primary)] to-[var(--ping-primary-dark)] py-3.5 text-base font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(0,151,169,0.35)] disabled:opacity-60"
          >
            {submitting ? "확인 중…" : "인증하기"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          비밀번호를 잊으셨나요? 관리자에게 문의하세요.
        </p>
        <div className="mt-4 text-center">
          <Link
            href="/products/ping"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-[var(--ping-primary)]"
          >
            <span aria-hidden>‹</span>
            <span>홈으로</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
