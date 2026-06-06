/**
 * 공통 푸터 컴포넌트
 * 모든 페이지에서 재사용 가능한 푸터
 */

import { config } from '../config.js';

export class Footer {
    constructor(options = {}) {
        this.options = {
            showLegalLinks: true,
            ...options
        };
    }

    /**
     * 푸터 HTML 생성
     */
    render() {
        const basePath = config.basePath;
        const app = config.app;

        return `
            <footer>
                <div class="container">
                    ${this.renderTopSection(basePath, app)}
                    ${this.renderBottomSection(basePath, app)}
                    ${this.options.showLegalLinks ? this.renderLegalLinks(basePath) : ''}
                    ${this.renderCopyright()}
                </div>
            </footer>
        `;
    }

    /**
     * 상단 네비게이션 섹션
     */
    renderTopSection(basePath, app) {
        // 현재 경로에 따라 상대 경로 계산
        const path = window.location.pathname;
        
        // 모든 HTML 파일이 루트에 있으므로 경로 계산 단순화
        // 모든 파일이 루트에 있으므로 상대 경로는 모두 동일
        const indexPath = '/start';
        const overviewPath = '/overview';
        const customerCenterPath = '/customer-center';
        const inquiryBoardPath = '/inquiry-board';
        const memorialListPath = '/memorial/list';
        const memorialAuthPath = '/memorial/auth';
        const adminDashboardPath = '/admin/monitoring';
        const serviceStatusPath = '/admin/service-status';
        const techBlogPath = '/tech-blog';
        const termsPath = '/legal/terms-of-service';
        const privacyPolicyPath = '/legal/privacy-policy';
        const refundPolicyPath = '/legal/refund-policy';
        const copyrightPath = '/legal/copyright';
        
        return `
            <div class="footer-top">
                <div class="footer-section">
                    <h3>PING</h3>
                    <a href="${overviewPath}#features">기능</a>
                    <a href="${overviewPath}#how-it-works">사용방법</a>
                    <a href="${overviewPath}#pricing">가격</a>
                    <a href="${overviewPath}#faq">자주묻는 질문</a>
                </div>
                <div class="footer-section">
                    <h3>서비스</h3>
                    <a href="${overviewPath}">서비스 소개</a>
                    <a href="${indexPath}">부고발송신청</a>
                    <a href="${inquiryBoardPath}">1:1문의</a>
                    <a href="${customerCenterPath}">고객센터</a>
                </div>
                <div class="footer-section">
                    <h3>메모리얼파크</h3>
                    <a href="${memorialListPath}">추모관</a>
                    <a href="${memorialAuthPath}">추모관(프리미엄 전용)</a>
                </div>
                <div class="footer-section">
                    <h3>리소스</h3>
                    <a href="${techBlogPath}">기술블로그</a>
                    <a href="${termsPath}">이용약관</a>
                    <a href="${privacyPolicyPath}">개인정보처리방침</a>
                    <a href="${refundPolicyPath}">환불정책</a>
                    <a href="${copyrightPath}">저작권 안내</a>
                </div>
                <div class="footer-section">
                    <h3>환경설정</h3>
                    <a href="${adminDashboardPath}">통합모니터링</a>
                    <a href="${serviceStatusPath}">서비스현황</a>
                </div>
            </div>
        `;
    }

    /**
     * 하단 정보 섹션
     */
    renderBottomSection(basePath, app) {
        // 모든 HTML 파일이 루트에 있으므로 경로 단순화
        const customerCenterPath = '/customer-center';

        return `
            <div class="footer-bottom">
                <div class="footer-company">
                    <p>한국AIBC융합원</p>
                    <p class="footer-company-rep-reg">
                        <span><strong>대표자:</strong> 송지훈</span>
                        <span><strong>사업자등록번호:</strong> 225-09-26000</span>
                    </p>
                    <p><strong>통신판매업신고번호:</strong> 2024울산북구0108호</p>
                    <p><strong>사업장주소:</strong> 울산광역시 중구 해오름5길 24 101호</p>
                </div>
                <div class="footer-contact">
                    <a href="${customerCenterPath}" class="footer-inquiry-link">
                        이용문의
                        <span class="footer-link-icon">↗</span>
                    </a>
                    <a href="${customerCenterPath}#tech-inquiry" class="footer-inquiry-link">
                        기술문의
                        <span class="footer-link-icon">↗</span>
                    </a>
                </div>
                <div class="footer-brand">
                    <div class="footer-brand-logo">${app.name}</div>
                    <p class="footer-brand-slogan">${app.slogan}</p>
                    <p class="footer-brand-slogan">어려운 순간, 중요한 소식을<br>놓치지 않고 정확하게 전달합니다.</p>
                </div>
            </div>
        `;
    }

    /**
     * 법적 링크 섹션
     */
    renderLegalLinks(basePath) {
        // 모든 HTML 파일이 루트에 있으므로 경로 단순화
        const termsPath = '/legal/terms-of-service';
        const privacyPolicyPath = '/legal/privacy-policy';
        const refundPolicyPath = '/legal/refund-policy';
        
        return `
            <div class="footer-legal">
                <a href="${termsPath}">이용약관 및 환불정책</a>
                <a href="${privacyPolicyPath}">개인정보처리방침</a>
                <a href="${refundPolicyPath}">환불정책</a>
            </div>
        `;
    }

    /**
     * 저작권 정보
     */
    renderCopyright() {
        const year = new Date().getFullYear();
        return `
            <div class="footer-copyright">
                © ${year} PING. All rights reserved.
            </div>
        `;
    }

    /**
     * 푸터를 DOM에 삽입
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        if (container) {
            container.innerHTML = this.render();
        }
    }
}

// 간단한 함수 형태로도 사용 가능
export function renderFooter(options = {}) {
    const footer = new Footer(options);
    return footer.render();
}

