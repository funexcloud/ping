<?php
/**
 * PING 결제 승인 백엔드 (PHP 버전) - 아임포트(포트원) KG 이니시스 연동
 * 
 * 사용 방법:
 * 1. 이 파일을 웹 서버에 업로드 (예: /api/approvePayment.php)
 * 2. index.html의 BACKEND_API_URL을 이 파일 경로로 변경
 * 3. IMP_API_KEY와 IMP_API_SECRET을 환경 변수나 설정 파일에 설정
 *    - IMP_API_KEY: 포트원 관리자 콘솔에서 발급받은 API Key (또는 channel-key)
 *    - IMP_API_SECRET: 포트원 관리자 콘솔에서 발급받은 Secret Key
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONS 요청 처리
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// POST 요청만 허용
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// JSON 요청 본문 읽기
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// 필수 파라미터 검증 (아임포트 방식)
if (!isset($data['imp_uid']) || !isset($data['merchant_uid']) || !isset($data['amount'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters: imp_uid, merchant_uid, amount']);
    exit;
}

$impUid = $data['imp_uid']; // 아임포트 거래 고유번호
$merchantUid = $data['merchant_uid']; // 주문번호
$orderId = $data['orderId'] ?? $merchantUid; // orderId (없으면 merchant_uid 사용)
$amount = intval($data['amount']);

// 아임포트(포트원) API 키 설정
// 방법 1: 환경 변수 사용 (권장)
$IMP_API_KEY = getenv('IMP_API_KEY');
$IMP_API_SECRET = getenv('IMP_API_SECRET');

// 방법 2: 직접 설정 (보안상 권장하지 않음, 테스트용)
if (empty($IMP_API_KEY) || empty($IMP_API_SECRET)) {
    // 실제 운영 시에는 환경 변수나 설정 파일에서 가져오세요
    // channel-key를 API Key로 사용하거나, 포트원 관리자 콘솔에서 발급받은 API Key를 사용하세요
    $IMP_API_KEY = 'channel-key-52cc4618-9f19-4d43-99e6-c6d3229f6533'; // 테스트용
    $IMP_API_SECRET = 'YOUR_IMP_API_SECRET_HERE'; // 포트원 관리자 콘솔에서 발급받은 Secret Key
}

if (empty($IMP_API_KEY) || empty($IMP_API_SECRET) || $IMP_API_SECRET === 'YOUR_IMP_API_SECRET_HERE') {
    http_response_code(500);
    echo json_encode(['error' => 'IMP_API_KEY or IMP_API_SECRET is not configured']);
    exit;
}

// Firebase Admin SDK 설정 (Firestore 사용 시)
// Firebase Admin SDK가 설치되어 있지 않으면 주석 처리하고 MySQL 등 다른 DB 사용
/*
require_once __DIR__ . '/../vendor/autoload.php';

use Google\Cloud\Firestore\FirestoreClient;

$firestore = new FirestoreClient([
    'projectId' => 'YOUR_PROJECT_ID',
    'keyFilePath' => __DIR__ . '/../firebase-service-account.json'
]);

// 주문 정보 조회
$orderRef = $firestore->collection('ping_orders')->document($orderId);
$orderDoc = $orderRef->snapshot();

if (!$orderDoc->exists()) {
    http_response_code(404);
    echo json_encode(['error' => 'Order not found']);
    exit;
}

$orderData = $orderDoc->data();

// 이미 결제 완료 확인
if (isset($orderData['status']) && $orderData['status'] === 'paid') {
    http_response_code(400);
    echo json_encode(['error' => 'Order already paid']);
    exit;
}

// 금액 검증
if (isset($orderData['totalAmount']) && $orderData['totalAmount'] !== $amount) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Amount mismatch',
        'expected' => $orderData['totalAmount'],
        'received' => $amount
    ]);
    exit;
}
*/

// 아임포트(포트원) API로 결제 정보 조회 및 검증
// 1. Access Token 발급
$tokenUrl = 'https://api.iamport.kr/users/getToken';
$tokenData = [
    'imp_key' => $IMP_API_KEY,
    'imp_secret' => $IMP_API_SECRET
];

$ch = curl_init($tokenUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($tokenData)
]);

$tokenResponse = curl_exec($ch);
$tokenHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$tokenError = curl_error($ch);
curl_close($ch);

if ($tokenError || $tokenHttpCode !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to get access token: ' . ($tokenError ?: 'HTTP ' . $tokenHttpCode)]);
    exit;
}

$tokenData = json_decode($tokenResponse, true);
if (!isset($tokenData['response']['access_token'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid token response', 'details' => $tokenData]);
    exit;
}

$accessToken = $tokenData['response']['access_token'];

// 2. 결제 정보 조회
$paymentUrl = 'https://api.iamport.kr/payments/' . $impUid;
$ch = curl_init($paymentUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'CURL error: ' . $curlError]);
    exit;
}

$responseData = json_decode($response, true);

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode([
        'error' => $responseData['message'] ?? 'Payment verification failed',
        'details' => $responseData
    ]);
    exit;
}

// 3. 결제 정보 검증
$paymentInfo = $responseData['response'] ?? null;
if (!$paymentInfo) {
    http_response_code(400);
    echo json_encode(['error' => 'Payment information not found']);
    exit;
}

// 주문번호 검증
if ($paymentInfo['merchant_uid'] !== $merchantUid) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Merchant UID mismatch',
        'expected' => $merchantUid,
        'received' => $paymentInfo['merchant_uid']
    ]);
    exit;
}

// 금액 검증
if (intval($paymentInfo['amount']) !== $amount) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Amount mismatch',
        'expected' => $amount,
        'received' => $paymentInfo['amount']
    ]);
    exit;
}

// 결제 상태 검증
if ($paymentInfo['status'] === 'paid') {
    // Firestore 주문 상태 업데이트 (Firebase Admin SDK 사용 시)
    /*
    $orderRef->update([
        ['path' => 'status', 'value' => 'paid'],
        ['path' => 'paymentKey', 'value' => $paymentKey],
        ['path' => 'paymentData', 'value' => $responseData],
        ['path' => 'paidAt', 'value' => new \DateTime()]
    ]);
    */

    // MySQL 사용 시 예시 (선택사항)
    /*
    $host = "localhost";
    $user = "your_db_user";
    $password = "your_db_password";
    $database = "your_database";
    
    $conn = new mysqli($host, $user, $password, $database);
    
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE ping_orders SET status = 'paid', payment_key = ?, payment_data = ?, paid_at = NOW() WHERE order_id = ?");
    $paymentDataJson = json_encode($responseData);
    $stmt->bind_param("sss", $paymentKey, $paymentDataJson, $orderId);
    $stmt->execute();
    $stmt->close();
    $conn->close();
    */

    // 성공 응답
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Payment verified successfully',
        'orderId' => $orderId,
        'merchant_uid' => $merchantUid,
        'imp_uid' => $impUid,
        'amount' => $amount,
        'paymentData' => $paymentInfo
    ]);
} else {
    // 결제 상태가 paid가 아닌 경우
    http_response_code(400);
    echo json_encode([
        'error' => 'Payment not completed',
        'status' => $paymentInfo['status'] ?? 'unknown',
        'paymentData' => $paymentInfo
    ]);
}
?>

