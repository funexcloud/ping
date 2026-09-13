type StartBottomActionProps = {
  ariaLabel: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

export function StartBottomAction({
  ariaLabel,
  disabled = false,
  label,
  onClick,
}: StartBottomActionProps) {
  return (
    <div className="ping-start__footer bulk-flow-cta" aria-label={ariaLabel}>
      <div className="bulk-flow-cta__wrap index-sticky-btn-wrap">
        <div className="index-sticky-btn-row bulk-flow-cta__row--solo">
          <button
            type="button"
            id="submit-btn"
            className="ob-flow-btn-primary index-flow-cta-primary ping-start__cta"
            disabled={disabled}
            onClick={onClick}
          >
            <span id="btn-text">{label}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
