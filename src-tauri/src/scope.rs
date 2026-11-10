// 화면(webview)이 다룰 수 있는 파일 범위 (PC 프로그램)
//
// 화면이 부르는 파일 명령(main.rs)은 사용자가 직접 고른 폴더 · 파일 안에서만 동작합니다.
//  - 사용자가 고른 것: 「폴더 열기」 · 「파일 열기」 · 「새 파일로 저장」 선택 창에서 고른 것,
//    탐색기에서 더블클릭해 프로그램을 연 파일
//  - 다음에 켤 때도 지난번 폴더 · 최근 파일을 다시 열 수 있게 설정 폴더의 scope.json 에 남깁니다
//
// 문서에 숨은 코드가 화면의 보호(DOMPurify 살균 · CSP)를 뚫더라도
// 이 범위 밖의 파일은 읽거나 바꾸지 못하게 하는 마지막 방어선입니다.
// 화면이 보낸 경로는 믿지 않고, 실제 위치(.. · 심볼릭 링크를 푼 경로)로 확인합니다.
//
//  - 문서 읽기 · 쓰기: 고른 파일 그 자체, 또는 고른 폴더 안의 마크다운 · 글 파일 (쓰기는 .css 도)
//  - 그림 · 동영상(ASSET_EXT) 읽기: 어디서든 (폴더 밖 그림을 가리키는 문서가 많아서. 읽기만)
//  - 붙여 넣은 그림 만들기: 고른 폴더 안, 또는 고른 파일 옆 images 폴더에 새 파일로만
//  - 만들기 · 이름 바꾸기 · 지우기: 고른 폴더 안의 폴더와 문서 · 그림 파일만, 고른 폴더 그 자체는 안 됨
//    (.git/hooks 처럼 확장자 없는 실행 파일이나 설정 파일을 심거나 지우지 못하게)
use serde::{Deserialize, Serialize};
use std::ffi::OsString;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::{Mutex, MutexGuard, OnceLock};

pub const MD_EXT: &[&str] = &["md", "markdown", "mdown", "mkd", "txt"];
pub const ASSET_EXT: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "avif", "mp4", "webm", "ogv", "mov", "mp3", "wav", "aac",
    "flac", "m4a", "oga", "ogg",
];
/// 문서 스타일 파일 (「문서 스타일을 파일로 저장」)
const STYLE_EXT: &[&str] = &["css"];
/// 기억해 두는 폴더 · 파일 수 (넘으면 오래된 것부터 잊음)
const MAX_DIRS: usize = 100;
const MAX_FILES: usize = 300;

fn ext_of(p: &Path) -> String {
    p.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default()
}
fn is_md(p: &Path) -> bool {
    MD_EXT.contains(&ext_of(p).as_str())
}
fn is_asset(p: &Path) -> bool {
    ASSET_EXT.contains(&ext_of(p).as_str())
}
fn is_style(p: &Path) -> bool {
    STYLE_EXT.contains(&ext_of(p).as_str())
}

/// 화면이 보낸 경로 → 실제 위치 (.. · 심볼릭 링크를 푼 경로).
/// 아직 없는 파일 · 폴더는 가장 가까운 "있는" 조상의 실제 위치에 남은 이름을 붙입니다.
/// 상대 경로나, 없는 부분에 들어 있는 .. · . 는 받지 않습니다 (None).
pub fn resolve(p: &Path) -> Option<PathBuf> {
    if !p.is_absolute() {
        return None;
    }
    if let Ok(real) = fs::canonicalize(p) {
        return Some(real);
    }
    let mut tail: Vec<OsString> = Vec::new();
    let mut cur = p;
    loop {
        match cur.components().next_back()? {
            Component::Normal(name) => tail.push(name.to_os_string()),
            _ => return None,
        }
        cur = cur.parent()?;
        if let Ok(real) = fs::canonicalize(cur) {
            let mut out = real;
            for name in tail.iter().rev() {
                out.push(name);
            }
            return Some(out);
        }
    }
}

