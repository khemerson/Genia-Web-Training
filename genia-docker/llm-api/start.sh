#!/bin/bash

# 🤖 GENIA LLM Services Startup Script
echo "🚀 Starting GENIA LLM Services..."

# Load configuration
if [[ -f "/app/config/models.json" ]]; then
    echo "📋 Loading models configuration..."
    export MODELS_CONFIG="/app/config/models.json"
fi

# Set GPU memory fraction if specified
if [[ -n "$GPU_MEMORY_FRACTION" ]]; then
    export CUDA_MEMORY_FRACTION=$GPU_MEMORY_FRACTION
fi

# Start Ollama service in background
echo "📦 Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to initialize..."
sleep 15

# Function to pull model with retries
pull_model() {
    local model=$1
    local max_retries=3
    local retry=1
    
    while [[ $retry -le $max_retries ]]; do
        echo "📥 Pulling model $model (attempt $retry/$max_retries)..."
        if ollama pull "$model"; then
            echo "✅ Successfully pulled $model"
            return 0
        else
            echo "❌ Failed to pull $model (attempt $retry/$max_retries)"
            ((retry++))
            sleep 10
        fi
    done
    
    echo "⚠️  Failed to pull $model after $max_retries attempts"
    return 1
}

# Pull essential models based on available GPU memory
GPU_MEMORY=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -n1)
echo "🎮 Detected GPU memory: ${GPU_MEMORY}MB"

if [[ $GPU_MEMORY -gt 20000 ]]; then
    echo "🚀 High-end GPU detected. Pulling larger models..."
    pull_model "llama2:13b"
    pull_model "mistral:7b"
    pull_model "codellama:7b"
elif [[ $GPU_MEMORY -gt 8000 ]]; then
    echo "🎯 Mid-range GPU detected. Pulling medium models..."
    pull_model "llama2:7b"
    pull_model "mistral:7b"
else
    echo "⚡ Lower GPU memory detected. Pulling smaller models..."
    pull_model "phi:latest"
    pull_model "neural-chat:7b"
fi

# Verify Ollama is working
echo "🔍 Verifying Ollama installation..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama is running successfully"
else
    echo "❌ Ollama verification failed"
    exit 1
fi

# Start FastAPI server
echo "🌟 Starting GENIA LLM API server..."
python3 main.py &
API_PID=$!

# Wait for API to be ready
echo "⏳ Waiting for API server to start..."
sleep 10

# Verify API is working
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo "✅ API server is ready"
        break
    fi
    echo "⏳ Waiting for API server... ($i/30)"
    sleep 2
done

if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "❌ API server failed to start"
    exit 1
fi

# Setup signal handlers for graceful shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $API_PID 2>/dev/null
    kill $OLLAMA_PID 2>/dev/null
    exit 0
}

trap cleanup SIGTERM SIGINT

echo "🎉 GENIA LLM Services are ready!"
echo "📡 Ollama API: http://localhost:11434"
echo "🔌 GENIA LLM API: http://localhost:8000"
echo "📊 Health check: http://localhost:8000/health"

# Keep script running and monitor processes
while true; do
    if ! kill -0 $OLLAMA_PID 2>/dev/null; then
        echo "❌ Ollama process died, restarting..."
        ollama serve &
        OLLAMA_PID=$!
    fi
    
    if ! kill -0 $API_PID 2>/dev/null; then
        echo "❌ API process died, restarting..."
        python3 main.py &
        API_PID=$!
    fi
    
    sleep 30
done
