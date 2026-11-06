# 📝 markcont

**mark**down **cont**roller — 마크다운을 보기 좋게 보고, 바로 고치는 뷰어

마크다운(`.md`) 파일을 보기 좋게 보고, 바로 고칠 수 있는 뷰어입니다.
휴대폰과 PC 어디서나 **웹 앱**으로 쓰거나, PC에 **프로그램**으로 설치해서 쓸 수 있습니다.

> [!TIP]
> 파일은 내 기기 안에서만 읽습니다. 어디에도 올라가지 않습니다.

---

## 📥 내려받기

| 쓰는 곳 | 방법 |
|:---|:---|
| 🌐 휴대폰 · PC 브라우저 | 웹 앱 주소를 열고 **홈 화면에 추가**(휴대폰) 또는 주소창의 **설치** 단추(PC) |
| 🪟 Windows | [Releases](../../releases/latest)에서 `-setup.exe` 로 끝나는 파일 |
| 🍎 macOS | [Releases](../../releases/latest)에서 `.dmg` |
| 🐧 Linux | [Releases](../../releases/latest)에서 `.AppImage` 또는 `.deb` |

웹 앱 주소: **https://ryuseojin.github.io/markcont/**

---

## ✨ 기능

- GitHub 스타일 화면, 다크 모드, 글자 크기 · 글꼴 · 본문 폭 설정
- 알림 상자 `> [!NOTE]`, 표, 체크리스트, 각주, 형광펜 `==글==`
- 코드 색상 · 줄 번호 · 복사 · 크게 보기, `diff` 색칠
- 수식 `$E=mc^2$`, 화학식 `$\ce{H2O}$`, Mermaid 다이어그램
- 위키링크 `[[문서#제목]]`, 동영상 · 유튜브 썸네일
- 목차, 제목 접기, 문서 안 찾기, 집중 모드
- 편집 도구 모음, 원본 ↔ 미리보기 스크롤 맞춤, 바뀐 파일 자동 새로고침
- HTML 파일로 저장, 인쇄 · PDF

보기 좋은 문서를 쓰는 방법은 [마크다운 작성 규칙](app/docs/writing-rules.md)에 있습니다.

---

## 🛠️ 만드는 방법 (개발자용)

```
app/                화면 (웹 앱과 PC 프로그램이 같이 씀)
  index.html        뷰어 전체
  sw.js             오프라인 저장
  vendor/           변환 라이브러리 (인터넷 없이 동작)
src-tauri/          PC 프로그램 (Tauri 2)
.github/workflows/  웹 앱 올리기, PC 프로그램 만들기
  docs/             사용 안내서, 작성 규칙, 기능 예제 (앱 안에서도 열림)
```

- **웹 앱**: `main` 브랜치에 올리면 자동으로 GitHub Pages에 공개됩니다.
  처음 한 번 저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 바꿔 주세요.
- **PC 프로그램**: `v1.0.0` 같은 태그를 올리면 설치 파일이 만들어져 Releases에 올라갑니다.
  새 버전을 낼 때는 `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `package.json` 의 버전과 `app/sw.js` 의 `VERSION` 을 같이 올리세요.
- 내 PC에서 직접 빌드하려면 [Node.js](https://nodejs.org)와 [Rust](https://rustup.rs)를 설치한 뒤 `npm install`, `npm run icons`, `npm run build`.

## 📄 라이선스

[MIT](LICENSE) © 2026 RyuSeoJin

포함된 라이브러리의 라이선스는 `app/vendor/licenses/` 에 있습니다.
