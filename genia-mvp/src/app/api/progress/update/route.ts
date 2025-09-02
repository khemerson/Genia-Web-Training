import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, moduleId, lessonId, completed, score, aiResponse } = await request.json();

    // Validation
    if (!sessionId || !moduleId || !lessonId) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Vérification/création session
    const { data: existingSession } = await supabase
      .from('user_sessions')
      .select('session_id')
      .eq('session_id', sessionId)
      .single();

    if (!existingSession) {
      const { error: createError } = await supabase
        .from('user_sessions')
        .insert({ session_id: sessionId });
        
      if (createError) {
        console.error('Error creating session:', createError);
      }
    }

    // Mise à jour progression
    const { data, error } = await supabase
      .from('user_progress')
      .upsert({
        session_id: sessionId,
        module_id: moduleId,
        lesson_id: lessonId,
        completed: completed || false,
        score: score || null,
        ai_feedback: aiResponse || null,
        completed_at: completed ? new Date().toISOString() : null
      }, {
        onConflict: 'session_id,module_id,lesson_id'
      });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Erreur base de données', details: error.message },
        { status: 500 }
      );
    }

    // Mise à jour last_active de la session
    await supabase
      .from('user_sessions')
      .update({ last_active: new Date().toISOString() })
      .eq('session_id', sessionId);

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Progress update error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET pour récupérer la progression
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID manquant' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Get progress error:', error);
      return NextResponse.json(
        { error: 'Erreur récupération données' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      progress: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}