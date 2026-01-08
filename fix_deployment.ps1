# Clean up function
Write-Host "Cleaning up Docker artifacts..."
docker compose down
docker system prune -f

# Build and run
Write-Host "Building and starting..."
docker compose --env-file .env.local up --build
