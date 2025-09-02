# 🐳 GENIA Docker - Infrastructure Locale Complète

Infrastructure Docker complète pour GENIA basée sur le projet MVP fonctionnel, optimisée pour serveurs haute performance.

## 🏗️ Architecture

```
┌─────────────────────┐
│   NGINX (Reverse   │ ← Port 80/443 (SSL)
│      Proxy)        │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   GENIA Frontend   │ ← Next.js App (Port 3000)
│    (Production)    │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   PostgreSQL DB    │ ← Port 5432
│   (Optimisé HP)    │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│      Redis         │ ← Cache & Sessions
│    (Port 6379)     │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   Local LLM API    │ ← Ollama + vLLM (GPU)
│  (Port 11434/8000) │
└─────────────────────┘
```

## 🚀 Installation Rapide

### 1. Prérequis

- **OS**: Linux (Ubuntu 20.04+) ou macOS
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **RAM**: 8GB minimum, 32GB+ recommandé
- **GPU**: NVIDIA RTX/Tesla (optionnel pour LLM local)

### 2. Installation Automatique

```bash
# Cloner et entrer dans le répertoire
cd genia-docker

# Lancer l'installation automatique
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Configuration

```bash
# Éditer le fichier d'environnement
cp env.docker.template .env
nano .env

# Configurer vos clés API (OBLIGATOIRE)
OPENAI_API_KEY=sk-your_openai_key_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here
MISTRAL_API_KEY=your_mistral_key_here
```

### 4. Déploiement

```bash
# Déploiement complet
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Ou utilisation manuelle
docker-compose up -d
```

## 🎯 Utilisation

### Services Principaux

| Service | URL | Description |
|---------|-----|-------------|
| **Application** | http://localhost | Interface GENIA |
| **Health Check** | http://localhost/api/health | Monitoring santé |
| **Grafana** | http://localhost:3001 | Dashboards (admin/admin123) |
| **Prometheus** | http://localhost:9090 | Métriques |

### Commandes Essentielles

```bash
# ===== GESTION DES SERVICES =====

# Démarrer tous les services
docker-compose up -d

# Avec LLM local (si GPU disponible)
docker-compose --profile llm up -d

# Avec monitoring
docker-compose --profile monitoring up -d

# Arrêter tous les services
docker-compose down

# ===== LOGS ET DEBUG =====

# Voir les logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f app
docker-compose logs -f postgres

# ===== STATUS ET MONITORING =====

# Status des conteneurs
docker-compose ps

# Utilisation des ressources
docker stats

# Health check
curl http://localhost/api/health

# ===== SAUVEGARDE =====

# Sauvegarde automatique
./scripts/deploy.sh backup

# Sauvegarde manuelle de la DB
docker-compose exec postgres pg_dump -U genia_user genia > backup.sql

# ===== MAINTENANCE =====

# Redémarrer un service
docker-compose restart app

# Rebuild après changement de code
docker-compose build --no-cache app
docker-compose up -d app

# Nettoyage
docker system prune -f
```

## ⚙️ Configuration Avancée

### Performance (Serveur HP)

Pour serveur **EPYC 64c/128t + 512GB RAM** :

```yaml
# Dans docker-compose.yml - Déjà optimisé
services:
  postgres:
    environment:
      POSTGRES_SHARED_BUFFERS: 16GB
      POSTGRES_EFFECTIVE_CACHE_SIZE: 64GB
      POSTGRES_MAX_CONNECTIONS: 500
      
  redis:
    command: redis-server --maxmemory 8gb --maxmemory-policy allkeys-lru
```

### GPU/LLM Local

```bash
# Activer le support GPU
sudo apt install nvidia-docker2
sudo systemctl restart docker

# Démarrer avec LLM
docker-compose --profile llm up -d

# Vérifier les modèles
curl http://localhost:8000/v1/models
```

### SSL/HTTPS

```bash
# 1. Obtenir certificats (Let's Encrypt)
sudo apt install certbot
certbot certonly --standalone -d votre-domaine.com

# 2. Copier certificats
cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem nginx/ssl/key.pem

# 3. Modifier nginx.conf (décommenter section HTTPS)
# 4. Redémarrer
docker-compose restart nginx
```

## 📊 Monitoring

### Grafana Dashboards

Accès : http://localhost:3001 (admin/admin123)

**Dashboards préconfigurés** :
- Performance Application
- Utilisation PostgreSQL  
- Métriques Redis
- API Response Times
- GPU Utilization (si LLM activé)

### Prometheus Metrics

Accès : http://localhost:9090

**Métriques surveillées** :
- `genia_requests_total` - Requêtes totales
- `genia_response_time` - Temps de réponse
- `genia_llm_requests` - Requêtes LLM
- `postgres_connections` - Connexions DB
- `redis_memory_usage` - Utilisation Redis

## 🔧 Troubleshooting

### Problèmes Courants

#### ❌ Service ne démarre pas

```bash
# Vérifier les logs
docker-compose logs service_name

