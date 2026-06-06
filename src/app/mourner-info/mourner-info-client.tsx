"use client";

import { ChevronDown, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import "./mourner-info.css";

export const STORAGE_KEY = "ping_mourner_info_draft_v1";

/** 상주 관계 (레거시 mourner-info.html 과 동일) */
export const RELATION_OPTIONS = [
  "직접입력",
  "아들",
  "딸",
  "자",
  "녀",
  "며느리",
  "자부",
  "사위",
  "배우자",
  "남편",
  "부인",
  "손",
  "손자",
  "손녀",
  "외손",
  "외손자",
  "외손녀",
  "승중",
  "증손",
  "손부",
  "손서",
  "외손부",
  "외손서",
  "부",
  "모",
  "형",
  "동생",
  "누나",
  "남매",
  "언니",
  "자매",
  "조카",
  "형부",
  "제부",
  "매형",
  "매제",
  "처형",
  "처제",
  "처남",
  "형수",
  "제수",
  "동서",
  "친구",
  "직장동료",
  "올케",
  "질부",
  "질서",
  "시동생",
  "백부",
  "백모",
  "사촌",
  "고모",
  "고모부",
  "시부",
  "시모",
  "선배",
  "외조부",
  "외조모",
  "조부",
  "조모",
] as const;

const RELATION_OPTIONS_SET = new Set<string>(RELATION_OPTIONS);

export const BANK_LIST = [
  "KB국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "NH농협은행",
  "IBK기업은행",
  "SC제일은행",
  "한국씨티은행",
  "KDB산업은행",
  "수협은행",
  "iM뱅크(대구)",
  "부산은행",
  "경남은행",
  "광주은행",
  "전북은행",
  "제주은행",
  "한국산업은행",
  "한국수출입은행",
  "카카오뱅크",
  "케이뱅크",
  "토스뱅크",
  "SBI저축은행",
  "애큐온저축은행",
  "새마을금고",
  "신협",
  "우체국",
  "산림조합중앙회",
  "상호저축은행",
  "기타",
] as const;

type AccountDisplayType = "personal" | "representative" | "all" | "none";

type PersonRow = { id: string; name: string; phone: string };

type MournerGroup = {
  id: string;
  relationSelect: string;
  relationCustom: string;
  persons: PersonRow[];
};

type AccountLine = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  accountHolderPhone: string;
};

type AccountVerification = {
  verified: boolean;
  verifiedAt: string | null;
  matchedHolder: string;
};

type VerifyUiState = {
  text: string;
  className: string;
};

type DraftAccountEntry = AccountLine & {
  holderVerified?: boolean;
  holderVerifiedAt?: string | null;
  matchedHolder?: string;
};

type DraftPayload = {
  groups: { relation: string; persons: { name: string; phone: string }[] }[];
  account?: {
    displayType?: string;
    entries?: DraftAccountEntry[];
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    accountHolderPhone?: string;
    holderVerified?: boolean;
    holderVerifiedAt?: string | null;
  };
};

const ALLOWED_DISPLAY_TYPES: AccountDisplayType[] = [
  "personal",
  "representative",
  "all",
  "none",
];

