"use client";

import { PingLoadingSpinner } from "@/components/ping-loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminApiFetch,
  clearAdminAuth,
} from "@/lib/admin-auth-session";
import { PING_CASH_RECEIPT_TYPE_LABELS, type PingCashReceiptType } from "@/lib/ping-cash-receipt";
import {
  deriveFulfillmentPhase,
  type FulfillmentPhase,
} from "@/lib/ping-order-fulfillment";
import { cn } from "@/lib/utils";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Timestamp,
} from "firebase/firestore";
import {
  BarChart3,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Home,
  Link2,
  LogOut,
  Plus,
  ShoppingCart,
  Trash2,
  Users,
  CircleDollarSign,
  Loader2,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./admin-monitoring.css";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC5WpGDNDjE453GurImDlLONREF3Egi3kc",
  authDomain: "ping-3a510.firebaseapp.com",
  projectId: "ping-3a510",
  storageBucket: "ping-3a510.firebasestorage.app",
  messagingSenderId: "1042134556592",
  appId: "1:1042134556592:web:52be55132bf820abee4075",
};

const SERVICE_START_DATE = new Date("2024-01-01T00:00:00");

const BANKS: { name: string; code: string }[] = [
  { name: "KB국민은행", code: "004" },
  { name: "신한은행", code: "088" },
  { name: "우리은행", code: "020" },
  { name: "하나은행", code: "081" },
  { name: "NH농협은행", code: "011" },
  { name: "카카오뱅크", code: "090" },
  { name: "케이뱅크", code: "089" },
  { name: "기업은행", code: "003" },
  { name: "SC제일은행", code: "023" },
  { name: "새마을금고", code: "045" },
  { name: "신협", code: "048" },
  { name: "우체국", code: "071" },
  { name: "한국씨티은행", code: "027" },
  { name: "대구은행", code: "031" },
  { name: "부산은행", code: "032" },
  { name: "광주은행", code: "034" },
  { name: "제주은행", code: "035" },
  { name: "전북은행", code: "037" },
  { name: "경남은행", code: "039" },
  { name: "저축은행", code: "050" },
  { name: "산림조합중앙회", code: "064" },
  { name: "수협은행", code: "007" },
  { name: "농축협", code: "012" },
];

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
  paymentMethod?: string;
  smsStatus?: string;
  cashReceiptType?: string;
  cashReceiptVoluntary?: boolean;
  cashReceiptStatus?: string;
  bankTransferAmount?: number;
  createdAt?: Timestamp | Date | string | number;
  successCount?: number;
  retryCount?: number;
  failedCount?: number;
};

type PartnerStats = {
  code: string;
  name: string;
  contact: string;
  phone: string;
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  totalCount: number;
};

type RegisteredPartner = {
  code: string;
  name?: string;
  contact?: string;
  phone?: string;
  email?: string | null;
  link?: string;
  bank?: string;
  bankCode?: string;
  accountNumber?: string;
  accountHolder?: string;
};

type Stats = {
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  activePartners: number;
};

type LoadError = "none" | "permission" | "general";

type PartnerForm = {
  name: string;
  contact: string;
  phone: string;
  email: string;
  bank: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  accountAgreement: boolean;
  code: string;
  link: string;
};

const EMPTY_PARTNER_FORM: PartnerForm = {
  name: "",
  contact: "",
  phone: "",
  email: "",
  bank: "",
  bankCode: "",
  accountNumber: "",
  accountHolder: "",
  accountAgreement: false,
  code: "",
  link: "",
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
    console.error("[admin-monitoring] Firebase init failed", error);
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
    return JSON.parse(stored) as {
      orders?: number;
      paidOrders?: number;
      revenue?: number;
      timestamp?: number;
    };
  } catch {
    return null;
  }
}

function setDailyData(
  dateKey: string,
  data: { orders: number; paidOrders: number; revenue: number; timestamp: number },
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`ping_daily_${dateKey}`, JSON.stringify(data));
}

