
$running = netstat -ano | Select-String ":8000"
if ($running) {
    Write-Host "Uvicorn is already running on port 8000. Not starting another instance."
} else {
    uvicorn main:app --reload --log-level debug
}
