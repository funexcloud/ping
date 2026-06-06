"use client";

import { CalendarDays, Check, Clock, MapPin, MessageSquareText, Phone, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  compareAt?: number;
  badge: string;
  tone: "classic" | "premium" | "large" | "basket";
  description: string;
};

type SubmitState = "idle" | "sending" | "success" | "error";

const products: Product[] = [
  {
    id: "e-0067",
    name: "근조 3단 화환 고급형",
    price: 140000,
    compareAt: 154000,
    badge: "전국 당일배송",
    tone: "classic",
    description: "가장 많이 선택하는 표준형 근조 3단 화환",
  },
  {
    id: "e-5020",
    name: "근조 3단 화환 특대형",
    price: 150000,
    compareAt: 170000,
    badge: "추천",
    tone: "premium",
    description: "조문 공간에서 존재감이 좋은 특대 구성",
  },
  {
    id: "e-0069",
    name: "근조 3단 화환 왕특대",
    price: 180000,
    compareAt: 200000,
    badge: "격식형",
    tone: "large",
    description: "법인·단체 조문에 어울리는 대형 상품",
  },
  {
    id: "e-5028",
    name: "근조 바구니",
    price: 50000,
    compareAt: 65000,
    badge: "간편 접수",
    tone: "basket",
    description: "작은 빈소나 개인 조문에 부담 없는 구성",
  },
];