# Vérifier la configuration
docker-compose config

# Redémarrer proprement
docker-compose down
docker-compose up -d
```

#### ❌ Base de données inaccessible

```bash
# Vérifier PostgreSQL
docker-compose exec postgres pg_isready -U genia_user

# Recréer la DB
docker-compose down -v
docker-compose up -d postgres
```

#### ❌ LLM API ne répond pas

```bash
# Vérifier GPU
nvidia-smi

# Logs LLM
docker-compose logs llm-api

# Test Ollama
curl http://localhost:11434/api/tags
```

#### ❌ Performance lente

```bash
# Vérifier ressources
docker stats

# Optimiser PostgreSQL
docker-compose exec postgres psql -U genia_user -d genia -c "ANALYZE; VACUUM;"

# Vérifier NGINX
curl -I http://localhost/
```

### Commandes de Debug

```bash
# ===== INSPECTION =====
docker-compose ps                    # Status services
docker-compose top                   # Processus actifs
docker-compose exec app bash         # Shell dans conteneur

# ===== CONNECTIVITÉ =====
docker-compose exec app curl http://postgres:5432
docker-compose exec app curl http://redis:6379
docker-compose exec app curl http://llm-api:8000/health

# ===== PERFORMANCE =====
docker stats --no-stream
docker system df                     # Espace disque
docker volume ls                     # Volumes

# ===== NETTOYAGE =====
docker system prune -af              # Nettoyage complet
docker volume prune -f               # Volumes inutilisés
```

## 🚀 Déploiement Production

### Script de Déploiement

```bash
# Déploiement complet avec backup
./scripts/deploy.sh deploy

# Autres commandes
./scripts/deploy.sh status           # Status
./scripts/deploy.sh backup           # Sauvegarde seule
./scripts/deploy.sh rollback         # Retour en arrière
./scripts/deploy.sh health           # Health check
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy GENIA
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        run: |
          cd genia-docker
          ./scripts/deploy.sh deploy
```

### Monitoring Production

```bash
# Alertes par email (optionnel)
# Configurer dans monitoring/alerts.yml

# Backup automatique
echo "0 2 * * * /path/to/genia-docker/scripts/deploy.sh backup" | crontab -

# Health check automatique
echo "*/5 * * * * curl -f http://localhost/api/health || echo 'GENIA DOWN'" | crontab -
```

## 🔐 Sécurité

### Recommandations

1. **Firewall** : Ouvrir seulement ports 80/443
2. **SSL** : Toujours utiliser HTTPS en production
3. **Mots de passe** : Utiliser `openssl rand -base64 32`
4. **Updates** : Régulièrement `docker-compose pull`
5. **Backup** : Automatiser avec cron

### Hardening

```bash
# Limiter accès SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Rotation des logs
echo '/var/lib/docker/containers/*/*.log {
  daily
  rotate 7
  compress
  missingok
  delaycompress
  copytruncate
}' | sudo tee /etc/logrotate.d/docker
```

## 📚 Références

- **Documentation Next.js** : https://nextjs.org/docs
- **Docker Compose** : https://docs.docker.com/compose/
- **Ollama** : https://ollama.ai/
- **PostgreSQL** : https://postgresql.org/docs/
- **NGINX** : https://nginx.org/en/docs/

## 🆘 Support

En cas de problème :

1. **Vérifier les logs** : `docker-compose logs -f`
2. **Tester la connectivité** : `curl http://localhost/api/health`
3. **Vérifier les ressources** : `docker stats`
4. **Restart services** : `docker-compose restart`

**Restart complet** :
```bash
docker-compose down -v
docker-compose up -d --build
```

---

## 📄 Licence

Ce projet utilise une **licence hybride** (voir `LICENSE`) :
- **🔧 Infrastructure & Code** : Apache License 2.0 (libre usage)
- **📚 Contenu Pédagogique** : Creative Commons BY-NC-SA 4.0 (attribution requise)
- **🧠 Méthode GENIA** : Propriété intellectuelle d'Hemerson KOFFI

Pour usage commercial de la méthodologie, autorisation expresse requise.

---

**🎉 GENIA Docker est maintenant prêt pour la production !**

Votre infrastructure complète est déployée avec :
- ✅ Application Next.js optimisée
- ✅ Base de données PostgreSQL haute performance  
- ✅ Cache Redis
- ✅ Reverse proxy NGINX
- ✅ LLM local avec GPU (optionnel)
- ✅ Monitoring Prometheus/Grafana
- ✅ Backups automatiques
- ✅ Scripts de déploiement

**Créé par Hemerson KOFFI** - Méthodologie pédagogique GENIA