/// 사용자가 고른 폴더 · 파일 (모두 실제 위치)
#[derive(Default, Debug)]
pub struct Allowed {
    dirs: Vec<PathBuf>,
    files: Vec<PathBuf>,
}

fn remember(list: &mut Vec<PathBuf>, p: PathBuf, max: usize) {
    list.retain(|x| x != &p);
    list.push(p);
    if list.len() > max {
        let extra = list.len() - max;
        list.drain(..extra);
    }
}

impl Allowed {
    fn add_dir(&mut self, real: PathBuf) {
        remember(&mut self.dirs, real, MAX_DIRS);
    }
    fn add_file(&mut self, real: PathBuf) {
        remember(&mut self.files, real, MAX_FILES);
    }

    /// 고른 폴더 안 (그 폴더 자신 포함)
    fn in_dir(&self, real: &Path) -> bool {
        self.dirs.iter().any(|d| real.starts_with(d))
    }
    /// 고른 파일 그 자체
    fn is_file(&self, real: &Path) -> bool {
        self.files.iter().any(|f| f == real)
    }
    /// 고른 폴더 그 자체
    fn is_root(&self, real: &Path) -> bool {
        self.dirs.iter().any(|d| d == real)
    }
    /// 고른 파일 옆, 또는 그 옆의 images 폴더 바로 안 (붙여 넣은 그림을 두는 곳)
    fn beside_file(&self, real: &Path) -> bool {
        let Some(parent) = real.parent() else { return false };
        self.files.iter().filter_map(|f| f.parent()).any(|dir| parent == dir || parent == dir.join("images").as_path())
    }

    // ---------- 명령마다 쓰는 규칙 ----------

    /// 문서(고른 파일, 고른 폴더 안의 문서): 저장 기록 · 파일 위치 열기 · Claude 에게 알려 줄 지금 문서
    pub fn doc(&self, real: &Path) -> bool {
        self.is_file(real) || self.in_dir(real)
    }
    /// 문서 읽기 (read_file)
    pub fn read_doc(&self, real: &Path) -> bool {
        self.is_file(real) || (self.in_dir(real) && is_md(real))
    }
    /// 문서 저장 (save_file): 고른 파일, 또는 고른 폴더 안의 문서 · 스타일 파일
    pub fn write_doc(&self, real: &Path) -> bool {
        self.is_file(real) || (self.in_dir(real) && (is_md(real) || is_style(real)))
    }
    /// 새 문서 만들기 (create_file)
    pub fn new_doc(&self, real: &Path) -> bool {
        self.in_dir(real) && is_md(real)
    }
    /// 그림 · 동영상 읽기 (read_binary): 어디서든, 그림 · 동영상 파일만
    pub fn read_media(&self, real: &Path) -> bool {
        is_asset(real)
    }
    /// 붙여 넣은 그림 저장 (save_binary)
    pub fn new_media(&self, real: &Path) -> bool {
        is_asset(real) && (self.in_dir(real) || self.beside_file(real))
    }
    /// 고친 시각 알아보기 (file_modified): 문서와, 그림을 붙여 넣을 곳
    pub fn stat(&self, real: &Path) -> bool {
        self.doc(real) || self.beside_file(real)
    }
    /// 고른 폴더와 그 안의 폴더 (list_dir · create_dir · Claude 에게 알려 줄 폴더)
    pub fn folder(&self, real: &Path) -> bool {
        self.in_dir(real)
    }
    /// 이름 바꾸기 · 지우기 대상: 고른 폴더 안의 폴더 · 문서 · 그림 (고른 폴더 그 자체는 안 됨)
    pub fn entry(&self, real: &Path) -> bool {
        self.in_dir(real) && !self.is_root(real) && (real.is_dir() || is_md(real) || is_asset(real))
    }
    /// 이름 바꾼 뒤의 경로 (폴더가 아니면 문서 · 그림 이름이어야 함)
    pub fn rename_to(&self, real: &Path, from_is_dir: bool) -> bool {
        self.in_dir(real) && !self.is_root(real) && (from_is_dir || is_md(real) || is_asset(real))
    }
}

