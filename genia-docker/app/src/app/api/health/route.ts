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
      openai: 'checking...',
      anthropic: 'checking...',
      mistral: 'checking...'
    }
  }

  try {
    // Check database connection
    if (process.env.DATABASE_URL) {
      try {
        // For PostgreSQL/Supabase connection check
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.DATABASE_URL.replace('postgresql://', 'https://').split('@')[1].split('/')[0],
          process.env.SUPABASE_ANON_KEY || 'dummy'
        )
        const { error } = await supabase.from('user_sessions').select('count', { count: 'exact', head: true })
        healthcheck.services.database = error ? 'error' : 'healthy'
      } catch {
        healthcheck.services.database = 'not_configured'
      }
    } else {
      healthcheck.services.database = 'not_configured'
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
    } else {
      healthcheck.services.openai = 'not_configured'
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
    } else {
      healthcheck.services.anthropic = 'not_configured'
    }

    // Check Mistral API
    if (process.env.MISTRAL_API_KEY) {
      try {
        const response = await fetch('https://api.mistral.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}` },
          signal: AbortSignal.timeout(5000)
        })
        healthcheck.services.mistral = response.ok ? 'healthy' : 'error'
      } catch {
        healthcheck.services.mistral = 'error'
      }
    } else {
      healthcheck.services.mistral = 'not_configured'
    }

    return NextResponse.json(healthcheck, { status: 200 })
    
  } catch (error) {
    healthcheck.message = 'Service degraded'
    healthcheck.services.database = 'error'
    
    return NextResponse.json(healthcheck, { status: 503 })
  }
}
