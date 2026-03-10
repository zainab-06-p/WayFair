# Enable Blockchain for Cab Application
# This script deploys chaincode using external builder (no Docker build needed)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   Blockchain Enablement Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Fabric network is running
Write-Host "[1/5] Checking Fabric network..." -ForegroundColor Yellow
$containers = wsl -d Ubuntu -- docker ps --format "{{.Names}}" | Select-String -Pattern "peer|orderer"
if ($containers.Count -lt 3) {
    Write-Host "  ✗ Fabric network not running!" -ForegroundColor Red
    Write-Host "  Starting network..." -ForegroundColor Yellow
    wsl -d Ubuntu -- bash -c "cd ~/fabric-samples/test-network && ./network.sh up createChannel -c ridechannel -ca"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to start network" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Network started" -ForegroundColor Green
} else {
    Write-Host "  ✓ Network is running" -ForegroundColor Green
}
Write-Host ""

# Step 2: Deploy external chaincode
Write-Host "[2/5] Deploying chaincode..." -ForegroundColor Yellow
Write-Host "  This will take 2-3 minutes..." -ForegroundColor Gray
$result = wsl -d Ubuntu -- bash /mnt/d/HF/scripts/deploy-external-chaincode.sh 2>&1
Write-Host $result
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Chaincode deployment failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if Go is installed: wsl -d Ubuntu -- go version"
    Write-Host "  2. Check chaincode logs: wsl -d Ubuntu -- tail -f ~/fabric-samples/chaincode/rideshare/chaincode.log"
    Write-Host "  3. Check network: wsl -d Ubuntu -- docker ps"
    exit 1
}
Write-Host "  ✓ Chaincode deployed successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Verify deployment
Write-Host "[3/5] Verifying chaincode..." -ForegroundColor Yellow
$committed = wsl -d Ubuntu -- bash -c "
export PATH=/home/fabricuser/fabric-samples/bin:\$PATH
cd ~/fabric-samples/test-network
peer lifecycle chaincode querycommitted --channelID ridechannel --name rideshare
"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Chaincode is committed to channel" -ForegroundColor Green
} else {
    Write-Host "  ✗ Verification failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Update .env file
Write-Host "[4/5] Enabling blockchain in backend..." -ForegroundColor Yellow
$envPath = "D:\HF\backend\.env"
$envContent = Get-Content $envPath
$envContent = $envContent -replace "ENABLE_FABRIC=false", "ENABLE_FABRIC=true"
$envContent | Set-Content $envPath
Write-Host "  ✓ Updated .env file (ENABLE_FABRIC=true)" -ForegroundColor Green
Write-Host ""

# Step 5: Instructions for backend restart
Write-Host "[5/5] Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend needs to be restarted. Run:" -ForegroundColor Cyan
Write-Host "    cd D:\HF\backend" -ForegroundColor White
Write-Host "    node server.js" -ForegroundColor White
Write-Host ""
Write-Host "  Or if already running, stop it first:" -ForegroundColor Cyan
Write-Host "    Get-Process node | Where-Object {`$_.Path -like '*HF*'} | Stop-Process" -ForegroundColor White
Write-Host "    cd D:\HF\backend" -ForegroundColor White
Write-Host "    node server.js" -ForegroundColor White
Write-Host ""

Write-Host "======================================" -ForegroundColor Green
Write-Host "   ✅ BLOCKCHAIN ENABLED!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  Check chaincode status: wsl -d Ubuntu -- bash /mnt/d/HF/scripts/check-chaincode-status.sh" -ForegroundColor Gray
Write-Host "  Test chaincode: wsl -d Ubuntu -- bash /mnt/d/HF/scripts/test-chaincode.sh" -ForegroundColor Gray
Write-Host "  View logs: wsl -d Ubuntu -- tail -f ~/fabric-samples/chaincode/rideshare/chaincode.log" -ForegroundColor Gray
Write-Host ""
