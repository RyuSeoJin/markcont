// markcont MCP 서버
// `markcont --mcp` 로 실행하면 화면 없이 MCP(Model Context Protocol) 서버로 동작합니다.
// Claude Desktop · Claude Code 같은 MCP 프로그램이 이 서버를 실행하고, 표준 입출력(stdin/stdout)으로 대화합니다.
//
// 안전 규칙
//  - markcont 화면에서 "열어 둔 폴더" 안의 파일만 읽고 고칩니다 (mcp-state.json 에 화면이 적어 둠)
//  - 고치거나 새로 만드는 것은 마크다운 · 텍스트 파일(.md .markdown .mdown .mkd .txt)만
//  - 지우기 · 이름 바꾸기 · 명령 실행은 하지 않습니다
//  - stdout 에는 MCP 메시지 말고 아무것도 쓰지 않습니다
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::io::{BufRead, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

// 화면 언어 (한국어 · English). 화면은 set_lang 명령으로, MCP 서버는 mcp-state.json 의 lang 으로 정합니다.
static EN: AtomicBool = AtomicBool::new(false);
pub fn set_en(on: bool) {
    EN.store(on, Ordering::Relaxed);
}
pub fn is_en() -> bool {
    EN.load(Ordering::Relaxed)
}
/// 한국어 · 영어 문구 중 지금 언어에 맞는 것
pub fn tr(ko: &'static str, en: &'static str) -> &'static str {
    if is_en() { en } else { ko }
}

const MD_EXT: &[&str] = &["md", "markdown", "mdown", "mkd", "txt"];

