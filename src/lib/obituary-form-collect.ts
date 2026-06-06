/** DOM id 기반 — 레거시 `assets/js/obituary-form.js` `collectFormData` 와 동일 필드 */
export function collectObituaryFormData(
  getVal: (id: string) => string,
  getChecked: (id: string, fallback?: boolean) => boolean,
  status: "draft" | "published",
) {
  const lineWithMinutes = (dateId: string, hourId: string, minuteId: string) =>
    `${getVal(dateId)} ${getVal(hourId)}:${getVal(minuteId)}`;

  const companyChoice = getVal("companySelect");
  const hpMode = getVal("directorHomepageMode");

  let mournerInfo: unknown = null;
  try {
    const raw = localStorage.getItem("ping_mourner_info_draft_v1");
    mournerInfo = raw ? JSON.parse(raw) : null;
  } catch {
    mournerInfo = null;
  }

  return {
    deceasedName: getVal("deceasedName"),
    deceasedGender: getVal("deceasedGender"),
    deceasedAge: getVal("deceasedAge"),
    deceasedAgeType: getVal("deceasedAgeType"),
    deceasedReligion: getVal("deceasedReligion"),
    deceasedReligionPosition: getVal("deceasedReligionPosition"),

    funeralSearch: getVal("funeralSearch"),
    funeralRoom: getVal("funeralRoomMode") || "미정",
    funeralRoomMoveNote: getVal("funeralRoomMoveNote"),

    timeOfDeath: `${getVal("timeOfDeathDate")} ${getVal("timeOfDeathHour")}:00`,
    timeOfEntry: lineWithMinutes(
      "timeOfEntryDate",
      "timeOfEntryHour",
      "timeOfEntryMinute",
    ),
    timeOfCoffin: getChecked("timeOfCoffinTbd")
      ? "일시 미정"
      : lineWithMinutes(
          "timeOfCoffinDate",
          "timeOfCoffinHour",
          "timeOfCoffinMinute",
        ),
    timeOfDeparture: getChecked("timeOfDepartureTbd")
      ? "일시 미정"
      : lineWithMinutes(
          "timeOfDepartureDate",
          "timeOfDepartureHour",
          "timeOfDepartureMinute",
        ),

    scheduleShowOnObituary: {
      death: getChecked("exposeTimeOfDeath"),
      entry: getChecked("exposeTimeOfEntry"),
      coffin: getChecked("exposeTimeOfCoffin"),
      departure: getChecked("exposeTimeOfDeparture"),
    },

    burialLocation: getVal("burialLocation"),
    burialDetails: getVal("burialDetails"),
    obituaryMemo: getVal("obituaryMemo"),

    companySelect: companyChoice,
    companyName:
      companyChoice === "custom" ? getVal("companyNameCustom").trim() : "",

    directorHomepageMode: hpMode,
    directorHomepageUrl:
      hpMode === "register" ? getVal("directorHomepageUrl").trim() : "",
    freeHomepageApplication:
      hpMode === "none"
        ? {
            applicantName: getVal("freeHpApplicantName").trim(),
            applicantPhone: getVal("freeHpApplicantPhone").trim(),
            memo: getVal("freeHpMemo").trim(),
          }
        : null,

    settings: {
      showBirth: getChecked("settingShowBirth", true),
      showPhoto: getChecked("settingShowPhoto", true),
      showLogo: getChecked("settingShowLogo", true),
      showVideo: getChecked("settingShowVideo", true),
      showDirector: getChecked("settingShowDirector", true),
    },

    mournerInfo,

    status,
    uid: "TEMP_USER_ID",
  };
}
