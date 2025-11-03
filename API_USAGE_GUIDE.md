# 오픈뱅킹 API 사용 가이드

## 📌 기본 정보

**백엔드 서버**: `http://localhost:4000`
**프론트엔드**: `http://localhost:3000`

## 🔐 인증 방식

모든 API 요청은 Supabase 인증 토큰이 필요합니다 (오픈뱅킹 인증 시작 제외).

```javascript
// Supabase에서 토큰 가져오기
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// API 요청 시 헤더에 포함
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 🚀 사용 흐름

```
1. 프론트엔드에서 Supabase 로그인 (이미 구현됨)
   ↓
2. 오픈뱅킹 인증 시작
   ↓
3. 오픈뱅킹 페이지에서 계좌 연결
   ↓
4. 콜백으로 돌아와서 인증 완료
   ↓
5. 계좌 목록 조회
   ↓
6. 잔액 조회
```

---

## 📡 API 엔드포인트

### 1️⃣ 오픈뱅킹 인증 시작

**GET** `http://localhost:4000/api/openbank/auth`

사용자를 오픈뱅킹 인증 페이지로 리다이렉트합니다.

**Query Parameters:**
- `state` (required): Supabase 사용자 ID를 전달

**프론트엔드 코드 예제:**
```javascript
// React 예제
const startOpenBankAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert('먼저 로그인해주세요');
    return;
  }

  // 오픈뱅킹 인증 페이지로 이동
  window.location.href = `http://localhost:4000/api/openbank/auth?state=${user.id}`;
};

// 버튼 클릭 시
<button onClick={startOpenBankAuth}>
  은행 계좌 연동하기
</button>
```

**응답:**
- 오픈뱅킹 인증 페이지로 리다이렉트됩니다.
- 사용자가 인증을 완료하면 `/api/openbank/callback`으로 자동 리다이렉트됩니다.

---

### 2️⃣ 인증 상태 확인

**GET** `http://localhost:4000/api/openbank/auth-status`

현재 사용자가 오픈뱅킹 인증을 완료했는지 확인합니다.

**Headers:**
- `Authorization: Bearer {supabase_token}`

**프론트엔드 코드 예제:**
```javascript
const checkAuthStatus = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('http://localhost:4000/api/openbank/auth-status', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json();
  console.log(data);

  return data;
};

// 사용 예시
const status = await checkAuthStatus();
if (status.data.is_authenticated) {
  console.log('오픈뱅킹 인증 완료!');
  console.log('만료 시간:', status.data.expires_at);
} else {
  console.log('오픈뱅킹 인증이 필요합니다.');
}
```

**응답 예시:**
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

---

### 3️⃣ 계좌 목록 조회

**GET** `http://localhost:4000/api/openbank/accounts`

연결된 은행 계좌 목록을 조회합니다.

**Headers:**
- `Authorization: Bearer {supabase_token}`

**프론트엔드 코드 예제:**
```javascript
const getAccounts = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('http://localhost:4000/api/openbank/accounts', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json();
  return data;
};

// 사용 예시
const accountsData = await getAccounts();
console.log('계좌 목록:', accountsData.data.res_list);

// 화면에 표시
accountsData.data.res_list.forEach(account => {
  console.log(`${account.bank_name}: ${account.account_num_masked}`);
});
```

**응답 예시:**
```json
{
  "message": "Account list retrieved successfully",
  "data": {
    "api_tran_id": "1234567890M123456789012345",
    "rsp_code": "A0000",
    "rsp_message": "정상처리되었습니다",
    "res_cnt": 2,
    "res_list": [
      {
        "fintech_use_num": "123456789012345678901234",
        "bank_code_std": "004",
        "bank_code_sub": "004",
        "bank_name": "KB국민은행",
        "account_num_masked": "123-******-1234",
        "account_holder_name": "홍길동",
        "account_type": "1",
        "account_state": "01"
      },
      {
        "fintech_use_num": "987654321098765432109876",
        "bank_code_std": "088",
        "bank_code_sub": "088",
        "bank_name": "신한은행",
        "account_num_masked": "110-******-5678",
        "account_holder_name": "홍길동",
        "account_type": "1",
        "account_state": "01"
      }
    ]
  }
}
```