/// 화면과 MCP 서버가 함께 쓰는 설정 폴더 (Tauri 의 앱 설정 폴더와 같은 곳)
pub fn config_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        PathBuf::from(std::env::var("APPDATA").unwrap_or_default()).join("com.markcont.app")
    }
    #[cfg(target_os = "macos")]
    {
        PathBuf::from(std::env::var("HOME").unwrap_or_default()).join("Library/Application Support/com.markcont.app")
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let base = std::env::var("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".config"));
        base.join("com.markcont.app")
    }
}
pub fn state_file() -> PathBuf {
    config_dir().join("mcp-state.json")
}
pub fn activity_file() -> PathBuf {
    config_dir().join("mcp-activity.jsonl")
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct McpRoot {
    pub name: String,
    pub path: String,
}
#[derive(Serialize, Deserialize, Default)]
pub struct McpState {
    #[serde(default)]
    pub roots: Vec<McpRoot>,
    #[serde(default)]
    pub current: Option<String>,
    #[serde(default)]
    pub selection: Option<String>,
    #[serde(default)]
    pub lang: Option<String>,
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}
fn load_state() -> McpState {
    fs::read_to_string(state_file()).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}
fn log_activity(tool: &str, path: &Path) {
    let line = json!({ "t": now_ms(), "tool": tool, "path": path.to_string_lossy() }).to_string();
    let _ = fs::create_dir_all(config_dir());
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(activity_file()) {
        let _ = writeln!(f, "{line}");
    }
}
fn is_md(path: &Path) -> bool {
    let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
    MD_EXT.contains(&ext.as_str())
}
fn decode(bytes: Vec<u8>) -> String {
    match String::from_utf8(bytes) {
        Ok(s) => s.trim_start_matches('\u{feff}').to_string(),
        Err(e) => {
            let b = e.into_bytes();
            let (t, _, _) = encoding_rs::EUC_KR.decode(&b);
            t.into_owned()
        }
    }
}

/// "폴더이름/안쪽/파일.md" 또는 절대 경로 → 열어 둔 폴더 안의 실제 경로 (밖이면 오류)
fn resolve(st: &McpState, input: &str) -> Result<PathBuf, String> {
    if st.roots.is_empty() {
        return Err(tr("markcont에 열려 있는 폴더가 없습니다. markcont에서 '폴더 열기'로 폴더를 먼저 여세요.", "No folder is open in markcont. Open a folder with 'Open folder' in markcont first.").into());
    }
    let raw = PathBuf::from(input);
    let candidate = if raw.is_absolute() {
        raw
    } else {
        let norm = input.replace('\\', "/");
        let (first, rest) = match norm.split_once('/') {
            Some((a, b)) => (a.to_string(), b.to_string()),
            None => (norm.clone(), String::new()),
        };
        match st.roots.iter().find(|r| r.name == first) {
            Some(r) => PathBuf::from(&r.path).join(rest),
            None if st.roots.len() == 1 => PathBuf::from(&st.roots[0].path).join(&norm),
            None => {
                let names: Vec<String> = st.roots.iter().map(|r| r.name.clone()).collect();
                return Err((if is_en() { format!("The path must start with an open folder name: {}", names.join(", ")) } else { format!("경로는 열린 폴더 이름으로 시작해야 합니다: {}", names.join(", ")) }));
            }
        }
    };
    // 아직 없는 파일도 다룰 수 있게, 부모 폴더 기준으로 실제 위치를 확인
    let file_name = candidate.file_name().ok_or(tr("파일 이름이 없습니다", "No file name"))?.to_os_string();
    let parent = candidate.parent().ok_or(tr("폴더가 없습니다", "No folder"))?;
    let canon_parent = parent.canonicalize().map_err(|_| (if is_en() { format!("Folder not found: {}", parent.display()) } else { format!("폴더가 없습니다: {}", parent.display()) }))?;
    let full = canon_parent.join(file_name);
    for r in &st.roots {
        if let Ok(rc) = PathBuf::from(&r.path).canonicalize() {
            if full.starts_with(&rc) {
                return Ok(full);
            }
        }
    }
    Err(tr("markcont에서 열어 둔 폴더 밖의 파일은 다룰 수 없습니다.", "Files outside the folders open in markcont can't be used.").into())
}
/// 실제 경로 → "폴더이름/안쪽/파일.md"
fn display(st: &McpState, path: &Path) -> String {
    for r in &st.roots {
        if let Ok(rc) = PathBuf::from(&r.path).canonicalize() {
            if let Ok(rel) = path.strip_prefix(&rc) {
                return format!("{}/{}", r.name, rel.to_string_lossy().replace('\\', "/"));
            }
        }
    }
    path.to_string_lossy().into_owned()
}
fn walk_md(dir: &Path, depth: usize, out: &mut Vec<PathBuf>) {
    if out.len() >= 3000 {
        return;
    }
    let Ok(rd) = fs::read_dir(dir) else { return };
    let mut entries: Vec<_> = rd.flatten().collect();
    entries.sort_by_key(|e| e.file_name());
    for e in entries {
        let name = e.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') || name == "node_modules" {
            continue;
        }
        let p = e.path();
        if p.is_dir() {
            if depth < 10 {
                walk_md(&p, depth + 1, out);
            }
        } else if is_md(&p) {
            out.push(p);
        }
    }
}
fn root_dirs(st: &McpState, folder: Option<&str>) -> Result<Vec<PathBuf>, String> {
    let list: Vec<PathBuf> = st
        .roots
        .iter()
        .filter(|r| folder.map(|f| f.is_empty() || r.name == f).unwrap_or(true))
        .filter_map(|r| PathBuf::from(&r.path).canonicalize().ok())
        .collect();
    if list.is_empty() {
        return Err(tr("열린 폴더가 없거나, 그런 이름의 폴더가 없습니다.", "No folder is open, or there is no folder with that name.").into());
    }
    Ok(list)
}

