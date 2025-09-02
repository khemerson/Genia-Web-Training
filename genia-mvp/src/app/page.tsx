'use client'

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Brain, Target, Award, ChevronRight, Play, CheckCircle, Clock, User, Wifi, WifiOff, Send, Bot, Sparkles, MessageCircle, Minimize2 } from 'lucide-react';

// Types pour la structure des données
interface Module {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'initiation' | 'perfectionnement' | 'specialise' | 'business';
  lessons: Lesson[];
  completed: boolean;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  type: 'theory' | 'practice' | 'quiz';
  completed: boolean;
  score?: number;
}

interface UserProgress {
  sessionId: string;
  currentModule: string;
  currentLesson: string;
  completedLessons: string[];
  scores: { [key: string]: number };
  level: 'debutant' | 'intermediaire' | 'avance';
  lastSync: string;
}

// Interface pour les messages de chat
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  lessonContext?: string;
  moduleContext?: string;
  score?: number;
}

// Hook pour détection PWA
const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Détection mode standalone (PWA installée)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone;
    setIsInstalled(isStandalone);

    // Détection possibilité d'installation
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setIsInstallable(true);
    };

    // Détection online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installPWA = async () => {
    // Note: deferredPrompt doit être stocké globalement car accessible depuis différents scopes
    const event = (window as any).deferredPrompt;
    if (event) {
      event.prompt();
      const result = await event.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstallable(false);
        setIsInstalled(true);
      }
    }
  };

  return { isInstallable, isInstalled, isOnline, installPWA };
};

