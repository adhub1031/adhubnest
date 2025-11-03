# 오픈뱅킹 API 사용 가이드

## 개요
이 API는 금융결제원 오픈뱅킹 API를 활용하여 사용자의 은행 계좌 잔액을 조회할 수 있는 기능을 제공합니다.

## 설정

### 환경 변수 (.env)
```
PORT=4000
OPEN_BANK_CLIENT_ID=your_client_id
OPEN_BANK_CLIENT_SECRET=your_client_secret
OPENBANK_API_BASE_URL=https://testapi.openbanking.or.kr
OPENBANK_REDIRECT_URI=http://localhost:4000/api/openbank/callback
NODE_ENV=development
```

## API 엔드포인트

### 1. 사용자 인증 시작
**GET** `/api/openbank/auth`

사용자를 오픈뱅킹 인증 페이지로 리다이렉트합니다.

**Query Parameters:**
- `state` (optional): CSRF 방지를 위한 상태값

**예시:**
```
GET http://localhost:4000/api/openbank/auth?state=random_state_value
```

### 2. 인증 콜백 (자동 호출됨)
**GET** `/api/openbank/callback`

오픈뱅킹 인증 완료 후 자동으로 호출되는 엔드포인트입니다.

**Response:**
```json
{
  "message": "Authentication successful",
  "data": {
    "user_seq_no": "1100123456",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 7776000,
    "scope": "login inquiry transfer"
  }
}
```

### 3. 계좌 목록 조회
**GET** `/api/openbank/accounts/:userSeqNo`

사용자의 연결된 계좌 목록을 조회합니다.

**Path Parameters:**
- `userSeqNo`: 사용자 고유번호 (인증 시 받은 user_seq_no)

**예시:**
```
GET http://localhost:4000/api/openbank/accounts/1100123456
```

**Response:**
```json
{
  "message": "Account list retrieved successfully",
  "data": {
    "api_tran_id": "1234567890M123456789012345",
    "rsp_code": "A0000",
    "rsp_message": "정상처리되었습니다",
    "res_list": [
      {
        "fintech_use_num": "123456789012345678901234",
        "bank_code_std": "097",
        "bank_code_sub": "097",
        "bank_name": "오픈은행",
        "account_num_masked": "123-******-1234",
        "account_holder_name": "홍길동",
        "account_type": "1",
        "account_state": "01"
      }
    ]
  }
}
```

### 4. 잔액 조회
**POST** `/api/openbank/balance/:userSeqNo`

특정 계좌의 잔액을 조회합니다.

**Path Parameters:**
- `userSeqNo`: 사용자 고유번호

**Request Body:**
```json
{
  "fintech_use_num": "123456789012345678901234",
  "tran_dtime": "20250103152030"
}
```

**Body Parameters:**
- `fintech_use_num`: 핀테크 이용번호 (계좌 목록 조회에서 받은 값)
- `tran_dtime`: 거래일시 (YYYYMMDDHHmmss 형식)

**예시:**
```bash
curl -X POST http://localhost:4000/api/openbank/balance/1100123456 \
  -H "Content-Type: application/json" \
  -d '{
    "fintech_use_num": "123456789012345678901234",
    "tran_dtime": "20250103152030"
  }'
```

**Response:**
```json
{
  "message": "Balance inquiry successful",
  "data": {
    "api_tran_id": "1234567890M123456789012345",
    "api_tran_dtm": "20250103152030123",
    "rsp_code": "A0000",
    "rsp_message": "정상처리되었습니다",
    "bank_code_std": "097",
    "bank_code_sub": "097",
    "bank_name": "오픈은행",
    "account_num_masked": "123-******-1234",
    "account_holder_name": "홍길동",
    "account_type": "1",
    "account_state": "01",
    "balance_amt": 1000000,
    "available_amt": 1000000,
    "account_issue_date": "20200101",
    "last_tran_date": "20250103"
  }
}
```

### 5. 인증 상태 확인
**GET** `/api/openbank/auth-status/:userSeqNo`

사용자의 인증 상태를 확인합니다.

**Path Parameters:**
- `userSeqNo`: 사용자 고유번호

**예시:**
```
GET http://localhost:4000/api/openbank/auth-status/1100123456
```

**Response:**
```json
{
  "message": "Authentication status retrieved",
  "data": {
    "is_authenticated": true,
    "user_seq_no": "1100123456",
    "expires_at": "2025-04-03T15:20:30.000Z"
  }
}
```

### 6. 토큰 갱신
**POST** `/api/openbank/refresh-token/:userSeqNo`

만료된 액세스 토큰을 갱신합니다.

**Path Parameters:**
- `userSeqNo`: 사용자 고유번호

**예시:**
```
POST http://localhost:4000/api/openbank/refresh-token/1100123456
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 7776000
  }
}
```

## 사용 흐름

1. **사용자 인증**
   - 사용자가 `/api/openbank/auth` 엔드포인트를 방문
   - 오픈뱅킹 인증 페이지로 리다이렉트
   - 사용자가 은행 계좌 연결 및 동의
   - `/api/openbank/callback`으로 리다이렉트되어 `user_seq_no` 획득

2. **계좌 목록 조회**
   - 획득한 `user_seq_no`로 `/api/openbank/accounts/:userSeqNo` 호출
   - 연결된 계좌 목록과 각 계좌의 `fintech_use_num` 획득

3. **잔액 조회**
   - `user_seq_no`와 `fintech_use_num`을 사용하여 `/api/openbank/balance/:userSeqNo` 호출
   - 현재 시간을 YYYYMMDDHHmmss 형식으로 `tran_dtime`에 전달
   - 계좌 잔액 정보 획득

## 주의사항

1. **토큰 관리**: 액세스 토큰은 메모리에 저장되며, 서버 재시작 시 사라집니다. 프로덕션 환경에서는 데이터베이스나 Redis 등에 저장하는 것을 권장합니다.

2. **거래 일시**: `tran_dtime`은 현재 시간을 기준으로 YYYYMMDDHHmmss 형식으로 전달해야 합니다.

3. **테스트 환경**: 현재 설정은 오픈뱅킹 테스트 API를 사용합니다. 실제 운영 환경에서는 `OPENBANK_API_BASE_URL`을 운영 URL로 변경해야 합니다.

4. **보안**: `.env` 파일은 절대 Git에 커밋하지 마세요. `.gitignore`에 추가되어 있는지 확인하세요.

## 에러 코드

| 응답 코드 | 설명 |
|---------|------|
| A0000 | 정상 처리 |
| A0001 | 거래 처리 중 오류 발생 |
| A0002 | 인증 실패 |
| A0003 | 잔액 부족 |

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run start:dev

# 브라우저에서 인증 시작
# http://localhost:4000/api/openbank/auth
```
