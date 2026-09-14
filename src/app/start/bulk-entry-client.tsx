"use client";

import { PING_REACT_BULK_PENDING_REVIEW_KEY } from "@/lib/ping-flow-client";
import { pingTrack } from "@/lib/ping-analytics";
import { fetchGoogleContactPickerRows } from "@/lib/ping-google-contacts";
import { computeBulkOrderTotals } from "@/lib/ping-bulk-pricing";
import {
  deleteSavedComposeEntry,
  readRecentBulkSendsList,
  readSavedComposeList,
  saveBulkComposeDraftToDevice,
  type BulkRecentSendEntry,
  type BulkSavedComposeEntry,
} from "@/lib/ping-bulk-compose-storage";
import {
  consumeBulkWizardResumeStep,
  peekBulkWizardResumeStep,
  resumeBulkWizardStep,
} from "@/lib/ping-bulk-flow-nav";
import { PingDevFlowSkipButton } from "@/components/bulk/ping-dev-flow-skip-button";
import { RecipientExcludeModal } from "@/components/bulk/recipient-exclude-modal";
import { isBulkWizardFirstStep } from "@/lib/ping-bulk-flow-steps";
import { getBulkWizardStepCopy, START_INTENT_COPY } from "@/lib/ping-flow-step-copy";
import { hydratePingFunexSession, isPingMemberLoggedIn } from "@/lib/ping-member-session-client";
import { FUNEX_JIT_CONTACTS_RETURN } from "@/lib/funex-return-to";
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
import { capturePartnerAttributionFromLocation } from "@/lib/ping-partner-attribution";
import { PING_MAIN_APP_PATH } from "@/lib/ping-main-path";
import { pingAssignToLocation } from "@/lib/ping-nav-home";
import {
  BULK_SMS_TITLE_MAX_CHARS,
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
  PING_DEV_PREVIEW_URL,
  consumePingDevWizardStep,
  markPingDevFlowPreview,
  peekPingDevWizardStep,
  seedPingDevBulkPreviewSession,
} from "@/lib/ping-dev-flow-skip";
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
import { StartBottomAction } from "@/components/start/start-bottom-action";
import { StartCanonicalShell } from "@/components/start/start-canonical-shell";
import { StartComposeStep } from "@/components/start/start-compose-step";
import { StartContactsImportStep } from "@/components/start/start-contacts-import-step";
import { StartHeader } from "@/components/start/start-header";
import { StartIntentStep } from "@/components/start/start-intent-step";
import { StartRecentSendsModal } from "@/components/start/start-recent-sends-modal";
import { StartReviewStep } from "@/components/start/start-review-step";
import { StartSavedComposeModal } from "@/components/start/start-saved-compose-modal";
import { StartStepIndicator } from "@/components/start/start-step-indicator";
import { StartUrlStep } from "@/components/start/start-url-step";
import { PingSiteLegalFooter } from "@/components/ping-site-legal-footer";

/** TEMP — Google 연락처 OAuth 심사 중 배지. 심사 완료 후 false 또는 아래 마크업·CSS 삭제 */
const SHOW_GOOGLE_CONTACTS_REVIEW_BADGE = true;

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
    const devStep = peekPingDevWizardStep();
    if (devStep) return devStep;
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

/** 답례·이어하기·명시 쿼리면 분기 화면을 건너뛴다. */
function readSkipStartIntentChoose(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("thankyou") === "1") return true;
    if (sp.get("skipIntro") === "1") return true;
    if (sp.get("resumeContacts") === "1") return true;
    if (sp.get("authError") === "1") return true;
    if (sp.get("intent") === "bulk") return true;
    if (sp.get("intent") === "write") return true;
    if (sp.get("mergeBulk") === "1") return true;
    if (sp.get("bulkAfterUrl") === "1") return true;
    if (peekBulkWizardResumeStep()) return true;
    if (peekPingDevWizardStep()) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function readInitialShowIntentChoose(): boolean {
  if (typeof window === "undefined") return false;
  return !readSkipStartIntentChoose();
}

