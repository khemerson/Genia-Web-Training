# 🐳 GENIA Docker - Infrastructure Locale Complète

## 🏗️ Architecture Docker Optimisée

Pour votre serveur **EPYC 64c/128t + 512GB RAM + RTX 4090/3090**, voici une stack Docker complète :

```
┌─────────────────────┐
│   NGINX (Reverse   │ ← Port 80/443 (SSL)
│      Proxy)        │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   GENIA Frontend   │ ← Next.js App
│    (Port 3000)     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   PostgreSQL DB    │ ← Port 5432
│    (Supabase Alt)  │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│      Redis         │ ← Sessions/Cache
│    (Port 6379)     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   Local LLM API    │ ← Ollama + vLLM
│  (Port 11434/8000) │ ← RTX 4090/3090
└─────────────────────┘
```

---

## 📁 Structure des Fichiers

```
genia-mvp-docker/
├── docker-compose.yml          # Stack complète
├── docker-compose.dev.yml      # Développement
├── .env.docker                 # Variables Docker
├── nginx/
│   ├── nginx.conf              # Configuration NGINX
│   └── ssl/                    # Certificats SSL
├── postgres/
│   ├── init.sql                # Schema initial
│   └── data/                   # Données persistantes
├── app/
│   ├── Dockerfile              # Image GENIA App  
│   ├── next.config.js          # Config Next.js
│   └── src/                    # Code application
├── llm-api/
│   ├── Dockerfile              # Image LLM local
│   ├── requirements.txt        # Dependencies Python
│   └── main.py                 # Serveur API LLM
└── scripts/
    ├── setup.sh                # Installation automatique
    ├── backup.sh               # Sauvegarde DB
    └── deploy.sh               # Déploiement
```

---

## 🚀 Docker Compose Principal

### **docker-compose.yml**

```yaml
version: '3.8'

services:
  # Base de données PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: genia_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: genia
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./postgres/data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - genia_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis pour cache et sessions
  redis:
    image: redis:7-alpine
    container_name: genia_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - genia_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Application GENIA
  app:
    build:
      context: ./app
      dockerfile: Dockerfile
      target: production
    container_name: genia_app
    restart: unless-stopped
    environment:
      # Base de données
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/genia
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      
      # APIs externes
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      MISTRAL_API_KEY: ${MISTRAL_API_KEY}
      
      # LLM local
      LOCAL_LLM_URL: http://llm-api:8000
      
      # Next.js
      NEXT_PUBLIC_BASE_URL: ${BASE_URL:-http://localhost}
      NODE_ENV: production
    volumes:
      - app_uploads:/app/uploads
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - genia_network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  # LLM API local (Ollama + vLLM)
  llm-api:
    build:
      context: ./llm-api
      dockerfile: Dockerfile
    container_name: genia_llm_api
    restart: unless-stopped
    environment:
      CUDA_VISIBLE_DEVICES: "0,1,2,3"  # RTX 4090 + 3090
      MODEL_PATH: /models
      MAX_MEMORY_USAGE: "40GB"  # Ajuster selon RAM disponible
    volumes:
      - llm_models:/models
      - ./llm-api/config:/app/config
    ports:
      - "8000:8000"   # vLLM API
      - "11434:11434" # Ollama API
    networks:
      - genia_network
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval: 60s
      timeout: 30s
      retries: 5

  # NGINX Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: genia_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/ssl/certs
      - nginx_logs:/var/log/nginx
    depends_on:
      - app
    networks:
      - genia_network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Monitoring (optionnel)
  prometheus:
    image: prom/prometheus:latest
    container_name: genia_prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - genia_network

  grafana:
    image: grafana/grafana:latest
    container_name: genia_grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - genia_network

volumes:
  redis_data:
  app_uploads:
  llm_models:
  nginx_logs:
  prometheus_data:
  grafana_data:

networks:
  genia_network:
    driver: bridge
```

---

## 🛠️ Configuration des Services

### **Dockerfile pour l'App GENIA**

```dockerfile
# app/Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Builder
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
```

