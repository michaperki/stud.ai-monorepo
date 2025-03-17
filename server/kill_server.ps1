
# kill_uvicorn.ps1

$connections = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
            Write-Host "Killing process using port 8000 (PID: $pid)..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
        else {
            Write-Host "Process with PID $pid not found or already stopped."
        }
    }
} else {
    Write-Host "No process found on port 8000."
}

