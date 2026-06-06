'use strict';

/**
 * 회원·카카오·게스트 SMS 인증 — Express 앱 (Next API·로컬 Express 공용).
 */
const express = require('express');
const memberStore = require('./ping-member-store.cjs');
const memberAuth = require('../member-auth');
const kakaoAuth = require('../ping-kakao-auth');
const guestSmsAuth = require('../guest-sms-auth');

let app;

function needsMemberStore(url) {
    const u = String(url || '');
    return (
        u.startsWith('/api/auth') ||
        u.startsWith('/api/guest-auth') ||
        u.startsWith('/api/admin/app-settings')
    );
}

function wrapAsync(handler) {
    return (req, res) => {
        Promise.resolve(handler(req, res)).catch((err) => {
            console.error('member-auth async error:', err);
            if (!res.headersSent) {
                res.status(500).json({ ok: false, error: '요청 처리 중 오류가 발생했습니다.' });
            }
        });
    };
}

function buildApp() {
    const router = express();
    router.use((req, res, next) => {
        if (req.body != null && typeof req.body === 'object') return next();
        return express.json()(req, res, next);
    });

    router.use(async (req, res, next) => {
        const pathOnly = String(req.url || '').split('?')[0];
        if (!needsMemberStore(pathOnly)) return next();
        try {
            await memberStore.beginRequest();
            res.on('finish', () => {
                void memberStore.endRequest().catch((e) => {
                    console.error('memberStore.endRequest:', e);
                });
            });
            next();
        } catch (e) {
            next(e);
        }
    });

    router.post('/api/auth/register', wrapAsync(memberAuth.registerHandler));
    router.post('/api/auth/login', memberAuth.loginHandler);
    router.get('/api/auth/me', memberAuth.meHandler);
    router.post('/api/auth/logout', memberAuth.logoutHandler);
    router.post('/api/auth/verify-email', memberAuth.verifyEmailHandler);
    router.post('/api/auth/resend-verification', wrapAsync(memberAuth.resendVerificationHandler));

    router.get('/api/auth/kakao/config', kakaoAuth.configHandler);
    router.get('/api/auth/kakao/authorize', kakaoAuth.authorizeHandler);
    router.get('/api/auth/kakao/callback', kakaoAuth.callbackHandler);
    router.get('/api/auth/kakao/business/callback', kakaoAuth.businessCallbackHandler);
    router.post('/api/auth/kakao/exchange', kakaoAuth.exchangeHandler);

    router.get('/api/guest-auth/config', guestSmsAuth.guestAuthPublicConfigHandler);
    router.post('/api/guest-auth/send-code', guestSmsAuth.sendCodeHandler);
    router.post('/api/guest-auth/verify-code', guestSmsAuth.verifyCodeHandler);
    router.get('/api/admin/app-settings', guestSmsAuth.adminAppSettingsGetHandler);
    router.patch('/api/admin/app-settings', guestSmsAuth.adminAppSettingsPatchHandler);

    return router;
}

/** @deprecated use getApp */
function buildRouter() {
    return buildApp();
}

function getApp() {
    if (!app) app = buildApp();
    return app;
}

module.exports = { getApp, needsMemberStore };