### **LLM API Local**

```dockerfile
# llm-api/Dockerfile
FROM nvidia/cuda:11.8-devel-ubuntu20.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3.9 python3-pip curl git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python packages
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Install Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Copy application
COPY . .

# Create models directory
RUN mkdir -p /models && chmod 755 /models

EXPOSE 8000 11434

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

HEALTHCHECK --interval=60s --timeout=30s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["/start.sh"]
```

### **API LLM Python**

```python
# llm-api/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio
import httpx
import json
from typing import Optional, List
import logging
import os

# Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GENIA LLM API", version="1.0.0")

class ChatRequest(BaseModel):
    messages: List[dict]
    model: str = "llama2:13b"
    temperature: float = 0.3
    max_tokens: int = 1000

class ChatResponse(BaseModel):
    response: str
    model_used: str
    provider: str
    tokens_used: Optional[int] = None

# Modèles disponibles
AVAILABLE_MODELS = {
    "llama2:7b": "ollama",
    "llama2:13b": "ollama", 
    "codellama:7b": "ollama",
    "mistral:7b": "ollama",
    "neural-chat:7b": "ollama"
}

async def call_ollama(request: ChatRequest) -> ChatResponse:
    """Appel vers Ollama local"""
    try:
        async with httpx.AsyncClient() as client:
            ollama_request = {
                "model": request.model,
                "messages": request.messages,
                "options": {
                    "temperature": request.temperature,
                    "num_predict": request.max_tokens
                }
            }
            
            response = await client.post(
                "http://localhost:11434/api/chat",
                json=ollama_request,
                timeout=120.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return ChatResponse(
                    response=result["message"]["content"],
                    model_used=request.model,
                    provider="ollama",
                    tokens_used=result.get("eval_count", 0)
                )
            else:
                raise HTTPException(status_code=500, detail=f"Ollama error: {response.text}")
                
    except Exception as e:
        logger.error(f"Ollama call failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM service unavailable: {str(e)}")

@app.post("/chat/completions", response_model=ChatResponse)
async def chat_completions(request: ChatRequest):
    """Endpoint compatible OpenAI pour LLMs locaux"""
    
    if request.model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400, 
            detail=f"Model {request.model} not available. Available: {list(AVAILABLE_MODELS.keys())}"
        )
    
    provider = AVAILABLE_MODELS[request.model]
    
    if provider == "ollama":
        return await call_ollama(request)
    else:
        raise HTTPException(status_code=400, detail=f"Provider {provider} not implemented")

@app.get("/models")
async def list_models():
    """Liste des modèles disponibles"""
    return {
        "models": [
            {
                "id": model,
                "provider": provider,
                "status": "ready"  # TODO: check actual status
            }
            for model, provider in AVAILABLE_MODELS.items()
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test Ollama connection
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/tags", timeout=10.0)
            ollama_status = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        ollama_status = "unhealthy"
    
    return {
        "status": "healthy" if ollama_status == "healthy" else "degraded",
        "services": {
            "ollama": ollama_status,
            "vllm": "not_implemented"  # Future extension
        },
        "gpu_available": torch.cuda.is_available() if 'torch' in globals() else False
    }

@app.get("/")
async def root():
    return {"message": "GENIA Local LLM API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### **Script de Démarrage LLM**

```bash
#!/bin/bash
# llm-api/start.sh

echo "🚀 Starting GENIA LLM Services..."

# Start Ollama in background
echo "📦 Starting Ollama..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to start..."
sleep 10

# Pull required models
echo "📥 Pulling LLM models..."
ollama pull llama2:7b
ollama pull mistral:7b
# ollama pull llama2:13b  # Uncomment for larger model

# Start FastAPI server
echo "🌟 Starting GENIA LLM API..."
python3 main.py &
API_PID=$!

