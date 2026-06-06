import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SHEET_NAME = "부의금";

/**
 * GET — 부의 일괄 업로드용 엑셀 템플릿 (이름 | 전화번호 | 금액(원) | 메모)
 */
export async function GET() {
  const headers = ["이름", "전화번호", "금액(원)", "메모"];
  const ws = XLSX.utils.aoa_to_sheet([headers, ["", "", "", ""]]);
  ws["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 24 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);

  const buf = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  const blob = new Blob([Uint8Array.from(buf)], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const filename = "PING_부의금_일괄업로드_템플릿.xlsx";
  const encoded = encodeURIComponent(filename);

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ping-condolence-template.xlsx"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
