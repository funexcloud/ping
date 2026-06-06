<?php

// 1. 에러 내용을 화면에 출력하도록 설정 (디버깅용)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 2. JSON 헤더 설정 (한글 깨짐 방지)
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *"); // CORS 허용
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS 요청 처리 (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. DB 연결 정보 (닷홈 기준)
$host = 'localhost';
$db_id = 'sjms';      // 닷홈 아이디
$db_pass = 'thdwlgns99!!'; // ★여기를 꼭 수정하세요!
$db_name = 'sjms';    // 닷홈은 아이디와 DB명이 보통 같습니다.

// 4. DB 연결 시도
$conn = mysqli_connect($host, $db_id, $db_pass, $db_name);

if (!$conn) {
    // 연결 실패 시 JSON 형식으로 에러 리턴
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "DB 연결 실패: " . mysqli_connect_error()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 5. 검색어 받기
$searchQuery = isset($_GET['searchQuery']) ? trim($_GET['searchQuery']) : '';
$pageNo = isset($_GET['pageNo']) ? intval($_GET['pageNo']) : 1;
$numOfRows = isset($_GET['numOfRows']) ? intval($_GET['numOfRows']) : 1000;

// 6. SQL 쿼리 작성 (검색어가 있으면 검색, 없으면 전체 조회)
// 테이블 이름이 funeral_halls 인지 꼭 확인하세요!
if ($searchQuery) {
    // SQL 인젝션 방지를 위해 이스케이프 처리
    $searchQuery = mysqli_real_escape_string($conn, $searchQuery);
    $sql = "SELECT * FROM funeral_halls WHERE name LIKE '%$searchQuery%' OR address LIKE '%$searchQuery%'";
} else {
    $sql = "SELECT * FROM funeral_halls";
}

// LIMIT 추가 (페이지네이션 지원)
$offset = ($pageNo - 1) * $numOfRows;
$sql .= " LIMIT $numOfRows OFFSET $offset";

$result = mysqli_query($conn, $sql);

if (!$result) {
    // 쿼리 실패 시 (테이블 이름 틀림 등)
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "쿼리 실행 실패: " . mysqli_error($conn)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 전체 개수 조회 (검색어가 있을 경우)
$totalCount = 0;
if ($searchQuery) {
    $countSql = "SELECT COUNT(*) as total FROM funeral_halls WHERE name LIKE '%$searchQuery%' OR address LIKE '%$searchQuery%'";
} else {
    $countSql = "SELECT COUNT(*) as total FROM funeral_halls";
}
$countResult = mysqli_query($conn, $countSql);
if ($countResult) {
    $countRow = mysqli_fetch_assoc($countResult);
    $totalCount = intval($countRow['total']);
}

// 7. 데이터를 배열로 변환
$data = [];
while ($row = mysqli_fetch_assoc($result)) {
    // 필드명 정규화 (name, address, phone)
    $item = [
        'name' => isset($row['name']) ? $row['name'] : (isset($row['funeral_hall_name']) ? $row['funeral_hall_name'] : ''),
        'address' => isset($row['address']) ? $row['address'] : (isset($row['funeral_hall_address']) ? $row['funeral_hall_address'] : ''),
        'phone' => isset($row['phone']) ? $row['phone'] : (isset($row['tel']) ? $row['tel'] : (isset($row['telno']) ? $row['telno'] : ''))
    ];
    $data[] = $item;
}

// 8. JSON으로 출력 (기존 API 형식과 호환)
echo json_encode([
    'success' => true,
    'data' => $data,
    'totalCount' => $totalCount,
    'pageNo' => $pageNo,
    'numOfRows' => $numOfRows
], JSON_UNESCAPED_UNICODE);

// 9. 연결 종료
mysqli_close($conn);

?>
