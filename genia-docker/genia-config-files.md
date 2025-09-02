# 📁 Fichiers de Configuration GENIA

## 🔧 Next.js Configuration

### **next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA Configuration
  experimental: {
    appDir: true,
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['localhost', 'vercel.app'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      }
    ];
  },
  
  // Webpack configuration for better builds
  webpack: (config, { dev, isServer }) => {
    // Optimize for production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/
          }
        }
      };
    }
    
    return config;
  }
};

module.exports = nextConfig;
```

---

## 📋 Package.json Complet

### **package.json**

```json
{
  "name": "genia-mvp",
  "version": "1.0.0",
  "description": "GENIA for Tech_Students - Formation IA Générative",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "analyze": "ANALYZE=true npm run build",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "backup": "node scripts/backup.js",
    "health-check": "curl -f http://localhost:3000/api/health"
  },
  "dependencies": {
    "next": "14.0.3",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "typescript": "5.2.2",
    "@types/node": "20.8.10",
    "@types/react": "18.2.37",
    "@types/react-dom": "18.2.15",
    
    "lucide-react": "^0.294.0",
    "zustand": "^4.4.6",
    
    "@supabase/supabase-js": "^2.38.0",
    "openai": "^4.20.1",
    "@anthropic-ai/sdk": "^0.7.1",
    
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    
    "framer-motion": "^10.16.5",
    "recharts": "^2.8.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    
    "@next/bundle-analyzer": "^14.0.3"
  },
  "devDependencies": {
    "eslint": "^8.54.0",
    "eslint-config-next": "14.0.3",
    "@typescript-eslint/eslint-plugin": "^6.12.0",
    "@typescript-eslint/parser": "^6.12.0",
    
    "prettier": "^3.1.0",
    "prettier-plugin-tailwindcss": "^0.5.7",
    
    "jest": "^29.7.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.1.5",
    "jest-environment-jsdom": "^29.7.0",
    
    "@playwright/test": "^1.40.0",
    
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## 🧪 Tests Automatisés

### **Jest Configuration**

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}

module.exports = createJestConfig(customJestConfig)
```

### **Test Setup**

```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(() => Promise.resolve()),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock environment variables
process.env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
}
```

### **Tests E2E avec Playwright**

```javascript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

```javascript
// e2e/genia.spec.ts
import { test, expect } from '@playwright/test'

test.describe('GENIA Application', () => {
  test('should load homepage and generate session', async ({ page }) => {
    await page.goto('/')
    
    // Check if app loads
    await expect(page.locator('h1')).toContainText('GENIA for Tech_Students')
    
    // Check session generation
    await expect(page.locator('text=Session:')).toBeVisible()
    
    // Check modules are displayed
    await expect(page.locator('text=Fondamentaux IA Générative')).toBeVisible()
  })
  
  test('should navigate through modules', async ({ page }) => {
    await page.goto('/')
    
    // Click on first module
    await page.click('text=Commencer', { first: true })
    
    // Should navigate to module view
    await expect(page.locator('text=← Retour au tableau de bord')).toBeVisible()
    
    // Click on lesson
    await page.click('text=Commencer', { first: true })
    
    // Should see lesson content
    await expect(page.locator('textarea')).toBeVisible()
  })
  
  test('should work offline (PWA)', async ({ page, context }) => {
    await page.goto('/')
    
    // Go offline
    await context.setOffline(true)
    
    // App should still work
    await page.reload()
    await expect(page.locator('text=GENIA')).toBeVisible()
    
    // Should show offline status
    await expect(page.locator('text=Hors ligne')).toBeVisible()
  })
})
```

---

## 🔍 API Health Check

### **src/app/api/health/route.ts**

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'checking...',
      redis: 'checking...',
      openai: 'checking...',
      anthropic: 'checking...'
    }
  }

  try {
    // Check database connection
    if (process.env.SUPABASE_URL) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY!
        )
        const { error } = await supabase.from('user_sessions').select('count', { count: 'exact', head: true })
        healthcheck.services.database = error ? 'error' : 'healthy'
      } catch {
        healthcheck.services.database = 'error'
      }
    }

    // Check OpenAI API
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          signal: AbortSignal.timeout(5000)
        })
        healthcheck.services.openai = response.ok ? 'healthy' : 'error'
      } catch {
        healthcheck.services.openai = 'error'
      }
    }

    // Check Anthropic API
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          }),
          signal: AbortSignal.timeout(5000)
        })
        healthcheck.services.anthropic = response.ok ? 'healthy' : 'error'
      } catch {
        healthcheck.services.anthropic = 'error'
      }
    }

    return NextResponse.json(healthcheck, { status: 200 })
    
  } catch (error) {
    healthcheck.message = 'Service degraded'
    healthcheck.services.database = 'error'
    
    return NextResponse.json(healthcheck, { status: 503 })
  }
}
```

---

## 📊 Monitoring Dashboard

### **src/app/admin/page.tsx**

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Stats {
  totalSessions: number
  activeUsers: number
  completionRate: number
  avgScore: number
  apiCalls: number
  errors: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalSessions: 0,
    activeUsers: 0,
    completionRate: 0,
    avgScore: 0,
    apiCalls: 0,
    errors: 0
  })
  
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, healthRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/health')
        ])
        
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
        
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          setHealthStatus(healthData)
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    
    return () => clearInterval(interval)
  }, [])

  const mockChartData = [
    { name: 'Lun', users: 45, completions: 32 },
    { name: 'Mar', users: 52, completions: 41 },
    { name: 'Mer', users: 67, completions: 55 },
    { name: 'Jeu', users: 71, completions: 62 },
    { name: 'Ven', users: 89, completions: 75 },
    { name: 'Sam', users: 34, completions: 28 },
    { name: 'Dim', users: 28, completions: 22 },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GENIA Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Supervision et métriques de la plateforme
          </p>
        </div>

        {/* Health Status */}
        {healthStatus && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">État des Services</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(healthStatus.services).map(([service, status]) => (
                <div key={service} className="text-center">
                  <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                    status === 'healthy' ? 'bg-green-500' : 
                    status === 'checking...' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div className="text-sm font-medium capitalize">{service}</div>
                  <div className="text-xs text-gray-500">{status as string}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Sessions Totales"
            value={stats.totalSessions}
            change="+12%"
            positive={true}
          />
          <MetricCard
            title="Utilisateurs Actifs"
            value={stats.activeUsers}
            change="+8%"
            positive={true}
          />
          <MetricCard
            title="Taux de Completion"
            value={`${stats.completionRate}%`}
            change="+15%"
            positive={true}
          />
          <MetricCard
            title="Score Moyen"
            value={`${stats.avgScore}/100`}
            change="+3%"
            positive={true}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Activity */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Activité Utilisateurs</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Completions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Leçons Complétées</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completions" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

const MetricCard = ({ 
  title, 
  value, 
  change, 
  positive 
}: { 
  title: string
  value: string | number
  change: string
  positive: boolean 
}) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
    <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
    <div className={`text-sm ${positive ? 'text-green-600' : 'text-red-600'}`}>
      {change} vs semaine passée
    </div>
  </div>
)
```

