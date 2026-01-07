# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directory for data storage
RUN mkdir -p /usr/src/app/data

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S timeclock -u 1001

# Change ownership of app directory to nodejs user
RUN chown -R timeclock:nodejs /usr/src/app
USER timeclock

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]