fn tools() -> Value {
    json!([
        { "name": "list_folders", "description": tr("markcont에서 지금 열어 둔 폴더 목록을 보여줍니다. 다른 도구의 경로는 이 폴더 이름으로 시작합니다.", "Lists the folders currently open in markcont. Paths for the other tools start with one of these folder names."),
          "inputSchema": { "type": "object", "properties": {} } },
        { "name": "list_files", "description": tr("열어 둔 폴더 안의 마크다운 파일 목록 (\"폴더이름/안쪽/파일.md\" 형식).", "Lists markdown files in the open folders (as \"folder/sub/file.md\")."),
          "inputSchema": { "type": "object", "properties": { "folder": { "type": "string", "description": tr("폴더 이름 (비우면 모든 폴더)", "Folder name (empty for all folders)") } } } },
        { "name": "get_current_document", "description": tr("사용자가 markcont에서 지금 보고 있는 문서의 경로와 내용, 선택한 부분을 가져옵니다. '이 문서', '지금 문서' 같은 요청에 먼저 쓰세요.", "Gets the path, content and selected text of the document the user is viewing in markcont. Use it first for requests like 'this document'."),
          "inputSchema": { "type": "object", "properties": {} } },
        { "name": "read_file", "description": tr("마크다운 파일 내용을 읽습니다.", "Reads a markdown file."),
          "inputSchema": { "type": "object", "properties": { "path": { "type": "string" } }, "required": ["path"] } },
        { "name": "search", "description": tr("열어 둔 폴더의 마크다운 파일에서 글자를 찾습니다 (대소문자 무시). 최대 100줄.", "Searches text in markdown files of the open folders (case-insensitive). Up to 100 lines."),
          "inputSchema": { "type": "object", "properties": { "query": { "type": "string" }, "folder": { "type": "string" } }, "required": ["query"] } },
        { "name": "edit_file", "description": tr("파일 안의 old_text 를 new_text 로 바꿉니다. old_text 는 파일에 정확히 한 번만 있어야 합니다. 작은 수정에 쓰세요. 고친 내용은 바로 파일에 저장됩니다. 고치기 전 내용은 markcont의 저장 기록에 남지만, 그래도 신중히 고치세요.", "Replaces old_text with new_text in a file. old_text must appear exactly once. Use it for small edits. Changes are saved to the file immediately. markcont keeps the previous content in its saved versions, but still edit carefully."),
          "inputSchema": { "type": "object", "properties": { "path": { "type": "string" }, "old_text": { "type": "string" }, "new_text": { "type": "string" } }, "required": ["path", "old_text", "new_text"] } },
        { "name": "write_file", "description": tr("마크다운 파일 전체를 새 내용으로 씁니다 (없으면 새로 만듦). 큰 수정이나 새 문서에 쓰세요.", "Writes a whole markdown file with new content (creates it if missing). Use it for big edits or new documents."),
          "inputSchema": { "type": "object", "properties": { "path": { "type": "string" }, "content": { "type": "string" } }, "required": ["path", "content"] } }
    ])
}

