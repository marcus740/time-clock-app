#!/bin/bash

# Cloud Deployment Script for Time Clock Application
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Configuration
APP_NAME="time-clock-app"
REGISTRY="ghcr.io/$(whoami)/${APP_NAME}"
VERSION="latest"

print_header "🚀 Starting Cloud Deployment for Time Clock Application"

# Check required tools
print_status "Checking required tools..."
required_tools=("docker" "git")

for tool in "${required_tools[@]}"; do
    if ! command -v $tool &> /dev/null; then
        print_error "$tool is not installed. Please install $tool first."
        exit 1
    fi
done

print_status "All required tools are available ✅"

# Option 1: Deploy to Railway
deploy_to_railway() {
    print_header "🚂 Deploying to Railway"
    
    if ! command -v railway &> /dev/null; then
        print_status "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    print_status "Initializing Railway project..."
    railway login
    railway init
    
    # Create railway.json configuration
    cat > railway.json << EOF
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
EOF
    
    print_status "Deploying to Railway..."
    railway up
    
    print_status "✅ Deployed to Railway successfully!"
    railway status
}

# Option 2: Deploy to Render
deploy_to_render() {
    print_header "🎨 Preparing for Render deployment"
    
    # Create render.yaml configuration
    cat > render.yaml << EOF
services:
  - type: web
    name: ${APP_NAME}
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /api/health
EOF
    
    print_status "✅ Render configuration created!"
    print_status "Next steps for Render:"
    echo "  1. Push your code to GitHub"
    echo "  2. Connect your GitHub repo to Render"
    echo "  3. Deploy using the render.yaml configuration"
}

# Option 3: Deploy to Heroku
deploy_to_heroku() {
    print_header "🟣 Deploying to Heroku"
    
    if ! command -v heroku &> /dev/null; then
        print_error "Heroku CLI is not installed. Please install it first."
        return 1
    fi
    
    # Login to Heroku
    heroku login
    
    # Create Heroku app
    print_status "Creating Heroku app..."
    heroku create $APP_NAME-$(date +%s)
    
    # Set environment variables
    heroku config:set NODE_ENV=production
    
    # Add Procfile
    echo "web: npm start" > Procfile
    
    # Deploy
    print_status "Deploying to Heroku..."
    git add .
    git commit -m "Deploy to Heroku" || true
    git push heroku main
    
    print_status "✅ Deployed to Heroku successfully!"
    heroku open
}

# Option 4: Deploy to DigitalOcean App Platform
deploy_to_digitalocean() {
    print_header "🌊 Preparing for DigitalOcean App Platform deployment"
    
    # Create DigitalOcean App Platform spec
    cat > .do/app.yaml << EOF
name: ${APP_NAME}
services:
- name: web
  source_dir: /
  github:
    repo: your-username/time-clock-app
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  http_port: 3000
  health_check:
    http_path: /api/health
  routes:
  - path: /
EOF
    
    mkdir -p .do
    
    print_status "✅ DigitalOcean configuration created!"
    print_status "Next steps for DigitalOcean:"
    echo "  1. Push your code to GitHub"
    echo "  2. Create app on DigitalOcean App Platform"
    echo "  3. Connect your GitHub repo"
    echo "  4. Use the .do/app.yaml specification"
}

# Option 5: Deploy using Docker to any VPS
deploy_to_vps() {
    print_header "🖥️  Preparing for VPS deployment"
    
    read -p "Enter your VPS IP address: " VPS_IP
    read -p "Enter your VPS username: " VPS_USER
    
    print_status "Creating deployment package..."
    
    # Create deployment script for VPS
    cat > deploy-vps.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Time Clock to VPS..."

# Update system
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Clone or update repository
if [ -d "time-clock-app" ]; then
    cd time-clock-app
    git pull
else
    git clone <YOUR_REPO_URL> time-clock-app
    cd time-clock-app
fi

# Stop existing containers
sudo docker-compose down || true

# Build and start
sudo docker-compose up -d --build

echo "✅ Deployment completed!"
echo "🌐 Access your app at: http://$(curl -s ifconfig.me):3000"
EOF
    
    chmod +x deploy-vps.sh
    
    print_status "✅ VPS deployment script created!"
    print_status "To deploy to your VPS:"
    echo "  1. Copy files to VPS: scp -r . $VPS_USER@$VPS_IP:~/time-clock-app"
    echo "  2. SSH to VPS: ssh $VPS_USER@$VPS_IP"
    echo "  3. Run: cd time-clock-app && ./deploy-vps.sh"
}

# Main menu
echo ""
print_header "🎯 Choose your deployment platform:"
echo "  1) Railway (Free tier with easy setup)"
echo "  2) Render (Free tier, GitHub integration)"
echo "  3) Heroku (Free tier ended, but popular)"
echo "  4) DigitalOcean App Platform (Paid, but reliable)"
echo "  5) VPS/Server (Your own server)"
echo "  6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        deploy_to_railway
        ;;
    2)
        deploy_to_render
        ;;
    3)
        deploy_to_heroku
        ;;
    4)
        deploy_to_digitalocean
        ;;
    5)
        deploy_to_vps
        ;;
    6)
        print_status "Deployment cancelled by user"
        exit 0
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

print_header "🎉 Cloud deployment preparation completed!"
echo ""
print_status "📋 Post-deployment checklist:"
echo "  ✅ Test the application thoroughly"
echo "  ✅ Set up Google Sheets API credentials"
echo "  ✅ Configure any custom domain names"
echo "  ✅ Set up monitoring and alerts"
echo "  ✅ Create backups of your time data"
echo ""