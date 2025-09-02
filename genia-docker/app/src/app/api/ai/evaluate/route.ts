import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, sessionId, moduleId, lessonId } = await request.json();

    // Validation
    if (!prompt || !context || !sessionId) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Système de prompts GENIA contextuels
    const systemPrompts = {
      quiz: `Tu es GENIA, assistant pédagogique expert en IA générative.

Style: Hemerson KOFFI - bienveillant, constructif, progressif.

Évalue cette réponse de quiz et fournis :
1. Score sur 100
2. Points forts (2-3 éléments)  
3. Points à améliorer (1-2 éléments)
4. Recommandation pour la suite
5. Encouragement personnalisé

Format: Structure claire avec sections distinctes.
Ton: Professionnel mais encourageant.`,

      practice: `Tu es GENIA, expert en prompt engineering et IA générative.

Analyse ce prompt créé par l'étudiant selon :
1. Clarté des instructions (0-25 points)
2. Spécificité du contexte (0-25 points)  
3. Format de sortie défini (0-25 points)
4. Créativité/innovation (0-25 points)

Fournis un score global /100 et des suggestions d'amélioration concrètes avec des exemples.`,

      theory: `Tu es GENIA, pédagogue expert en IA générative.

Réponds à cette question/réflexion en adoptant le style Hemerson KOFFI :
- Concepts clairs avec analogies
- Exemples concrets et pratiques  
- Progression logique
- Applications business
- Ouvertures pour approfondir

Ton: Expert accessible, pas professeur distant.`
    };

    let response;
    let provider = 'unknown';

    try {
      // Essai OpenAI d'abord (plus rapide)
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompts[context as keyof typeof systemPrompts] || systemPrompts.theory
          },
          {
            role: "user",
            content: `Session ${sessionId} - Module ${moduleId} - Leçon ${lessonId}\n\nContenu étudiant :\n${prompt}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1200
      });
      
      response = completion.choices[0].message.content;
      provider = 'openai';
      
    } catch (openaiError) {
      console.log('OpenAI failed, trying Claude...', openaiError);
      
      // Fallback vers Claude
      const claudeResponse = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1200,
        temperature: 0.3,
        messages: [{
          role: "user",
          content: `${systemPrompts[context as keyof typeof systemPrompts]}\n\nSession ${sessionId} - Module ${moduleId}\n\nContenu étudiant :\n${prompt}`
        }]
      });
      
      response = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : '';
      provider = 'claude';
    }

    // Extraction du score si c'est un quiz/practice
    let score = null;
    if (context === 'quiz' || context === 'practice') {
      const scoreMatch = response?.match(/(?:score|Score).*?(\d{1,3})(?:\/100|%|\s)/);
      score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    }

    return NextResponse.json({
      response,
      provider,
      score,
      timestamp: new Date().toISOString(),
      success: true
    });

  } catch (error) {
    console.error('AI Evaluation error:', error);
    
    // Fallback response
    return NextResponse.json({
      response: `Évaluation temporairement indisponible. 

Votre travail a été sauvegardé et sera évalué dès le retour du service IA.

En attendant, continuez votre apprentissage - tous les modules restent accessibles !

*Message automatique GENIA*`,
      provider: 'fallback',
      error: true,
      timestamp: new Date().toISOString()
    });
  }
}