fn run_tool(name: &str, args: &Value) -> Result<String, String> {
    let st = load_state();
    let arg = |k: &str| args.get(k).and_then(|v| v.as_str()).unwrap_or("").to_string();
    match name {
        "list_folders" => {
            if st.roots.is_empty() {
                return Ok(tr("markcont에 열린 폴더가 없습니다. 사용자에게 markcont에서 '폴더 열기'로 폴더를 열어 달라고 요청하세요.", "No folder is open in markcont. Ask the user to open a folder with 'Open folder' in markcont.").into());
            }
            Ok(st.roots.iter().map(|r| format!("- {}  ({})", r.name, r.path)).collect::<Vec<_>>().join("\n"))
        }
        "list_files" => {
            let folder = arg("folder");
            let mut files = vec![];
            for d in root_dirs(&st, Some(folder.as_str()))? {
                walk_md(&d, 0, &mut files);
            }
            if files.is_empty() {
                return Ok(tr("마크다운 파일이 없습니다.", "No markdown files.").into());
            }
            Ok(files.iter().map(|p| display(&st, p)).collect::<Vec<_>>().join("\n"))
        }
        "get_current_document" => {
            let Some(cur) = st.current.clone() else {
                return Ok(tr("markcont에서 지금 열린 문서가 없습니다 (또는 열어 둔 폴더 밖의 문서입니다).", "No document is open in markcont (or it is outside the open folders).").into());
            };
            let p = resolve(&st, &cur)?;
            let text = fs::read(&p).map(decode).map_err(|e| e.to_string())?;
            let mut out = (if is_en() { format!("Path: {}\n\n----- Content -----\n{}", display(&st, &p), text) } else { format!("경로: {}\n\n----- 내용 -----\n{}", display(&st, &p), text) });
            if let Some(sel) = st.selection.as_ref().filter(|s| !s.trim().is_empty()) {
                out.push_str(&(if is_en() { format!("\n----- Selected by the user -----\n{sel}") } else { format!("\n----- 사용자가 선택한 부분 -----\n{sel}") }));
            }
            log_activity("read", &p);
            Ok(out)
        }
        "read_file" => {
            let p = resolve(&st, &arg("path"))?;
            if !is_md(&p) {
                return Err(tr("마크다운 · 텍스트 파일만 읽을 수 있습니다.", "Only markdown and text files can be read.").into());
            }
            let text = fs::read(&p).map(decode).map_err(|e| (if is_en() { format!("Couldn't read: {e}") } else { format!("읽지 못했습니다: {e}") }))?;
            log_activity("read", &p);
            Ok(text)
        }
        "search" => {
            let q = arg("query").to_lowercase();
            if q.is_empty() {
                return Err(tr("찾을 글자를 넣으세요.", "Enter text to search for.").into());
            }
            let mut files = vec![];
            for d in root_dirs(&st, Some(arg("folder").as_str()))? {
                walk_md(&d, 0, &mut files);
            }
            let mut hits = vec![];
            'outer: for f in files {
                if let Ok(bytes) = fs::read(&f) {
                    for (i, line) in decode(bytes).lines().enumerate() {
                        if line.to_lowercase().contains(&q) {
                            hits.push(format!("{}:{}: {}", display(&st, &f), i + 1, line.chars().take(200).collect::<String>()));
                            if hits.len() >= 100 {
                                break 'outer;
                            }
                        }
                    }
                }
            }
            Ok(if hits.is_empty() { tr("찾은 곳이 없습니다.", "No matches.").into() } else { hits.join("\n") })
        }
        "edit_file" => {
            let p = resolve(&st, &arg("path"))?;
            if !is_md(&p) {
                return Err(tr("마크다운 · 텍스트 파일만 고칠 수 있습니다.", "Only markdown and text files can be edited.").into());
            }
            let old = arg("old_text");
            let new = arg("new_text");
            if old.is_empty() {
                return Err(tr("old_text 가 비어 있습니다.", "old_text is empty.").into());
            }
            let text = fs::read(&p).map(decode).map_err(|e| (if is_en() { format!("Couldn't read: {e}") } else { format!("읽지 못했습니다: {e}") }))?;
            let n = text.matches(&old).count();
            if n == 0 {
                return Err(tr("old_text 를 파일에서 찾지 못했습니다. read_file 로 지금 내용을 다시 확인하세요.", "old_text was not found in the file. Check the current content again with read_file.").into());
            }
            if n > 1 {
                return Err((if is_en() { format!("old_text appears {n} times. Include more surrounding text so it matches only one place.") } else { format!("old_text 가 {n}번 나옵니다. 앞뒤 글을 더 넣어 한 곳만 가리키게 하세요.") }));
            }
            crate::history::write_with_history(&p, &text.replacen(&old, &new, 1), "claude").map_err(|e| (if is_en() { format!("Couldn't write: {e}") } else { format!("쓰지 못했습니다: {e}") }))?;
            log_activity("write", &p);
            Ok((if is_en() { format!("Edited {}.", display(&st, &p)) } else { format!("{} 을(를) 고쳤습니다.", display(&st, &p)) }))
        }
        "write_file" => {
            let p = resolve(&st, &arg("path"))?;
            if !is_md(&p) {
                return Err(tr("마크다운 · 텍스트 파일(.md 등)만 쓸 수 있습니다.", "Only markdown and text files (.md etc.) can be written.").into());
            }
            let existed = p.exists();
            crate::history::write_with_history(&p, &arg("content"), "claude").map_err(|e| (if is_en() { format!("Couldn't write: {e}") } else { format!("쓰지 못했습니다: {e}") }))?;
            log_activity("write", &p);
            Ok(if is_en() { format!("{} {}.", if existed { "Rewrote" } else { "Created" }, display(&st, &p)) } else { format!("{} 을(를) {}.", display(&st, &p), if existed { "새 내용으로 썼습니다" } else { "새로 만들었습니다" }) })
        }
        _ => Err((if is_en() { format!("Unknown tool: {name}") } else { format!("모르는 도구입니다: {name}") })),
    }
}

