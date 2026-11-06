# markcont 설치 (Windows)
# PowerShell 에 붙여 넣고 실행:
#   irm https://raw.githubusercontent.com/RyuSeoJin/markcont/main/install.ps1 | iex
#
# GitHub Releases 의 최신 Windows 설치 파일(-setup.exe)을 받아 설치 창을 엽니다.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repo = 'RyuSeoJin/markcont'

Write-Host 'markcont 최신 버전을 찾는 중...'
$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -Headers @{ 'User-Agent' = 'markcont-installer' }
$asset = $release.assets | Where-Object { $_.name -like '*x64-setup.exe' } | Select-Object -First 1
if (-not $asset) { throw "Windows 설치 파일을 찾지 못했습니다. https://github.com/$repo/releases 에서 직접 받아 주세요." }

if ($env:MARKCONT_DRY_RUN) {
    Write-Host "[확인만] $($release.tag_name) $($asset.browser_download_url)"
    return
}

$out = Join-Path $env:TEMP $asset.name
Write-Host "$($release.tag_name) 내려받는 중: $($asset.name)"
Invoke-WebRequest $asset.browser_download_url -OutFile $out -UseBasicParsing
Write-Host '설치 창을 엽니다. "Windows의 PC 보호" 창이 뜨면 [추가 정보] -> [실행]을 누르세요.'
Start-Process -FilePath $out -Wait
Remove-Item $out -ErrorAction SilentlyContinue
Write-Host 'markcont 설치가 끝났습니다. 시작 메뉴에서 markcont 를 찾거나 .md 파일을 더블클릭하세요.'
