# Deployment Script
echo "Starting Hyperledger Fabric Network..."
cd network
.\network.sh down
.\network.sh up createChannel -c ridechannel -ca

echo "Deploying Chaincode..."
.\network.sh deployCC -ccn ridecontract -ccp ..\chaincode -ccl go

echo "Installing Backend Dependencies..."
cd ..\backend
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env file. Please configure it." -ForegroundColor Yellow
}
npm install

echo "Installing Frontend Dependencies..."
cd ..\frontend
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
}
npm install

Write-Host "`nDeployment Complete!" -ForegroundColor Green
Write-Host "`nTo start the application:" -ForegroundColor Blue
Write-Host "1. Backend:  cd backend; npm start" -ForegroundColor Cyan
Write-Host "2. Frontend: cd frontend; npm start" -ForegroundColor Cyan
Write-Host "`nOptional - Start n8n:" -ForegroundColor Blue
Write-Host "docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n" -ForegroundColor Cyan
