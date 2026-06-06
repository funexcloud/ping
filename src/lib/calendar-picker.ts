/** PING 부고폼 — 바닐라 날짜 피커 (React 폼과 호환: input.value = YYYY-MM-DD) */

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseYmd(s: string | null | undefined) {
  if (!s || typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(y, mo, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== day)
    return null;
  return dt;
}

function monthCells(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const cells: { d: Date; inMonth: boolean; ymd: string; dow: number }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i,
    );
    cells.push({
      d,
      inMonth: d.getMonth() === monthIndex,
      ymd: toYmd(d),
      dow: d.getDay(),
    });
  }
  return cells;
}

let pop: HTMLDivElement | null = null;
let activeInput: HTMLInputElement | null = null;
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let globalBound = false;

function ensurePop(): HTMLDivElement {
  if (pop) return pop;
  const el = document.createElement("div");
  pop = el;
  el.className = "ping-cal-pop";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "날짜 선택");
  el.innerHTML = `
        <div class="ping-cal-head">
            <button type="button" class="ping-cal-prev" aria-label="이전 달">‹</button>
            <span class="ping-cal-title"></span>
            <button type="button" class="ping-cal-next" aria-label="다음 달">›</button>
        </div>
        <div class="ping-cal-weekdays"></div>
        <div class="ping-cal-days"></div>
    `;
  document.body.appendChild(el);

  const weekdaysEl = el.querySelector(".ping-cal-weekdays") as HTMLDivElement;
  WEEKDAYS_KO.forEach((name) => {
    const sp = document.createElement("span");
    sp.textContent = name;
    weekdaysEl.appendChild(sp);
  });

  el.querySelector(".ping-cal-prev")!.addEventListener("click", (e) => {
    e.stopPropagation();
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    render();
  });
  el.querySelector(".ping-cal-next")!.addEventListener("click", (e) => {
    e.stopPropagation();
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    render();
  });

  el.addEventListener("click", (e) => e.stopPropagation());
  return el;
}

function close() {
  if (!pop) return;
  pop.classList.remove("ping-cal-open");
  activeInput = null;
}

function positionPop(anchor: HTMLInputElement) {
  const el = ensurePop();
  const r = anchor.getBoundingClientRect();
  const margin = 8;
  const w = Math.min(288, window.innerWidth - margin * 2);
  el.style.width = `${w}px`;

  let left = r.left;
  if (left + w > window.innerWidth - margin)
    left = window.innerWidth - margin - w;
  if (left < margin) left = margin;

  const estH = 340;
  let top = r.bottom + 6;
  if (top + estH > window.innerHeight - margin && r.top > estH + margin) {
    top = r.top - estH - 6;
  }
  if (top < margin) top = margin;

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function render() {
  const el = ensurePop();
  (el.querySelector(".ping-cal-title") as HTMLSpanElement).textContent =
    `${viewYear}년 ${viewMonth + 1}월`;

  const daysWrap = el.querySelector(".ping-cal-days") as HTMLDivElement;
  const cells = monthCells(viewYear, viewMonth);
  const todayYmd = toYmd(new Date());
  const selectedYmd =
    activeInput && activeInput.value ? activeInput.value.trim() : "";

  daysWrap.replaceChildren();
  cells.forEach((cell) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ping-cal-day";
    btn.textContent = String(cell.d.getDate());
    if (!cell.inMonth) btn.classList.add("ping-cal-day--muted");
    if (cell.inMonth && cell.dow === 0) btn.classList.add("ping-cal-day--sun");
    if (cell.inMonth && cell.dow === 6) btn.classList.add("ping-cal-day--sat");
    if (cell.ymd === todayYmd) btn.classList.add("ping-cal-day--today");
    if (selectedYmd && cell.ymd === selectedYmd)
      btn.classList.add("ping-cal-day--selected");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (activeInput && !activeInput.disabled) {
        activeInput.value = cell.ymd;
        activeInput.dispatchEvent(new Event("input", { bubbles: true }));
        activeInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      close();
    });
    daysWrap.appendChild(btn);
  });
}

function open(anchor: HTMLInputElement) {
  if (anchor.disabled) return;
  const el = ensurePop();
  activeInput = anchor;
  const cur = parseYmd(anchor.value) || new Date();
  viewYear = cur.getFullYear();
  viewMonth = cur.getMonth();
  render();
  el.classList.add("ping-cal-open");
  positionPop(anchor);

  requestAnimationFrame(() => {
    if (!pop!.classList.contains("ping-cal-open") || !activeInput) return;
    const r = anchor.getBoundingClientRect();
    const h = pop!.getBoundingClientRect().height;
    let top = parseFloat(pop!.style.top) || r.bottom + 6;
    if (r.bottom + 6 + h > window.innerHeight - 8 && r.top - h - 6 >= 8) {
      top = r.top - h - 6;
    }
    pop!.style.top = `${Math.max(8, top)}px`;
  });
}

function toggle(anchor: HTMLInputElement) {
  if (pop && pop.classList.contains("ping-cal-open") && activeInput === anchor) {
    close();
    return;
  }
  open(anchor);
}

function bindGlobal() {
  if (globalBound) return;
  globalBound = true;
  document.addEventListener("click", () => close());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  const refit = () => {
    if (pop && pop.classList.contains("ping-cal-open") && activeInput)
      positionPop(activeInput);
  };
  window.addEventListener("resize", refit, { passive: true });
  window.addEventListener("scroll", refit, { passive: true, capture: true });
}

export function attachDatePicker(input: HTMLInputElement | null) {
  if (!input || !(input instanceof HTMLInputElement)) return;
  if (input.dataset.pingCalBound === "1") return;
  input.dataset.pingCalBound = "1";
  bindGlobal();
  input.setAttribute("readonly", "");
  input.setAttribute("inputmode", "none");
  input.classList.add("cursor-pointer");
  input.addEventListener("click", (e) => {
    e.stopPropagation();
    if (input.disabled) return;
    toggle(input);
  });
}

export function attachDatePickersById(ids: string[]) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement) attachDatePicker(el);
  });
}
