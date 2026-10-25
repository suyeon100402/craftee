# Craftee 🧶

뜨개질, 블록 조립, 인형 만들기 작품과 만들 예정인 것, 가진 재료를 모아두는 개인용 앱(PWA)입니다.
기록은 기기 안(브라우저 IndexedDB)에 저장되고, 로그인하면 Supabase(무료)로 기기끼리 동기화됩니다.

현재 버전: **v1.0.0** (기본 버전) · 버전별 변경 내용은 [CHANGELOG.md](CHANGELOG.md)

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
  data/         타입, Dexie DB, repo(읽기·쓰기), hooks, 백업, cloud/(동기화)
  lib/          사진 줄이기, id, 날짜
  components/   공통 부품(사진 선택, 갤러리, 태그 입력 등)
  features/     home, projects, materials, search, random, trash, settings
supabase/       schema.sql (클라우드 동기화용 데이터베이스 설정)
```

## 테마 추가하기

1. `src/styles/themes/pastel.css`를 복사해서 `[data-theme='새이름']`으로 바꾸고 색 값을 고칩니다.
2. `src/styles/global.css`에 `@import './themes/새이름.css';`를 추가합니다.
3. `src/theme/themes.ts`의 `THEMES`에 한 줄 추가하면 설정 화면에 나타납니다.

## 배포 (GitHub Pages)

앱 주소: https://suyeon100402.github.io/craftee/

코드를 고친 뒤 아래 명령을 실행하면 빌드해서 `gh-pages` 브랜치에 올리고, 1~2분 뒤 주소에 반영됩니다.

```bash
npm run deploy
```

폰에서 주소를 열고 "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있습니다.

## 새 버전 내는 방법

v1.0.0을 기본 버전으로 두고, 기능·테마·수정은 새 버전으로 올립니다.

1. 기능을 추가하거나 고친다(커밋은 평소처럼).
2. 버전 번호를 올린다. 무엇을 바꿨는지에 따라 하나를 고른다.
   ```bash
   npm version patch --no-git-tag-version   # 수정: 1.0.0 → 1.0.1
   npm version minor --no-git-tag-version   # 기능·테마 추가: 1.0.0 → 1.1.0
   npm version major --no-git-tag-version   # 큰 변화: 1.0.0 → 2.0.0
   ```
3. `CHANGELOG.md` 맨 위에 새 버전과 바뀐 내용을 적는다.
4. 커밋하고 버전 태그를 붙인다: `git commit -am "v1.1.0"` → `git tag -a v1.1.0 -m "v1.1.0"`
5. 배포하고 올린다: `npm run deploy` → `git push origin main --follow-tags`

앱의 **설정 화면 맨 아래**에 지금 버전이 표시됩니다. 예전 버전 코드는 GitHub의 태그(Tags)에서 언제든 볼 수 있습니다.
