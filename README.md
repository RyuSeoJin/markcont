[**한국어**](README.md) | [English](README.en.md)

<div align="center">

<img src="app/icons/icon-192.png" width="84" alt="markcont 아이콘">

# markcont

**마크다운을 보기 좋게 보고, 그 자리에서 바로 고치는 뷰어**<br>
웹 · Windows · macOS · Linux

[**🌐 설치 없이 바로 쓰기**](https://ryuseojin.github.io/markcont/) &nbsp;·&nbsp;
[**📥 내려받기**](https://github.com/RyuSeoJin/markcont/releases/latest) &nbsp;·&nbsp;
[**📘 사용 안내서**](app/docs/guide.md)

<img src=".github/assets/demo.gif" width="860" alt="markcont 데모: 폴더 트리, 보기 좋은 문서, markcont 흐름도, 입력하는 즉시 바뀌는 미리보기, 다크 모드, 다른 뷰어에서 다르게 보이는 곳 확인">

</div>

## ⚡ 3초 요약

- 📖 **보기** — `.md` 파일을 GitHub 스타일로: 알림 상자, 표, 체크리스트, 코드 색상, 수식 · 화학식, 다이어그램까지
- ✏️ **고치기** — 원본과 결과를 나란히, 입력하는 즉시 바뀌는 미리보기 · 저장하면 원래 파일에 바로
- 📁 **정리하기** — 폴더째 열어 트리로 보고, 새 문서 · 이름 바꾸기 · 삭제까지 한 화면에서

## 📥 설치 (한 줄)

**Windows** — PowerShell 에 붙여 넣기

```powershell
irm https://raw.githubusercontent.com/RyuSeoJin/markcont/main/install.ps1 | iex
```

**macOS · Linux** — 터미널에 붙여 넣기

```bash
curl -fsSL https://raw.githubusercontent.com/RyuSeoJin/markcont/main/install.sh | sh
```

**설치 없이** — https://ryuseojin.github.io/markcont/ 를 열기 (휴대폰은 **홈 화면에 추가**, PC는 주소창의 **설치** 단추로 앱처럼 쓸 수 있습니다)

> [!TIP]
> 파일은 내 기기 안에서만 읽습니다. 어디에도 올라가지 않습니다.

---

## 📦 직접 내려받기

| 쓰는 곳 | 파일 ([Releases](https://github.com/RyuSeoJin/markcont/releases/latest)) |
|:---|:---|
| 🪟 Windows | `-setup.exe` 로 끝나는 파일 |
| 🍎 macOS | `.dmg` (Intel · Apple 칩 공용) |
| 🐧 Linux | `.AppImage` · `.deb` · `.rpm` |

> [!NOTE]
> 코드 서명 인증서가 없어서 처음 실행할 때 경고가 뜰 수 있습니다.
> Windows는 **추가 정보 → 실행**, macOS는 앱을 **오른쪽 클릭 → 열기**를 누르세요.

---

## ✨ 기능

- GitHub 스타일 화면, 다크 모드, 글자 크기 · 글꼴 · 본문 폭 설정
- 알림 상자 `> [!NOTE]` 11종(접기 가능), 표, 체크리스트(눌러서 체크), 각주, 형광펜 `==글==`
- 한국어에 맞춘 굵게 · 기울임: `**스크립트(script)**는` 처럼 괄호 · 문장부호 뒤에 조사가 붙어도 굵게로
- 코드 색상 · 줄 번호 · 복사 · 크게 보기, `diff` 색칠
- 수식 `$E=mc^2$`, 화학식 `$\ce{H2O}$`, 다이어그램: markcont 방식(markcont 흐름도 기준의 흐름도 · 주고받는 순서 · 상태 변화 · 일정표 · 진입점을 나눠 보여 주는 노출 위치)과 Mermaid, 큰 흐름도를 위한 워크플로우 작성 규칙
- 위키링크 `[[문서#제목]]`, 링크 · 각주 미리 보기(마우스를 올리거나 길게 누르기), 동영상 · 유튜브 썸네일
- 그림: 누르면 크게 보기(확대 · 이동), 한 줄에 따로 쓴 그림은 설명을 그림 아래에, `![설명|300](그림.png)` · `![[그림.png|300]]` 으로 크기
- 빠른 열기 · 명령 <kbd>Ctrl</kbd>+<kbd>O</kbd>: 이름 · 초성(`ㄱㅎㅅ` → 기획서) · 띄엄띄엄(`fp` → feature-proposals)으로 파일을, `>` 로 명령을, `#` 으로 제목을 찾기 (악센트 · 전각 · 가나도 맞춤)
- 여러 폴더를 함께 여는 작업 공간, 폴더 트리 · 파일 찾기 · 오른쪽 클릭 메뉴, 목차, 제목 접기, 문서 안 찾기, 집중 모드
- 모든 문서에서 찾기 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>: 열어 둔 폴더 전체에서 찾아 문서별로 묶어 보여 주고, 누르면 그 줄로 (대소문자 · 단어 단위 · 정규식, 한글 초성)
- 본문 안 목차 `[[_TOC_]]`(인쇄 · PDF에도), 원본을 바꾸지 않는 제목 번호 보기(1 · 1.1 · 1.1.1)
- 실시간 편집: 줄 번호와 문법 색이 있는 원본, 지금 고치는 곳 표시, 스크롤 맞춤
- 닫아도 남는 저장 기록: 저장할 때마다 · Claude나 다른 프로그램이 고칠 때마다 그때의 내용을 남겨, 14일 동안 예전 내용으로 되돌리기
- 바뀐 파일 자동 새로고침, HTML 파일로 저장, 인쇄 · PDF
- 다른 뷰어용으로 저장: markcont 전용 문법을 표준 마크다운으로 바꾼 사본(다이어그램은 Mermaid로), 다르게 보이는 곳 표시
- 처음 실행할 때 기능을 짚어 주는 안내(튜토리얼)
- PC 프로그램: Claude Desktop · Claude Code와 MCP로 연결해 열어 둔 폴더의 문서를 고치기, 밖에서 바뀐 곳 강조 · 되돌리기

보기 좋은 문서를 쓰는 방법은 [마크다운 작성 규칙](app/docs/writing-rules.md)에, 쓰는 법은 [사용 안내서](app/docs/guide.md)에 있습니다.

---

## 🔌 Claude와 연결 (PC 프로그램)

PC 프로그램은 **MCP 서버**로도 동작합니다. Claude Desktop · Claude Code에서 "markcont에서 보고 있는 문서 다듬어 줘"라고 하면, Claude가 markcont에서 열어 둔 폴더의 문서를 고치고 markcont 화면에 **바로** 바뀐 곳이 보입니다.

1. markcont에서 **폴더 열기**로 작업할 폴더를 엽니다.
2. **⋯ → Claude와 연결 (MCP)** 에서 **Claude Desktop에 연결**을 누르거나, Claude Code 명령을 복사해 실행합니다.
3. Claude 앱을 다시 열고 요청합니다. 내 Claude 구독으로 **Claude 앱에서** 대화하며, markcont는 구독이나 API 키를 쓰지 않습니다.

- Claude는 **열어 둔 폴더 안의 마크다운 · 텍스트 파일만** 읽고 고칠 수 있습니다. 삭제 · 이름 바꾸기 · 명령 실행은 할 수 없습니다.
- 바뀐 곳은 markcont에서 강조되고, **바뀐 내용 보기 · 되돌리기**로 확인할 수 있습니다.
- 잘못 고쳐졌다면 **바뀐 내용 보기 · 되돌리기 기록**으로 되돌릴 수 있고, 파일에 저장된 뒤에도 **저장 기록**(14일 · 파일마다 50개)에서 고치기 전 내용으로 되돌릴 수 있습니다. 그래도 중요한 문서는 따로 백업해 두세요.

## 🔒 개인정보

- markcont는 문서를 **내 기기 안에서만** 읽고 씁니다. 사용 기록 수집(텔레메트리)도 없습니다.
- **Claude와 연결**을 쓰면 Claude가 읽은 문서 내용이 Anthropic으로 보내져 처리됩니다 (Anthropic 약관 · 개인정보 처리방침 적용). 연결하지 않으면 아무것도 보내지 않습니다.
- 웹 앱의 설정 · 최근 문서는 브라우저 저장소에만 남습니다.
- 저장 기록(저장 · 바깥 변경 때마다 남기는 문서 사본, 14일 · 파일마다 50개)은 PC 프로그램은 앱 설정 폴더에, 웹 앱은 브라우저 저장소에만 남습니다. **기록 → 저장 기록 → 이 문서 기록 지우기**로 지울 수 있습니다.
- 인터넷 없이도 동작하지만, 아래 경우에는 외부 서버에 접속하면서 **내 IP 주소가 그 서버에 전달**됩니다.
  - 보기 설정에서 **명조** 글꼴을 고를 때: Google Fonts에서 글꼴을 받습니다.
  - 문서에 **유튜브 링크**가 있을 때: 썸네일을 유튜브(Google) 서버에서 받습니다.
  - **HTML 파일로 저장**한 파일을 열 때: 글꼴 · 수식 · 코드 색상 스타일을 CDN(jsDelivr · cdnjs)에서 받습니다.
  - 문서 안의 **인터넷 그림**을 보여줄 때: 그 그림이 있는 서버에서 받습니다.

> Claude는 Anthropic의 상표입니다. markcont는 Anthropic과 관계없는 독립 오픈소스 프로그램입니다.

---

## 🛠️ 만드는 방법 (개발자용)

```
app/                화면 (웹 앱과 PC 프로그램이 같이 씀)
  index.html        뷰어 전체
  sw.js             오프라인 저장
  docs/             사용 안내서, 작성 규칙, 기능 예제 (앱 안에서도 열림)
  vendor/           변환 라이브러리 (인터넷 없이 동작)
src-tauri/          PC 프로그램 (Tauri 2)
.github/workflows/  웹 앱 올리기, PC 프로그램 만들기
install.ps1 / .sh   한 줄 설치 스크립트
```

- **웹 앱**: `main` 브랜치에 올리면 자동으로 GitHub Pages에 공개됩니다.
- **PC 프로그램**: `v1.0.0` 같은 태그를 올리면 설치 파일이 만들어져 Releases에 올라갑니다.
  새 버전을 낼 때는 `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `package.json` 의 버전, `app/sw.js` 의 `VERSION`, `app/index.html` 의 `APP_VERSION` 을 같이 올리세요.
  화면 문구는 한국어 · 영어 두 가지입니다. 코드 안 문구는 `L('한국어', 'English')`, `index.html` 에 그대로 적힌 문구는 `app/i18n.js` 의 표, 안내 문서는 `app/docs/*.en.md` 에 있습니다.
- 내 PC에서 직접 빌드하려면 [Node.js](https://nodejs.org)와 [Rust](https://rustup.rs)를 설치한 뒤 `npm install`, `npm run icons`, `npm run build`.

## 📄 라이선스

[MIT](LICENSE) © 2026 RyuSeoJin

포함된 라이브러리의 라이선스는 [오픈소스 라이선스](app/docs/licenses.md)와 `app/vendor/licenses/` 에 있습니다. PC 프로그램에 들어간 라이브러리 목록은 설치 파일을 만들 때 자동으로 더해지고, 앱의 **⋯ → 오픈소스 라이선스**에서 볼 수 있습니다.
