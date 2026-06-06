/** Auto-derived from intro.html — 데모 단계 HTML */
const MAIN_ADVANCE_MS = 1650;
const FLASH_ADVANCE_MS = 1280;

export function flashCard(titleHtml: string, subtitle?: string): string {
    return `
            <div class="cx-flash-inner">
                <div class="spinner cx-flash-spin" aria-hidden="true"></div>
                <div class="cx-flash-title">${titleHtml}</div>
                ${subtitle ? `<div class="cx-flash-sub">${subtitle}</div>` : ''}
            </div>
        `;
}

export const mainStages = [
    {
        label: '1단계 · 신청자 정보 입력',
        advanceMs: MAIN_ADVANCE_MS,
        html: `
            <div class="tab-bar">
                <div class="tab on">부고 대량발송</div>
                <div class="tab">근조화환 보내기</div>
            </div>
            <div class="label">신청자 성함</div>
            <div class="field filled">홍길동</div>
            <div class="label">연락처</div>
            <div class="field filled">010-1234-5678</div>
            <div class="label">이메일 </div>
            <div class="field">입력</div>
            <div class="btn-main active">다음</div>
        `,
    },
    {
        label: '2단계 · 주소록 등록 & 자동 견적',
        advanceMs: MAIN_ADVANCE_MS,
        html: `
            <div style="font-size:11px;font-weight:600;color:var(--color-text-primary);margin-bottom:8px">주소록 파일 등록 <span style="color:#0097A9">자동 견적</span></div>
            <div style="display:flex;gap:6px;margin-bottom:8px">
                <div style="flex:1;height:34px;border-radius:9px;border:1px solid var(--color-border-secondary);display:flex;align-items:center;justify-content:center;gap:5px;font-size:10px;color:var(--color-text-secondary)">
                    <svg width="13" height="13" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    구글 연락처
                </div>
                <div style="flex:1;height:34px;border-radius:9px;background:#059669;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:600">N 네이버</div>
            </div>
            <div class="upload-box highlight">
                <div class="upload-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0097A9" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                <div style="font-size:10px;font-weight:600;color:#0097A9">주소록_2026.xlsx 선택됨</div>
                <div style="font-size:9px;color:var(--color-text-secondary);margin-top:2px">분석 완료</div>
            </div>
            <div style="background:var(--color-background-secondary);border-radius:10px;padding:10px">
                <div class="price-row"><span>유효 연락처</span><span style="color:var(--color-text-primary);font-weight:600">248건</span></div>
                <div class="price-row"><span>발송비</span><span>27,280원</span></div>
                <div class="price-row total"><span>총 결제금액</span><span>27,280원</span></div>
            </div>
            <div class="btn-main" style="margin-top:8px">27,280원 발송하기</div>
        `,
    },
    {
        label: '3단계 · 결제 (PG사 결제창)',
        advanceMs: MAIN_ADVANCE_MS,
        html: `
            <div class="pg-box">
                <div class="pg-title">결제 정보 입력</div>
                <div style="font-size:9px;color:var(--color-text-secondary);margin-bottom:6px">카드번호</div>
                <div class="card-input active">1234  5678  ****  ****</div>
                <div style="display:flex;gap:6px">
                    <div style="flex:1">
                        <div style="font-size:9px;color:var(--color-text-secondary);margin-bottom:4px">유효기간</div>
                        <div class="card-input">12 / 26</div>
                    </div>
                    <div style="flex:1">
                        <div style="font-size:9px;color:var(--color-text-secondary);margin-bottom:4px">CVC</div>
                        <div class="card-input">***</div>
                    </div>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;padding:0 2px">
                <span style="color:var(--color-text-secondary)">결제금액</span>
                <span style="font-weight:600;color:#0097A9">27,280원</span>
            </div>
            <div class="progress-track" style="margin-top:10px"><div class="progress-fill" style="--w:75%"></div></div>
            <div style="font-size:9px;color:var(--color-text-secondary);text-align:right">승인 요청 중...</div>
        `,
    },
    {
        label: '3-A · 결제 완료 화면',
        advanceMs: MAIN_ADVANCE_MS,
        html: `
            <div style="text-align:center;padding:18px 0 10px">
                <div class="result-icon success">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#0097A9" stroke-width="1.5"/>
                        <polyline class="check-svg" points="7,12 10.5,15.5 17,8.5" fill="none" stroke="#0097A9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div style="font-size:14px;font-weight:600;color:var(--color-text-primary);margin-bottom:4px">결제가 완료되었습니다!</div>
                <div style="font-size:10px;color:var(--color-text-secondary)">정상적으로 처리되었습니다</div>
            </div>
            <div style="background:var(--color-background-secondary);border-radius:10px;padding:10px;margin-bottom:10px">
                <div class="price-row"><span>주문번호</span><span style="font-weight:600;color:var(--color-text-primary)">PING-20260406-3842</span></div>
                <div class="price-row total"><span>결제금액</span><span>27,280원</span></div>
            </div>
            <div style="background:rgba(0,151,169,.07);border-radius:10px;padding:10px;text-align:center">
                <div style="font-size:12px;font-weight:600;color:#0097A9">마음, PING으로 정확하게</div>
                <div style="font-size:10px;color:var(--color-text-secondary);margin-top:3px;line-height:1.45">지인분들께 순차적으로 전달됩니다.<br>아래에서 정리용 발송 명단을 받으세요.</div>
            </div>
            <div style="height:34px;border-radius:10px;background:#F5DF4D;border:1px solid #c9b338;display:flex;align-items:center;justify-content:center;font-size:10px;color:#1a1a1a;font-weight:600;gap:6px;margin-top:4px"><span>📋</span> 명단 받기</div>
        `,
    },
    {
        label: '3-B · 결제 취소 / 실패 화면',
        advanceMs: MAIN_ADVANCE_MS,
        html: `
            <div style="text-align:center;padding:16px 0 10px">
                <div class="result-icon fail">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#E24B4A" stroke-width="1.5"/>
                        <line x1="8" y1="8" x2="16" y2="16" stroke="#E24B4A" stroke-width="2" stroke-linecap="round"/>
                        <line x1="16" y1="8" x2="8" y2="16" stroke="#E24B4A" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div style="font-size:14px;font-weight:600;color:var(--color-text-primary);margin-bottom:4px">결제가 취소되었습니다</div>
                <div style="font-size:10px;color:var(--color-text-secondary);margin-bottom:14px">사용자가 결제를 취소했습니다.</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:7px">
                <div style="height:36px;border-radius:10px;background:#0097A9;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:600">다시 결제하기</div>
                <div style="height:36px;border-radius:10px;background:var(--color-background-secondary);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--color-text-secondary)">처음으로 돌아가기</div>
            </div>
        `,
    },
    {
        label: '4단계 · 부고 문자 발송 처리',
        advanceMs: MAIN_ADVANCE_MS,
        html: `
            <div style="text-align:center;margin-bottom:12px">
                <div class="spinner"></div>
                <div style="font-size:11px;font-weight:600;color:var(--color-text-primary)">발송 처리 중...</div>
                <div style="font-size:9px;color:var(--color-text-secondary);margin-top:3px">248건 발송 중</div>
                <div class="progress-track"><div class="progress-fill" style="--w:60%"></div></div>
            </div>
            <div style="background:var(--color-background-secondary);border-radius:10px;padding:10px">
                <div class="send-item" style="animation-delay:.05s"><div class="send-dot done"></div><span style="font-size:10px;color:var(--color-text-secondary)">김○○ 010-1234-5678</span><span style="margin-left:auto;font-size:9px;color:#1D9E75">완료</span></div>
                <div class="send-item" style="animation-delay:.15s"><div class="send-dot done"></div><span style="font-size:10px;color:var(--color-text-secondary)">이○○ 010-2345-6789</span><span style="margin-left:auto;font-size:9px;color:#1D9E75">완료</span></div>
                <div class="send-item" style="animation-delay:.25s"><div class="send-dot done"></div><span style="font-size:10px;color:var(--color-text-secondary)">박○○ 010-3456-7890</span><span style="margin-left:auto;font-size:9px;color:#1D9E75">완료</span></div>
                <div class="send-item" style="animation-delay:.35s"><div class="send-dot" style="animation:pulse .8s ease infinite"></div><span style="font-size:10px;color:var(--color-text-secondary)">최○○ 010-4567-8901</span><span style="margin-left:auto;font-size:9px;color:#0097A9">발송중</span></div>
                <div class="send-item" style="animation-delay:.45s"><div class="send-dot" style="background:var(--color-border-secondary)"></div><span style="font-size:10px;color:var(--color-text-tertiary)">정○○ 010-5678-9012</span><span style="margin-left:auto;font-size:9px;color:var(--color-text-tertiary)">대기</span></div>
            </div>
        `,
    },
];

export const flashStages = [
    {
        label: '',
        advanceMs: FLASH_ADVANCE_MS,
        html: flashCard('비용이 투명해요', '건당 단가와 총 결제금액을 결제 전에 확인할 수 있어요.'),
    },
    {
        label: '',
        advanceMs: FLASH_ADVANCE_MS,
        html: flashCard('정리까지 이어져요', '결제 완료 화면에서 부의금·명단 정리에 쓰실 연락처 명단을 받으실 수 있어요.'),
    },
];

export const introStages = [
    mainStages[0],
    mainStages[1],
    flashStages[0],
    mainStages[2],
    flashStages[1],
    mainStages[3],
    mainStages[4],
    mainStages[5],
];
