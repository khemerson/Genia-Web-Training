#!/bin/bash

# 🚀 GENIA Docker Deployment Script
# Déploiement production avec gestion de version et rollback

set -e

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

# Configuration
COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Fonctions utilitaires
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose not found. Please install Docker Compose first."
        exit 1
    fi
    
    if [[ ! -f .env ]]; then
        log_error ".env file not found. Please run setup.sh first."
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

create_backup() {
    log_info "Creating backup before deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up PostgreSQL database..."
        docker-compose exec -T postgres pg_dump -U \$(grep POSTGRES_USER .env | cut -d '=' -f2) genia > "$BACKUP_DIR/database_$TIMESTAMP.sql"
        log_success "Database backup created: $BACKUP_DIR/database_$TIMESTAMP.sql"
    fi
    
    # Backup application data
    if [[ -d "app/uploads" ]]; then
        log_info "Backing up application uploads..."
        tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" app/uploads/
        log_success "Uploads backup created: $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"
    fi
    
    # Backup configuration
    log_info "Backing up configuration..."
    cp .env "$BACKUP_DIR/env_$TIMESTAMP.backup"
    log_success "Configuration backup created: $BACKUP_DIR/env_$TIMESTAMP.backup"
}

health_check() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    log_info "Checking health of $service..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose exec -T $service curl -f http://localhost:3000/api/health &> /dev/null; then
            log_success "$service is healthy"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: Waiting for $service to be healthy..."
        sleep 10
        ((attempt++))
    done
    
    log_error "$service failed health check after $max_attempts attempts"
    return 1
}

deploy_services() {
    log_info "🚀 Starting GENIA production deployment..."
    
    # Pull latest images
    log_info "📥 Pulling latest base images..."
    docker-compose pull postgres redis nginx grafana prometheus
    
    # Build custom images with no cache for clean build
    log_info "🔨 Building application images..."
    docker-compose build --no-cache app
    
    # Deploy infrastructure services first (database, cache)
    log_info "🏗️  Deploying infrastructure services..."
    docker-compose up -d postgres redis
    
    # Wait for infrastructure to be ready
    log_info "⏳ Waiting for infrastructure services..."
    sleep 30
    
    # Check database connectivity
    log_info "🔍 Checking database connectivity..."
    local db_ready=false
    for i in {1..10}; do
        if docker-compose exec -T postgres pg_isready -U \$(grep POSTGRES_USER .env | cut -d '=' -f2) &> /dev/null; then
            db_ready=true
            break
        fi
        log_info "Waiting for database... ($i/10)"
        sleep 5
    done
    
    if [[ "$db_ready" != true ]]; then
        log_error "Database not ready after 50 seconds"
        exit 1
    fi
    
    log_success "Database is ready"
    
    # Deploy application
    log_info "🚀 Deploying application..."
    docker-compose up -d app
    
    # Wait for application
    sleep 20
    
    # Deploy proxy
    log_info "🌐 Deploying reverse proxy..."
    docker-compose up -d nginx
    
    # Deploy monitoring (if enabled)
    if grep -q "ENABLE_MONITORING=true" .env; then
        log_info "📊 Deploying monitoring stack..."
        docker-compose --profile monitoring up -d
    fi
    
    # Deploy LLM API (if enabled and GPU available)
    if grep -q "ENABLE_LOCAL_LLM=true" .env && lspci | grep -i nvidia &> /dev/null; then
        log_info "🤖 Deploying local LLM API..."
        docker-compose --profile llm up -d
    fi
}

run_migrations() {
    log_info "🗃️  Running database migrations..."
    
    # Wait for app to be ready
    sleep 10
    
    # Run any pending migrations
    if docker-compose exec -T app npm run db:migrate &> /dev/null; then
        log_success "Migrations completed successfully"
    else
        log_warning "No migrations to run or migration command not available"
    fi
}

