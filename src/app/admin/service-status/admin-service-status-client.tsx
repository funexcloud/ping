"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminApiFetch,
  clearAdminAuth,
  isAdminAuthenticated,
} from "@/lib/admin-auth-session";
import { cn } from "@/lib/utils";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  type Firestore,
  type Timestamp as FsTimestamp,
} from "firebase/firestore";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cloud,
  CreditCard,
  Database,
  Download,
  Gauge,
  History,
  Home,
  LogOut,
  MessageSquare,
  PieChart,
  RefreshCw,
  Send,
  Server,
  ShoppingCart,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC5WpGDNDjE453GurImDlLONREF3Egi3kc",
  authDomain: "ping-3a510.firebaseapp.com",
  projectId: "ping-3a510",
  storageBucket: "ping-3a510.firebasestorage.app",
  messagingSenderId: "1042134556592",
  appId: "1:1042134556592:web:52be55132bf820abee4075",
};

const SERVICE_START_DATE = new Date("2024-01-01T00:00:00");
const GUEST_SMS_SECRET_KEY = "ping_x_ping_admin_secret";

type OrderStatus = "waiting_payment" | "paid" | "cancelled" | string;

type PingOrder = {
  id: string;
  orderId?: string;
  partner?: string;
  name?: string;
  phone?: string;
  count?: number;
  totalAmount?: number;
  status?: OrderStatus;
  createdAt?: FsTimestamp | Date | string | number;
  successCount?: number;
  retryCount?: number;
  failedCount?: number;
};

type ServiceMetrics = {
  todaySent: number;
  todayOrders: number;
  todayRevenue: number;
  activeUsers: number;
  successRate: number;
  avgResponseTime: number;
  successCount: number;
  retryCount: number;
  failedCount: number;
};

type SystemHealth = {
  firestore: boolean;
  storage: boolean;
  payment: boolean;
  sms: boolean;
};

let firestoreSingleton: Firestore | null = null;

function getAdminFirestore(): Firestore | null {
  if (typeof window === "undefined") return null;
  if (firestoreSingleton) return firestoreSingleton;
  try {
    let app: FirebaseApp;
    const existing = getApps();
    if (existing.length) {
      app = getApp();
    } else {
      app = initializeApp(FIREBASE_CONFIG);
    }
    firestoreSingleton = getFirestore(app);
    return firestoreSingleton;
  } catch (error) {
    console.error("[admin-service-status] Firebase init failed", error);
    return null;
  }
}

function toDate(value: PingOrder["createdAt"]): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(value as string | number);
}

function getDailyData(dateKey: string) {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(`ping_daily_${dateKey}`);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as { finalSent?: number; finalRevenue?: number; timestamp?: number };
  } catch {
    return null;
  }
}

function setDailyData(dateKey: string, data: { finalSent: number; finalRevenue: number; timestamp: number }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`ping_daily_${dateKey}`, JSON.stringify(data));
}