// Composant Chat Intelligent
const IntelligentChatInterface = ({ 
  lesson, 
  module, 
  sessionId, 
  onScoreUpdate 
}: {
  lesson: Lesson;
  module: Module; 
  sessionId: string;
  onScoreUpdate: (score: number) => void;
}) => {
  // État du chat (hooks doivent être appelés avant tout early return)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'evaluation' | 'conversation' | 'exploration'>('evaluation');
  const [isExpanded, setIsExpanded] = useState(true);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  
  // Références
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Messages d'accueil contextuels selon le type de leçon (hooks DOIVENT être avant les returns conditionnels)
  useEffect(() => {
    if (lesson && module) {
      const welcomeMessage = generateWelcomeMessage(
        lesson?.type || 'theory', 
        lesson?.title || 'Formation GENIA'
      );
      const suggestions = generateSuggestions(lesson?.type || 'theory');
      
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        lessonContext: lesson?.id || 'unknown',
        moduleContext: module?.id || 'unknown'
      }]);
      
      setSuggestedQuestions(suggestions);
    }
  }, [lesson, module]);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Protection contre les props undefined (APRÈS tous les hooks)
  if (!lesson || !module || !sessionId) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement de l&apos;assistant GENIA...</p>
      </div>
    );
  }

  // Génération du message d'accueil contextuel
  const generateWelcomeMessage = (lessonType: string, lessonTitle: string = "cette leçon") => {
    const messages = {
      'theory': `🎓 **Salut ! Je suis ton assistant GENIA intelligent.**

Je suis là pour t'accompagner dans ta découverte de "${lessonTitle}". 

**Je peux t'aider à :**
• Clarifier des concepts complexes avec des analogies simples
• Répondre à tes questions spécifiques  
• Te donner des exemples concrets d'application
• T'encourager dans ta progression !

**Comment aimerais-tu commencer ?** Pose-moi n'importe quelle question ou choisis une suggestion ci-dessous ! 👇`,

      'practice': `💪 **Prêt pour l'exercice pratique ?**

Je vais t'accompagner dans "${lessonTitle}" comme un mentor bienveillant.

**Mon rôle :**
• Analyser tes créations pas à pas
• Te donner des conseils d'amélioration personnalisés
• Célébrer tes réussites et t'encourager
• T'aider à atteindre le niveau expert !

**Partage ton travail quand tu veux**, je suis là pour t'aider à progresser ! 🚀`,

      'quiz': `🎯 **Time to shine ! Évaluation intelligente en cours.**

Je ne suis pas qu'un correcteur automatique - je suis ton **coach personnalisé** !

**Ma mission :**
• Comprendre ton raisonnement unique
• Identifier tes points forts pour les célébrer  
• Détecter les zones d'amélioration avec bienveillance
• T'accompagner vers la maîtrise complète !

**Réponds aux questions à ton rythme**, puis on analysera ensemble tes réflexions ! 💫`
    };

    return messages[lessonType as keyof typeof messages] || messages.theory;
  };

  // Génération de suggestions contextuelles
  const generateSuggestions = (lessonType: string) => {
    const suggestions = {
      'theory': [
        "Explique-moi ce concept avec une analogie simple",
        "Quels sont les applications concrètes de cette leçon ?",
        "Comment cela s'applique dans le monde professionnel ?"
      ],
      'practice': [
        "Comment puis-je améliorer mon prompt ?",
        "Analyse mon approche étape par étape",  
        "Donne-moi des exemples d'optimisation"
      ],
      'quiz': [
        "Vérifie ma compréhension des concepts clés",
        "Aide-moi à structurer ma réponse",
        "Quels points dois-je approfondir ?"
      ]
    };

    return suggestions[lessonType as keyof typeof suggestions] || suggestions.theory;
  };



  // Appel API Mistral intelligent avec streaming
  const callMistralAPI = async (userMessage: string, conversationHistory: ChatMessage[]) => {
    setIsLoading(true);
    
    try {
      // Construction du contexte de conversation
      const systemPrompt = `Tu es GENIA, assistant pédagogique expert en IA générative, basé sur la méthodologie d'Hemerson KOFFI.

CONTEXTE LEÇON :
- Module : ${module?.title || 'Formation GENIA'}
- Leçon : ${lesson?.title || 'Leçon interactive'} (${lesson?.type || 'theory'})
- Session utilisateur : ${sessionId}

PERSONNALITÉ :
- Bienveillant et encourageant comme un mentor  
- Expert technique mais accessible
- Adapte ton niveau selon les réponses de l'utilisateur
- Utilise des analogies et exemples concrets
- Célèbre les progrès, guide avec patience

INSTRUCTIONS :
${lesson?.type === 'quiz' ? 
  '- Évalue les réponses avec un score /100 et feedback détaillé\n- Identifie points forts ET axes d\'amélioration\n- Encourage et motive constamment' :
lesson?.type === 'practice' ? 
  '- Analyse les créations pratiques avec expertise\n- Donne des conseils d\'amélioration concrets\n- Propose des variations et optimisations' :
  '- Réponds aux questions avec clarté et profondeur\n- Donne des exemples pratiques\n- Relie aux applications professionnelles'
}

STYLE : Conversationnel, expert mais chaleureux, émojis appropriés`;

      // Messages pour l'API  
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      // Créer le message assistant avec contenu vide pour le streaming
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        lessonContext: lesson?.id || 'unknown',
        moduleContext: module?.id || 'unknown'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Appel API Mistral avec streaming
      const response = await fetch('/api/mistral/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: 'mistral-medium-latest',
          temperature: 0.7,
          max_tokens: 1500,
          sessionId,
          lessonContext: lesson?.id || 'unknown',
          moduleContext: module?.id || 'unknown',
          stream: true // Active le streaming
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Lecture du stream
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                  const content = data.choices[0].delta.content;
                  fullContent += content;

                  // Mise à jour en temps réel du message
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === assistantMessageId 
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // Ignorer les lignes JSON malformées
              }
            }
          }
        }

        // Extraction du score final
        let score: number | null = null;
        if ((lesson?.type === 'quiz' || lesson?.type === 'practice') && fullContent) {
          const scoreMatch = fullContent.match(/(?:Score|score).*?(\d{1,3})(?:\/100|%|\s)/);
          if (scoreMatch) {
            score = parseInt(scoreMatch[1]);
            onScoreUpdate(score);
            
            // Mise à jour finale avec le score
            setMessages(prev => 
              prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, score: score || undefined }
                  : msg
              )
            );
          }
        }

        return {
          content: fullContent,
          model: 'mistral-medium-latest',
          score
        };
      }

    } catch (error) {
      console.error('Mistral API Error:', error);
      
      // Fallback gracieux
      const fallbackContent = `Je rencontre un petit souci technique, mais je reste là pour t'aider ! 

En attendant que la connexion se rétablisse, voici quelques points clés sur cette leçon :

${lesson?.type === 'theory' ? 
  '• Les concepts abordés sont fondamentaux pour la suite\n• N\'hésite pas à relire les sections importantes\n• Les applications pratiques viendront dans les prochains modules' :
  '• Continue tes exercices, ils seront évalués dès le retour du service\n• L\'important est de pratiquer et expérimenter\n• Sauvegarde tes créations pour les analyser ensemble plus tard'
}

Retente dans quelques minutes !`;

      // Mise à jour avec le message de fallback
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: fallbackContent,
        timestamp: new Date(),
        lessonContext: lesson?.id || 'unknown',
        moduleContext: module?.id || 'unknown'
      }]);

      return {
        content: fallbackContent,
        model: 'fallback',
        error: true
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Envoi d'un message
  const sendMessage = async (content?: string) => {
    const messageContent = content || inputMessage.trim();
    if (!messageContent || isLoading) return;

    // Ajout message utilisateur
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      lessonContext: lesson?.id || 'unknown',
      moduleContext: module?.id || 'unknown'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Appel IA avec historique complet
    const response = await callMistralAPI(messageContent, [...messages, userMessage]);

    if (!response) {
      throw new Error('Erreur lors de l\'appel à l\'IA');
    }

    // Ajout réponse assistant
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      lessonContext: lesson?.id || 'unknown',
      moduleContext: module?.id || 'unknown',
      score: response.score || undefined
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Focus automatique sur l'input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Gestion touches clavier
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Changement de mode de chat
  const switchChatMode = (newMode: typeof chatMode) => {
    setChatMode(newMode);
    
    const modeMessages = {
      'evaluation': "🎯 **Mode Évaluation activé**\n\nJe vais analyser tes réponses avec précision et te donner un feedback détaillé avec scoring.",
      'conversation': "💬 **Mode Conversation libre**\n\nPose-moi toutes tes questions ! Je suis là pour approfondir n'importe quel aspect de cette leçon.",
      'exploration': "🔍 **Mode Exploration avancée**\n\nExplorons ensemble les applications avancées et les connexions avec d'autres domaines !"
    };

    const modeMessage: ChatMessage = {
      id: `mode-${newMode}-${Date.now()}`,
      role: 'assistant', 
      content: modeMessages[newMode],
      timestamp: new Date()
    };

    setMessages(prev => [...prev, modeMessage]);
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 animate-pulse"
        >
          <MessageCircle size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto">
      {/* Header du chat */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Assistant GENIA Intelligent</h3>
            <p className="text-sm text-gray-600">{lesson?.title || 'Formation en cours'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Sélecteur de mode */}
          <select 
            value={chatMode}
            onChange={(e) => switchChatMode(e.target.value as typeof chatMode)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500"
          >
            <option value="evaluation">🎯 Évaluation</option>
            <option value="conversation">💬 Conversation</option>
            <option value="exploration">🔍 Exploration</option>
          </select>
          
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
          >
            <Minimize2 size={16} />
          </button>
        </div>
      </div>

      {/* Zone de messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="text-white" size={16} />
              </div>
            )}
            
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-800'
              }`}
            >
              <div className="leading-relaxed">
                {message.content.split('\n').map((line, index) => {
                  // Titres H1, H2, H3
                  if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-lg font-semibold mb-3 mt-4">{line.substring(4)}</h3>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-xl font-semibold mb-4 mt-6">{line.substring(3)}</h2>;
                  } else if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-2xl font-bold mb-4 mt-6">{line.substring(2)}</h1>;
                  }
                  // Texte en gras
                  else if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                      <div key={index} className="mb-2">
                        {parts.map((part, partIndex) => 
                          partIndex % 2 === 1 ? 
                            <strong key={partIndex}>{part}</strong> : 
                            <span key={partIndex}>{part}</span>
                        )}
                      </div>
                    );
                  }
                  // Listes à puces
                  else if (line.startsWith('- ') || line.startsWith('• ')) {
                    return <li key={index} className="ml-4 mb-1 list-disc list-inside">{line.substring(2)}</li>;
                  }
                  // Code inline
                  else if (line.startsWith('```')) {
                    return <div key={index} className="bg-gray-800 text-green-400 p-3 rounded-lg font-mono text-sm my-3">{line.substring(3)}</div>;
                  }
                  // Lignes vides
                  else if (line.trim() === '') {
                    return <div key={index} className="h-3" />;
                  }
                  // Texte normal
                  else {
                    return <p key={index} className="mb-2">{line}</p>;
                  }
                })}
              </div>
              
              {message.score && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-yellow-500" size={16} />
                    <span className="font-semibold">Score : {message.score}/100</span>
                  </div>
                </div>
              )}
              
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="text-gray-600" size={16} />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="text-white" size={16} />
            </div>
            <div className="bg-gray-50 px-4 py-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600">GENIA réfléchit...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions de questions */}
      {suggestedQuestions.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">💡 Questions suggérées :</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => sendMessage(question)}
                disabled={isLoading}
                className="text-sm bg-white border border-gray-300 rounded-full px-3 py-1 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zone de saisie */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Écris ton message... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              rows={inputMessage.split('\n').length || 1}
              disabled={isLoading}
            />
          </div>
          
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div>
            Mode : <span className="font-medium">{chatMode === 'evaluation' ? '🎯 Évaluation' : chatMode === 'conversation' ? '💬 Conversation' : '🔍 Exploration'}</span>
          </div>
          <div>
            {messages.filter(m => m.role === 'user').length} messages • Session {sessionId}
          </div>
        </div>
      </div>
    </div>
  );
};

const GENIA_COMPLETE = () => {
  // State management
  const [currentView, setCurrentView] = useState('dashboard');
  const [userProgress, setUserProgress] = useState<UserProgress>({
    sessionId: '',
    currentModule: 'module-1',
    currentLesson: '',
    completedLessons: [],
    scores: {},
    level: 'debutant',
    lastSync: new Date().toISOString()
  });
  
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // PWA hooks
  const { isInstallable, isInstalled, isOnline, installPWA } = usePWA();

  // Données des modules (inspirés des documents GENIA)
  const modules: Module[] = [
    {
      id: 'module-1',
      title: 'Fondamentaux IA Générative',
      description: 'Comprendre les concepts de base des LLMs et leur fonctionnement - Style Hemerson KOFFI',
      duration: '2h',
      level: 'initiation',
      completed: false,
      lessons: [
        {
          id: 'lesson-1-1',
          title: 'Qu\'est-ce que l\'IA Générative ?',
          content: `# Introduction à l'IA Générative

L'IA Générative représente une **révolution majeure** dans le domaine de l'intelligence artificielle. Comme le dit souvent la méthode Hemerson KOFFI : "L'IA générative transforme notre façon de travailler, tout comme l'électricité a transformé l'industrie."

## 🧠 Concepts Clés

**Large Language Model (LLM)** : Un modèle d'IA entraîné sur d'énormes quantités de texte, capable de comprendre et générer du langage naturel avec une précision remarquable.

**💡 Analogie Simple** : Pensez à un étudiant brillant qui a lu toute une bibliothèque mondiale et peut maintenant :
- Répondre à vos questions complexes
- Créer du contenu original
- Traduire entre langues
- Résoudre des problèmes créatifs

## 🚀 Applications Concrètes Révolutionnaires

### **1. Writing Partner (Assistant de Rédaction)**
- Rédaction d'emails professionnels
- Création de rapports détaillés
- Amélioration du style et de la clarté

### **2. Code Assistant** 
- Génération de code intelligent
- Debug et optimisation
- Documentation automatique

### **3. Creative Applications**
- Génération d'images (DALL-E, Midjourney)
- Création musicale
- Écriture créative

### **4. Business Intelligence**
- Analyse de données complexes
- Résumés de réunions
- Prédictions de tendances

## 🌍 Impact Global

L'IA générative ne remplace pas l'humain - elle l'amplifie. C'est un multiplicateur de créativité et de productivité qui permet à chacun de se concentrer sur les tâches à haute valeur ajoutée.

**Citation de la méthode Hemerson KOFFI** : "L'IA générative démocratise l'accès à des capacités auparavant réservées aux experts."`,
          type: 'theory',
          completed: false
        },
        {
          id: 'lesson-1-2',
          title: 'Architecture et Fonctionnement des LLMs',
          content: `# Comment fonctionnent les LLMs ?

## 🏗️ Architecture Transformer

Les LLMs modernes utilisent l'architecture **Transformer**, une innovation révolutionnaire qui leur permet de traiter le langage de manière contextuelle et parallèle.

### **Mécanisme d'Attention**
- **Concept** : Le modèle "fait attention" aux mots pertinents dans une phrase
- **Analogie** : Comme un lecteur expérimenté qui comprend le contexte global
- **Avantage** : Traitement parallèle très rapide

## 📚 Processus d'Entraînement (3 Phases)

### **1. Pré-entraînement**
- **Données** : Milliards de mots du web, livres, articles
- **Objectif** : Apprendre les patterns du langage
- **Durée** : Plusieurs mois avec des milliers de GPU

### **2. Fine-tuning Supervisé**
- **Méthode** : Ajustement pour des tâches spécifiques
- **Données** : Exemples de haute qualité créés par des humains
- **Résultat** : Modèle plus précis et utile

### **3. RLHF (Reinforcement Learning from Human Feedback)**
- **Innovation** : Le modèle apprend des préférences humaines
- **Processus** : Classement de réponses par des évaluateurs
- **Impact** : Réponses plus alignées avec les attentes humaines

## ⚠️ Limitations Importantes à Connaître

### **Hallucinations**
- **Problème** : Génération d'informations incorrectes avec confiance
- **Cause** : Le modèle prédit le mot suivant sans vérifier la véracité
- **Solution** : Toujours vérifier les faits critiques

### **Connaissance Limitée**
- **Date de coupure** : Connaissance figée à la date d'entraînement
- **Impact** : Pas d'information sur les événements récents
- **Contournement** : Utilisation d'outils de recherche temps réel

### **Biais des Données**
- **Origine** : Reflet des biais présents dans les données d'entraînement
- **Manifestation** : Stéréotypes ou préférences culturelles
- **Mitigation** : Techniques de désbiaisement et diversité des données

## 🎯 Bonnes Pratiques

**Pour un Usage Responsable :**
1. **Vérifiez** les informations factuelles importantes
2. **Comprenez** les limites du modèle utilisé
3. **Diversifiez** vos sources d'information
4. **Respectez** la propriété intellectuelle
5. **Restez critique** face aux réponses générées

La compréhension de ces mécanismes est cruciale pour maximiser les bénéfices et minimiser les risques de l'IA générative.`,
          type: 'theory',
          completed: false
        },
        {
          id: 'lesson-1-3',
          title: 'Quiz : Maîtrise des Concepts Fondamentaux',
          content: `# Quiz Interactif : Fondamentaux IA Générative

## Instructions
Répondez aux questions suivantes de manière détaillée. L'IA GENIA analysera vos réponses selon le style pédagogique d'Hemerson KOFFI et vous donnera un feedback constructif avec votre score.

## Questions à Traiter

### 1. Analogie Personnelle (25 points)
**Créez votre propre analogie** pour expliquer ce qu'est un LLM à quelqu'un qui n'y connaît rien en informatique. Soyez créatif !

### 2. Applications Business (25 points)
**Identifiez 3 applications concrètes** de l'IA générative dans votre domaine d'études ou professionnel. Expliquez comment elles pourraient transformer les processus existants.

### 3. Analyse Critique (25 points)
**Décrivez une situation** où les limitations d'un LLM (hallucinations, biais, date de coupure) pourraient poser un problème grave. Comment mitigueriez-vous ce risque ?

### 4. Vision Future (25 points)
**Imaginez l'évolution** de l'IA générative dans les 3 prochaines années. Quels seront selon vous les défis et opportunités majeurs ?

## Critères d'Évaluation
- **Compréhension conceptuelle** : Maîtrise des notions de base
- **Pensée critique** : Analyse nuancée des enjeux  
- **Créativité** : Originalité des exemples et analogies
- **Applications pratiques** : Pertinence des cas d'usage proposés

Rédigez vos réponses et discutez avec l'assistant GENIA pour recevoir votre évaluation personnalisée !`,
          type: 'quiz',
          completed: false
        }
      ]
    },
    {
      id: 'module-2',
      title: 'Prompt Engineering Avancé',
      description: 'Maîtriser l\'art de communiquer efficacement avec les IA - Techniques des experts',
      duration: '3h',
      level: 'perfectionnement',
      completed: false,
      lessons: [
        {
          id: 'lesson-2-1',
          title: 'Principes Fondamentaux du Prompt Engineering',
          content: `# Prompt Engineering : L'Art de la Communication IA

Le **Prompt Engineering** est devenu une compétence clé du 21e siècle. Comme le souligne la méthode Hemerson KOFFI : "Apprendre à bien communiquer avec l'IA, c'est comme apprendre une nouvelle langue qui démultiplie vos capacités."

## 🎯 Définition et Enjeux

Le prompt engineering est **l'art et la science** de formuler des instructions précises pour obtenir les meilleurs résultats d'un modèle d'IA générative.

**Pourquoi c'est crucial ?**
- **Qualité** : Un bon prompt = réponses 10x meilleures
- **Efficacité** : Moins d'itérations nécessaires
- **Fiabilité** : Résultats plus consistants
- **ROI** : Maximise la valeur de l'IA

## 🏗️ Les 5 Piliers du Prompt Engineering

### **1. Clarté et Précision**
\`\`\`
❌ Mauvais : "Écris quelque chose sur les voitures"
✅ Bon : "Rédige un article de 300 mots sur les avantages des voitures électriques pour un magazine automobile, style informatif et accessible au grand public"
\`\`\`

**Techniques :**
- Soyez spécifique dans vos demandes
- Évitez l'ambiguïté à tout prix
- Définissez clairement le contexte
- Précisez l'audience cible

### **2. Structure et Format**
\`\`\`
✅ Template Efficace :
RÔLE : Tu es un [expert en X]
CONTEXTE : [Situation spécifique]
TÂCHE : [Action précise à réaliser]
FORMAT : [Structure de sortie attendue]
CONTRAINTES : [Limitations importantes]
EXEMPLES : [1-2 exemples si nécessaire]
\`\`\`

### **3. Contexte Riche**
- **Informations de fond** essentielles
- **Objectif final** de la tâche
- **Audience cible** et ses besoins
- **Contraintes** techniques ou créatives

### **4. Itération Méthodique**
\`\`\`
Processus d'amélioration :
1. Prompt initial → Test
2. Analyse des résultats
3. Identification des faiblesses
4. Ajustement ciblé
5. Nouveau test → Répétition
\`\`\`

### **5. Contrôle des Paramètres**
- **Température** : Créativité vs Précision (0.1-1.0)
- **Top-p** : Diversité du vocabulaire
- **Max tokens** : Longueur de la réponse
- **Stop sequences** : Points d'arrêt

## 🧪 Techniques Pratiques Avancées

### **Role Playing (Jeu de Rôle)**
\`\`\`
"En tant qu'expert en cybersécurité avec 15 ans d'expérience dans les PME, explique les 5 bonnes pratiques essentielles de sécurité informatique. Utilise un ton bienveillant mais ferme, avec des exemples concrets tirés de cas réels."
\`\`\`

### **Contraintes Créatives**
\`\`\`
"Explique la blockchain en utilisant uniquement des analogies culinaires, en moins de 200 mots, pour un public de restaurateurs."
\`\`\`

### **Personas Détaillés**
\`\`\`
"Tu es Marie, directrice marketing d'une startup fintech française de 50 employés. Tu prépares une présentation pour convaincre le board d'investir 100K€ dans l'IA générative. Ton style : analytique mais passionné."
\`\`\`

Cette approche méthodique transforme votre relation avec l'IA en partenariat stratégique !`,
          type: 'theory',
          completed: false
        },
        {
          id: 'lesson-2-2',
          title: 'Techniques Avancées : Chain-of-Thought & Few-Shot',
          content: `# Techniques Avancées de Prompting

Passons maintenant aux **techniques de niveau expert** utilisées par les meilleurs prompt engineers du monde. Ces méthodes peuvent multiplier par 5 à 10 l'efficacité de vos prompts.

## 🧠 Chain-of-Thought (Chaîne de Raisonnement)

### **Principe**
Encourager le modèle à "montrer son travail" en décomposant son raisonnement étape par étape.

### **Avantages**
- **Précision** : Réduction drastique des erreurs
- **Transparence** : Compréhension du processus de réflexion
- **Débuggage** : Identification facile des erreurs de logique
- **Apprentissage** : Formation implicite du modèle

### **Exemple Concret : Problème Mathématique**

\`\`\`
❌ Prompt Standard :
"Si un train voyage à 80 km/h pendant 2h30, quelle distance parcourt-il ?"

✅ Chain-of-Thought :
"Résous ce problème étape par étape en montrant ton raisonnement :

Si un train voyage à 80 km/h pendant 2h30, quelle distance parcourt-il ?

Pense d'abord à :
1. Quelle formule utiliser ?
2. Comment convertir le temps en format décimal ?
3. Quel calcul effectuer ?
4. Comment vérifier le résultat ?"
\`\`\`

## 🎯 Few-Shot Learning

### **Principe**
Fournir 2-5 exemples avant la tâche principale pour "apprendre" au modèle le pattern souhaité.

### **Structure Type**
\`\`\`
Voici quelques exemples de [TÂCHE] :

Exemple 1 :
Input : [DONNÉES 1]
Output : [RÉSULTAT 1]

Exemple 2 :
Input : [DONNÉES 2] 
Output : [RÉSULTAT 2]

Maintenant, applique le même pattern :
Input : [VOS DONNÉES]
Output : ?
\`\`\`

## 🎭 Role Playing Avancé

### **Technique des Personas Complexes**

\`\`\`
Tu es Dr. Sarah Chen, Chief Data Scientist chez Netflix avec 12 ans d'expérience en ML. 

PROFIL DÉTAILLÉ :
- PhD en Computer Science (Stanford)
- Spécialiste des systèmes de recommandation  
- Management d'équipe de 25 data scientists
- Style : analytique, pédagogue, orienté business impact
- Vocabulaire : technique mais accessible aux non-experts

CONTEXTE : Présentation au board sur l'impact de l'IA générative

TÂCHE : Explique en 5 minutes comment l'IA générative pourrait révolutionner nos systèmes de recommandation et personnalisation du contenu.
\`\`\`

Ces techniques avancées transforment l'IA d'un simple outil en véritable partenaire intellectuel ! 🚀`,
          type: 'theory',
          completed: false
        },
        {
          id: 'lesson-2-3',
          title: 'Exercice Pratique : Créer des Prompts d\'Expert',
          content: `# Exercice Pratique : Master Class Prompt Engineering

## 🎯 Objectif de l'Exercice

Vous allez créer **3 prompts professionnels** en appliquant toutes les techniques avancées apprises. L'IA GENIA évaluera vos prompts selon les critères utilisés par les experts du domaine.

## 📋 Missions à Réaliser

### **Mission 1 : Prompt Business (35 points)**

**Contexte :** Vous êtes consultant pour une PME de 50 employés qui veut intégrer l'IA générative dans ses processus.

**Votre tâche :** Créez un prompt qui génère un plan d'implémentation de l'IA générative sur 6 mois, avec :
- Analyse des processus actuels
- Identification des cas d'usage prioritaires  
- Roadmap avec jalons mesurables
- Budget estimatif
- Formation des équipes

**Techniques à utiliser :**
- Role playing (consultant expert)
- Structure claire avec sections
- Contraintes business réalistes
- Chain-of-thought pour l'analyse

### **Mission 2 : Prompt Créatif + Few-Shot (35 points)**

**Contexte :** Création de contenus marketing pour une app mobile de méditation.

**Votre tâche :** Créez un prompt qui génère des posts LinkedIn engageants, en utilisant :
- Few-shot learning avec 3 exemples de posts réussis
- Persona précis (community manager expérimenté)
- Ton de voix cohérent avec la marque
- Intégration naturelle de call-to-action
- Optimisation pour l'algorithme LinkedIn

### **Mission 3 : Prompt Technique Complexe (30 points)**

**Contexte :** Analyse de données clients pour une e-commerce.

**Votre tâche :** Créez un prompt qui analyse des retours clients et extrait :
- Sentiments (positif/négatif/neutre) avec score de confiance
- Thèmes principaux (catégorisation automatique)
- Points d'amélioration prioritaires
- Recommandations d'actions concrètes

**Techniques obligatoires :**
- Chain-of-thought pour l'analyse
- Structuration JSON pour les outputs
- Gestion des cas ambigus
- Validation de cohérence

## 🎓 Conseils d'Expert

### **Avant de Commencer**
1. **Analysez** le problème business en profondeur
2. **Identifiez** les techniques les plus appropriées
3. **Structurez** votre approche avant de rédiger
4. **Pensez** aux cas limites et erreurs possibles

Montrez-moi que vous maîtrisez l'art du prompt engineering au niveau expert ! 🚀

**Rédigez vos 3 prompts et discutez-les avec l'assistant GENIA.**`,
          type: 'practice',
          completed: false
        }
      ]
    },
    {
      id: 'module-3',
      title: 'Applications Métier & ROI',
      description: 'Transformer l\'IA générative en avantage concurrentiel durable',
      duration: '4h',
      level: 'specialise',
      completed: false,
      lessons: [
        {
          id: 'lesson-3-1',
          title: 'Writing Partner : Révolutionner la Communication',
          content: `# L'IA comme Writing Partner Stratégique

La méthode Hemerson KOFFI affirme : *"L'IA générative ne remplace pas les rédacteurs, elle les transforme en super-rédacteurs."* Découvrons comment maximiser cette transformation.

## 🎯 Vision Stratégique : Au-delà de la Simple Assistance

### **Évolution du Paradigme**
\`\`\`
Niveau 1 : Correcteur orthographique
Niveau 2 : Suggestion de phrases  
Niveau 3 : Rédaction assistée
Niveau 4 : Partenaire créatif stratégique ← OBJECTIF
\`\`\`

L'IA générative comme writing partner ne se contente pas de corriger ou suggérer. Elle devient un **amplificateur cognitif** qui :
- Élargit votre registre stylistique
- Accélère la recherche d'idées  
- Optimise l'impact de vos messages
- Personnalise massivement vos communications

## 📧 Cas d'Usage 1 : Communication Corporate

### **Email Leadership Transformé**

**Situation :** Direction qui doit communiquer une réorganisation délicate à 500 employés.

**Approche Classique (2h de travail) :**
\`\`\`
Objet : Réorganisation de l'entreprise

Chers collaborateurs,

Nous traversons une période de changement...
[Message générique, ton impersonnel, 20% d'engagement]
\`\`\`

**Approche IA Partner (30 min de travail) :**

**Prompt Stratégique :**
\`\`\`
CONTEXTE : Dirigeant d'une scaleup tech 500 employés, annonce réorganisation (fermeture d'une division, 30 licenciements, pivot stratégique vers l'IA).

PERSONA : Leader empathique, transparent, visionnaire. Style : authentique, direct mais bienveillant.

TÂCHE : Email all-hands avec 3 versions :
1. Version courte (digest)  
2. Version complète (détaillée)
3. Version FAQ (anticipation questions)

STRUCTURE ÉMOTIONNELLE :
- Accroche : reconnaissance du moment difficile
- Corps : explication franche des enjeux business
- Vision : projection positive sur l'avenir
- Action : étapes concrètes et support disponible

CONTRAINTES :
- Ton humble mais confiant
- Zéro language corporate
- Include personal anecdote
- End with inspiring quote
\`\`\`

**Résultat :**
- 85% d'engagement vs 20% habituel
- Réduction de 60% des questions anxiogènes
- NPS interne +40 points

## 🎯 Framework ROI : Mesurer l'Impact

### **Métriques Critiques**

**Productivité :**
- Time-to-first-draft : -80%
- Revision cycles : -60%  
- Volume output : x5-15

**Qualité :**
- Engagement rates : +50-200%
- Conversion rates : +30-180%
- Error reduction : -90%

**Business Impact :**
- Cost per communication : -70%
- Revenue per content : +120%
- Employee satisfaction : +40%

### **Calcul ROI Type (PME 100 employés) :**

**Investment :**
- Outils IA : 100€/mois
- Formation équipe : 5K€
- Setup & optimisation : 10K€
- **Total Year 1 : 16,2K€**

**Returns :**
- Productivité rédaction : +40K€
- Conversion amélioration : +80K€  
- Time-to-market : +25K€
- **Total benefits : 145K€**

**ROI : 795%** 🚀

L'IA générative comme writing partner n'est pas qu'un outil - c'est une **transformation stratégique** qui redéfinit votre capacité d'influence et d'impact ! 💪`,
          type: 'practice',
          completed: false
        }
      ]
    }
  ];

  // Mise à jour progression avec API
  const updateProgress = async (lessonId: string, completed: boolean, score?: number, aiResponse?: string) => {
    try {
      setSyncStatus('syncing');
      
      const response = await fetch('/api/progress/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: userProgress.sessionId,
          moduleId: selectedModule?.id,
          lessonId,
          completed,
          score,
          aiResponse
        })
      });

      if (response.ok) {
        // Mise à jour locale
        setUserProgress(prev => ({
          ...prev,
          completedLessons: completed 
            ? [...prev.completedLessons.filter(id => id !== lessonId), lessonId]
            : prev.completedLessons,
          scores: score ? { ...prev.scores, [lessonId]: score } : prev.scores,
          lastSync: new Date().toISOString()
        }));
        setSyncStatus('idle');
      } else {
        throw new Error('Failed to sync progress');
      }
    } catch (error) {
      console.error('Progress sync error:', error);
      setSyncStatus('error');
      // Fallback vers localStorage
      setUserProgress(prev => ({
        ...prev,
        completedLessons: completed 
          ? [...prev.completedLessons.filter(id => id !== lessonId), lessonId]
          : prev.completedLessons,
        scores: score ? { ...prev.scores, [lessonId]: score } : prev.scores
      }));
    }
  };

  // Initialisation session utilisateur avec sync
  useEffect(() => {
    const initializeSession = async () => {
    const savedSession = localStorage.getItem('genia-session');
      
    if (savedSession) {
        const progress = JSON.parse(savedSession);
        setUserProgress(progress);
        
        // Sync avec backend si en ligne
        if (isOnline) {
          try {
            const response = await fetch(`/api/progress/update?sessionId=${progress.sessionId}`);
            if (response.ok) {
              const { progress: serverProgress } = await response.json();
              // Merger avec données serveur si nécessaire
              if (serverProgress.length > 0) {
                const completedLessons = serverProgress
                  .filter((p: any) => p.completed)
                  .map((p: any) => p.lesson_id);
                const scores = serverProgress
                  .filter((p: any) => p.score)
                  .reduce((acc: any, p: any) => ({ ...acc, [p.lesson_id]: p.score }), {});
                
                setUserProgress(prev => ({
                  ...prev,
                  completedLessons: [...new Set([...prev.completedLessons, ...completedLessons])],
                  scores: { ...prev.scores, ...scores }
                }));
              }
            }
          } catch (error) {
            console.log('Sync error on init, continuing offline');
          }
        }
    } else {
        // Génération nouvelle session
      const sessionId = Math.random().toString(36).substring(2, 5).toUpperCase();
      const newProgress = { ...userProgress, sessionId };
      setUserProgress(newProgress);
      localStorage.setItem('genia-session', JSON.stringify(newProgress));
    }
    };

    initializeSession();
  }, [isOnline]);

  // Sauvegarde automatique + sync
  useEffect(() => {
    if (userProgress.sessionId) {
      localStorage.setItem('genia-session', JSON.stringify(userProgress));
    }
  }, [userProgress]);

  // Calcul du progrès global
  const calculateProgress = () => {
    const totalLessons = modules.reduce((acc, module) => acc + module.lessons.length, 0);
    const completedCount = userProgress.completedLessons.length;
    return Math.round((completedCount / totalLessons) * 100);
  };

  // Fonction pour marquer une leçon comme terminée
  const completeLesson = (lessonId: string, score?: number) => {
    updateProgress(lessonId, true, score);
  };

  // Interface des composants
  const PWAInstallBanner = () => {
    if (!isInstallable || isInstalled) return null;
    
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="text-2xl">📱</div>
          <div className="font-semibold">Installer GENIA comme app</div>
        </div>
        <p className="text-sm mb-3 opacity-90">
          Accédez à votre formation même hors ligne
        </p>
        <button 
          onClick={installPWA}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Installer maintenant
        </button>
      </div>
    );
  };

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {isOnline ? (
        <>
          <Wifi size={16} className="text-green-500" />
          <span className="text-green-600">En ligne</span>
        </>
      ) : (
        <>
          <WifiOff size={16} className="text-orange-500" />
          <span className="text-orange-600">Hors ligne</span>
        </>
      )}
      {syncStatus === 'syncing' && (
        <div className="ml-2 animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      )}
      {syncStatus === 'error' && (
        <div className="ml-2 text-red-500 text-xs">Sync error</div>
      )}
    </div>
  );

  const SessionInfo = () => (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <User className="text-blue-600" size={20} />
        <div>
          <div className="font-semibold text-blue-900">Session: {userProgress.sessionId}</div>
          <div className="text-sm text-blue-700">Progrès global: {calculateProgress()}%</div>
        </div>
          <div className="ml-4">
          <div className="bg-blue-200 rounded-full h-2 w-32">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
        </div>
        </div>
        <ConnectionStatus />
      </div>
    </div>
  );

  const ModuleCard = ({ module }: { module: Module }) => {
    const completedLessons = module.lessons.filter(lesson => 
      userProgress.completedLessons.includes(lesson.id)
    ).length;
    const progress = (completedLessons / module.lessons.length) * 100;
    
    const levelColors = {
      'initiation': 'bg-green-100 text-green-800 border-green-200',
      'perfectionnement': 'bg-blue-100 text-blue-800 border-blue-200',
      'specialise': 'bg-purple-100 text-purple-800 border-purple-200',
      'business': 'bg-orange-100 text-orange-800 border-orange-200'
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{module.title}</h3>
            <p className="text-gray-600 mb-3">{module.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${levelColors[module.level]} ml-4 flex-shrink-0`}>
            {module.level}
          </span>
        </div>
        
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={16} />
            {module.duration}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BookOpen size={16} />
            {module.lessons.length} leçons
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle size={16} />
            {completedLessons}/{module.lessons.length} terminées
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progression</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <button 
          onClick={() => {
            setSelectedModule(module);
            setCurrentView('module');
          }}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Play size={18} />
          {completedLessons === 0 ? 'Commencer' : 'Continuer'}
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  const LessonView = ({ lesson, module }: { lesson: Lesson, module: Module }) => {
    const isCompleted = userProgress.completedLessons.includes(lesson.id);
    const lessonScore = userProgress.scores[lesson.id];

    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{lesson.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="bg-gray-100 px-3 py-1 rounded-full">{lesson.type}</span>
                {isCompleted && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={16} />
                    Terminé {lessonScore && `(${lessonScore}/100)`}
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={() => setCurrentView('module')}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Retour au module
            </button>
          </div>

          {/* Contenu de la leçon avec rendu markdown amélioré */}
          <div className="prose prose-lg max-w-none mb-8">
            <div className="bg-gray-50 rounded-lg p-6">
              {lesson.content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold text-gray-900 mb-6 mt-8 first:mt-0">{line.substring(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-semibold text-gray-800 mb-4 mt-8">{line.substring(3)}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-medium text-gray-700 mb-3 mt-6">{line.substring(4)}</h3>;
                } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
                  return <p key={index} className="font-semibold text-gray-800 mb-3">{line.substring(2, line.length - 2)}</p>;
                } else if (line.startsWith('- ')) {
                  return <li key={index} className="text-gray-700 mb-2 ml-4">{line.substring(2)}</li>;
                } else if (line.startsWith('```')) {
                  return <div key={index} className="bg-gray-800 text-green-400 p-4 rounded-lg font-mono text-sm my-4">{line.substring(3)}</div>;
                } else if (line.trim() === '') {
                  return <div key={index} className="h-4" />;
                } else if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
                  return <p key={index} className="text-gray-600 italic mb-3">{line.substring(1, line.length - 1)}</p>;
                } else {
                  return <p key={index} className="text-gray-700 mb-4 leading-relaxed">{line}</p>;
                }
              })}
            </div>
          </div>
              
              {!isCompleted && (
            <div className="text-center mb-6">
                <button
                onClick={() => completeLesson(lesson.id)}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <CheckCircle size={18} />
                Marquer cette leçon comme terminée
                </button>
            </div>
              )}
          </div>

        {/* Chat Intelligent GENIA */}
        <IntelligentChatInterface 
          lesson={lesson}
          module={module}
          sessionId={userProgress.sessionId}
          onScoreUpdate={(score) => completeLesson(lesson.id, score)}
        />
      </div>
    );
  };

  const Dashboard = () => (
    <div className="space-y-8">
      <PWAInstallBanner />
      <SessionInfo />
      
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          GENIA for Tech_Students
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Maîtrisez l&apos;IA générative avec une approche pédagogique progressive créée par Hemerson KOFFI
        </p>
        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500 flex-wrap">
          <div className="flex items-center gap-2">
            <Target size={16} />
            Formation adaptative
          </div>
          <div className="flex items-center gap-2">
            <Brain size={16} />
            IA intégrée
          </div>
          <div className="flex items-center gap-2">
            <Award size={16} />
            Évaluation automatique
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(module => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 border border-green-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Votre Parcours d&apos;Apprentissage</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{calculateProgress()}%</div>
            <div className="text-gray-600 text-sm">Progression globale</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{userProgress.completedLessons.length}</div>
            <div className="text-gray-600 text-sm">Leçons terminées</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{Object.keys(userProgress.scores).length}</div>
            <div className="text-gray-600 text-sm">Quiz évalués</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {Math.round(Object.values(userProgress.scores).reduce((a, b) => a + b, 0) / Object.values(userProgress.scores).length) || 0}
        </div>
            <div className="text-gray-600 text-sm">Score moyen</div>
          </div>
        </div>
        
        {userProgress.lastSync && (
          <div className="mt-4 text-center text-xs text-gray-500">
          Dernière synchronisation : {new Date(userProgress.lastSync).toLocaleDateString('fr-FR')} à {new Date(userProgress.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );

  // Rendu principal avec gestion PWA
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="text-white" size={24} />
              </div>
              <div>
                <div className="font-bold text-gray-900">GENIA</div>
                <div className="text-sm text-gray-500">for Tech_Students</div>
              </div>
            </div>
            
            <nav className="flex items-center gap-4">
              <button 
                onClick={() => {
                  setCurrentView('dashboard');
                  setSelectedModule(null);
                  setSelectedLesson(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'dashboard' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tableau de bord
              </button>
              
              <div className="hidden sm:flex items-center gap-3 text-sm">
              {userProgress.sessionId && (
                  <span className="text-gray-500">Session: {userProgress.sessionId}</span>
              )}
                <ConnectionStatus />
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {currentView === 'dashboard' && <Dashboard />}
        
        {currentView === 'module' && selectedModule && (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentView('dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Retour au tableau de bord
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{selectedModule.title}</h1>
            </div>
            
            <div className="grid gap-4">
              {selectedModule.lessons.map(lesson => {
                const isCompleted = userProgress.completedLessons.includes(lesson.id);
                const score = userProgress.scores[lesson.id];
                
                return (
                  <div key={lesson.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{lesson.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">{lesson.type}</span>
                          {isCompleted && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                              <CheckCircle size={14} />
                              Terminé {score && `(${score}/100)`}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedLesson(lesson);
                          setCurrentView('lesson');
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Play size={16} />
                        {isCompleted ? 'Revoir' : 'Commencer'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {currentView === 'lesson' && selectedLesson && selectedModule && (
          <LessonView lesson={selectedLesson} module={selectedModule} />
        )}
      </main>

      {/* NOUVEAU FOOTER avec acronyme GENIA */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {/* Acronyme GENIA */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Découvrez la Méthode GENIA
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Une approche pédagogique innovante créée par <strong>Hemerson KOFFI</strong> 
                pour démocratiser l&apos;apprentissage de l&apos;IA générative
              </p>
            </div>
            
            <div className="grid md:grid-cols-5 gap-6">
              {/* G - Guide progressif */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">G</div>
                <div className="text-sm font-semibold text-blue-800 mb-2">Guide progressif</div>
                <p className="text-xs text-blue-700">
                  Apprentissage structuré étape par étape
                </p>
              </div>

              {/* E - Exemples concrets */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">E</div>
                <div className="text-sm font-semibold text-green-800 mb-2">Exemples concrets</div>
                <p className="text-xs text-green-700">
                  Applications réelles et cas d&apos;usage professionnels
                </p>
              </div>

              {/* N - Niveau adaptatif */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-2">N</div>
                <div className="text-sm font-semibold text-purple-800 mb-2">Niveau adaptatif</div>
                <p className="text-xs text-purple-700">
                  Contenu qui s&apos;ajuste à votre progression
                </p>
              </div>

              {/* I - Interaction pratique */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center border border-orange-200">
                <div className="text-3xl font-bold text-orange-600 mb-2">I</div>
                <div className="text-sm font-semibold text-orange-800 mb-2">Interaction pratique</div>
                <p className="text-xs text-orange-700">
                  Apprentissage actif avec exercices concrets
                </p>
              </div>

              {/* A - Assessment continu */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 text-center border border-indigo-200">
                <div className="text-3xl font-bold text-indigo-600 mb-2">A</div>
                <div className="text-sm font-semibold text-indigo-800 mb-2">Assessment continu</div>
                <p className="text-xs text-indigo-700">
                  Évaluation intelligente en temps réel
                </p>
              </div>
            </div>
          </div>

          {/* Citation */}
          <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 text-white rounded-xl p-8 text-center mb-8">
            <blockquote className="text-xl md:text-2xl font-medium mb-4 italic">
              &ldquo;Démocratiser l&apos;IA générative pour créer une génération de praticiens éclairés, 
              capables de transformer positivement notre société grâce à la technologie.&rdquo;
            </blockquote>
            <div className="text-sm opacity-90">
              <strong>Hemerson KOFFI</strong> - Créateur de la méthode pédagogique GENIA
            </div>
          </div>

          {/* Info technique */}
          <div className="border-t border-gray-200 pt-6">
          <div className="text-center text-gray-500">
            <div className="mb-2">GENIA for Tech_Students - POC v1.0</div>
              <div className="text-sm">Formation IA Générative • Méthode pédagogique Hemerson KOFFI</div>
              {isInstalled && (
                <div className="text-xs text-green-600 mt-2">📱 Mode PWA activé</div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GENIA_COMPLETE;