// ---------- 저장 (설정 폴더/scope.json) ----------

#[derive(Serialize, Deserialize, Default)]
struct Saved {
    #[serde(default)]
    dirs: Vec<String>,
    #[serde(default)]
    files: Vec<String>,
}

fn scope_file() -> PathBuf {
    crate::mcp::config_dir().join("scope.json")
}

fn save(a: &Allowed) {
    let s = Saved {
        dirs: a.dirs.iter().map(|p| p.to_string_lossy().into_owned()).collect(),
        files: a.files.iter().map(|p| p.to_string_lossy().into_owned()).collect(),
    };
    if let Ok(text) = serde_json::to_string_pretty(&s) {
        let _ = fs::create_dir_all(crate::mcp::config_dir());
        let _ = fs::write(scope_file(), text);
    }
}

fn load() -> Allowed {
    if let Ok(text) = fs::read_to_string(scope_file()) {
        if let Ok(s) = serde_json::from_str::<Saved>(&text) {
            return Allowed {
                dirs: s.dirs.into_iter().map(PathBuf::from).collect(),
                files: s.files.into_iter().map(PathBuf::from).collect(),
            };
        }
    }
    // 처음 켤 때 (이 기능이 없던 버전에서 올라온 경우):
    // 지난번에 열어 둔 폴더 · 문서와 저장 기록이 있는 파일을 이어서 허락해, 다시 고르지 않아도 되게 함
    let mut a = Allowed::default();
    if let Ok(text) = fs::read_to_string(crate::mcp::state_file()) {
        if let Ok(st) = serde_json::from_str::<crate::mcp::McpState>(&text) {
            for r in st.roots {
                if let Some(real) = resolve(Path::new(&r.path)).filter(|p| p.is_dir()) {
                    a.add_dir(real);
                }
            }
            if let Some(real) = st.current.and_then(|c| resolve(Path::new(&c))) {
                a.add_file(real);
            }
        }
    }
    for p in crate::history::known_paths() {
        if let Some(real) = resolve(&p).filter(|p| p.is_file()) {
            a.add_file(real);
        }
    }
    save(&a);
    a
}

static STATE: OnceLock<Mutex<Allowed>> = OnceLock::new();

fn state() -> MutexGuard<'static, Allowed> {
    STATE.get_or_init(|| Mutex::new(load())).lock().unwrap_or_else(|e| e.into_inner())
}

/// 사용자가 고른 폴더를 범위에 넣음 (폴더 열기 선택 창)
pub fn allow_dir(p: &Path) {
    if let Some(real) = resolve(p) {
        let mut a = state();
        a.add_dir(real);
        save(&a);
    }
}

/// 사용자가 고른 파일을 범위에 넣음 (파일 열기 · 새 파일로 저장 선택 창, 더블클릭한 파일)
pub fn allow_file(p: &Path) {
    if let Some(real) = resolve(p) {
        let mut a = state();
        a.add_file(real);
        save(&a);
    }
}

fn denied() -> String {
    crate::mcp::tr(
        "markcont에서 직접 고른 폴더 · 파일 밖이거나, 다룰 수 없는 종류의 파일입니다. 「폴더 열기」나 「파일 열기」로 골라 주세요.",
        "This is outside the folders and files you picked in markcont, or a kind of file it can't use. Pick it with Open folder or Open file.",
    )
    .into()
}

/// 화면이 보낸 경로가 규칙에 맞는지 확인. 맞으면 실제 위치를 돌려줌
pub fn check(path: &str, ok: impl Fn(&Allowed, &Path) -> bool) -> Result<PathBuf, String> {
    let real = resolve(Path::new(path)).ok_or_else(denied)?;
    let allowed = state();
    if ok(&*allowed, real.as_path()) {
        Ok(real)
    } else {
        Err(denied())
    }
}

