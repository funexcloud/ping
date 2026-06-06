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
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { useFontAwesomeCdn } from "@/hooks/use-font-awesome-cdn";
import { attachDatePickersById } from "@/lib/calendar-picker";
import { collectObituaryFormData } from "@/lib/obituary-form-collect";
import {
  searchFuneralHomes,
  type FuneralHallHit,
} from "@/lib/funeral-halls-search";
import {
  getPingFlowRoute,
  mergeToBulkFlow,
  ROUTE_OBITUARY_THEN_BULK,
} from "@/lib/ping-flow-client";
import {
  getPingFirebaseStorage,
  getPingFirestore,
} from "@/lib/ping-firebase-web";
import "./obituary-form.css";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES = ["00", "30"];

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

export default function ObituaryFormClient() {
  useFontAwesomeCdn();
  const dates0 = useMemo(() => defaultDateStrings(), []);

  const getVal = (id: string) =>
    String(
      (
        document.getElementById(id) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
          | null
      )?.value ?? "",
    );

  const getChecked = (id: string, fallback = false) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el || !("checked" in el)) return fallback;
    return Boolean(el.checked);
  };

  const [funeralSearch, setFuneralSearch] = useState("");
  const [autoOpen, setAutoOpen] = useState(false);
  const [funeralHits, setFuneralHits] = useState<FuneralHallHit[]>([]);
  const [funeralLoading, setFuneralLoading] = useState(false);
  const funeralTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const funeralBlockRef = useRef<HTMLDivElement>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [coffinTbd, setCoffinTbd] = useState(false);
  const [departureTbd, setDepartureTbd] = useState(false);
  const [companySelect, setCompanySelect] = useState("none");
  const [hpMode, setHpMode] = useState<"register" | "none">("register");
  const [dirUrl, setDirUrl] = useState("");
  const [freeHpNotice, setFreeHpNotice] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mournerLine, setMournerLine] = useState(
    "등록된 상주 정보가 없습니다.",
  );
  const [mournerOk, setMournerOk] = useState(false);

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

  useEffect(() => {
    document.title = "PING 온라인 부고 작성";
    refreshMournerLine();
    const onStorage = () => refreshMournerLine();
    const onFocus = () => refreshMournerLine();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshMournerLine]);

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
      if (funeralBlockRef.current?.contains(t)) return;
      setAutoOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const onFuneralChange = (v: string) => {
    setFuneralSearch(v);
    if (funeralTimer.current) clearTimeout(funeralTimer.current);
    const keyword = v.trim();
    if (!keyword) {
      setFuneralLoading(false);
      setFuneralHits([]);
      setAutoOpen(false);
      return;
    }
    setFuneralLoading(true);
    funeralTimer.current = setTimeout(async () => {
      try {
        const results = await searchFuneralHomes(keyword);
        setFuneralHits(results);
        setAutoOpen(true);
      } finally {
        setFuneralLoading(false);
      }
    }, 500);
  };

  const pickFuneral = (name: string) => {
    setFuneralSearch(name);
    setAutoOpen(false);
    setFuneralHits([]);
  };

  const onPhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const r = new FileReader();
    r.onload = () => setPhotoPreview(String(r.result ?? ""));
    r.readAsDataURL(f);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
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

    const db = getPingFirestore();
    const storage = getPingFirebaseStorage();
    if (!db) {
      window.alert("Firebase 설정(NEXT_PUBLIC_FIREBASE_*)이 없습니다.");
      return;
    }

    if (status === "draft") setSavingDraft(true);
    else setPublishing(true);

    try {
      const base = collectObituaryFormData(
        getVal,
        getChecked,
        status,
      ) as Record<string, unknown>;

      if (photoFile && storage) {
        const uniqueFileName = `${Date.now()}_${photoFile.name}`;
        const photoRef = ref(storage, `obituaries/photos/${uniqueFileName}`);
        const snapshot = await uploadBytes(photoRef, photoFile);
        const downloadURL = await getDownloadURL(snapshot.ref);
        base.photoUrl = downloadURL;
      }

      base.createdAt = serverTimestamp();

      await addDoc(collection(db, "ping_obituaries"), base);

      if (status === "draft") {
        window.alert("부고장이 임시저장 되었습니다.");
      } else {
        let mergePublicUrl = "";
        try {
          if (getVal("directorHomepageMode") === "register") {
            const raw = getVal("directorHomepageUrl").trim();
            if (raw) {
              let h = raw.replace(/^\s+|\s+$/g, "");
              if (!/^https?:\/\//i.test(h)) h = "https://" + h;
              try {
                mergePublicUrl = new URL(h).href;
              } catch {
                mergePublicUrl = "";
              }
            }
          }
        } catch {
          mergePublicUrl = "";
        }
        try {
          if (getPingFlowRoute() === ROUTE_OBITUARY_THEN_BULK) {
            mergeToBulkFlow(
              mergePublicUrl ? { obituaryPublicUrl: mergePublicUrl } : {},
            );
            return;
          }
        } catch {
          /* noop */
        }
        window.location.href = "/obituary-create?completed=1";
      }
    } catch (err) {
      console.error(err);
      window.alert("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSavingDraft(false);
      setPublishing(false);
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
    <div className="ping-ui min-h-dvh bg-background text-foreground">
      <div className="form-container">
        <header className="ping-sticky-page-header sticky top-0 z-20 flex items-center gap-1 border-b border-border/80 bg-card px-4 py-3">
          <Link
            href="/obituary-create"
            className="ping-back-btn ob-form-touch shrink-0"
            aria-label="뒤로"
          >
            <span className="ping-chevron-left" aria-hidden="true" />
          </Link>
          <h1 className="flex-1 pr-11 text-center text-[1.05rem] font-bold tracking-tight text-dongban-dark">
            부고 작성
          </h1>
        </header>

        <main className="px-5 pt-4">
          <p className="mb-6 text-center text-[11px] text-muted-foreground">
            * 표시는 필수입니다.
          </p>

          <form
            id="obituaryForm"
            onSubmit={(e) => e.preventDefault()}
            className="contents"
          >
            <section className="mb-6">
              <h2 className="mb-3 text-[0.95rem] font-bold text-dongban-dark">
                고인
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
                    <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
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
                      className="select-outline border-transparent bg-slate-50 text-slate-600"
                    >
                      <option value="death">별세</option>
                      <option value="lifespan">향년</option>
                    </select>
                    <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <span className="label-text">종교*</span>
                <div className="flex gap-2">
                  <div className="relative flex-[3]">
                    <select id="deceasedReligion" className="select-outline">
                      <option value="none">무교</option>
                      <option value="christianity">기독교</option>
                      <option value="buddhism">불교</option>
                      <option value="catholic">천주교</option>
                    </select>
                    <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
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
                <div className="flex gap-3">
                  <button
                    type="button"
                    id="deceasedPhotoPreview"
                    className="relative flex h-[105px] w-[85px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded border border-border bg-muted bg-cover bg-center ob-form-touch"
                    style={
                      photoPreview
                        ? { backgroundImage: `url(${photoPreview})` }
                        : undefined
                    }
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {!photoPreview ? (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                          <i className="fa-solid fa-user text-lg text-slate-200" />
                        </div>
                        <div className="pointer-events-none absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-dongban-cyan text-[10px] text-white shadow-sm">
                          <i className="fa-solid fa-plus" />
                        </div>
                      </>
                    ) : null}
                  </button>
                  <div className="mb-1 flex flex-col justify-end gap-2">
                    <button
                      type="button"
                      id="btnUploadDeceasedPhoto"
                      className={`flex w-max items-center justify-center gap-1.5 rounded border border-dongban-cyan px-4 py-1.5 text-[0.75rem] font-bold text-dongban-cyan transition hover:bg-dongban-cyan hover:text-white ob-form-touch ${photoPreview ? "hidden" : "flex"}`}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <i className="fa-regular fa-image rounded-sm border border-dongban-cyan px-1 py-0.5 text-[10px]" />
                      사진등록
                    </button>
                    <button
                      type="button"
                      id="btnDeleteDeceasedPhoto"
                      className={`flex w-max items-center justify-center gap-1.5 rounded border border-orange-200 px-4 py-1.5 text-[0.75rem] font-bold text-[#F9A826] transition hover:bg-orange-50 ob-form-touch ${photoPreview ? "flex" : "hidden"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPhoto();
                      }}
                    >
                      <i className="fa-regular fa-trash-can rounded-sm border border-[#F9A826] px-1 py-0.5 text-[10px]" />
                      사진삭제
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <div className="divider mx-[-20px]" />

            <section className="mb-6">
              <h2 className="mb-4 text-[1rem] font-extrabold text-dongban-dark">
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
                      className={`fa-solid text-sm transition ${funeralLoading ? "fa-circle-notch fa-spin text-dongban-cyan" : "fa-magnifying-glass text-slate-400"}`}
                      aria-hidden
                    />
                  </span>
                </div>
                <div
                  className={`absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg ${autoOpen && funeralSearch.trim() ? "" : "hidden"}`}
                >
                  <ul className="text-sm">
                    {funeralHits.length === 0 ? (
                      <li className="p-4 text-center text-[0.8rem] text-slate-400">
                        &apos;{funeralSearch.trim()}&apos; 검색 결과가 없습니다.
                      </li>
                    ) : (
                      funeralHits.map((h, idx) => (
                        <li key={`${h.name}-${idx}`}>
                          <button
                            type="button"
                            className="group mb-1 w-full cursor-pointer rounded-xl border border-transparent bg-card p-3 text-left transition last:mb-0 hover:border-primary/20 hover:bg-accent ob-form-touch"
                            onClick={() => pickFuneral(h.name)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 shadow-sm group-hover:bg-dongban-mint group-hover:text-white">
                                <i className="fa-solid fa-building-circle-check text-[0.7rem]" />
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <h4 className="mb-0.5 truncate text-[0.9rem] font-bold text-slate-800 transition group-hover:text-teal-700">
                                  {h.name}
                                </h4>
                                <p className="truncate text-[0.65rem] text-slate-500">
                                  <i className="fa-solid fa-map-location-dot mr-1 text-slate-400" />
                                  {h.address}
                                </p>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="mb-5">
                <span className="label-text !font-medium !text-slate-500">
                  빈소명
                </span>
                <div className="mb-2 flex gap-2">
                  <div className="relative w-[110px] shrink-0">
                    <select
                      id="funeralRoomMode"
                      defaultValue="미정"
                      className="select-outline input-muted py-3 text-[0.85rem] text-slate-600"
                    >
                      <option value="미정">미정</option>
                    </select>
                    <i className="fa-solid fa-chevron-down pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                  </div>
                </div>
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
                    <i className="fa-regular fa-calendar-days pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.95rem] text-dongban-cyan/55" />
                  </div>
                  <div className="relative min-w-0 flex-[2]">
                    <select
                      id="timeOfDeathHour"
                      defaultValue="00"
                      className="select-outline input-emphasis text-center text-[0.85rem] text-slate-700"
                    >
                      {hourOptions()}
                    </select>
                    <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-dongban-cyan/50" />
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
                  <div className="inline-flex shrink-0 flex-row flex-nowrap items-center gap-4">
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="timeOfCoffinTbd"
                        checked={coffinTbd}
                        onChange={(e) => setCoffinTbd(e.target.checked)}
                        className="chk-obituary"
                      />
                      <span className="whitespace-nowrap text-[0.72rem] font-bold text-slate-600">
                        일시 미정
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
                  className={`flex gap-2 ${coffinTbd ? "opacity-40" : ""}`}
                >
                  <div className="relative min-w-0 flex-[8]">
                    <input
                      id="timeOfCoffinDate"
                      defaultValue={dates0.coffin}
                      disabled={coffinTbd}
                      className="input-outline input-muted pr-10 text-[0.85rem] text-slate-600"
                      placeholder="날짜 선택"
                      autoComplete="off"
                    />
                    <i className="fa-regular fa-calendar-days pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.95rem] text-slate-400" />
                  </div>
                  <div className="relative min-w-0 flex-[4]">
                    <select
                      id="timeOfCoffinHour"
                      disabled={coffinTbd}
                      defaultValue="00"
                      className="select-outline input-muted px-2 text-center text-[0.85rem] text-slate-600"
                    >
                      {hourOptions()}
                    </select>
                  </div>
                  <div className="relative min-w-0 flex-[4]">
                    <select
                      id="timeOfCoffinMinute"
                      disabled={coffinTbd}
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
                    <i className="fa-regular fa-calendar-days pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.95rem] text-dongban-cyan/55" />
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

              <div className="mb-2">
                <span className="mb-1.5 block text-[0.75rem] font-bold tracking-tight text-slate-500">
                  장지 정보
                </span>
                <input
                  id="burialLocation"
                  className="input-outline input-muted text-[0.9rem] placeholder-slate-400"
                  placeholder="장지명"
                />
              </div>
            </section>

            <div className="divider mx-[-20px]" />

            <section className="mb-6">
              <h2 className="mb-3 text-[0.95rem] font-extrabold text-dongban-dark">
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

            <div className="divider mx-[-20px]" />

            <section className="mb-6">
              <h2 className="mb-4 text-[1rem] font-extrabold text-dongban-cyan">
                상주 및 계좌정보
              </h2>
              <div className="mb-3 flex gap-3">
                <Link
                  href="/mourner-info"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dongban-cyan bg-card py-2.5 text-[0.85rem] font-bold text-dongban-cyan transition hover:bg-dongban-cyan hover:text-white ob-form-touch"
                >
                  <i className="fa-solid fa-user-pen" /> 상주정보 입력
                </Link>
                <Link
                  href="/mourner-info?tab=account"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dongban-cyan bg-card py-2.5 text-[0.85rem] font-bold text-dongban-cyan transition hover:bg-dongban-cyan hover:text-white ob-form-touch"
                >
                  <i className="fa-solid fa-wallet" /> 계좌정보 입력
                </Link>
              </div>
              <p
                id="mournerStatusLine"
                className={`px-1 text-[0.7rem] ${mournerOk ? "font-semibold text-dongban-cyan" : "text-slate-400"}`}
              >
                {mournerLine}
              </p>
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                <p className="mb-2.5 text-[0.72rem] leading-relaxed text-slate-600">
                  주문·배송 안내는 화환 전문 파트너 페이지에서 진행됩니다.
                </p>
                <a
                  href="https://shop7.flowerbiz.co.kr/products/product-category/197"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-[0.82rem] font-bold text-white transition hover:bg-emerald-800 sm:w-auto"
                >
                  <i className="fa-solid fa-hand-holding-heart text-[0.85em]" />
                  근조화환 주문하기
                </a>
              </div>
            </section>

            <div className="divider mx-[-20px]" />

            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[1rem] font-extrabold text-dongban-dark">
                  알리는 말씀
                </h2>
                <span className="text-[0.75rem] font-bold text-dongban-cyan">
                  어떻게 써야할까요?{" "}
                  <i className="fa-solid fa-chevron-right text-[10px]" />
                </span>
              </div>
              <textarea
                id="obituaryMemo"
                className="input-outline h-24 w-full resize-none border-transparent bg-slate-50 p-4 text-[0.8rem] font-medium text-slate-800"
                placeholder="부고요령사항, 조문형태 등 조문객에게 알릴 내용을 입력해 주세요."
              />
            </section>

            <div className="divider mx-[-20px]" />

            <section className="mb-6">
              <h2 className="mb-4 text-[1rem] font-extrabold text-dongban-dark">
                디자인 선택
              </h2>
              <div className="relative mb-4 flex min-h-[160px] justify-center rounded-md bg-[#fcfcfc] py-4 shadow-sm">
                <div className="z-10 flex flex-col items-center text-center">
                  <div className="flex h-40 w-24 flex-col items-center justify-center bg-[#1f2122] px-4 py-8 font-serif text-2xl text-white shadow-md">
                    訃 <br />
                    <br /> 告
                    <div className="mt-4 w-8 pb-2 opacity-90">
                      <img
                        src="https://cdn-icons-png.flaticon.com/512/3258/3258410.png"
                        alt=""
                        className="w-full brightness-200 grayscale"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="w-full rounded border border-dongban-cyan bg-card py-3.5 text-[0.85rem] font-bold text-dongban-cyan transition hover:bg-dongban-cyan hover:text-white ob-form-touch"
              >
                부고장 디자인 선택
              </button>
            </section>

            <div className="divider mx-[-20px]" />

            <section className="mb-6" id="sectionFuneralDirector">
              <h2 className="mb-4 text-[1rem] font-extrabold text-dongban-dark">
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
                  <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
                </div>
                <input
                  id="companyNameCustom"
                  className={`input-outline border-transparent bg-slate-50 text-[0.9rem] placeholder-slate-400 ${companySelect === "custom" ? "" : "hidden"}`}
                  placeholder="장례지도사(장례회사)명 직접 입력"
                />
              </div>

              <div className="mb-5">
                <span className="label-text mb-2 block !font-medium !text-slate-500">
                  장례지도사(장례회사) 로고등록
                </span>
                <input
                  type="file"
                  id="companyLogoUpload"
                  className="hidden"
                  accept="image/*"
                />
                <div className="flex gap-3">
                  <div
                    id="companyLogoPreview"
                    className="relative flex h-[75px] w-[75px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded border border-border bg-muted bg-cover bg-center ob-form-touch"
                    onClick={() =>
                      document.getElementById("companyLogoUpload")?.click()
                    }
                  >
                    <i className="fa-solid fa-building text-xl text-slate-200" />
                    <div className="pointer-events-none absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-dongban-cyan text-[10px] text-white shadow-sm">
                      <i className="fa-solid fa-plus" />
                    </div>
                  </div>
                  <div className="mb-1 flex flex-col justify-end gap-2">
                    <button
                      type="button"
                      id="btnUploadCompanyLogo"
                      className="flex w-max items-center justify-center gap-1.5 rounded border border-dongban-cyan px-4 py-1.5 text-[0.75rem] font-bold text-dongban-cyan transition hover:bg-dongban-cyan hover:text-white ob-form-touch"
                      onClick={() =>
                        document.getElementById("companyLogoUpload")?.click()
                      }
                    >
                      <i className="fa-regular fa-image rounded-sm border border-dongban-cyan px-1 py-0.5 text-[10px]" />
                      로고등록
                    </button>
                    <button
                      type="button"
                      id="btnDeleteCompanyLogo"
                      className="hidden"
                    >
                      삭제
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
                  <i className="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-dongban-cyan/10 text-dongban-cyan">
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
                          className="break-all text-[0.85rem] font-bold text-dongban-cyan underline underline-offset-2 hover:opacity-80"
                        >
                          {hpPreview?.label}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  id="directorHomepageFreePanel"
                  className={`mt-1 space-y-3 rounded-xl border-2 border-dongban-cyan/25 bg-dongban-cyan/[0.06] p-4 ${hpMode === "none" ? "" : "hidden"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-sm text-dongban-cyan shadow-sm">
                      <i className="fa-solid fa-gift" />
                    </span>
                    <h3 className="text-[0.95rem] font-extrabold text-dongban-dark">
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
                    className="w-full rounded-lg bg-dongban-dark py-3 text-[0.85rem] font-extrabold text-white shadow-sm transition hover:opacity-95 ob-form-touch"
                  >
                    무료 홈페이지 신청 내용 확인
                  </button>
                  <p
                    id="freeHpApplyNotice"
                    className={`text-center text-[0.72rem] font-bold text-dongban-cyan ${freeHpNotice ? "" : "hidden"}`}
                  >
                    신청 정보를 입력하셨습니다. 저장 시 접수됩니다.
                  </p>
                </div>
              </div>
            </section>
          </form>
        </main>

        <div className="fixed bottom-0 z-30 flex h-[60px] w-full max-w-[480px] border-t border-border bg-card shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            id="btnSaveDraft"
            disabled={savingDraft || publishing}
            className="h-full flex-1 border-r border-border bg-card text-[0.95rem] font-[800] text-dongban-cyan transition hover:bg-muted focus:outline-none disabled:opacity-60 ob-form-touch"
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
            className="h-full flex-1 bg-dongban-cyan text-[0.95rem] font-[800] text-white transition hover:opacity-90 focus:outline-none disabled:opacity-60 ob-form-touch"
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
      </div>
    </div>
  );
}
