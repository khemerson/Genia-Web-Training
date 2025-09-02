'use client'

import React from 'react';
import { Brain, BookOpen, Users, Target, Award, ChevronRight, ArrowLeft, Lightbulb, Zap, Heart } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">À Propos de GENIA</h1>
              <p className="text-gray-600">La méthode pédagogique Hemerson KOFFI</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Introduction */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">GENIA for Tech_Students</h2>
                <p className="text-lg text-gray-700">Générateur d&apos;Excellence en IA Générative</p>
              </div>
            </div>
            
            <p className="text-gray-800 text-lg leading-relaxed mb-6">
              GENIA est une plateforme de formation révolutionnaire qui démocratise l&apos;apprentissage de l&apos;IA générative. 
              Conçue selon une <strong>approche pédagogique progressive unique</strong> développée par <strong>Hemerson KOFFI</strong>, 
              elle combine les meilleures pratiques académiques mondiales avec une vision pragmatique et bienveillante de l&apos;enseignement.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">🎯</div>
                <div className="text-sm font-medium text-gray-800">Formation Adaptative</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-2">🧠</div>
                <div className="text-sm font-medium text-gray-800">IA d&apos;Évaluation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-2">🚀</div>
                <div className="text-sm font-medium text-gray-800">Applications Pratiques</div>
              </div>
            </div>
          </div>
        </section>

        {/* Méthodologie */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <Target className="text-blue-600" size={28} />
            La Méthode Hemerson KOFFI
          </h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">🎓 Philosophie Pédagogique</h3>
            <p className="text-gray-700 leading-relaxed mb-6">
              Notre approche repose sur la conviction que <strong>l&apos;IA générative doit être accessible à tous</strong>, 
              indépendamment du niveau technique initial. Nous croyons en un apprentissage <strong>progressif, bienveillant et pratique</strong> 
               qui respecte le rythme de chaque apprenant tout en maintenant un niveau d&apos;excellence.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <Heart className="text-red-500 mt-1" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Bienveillance Éducative</h4>
                  <p className="text-sm text-gray-600">
                    Chaque erreur est une opportunité d&apos;apprentissage. Nos évaluations IA sont conçues pour encourager et guider, jamais pour décourager.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Lightbulb className="text-yellow-500 mt-1" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Apprentissage Actif</h4>
                  <p className="text-sm text-gray-600">
                    Théorie et pratique s&apos;entremêlent constamment. Chaque concept est immédiatement appliqué dans des exercices concrets.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Zap className="text-blue-500 mt-1" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Progression Adaptative</h4>
                  <p className="text-sm text-gray-600">
                    Le parcours s&apos;adapte au niveau de chaque utilisateur, permettant une montée en compétences naturelle et durable.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Target className="text-green-500 mt-1" size={20} />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Impact Réel</h4>
                  <p className="text-sm text-gray-600">
                    Chaque module vise un objectif professionnel concret avec des applications directement transférables en entreprise.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sources d&apos;Inspiration */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <BookOpen className="text-purple-600" size={28} />
            Sources d&apos;Inspiration
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Andrew Ng */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="text-blue-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Andrew Ng - DeepLearning.AI</h3>
              <p className="text-sm text-gray-600 mb-4">
                <strong>GenAI4Everyone</strong> : Approche démocratique de l&apos;IA, pédagogie claire et progressive, 
                exemples concrets pour tous les niveaux.
              </p>
              <div className="text-xs text-blue-600 font-medium">
                ✨ Inspiration : Clarté et accessibilité universelle
              </div>
            </div>

            {/* Lee Boonstra */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="text-green-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Lee Boonstra - Google</h3>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Prompt Engineering</strong> : Techniques avancées de prompting, méthodologie rigoureuse, 
                applications enterprise et bonnes pratiques.
              </p>
              <div className="text-xs text-green-600 font-medium">
                ✨ Inspiration : Excellence technique et rigueur
              </div>
            </div>

            {/* SynTopGenAI */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="text-purple-600" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">SynTopGenAI v1</h3>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Programme Académique</strong> : Synthèse des meilleurs cursus mondiaux, 
                approche par projets, cycle de vie complet des applications GenAI.
              </p>
              <div className="text-xs text-purple-600 font-medium">
                ✨ Inspiration : Structuration académique d&apos;excellence
              </div>
            </div>
          </div>
        </section>

        {/* Innovation Pédagogique */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <Users className="text-orange-600" size={28} />
            L&apos;Innovation GENIA
          </h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">🤖 IA d&apos;Évaluation Bienveillante</h3>
                <p className="text-gray-700 mb-4">
                  Notre système d&apos;IA d&apos;évaluation unique analyse chaque réponse selon le contexte spécifique de la leçon :
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Feedback personnalisé et constructif
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Scoring adaptatif selon le niveau
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Suggestions d&apos;amélioration concrètes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Encouragements motivationnels
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">📱 Apprentissage Hybride</h3>
                <p className="text-gray-700 mb-4">
                  GENIA s&apos;adapte à votre mode de vie avec une approche multi-plateforme :
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    PWA installable (mobile & desktop)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Mode offline pour apprendre partout
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Synchronisation automatique
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Sessions courtes (3 caractères)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">🗺️ Évolution Continue</h2>
          
          <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-xl p-8 border border-indigo-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Version Actuelle : POC v1.0</h3>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 mb-2">3</div>
                <div className="text-sm text-gray-700">Modules de Formation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-600 mb-2">9</div>
                <div className="text-sm text-gray-700">Leçons Interactives</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-2">∞</div>
                <div className="text-sm text-gray-700">Possibilités d&apos;Apprentissage</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-3">🚀 Prochaines Évolutions (v2.0)</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className="text-blue-500" />
                  Extension à 5-6 modules complets
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className="text-blue-500" />
                  Parcours de spécialisation sectoriels
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className="text-blue-500" />
                  Communauté d&apos;apprentissage collaborative
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight size={16} className="text-blue-500" />
                  Certifications reconnues industrie
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="bg-gray-900 text-white rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Une Vision, Une Mission</h2>
            <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
              &ldquo;Démocratiser l&apos;IA générative pour créer une génération de praticiens éclairés, 
              capables de transformer positivement notre société grâce à la technologie.&rdquo;
            </p>
            <div className="text-sm text-gray-400">
              <strong>Hemerson KOFFI</strong> - Créateur de la méthode pédagogique GENIA
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;