function readInitialComposeState(): {
  title: string;
  body: string;
  templateId: BulkSmsTemplateId;
} {
  if (typeof window === "undefined") {
    return { title: "", body: "", templateId: "1" };
  }
  const thankyou =
    (() => {
      try {
        return new URLSearchParams(window.location.search).get("thankyou") === "1";
      } catch {
        return false;
      }
    })() || readThankYouSessionFromStorage();
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
    const title = String(d.bulkSmsTitle || "").slice(0, BULK_SMS_TITLE_MAX_CHARS);
    const templateId: BulkSmsTemplateId = d.smsTemplateId === "2" ? "2" : "1";
    if (thankyou) {
      const body = draft
        ? truncateBulkSmsBodyToMaxBytes(sanitizeBulkSmsBodyText(draft))
        : truncateBulkSmsBodyToMaxBytes(BULK_THANKYOU_SMS_DEFAULT);
      return { title, body, templateId };
    }
    if (draft || title) {
      return {
        title,
        body: draft ? truncateBulkSmsBodyToMaxBytes(sanitizeBulkSmsBodyText(draft)) : "",
        templateId,
      };
    }
  } catch {
    if (thankyou) {
      return {
        title: "",
        body: truncateBulkSmsBodyToMaxBytes(BULK_THANKYOU_SMS_DEFAULT),
        templateId: "1",
      };
    }
  }
  return { title: "", body: "", templateId: "1" };
}

function readInitialObituaryUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    if (new URLSearchParams(window.location.search).get("thankyou") === "1") return "";
    if (readThankYouSessionFromStorage()) return "";
    const snap = loadPingFromIndexSnapshot();
    return normalizeObituaryUrlForField(String(snap.obituaryPageUrl || ""));
  } catch {
    return "";
  }
}

