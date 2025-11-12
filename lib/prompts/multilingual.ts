// lib/prompts/multilingual.ts
// Utilidades para prompts multiidioma

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
}

// Idiomas soportados
export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  es: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  ca: { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  eu: { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  gl: { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  en: { code: 'en', name: 'English', nativeName: 'English' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch' },
};

// Prompts traducidos para identificación de speakers
export const SPEAKER_IDENTIFICATION_PROMPTS: Record<string, string> = {
  es: `Eres un asistente experto en análisis de transcripciones.
Identifica a todos los intervinientes/oradores en la transcripción.

Para cada interviniente, extrae:
- Nombre completo
- Cargo/rol/descripción (si se menciona)

Responde SOLO con un JSON array:
{"speakers": [
  {"name": "Juan Pérez", "role": "Director General"},
  {"name": "María García", "role": "Responsable de Marketing"}
]}

Si no se menciona el cargo, usa "Interviniente" como role.
Si no hay indicadores claros de speakers, devuelve array vacío.`,

  ca: `Ets un assistent expert en anàlisi de transcripcions.
Identifica tots els intervinents/oradors en la transcripció.

Per a cada intervinient, extreu:
- Nom complet
- Càrrec/rol/descripció (si s'esmenta)

Respon NOMÉS amb un JSON array:
{"speakers": [
  {"name": "Joan Pérez", "role": "Director General"},
  {"name": "Maria García", "role": "Responsable de Màrqueting"}
]}

Si no s'esmenta el càrrec, utilitza "Intervinient" com a role.
Si no hi ha indicadors clars de speakers, retorna array buit.`,

  eu: `Transkripzioen analisiko aditua zara.
Identifikatu transkripzioko parte-hartzaile/hizlari guztiak.

Parte-hartzaile bakoitzarentzat, atera:
- Izen osoa
- Kargua/rola/deskribapena (aipatzen bada)

Erantzun SOILIK JSON array batekin:
{"speakers": [
  {"name": "Jon Perez", "role": "Zuzendari Nagusia"},
  {"name": "Maria Garcia", "role": "Marketin Arduraduna"}
]}

Kargua aipatzen ez bada, erabili "Parte-hartzailea" role gisa.
Ez badaude speakers-en adierazle argiak, itzuli array hutsa.`,

  gl: `Es un asistente experto en análise de transcricións.
Identifica a todos os intervenientes/oradores na transcrición.

Para cada interveniente, extrae:
- Nome completo
- Cargo/rol/descrición (se se menciona)

Responde SO cun JSON array:
{"speakers": [
  {"name": "Xoán Pérez", "role": "Director Xeral"},
  {"name": "María García", "role": "Responsable de Marketing"}
]}

Se non se menciona o cargo, usa "Interveniente" como role.
Se non hai indicadores claros de speakers, devolve array baleiro.`,

  en: `You are an expert assistant in transcription analysis.
Identify all participants/speakers in the transcription.

For each participant, extract:
- Full name
- Position/role/description (if mentioned)

Respond ONLY with a JSON array:
{"speakers": [
  {"name": "John Pérez", "role": "General Director"},
  {"name": "Mary García", "role": "Marketing Manager"}
]}

If position is not mentioned, use "Participant" as role.
If there are no clear speaker indicators, return empty array.`,

  fr: `Vous êtes un assistant expert en analyse de transcriptions.
Identifiez tous les intervenants/orateurs dans la transcription.

Pour chaque intervenant, extrayez:
- Nom complet
- Poste/rôle/description (si mentionné)

Répondez UNIQUEMENT avec un tableau JSON:
{"speakers": [
  {"name": "Jean Pérez", "role": "Directeur Général"},
  {"name": "Marie García", "role": "Responsable Marketing"}
]}

Si le poste n'est pas mentionné, utilisez "Intervenant" comme role.
S'il n'y a pas d'indicateurs clairs de speakers, retournez un tableau vide.`,

  pt: `Você é um assistente especialista em análise de transcrições.
Identifique todos os intervenientes/oradores na transcrição.

Para cada interveniente, extraia:
- Nome completo
- Cargo/função/descrição (se mencionado)

Responda APENAS com um array JSON:
{"speakers": [
  {"name": "João Pérez", "role": "Diretor Geral"},
  {"name": "Maria García", "role": "Responsável de Marketing"}
]}

Se o cargo não for mencionado, use "Interveniente" como role.
Se não houver indicadores claros de speakers, retorne array vazio.`,

  it: `Sei un assistente esperto nell'analisi delle trascrizioni.
Identifica tutti gli intervenuti/oratori nella trascrizione.

Per ogni intervenuto, estrai:
- Nome completo
- Carica/ruolo/descrizione (se menzionato)

Rispondi SOLO con un array JSON:
{"speakers": [
  {"name": "Giovanni Pérez", "role": "Direttore Generale"},
  {"name": "Maria García", "role": "Responsabile Marketing"}
]}

Se la carica non è menzionata, usa "Intervenuto" come role.
Se non ci sono indicatori chiari di speakers, restituisci array vuoto.`,

  de: `Sie sind ein Experte für die Analyse von Transkriptionen.
Identifizieren Sie alle Teilnehmer/Redner in der Transkription.

Für jeden Teilnehmer extrahieren Sie:
- Vollständiger Name
- Position/Rolle/Beschreibung (falls erwähnt)

Antworten Sie NUR mit einem JSON-Array:
{"speakers": [
  {"name": "Hans Pérez", "role": "Generaldirektor"},
  {"name": "Maria García", "role": "Marketingleiter"}
]}

Wenn die Position nicht erwähnt wird, verwenden Sie "Teilnehmer" als role.
Wenn es keine klaren Hinweise auf Sprecher gibt, geben Sie ein leeres Array zurück.`,
};

// Prompts traducidos para generación de resúmenes
export const SUMMARY_PROMPTS: Record<string, { short: string; detailed: string }> = {
  es: {
    short: 'Genera un resumen ejecutivo muy breve (máximo 3 párrafos) de esta transcripción.',
    detailed: 'Genera un resumen detallado y estructurado de esta transcripción, incluyendo todos los puntos clave discutidos.',
  },
  ca: {
    short: 'Genera un resum executiu molt breu (màxim 3 paràgrafs) d\'aquesta transcripció.',
    detailed: 'Genera un resum detallat i estructurat d\'aquesta transcripció, incloent tots els punts clau discutits.',
  },
  eu: {
    short: 'Sortu transkripzio honen laburpen exekutibo oso laburra (gehienez 3 paragrafo).',
    detailed: 'Sortu transkripzio honen laburpen zehatza eta egituratua, eztabaidatutako funtsezko puntu guztiak barne.',
  },
  gl: {
    short: 'Xera un resumo executivo moi breve (máximo 3 parágrafos) desta transcrición.',
    detailed: 'Xera un resumo detallado e estruturado desta transcrición, incluíndo todos os puntos clave discutidos.',
  },
  en: {
    short: 'Generate a very brief executive summary (maximum 3 paragraphs) of this transcription.',
    detailed: 'Generate a detailed and structured summary of this transcription, including all key points discussed.',
  },
  fr: {
    short: 'Générez un résumé exécutif très bref (maximum 3 paragraphes) de cette transcription.',
    detailed: 'Générez un résumé détaillé et structuré de cette transcription, incluant tous les points clés discutés.',
  },
  pt: {
    short: 'Gere um resumo executivo muito breve (máximo 3 parágrafos) desta transcrição.',
    detailed: 'Gere um resumo detalhado e estruturado desta transcrição, incluindo todos os pontos-chave discutidos.',
  },
  it: {
    short: 'Genera un riassunto esecutivo molto breve (massimo 3 paragrafi) di questa trascrizione.',
    detailed: 'Genera un riassunto dettagliato e strutturato di questa trascrizione, includendo tutti i punti chiave discussi.',
  },
  de: {
    short: 'Erstellen Sie eine sehr kurze Zusammenfassung (maximal 3 Absätze) dieser Transkription.',
    detailed: 'Erstellen Sie eine detaillierte und strukturierte Zusammenfassung dieser Transkription, einschließlich aller besprochenen Schlüsselpunkte.',
  },
};

export const SUMMARY_SYSTEM_PROMPTS: Record<string, string> = {
  es: `Eres un asistente experto en generar resúmenes de transcripciones.
{summaryPrompt}

El resumen debe:
- Ser claro y bien estructurado
- Mantener los puntos clave
- Usar lenguaje profesional
- Respetar el contexto original`,

  ca: `Ets un assistent expert en generar resums de transcripcions.
{summaryPrompt}

El resum ha de:
- Ser clar i ben estructurat
- Mantenir els punts clau
- Utilitzar llenguatge professional
- Respectar el context original`,

  eu: `Transkripzioen laburpenak sortzeko aditu bat zara.
{summaryPrompt}

Laburpenak hau izan behar du:
- Argi eta ondo egituratua izan
- Funtsezko puntuak mantendu
- Hizkuntza profesionala erabili
- Jatorrizko testuingurua errespetatu`,

  gl: `Es un asistente experto en xerar resumos de transcricións.
{summaryPrompt}

O resumo debe:
- Ser claro e ben estruturado
- Manter os puntos clave
- Usar linguaxe profesional
- Respectar o contexto orixinal`,

  en: `You are an expert assistant in generating transcription summaries.
{summaryPrompt}

The summary must:
- Be clear and well-structured
- Maintain key points
- Use professional language
- Respect the original context`,

  fr: `Vous êtes un assistant expert en génération de résumés de transcriptions.
{summaryPrompt}

Le résumé doit:
- Être clair et bien structuré
- Maintenir les points clés
- Utiliser un langage professionnel
- Respecter le contexte original`,

  pt: `Você é um assistente especialista em gerar resumos de transcrições.
{summaryPrompt}

O resumo deve:
- Ser claro e bem estruturado
- Manter os pontos-chave
- Usar linguagem profissional
- Respeitar o contexto original`,

  it: `Sei un assistente esperto nella generazione di riassunti di trascrizioni.
{summaryPrompt}

Il riassunto deve:
- Essere chiaro e ben strutturato
- Mantenere i punti chiave
- Usare linguaggio professionale
- Rispettare il contesto originale`,

  de: `Sie sind ein Experte für die Erstellung von Zusammenfassungen von Transkriptionen.
{summaryPrompt}

Die Zusammenfassung muss:
- Klar und gut strukturiert sein
- Die Schlüsselpunkte beibehalten
- Professionelle Sprache verwenden
- Den ursprünglichen Kontext respektieren`,
};

// Prompts traducidos para generación de tags
export const TAG_GENERATION_PROMPTS: Record<string, string> = {
  es: `Eres un asistente experto en categorización.
Analiza la transcripción y genera entre 5 y 10 tags relevantes.

Los tags deben ser:
- Palabras clave o frases cortas (1-3 palabras)
- Relevantes al contenido principal
- En español
- Sin símbolos especiales

Responde SOLO con JSON:
{"tags": ["tag1", "tag2", "tag3"]}`,

  ca: `Ets un assistent expert en categorització.
Analitza la transcripció i genera entre 5 i 10 tags rellevants.

Els tags han de ser:
- Paraules clau o frases curtes (1-3 paraules)
- Rellevants al contingut principal
- En català
- Sense símbols especials

Respon NOMÉS amb JSON:
{"tags": ["tag1", "tag2", "tag3"]}`,

  eu: `Kategorizazioaren aditua zara.
Aztertu transkripzioa eta sortu 5 eta 10 tag garrantzitsu artean.

Tag-ek hau izan behar dute:
- Hitz gakoak edo esaldi laburrak (1-3 hitz)
- Eduki nagusiarekin lotuta
- Euskaraz
- Ikur bereziak gabe

Erantzun SOILIK JSON-ekin:
{"tags": ["tag1", "tag2", "tag3"]}`,

  gl: `Es un asistente experto en categorización.
Analiza a transcrición e xera entre 5 e 10 tags relevantes.

Os tags deben ser:
- Palabras clave ou frases curtas (1-3 palabras)
- Relevantes ao contido principal
- En galego
- Sen símbolos especiais

Responde SO con JSON:
{"tags": ["tag1", "tag2", "tag3"]}`,

  en: `You are an expert assistant in categorization.
Analyze the transcription and generate between 5 and 10 relevant tags.

Tags should be:
- Keywords or short phrases (1-3 words)
- Relevant to the main content
- In English
- Without special symbols

Respond ONLY with JSON:
{"tags": ["tag1", "tag2", "tag3"]}`,

  fr: `Vous êtes un assistant expert en catégorisation.
Analysez la transcription et générez entre 5 et 10 tags pertinents.

Les tags doivent être:
- Mots-clés ou phrases courtes (1-3 mots)
- Pertinents pour le contenu principal
- En français
- Sans symboles spéciaux

Répondez UNIQUEMENT avec JSON:
{"tags": ["tag1", "tag2", "tag3"]}`,

  pt: `Você é um assistente especialista em categorização.
Analise a transcrição e gere entre 5 e 10 tags relevantes.

As tags devem ser:
- Palavras-chave ou frases curtas (1-3 palavras)
- Relevantes ao conteúdo principal
- Em português
- Sem símbolos especiais

Responda APENAS com JSON:
{"tags": ["tag1", "tag2", "tag3"]}`,

  it: `Sei un assistente esperto in categorizzazione.
Analizza la trascrizione e genera tra 5 e 10 tag rilevanti.

I tag devono essere:
- Parole chiave o frasi brevi (1-3 parole)
- Rilevanti per il contenuto principale
- In italiano
- Senza simboli speciali

Rispondi SOLO con JSON:
{"tags": ["tag1", "tag2", "tag3"]}`,

  de: `Sie sind ein Experte für Kategorisierung.
Analysieren Sie die Transkription und generieren Sie zwischen 5 und 10 relevante Tags.

Tags sollten sein:
- Schlüsselwörter oder kurze Phrasen (1-3 Wörter)
- Relevant für den Hauptinhalt
- Auf Deutsch
- Ohne Sonderzeichen

Antworten Sie NUR mit JSON:
{"tags": ["tag1", "tag2", "tag3"]}`,
};

// Función para obtener el prompt de identificación de speakers
export function getSpeakerIdentificationPrompt(language: string = 'es'): string {
  return SPEAKER_IDENTIFICATION_PROMPTS[language] || SPEAKER_IDENTIFICATION_PROMPTS.es;
}

// Función para obtener el prompt de resumen
export function getSummaryPrompt(
  language: string = 'es',
  summaryType: 'short' | 'detailed' = 'detailed'
): { systemPrompt: string; summaryPrompt: string } {
  const lang = language in SUMMARY_PROMPTS ? language : 'es';
  const summaryPrompt = SUMMARY_PROMPTS[lang][summaryType];
  const systemPrompt = SUMMARY_SYSTEM_PROMPTS[lang].replace('{summaryPrompt}', summaryPrompt);

  return { systemPrompt, summaryPrompt };
}

// Función para obtener el prompt de generación de tags
export function getTagGenerationPrompt(language: string = 'es'): string {
  return TAG_GENERATION_PROMPTS[language] || TAG_GENERATION_PROMPTS.es;
}

// Prompts traducidos para procesamiento de documentos
export const DOCUMENT_ANALYSIS_PROMPTS: Record<string, { detailed: string; short: string }> = {
  es: {
    detailed: 'Genera un resumen detallado y estructurado.',
    short: 'Genera un resumen breve y ejecutivo.',
  },
  ca: {
    detailed: 'Genera un resum detallat i estructurat.',
    short: 'Genera un resum breu i executiu.',
  },
  eu: {
    detailed: 'Sortu laburpen zehatza eta egituratua.',
    short: 'Sortu laburpen labur eta exekutiboa.',
  },
  gl: {
    detailed: 'Xera un resumo detallado e estruturado.',
    short: 'Xera un resumo breve e executivo.',
  },
  en: {
    detailed: 'Generate a detailed and structured summary.',
    short: 'Generate a brief executive summary.',
  },
  fr: {
    detailed: 'Générez un résumé détaillé et structuré.',
    short: 'Générez un résumé bref et exécutif.',
  },
  pt: {
    detailed: 'Gere um resumo detalhado e estruturado.',
    short: 'Gere um resumo breve e executivo.',
  },
  it: {
    detailed: 'Genera un riassunto dettagliato e strutturato.',
    short: 'Genera un riassunto breve ed esecutivo.',
  },
  de: {
    detailed: 'Erstellen Sie eine detaillierte und strukturierte Zusammenfassung.',
    short: 'Erstellen Sie eine kurze Zusammenfassung.',
  },
};

export const DOCUMENT_TAGS_PROMPTS: Record<string, string> = {
  es: 'Genera 5-10 etiquetas clave.',
  ca: 'Genera 5-10 etiquetes clau.',
  eu: 'Sortu 5-10 etiketa nagusi.',
  gl: 'Xera 5-10 etiquetas clave.',
  en: 'Generate 5-10 key tags.',
  fr: 'Générez 5-10 tags clés.',
  pt: 'Gere 5-10 tags-chave.',
  it: 'Genera 5-10 tag chiave.',
  de: 'Erstellen Sie 5-10 Schlüssel-Tags.',
};

export const DOCUMENT_JSON_RESPONSE: Record<string, string> = {
  es: 'Responde en JSON con claves "summary" y "tags".',
  ca: 'Respon en JSON amb claus "summary" i "tags".',
  eu: 'Erantzun JSON-ean "summary" eta "tags" gakoekin.',
  gl: 'Responde en JSON con claves "summary" e "tags".',
  en: 'Respond in JSON with keys "summary" and "tags".',
  fr: 'Répondez en JSON avec les clés "summary" et "tags".',
  pt: 'Responda em JSON com chaves "summary" e "tags".',
  it: 'Rispondi in JSON con chiavi "summary" e "tags".',
  de: 'Antworten Sie in JSON mit den Schlüsseln "summary" und "tags".',
};

export const DOCUMENT_ANALYSIS_PREFIX: Record<string, string> = {
  es: 'Analiza el texto de un documento.',
  ca: 'Analitza el text d\'un document.',
  eu: 'Aztertu dokumentu baten testua.',
  gl: 'Analiza o texto dun documento.',
  en: 'Analyze the text of a document.',
  fr: 'Analysez le texte d\'un document.',
  pt: 'Analise o texto de um documento.',
  it: 'Analizza il testo di un documento.',
  de: 'Analysieren Sie den Text eines Dokuments.',
};

// Función para obtener el prompt de análisis de documentos
export function getDocumentAnalysisPrompt(
  language: string = 'es',
  actions: string[],
  summaryType: 'short' | 'detailed' = 'detailed'
): string {
  const lang = language in DOCUMENT_ANALYSIS_PROMPTS ? language : 'es';

  let prompt = DOCUMENT_ANALYSIS_PREFIX[lang];

  if (actions.includes('Resumir')) {
    prompt += ' ' + DOCUMENT_ANALYSIS_PROMPTS[lang][summaryType];
  }

  if (actions.includes('Etiquetas')) {
    prompt += ' ' + DOCUMENT_TAGS_PROMPTS[lang];
  }

  prompt += ' ' + DOCUMENT_JSON_RESPONSE[lang];

  return prompt;
}

// Función para normalizar código de idioma
export function normalizeLanguageCode(language: string | null | undefined): string {
  if (!language || language === 'auto') {
    return 'es'; // Default a español
  }

  const normalized = language.toLowerCase().substring(0, 2);
  return normalized in SUPPORTED_LANGUAGES ? normalized : 'es';
}
