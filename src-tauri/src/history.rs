// 저장 기록 (PC 프로그램)
// 파일 내용이 바뀔 때마다(markcont 저장 · Claude 고침 · 다른 프로그램) 그때의 내용을 앱 설정 폴더에 남깁니다.
// 화면(main.rs 의 명령)과 MCP 서버(mcp.rs)가 같은 곳을 씁니다.
//
//  - 위치: <설정 폴더>/history/<경로 해시>/<시각(ms)>-<종류>.md  (+ path.txt 에 원래 경로)
//  - 한도: 파일마다 최근 50개, 14일이 지난 것은 지움
//  - 바로 앞 기록과 내용이 같으면 새로 남기지 않음
//  - 글 내용만 남김: 줄 끝은 \n 으로 맞추고 BOM · 인코딩은 빼고 UTF-8 로
//    (화면 · MCP 서버가 같은 내용을 줄 끝만 달리 두 번 남기지 않게. 파일의 글자 방식은 쓸 때 되돌림)
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const KEEP: usize = 50;
const DAYS: u64 = 14;
const MAX_BYTES: usize = 20 * 1024 * 1024;
const KINDS: [&str; 4] = ["save", "before", "claude", "outside"];

#[derive(Serialize)]
pub struct Version {
    pub id: String,
    pub t: u64,
    pub kind: String,
    pub lines: usize,
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// 같은 파일이면 같은 글자가 되게: \ → /, \\?\ 떼기, (Windows · macOS 는) 소문자
fn norm(path: &Path) -> String {
    let raw = path.to_string_lossy().replace('\\', "/");
    let mut s = if let Some(rest) = raw.strip_prefix("//?/UNC/") {
        format!("//{rest}")
    } else if let Some(rest) = raw.strip_prefix("//?/") {
        rest.to_string()
    } else {
        raw.clone()
    };
    while s.len() > 1 && s.ends_with('/') {
        s.pop();
    }
    if cfg!(any(windows, target_os = "macos")) {
        s = s.to_lowercase();
    }
    s
}

/// FNV-1a 64비트 (러스트 버전이 바뀌어도 같은 값)
fn fnv(s: &str) -> String {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in s.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x0100_0000_01b3);
    }
    format!("{h:016x}")
}

fn root() -> PathBuf {
    crate::mcp::config_dir().join("history")
}

fn dir_of(path: &Path) -> PathBuf {
    root().join(fnv(&norm(path)))
}

/// "1731000000000-save.md" → (시각, 종류)
fn parse_id(name: &str) -> Option<(u64, String)> {
    let stem = name.strip_suffix(".md")?;
    let (t, kind) = stem.split_once('-')?;
    let t = t.parse::<u64>().ok()?;
    if !KINDS.contains(&kind) {
        return None;
    }
    Some((t, kind.to_string()))
}

/// 새것부터 (시각, 파일 이름)
fn entries(dir: &Path) -> Vec<(u64, String)> {
    let mut out = vec![];
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            let name = e.file_name().to_string_lossy().into_owned();
            if let Some((t, _)) = parse_id(&name) {
                out.push((t, name));
            }
        }
    }
    out.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| b.1.cmp(&a.1)));
    out
}

pub fn list(path: &Path) -> Vec<Version> {
    let dir = dir_of(path);
    entries(&dir)
        .into_iter()
        .filter_map(|(t, id)| {
            let (_, kind) = parse_id(&id)?;
            let lines = fs::read(dir.join(&id)).map(|b| b.iter().filter(|&&c| c == b'\n').count() + 1).unwrap_or(0);
            Some(Version { id, t, kind, lines })
        })
        .collect()
}

pub fn read(path: &Path, id: &str) -> Result<String, String> {
    if parse_id(id).is_none() || id.contains('/') || id.contains('\\') {
        return Err("bad id".into());
    }
    // 예전에 \r\n 그대로 남긴 기록도 \n 으로 맞춰 돌려줌
    fs::read(dir_of(path).join(id)).map(|b| crate::textfile::to_lf(&String::from_utf8_lossy(&b))).map_err(|e| e.to_string())
}

