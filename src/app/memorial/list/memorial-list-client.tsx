"use client";

import "./memorial-list.css";
import { MEMORIAL_LIST_ITEMS } from "@/app/memorial/list/memorial-list-data";
import {
  LegalDocModal,
  useLegalDocModal,
} from "@/components/legal/legal-doc-modal";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function MemorialListClient() {
  const [query, setQuery] = useState("");
  const legalModal = useLegalDocModal();

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return MEMORIAL_LIST_ITEMS;
    return MEMORIAL_LIST_ITEMS.filter((m) => m.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="ping-ui">
      <header>
        <div className="header-container">
          <Link href="/products/ping" className="logo">
            <Image
              src="/ping_logo_svg.svg"
              className="logo-img"
              alt="PING"
              width={200}
              height={100}
              priority
            />
          </Link>
          <div className="header-right">
            <Link href="/start" className="cta-button">
              신청하기
            </Link>
            <nav className="nav-links">
              <Link href="/products/ping" className="nav-link">
                홈으로
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1 className="hero-title">추모관 목록</h1>
          <p className="hero-subtitle">소중한 분들을 기억하며 추모하는 공간입니다</p>
          <div className="search-section">
            <div className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="고인 성함으로 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" className="search-btn">
                검색
              </button>
            </div>
          </div>
        </div>
      </section>

      <main>
        <div className="container">
          <div className="memorial-grid">
            {filtered.map((m) => (
              <Link
                key={m.id}
                href={`/memorial/auth?id=${m.id}`}
                className="memorial-card"
              >
                <div className="memorial-header">
                  <div>
                    <div className="memorial-name">
                      <span className="memorial-prefix">故</span>
                      <span>{m.name}</span>
                    </div>
                    <span className="memorial-religion">{m.religion}</span>
                  </div>
                </div>
                <div className="memorial-info">
                  <div className="memorial-info-item">
                    <span className="memorial-info-label">별세일</span>
                    <span>{m.deathDate}</span>
                  </div>
                  <div className="memorial-info-item">
                    <span className="memorial-info-label">향년</span>
                    <span>{m.age}</span>
                  </div>
                  <div className="memorial-info-item">
                    <span className="memorial-info-label">장지</span>
                    <span>{m.burialPlace}</span>
                  </div>
                </div>
                <div className="memorial-stats">
                  <div className="memorial-stat">
                    <div className="memorial-stat-value">{m.tributes}</div>
                    <div className="memorial-stat-label">헌화</div>
                  </div>
                  <div className="memorial-stat">
                    <div className="memorial-stat-value">{m.messages}</div>
                    <div className="memorial-stat-label">추모 메시지</div>
                  </div>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && query.trim() ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-text">검색 결과가 없습니다</div>
                <div className="empty-state-subtext">다른 검색어로 시도해보세요</div>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <footer>
        <div className="container">
          <div className="footer-top">
            <div className="footer-section">
              <h3>PING</h3>
              <Link href="/products/ping#features">기능</Link>
              <Link href="/products/ping#how-it-works">사용방법</Link>
            </div>
            <div className="footer-section">
              <h3>메모리얼파크</h3>
              <Link href="/memorial/list">추모관</Link>
              <Link href="/memorial/auth">추모관(프리미엄 전용)</Link>
            </div>
          </div>
          <div className="footer-legal">
            <button type="button" onClick={() => legalModal.openModal("terms")}>
              이용약관
            </button>
            <button type="button" onClick={() => legalModal.openModal("privacy")}>
              개인정보처리방침
            </button>
            <button type="button" onClick={() => legalModal.openModal("refund")}>
              환불정책
            </button>
            <button type="button" onClick={() => legalModal.openModal("copyright")}>
              저작권 안내
            </button>
          </div>
          <p className="footer-copyright">© PING. All rights reserved.</p>
        </div>
      </footer>

      <LegalDocModal {...legalModal} />
    </div>
  );
}
