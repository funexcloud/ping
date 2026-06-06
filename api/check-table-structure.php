<?php
// 테이블 구조 확인 스크립트

// 1. 에러 내용을 화면에 출력하도록 설정 (디버깅용)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 2. JSON 헤더 설정
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");

// 3. DB 연결 정보
$host = 'localhost';
$db_id = 'sjms';
$db_pass = 'thdwlgns99!!';
$db_name = 'sjms';

// 4. DB 연결
$conn = mysqli_connect($host, $db_id, $db_pass, $db_name);

if (!$conn) {
    echo json_encode([
        "error" => "DB 연결 실패: " . mysqli_connect_error()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 5. 테이블 구조 확인
$tableName = 'funeral_halls';

// 테이블 존재 여부 확인
$checkTable = mysqli_query($conn, "SHOW TABLES LIKE '$tableName'");
if (mysqli_num_rows($checkTable) == 0) {
    echo json_encode([
        "error" => "테이블 '$tableName'이 존재하지 않습니다.",
        "available_tables" => []
    ], JSON_UNESCAPED_UNICODE);
    
    // 사용 가능한 테이블 목록 가져오기
    $tablesResult = mysqli_query($conn, "SHOW TABLES");
    $tables = [];
    while ($row = mysqli_fetch_array($tablesResult)) {
        $tables[] = $row[0];
    }
    
    echo json_encode([
        "error" => "테이블 '$tableName'이 존재하지 않습니다.",
        "available_tables" => $tables
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 테이블 구조 가져오기
$result = mysqli_query($conn, "DESCRIBE $tableName");

if (!$result) {
    echo json_encode([
        "error" => "테이블 구조를 가져올 수 없습니다: " . mysqli_error($conn)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$fields = [];
while ($row = mysqli_fetch_assoc($result)) {
    $fields[] = [
        'field' => $row['Field'],
        'type' => $row['Type'],
        'null' => $row['Null'],
        'key' => $row['Key'],
        'default' => $row['Default'],
        'extra' => $row['Extra']
    ];
}

// 샘플 데이터 가져오기 (최대 5개)
$sampleResult = mysqli_query($conn, "SELECT * FROM $tableName LIMIT 5");
$sampleData = [];
if ($sampleResult) {
    while ($row = mysqli_fetch_assoc($sampleResult)) {
        $sampleData[] = $row;
    }
}

// 테이블 레코드 수
$countResult = mysqli_query($conn, "SELECT COUNT(*) as total FROM $tableName");
$totalCount = 0;
if ($countResult) {
    $countRow = mysqli_fetch_assoc($countResult);
    $totalCount = intval($countRow['total']);
}

echo json_encode([
    'table_name' => $tableName,
    'total_records' => $totalCount,
    'fields' => $fields,
    'sample_data' => $sampleData
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

mysqli_close($conn);
?>