# Wait for both services
wait $OLLAMA_PID $API_PID
```

---

## ⚙️ Configuration NGINX

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream genia_app {
        server app:3000;
    }
    
    upstream llm_api {
        server llm-api:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=llm:10m rate=2r/s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript;
    
    server {
        listen 80;
        server_name localhost;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        
        # Main app
        location / {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://genia_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
        }
        
        # LLM API
        location /api/llm/ {
            limit_req zone=llm burst=5 nodelay;
            proxy_pass http://llm_api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 300s;
            client_max_body_size 10M;
        }
        
        # Health checks
        location /health {
            access_log off;
            return 200 "healthy\n";
        }
        
        # Static files caching
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

## 🔧 Scripts d'Installation

### **setup.sh**

```bash
#!/bin/bash
# scripts/setup.sh

set -e

echo "🚀 GENIA Docker Setup - Infrastructure Locale"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker installed. Please logout and login again."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# NVIDIA Docker (for GPU support)
if lspci | grep -i nvidia; then
    echo "🎮 NVIDIA GPU detected. Setting up NVIDIA Docker..."
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
    sudo apt-get update && sudo apt-get install -y nvidia-docker2
    sudo systemctl restart docker
fi

# Create directories
echo "📁 Creating directory structure..."
mkdir -p postgres/data nginx/ssl monitoring

# Generate environment file
echo "🔑 Generating environment variables..."
cat > .env.docker << EOF
# Database
POSTGRES_USER=genia_user
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# APIs (EDIT THESE)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
MISTRAL_API_KEY=your_mistral_key_here

# App
BASE_URL=http://localhost
GRAFANA_PASSWORD=admin123

# Performance tuning for your hardware
POSTGRES_SHARED_BUFFERS=8GB
POSTGRES_EFFECTIVE_CACHE_SIZE=32GB
POSTGRES_MAX_CONNECTIONS=200
EOF

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env.docker with your API keys"
echo "2. Run: docker-compose up -d"
echo "3. Wait 2-3 minutes for services to start"
echo "4. Open http://localhost"
echo ""
echo "🎛️  Monitoring: http://localhost:3001 (grafana)"
echo "🔍 Metrics: http://localhost:9090 (prometheus)"
```

### **deploy.sh**

```bash
#!/bin/bash
# scripts/deploy.sh

echo "🚀 Deploying GENIA Production Stack..."

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose pull

# Build custom images
echo "🔨 Building custom images..."
docker-compose build --no-cache

# Deploy with zero downtime
echo "🔄 Rolling deployment..."
docker-compose up -d --remove-orphans

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service status
docker-compose ps

# Run any migrations
echo "🗃️  Running database migrations..."
docker-compose exec app npm run db:migrate

echo "✅ Deployment complete!"
echo "🌐 App available at: http://localhost"
```

---

## 📊 Monitoring & Alerting

### **Prometheus Configuration**

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'genia-app'
    static_configs:
      - targets: ['app:3000']
    
  - job_name: 'genia-llm'
    static_configs:
      - targets: ['llm-api:8000']
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

---

## 🚀 Lancement Complet

### **Commandes de Déploiement**

```bash
# 1. Setup initial
chmod +x scripts/*.sh
./scripts/setup.sh

# 2. Éditer les variables d'environnement
nano .env.docker

# 3. Démarrage complet
docker-compose up -d

# 4. Vérification des services
docker-compose ps
docker-compose logs -f

# 5. Accès aux services
# App: http://localhost
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9090
```

### **Optimisations Hardware Spécifiques**

Pour votre **EPYC 64c/128t + 512GB RAM** :

```yaml
# Ajouts dans docker-compose.yml
services:
  postgres:
    command: >
      postgres
      -c shared_buffers=16GB
      -c effective_cache_size=64GB
      -c max_connections=500
      -c work_mem=64MB
    deploy:
      resources:
        limits:
          memory: 32GB
        reservations:
          memory: 16GB

  redis:
    command: redis-server --maxmemory 8gb --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          memory: 10GB

  llm-api:
    deploy:
      resources:
        limits:
          memory: 100GB  # Pour les gros modèles
        reservations:
          memory: 40GB
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

Cette configuration Docker vous donne une **infrastructure complète et autonome** pour GENIA sur votre serveur local ! 🏗️💪
