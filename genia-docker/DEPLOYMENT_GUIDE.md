# 🚀 Guide de Déploiement Complet GENIA Docker

Guide détaillé étape par étape pour déployer GENIA avec Docker en production.

## 📋 Table des Matières

- [🔧 Prérequis et Préparation](#-prérequis-et-préparation)
- [🐳 Installation Docker](#-installation-docker)
- [📁 Configuration du Projet](#-configuration-du-projet)
- [🔐 Configuration Sécurité](#-configuration-sécurité)
- [🚀 Déploiement Initial](#-déploiement-initial)
- [✅ Vérifications Post-Déploiement](#-vérifications-post-déploiement)
- [🌐 Configuration Production](#-configuration-production)
- [📊 Monitoring et Maintenance](#-monitoring-et-maintenance)
- [🔄 Mise à Jour et Maintenance](#-mise-à-jour-et-maintenance)

---

## 🔧 Prérequis et Préparation

### Étape 1.1 : Vérifier le Serveur

```bash
# Vérifier les spécifications du serveur
echo "=== VÉRIFICATION SERVEUR ==="
echo "CPU: $(nproc) cores"
echo "RAM: $(free -h | grep Mem | awk '{print $2}')"
echo "Disque: $(df -h / | tail -1 | awk '{print $4}' disponible)"
echo "OS: $(lsb_release -d | cut -f2)"

# Pour serveur optimisé EPYC 64c/128t + 512GB RAM
if [[ $(nproc) -ge 32 && $(free -m | grep Mem | awk '{print $2}') -ge 100000 ]]; then
    echo "✅ Serveur haute performance détecté"
else
    echo "⚠️  Serveur standard - ajuster les configurations"
fi
```

### Étape 1.2 : Prérequis Système

```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Installation outils essentiels
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    ufw \
    certbot \
    openssl

echo "✅ Outils système installés"
```

### Étape 1.3 : Vérification GPU (Optionnel)

```bash
# Vérifier présence GPU NVIDIA
if lspci | grep -i nvidia; then
    echo "🎮 GPU NVIDIA détecté:"
    lspci | grep -i nvidia
    
    # Vérifier drivers NVIDIA
    if command -v nvidia-smi &> /dev/null; then
        echo "✅ Drivers NVIDIA installés"
        nvidia-smi --query-gpu=name,memory.total --format=csv
    else
        echo "❌ Drivers NVIDIA manquants - installation requise"
        echo "Installer avec: sudo apt install nvidia-driver-535"
    fi
else
    echo "ℹ️  Pas de GPU NVIDIA - déploiement CPU uniquement"
fi
```

---

## 🐳 Installation Docker

### Étape 2.1 : Installation Docker

```bash
echo "=== INSTALLATION DOCKER ==="

# Suppression anciennes versions
sudo apt remove -y docker docker-engine docker.io containerd runc || true

# Installation Docker officiel
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter utilisateur au groupe docker
sudo usermod -aG docker $USER

# Démarrer et activer Docker
sudo systemctl start docker
sudo systemctl enable docker

echo "✅ Docker installé"

# Vérification
docker --version
```

### Étape 2.2 : Installation Docker Compose

```bash
echo "=== INSTALLATION DOCKER COMPOSE ==="

# Installation Docker Compose v2
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Vérification
docker-compose --version

echo "✅ Docker Compose installé"
```

### Étape 2.3 : Installation NVIDIA Docker (Si GPU)

```bash
if lspci | grep -i nvidia &> /dev/null; then
    echo "=== INSTALLATION NVIDIA DOCKER ==="
    
    # Configuration repository
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
    
    # Installation
    sudo apt update
    sudo apt install -y nvidia-docker2
    
    # Redémarrage Docker
    sudo systemctl restart docker
    
    # Test GPU dans Docker
    docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu22.04 nvidia-smi
    
    echo "✅ NVIDIA Docker installé et testé"
fi
```

### Étape 2.4 : Redémarrage Requis

```bash
echo "⚠️  REDÉMARRAGE REQUIS pour finaliser l'installation Docker"
echo "Exécutez: sudo reboot"
echo "Puis reconnectez-vous et continuez à l'étape 3"

# Après redémarrage, vérifier
# docker run hello-world
```

---

## 📁 Configuration du Projet

### Étape 3.1 : Récupération du Code

```bash
echo "=== CONFIGURATION PROJET ==="

# Aller dans le répertoire de travail
cd /opt  # ou votre répertoire préféré
sudo mkdir -p genia-production
sudo chown $USER:$USER genia-production
cd genia-production

# Copier les fichiers genia-docker depuis votre développement
# Option 1: Git clone (si repository)
# git clone https://your-repo/genia-web-training.git
# cd genia-web-training/genia-docker

# Option 2: Copie manuelle depuis votre machine de dev
echo "📁 Copiez le dossier genia-docker ici"
echo "Structure attendue:"
echo "$(pwd)/"
echo "├── docker-compose.yml"
echo "├── env.docker.template"
echo "├── app/"
echo "├── nginx/"
echo "├── scripts/"
echo "└── ..."

# Vérifier structure
ls -la
```

### Étape 3.2 : Permissions et Structure

```bash
# Vérifier que nous sommes dans genia-docker
if [[ ! -f "docker-compose.yml" ]]; then
    echo "❌ Erreur: docker-compose.yml non trouvé"
    echo "Assurez-vous d'être dans le répertoire genia-docker"
    exit 1
fi

# Définir permissions
chmod +x scripts/*.sh
chmod +x llm-api/start.sh

# Créer répertoires nécessaires
mkdir -p postgres/data nginx/ssl monitoring/dashboards backups

echo "✅ Structure projet configurée"
```

### Étape 3.3 : Configuration Environnement

```bash
echo "=== CONFIGURATION ENVIRONNEMENT ==="

# Copier template environnement
cp env.docker.template .env

# Générer mots de passe sécurisés
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Remplacer dans .env
sed -i "s/your_secure_postgres_password_here/$POSTGRES_PASSWORD/g" .env
sed -i "s/your_secure_redis_password_here/$REDIS_PASSWORD/g" .env
sed -i "s/your_very_long_random_jwt_secret_here/$JWT_SECRET/g" .env
sed -i "s/your_32_character_encryption_key_here/$ENCRYPTION_KEY/g" .env

echo "✅ Mots de passe générés automatiquement"
echo "⚠️  Sauvegardez ces informations:"
echo "PostgreSQL: $POSTGRES_PASSWORD"
echo "Redis: $REDIS_PASSWORD"

# Sauvegarder les mots de passe
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" > .env.backup
echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env.backup
echo "JWT_SECRET=$JWT_SECRET" >> .env.backup
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.backup
chmod 600 .env.backup

echo "✅ Backup des mots de passe: .env.backup"
```

---

## 🔐 Configuration Sécurité

### Étape 4.1 : Configuration des Clés API

```bash
echo "=== CONFIGURATION CLÉS API ==="
echo "🔑 OBLIGATOIRE: Configurer vos clés API"

# Éditer le fichier .env
echo "Ouvrez le fichier .env et configurez:"
echo "1. OPENAI_API_KEY=sk-votre-clé-openai"
echo "2. ANTHROPIC_API_KEY=sk-ant-votre-clé-anthropic"  
echo "3. MISTRAL_API_KEY=votre-clé-mistral"

# Interface interactive
read -p "Avez-vous configuré vos clés API? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Configuration des clés API requise avant de continuer"
    echo "Éditez .env avec: nano .env"
    exit 1
fi

# Vérifier clés configurées
if grep -q "your_.*_key_here" .env; then
    echo "❌ Certaines clés API ne sont pas configurées"
    echo "Vérifiez le fichier .env"
    exit 1
fi

echo "✅ Clés API configurées"
```

### Étape 4.2 : Configuration Firewall

```bash
echo "=== CONFIGURATION FIREWALL ==="

# Configuration UFW
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Autoriser SSH, HTTP, HTTPS
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Autoriser monitoring (optionnel, pour accès externe)
read -p "Autoriser accès externe au monitoring? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo ufw allow 3001/tcp comment 'Grafana'
    sudo ufw allow 9090/tcp comment 'Prometheus'
fi

# Activer firewall
sudo ufw --force enable
sudo ufw status verbose

echo "✅ Firewall configuré"
```

### Étape 4.3 : Configuration SSL (Production)

```bash
echo "=== CONFIGURATION SSL ==="

read -p "Configurer SSL/HTTPS? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Nom de domaine (ex: genia.votre-domaine.com): " DOMAIN_NAME
    
    if [[ -n "$DOMAIN_NAME" ]]; then
        # Générer certificat Let's Encrypt
        sudo certbot certonly --standalone --non-interactive --agree-tos --email admin@$DOMAIN_NAME -d $DOMAIN_NAME
        
        if [[ $? -eq 0 ]]; then
            # Copier certificats
            sudo cp /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem nginx/ssl/cert.pem
            sudo cp /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem nginx/ssl/key.pem
            sudo chown $USER:$USER nginx/ssl/*.pem
            
            # Configurer renouvellement automatique
            echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
            
            # Mettre à jour .env
            sed -i "s/BASE_URL=http:\/\/localhost/BASE_URL=https:\/\/$DOMAIN_NAME/g" .env
            
            echo "✅ SSL configuré pour $DOMAIN_NAME"
            echo "📝 Décommentez la section HTTPS dans nginx/nginx.conf"
        else
            echo "❌ Erreur configuration SSL"
        fi
    fi
else
    echo "ℹ️  SSL ignoré - utilisation HTTP"
fi
```

---

## 🚀 Déploiement Initial

### Étape 5.1 : Validation Configuration

```bash
echo "=== VALIDATION CONFIGURATION ==="

# Vérifier docker-compose.yml
docker-compose config > /dev/null
if [[ $? -eq 0 ]]; then
    echo "✅ docker-compose.yml valide"
else
    echo "❌ Erreur dans docker-compose.yml"
    exit 1
fi

# Vérifier .env
if [[ -f ".env" ]]; then
    echo "✅ Fichier .env présent"
    
    # Vérifier variables critiques
    source .env
    if [[ -z "$POSTGRES_PASSWORD" || -z "$REDIS_PASSWORD" ]]; then
        echo "❌ Variables d'environnement manquantes"
        exit 1
    fi
    echo "✅ Variables d'environnement configurées"
else
    echo "❌ Fichier .env manquant"
    exit 1
fi

# Vérifier espace disque
AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
if [[ $AVAILABLE_SPACE -lt 10485760 ]]; then  # 10GB en KB
    echo "❌ Espace disque insuffisant (< 10GB)"
    exit 1
fi
echo "✅ Espace disque suffisant"

echo "✅ Validation configuration réussie"
```

### Étape 5.2 : Build des Images

```bash
echo "=== BUILD DES IMAGES ==="

# Pull des images de base
echo "📥 Téléchargement des images de base..."
docker-compose pull postgres redis nginx

# Build de l'application
echo "🔨 Build de l'application GENIA..."
docker-compose build --no-cache app

# Vérifier images créées
docker images | grep genia

echo "✅ Images construites avec succès"
```

### Étape 5.3 : Déploiement Infrastructure

```bash
echo "=== DÉPLOIEMENT INFRASTRUCTURE ==="

# Démarrer base de données et cache
echo "🗃️  Démarrage PostgreSQL et Redis..."
docker-compose up -d postgres redis

# Attendre que les services soient prêts
echo "⏳ Attente initialisation des services..."
sleep 30

# Vérifier PostgreSQL
echo "🔍 Vérification PostgreSQL..."
for i in {1..10}; do
    if docker-compose exec -T postgres pg_isready -U $(grep POSTGRES_USER .env | cut -d '=' -f2) &> /dev/null; then
        echo "✅ PostgreSQL prêt"
        break
    fi
    echo "⏳ Attente PostgreSQL... ($i/10)"
    sleep 5
done

# Vérifier Redis
echo "🔍 Vérification Redis..."
if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis prêt"
else
    echo "❌ Redis non accessible"
    exit 1
fi

echo "✅ Infrastructure déployée"
```

### Étape 5.4 : Déploiement Application

```bash
echo "=== DÉPLOIEMENT APPLICATION ==="

# Démarrer l'application
echo "🚀 Démarrage application GENIA..."
docker-compose up -d app

# Attendre démarrage
echo "⏳ Attente démarrage application..."
sleep 45

# Vérifier santé application
echo "🔍 Vérification santé application..."
for i in {1..15}; do
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ Application prête"
        APP_READY=true
        break
    fi
    echo "⏳ Attente application... ($i/15)"
    sleep 10
done

if [[ "$APP_READY" != "true" ]]; then
    echo "❌ Application non accessible - vérifier logs"
    docker-compose logs app
    exit 1
fi

echo "✅ Application déployée"
```

### Étape 5.5 : Déploiement Proxy

```bash
echo "=== DÉPLOIEMENT REVERSE PROXY ==="

# Démarrer NGINX
echo "🌐 Démarrage NGINX..."
docker-compose up -d nginx

# Attendre démarrage NGINX
sleep 10

# Vérifier NGINX
if curl -f -s http://localhost/ > /dev/null; then
    echo "✅ NGINX prêt et proxy fonctionnel"
else
    echo "❌ NGINX non accessible"
    exit 1
fi

echo "✅ Reverse proxy déployé"
```

---

## ✅ Vérifications Post-Déploiement

### Étape 6.1 : Tests Fonctionnels

```bash
echo "=== TESTS FONCTIONNELS ==="

# Test page d'accueil
echo "🔍 Test page d'accueil..."
if curl -f -s http://localhost/ | grep -q "GENIA"; then
    echo "✅ Page d'accueil accessible"
else
    echo "❌ Page d'accueil inaccessible"
fi

# Test API Health
echo "🔍 Test API Health..."
HEALTH_RESPONSE=$(curl -s http://localhost/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo "✅ API Health OK"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "❌ API Health KO"
fi

# Test connexion base de données
echo "🔍 Test connexion base de données..."
if docker-compose exec -T postgres psql -U $(grep POSTGRES_USER .env | cut -d '=' -f2) -d genia -c "SELECT 1;" &> /dev/null; then
    echo "✅ Base de données accessible"
else
    echo "❌ Base de données inaccessible"
fi

# Test APIs externes (si clés configurées)
echo "🔍 Test APIs externes..."
if grep -q "sk-" .env; then
    HEALTH_SERVICES=$(curl -s http://localhost/api/health | jq -r '.services // empty' 2>/dev/null)
    if [[ -n "$HEALTH_SERVICES" ]]; then
        echo "Services externes:"
        echo "$HEALTH_SERVICES"
    fi
fi

echo "✅ Tests fonctionnels terminés"
```

### Étape 6.2 : Vérification Performance

```bash
echo "=== VÉRIFICATION PERFORMANCE ==="

# Statistiques conteneurs
echo "📊 Utilisation ressources:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Test temps de réponse
echo "🚀 Test temps de réponse:"
curl -o /dev/null -s -w "Temps réponse: %{time_total}s\n" http://localhost/

# Vérifier logs d'erreur
echo "🔍 Vérification logs erreurs:"
if docker-compose logs --since 5m | grep -i error | grep -v "node_modules"; then
    echo "⚠️  Erreurs détectées dans les logs"
else
    echo "✅ Pas d'erreurs récentes"
fi

echo "✅ Vérification performance terminée"
```

### Étape 6.3 : Status Final

```bash
echo "=== STATUS FINAL ==="

# Status des services
echo "📋 Status des services:"
docker-compose ps

echo ""
echo "🌐 URLs d'accès:"
BASE_URL=$(grep BASE_URL .env | cut -d '=' -f2)
echo "  Application: $BASE_URL"
echo "  API Health: $BASE_URL/api/health"

# Résumé déploiement
echo ""
echo "🎉 DÉPLOIEMENT GENIA TERMINÉ!"
echo "================================"
echo "✅ Infrastructure: PostgreSQL + Redis"
echo "✅ Application: GENIA Next.js"
echo "✅ Proxy: NGINX"
echo "✅ Sécurité: Firewall + Mots de passe"

if [[ -f "nginx/ssl/cert.pem" ]]; then
    echo "✅ SSL: Configuré"
fi

echo ""
echo "📝 Prochaines étapes recommandées:"
echo "1. Configurer monitoring (étape 7)"
echo "2. Configurer sauvegardes automatiques"
echo "3. Tester charge et optimiser"
```

---

## 🌐 Configuration Production

### Étape 7.1 : Activation Monitoring

```bash
echo "=== ACTIVATION MONITORING ==="

read -p "Activer monitoring Prometheus/Grafana? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Démarrer monitoring
    docker-compose --profile monitoring up -d
    
    # Attendre démarrage
    sleep 30
    
    # Vérifier Grafana
    if curl -f -s http://localhost:3001/login > /dev/null; then
        echo "✅ Grafana accessible sur http://localhost:3001"
        echo "   Login: admin / admin123"
    fi
    
    # Vérifier Prometheus
    if curl -f -s http://localhost:9090 > /dev/null; then
        echo "✅ Prometheus accessible sur http://localhost:9090"
    fi
    
    echo "✅ Monitoring activé"
fi
```

### Étape 7.2 : Configuration LLM Local (Optionnel)

```bash
echo "=== CONFIGURATION LLM LOCAL ==="

if lspci | grep -i nvidia &> /dev/null && command -v nvidia-smi &> /dev/null; then
    read -p "Activer LLM local avec GPU? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Configurer .env pour LLM
        sed -i "s/# ENABLE_LOCAL_LLM=false/ENABLE_LOCAL_LLM=true/g" .env
        
        # Démarrer LLM API
        echo "🤖 Démarrage LLM API (peut prendre 10-15 minutes)..."
        docker-compose --profile llm up -d
        
        echo "⏳ Téléchargement modèles en cours..."
        echo "   Suivez les logs: docker-compose logs -f llm-api"
        
        # Vérifier après délai
        sleep 60
        if curl -f -s http://localhost:8000/health > /dev/null; then
            echo "✅ LLM API accessible sur http://localhost:8000"
            curl -s http://localhost:8000/v1/models | jq '.data[] | {id, available}' 2>/dev/null
        else
            echo "⏳ LLM API en cours d'initialisation..."
        fi
    fi
else
    echo "ℹ️  GPU non détecté ou drivers manquants - LLM local ignoré"
fi
```

### Étape 7.3 : Optimisation Performance

```bash
echo "=== OPTIMISATION PERFORMANCE ==="

# Vérifier et optimiser selon hardware
CPU_CORES=$(nproc)
TOTAL_RAM=$(free -m | grep Mem | awk '{print $2}')

echo "📊 Hardware détecté:"
echo "   CPU: $CPU_CORES cores"
echo "   RAM: ${TOTAL_RAM}MB"

# Optimisations pour serveur haute performance
if [[ $CPU_CORES -ge 32 && $TOTAL_RAM -ge 100000 ]]; then
    echo "🚀 Application optimisations haute performance..."
    
    # Optimiser PostgreSQL
    docker-compose exec -T postgres psql -U $(grep POSTGRES_USER .env | cut -d '=' -f2) -d genia << EOF
ALTER SYSTEM SET shared_buffers = '16GB';
ALTER SYSTEM SET effective_cache_size = '64GB';
ALTER SYSTEM SET max_connections = 500;
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '2GB';
SELECT pg_reload_conf();
EOF
    
    echo "✅ PostgreSQL optimisé pour haute performance"
    
    # Redémarrer PostgreSQL pour appliquer
    docker-compose restart postgres
    sleep 15
fi

# Nettoyer Docker
docker system prune -f
echo "✅ Optimisation performance terminée"
```

---

## 📊 Monitoring et Maintenance

### Étape 8.1 : Configuration Sauvegardes

```bash
echo "=== CONFIGURATION SAUVEGARDES ==="

# Créer script de sauvegarde
cat > backup-genia.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/genia-backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Sauvegarde base de données
docker-compose exec -T postgres pg_dump -U $(grep POSTGRES_USER .env | cut -d '=' -f2) genia > $BACKUP_DIR/genia_db_$DATE.sql

# Sauvegarde configuration
cp .env $BACKUP_DIR/env_$DATE.backup

# Sauvegarde uploads (si existants)
if [[ -d "app/uploads" ]]; then
    tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz app/uploads/
fi

# Nettoyer anciennes sauvegardes (garder 30 dernières)
ls -t $BACKUP_DIR/genia_db_*.sql | tail -n +31 | xargs -r rm
ls -t $BACKUP_DIR/env_*.backup | tail -n +31 | xargs -r rm
ls -t $BACKUP_DIR/uploads_*.tar.gz | tail -n +31 | xargs -r rm

echo "✅ Sauvegarde terminée: $BACKUP_DIR"
EOF

chmod +x backup-genia.sh

# Programmer sauvegarde quotidienne
read -p "Programmer sauvegarde quotidienne à 2h? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Ajouter au crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./backup-genia.sh >> backup.log 2>&1") | crontab -
    echo "✅ Sauvegarde quotidienne programmée"
fi

echo "✅ Sauvegardes configurées"
```

### Étape 8.2 : Surveillance Automatique

```bash
echo "=== SURVEILLANCE AUTOMATIQUE ==="

# Script de surveillance
cat > monitor-genia.sh << 'EOF'
#!/bin/bash
LOG_FILE="monitor.log"

check_service() {
    if curl -f -s http://localhost/api/health > /dev/null; then
        echo "$(date): ✅ GENIA OK" >> $LOG_FILE
    else
        echo "$(date): ❌ GENIA DOWN - Redémarrage..." >> $LOG_FILE
        docker-compose restart app
        sleep 30
        if curl -f -s http://localhost/api/health > /dev/null; then
            echo "$(date): ✅ GENIA restauré" >> $LOG_FILE
        else
            echo "$(date): ❌ GENIA échec redémarrage" >> $LOG_FILE
        fi
    fi
}

check_service
EOF

chmod +x monitor-genia.sh

# Programmer surveillance toutes les 5 minutes
read -p "Programmer surveillance automatique? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    (crontab -l 2>/dev/null; echo "*/5 * * * * cd $(pwd) && ./monitor-genia.sh") | crontab -
    echo "✅ Surveillance automatique programmée"
fi

echo "✅ Surveillance configurée"
```

### Étape 8.3 : Alertes Email (Optionnel)

```bash
echo "=== CONFIGURATION ALERTES EMAIL ==="

read -p "Configurer alertes email? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Email administrateur: " ADMIN_EMAIL
    
    if [[ -n "$ADMIN_EMAIL" ]]; then
        # Installer mailutils
        sudo apt install -y mailutils
        
        # Modifier script surveillance
        sed -i "s/echo.*GENIA DOWN.*/&; echo 'GENIA service down' | mail -s 'GENIA Alert' $ADMIN_EMAIL/" monitor-genia.sh
        
        echo "✅ Alertes email configurées pour $ADMIN_EMAIL"
    fi
fi
```

---

## 🔄 Mise à Jour et Maintenance

### Étape 9.1 : Procédure Mise à Jour

```bash
echo "=== PROCÉDURE MISE À JOUR ==="

cat > update-genia.sh << 'EOF'
#!/bin/bash
echo "🔄 Mise à jour GENIA..."

# Sauvegarde avant mise à jour
./backup-genia.sh

# Pull nouvelles images
docker-compose pull

# Rebuild application si code modifié
read -p "Rebuild application? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose build --no-cache app
fi

# Déploiement avec zéro downtime
docker-compose up -d --remove-orphans

# Attendre stabilisation
sleep 30

# Vérifier santé
if curl -f -s http://localhost/api/health > /dev/null; then
    echo "✅ Mise à jour réussie"
else
    echo "❌ Mise à jour échouée - vérifier logs"
    docker-compose logs app
fi
EOF

chmod +x update-genia.sh

echo "✅ Script mise à jour créé: ./update-genia.sh"
```

### Étape 9.2 : Commandes Maintenance

```bash
echo "=== COMMANDES MAINTENANCE ==="

cat > maintenance-commands.md << 'EOF'
# 🔧 Commandes de Maintenance GENIA

## Surveillance
```bash
# Status des services
docker-compose ps

# Logs en temps réel
docker-compose logs -f

# Utilisation ressources
docker stats

# Santé application
curl http://localhost/api/health | jq
```

## Maintenance Base de Données
```bash
# Connexion PostgreSQL
docker-compose exec postgres psql -U genia_user -d genia

# Vacuum et analyze
docker-compose exec postgres psql -U genia_user -d genia -c "VACUUM ANALYZE;"

# Taille base de données
docker-compose exec postgres psql -U genia_user -d genia -c "SELECT pg_size_pretty(pg_database_size('genia'));"
```

## Gestion Services
```bash
# Redémarrer un service
docker-compose restart app

# Rebuild et redéployer
docker-compose build --no-cache app
docker-compose up -d app

# Voir logs d'erreur
docker-compose logs app | grep -i error

# Shell dans conteneur
docker-compose exec app sh
```

## Nettoyage
```bash
# Nettoyer images inutilisées
docker system prune -f

# Nettoyer volumes orphelins
docker volume prune -f

# Nettoyer tout (ATTENTION)
docker system prune -af
```
EOF

echo "✅ Guide maintenance créé: maintenance-commands.md"
```

---

## 🎉 Déploiement Terminé

### Étape 10 : Résumé Final

```bash
echo "=================================="
echo "🎉 DÉPLOIEMENT GENIA TERMINÉ!"
echo "=================================="
echo ""
echo "📋 Services déployés:"
docker-compose ps

echo ""
echo "🌐 URLs d'accès:"
BASE_URL=$(grep BASE_URL .env | cut -d '=' -f2)
echo "  📱 Application: $BASE_URL"
echo "  🔍 Health Check: $BASE_URL/api/health"

if docker-compose ps | grep -q grafana; then
    echo "  📊 Grafana: http://localhost:3001 (admin/admin123)"
    echo "  📈 Prometheus: http://localhost:9090"
fi

if docker-compose ps | grep -q llm-api; then
    echo "  🤖 LLM API: http://localhost:8000"
fi

echo ""
echo "📁 Fichiers importants:"
echo "  🔐 Configuration: .env"
echo "  💾 Backup mots de passe: .env.backup"
echo "  📜 Scripts: scripts/"
echo "  🔄 Mise à jour: ./update-genia.sh"
echo "  💾 Sauvegarde: ./backup-genia.sh"
echo "  👁️  Surveillance: ./monitor-genia.sh"

echo ""
echo "🔧 Commandes utiles:"
echo "  Status: docker-compose ps"
echo "  Logs: docker-compose logs -f"
echo "  Restart: docker-compose restart app"
echo "  Update: ./update-genia.sh"

echo ""
echo "📞 En cas de problème:"
echo "  1. Vérifier logs: docker-compose logs app"
echo "  2. Vérifier santé: curl http://localhost/api/health"
echo "  3. Redémarrer: docker-compose restart"
echo "  4. Consulter: maintenance-commands.md"

echo ""
echo "✅ GENIA est maintenant prêt en production!"
echo "🚀 Votre plateforme d'IA générative est opérationnelle!"
```

---

## 📞 Support et Troubleshooting

### Commandes de Debug Rapide

```bash
# Diagnostic complet
./scripts/deploy.sh status

# Logs détaillés
docker-compose logs --tail=100 app | grep -E "(error|Error|ERROR)"

# Test connectivité base
docker-compose exec app curl postgres:5432

# Redémarrage propre
docker-compose down && docker-compose up -d

# Restauration sauvegarde
./scripts/deploy.sh rollback
```

### Points de Contrôle Critique

1. ✅ **Docker installé et fonctionnel**
2. ✅ **Clés API configurées dans .env**
3. ✅ **Services démarrés (docker-compose ps)**
4. ✅ **Application accessible (curl localhost)**
5. ✅ **API Health OK (curl localhost/api/health)**
6. ✅ **Base de données connectée**
7. ✅ **Sauvegardes programmées**
8. ✅ **Surveillance active**

---

**🎯 Ce guide garantit un déploiement production robuste et sécurisé de GENIA !**
