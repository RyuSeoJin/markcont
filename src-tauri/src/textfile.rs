// 글 파일 읽기 · 쓰기 (화면 명령 main.rs · 저장 기록 history.rs · MCP 서버 mcp.rs 가 함께 씀)
//  - 글자: UTF-8 로 읽고, 아니면 한글 EUC-KR(CP949)로 읽음 (맨 앞 BOM 은 뗌)
//  - 줄 끝: 읽은 글은 \r\n 을 \n 으로 맞춤. 화면의 편집창(<textarea>)이 \n 으로 바꿔 담기 때문에,
//    그대로 두면 고치지 않은 줄까지 모두 바뀐 줄로 보이고, Claude가 고칠 글(여러 줄)도 찾지 못함
//  - 쓸 때는 원래 줄 끝으로 되돌림 (Windows 에서 만든 \r\n 파일이 저장하면서 몰래 \n 으로 바뀌지 않게)
use std::fs;
use std::io;
use std::path::Path;

/// UTF-8 로 읽고, 아니면 한글 EUC-KR(CP949)로 읽습니다.
pub fn decode(bytes: Vec<u8>) -> String {
    match String::from_utf8(bytes) {
        Ok(s) => s.trim_start_matches('\u{feff}').to_string(),
        Err(e) => {
            let b = e.into_bytes();
            let (t, _, _) = encoding_rs::EUC_KR.decode(&b);
            t.into_owned()
        }
    }
}

/// 글이 주로 쓰는 줄 끝: \r\n 이 줄바꿈의 절반을 넘으면 "\r\n", 아니면 "\n" (app/index.html 의 eolOf 와 같음)
pub fn eol_of(s: &str) -> &'static str {
    let crlf = s.matches("\r\n").count();
    if crlf > 0 && crlf * 2 > s.matches('\n').count() {
        "\r\n"
    } else {
        "\n"
    }
}

/// 줄 끝을 모두 \n 으로 (\r\n 과 홀로 쓴 \r 도. 편집창과 같게)
pub fn to_lf(s: &str) -> String {
    if s.contains('\r') {
        s.replace("\r\n", "\n").replace('\r', "\n")
    } else {
        s.to_string()
    }
}

/// \n 줄 끝을 eol 로
pub fn with_eol(s: &str, eol: &str) -> String {
    let lf = to_lf(s);
    if eol == "\r\n" {
        lf.replace('\n', "\r\n")
    } else {
        lf
    }
}

/// 쓸 줄 끝 고르기: 정해 준 것 → 지금 파일의 줄 끝(disk) → (새 파일이면) 받은 글의 줄 끝
pub fn pick_eol(eol: Option<&str>, disk: Option<&'static str>, text: &str) -> &'static str {
    match eol {
        Some("\r\n") => "\r\n",
        Some(_) => "\n",
        None => disk.unwrap_or_else(|| eol_of(text)),
    }
}

/// 파일 읽기 → (\n 으로 맞춘 글, 원래 줄 끝)
pub fn read(path: &Path) -> io::Result<(String, &'static str)> {
    let raw = decode(fs::read(path)?);
    let eol = eol_of(&raw);
    Ok((to_lf(&raw), eol))
}

/// 파일 쓰기 (저장 기록 없이). eol 이 없으면 지금 파일의 줄 끝을 따름
pub fn write(path: &Path, text: &str, eol: Option<&str>) -> io::Result<()> {
    let disk = if eol.is_none() { read(path).ok().map(|(_, e)| e) } else { None };
    fs::write(path, with_eol(text, pick_eol(eol, disk, text)))
}
