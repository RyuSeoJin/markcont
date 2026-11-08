// 글 파일 읽기 · 쓰기 (화면 명령 main.rs · 저장 기록 history.rs · MCP 서버 mcp.rs 가 함께 씀)
//  - 읽기: UTF-16 은 맨 앞 BOM 으로 알아보고, 그 밖에는 UTF-8 로 읽고 아니면 한글 EUC-KR(CP949)로 읽음.
//    맨 앞 BOM 은 떼고 줄 끝은 \n 으로 맞춤 (화면의 편집창(<textarea>)이 \n 으로 바꿔 담기 때문에,
//    그대로 두면 고치지 않은 줄까지 모두 바뀐 줄로 보이고 Claude가 고칠 글(여러 줄)도 찾지 못함)
//  - 쓰기: 읽을 때의 글자 방식(줄 끝 · BOM · 인코딩)으로 되돌려 씀 (저장하면서 파일이 몰래 바뀌지 않게)
//    EUC-KR 파일에 EUC-KR 에 없는 글자(이모지 · — 등)가 있으면 쓰지 않고 오류 (글자가 망가지지 않게)
use std::fs;
use std::io;
use std::path::Path;

/// 파일 인코딩
#[derive(Clone, Copy, PartialEq)]
pub enum Enc {
    Utf8,
    /// 한글 EUC-KR(CP949)
    EucKr,
    /// UTF-16 (맨 앞 BOM 으로 알아봄. 쓸 때도 늘 BOM 과 함께)
    Utf16Le,
    Utf16Be,
}

impl Enc {
    /// 화면과 주고받는 이름 ("utf-8" · "euc-kr" · "utf-16le" · "utf-16be")
    pub fn name(self) -> &'static str {
        match self {
            Enc::Utf8 => "utf-8",
            Enc::EucKr => "euc-kr",
            Enc::Utf16Le => "utf-16le",
            Enc::Utf16Be => "utf-16be",
        }
    }
    fn from_name(s: &str) -> Enc {
        match s.to_ascii_lowercase().as_str() {
            "euc-kr" => Enc::EucKr,
            "utf-16le" => Enc::Utf16Le,
            "utf-16be" => Enc::Utf16Be,
            _ => Enc::Utf8,
        }
    }
}

/// 파일의 글자 방식: 읽은 대로 기억해 두었다가 쓸 때 되돌림
#[derive(Clone, Copy)]
pub struct Format {
    /// 줄 끝 "\r\n" · "\n"
    pub eol: &'static str,
    /// 맨 앞 BOM (UTF-8 일 때만 고를 수 있음. UTF-16 은 늘 있음, EUC-KR 은 늘 없음)
    pub bom: bool,
    pub enc: Enc,
}

/// 쓸 때 정해 줄 글자 방식. None 이면 지금 파일의 방식을 따르고, 새 파일이면 받은 글의 줄 끝 · BOM 없는 UTF-8
#[derive(Clone, Copy, Default)]
pub struct Want<'a> {
    pub eol: Option<&'a str>,
    pub bom: Option<bool>,
    /// "utf-8" · "euc-kr" · "utf-16le" · "utf-16be"
    pub enc: Option<&'a str>,
}

