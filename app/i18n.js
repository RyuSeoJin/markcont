// markcont 화면 언어 (한국어 · English)
// - 처음에는 브라우저 · 컴퓨터 언어를 보고 고르고, 보기 설정(Aa) → 언어에서 바꿀 수 있습니다.
// - 코드 안의 문구는 L('한국어', 'English') 로 씁니다.
// - index.html 에 그대로 적힌 문구는 아래 STATIC 표로 바꿉니다 (한국어 원문 → 영어).
(function () {
  let lang = null;
  try { lang = localStorage.getItem('mdv-lang'); } catch { /* 저장소를 못 쓰는 환경 */ }
  if (lang !== 'ko' && lang !== 'en') {
    const first = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    lang = /^ko\b/i.test(first) ? 'ko' : 'en';
  }
  const EN = lang === 'en';
  window.LANG = lang;
  window.L = (ko, en) => (EN ? en : ko);
  document.documentElement.lang = lang;

  const STATIC = {
    // 위쪽 막대
    '사이드바 열기 / 닫기': 'Show / hide sidebar',
    '처음 화면': 'Home',
    '이전 문서 (Alt+←)': 'Previous document (Alt+←)',
    '이전 문서': 'Previous document',
    '다음 문서 (Alt+→)': 'Next document (Alt+→)',
    '다음 문서': 'Next document',
    'Claude 연결 (MCP)': 'Claude connection (MCP)',
    '파일 열기 (Ctrl+O 를 두 번)': 'Open file (Ctrl+O twice)',
    '빠른 열기 · 명령': 'Quick open · commands',
    '파일 열기': 'Open file',
    '폴더 안의 마크다운 파일을 모두 열기': 'Open every markdown file in a folder',
    '폴더 열기': 'Open folder',
    '편집 (Ctrl+E)': 'Edit (Ctrl+E)',
    '편집': 'Edit',
    '기존 파일에 저장 (Ctrl+S)': 'Save to original file (Ctrl+S)',
    '저장': 'Save',
    '저장 방법 고르기': 'Save options',
    '기존 파일에 저장': 'Save to original file',
    '새 파일로 저장…': 'Save as new file…',
    '다른 뷰어용으로 저장…': 'Save for other viewers…',
    'GitHub · VS Code 에서도 같게 보이도록 표준 마크다운으로 바꾼 사본. 원래 파일은 그대로': 'A copy converted to standard markdown so it looks the same on GitHub · VS Code. The original stays as it is',
    '다른 뷰어용 마크다운으로 저장': 'Save markdown for other viewers',
    '다른 뷰어 호환': 'Other viewers',
    '다른 뷰어에서 다르게 보이는 곳': 'Spots that look different in other viewers',
    '이름 · 위치를 새로 정합니다. 원래 파일은 그대로': 'Pick a new name and place. The original file stays as it is',
    '보기 방식': 'Layout',
    '편집만': 'Editor',
    '나란히': 'Split',
    '미리보기': 'Preview',
    // 보기 설정
    '보기 설정': 'View settings',
    '글자 크기': 'Text size',
    '작게': 'Smaller',
    '크게': 'Larger',
    '글꼴': 'Font',
    '고딕': 'Sans',
    '명조 글꼴은 Google Fonts에서 받습니다 (인터넷 필요)': 'The serif font is downloaded from Google Fonts (needs internet)',
    '명조 🌐': 'Serif 🌐',
    '본문 폭': 'Width',
    '좁게': 'Narrow',
    '보통': 'Normal',
    '넓게': 'Wide',
    '알림 상자 모양': 'Callout style',
    'ⓘ 참고': 'ⓘ Note',
    '코드 줄 번호 보기': 'Show code line numbers',
    '제목에 번호 붙여 보기': 'Number the headings',
    '1 · 1.1 · 1.1.1 처럼 보여 줍니다. 원본 글은 바뀌지 않고, 이미 번호가 있는 제목은 건너뜁니다': 'Shows them as 1 · 1.1 · 1.1.1. The source text stays as it is, and headings that already have a number are skipped',
    '저장하기 전에 바뀐 내용 확인': 'Review changes before saving',
    '저장할 때 무엇이 바뀌는지 먼저 보여주고 한 번 더 묻습니다': 'Shows what will change and asks once more before saving',
    '편집할 때 스크롤 맞추기': 'Sync scroll while editing',
    '다른 뷰어 호환 안내 보기': 'Show other-viewer compatibility notice',
    'markcont 전용 문법이 있으면 문서 위에 알려 줍니다 (문서 정보 「뷰어: markcont」 면 그 문서만 끔)': 'Notes markcont-only syntax at the top of a document ("viewer: markcont" in the document info turns it off for that document)',
    '원본과 미리보기가 같은 위치를 보여줍니다': 'Keeps the source and preview at the same spot',
    // ⋯ 메뉴
    '더 보기': 'More',
    '밝게 / 어둡게': 'Light / Dark',
    '밝게/어둡게': 'Light / Dark',
    '테마 바꾸기': 'Change theme',
    '문서에서 찾기': 'Find in document',
    '집중 모드': 'Focus mode',
    '제목 모두 접기 / 펴기': 'Fold / unfold all headings',
    'HTML 파일로 저장': 'Save as HTML',
    '인쇄 · PDF로 저장': 'Print · Save as PDF',
    'Claude와 연결 (MCP)': 'Connect to Claude (MCP)',
    '사용 안내서': 'User guide',
    '마크다운 작성 규칙': 'Markdown writing rules',
    '오픈소스 라이선스': 'Open-source licenses',
    '처음 사용 안내 다시 보기': 'Replay the tour',
    '새 문서 쓰기': 'New document',
    // 사이드바
    '파일': 'Files',
    '목차': 'Contents',
    '새 문서': 'New document',
    '새로 고침': 'Refresh',
    '모두 접기 / 펴기': 'Collapse / expand all',
    '모두 접기': 'Collapse all',
    '폴더 더하기 (여러 폴더를 함께 볼 수 있어요)': 'Add folder (view several folders together)',
    '폴더 더하기': 'Add folder',
    '파일 이름으로 찾기': 'Filter by file name',
    '찾기': 'Search',
    '연결': 'Links',
    '이 문서와 이어진 문서 · 깨진 링크': 'Documents linked with this one · broken links',
    '링크 고치기': 'Fix links',
    '모든 문서에서 찾기 (Ctrl+Shift+F)': 'Search all documents (Ctrl+Shift+F)',
    '모든 문서에서 찾기': 'Search all documents',
    '대소문자 구분': 'Match case',
    '단어 단위로 찾기': 'Match whole word',
    '정규식': 'Regular expression',
    '폴더를 여기에 끌어다 놓기': 'Drop a folder here',
    '폴더 안의 md 파일을 트리로 보여줍니다': 'Shows the md files in it as a tree',
    '제목(#)이 두 개 이상 있는 문서를 열면 목차가 나옵니다.': 'Open a document with two or more headings (#) to see its contents.',
    '끌어서 폭 바꾸기': 'Drag to resize',
    // 처음 화면
    '마크다운 파일을 보기 좋게': 'Markdown files, beautifully',
    '.md 파일을 이 창에 끌어다 놓거나 아래 버튼으로 여세요.': 'Drop a .md file on this window or open one with the buttons below.',
    '파일은 내 컴퓨터 안에서만 읽고, 어디에도 올라가지 않습니다.': 'Files are read only on your computer and never uploaded anywhere.',
    'markcont로 할 수 있는 것': 'What markcont can do',
    '실시간 편집': 'Live editing',
    'AI로 보기 좋게 다듬기': 'Polish with AI',
    '작성 규칙을 AI에게 주거나 Claude와 연결해서 문서 정리': 'Give the writing rules to an AI, or connect Claude, to tidy up documents',
    '원본과 결과를 나란히, 고친 곳 표시와 되돌리기 기록': 'Source and result side by side, with change marks and undo history',
    '저장 · 내보내기': 'Save · Export',
    '저장 전 확인, 새 파일로 저장, PDF · HTML': 'Review before saving, save as new file, PDF · HTML',
    '기능 예제 열어 보기 →': 'Open the feature examples →',
    '사용 안내서 →': 'User guide →',
    '인터넷에 연결되지 않아 변환 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 새로고침해 주세요.': "Couldn't load the rendering libraries because there is no internet connection. Connect and reload the page.",
    // 편집 도구
    '굵게 (Ctrl+B)': 'Bold (Ctrl+B)',
    '기울임 (Ctrl+I)': 'Italic (Ctrl+I)',
    '취소선': 'Strikethrough',
    '형광펜 ==텍스트==': 'Highlight ==text==',
    '제목 1': 'Heading 1',
    '제목 2': 'Heading 2',
    '제목 3': 'Heading 3',
    '글머리 목록': 'Bulleted list',
    '번호 목록': 'Numbered list',
    '체크리스트': 'Task list',
    '인용': 'Quote',
    '알림 상자 [!NOTE]': 'Callout [!NOTE]',
    '코드': 'Code',
    '코드 블록': 'Code block',
    '링크 (Ctrl+K)': 'Link (Ctrl+K)',
    '이미지': 'Image',
    '표': 'Table',
    '구분선': 'Divider',
    '바뀐 내용 · 되돌리기 · 저장 기록 (Ctrl+Shift+H)': 'Changes · Undo · Saved versions (Ctrl+Shift+H)',
    '기록': 'History',
    '여기에 마크다운을 쓰세요': 'Write markdown here',
    '집중 모드 끝내기 (Esc)': 'Exit focus mode (Esc)',
    '집중 모드 끝내기': 'Exit focus mode',
    '이전 (Shift+Enter)': 'Previous (Shift+Enter)',
    '이전 결과': 'Previous match',
    '다음 (Enter)': 'Next (Enter)',
    '다음 결과': 'Next match',
    '닫기 (Esc)': 'Close (Esc)',
    '찾기 닫기': 'Close find',
    '찾을 글': 'Find',
    '바꿀 글': 'Replace with',
    '찾아 바꾸기 닫기': 'Close find and replace',
    '바꾸기 (Enter)': 'Replace (Enter)',
    '바꾸기': 'Replace',
    '모두 바꾸기 (Ctrl+Alt+Enter)': 'Replace all (Ctrl+Alt+Enter)',
    '모두 바꾸기': 'Replace all',
    '맨 위로': 'Back to top',
    '여기에 놓으면 열립니다': 'Drop here to open',
    // 창
    'Claude와 연결': 'Connect to Claude',
    '닫기': 'Close',
    '바뀐 내용': 'Changes',
    '저장 후 바뀐 내용': 'Changes since save',
    '되돌리기 기록': 'Undo history',
    '저장 기록': 'Saved versions',
    '저장 전에 바뀐 내용 확인': 'Review changes before saving',
    '건너뛰기': 'Skip',
    '이전': 'Back',
    '다음': 'Next',
    // 언어
    '언어': 'Language',
    '한국어': '한국어',
  };

  const HANGUL = /[가-힣]/;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);
  // index.html 에 적힌 한국어 문구를 영어로 (한국어일 때는 아무것도 안 함)
  window.translateStatic = function (root) {
    if (!EN) return;
    const missing = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('.markdown-body') || SKIP.has(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT
        : HANGUL.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const key = n.nodeValue.trim();
      if (key in STATIC) n.nodeValue = n.nodeValue.replace(key, STATIC[key]);
      else missing.push(key);
    }
    root.querySelectorAll('[title], [aria-label], [placeholder]').forEach((el) => {
      if (el.closest('.markdown-body')) return;
      for (const a of ['title', 'aria-label', 'placeholder']) {
        const v = el.getAttribute(a);
        if (!v || !HANGUL.test(v)) continue;
        if (v in STATIC) el.setAttribute(a, STATIC[v]);
        else missing.push(a + ': ' + v);
      }
    });
    if (missing.length) console.debug('[i18n] 번역 없음', missing);
    return missing;
  };
})();
