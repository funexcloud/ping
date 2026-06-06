/**
 * 외부 부고(view) 페이지 파싱 결과 → 대량 발송용 문자 본문.
 * 고인 첫 줄 → 유가족(관계 순) → 입관(있을 때) → 발인 → 장소·장지 → 부고 줄(opts.linkToken: 실제 URL 또는 {{LINK}}).
 */

function normalizeWs(s) {
    return String(s || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const KO_WD = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n) {
    const x = Number(n);
    return (x < 10 ? '0' : '') + x;
}

/**
 * `2026년 4월 5일 13시` 등 → `2026년 04월 05일(일) 13시 00분`
 * 이미 요일·분이 있으면 공백만 정리한다.
 */
function formatBugoDateTimeDisplay(raw) {
    let s = normalizeWs(raw);
    if (!s) return '';
    s = s.replace(/[０-９]/g, function (ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 48);
    });
    const reFull =
        /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*\(([월화수목금토일])\)\s*(\d{1,2})시\s*(\d{2})분\s*$/;
    const mf = s.match(reFull);
    if (mf) {
        return (
            mf[1] +
            '년 ' +
            pad2(mf[2]) +
            '월 ' +
            pad2(mf[3]) +
            '일(' +
            mf[4] +
            ') ' +
            pad2(mf[5]) +
            '시 ' +
            mf[6] +
            '분'
        );
    }
    const re =
        /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*\(([월화수목금토일])\))?[^\d]*(\d{1,2})시(?:\s*(\d{2})\s*분)?/;
    const m = s.match(re);
    if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        let wd = m[4];
        const h = Number(m[5]);
        const min = m[6] != null && m[6] !== '' ? m[6] : '00';
        if (!wd) {
            const dt = new Date(y, mo - 1, d);
            wd = KO_WD[dt.getDay()];
        }
        return (
            y +
            '년 ' +
            pad2(mo) +
            '월 ' +
            pad2(d) +
            '일(' +
            wd +
            ') ' +
            pad2(h) +
            '시 ' +
            min +
            '분'
        );
    }
    return s;
}

function formatDeceasedProfileParen(deceasedAgeGender) {
    const ag = deceasedAgeGender ? normalizeWs(deceasedAgeGender) : '';
    if (!ag) return '';
    const m = ag.match(/\(\s*(\d{1,3})\s*세\s*\/\s*(남|여)(?:성)?\s*\)/);
    if (!m) return '';
    return '(' + m[2] + '/' + m[1] + '세)';
}

/** (남/75세) 등 → 향년 표기용 나이 숫자 */
function extractHyangnyeonAge(data) {
    const ag = data && data.deceasedAgeGender ? normalizeWs(data.deceasedAgeGender) : '';
    if (!ag) return '';
    let m = ag.match(/\(\s*(\d{1,3})\s*세\s*\/\s*(?:남|여)(?:성)?\s*\)/);
    if (m) return m[1];
    m = ag.match(/(\d{1,3})\s*세/);
    return m ? m[1] : '';
}

/** 발인 줄 — `4월 5일 … 오후 1시` 형태 */
function formatBainilFormalLine(raw) {
    const s = formatBugoDateTimeDisplay(raw);
    if (!s) return '(미상)';
    const m = s.match(
        /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\(([월화수목금토일])\)\s*(\d{1,2})시(?:\s*(\d{2})\s*분)?/
    );
    if (!m) return s;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const wd = m[4];
    const h = Number(m[5]);
    const min = m[6] != null ? Number(m[6]) : 0;
    let ap = '';
    let h12 = h;
    if (h === 0) {
        ap = '오전';
        h12 = 12;
    } else if (h < 12) {
        ap = '오전';
        h12 = h;
    } else if (h === 12) {
        ap = '오후';
        h12 = 12;
    } else {
        ap = '오후';
        h12 = h - 12;
    }
    let timePart = ap + ' ' + h12 + '시';
    if (min > 0) timePart += ' ' + min + '분';
    return y + '년 ' + mo + '월 ' + d + '일(' + wd + ') ' + timePart;
}