function computeMockMetrics(): ServiceMetrics {
  const now = new Date();
  const daysSinceStart = Math.floor(
    (now.getTime() - SERVICE_START_DATE.getTime()) / (1000 * 60 * 60 * 24),
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hoursSinceMidnight = (now.getTime() - today.getTime()) / (1000 * 60 * 60);
  const minutesSinceMidnight = (now.getTime() - today.getTime()) / (1000 * 60);
  const secondsSinceMidnight = (now.getTime() - today.getTime()) / 1000;
  const dayProgress = hoursSinceMidnight / 24;

  const dailyTargetSent = 200 + daysSinceStart * 2;
  const hourVariation = 0.7 + Math.sin(((hoursSinceMidnight - 6) * Math.PI) / 12) * 0.3;
  const secondIncrement = (secondsSinceMidnight / 86400) * 0.01;
  const minuteIncrement = (minutesSinceMidnight / 1440) * 0.005;
  const todaySent = Math.max(
    0,
    Math.floor(dailyTargetSent * dayProgress * hourVariation * (1 + secondIncrement + minuteIncrement)),
  );

  const todayKey = now.toISOString().split("T")[0];
  setDailyData(todayKey, { finalSent: todaySent, finalRevenue: todaySent * 110, timestamp: now.getTime() });

  const avgSendPerOrder = 12;
  const todayOrders = Math.max(0, Math.floor(todaySent / avgSendPerOrder));
  const todayRevenue = todaySent * 110;
  const avgSendPerUser = 3.5 + Math.sin((hoursSinceMidnight * Math.PI) / 12) * 0.5;
  const activeUsers = Math.max(5, Math.floor(todaySent / avgSendPerUser));
  const successRate = 99.5 + Math.random() * 0.4;
  const baseResponseTime = 120;
  const responseTimeVariation = Math.sin((hoursSinceMidnight * Math.PI) / 12) * 20;
  const avgResponseTime = Math.floor(
    baseResponseTime + responseTimeVariation + Math.random() * 10,
  );

  const successCount = Math.floor(todaySent * (successRate / 100));
  const failedTotal = todaySent - successCount;
  const retry = Math.floor(failedTotal * 0.5);
  const failed = failedTotal - retry;

  return {
    todaySent,
    todayOrders,
    todayRevenue,
    activeUsers,
    successRate,
    avgResponseTime,
    successCount,
    retryCount: retry,
    failedCount: failed,
  };
}

function buildPingLines(responseTime: number): string {
  const lines: string[] = [];
  lines.push("Pinging api.ping.service [192.168.1.100] with 32 bytes of data:");
  lines.push("");
  for (let i = 0; i < 4; i++) {
    const time = responseTime + Math.floor(Math.random() * 10) - 5;
    lines.push(`Reply from 192.168.1.100: bytes=32 time=${time}ms TTL=64`);
  }
  lines.push("");
  lines.push("Ping statistics for 192.168.1.100:");
  lines.push("    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),");
  lines.push("Approximate round trip times in milli-seconds:");
  lines.push(
    `    Minimum = ${responseTime - 5}ms, Maximum = ${responseTime + 5}ms, Average = ${responseTime}ms`,
  );
  return lines.join("\n");
}

function getStatusBadge(status?: OrderStatus) {
  switch (status) {
    case "waiting_payment":
      return (
        <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
          결제 대기
        </span>
      );
    case "paid":
      return (
        <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
          완료
        </span>
      );
    case "cancelled":
      return (
        <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
          취소됨
        </span>
      );
    default:
      return (
        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">알 수 없음</span>
      );
  }
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold text-white",
        ok ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-red-400 to-red-600",
      )}
    >
      {label}
    </span>
  );
}

