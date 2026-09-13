"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { useFontAwesomeCdn } from "@/hooks/use-font-awesome-cdn";
import { attachDatePickersById } from "@/lib/calendar-picker";
import {
  applyObituaryDraftDom,
  collectObituaryDraftSections,
  draftSectionsFingerprint,
  readObituaryFormHydrate,
} from "@/lib/obituary-form-draft";
import {
  ensureObituaryDraft,
  fetchFuneralRooms,
  fetchObituaryDesigns,
  fetchObituaryDraft,
  patchObituarySection,
  publishObituaryDraft,
  saveObituaryDraft,
  uploadObituaryAsset,
} from "@/lib/obituary-section-client";
import {
  FUNERAL_ROOM_CUSTOM,
  funeralRoomOptions,
  withFuneralRoomChoices,
} from "@/lib/funeral-room-options";
import {
  searchFuneralHomes,
  type FuneralHallHit,
} from "@/lib/funeral-halls-search";
import {
  searchCrematoriums,
  type CrematoriumHit,
} from "@/lib/crematoriums-search";
import {
  getPingFlowRoute,
  mergeToBulkFlow,
  ROUTE_OBITUARY_THEN_BULK,
} from "@/lib/ping-flow-client";
import { FuneralHallRwiunPeek } from "@/components/obituary/funeral-hall-rwiun-peek";
import { PingSiteLegalFooter } from "@/components/ping-site-legal-footer";
import { applyObituarySettingCheckboxes } from "@/lib/ping-obituary-settings";
import {
  OBITUARY_DESIGNS,
  designIdForReligion,
  resolveObituaryDesign,
  type ObituaryDesign,
} from "@/lib/ping-obituary-designs";
import "./obituary-form.css";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES = ["00", "30"];

/** 모두부고 `deathCause`와 동일 — 나이 옆 별세 표현 */
const DECEASED_DEATH_WORDS = [
  "별세",
  "소천",
  "영면",
  "선종",
  "타계",
  "서거",
  "입적",
  "열반",
  "적멸",
  "원적",
  "환원",
  "사망",
  "임종",
] as const;

function deathWordForReligion(religion: string) {
  if (religion === "christianity" || religion === "catholic") return "소천";
  return "별세";
}

function padYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultDateStrings() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  return {
    death: padYmd(today),
    entry: padYmd(today),
    coffin: padYmd(tomorrow),
    departure: padYmd(dayAfter),
  };
}

function hourOptions() {
  return HOURS.map((h) => (
    <option key={h} value={h}>
      {h} 시
    </option>
  ));
}

function minuteOptions() {
  return MINUTES.map((m) => (
    <option key={m} value={m}>
      {m} 분
    </option>
  ));
}

function FieldChevron({ className = "" }: { className?: string }) {
  return (
    <ChevronDown
      className={`pointer-events-none absolute right-3 top-1/2 size-2.5 -translate-y-1/2 text-muted-foreground ${className}`}
      aria-hidden
    />
  );
}

