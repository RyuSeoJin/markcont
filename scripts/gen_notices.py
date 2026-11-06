"""PC 프로그램에 들어가는 Rust 라이브러리의 라이선스 목록 · 원문을 app/docs/licenses.md · licenses.en.md 끝에 붙입니다.
GitHub Actions 에서 설치 파일을 만들기 직전에 실행합니다 (cargo fetch 다음).
"""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
meta = json.loads(subprocess.check_output(
    ['cargo', 'metadata', '--format-version', '1', '--manifest-path', str(ROOT / 'src-tauri' / 'Cargo.toml')]
))
root_id = meta['resolve']['root']
used = {n['id'] for n in meta['resolve']['nodes']}
pkgs = sorted((p for p in meta['packages'] if p['id'] in used and p['id'] != root_id), key=lambda p: (p['name'], p['version']))

TEXT = {
    'ko': dict(h2='## PC 프로그램에 들어간 라이브러리',
               lead='설치 파일을 만들 때 자동으로 만든 목록입니다 ({n}개). 각 라이브러리의 저작권은 해당 저작자에게 있습니다.',
               head='| 라이브러리 | 버전 | 라이선스 | 저작자 |', none='(원문 참고)',
               h3='### 라이선스 원문', click='라이브러리 이름을 누르면 원문이 펼쳐집니다.'),
    'en': dict(h2='## Libraries in the PC app',
               lead='This list is generated automatically when the installer is built ({n} libraries). Each library is copyrighted by its authors.',
               head='| Library | Version | License | Authors |', none='(see license text)',
               h3='### License texts', click='Click a library name to expand its license text.'),
}


def table(t):
    out = ['', t['h2'], '', t['lead'].format(n=len(pkgs)), '', t['head'], '|:---|:---|:---|:---|']
    for p in pkgs:
        authors = ', '.join(a.split('<')[0].strip() for a in (p.get('authors') or []))
        if len(authors) > 80:
            authors = authors[:77] + '…'
        lic = p.get('license') or t['none']
        out.append(f"| {p['name']} | {p['version']} | {lic.replace('|', '/')} | {authors.replace('|', '/')} |")
    return out


# 라이선스 원문: 같은 내용끼리 묶어서 한 번씩만
texts = {}
for p in pkgs:
    d = pathlib.Path(p['manifest_path']).parent
    if not d.is_dir():
        continue
    for f in sorted(d.iterdir()):
        if f.is_file() and f.name.upper().startswith(('LICENSE', 'LICENCE', 'COPYING')):
            try:
                t = f.read_text(encoding='utf-8', errors='replace').strip()
            except OSError:
                continue
            if t:
                texts.setdefault(t, set()).add(p['name'])
for lang, fname in (('ko', 'licenses.md'), ('en', 'licenses.en.md')):
    t = TEXT[lang]
    lines = table(t)
    if texts:
        lines += ['', t['h3'], '', t['click'], '']
        for txt, names in sorted(texts.items(), key=lambda kv: (-len(kv[1]), sorted(kv[1])[0])):
            label = ', '.join(sorted(names))
            if len(label) > 300:
                label = label[:297] + '…'
            lines += [f'<details><summary>{label}</summary>', '', '```text', txt.replace('```', "'''"), '```', '', '</details>', '']
    out = ROOT / 'app' / 'docs' / fname
    with out.open('a', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
print(f'licenses.md / licenses.en.md: {len(pkgs)} crates, {len(texts)} license texts')
