# 공유 응원 수 연결

1. Cloudflare 대시보드에서 **Storage & Databases → D1**로 이동해 `fromis9-lights` 데이터베이스를 만든다.
2. SQL 콘솔에 `migrations/0001_lights.sql` 내용을 실행한다. 오늘 응원 수도 쓰려면 `migrations/0002_daily_lights.sql`도 이어서 실행한다.
3. Pages 프로젝트 **Settings → Bindings**에서 D1 바인딩을 추가한다.
   - 변수 이름: `LIGHTS_DB`
   - D1 데이터베이스: `fromis9-lights`
4. 저장 후 새 배포를 실행한다.

배포가 끝나면 `/api/lights`가 누적과 오늘(KST) 카운트를 읽고 증가시킨다. 오늘 카운트는 한국 시간 자정에 새 날짜 행으로 자동 시작한다. D1 바인딩 전에도 화면 효과는 유지되지만 카운트는 브라우저별 임시값으로만 동작한다.
