// src/app/api/mistral/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  sessionId?: string;
  lessonContext?: string;
  moduleContext?: string;
  stream?: boolean;
}

// Configuration des providers avec les modèles spécifiés
const PROVIDERS = {
  mistral: {
    name: 'mistral',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    apiKey: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest'
  },
  openai: {
    name: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-5-mini'
  },
  anthropic: {
    name: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-5-haiku-20241022'
  }
};

// Fonction pour créer un stream de réponse
function createStreamResponse(content: string, provider: string, fallbackUsed = false) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const chunks = content.split(' ');
      let index = 0;
      
      const sendChunk = () => {
        if (index < chunks.length) {
          const chunk = {
            choices: [{
              delta: {
                content: chunks[index] + ' '
              },
              finish_reason: null
            }],
            provider,
            fallbackUsed
          };
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
          index++;
          setTimeout(sendChunk, 50); // Délai pour simuler le streaming naturel
        } else {
          // Message de fin
          const finalChunk = {
            choices: [{
              delta: {},
              finish_reason: 'stop'
            }],
            provider,
            fallbackUsed
          };
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`)
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      };
      
      sendChunk();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

// Fonction pour appeler Mistral AI avec streaming
async function callMistralAPI(body: RequestBody) {
  if (!PROVIDERS.mistral.apiKey) {
    throw new Error('Mistral API key not configured');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PROVIDERS.mistral.apiKey}`,
    'X-Session-ID': body.sessionId || 'anonymous'
  };

  const payload = {
    model: PROVIDERS.mistral.model,
    messages: body.messages,
    temperature: body.temperature || 0.7,
    max_tokens: body.max_tokens || 1500,
    top_p: 0.9,
    stream: true,
    safe_prompt: false
  };

  const response = await fetch(PROVIDERS.mistral.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }

  return response;
}