/// 기록 하나 더하기. 바로 앞 기록과 같으면 건너뜀.
/// "바뀌기 전"은 최근 10개 중에 같은 내용이 있으면 건너뜀
/// (Claude가 고친 것은 MCP 서버가 먼저 남기고, 화면도 바뀐 것을 알아채 한 번 더 남기려 하기 때문)
pub fn add(path: &Path, text: &str, kind: &str) -> Result<(), String> {
    if text.len() > MAX_BYTES || !KINDS.contains(&kind) {
        return Ok(());
    }
    let text = crate::textfile::to_lf(text);
    let dir = dir_of(path);
    let list = entries(&dir);
    let check = if kind == "before" { 10 } else { 1 };
    for (_, id) in list.iter().take(check) {
        if let Ok(prev) = fs::read(dir.join(id)) {
            if crate::textfile::to_lf(&String::from_utf8_lossy(&prev)) == text {
                return Ok(());
            }
        }
    }
    let mut t = now_ms();
    if let Some((last_t, _)) = list.first() {
        if t <= *last_t {
            t = last_t + 1;
        }
    }
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let _ = fs::write(dir.join("path.txt"), path.to_string_lossy().as_bytes());
    loop {
        let file = dir.join(format!("{t}-{kind}.md"));
        match fs::OpenOptions::new().write(true).create_new(true).open(&file) {
            Ok(mut f) => {
                f.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
                break;
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => t += 1,
            Err(e) => return Err(e.to_string()),
        }
    }
    prune(&dir);
    Ok(())
}

/// 바뀌기 전 내용 → 쓰기 → 새 내용 을 차례로 남기며 저장.
/// want: 쓸 글자 방식(줄 끝 · BOM · 인코딩). 정하지 않은 것은 지금 파일의 방식을 따름 (textfile.rs)
/// EUC-KR 파일에 EUC-KR 에 없는 글자가 있으면 쓰지 않고 오류 (파일 · 기록 모두 그대로)
pub fn write_with_history(path: &Path, text: &str, want: crate::textfile::Want<'_>, kind: &str) -> std::io::Result<()> {
    let lf = crate::textfile::to_lf(text);
    let old = crate::textfile::read(path).ok(); // (글, 글자 방식). 파일이 없으면 None
    let fmt = crate::textfile::pick(want, old.as_ref().map(|(_, f)| *f), text);
    let bytes = crate::textfile::encode(&lf, fmt)?;
    // 지금 디스크 내용이 기록에 없으면 "바뀌기 전"으로 남김
    if let Some((old_text, _)) = &old {
        if *old_text != lf {
            let _ = add(path, old_text, "before");
        }
    }
    fs::write(path, bytes)?;
    let _ = add(path, &lf, kind);
    Ok(())
}

fn prune(dir: &Path) {
    let limit = now_ms().saturating_sub(DAYS * 24 * 60 * 60 * 1000);
    for (i, (t, id)) in entries(dir).into_iter().enumerate() {
        if i >= KEEP || t < limit {
            let _ = fs::remove_file(dir.join(id));
        }
    }
    if entries(dir).is_empty() {
        let _ = fs::remove_dir_all(dir);
    }
}

/// 오래된 기록 정리 (프로그램을 켤 때 한 번)
pub fn prune_all() {
    if let Ok(rd) = fs::read_dir(root()) {
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() {
                prune(&p);
            }
        }
    }
}

/// 파일 이름을 바꾸면 기록도 새 이름으로 옮김 (새 이름에 기록이 이미 있으면 그대로 둠)
pub fn moved(from: &Path, to: &Path) {
    let (a, b) = (dir_of(from), dir_of(to));
    if a == b || !a.exists() || b.exists() {
        return;
    }
    if fs::rename(&a, &b).is_ok() {
        let _ = fs::write(b.join("path.txt"), to.to_string_lossy().as_bytes());
    }
}

/// 폴더 이름을 바꾸면 그 안 파일들의 기록도 옮김
pub fn moved_dir(from: &Path, to: &Path) {
    let prefix = format!("{}/", norm(from));
    let Ok(rd) = fs::read_dir(root()) else { return };
    let dirs: Vec<PathBuf> = rd.flatten().map(|e| e.path()).collect();
    for d in dirs {
        let Ok(orig) = fs::read_to_string(d.join("path.txt")) else { continue };
        let n = norm(Path::new(orig.trim()));
        let Some(rest) = n.strip_prefix(&prefix) else { continue };
        let new_path = to.join(rest);
        let nd = dir_of(&new_path);
        if nd.exists() {
            continue;
        }
        if fs::rename(&d, &nd).is_ok() {
            let _ = fs::write(nd.join("path.txt"), new_path.to_string_lossy().as_bytes());
        }
    }
}

pub fn clear(path: &Path) -> Result<(), String> {
    let dir = dir_of(path);
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}