export default function ObituaryFormClient() {
  useFontAwesomeCdn();
  const dates0 = useMemo(() => defaultDateStrings(), []);

  const getVal = useCallback(
    (id: string) =>
      String(
        (
          document.getElementById(id) as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement
            | null
        )?.value ?? "",
      ),
    [],
  );

  const getChecked = useCallback((id: string, fallback = false) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el || !("checked" in el)) return fallback;
    return Boolean(el.checked);
  }, []);

  const [funeralSearch, setFuneralSearch] = useState("");
  const [autoOpen, setAutoOpen] = useState(false);
  const [funeralHits, setFuneralHits] = useState<FuneralHallHit[]>([]);
  const [funeralLoading, setFuneralLoading] = useState(false);
  const funeralTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const funeralBlockRef = useRef<HTMLDivElement>(null);
  const burialBlockRef = useRef<HTMLDivElement>(null);
  const burialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [burialLocation, setBurialLocation] = useState("");
  const [burialOpen, setBurialOpen] = useState(false);
  const [burialHits, setBurialHits] = useState<CrematoriumHit[]>([]);
  const [burialLoading, setBurialLoading] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [coffinTbd, setCoffinTbd] = useState(false);
  const [coffinAfterInspection, setCoffinAfterInspection] = useState(false);
  const [departureTbd, setDepartureTbd] = useState(false);
  const [companySelect, setCompanySelect] = useState("none");
  const [hpMode, setHpMode] = useState<"register" | "none">("register");
  const [dirUrl, setDirUrl] = useState("");
  const [freeHpNotice, setFreeHpNotice] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [autoSaveLabel, setAutoSaveLabel] = useState("");
  const [mournerLine, setMournerLine] = useState(
    "등록된 상주 정보가 없습니다.",
  );
  const [mournerOk, setMournerOk] = useState(false);
  const [draftId, setDraftId] = useState("");
  const [designType, setDesignType] = useState("secular");
  const [designOpen, setDesignOpen] = useState(false);
  const [designs, setDesigns] = useState<ObituaryDesign[]>(OBITUARY_DESIGNS);
  const [funeralRooms, setFuneralRooms] = useState(funeralRoomOptions());
  const [funeralRoomMode, setFuneralRoomMode] = useState("미정");
  const [rwiunPeek, setRwiunPeek] = useState<FuneralHallHit | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const draftIdRef = useRef("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveBusy = useRef(false);
  const autoSaveQueued = useRef(false);
  const autoSaveReady = useRef(false);
  const autoSaveSkip = useRef(false);
  const lastDraftFingerprint = useRef("");

  const hpPreview = useMemo(() => {
    const raw = dirUrl.trim();
    if (!raw) return null;
    let href = raw.replace(/^\s+|\s+$/g, "");
    if (!/^https?:\/\//i.test(href)) href = "https://" + href;
    try {
      const u = new URL(href);
      return { href: u.href, label: raw };
    } catch {
      return null;
    }
  }, [dirUrl]);

  const refreshMournerLine = useCallback(() => {
    try {
      const raw = localStorage.getItem("ping_mourner_info_draft_v1");
      if (!raw) {
        setMournerLine("등록된 상주 정보가 없습니다.");
        setMournerOk(false);
        return;
      }
      const d = JSON.parse(raw) as {
        groups?: { persons?: { name?: string; phone?: string }[] }[];
      };
      const has =
        Array.isArray(d.groups) &&
        d.groups.some((g) =>
          Array.isArray(g.persons) &&
          g.persons.some(
            (p) =>
              (p.name && String(p.name).trim()) ||
              (p.phone && String(p.phone).trim()),
          ),
        );
      if (has) {
        setMournerLine(
          "상주 정보가 저장되어 있습니다. 상주정보 입력을 눌러 수정할 수 있습니다.",
        );
        setMournerOk(true);
      } else {
        setMournerLine("등록된 상주 정보가 없습니다.");
        setMournerOk(false);
      }
    } catch {
      setMournerLine("등록된 상주 정보가 없습니다.");
      setMournerOk(false);
    }
  }, []);

  const persistDraft = useCallback(
    async (opts?: { keepalive?: boolean; silent?: boolean }) => {
      if (autoSaveSkip.current) return false;
      const sections = collectObituaryDraftSections(getVal, getChecked);
      const fingerprint = draftSectionsFingerprint(sections);
      if (fingerprint === lastDraftFingerprint.current) return false;
      if (!opts?.silent) setAutoSaveLabel("저장 중…");
      const saved = await saveObituaryDraft(
        sections,
        draftIdRef.current || undefined,
        { keepalive: opts?.keepalive },
      );
      draftIdRef.current = saved.id;
      setDraftId(saved.id);
      lastDraftFingerprint.current = fingerprint;
      if (!opts?.silent) setAutoSaveLabel("자동 저장됨");
      return true;
    },
    [getChecked, getVal],
  );

  const runAutoSave = useCallback(async () => {
    if (autoSaveSkip.current || !autoSaveReady.current) return;
    if (autoSaveBusy.current) {
      autoSaveQueued.current = true;
      return;
    }
    autoSaveBusy.current = true;
    try {
      await persistDraft({ silent: false });
    } catch {
      setAutoSaveLabel("저장 실패 · 다시 시도합니다");
    } finally {
      autoSaveBusy.current = false;
      if (autoSaveQueued.current) {
        autoSaveQueued.current = false;
        void runAutoSave();
      }
    }
  }, [persistDraft]);

  const scheduleAutoSave = useCallback(() => {
    if (!autoSaveReady.current || autoSaveSkip.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void runAutoSave();
    }, 1200);
  }, [runAutoSave]);

  useEffect(() => {
    scheduleAutoSave();
  }, [
    burialLocation,
    coffinAfterInspection,
    coffinTbd,
    companySelect,
    departureTbd,
    designType,
    funeralRoomMode,
    funeralSearch,
    hpMode,
    scheduleAutoSave,
  ]);

  useEffect(() => {
    function onLeave() {
      if (!autoSaveReady.current || autoSaveSkip.current) return;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      void persistDraft({ keepalive: true, silent: true }).catch(() => {
        /* pagehide — 실패는 다음 방문에서 재시도 */
      });
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") onLeave();
    }
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [persistDraft]);

  useEffect(() => {
    document.title = "PING 온라인 부고 만들기";
    let cancelled = false;
    void ensureObituaryDraft()
      .then(async (id) => {
        if (cancelled) return;
        draftIdRef.current = id;
        setDraftId(id);
        const draft = await fetchObituaryDraft(id);
        if (cancelled) return;
        applyObituarySettingCheckboxes(draft?.settings);
        const hydrate = readObituaryFormHydrate(draft);
        if (hydrate) {
          if (hydrate.designType) setDesignType(hydrate.designType);
          setFuneralSearch(hydrate.funeralSearch);
          setBurialLocation(hydrate.burialLocation);
          setCompanySelect(hydrate.companySelect);
          setHpMode(hydrate.hpMode);
          setCoffinTbd(hydrate.coffinTbd);
          setCoffinAfterInspection(hydrate.coffinAfterInspection);
          setDepartureTbd(hydrate.departureTbd);
          if (hydrate.photoPreview) setPhotoPreview(hydrate.photoPreview);
          if (hydrate.logoPreview) setLogoPreview(hydrate.logoPreview);
          if (hydrate.funeralRoomMode === FUNERAL_ROOM_CUSTOM) {
            setFuneralRooms(withFuneralRoomChoices([]));
          } else if (hydrate.funeralRoomMode && hydrate.funeralRoomMode !== "미정") {
            setFuneralRooms(withFuneralRoomChoices([hydrate.funeralRoomMode]));
          }
          setFuneralRoomMode(hydrate.funeralRoomMode || "미정");
          const mournerRaw =
            typeof window !== "undefined"
              ? localStorage.getItem("ping_mourner_info_draft_v1")
              : null;
          if (!mournerRaw && draft?.mournerInfo) {
            try {
              localStorage.setItem(
                "ping_mourner_info_draft_v1",
                JSON.stringify(draft.mournerInfo),
              );
            } catch {
              /* ignore quota */
            }
          }
          requestAnimationFrame(() => {
            applyObituaryDraftDom({
              ...(draft || {}),
              _funeralRoomCustom: hydrate.funeralRoomCustom,
            });
            lastDraftFingerprint.current = draftSectionsFingerprint(
              collectObituaryDraftSections(getVal, getChecked),
            );
            autoSaveReady.current = true;
            refreshMournerLine();
          });
        } else {
          lastDraftFingerprint.current = draftSectionsFingerprint(
            collectObituaryDraftSections(getVal, getChecked),
          );
          autoSaveReady.current = true;
        }
      })
      .catch(() => {
        autoSaveReady.current = true;
      });
    refreshMournerLine();
    const onStorage = () => refreshMournerLine();
    const onFocus = () => refreshMournerLine();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [getChecked, getVal, refreshMournerLine]);

  useLayoutEffect(() => {
    attachDatePickersById([
      "timeOfDeathDate",
      "timeOfEntryDate",
      "timeOfCoffinDate",
      "timeOfDepartureDate",
    ]);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (!funeralBlockRef.current?.contains(t)) setAutoOpen(false);
      if (!burialBlockRef.current?.contains(t)) setBurialOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const onFuneralChange = (v: string) => {
    setFuneralSearch(v);
    setRwiunPeek(null);
    setFuneralRooms(funeralRoomOptions());
    setFuneralRoomMode("미정");
    if (funeralTimer.current) clearTimeout(funeralTimer.current);
    const keyword = v.trim();
    if (keyword.length < 2) {
      setFuneralLoading(false);
      setFuneralHits([]);
      setAutoOpen(false);
      return;
    }
    setFuneralLoading(true);
    setAutoOpen(true);
    funeralTimer.current = setTimeout(async () => {
      try {
        const results = await searchFuneralHomes(keyword);
        setFuneralHits(results);
        setAutoOpen(true);
      } finally {
        setFuneralLoading(false);
      }
    }, 280);
  };

  const pickFuneral = (hit: FuneralHallHit) => {
    setFuneralSearch(hit.name);
    setAutoOpen(false);
    setFuneralHits([]);
    setFuneralRoomMode("미정");
    setFuneralRooms(withFuneralRoomChoices([]));
    setRwiunPeek(hit);
    void fetchFuneralRooms(hit.name, hit.roomCount, hit.address).then((rooms) => {
      if (rooms.length) setFuneralRooms(rooms);
    });
  };

  const onBurialChange = (v: string) => {
    setBurialLocation(v);
    if (burialTimer.current) clearTimeout(burialTimer.current);
    const keyword = v.trim();
    if (keyword.length < 2) {
      setBurialLoading(false);
      setBurialHits([]);
      setBurialOpen(false);
      return;
    }
    setBurialLoading(true);
    setBurialOpen(true);
    burialTimer.current = setTimeout(async () => {
      try {
        const results = await searchCrematoriums(keyword);
        setBurialHits(results);
        setBurialOpen(true);
      } finally {
        setBurialLoading(false);
      }
    }, 280);
  };

  const pickCrematorium = (hit: CrematoriumHit) => {
    setBurialLocation(hit.name);
    setBurialOpen(false);
    setBurialHits([]);
  };

  const onPhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const r = new FileReader();
    r.onload = () => setPhotoPreview(String(r.result ?? ""));
    r.readAsDataURL(f);
    void uploadObituaryAsset("photo", f, draftId || undefined).catch(() => {
      window.alert("영정사진 업로드에 실패했습니다. 저장 시 다시 시도합니다.");
    });
  };

  const onLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogoPreview(String(r.result ?? ""));
    r.readAsDataURL(f);
    void uploadObituaryAsset("logo", f, draftId || undefined).catch(() => {
      window.alert("로고 업로드에 실패했습니다.");
    });
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const clearLogo = () => {
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const runUpload = async (status: "draft" | "published") => {
    const deceasedName = getVal("deceasedName").trim();
    const funeralName = getVal("funeralSearch").trim();
    if (status === "published" && !deceasedName) {
      window.alert("고인 성함은 필수 항목입니다.");
      document.getElementById("deceasedName")?.focus();
      return;
    }
    if (status === "published" && !funeralName) {
      window.alert("장례식장은 필수 항목입니다.");
      document.getElementById("funeralSearch")?.focus();
      return;
    }

    if (status === "draft") setSavingDraft(true);
    else setPublishing(true);

    autoSaveSkip.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    try {
      const id = draftId || (await ensureObituaryDraft());
      draftIdRef.current = id;
      setDraftId(id);
      const sections = collectObituaryDraftSections(getVal, getChecked);
      await saveObituaryDraft(sections, id);
      lastDraftFingerprint.current = draftSectionsFingerprint(sections);

      if (photoFile) {
        await uploadObituaryAsset("photo", photoFile, id);
      }

      if (status === "draft") {
        setAutoSaveLabel("자동 저장됨");
        window.alert("부고장이 임시저장 되었습니다.");
      } else {
        const published = await publishObituaryDraft(id);
        const publicPath = String(published?.publicPath || "").trim();
        const pingPublicUrl = publicPath
          ? `${window.location.origin}${publicPath}`
          : "";
        try {
          if (getPingFlowRoute() === ROUTE_OBITUARY_THEN_BULK) {
            mergeToBulkFlow(
              pingPublicUrl ? { obituaryPublicUrl: pingPublicUrl } : {},
            );
            return;
          }
        } catch {
          /* noop */
        }
        window.location.href = pingPublicUrl || "/obituary-create?completed=1";
      }
    } catch (err) {
      console.error(err);
      autoSaveSkip.current = false;
      window.alert("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingDraft(false);
      setPublishing(false);
      if (status === "draft") autoSaveSkip.current = false;
    }
  };

  const onFreeHpApply = () => {
    const name = getVal("freeHpApplicantName").trim();
    const phone = getVal("freeHpApplicantPhone").trim();
    if (!name || !phone) {
      window.alert(
        "무료 홈페이지 신청을 위해 담당자 이름과 연락처를 입력해 주세요.",
      );
      return;
    }
    setFreeHpNotice(true);
  };

  return (
    <div className="ping-ui font-ping min-h-dvh bg-white text-foreground">
      <div className="form-container">
        <header className="ping-sticky-page-header sticky top-0 z-20 flex items-center gap-1 bg-white px-4 py-3">
          <Link
            href="/obituary-create"
            className="ping-back-btn ob-form-touch shrink-0"
            aria-label="뒤로"
          >
            <span className="ping-chevron-left" aria-hidden="true" />
          </Link>
          <h1 className="flex-1 pr-11 text-center text-[20px] font-bold tracking-tight text-foreground">
            부고 만들기
          </h1>
        </header>

        <main className="px-5 pt-4">
          <p className="mb-2 rounded-lg bg-[var(--ping-primary-light-bg,#e6effc)] px-4 py-3 text-[0.85rem] leading-relaxed text-foreground">
            <span className="font-semibold text-primary">필수항목*</span>
            만 입력하시면 부고가 완성됩니다.
          </p>
          <p
            className="mb-6 min-h-5 text-[12px] font-medium text-muted-foreground"
            aria-live="polite"
          >
            {autoSaveLabel || "입력하시면 자동 저장됩니다."}
          </p>

          <form
            id="obituaryForm"
            onSubmit={(e) => e.preventDefault()}
            onInput={scheduleAutoSave}
            onChange={scheduleAutoSave}
            className="contents"
          >
            <section className="mb-6">
              <h2 className="mb-3 text-[0.95rem] font-bold text-foreground">
                고인정보
              </h2>
              <div className="mb-4">
                <span className="label-text">고인정보*</span>
                <div className="flex gap-2">
                  <div className="flex-[3]">
                    <input
                      id="deceasedName"
                      className="input-outline"
                      placeholder="고인명"
                      required
                    />
                  </div>
                  <div className="relative flex-[2]">
                    <select
                      id="deceasedGender"
                      className="select-outline text-slate-600"
                    >
                      <option value="M">남자</option>
                      <option value="F">여자</option>
                    </select>
                    <FieldChevron />
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="flex-[3]">
                    <input
                      id="deceasedAge"
                      type="number"
                      className="input-outline border-transparent bg-slate-50 placeholder-slate-400"
                      placeholder="나이"
                    />
                  </div>
                  <div className="relative flex-[2]">
                    <select
                      id="deceasedAgeType"
                      defaultValue="별세"
                      className="select-outline border-transparent bg-slate-50 text-slate-600"
                    >
                      {DECEASED_DEATH_WORDS.map((word) => (
                        <option key={word} value={word}>
                          {word}
                        </option>
                      ))}
                    </select>
                    <FieldChevron />
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <span className="label-text">종교*</span>
                <div className="flex gap-2">
                  <div className="relative flex-[3]">
                    <select
                      id="deceasedReligion"
                      className="select-outline"
                      onChange={(event) => {
                        const religion = event.target.value;
                        const ageType = document.getElementById(
                          "deceasedAgeType",
                        ) as HTMLSelectElement | null;
                        if (ageType) {
                          ageType.value = deathWordForReligion(religion);
                        }
                        const nextDesign = designIdForReligion(religion);
                        setDesignType(nextDesign);
                        void patchObituarySection(
                          "design",
                          { designType: nextDesign },
                          draftId || undefined,
                        );
                      }}
                    >
                      <option value="none">무교</option>
                      <option value="christianity">기독교</option>
                      <option value="buddhism">불교</option>
                      <option value="catholic">천주교</option>
                      <option value="wonbuddhism">원불교</option>
                      <option value="sgi">창가학회</option>
                    </select>
                    <FieldChevron />
                  </div>
                  <div className="flex-[2]">
                    <input
                      id="deceasedReligionPosition"
                      className="input-outline border-transparent bg-slate-50 placeholder-slate-400"
                      placeholder="직분/세례명"
                    />
                  </div>
                </div>
              </div>
              <div>
                <span className="mb-2 block text-[0.75rem] font-medium text-slate-500">
                  영정사진
                </span>
                <input
                  ref={photoInputRef}
                  type="file"
                  id="deceasedPhotoUpload"
                  className="hidden"
                  accept="image/*"
                  onChange={onPhotoPick}
                />
                <div className="flex items-end gap-3">
                  <button
                    type="button"
                    id="deceasedPhotoPreview"
                    aria-label="영정사진 등록"
                    className="relative flex h-[140px] w-[110px] cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-slate-300 bg-[#f3f4f6] bg-cover bg-center ob-form-touch"
                    style={
                      photoPreview
                        ? { backgroundImage: `url(${photoPreview})` }
                        : undefined
                    }
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {!photoPreview ? (
                      <>
                        <svg
                          viewBox="0 0 64 80"
                          className="h-[98px] w-[78px] text-[#d4d7dc]"
                          aria-hidden
                        >
                          <circle cx="32" cy="22" r="13" fill="currentColor" />
                          <path
                            d="M6 78c1.5-18 12.5-30 26-30s24.5 12 26 30"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white">
                            <Plus className="size-4" strokeWidth={2.5} />
                          </span>
                        </span>
                      </>
                    ) : null}
                  </button>
                  <div className="mb-0.5 flex flex-col gap-2">
                    <button
                      type="button"
                      id="btnUploadDeceasedPhoto"
                      className="flex w-max items-center justify-center gap-1.5 rounded-[10px] border border-primary bg-white px-4 py-2 text-[0.875rem] font-bold text-primary ob-form-touch"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <ImageIcon className="size-4" strokeWidth={2} />
                      사진등록
                    </button>
                    <button
                      type="button"
                      id="btnDeleteDeceasedPhoto"
                      className="flex w-max items-center justify-center gap-1.5 rounded-[10px] border border-[#f0a070] bg-white px-4 py-2 text-[0.875rem] font-bold text-[#f0a070] ob-form-touch"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPhoto();
                      }}
                    >
                      <Trash2 className="size-4" strokeWidth={2} />
                      사진삭제
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="divider" />

            <section className="mb-6">
              <h2 className="mb-4 text-[1rem] font-extrabold text-foreground">
                장례정보
              </h2>
              <div ref={funeralBlockRef} className="relative mb-4">
                <span className="label-text">장례식장 정보*</span>
                <div className="relative">
                  <input
                    id="funeralSearch"
                    className="input-outline input-emphasis pr-11"
                    placeholder="장례식장"
                    autoComplete="off"
                    required
                    value={funeralSearch}
                    onChange={(e) => onFuneralChange(e.target.value)}
                    onFocus={() => {
                      if (funeralSearch.trim() && funeralHits.length > 0)
                        setAutoOpen(true);
                    }}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 z-[1] flex w-11 items-center justify-center">
                    <i
                      className={`fa-solid text-sm transition ${funeralLoading ? "fa-circle-notch fa-spin text-primary" : "fa-magnifying-glass text-slate-400"}`}
                      aria-hidden
                    />
                  </span>
                </div>
                <div
                  className={`ob-funeral-suggest ${autoOpen && funeralSearch.trim().length >= 2 ? "" : "hidden"}`}
                >
                  {funeralLoading && funeralHits.length === 0 ? (
                    <p className="ob-funeral-suggest__empty">검색 중...</p>
                  ) : funeralHits.length === 0 ? (
                    <p className="ob-funeral-suggest__empty">
                      &apos;{funeralSearch.trim()}&apos; 검색 결과가 없습니다.
                    </p>
                  ) : (
                    <ul>
                      {funeralHits.map((h, idx) => (
                        <li key={`${h.name}-${idx}`}>
                          <button
                            type="button"
                            className="ob-funeral-suggest__item ob-form-touch"
                            onClick={() => pickFuneral(h)}
                          >
                            <span className="ob-funeral-suggest__name">
                              {h.name}
                            </span>
                            {h.address ? (
                              <span className="ob-funeral-suggest__addr">
                                {h.address}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mb-5">
                <span className="label-text !font-medium !text-slate-500">
                  빈소명
                </span>
                <div className="relative mb-2">
                  <select
                    id="funeralRoomMode"
                    value={funeralRoomMode}
                    className="select-outline input-muted py-3 text-[0.85rem] text-slate-600"
                    onChange={(event) => setFuneralRoomMode(event.target.value)}
                  >
                    {funeralRooms.map((room) => (
                      <option key={room.value} value={room.value}>
                        {room.label}
                      </option>
                    ))}
                  </select>
                  <FieldChevron />
                </div>
                {funeralRoomMode === FUNERAL_ROOM_CUSTOM ? (
                  <input
                    id="funeralRoomCustom"
                    className="input-outline input-muted mb-2 w-full text-[0.85rem] placeholder-slate-400"
                    placeholder="빈소명 직접 입력"
                    maxLength={40}
                  />
                ) : null}
                <input
                  id="funeralRoomMoveNote"
                  className="input-outline input-muted w-full text-[0.85rem] placeholder-slate-400"
                  placeholder="빈소 이동예정 (예-0월0일 0시 0호실 이동예정)"
                />
              </div>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="label-text mb-0">임종일시*</span>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="exposeTimeOfDeath"
                      defaultChecked
                      className="chk-obituary"
                    />
                    <span className="whitespace-nowrap text-[0.72rem] font-bold text-slate-600">
                      부고장 노출
                    </span>
                  </label>
                </div>
                <div id="timeOfDeathFields" className="flex gap-2">
                  <div className="relative min-w-0 flex-[3]">
                    <input
                      id="timeOfDeathDate"
                      defaultValue={dates0.death}
                      className="input-outline input-emphasis pr-10 text-[0.85rem] text-slate-700"
                      placeholder="날짜 선택"
                      autoComplete="off"
                      title="날짜 선택 (YYYY-MM-DD)"
                    />
                    <i className="fa-regular fa-calendar-days pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.95rem] text-primary/55" />
                  </div>
                  <div className="relative min-w-0 flex-[2]">
                    <select
                      id="timeOfDeathHour"
                      defaultValue="00"
                      className="select-outline input-emphasis text-center text-[0.85rem] text-slate-700"
                    >
                      {hourOptions()}
                    </select>
                    <FieldChevron className="text-primary/50" />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="label-text mb-0 !text-[0.75rem] !font-medium !text-slate-500">
                    입실일시
                  </span>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="exposeTimeOfEntry"
                      className="chk-obituary"
                    />
                    <span className="whitespace-nowrap text-[0.72rem] font-bold text-slate-600">
                      부고장 노출
                    </span>
                  </label>
                </div>
                <div id="timeOfEntryFields" className="flex gap-2">
                  <div className="relative min-w-0 flex-[8]">
                    <input
                      id="timeOfEntryDate"
                      defaultValue={dates0.entry}
                      className="input-outline input-muted pr-10 text-[0.85rem] text-slate-600"
                      placeholder="날짜 선택"
                      autoComplete="off"
                    />
                    <i className="fa-regular fa-calendar-days pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.95rem] text-slate-400" />
                  </div>
                  <div className="relative min-w-0 flex-[4]">
                    <select
                      id="timeOfEntryHour"
                      defaultValue="00"
                      className="select-outline input-muted px-2 text-center text-[0.85rem] text-slate-600"
                    >
                      {hourOptions()}
                    </select>
                  </div>
                  <div className="relative min-w-0 flex-[4]">
                    <select
                      id="timeOfEntryMinute"
                      defaultValue="00"
                      className="select-outline input-muted px-2 text-center text-[0.85rem] text-slate-600"
                    >
                      {minuteOptions()}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="label-text mb-0 !text-[0.75rem] !font-medium !text-slate-500">
                    입관일시
                  </span>
                  <div className="inline-flex shrink-0 flex-row flex-wrap items-center justify-end gap-x-4 gap-y-1">
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="timeOfCoffinTbd"
                        checked={coffinTbd}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setCoffinTbd(on);
                          if (on) setCoffinAfterInspection(false);
                        }}
                        className="chk-obituary"
                      />
                      <span className="whitespace-nowrap text-[0.72rem] font-bold text-slate-600">
                        일시 미정
                      </span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="timeOfCoffinAfterInspection"
                        checked={coffinAfterInspection}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setCoffinAfterInspection(on);
                          if (on) setCoffinTbd(false);
                        }}
                        className="chk-obituary"
                      />
                      <span className="whitespace-nowrap text-[0.72rem] font-bold text-slate-600">
                        검사지휘후 입관
                      </span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="exposeTimeOfCoffin"
                        defaultChecked
                        className="chk-obituary"
                      />
                      <span className="whitespace-nowrap text-[0.72rem] font-bold text-slate-600">
                        부고장 노출
                      </span>
                    </label>
                  </div>
                </div>
                <div
                  id="timeOfCoffinFields"
                  className={`flex gap-2 ${coffinTbd || coffinAfterInspection ? "opacity-40" : ""}`}
                >
                  <div className="relative min-w-0 flex-[8]">
                    <input
                      id="timeOfCoffinDate"
                      defaultValue={dates0.coffin}
                      disabled={coffinTbd || coffinAfterInspection}
                      className="input-outline input-muted pr-10 text-[0.85rem] text-slate-600"
                      placeholder="날짜 선택"
                      autoComplete="off"
                    />
                    <i className="fa-regular fa-calendar-days pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.95rem] text-slate-400" />
                  </div>
                  <div className="relative min-w-0 flex-[4]">
                    <select
                      id="timeOfCoffinHour"
                      disabled={coffinTbd || coffinAfterInspection}
                      defaultValue="00"
                      className="select-outline input-muted px-2 text-center text-[0.85rem] text-slate-600"
                    >
                      {hourOptions()}
                    </select>
                  </div>
                  <div className="relative min-w-0 flex-[4]">
                    <select
                      id="timeOfCoffinMinute"
                      disabled={coffinTbd || coffinAfterInspection}
                      defaultValue="00"
                      className="select-outline input-muted px-2 text-center text-[0.85rem] text-slate-600"
                    >
                      {minuteOptions()}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="label-text mb-0">발인일시*</span>
                  <div className="inline-flex shrink-0 flex-row flex-nowrap items-center gap-4">
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="timeOfDepartureTbd"
                        checked={departureTbd}
                        onChange={(e) => setDepartureTbd(e.target.checked)}
                        className="chk-obituary"
                      />
                      <span className="whitespace-nowrap text-[0.72rem] font-bold text-slate-600">
                        일시 미정
                      </span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="exposeTimeOfDeparture"
                        defaultChecked
                        className="chk-obituary"
                      />
                      <span className="whitespace-nowrap text-[0.72rem] font-bold text-slate-600">
                        부고장 노출
                      </span>
                    </label>
                  </div>
                </div>
                <div
                  id="timeOfDepartureFields"
                  className={`flex gap-2 ${departureTbd ? "opacity-40" : ""}`}
                >
                  <div className="relative min-w-0 flex-[8]">
                    <input
                      id="timeOfDepartureDate"
                      defaultValue={dates0.departure}
                      disabled={departureTbd}
                      className="input-outline input-emphasis pr-10 text-[0.85rem] text-slate-700"
                      placeholder="날짜 선택"
                      autoComplete="off"
                    />
                    <i className="fa-regular fa-calendar-days pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.95rem] text-primary/55" />
                  </div>
                  <div className="relative min-w-0 flex-[4]">
                    <select
                      id="timeOfDepartureHour"
                      disabled={departureTbd}
                      defaultValue="00"
                      className="select-outline input-emphasis px-2 text-center text-[0.85rem] text-slate-700"
                    >
                      {hourOptions()}
                    </select>
                  </div>
                  <div className="relative min-w-0 flex-[4]">
                    <select
                      id="timeOfDepartureMinute"
                      disabled={departureTbd}
                      defaultValue="00"
                      className="select-outline input-emphasis px-2 text-center text-[0.85rem] text-slate-700"
                    >
                      {minuteOptions()}
                    </select>
                  </div>
                </div>
              </div>

              <div ref={burialBlockRef} className="relative mb-3">
                <span className="mb-1.5 block text-[0.75rem] font-bold tracking-tight text-slate-500">
                  1차 장지
                </span>
                <div className="relative">
                  <input
                    id="burialLocation"
                    className="input-outline input-muted pr-11 text-[0.9rem] placeholder-slate-400"
                    placeholder="화장장 또는 1차 장지명"
                    autoComplete="off"
                    value={burialLocation}
                    onChange={(e) => onBurialChange(e.target.value)}
                    onFocus={() => {
                      if (burialLocation.trim() && burialHits.length > 0)
                        setBurialOpen(true);
                    }}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-0 z-[1] flex w-11 items-center justify-center">
                    <i
                      className={`fa-solid text-sm transition ${burialLoading ? "fa-circle-notch fa-spin text-primary" : "fa-magnifying-glass text-slate-400"}`}
                      aria-hidden
                    />
                  </span>
                </div>
                <div
                  className={`ob-funeral-suggest ${burialOpen && burialLocation.trim().length >= 2 ? "" : "hidden"}`}
                >
                  {burialLoading && burialHits.length === 0 ? (
                    <p className="ob-funeral-suggest__empty">검색 중...</p>
                  ) : burialHits.length === 0 ? (
                    <p className="ob-funeral-suggest__empty">
                      목록에 없으면 장지명을 그대로 입력하세요.
                    </p>
                  ) : (
                    <ul>
                      {burialHits.map((h, idx) => (
                        <li key={`${h.name}-${idx}`}>
                          <button
                            type="button"
                            className="ob-funeral-suggest__item ob-form-touch"
                            onClick={() => pickCrematorium(h)}
                          >
                            <span className="ob-funeral-suggest__name">
                              {h.name}
                            </span>
                            {h.address ? (
                              <span className="ob-funeral-suggest__addr">
                                {h.address}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mb-2">
                <span className="mb-1.5 block text-[0.75rem] font-bold tracking-tight text-slate-500">
                  2차 장지
                </span>
                <input
                  id="burialDetails"
                  className="input-outline input-muted text-[0.9rem] placeholder-slate-400"
                  placeholder="봉안당 · 수목장 등 (선택)"
                  autoComplete="off"
                />
              </div>
            </section>

            <section className="mb-6">
              <h2 className="mb-4 text-[1rem] font-extrabold text-primary">
                상주 및 계좌정보*
              </h2>
              <div className="mb-2.5 flex gap-2.5">
                <Link
                  href="/mourner-info"
                  className="ob-mourner-box ob-form-touch flex-1 no-underline"
                >
                  <i className="fa-solid fa-pen text-[0.72rem]" aria-hidden />
                  상주정보 입력
                </Link>
                <Link
                  href="/mourner-info?tab=account"
                  className="ob-mourner-box ob-form-touch flex-1 no-underline"
                >
                  <i className="fa-solid fa-pen text-[0.72rem]" aria-hidden />
                  계좌정보 입력
                </Link>
              </div>
              <Link
                href="/mourner-info?together=1"
                className="ob-mourner-box ob-form-touch mb-3 w-full no-underline"
              >
                <i className="fa-solid fa-pen text-[0.72rem]" aria-hidden />
                상주 및 계좌정보 한번에 입력
              </Link>
              <p
                id="mournerStatusLine"
                className={`px-1 text-[0.7rem] ${mournerOk ? "font-semibold text-primary" : "text-slate-400"}`}
              >
                {mournerLine}
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-[1rem] font-extrabold text-foreground">
                알리는 말씀
              </h2>
              <p className="mb-2.5 mt-1 text-[0.75rem] font-semibold text-primary">
                *미입력시 노출되지 않습니다.
              </p>
              <textarea
                id="obituaryMemo"
                className="input-outline min-h-[140px] w-full resize-y border-transparent bg-slate-50 p-4 text-[0.8rem] font-medium text-slate-800 placeholder-slate-400"
                placeholder="조문시 유의사항, 종교행사 시간 안내등 조문객에게 알릴 내용을 입력해 주세요."
              />
            </section>

            <section className="mb-6">
              <h2 className="mb-4 text-[1rem] font-extrabold text-foreground">
                디자인 선택
              </h2>
              <div className="relative mb-4 flex min-h-[160px] items-center justify-center rounded-md bg-[#fcfcfc] py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveObituaryDesign(designType).assetUrl}
                  alt={resolveObituaryDesign(designType).name}
                  className="h-40 w-auto max-w-[220px] object-contain"
                />
              </div>
              <input type="hidden" id="designType" value={designType} readOnly />
              <button
                type="button"
                className="w-full rounded border border-primary bg-card py-3.5 text-[0.85rem] font-bold text-primary transition hover:bg-primary hover:text-white ob-form-touch"
                onClick={async () => {
                  try {
                    const next = await fetchObituaryDesigns();
                    if (next.length) {
                      setDesigns(
                        next.map((d) => ({
                          id: d.id,
                          name: d.name,
                          description: d.description,
                          assetUrl:
                            d.assetUrl || resolveObituaryDesign(d.id).assetUrl,
                          religion: resolveObituaryDesign(d.id).religion,
                        })),
                      );
                    }
                  } catch {
                    /* 로컬 카탈로그 유지 */
                  }
                  setDesignOpen((open) => !open);
                }}
              >
                부고장 디자인 선택
              </button>
              {designOpen ? (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3">
                  {designs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 ob-form-touch ${
                        designType === d.id
                          ? "border-primary bg-[var(--ping-primary-light-bg,#e6effc)]"
                          : "border-transparent bg-slate-50"
                      }`}
                      onClick={() => {
                        setDesignType(d.id);
                        setDesignOpen(false);
                        void patchObituarySection(
                          "design",
                          { designType: d.id },
                          draftId || undefined,
                        );
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.assetUrl || resolveObituaryDesign(d.id).assetUrl}
                        alt=""
                        className="h-[4.5rem] w-auto max-w-full object-contain"
                      />
                      <span className="text-[0.78rem] font-bold text-foreground">
                        {d.name}
                      </span>
                      {d.description ? (
                        <span className="text-[0.7rem] text-slate-500">
                          {d.description}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="mb-6" id="sectionFuneralDirector">
              <h2 className="mb-4 text-[1rem] font-extrabold text-foreground">
                장례지도사 정보
              </h2>
              <div className="relative mb-5">
                <span className="label-text !font-medium !text-slate-500">
                  장례지도사(장례회사)
                </span>
                <div className="relative mb-2">
                  <select
                    id="companySelect"
                    className="select-outline border-transparent bg-slate-50 text-slate-600"
                    value={companySelect}
                    onChange={(e) => setCompanySelect(e.target.value)}
                  >
                    <option value="none">미선택</option>
                    <option value="custom">직접입력</option>
                  </select>
                  <FieldChevron />
                </div>
                <input
                  id="companyNameCustom"
                  className={`input-outline border-transparent bg-slate-50 text-[0.9rem] placeholder-slate-400 ${companySelect === "custom" ? "" : "hidden"}`}
                  placeholder="장례지도사(장례회사)명 직접 입력"
                />
              </div>

              <div className="mb-5">
                <span className="mb-2 block text-[0.75rem] font-medium text-slate-500">
                  장례지도사(장례회사) 로고등록
                </span>
                <input
                  type="file"
                  id="companyLogoUpload"
                  ref={logoInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={onLogoPick}
                />
                <div className="flex items-end gap-3">
                  <button
                    type="button"
                    id="companyLogoPreview"
                    aria-label="로고 등록"
                    className="relative flex h-[140px] w-[110px] cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-slate-300 bg-[#f3f4f6] bg-cover bg-center ob-form-touch"
                    style={
                      logoPreview
                        ? { backgroundImage: `url(${logoPreview})` }
                        : undefined
                    }
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {!logoPreview ? (
                      <>
                        <svg
                          viewBox="0 0 64 64"
                          className="h-[72px] w-[72px] text-[#d4d7dc]"
                          aria-hidden
                        >
                          <rect
                            x="8"
                            y="22"
                            width="48"
                            height="34"
                            rx="4"
                            fill="currentColor"
                          />
                          <path
                            d="M16 22V16h32v6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            strokeLinejoin="round"
                          />
                          <rect x="26" y="34" width="12" height="22" fill="#f3f4f6" />
                        </svg>
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white">
                            <Plus className="size-4" strokeWidth={2.5} />
                          </span>
                        </span>
                      </>
                    ) : null}
                  </button>
                  <div className="mb-0.5 flex flex-col gap-2">
                    <button
                      type="button"
                      id="btnUploadCompanyLogo"
                      className="flex w-max items-center justify-center gap-1.5 rounded-[10px] border border-primary bg-white px-4 py-2 text-[0.875rem] font-bold text-primary ob-form-touch"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <ImageIcon className="size-4" strokeWidth={2} />
                      로고등록
                    </button>
                    <button
                      type="button"
                      id="btnDeleteCompanyLogo"
                      className="flex w-max items-center justify-center gap-1.5 rounded-[10px] border border-[#f0a070] bg-white px-4 py-2 text-[0.875rem] font-bold text-[#f0a070] ob-form-touch"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearLogo();
                      }}
                    >
                      <Trash2 className="size-4" strokeWidth={2} />
                      로고삭제
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <span className="label-text mb-3">홈페이지</span>
                <div className="relative mb-3">
                  <select
                    id="directorHomepageMode"
                    className="select-outline border-transparent bg-slate-50 text-[0.9rem] text-slate-600"
                    value={hpMode}
                    onChange={(e) => {
                      const v = e.target.value as "register" | "none";
                      setHpMode(v);
                      if (v === "register") setFreeHpNotice(false);
                    }}
                  >
                    <option value="register">홈페이지 주소 등록</option>
                    <option value="none">홈페이지 없음 (무료 홈페이지 신청)</option>
                  </select>
                  <FieldChevron />
                </div>

                <div
                  id="directorHomepageRegisterPanel"
                  className={hpMode === "register" ? "space-y-3" : "hidden"}
                >
                  <div>
                    <span className="mb-1.5 block text-[0.75rem] font-bold text-slate-500">
                      홈페이지 URL
                    </span>
                    <input
                      id="directorHomepageUrl"
                      value={dirUrl}
                      onChange={(e) => setDirUrl(e.target.value)}
                      className="input-outline border-transparent bg-slate-50 text-[0.9rem]"
                      placeholder="https://example.com"
                      inputMode="url"
                      autoComplete="url"
                    />
                  </div>
                  <div
                    id="directorHomepagePreviewCard"
                    className={`rounded-lg border border-border bg-card p-4 shadow-sm ${hpPreview ? "" : "hidden"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <i className="fa-solid fa-globe" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[0.7rem] font-extrabold uppercase tracking-tight text-slate-500">
                          등록된 홈페이지
                        </p>
                        <a
                          id="directorHomepagePreviewLink"
                          href={hpPreview?.href ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-[0.85rem] font-bold text-primary underline underline-offset-2 hover:opacity-80"
                        >
                          {hpPreview?.label}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  id="directorHomepageFreePanel"
                  className={`mt-1 space-y-3 rounded-xl border-2 border-primary/25 bg-primary/[0.06] p-4 ${hpMode === "none" ? "" : "hidden"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-sm text-primary shadow-sm">
                      <i className="fa-solid fa-gift" />
                    </span>
                    <h3 className="text-[0.95rem] font-extrabold text-foreground">
                      무료 홈페이지 신청
                    </h3>
                  </div>
                  <p className="text-[0.75rem] leading-relaxed text-muted-foreground">
                    별도 홈페이지가 없으신 경우 무료로 제작 지원을 신청할 수
                    있습니다. 정보를 남겨 주시면 담당자가 연락드립니다.{" "}
                    <strong className="text-foreground">
                      임시저장·작성완료 시 아래 내용이 함께 전송됩니다.
                    </strong>
                  </p>
                  <div className="space-y-2.5">
                    <input
                      id="freeHpApplicantName"
                      className="input-outline border-border bg-card text-[0.9rem]"
                      placeholder="담당자 이름"
                    />
                    <input
                      id="freeHpApplicantPhone"
                      type="tel"
                      className="input-outline border-border bg-card text-[0.9rem]"
                      placeholder="연락처 (휴대전화)"
                    />
                    <textarea
                      id="freeHpMemo"
                      className="input-outline h-20 w-full resize-none border-border bg-card p-3 text-[0.8rem]"
                      placeholder="요청 사항 (선택)"
                    />
                  </div>
                  <button
                    type="button"
                    id="btnFreeHomepageApply"
                    onClick={onFreeHpApply}
                    className="w-full rounded-lg bg-primary py-3 text-[0.85rem] font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary-hover ob-form-touch"
                  >
                    무료 홈페이지 신청 내용 확인
                  </button>
                  <p
                    id="freeHpApplyNotice"
                    className={`text-center text-[0.72rem] font-bold text-primary ${freeHpNotice ? "" : "hidden"}`}
                  >
                    신청 정보를 입력하셨습니다. 저장 시 접수됩니다.
                  </p>
                </div>
              </div>
            </section>

            <div className="divider" />

            <section className="mb-6">
              <h2 className="mb-3 text-[0.95rem] font-extrabold text-foreground">
                부고장 노출 설정
              </h2>
              <div className="space-y-3 pl-0.5">
                <label className="group flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    id="settingShowBirth"
                    defaultChecked
                    className="chk-obituary"
                  />
                  <span className="text-[0.8rem] font-medium text-slate-600">
                    고인 성별/나이 보이기
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    id="settingShowPhoto"
                    defaultChecked
                    className="chk-obituary"
                  />
                  <span className="text-[0.8rem] font-medium text-slate-600">
                    영정사진 보이기
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    id="settingShowLogo"
                    defaultChecked
                    className="chk-obituary"
                  />
                  <span className="text-[0.8rem] font-medium text-slate-600">
                    장례지도사(장례회사) 로고 보이기
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    id="settingShowVideo"
                    defaultChecked
                    className="chk-obituary"
                  />
                  <span className="text-[0.8rem] font-medium text-slate-600">
                    주요영상 보이기
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    id="settingShowDirector"
                    defaultChecked
                    className="chk-obituary"
                  />
                  <span className="text-[0.8rem] font-medium text-slate-600">
                    장례지도사 디지털 페이지 보이기
                  </span>
                </label>
              </div>
            </section>
          </form>
        </main>

        <PingSiteLegalFooter />

        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex h-[60px] w-full max-w-[var(--ping-service-column,480px)] border-t border-border bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            id="btnSaveDraft"
            disabled={savingDraft || publishing}
            className="h-full flex-1 border-r border-border bg-white text-[0.95rem] font-[800] text-primary transition hover:bg-[var(--ping-primary-light-bg,#e6effc)] focus:outline-none disabled:opacity-60 ob-form-touch"
            onClick={() => runUpload("draft")}
          >
            {savingDraft ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2" /> 저장 중...
              </>
            ) : (
              "임시저장"
            )}
          </button>
          <button
            type="button"
            id="btnSubmit"
            disabled={savingDraft || publishing}
            className="h-full flex-1 bg-primary text-[0.95rem] font-[800] text-primary-foreground transition hover:bg-primary-hover focus:outline-none disabled:opacity-60 ob-form-touch"
            onClick={() => runUpload("published")}
          >
            {publishing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2" /> 전송 중...
              </>
            ) : (
              "작성완료"
            )}
          </button>
        </div>
        {rwiunPeek ? (
          <FuneralHallRwiunPeek
            hallName={rwiunPeek.name}
            address={rwiunPeek.address}
            onClose={() => setRwiunPeek(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
