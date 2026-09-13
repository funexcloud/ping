type StartReviewTotals = {
  sendCost: number;
  baseFee: number;
  total: number;
};

type StartReviewStepProps = {
  recipientCount: number;
  sourceLabel: string;
  totals: StartReviewTotals | null;
};

export function StartReviewStep({ recipientCount, sourceLabel, totals }: StartReviewStepProps) {
  return (
    <section className="ping-start__body ping-start-step bulk-review-step" aria-label="결제 금액 확인">
      <div className="ping-start-step__head">
        <h2 className="ping-start-step__title">발송 준비</h2>
        <p className="ping-start-step__sub">선택한 인원과 예상 금액을 확인해 주세요.</p>
      </div>

      {sourceLabel ? (
        <div className="bulk-review-source">
          <i className="fas fa-file" aria-hidden="true" />
          <span>{sourceLabel}</span>
        </div>
      ) : null}

      {totals ? (
        <div className="bulk-review-totals">
          <div className="bulk-review-totals__row">
            <span>유효 연락처</span>
            <strong>{recipientCount.toLocaleString("ko-KR")}건</strong>
          </div>
          <div className="bulk-review-totals__row">
            <span id="bulk-send-cost-label">발송비</span>
            <strong>{totals.sendCost.toLocaleString("ko-KR")}원</strong>
          </div>
          <div className="bulk-review-totals__row" id="bulk-base-fee-row" hidden>
            <span>기본 이용료</span>
            <strong id="bulk-base-fee-display">{totals.baseFee.toLocaleString("ko-KR")}원</strong>
          </div>
          <div className="bulk-review-totals__total">
            <span>총 결제금액</span>
            <strong>{totals.total.toLocaleString("ko-KR")}원</strong>
          </div>
          <p className="bulk-review-totals__note">번호 있는 행만 집계</p>
        </div>
      ) : null}
    </section>
  );
}
