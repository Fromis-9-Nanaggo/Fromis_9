# 공유 응원 수 연결

1. Cloudflare 대시보드에서 **Storage & Databases → D1**로 이동해 `fromis9-lights` 데이터베이스를 만든다.
2. SQL 콘솔에서 `migrations/0001_lights.sql`부터 `migrations/0006_visitors.sql`까지 번호 순서대로 한 번씩 실행한다.
   - 기존 데이터베이스라면 아직 적용하지 않은 파일만 실행하면 된다.
   - 연속 일정은 반드시 `migrations/0005_schedule_end_dates.sql`을 적용해야 한다. 이 파일이 빠지면 메인 일정 API가 데이터를 읽지 못한다.
3. Pages 프로젝트 **Settings → Bindings**에서 D1 바인딩을 추가한다.
   - 변수 이름: `LIGHTS_DB`
   - D1 데이터베이스: `fromis9-lights`
4. 저장 후 새 배포를 실행한다.

배포가 끝나면 `/api/lights`가 누적과 오늘(KST) 카운트를 읽고 증가시킨다. 오늘 카운트는 한국 시간 자정에 새 날짜 행으로 자동 시작한다. D1 바인딩 전에도 화면 효과는 유지되지만 카운트는 브라우저별 임시값으로만 동작한다.

푸터의 `/api/visitors`는 브라우저에 저장한 무작위 ID로 오늘과 누적의 고유 방문자 수를 집계한다. 개인정보는 저장하지 않는다.
