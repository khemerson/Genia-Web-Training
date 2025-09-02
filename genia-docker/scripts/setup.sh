#!/bin/bash

# 🚀 GENIA Docker Setup - Infrastructure Locale Complète
# Optimisé pour serveur EPYC 64c/128t + 512GB RAM + RTX 4090/3090

set -e

echo "🚀 GENIA Docker Setup - Infrastructure Locale"
echo "=============================================="

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
else
    log_error "Unsupported OS: $OSTYPE"
    exit 1
fi

log_info "Detected OS: $OS"

# Check prerequisites
log_info "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    log_warning "Docker not found. Installing..."
    if [[ "$OS" == "linux" ]]; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        log_success "Docker installed. Please logout and login again, then re-run this script."
        exit 1
    else
        log_error "Please install Docker Desktop for Mac from https://docker.com"
        exit 1
    fi
else
    log_success "Docker found: $(docker --version)"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_warning "Docker Compose not found. Installing..."
    if [[ "$OS" == "linux" ]]; then
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        log_success "Docker Compose installed"
    else
        log_error "Please install Docker Desktop for Mac which includes Docker Compose"
        exit 1
    fi
else
    log_success "Docker Compose found"
fi

# Check for NVIDIA GPU and install NVIDIA Docker if needed
if [[ "$OS" == "linux" ]] && lspci | grep -i nvidia &> /dev/null; then
    log_info "🎮 NVIDIA GPU detected. Setting up NVIDIA Docker..."
    
    if ! command -v nvidia-docker &> /dev/null; then
        log_warning "Installing NVIDIA Docker..."
        distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
        curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
        curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
        
        sudo apt-get update
        sudo apt-get install -y nvidia-docker2
        sudo systemctl restart docker
        log_success "NVIDIA Docker installed"
    else
        log_success "NVIDIA Docker already installed"
    fi
else
    log_info "No NVIDIA GPU detected or not on Linux. Skipping NVIDIA Docker setup."
fi

# Create directory structure
log_info "📁 Creating directory structure..."
mkdir -p postgres/data nginx/ssl monitoring llm-api/config

# Generate environment file
log_info "🔑 Generating environment variables..."

if [[ ! -f .env ]]; then
    cp env.docker.template .env
    
    # Generate secure passwords
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    # Replace placeholders in .env
    sed -i "s/your_secure_postgres_password_here/$POSTGRES_PASSWORD/g" .env
    sed -i "s/your_secure_redis_password_here/$REDIS_PASSWORD/g" .env
    sed -i "s/your_very_long_random_jwt_secret_here/$JWT_SECRET/g" .env
    sed -i "s/your_32_character_encryption_key_here/$ENCRYPTION_KEY/g" .env
    
    log_success "Environment file created with secure passwords"
    log_warning "⚠️  IMPORTANT: Edit .env file and add your API keys!"
else
    log_warning ".env file already exists. Please verify your configuration."
fi

# Initialize PostgreSQL schema
log_info "🗃️  Creating PostgreSQL initialization script..."
cat > postgres/init.sql << 'EOF'
-- GENIA Database Schema
-- Optimized for production use

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    completion_time TIMESTAMP WITH TIME ZONE,
    answers JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat interactions table (for analytics)
CREATE TABLE IF NOT EXISTS chat_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    lesson_id TEXT,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_used TEXT,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_progress_session_id ON user_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module_id ON user_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_session_id ON chat_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_interactions_created_at ON chat_interactions(created_at);

-- Update trigger for user_progress
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance on high-end hardware
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_composite 
    ON user_progress(session_id, lesson_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_interactions_composite 
    ON chat_interactions(session_id, created_at, provider);

-- Optimize for your high-end server
ALTER SYSTEM SET shared_buffers = '16GB';
ALTER SYSTEM SET effective_cache_size = '64GB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();

COMMIT;
EOF

log_success "PostgreSQL initialization script created"

# Create Prometheus monitoring config
log_info "📊 Setting up monitoring configuration..."
mkdir -p monitoring
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'genia-app'
    static_configs:
      - targets: ['app:3000']
    scrape_interval: 30s
    metrics_path: '/api/metrics'
    
  - job_name: 'genia-llm'
    static_configs:
      - targets: ['llm-api:8000']
    scrape_interval: 60s
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    scrape_interval: 30s
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
    
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    scrape_interval: 30s
    metrics_path: '/metrics'
EOF

log_success "Monitoring configuration created"

# Create LLM API configuration if GPU detected
if [[ "$OS" == "linux" ]] && lspci | grep -i nvidia &> /dev/null; then
    log_info "🤖 Setting up LLM API configuration..."
    cat > llm-api/config/models.json << 'EOF'
{
  "models": {
    "llama2:7b": {
      "provider": "ollama",
      "memory_requirement": "8GB",
      "context_length": 4096
    },
    "llama2:13b": {
      "provider": "ollama", 
      "memory_requirement": "16GB",
      "context_length": 4096
    },
    "mistral:7b": {
      "provider": "ollama",
      "memory_requirement": "8GB", 
      "context_length": 8192
    },
    "codellama:7b": {
      "provider": "ollama",
      "memory_requirement": "8GB",
      "context_length": 4096
    }
  },
  "settings": {
    "max_concurrent_requests": 4,
    "timeout_seconds": 300,
    "gpu_memory_fraction": 0.8
  }
}
EOF
    log_success "LLM API configuration created"
fi

# Create development docker-compose override
log_info "🔧 Creating development configuration..."
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      target: builder
    environment:
      NODE_ENV: development
    volumes:
      - ./app:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
    command: npm run dev

  postgres:
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: genia_dev

  redis:
    ports:
      - "6379:6379"
EOF

log_success "Development configuration created"

# Set permissions
chmod +x scripts/*.sh

# Final summary
echo ""
echo "🎉 Setup Complete!"
echo "=================="
log_success "GENIA Docker environment is ready!"
echo ""
echo "📝 Next steps:"
echo "1. Edit .env file and add your API keys:"
echo "   - OPENAI_API_KEY"
echo "   - ANTHROPIC_API_KEY" 
echo "   - MISTRAL_API_KEY"
echo ""
echo "2. Start the services:"
echo "   docker-compose up -d"
echo ""
echo "3. Wait 2-3 minutes for services to initialize"
echo ""
echo "4. Access your application:"
echo "   🌐 App: http://localhost"
echo "   📊 Grafana: http://localhost:3001 (admin/admin123)"
echo "   🔍 Prometheus: http://localhost:9090"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Check status: docker-compose ps"
echo "   Stop services: docker-compose down"
echo ""
echo "📖 For troubleshooting, see the documentation in genia-docker/README.md"

if [[ "$OS" == "linux" ]] && lspci | grep -i nvidia &> /dev/null; then
    echo ""
    log_info "🎮 GPU detected! To enable local LLM:"
    echo "   docker-compose --profile llm up -d"
fi

echo ""
log_warning "⚠️  Remember to configure your .env file before starting!"
