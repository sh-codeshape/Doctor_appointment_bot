FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the rest of the application code
# Assuming your source code is in the src directory
COPY src ./src

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