export function FlowerOrderClient() {
  const [selectedId, setSelectedId] = useState(products[0].id);
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const selected = useMemo(
    () => products.find((product) => product.id === selectedId) || products[0],
    [selectedId],
  );

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);

    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch("/api/flower-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.id,
          productName: selected.name,
          productPrice: selected.price,
          deliveryDate: String(fd.get("deliveryDate") || ""),
          deliveryTime: String(fd.get("deliveryTime") || ""),
          funeralHall: String(fd.get("funeralHall") || ""),
          mortuaryRoom: String(fd.get("mortuaryRoom") || ""),
          recipientName: String(fd.get("recipientName") || ""),
          ribbonLeft: String(fd.get("ribbonLeft") || ""),
          ribbonRight: String(fd.get("ribbonRight") || ""),
          senderName: String(fd.get("senderName") || ""),
          senderPhone: String(fd.get("senderPhone") || ""),
          payerName: String(fd.get("payerName") || ""),
          payerPhone: String(fd.get("payerPhone") || ""),
          requestNote: String(fd.get("requestNote") || ""),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; delivered?: string[] };
      if (!res.ok) throw new Error(data.error || "주문 접수 중 오류가 발생했습니다.");
      setStatus("success");
      setMessage(`주문 내용이 관리자에게 전달되었습니다.${data.delivered?.length ? ` (${data.delivered.join(", ")})` : ""}`);
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "주문 접수 중 오류가 발생했습니다.");
    }
  }

  return (
    <main className="flower-page">
      <header className="flower-header">
        <a href="/start" className="flower-logo" aria-label="PING 홈">
          <img src="/ping_logo_svg.svg" alt="PING" />
        </a>
        <nav>
          <a href="/start">부고 발송</a>
          <a href="/customer-center">고객센터</a>
        </nav>
      </header>

      <section className="flower-hero">
        <div className="flower-hero-copy">
          <span>근조화환 보내기</span>
          <h1>부고 확인 후 바로 접수하는 조문 화환</h1>
          <p>
            상품을 선택하고 장례식장, 빈소, 리본 문구만 입력하면 관리자에게 주문 내용이 전달됩니다.
            결제와 배송 확정은 접수 확인 후 안내됩니다.
          </p>
          <div className="flower-hero-points">
            <em>
              <Clock size={16} /> 당일배송 접수
            </em>
            <em>
              <MessageSquareText size={16} /> 리본 문구 전달
            </em>
            <em>
              <Phone size={16} /> 관리자 확인
            </em>
          </div>
        </div>
        <div className="flower-hero-visual" aria-hidden>
          <div className="flower-stand flower-stand--hero">
            <span />
            <i />
          </div>
        </div>
      </section>

      <section className="flower-products" aria-labelledby="flower-products-title">
        <div className="flower-section-head">
          <span>상품 선택</span>
          <h2 id="flower-products-title">근조화환 상품</h2>
        </div>
        <div className="flower-product-grid">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className={`flower-product-card ${selected.id === product.id ? "selected" : ""}`}
              onClick={() => setSelectedId(product.id)}
            >
              <div className={`flower-product-visual flower-product-visual--${product.tone}`}>
                <div className="flower-stand">
                  <span />
                  <i />
                </div>
              </div>
              <div className="flower-product-info">
                <div className="flower-product-topline">
                  <strong>{product.badge}</strong>
                  {selected.id === product.id ? (
                    <span>
                      <Check size={14} /> 선택됨
                    </span>
                  ) : null}
                </div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="flower-price-row">
                  <b>{product.price.toLocaleString("ko-KR")}원</b>
                  {product.compareAt ? <del>{product.compareAt.toLocaleString("ko-KR")}원</del> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="flower-order-layout">
        <aside className="flower-summary">
          <span>선택 상품</span>
          <div className={`flower-summary-visual flower-product-visual--${selected.tone}`}>
            <div className="flower-stand">
              <span />
              <i />
            </div>
          </div>
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
          <strong>{selected.price.toLocaleString("ko-KR")}원</strong>
          <small>접수 후 배송 가능 여부와 최종 결제 안내를 드립니다.</small>
        </aside>

        <form className="flower-order-form" onSubmit={submitOrder}>
          <div className="flower-section-head">
            <span>주문 정보</span>
            <h2>배송 및 리본 문구 입력</h2>
          </div>

          <div className="flower-form-grid">
            <Field label="희망 배송일" icon={<CalendarDays size={16} />} required>
              <input name="deliveryDate" type="date" required />
            </Field>
            <Field label="희망 시간" icon={<Clock size={16} />}>
              <select name="deliveryTime" defaultValue="빠른 배송">
                <option>빠른 배송</option>
                <option>오전</option>
                <option>오후</option>
                <option>저녁</option>
              </select>
            </Field>
            <Field label="장례식장" icon={<MapPin size={16} />} required>
              <input name="funeralHall" required placeholder="예: 서울아산병원 장례식장" />
            </Field>
            <Field label="빈소" required>
              <input name="mortuaryRoom" required placeholder="예: 23호실" />
            </Field>
            <Field label="받는 분">
              <input name="recipientName" placeholder="예: 상주 홍길동" />
            </Field>
            <Field label="보내는 분 연락처">
              <input name="senderPhone" type="tel" placeholder="010-0000-0000" />
            </Field>
          </div>

          <div className="flower-ribbon-box">
            <div>
              <span>리본 미리보기</span>
              <p>좌측에는 추모 문구, 우측에는 보내는 분 이름을 적어주세요.</p>
            </div>
            <div className="flower-ribbon-preview">
              <em>삼가 故人의 冥福을 빕니다</em>
              <b>{selected.name}</b>
              <em>보내는 분</em>
            </div>
          </div>

          <div className="flower-form-grid">
            <Field label="리본 좌측 문구" required>
              <input name="ribbonLeft" required defaultValue="삼가 故人의 冥福을 빕니다" />
            </Field>
            <Field label="리본 우측 문구" required>
              <input name="ribbonRight" required placeholder="예: 한국AIBC융합원 임직원 일동" />
            </Field>
            <Field label="보내는 분">
              <input name="senderName" placeholder="예: 한국AIBC융합원" />
            </Field>
            <Field label="주문자 성함" required>
              <input name="payerName" required placeholder="주문 확인 연락을 받을 분" />
            </Field>
            <Field label="주문자 연락처" required>
              <input name="payerPhone" type="tel" required placeholder="010-0000-0000" />
            </Field>
            <Field label="추가 요청사항">
              <textarea name="requestNote" rows={4} placeholder="배송 전 연락, 문구 확인 요청 등" />
            </Field>
          </div>

          {message ? <p className={`flower-message ${status}`}>{message}</p> : null}

          <button className="flower-submit" type="submit" disabled={status === "sending"}>
            <ShoppingBag size={18} />
            {status === "sending" ? "접수 중..." : "주문 내용 전달하기"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flower-field">
      <span>
        {icon}
        {label}
        {required ? <b>*</b> : null}
      </span>
      {children}
    </label>
  );
}
