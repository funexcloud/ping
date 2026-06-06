/**
 * 공통 헤더 컴포넌트
 * 모든 페이지에서 재사용 가능한 헤더
 */

import { config } from '../config.js';

export class Header {
    constructor(options = {}) {
        this.options = {
            showNavLinks: true,
            showCTA: true,
            currentPage: 'index',
            style: 'default', // 'default' 또는 'tailwind'
            ...options
        };
    }

    /**
     * 헤더 HTML 생성
     */
    render() {
        if (this.options.style === 'tailwind') {
            return this.renderTailwind();
        }
        return this.renderDefault();
    }

    /**
     * 기본 스타일 헤더 (common.css 사용)
     */
    renderDefault() {
        const basePath = config.basePath;
        const logoPath = `${basePath}ping_logo_svg.svg`;
        
        // 루트·하위 경로 공통: 절대 경로
        const overviewPath = '/overview';
        const indexPath = '/index.html';

        return `
            <header>
                <div class="header-container">
                    <a href="${overviewPath}" class="logo">
                        <img src="${logoPath}" class="logo-img" alt="PING">
                    </a>
                    <div class="header-right">
                        ${this.options.showCTA ? this.renderCTA(indexPath) : ''}
                        ${this.options.showNavLinks ? this.renderNavLinks(overviewPath) : ''}
                    </div>
                </div>
            </header>
        `;
    }

    /**
     * Tailwind CSS 스타일 헤더
     */
    renderTailwind() {
        const basePath = config.basePath;
        const logoPath = `${basePath}ping_logo_svg.svg`;
        // 루트·하위 경로 공통: 절대 경로
        const overviewPath = '/overview';
        const indexPath = '/index.html';

        return `
            <header class="sticky top-0 bg-white border-b border-gray-200 z-50 px-6 py-4">
                <div class="flex items-center justify-between">
                    <a href="${overviewPath}" class="flex items-center">
                        <img src="${logoPath}" class="h-20 w-auto" alt="PING">
                    </a>
                    <a href="${indexPath}" class="text-blue-600 font-semibold">부고 발송 신청</a>
                </div>
            </header>
        `;
    }

    /**
     * 네비게이션 링크 렌더링
     */
    renderNavLinks(overviewPath) {
        return `
            <nav class="nav-links">
                <a href="${overviewPath}#features" class="nav-link">기능</a>
                <a href="${overviewPath}#how-it-works" class="nav-link">사용방법</a>
                <a href="${overviewPath}#pricing" class="nav-link">가격</a>
            </nav>
        `;
    }

    /**
     * CTA 버튼 렌더링
     */
    renderCTA(indexPath) {
        return `
            <a href="${indexPath}" class="cta-button">신청하기</a>
        `;
    }

    /**
     * 헤더를 DOM에 삽입
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
export function renderHeader(options = {}) {
    const header = new Header(options);
    return header.render();
}