// Fonction pour appeler OpenAI API avec streaming
async function callOpenAIAPI(body: RequestBody) {
  if (!PROVIDERS.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PROVIDERS.openai.apiKey}`,
  };

  const payload = {
    model: PROVIDERS.openai.model,
    messages: body.messages,
    temperature: body.temperature || 0.7,
    max_tokens: body.max_tokens || 1500,
    top_p: 0.9,
    stream: true
  };

  const response = await fetch(PROVIDERS.openai.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return response;
}

// Fonction pour appeler Anthropic API avec streaming
async function callAnthropicAPI(body: RequestBody) {
  if (!PROVIDERS.anthropic.apiKey) {
    throw new Error('Anthropic API key not configured');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': PROVIDERS.anthropic.apiKey,
    'anthropic-version': '2023-06-01'
  };

  // Anthropic utilise un format différent
  const systemMessage = body.messages.find(msg => msg.role === 'system');
  const conversationMessages = body.messages.filter(msg => msg.role !== 'system');

  const payload = {
    model: PROVIDERS.anthropic.model,
    max_tokens: body.max_tokens || 1500,
    temperature: body.temperature || 0.7,
    system: systemMessage?.content || '',
    messages: conversationMessages,
    stream: true
  };

  const response = await fetch(PROVIDERS.anthropic.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  return response;
}

// Fonction pour transformer le stream d'un provider en format uniforme
async function transformProviderStream(response: Response, provider: string, fallbackUsed = false) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  if (!reader) {
    throw new Error('No response body');
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                
                // Format uniforme pour tous les providers
                let transformedChunk;
                
                if (provider === 'mistral' || provider === 'openai') {
                  transformedChunk = {
                    choices: [{
                      delta: {
                        content: parsed.choices?.[0]?.delta?.content || ''
                      },
                      finish_reason: parsed.choices?.[0]?.finish_reason || null
                    }],
                    provider,
                    fallbackUsed
                  };
                } else if (provider === 'anthropic') {
                  transformedChunk = {
                    choices: [{
                      delta: {
                        content: parsed.delta?.text || ''
                      },
                      finish_reason: parsed.type === 'message_stop' ? 'stop' : null
                    }],
                    provider,
                    fallbackUsed
                  };
                }
                
                if (transformedChunk) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(transformedChunk)}\n\n`)
                  );
                }
              } catch {
                // Ignorer les erreurs de parsing pour les chunks malformés
                continue;
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream transform error:', error);
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

// Fonction principale avec fallback en cascade et streaming
async function generateChatCompletionStream(body: RequestBody) {
  const fallbackMessages = {
    mistral: "🔄 **Assistant GENIA - Bascule vers OpenAI**\n\nMistral est temporairement surchargé, je continue avec OpenAI pour vous offrir la meilleure expérience ! ✨\n\n",
    openai: "🔄 **Assistant GENIA - Bascule vers Anthropic**\n\nOpenAI est temporairement indisponible, je bascule vers Claude (Anthropic) pour maintenir notre conversation ! 🚀\n\n",
    anthropic: "🤖 **Assistant GENIA - Mode Dégradé**\n\nTous nos services IA sont temporairement surchargés, mais votre apprentissage continue !\n\n**En attendant :**\n• Relisez attentivement cette leçon - chaque détail compte\n• Prenez des notes sur vos questions\n• Testez vos connaissances en reformulant les concepts\n\n*Je reviens très vite ! 💪*"
  };

  // Tentative 1: Mistral AI
  try {
    console.log('Tentative avec Mistral AI...');
    const response = await callMistralAPI(body);
    return await transformProviderStream(response, 'mistral', false);
  } catch (mistralError: unknown) {
    const errorMessage = mistralError instanceof Error ? mistralError.message : 'Unknown error';
    console.log('Mistral AI indisponible, bascule vers OpenAI:', errorMessage);
    
    // Tentative 2: OpenAI
    try {
      const response = await callOpenAIAPI(body);
      
      // Créer un stream avec message de fallback suivi du contenu OpenAI
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Envoyer le message de fallback d'abord
          const fallbackChunk = {
            choices: [{
              delta: { content: fallbackMessages.mistral },
              finish_reason: null
            }],
            provider: 'openai',
            fallbackUsed: true
          };
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(fallbackChunk)}\n\n`)
          );
          
          // Puis streamer la réponse OpenAI
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          
          if (reader) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    if (data === '[DONE]') {
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                      controller.close();
                      return;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      const transformedChunk = {
                        choices: [{
                          delta: {
                            content: parsed.choices?.[0]?.delta?.content || ''
                          },
                          finish_reason: parsed.choices?.[0]?.finish_reason || null
                        }],
                        provider: 'openai',
                        fallbackUsed: true
                      };
                      
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(transformedChunk)}\n\n`)
                      );
                    } catch {
                      continue;
                    }
                  }
                }
              }
            } catch (streamError) {
              controller.error(streamError);
            }
          }
        }
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
      
    } catch (openaiError: unknown) {
      const errorMessage = openaiError instanceof Error ? openaiError.message : 'Unknown error';
      console.log('OpenAI indisponible, bascule vers Anthropic:', errorMessage);
      
      // Tentative 3: Anthropic
      try {
        const response = await callAnthropicAPI(body);
        return await transformProviderStream(response, 'anthropic', true);
      } catch {
        console.log('Tous les providers indisponibles');
        
        // Fallback final avec message système en streaming
        return createStreamResponse(fallbackMessages.anthropic, 'system-fallback', true);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    // Validation des paramètres
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Vérification des clés API
    const missingKeys = [];
    if (!PROVIDERS.mistral.apiKey) missingKeys.push('MISTRAL_API_KEY');
    if (!PROVIDERS.openai.apiKey) missingKeys.push('OPENAI_API_KEY');
    if (!PROVIDERS.anthropic.apiKey) missingKeys.push('ANTHROPIC_API_KEY');

    if (missingKeys.length > 0) {
      console.warn(`Clés API manquantes: ${missingKeys.join(', ')}`);
    }

    // Forcer le streaming
    body.stream = true;

    // Génération avec fallback et streaming
    return await generateChatCompletionStream(body);

  } catch (error) {
    console.error('Chat API Error:', error);

    // Fallback ultime en streaming
    const ultimateFallback = `🤖 **Assistant GENIA - Mode Dégradé Complet**

Une erreur technique inattendue s'est produite, mais votre formation continue !

**Continuons sans interruption :**
• Révisez les concepts de cette leçon
• Notez vos questions pour notre prochaine interaction
• Explorez les exemples pratiques fournis
• Testez votre compréhension avec les exercices

**L'apprentissage ne s'arrête jamais chez GENIA !** 🚀

*Tous les systèmes reviendront bientôt en ligne.* ✨`;

    return createStreamResponse(ultimateFallback, 'emergency-fallback', true);
  }
}

// Endpoint pour lister les modèles disponibles
export async function GET() {
  try {
    const availableModels: Array<{
      id: string;
      name: string;
      provider: string;
      description: string;
      available: boolean;
      streaming: boolean;
    }> = [];

    // Ajouter les modèles spécifiés
    Object.values(PROVIDERS).forEach(provider => {
      if (provider.apiKey) {
        availableModels.push({
          id: provider.model,
          name: provider.model,
          provider: provider.name,
          description: `${provider.name} model: ${provider.model}`,
          available: true,
          streaming: true
        });
      }
    });

    return NextResponse.json({
      available_models: availableModels,
      fallback_enabled: true,
      streaming_enabled: true,
      providers_configured: Object.keys(PROVIDERS).filter(key => PROVIDERS[key as keyof typeof PROVIDERS].apiKey).length,
      total_providers: Object.keys(PROVIDERS).length
    });

  } catch (error) {
    console.error('GET Models Error:', error);
    
    return NextResponse.json({
      available_models: [
        { id: 'mistral-small-latest', name: 'Mistral Small Latest', provider: 'mistral', available: false },
        { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', available: false },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', available: false }
      ],
      fallback_enabled: true,
      streaming_enabled: true,
      error: 'Unable to fetch live model status'
    });
  }
}