/// .md 파일을 더블클릭해서 프로그램을 열었을 때 그 파일 (상대 경로면 지금 폴더 기준으로)
pub fn startup_path() -> Option<PathBuf> {
    let arg = std::env::args().skip(1).find(|a| !a.starts_with('-'))?;
    let p = PathBuf::from(arg);
    if p.is_absolute() {
        Some(p)
    } else {
        Some(std::env::current_dir().ok()?.join(p))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 시험용 폴더 (끝나면 지움). 안에 picked/ · picked2/ · outside/ · loose/ 를 만듦
    /// (화면이 보내는 경로처럼 C:\... 형태로 둠. \\?\ 형태면 Windows 가 .. 를 풀지 않음)
    struct Tmp(PathBuf);
    impl Tmp {
        fn new(tag: &str) -> Tmp {
            let t = Tmp(std::env::temp_dir().join(format!("markcont-scope-{}-{tag}", std::process::id())));
            let _ = fs::remove_dir_all(&t.0);
            for d in ["picked/sub", "picked2", "outside", "loose"] {
                fs::create_dir_all(t.p(d)).unwrap();
            }
            for f in ["picked/a.md", "picked/sub/b.md", "picked/.env", "picked/pic.png", "picked2/c.md", "outside/secret.md", "outside/photo.jpg", "outside/id_rsa", "loose/note.md"] {
                fs::write(t.p(f), b"x").unwrap();
            }
            t
        }
        /// "a/b" → 이 운영체제의 구분자로 이은 경로
        fn p(&self, rel: &str) -> PathBuf {
            rel.split('/').fold(self.0.clone(), |p, seg| p.join(seg))
        }
        fn real(&self, rel: &str) -> PathBuf {
            resolve(&self.p(rel)).unwrap()
        }
        /// picked/ 폴더와 loose/note.md 파일을 고른 상태
        fn allowed(&self) -> Allowed {
            let mut a = Allowed::default();
            a.add_dir(self.real("picked"));
            a.add_file(self.real("loose/note.md"));
            a
        }
        fn ok(&self, rule: impl Fn(&Allowed, &Path) -> bool, rel: &str) -> bool {
            let a = self.allowed();
            resolve(&self.p(rel)).map(|r| rule(&a, r.as_path())).unwrap_or(false)
        }
    }
    impl Drop for Tmp {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn resolve_rejects_relative_and_dot_dot_in_missing_part() {
        let t = Tmp::new("resolve");
        assert!(resolve(Path::new("a.md")).is_none());
        assert!(resolve(Path::new("picked/a.md")).is_none());
        // 있는 경로의 .. 는 풀어서 실제 위치로
        assert_eq!(t.real("picked/sub/../a.md"), t.real("picked/a.md"));
        // 아직 없는 파일 · 폴더: 있는 조상의 실제 위치 + 남은 이름
        assert_eq!(t.real("picked/new/deeper/x.md"), t.real("picked").join("new").join("deeper").join("x.md"));
        // 없는 부분에 .. 가 있으면 받지 않거나, 받더라도 실제 위치는 밖이라 범위 검사에서 걸림
        let escaped = resolve(&t.p("picked/nope/../../outside/secret.md"));
        assert!(escaped.map_or(true, |r| !r.starts_with(t.real("picked"))));
    }

    #[test]
    fn documents_only_inside_picked_folder_or_picked_file() {
        let t = Tmp::new("docs");
        assert!(t.ok(Allowed::read_doc, "picked/a.md"));
        assert!(t.ok(Allowed::read_doc, "picked/sub/b.md"));
        assert!(t.ok(Allowed::read_doc, "loose/note.md"));
        assert!(!t.ok(Allowed::read_doc, "outside/secret.md"));
        assert!(!t.ok(Allowed::read_doc, "outside/id_rsa"));
        // 이름만 비슷한 옆 폴더 (picked2 는 picked 안이 아님)
        assert!(!t.ok(Allowed::read_doc, "picked2/c.md"));
        // .. 로 빠져나가기
        assert!(!t.ok(Allowed::read_doc, "picked/../outside/secret.md"));
        assert!(!t.ok(Allowed::read_doc, "picked/sub/../../outside/secret.md"));
        // 고른 폴더 안이어도 문서가 아닌 파일은 못 읽음
        assert!(!t.ok(Allowed::read_doc, "picked/.env"));
        // 고른 파일 옆의 다른 문서는 고른 것이 아님
        assert!(!t.ok(Allowed::read_doc, "loose/other.md"));
    }

    #[test]
    fn writing_needs_document_kind_inside_scope() {
        let t = Tmp::new("write");
        assert!(t.ok(Allowed::write_doc, "picked/a.md"));
        assert!(t.ok(Allowed::write_doc, "picked/style.css"));
        assert!(t.ok(Allowed::write_doc, "loose/note.md"));
        assert!(!t.ok(Allowed::write_doc, "outside/secret.md"));
        // .git/hooks 같은 확장자 없는 파일 · 실행 파일은 못 씀
        assert!(!t.ok(Allowed::write_doc, "picked/.git/hooks/pre-commit"));
        assert!(!t.ok(Allowed::write_doc, "picked/run.bat"));
        assert!(t.ok(Allowed::new_doc, "picked/new.md"));
        assert!(!t.ok(Allowed::new_doc, "picked/new.json"));
        assert!(!t.ok(Allowed::new_doc, "loose/new.md"));
    }

    #[test]
    fn media_reads_anywhere_but_writes_only_beside_picked() {
        let t = Tmp::new("media");
        assert!(t.ok(Allowed::read_media, "outside/photo.jpg"));
        assert!(!t.ok(Allowed::read_media, "outside/secret.md"));
        assert!(!t.ok(Allowed::read_media, "outside/id_rsa"));
        assert!(t.ok(Allowed::new_media, "picked/images/paste.png"));
        assert!(t.ok(Allowed::new_media, "loose/images/paste.png"));
        assert!(!t.ok(Allowed::new_media, "loose/deeper/images/paste.png"));
        assert!(!t.ok(Allowed::new_media, "outside/images/paste.png"));
        assert!(!t.ok(Allowed::new_media, "picked/images/paste.exe"));
        assert!(t.ok(Allowed::stat, "loose/images/paste.png"));
        assert!(!t.ok(Allowed::stat, "outside/photo.jpg"));
    }

    #[test]
    fn rename_and_delete_stay_inside_and_keep_the_root() {
        let t = Tmp::new("entry");
        assert!(t.ok(Allowed::entry, "picked/a.md"));
        assert!(t.ok(Allowed::entry, "picked/sub"));
        assert!(t.ok(Allowed::entry, "picked/pic.png"));
        assert!(!t.ok(Allowed::entry, "picked"));
        assert!(!t.ok(Allowed::entry, "picked/.env"));
        assert!(!t.ok(Allowed::entry, "outside/secret.md"));
        assert!(!t.ok(Allowed::entry, "loose/note.md"));
        let a = t.allowed();
        let to = |rel: &str, dir: bool| resolve(&t.p(rel)).map_or(false, |r| a.rename_to(&r, dir));
        assert!(to("picked/renamed.md", false));
        assert!(to("picked/renamed-folder", true));
        assert!(!to("picked/renamed.bat", false));
        assert!(!to("outside/moved.md", false));
        assert!(t.ok(Allowed::folder, "picked/sub"));
        assert!(!t.ok(Allowed::folder, "outside"));
    }

    #[test]
    fn remember_keeps_newest_and_limits_size() {
        let mut list = vec![];
        for i in 0..5 {
            remember(&mut list, PathBuf::from(format!("/p{i}")), 3);
        }
        remember(&mut list, PathBuf::from("/p3"), 3);
        assert_eq!(list, vec![PathBuf::from("/p2"), PathBuf::from("/p4"), PathBuf::from("/p3")]);
    }

    #[cfg(unix)]
    #[test]
    fn symlink_out_of_picked_folder_is_outside() {
        let t = Tmp::new("link");
        std::os::unix::fs::symlink(t.p("outside"), t.p("picked/link")).unwrap();
        assert!(!t.ok(Allowed::read_doc, "picked/link/secret.md"));
    }
}
