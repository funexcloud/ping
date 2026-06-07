"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyAdminSession } from "@/lib/admin-auth-session";
import { cn } from "@/lib/utils";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Home,
  Send,
  Shield,
  ShoppingCart,
  CircleDollarSign,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC5WpGDNDjE453GurImDlLONREF3Egi3kc",
  authDomain: "ping-3a510.firebaseapp.com",
  projectId: "ping-3a510",
  storageBucket: "ping-3a510.firebasestorage.app",
  messagingSenderId: "1042134556592",
  appId: "1:1042134556592:web:52be55132bf820abee4075",
};

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
  createdAt?: Timestamp | Date | string | number;
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
    console.error("[admin-partner] Firebase init failed", error);
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
          결제 완료
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

export function AdminPartnerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partnerParam = searchParams.get("partner")?.trim() || "";
  const adminMode = searchParams.get("admin") === "true";

  const [ready, setReady] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentPartnerCode, setCurrentPartnerCode] = useState(partnerParam);
  const [adminPartnerInput, setAdminPartnerInput] = useState("");
  const [allOrders, setAllOrders] = useState<PingOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [partnerLink, setPartnerLink] = useState("");

  const loadPartnerData = useCallback(async (code: string) => {
    if (!code) return;

    const db = getAdminFirestore();
    if (!db) {
      setAllOrders([]);
      return;
    }

    setLoading(true);
    try {
      const ordersSnapshot = await getDocs(
        query(
          collection(db, "ping_orders"),
          where("partner", "==", code),
          orderBy("createdAt", "desc"),
        ),
      );

      const orders: PingOrder[] = [];
      ordersSnapshot.forEach((snap) => {
        orders.push({ id: snap.id, ...snap.data() } as PingOrder);
      });
      setAllOrders(orders);
    } catch (error) {
      console.error("[admin-partner] load failed", error);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (adminMode) {
        const ok = await verifyAdminSession();
        if (cancelled) return;
        if (!ok) {
          router.replace("/admin/auth?redirect=partner");
          return;
        }
      }

      if (!partnerParam && !adminMode) {
        setAccessDenied(true);
        setReady(true);
        return;
      }

      if (partnerParam) {
        setCurrentPartnerCode(partnerParam);
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        setPartnerLink(`${origin}/start?partner=${encodeURIComponent(partnerParam)}`);
        void loadPartnerData(partnerParam);
      }

      setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [adminMode, partnerParam, router, loadPartnerData]);

  const stats = useMemo(() => {
    const totalOrders = allOrders.length;
    const paidOrders = allOrders.filter((o) => o.status === "paid").length;
    const totalRevenue = allOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCount = allOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + (o.count || 0), 0);
    return { totalOrders, paidOrders, totalRevenue, totalCount };
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return allOrders;
    return allOrders.filter((o) => o.status === statusFilter);
  }, [allOrders, statusFilter]);

  const handleAdminLookup = () => {
    const code = adminPartnerInput.trim();
    if (!code) {
      window.alert("파트너 코드를 입력하세요");
      return;
    }
    setCurrentPartnerCode(code);
    const origin = window.location.origin;
    setPartnerLink(`${origin}/start?partner=${encodeURIComponent(code)}`);
    void loadPartnerData(code);
  };

  const copyLink = async () => {
    if (!partnerLink) return;
    try {
      await navigator.clipboard.writeText(partnerLink);
      window.alert("파트너 링크가 클립보드에 복사되었습니다!");
    } catch {
      window.alert("복사에 실패했습니다.");
    }
  };

  const exportData = () => {
    if (allOrders.length === 0) {
      window.alert("다운로드할 데이터가 없습니다.");
      return;
    }

    const headers = ["주문번호", "신청자", "연락처", "플랜", "발송건수", "결제금액", "상태", "생성일"];
    const rows = allOrders.map((order) => [
      order.orderId || order.id,
      order.name || "",
      order.phone || "",
      "표준",
      order.count || 0,
      order.totalAmount || 0,
      order.status || "",
      toDate(order.createdAt).toLocaleString("ko-KR"),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `partner_${currentPartnerCode}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--ping-bg)] text-gray-600">
        불러오는 중...
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="ping-ui flex min-h-dvh items-center justify-center bg-[var(--ping-bg)] px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 size-12 text-amber-500" aria-hidden />
          <h1 className="mb-2 text-xl font-extrabold tracking-tight text-gray-900">
            접근 권한이 없습니다
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">파트너 코드가 필요합니다.</p>
          <p className="mb-6 text-xs leading-relaxed text-gray-500">
            올바른 링크 형식: /admin/partner?partner=파트너코드
            <br />
            관리자 모드: /admin/partner?partner=파트너코드&amp;admin=true
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/start">
                <Home className="size-4" />
                홈으로
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/monitoring">통합 모니터링</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ping-ui min-h-dvh bg-[var(--ping-bg)] font-ping">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {adminMode && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                  <Shield className="size-3" aria-hidden />
                  관리자 모드
                </span>
              )}
              <h1 className="mb-2 text-3xl font-black text-gray-900">파트너 대시보드</h1>
              <p className="text-gray-600">
                {currentPartnerCode
                  ? `파트너: ${currentPartnerCode}`
                  : adminMode
                    ? "관리자 모드: 파트너를 선택하세요"
                    : "파트너 코드를 확인하는 중..."}
              </p>
              {adminMode && !partnerParam && (
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1">
                    <Label htmlFor="admin-partner-select" className="mb-2 block text-sm font-medium">
                      파트너 선택 (관리자)
                    </Label>
                    <Input
                      id="admin-partner-select"
                      placeholder="파트너 코드 입력"
                      value={adminPartnerInput}
                      onChange={(e) => setAdminPartnerInput(e.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={handleAdminLookup}>
                    조회
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" className="bg-green-600 hover:bg-green-700" onClick={exportData}>
                <Download className="size-4" />
                엑셀 다운로드
              </Button>
              <Button asChild>
                <Link href="/start">
                  <Home className="size-4" />
                  홈으로
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
          {[
            {
              label: "총 주문 수",
              value: stats.totalOrders.toLocaleString(),
              icon: ShoppingCart,
              color: "text-[var(--ping-primary)]",
              bg: "bg-[var(--ping-tint-bg)]",
            },
            {
              label: "결제 완료",
              value: stats.paidOrders.toLocaleString(),
              icon: CheckCircle2,
              color: "text-green-600",
              bg: "bg-green-100",
            },
            {
              label: "총 매출",
              value: `${stats.totalRevenue.toLocaleString()}원`,
              icon: CircleDollarSign,
              color: "text-purple-600",
              bg: "bg-purple-100",
            },
            {
              label: "총 발송 건수",
              value: `${stats.totalCount.toLocaleString()}건`,
              icon: Send,
              color: "text-orange-600",
              bg: "bg-orange-100",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-gray-600">{card.label}</p>
                  <p className={cn("text-3xl font-black", card.color)}>{card.value}</p>
                </div>
                <div
                  className={cn("flex size-12 items-center justify-center rounded-full", card.bg)}
                >
                  <card.icon className={cn("size-5", card.color)} aria-hidden />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-black text-gray-900">내 주문 목록</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ping-primary)]"
            >
              <option value="all">전체</option>
              <option value="waiting_payment">결제 대기</option>
              <option value="paid">결제 완료</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "주문번호",
                    "신청자",
                    "연락처",
                    "플랜",
                    "발송건수",
                    "결제금액",
                    "상태",
                    "생성일",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      데이터를 불러오는 중...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {currentPartnerCode
                        ? "아직 주문 내역이 없습니다. 파트너 링크를 공유하여 주문을 받아보세요!"
                        : "파트너 코드를 선택해 주세요."}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {order.orderId || order.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{order.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{order.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                          표준
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {(order.count || 0).toLocaleString()}건
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[var(--ping-primary)]">
                        {(order.totalAmount || 0).toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {toDate(order.createdAt).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {currentPartnerCode && (
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-2xl font-black text-gray-900">내 파트너 링크</h2>
            <div className="rounded-lg border border-[var(--ping-tint-border)] bg-[var(--ping-tint-bg)] p-4">
              <p className="mb-2 text-sm text-gray-600">이 링크를 공유하여 주문을 받으세요:</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input readOnly value={partnerLink} className="bg-white" />
                <Button type="button" onClick={copyLink} className="shrink-0">
                  <Copy className="size-4" />
                  복사
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