---

### 4️⃣ 잔액 조회

**POST** `http://localhost:4000/api/openbank/balance`

특정 계좌의 잔액을 조회합니다.

**Headers:**
- `Authorization: Bearer {supabase_token}`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "fintech_use_num": "123456789012345678901234",
  "tran_dtime": "20250103152030"
}
```

**프론트엔드 코드 예제:**
```javascript
const getBalance = async (fintechUseNum) => {
  const { data: { session } } = await supabase.auth.getSession();

  // 현재 시간을 YYYYMMDDHHmmss 형식으로 변환
  const now = new Date();
  const tranDtime =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const response = await fetch('http://localhost:4000/api/openbank/balance', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fintech_use_num: fintechUseNum,
      tran_dtime: tranDtime,
    }),
  });

  const data = await response.json();
  return data;
};

// 사용 예시
const balanceData = await getBalance('123456789012345678901234');
console.log('잔액:', balanceData.data.balance_amt.toLocaleString() + '원');
console.log('출금가능금액:', balanceData.data.available_amt.toLocaleString() + '원');
```

**응답 예시:**
```json
{
  "message": "Balance inquiry successful",
  "data": {
    "api_tran_id": "1234567890M123456789012345",
    "api_tran_dtm": "20250103152030123",
    "rsp_code": "A0000",
    "rsp_message": "정상처리되었습니다",
    "bank_code_std": "004",
    "bank_code_sub": "004",
    "bank_name": "KB국민은행",
    "account_num_masked": "123-******-1234",
    "account_holder_name": "홍길동",
    "account_type": "1",
    "account_state": "01",
    "balance_amt": 1250000,
    "available_amt": 1250000,
    "account_issue_date": "20200101",
    "last_tran_date": "20250103"
  }
}
```

---

### 5️⃣ 토큰 갱신

**POST** `http://localhost:4000/api/openbank/refresh-token`

만료된 오픈뱅킹 토큰을 갱신합니다. (자동으로 처리되지만 수동 호출 가능)

**Headers:**
- `Authorization: Bearer {supabase_token}`

**프론트엔드 코드 예제:**
```javascript
const refreshOpenBankToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('http://localhost:4000/api/openbank/refresh-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json();
  return data;
};
```

---

## 🎯 완전한 React 컴포넌트 예제

