// 새 버전 확인 · 설치 (PC 프로그램)
// GitHub Releases 의 latest.json 을 읽고, 서명(tauri.conf.json 의 pubkey)이 맞는 파일만 설치합니다.
// 화면에는 업데이트 플러그인 권한을 열지 않고, 아래 명령 세 개로만 씁니다.

use serde::Serialize;
use std::sync::Mutex;
use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::mcp;

/// 내려받기 페이지 (Linux .deb · .rpm 처럼 바로 설치할 수 없을 때)
const RELEASES_URL: &str = "https://github.com/RyuSeoJin/markcont/releases/latest";

/// 마지막으로 확인한 새 버전 (설치 단추를 누르면 이것을 받음)
#[derive(Default)]
pub struct Pending(Mutex<Option<Update>>);

#[derive(Serialize)]
pub struct UpdateInfo {
    version: String,
    current: String,
    /// 그 버전의 Releases 설명 (바뀐 점 파일을 못 읽었을 때 대신 보여 줌)
    notes: Option<String>,
    /// 이 컴퓨터에서 바로 설치할 수 있는지 (Linux 는 AppImage 일 때만)
    can_install: bool,
}

#[derive(Clone, Serialize)]
pub struct Progress {
    done: u64,
    total: Option<u64>,
}

fn can_install_here() -> bool {
    #[cfg(target_os = "linux")]
    {
        std::env::var_os("APPIMAGE").is_some()
    }
    #[cfg(not(target_os = "linux"))]
    {
        true
    }
}

/// 새 버전이 있으면 그 정보를, 없으면 None
#[tauri::command]
pub async fn update_check(app: AppHandle, pending: State<'_, Pending>) -> Result<Option<UpdateInfo>, String> {
    let found = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    let info = found.as_ref().map(|u| UpdateInfo {
        version: u.version.clone(),
        current: u.current_version.clone(),
        notes: u.body.clone(),
        can_install: can_install_here(),
    });
    *pending.0.lock().map_err(|e| e.to_string())? = found;
    Ok(info)
}

/// 확인해 둔 새 버전을 내려받아 설치하고 다시 켬.
/// Windows 는 설치 창이 뜨면서 이 프로그램이 닫히고, 설치가 끝나면 다시 켜집니다.
#[tauri::command]
pub async fn update_install(app: AppHandle, pending: State<'_, Pending>, on_progress: Channel<Progress>) -> Result<(), String> {
    if !can_install_here() {
        return Err(mcp::tr("이 설치 방식은 여기서 바로 업데이트할 수 없습니다", "This install can't be updated from here").into());
    }
    let update = pending
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .take()
        .ok_or_else(|| mcp::tr("먼저 새 버전을 확인하세요", "Check for updates first").to_string())?;
    let mut done: u64 = 0;
    update
        .download_and_install(
            |chunk, total| {
                done += chunk as u64;
                let _ = on_progress.send(Progress { done, total });
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string())?;
    app.restart();
}

/// 내려받기 페이지를 기본 브라우저로 엶 (주소는 위에 고정)
#[tauri::command]
pub fn update_open_page() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let cmd = std::process::Command::new("explorer").arg(RELEASES_URL).spawn();
    #[cfg(target_os = "macos")]
    let cmd = std::process::Command::new("open").arg(RELEASES_URL).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let cmd = std::process::Command::new("xdg-open").arg(RELEASES_URL).spawn();
    cmd.map(|_| ()).map_err(|e| e.to_string())
}
