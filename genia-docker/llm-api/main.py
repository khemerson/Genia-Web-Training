"""
GENIA Local LLM API
Compatible avec OpenAI API pour intégration facile
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import httpx
import json
import logging
import os
import time
from typing import Optional, List, Dict, Any
import uvicorn

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GENIA Local LLM API",
    description="API locale pour modèles LLM via Ollama",
    version="1.0.0"
)

# CORS pour permettre les requêtes depuis l'app web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles de données
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "llama2:7b"
    temperature: float = 0.3
    max_tokens: int = 1000
    stream: bool = False

class ChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Optional[Dict[str, int]] = None

class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    created: int
    owned_by: str = "genia-local"

# Configuration des modèles disponibles
AVAILABLE_MODELS = {
    "llama2:7b": {
        "provider": "ollama",
        "context_length": 4096,
        "description": "Llama 2 7B - Polyvalent et rapide"
    },
    "llama2:13b": {
        "provider": "ollama", 
        "context_length": 4096,
        "description": "Llama 2 13B - Plus précis, plus lent"
    },
    "mistral:7b": {
        "provider": "ollama",
        "context_length": 8192,
        "description": "Mistral 7B - Excellent pour le code"
    },
    "codellama:7b": {
        "provider": "ollama",
        "context_length": 4096,
        "description": "Code Llama - Spécialisé programmation"
    },
    "phi:latest": {
        "provider": "ollama",
        "context_length": 2048,
        "description": "Phi - Petit mais efficace"
    },
    "neural-chat:7b": {
        "provider": "ollama",
        "context_length": 4096,
        "description": "Neural Chat - Optimisé conversation"
    }
}

# Cache pour les statuts des modèles
model_status_cache = {}
last_status_check = 0

async def check_model_availability():
    """Vérifie quels modèles sont disponibles dans Ollama"""
    global model_status_cache, last_status_check
    
    current_time = time.time()
    # Cache pendant 5 minutes
    if current_time - last_status_check < 300:
        return model_status_cache
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:11434/api/tags", timeout=10.0)
            if response.status_code == 200:
                ollama_models = response.json()
                available_models = [model["name"] for model in ollama_models.get("models", [])]
                
                for model_name in AVAILABLE_MODELS:
                    model_status_cache[model_name] = model_name in available_models
                
                last_status_check = current_time
                logger.info(f"Updated model status: {model_status_cache}")
            else:
                logger.warning(f"Failed to get Ollama models: {response.status_code}")
    except Exception as e:
        logger.error(f"Error checking Ollama models: {str(e)}")
    
    return model_status_cache

async def call_ollama(request: ChatRequest) -> ChatResponse:
    """Appel vers Ollama local"""
    try:
        async with httpx.AsyncClient() as client:
            # Convertir les messages au format Ollama
            prompt = ""
            for msg in request.messages:
                if msg.role == "system":
                    prompt += f"System: {msg.content}\n"
                elif msg.role == "user":
                    prompt += f"Human: {msg.content}\n"
                elif msg.role == "assistant":
                    prompt += f"Assistant: {msg.content}\n"
            
            prompt += "Assistant: "
            
            ollama_request = {
                "model": request.model,
                "prompt": prompt,
                "options": {
                    "temperature": request.temperature,
                    "num_predict": request.max_tokens
                },
                "stream": False
            }
            
            start_time = time.time()
            response = await client.post(
                "http://localhost:11434/api/generate",
                json=ollama_request,
                timeout=300.0
            )
            
            if response.status_code == 200:
                result = response.json()
                response_time = time.time() - start_time
                
                # Format compatible OpenAI
                return ChatResponse(
                    id=f"genia-{int(time.time())}",
                    created=int(time.time()),
                    model=request.model,
                    choices=[{
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": result["response"]
                        },
                        "finish_reason": "stop"
                    }],
                    usage={
                        "prompt_tokens": result.get("prompt_eval_count", 0),
                        "completion_tokens": result.get("eval_count", 0),
                        "total_tokens": result.get("prompt_eval_count", 0) + result.get("eval_count", 0)
                    }
                )
            else:
                raise HTTPException(status_code=500, detail=f"Ollama error: {response.text}")
                
    except Exception as e:
        logger.error(f"Ollama call failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM service unavailable: {str(e)}")

@app.post("/v1/chat/completions", response_model=ChatResponse)
async def chat_completions(request: ChatRequest):
    """Endpoint compatible OpenAI pour LLMs locaux"""
    
    # Vérifier si le modèle est disponible
    model_status = await check_model_availability()
    
    if request.model not in AVAILABLE_MODELS:
        available_models = list(AVAILABLE_MODELS.keys())
        raise HTTPException(
            status_code=400, 
            detail=f"Model {request.model} not supported. Available: {available_models}"
        )
    
    if not model_status.get(request.model, False):
        raise HTTPException(
            status_code=503,
            detail=f"Model {request.model} not available. Please wait for it to be downloaded."
        )
    
    # Appeler Ollama
    return await call_ollama(request)

@app.get("/v1/models")
async def list_models():
    """Liste des modèles disponibles (compatible OpenAI)"""
    model_status = await check_model_availability()
    
    models = []
    for model_id, config in AVAILABLE_MODELS.items():
        status = model_status.get(model_id, False)
        models.append({
            "id": model_id,
            "object": "model",
            "created": int(time.time()),
            "owned_by": "genia-local",
            "permission": [],
            "root": model_id,
            "parent": None,
            "available": status,
            "description": config.get("description", ""),
            "context_length": config.get("context_length", 4096)
        })
    
    return {"object": "list", "data": models}

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
    
    # Vérifier les modèles disponibles
    model_status = await check_model_availability()
    available_models = sum(1 for status in model_status.values() if status)
    
    return {
        "status": "healthy" if ollama_status == "healthy" else "degraded",
        "timestamp": int(time.time()),
        "services": {
            "ollama": ollama_status,
            "api": "healthy"
        },
        "models": {
            "available": available_models,
            "total": len(AVAILABLE_MODELS),
            "details": model_status
        },
        "gpu_available": os.path.exists("/usr/bin/nvidia-smi"),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {
        "message": "GENIA Local LLM API", 
        "version": "1.0.0",
        "endpoints": {
            "chat": "/v1/chat/completions",
            "models": "/v1/models", 
            "health": "/health"
        }
    }

# Background task pour précharger les statuts
@app.on_event("startup")
async def startup_event():
    logger.info("Starting GENIA LLM API...")
    # Attendre un peu pour que Ollama soit prêt
    await asyncio.sleep(10)
    await check_model_availability()
    logger.info("GENIA LLM API ready!")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False
    )