/// 바이트 → (글(줄 끝은 그대로), BOM 이 있었는지, 인코딩)
fn decode(bytes: Vec<u8>) -> (String, bool, Enc) {
    // UTF-16 은 맨 앞 BOM(FF FE · FE FF)으로만 알아봄 (Windows PowerShell 5.1 의 Out-File · > 가 이렇게 씀)
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let (t, _) = encoding_rs::UTF_16LE.decode_with_bom_removal(&bytes);
        return (t.into_owned(), true, Enc::Utf16Le);
    }
    if bytes.starts_with(&[0xFE, 0xFF]) {
        let (t, _) = encoding_rs::UTF_16BE.decode_with_bom_removal(&bytes);
        return (t.into_owned(), true, Enc::Utf16Be);
    }
    match String::from_utf8(bytes) {
        Ok(s) => {
            let t = s.trim_start_matches('\u{feff}');
            let bom = t.len() != s.len();
            (t.to_string(), bom, Enc::Utf8)
        }
        Err(e) => {
            let b = e.into_bytes();
            // 맨 앞에 UTF-8 BOM 이 있으면(뒤에 깨진 바이트가 있어도) UTF-8 로, 없으면 EUC-KR 로 읽힘
            let (t, used, _) = encoding_rs::EUC_KR.decode(&b);
            let enc = if used == encoding_rs::EUC_KR { Enc::EucKr } else { Enc::Utf8 };
            (t.into_owned(), used == encoding_rs::UTF_8, enc)
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

/// 쓸 글자 방식 고르기: 정해 준 것 → 지금 파일의 방식(disk) → (새 파일이면) 받은 글의 줄 끝 · BOM 없는 UTF-8
pub fn pick(want: Want<'_>, disk: Option<Format>, text: &str) -> Format {
    let base = disk.unwrap_or_else(|| Format { eol: eol_of(text), bom: false, enc: Enc::Utf8 });
    Format {
        eol: match want.eol {
            Some("\r\n") => "\r\n",
            Some(_) => "\n",
            None => base.eol,
        },
        bom: want.bom.unwrap_or(base.bom),
        enc: want.enc.map(Enc::from_name).unwrap_or(base.enc),
    }
}

/// EUC-KR 에 없는 글자 (겹치지 않게 앞에서부터 5개까지)
fn not_in_euc_kr(text: &str) -> Vec<char> {
    let mut out: Vec<char> = Vec::new();
    let mut buf = [0u8; 4];
    for c in text.chars() {
        if c.is_ascii() || out.contains(&c) {
            continue;
        }
        let (_, _, bad) = encoding_rs::EUC_KR.encode(c.encode_utf8(&mut buf));
        if bad {
            out.push(c);
            if out.len() >= 5 {
                break;
            }
        }
    }
    out
}

/// 글 → 파일에 쓸 바이트 (fmt 의 줄 끝 · BOM · 인코딩). EUC-KR 파일에 EUC-KR 에 없는 글자가 있으면 오류
pub fn encode(text: &str, fmt: Format) -> io::Result<Vec<u8>> {
    let body = with_eol(text, fmt.eol);
    match fmt.enc {
        Enc::EucKr => {
            let (bytes, _, bad) = encoding_rs::EUC_KR.encode(&body);
            if bad {
                let list = not_in_euc_kr(&body).iter().map(|c| c.to_string()).collect::<Vec<_>>().join(" ");
                let msg = if crate::mcp::is_en() {
                    format!("This file is in EUC-KR (Korean), which can't hold these characters: {list}. Remove or replace them. (If the user adds such characters in markcont and saves, markcont offers to convert the file to UTF-8.)")
                } else {
                    format!("EUC-KR(한글 완성형) 파일이라 쓸 수 없는 글자가 있습니다: {list}. 그 글자를 빼거나 다른 글자로 바꾸세요. (사용자가 markcont에서 그런 글자를 넣어 저장하면 UTF-8로 바꿀지 묻습니다)")
                };
                return Err(io::Error::new(io::ErrorKind::InvalidData, msg));
            }
            Ok(bytes.into_owned())
        }
        Enc::Utf16Le | Enc::Utf16Be => {
            // encoding_rs 는 UTF-16 으로 쓰지 않으므로 직접: 맨 앞 BOM + 글의 UTF-16 단위를 바이트 순서만 맞춰
            let le = fmt.enc == Enc::Utf16Le;
            let mut out = Vec::with_capacity(body.len() * 2 + 2);
            for u in std::iter::once(0xFEFF_u16).chain(body.encode_utf16()) {
                out.extend_from_slice(&if le { u.to_le_bytes() } else { u.to_be_bytes() });
            }
            Ok(out)
        }
        Enc::Utf8 => {
            let mut out = Vec::with_capacity(body.len() + 3);
            if fmt.bom {
                out.extend_from_slice("\u{feff}".as_bytes());
            }
            out.extend_from_slice(body.as_bytes());
            Ok(out)
        }
    }
}

/// 파일 읽기 → (\n 으로 맞추고 BOM 을 뗀 글, 글자 방식)
pub fn read(path: &Path) -> io::Result<(String, Format)> {
    let (raw, bom, enc) = decode(fs::read(path)?);
    let fmt = Format { eol: eol_of(&raw), bom, enc };
    Ok((to_lf(&raw), fmt))
}

/// 파일 쓰기 (저장 기록 없이). 정하지 않은 것은 지금 파일의 방식을 따름
pub fn write(path: &Path, text: &str, want: Want<'_>) -> io::Result<()> {
    let complete = want.eol.is_some() && want.bom.is_some() && want.enc.is_some();
    let disk = if complete { None } else { read(path).ok().map(|(_, f)| f) };
    fs::write(path, encode(text, pick(want, disk, text))?)
}

// 테스트: cargo test --manifest-path src-tauri/Cargo.toml (CI 의 check.yml 이 돌림)
// 입력 바이트는 파이썬(cp949 · utf-16 코덱)으로 따로 만든 것. 같은 라이브러리로 만들고 확인하는 순환을 피함
#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, io};

    /// "# 회의록\r\n\r\n- 똠방각하 · 참석\r\n" (EUC-KR · CP949, '똠'은 완성형 밖 글자)
    const EUC_KR_CRLF: &[u8] = &[0x23, 0x20, 0xC8, 0xB8, 0xC0, 0xC7, 0xB7, 0xCF, 0x0D, 0x0A, 0x0D, 0x0A, 0x2D, 0x20, 0x8C, 0x63, 0xB9, 0xE6, 0xB0, 0xA2, 0xC7, 0xCF, 0x20, 0xA1, 0xA4, 0x20, 0xC2, 0xFC, 0xBC, 0xAE, 0x0D, 0x0A];
    /// 위 글의 "참석" 뒤에 " (고침)"을 더한 것
    const EUC_KR_CRLF_EDITED: &[u8] = &[0x23, 0x20, 0xC8, 0xB8, 0xC0, 0xC7, 0xB7, 0xCF, 0x0D, 0x0A, 0x0D, 0x0A, 0x2D, 0x20, 0x8C, 0x63, 0xB9, 0xE6, 0xB0, 0xA2, 0xC7, 0xCF, 0x20, 0xA1, 0xA4, 0x20, 0xC2, 0xFC, 0xBC, 0xAE, 0x20, 0x28, 0xB0, 0xED, 0xC4, 0xA7, 0x29, 0x0D, 0x0A];
    /// BOM + "# 문서\r\n첫째 😀\r\n" (UTF-16LE, 이모지는 서로게이트 쌍)
    const UTF16LE_CRLF: &[u8] = &[0xFF, 0xFE, 0x23, 0x00, 0x20, 0x00, 0x38, 0xBB, 0x1C, 0xC1, 0x0D, 0x00, 0x0A, 0x00, 0xAB, 0xCC, 0xF8, 0xC9, 0x20, 0x00, 0x3D, 0xD8, 0x00, 0xDE, 0x0D, 0x00, 0x0A, 0x00];
    /// BOM + "# BE\n둘째\n" (UTF-16BE)
    const UTF16BE_LF: &[u8] = &[0xFE, 0xFF, 0x00, 0x23, 0x00, 0x20, 0x00, 0x42, 0x00, 0x45, 0x00, 0x0A, 0xB4, 0x58, 0xC9, 0xF8, 0x00, 0x0A];

    /// 테스트마다 따로 쓰는 임시 파일 (끝나면 지움)
    struct Temp(std::path::PathBuf);
    impl Temp {
        fn new(name: &str, bytes: Option<&[u8]>) -> Temp {
            let p = std::env::temp_dir().join(format!("markcont-textfile-{}-{name}", std::process::id()));
            let _ = fs::remove_file(&p);
            if let Some(b) = bytes {
                fs::write(&p, b).unwrap();
            }
            Temp(p)
        }
    }
    impl Drop for Temp {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.0);
        }
    }

    /// 바이트를 읽은 그대로 다시 씀 → (\n 으로 맞춘 글, 글자 방식, 다시 쓴 바이트)
    fn roundtrip(bytes: &[u8]) -> (String, Format, Vec<u8>) {
        let (raw, bom, enc) = decode(bytes.to_vec());
        let fmt = Format { eol: eol_of(&raw), bom, enc };
        let text = to_lf(&raw);
        let out = encode(&text, fmt).unwrap();
        (text, fmt, out)
    }

    #[test]
    fn eol_detection() {
        assert_eq!(eol_of("a\r\nb\r\n"), "\r\n");
        assert_eq!(eol_of("a\nb\n"), "\n");
        assert_eq!(eol_of(""), "\n");
        assert_eq!(eol_of("한 줄"), "\n");
        assert_eq!(eol_of("a\r\nb\nc\r\n"), "\r\n"); // 많이 쓴 쪽
        assert_eq!(eol_of("a\r\nb\nc\n"), "\n");
        assert_eq!(eol_of("a\r\nb\n"), "\n"); // 같으면 \n
    }

    #[test]
    fn line_endings_normalize_and_restore() {
        assert_eq!(to_lf("a\r\nb\rc\n"), "a\nb\nc\n");
        assert_eq!(to_lf("a\nb"), "a\nb");
        assert_eq!(with_eol("a\nb\n", "\r\n"), "a\r\nb\r\n");
        assert_eq!(with_eol("a\r\nb\n", "\r\n"), "a\r\nb\r\n"); // 섞여 있어도 한쪽으로
        assert_eq!(with_eol("a\r\nb\r\n", "\n"), "a\nb\n");
    }

    #[test]
    fn utf8_without_bom_roundtrip() {
        let src = "# 제목\n본문 \u{1F600}\n";
        let (text, fmt, out) = roundtrip(src.as_bytes());
        assert_eq!(text, src);
        assert!(fmt.enc == Enc::Utf8 && !fmt.bom && fmt.eol == "\n");
        assert_eq!(out, src.as_bytes());
    }

    #[test]
    fn utf8_with_bom_and_crlf_roundtrip() {
        let src = "\u{feff}# 제목\r\n본문\r\n";
        let (text, fmt, out) = roundtrip(src.as_bytes());
        assert_eq!(text, "# 제목\n본문\n");
        assert!(fmt.enc == Enc::Utf8 && fmt.bom && fmt.eol == "\r\n");
        assert_eq!(out, src.as_bytes());
    }

    #[test]
    fn euc_kr_roundtrip() {
        let (text, fmt, out) = roundtrip(EUC_KR_CRLF);
        assert_eq!(text, "# 회의록\n\n- 똠방각하 · 참석\n");
        assert!(fmt.enc == Enc::EucKr && !fmt.bom && fmt.eol == "\r\n");
        assert_eq!(out, EUC_KR_CRLF);
    }

    #[test]
    fn euc_kr_edit_keeps_encoding() {
        let (text, fmt, _) = roundtrip(EUC_KR_CRLF);
        let edited = text.replace("참석", "참석 (고침)");
        assert_eq!(encode(&edited, fmt).unwrap(), EUC_KR_CRLF_EDITED);
    }

    #[test]
    fn euc_kr_refuses_characters_it_cannot_hold() {
        let (text, fmt, _) = roundtrip(EUC_KR_CRLF);
        let err = encode(&(text + "끝 \u{2705} — \u{1F4CC}\n"), fmt).unwrap_err();
        assert_eq!(err.kind(), io::ErrorKind::InvalidData);
        let msg = err.to_string();
        assert!(msg.contains('\u{2705}') && msg.contains('—') && msg.contains('\u{1F4CC}'), "{msg}");
    }

    #[test]
    fn utf16le_roundtrip() {
        let (text, fmt, out) = roundtrip(UTF16LE_CRLF);
        assert_eq!(text, "# 문서\n첫째 \u{1F600}\n");
        assert!(fmt.enc == Enc::Utf16Le && fmt.bom && fmt.eol == "\r\n");
        assert_eq!(out, UTF16LE_CRLF);
    }

    #[test]
    fn utf16be_roundtrip() {
        let (text, fmt, out) = roundtrip(UTF16BE_LF);
        assert_eq!(text, "# BE\n둘째\n");
        assert!(fmt.enc == Enc::Utf16Be && fmt.bom && fmt.eol == "\n");
        assert_eq!(out, UTF16BE_LF);
    }

    #[test]
    fn pick_prefers_given_then_disk_then_defaults() {
        let disk = Format { eol: "\r\n", bom: false, enc: Enc::EucKr };
        // 정하지 않은 것은 지금 파일의 방식
        let f = pick(Want::default(), Some(disk), "a\n");
        assert!(f.eol == "\r\n" && !f.bom && f.enc == Enc::EucKr);
        // 정해 준 것이 먼저
        let f = pick(Want { eol: Some("\n"), bom: Some(true), enc: Some("utf-8") }, Some(disk), "a\n");
        assert!(f.eol == "\n" && f.bom && f.enc == Enc::Utf8);
        // 새 파일: 받은 글의 줄 끝, BOM 없는 UTF-8
        let f = pick(Want::default(), None, "a\r\nb\r\n");
        assert!(f.eol == "\r\n" && !f.bom && f.enc == Enc::Utf8);
        assert!(Enc::from_name("UTF-16LE") == Enc::Utf16Le && Enc::from_name("euc-kr") == Enc::EucKr && Enc::from_name("?") == Enc::Utf8);
    }

    #[test]
    fn write_keeps_existing_file_format() {
        // 화면 · MCP 가 \n 글을 넘겨도 원래 파일의 글자 방식(EUC-KR · CRLF / UTF-16LE · CRLF)을 지킴
        let euc = Temp::new("euc.md", Some(EUC_KR_CRLF));
        let (text, fmt) = read(&euc.0).unwrap();
        assert!(fmt.enc == Enc::EucKr && fmt.eol == "\r\n");
        write(&euc.0, &text.replace("참석", "참석 (고침)"), Want::default()).unwrap();
        assert_eq!(fs::read(&euc.0).unwrap(), EUC_KR_CRLF_EDITED);

        let utf16 = Temp::new("utf16.md", Some(UTF16LE_CRLF));
        let (text, _) = read(&utf16.0).unwrap();
        write(&utf16.0, &text, Want::default()).unwrap();
        assert_eq!(fs::read(&utf16.0).unwrap(), UTF16LE_CRLF);
    }

    #[test]
    fn unencodable_write_leaves_file_untouched() {
        let t = Temp::new("euc-bad.md", Some(EUC_KR_CRLF));
        assert!(write(&t.0, "이모지 \u{1F600}\n", Want::default()).is_err());
        assert_eq!(fs::read(&t.0).unwrap(), EUC_KR_CRLF);
    }

    #[test]
    fn new_file_is_plain_utf8() {
        let t = Temp::new("new.md", None);
        write(&t.0, "# 새 문서\n", Want::default()).unwrap();
        assert_eq!(fs::read(&t.0).unwrap(), "# 새 문서\n".as_bytes());
    }
}
