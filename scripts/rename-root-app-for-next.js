/**
 * Next.js는 루트의 `app/`을 `src/app`보다 우선한다.
 * Firebase용 중첩 패키지 `app/`가 있으면 node_modules 안의 route.js 파일이 App Router로 잘못 잡혀 /mypage 등이 404가 될 수 있다.
 *
 * 사용: 레포 루트에서 node scripts/rename-root-app-for-next.js
 * (다른 프로그램이 app 폴더를 잠그지 않았을 때)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const from = path.join(root, "app");
const to = path.join(root, "firebase-functions-app");

if (!fs.existsSync(from)) {
  console.log("[ok] ./app 없음 — 이미 옮겼거나 없는 상태입니다.");
  process.exit(0);
}

if (fs.existsSync(to)) {
  console.error(
    "[거부] ./firebase-functions-app 이(가) 이미 있습니다. 수동으로 정리한 뒤 다시 실행하세요."
  );
  process.exit(1);
}

fs.renameSync(from, to);
console.log("[완료] app/ → firebase-functions-app/ 이름 변경");
console.log("다음: rm -rf .next  후  npm run next:dev");