verify_deployment() {
    log_info "🔍 Verifying deployment..."
    
    # Check all service status
    docker-compose ps
    
    # Check application health
    if health_check app; then
        log_success "Application health check passed"
    else
        log_error "Application health check failed"
        return 1
    fi
    
    # Check main endpoints
    log_info "Testing main endpoints..."
    
    local base_url="http://localhost"
    
    # Test homepage
    if curl -f -s "$base_url" > /dev/null; then
        log_success "Homepage accessible"
    else
        log_error "Homepage not accessible"
        return 1
    fi
    
    # Test API health endpoint
    if curl -f -s "$base_url/api/health" > /dev/null; then
        log_success "API health endpoint accessible"
    else
        log_error "API health endpoint not accessible"
        return 1
    fi
    
    log_success "All verification checks passed"
}

cleanup() {
    log_info "🧹 Cleaning up unused Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old backups (keep last 10)
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -t "$BACKUP_DIR"/database_*.sql | tail -n +11 | xargs -r rm
        ls -t "$BACKUP_DIR"/uploads_*.tar.gz | tail -n +11 | xargs -r rm
        ls -t "$BACKUP_DIR"/env_*.backup | tail -n +11 | xargs -r rm
    fi
    
    log_success "Cleanup completed"
}

rollback() {
    log_error "🔄 Rolling back deployment..."
    
    # Stop current services
    docker-compose down
    
    # Find latest backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/database_*.sql 2>/dev/null | head -n1)
    local latest_env=$(ls -t "$BACKUP_DIR"/env_*.backup 2>/dev/null | head -n1)
    
    if [[ -n "$latest_backup" && -n "$latest_env" ]]; then
        log_info "Restoring from backup: $latest_backup"
        
        # Restore environment
        cp "$latest_env" .env
        
        # Start infrastructure
        docker-compose up -d postgres redis
        sleep 30
        
        # Restore database
        docker-compose exec -T postgres psql -U \$(grep POSTGRES_USER .env | cut -d '=' -f2) genia < "$latest_backup"
        
        # Start application
        docker-compose up -d app nginx
        
        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
        exit 1
    fi
}

show_status() {
    echo ""
    echo "🎯 GENIA Docker Status"
    echo "======================"
    
    docker-compose ps
    
    echo ""
    echo "📊 Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    
    echo ""
    echo "🌐 Service URLs:"
    echo "   Application: http://localhost"
    echo "   Grafana: http://localhost:3001"
    echo "   Prometheus: http://localhost:9090"
    
    if curl -s http://localhost/api/health | grep -q "OK"; then
        log_success "Application is healthy"
    else
        log_warning "Application health check failed"
    fi
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        echo "🚀 GENIA Production Deployment"
        echo "=============================="
        
        check_dependencies
        create_backup
        deploy_services
        run_migrations
        
        if verify_deployment; then
            cleanup
            show_status
            echo ""
            log_success "🎉 Deployment completed successfully!"
            echo ""
            echo "🌐 Your GENIA application is now available at: http://localhost"
            echo "📊 Monitoring dashboard: http://localhost:3001 (admin/admin123)"
        else
            log_error "Deployment verification failed"
            read -p "Do you want to rollback? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback
            fi
            exit 1
        fi
        ;;
        
    "rollback")
        log_warning "Initiating rollback procedure..."
        rollback
        ;;
        
    "status")
        show_status
        ;;
        
    "backup")
        check_dependencies
        create_backup
        log_success "Backup completed"
        ;;
        
    "health")
        if health_check app; then
            echo "Application is healthy"
            exit 0
        else
            echo "Application is unhealthy"
            exit 1
        fi
        ;;
        
    "logs")
        docker-compose logs -f "${2:-app}"
        ;;
        
    "restart")
        log_info "Restarting services..."
        docker-compose restart "${2:-}"
        log_success "Services restarted"
        ;;
        
    "stop")
        log_info "Stopping all services..."
        docker-compose down
        log_success "All services stopped"
        ;;
        
    "help"|*)
        echo "🐳 GENIA Docker Deployment Tool"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Deploy GENIA to production (default)"
        echo "  rollback  - Rollback to previous backup"
        echo "  status    - Show deployment status"
        echo "  backup    - Create backup only"
        echo "  health    - Check application health"
        echo "  logs      - Show logs [service]"
        echo "  restart   - Restart services [service]"
        echo "  stop      - Stop all services"
        echo "  help      - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 deploy          # Full deployment"
        echo "  $0 logs app        # Show app logs"
        echo "  $0 restart nginx   # Restart nginx only"
        ;;
esac
