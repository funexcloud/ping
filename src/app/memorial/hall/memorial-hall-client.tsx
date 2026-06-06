"use client";

import "./memorial-hall.css";
import {
  LegalDocModal,
  useLegalDocModal,
} from "@/components/legal/legal-doc-modal";
import { isMemorialAuthenticated } from "@/lib/memorial-auth-session";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";

const FLOWERS = ["🌸", "🌺", "🌻", "🌷", "🌹", "💐"] as const;
const PETAL_COLORS = ["pink", "white", "yellow", "red"] as const;

type TributeItem = {
  id: string;
  author: string;
  date: string;
  flower: string;
};

type MessageItem = {
  id: string;
  author: string;
  date: string;
  content: string;
};

type PhotoItem = {
  id: string;
  src: string;
};

const INITIAL_TRIBUTES: TributeItem[] = [
  { id: "1", author: "김철수", date: "2024.12.26 14:30", flower: "🌸" },
  { id: "2", author: "이영희", date: "2024.12.26 15:20", flower: "🌺" },
];

const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: "1",
    author: "김철수",
    date: "2024.12.26 14:30",
    content: "고인의 명복을 빕니다. 평소 따뜻하게 대해주셔서 감사했습니다.",
  },
  {
    id: "2",
    author: "이영희",
    date: "2024.12.26 15:20",
    content: "좋은 분이셨습니다. 편안히 쉬시길 바랍니다.",
  },
];

function formatDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${h}:${min}`;
}

function randomFlower(): string {
  return FLOWERS[Math.floor(Math.random() * FLOWERS.length)]!;
}

export default function MemorialHallClient() {
  const router = useRouter();
  const legalModal = useLegalDocModal();
  const idPrefix = useId();

  const [authReady, setAuthReady] = useState(false);
  const [tributeModalOpen, setTributeModalOpen] = useState(false);
  const [tributeAuthorName, setTributeAuthorName] = useState("");
  const [tributes, setTributes] = useState<TributeItem[]>(INITIAL_TRIBUTES);
  const [messages, setMessages] = useState<MessageItem[]>(INITIAL_MESSAGES);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [messageAuthor, setMessageAuthor] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [animationHidden, setAnimationHidden] = useState(true);
  const [animationMessage, setAnimationMessage] = useState(
    "고인의 명복을 빕니다 🙏",
  );

  const animationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const petalTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hideAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearPetalTimeouts = useCallback(() => {
    petalTimeoutsRef.current.forEach(clearTimeout);
    petalTimeoutsRef.current = [];
  }, []);

  useEffect(() => {
    if (!isMemorialAuthenticated()) {
      router.replace("/memorial/auth");
      return;
    }
    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    return () => {
      clearPetalTimeouts();
      if (hideAnimationTimeoutRef.current) {
        clearTimeout(hideAnimationTimeoutRef.current);
      }
    };
  }, [clearPetalTimeouts]);

  const showTributeAnimation = useCallback(
    (authorName: string) => {
      setAnimationMessage(`${authorName}님이 헌화하셨습니다 🙏`);
      setAnimationHidden(false);

      const animation = animationRef.current;
      if (!animation) return;

      clearPetalTimeouts();
      if (hideAnimationTimeoutRef.current) {
        clearTimeout(hideAnimationTimeoutRef.current);
      }

      animation.querySelectorAll(".tribute-petal").forEach((petal) => {
        petal.remove();
      });

      const petalCount = 100;
      for (let i = 0; i < petalCount; i++) {
        const timeoutId = setTimeout(() => {
          const petal = document.createElement("div");
          const color =
            PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]!;
          petal.className = `tribute-petal ${color}`;
          petal.style.left = `${Math.random() * 100}%`;
          petal.style.animationDelay = `${Math.random() * 0.5}s`;
          petal.style.animationDuration = `${4 + Math.random() * 3}s`;
          const size = 8 + Math.random() * 8;
          petal.style.width = `${size}px`;
          petal.style.height = `${size}px`;
          animation.appendChild(petal);
          setTimeout(() => {
            petal.remove();
          }, 7000);
        }, i * 30);
        petalTimeoutsRef.current.push(timeoutId);
      }

      hideAnimationTimeoutRef.current = setTimeout(() => {
        setAnimationHidden(true);
        animation.querySelectorAll(".tribute-petal").forEach((petal) => {
          petal.remove();
        });
      }, 3000);
    },
    [clearPetalTimeouts],
  );

  const openTributeModal = () => {
    setTributeModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeTributeModal = () => {
    setTributeModalOpen(false);
    setTributeAuthorName("");
    document.body.style.overflow = "";
  };

  const submitTribute = (e: FormEvent) => {
    e.preventDefault();
    const authorName = tributeAuthorName.trim();
    if (!authorName) {
      alert("이름을 입력해주세요.");
      return;
    }
    closeTributeModal();
    const dateStr = formatDateTime(new Date());
    const flower = randomFlower();
    setTributes((prev) => [
      {
        id: `${idPrefix}-tribute-${Date.now()}`,
        author: authorName,
        date: dateStr,
        flower,
      },
      ...prev,
    ]);
    showTributeAnimation(authorName);
  };

  const submitMessage = () => {
    const author = messageAuthor.trim();
    const content = messageContent.trim();
    if (!author || !content) {
      alert("이름과 메시지를 모두 입력해주세요.");
      return;
    }
    const dateStr = formatDateTime(new Date());
    setMessages((prev) => [
      {
        id: `${idPrefix}-message-${Date.now()}`,
        author,
        date: dateStr,
        content,
      },
      ...prev,
    ]);
    setMessageAuthor("");
    setMessageContent("");
    alert("추모 메시지가 등록되었습니다.");
  };

  const uploadPhoto = () => {
    fileInputRef.current?.click();
  };

  const onPhotoFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result;
        if (typeof src !== "string") return;
        setPhotos((prev) => [
          ...prev,
          { id: `${idPrefix}-photo-${Date.now()}-${Math.random()}`, src },
        ]);
      };
      reader.readAsDataURL(file);
    });
    alert(
      `${files.length}개의 사진이 선택되었습니다. 업로드 기능은 준비 중입니다.`,
    );
  };

  if (!authReady) {
    return null;
  }

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
            <span className="service-badge">추모 서비스</span>
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
          <div className="hero-content">
            <div className="hero-badge">영구추모관</div>
            <h1 className="hero-title">소중한 분을 기억하며 추모합니다</h1>
            <p className="hero-subtitle">
              PING 이용자를 위한 디지털 추모 공간입니다.
              <br />
              고인의 발자취를 기록하고, 따뜻한 마음을 나눌 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <main className="main-content" id="main-content">
        <div className="container">
          <div className="memorial-notice">
            <div className="memorial-notice-title">✨ 영구추모관 안내</div>
            <div className="memorial-notice-content">
              영구추모관은 고인의 정보를 안전하게 보관하고, 추모 메시지와
              사진을 오래도록 관리할 수 있는 디지털 추모 서비스입니다.
            </div>
          </div>

          <section className="section">
            <h2 className="section-title">고인 정보</h2>
            <div className="deceased-card">
              <div className="deceased-header">
                <div>
                  <div className="deceased-name">
                    <span className="deceased-prefix">故</span>
                    <span id="deceased-name">홍길동</span>
                    <span className="religion-badge" id="religion-badge">
                      기독교
                    </span>
                  </div>
                  <div className="deceased-info">
                    <div>생년월일: 1940년 1월 1일</div>
                    <div>별세일: 2024년 12월 25일</div>
                    <div>향년: 85세</div>
                  </div>
                </div>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">장례식장</span>
                  <span className="info-value" id="funeral-hall">
                    서울추모관
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">장례 기간</span>
                  <span className="info-value" id="funeral-period">
                    2024.12.25 ~ 2024.12.27
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">종교</span>
                  <span className="info-value" id="religion">
                    기독교
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">1차 장지</span>
                  <span className="info-value" id="primary-burial-site">
                    서울시립승화원
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">2차 장지</span>
                  <span className="info-value" id="secondary-burial-site">
                    -
                  </span>
                </div>
                <div className="info-item funeral-director">
                  <span className="info-label">담당 장례지도사</span>
                  <span className="info-value" id="funeral-director-name">
                    홍길동 (010-1234-5678)
                  </span>
                </div>
              </div>
              <div className="tribute-section">
                <button
                  type="button"
                  className="tribute-btn"
                  onClick={openTributeModal}
                >
                  <span className="tribute-icon">🌸</span>
                  <span>헌화하기</span>
                </button>
              </div>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">헌화 목록</h2>
            <div className="tribute-list" id="tribute-list">
              {tributes.map((t) => (
                <div key={t.id} className="tribute-item">
                  <div className="tribute-header">
                    <span className="tribute-author">{t.author}</span>
                    <span className="tribute-date">{t.date}</span>
                  </div>
                  <div className="tribute-icon-small">{t.flower}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">추모 사진</h2>
            <div className="photo-grid" id="photo-grid">
              {photos.length === 0 ? (
                <div className="photo-empty-state" id="photo-empty-state">
                  <Image
                    src="/assets/images/memorial-empty.svg"
                    alt="추모 사진 없음"
                    className="empty-state-image"
                    width={200}
                    height={200}
                  />
                  <p className="empty-state-text">등록된 추모 사진이 없습니다</p>
                  <p className="empty-state-subtext">
                    고인을 기억하는 사진을 업로드해주세요
                  </p>
                </div>
              ) : null}
              {photos.map((p) => (
                <div key={p.id} className="photo-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="추모 사진" />
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                onPhotoFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
            <div
              className="upload-area"
              role="button"
              tabIndex={0}
              onClick={uploadPhoto}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  uploadPhoto();
                }
              }}
            >
              <div className="upload-icon">📷</div>
              <div className="upload-text">
                사진을 업로드하여 고인을 기억하세요
              </div>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">추모 메시지</h2>
            <div className="message-list" id="message-list">
              {messages.map((m) => (
                <div key={m.id} className="message-item">
                  <div className="message-header">
                    <span className="message-author">{m.author}</span>
                    <span className="message-date">{m.date}</span>
                  </div>
                  <div className="message-content">{m.content}</div>
                </div>
              ))}
            </div>
            <div className="message-form">
              <div className="form-group">
                <label className="form-label" htmlFor="message-author">
                  이름
                </label>
                <input
                  type="text"
                  className="form-input"
                  id="message-author"
                  placeholder="이름을 입력하세요"
                  value={messageAuthor}
                  onChange={(e) => setMessageAuthor(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="message-content">
                  추모 메시지
                </label>
                <textarea
                  className="form-input form-textarea"
                  id="message-content"
                  placeholder="고인에 대한 추모의 마음을 전해주세요"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="submit-btn"
                onClick={submitMessage}
              >
                메시지 남기기
              </button>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">추모 일정</h2>
            <div className="schedule-list" id="schedule-list">
              <div className="schedule-item">
                <div className="schedule-date">
                  <div className="schedule-day">25</div>
                  <div className="schedule-month">12월</div>
                </div>
                <div className="schedule-content">
                  <div className="schedule-title">입관식</div>
                  <div className="schedule-desc">오후 2시, 서울추모관</div>
                </div>
              </div>
              <div className="schedule-item">
                <div className="schedule-date">
                  <div className="schedule-day">27</div>
                  <div className="schedule-month">12월</div>
                </div>
                <div className="schedule-content">
                  <div className="schedule-title">발인식</div>
                  <div className="schedule-desc">오전 10시, 서울추모관</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div
        className={`tribute-modal-overlay${tributeModalOpen ? " show" : ""}`}
        id="tribute-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeTributeModal();
        }}
      >
        <div
          className="tribute-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal
          aria-labelledby="tribute-modal-title"
        >
          <h3 className="tribute-modal-title" id="tribute-modal-title">
            🌸 헌화하기
          </h3>
          <p className="tribute-modal-subtitle">
            고인을 기억하는 마음을 전해주세요
          </p>
          <form className="tribute-modal-form" onSubmit={submitTribute}>
            <input
              type="text"
              className="tribute-modal-input"
              id="tribute-author-name"
              placeholder="이름을 입력하세요"
              value={tributeAuthorName}
              onChange={(e) => setTributeAuthorName(e.target.value)}
              required
            />
            <div className="tribute-modal-buttons">
              <button
                type="button"
                className="tribute-modal-btn tribute-modal-btn-secondary"
                onClick={closeTributeModal}
              >
                취소
              </button>
              <button
                type="submit"
                className="tribute-modal-btn tribute-modal-btn-primary"
              >
                헌화하기
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        ref={animationRef}
        className={`tribute-animation${animationHidden ? " hidden" : ""}`}
        id="tribute-animation"
      >
        <div className="tribute-message" id="tribute-message">
          {animationMessage}
        </div>
      </div>

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
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => legalModal.openModal("terms")}
            >
              이용약관
            </button>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => legalModal.openModal("privacy")}
            >
              개인정보처리방침
            </button>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => legalModal.openModal("refund")}
            >
              환불정책
            </button>
            <button
              type="button"
              className="footer-legal-btn"
              onClick={() => legalModal.openModal("copyright")}
            >
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
