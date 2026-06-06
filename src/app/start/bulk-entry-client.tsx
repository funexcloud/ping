"use client";

import { PING_REACT_BULK_PENDING_REVIEW_KEY } from "@/lib/ping-flow-client";
import { fetchGoogleContactPickerRows } from "@/lib/ping-google-contacts";
import { computeBulkOrderTotals } from "@/lib/ping-bulk-pricing";
import {
  deleteSavedComposeEntry,
  formatBulkComposeSavedTs,
  readRecentBulkSendsList,
  readSavedComposeList,
  saveBulkComposeDraftToDevice,
  type BulkRecentSendEntry,
  type BulkSavedComposeEntry,
} from "@/lib/ping-bulk-compose-storage";
import { consumeBulkWizardResumeStep, peekBulkWizardResumeStep } from "@/lib/ping-bulk-flow-nav";
import { BulkFlowProgress } from "@/components/bulk/bulk-flow-progress";
import { PingLoadingSpinner } from "@/components/ping-loading-spinner";
import { RecipientExcludeModal } from "@/components/bulk/recipient-exclude-modal";
import { bulkFlowStepFromWizard, isBulkWizardFirstStep } from "@/lib/ping-bulk-flow-steps";
import { getBulkWizardStepCopy } from "@/lib/ping-flow-step-copy";
import {
  parseAddressbookFile,
  type BulkRecipientRow,
} from "@/lib/ping-bulk-recipients";
import {
  bulkReviewSourceLabel,
  clearBulkRecipientsAndFlagsSession,
  loadBulkRecipientsCount,
  loadPingBulkFlags,
  loadPingFromIndexSnapshot,
  saveBulkRecipientsToSession,
} from "@/lib/ping-bulk-session";
import {
  pingApplyIntroSkipQueryToHistory,
  pingIntroOnReloadClearSeen,
  pingIntroSeen,
  pingSetIntroReturnPath,
} from "@/lib/ping-intro-gate";
import { PING_MAIN_APP_PATH } from "@/lib/ping-main-path";
import { pingAssignToLocation } from "@/lib/ping-nav-home";
import {
  BULK_COMPOSE_HELP,
  BULK_SMS_BODY_MAX_BYTES,
  BULK_SMS_TITLE_MAX_CHARS,
  BULK_THANKYOU_COMPOSE_HELP,
  BULK_THANKYOU_SMS_DEFAULT,
  bulkSmsUtf8ByteLength,
  getStaticBulkTemplateBody,
  isBulkSmsBodyStepValid,
  sanitizeBulkSmsBodyText,
  truncateBulkSmsBodyToMaxBytes,
  type BulkSmsTemplateId,
} from "@/lib/ping-bulk-sms";
import {
  compressImageFileForBulkCompose,
  loadComposeImageFromSession,
  persistComposeImageSession,
  type BulkComposeImage,
} from "@/lib/ping-bulk-compose-image";
import {
  advanceBulkEntryFromObituaryUrl,
  BugoImportSession,
  EXTERNAL_OBITUARY_URL_HINT,
  isObituaryUrlFieldValid,
  normalizeObituaryUrlForField,
  parseObituaryUrlPaste,
  persistBulkComposeToPingFromIndex,
  readBulkComposeHydrateFromSession,
} from "@/lib/ping-bugo-import-flow";
import {
  consumeBulkEntryQueryEffect,
  markBulkFlowStarted,
} from "@/lib/ping-bulk-entry-query";
import {
  PING_FLOW_KEY_ROUTE,
  PING_FLOW_KEY_STARTED,
  ROUTE_BULK_DIRECT,
  ROUTE_OBITUARY_THEN_BULK,
} from "@/lib/ping-flow-client";
import { useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFontAwesomeCdn } from "@/hooks/use-font-awesome-cdn";
import { cn } from "@/lib/utils";

/** TEMP — Google 연락처 OAuth 심사 중 배지. 심사 완료 후 false 또는 아래 마크업·CSS 삭제 */
const SHOW_GOOGLE_CONTACTS_REVIEW_BADGE = true;

const BULK_COMPOSE_BODY_PLACEHOLDER =
  "이곳에 문자 내용을 입력합니다\n치환문구 예시) #{이름}님, 부고 안내드립니다. 본문에 {{LINK}} 를 넣으면 부고 주소로 바뀝니다.";

const BULK_THANKYOU_BODY_PLACEHOLDER =
  "이곳에 답례 문자를 입력합니다.\n#{이름} 을 넣으면 수신자 이름으로 바뀝니다.\n부고 발송 후 받은 명단 엑셀을 그대로 올리면 됩니다.";

type WizardStep = "url" | "compose" | "pick" | "review";

function readThankYouSessionFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem("ping_from_index");
    if (!raw) return false;
    const d = JSON.parse(raw) as { bulkFlowKind?: string };
    return d?.bulkFlowKind === "thankyou";
  } catch {
    return false;
  }
}

function readInitialThankYouIntent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("thankyou") === "1") return true;
  } catch {
    /* ignore */
  }
  return readThankYouSessionFromStorage();
}

function readInitialBulkStep(): WizardStep {
  if (typeof window === "undefined") return "url";
  try {
    const resume = peekBulkWizardResumeStep();
    if (resume) return resume;
    if (new URLSearchParams(window.location.search).get("thankyou") === "1") return "compose";
    if (readThankYouSessionFromStorage()) {
      return loadBulkRecipientsCount() > 0 ? "pick" : "compose";
    }
  } catch {
    /* ignore */
  }
  return "url";
}

function readInitialComposeState(): {
  title: string;
  body: string;
  templateId: BulkSmsTemplateId;
} {
  if (typeof window === "undefined") {
    return { title: "", body: "", templateId: "1" };
  }
  try {
    if (new URLSearchParams(window.location.search).get("thankyou") === "1") {
      return {
        title: "",
        body: truncateBulkSmsBodyToMaxBytes(BULK_THANKYOU_SMS_DEFAULT),
        templateId: "1",
      };
    }
  } catch {
    /* ignore */
  }
  if (!readThankYouSessionFromStorage()) {
    return { title: "", body: "", templateId: "1" };
  }
  try {
    const raw = sessionStorage.getItem("ping_from_index");
    const d = raw
      ? (JSON.parse(raw) as {
          bulkSmsMessageDraft?: string;
          bulkSmsTitle?: string;
          smsTemplateId?: string;
        })
      : {};
    const draft = String(d.bulkSmsMessageDraft || "").trim();
    const body = draft
      ? truncateBulkSmsBodyToMaxBytes(sanitizeBulkSmsBodyText(draft))
      : truncateBulkSmsBodyToMaxBytes(BULK_THANKYOU_SMS_DEFAULT);
    const title = String(d.bulkSmsTitle || "").slice(0, BULK_SMS_TITLE_MAX_CHARS);
    const templateId: BulkSmsTemplateId = d.smsTemplateId === "2" ? "2" : "1";
    return { title, body, templateId };
  } catch {
    return {
      title: "",
      body: truncateBulkSmsBodyToMaxBytes(BULK_THANKYOU_SMS_DEFAULT),
      templateId: "1",
    };
  }
}

function GoogleGMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function BulkEntryShellPlaceholder() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="app-shell bulk-entry-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <header className="ping-top-nav" aria-hidden="true">
          <span className="ping-top-nav__spacer" aria-hidden="true" />
          <h1 className="ping-top-nav__title">&nbsp;</h1>
        </header>
        <div className="bulk-flow-progress shrink-0 px-5 pb-3 pt-1" aria-hidden="true">
          <div className="mb-2 flex gap-0.5">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="h-1 min-w-0 flex-1 rounded-full bg-[#E9ECF0]" />
            ))}
          </div>
          <div className="h-4" />
        </div>
        <main className="index-main-flow flex min-h-0 flex-1 flex-col bg-[var(--ping-surface)]" />
      </div>
    </div>
  );
}

function BulkEntryInner() {
  const router = useRouter();
  const [bootState, setBootState] = useState<"checking" | "ready" | "redirect-intro">(
    "checking",
  );
  const [step, setStep] = useState<WizardStep>(readInitialBulkStep);
  const [isThankYouFlow, setIsThankYouFlow] = useState(readInitialThankYouIntent);
  const wizardStepCopy = useMemo(
    () => getBulkWizardStepCopy(step, isThankYouFlow),
    [step, isThankYouFlow],
  );
  const showHeaderBack = !isBulkWizardFirstStep(step, isThankYouFlow);
  const [url, setUrl] = useState("");
  const [urlHint, setUrlHint] = useState<string | null>(null);
  const [urlImportLoading, setUrlImportLoading] = useState(false);
  const [urlPassOverlayVisible, setUrlPassOverlayVisible] = useState(false);
  /** compose → url 「이전」 직후에는 URL을 바꿀 때까지 자동 전환 중지 */
  const urlAutoAdvancePausedRef = useRef(false);
  const urlAdvanceLockRef = useRef(false);
  const bugoImportSessionRef = useRef(new BugoImportSession());

  const initCompose = readInitialComposeState();
  const [title, setTitle] = useState(initCompose.title);
  const [body, setBody] = useState(initCompose.body);
  const [templateId, setTemplateId] = useState<BulkSmsTemplateId>(initCompose.templateId);
  const [tplOpen, setTplOpen] = useState(false);
  const tplWrapRef = useRef<HTMLDivElement>(null);
  const [savedComposeModalOpen, setSavedComposeModalOpen] = useState(false);
  const [savedComposeList, setSavedComposeList] = useState<BulkSavedComposeEntry[]>([]);
  const [recentSendsModalOpen, setRecentSendsModalOpen] = useState(false);
  const [recentSendsList, setRecentSendsList] = useState<BulkRecentSendEntry[]>([]);
  const [composeImage, setComposeImage] = useState<BulkComposeImage | null>(null);
  const composeImageInputRef = useRef<HTMLInputElement>(null);
  const addressbookFileInputRef = useRef<HTMLInputElement>(null);
  const [excludeModalOpen, setExcludeModalOpen] = useState(false);
  const [pendingPickerRows, setPendingPickerRows] = useState<BulkRecipientRow[]>([]);
  const [addressbookParsing, setAddressbookParsing] = useState(false);
  const [googleContactsLoading, setGoogleContactsLoading] = useState(false);
  const [pickerIsGoogle, setPickerIsGoogle] = useState(false);
  const entryQueryHandledRef = useRef(false);

  useFontAwesomeCdn();

  useEffect(() => {
    pingApplyIntroSkipQueryToHistory();
    pingIntroOnReloadClearSeen();
    if (!pingIntroSeen()) {
      pingSetIntroReturnPath(PING_MAIN_APP_PATH);
      router.replace("/intro" + window.location.search + window.location.hash);
      setBootState("redirect-intro");
      return;
    }
    try {
      sessionStorage.setItem(PING_FLOW_KEY_ROUTE, ROUTE_BULK_DIRECT);
      sessionStorage.setItem(PING_FLOW_KEY_STARTED, "1");
    } catch {
      /* ignore */
    }
    setBootState("ready");
  }, [router]);

  const gateReady = bootState === "ready";

  /** Phase 4: step 4는 `/send/payments` 단일 화면 */
  const navigateToBulkPaymentsStep = useCallback(() => {
    let route: typeof ROUTE_BULK_DIRECT | typeof ROUTE_OBITUARY_THEN_BULK = ROUTE_BULK_DIRECT;
    try {
      const stored = sessionStorage.getItem(PING_FLOW_KEY_ROUTE);
      if (stored === ROUTE_OBITUARY_THEN_BULK) route = ROUTE_OBITUARY_THEN_BULK;
    } catch {
      /* ignore */
    }
    markBulkFlowStarted(route);
    try {
      sessionStorage.setItem("ping_send_channel", "sms");
      sessionStorage.removeItem("ping_payments_skip_redirect");
      sessionStorage.removeItem("ping_review_skip_redirect");
    } catch {
      /* ignore */
    }
    router.push("/send/payments");
  }, [router]);

  useEffect(() => {
    if (!gateReady) return;
    consumeBulkWizardResumeStep();
  }, [gateReady]);

  useLayoutEffect(() => {
    if (!gateReady) return;
    setComposeImage(loadComposeImageFromSession());
  }, [gateReady]);

  useEffect(() => {
    if (!gateReady) return;
    persistComposeImageSession(composeImage);
  }, [gateReady, composeImage]);

  useEffect(() => {
    if (!urlImportLoading) {
      setUrlPassOverlayVisible(false);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setUrlPassOverlayVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [urlImportLoading]);

  useEffect(() => {
    if (!gateReady) return;
    const snapEarly = loadPingFromIndexSnapshot();
    if (
      sessionStorage.getItem(PING_REACT_BULK_PENDING_REVIEW_KEY) === "1" &&
      loadBulkRecipientsCount() >= 1
    ) {
      if (snapEarly.bulkFlowKind === "thankyou") setIsThankYouFlow(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const entryThankyou = params.get("thankyou") === "1";
    const snap = loadPingFromIndexSnapshot();
    const sessionThankyou = snap.bulkFlowKind === "thankyou";
    if (!entryThankyou && !sessionThankyou) return;

    setIsThankYouFlow(true);

    if (entryThankyou) {
      clearBulkRecipientsAndFlagsSession();
      params.delete("thankyou");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash || ""}`,
      );
    }

    const n = loadBulkRecipientsCount();
    if (n > 0) {
      navigateToBulkPaymentsStep();
      return;
    }

    const snapFresh = loadPingFromIndexSnapshot();
    const draft = String(snapFresh.bulkSmsMessageDraft || "").trim();
    const nextBody = draft
      ? truncateBulkSmsBodyToMaxBytes(sanitizeBulkSmsBodyText(draft))
      : truncateBulkSmsBodyToMaxBytes(BULK_THANKYOU_SMS_DEFAULT);
    const nextTitle = String(snapFresh.bulkSmsTitle || "").slice(0, BULK_SMS_TITLE_MAX_CHARS);
    const nextTid: BulkSmsTemplateId = snapFresh.smsTemplateId === "2" ? "2" : "1";
    setBody(nextBody);
    setTitle(nextTitle);
    setTemplateId(nextTid);
    setUrl("");

    try {
      sessionStorage.setItem(
        "ping_from_index",
        JSON.stringify({
          ...snapFresh,
          bulkFlowKind: "thankyou",
          obituaryPageUrl: "",
          bulkSmsTitle: nextTitle,
          bulkSmsMessageDraft: nextBody,
          smsTemplateId: nextTid,
          ts: Date.now(),
        }),
      );
    } catch {
      /* ignore */
    }

    setStep("compose");
  }, [gateReady, navigateToBulkPaymentsStep]);

  useEffect(() => {
    if (!gateReady || step !== "review") return;
    navigateToBulkPaymentsStep();
  }, [gateReady, step, navigateToBulkPaymentsStep]);

  useEffect(() => {
    if (!gateReady) return;
    try {
      if (sessionStorage.getItem(PING_REACT_BULK_PENDING_REVIEW_KEY) !== "1") return;
      if (loadBulkRecipientsCount() < 1) return;
      sessionStorage.removeItem(PING_REACT_BULK_PENDING_REVIEW_KEY);
      navigateToBulkPaymentsStep();
    } catch {
      try {
        sessionStorage.removeItem(PING_REACT_BULK_PENDING_REVIEW_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [gateReady, navigateToBulkPaymentsStep]);

  useEffect(() => {
    if (!tplOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!tplWrapRef.current?.contains(e.target as Node)) setTplOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTplOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [tplOpen]);

  useEffect(() => {
    if (step !== "compose") setTplOpen(false);
  }, [step]);

  const openSavedComposeModal = useCallback(() => {
    setSavedComposeList(readSavedComposeList());
    setSavedComposeModalOpen(true);
  }, []);

  const openRecentSendsModal = useCallback(() => {
    setRecentSendsList(readRecentBulkSendsList());
    setRecentSendsModalOpen(true);
  }, []);

  useEffect(() => {
    if (!savedComposeModalOpen && !recentSendsModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSavedComposeModalOpen(false);
        setRecentSendsModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [savedComposeModalOpen, recentSendsModalOpen]);

  const onSaveComposeDraft = useCallback(() => {
    try {
      const nv = normalizeObituaryUrlForField(url);
      saveBulkComposeDraftToDevice({
        title,
        body,
        obituaryPageUrl: isThankYouFlow ? "" : nv,
        templateId,
        image: composeImage,
      });
      window.alert("저장 목록에 추가했습니다. (이 브라우저·이 기기만)");
    } catch (e) {
      const err = e as { name?: string; code?: number };
      if (err?.name === "QuotaExceededError" || err?.code === 22) {
        window.alert(
          "저장 공간이 부족합니다. 큰 이미지 첨부를 지우거나 오래된 저장을 삭제해 주세요.",
        );
      } else {
        window.alert("저장에 실패했습니다.");
      }
    }
  }, [title, body, url, templateId, isThankYouFlow, composeImage]);

  const applySavedComposeEntry = useCallback(
    (e: BulkSavedComposeEntry) => {
      setTitle(String(e.title || "").slice(0, BULK_SMS_TITLE_MAX_CHARS));
      setBody(
        truncateBulkSmsBodyToMaxBytes(sanitizeBulkSmsBodyText(String(e.body || ""))),
      );
      setTemplateId(e.smsTemplateId === "2" ? "2" : "1");
      if (!isThankYouFlow && e.obituaryPageUrl) {
        setUrl(normalizeObituaryUrlForField(String(e.obituaryPageUrl)));
      }
      setUrlHint(null);
      if (e.image?.dataUrl) {
        setComposeImage({
          dataUrl: e.image.dataUrl,
          name: e.image.name || "image.jpg",
          mime: "image/jpeg",
        });
      } else {
        setComposeImage(null);
      }
      setSavedComposeModalOpen(false);
    },
    [isThankYouFlow],
  );

  const applyRecentSendAsReference = useCallback(
    (e: BulkRecentSendEntry) => {
      if (e.title) {
        setTitle(String(e.title).slice(0, BULK_SMS_TITLE_MAX_CHARS));
      }
      if (e.bodyPreview) {
        setBody(
          truncateBulkSmsBodyToMaxBytes(
            sanitizeBulkSmsBodyText(String(e.bodyPreview)),
          ),
        );
      }
      if (!isThankYouFlow && e.obituaryPageUrl) {
        setUrl(normalizeObituaryUrlForField(String(e.obituaryPageUrl)));
      }
      setUrlHint(null);
      setRecentSendsModalOpen(false);
    },
    [isThankYouFlow],
  );

  const onPickComposeImageFile = useCallback((fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    compressImageFileForBulkCompose(file)
      .then(setComposeImage)
      .catch((err: unknown) => {
        window.alert(err instanceof Error ? err.message : "이미지를 첨부하지 못했습니다.");
      })
      .finally(() => {
        const inp = composeImageInputRef.current;
        if (inp) inp.value = "";
      });
  }, []);

  const bodyBytes = bulkSmsUtf8ByteLength(body);

  const applyComposeHydrateFromSession = useCallback(
    (fallbackTemplateId: BulkSmsTemplateId, existingBody = "") => {
      const h = readBulkComposeHydrateFromSession(fallbackTemplateId, existingBody);
      setTemplateId(h.templateId);
      setBody(h.body);
      if (h.title) setTitle(h.title);
    },
    [],
  );

  const advanceUrlStepToCompose = useCallback(
    async (rawUrl: string) => {
      if (urlAdvanceLockRef.current) return;
      urlAdvanceLockRef.current = true;
      setUrlImportLoading(true);
      try {
        const result = await advanceBulkEntryFromObituaryUrl(
          rawUrl,
          bugoImportSessionRef.current,
          templateId,
          body,
        );
        if (!result.ok) {
          setUrlHint(result.hint);
          return;
        }
        setUrl(result.normalizedUrl);
        setUrlHint(null);
        if (result.importWarning) window.alert(result.importWarning);
        setTemplateId(result.compose.templateId);
        setBody(result.compose.body);
        if (result.compose.title) setTitle(result.compose.title);
        setStep("compose");
      } finally {
        setUrlImportLoading(false);
        urlAdvanceLockRef.current = false;
      }
    },
    [templateId, body],
  );

  const onUrlInput = useCallback((raw: string) => {
    urlAutoAdvancePausedRef.current = false;
    setUrl(raw);
    setUrlHint(null);
    bugoImportSessionRef.current.resetImportCacheIfUrlChanged(raw);
  }, []);

  const onUrlBlur = useCallback(() => {
    const nv = normalizeObituaryUrlForField(url);
    setUrl(nv);
    if (!String(url).trim()) {
      setUrlHint(null);
      return;
    }
    if (isObituaryUrlFieldValid(nv)) {
      setUrlHint(null);
      void advanceUrlStepToCompose(nv);
    } else {
      setUrlHint(EXTERNAL_OBITUARY_URL_HINT);
    }
  }, [url, advanceUrlStepToCompose]);

  const onUrlPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      urlAutoAdvancePausedRef.current = false;
      const dt = e.clipboardData;
      const text = dt ? dt.getData("text") : "";
      if (!text) return;
      e.preventDefault();
      const parsed = parseObituaryUrlPaste(text);
      setUrl(parsed.url);
      setUrlHint(parsed.hint);
      if (parsed.canAdvance) void advanceUrlStepToCompose(parsed.url);
    },
    [advanceUrlStepToCompose],
  );

  useEffect(() => {
    if (!gateReady || step !== "url" || isThankYouFlow) return;
    if (urlAutoAdvancePausedRef.current) return;
    const nv = normalizeObituaryUrlForField(url);
    if (!isObituaryUrlFieldValid(nv)) return;
    const timer = window.setTimeout(() => {
      void advanceUrlStepToCompose(nv);
    }, 480);
    return () => window.clearTimeout(timer);
  }, [gateReady, step, isThankYouFlow, url, advanceUrlStepToCompose]);

  const pickTemplateAndCloseMenu = useCallback((id: BulkSmsTemplateId) => {
    setTemplateId(id);
    setBody(truncateBulkSmsBodyToMaxBytes(getStaticBulkTemplateBody(id)));
    setTplOpen(false);
  }, []);
  const onBodyChange = useCallback((v: string) => {
    setBody(truncateBulkSmsBodyToMaxBytes(sanitizeBulkSmsBodyText(v)));
  }, []);

  const onTitleChange = useCallback((v: string) => {
    setTitle(v.slice(0, BULK_SMS_TITLE_MAX_CHARS));
  }, []);

  const goPick = useCallback(() => {
    if (!isThankYouFlow) {
      const nv = normalizeObituaryUrlForField(url);
      if (!isObituaryUrlFieldValid(nv)) {
        setUrlHint(EXTERNAL_OBITUARY_URL_HINT);
        setStep("url");
        return;
      }
    }
    if (!isBulkSmsBodyStepValid(body)) return;
    const nv = normalizeObituaryUrlForField(url);
    persistBulkComposeToPingFromIndex({
      title,
      body,
      templateId,
      obituaryPageUrl: isThankYouFlow ? "" : nv,
      bulkFlowKind: isThankYouFlow ? "thankyou" : "obituary",
    });
    setStep("pick");
  }, [url, body, title, templateId, isThankYouFlow]);

  const onComposeNext = useCallback(() => {
    if (!isBulkSmsBodyStepValid(body)) {
      window.alert(
        isThankYouFlow
          ? "답례 문자 내용을 입력해 주세요."
          : "부고 문자 내용을 확인해 주세요.",
      );
      return;
    }
    goPick();
  }, [body, isThankYouFlow, goPick]);

  const onHeaderBack = useCallback(() => {
    if (step === "review") {
      setStep("pick");
      return;
    }
    if (step === "pick") {
      setStep("compose");
      return;
    }
    if (step === "compose" && !isThankYouFlow) {
      urlAutoAdvancePausedRef.current = true;
      setStep("url");
      return;
    }
    pingAssignToLocation("/");
  }, [step, isThankYouFlow]);

  const onReviewNext = useCallback(() => {
    if (!isThankYouFlow) {
      const nv = normalizeObituaryUrlForField(url);
      if (!isObituaryUrlFieldValid(nv)) {
        setUrlHint(EXTERNAL_OBITUARY_URL_HINT);
        setStep("url");
        return;
      }
    }
    if (loadBulkRecipientsCount() < 1) {
      window.alert("주소록을 불러와 주세요.");
      setStep("pick");
      return;
    }
    const nv = normalizeObituaryUrlForField(url);
    persistBulkComposeToPingFromIndex({
      title,
      body,
      templateId,
      obituaryPageUrl: isThankYouFlow ? "" : nv,
      bulkFlowKind: isThankYouFlow ? "thankyou" : "obituary",
    });
    navigateToBulkPaymentsStep();
  }, [url, title, body, templateId, isThankYouFlow, navigateToBulkPaymentsStep]);

  const onPickAddressbookFile = useCallback(async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setPickerIsGoogle(false);
    setAddressbookParsing(true);
    try {
      const rows = await parseAddressbookFile(file);
      setPendingPickerRows(rows);
      setExcludeModalOpen(true);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    } finally {
      setAddressbookParsing(false);
      const inp = addressbookFileInputRef.current;
      if (inp) inp.value = "";
    }
  }, []);

  const onPickGoogleContacts = useCallback(async () => {
    if (!isThankYouFlow) {
      const nv = normalizeObituaryUrlForField(url);
      if (!isObituaryUrlFieldValid(nv)) {
        setUrlHint(EXTERNAL_OBITUARY_URL_HINT);
        setStep("url");
        return;
      }
    }
    if (!isBulkSmsBodyStepValid(body)) {
      setStep("compose");
      return;
    }
    setGoogleContactsLoading(true);
    try {
      const rows = await fetchGoogleContactPickerRows();
      setPickerIsGoogle(true);
      setPendingPickerRows(rows);
      setExcludeModalOpen(true);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "구글 연락처를 가져오지 못했습니다.");
    } finally {
      setGoogleContactsLoading(false);
    }
  }, [url, body, isThankYouFlow]);

  const onConfirmRecipientPicker = useCallback(
    (effective: BulkRecipientRow[]) => {
      const nv = normalizeObituaryUrlForField(url);
      saveBulkRecipientsToSession(
        effective,
        {
          useFilteredAddressbookCsv: true,
          isGoogleContactsMode: pickerIsGoogle,
          naverAddressbookImportActive: !pickerIsGoogle,
          bulkFlowKind: isThankYouFlow ? "thankyou" : "obituary",
        },
        {
          obituaryPageUrl: isThankYouFlow ? "" : nv,
          bulkFlowKind: isThankYouFlow ? "thankyou" : "obituary",
          bulkSmsTitle: title.slice(0, BULK_SMS_TITLE_MAX_CHARS),
          bulkSmsMessageDraft: body,
          smsTemplateId: templateId,
        },
      );
      setExcludeModalOpen(false);
      setPendingPickerRows([]);
      navigateToBulkPaymentsStep();
    },
    [url, title, body, templateId, isThankYouFlow, pickerIsGoogle, navigateToBulkPaymentsStep],
  );

  useEffect(() => {
    if (!gateReady || entryQueryHandledRef.current) return;
    const effect = consumeBulkEntryQueryEffect();
    if (!effect) return;
    entryQueryHandledRef.current = true;

    if (effect.type === "mergeBulk") {
      markBulkFlowStarted(ROUTE_OBITUARY_THEN_BULK);
      setIsThankYouFlow(false);
      const obUrl = effect.obituaryUrl;
      if (obUrl) {
        setUrl(obUrl);
        void advanceUrlStepToCompose(obUrl);
      } else {
        setStep("url");
      }
      if (effect.openGoogleContacts) {
        window.setTimeout(() => void onPickGoogleContacts(), 320);
      }
      return;
    }

    if (effect.type === "bulkAfterUrl") {
      markBulkFlowStarted(ROUTE_BULK_DIRECT);
      const snap = loadPingFromIndexSnapshot();
      const norm = normalizeObituaryUrlForField(String(snap.obituaryPageUrl || ""));
      if (!isObituaryUrlFieldValid(norm)) {
        window.alert("저장된 부고 주소(https)가 없습니다.");
        router.push("/send/url");
        return;
      }
      setUrl(norm);
      applyComposeHydrateFromSession(templateId);
      setStep("compose");
      return;
    }

    if (effect.type === "openGoogleContacts") {
      window.setTimeout(() => void onPickGoogleContacts(), 120);
    }
  }, [
    gateReady,
    advanceUrlStepToCompose,
    applyComposeHydrateFromSession,
    templateId,
    onPickGoogleContacts,
    router,
  ]);

  const onComposeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" || !e.ctrlKey) return;
      e.preventDefault();
      goPick();
    },
    [goPick],
  );

  useEffect(() => {
    if (!gateReady) return;
    const ty = isThankYouFlow;
    document.title =
      getBulkWizardStepCopy(step, ty).docTitle ?? "PING · 대량 발송";
  }, [gateReady, step, isThankYouFlow]);

  const canUrlNext = isObituaryUrlFieldValid(normalizeObituaryUrlForField(url));
  const canComposeNext = isBulkSmsBodyStepValid(body);

  const reviewRecipientCount = step === "review" ? loadBulkRecipientsCount() : 0;
  const reviewTotals =
    step === "review" ? computeBulkOrderTotals(reviewRecipientCount) : null;
  const reviewFlags = step === "review" ? loadPingBulkFlags() : {};
  const reviewFromIndex = step === "review" ? loadPingFromIndexSnapshot() : {};
  const reviewSourceLabelText =
    step === "review" && reviewTotals && reviewRecipientCount > 0
      ? bulkReviewSourceLabel(reviewRecipientCount, reviewFlags, reviewFromIndex)
      : "";
  const canReviewNext = reviewRecipientCount > 0 && reviewTotals !== null;

  useEffect(() => {
    if (!gateReady || step !== "review") return;
    if (loadBulkRecipientsCount() > 0) return;
    setStep("pick");
  }, [gateReady, step]);

  if (bootState === "redirect-intro") {
    return null;
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          "app-shell bulk-entry-shell relative flex min-h-0 w-full flex-1 flex-col overflow-hidden",
          isThankYouFlow && "thankyou-bulk-flow",
        )}
      >
      <header
        className={cn("ping-top-nav", !showHeaderBack && "ping-top-nav--balanced")}
      >
        {showHeaderBack ? (
          <button
            type="button"
            className="ping-top-nav__back ping-back-btn touch-manipulation"
            aria-label="이전"
            onClick={onHeaderBack}
          >
            <span className="ping-chevron-left" aria-hidden />
          </button>
        ) : (
          <span className="ping-top-nav__spacer" aria-hidden="true" />
        )}
        <h1 className="ping-top-nav__title">{wizardStepCopy.title}</h1>
        {showHeaderBack ? (
          <span className="ping-top-nav__spacer" aria-hidden="true" />
        ) : null}
      </header>

      <BulkFlowProgress
        currentStep={bulkFlowStepFromWizard(step)}
        labelOverride={
          isThankYouFlow && step === "compose" ? "답례 문자" : undefined
        }
      />

      <main
        className={cn(
          "index-main-flow flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden px-0",
          (step === "url" && !isThankYouFlow) ||
          step === "compose" ||
          step === "pick" ||
          step === "review"
            ? "bg-[var(--ping-surface)]"
            : undefined,
        )}
        id="bulk-main"
      >
        {gateReady ? (
        step === "url" && !isThankYouFlow ? (
          <section
            className="bulk-url-step mb-0 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[var(--ping-surface)] px-0"
            aria-label="부고 주소 입력"
          >
            {urlImportLoading ? (
              <div
                className={cn(
                  "bulk-url-pass-parse-overlay",
                  urlPassOverlayVisible && "is-visible",
                )}
                aria-busy="true"
                aria-live="polite"
                role="status"
              >
                <div className="bulk-url-pass-parse-inner">
                  <PingLoadingSpinner size="lg" label="부고 메시지 작성 중" />
                  <p className="bulk-url-pass-parse-text">
                    이제 곧 부고 메세지가 작성되요
                    <span className="bulk-url-pass-dots" aria-hidden="true">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
            <div className="flex min-h-0 flex-col bg-[var(--ping-surface)] px-5 pb-4 pt-3">
              <div className="bulk-url-step__card ping-bordered-panel mb-3 min-w-0 max-w-full p-5">
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#3182F6]">
                  부고 발송
                </p>
                <div className="ping-step-head ping-step-head--panel mb-4">
                  <h1 className="ping-step-head__title">{wizardStepCopy.title}</h1>
                  <p className="ping-step-head__sub">{wizardStepCopy.subtitle}</p>
                </div>

                <div className="bulk-url-step__input-wrap">
                  <label htmlFor="bulk-entry-zero-url" className="sr-only">
                    부고 주소 URL
                  </label>
                  <input
                    id="bulk-entry-zero-url"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    value={url}
                    onChange={(e) => onUrlInput(e.target.value)}
                    onBlur={onUrlBlur}
                    onPaste={onUrlPaste}
                    disabled={urlImportLoading}
                    aria-busy={urlImportLoading}
                    aria-invalid={urlHint ? true : undefined}
                    className={cn(
                      "input-field ping-field-standard w-full max-w-full min-w-0",
                      canUrlNext && "ping-field-standard--valid",
                    )}
                    placeholder="https://로 시작하는 주소"
                  />
                </div>
                {urlHint ? (
                  <p
                    className="mt-2 text-[13px] leading-relaxed text-red-600"
                    role="alert"
                  >
                    {urlHint}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : step === "compose" ? (
          <section
            className="bulk-compose-step mb-0 flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[var(--ping-surface)] px-0"
            aria-label={isThankYouFlow ? "답례 문자메세지" : "부고 문자메세지"}
          >
            <div className="bulk-compose-step__panel flex min-h-0 w-full min-w-0 max-w-full shrink-0 flex-col justify-start px-5 py-2 pb-4">
              <input
                ref={composeImageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => onPickComposeImageFile(e.target.files)}
              />
              <div
                className="index-bulk-compose ping-bordered-panel min-w-0 max-w-full p-5"
                aria-label={isThankYouFlow ? "답례 문자메세지 작성" : "부고 문자메세지 작성"}
              >
                <div className="ping-step-head ping-step-head--panel">
                  <h2 id="index-bulk-compose-heading" className="ping-step-head__title">
                    {wizardStepCopy.title}
                  </h2>
                  <p className="ping-step-head__sub">{wizardStepCopy.subtitle}</p>
                </div>
                <div className="index-bulk-compose-title-wrap">
                  <label className="sr-only" htmlFor="bulk-sms-title">
                    제목(선택)
                  </label>
                  <input
                    id="bulk-sms-title"
                    type="text"
                    maxLength={BULK_SMS_TITLE_MAX_CHARS}
                    autoComplete="off"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="input-field ping-field-standard ping-field-standard--with-trailing index-bulk-compose-title-input w-full max-w-full min-w-0 placeholder:text-[12px] placeholder:leading-snug placeholder:text-ping-caption"
                    placeholder="제목 (선택 사항)"
                    aria-describedby="index-bulk-compose-help-text"
                  />
                  <span className="index-bulk-compose-title-count" aria-hidden="true">
                    {title.length} / {BULK_SMS_TITLE_MAX_CHARS}
                  </span>
                </div>
                <div className="index-bulk-compose-body-shell">
                  <div className="index-bulk-compose-textarea-wrap">
                    <label className="sr-only" htmlFor="bulk-sms-body">
                      문자 본문
                    </label>
                    <textarea
                      id="bulk-sms-body"
                      value={body}
                      onChange={(e) => onBodyChange(e.target.value)}
                      onKeyDown={onComposeKeyDown}
                      spellCheck={false}
                      rows={8}
                      className="index-bulk-compose-textarea"
                      placeholder={
                        isThankYouFlow ? BULK_THANKYOU_BODY_PLACEHOLDER : BULK_COMPOSE_BODY_PLACEHOLDER
                      }
                    />
                  </div>
                  <div className="index-bulk-compose-toolbar">
                    <div className="index-bulk-compose-toolbar-left">
                      <div className="index-bulk-tpl-wrap" ref={tplWrapRef}>
                        <button
                          type="button"
                          className="index-bulk-toolbar-icon-btn"
                          id="bulk-tpl-trigger"
                          aria-label="템플릿 선택"
                          aria-expanded={tplOpen}
                          aria-haspopup="true"
                          aria-controls="bulk-tpl-menu"
                          onClick={() => setTplOpen((o) => !o)}
                        >
                          <i className="fas fa-file-lines" aria-hidden="true" />
                        </button>
                        <div
                          id="bulk-tpl-menu"
                          className={tplOpen ? "index-bulk-tpl-menu" : "index-bulk-tpl-menu hidden"}
                          role="menu"
                          aria-label="문구 템플릿"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="index-bulk-tpl-opt"
                            data-template="1"
                            onClick={() => pickTemplateAndCloseMenu("1")}
                          >
                            템플릿 1
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="index-bulk-tpl-opt"
                            data-template="2"
                            onClick={() => pickTemplateAndCloseMenu("2")}
                          >
                            템플릿 2
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="index-bulk-toolbar-icon-btn"
                        title="이미지 첨부 (JPEG으로 압축 저장)"
                        aria-label="이미지 첨부"
                        onClick={() => composeImageInputRef.current?.click()}
                      >
                        <i className="fas fa-image" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="index-bulk-toolbar-icon-btn"
                        title="이 브라우저에 임시 저장"
                        aria-label="임시 저장"
                        onClick={onSaveComposeDraft}
                      >
                        <i className="fas fa-floppy-disk" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="index-bulk-toolbar-text-btn"
                        title="이 기기에 저장한 문자 불러오기"
                        onClick={openSavedComposeModal}
                      >
                        <i className="fas fa-folder-open" aria-hidden="true" />
                        <span>저장내용</span>
                      </button>
                      <button
                        type="button"
                        className="index-bulk-toolbar-text-btn"
                        title="주문·결제 기록에서 문구 참고"
                        onClick={openRecentSendsModal}
                      >
                        <i className="fas fa-clock-rotate-left" aria-hidden="true" />
                        <span>최근발송</span>
                      </button>
                    </div>
                    <div className="index-bulk-compose-toolbar-right">
                      <span
                        id="bulk-byte-count-wrap"
                        className={cn(
                          "index-bulk-byte-count",
                          bodyBytes > BULK_SMS_BODY_MAX_BYTES && "is-over-limit",
                        )}
                      >
                        <span id="bulk-sms-byte-len">
                          {bodyBytes.toLocaleString("en-US")}
                        </span>{" "}
                        / {BULK_SMS_BODY_MAX_BYTES.toLocaleString("en-US")} Bytes
                      </span>
                      <button
                        type="button"
                        className="index-bulk-compose-help"
                        id="bulk-compose-help"
                        title="도움말"
                        aria-label="문자 작성 도움말"
                        onClick={() =>
                          window.alert(isThankYouFlow ? BULK_THANKYOU_COMPOSE_HELP : BULK_COMPOSE_HELP)
                        }
                      >
                        ?
                      </button>
                    </div>
                  </div>
                  {composeImage ? (
                    <div className="bulk-compose-image-preview px-2 pb-2">
                      <div className="bulk-compose-image-preview-inner">
                        <img
                          src={composeImage.dataUrl}
                          alt="첨부 이미지 미리보기"
                          className="bulk-compose-image-thumb"
                        />
                        <div className="bulk-compose-image-meta">
                          <span className="bulk-compose-image-name">
                            {composeImage.name || "첨부 이미지"}
                          </span>
                          <button
                            type="button"
                            className="bulk-compose-image-remove"
                            aria-label="첨부 이미지 제거"
                            onClick={() => setComposeImage(null)}
                          >
                            제거
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <p id="index-bulk-compose-help-text" className="sr-only">
                  {isThankYouFlow
                    ? "본문은 UTF-8 기준 2,000바이트까지 입력할 수 있습니다. #{이름}은 발송 시 수신자 이름으로 바뀝니다."
                    : "본문은 UTF-8 기준 2,000바이트까지 입력할 수 있습니다. {{LINK}}는 발송 시 부고 주소로 바뀝니다."}
                </p>
              </div>
            </div>
          </section>
        ) : step === "pick" ? (
          <section
            className="bulk-pick-step mb-0 flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[var(--ping-surface)] px-0"
            aria-label={isThankYouFlow ? "답례 명단 올리기" : "연락처 가져오기"}
          >
            <div className="bulk-pick-step__panel flex min-h-0 w-full min-w-0 max-w-full shrink-0 flex-col justify-start px-5 py-2 pb-4">
              <input
                ref={addressbookFileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.vcf,.vcard"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => void onPickAddressbookFile(e.target.files)}
              />
              <div className="bulk-pick-step__card ping-bordered-panel flex min-w-0 max-w-full flex-col gap-3 p-5">
                <div className="ping-step-head ping-step-head--panel">
                  <h2 className="ping-step-head__title">{wizardStepCopy.title}</h2>
                  <p className="ping-step-head__sub">{wizardStepCopy.subtitle}</p>
                </div>
                <div className="bulk-pick-source-btn-wrap">
                  {SHOW_GOOGLE_CONTACTS_REVIEW_BADGE ? (
                    <span
                      className="bulk-pick-source-btn__review-badge"
                      aria-hidden="true"
                    >
                      Google 심사중
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="bulk-pick-source-btn"
                    disabled={googleContactsLoading || addressbookParsing}
                    onClick={() => void onPickGoogleContacts()}
                  >
                    <GoogleGMark className="shrink-0" />
                    <span>
                      {googleContactsLoading
                        ? "구글 연락처 가져오는 중…"
                        : "Google 연락처"}
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  title="CSV, 엑셀(xlsx·xls), VCard(vcf·vcard) 파일을 선택할 수 있습니다."
                  aria-label="주소록 파일 선택: CSV, 엑셀 xlsx 또는 xls, VCard vcf 또는 vcard"
                  className="bulk-pick-source-btn"
                  disabled={addressbookParsing}
                  onClick={() => addressbookFileInputRef.current?.click()}
                >
                  <i className="fas fa-file-csv text-ping-body" aria-hidden="true" />
                  <span>{addressbookParsing ? "파일 분석 중…" : "네이버 주소록 파일"}</span>
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section
            className="bulk-review-step mb-0 flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[var(--ping-surface)] px-0"
            aria-label="결제 금액 확인"
          >
            <div className="bulk-review-step__panel flex min-h-0 w-full min-w-0 max-w-full shrink-0 flex-col justify-start px-5 py-2 pb-4">
              <div className="bulk-review-step__card ping-bordered-panel flex min-w-0 max-w-full flex-col gap-3 p-5">
                <div className="ping-step-head ping-step-head--panel">
                  <h2 className="ping-step-head__title">{wizardStepCopy.title}</h2>
                  <p className="ping-step-head__sub">{wizardStepCopy.subtitle}</p>
                </div>
                {reviewSourceLabelText ? (
                  <div className="bulk-review-source flex min-w-0 max-w-full shrink-0 items-center text-sm text-ping-body">
                    <i className="fas fa-file mr-2 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">{reviewSourceLabelText}</span>
                  </div>
                ) : null}
                {reviewTotals ? (
                  <div className="bulk-review-totals min-w-0 max-w-full shrink-0 space-y-2">
                    <div className="bulk-review-totals__row flex min-w-0 max-w-full items-center justify-between gap-3 text-sm">
                      <span className="shrink-0 text-ping-body">유효 연락처</span>
                      <span className="min-w-0 text-right font-bold text-ping-title">
                        {reviewRecipientCount.toLocaleString("ko-KR")}건
                      </span>
                    </div>
                    <div className="bulk-review-totals__row flex min-w-0 max-w-full items-center justify-between gap-3 text-sm">
                      <span className="shrink-0 text-ping-body" id="bulk-send-cost-label">
                        발송비
                      </span>
                      <span className="min-w-0 text-right font-bold text-ping-title">
                        {reviewTotals.sendCost.toLocaleString("ko-KR")}원
                      </span>
                    </div>
                    <div
                      className="bulk-review-totals__row hidden min-w-0 max-w-full items-center justify-between gap-3 text-sm"
                      id="bulk-base-fee-row"
                    >
                      <span className="shrink-0 text-ping-body">기본 이용료</span>
                      <span
                        className="min-w-0 text-right font-bold text-ping-title"
                        id="bulk-base-fee-display"
                      >
                        {reviewTotals.baseFee.toLocaleString("ko-KR")}원
                      </span>
                    </div>
                    <div className="bulk-review-totals__total mt-3 flex min-w-0 max-w-full items-center justify-between gap-3">
                      <span className="shrink-0 text-base font-bold tracking-tight text-ping-title">
                        총 결제금액
                      </span>
                      <span className="min-w-0 text-right text-xl font-extrabold tracking-tight text-ping-primary">
                        {reviewTotals.total.toLocaleString("ko-KR")}원
                      </span>
                    </div>
                    <p className="text-ping-caption mt-1 text-right text-[10px]">번호 있는 행만 집계</p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        )
        ) : (
          <div
            className="flex min-h-0 flex-1 flex-col bg-[var(--ping-surface)]"
            aria-busy="true"
            aria-hidden
          />
        )}
      </main>

      {gateReady && step === "compose" ? (
        <div
          className="bulk-flow-cta shrink-0 w-full bg-[var(--ping-surface)]"
          aria-label="문자 작성 단계 이동"
        >
          <div className="bulk-flow-cta__wrap index-sticky-btn-wrap">
            <div className="index-sticky-btn-row bulk-flow-cta__row--solo">
              <button
                type="button"
                id="submit-btn"
                className="ob-flow-btn-primary index-flow-cta-primary flex min-h-[52px] touch-manipulation flex-col items-center justify-center gap-0"
                disabled={!canComposeNext}
                onClick={onComposeNext}
              >
                <span id="btn-text">다음</span>
              </button>
            </div>
          </div>
        </div>
      ) : gateReady && step === "review" ? (
        <div
          className="bulk-flow-cta shrink-0 w-full bg-[var(--ping-surface)]"
          aria-label="결제 금액 확인 단계 이동"
        >
          <div className="bulk-flow-cta__wrap index-sticky-btn-wrap">
            <div className="index-sticky-btn-row bulk-flow-cta__row--solo">
              <button
                type="button"
                id="submit-btn"
                className="ob-flow-btn-primary index-flow-cta-primary flex min-h-[52px] touch-manipulation flex-col items-center justify-center gap-0"
                disabled={!canReviewNext}
                onClick={onReviewNext}
              >
                <span id="btn-text">다음</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <RecipientExcludeModal
        open={excludeModalOpen}
        rows={pendingPickerRows}
        onClose={() => {
          setExcludeModalOpen(false);
          setPendingPickerRows([]);
        }}
        onConfirm={onConfirmRecipientPicker}
      />

      {savedComposeModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setSavedComposeModalOpen(false);
          }}
        >
          <div
            className="flex max-h-[min(85dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-saved-compose-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-ping-line px-4 py-3">
              <h3 id="bulk-saved-compose-title" className="text-base font-bold text-ping-title">
                저장 내용
              </h3>
              <button
                type="button"
                className="touch-manipulation rounded-lg px-2 py-1 text-2xl leading-none text-ping-body hover:bg-ping-sub"
                aria-label="닫기"
                onClick={() => setSavedComposeModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {!savedComposeList.length ? (
                <p className="text-center text-sm leading-relaxed text-ping-body">
                  저장된 항목이 없습니다.
                  <br />
                  「임시 저장」으로 이 기기에 보관할 수 있습니다.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {savedComposeList.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-ping-line bg-ping-surface p-3 text-sm shadow-sm"
                    >
                      <div className="text-ping-caption text-[11px]">
                        {formatBulkComposeSavedTs(item.ts)}
                        {item.image?.dataUrl ? " · 이미지 있음" : ""}
                      </div>
                      <div className="mt-1 font-semibold text-ping-title">
                        {(item.title || "(제목 없음)").slice(0, 80)}
                      </div>
                      <p className="text-ping-body mt-1 line-clamp-3 text-[13px] leading-snug">
                        {(item.body || "").trim() ? item.body.slice(0, 140) : "(본문 없음)"}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          className="touch-manipulation rounded-lg bg-[var(--ping-primary)] px-3 py-2 text-[13px] font-semibold text-white"
                          onClick={() => applySavedComposeEntry(item)}
                        >
                          불러오기
                        </button>
                        <button
                          type="button"
                          className="touch-manipulation rounded-lg border border-ping-line bg-white px-3 py-2 text-[13px] font-medium text-ping-title"
                          onClick={() => {
                            if (!window.confirm("이 저장 항목을 삭제할까요?")) return;
                            deleteSavedComposeEntry(item.id);
                            setSavedComposeList(readSavedComposeList());
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {recentSendsModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setRecentSendsModalOpen(false);
          }}
        >
          <div
            className="flex max-h-[min(85dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-recent-sends-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-ping-line px-4 py-3">
              <h3 id="bulk-recent-sends-title" className="text-base font-bold text-ping-title">
                최근 발송
              </h3>
              <button
                type="button"
                className="touch-manipulation rounded-lg px-2 py-1 text-2xl leading-none text-ping-body hover:bg-ping-sub"
                aria-label="닫기"
                onClick={() => setRecentSendsModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {!recentSendsList.length ? (
                <p className="text-center text-sm leading-relaxed text-ping-body">
                  아직 기록이 없습니다.
                  <br />
                  주문·결제 저장이 완료되면 여기에 쌓입니다.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {recentSendsList.map((item, idx) => {
                    const cnt =
                      item.count != null ? `${item.count}건` : "";
                    const amt =
                      item.amount != null
                        ? `${Number(item.amount).toLocaleString("ko-KR")}원`
                        : "";
                    const extra = [cnt, amt].filter(Boolean).join(" / ");
                    return (
                      <li
                        key={item.id || `r-${idx}`}
                        className="rounded-lg border border-ping-line bg-ping-surface p-3 text-sm shadow-sm"
                      >
                        <div className="text-ping-caption text-[11px]">
                          {formatBulkComposeSavedTs(item.ts)} · 주문 {String(item.id || "")}
                        </div>
                        <div className="mt-1 font-semibold text-ping-title">
                          {(item.title || "(제목 없음)").slice(0, 80)}
                          {extra ? (
                            <span className="ml-1 font-semibold text-black"> {extra}</span>
                          ) : null}
                        </div>
                        <p className="text-ping-body mt-1 line-clamp-3 text-[13px] leading-snug">
                          {(item.bodyPreview || "").trim()
                            ? String(item.bodyPreview).slice(0, 140)
                            : "(본문 없음)"}
                        </p>
                        <div className="mt-2">
                          <button
                            type="button"
                            className="touch-manipulation rounded-lg bg-[var(--ping-primary)] px-3 py-2 text-[13px] font-semibold text-white"
                            onClick={() => applyRecentSendAsReference(item)}
                          >
                            불러오기
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

export function BulkEntryClient() {
  return (
    <Suspense fallback={<BulkEntryShellPlaceholder />}>
      <BulkEntryInner />
    </Suspense>
  );
}
