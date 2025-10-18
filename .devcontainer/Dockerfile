FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Create node user and group, set up home directory
RUN groupadd -r node && useradd -r -g node -m -d /home/node -s /bin/bash node

FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Create node user and group, set up home directory
RUN groupadd -r node && useradd -r -g node -m -d /home/node -s /bin/bash node

# Install Node.js 20, Python, poppler-utils (for PDF parsing), and yarn (for frontend)
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    curl \
    poppler-utils \
    python3 \
    python3-pip \
    python3-venv \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get -y install --no-install-recommends nodejs \
    && npm install -g yarn \
    && pip3 install --break-system-packages pymupdf4llm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory and permissions for node user
WORKDIR /workspace
RUN chown -R node:node /workspace

# Switch to node user
USER node

# Expose ports for backend and frontend
EXPOSE 3000 5000

# Keep container running for Ona
CMD ["sleep", "infinity"]