"""app/vendor 에 복사해 둔 라이브러리의 보안 공지 확인

Dependabot · npm audit 은 복사해 둔 파일을 보지 못하므로, scripts/vendor-versions.json 의 버전을
GitHub 보안 공지 데이터베이스(GET /advisories?affects=패키지@버전)에 직접 물어봅니다.

  python scripts/vendor_advisories.py              확인만 (새 공지나 목록 어긋남이 있으면 종료 코드 1)
  python scripts/vendor_advisories.py --issue      + 이슈 열기 · 고치기 · 닫기 (GitHub Actions 에서 매주)
  python scripts/vendor_advisories.py --manifest 다른.json   다른 목록으로 확인 (시험용)

필요한 것: GitHub CLI(gh) 로그인, 또는 GH_TOKEN 환경 변수. 파이썬 기본 라이브러리만 씀.
"""
import argparse
import concurrent.futures
import json
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ISSUE_TITLE = '라이브러리 보안 공지 확인 필요 (app/vendor)'
SEVERITY = {'critical': 0, 'high': 1, 'medium': 2, 'moderate': 2, 'low': 3}


def gh(args, input_text=None):
    r = subprocess.run(['gh', *args], capture_output=True, text=True, encoding='utf-8', input=input_text)
    if r.returncode != 0:
        raise RuntimeError(f'gh {" ".join(args[:3])} 실패: {r.stderr.strip()}')
    return r.stdout


def split_spec(spec):
    """"@scope/name@1.2.3" → ("@scope/name", "1.2.3")"""
    name, _, version = spec.rpartition('@')
    if not name or not version:
        raise ValueError(f'"이름@버전" 형식이 아닙니다: {spec}')
    return name, version


def targets(manifest):
    """확인할 (패키지, 버전, 들어 있는 곳) 목록"""
    out = []
    for lib in manifest['libraries']:
        out.append((lib['package'], lib['version'], lib['package']))
        for spec in lib.get('bundled', []):
            name, version = split_spec(spec)
            out.append((name, version, f'{lib["package"]} 안'))
    return out


def check_markers(manifest):
    """목록의 버전과 실제 파일이 맞는지 (파일 안에 marker 글이 있는지)"""
    problems = []
    for lib in manifest['libraries']:
        rel = lib.get('file')
        if not rel:
            continue
        path = ROOT / rel
        if not path.is_file():
            problems.append(f'`{rel}` 파일이 없습니다')
            continue
        marker = lib.get('marker', lib['version'])
        if marker not in path.read_text(encoding='utf-8', errors='replace'):
            problems.append(f'`{rel}` 안에 `{marker}` 가 없습니다. 파일을 바꿨다면 `scripts/vendor-versions.json` 의 '
                            f'{lib["package"]} 버전 · marker 도 고치세요')
    return problems


def advisories(package, version):
    """이 버전에 해당하는 공지 (철회된 것은 뺌)"""
    text = gh(['api', '--paginate', '-X', 'GET', 'advisories', '-f', 'ecosystem=npm', '-f', f'affects={package}@{version}',
               '-f', 'per_page=100', '--jq', '.[] | tojson'])
    found = [json.loads(line) for line in text.splitlines() if line.strip()]
    return [a for a in found if not a.get('withdrawn_at')]


def scan(manifest):
    reviewed = {(r['ghsa'], r['package'], r['version']): r for r in manifest.get('reviewed', [])}
    items = targets(manifest)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(lambda t: advisories(t[0], t[1]), items))
    new, skipped, used = [], [], set()
    for (package, version, where), found in zip(items, results):
        for a in found:
            fixes = sorted({v.get('first_patched_version') for v in a.get('vulnerabilities') or []
                            if (v.get('package') or {}).get('name') == package and v.get('first_patched_version')})
            row = {
                'ghsa': a['ghsa_id'], 'cve': a.get('cve_id') or '', 'severity': a.get('severity') or '',
                'summary': a.get('summary') or '', 'url': a.get('html_url') or '',
                'package': package, 'version': version, 'where': where, 'fix': ', '.join(fixes) or '없음',
            }
            key = (row['ghsa'], package, version)
            if key in reviewed:
                used.add(key)
                skipped.append({**row, 'reason': reviewed[key].get('reason', '')})
            else:
                new.append(row)
    order = lambda r: (SEVERITY.get(r['severity'], 9), r['package'], r['ghsa'])
    stale = [r for key, r in reviewed.items() if key not in used]
    return sorted(new, key=order), sorted(skipped, key=order), stale, len(items)


def cell(text):
    return str(text).replace('|', '\\|').replace('\n', ' ')


