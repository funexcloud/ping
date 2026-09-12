import { PING_LOGO_MARK_SRC } from "@/lib/ping-brand";

/** Auto-derived from intro.html — 데모 단계 HTML (`/start` → 발송완료 흐름) */
const MAIN_ADVANCE_MS = 1650;
const FLASH_ADVANCE_MS = 1280;

const DEMO_URL = "https://www.ulsan.go.kr/funeral/obituary/kim-youngsoo";
const DEMO_COUNT = 248;
const DEMO_TOTAL = "27,280";
const DEMO_ORDER_ID = "PING-20260406-3842";

const GOOGLE_G_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;

export function flashCard(titleHtml: string, subtitle?: string): string {
    return `
            <div class="cx-flash-inner">
                <div class="spinner cx-flash-spin" aria-hidden="true"></div>
                <div class="cx-flash-title">${titleHtml}</div>
                ${subtitle ? `<div class="cx-flash-sub">${subtitle}</div>` : ''}
            </div>
        `;
}

function flowProgress(current: number): string {
    const pctText = current >= 8 ? '완료' : `${Math.round((current / 8) * 100)}%`;
    const bars = Array.from({ length: 8 }, (_, i) => {
        const n = i + 1;
        return `<span class="intro-flow-step__bar${n <= current ? ' is-on' : ''}"></span>`;
    }).join('\n                        ');

    return `
                <div class="intro-flow-step__progress" aria-hidden="true">
                    <div class="intro-flow-step__bars">
                        ${bars}
                    </div>
                    <div class="intro-flow-step__meta">
                        <p class="intro-flow-step__label">
                            <span class="intro-flow-step__label-num">${current}</span><span class="intro-flow-step__label-muted"> / 8</span>
                        </p>
                        <span class="intro-flow-step__pct">${pctText}</span>
                    </div>
                </div>`;
}

function flowShell(progress: string, panel: string): string {
    return `
            <div class="intro-flow-step">
                ${progress}
                <div class="intro-flow-step__card ping-bordered-panel min-w-0 max-w-full">
                    ${panel}
                </div>
            </div>`;
}

function stepHead(subtitle: string, lead = false): string {
    const mod = lead ? 'ping-step-head--lead' : 'ping-step-head--panel';
    return `
                    <div class="ping-step-head ${mod} intro-flow-step__head">
                        <p class="ping-step-head__sub">${subtitle}</p>
                    </div>`;
}

