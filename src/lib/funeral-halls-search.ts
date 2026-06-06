export type FuneralHallHit = { name: string; address: string };

/** 레거시 `assets/js/funeral-api.js` 와 동일: `/api/funeralHalls` */
export async function searchFuneralHomes(
  keyword: string,
): Promise<FuneralHallHit[]> {
  try {
    const response = await fetch(
      `/api/funeralHalls?searchQuery=${encodeURIComponent(keyword)}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      error?: string;
      data?: FuneralHallHit[];
    };
    if (data.error) {
      console.error("funeralHalls:", data.error);
      return [];
    }
    return data.data || [];
  } catch (e) {
    console.error("장례식장 검색 오류:", e);
    return [];
  }
}