def report(new, skipped, stale, problems, count):
    lines = ['## 라이브러리 보안 공지 확인 (app/vendor)', '',
             f'`scripts/vendor-versions.json` 의 라이브러리 {count}개(다른 파일 안에 묶인 것 포함)를 GitHub 보안 공지와 맞춰 봤습니다.', '']
    if problems:
        lines += ['### 목록과 파일이 어긋남', ''] + [f'- {p}' for p in problems] + ['']
    if new:
        lines += [f'### 확인이 필요한 공지 ({len(new)}건)', '',
                  '| 심각도 | 패키지 | 들어 있는 곳 | 공지 | 고친 버전 | 내용 |', '|:---|:---|:---|:---|:---|:---|']
        for r in new:
            ids = f'[{r["ghsa"]}]({r["url"]})' + (f' {r["cve"]}' if r['cve'] else '')
            lines.append(f'| {r["severity"]} | {cell(r["package"])}@{r["version"]} | {cell(r["where"])} | {ids} | {cell(r["fix"])} | {cell(r["summary"])} |')
        lines += ['', '처리 방법:',
                  '- markcont 에 해당하면: `app/vendor` 의 파일을 고친 버전으로 바꾸고 `scripts/vendor-versions.json` 의 버전도 고칩니다 '
                  '(다른 라이브러리 안에 묶인 것이면 그 라이브러리를 올립니다).',
                  '- 해당하지 않으면(쓰지 않는 기능 · 옵션 등): 이유를 적어 `scripts/vendor-versions.json` 의 `reviewed` 에 넣습니다.', '']
    if not problems and not new:
        lines += ['확인이 필요한 공지가 없습니다.', '']
    if skipped:
        lines += [f'<details><summary>검토해서 건너뛴 공지 ({len(skipped)}건)</summary>', '',
                  '| 공지 | 패키지 | 들어 있는 곳 | 건너뛴 이유 |', '|:---|:---|:---|:---|']
        lines += [f'| [{r["ghsa"]}]({r["url"]}) | {cell(r["package"])}@{r["version"]} | {cell(r["where"])} | {cell(r["reason"])} |' for r in skipped]
        lines += ['', '</details>', '']
    if stale:
        lines += ['검토 기록 중 지금 버전에는 더 이상 나오지 않는 것 (지워도 됩니다): '
                  + ', '.join(f'{r["ghsa"]} ({r["package"]}@{r["version"]})' for r in stale), '']
    if os.environ.get('GITHUB_RUN_ID'):
        url = f'{os.environ.get("GITHUB_SERVER_URL", "https://github.com")}/{os.environ.get("GITHUB_REPOSITORY")}/actions/runs/{os.environ["GITHUB_RUN_ID"]}'
        lines += [f'확인한 실행: {url}', '']
    return '\n'.join(lines)


def sync_issue(body, has_problems):
    """확인할 것이 있으면 이슈를 열거나 고치고(바뀌면 댓글로 알림), 없으면 열린 이슈를 닫음"""
    repo = os.environ.get('GITHUB_REPOSITORY')
    base = ['--repo', repo] if repo else []
    listed = json.loads(gh(['issue', 'list', *base, '--state', 'open', '--search', f'"{ISSUE_TITLE}" in:title',
                            '--json', 'number,title,body', '--limit', '20']))
    mine = [i for i in listed if i['title'] == ISSUE_TITLE]
    if has_problems:
        if not mine:
            print('이슈를 열었습니다:', gh(['issue', 'create', *base, '--title', ISSUE_TITLE, '--body-file', '-'], body).strip())
            return
        num = str(mine[0]['number'])
        # "확인한 실행" 줄만 다른 것은 바뀐 것으로 보지 않음
        same = lambda t: '\n'.join(l for l in (t or '').strip().splitlines() if not l.startswith('확인한 실행:'))
        if same(mine[0]['body']) != same(body):
            gh(['issue', 'edit', num, *base, '--body-file', '-'], body)
            gh(['issue', 'comment', num, *base, '--body', '확인 결과가 바뀌어 본문을 새로 고쳤습니다. (자동 확인)'])
            print(f'이슈 #{num} 를 새 결과로 고쳤습니다')
        else:
            print(f'이슈 #{num} 와 결과가 같습니다')
    else:
        for issue in mine:
            gh(['issue', 'close', str(issue['number']), *base, '--comment', '지금은 확인이 필요한 공지가 없습니다. (자동 확인)'])
            print(f'이슈 #{issue["number"]} 를 닫았습니다')


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description='app/vendor 라이브러리의 보안 공지 확인')
    ap.add_argument('--manifest', default=str(ROOT / 'scripts' / 'vendor-versions.json'))
    ap.add_argument('--issue', action='store_true', help='결과에 따라 GitHub 이슈를 열기 · 고치기 · 닫기')
    args = ap.parse_args()

    manifest = json.loads(pathlib.Path(args.manifest).read_text(encoding='utf-8'))
    problems = check_markers(manifest)
    new, skipped, stale, count = scan(manifest)
    body = report(new, skipped, stale, problems, count)
    print(body)
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as f:
            f.write(body + '\n')
    if args.issue:
        sync_issue(body, bool(new or problems))
    return 1 if (new or problems) else 0


if __name__ == '__main__':
    sys.exit(main())