const INSTRUCTIONS_KO: &str = "markcont는 마크다운 뷰어입니다. 사용자가 markcont에서 열어 둔 폴더의 마크다운 파일을 읽고 고칠 수 있습니다. \
'이 문서'처럼 말하면 get_current_document 를 먼저 쓰세요. 작은 수정은 edit_file, 큰 수정은 write_file 을 쓰세요. \
고친 내용은 바로 파일에 저장됩니다. 고치기 전 내용은 markcont의 저장 기록에 남지만, 그래도 신중히 고치세요. 고친 뒤에는 무엇을 바꿨는지 짧게 알려 주세요.";
const INSTRUCTIONS_EN: &str = "markcont is a markdown viewer. You can read and edit markdown files in the folders the user opened in markcont. \
When the user says 'this document', use get_current_document first. Use edit_file for small edits and write_file for big ones. \
Changes are saved to the file immediately. markcont keeps the previous content in its saved versions, but still edit carefully. After editing, briefly tell the user what you changed.";

/// MCP 서버 실행 (줄 단위 JSON-RPC 2.0)
pub fn serve() {
    let stdin = std::io::stdin();
    let mut out = std::io::stdout();
    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        let Ok(msg) = serde_json::from_str::<Value>(&line) else { continue };
        set_en(load_state().lang.as_deref() == Some("en")); // 화면에서 고른 언어를 따름
        let id = msg.get("id").cloned();
        let method = msg.get("method").and_then(|m| m.as_str()).unwrap_or("").to_string();
        let params = msg.get("params").cloned().unwrap_or_else(|| json!({}));
        let result: Option<Result<Value, (i64, String)>> = match method.as_str() {
            "initialize" => {
                let version = params.get("protocolVersion").and_then(|v| v.as_str()).unwrap_or("2025-06-18").to_string();
                Some(Ok(json!({
                    "protocolVersion": version,
                    "capabilities": { "tools": {} },
                    "serverInfo": { "name": "markcont", "version": env!("CARGO_PKG_VERSION") },
                    "instructions": tr(INSTRUCTIONS_KO, INSTRUCTIONS_EN)
                })))
            }
            "ping" => Some(Ok(json!({}))),
            "tools/list" => Some(Ok(json!({ "tools": tools() }))),
            "tools/call" => {
                let name = params.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let args = params.get("arguments").cloned().unwrap_or_else(|| json!({}));
                Some(Ok(match run_tool(&name, &args) {
                    Ok(text) => json!({ "content": [{ "type": "text", "text": text }] }),
                    Err(e) => json!({ "content": [{ "type": "text", "text": e }], "isError": true }),
                }))
            }
            m if m.starts_with("notifications/") => None,
            _ => {
                if id.is_some() {
                    Some(Err((-32601, (if is_en() { format!("Unsupported request: {method}") } else { format!("지원하지 않는 요청입니다: {method}") }))))
                } else {
                    None
                }
            }
        };
        if let (Some(id), Some(res)) = (id, result) {
            let resp = match res {
                Ok(r) => json!({ "jsonrpc": "2.0", "id": id, "result": r }),
                Err((code, message)) => json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } }),
            };
            let _ = writeln!(out, "{resp}");
            let _ = out.flush();
        }
    }
}

