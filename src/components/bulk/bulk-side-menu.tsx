"use client";

import {
  Code,
  CreditCard,
  FileText,
  Handshake,
  Headset,
  HeartHandshake,
  Home,
  LogIn,
  MessageCircle,
  Shield,
  Store,
  Undo2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import "./bulk-side-menu.css";

const FLOWER_PARTNER_URL =
  "https://shop7.flowerbiz.co.kr/products/product-category/197";

type BulkSideMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function BulkSideMenu({ open, onClose }: BulkSideMenuProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const flowerOpen = () => {
    onClose();
    window.setTimeout(() => {
      window.open(FLOWER_PARTNER_URL, "_blank", "noopener,noreferrer");
    }, 320);
  };

  return (
    <>
      <button
        type="button"
        className={`side-menu-overlay${open ? " show" : ""}`}
        aria-label={open ? "메뉴 닫기" : undefined}
        aria-hidden={!open}
        onClick={onClose}
      />
      <div
        className={`side-menu${open ? " show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
      >
        <div className="side-menu-header">
          <div id="bulk-side-menu-title" className="side-menu-title">
            메뉴
          </div>
          <button
            type="button"
            className="side-menu-close"
            aria-label="메뉴 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <nav className="side-menu-content" aria-labelledby="bulk-side-menu-title">
          <a href="/products/ping" className="side-menu-item" onClick={onClose}>
            <Home className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            홈
          </a>
          <Link href="/mypage" className="side-menu-item" onClick={onClose}>
            <User className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            마이페이지
          </Link>
          <Link href="/login" className="side-menu-item" onClick={onClose}>
            <LogIn className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            로그인
          </Link>
          <Link href="/start?thankyou=1" className="side-menu-item" onClick={onClose}>
            <HeartHandshake className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            답례 문자 보내기
          </Link>
          <button type="button" className="side-menu-item" onClick={flowerOpen}>
            <Store className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            근조화환 보내기
          </button>
          <div className="side-menu-divider" />
          <a href="/customer-center" className="side-menu-item" onClick={onClose}>
            <Headset className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            고객센터
          </a>
          <a href="/partnership" className="side-menu-item" onClick={onClose}>
            <Handshake className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            제휴문의
          </a>
          <a href="/tech-blog" className="side-menu-item" onClick={onClose}>
            <Code className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            기술블로그
          </a>
          <div className="side-menu-divider" />
          <a
            href="/legal/terms-of-service?pingReturn=index"
            className="side-menu-item"
            onClick={onClose}
          >
            <FileText className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            이용약관
          </a>
          <a
            href="/legal/privacy-policy?pingReturn=index"
            className="side-menu-item"
            onClick={onClose}
          >
            <Shield className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            개인정보처리방침
          </a>
          <a
            href="/legal/refund-policy?pingReturn=index"
            className="side-menu-item"
            onClick={onClose}
          >
            <Undo2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            취소 및 환불정책
          </a>
          <a
            href="/legal/service-payment-guide?pingReturn=index"
            className="side-menu-item"
            onClick={onClose}
          >
            <CreditCard className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            서비스 및 결제 안내
          </a>
          <a
            href="http://pf.kakao.com/_jQZpn"
            target="_blank"
            rel="noopener noreferrer"
            className="side-menu-item"
            onClick={onClose}
          >
            <MessageCircle className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            카카오톡 문의
          </a>
        </nav>
      </div>
    </>
  );
}
