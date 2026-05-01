# Base image to use
FROM node:18

# set a working directory
WORKDIR /src

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && ln -sf /usr/bin/python3 /usr/bin/python && rm -rf /var/lib/apt/lists/*

# Copy across project configuration information
# Install application dependencies
COPY package*.json /src/

# Ask npm to install the dependencies
RUN npm install -g supervisor && npm install && npm install supervisor

# Copy across all our files
COPY . /src

# Expose our application port (3000)
EXPOSE 3000