```jsx
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function BankAccountManager() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);

  // 1. 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('http://localhost:4000/api/openbank/auth-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      setIsAuthenticated(data.data.is_authenticated);

      if (data.data.is_authenticated) {
        loadAccounts();
      }
    } catch (error) {
      console.error('인증 상태 확인 실패:', error);
    }
  };

  // 2. 오픈뱅킹 인증 시작
  const startOpenBankAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('먼저 로그인해주세요');
      return;
    }
    window.location.href = `http://localhost:4000/api/openbank/auth?state=${user.id}`;
  };

  // 3. 계좌 목록 불러오기
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('http://localhost:4000/api/openbank/accounts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      setAccounts(data.data.res_list || []);
    } catch (error) {
      console.error('계좌 목록 불러오기 실패:', error);
    }
    setLoading(false);
  };

  // 4. 잔액 조회
  const loadBalance = async (fintechUseNum) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const now = new Date();
      const tranDtime =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');

      const response = await fetch('http://localhost:4000/api/openbank/balance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fintech_use_num: fintechUseNum,
          tran_dtime: tranDtime,
        }),
      });
      const data = await response.json();
      setBalances(prev => ({
        ...prev,
        [fintechUseNum]: data.data.balance_amt,
      }));
    } catch (error) {
      console.error('잔액 조회 실패:', error);
    }
  };

  return (
    <div>
      <h1>은행 계좌 관리</h1>

      {!isAuthenticated ? (
        <div>
          <p>오픈뱅킹 인증이 필요합니다.</p>
          <button onClick={startOpenBankAuth}>
            은행 계좌 연동하기
          </button>
        </div>
      ) : (
        <div>
          <h2>연결된 계좌</h2>
          {loading ? (
            <p>로딩 중...</p>
          ) : (
            <ul>
              {accounts.map(account => (
                <li key={account.fintech_use_num}>
                  <div>
                    <strong>{account.bank_name}</strong>
                    <br />
                    계좌번호: {account.account_num_masked}
                    <br />
                    예금주: {account.account_holder_name}
                    <br />
                    {balances[account.fintech_use_num] && (
                      <span>잔액: {balances[account.fintech_use_num].toLocaleString()}원</span>
                    )}
                    <br />
                    <button onClick={() => loadBalance(account.fintech_use_num)}>
                      잔액 조회
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default BankAccountManager;
```

---

## ⚠️ 주의사항

1. **Supabase 로그인 필수**: 모든 API 호출 전에 Supabase 로그인이 되어 있어야 합니다.

2. **토큰 만료**: 오픈뱅킹 토큰은 자동으로 갱신되지만, 오류 발생 시 재인증이 필요할 수 있습니다.

3. **거래 일시**: 잔액 조회 시 `tran_dtime`은 반드시 현재 시간을 YYYYMMDDHHmmss 형식으로 전달해야 합니다.

4. **CORS**: 현재 localhost:3000에서만 API 호출이 가능합니다.

5. **에러 처리**: API 응답에서 `rsp_code`가 "A0000"이 아닌 경우 에러입니다.

---

## 🔍 에러 코드

| 응답 코드 | 설명 |
|---------|------|
| A0000 | 정상 처리 |
| A0001 | 거래 처리 중 오류 발생 |
| A0002 | 인증 실패 |
| A0003 | 잔액 부족 |

---

## 🛡️ 에러 처리

### OPENBANK_AUTH_REQUIRED 에러 처리

오픈뱅킹 인증이 필요할 때 다음과 같은 에러가 반환됩니다:

```javascript
// 에러 응답 예시
{
  "message": "Open banking authentication required",
  "error": "OPENBANK_AUTH_REQUIRED",
  "authUrl": "https://testapi.openbanking.or.kr/oauth/2.0/authorize?..."
}
```

**프론트엔드 에러 처리 예제:**

```javascript
const getAccounts = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch('http://localhost:4000/api/openbank/accounts', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (response.status === 401) {
      const errorData = await response.json();

      // 오픈뱅킹 인증이 필요한 경우
      if (errorData.error === 'OPENBANK_AUTH_REQUIRED') {
        // 인증 페이지로 리다이렉트
        window.location.href = errorData.authUrl;
        return;
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

**React 컴포넌트에서 사용:**

```jsx
const handleApiCall = async (apiFunction) => {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.response?.status === 401) {
      const errorData = error.response.data;
      if (errorData.error === 'OPENBANK_AUTH_REQUIRED') {
        // 사용자에게 알림
        if (confirm('오픈뱅킹 인증이 필요합니다. 인증 페이지로 이동하시겠습니까?')) {
          window.location.href = errorData.authUrl;
        }
        return;
      }
    }
    throw error;
  }
};
```

## 📞 문제 해결

### 401 Unauthorized 에러
- **Supabase 로그인 필요**: Supabase 로그인 토큰이 없거나 만료됨 → 다시 로그인 필요
- **오픈뱅킹 인증 필요**: `OPENBANK_AUTH_REQUIRED` 에러 → 응답의 `authUrl`로 리다이렉트

### 오픈뱅킹 인증이 안됨
- `state` 파라미터에 올바른 Supabase user ID가 전달되었는지 확인

### 계좌 목록이 비어있음
- 오픈뱅킹 인증 페이지에서 계좌 연동을 완료했는지 확인