function BulkEntryShellPlaceholder() {
  return (
    <StartCanonicalShell>
      <div className="bulk-entry-shell" aria-busy="true">
        <StartHeader currentStep={1} hideStepCount />
        <main className="index-main-flow ping-start__body" />
      </div>
    </StartCanonicalShell>
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
  const skipIntentChooseRef = useRef(
    typeof window === "undefined" ? false : readSkipStartIntentChoose(),
  );
  const [showIntentChoose, setShowIntentChoose] = useState(readInitialShowIntentChoose);
  const showHeaderBack =
    showIntentChoose ||
    (!skipIntentChooseRef.current && step === "url" && !isThankYouFlow) ||
    !isBulkWizardFirstStep(step, isThankYouFlow);
  const [url, setUrl] = useState(readInitialObituaryUrl);
  const [urlHint, setUrlHint] = useState<string | null>(null);
  const [urlDomainBlock, setUrlDomainBlock] = useState<string | null>(null);
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
    capturePartnerAttributionFromLocation();
    const skipIntroQuery = new URLSearchParams(window.location.search).get("skipIntro") === "1";
    if (skipIntroQuery) {
      pingApplyIntroSkipQueryToHistory();
    } else {
      pingIntroOnReloadClearSeen();
    }
    if (!skipIntroQuery && !pingIntroSeen()) {
      pingSetIntroReturnPath(PING_MAIN_APP_PATH);
      router.replace("/intro" + window.location.search + window.location.hash);
      setBootState("redirect-intro");
      return;
    }
    try {
      if (new URLSearchParams(window.location.search).get("intent") === "write") {
        setShowIntentChoose(false);
        sessionStorage.setItem(PING_FLOW_KEY_ROUTE, ROUTE_OBITUARY_THEN_BULK);
        router.replace("/obituary-form");
        setBootState("redirect-intro");
        return;
      }
      if (!readSkipStartIntentChoose() && !skipIntroQuery) {
        setShowIntentChoose(true);
      } else {
        setShowIntentChoose(false);
        sessionStorage.setItem(PING_FLOW_KEY_ROUTE, ROUTE_BULK_DIRECT);
        sessionStorage.setItem(PING_FLOW_KEY_STARTED, "1");
      }
    } catch {
      /* ignore */
    }
    setBootState("ready");
    router.prefetch("/obituary-form");
  }, [router]);

  const gateReady = bootState === "ready";

  useEffect(() => {
    if (!gateReady || showIntentChoose || step !== "url" || isThankYouFlow) return;
    pingTrack("obituary_input_start");
  }, [gateReady, showIntentChoose, step, isThankYouFlow]);

  useEffect(() => {
    if (!gateReady || showIntentChoose) return;
    if (step === "url" || step === "compose" || step === "pick") {
      resumeBulkWizardStep(step);
    }
  }, [gateReady, showIntentChoose, step]);

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
    consumePingDevWizardStep();
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
          if (result.reason === "host_not_allowed") {
            setUrlDomainBlock(result.hostname || null);
            setUrlHint(result.hint);
          } else {
            setUrlDomainBlock(null);
            setUrlHint(result.hint);
          }
          return;
        }
        setUrlDomainBlock(null);
        setUrlHint(null);
        setUrl(result.normalizedUrl);
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
    setUrlDomainBlock(null);
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
    if (!gateReady || showIntentChoose || step !== "url" || isThankYouFlow) return;
    if (urlAutoAdvancePausedRef.current) return;
    const nv = normalizeObituaryUrlForField(url);
    if (!isObituaryUrlFieldValid(nv)) return;
    const timer = window.setTimeout(() => {
      void advanceUrlStepToCompose(nv);
    }, 480);
    return () => window.clearTimeout(timer);
  }, [gateReady, showIntentChoose, step, isThankYouFlow, url, advanceUrlStepToCompose]);

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
    resumeBulkWizardStep("pick");
    pingTrack("obituary_preview");
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

  const onChooseBulk = useCallback(() => {
    markBulkFlowStarted(ROUTE_BULK_DIRECT);
    setShowIntentChoose(false);
  }, []);

  const onChooseObituaryWrite = useCallback(() => {
    try {
      sessionStorage.setItem(PING_FLOW_KEY_ROUTE, ROUTE_OBITUARY_THEN_BULK);
    } catch {
      /* ignore */
    }
    router.push("/obituary-form");
  }, [router]);

  const onHeaderBack = useCallback(() => {
    if (showIntentChoose) {
      pingAssignToLocation("/");
      return;
    }
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
    if (step === "url" && !isThankYouFlow && !skipIntentChooseRef.current) {
      setShowIntentChoose(true);
      return;
    }
    pingAssignToLocation("/");
  }, [showIntentChoose, step, isThankYouFlow]);

  const onDevSkipNext = useCallback(() => {
    markPingDevFlowPreview();
    if (showIntentChoose) {
      onChooseBulk();
      return;
    }
    if (step === "url" && !isThankYouFlow) {
      urlAutoAdvancePausedRef.current = true;
      const seeded = seedPingDevBulkPreviewSession({
        title,
        body: body.trim() ? body : undefined,
        templateId,
      });
      setUrl(seeded.url);
      setUrlHint(null);
      setUrlDomainBlock(null);
      setTitle(seeded.title);
      setBody(seeded.body);
      setTemplateId(seeded.templateId);
      setStep("compose");
      return;
    }
    if (step === "compose") {
      const nextBody = body.trim() ? body : getStaticBulkTemplateBody(templateId);
      if (!body.trim()) setBody(nextBody);
      const nv = isThankYouFlow
        ? ""
        : isObituaryUrlFieldValid(normalizeObituaryUrlForField(url))
          ? normalizeObituaryUrlForField(url)
          : PING_DEV_PREVIEW_URL;
      if (!isThankYouFlow && nv === PING_DEV_PREVIEW_URL) setUrl(PING_DEV_PREVIEW_URL);
      persistBulkComposeToPingFromIndex({
        title: title || "개발 미리보기",
        body: nextBody,
        templateId,
        obituaryPageUrl: nv,
        bulkFlowKind: isThankYouFlow ? "thankyou" : "obituary",
      });
      setStep("pick");
      return;
    }
    if (step === "pick" || step === "review") {
      seedPingDevBulkPreviewSession({
        title: title || "개발 미리보기",
        body: body.trim() ? body : getStaticBulkTemplateBody(templateId),
        templateId,
      });
      if (!isThankYouFlow && !url.trim()) setUrl(PING_DEV_PREVIEW_URL);
      navigateToBulkPaymentsStep();
    }
  }, [
    showIntentChoose,
    onChooseBulk,
    step,
    isThankYouFlow,
    title,
    body,
    templateId,
    url,
    navigateToBulkPaymentsStep,
  ]);

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

  const persistWizardForContactsJit = useCallback(() => {
    const nv = normalizeObituaryUrlForField(url);
    persistBulkComposeToPingFromIndex({
      title,
      body,
      templateId,
      obituaryPageUrl: isThankYouFlow ? "" : nv,
      bulkFlowKind: isThankYouFlow ? "thankyou" : "obituary",
    });
    resumeBulkWizardStep("pick");
    markBulkFlowStarted(ROUTE_BULK_DIRECT);
  }, [url, title, body, templateId, isThankYouFlow]);

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
    persistWizardForContactsJit();
    pingTrack("contacts_import_click");
    await hydratePingFunexSession();
    if (!isPingMemberLoggedIn()) {
      pingTrack("google_login_start");
      window.location.assign(
        `/api/auth/funex/start?returnTo=${encodeURIComponent(FUNEX_JIT_CONTACTS_RETURN)}`,
      );
      return;
    }
    setGoogleContactsLoading(true);
    try {
      const rows = await fetchGoogleContactPickerRows();
      pingTrack("contacts_import_success", { count: rows.length });
      setPickerIsGoogle(true);
      setPendingPickerRows(rows);
      setExcludeModalOpen(true);
    } catch (e: unknown) {
      window.alert(e instanceof Error ? e.message : "구글 연락처를 가져오지 못했습니다.");
    } finally {
      setGoogleContactsLoading(false);
    }
  }, [url, body, isThankYouFlow, persistWizardForContactsJit]);

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
      pingTrack("recipient_selection_complete", { count: effective.length });
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
      setShowIntentChoose(false);
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
      setShowIntentChoose(false);
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

    if (effect.type === "resumeContacts") {
      markBulkFlowStarted(ROUTE_BULK_DIRECT);
      setShowIntentChoose(false);
      applyComposeHydrateFromSession(templateId);
      const snap = loadPingFromIndexSnapshot();
      const norm = normalizeObituaryUrlForField(String(snap.obituaryPageUrl || ""));
      if (norm) setUrl(norm);
      setStep("pick");
      if (effect.authError) {
        window.alert("로그인을 마치지 못했습니다. 부고 내용은 그대로 있으니 다시 시도해 주세요.");
        return;
      }
      window.setTimeout(() => void onPickGoogleContacts(), 160);
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
    if (showIntentChoose) {
      document.title = START_INTENT_COPY.docTitle;
      return;
    }
    const ty = isThankYouFlow;
    document.title =
      getBulkWizardStepCopy(step, ty).docTitle ?? "PING · 대량 발송";
  }, [gateReady, showIntentChoose, step, isThankYouFlow]);

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
  const visibleProductStep = showIntentChoose
    ? 1
    : excludeModalOpen
      ? 4
      : step === "url"
        ? 1
        : step === "compose"
          ? 2
          : step === "pick"
            ? 3
            : 5;

  useEffect(() => {
    if (!gateReady || step !== "review") return;
    if (loadBulkRecipientsCount() > 0) return;
    setStep("pick");
  }, [gateReady, step]);

  if (bootState === "redirect-intro") {
    return null;
  }

  return (
    <StartCanonicalShell>
      <div className={cn("bulk-entry-shell", isThankYouFlow && "thankyou-bulk-flow")}>
      <StartHeader
        currentStep={visibleProductStep}
        showBack={showHeaderBack}
        hideStepCount={showIntentChoose}
        onBack={onHeaderBack}
      />

      {showIntentChoose ? null : <StartStepIndicator currentStep={visibleProductStep} />}

      <main className="index-main-flow ping-start__body" id="bulk-main">
        {gateReady && showIntentChoose ? (
          <StartIntentStep onChooseBulk={onChooseBulk} onChooseWrite={onChooseObituaryWrite} />
        ) : gateReady ? (
        step === "url" && !isThankYouFlow ? (
          <StartUrlStep
            url={url}
            urlHint={urlHint}
            urlDomainBlock={urlDomainBlock}
            urlImportLoading={urlImportLoading}
            urlPassOverlayVisible={urlPassOverlayVisible}
            canUrlNext={canUrlNext}
            urlInputClassName="input-field ping-field-standard w-full max-w-full min-w-0"
            onUrlInput={onUrlInput}
            onUrlBlur={onUrlBlur}
            onUrlPaste={onUrlPaste}
            onChooseObituaryWrite={onChooseObituaryWrite}
          />
        ) : step === "compose" ? (
          <StartComposeStep
            isThankYouFlow={isThankYouFlow}
            title={title}
            body={body}
            bodyBytes={bodyBytes}
            tplOpen={tplOpen}
            tplWrapRef={tplWrapRef}
            composeImage={composeImage}
            composeImageInputRef={composeImageInputRef}
            titleInputClassName="input-field ping-field-standard ping-field-standard--with-trailing index-bulk-compose-title-input w-full max-w-full min-w-0 placeholder:text-[12px] placeholder:leading-snug placeholder:text-ping-caption"
            onTitleChange={onTitleChange}
            onBodyChange={onBodyChange}
            onComposeKeyDown={onComposeKeyDown}
            onToggleTpl={() => setTplOpen((open) => !open)}
            onPickTemplate={pickTemplateAndCloseMenu}
            onPickComposeImageFile={onPickComposeImageFile}
            onSaveComposeDraft={onSaveComposeDraft}
            onOpenSavedCompose={openSavedComposeModal}
            onOpenRecentSends={openRecentSendsModal}
            onRemoveComposeImage={() => setComposeImage(null)}
          />
        ) : step === "pick" ? (
          <StartContactsImportStep
            title={wizardStepCopy.title}
            subtitle={wizardStepCopy.subtitle}
            isThankYouFlow={isThankYouFlow}
            googleContactsLoading={googleContactsLoading}
            addressbookParsing={addressbookParsing}
            showGoogleReviewBadge={SHOW_GOOGLE_CONTACTS_REVIEW_BADGE}
            addressbookFileInputRef={addressbookFileInputRef}
            onPickGoogleContacts={() => void onPickGoogleContacts()}
            onPickAddressbookFile={(files) => void onPickAddressbookFile(files)}
          />
        ) : (
          <StartReviewStep
            recipientCount={reviewRecipientCount}
            sourceLabel={reviewSourceLabelText}
            totals={reviewTotals}
          />
        )
        ) : (
          <div
            className="ping-start__body"
            aria-busy="true"
            aria-hidden
          />
        )}
      </main>

      {gateReady && !showIntentChoose && step === "compose" ? (
        <StartBottomAction
          ariaLabel="문자 작성 단계 이동"
          disabled={!canComposeNext}
          label="다음"
          onClick={onComposeNext}
        />
      ) : gateReady && !showIntentChoose && step === "review" ? (
        <StartBottomAction
          ariaLabel="결제 금액 확인 단계 이동"
          disabled={!canReviewNext}
          label="다음"
          onClick={onReviewNext}
        />
      ) : null}

      <PingDevFlowSkipButton
        onPrev={onHeaderBack}
        onNext={onDevSkipNext}
        elevated={
          gateReady &&
          !showIntentChoose &&
          (step === "compose" || step === "review")
        }
      />

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
        <StartSavedComposeModal
          entries={savedComposeList}
          onClose={() => setSavedComposeModalOpen(false)}
          onApply={applySavedComposeEntry}
          onDelete={(id) => {
            if (!window.confirm("이 저장 항목을 삭제할까요?")) return;
            deleteSavedComposeEntry(id);
            setSavedComposeList(readSavedComposeList());
          }}
        />
      ) : null}

      {recentSendsModalOpen ? (
        <StartRecentSendsModal
          entries={recentSendsList}
          onClose={() => setRecentSendsModalOpen(false)}
          onApply={applyRecentSendAsReference}
        />
      ) : null}

      <div className="ping-start__legal">
        <PingSiteLegalFooter />
      </div>
      </div>
    </StartCanonicalShell>
  );
}

export function BulkEntryClient() {
  return (
    <Suspense fallback={<BulkEntryShellPlaceholder />}>
      <BulkEntryInner />
    </Suspense>
  );
}
