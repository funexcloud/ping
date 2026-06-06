"use client";

import { ChevronDown, Moon, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";

type SubmitState = "idle" | "sending" | "success" | "error";

const feeGroups = [
  ["sms", "SMS", "10.0원"],
  ["lms", "LMS", "45.0원"],
  ["mms", "MMS", "110.0원"],
  ["ata", "ATA", "13.0원"],
  ["cta", "CTA", "19.0원"],
  ["cti", "CTI", "29.0원"],
  ["nsa", "NSA", "13.0원"],
  ["rcsSms", "RCS_SMS", "18.0원"],
  ["rcsLms", "RCS_LMS", "45.0원"],
  ["rcsMms", "RCS_MMS", "110.0원"],
  ["voice", "VOICE", "200.0원"],
  ["fax", "FAX", "100.0원"],
  ["bmsText", "BMS_TEXT", "53.0원"],
  ["bmsImage", "BMS_IMAGE", "83.0원"],
  ["bmsWide", "BMS_WIDE", "88.0원"],
  ["bmsCarousel", "BMS_CAROUSEL_FEED", "103.0원"],
  ["bmsCommerce", "BMS_COMMERCE", "103.0원"],
  ["bmsPremiumVideo", "BMS_PREMIUM_VIDEO", "103.0원"],
] as const;

const swatches = [
  "#ff1744",
  "#ff9100",
  "#ffd600",
  "#8bc34a",
  "#20c997",
  "#00bcd4",
  "#3f51b5",
  "#7c4dff",
  "#d500f9",
  "#2196f3",
  "#80deea",
  "#a5d6a7",
  "#111111",
  "#777777",
  "#dddddd",
  "#ffffff",
];

export function SolapiMySiteClient() {
  const [mainColor, setMainColor] = useState("#4541ff");
  const [subColor, setSubColor] = useState("#f50057");
  const [logoFileName, setLogoFileName] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const previewStyle = useMemo(
    () =>
      ({
        "--mysite-main": mainColor,
        "--mysite-sub": subColor,
      }) as React.CSSProperties,
    [mainColor, subColor],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const fees = Object.fromEntries(feeGroups.map(([key]) => [key, String(fd.get(key) || "")]));

    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch("/api/solapi-mysite-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: String(fd.get("siteName") || ""),
          subdomain: String(fd.get("subdomain") || ""),
          logoFileName,
          fees,
          customerCenter: {
            phone: String(fd.get("supportPhone") || ""),
            homepage: String(fd.get("supportHomepage") || ""),
            email: String(fd.get("supportEmail") || ""),
          },
          consoleSettings: {
            leftMenu: String(fd.get("leftMenu") || ""),
            header: String(fd.get("header") || ""),
            solapiCenter: String(fd.get("solapiCenter") || ""),
          },
          colors: {
            main: mainColor,
            sub: subColor,
          },
          note: String(fd.get("note") || ""),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; delivered?: string[] };
      if (!res.ok) throw new Error(data.error || "전송 중 오류가 발생했습니다.");
      setStatus("success");
      setMessage(`요청 내용이 전달되었습니다.${data.delivered?.length ? ` (${data.delivered.join(", ")})` : ""}`);
      form.reset();
      setLogoFileName("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "전송 중 오류가 발생했습니다.");
    }
  }

  return (
    <main className="mysite-shell">
      <aside className="mysite-sidebar" aria-hidden>
        <div className="mysite-rail">
          <span>★</span>
          <span>▣</span>
          <span>✦</span>
          <span>▤</span>
          <span>⬢</span>
          <span>♟</span>
        </div>
        <div className="mysite-menu">
          <input placeholder="전체 메뉴 검색..." />
          <p>개발</p>
          <a>API Key</a>
          <a>SDK 다운로드</a>
          <a>Webhooks</a>
          <a>내 앱</a>
          <a className="active">마이사이트</a>
          <a>승인 내역</a>
          <a>개발 문서</a>
          <a>Github Discussions</a>
        </div>
      </aside>

      <section className="mysite-content">
        <header className="mysite-topbar">
          <strong>SOLAPI 마이사이트</strong>
          <div>
            <span>잔액 249.321원</span>
            <button type="button">Funex cloud</button>
          </div>
        </header>

        <div className="mysite-page">
          <div className="mysite-toolbar">
            <h1>API Keys</h1>
            <div>
              <button type="button">DOCUMENT</button>
              <button type="button">COMMUNITY</button>
            </div>
          </div>
          <div className="mysite-table">
            <button type="button">마이사이트 생성</button>
            {[1, 2, 3].map((row) => (
              <div key={row} className="mysite-row">
                <span>마이사이트 이름</span>
                <button type="button">
                  마이사이트 관리 <ChevronDown size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mysite-dim" />

      <form className="mysite-modal" onSubmit={handleSubmit}>
        <div className="mysite-modal-head">
          <h2>마이사이트 생성</h2>
          <button type="button" aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        <div className="mysite-modal-body">
          <Section title="1. 마이사이트 이름정하기">
            <input name="siteName" required className="mysite-input" />
            <p className="mysite-hint">사용자에게 보여지는 서비스명입니다. (추후 변경 가능)</p>
          </Section>

          <Section title="2. 마이사이트 주소정하기">
            <div className="mysite-domain">
              <span>https://</span>
              <input name="subdomain" required />
              <span>.solapi.com</span>
            </div>
            <p className="mysite-hint">영문 소문자, 숫자 입력 가능</p>
          </Section>

          <Section title="3. 로고 이미지 업로드">
            <label className="mysite-upload">
              <Upload size={18} />
              <span>로고 이미지</span>
              <small>{logoFileName || "이곳에 파일 끌어오기 혹은 찾아보기"}</small>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setLogoFileName(event.target.files?.[0]?.name || "")}
              />
            </label>
          </Section>

          <Section title="추가수익금 설정">
            <p className="mysite-section-copy">
              사용자가 내 마이사이트를 통한 발송 시 비용에 반영됩니다.
              <br />
              기본수익금은 추후 변경이 불가능하오니 신중하게 설정해주세요.
            </p>
            <div className="mysite-fee-grid">
              {feeGroups.map(([key, label, base]) => (
                <label key={key} className="mysite-fee">
                  <span>{label} ⓘ</span>
                  <div>
                    <input name={key} defaultValue="0.1" inputMode="decimal" />
                    <em>원</em>
                  </div>
                  <small>기본:{base}</small>
                  <small>수익금:0.0원</small>
                  <small>발송단가:{base}</small>
                </label>
              ))}
            </div>
          </Section>

          <Section title="고객센터 설정">
            <Field label="고객센터 연락처">
              <input name="supportPhone" defaultValue="02-930-2266" className="mysite-input" />
            </Field>
            <Field label="서비스 홈페이지 주소 (선택 사항)">
              <input name="supportHomepage" defaultValue="https://solapi.com" className="mysite-input" />
            </Field>
            <Field label="알림 발신 이메일 (선택 사항)">
              <input name="supportEmail" type="email" defaultValue="help@solapi.com" className="mysite-input" />
            </Field>
          </Section>

          <Section title="마이사이트 콘솔 설정">
            <div className="mysite-radio-grid">
              <RadioGroup name="leftMenu" label="홈페이지 좌측 메뉴" />
              <RadioGroup name="header" label="홈페이지 상단 헤더" />
              <RadioGroup name="solapiCenter" label="솔라피 고객센터" />
            </div>
          </Section>

          <div className="mysite-color-grid">
            <ColorPanel title="대시보드 메인 컬러 설정" value={mainColor} onChange={setMainColor} />
            <ColorPanel title="대시보드 서브 컬러 설정" value={subColor} onChange={setSubColor} />
          </div>

          <Section title="미리보기">
            <p className="mysite-hint">색상 선택 후 글자 가독성을 확인하세요.</p>
            <div className="mysite-preview" style={previewStyle}>
              <p className="main-text">메인 컬러 텍스트 미리보기</p>
              <p className="sub-text">서브 컬러 텍스트 미리보기</p>
              <div className="mysite-preview-actions">
                <button type="button" className="main-button">
                  메인 컬러 버튼
                </button>
                <button type="button" className="sub-button">
                  서브 컬러 버튼
                </button>
                <button type="button" className="main-outline">
                  메인 컬러 버튼
                </button>
                <button type="button" className="sub-outline">
                  서브 컬러 버튼
                </button>
              </div>
              <div className="mysite-preview-checks">
                <label>
                  <input type="radio" defaultChecked /> 메인 컬러 선택지
                </label>
                <label>
                  <input type="radio" defaultChecked /> 서브 컬러 선택지
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> 메인 컬러 선택지
                </label>
                <label>
                  <input type="checkbox" defaultChecked /> 서브 컬러 선택지
                </label>
              </div>
              <div className="mysite-preview-inputs">
                <label>입력창</label>
                <input placeholder="입력창" />
              </div>
              <div className="mysite-toast">
                <strong>Hello world</strong>
                <span>CLOSE</span>
              </div>
            </div>
          </Section>

          <Section title="추가 메모">
            <textarea
              name="note"
              className="mysite-textarea"
              placeholder="전달할 요청사항이 있으면 입력해주세요."
            />
          </Section>
        </div>

        <div className="mysite-submit-bar">
          {message ? <p className={`mysite-message ${status}`}>{message}</p> : null}
          <button type="submit" disabled={status === "sending"}>
            {status === "sending" ? "전달 중..." : "마이사이트 생성"}
          </button>
          <div className="mysite-bottom-actions">
            <span>
              <Moon size={14} /> 채팅 문의
            </span>
            <span>닫기</span>
          </div>
        </div>
      </form>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mysite-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mysite-field">
      <span>{label}</span>
      {children}
      <small>내 마이사이트 화면에 표시되는 정보입니다. 정확하게 입력해주세요.</small>
    </label>
  );
}

function RadioGroup({ name, label }: { name: string; label: string }) {
  return (
    <fieldset>
      <legend>{label} ⓘ</legend>
      <label>
        <input type="radio" name={name} value="표시" defaultChecked /> 표시
      </label>
      <label>
        <input type="radio" name={name} value="숨기기" /> 숨기기
      </label>
    </fieldset>
  );
}

function ColorPanel({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const rgb = hexToRgb(value);

  return (
    <section className="mysite-color-panel">
      <h3>{title}</h3>
      <label className="mysite-picker" style={{ background: `linear-gradient(135deg, #fff, ${value} 55%, #000)` }}>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      <div className="mysite-hue" style={{ "--selected": value } as React.CSSProperties} />
      <div className="mysite-color-values">
        <input value={value.replace("#", "").toUpperCase()} readOnly />
        <input value={rgb.r} readOnly />
        <input value={rgb.g} readOnly />
        <input value={rgb.b} readOnly />
        <input value="100" readOnly />
      </div>
      <div className="mysite-swatches">
        {swatches.map((swatch) => (
          <button
            key={swatch}
            type="button"
            style={{ backgroundColor: swatch }}
            aria-label={`${swatch} 선택`}
            onClick={() => onChange(swatch)}
          />
        ))}
      </div>
    </section>
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}
