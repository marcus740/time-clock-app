# Time Clock Application - Deployment Guide

Your time clock application is now ready for deployment! Here are several options to get it running on a live server.

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended - Free Tier)

Railway offers the easiest deployment with a free tier.

1. **Create a Railway account** at [railway.app](https://railway.app)
2. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```
3. **Deploy the application**:
   ```bash
   cd /Users/marcushansen/time-clock
   railway login
   railway init
   railway up
   ```
4. **Set environment variables** in Railway dashboard:
   - `NODE_ENV=production`
   - `PORT=3000`

**Your app will be live at:** `https://your-app-name.railway.app`

### Option 2: Render (Free Tier)

1. **Create account** at [render.com](https://render.com)
2. **Push code to GitHub**:
   ```bash
   # Create a GitHub repository first, then:
   git remote add origin https://github.com/yourusername/time-clock-app.git
   git push -u origin main
   ```
3. **Connect your GitHub repo** to Render
4. **Use the provided render.yaml** configuration
5. **Deploy automatically** from GitHub

### Option 3: DigitalOcean App Platform

1. **Create account** at [digitalocean.com](https://digitalocean.com)
2. **Push to GitHub** (same as Render)
3. **Create new App** in DigitalOcean
4. **Connect GitHub repo** and use `.do/app.yaml` configuration

### Option 4: Heroku

1. **Install Heroku CLI** from [heroku.com](https://heroku.com)
2. **Deploy**:
   ```bash
   heroku login
   heroku create your-app-name
   git push heroku main
   heroku open
   ```

### Option 5: Your Own Server/VPS

If you have your own server:

1. **Run the deployment script**:
   ```bash
   ./deploy-cloud.sh
   ```
2. **Choose option 5** (VPS deployment)
3. **Follow the generated instructions**

## 🔧 Manual Server Setup

If you want to set up everything manually on your server:

### Prerequisites
- Node.js 18+
- npm
- Git

### Setup Steps

1. **Clone/Copy the application**:
   ```bash
   git clone <your-repo> time-clock-app
   cd time-clock-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set environment variables**:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

5. **Set up process manager (optional)**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name time-clock
   pm2 save
   pm2 startup
   ```

## 🐳 Docker Deployment

### Local Docker
```bash
./deploy.sh
```

### Docker Hub / Registry
1. **Build and tag image**:
   ```bash
   docker build -t time-clock-app .
   docker tag time-clock-app your-registry/time-clock-app
   docker push your-registry/time-clock-app
   ```

2. **Deploy on any Docker-compatible platform**

## 🔗 Google Sheets Configuration

After deployment, set up Google Sheets integration:

1. **Go to [Google Cloud Console](https://console.cloud.google.com)**
2. **Create a new project** or select existing
3. **Enable Google Sheets API**
4. **Create OAuth 2.0 credentials**
5. **Add your deployed domain** to authorized origins
6. **Update the credentials** in your deployed app

## 🌐 Current Deployment Status

**Application has been prepared and is ready for deployment!**

### What's Ready:
- ✅ Complete application code
- ✅ Docker configuration
- ✅ Multiple deployment configurations
- ✅ Environment variable templates
- ✅ Health check endpoints
- ✅ Production optimizations

### Next Steps:
1. Choose your preferred deployment platform
2. Follow the platform-specific instructions above
3. Configure Google Sheets API (optional)
4. Test the deployed application

## 📊 Monitoring Your Deployed App

Once deployed, you can monitor your application:

- **Health Check**: `https://your-app-url.com/api/health`
- **Application Logs**: Check your platform's logging section
- **Performance**: Monitor response times and uptime

## 🔒 Security Considerations

For production deployment:
- ✅ Environment variables are properly configured
- ✅ HTTPS is enabled (handled by most platforms)
- ✅ Rate limiting is configured
- ✅ CORS is properly set up
- ✅ Health checks are enabled

## 📞 Support

If you encounter issues:
1. Check the platform's documentation
2. Review application logs
3. Ensure all environment variables are set
4. Verify the health check endpoint responds

---

**Your Time Clock application is ready to go live! 🎉**

Choose your deployment method and start tracking time in minutes!