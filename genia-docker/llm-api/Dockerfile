# GENIA Local LLM API - Support Ollama + vLLM
FROM nvidia/cuda:11.8-devel-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3-dev \
    curl \
    git \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic link for python
RUN ln -s /usr/bin/python3.10 /usr/bin/python

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Install Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Copy application files
COPY . .

# Create models directory
RUN mkdir -p /models && chmod 755 /models

# Create ollama user for security
RUN useradd -r -s /bin/false ollama

# Make start script executable
RUN chmod +x start.sh

# Expose ports
EXPOSE 8000 11434

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start script
CMD ["./start.sh"]
