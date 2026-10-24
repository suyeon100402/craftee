# Craftee 🧶

뜨개질, 블록 조립, 인형 만들기 작품과 만들 예정인 것, 가진 재료를 모아두는 개인용 앱(PWA)입니다.
기록은 모두 기기 안(브라우저 IndexedDB)에만 저장되고, 서버 비용이 들지 않습니다.

## 실행

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 타입 검사 + 배포용 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
```

## 폴더 구조

```
src/
  app/          라우터, 레이아웃(모바일 하단 탭 / PC 사이드바)
  styles/       tokens.css(공통 값), themes/*.css(테마별 색)
  theme/        테마 목록과 적용 함수
  data/         타입, Dexie DB, repo(읽기·쓰기), hooks, 백업
  lib/          사진 줄이기, id, 날짜
  components/   공통 부품(사진 선택, 갤러리, 태그 입력 등)
  features/     home, projects, materials, search, settings
```

## 테마 추가하기

1. `src/styles/themes/pastel.css`를 복사해서 `[data-theme='새이름']`으로 바꾸고 색 값을 고칩니다.
2. `src/styles/global.css`에 `@import './themes/새이름.css';`를 추가합니다.
3. `src/theme/themes.ts`의 `THEMES`에 한 줄 추가하면 설정 화면에 나타납니다.

## 무료로 배포하기 (GitHub Pages)

1. GitHub에 저장소를 만들고 이 폴더를 push 합니다.
2. `npm run build`로 `dist/` 폴더를 만듭니다.
3. `dist/` 내용을 `gh-pages` 브랜치에 올리고, 저장소 Settings → Pages에서 해당 브랜치를 선택합니다.
   (Cloudflare Pages를 쓰면 빌드 명령 `npm run build`, 출력 폴더 `dist`로 연결만 하면 됩니다.)
4. 폰에서 주소를 열고 "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있습니다.

## 다음에 할 것

- 랜덤 뽑기(계획 중인 작품, 재료 보관함에서 뽑기)
- 클라우드 동기화(Supabase 무료 요금제): `src/data/repo.ts`의 updatedAt / deletedAt 기준으로 맞춤
