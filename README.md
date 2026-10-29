# Lake CW Trainer

브라우저 모스 부호 수신·송신 훈련기.

```sh
npm ci
npm run dev
npm test
npm run build
```

## 계정과 기기 이전

Supabase `caferadar` (`pbmzjxjtctwhgxxbcgxl`)의 `public."cw-trainer_accounts"`에 Google 계정별 설정, 속도별 통계(레벨 6 최고 기록 포함), 공통 오답을 저장한다. 테이블·정책·인증 저장 키는 `cw-trainer_` 접두어를 사용한다. 공개 클라이언트 키만 프런트엔드에 포함하며 RLS로 본인 데이터만 읽고 쓸 수 있다.

1. **맥에서 기존 기록이 있는 브라우저·주소**를 연다. `cw.lakekim.com`과 `lake-cw-trainer.vercel.app`의 로컬 기록은 서로 다르다.
2. Google 로그인 후 **이 기기 기록 가져오기 (맥)**를 한 번 누른다. 로그인 자체는 로컬 기록을 업로드하지 않는다.
3. **계정에 저장됨**을 확인한 뒤 폰에서 같은 Google 계정으로 로그인한다. 폰의 기존 로컬 기록은 사용하거나 합치지 않는다.
4. 폰을 먼저 로그인해 두었다면 맥에서 가져오기를 마친 뒤 **계정 기록 불러오기**를 누른다.

가져오기는 INSERT만 사용하므로 이미 계정 기록이 있으면 덮어쓰지 않는다. 기존 `lake-cw-*` 로컬 원본도 보존한다. 로그아웃하면 그 브라우저의 로컬 모드로 돌아간다.

계정 모드에서 변경한 기록은 자동 저장된다. 다른 기기의 최신 기록은 **계정 기록 불러오기** 또는 페이지 새로고침으로 반영한다. 두 기기가 동시에 수정하면 버전을 확인해 오래된 기록의 덮어쓰기를 차단한다. 실패한 저장은 계정별 `cw-trainer_pending:<user_id>` 키에 보관한다. 충돌 시 **기록 백업**으로 이 기기의 변경을 내려받은 후 계정 기록을 불러온다. 백업 JSON의 자동 재가져오기나 기기 간 자동 병합은 제공하지 않는다.

## Supabase

스키마: `supabase/migrations/20261029022455_cw_trainer_account.sql`.
롤백되는 소유권·CAS 테스트: `supabase/tests/cw_trainer_rls.sql` (기존 Auth 사용자가 하나 이상 있는 DB에서 실행).

Google 제공자는 기존 프로젝트 설정을 사용한다. 기존 Site URL을 유지하고 다음 리디렉션 주소만 추가했다.

- `https://cw.lakekim.com/`
- `https://lake-cw-trainer.vercel.app/`
- `http://localhost:5173/`

Google OAuth 방식: https://supabase.com/docs/guides/auth/social-login/auth-google