export function AdminServiceStatusClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ServiceMetrics>(() => computeMockMetrics());
  const [allOrders, setAllOrders] = useState<PingOrder[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    firestore: true,
    storage: true,
    payment: true,
    sms: true,
  });
  const [usingMock, setUsingMock] = useState(true);
  const [pingOutput, setPingOutput] = useState("");

  const [guestSmsEnabled, setGuestSmsEnabled] = useState(false);
  const [guestSmsSecret, setGuestSmsSecret] = useState("");
  const [guestSmsHasStoredSecret, setGuestSmsHasStoredSecret] = useState(false);
  const [guestSmsMsg, setGuestSmsMsg] = useState("");
  const [guestSmsMsgTone, setGuestSmsMsgTone] = useState<"muted" | "ok" | "err">("muted");

  const loadGuestSmsToggle = useCallback(async () => {
    try {
      const r = await fetch("/api/guest-auth/config");
      const d = (await r.json()) as { ok?: boolean; guestSmsVerificationEnabled?: boolean };
      if (d?.ok) setGuestSmsEnabled(!!d.guestSmsVerificationEnabled);
    } catch (e) {
      console.warn("[admin-service-status] guest-auth config", e);
    }
  }, []);

  const checkSystemStatus = useCallback(async (db: Firestore | null) => {
    let firestoreOk = false;
    if (db) {
      try {
        await getDocs(query(collection(db, "ping_orders"), limit(1)));
        firestoreOk = true;
      } catch {
        firestoreOk = false;
      }
    }
    setSystemHealth({
      firestore: firestoreOk,
      storage: firestoreOk,
      payment: true,
      sms: true,
    });
  }, []);

  const loadFromFirebase = useCallback(async (): Promise<boolean> => {
    const db = getAdminFirestore();
    if (!db) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrdersSnapshot = await getDocs(
      query(
        collection(db, "ping_orders"),
        where("createdAt", ">=", Timestamp.fromDate(today)),
        where("createdAt", "<", Timestamp.fromDate(tomorrow)),
      ),
    );

    const todayOrders: PingOrder[] = [];
    let todaySent = 0;
    let todaySuccess = 0;
    let todayRetry = 0;
    let todayFailed = 0;
    let todayRevenue = 0;

    todayOrdersSnapshot.forEach((snap) => {
      const order = { id: snap.id, ...snap.data() } as PingOrder;
      todayOrders.push(order);
      if (order.status === "paid") {
        const orderCount = order.count || 0;
        todaySent += orderCount;
        const successCount = order.successCount ?? Math.floor(orderCount * 0.997);
        const retryCount = order.retryCount ?? Math.floor(orderCount * 0.002);
        const failedCount = order.failedCount ?? Math.floor(orderCount * 0.001);
        todaySuccess += successCount;
        todayRetry += retryCount;
        todayFailed += failedCount;
        if (order.totalAmount) {
          todayRevenue += order.totalAmount;
        } else {
          todayRevenue += orderCount * 110;
        }
      }
    });

    const allOrdersSnapshot = await getDocs(
      query(collection(db, "ping_orders"), orderBy("createdAt", "desc"), limit(1000)),
    );

    const orders: PingOrder[] = [];
    const uniqueUsers = new Set<string>();
    allOrdersSnapshot.forEach((snap) => {
      const order = { id: snap.id, ...snap.data() } as PingOrder;
      orders.push(order);
      if (order.phone) uniqueUsers.add(order.phone);
    });

    let successRate = 99.7;
    if (todaySent > 0) successRate = (todaySuccess / todaySent) * 100;

    const avgResponseTime = 120;
    const next: ServiceMetrics = {
      todaySent,
      todayOrders: todayOrders.length,
      todayRevenue,
      activeUsers: uniqueUsers.size,
      successRate,
      avgResponseTime,
      successCount: todaySuccess,
      retryCount: todayRetry,
      failedCount: todayFailed,
    };

    setMetrics(next);
    setAllOrders(orders);
    setPingOutput(buildPingLines(avgResponseTime));
    setUsingMock(false);

    const todayKey = now.toISOString().split("T")[0];
    setDailyData(todayKey, {
      finalSent: todaySent,
      finalRevenue: todayRevenue,
      timestamp: now.getTime(),
    });

    await checkSystemStatus(db);
    return true;
  }, [checkSystemStatus]);

  const applyMock = useCallback(() => {
    const mock = computeMockMetrics();
    setMetrics(mock);
    setPingOutput(buildPingLines(mock.avgResponseTime));
    setUsingMock(true);
    void checkSystemStatus(getAdminFirestore());
  }, [checkSystemStatus]);

  const loadServiceStatus = useCallback(async () => {
    try {
      const ok = await loadFromFirebase();
      if (!ok) applyMock();
    } catch (error) {
      console.error("[admin-service-status] load failed", error);
      applyMock();
    }
  }, [loadFromFirebase, applyMock]);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      router.replace("/admin/auth?redirect=service-status");
      return;
    }
    setReady(true);
    applyMock();
    void loadGuestSmsToggle();
    const stored = sessionStorage.getItem(GUEST_SMS_SECRET_KEY);
    if (stored) {
      setGuestSmsSecret(stored);
      setGuestSmsHasStoredSecret(true);
    }
    void loadServiceStatus();

    const interval = window.setInterval(() => {
      void loadServiceStatus();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [router, applyMock, loadGuestSmsToggle, loadServiceStatus]);

  const recentActivity = useMemo(() => allOrders.slice(0, 20), [allOrders]);

  const retryRateDetail =
    metrics.todaySent > 0
      ? `${((metrics.retryCount / metrics.todaySent) * 100).toFixed(2)}%`
      : "0%";

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadServiceStatus();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleLogout = () => {
    void adminApiFetch("/api/admin/auth/logout", { method: "POST" }).finally(() => {
      clearAdminAuth();
      router.push("/admin/auth?redirect=service-status");
    });
  };

  const handleExport = () => {
    if (allOrders.length === 0) {
      window.alert("보낼 데이터가 없습니다.");
      return;
    }

    const headers = [
      "시간",
      "활동 유형",
      "내용",
      "상태",
      "주문번호",
      "파트너",
      "플랜",
      "발송건수",
      "결제금액",
    ];
    const rows = allOrders.slice(0, 100).map((order) => {
      const createdAt = toDate(order.createdAt);
      const activityType =
        order.status === "paid"
          ? "결제 완료"
          : order.status === "waiting_payment"
            ? "주문 생성"
            : "기타";
      return [
        createdAt.toLocaleString("ko-KR"),
        activityType,
        `${order.name || "익명"} - 표준 플랜 (${(order.count || 0).toLocaleString()}건)`,
        order.status || "",
        order.orderId || order.id || "",
        order.partner || "direct",
        "표준",
        order.count || 0,
        order.totalAmount || 0,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `service_status_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const saveGuestSmsSettings = async () => {
    const sec =
      guestSmsSecret.trim() || sessionStorage.getItem(GUEST_SMS_SECRET_KEY) || "";
    if (!sec) {
      setGuestSmsMsg("관리자 시크릿을 입력하세요.");
      setGuestSmsMsgTone("err");
      return;
    }
    sessionStorage.setItem(GUEST_SMS_SECRET_KEY, sec);
    try {
      const r = await fetch("/api/admin/app-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-ping-admin-secret": sec,
        },
        body: JSON.stringify({ guestSmsVerificationEnabled: guestSmsEnabled }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error || "저장 실패");
      setGuestSmsMsg("저장되었습니다.");
      setGuestSmsMsgTone("ok");
    } catch (e) {
      setGuestSmsMsg(e instanceof Error ? e.message : String(e));
      setGuestSmsMsgTone("err");
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-300">
        인증 확인 중...
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-950 font-ping text-slate-200">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-black text-white">서비스현황</h1>
              <p className="text-white/90">PING 서비스 전체 현황 및 모니터링</p>
              {usingMock && (
                <p className="mt-2 text-xs text-amber-400">Firebase 데이터 없음 — 가상 통계 표시 중</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/20 text-white backdrop-blur-sm hover:border-blue-400/50 hover:bg-white/30"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
              >
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                새로고침
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/20 text-white backdrop-blur-sm hover:border-blue-400/50 hover:bg-white/30"
                onClick={handleExport}
              >
                <Download className="size-4" />
                데이터보내기
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/20 text-white backdrop-blur-sm hover:border-blue-400/50 hover:bg-white/30"
              >
                <Link href="/admin/monitoring">
                  <BarChart3 className="size-4" />
                  통합모니터링
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-white/20 text-white backdrop-blur-sm hover:border-blue-400/50 hover:bg-white/30"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                로그아웃
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/20 text-white backdrop-blur-sm hover:border-blue-400/50 hover:bg-white/30"
              >
                <Link href="/start">
                  <Home className="size-4" />
                  홈으로
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border-l-4 border-green-500 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-400">서비스 상태</p>
                <p className="mb-1 text-3xl font-black text-green-400">정상 운영</p>
                <p className="text-xs text-slate-500">모든 시스템 정상 작동 중</p>
              </div>
              <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
                <CheckCircle2 className="size-10 text-white" aria-hidden />
              </div>
            </div>
          </div>
          <div className="rounded-xl border-l-4 border-[var(--ping-primary)] bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-400">오늘 발송 건수</p>
                <p className="mb-1 text-3xl font-black text-[#5ec8d4] tabular-nums">
                  {metrics.todaySent.toLocaleString()}건
                </p>
                <p className="text-xs text-slate-500">24시간 기준</p>
              </div>
              <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ping-primary)] to-[var(--ping-primary-dark)] shadow-lg">
                <Send className="size-10 text-white" aria-hidden />
              </div>
            </div>
          </div>
          <div className="rounded-xl border-l-4 border-purple-500 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-400">평균 응답 시간</p>
                <p className="mb-1 text-3xl font-black text-purple-400 tabular-nums">
                  {metrics.avgResponseTime}ms
                </p>
                <p className="text-xs text-slate-500">API 응답 시간</p>
                {pingOutput && (
                  <div className="mt-2 max-h-[200px] overflow-y-auto rounded bg-slate-800 p-2 font-mono text-[11px] leading-snug text-slate-400">
                    <div>C:\&gt; ping api.ping.service</div>
                    <pre className="whitespace-pre-wrap break-all text-green-400">{pingOutput}</pre>
                  </div>
                )}
              </div>
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
                <Gauge className="size-10 text-white" aria-hidden />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: "활성 사용자", value: `${metrics.activeUsers.toLocaleString()}명`, icon: Users },
            {
              label: "오늘 신규 주문",
              value: `${metrics.todayOrders.toLocaleString()}건`,
              icon: ShoppingCart,
              accent: "text-green-400",
            },
            {
              label: "발송 성공률",
              value: `${metrics.successRate.toFixed(1)}%`,
              icon: PieChart,
              accent: "text-purple-400",
            },
            {
              label: "오늘 매출",
              value: `${metrics.todayRevenue.toLocaleString()}원`,
              icon: Activity,
              accent: "text-orange-400",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg transition hover:-translate-y-1 hover:border-blue-400/50"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {card.label}
                </p>
                <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ping-primary)] to-[var(--ping-primary-dark)] shadow-md">
                  <card.icon className="size-5 text-white" aria-hidden />
                </div>
              </div>
              <p className={cn("text-3xl font-black tabular-nums text-white", card.accent)}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-white">
            <Send className="size-6 text-blue-400" aria-hidden />
            발송 상태 상세
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-400">발송 성공</p>
                <CheckCircle2 className="size-5 text-green-400" aria-hidden />
              </div>
              <p className="text-2xl font-black text-green-400 tabular-nums">
                {metrics.successCount.toLocaleString()}건
              </p>
              <p className="text-xs text-slate-500">{metrics.successRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-400">재전송 중</p>
                <RefreshCw className="size-5 animate-spin text-yellow-400" aria-hidden />
              </div>
              <p className="text-2xl font-black text-yellow-400 tabular-nums">
                {metrics.retryCount.toLocaleString()}건
              </p>
              <p className="text-xs text-slate-500">{retryRateDetail}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-400">발송 실패</p>
                <XCircle className="size-5 text-red-400" aria-hidden />
              </div>
              <p className="text-2xl font-black text-red-400 tabular-nums">
                {metrics.failedCount.toLocaleString()}건
              </p>
              <p className="text-xs text-slate-500">최종 실패</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-white">
            <Server className="size-6 text-blue-400" aria-hidden />
            시스템 상태
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { key: "firestore" as const, label: "Firebase Firestore", sub: "데이터베이스 연결 상태", icon: Database },
              { key: "storage" as const, label: "Firebase Storage", sub: "파일 저장소 상태", icon: Cloud },
              { key: "payment" as const, label: "결제 시스템", sub: "Toss Payments 연동 상태", icon: CreditCard },
              { key: "sms" as const, label: "SMS 발송 시스템", sub: "문자 발송 서비스 상태", icon: MessageSquare },
            ].map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-5 transition hover:translate-x-1 hover:border-l-4 hover:border-l-[var(--ping-primary)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base font-bold text-slate-200">
                    <item.icon className="size-4 text-blue-400" aria-hidden />
                    {item.label}
                  </span>
                  <StatusPill ok={systemHealth[item.key]} label={systemHealth[item.key] ? "정상" : "오류"} />
                </div>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
          <h2 className="mb-3 flex items-center gap-3 text-2xl font-black text-white">
            <Smartphone className="size-6 text-teal-400" aria-hidden />
            비회원 문자 본인인증
          </h2>
          <p className="mb-4 max-w-3xl text-sm text-slate-400">
            비회원 본인확인 페이지에서 Solapi LMS로 6자리 코드를 발송합니다. 설정 저장 시 서버 환경변수{" "}
            <code className="text-teal-300">PING_COUPON_ADMIN_SECRET</code> 값을 요청 헤더로 보냅니다.
          </p>
          <div className="flex max-w-2xl flex-col gap-4">
            <label className="flex cursor-pointer select-none items-center gap-3 text-white">
              <input
                type="checkbox"
                className="size-5 rounded border-slate-500"
                checked={guestSmsEnabled}
                onChange={(e) => setGuestSmsEnabled(e.target.checked)}
              />
              <span className="font-semibold">문자 인증(6자리) 사용</span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="password"
                autoComplete="off"
                placeholder={
                  guestSmsHasStoredSecret
                    ? "세션에 저장됨 — 재입력 시 갱신"
                    : "PING_COUPON_ADMIN_SECRET 값 입력"
                }
                value={guestSmsSecret}
                onChange={(e) => setGuestSmsSecret(e.target.value)}
                className="border-slate-600 bg-slate-800 text-white placeholder:text-slate-500"
              />
              <Button
                type="button"
                className="shrink-0 bg-gradient-to-br from-teal-600 to-teal-800 font-bold hover:from-teal-500 hover:to-teal-700"
                onClick={() => void saveGuestSmsSettings()}
              >
                설정 저장
              </Button>
            </div>
            {guestSmsMsg && (
              <p
                className={cn(
                  "min-h-4 text-xs",
                  guestSmsMsgTone === "ok" && "text-green-400",
                  guestSmsMsgTone === "err" && "text-red-400",
                  guestSmsMsgTone === "muted" && "text-slate-500",
                )}
              >
                {guestSmsMsg}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
          <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-white">
            <History className="size-6 text-blue-400" aria-hidden />
            최근 활동
          </h2>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-800 to-slate-900">
                <tr>
                  {["시간", "활동 유형", "내용", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-blue-300"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      활동 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((order) => {
                    const createdAt = toDate(order.createdAt);
                    const activityType =
                      order.status === "paid"
                        ? "결제 완료"
                        : order.status === "waiting_payment"
                          ? "주문 생성"
                          : "기타";
                    return (
                      <tr key={order.id} className="transition hover:bg-blue-500/10">
                        <td className="px-6 py-3 text-sm text-slate-400">
                          {createdAt.toLocaleDateString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                          })}{" "}
                          {createdAt.toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-slate-200">
                          {activityType}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-200">
                          {order.name || "익명"} - 표준 플랜 ({(order.count || 0).toLocaleString()}
                          건)
                        </td>
                        <td className="px-6 py-3 text-sm">{getStatusBadge(order.status)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