// ---------- 화면(Tauri) 쪽에서 쓰는 도우미 ----------

pub fn write_state(state: &McpState) -> Result<(), String> {
    fs::create_dir_all(config_dir()).map_err(|e| e.to_string())?;
    let text = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(state_file(), text).map_err(|e| e.to_string())
}

/// since 이후의 Claude 활동 (최근 200줄만 봄)
pub fn read_activity(since: u64) -> Vec<Value> {
    let Ok(text) = fs::read_to_string(activity_file()) else { return vec![] };
    let lines: Vec<&str> = text.lines().collect();
    let start = lines.len().saturating_sub(200);
    let out: Vec<Value> = lines[start..]
        .iter()
        .filter_map(|l| serde_json::from_str::<Value>(l).ok())
        .filter(|v| v.get("t").and_then(|t| t.as_u64()).unwrap_or(0) > since)
        .collect();
    // 기록 파일이 너무 커지지 않게 정리
    if lines.len() > 2000 {
        let _ = fs::write(activity_file(), lines[lines.len() - 500..].join("\n") + "\n");
    }
    out
}

/// Claude Desktop 설정 파일 위치
pub fn claude_desktop_config() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        PathBuf::from(std::env::var("APPDATA").unwrap_or_default()).join("Claude").join("claude_desktop_config.json")
    }
    #[cfg(target_os = "macos")]
    {
        PathBuf::from(std::env::var("HOME").unwrap_or_default()).join("Library/Application Support/Claude/claude_desktop_config.json")
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".config/Claude/claude_desktop_config.json")
    }
}

/// Claude Desktop 설정에 markcont MCP 서버를 더함 (기존 설정은 .bak 으로 백업, 다른 항목은 그대로)
pub fn add_to_claude_desktop() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let cfg = claude_desktop_config();
    let mut root: Value = if cfg.exists() {
        let text = fs::read_to_string(&cfg).map_err(|e| e.to_string())?;
        let _ = fs::write(cfg.with_extension("json.bak"), &text);
        if text.trim().is_empty() {
            json!({})
        } else {
            serde_json::from_str(&text).map_err(|_| tr("Claude Desktop 설정 파일 형식이 올바르지 않아 고치지 않았습니다. 직접 추가해 주세요.", "Claude Desktop's settings file isn't valid, so it was left unchanged. Please add markcont manually.").to_string())?
        }
    } else {
        json!({})
    };
    if !root.is_object() {
        return Err(tr("Claude Desktop 설정 파일 형식이 예상과 달라 고치지 않았습니다.", "Claude Desktop's settings file has an unexpected format, so it was left unchanged.").into());
    }
    let servers = root.as_object_mut().unwrap().entry("mcpServers").or_insert_with(|| json!({}));
    if !servers.is_object() {
        return Err(tr("Claude Desktop 설정의 mcpServers 형식이 예상과 달라 고치지 않았습니다.", "mcpServers in Claude Desktop's settings has an unexpected format, so it was left unchanged.").into());
    }
    servers.as_object_mut().unwrap().insert(
        "markcont".into(),
        json!({ "command": exe.to_string_lossy(), "args": ["--mcp"] }),
    );
    if let Some(dir) = cfg.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    fs::write(&cfg, serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(cfg.to_string_lossy().into_owned())
}

/// 설정 화면에 보여줄 정보
pub fn setup_info() -> Value {
    let exe = std::env::current_exe().map(|p| p.to_string_lossy().into_owned()).unwrap_or_default();
    let cfg = claude_desktop_config();
    let added = fs::read_to_string(&cfg)
        .ok()
        .and_then(|t| serde_json::from_str::<Value>(&t).ok())
        .and_then(|v| v.get("mcpServers").and_then(|s| s.get("markcont")).cloned())
        .is_some();
    json!({ "exe": exe, "claudeConfig": cfg.to_string_lossy(), "claudeConfigExists": cfg.exists(), "added": added })
}