function normalizeFuneralHallOneLine(raw) {
    return normalizeWs(String(raw || '')).replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 템플릿 2·유가족 라벨(아들/딸/며느리/사위/손) */
function roleToFormalUigaLabel(role) {
    const r = normalizeWs(role);
    if (!r) return '';
    if (
        r === '자' ||
        r === '장남' ||
        r === '차남' ||
        r === '삼남' ||
        r === '아들' ||
        r === '막내' ||
        r === '막내아들'
    ) {
        return '아들';
    }
    if (r === '딸' || r === '녀' || r === '장녀' || r === '차녀') return '딸';
    if (r === '자부' || r === '며느리') return '며느리';
    if (r === '사위' || r.indexOf('사위') === 0) return '사위';
    if (r === '손' || r === '손자' || r === '손녀') return '손';
    return r;
}

function formalFamilyLineSortRank(role) {
    const lb = roleToFormalUigaLabel(role);
    const order = { 아들: 0, 딸: 1, 며느리: 2, 사위: 3, 손: 4 };
    return Object.prototype.hasOwnProperty.call(order, lb) ? order[lb] : 50;
}

/**
 * 템플릿 1과 동일 데이터로 정돈된 안내형(■ 유가족 / 마지막 가시는 길 / 마음 전하실 곳).
 * @param {{ linkUrl?: string, linkToken?: string }} [opts]
 */
function buildBugoFuneralMessageFormal(data, opts) {
    opts = opts || {};
    const linkUrl = String(opts.linkUrl || opts.linkToken || '{{LINK}}').trim() || '{{LINK}}';
    const cleanName = normalizeWs((data && data.deceasedName) || '')
        .replace(/^故\s*/, '')
        .replace(/님$/, '');
    const lines = [];

    if (cleanName) {
        lines.push(
            '故 ' + cleanName + '님과 함께했던 소중한 인연들을 기억하며 마지막 인사를 전합니다.'
        );
    } else {
        lines.push(
            '故 (성명)님과 함께했던 소중한 인연들을 기억하며 마지막 인사를 전합니다.'
        );
    }
    lines.push('');

    const age = extractHyangnyeonAge(data);
    if (cleanName) {
        lines.push(
            '■ 故 ' +
                cleanName +
                '님' +
                (age ? ' (향년 ' + age + '세)' : ' (향년 · 세)')
        );
    } else {
        lines.push('■ 故 (성명)님 (향년 · 세)');
    }
    lines.push('');
    lines.push('■ 유가족');

    let merged =
        data && data.mourners && data.mourners.length
            ? collapseSangjuAndJaMourners(data.mourners)
            : [];
    merged = merged.slice().sort(function (a, b) {
        return formalFamilyLineSortRank(a.role) - formalFamilyLineSortRank(b.role);
    });

    const uigaStart = lines.length;
    merged.forEach(function (m) {
        if (isDeceasedRoleOnlyLabel(m.role)) return;
        const label = roleToFormalUigaLabel(m.role);
        if (!label) return;
        const rawNames = normalizeWs(m.namesLine).replace(/^故\s*/g, '');
        const parts = rawNames
            .split(/\s*,\s*/)
            .map(function (x) {
                return normalizeWs(x);
            })
            .filter(Boolean);
        if (!parts.length) return;
        lines.push(label + ': ' + parts.join(', '));
    });

    if (lines.length === uigaStart) {
        lines.push('아들: (성명), (성명)');
        lines.push('딸: (성명)');
        lines.push('며느리: (성명), (성명)');
        lines.push('사위: (성명)');
    }

    lines.push('');
    lines.push('■ 마지막 가시는 길');
    const banF = data && data.bainil ? formatBainilFormalLine(data.bainil) : '(미상)';
    lines.push('발인: ' + (banF || '(미상)'));
    const hallOne = normalizeFuneralHallOneLine(data && data.funeralHall);
    lines.push('빈소: ' + (hallOne || '(미상)'));
    const j1 = normalizeWs((data && data.jangji1) || '');
    const j2raw = data && data.jangji2 != null ? String(data.jangji2).trim() : '';
    const j2Invalid =
        !j2raw ||
        /^정보가 없습니다/i.test(j2raw) ||
        j2raw === '-' ||
        j2raw === '—';
    let jangjiLine = '';
    if (j1 && !j2Invalid && j2raw) {
        jangjiLine = j1 + ' ➔ ' + normalizeWs(j2raw);
    } else if (j1) {
        jangjiLine = j1;
    } else {
        jangjiLine = '(미상)';
    }
    lines.push('장지: ' + jangjiLine);

    lines.push('');
    lines.push('■ 마음 전하실 곳');
    lines.push(linkUrl);

    return lines.join('\n');
}

function buildDeceasedFirstBodyLine(cleanName, deceasedAgeGender) {
    const name = normalizeWs(cleanName).replace(/^故\s*/, '');
    if (!name) return '';
    const paren = formatDeceasedProfileParen(deceasedAgeGender);
    return '故 ' + name + '님' + (paren ? ' ' + paren : '');
}

function displayMournerRoleForMessage(role) {
    const r = normalizeWs(role);
    if (!r) return '';
    if (r === '며느리') return '자부';
    if (r === '딸' || r === '장녀' || r === '차녀') return '녀';
    return r;
}

function isDeceasedRoleOnlyLabel(role) {
    const r = normalizeWs(role);
    if (!r) return false;
    if (r === '고인' || r === '故') return true;
    if (/고인/.test(r) && r.length <= 8) return true;
    const compact = r.replace(/\s/g, '');
    if (compact === '고인' || compact === '故인' || compact === '故人') return true;
    return false;
}

function isSangjuRoleForMerge(role) {
    const r = normalizeWs(role);
    return r === '상주' || (r.indexOf('상주') !== -1 && r.length <= 16);
}

function isJaRoleForMerge(role) {
    const r = normalizeWs(role);
    return (
        r === '자' ||
        r === '장남' ||
        r === '차남' ||
        r === '삼남' ||
        r === '아들' ||
        r === '막내' ||
        r === '막내아들'
    );
}

function splitMournerNameTokens(namesLine) {
    const s = normalizeWs(namesLine).replace(/^故\s*/g, '');
    if (!s) return [];
    return s
        .split(/\s*,\s*/)
        .map(function (x) {
            return normalizeWs(x).replace(/^故\s*/g, '');
        })
        .filter(Boolean);
}

function collapseSangjuAndJaMourners(mourners) {
    if (!mourners || !mourners.length) return [];
    const out = [];
    let i = 0;
    while (i < mourners.length) {
        const m = mourners[i];
        if (isDeceasedRoleOnlyLabel(m.role)) {
            i += 1;
            continue;
        }
        if (isSangjuRoleForMerge(m.role)) {
            const tokens = [];
            while (i < mourners.length && isSangjuRoleForMerge(mourners[i].role)) {
                splitMournerNameTokens(mourners[i].namesLine).forEach(function (t) {
                    tokens.push(t);
                });
                i += 1;
            }
            while (i < mourners.length && isJaRoleForMerge(mourners[i].role)) {
                splitMournerNameTokens(mourners[i].namesLine).forEach(function (t) {
                    tokens.push(t);
                });
                i += 1;
            }
            if (tokens.length) out.push({ role: '자', namesLine: tokens.join(', ') });
            continue;
        }
        out.push(mourners[i]);
        i += 1;
    }
    return out;
}

/**
 * @param {{
 *   deceasedName?: string,
 *   deceasedAgeGender?: string | null,
 *   mourners: { role: string, namesLine: string }[],
 *   ipgwan?: string,
 *   bainil: string,
 *   funeralHall: string,
 *   jangji1: string,
 *   jangji2: string | null
 * }} data
 * @param {{ linkToken?: string }} [opts]
 */
function buildBugoFuneralMessage(data, opts) {
    opts = opts || {};
    const linkToken = opts.linkToken != null ? String(opts.linkToken) : '{{LINK}}';
    const lines = [];

    const cleanName = normalizeWs(data.deceasedName || '').replace(/^故\s*/, '');
    const head = buildDeceasedFirstBodyLine(cleanName, data.deceasedAgeGender || null);
    if (head) lines.push(head);

    lines.push('');

    if (data.mourners && data.mourners.length) {
        const merged = collapseSangjuAndJaMourners(data.mourners);
        merged.forEach(function (m) {
            if (isDeceasedRoleOnlyLabel(m.role)) return;
            const label = displayMournerRoleForMessage(m.role);
            lines.push(label + ' ' + normalizeWs(m.namesLine));
        });
    }

    const ipRaw = data.ipgwan != null ? String(data.ipgwan) : '';
    const ipFmt = formatBugoDateTimeDisplay(ipRaw);
    if (ipFmt) lines.push('입관 ' + ipFmt);

    const ban = formatBugoDateTimeDisplay(data.bainil);
    lines.push('발인 ' + (ban || '(미상)'));

    const hall = normalizeWs(data.funeralHall).replace(/\s*,\s*/g, ' , ');
    lines.push('장례식장 ' + (hall || '(미상)'));

    lines.push('1차 장지 ' + (normalizeWs(data.jangji1) || '(미상)'));

    const j2Raw = data.jangji2;
    const j2Invalid =
        !j2Raw ||
        /^정보가 없습니다/i.test(String(j2Raw)) ||
        String(j2Raw).trim() === '-' ||
        String(j2Raw).trim() === '—';
    if (!j2Invalid) lines.push('2차 장지 ' + normalizeWs(j2Raw));

    lines.push('');
    lines.push('부고: ' + linkToken);

    return lines.join('\n');
}

module.exports = {
    buildBugoFuneralMessage,
    buildBugoFuneralMessageFormal,
    formatBugoDateTimeDisplay,
    normalizeWs
};