export const mainStages = [
    {
        label: '1단계 · 부고 주소 입력',
        advanceMs: MAIN_ADVANCE_MS,
        html: flowShell(
            flowProgress(1),
            `
                    <p class="intro-flow-step__eyebrow">부고 발송</p>
                    ${stepHead('링크를 붙여넣으면 문자 내용을 자동으로 가져올게요')}
                    <div class="intro-flow-step__input-wrap">
                        <div class="intro-flow-step__field intro-flow-step__field--valid">${DEMO_URL}</div>
                    </div>`,
        ),
    },
    {
        label: '2단계 · 부고 문자 확인',
        advanceMs: MAIN_ADVANCE_MS,
        html: flowShell(
            flowProgress(2),
            `
                    ${stepHead('제목·본문을 확인하고 필요하면 수정해 주세요')}
                    <div class="intro-compose__title-wrap">
                        <div class="intro-flow-step__field intro-compose__title">[부고] 父 김영수(金永洙)님 별세</div>
                        <span class="intro-compose__title-count">19 / 40</span>
                    </div>
                    <div class="intro-compose__body-shell">
                        <div class="intro-compose__textarea">父 김영수(金永洙)님께서 별세하셨기에 삼가 알려드립니다.<br><br>· 빈소 : 울산하늘공원 3호실<br>· 발인 : 6월 20일 오전 7시<br><br>{{LINK}} 를 눌러 부고를 확인해 주세요.</div>
                        <div class="intro-compose__toolbar">
                            <div class="intro-compose__toolbar-left">
                                <span class="intro-compose__tool" aria-hidden="true">📄</span>
                                <span class="intro-compose__tool" aria-hidden="true">🖼</span>
                            </div>
                            <span class="intro-compose__bytes">186 / 2,000 Bytes</span>
                        </div>
                    </div>`,
        ),
    },
    {
        label: '3단계 · 연락처 가져오기',
        advanceMs: MAIN_ADVANCE_MS,
        html: flowShell(
            flowProgress(3),
            `
                    <h2 class="ping-mobile-title">연락처</h2>
                    <p class="ping-mobile-count-line">내 연락처 <strong>${DEMO_COUNT}명</strong></p>
                    ${stepHead('Google 연락처 또는 주소록 파일을 선택해 주세요')}
                    <div class="intro-pick__stack">
                        <div class="intro-pick__btn">${GOOGLE_G_SVG}<span>Google 연락처</span></div>
                        <div class="intro-pick__btn intro-pick__btn--file"><span class="intro-pick__file-icon" aria-hidden="true">📄</span><span>네이버 주소록 파일</span></div>
                    </div>
                    <div class="ping-mobile-row">
                        <span class="ping-mobile-check is-on"></span>
                        <span class="ping-mobile-avatar">김</span>
                        <div class="ping-mobile-row__text">
                            <p class="ping-mobile-row__name">김지훈</p>
                            <p class="ping-mobile-row__phone">010-1234-****</p>
                        </div>
                    </div>
                    <div class="ping-mobile-row">
                        <span class="ping-mobile-check is-on"></span>
                        <span class="ping-mobile-avatar">이</span>
                        <div class="ping-mobile-row__text">
                            <p class="ping-mobile-row__name">이서연</p>
                            <p class="ping-mobile-row__phone">010-2345-****</p>
                        </div>
                    </div>`,
        ),
    },
    {
        label: '4단계 · 결제 금액 확인',
        advanceMs: MAIN_ADVANCE_MS,
        html: flowShell(
            flowProgress(4),
            `
                    ${stepHead('건수와 금액을 확인한 뒤 다음으로 진행해요')}
                    <div class="intro-review__source"><span aria-hidden="true">📄</span> 주소록_2026.xlsx</div>
                    <div class="intro-review__totals">
                        <div class="intro-review__row"><span>유효 연락처</span><strong>${DEMO_COUNT}건</strong></div>
                        <div class="intro-review__row"><span>발송비</span><strong>${DEMO_TOTAL}원</strong></div>
                        <div class="intro-review__total"><span>총 결제금액</span><strong>${DEMO_TOTAL}원</strong></div>
                    </div>
                    <p class="intro-review__note">번호 있는 행만 집계</p>`,
        ),
    },
    {
        label: '5단계 · 본인 확인',
        advanceMs: MAIN_ADVANCE_MS,
        html: flowShell(
            flowProgress(5),
            `
                    ${stepHead('로그인 후 바로 발송 단계로 이어갈 수 있어요', true)}
                    <div class="intro-auth__stack">
                        <div class="intro-auth__kakao"><span class="intro-auth__kakao-icon" aria-hidden="true">💬</span>3초만에 카카오싱크</div>
                        <div class="intro-auth__guest"><span class="intro-auth__guest-icon" aria-hidden="true">👆</span>OTP로 비회원 로그인</div>
                    </div>
                    <div class="intro-auth__email"><span class="intro-auth__email-icon" aria-hidden="true">✉</span>이메일 로그인</div>`,
        ),
    },
    {
        label: '6단계 · 결제하기',
        advanceMs: MAIN_ADVANCE_MS,
        html: flowShell(
            flowProgress(6),
            `
                    ${stepHead('결제를 완료하면 발송을 시작할게요')}
                    <div class="intro-checkout__rows">
                        <div class="intro-checkout__row"><span>주문번호</span><strong class="intro-checkout__mono">${DEMO_ORDER_ID}</strong></div>
                        <div class="intro-checkout__row"><span>상품</span><strong>PING 부고 문자 · ${DEMO_COUNT}건</strong></div>
                        <div class="intro-checkout__row"><span>발송 방식</span><strong>문자(LMS)</strong></div>
                        <div class="intro-checkout__amount"><span>주문 금액</span><strong>${DEMO_TOTAL}원</strong></div>
                    </div>
                    <div class="intro-checkout__methods">토스페이 · 카드 · 간편결제</div>
                    <div class="intro-checkout__pay">${DEMO_TOTAL}원 결제하기</div>`,
        ),
    },
    {
        label: '7단계 · 발송 준비 중',
        advanceMs: MAIN_ADVANCE_MS,
        html: flowShell(
            flowProgress(7),
            `
                    <h2 class="ping-mobile-title">발송 중</h2>
                    <div class="ping-mobile-signal">
                        <img src="${PING_LOGO_MARK_SRC}" alt="" />
                    </div>
                    <p class="ping-mobile-ratio">${DEMO_COUNT}<span> / ${DEMO_COUNT}</span></p>
                    <div class="ping-mobile-progress" aria-hidden="true"><span style="width:58%"></span></div>
                    <ul class="ping-mobile-steps">
                        <li><span class="ping-mobile-steps__dot is-done"></span>연락처 확인 중<span class="ping-mobile-steps__count">${DEMO_COUNT}명</span></li>
                        <li><span class="ping-mobile-steps__dot is-active"></span>메시지 발송 중<span class="ping-mobile-steps__count is-active">${DEMO_COUNT}명</span></li>
                        <li><span class="ping-mobile-steps__dot"></span>전달 결과 수신 중<span class="ping-mobile-steps__count">-</span></li>
                    </ul>
                    <p class="ping-mobile-wait">잠시만 기다려주세요.<br />PING이 안전하게 전달하고 있습니다.</p>`,
        ),
    },
    {
        label: '8단계 · 발송 완료',
        advanceMs: MAIN_ADVANCE_MS,
        html: flowShell(
            flowProgress(8),
            `
                    <h2 class="ping-mobile-title">발송 완료</h2>
                    <div class="ping-mobile-success-mark" aria-hidden="true">✓</div>
                    <p class="ping-mobile-complete-lead">
                        <strong>${DEMO_COUNT}명에게</strong><br />전달되었습니다.
                    </p>
                    <div class="ping-mobile-mini-stats">
                        <span>발송 성공 ${DEMO_COUNT}</span>
                        <span>확인 필요 0</span>
                    </div>`,
        ),
    },
];

export const flashStages = [
    {
        label: '',
        advanceMs: FLASH_ADVANCE_MS,
        html: flashCard('자동으로 작성돼요', '부고 링크만 붙여넣으면 문자 초안까지 이어집니다.'),
    },
    {
        label: '',
        advanceMs: FLASH_ADVANCE_MS,
        html: flashCard('비용이 투명해요', '건당 단가와 총 결제금액을 결제 전에 확인할 수 있어요.'),
    },
];

export const introStages = mainStages;