---

## 🚨 Troubleshooting Guide

### **common-issues.md**

```markdown
# 🚨 Guide de Dépannage GENIA

## Problèmes Courants et Solutions

### 1. Application ne démarre pas

**Erreur**: `Error: Cannot find module 'next'`
```bash
# Solution
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Erreur**: `Error: connect ECONNREFUSED 127.0.0.1:5432`
```bash
# La base de données n'est pas démarrée
docker-compose up postgres -d
# ou pour Supabase, vérifier l'URL dans .env.local
```

### 2. API IA ne répond pas

**Symptômes**: Loading infini, erreur "AI service unavailable"

**Solutions**:
```bash
# Vérifier les clés API
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Tester Anthropic
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     https://api.anthropic.com/v1/messages

# Vérifier les quotas et limites de rate
```

### 3. Erreurs de Base de Données

**Erreur**: `relation "user_sessions" does not exist`
```sql
-- Relancer les scripts SQL dans Supabase
-- Ou en local :
docker-compose exec postgres psql -U genia_user -d genia -f /init.sql
```

**Erreur**: `row-level security policy violation`
```sql
-- Désactiver RLS temporairement pour debug
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;
```

### 4. Performance Lente

**Symptômes**: Chargement > 5 secondes

**Solutions**:
```bash
# Vérifier les logs
docker-compose logs app
docker-compose logs postgres

# Optimiser la DB
docker-compose exec postgres psql -U genia_user -d genia \
  -c "ANALYZE; VACUUM;"

# Monitor les ressources
docker stats
```

### 5. PWA ne s'installe pas

**Symptômes**: Pas de popup d'installation

**Vérifications**:
- Servir en HTTPS (même localhost avec certificat)
- Manifest.json accessible
- Service worker enregistré
- Icônes présentes

```bash
# Test manifest
curl -I http://localhost:3000/manifest.json

# Test service worker
curl -I http://localhost:3000/sw.js
```

### 6. Docker Compose Fails

**Erreur**: `nvidia-docker` non trouvé
```bash
# Installer NVIDIA Docker
sudo apt install nvidia-docker2
sudo systemctl restart docker
```

**Erreur**: Port déjà utilisé
```bash
# Trouver le processus
sudo netstat -tulpn | grep :3000
sudo kill -9 PID

# Ou changer le port dans docker-compose.yml
ports:
  - "3001:3000"
```

## 🔍 Commandes de Debug

### Logs en temps réel
```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f app
docker-compose logs -f postgres
```

### État des conteneurs
```bash
docker-compose ps
docker-compose top
docker stats
```

### Tests de connectivité
```bash
# Test interne aux conteneurs
docker-compose exec app curl http://postgres:5432
docker-compose exec app curl http://redis:6379

# Test API santé
curl http://localhost:3000/api/health
```

### Monitoring ressources
```bash
# CPU/RAM par service
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Espace disque
docker system df
docker volume ls
```

## 🔧 Commandes de Maintenance

### Nettoyage
```bash
# Suppression images inutilisées
docker image prune -f

# Suppression volumes orphelins
docker volume prune -f

# Nettoyage complet
docker system prune -af
```

### Sauvegarde/Restauration
```bash
# Sauvegarde DB
docker-compose exec postgres pg_dump -U genia_user genia > backup.sql

# Restauration
docker-compose exec -T postgres psql -U genia_user genia < backup.sql
```

### Mise à jour
```bash
# Pull dernières images
docker-compose pull

# Rebuild services modifiés
docker-compose build --no-cache

# Deploy sans interruption
docker-compose up -d --remove-orphans
```

## 📞 Support

Si les solutions ci-dessus ne résolvent pas le problème :

1. **Vérifier les logs** : `docker-compose logs -f`
2. **Tester la connectivité** : `curl http://localhost:3000/api/health`
3. **Vérifier les resources** : `docker stats`
4. **Restart services** : `docker-compose restart`

En dernier recours :
```bash
docker-compose down -v
docker-compose up -d --build
```
```

Cette configuration complète vous donne **tout ce qu'il faut** pour un déploiement professionnel de GENIA ! 🚀💪
