#!/bin/bash

# Time Clock Deployment Script
set -e

echo "🚀 Starting Time Clock deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data
mkdir -p ssl

# Build and start the application
print_status "Building Docker images..."
docker-compose build --no-cache

print_status "Starting the application..."
docker-compose up -d

# Wait for the application to start
print_status "Waiting for application to start..."
sleep 10

# Check if the application is running
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_status "✅ Application is running successfully!"
    print_status "📱 Access your Time Clock at: http://localhost:3000"
    print_status "🏥 Health check: http://localhost:3000/api/health"
else
    print_error "❌ Application failed to start properly"
    print_warning "Check logs with: docker-compose logs"
    exit 1
fi

# Display useful commands
echo ""
print_status "📋 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop application: docker-compose down"
echo "  - Restart application: docker-compose restart"
echo "  - View container status: docker-compose ps"
echo ""

print_status "🎉 Deployment completed successfully!"