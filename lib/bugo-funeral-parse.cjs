'use strict';
/** Built from src/lib/bugo-funeral-parse.ts — npm run build:bugo-parse */
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/bugo-funeral-parse.ts
var bugo_funeral_parse_exports = {};
__export(bugo_funeral_parse_exports, {
  formatIsoDateTimeForBugoTemplate: () => formatIsoDateTimeForBugoTemplate,
  parseFuneralPageHtml: () => parseFuneralPageHtml,
  parseModubugoApiBody: () => parseModubugoApiBody
});
module.exports = __toCommonJS(bugo_funeral_parse_exports);
var cheerio = __toESM(require("cheerio"));
function normalizeWs(s) {
  return String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
function isDeceasedRoleCell(role) {
  const r = normalizeWs(role);
  if (!r) return false;
  if (r === "\uACE0\uC778" || r === "\u6545") return true;
  if (/^故\s*인$/.test(r) || r === "\u6545\uC778" || r === "\u6545\u4EBA") return true;
  if (/^고\s*인$/.test(r)) return true;
  if (r === "\uBCC4\uC138\uC790" || r === "\u4ED9\u901D") return true;
  if (/고인/.test(r) && r.length <= 8) return true;
  const compact = r.replace(/\s+/g, "");
  if (compact === "\uACE0\uC778" || compact === "\u6545\uC778" || compact === "\u6545\u4EBA") return true;
  return false;
}
function extractNamesLineFromLi($, el) {
  const $el = $(el);
  const rawParts = [];
  $el.find("b.name").each((__, b) => {
    const t = normalizeWs($(b).text());
    if (t) rawParts.push(t);
  });
  if (!rawParts.length) {
    $el.find("span.name, strong.name, em.name").each((__, n) => {
      const t = normalizeWs($(n).text());
      if (t) rawParts.push(t);
    });
  }
  if (!rawParts.length) {
    $el.find("b, strong").each((__, n) => {
      if ($(n).closest("p.title").length) return;
      const t = normalizeWs($(n).text());
      if (t && t.length < 120) rawParts.push(t);
    });
  }
  let namesLine = "";
  if (rawParts.length > 1) {
    namesLine = rawParts.map(function(p) {
      return normalizeWs(p).replace(/,\s*$/, "");
    }).filter(Boolean).join(" ,");
  } else if (rawParts.length === 1) {
    namesLine = rawParts[0].replace(/\s*,\s*/g, ",").replace(/,+/g, ",").trim();
  }
  if (!namesLine) {
    const $clone = $el.clone();
    $clone.find("p.title").remove();
    $clone.find("svg, script, style").remove();
    let rest = normalizeWs($clone.text());
    if (rest) namesLine = rest.replace(/^[\s:：·,，]+|[\s:：·,，]+$/g, "");
  }
  return namesLine || "";
}
function tryParseDeceasedFromPlainText(raw) {
  const n = normalizeWs(raw || "");
  if (!n) return "";
  let m = n.match(
    /故\s*([^\s\-–—|:：，,.·\n\r]+?)(?=\s*(?:[\-–—|·]|님의|님\s*[,，]|\(|장례|부고|빈소|삼가|\||$))/i
  );
  if (m) return normalizeWs(m[1].replace(/님$/, ""));
  m = n.match(/^([가-힣·]{2,20})\s*님의\s*장례/);
  if (m) return normalizeWs(m[1]);
  m = n.match(/(?:삼가|빈소|발인|별세)[^ 가-힣]*故\s*([가-힣·]{2,20})/);
  if (m) return normalizeWs(m[1]);
  return "";
}
function parseDeceasedNameFromMeta($) {
  const sources = [
    $('meta[property="og:title"]').attr("content"),
    $('meta[name="twitter:title"]').attr("content"),
    $('meta[property="og:description"]').attr("content"),
    $('meta[name="description"]').attr("content"),
    $("title").text()
  ];
  for (let i = 0; i < sources.length; i += 1) {
    const hit = tryParseDeceasedFromPlainText(sources[i]);
    if (hit) return hit;
  }
  return "";
}
function parseDeceasedFromJsonLd($) {
  let found = "";
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      let text = ($(el).text() || "").trim();
      if (!text) text = String($(el).html() || "").trim();
      if (!text) return;
      const j = JSON.parse(text);
      const list = Array.isArray(j) ? j : j["@graph"] ? Array.isArray(j["@graph"]) ? j["@graph"] : [j["@graph"]] : [j];
      for (let k = 0; k < list.length; k += 1) {
        const item = list[k];
        if (!item || typeof item !== "object") continue;
        const type = item["@type"];
        const types = Array.isArray(type) ? type : type ? [type] : [];
        const isPerson = types.indexOf("Person") !== -1 || types.some(function(t) {
          return String(t).toLowerCase() === "person";
        });
        if (!isPerson) continue;
        const nm = item.name || item.givenName;
        if (nm && typeof nm === "string") {
          const nw = normalizeWs(nm.replace(/^故\s*/, ""));
          if (nw) {
            found = nw;
            return;
          }
        }
      }
    } catch (e) {
    }
  });
  return found;
}
function parseDeceasedFromProfileParagraph($) {
  const reFull = /^故?\s*([가-힣·]{2,20})\s*[（(]\s*(\d{1,3})\s*세\s*\/\s*((?:남|여)(?:성)?)\s*[）)]/;
  const noise = /발인일|장례식장\s*위치|오시는\s*길|계좌번호|부의금\s*서비스|주차|교통\s*안내/i;
  const empty = { name: "", ageGenderLine: null };
  const nodes = $("p").toArray().concat(
    $("div").filter(function(_, el) {
      const t = normalizeWs($(el).text());
      return t.length >= 5 && t.length <= 100 && /\d+\s*세\s*\//.test(t);
    })
  );
  for (let i = 0; i < nodes.length; i += 1) {
    let raw = String($(nodes[i]).text() || "").normalize("NFKC").replace(/\u00a0/g, " ");
    raw = normalizeWs(raw);
    if (!raw || raw.length > 120 || noise.test(raw)) continue;
    const m = raw.match(reFull);
    if (m) {
      let g = m[3];
      if (g === "\uC5EC\uC131") g = "\uC5EC";
      else if (g === "\uB0A8\uC131") g = "\uB0A8";
      return {
        name: normalizeWs(m[1]),
        ageGenderLine: "(" + m[2] + " \uC138 / " + g + ")"
      };
    }
  }
  return empty;
}
function parseDeceasedFromHeading($) {
  const skip = /페이지|오류|error|장례\s*안내|부고\s*알림/i;
  const sels = [
    ".funeral-name",
    ".obituary-name",
    ".view-name",
    ".name-area",
    ".deceased-name",
    "h1",
    "h2"
  ];
  for (let s = 0; s < sels.length; s += 1) {
    const t = normalizeWs($(sels[s]).first().text());
    if (!t || t.length < 2 || t.length > 80 || skip.test(t)) continue;
    const m = t.match(/故\s*([^\s\n\r]+)/);
    if (m) return normalizeWs(m[1].replace(/님$/, ""));
    if (/^[가-힣·]+\s*님?$/.test(t) && !/(단계|입력|선택|주소록)/.test(t)) {
      return normalizeWs(t.replace(/님$/, ""));
    }
  }
  return "";
}
function pad2(n) {
  const x = Number(n);
  return (x < 10 ? "0" : "") + x;
}
function formatIsoDateTimeForBugoTemplate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  const cal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(d);
  const g = function(t) {
    const p = cal.find(function(x) {
      return x.type === t;
    });
    return p ? p.value : "";
  };
  const y = g("year");
  const mo = g("month");
  const day = g("day");
  const hour = g("hour");
  const minute = g("minute");
  const wparts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "narrow"
  }).formatToParts(d);
  const wd = wparts.find(function(x) {
    return x.type === "weekday";
  });
  const wdStr = wd ? wd.value : "";
  if (!y || !mo || !day || !wdStr) return "";
  return Number(y) + "\uB144 " + pad2(Number(mo)) + "\uC6D4 " + pad2(Number(day)) + "\uC77C(" + wdStr + ") " + pad2(Number(hour)) + "\uC2DC " + pad2(Number(minute)) + "\uBD84";
}
function mapModubugoRelationToRole(relation) {
  const r = normalizeWs(relation);
  if (!r) return "";
  if (r === "\uC544\uB4E4" || r === "\uC7A5\uB0A8" || r === "\uCC28\uB0A8" || r === "\uC0BC\uB0A8" || r === "\uB9C9\uB0B4" || r === "\uB9C9\uB0B4\uC544\uB4E4") {
    return "\uC790";
  }
  if (r === "\uB140" || r === "\uB538" || r === "\uC7A5\uB140" || r === "\uCC28\uB140") return "\uB538";
  if (r === "\uC790\uBD80" || r === "\uBA70\uB290\uB9AC") return "\uBA70\uB290\uB9AC";
  if (r === "\uC0AC\uC704" || r.indexOf("\uC0AC\uC704") === 0) return "\uC0AC\uC704";
  if (r === "\uC190" || r === "\uC190\uC790" || r === "\uC190\uB140" || r === "\uC678\uC190\uC790" || r === "\uC678\uC190\uB140") return "\uC190";
  return "";
}
function modubugoMournerSortRank(role) {
  const r = normalizeWs(role);
  if (!r) return 99;
  if (r === "\uC0C1\uC8FC" || r.indexOf("\uC0C1\uC8FC") !== -1 && r.length <= 16) return 0;
  if (r === "\uBA70\uB290\uB9AC" || r === "\uC790\uBD80" || r.indexOf("\uC790\uBD80") === 0) return 2;
  if (r === "\uB538" || r === "\uB140" || r === "\uC7A5\uB140" || r === "\uCC28\uB140") return 3;
  if (r === "\uC0AC\uC704" || r.indexOf("\uC0AC\uC704") === 0) return 4;
  if (r === "\uC190" || r === "\uC190\uC790" || r === "\uC190\uB140") return 5;
  if (r === "\uC790" || r === "\uC7A5\uB0A8" || r === "\uCC28\uB0A8" || r === "\uC0BC\uB0A8" || r === "\uC544\uB4E4" || r === "\uB9C9\uB0B4" || r === "\uB9C9\uB0B4\uC544\uB4E4") {
    return 1;
  }
  return 10;
}
function buildMournersFromModubugoRelationRows(rows) {
  if (!rows || !rows.length) return [];
  const groups = /* @__PURE__ */ new Map();
  let ord = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const name = normalizeWs(row && row.name != null ? row.name : "");
    if (!name) continue;
    const role = mapModubugoRelationToRole(row && row.relation != null ? row.relation : "");
    if (!role) continue;
    if (!groups.has(role)) {
      groups.set(role, { names: [], _ord: ord++ });
    }
    groups.get(role).names.push(name);
  }
  const out = [];
  groups.forEach(function(g, role) {
    out.push({ role, namesLine: g.names.join(", "), _ord: g._ord });
  });
  out.sort(function(a, b) {
    const ra = modubugoMournerSortRank(a.role);
    const rb = modubugoMournerSortRank(b.role);
    if (ra !== rb) return ra - rb;
    return (a._ord || 0) - (b._ord || 0);
  });
  out.forEach(function(m) {
    delete m._ord;
  });
  return out;
}
function modubugoFamilyRowsFromBugo(bugo) {
  const bf = bugo && bugo.BugoFamily;
  if (Array.isArray(bf) && bf.length) {
    return bf.map(function(x) {
      if (!x || typeof x !== "object") return { name: "", relation: "" };
      return {
        name: x.name != null ? x.name : x.personName || "",
        relation: x.relation != null ? x.relation : x.role || ""
      };
    });
  }
  const sl = bugo && bugo.SangjuList;
  if (!Array.isArray(sl) || !sl.length) return [];
  return sl.map(function(x) {
    if (!x || typeof x !== "object") return { name: "", relation: "" };
    return { name: x.name, relation: x.relation };
  });
}
function modubugoDeceasedAgeGender(bugo) {
  if (!bugo) return null;
  const ageOk = bugo.ageExpose !== false && bugo.deceasedAge != null && String(bugo.deceasedAge).trim() !== "";
  const sexOk = bugo.sexExpose !== false && bugo.deceasedSex;
  if (!ageOk || !sexOk) return null;
  const age = String(bugo.deceasedAge).trim();
  const sx = String(bugo.deceasedSex).trim();
  const sex = sx === "\uB0A8" ? "\uB0A8" : "\uC5EC";
  return "(" + age + " \uC138 / " + sex + ")";
}
function splitModubugoGrave(graveRaw) {
  const g = normalizeWs(graveRaw);
  if (!g) return { jangji1: "", jangji2: null };
  const parts = g.split(/\s*>\s*/).map(normalizeWs).filter(Boolean);
  if (parts.length >= 2) {
    const j2 = parts.slice(1).join(" > ");
    return { jangji1: parts[0], jangji2: j2 || null };
  }
  return { jangji1: g, jangji2: null };
}
function modubugoFuneralHallLine(bugo, funeral) {
  const hallName = normalizeWs(funeral && funeral.name);
  const binso = bugo && bugo.binso != null ? normalizeWs(bugo.binso) : "";
  if (hallName && binso) return hallName + " " + binso;
  if (hallName) return hallName;
  return binso || "";
}
function parseFuneralPageHtml(html) {
  const $ = cheerio.load(html);
  const mourners = [];
  let deceasedName = "";
  let deceasedRowIdx = -1;
  const rows = [];
  $("ul.item-wrap.name-wrap li").each((idx, el) => {
    let role = normalizeWs($(el).find("p.title").first().text());
    if (!role) role = normalizeWs($(el).find('[class*="title"]').first().text());
    const namesLine = extractNamesLineFromLi($, el);
    if (!namesLine) return;
    rows.push({ idx, role, namesLine });
  });
  rows.forEach(function(row) {
    const byRole = row.role && isDeceasedRoleCell(row.role);
    const byNameOnly = !row.role && /^故\s*[^\s]/.test(row.namesLine);
    if ((byRole || byNameOnly) && !deceasedName) {
      deceasedName = row.namesLine;
      deceasedRowIdx = row.idx;
    }
  });
  if (!deceasedName) {
    const hit = rows.find(function(r) {
      return /^故\s*[^\s]/.test(r.namesLine);
    });
    if (hit) {
      deceasedName = hit.namesLine;
      deceasedRowIdx = hit.idx;
    }
  }
  let mournerOrd = 0;
  rows.forEach(function(row) {
    if (row.idx === deceasedRowIdx) return;
    if (!row.role) return;
    mourners.push({ role: row.role, namesLine: row.namesLine, _ord: mournerOrd++ });
  });
  function mournerSortRank(role) {
    const r = normalizeWs(role);
    if (!r) return 99;
    if (r === "\uC0C1\uC8FC" || r.indexOf("\uC0C1\uC8FC") !== -1 && r.length <= 16) return 0;
    if (r === "\uBA70\uB290\uB9AC" || r === "\uC790\uBD80" || r.indexOf("\uC790\uBD80") === 0) return 2;
    if (r === "\uB538" || r === "\uB140" || r === "\uC7A5\uB140" || r === "\uCC28\uB140") return 3;
    if (r === "\uC0AC\uC704" || r.indexOf("\uC0AC\uC704") === 0) return 4;
    if (r === "\uC190" || r === "\uC190\uC790" || r === "\uC190\uB140") return 5;
    if (r === "\uC790" || r === "\uC7A5\uB0A8" || r === "\uCC28\uB0A8" || r === "\uC0BC\uB0A8" || r === "\uC544\uB4E4" || r === "\uB9C9\uB0B4" || r === "\uB9C9\uB0B4\uC544\uB4E4")
      return 1;
    return 10;
  }
  mourners.sort(function(a, b) {
    const ra = mournerSortRank(a.role);
    const rb = mournerSortRank(b.role);
    if (ra !== rb) return ra - rb;
    return (a._ord || 0) - (b._ord || 0);
  });
  mourners.forEach(function(m) {
    delete m._ord;
  });
  if (!deceasedName) {
    $("ul.item-wrap li").each(function(_, el) {
      if (deceasedName) return false;
      const role = normalizeWs($(el).find("p.title").first().text());
      if (!isDeceasedRoleCell(role)) return;
      const namesLine = extractNamesLineFromLi($, el);
      if (namesLine) {
        deceasedName = namesLine;
        return false;
      }
    });
  }
  if (!deceasedName) deceasedName = parseDeceasedNameFromMeta($);
  if (!deceasedName) deceasedName = parseDeceasedFromJsonLd($);
  if (!deceasedName) deceasedName = parseDeceasedFromHeading($);
  let deceasedAgeGender = null;
  const deceasedProf = parseDeceasedFromProfileParagraph($);
  if (deceasedProf.ageGenderLine) deceasedAgeGender = deceasedProf.ageGenderLine;
  if (deceasedProf.name) deceasedName = deceasedProf.name;
  let bainil = "";
  let ipgwan = "";
  $("ul.item-wrap.date-wrap li").each((_, el) => {
    const t = normalizeWs($(el).find("p.title").first().text());
    const dt = normalizeWs($(el).find("p.date").first().text());
    if (t === "\uBC1C\uC778\uC77C") bainil = dt;
    else if (t === "\uC785\uAD00" || t === "\uC785\uAD00\uC77C") ipgwan = dt;
  });
  let funeralHall = "";
  let jangji1 = "";
  let jangji2 = "";
  $("ul.item-wrap.place-wrap li").each((_, el) => {
    const title = normalizeWs($(el).find("p.title").first().text());
    const place = normalizeWs($(el).find("p.place").first().text());
    if (title === "\uC7A5\uB840\uC2DD\uC7A5") funeralHall = place;
    else if (title === "1\uCC28 \uC7A5\uC9C0") jangji1 = place;
    else if (title === "2\uCC28 \uC7A5\uC9C0") jangji2 = place;
  });
  const j2Invalid = !jangji2 || /^정보가 없습니다/i.test(jangji2) || jangji2 === "-" || jangji2 === "\u2014";
  return {
    deceasedName,
    deceasedAgeGender,
    mourners,
    ipgwan,
    bainil,
    funeralHall,
    jangji1,
    jangji2: j2Invalid ? null : jangji2
  };
}
function parseModubugoApiBody(body) {
  if (!body || typeof body !== "object") {
    throw new Error("\uBAA8\uB450\uBD80\uACE0 \uC751\uB2F5\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
  }
  if (body.success !== true || !body.result || !body.result.bugo) {
    throw new Error(
      "\uBAA8\uB450\uBD80\uACE0\uC5D0\uC11C \uD574\uB2F9 \uBD80\uACE0\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC8FC\uC18C\uB97C \uD655\uC778\uD558\uAC70\uB098 \uBB38\uC790 \uBCF8\uBB38\uC744 \uC9C1\uC811 \uC785\uB825\uD574 \uC8FC\uC138\uC694."
    );
  }
  const bugo = body.result.bugo;
  const deceasedRaw = normalizeWs(bugo.deceasedName);
  if (!deceasedRaw) {
    throw new Error("\uBAA8\uB450\uBD80\uACE0 \uC751\uB2F5\uC5D0 \uACE0\uC778 \uC131\uBA85\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uBB38\uC790 \uBCF8\uBB38\uC744 \uC9C1\uC811 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
  }
  const funeral = bugo.funeral && typeof bugo.funeral === "object" ? bugo.funeral : {};
  const rows = modubugoFamilyRowsFromBugo(bugo);
  const mourners = buildMournersFromModubugoRelationRows(rows);
  const graveParts = splitModubugoGrave(bugo.grave);
  let ipgwan = "";
  if (bugo.ibgwanExpose !== false && bugo.ibgwanDate) {
    ipgwan = formatIsoDateTimeForBugoTemplate(bugo.ibgwanDate);
  }
  let bainil = "";
  if (bugo.balinExpose !== false && bugo.balinDate) {
    bainil = formatIsoDateTimeForBugoTemplate(bugo.balinDate);
  }
  return {
    deceasedName: deceasedRaw,
    deceasedAgeGender: modubugoDeceasedAgeGender(bugo),
    mourners,
    ipgwan,
    bainil,
    funeralHall: modubugoFuneralHallLine(bugo, funeral),
    jangji1: graveParts.jangji1,
    jangji2: graveParts.jangji2
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatIsoDateTimeForBugoTemplate,
  parseFuneralPageHtml,
  parseModubugoApiBody
});
