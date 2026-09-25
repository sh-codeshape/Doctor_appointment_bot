FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code and necessary configuration/migration files
COPY src ./src
COPY bin ./bin
COPY db ./db
COPY .dbmate.yml ./

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
