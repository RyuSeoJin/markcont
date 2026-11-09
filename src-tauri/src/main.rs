// markcont (markdown controller) PC 프로그램
// 화면은 app/index.html 을 그대로 쓰고, 여기서는 파일 읽기 · 저장 · 선택 창만 맡습니다.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod history;
mod mcp;
mod textfile;
mod update;

use serde::Serialize;
use std::{fs, path::PathBuf, time::UNIX_EPOCH};

#[derive(Serialize)]
struct OpenedFile {
    path: String,
    name: String,
    /// 줄 끝을 \n 으로 맞추고 맨 앞 BOM 을 뗀 글 (편집창과 같게, textfile.rs)
    text: String,
    /// 원래 글자 방식: 줄 끝("\r\n" · "\n") · BOM · 인코딩("utf-8" · "euc-kr" · "utf-16le" · "utf-16be"). 화면이 저장할 때 save_file 에 돌려줌
    eol: &'static str,
    bom: bool,
    enc: &'static str,
    modified: u64,
}

/// 파일을 마지막으로 고친 시각 (밀리초). 다른 프로그램이 파일을 바꿨는지 알아낼 때 씁니다.
fn modified_ms(p: &PathBuf) -> u64 {
    fs::metadata(p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

/// UTF-8(아니면 EUC-KR)로 읽고 BOM 을 떼고 줄 끝을 \n 으로 맞춥니다. 원래 글자 방식은 eol · bom · enc 로 알려 줍니다.
#[tauri::command]
fn read_file(path: String) -> Result<OpenedFile, String> {
    let p = PathBuf::from(&path);
    let (text, fmt) = textfile::read(&p).map_err(|e| e.to_string())?;
    let name = p
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.clone());
    Ok(OpenedFile {
        modified: modified_ms(&p),
        path,
        name,
        text,
        eol: fmt.eol,
        bom: fmt.bom,
        enc: fmt.enc.name(),
    })
}

/// keep_history 가 true 면 바뀌기 전 내용과 새 내용을 저장 기록에 남깁니다 (history.rs)
/// eol · bom · enc: 쓸 글자 방식 (read_file 이 알려 준 원래 방식). 없는 것은 지금 파일의 방식을 따릅니다.
/// EUC-KR 에 없는 글자를 EUC-KR 로 쓰려 하면 쓰지 않고 오류 (화면은 저장 전에 UTF-8 로 바꿀지 먼저 물음)
#[tauri::command]
fn save_file(path: String, text: String, keep_history: Option<bool>, eol: Option<String>, bom: Option<bool>, enc: Option<String>) -> Result<u64, String> {
    let p = PathBuf::from(&path);
    let want = textfile::Want { eol: eol.as_deref(), bom, enc: enc.as_deref() };
    if keep_history.unwrap_or(false) {
        history::write_with_history(&p, &text, want, "save").map_err(|e| e.to_string())?;
    } else {
        textfile::write(&p, &text, want).map_err(|e| e.to_string())?;
    }
    Ok(modified_ms(&p))
}

// ---------- 저장 기록 ----------
#[tauri::command]
fn history_list(path: String) -> Vec<history::Version> {
    history::list(&PathBuf::from(path))
}
#[tauri::command]
fn history_read(path: String, id: String) -> Result<String, String> {
    history::read(&PathBuf::from(path), &id)
}
#[tauri::command]
fn history_add(path: String, text: String, kind: String) -> Result<(), String> {
    history::add(&PathBuf::from(path), &text, &kind)
}
#[tauri::command]
fn history_clear(path: String) -> Result<(), String> {
    history::clear(&PathBuf::from(path))
}
#[tauri::command]
fn history_prune() {
    history::prune_all();
}

#[tauri::command]
fn file_modified(path: String) -> u64 {
    modified_ms(&PathBuf::from(path))
}

/// .md 파일을 더블클릭해서 프로그램을 열었을 때 그 파일 경로
#[tauri::command]
fn startup_file() -> Option<String> {
    std::env::args().skip(1).find(|a| !a.starts_with('-'))
}

#[tauri::command]
fn pick_files() -> Vec<String> {
    rfd::FileDialog::new()
        .set_title(mcp::tr("마크다운 파일 열기", "Open markdown file"))
        .add_filter(mcp::tr("마크다운", "Markdown"), &["md", "markdown", "mdown", "mkd", "txt"])
        .pick_files()
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect()
}

/// 파일 탐색기(Finder)에서 이 파일이 있는 폴더를 열고 파일을 선택해 보여줌
#[tauri::command]
fn reveal_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .raw_arg(format!("/select,\"{}\"", path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").args(["-R", &path]).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let dir = std::path::Path::new(&path).parent().map(|p| p.to_path_buf()).unwrap_or_default();
        std::process::Command::new("xdg-open").arg(dir).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// "새 파일로 저장" 창: 고른 경로를 돌려줌 (취소하면 None)
#[tauri::command]
fn pick_save_path(default_name: String, start_dir: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new()
        .set_title(mcp::tr("새 파일로 저장", "Save as new file"))
        .add_filter(mcp::tr("마크다운", "Markdown"), &["md", "markdown", "txt"])
        .set_file_name(&default_name);
    if let Some(dir) = start_dir {
        dialog = dialog.set_directory(dir);
    }
    dialog.save_file().map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .set_title(mcp::tr("폴더 열기", "Open folder"))
        .pick_folder()
        .map(|p| p.to_string_lossy().into_owned())
}

#[derive(Serialize)]
struct FolderListing {
    name: String,
    root: String,
    files: Vec<String>,
    assets: Vec<String>,
    dirs: Vec<String>,
}

const MD_EXT: &[&str] = &["md", "markdown", "mdown", "mkd", "txt"];
const ASSET_EXT: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "avif", "mp4", "webm", "ogv", "mov", "mp3", "wav", "aac",
    "flac", "m4a", "oga", "ogg",
];

/// 폴더 안의 마크다운 파일 · 그림 · 하위 폴더를 모두 찾습니다 (상대 경로, / 로 구분).
#[tauri::command]
fn list_dir(root: String) -> Result<FolderListing, String> {
    let base = PathBuf::from(&root);
    if !base.is_dir() {
        return Err(mcp::tr("폴더를 찾을 수 없습니다", "Folder not found").into());
    }
    let mut out = FolderListing {
        name: base.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| root.clone()),
        root: root.clone(),
        files: vec![],
        assets: vec![],
        dirs: vec![],
    };
    let mut count = 0usize;
    fn walk(dir: &PathBuf, rel: &str, depth: usize, count: &mut usize, out: &mut FolderListing) {
        let Ok(rd) = fs::read_dir(dir) else { return };
        for entry in rd.flatten() {
            *count += 1;
            if *count > 20000 {
                return;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') || name == "node_modules" {
                continue;
            }
            let p = if rel.is_empty() { name.clone() } else { format!("{rel}/{name}") };
            let path = entry.path();
            if path.is_dir() {
                out.dirs.push(p.clone());
                if depth < 10 {
                    walk(&path, &p, depth + 1, count, out);
                }
            } else {
                let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
                if MD_EXT.contains(&ext.as_str()) {
                    out.files.push(p);
                } else if ASSET_EXT.contains(&ext.as_str()) {
                    out.assets.push(p);
                }
            }
        }
    }
    walk(&base, "", 0, &mut count, &mut out);
    Ok(out)
}

/// 그림 · 동영상 같은 파일을 그대로 읽어 보냅니다.
#[tauri::command]
fn read_binary(path: String) -> Result<tauri::ipc::Response, String> {
    fs::read(&path).map(tauri::ipc::Response::new).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(path: String, text: String) -> Result<u64, String> {
    use std::io::Write;
    let p = PathBuf::from(&path);
    let mut f = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&p)
        .map_err(|e| if e.kind() == std::io::ErrorKind::AlreadyExists { mcp::tr("같은 이름의 파일이 이미 있습니다", "A file with that name already exists").to_string() } else { e.to_string() })?;
    f.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
    Ok(modified_ms(&p))
}

/// 붙여 넣은 그림 저장 (폴더가 없으면 만들고, 같은 이름이 있으면 덮어쓰지 않음)
#[tauri::command]
fn save_binary(path: String, data: Vec<u8>) -> Result<(), String> {
    use std::io::Write;
    let p = PathBuf::from(&path);
    if let Some(dir) = p.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let mut f = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&p)
        .map_err(|e| if e.kind() == std::io::ErrorKind::AlreadyExists { mcp::tr("같은 이름의 파일이 이미 있습니다", "A file with that name already exists").to_string() } else { e.to_string() })?;
    f.write_all(&data).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_dir(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.exists() {
        return Err(mcp::tr("같은 이름이 이미 있습니다", "That name is already taken").into());
    }
    fs::create_dir(&p).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_path(from: String, to: String) -> Result<(), String> {
    let target = PathBuf::from(&to);
    if target.exists() {
        return Err(mcp::tr("같은 이름이 이미 있습니다", "That name is already taken").into());
    }
    fs::rename(&from, &target).map_err(|e| e.to_string())?;
    // 저장 기록도 새 이름으로
    let src = PathBuf::from(&from);
    if target.is_dir() {
        history::moved_dir(&src, &target);
    } else {
        history::moved(&src, &target);
    }
    Ok(())
}

/// 지운 파일 · 폴더는 휴지통으로 보냅니다 (되살릴 수 있음).
#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| e.to_string())
}

// ---------- Claude 연결 (MCP) : 화면에서 쓰는 명령 ----------
#[tauri::command]
fn set_mcp_state(roots: Vec<mcp::McpRoot>, current: Option<String>, selection: Option<String>, lang: Option<String>, suggest_only: Option<bool>) -> Result<(), String> {
    mcp::write_state(&mcp::McpState { roots, current, selection, lang, suggest_only: suggest_only.unwrap_or(false) })
}
/// 화면 언어를 알려줌 (파일 선택 창 제목 · 오류 문구에 씀)
#[tauri::command]
fn set_lang(lang: String) {
    mcp::set_en(lang == "en");
}
#[tauri::command]
fn mcp_setup_info() -> serde_json::Value {
    mcp::setup_info()
}
#[tauri::command]
fn mcp_add_claude_desktop() -> Result<String, String> {
    mcp::add_to_claude_desktop()
}
#[tauri::command]
fn mcp_activity(since: u64) -> Vec<serde_json::Value> {
    mcp::read_activity(since)
}

fn main() {
    // `markcont --mcp` : 화면 없이 MCP 서버로 동작 (Claude Desktop · Claude Code 가 실행)
    if std::env::args().any(|a| a == "--mcp") {
        mcp::serve();
        return;
    }
    tauri::Builder::default()
        // 새 버전 확인 · 설치 (update.rs, 설정은 tauri.conf.json 의 plugins.updater)
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(update::Pending::default())
        .invoke_handler(tauri::generate_handler![
            set_lang,
            read_file,
            save_file,
            file_modified,
            startup_file,
            pick_files,
            pick_save_path,
            reveal_in_folder,
            set_mcp_state,
            mcp_setup_info,
            mcp_add_claude_desktop,
            mcp_activity,
            pick_folder,
            list_dir,
            read_binary,
            create_file,
            save_binary,
            create_dir,
            rename_path,
            delete_path,
            history_list,
            history_read,
            history_add,
            history_clear,
            history_prune,
            update::update_check,
            update::update_install,
            update::update_open_page
        ])
        .run(tauri::generate_context!())
        .expect("markcont를 실행하지 못했습니다");
}
