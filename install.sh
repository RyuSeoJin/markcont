#!/bin/sh
# markcont 설치 (macOS · Linux)
# 터미널에 붙여 넣고 실행:
#   curl -fsSL https://raw.githubusercontent.com/RyuSeoJin/markcont/main/install.sh | sh
#
# macOS : 최신 .dmg 를 받아 /Applications 에 markcont.app 을 넣습니다.
# Linux : 최신 .AppImage 를 ~/.local/bin/markcont 로 넣고, 앱 목록에 등록합니다 (x86_64).
set -eu

REPO="RyuSeoJin/markcont"
OS="${MARKCONT_OS:-$(uname -s)}"
ARCH="$(uname -m)"

say() { printf '%s\n' "$*"; }
fail() { say "오류: $*"; say "직접 받기: https://github.com/$REPO/releases/latest"; exit 1; }

say "markcont 최신 버전을 찾는 중..."
JSON="$(curl -fsSL -H 'User-Agent: markcont-installer' "https://api.github.com/repos/$REPO/releases/latest")" || fail "GitHub 에 연결하지 못했습니다."
TAG="$(printf '%s' "$JSON" | grep -o '"tag_name": *"[^"]*"' | head -n1 | sed 's/.*"\([^"]*\)"$/\1/')"
url_for() { printf '%s' "$JSON" | grep -o '"browser_download_url": *"[^"]*'"$1"'"' | head -n1 | sed 's/.*"\(https[^"]*\)"$/\1/'; }

case "$OS" in
  Darwin)
    URL="$(url_for '_universal\.dmg')"
    [ -n "$URL" ] || fail "macOS 설치 파일을 찾지 못했습니다."
    if [ -n "${MARKCONT_DRY_RUN:-}" ]; then say "[확인만] $TAG $URL"; exit 0; fi
    TMP="$(mktemp -d)"; trap 'hdiutil detach "$TMP/mnt" -quiet 2>/dev/null || true; rm -rf "$TMP"' EXIT
    say "$TAG 내려받는 중..."
    curl -fL --progress-bar -o "$TMP/markcont.dmg" "$URL"
    hdiutil attach "$TMP/markcont.dmg" -nobrowse -quiet -mountpoint "$TMP/mnt"
    rm -rf "/Applications/markcont.app"
    cp -R "$TMP/mnt/markcont.app" /Applications/
    say "설치가 끝났습니다: /Applications/markcont.app"
    say "처음 열 때 '확인되지 않은 개발자' 창이 뜨면, 응용 프로그램 폴더에서 markcont 를 오른쪽 클릭 -> 열기 를 누르세요."
    ;;
  Linux)
    [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "amd64" ] || fail "지금은 x86_64(amd64) Linux 만 지원합니다. 지금 기기: $ARCH"
    URL="$(url_for '_amd64\.AppImage')"
    [ -n "$URL" ] || fail "Linux 설치 파일을 찾지 못했습니다."
    if [ -n "${MARKCONT_DRY_RUN:-}" ]; then say "[확인만] $TAG $URL"; exit 0; fi
    BIN="$HOME/.local/bin"; APPS="$HOME/.local/share/applications"
    mkdir -p "$BIN" "$APPS"
    say "$TAG 내려받는 중..."
    curl -fL --progress-bar -o "$BIN/markcont" "$URL"
    chmod +x "$BIN/markcont"
    cat > "$APPS/markcont.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=markcont
Comment=마크다운 뷰어
Exec=$BIN/markcont %f
MimeType=text/markdown;
Categories=Office;TextEditor;
Terminal=false
EOF
    command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS" >/dev/null 2>&1 || true
    say "설치가 끝났습니다: $BIN/markcont"
    case ":$PATH:" in *":$BIN:"*) ;; *) say "터미널에서 markcont 로 실행하려면 PATH 에 $BIN 을 추가하세요." ;; esac
    ;;
  *)
    fail "이 운영체제($OS)는 이 스크립트로 설치할 수 없습니다. Windows 는 install.ps1 을 쓰세요."
    ;;
esac
