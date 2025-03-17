
# start_server.ps1

$running = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "Uvicorn is already running on port 8000. Not starting another instance."
} else {
    uvicorn main:app --reload --log-level debug
}

