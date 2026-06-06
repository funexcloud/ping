"use client";

import { LEGAL_DOCUMENTS, type LegalSlug } from "@/content/legal";
import { useCallback, useEffect, useState } from "react";

type ModalType = "terms" | "privacy" | "refund" | "copyright" | null;

const TYPE_TO_SLUG: Record<Exclude<ModalType, null>, LegalSlug> = {
  terms: "terms-of-service",
  privacy: "privacy-policy",
  refund: "refund-policy",
  copyright: "copyright",
};

const TYPE_TITLE: Record<Exclude<ModalType, null>, string> = {
  terms: "이용약관",
  privacy: "개인정보처리방침",
  refund: "환불정책",
  copyright: "저작권 안내",
};

export function useLegalDocModal() {
  const [modalType, setModalType] = useState<ModalType>(null);

  const openModal = useCallback((type: Exclude<ModalType, null>) => {
    setModalType(type);
    document.body.style.overflow = "hidden";
  }, []);

  const closeModal = useCallback(() => {
    setModalType(null);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeModal]);

  const title = modalType ? TYPE_TITLE[modalType] : "";
  const html = modalType
    ? LEGAL_DOCUMENTS[TYPE_TO_SLUG[modalType]].articleHtml
    : "";

  return { modalType, openModal, closeModal, title, html };
}

type ModalProps = ReturnType<typeof useLegalDocModal> & {
  overlayClassName?: string;
  modalClassName?: string;
};

export function LegalDocModal({
  modalType,
  closeModal,
  title,
  html,
  overlayClassName = "modal-overlay",
  modalClassName = "modal",
}: ModalProps) {
  if (!modalType) return null;

  return (
    <>
      <div
        className={`${overlayClassName} show`}
        onClick={closeModal}
        aria-hidden
      />
      <div className={`${modalClassName} show`} role="dialog" aria-modal>
        <div className="modal-drag-handle" aria-hidden />
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={closeModal}
            title="닫기"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div
          className="modal-content ping-doc-embed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </>
  );
}