const EMPTY_VERIFICATION: AccountVerification = {
  verified: false,
  verifiedAt: null,
  matchedHolder: "",
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyPerson(): PersonRow {
  return { id: newId(), name: "", phone: "" };
}

function emptyGroup(): MournerGroup {
  return {
    id: newId(),
    relationSelect: "",
    relationCustom: "",
    persons: [emptyPerson()],
  };
}

function getResolvedRelation(g: MournerGroup): string {
  if (g.relationSelect === "직접입력") {
    return g.relationCustom.trim() || "직접입력";
  }
  return g.relationSelect;
}

function collectMournerContactsFlat(groups: MournerGroup[]) {
  const lines: { name: string; phone: string }[] = [];
  for (const g of groups) {
    for (const p of g.persons) {
      const name = p.name.trim();
      const phone = p.phone.trim();
      if (name || phone) lines.push({ name, phone });
    }
  }
  return lines;
}

function collectMournerData(groups: MournerGroup[]) {
  return groups.map((g) => {
    const relation = getResolvedRelation(g);
    const persons: { name: string; phone: string }[] = [];
    for (const row of g.persons) {
      const name = row.name.trim();
      const phone = row.phone.trim();
      if (name || phone) persons.push({ name, phone });
    }
    return { relation, persons };
  });
}

function loadDraft(): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

function parseDisplayType(raw: string | undefined): AccountDisplayType {
  if (raw && ALLOWED_DISPLAY_TYPES.includes(raw as AccountDisplayType)) {
    return raw as AccountDisplayType;
  }
  return "personal";
}

function draftToGroups(draft: DraftPayload): MournerGroup[] {
  if (!Array.isArray(draft.groups) || draft.groups.length === 0) {
    return [emptyGroup()];
  }
  return draft.groups.map((g) => {
    const relation = g.relation || "";
    const inList = RELATION_OPTIONS_SET.has(relation);
    const persons =
      g.persons && g.persons.length
        ? g.persons.map((p) => ({
            id: newId(),
            name: p.name || "",
            phone: p.phone || "",
          }))
        : [emptyPerson()];
    return {
      id: newId(),
      relationSelect: inList ? relation : relation ? "직접입력" : "",
      relationCustom: inList ? "" : relation,
      persons,
    };
  });
}

function accountEntriesFromDraft(acc: DraftPayload["account"]): DraftAccountEntry[] {
  if (!acc) return [];
  if (Array.isArray(acc.entries) && acc.entries.length) return acc.entries;
  if (acc.bankName || acc.accountNumber || acc.accountHolder) {
    return [
      {
        bankName: acc.bankName || "",
        accountNumber: acc.accountNumber || "",
        accountHolder: acc.accountHolder || "",
        accountHolderPhone: acc.accountHolderPhone || "",
        holderVerified: acc.holderVerified,
        holderVerifiedAt: acc.holderVerifiedAt ?? null,
        matchedHolder: acc.accountHolder || "",
      },
    ];
  }
  return [];
}

function buildAccountLinesFromContacts(
  contacts: { name: string; phone: string }[],
  prev: AccountLine[],
): AccountLine[] {
  return contacts.map((c, i) => {
    const old = prev[i];
    return {
      bankName: old?.bankName ?? "",
      accountNumber: old?.accountNumber ?? "",
      accountHolder: c.name,
      accountHolderPhone: c.phone,
    };
  });
}

function restoreVerificationsFromDraft(
  lines: AccountLine[],
  entries: DraftAccountEntry[],
): AccountVerification[] {
  return lines.map((line, i) => {
    const e = entries[i];
    if (
      e?.holderVerified &&
      (e.bankName || line.bankName) &&
      String(e.accountNumber || "").trim() === line.accountNumber.trim()
    ) {
      const matched = e.matchedHolder || e.accountHolder || "";
      const hNow = line.accountHolder.trim();
      if (hNow !== matched.trim()) return { ...EMPTY_VERIFICATION };
      return {
        verified: true,
        verifiedAt: e.holderVerifiedAt || null,
        matchedHolder: matched,
      };
    }
    return { ...EMPTY_VERIFICATION };
  });
}

export default function MournerInfoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const baseId = useId();
  const hydrated = useRef(false);

  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"mourner" | "account">("mourner");
  const [groups, setGroups] = useState<MournerGroup[]>([emptyGroup()]);
  const [accountDisplayType, setAccountDisplayType] =
    useState<AccountDisplayType>("personal");
  const [accountLines, setAccountLines] = useState<AccountLine[]>([]);
  const [verifications, setVerifications] = useState<AccountVerification[]>([]);
  const [verifyUi, setVerifyUi] = useState<VerifyUiState[]>([]);
  const [verifyingIndex, setVerifyingIndex] = useState<number | null>(null);

  const flatContacts = useMemo(
    () => collectMournerContactsFlat(groups),
    [groups],
  );

  const accountInputsDisabled = accountDisplayType === "none";

  const livePreview = useMemo(() => {
    const first = groups[0];
    if (!first) return null;
    const rel = getResolvedRelation(first);
    const row = first.persons[0];
    const name = row?.name.trim() || "";
    const phone = row?.phone.trim() || "";
    if (!name && !phone) return null;
    const parts = [name, phone].filter(Boolean);
    return {
      relation: rel || "관계",
      line: parts.length ? parts.join(" ") : "이름·연락처를 입력해 주세요",
    };
  }, [groups]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const draft = loadDraft();
    const tab = searchParams.get("tab");
    if (tab === "account") setActiveTab("account");

    if (draft) {
      const nextGroups = draftToGroups(draft);
      setGroups(nextGroups);
      setAccountDisplayType(parseDisplayType(draft.account?.displayType));

      const contacts = collectMournerContactsFlat(nextGroups);
      const entries = accountEntriesFromDraft(draft.account);
      const lines = contacts.map((c, i) => {
        const e = entries[i];
        return {
          bankName: e?.bankName || "",
          accountNumber: e?.accountNumber || "",
          accountHolder: c.name,
          accountHolderPhone: c.phone,
        };
      });
      const restored = restoreVerificationsFromDraft(lines, entries);
      setAccountLines(lines);
      setVerifications(restored);
      setVerifyUi(
        restored.map((v) =>
          v.verified
            ? {
                text: `예금주 확인 완료 · ${v.matchedHolder}`,
                className:
                  "account-line-verify-status text-[0.75rem] px-4 pb-2 min-h-[1.25rem] text-emerald-700 font-semibold",
              }
            : {
                text: "",
                className:
                  "account-line-verify-status text-[0.75rem] px-4 pb-2 min-h-[1.25rem]",
              },
        ),
      );
    } else {
      setGroups([emptyGroup()]);
      setAccountLines([]);
      setVerifications([]);
      setVerifyUi([]);
    }
    setReady(true);
  }, [searchParams]);

  useEffect(() => {
    if (!ready) return;

    setAccountLines((prev) => buildAccountLinesFromContacts(flatContacts, prev));
    setVerifications((prev) => {
      const n = flatContacts.length;
      const next = prev.slice(0, n);
      while (next.length < n) next.push({ ...EMPTY_VERIFICATION });
      return next.map((v, i) => {
        if (!v.verified) return v;
        const hNow = flatContacts[i]?.name.trim() || "";
        if (hNow !== (v.matchedHolder || "").trim()) {
          return { ...EMPTY_VERIFICATION };
        }
        return v;
      });
    });
    setVerifyUi((prev) => {
      const n = flatContacts.length;
      const next = prev.slice(0, n);
      while (next.length < n) {
        next.push({
          text: "",
          className:
            "account-line-verify-status text-[0.75rem] px-4 pb-2 min-h-[1.25rem]",
        });
      }
      return next.slice(0, n);
    });
  }, [flatContacts, ready]);

  useEffect(() => {
    if (!accountInputsDisabled) return;
    setVerifications((prev) =>
      prev.map(() => ({ ...EMPTY_VERIFICATION })),
    );
    setVerifyUi((prev) =>
      prev.map(() => ({
        text: "",
        className:
          "account-line-verify-status text-[0.75rem] px-4 pb-2 min-h-[1.25rem]",
      })),
    );
  }, [accountInputsDisabled]);

  const updateGroup = useCallback(
    (groupId: string, patch: Partial<MournerGroup>) => {
      setGroups((gs) =>
        gs.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
      );
    },
    [],
  );

  const addRelationGroup = useCallback(() => {
    setGroups((gs) => [...gs, emptyGroup()]);
  }, []);

  const addPersonRow = useCallback((groupId: string) => {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? { ...g, persons: [...g.persons, emptyPerson()] }
          : g,
      ),
    );
  }, []);

  const updatePerson = useCallback(
    (
      groupId: string,
      personId: string,
      field: "name" | "phone",
      value: string,
    ) => {
      setGroups((gs) =>
        gs.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            persons: g.persons.map((p) =>
              p.id === personId ? { ...p, [field]: value } : p,
            ),
          };
        }),
      );
    },
    [],
  );

  const invalidateVerification = useCallback((idx: number) => {
    setVerifications((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const next = [...prev];
      next[idx] = { ...EMPTY_VERIFICATION };
      return next;
    });
    setVerifyUi((prev) => {
      if (idx < 0 || idx >= prev.length) return prev;
      const next = [...prev];
      next[idx] = {
        text: "",
        className:
          "account-line-verify-status text-[0.75rem] px-4 pb-2 min-h-[1.25rem]",
      };
      return next;
    });
  }, []);

  const updateAccountLine = useCallback(
    (idx: number, patch: Partial<AccountLine>) => {
      setAccountLines((prev) => {
        const next = [...prev];
        if (!next[idx]) return prev;
        next[idx] = { ...next[idx], ...patch };
        return next;
      });
      if ("bankName" in patch || "accountNumber" in patch) {
        invalidateVerification(idx);
        return;
      }
      if ("accountHolder" in patch) {
        setVerifications((prev) => {
          const v = prev[idx];
          if (
            !v?.verified ||
            (patch.accountHolder ?? "").trim() ===
              (v.matchedHolder || "").trim()
          ) {
            return prev;
          }
          const next = [...prev];
          next[idx] = { ...EMPTY_VERIFICATION };
          return next;
        });
        setVerifyUi((prev) => {
          const next = [...prev];
          next[idx] = {
            text: "",
            className:
              "account-line-verify-status text-[0.75rem] px-4 pb-2 min-h-[1.25rem]",
          };
          return next;
        });
      }
    },
    [invalidateVerification],
  );

  const saveDraft = useCallback(() => {
    const entries = accountLines.map((line, idx) => {
      const ver = verifications[idx] || EMPTY_VERIFICATION;
      return {
        bankName: line.bankName.trim(),
        accountNumber: line.accountNumber.trim(),
        accountHolder: line.accountHolder.trim(),
        accountHolderPhone: line.accountHolderPhone.trim(),
        holderVerified: !!ver.verified,
        holderVerifiedAt: ver.verifiedAt,
        matchedHolder: ver.matchedHolder || "",
      };
    });
    const first = entries[0] || {
      bankName: "",
      accountNumber: "",
      accountHolder: "",
      accountHolderPhone: "",
      holderVerified: false,
      holderVerifiedAt: null,
      matchedHolder: "",
    };
    const payload = {
      groups: collectMournerData(groups),
      account: {
        displayType: accountDisplayType,
        entries,
        bankName: first.bankName || "",
        accountNumber: first.accountNumber || "",
        accountHolder: first.accountHolder || "",
        accountHolderPhone: first.accountHolderPhone || "",
        holderVerified: !!first.holderVerified,
        holderVerifiedAt: first.holderVerifiedAt || null,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [accountDisplayType, accountLines, groups, verifications]);

  const handleSave = useCallback(() => {
    saveDraft();
    router.push("/obituary-form");
  }, [router, saveDraft]);

  const verifyAccount = useCallback(
    async (idx: number) => {
      const line = accountLines[idx];
      if (!line) return;
      const bank = line.bankName.trim();
      const num = line.accountNumber.trim();
      const statusClass =
        "account-line-verify-status text-[0.75rem] px-4 pb-2 min-h-[1.25rem]";

      if (!bank || !num) {
        setVerifyUi((prev) => {
          const next = [...prev];
          next[idx] = {
            text: "은행과 계좌번호를 입력한 뒤 눌러 주세요.",
            className: `${statusClass} text-red-600 font-medium`,
          };
          return next;
        });
        return;
      }

      setVerifyingIndex(idx);
      setVerifyUi((prev) => {
        const next = [...prev];
        next[idx] = {
          text: "예금주 확인 중…",
          className: `${statusClass} text-slate-500`,
        };
        return next;
      });

      try {
        const res = await fetch("/api/verify-account-holder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankName: bank, accountNumber: num }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          notConfigured?: boolean;
          message?: string;
          error?: string;
          holderName?: string;
        };

        if (data.notConfigured) {
          setVerifyUi((prev) => {
            const next = [...prev];
            next[idx] = {
              text:
                data.message || "서버에 IMP_API_KEY 설정이 없습니다.",
              className: `${statusClass} text-slate-500`,
            };
            return next;
          });
          return;
        }

        if (!data.ok) {
          setVerifyUi((prev) => {
            const next = [...prev];
            next[idx] = {
              text: data.error || "예금주 확인에 실패했습니다.",
              className: `${statusClass} text-red-600 font-medium`,
            };
            return next;
          });
          return;
        }

        const holder = String(data.holderName || "").trim();
        setVerifications((prev) => {
          const next = [...prev];
          next[idx] = {
            verified: true,
            verifiedAt: new Date().toISOString(),
            matchedHolder: holder,
          };
          return next;
        });
        updateAccountLine(idx, { accountHolder: holder });
        setVerifyUi((prev) => {
          const next = [...prev];
          next[idx] = {
            text: `예금주 확인 완료 · ${holder}`,
            className: `${statusClass} text-emerald-700 font-semibold`,
          };
          return next;
        });
      } catch {
        setVerifyUi((prev) => {
          const next = [...prev];
          next[idx] = {
            text:
              "서버에 연결할 수 없습니다. 개발 서버(npm run dev)에서 열었는지 확인해 주세요.",
            className: `${statusClass} text-red-600 font-medium`,
          };
          return next;
        });
      } finally {
        setVerifyingIndex(null);
      }
    },
    [accountLines, updateAccountLine],
  );

  const switchTab = useCallback((which: "mourner" | "account") => {
    setActiveTab(which);
    if (which === "account") {
      setAccountLines((prev) =>
        buildAccountLinesFromContacts(flatContacts, prev),
      );
    }
  }, [flatContacts]);

  const relationOptionsForSelect = useMemo(() => {
    const extra = new Set<string>();
    for (const g of groups) {
      const r = getResolvedRelation(g);
      if (r && !RELATION_OPTIONS_SET.has(r)) extra.add(r);
    }
    return [...RELATION_OPTIONS, ...extra];
  }, [groups]);

  return (
    <div className="mourner-info-page ping-ui text-slate-800">
      <div className="page">
        <header className="ping-sticky-page-header sticky top-0 z-20 flex items-center gap-1 bg-white px-3 py-3">
          <Link
            href="/obituary-form"
            className="ping-back-btn shrink-0 touch-manipulation"
            aria-label="뒤로"
          >
            <span className="ping-chevron-left" aria-hidden="true" />
          </Link>
          <h1 className="flex-1 pr-11 text-center text-[1.05rem] font-bold tracking-tight text-slate-900">
            상주 정보
          </h1>
        </header>

        <div className="sticky top-[52px] z-10 flex border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => switchTab("mourner")}
            className={
              activeTab === "mourner"
                ? "flex-1 border-b-[3px] border-slate-900 bg-white py-3.5 text-[0.9rem] font-bold text-slate-900"
                : "flex-1 border-b-[3px] border-transparent py-3.5 text-[0.9rem] font-medium text-slate-400 transition hover:text-slate-600"
            }
          >
            상주정보
          </button>
          <button
            type="button"
            onClick={() => switchTab("account")}
            className={
              activeTab === "account"
                ? "flex-1 border-b-[3px] border-slate-900 bg-white py-3.5 text-[0.9rem] font-bold text-slate-900"
                : "flex-1 border-b-[3px] border-transparent py-3.5 text-[0.9rem] font-medium text-slate-400 transition hover:text-slate-600"
            }
          >
            계좌정보
          </button>
        </div>

        <main className="px-4 pt-4">
          {activeTab === "mourner" ? (
            <div id="panelMourner">
              <div className="mb-5 rounded-xl border border-sky-100/80 bg-sky-50 px-4 py-3.5 text-[0.78rem] leading-relaxed text-slate-700">
                <ul className="list-disc space-y-2 pl-4 marker:text-dongban-cyan">
                  <li>
                    계좌정보를 지금 입력하지 않아도 부고를 완성할 수 있습니다.
                  </li>
                  <li>
                    상주에게 발송되는{" "}
                    <span className="font-bold text-slate-800">
                      [부고 보내기 안내]
                    </span>{" "}
                    알림톡에서 상주가 직접 계좌를 등록할 수 있습니다.
                  </li>
                </ul>
              </div>

              <div id="mournerGroups" className="space-y-5">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="mourner-group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex min-h-[48px] items-stretch border-b border-slate-200/80 bg-slate-100">
                      <span className="flex w-[52px] shrink-0 items-center border-r border-slate-200/60 bg-slate-100 px-3 text-[0.8rem] font-bold text-slate-500">
                        관계
                      </span>
                      <div className="relative flex min-w-0 flex-1 flex-col justify-center">
                        <div className="relative flex items-center">
                          <select
                            className="select-relation relation-select w-full"
                            aria-label="관계 선택"
                            value={group.relationSelect}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateGroup(group.id, {
                                relationSelect: v,
                                relationCustom:
                                  v === "직접입력"
                                    ? group.relationCustom
                                    : "",
                              });
                            }}
                          >
                            <option value="" disabled>
                              관계 선택
                            </option>
                            {relationOptionsForSelect.map((text) => (
                              <option key={`${group.id}-${text}`} value={text}>
                                {text}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-3 top-1/2 size-2.5 -translate-y-1/2 text-slate-400"
                            aria-hidden
                          />
                        </div>
                        {group.relationSelect === "직접입력" ? (
                          <input
                            type="text"
                            className="w-full border-t border-slate-200 bg-white px-3 py-2 text-[0.85rem] text-slate-800 outline-none placeholder:text-slate-400"
                            placeholder="관계 직접입력"
                            autoComplete="off"
                            value={group.relationCustom}
                            onChange={(e) =>
                              updateGroup(group.id, {
                                relationCustom: e.target.value,
                              })
                            }
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="person-rows">
                      {group.persons.map((person) => (
                        <div
                          key={person.id}
                          className="person-row field-divider grid grid-cols-2 divide-x divide-slate-100"
                        >
                          <input
                            type="text"
                            className="input-plain mourner-name"
                            placeholder="이름"
                            autoComplete="name"
                            value={person.name}
                            onChange={(e) =>
                              updatePerson(
                                group.id,
                                person.id,
                                "name",
                                e.target.value,
                              )
                            }
                          />
                          <input
                            type="tel"
                            className="input-plain mourner-phone"
                            placeholder="전화번호"
                            autoComplete="tel"
                            value={person.phone}
                            onChange={(e) =>
                              updatePerson(
                                group.id,
                                person.id,
                                "phone",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="add-name-btn flex w-full items-center justify-center gap-2 border-t border-slate-100 py-3 text-[0.85rem] font-bold text-dongban-cyan transition hover:bg-slate-50"
                      onClick={() => addPersonRow(group.id)}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-dongban-cyan text-[0.65rem] leading-none">
                        +
                      </span>
                      이름 추가
                    </button>
                  </div>
                ))}
              </div>

              {livePreview ? (
                <div
                  id="mournerLivePreview"
                  className="mb-4 mt-2 rounded-xl border border-slate-200/80 bg-slate-100 px-4 py-3.5"
                >
                  <p className="preview-relation mb-1 text-[0.8rem] font-semibold text-slate-500">
                    {livePreview.relation}
                  </p>
                  <p className="preview-line text-[0.95rem] font-bold tracking-tight text-slate-900">
                    {livePreview.line}
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                id="btnAddRelation"
                className="mb-2 mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dongban-cyan bg-white px-4 py-3 text-[0.85rem] font-bold text-dongban-cyan transition hover:bg-dongban-cyan/5"
                onClick={addRelationGroup}
              >
                <UserPlus className="text-lg" aria-hidden />
                관계 추가
              </button>
            </div>
          ) : (
            <div id="panelAccount">
              <div className="mb-5 rounded-xl border border-sky-100/80 bg-sky-50 px-4 py-3.5 text-[0.78rem] leading-relaxed text-slate-700">
                <p>
                  조문객에게 안내될 계좌를 여기에서만 입력합니다.{" "}
                  <strong className="text-slate-800">
                    상주 정보에 이름·전화가 있는 행마다
                  </strong>{" "}
                  계좌 입력 블록이 나뉩니다. 부고 작성 화면의{" "}
                  <strong className="text-slate-800">계좌정보 입력</strong>
                  으로도 같은 내용을 수정할 수 있습니다.
                </p>
              </div>
              {flatContacts.length === 0 ? (
                <p
                  id="accountRowsEmptyHint"
                  className="mb-3 px-1 text-[0.8rem] leading-relaxed text-slate-500"
                >
                  상주 정보에서 이름 또는 전화번호를 입력하면, 그 줄마다 계좌
                  블록이 표시됩니다.
                </p>
              ) : null}
              <div id="accountRowsContainer" className="mb-3 space-y-0">
                {accountLines.map((line, idx) => {
                  const label =
                    line.accountHolder ||
                    line.accountHolderPhone ||
                    `상주 ${idx + 1}`;
                  const ui = verifyUi[idx];
                  const ver = verifications[idx];
                  const showVerified =
                    ver?.verified &&
                    !verifyUi[idx]?.text.includes("예금주 확인 중");
                  return (
                    <div
                      key={`${baseId}-acct-${idx}`}
                      className="account-line mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm last:mb-0"
                      data-account-index={idx}
                    >
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                        <span className="account-line-title text-[0.8rem] font-bold text-slate-600">
                          계좌 · {label}
                        </span>
                      </div>
                      <div className="field-divider relative bg-white">
                        <label className="label-field">은행명</label>
                        <select
                          className="account-line-bank select-bank border-0"
                          aria-label="은행 선택"
                          value={line.bankName}
                          disabled={accountInputsDisabled}
                          onChange={(e) =>
                            updateAccountLine(idx, {
                              bankName: e.target.value,
                            })
                          }
                        >
                          <option value="">은행선택</option>
                          {BANK_LIST.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                          {line.bankName &&
                          !BANK_LIST.includes(
                            line.bankName as (typeof BANK_LIST)[number],
                          ) ? (
                            <option value={line.bankName}>
                              {line.bankName}
                            </option>
                          ) : null}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute bottom-[18px] right-4 size-2.5 text-slate-400"
                          aria-hidden
                        />
                      </div>
                      <div className="field-divider bg-white">
                        <label className="label-field">예금주</label>
                        <p className="-mt-1 mb-0 px-4 text-[0.68rem] text-slate-400">
                          해당 상주 줄의 이름과 같습니다. 필요 시 수정할 수
                          있습니다.
                        </p>
                        <input
                          type="text"
                          className="account-line-holder input-plain pt-1"
                          placeholder="예금주명"
                          autoComplete="name"
                          value={line.accountHolder}
                          onChange={(e) =>
                            updateAccountLine(idx, {
                              accountHolder: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="field-divider bg-white">
                        <label className="label-field">전화번호</label>
                        <p className="-mt-1 mb-0 px-4 text-[0.68rem] text-slate-400">
                          해당 상주 줄의 전화번호와 같습니다.
                        </p>
                        <input
                          type="tel"
                          className="account-line-phone input-plain pt-1"
                          placeholder="전화번호"
                          autoComplete="tel"
                          value={line.accountHolderPhone}
                          onChange={(e) =>
                            updateAccountLine(idx, {
                              accountHolderPhone: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="field-divider bg-white">
                        <div className="flex items-end gap-2 px-2 pt-1">
                          <div className="min-w-0 flex-1">
                            <label className="label-field !px-2">
                              계좌번호
                            </label>
                            <input
                              type="text"
                              className="account-line-number input-plain pt-1"
                              placeholder="계좌번호 입력"
                              inputMode="numeric"
                              autoComplete="off"
                              value={line.accountNumber}
                              disabled={accountInputsDisabled}
                              onChange={(e) =>
                                updateAccountLine(idx, {
                                  accountNumber: e.target.value,
                                })
                              }
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-verify-account btn-verify-account-line"
                            disabled={
                              accountInputsDisabled || verifyingIndex === idx
                            }
                            onClick={() => verifyAccount(idx)}
                          >
                            예금주 확인
                          </button>
                        </div>
                        <p
                          className={
                            showVerified
                              ? "account-line-verify-status min-h-[1.25rem] px-4 pb-2 text-[0.75rem] font-semibold text-emerald-700"
                              : ui?.className ||
                                "account-line-verify-status min-h-[1.25rem] px-4 pb-2 text-[0.75rem]"
                          }
                          aria-live="polite"
                        >
                          {showVerified && !ui?.text
                            ? `예금주 확인 완료 · ${ver.matchedHolder}`
                            : ui?.text || ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                id="accountDisplayCard"
                className="mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="bg-white px-4 pb-3 pt-1">
                  <span className="label-field !px-0 !pt-2">계좌노출방식</span>
                  <div className="radio-grid-4 mt-2">
                    {(
                      [
                        ["personal", "개인계좌"],
                        ["representative", "대표계좌"],
                        ["all", "모든계좌"],
                        ["none", "계좌없음"],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className="radio-account">
                        <input
                          type="radio"
                          name="accountDisplayType"
                          value={value}
                          checked={accountDisplayType === value}
                          onChange={() => setAccountDisplayType(value)}
                        />
                        <span>
                          <span className="dot" aria-hidden="true" />
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mb-1 px-0.5 text-[0.7rem] text-slate-400">
                입력하신 정보는 임시저장·작성완료 시 부고 데이터에 포함됩니다.
              </p>
              <p className="mb-4 px-0.5 text-[0.68rem] leading-snug text-slate-400">
                예금주 확인은 포트원(아임포트){" "}
                <a
                  href="https://portone.gitbook.io/docs/api/api-9/api-3"
                  className="text-sky-600 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  예금주 조회 API
                </a>
                를 사용합니다. 서버에{" "}
                <code className="rounded bg-slate-100 px-1 text-[0.65rem]">
                  IMP_API_KEY
                </code>
                ·
                <code className="rounded bg-slate-100 px-1 text-[0.65rem]">
                  IMP_API_SECRET
                </code>
                이 필요합니다.
              </p>
            </div>
          )}
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-[480px] border-t border-slate-200 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            id="btnSaveMourner"
            className="w-full rounded-lg bg-dongban-cyan py-3.5 text-[0.95rem] font-extrabold text-white transition hover:opacity-90"
            onClick={handleSave}
          >
            저장하고 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
