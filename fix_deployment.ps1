# This script is used to perform a clean deployment by tearing down existing containers,
# pruning unused Docker artifacts (to avoid caching issues and free up space),
# and then rebuilding and starting the application with the local environment configuration.
# Clean up function
Write-Host "Cleaning up Docker artifacts..."
docker compose down
docker system prune -f

# Build and run
Write-Host "Building and starting..."
docker compose --env-file .env.local up --build