function computeMockStats(): Stats {
  const now = new Date();
  const daysSinceStart = Math.floor(
    (now.getTime() - SERVICE_START_DATE.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dailyOrderRate = 3 + daysSinceStart * 0.05;

  let totalOrders = 0;
  let totalRevenue = 0;
  let totalPaidOrders = 0;

  for (let i = 0; i < Math.min(30, daysSinceStart); i++) {
    const date = new Date(SERVICE_START_DATE);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split("T")[0];
    const dailyData = getDailyData(dateKey);

    if (dailyData) {
      totalOrders += dailyData.orders || 0;
      totalPaidOrders += dailyData.paidOrders || 0;
      totalRevenue += dailyData.revenue || 0;
    } else {
      const dayOrderRate = dailyOrderRate - (daysSinceStart - i) * 0.05;
      const dayOrders = Math.floor(dayOrderRate);
      const paymentSuccessRate = 0.95 + Math.random() * 0.03;
      const dayPaidOrders = Math.floor(dayOrders * paymentSuccessRate);
      const avgSendPerOrder = 12;
      const daySendCount = dayPaidOrders * avgSendPerOrder;
      const dayRevenue = daySendCount * 110;

      totalOrders += dayOrders;
      totalPaidOrders += dayPaidOrders;
      totalRevenue += dayRevenue;

      setDailyData(dateKey, {
        orders: dayOrders,
        paidOrders: dayPaidOrders,
        revenue: dayRevenue,
        timestamp: date.getTime(),
      });
    }
  }

  const todayKey = now.toISOString().split("T")[0];
  const todayProgress =
    (now.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
    (1000 * 60 * 60 * 24);
  const todayOrders = Math.floor(dailyOrderRate * todayProgress);
  const paymentSuccessRate = 0.95 + Math.random() * 0.03;
  const todayPaidOrders = Math.floor(todayOrders * paymentSuccessRate);
  const todaySendCount = todayPaidOrders * 12;
  const todayRevenue = todaySendCount * 110;

  totalOrders += todayOrders;
  totalPaidOrders += todayPaidOrders;
  totalRevenue += todayRevenue;

  const activePartners = Math.min(50, Math.floor(3 + daysSinceStart * 0.1));

  return {
    totalOrders,
    paidOrders: totalPaidOrders,
    totalRevenue,
    activePartners,
  };
}

function computeStatsFromOrders(
  orders: PingOrder[],
  partners: Record<string, PartnerStats>,
): Stats {
  const totalOrders = orders.length;
  const paidOrdersList = orders.filter((o) => o.status === "paid");
  const paidOrders = paidOrdersList.length;

  let totalRevenue = 0;
  paidOrdersList.forEach((order) => {
    if (order.totalAmount) {
      totalRevenue += order.totalAmount;
    } else {
      const orderCount = order.count || 0;
      totalRevenue += orderCount * 110;
    }
  });

  const activePartners = Object.values(partners).filter(
    (p) => p.totalRevenue > 0 || p.totalOrders > 0,
  ).length;

  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];
  const todayPaidOrders = paidOrdersList.filter((o) => {
    const orderDate = toDate(o.createdAt);
    return orderDate.toISOString().split("T")[0] === todayKey;
  }).length;
  const todayRevenue = paidOrdersList
    .filter((o) => toDate(o.createdAt).toISOString().split("T")[0] === todayKey)
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  setDailyData(todayKey, {
    orders: totalOrders,
    paidOrders: todayPaidOrders,
    revenue: todayRevenue,
    timestamp: now.getTime(),
  });

  return { totalOrders, paidOrders, totalRevenue, activePartners };
}

function buildPartnerStats(
  orders: PingOrder[],
  registered: Record<string, RegisteredPartner>,
): Record<string, PartnerStats> {
  const partners: Record<string, PartnerStats> = {};

  orders.forEach((order) => {
    const partner = order.partner || "direct";
    if (!partners[partner]) {
      const info = registered[partner];
      partners[partner] = {
        code: partner,
        name: info?.name || partner,
        contact: info?.contact || "-",
        phone: info?.phone || "-",
        totalOrders: 0,
        paidOrders: 0,
        totalRevenue: 0,
        totalCount: 0,
      };
    }
    partners[partner].totalOrders += 1;
    if (order.status === "paid") {
      partners[partner].paidOrders += 1;
      partners[partner].totalRevenue += order.totalAmount || 0;
      partners[partner].totalCount += order.count || 0;
    }
  });

  return partners;
}

function generatePartnerCodeFromName(partnerName: string, origin: string): { code: string; link: string } {
  if (!partnerName.trim()) return { code: "", link: "" };

  const koreanPart = partnerName.match(/[가-힣]+/g);
  let namePart = "";
  if (koreanPart && koreanPart.length > 0) {
    namePart = koreanPart[0].substring(0, 6);
  } else {
    namePart = partnerName.replace(/[^a-zA-Z0-9가-힣]/g, "").substring(0, 6);
  }

  const uniqueNumber = Date.now().toString(36).toUpperCase().substring(5, 9);
  const code = `MIM${namePart}${uniqueNumber}`;
  const link = `${origin}/start?partner=${encodeURIComponent(code)}`;
  return { code, link };
}

function getStatusBadge(status?: OrderStatus) {
  switch (status) {
    case "waiting_payment":
      return (
        <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
          결제 대기
        </span>
      );
    case "waiting_bank_transfer":
      return (
        <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
          무통장 입금 대기
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

function fulfillmentBadgeClass(phase: FulfillmentPhase): string {
  switch (phase) {
    case "received":
      return "bg-amber-100 text-amber-800";
    case "dispatching":
      return "bg-blue-100 text-blue-700";
    case "complete":
      return "bg-emerald-100 text-emerald-700";
    case "partial":
      return "bg-orange-100 text-orange-800";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getFulfillmentBadge(order: PingOrder) {
  const derived = deriveFulfillmentPhase(order);
  const countHint =
    derived.targetCount != null &&
    (derived.phase === "partial" || derived.phase === "complete" || derived.phase === "failed") &&
    derived.sentCount != null
      ? ` ${derived.sentCount}/${derived.targetCount}`
      : "";
  return (
    <span
      className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${fulfillmentBadgeClass(derived.phase)}`}
      title={
        derived.failedCount != null && derived.failedCount > 0
          ? `미도달 ${derived.failedCount}건`
          : undefined
      }
    >
      {derived.chipLabel}
      {countHint}
    </span>
  );
}

function PermissionDeniedMessage() {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="mb-2 font-bold text-red-800">Firestore 보안 규칙 설정 필요</p>
      <p className="mb-2 text-sm text-red-700">
        Firestore 보안 규칙을 설정해야 데이터를 불러올 수 있습니다.
      </p>
      <a
        href="https://console.firebase.google.com/project/ping-3a510/firestore/rules"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-red-600 underline"
      >
        Firebase 콘솔에서 보안 규칙 설정하기
      </a>
    </div>
  );
}

export function AdminMonitoringClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [loadError, setLoadError] = useState<LoadError>("none");

  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    paidOrders: 0,
    totalRevenue: 0,
    activePartners: 0,
  });

  const [allOrders, setAllOrders] = useState<PingOrder[]>([]);
  const [allPartners, setAllPartners] = useState<Record<string, PartnerStats>>({});
  const [registeredPartners, setRegisteredPartners] = useState<
    Record<string, RegisteredPartner>
  >({});

  const [statusFilter, setStatusFilter] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState<PartnerForm>(EMPTY_PARTNER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  const applyMockStats = useCallback(() => {
    setStats(computeMockStats());
    setUsingMock(true);
  }, []);

  const loadAllData = useCallback(async () => {
    const db = getAdminFirestore();
    if (!db) {
      applyMockStats();
      setLoading(false);
      return;
    }

    try {
      const partnersSnapshot = await getDocs(collection(db, "ping_partners"));
      const registered: Record<string, RegisteredPartner> = {};
      partnersSnapshot.forEach((snap) => {
        registered[snap.id] = { code: snap.id, ...(snap.data() as Omit<RegisteredPartner, "code">) };
      });

      const ordersSnapshot = await getDocs(
        query(collection(db, "ping_orders"), orderBy("createdAt", "desc")),
      );

      const orders: PingOrder[] = [];
      ordersSnapshot.forEach((snap) => {
        orders.push({ id: snap.id, ...(snap.data() as Omit<PingOrder, "id">) });
      });

      const partnerStats = buildPartnerStats(orders, registered);

      setRegisteredPartners(registered);
      setAllOrders(orders);
      setAllPartners(partnerStats);
      setLoadError("none");

      if (orders.length > 0) {
        setStats(computeStatsFromOrders(orders, partnerStats));
        setUsingMock(false);
      } else {
        applyMockStats();
      }
    } catch (error) {
      console.error("[admin-monitoring] data load failed", error);
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as { code?: string }).code;

      if (code === "permission-denied" || message.includes("permissions")) {
        setLoadError("permission");
        window.alert(
          "Firestore 보안 규칙이 설정되지 않았습니다.\n\nFirebase 콘솔에서 ping_orders, ping_partners 컬렉션 read/write 규칙을 설정해 주세요.",
        );
      } else {
        setLoadError("general");
        window.alert(`데이터를 불러오는 중 오류가 발생했습니다.\n\n오류: ${message}`);
      }
      applyMockStats();
    } finally {
      setLoading(false);
    }
  }, [applyMockStats]);

  useEffect(() => {
    applyMockStats();
    void loadAllData();
  }, [loadAllData, applyMockStats]);

  const partnerRows = useMemo(() => {
    const codes = new Set([
      ...Object.keys(registeredPartners),
      ...Object.keys(allPartners),
    ]);

    return Array.from(codes)
      .map((code) => {
        const info = registeredPartners[code];
        const rowStats = allPartners[code] || {
          code,
          name: code,
          contact: "-",
          phone: "-",
          totalOrders: 0,
          paidOrders: 0,
          totalRevenue: 0,
          totalCount: 0,
        };
        return {
          code,
          name: info?.name || rowStats.name,
          contact: info?.contact || rowStats.contact,
          phone: info?.phone || rowStats.phone,
          totalOrders: rowStats.totalOrders,
          paidOrders: rowStats.paidOrders,
          totalRevenue: rowStats.totalRevenue,
          totalCount: rowStats.totalCount,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [registeredPartners, allPartners]);

  const filteredOrders = useMemo(() => {
    let result = allOrders;
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (partnerFilter.trim()) {
      const q = partnerFilter.toLowerCase();
      result = result.filter((o) => (o.partner || "direct").toLowerCase().includes(q));
    }
    return result;
  }, [allOrders, statusFilter, partnerFilter]);

  const handleLogout = () => {
    void adminApiFetch("/api/admin/auth/logout", { method: "POST" }).finally(() => {
      clearAdminAuth();
      router.push("/admin/auth?redirect=monitoring");
    });
  };

  const handleConfirmBankDeposit = async (order: PingOrder) => {
    const oid = String(order.orderId || order.id).trim();
    if (!oid) return;
    const ok = window.confirm(
      `${oid}\n입금을 확인하고 발송을 시작할까요?\n(신청자: ${order.name || "-"})`,
    );
    if (!ok) return;

    setConfirmingOrderId(oid);
    try {
      const res = await adminApiFetch("/api/admin/orders/confirm-bank-deposit", {
        method: "POST",
        json: { orderId: oid },
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
        dispatch?: { success?: boolean; error?: string };
      };
      if (res.status === 401) {
        clearAdminAuth();
        router.replace("/admin/auth?redirect=monitoring");
        return;
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.message || "입금 확인에 실패했습니다.");
      }
      if (json.dispatch && json.dispatch.success === false) {
        window.alert(
          `입금 확인은 완료했으나 발송에 실패했습니다.\n${json.dispatch.error || "Solapi/SMS 설정을 확인해 주세요."}`,
        );
      } else {
        window.alert("입금 확인 및 발송 처리를 요청했습니다.");
      }
      await loadAllData();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "입금 확인 중 오류가 발생했습니다.");
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleExport = () => {
    if (allOrders.length === 0) {
      window.alert("다운로드할 데이터가 없습니다.");
      return;
    }

    const headers = [
      "주문번호",
      "파트너",
      "신청자",
      "연락처",
      "플랜",
      "발송건수",
      "결제금액",
      "상태",
      "생성일",
    ];
    const rows = allOrders.map((order) => [
      order.orderId || order.id,
      order.partner || "direct",
      order.name || "",
      order.phone || "",
      "표준",
      order.count || 0,
      order.totalAmount || 0,
      order.status || "",
      toDate(order.createdAt).toLocaleString("ko-KR"),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `all_orders_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const openPartnerModal = () => {
    setPartnerForm(EMPTY_PARTNER_FORM);
    setModalOpen(true);
  };

  const closePartnerModal = () => {
    setModalOpen(false);
    setPartnerForm(EMPTY_PARTNER_FORM);
  };

  const updatePartnerName = (name: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { code, link } = generatePartnerCodeFromName(name, origin);
    setPartnerForm((prev) => ({ ...prev, name, code, link }));
  };

  const updatePartnerBank = (bankName: string) => {
    const bank = BANKS.find((b) => b.name === bankName);
    setPartnerForm((prev) => ({
      ...prev,
      bank: bankName,
      bankCode: bank?.code || "",
    }));
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      window.alert("클립보드에 복사되었습니다!");
    } catch {
      window.alert("복사에 실패했습니다.");
    }
  };

  const handleRegisterPartner = async (event: React.FormEvent) => {
    event.preventDefault();

    const db = getAdminFirestore();
    if (!db) {
      window.alert("Firebase가 초기화되지 않았습니다. 페이지를 새로고침 후 다시 시도해 주세요.");
      return;
    }

    if (!partnerForm.code.trim()) {
      window.alert("파트너 코드가 생성되지 않았습니다. 상호를 입력해 주세요.");
      return;
    }

    if (!partnerForm.accountAgreement) {
      window.alert("정산계좌 사용 동의는 필수입니다.");
      return;
    }

    setSubmitting(true);
    try {
      const partnerData = {
        name: partnerForm.name.trim(),
        contact: partnerForm.contact.trim(),
        phone: partnerForm.phone.trim(),
        email: partnerForm.email.trim() || null,
        code: partnerForm.code.trim(),
        link: partnerForm.link.trim(),
        bank: partnerForm.bank.trim(),
        bankCode: partnerForm.bankCode.trim(),
        accountNumber: partnerForm.accountNumber.trim(),
        accountHolder: partnerForm.accountHolder.trim(),
        accountAgreement: partnerForm.accountAgreement,
        accountAgreementDate: partnerForm.accountAgreement ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        status: "active",
      };

      await setDoc(doc(db, "ping_partners", partnerData.code), partnerData);
      window.alert("파트너가 성공적으로 등록되었습니다!");
      closePartnerModal();
      setLoading(true);
      await loadAllData();
    } catch (error) {
      console.error("[admin-monitoring] partner register failed", error);
      window.alert("파트너 등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePartner = async (partnerCode: string, partnerName: string) => {
    const db = getAdminFirestore();
    if (!db) {
      window.alert("Firebase가 초기화되지 않았습니다.");
      return;
    }

    const confirmed = window.confirm(
      `파트너 "${partnerName}" (${partnerCode})를 삭제하시겠습니까?\n\n주의: 이 작업은 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "ping_partners", partnerCode));
      window.alert("파트너가 성공적으로 삭제되었습니다.");
      setLoading(true);
      await loadAllData();
    } catch (error) {
      console.error("[admin-monitoring] partner delete failed", error);
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`파트너 삭제 중 오류가 발생했습니다.\n\n오류: ${message}`);
    }
  };

  return (
    <div className="admin-monitoring-page">
      <aside className="admin-monitoring-sidebar" aria-label="관리자 메뉴">
        <div className="admin-monitoring-sidebar__brand">
          PING Admin
          <small>PC 관리 콘솔</small>
        </div>
        <nav className="admin-monitoring-nav">
          <Link
            href="/admin/monitoring"
            className="admin-monitoring-nav__link admin-monitoring-nav__link--active"
          >
            <BarChart3 className="size-4 shrink-0" />
            통합모니터링
          </Link>
          <Link href="/admin/service-status" className="admin-monitoring-nav__link">
            <BarChart3 className="size-4 shrink-0" />
            서비스현황
          </Link>
          <Link href="/admin/partner" className="admin-monitoring-nav__link">
            <Users className="size-4 shrink-0" />
            파트너 대시보드
          </Link>
          <div className="admin-monitoring-nav__spacer" />
          <button
            type="button"
            className="admin-monitoring-nav__button"
            onClick={handleExport}
          >
            <Download className="size-4 shrink-0" />
            전체 데이터 다운로드
          </button>
          <button type="button" className="admin-monitoring-nav__button" onClick={handleLogout}>
            <LogOut className="size-4 shrink-0" />
            로그아웃
          </button>
          <Link href="/start" className="admin-monitoring-nav__link">
            <Home className="size-4 shrink-0" />
            홈으로
          </Link>
        </nav>
      </aside>

      <div className="admin-monitoring-main">
        <div className="admin-monitoring-main__inner">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="mb-2 text-3xl font-black text-white">통합모니터링</h1>
              <p className="text-white/90">전체 파트너 및 주문 관리 · 입금확인·발송</p>
              {usingMock && (
                <p className="mt-2 text-xs text-amber-400">
                  Firebase 데이터 없음 — 가상 통계를 표시 중입니다.
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={openPartnerModal}
              className="shrink-0 border-white/20 bg-white/20 text-white hover:bg-white/30"
            >
              <Plus className="size-4" />
              파트너 등록
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="admin-monitoring-stats mb-6">
          <StatCard
            label="전체 주문 수"
            value={stats.totalOrders.toLocaleString()}
            sub="전체 누적"
            icon={<ShoppingCart className="size-5 text-white" />}
            iconClass="from-ping-primary to-ping-primary-dark"
            accent="text-white"
          />
          <StatCard
            label="결제 완료"
            value={stats.paidOrders.toLocaleString()}
            sub="완료된 주문"
            icon={<CheckCircle2 className="size-5 text-white" />}
            iconClass="from-green-400 to-green-600"
            accent="text-green-400"
            subAccent="text-green-400"
          />
          <StatCard
            label="전체 매출"
            value={`${stats.totalRevenue.toLocaleString()}원`}
            sub="총 누적 매출"
            icon={<CircleDollarSign className="size-5 text-white" />}
            iconClass="from-purple-400 to-purple-600"
            accent="text-purple-400"
          />
          <button
            type="button"
            onClick={openPartnerModal}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-blue-400/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute -right-12 -top-12 size-24 rounded-full bg-orange-500 opacity-5" />
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  활성 파트너
                </p>
                <div className="flex size-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 shadow-md">
                  <Users className="size-5 text-white" />
                </div>
              </div>
              <p className="mb-2 text-3xl font-black text-orange-400">
                {stats.activePartners}명
              </p>
              <span className="flex items-center text-xs text-orange-400">
                클릭하여 파트너 등록
              </span>
            </div>
          </button>
        </div>

        {/* Partners */}
        <div className="mb-6 rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center text-2xl font-black text-white">
              <Users className="mr-3 size-6 text-ping-primary" />
              파트너별 통계
            </h2>
            <Button
              type="button"
              variant="outline"
              onClick={openPartnerModal}
              className="border-white/20 bg-white/20 text-white hover:bg-white/30"
            >
              <Plus className="size-4" />
              파트너 등록
            </Button>
          </div>
          <div className="admin-monitoring-table-wrap">
            <table className="admin-monitoring-table">
              <thead className="bg-gradient-to-br from-slate-700 to-slate-800">
                <tr>
                  {["상호", "담당자", "주문 수", "결제 완료", "총 매출", "발송 건수", "관리"].map(
                    (head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400"
                      >
                        {head}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8">
                      <div className="flex justify-center">
                        <PingLoadingSpinner variant="dark" label="데이터를 불러오는 중" />
                      </div>
                    </td>
                  </tr>
                ) : loadError === "permission" ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <PermissionDeniedMessage />
                    </td>
                  </tr>
                ) : partnerRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      등록된 파트너가 없습니다. 파트너를 등록해 주세요.
                    </td>
                  </tr>
                ) : (
                  partnerRows.map((partner) => (
                    <tr
                      key={partner.code}
                      className="transition-colors hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-indigo-500/20"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-white">{partner.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{partner.contact}</td>
                      <td className="px-4 py-3 text-sm text-white">{partner.totalOrders}</td>
                      <td className="px-4 py-3 text-sm font-bold text-green-400">
                        {partner.paidOrders}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-[#7dd3ea]">
                        {partner.totalRevenue.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {partner.totalCount.toLocaleString()}건
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={`/admin/partner?partner=${encodeURIComponent(partner.code)}&admin=true`}
                            className="inline-flex items-center text-xs font-medium text-[#7dd3ea] underline transition-colors hover:opacity-80"
                          >
                            <Eye className="mr-1 size-3" />
                            상세보기
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                `${window.location.origin}/start?partner=${encodeURIComponent(partner.code)}`,
                              )
                            }
                            className="inline-flex items-center text-xs text-green-400 underline transition-colors hover:text-green-300"
                          >
                            <Link2 className="mr-1 size-3" />
                            링크 복사
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePartner(partner.code, partner.name)}
                            className="inline-flex items-center text-xs text-red-400 underline transition-colors hover:text-red-300"
                          >
                            <Trash2 className="mr-1 size-3" />
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Orders */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center text-2xl font-black text-white">
              <BarChart3 className="mr-3 size-6 text-ping-primary" />
              전체 주문 목록
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              <Input
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                placeholder="파트너 필터"
                className="w-48 border-slate-600 bg-slate-800 text-white placeholder:text-slate-400"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ping-primary"
              >
                <option value="all">전체 상태</option>
                <option value="waiting_payment">결제 대기</option>
                <option value="waiting_bank_transfer">무통장 입금 대기</option>
                <option value="paid">결제 완료</option>
                <option value="cancelled">취소됨</option>
              </select>
            </div>
          </div>
          <div className="admin-monitoring-table-wrap">
            <table className="admin-monitoring-table">
              <thead className="bg-gradient-to-br from-slate-700 to-slate-800">
                <tr>
                  {[
                    "주문번호",
                    "파트너",
                    "신청자",
                    "연락처",
                    "플랜",
                    "발송건수",
                    "결제금액",
                    "상태",
                    "생성일",
                    "관리",
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8">
                      <div className="flex justify-center">
                        <PingLoadingSpinner variant="dark" label="데이터를 불러오는 중" />
                      </div>
                    </td>
                  </tr>
                ) : loadError === "permission" ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center">
                      <PermissionDeniedMessage />
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      주문 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const createdAt = toDate(order.createdAt);
                    const dateStr = createdAt.toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <tr
                        key={order.id}
                        className="transition-colors hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-indigo-500/20"
                      >
                        <td className="px-4 py-3 text-sm text-white">
                          {order.orderId || order.id}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="rounded bg-ping-primary/20 px-2 py-1 text-xs font-bold text-[#7dd3ea]">
                            {order.partner || "direct"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">{order.name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">{order.phone || "-"}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="rounded bg-slate-500/20 px-2 py-1 text-xs font-bold text-slate-300">
                            표준
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white">
                          {(order.count || 0).toLocaleString()}건
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#7dd3ea]">
                          {(order.totalAmount || 0).toLocaleString()}원
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex flex-wrap items-center gap-0.5">
                            {getStatusBadge(order.status)}
                            {getFulfillmentBadge(order)}
                          </span>
                          {order.paymentMethod === "bank_transfer" &&
                          order.cashReceiptType &&
                          PING_CASH_RECEIPT_TYPE_LABELS[
                            order.cashReceiptType as PingCashReceiptType
                          ] ? (
                            <p className="mt-1 text-[10px] text-slate-400">
                              {PING_CASH_RECEIPT_TYPE_LABELS[order.cashReceiptType as PingCashReceiptType]}
                              {order.cashReceiptVoluntary ? " · 자진발급" : ""}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">{dateStr}</td>
                        <td className="px-4 py-3 text-sm">
                          {order.status === "waiting_bank_transfer" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-500"
                              disabled={confirmingOrderId === (order.orderId || order.id)}
                              onClick={() => void handleConfirmBankDeposit(order)}
                            >
                              {confirmingOrderId === (order.orderId || order.id) ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Send className="size-3" />
                              )}
                              입금확인·발송
                            </Button>
                          ) : order.status === "paid" && order.smsStatus === "failed" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-slate-500 text-slate-200"
                              disabled={confirmingOrderId === (order.orderId || order.id)}
                              onClick={() => void handleConfirmBankDeposit(order)}
                            >
                              재발송
                            </Button>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
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

      {/* Partner modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900">파트너 등록</h2>
              <button
                type="button"
                onClick={closePartnerModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="닫기"
              >
                <X className="size-6" />
              </button>
            </div>
            <form onSubmit={handleRegisterPartner} className="space-y-4">
              <div>
                <Label htmlFor="partnerName">상호 *</Label>
                <Input
                  id="partnerName"
                  required
                  value={partnerForm.name}
                  onChange={(e) => updatePartnerName(e.target.value)}
                  placeholder="예: 서울장례식장"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="partnerContact">담당자명 *</Label>
                <Input
                  id="partnerContact"
                  required
                  value={partnerForm.contact}
                  onChange={(e) =>
                    setPartnerForm((prev) => ({ ...prev, contact: e.target.value }))
                  }
                  placeholder="예: 홍길동"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="partnerPhone">연락처 *</Label>
                <Input
                  id="partnerPhone"
                  type="tel"
                  required
                  value={partnerForm.phone}
                  onChange={(e) =>
                    setPartnerForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="010-1234-5678"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="partnerEmail">이메일</Label>
                <Input
                  id="partnerEmail"
                  type="email"
                  value={partnerForm.email}
                  onChange={(e) =>
                    setPartnerForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="example@email.com"
                  className="mt-2"
                />
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  정산계좌를 입력합니다.
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="partnerBank">은행명 *</Label>
                    <select
                      id="partnerBank"
                      required
                      value={partnerForm.bank}
                      onChange={(e) => updatePartnerBank(e.target.value)}
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">은행을 선택하세요</option>
                      {BANKS.map((bank) => (
                        <option key={bank.code} value={bank.name}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="partnerAccountNumber">계좌번호 *</Label>
                    <Input
                      id="partnerAccountNumber"
                      required
                      value={partnerForm.accountNumber}
                      onChange={(e) =>
                        setPartnerForm((prev) => ({
                          ...prev,
                          accountNumber: e.target.value,
                        }))
                      }
                      placeholder="계좌번호를 입력하세요 (숫자만 입력)"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="partnerAccountHolder">예금주 *</Label>
                    <Input
                      id="partnerAccountHolder"
                      required
                      value={partnerForm.accountHolder}
                      onChange={(e) =>
                        setPartnerForm((prev) => ({
                          ...prev,
                          accountHolder: e.target.value,
                        }))
                      }
                      placeholder="예금주명을 입력하세요"
                      className="mt-2"
                    />
                  </div>
                  <label className="flex items-center pt-2">
                    <input
                      type="checkbox"
                      required
                      checked={partnerForm.accountAgreement}
                      onChange={(e) =>
                        setPartnerForm((prev) => ({
                          ...prev,
                          accountAgreement: e.target.checked,
                        }))
                      }
                      className="size-4 rounded border-gray-300 text-ping-primary focus:ring-ping-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      위 파트너 사업자의 정산계좌를 사용하는데 동의합니다.
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="partnerCode">파트너 코드 (자동 생성)</Label>
                <Input
                  id="partnerCode"
                  readOnly
                  value={partnerForm.code}
                  placeholder="상호를 입력하면 자동 생성됩니다"
                  className="mt-2 bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="partnerLink">파트너 링크</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="partnerLink"
                    readOnly
                    value={partnerForm.link}
                    className="bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => copyText(partnerForm.link)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  등록하기
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closePartnerModal}
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  iconClass,
  accent = "text-white",
  subAccent = "text-slate-500",
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconClass: string;
  accent?: string;
  subAccent?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-blue-400/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
      <div className="absolute -right-12 -top-12 size-24 rounded-full bg-ping-primary opacity-[0.07]" />
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-md",
              iconClass,
            )}
          >
            {icon}
          </div>
        </div>
        <p className={cn("mb-2 text-3xl font-black", accent)}>{value}</p>
        <span className={cn("text-xs", subAccent)}>{sub}</span>
      </div>
    </div>
  );
}
