const axios = require('axios');
const prompts = require('../utils/promptTemplates');
const entityQa = require('../utils/entityQa');

function splitForSummarization(text, targetSize = 6000) {
  const clean = (text || '').replace(/\r/g, '\n').trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const p of paragraphs) {
    if (!current) {
      current = p;
      continue;
    }
    if ((current + '\n\n' + p).length <= targetSize) {
      current += '\n\n' + p;
    } else {
      chunks.push(current);
      current = p;
    }
  }
  if (current) chunks.push(current);
  if (!chunks.length) {
    return [clean.slice(0, targetSize)];
  }
  return chunks;
}

function buildQuizContext(text, maxChars = 14000) {
  const clean = (text || '').replace(/\r/g, '\n').trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;

  // Take representative parts across the document to reduce bias to first pages.
  const part = Math.floor(maxChars / 3);
  const head = clean.slice(0, part);
  const midStart = Math.max(0, Math.floor(clean.length / 2) - Math.floor(part / 2));
  const mid = clean.slice(midStart, midStart + part);
  const tail = clean.slice(Math.max(0, clean.length - part));
  return `${head}\n\n--- MIDDLE ---\n\n${mid}\n\n--- END ---\n\n${tail}`;
}

function simpleSummary(text) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'No content available to summarize.';
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(Boolean);
  const pick = (idx) => sentences[Math.max(0, Math.min(sentences.length - 1, idx))] || '';
  const purpose = pick(0);
  const k1 = pick(Math.floor(sentences.length * 0.25));
  const k2 = pick(Math.floor(sentences.length * 0.5));
  const i1 = pick(Math.floor(sentences.length * 0.75));
  const i2 = pick(sentences.length - 1);
  return `Main Purpose:\n- ${purpose}\n\nKey Topics:\n- ${k1}\n- ${k2}\n\nImportant Insights:\n- ${i1}\n- ${i2}`;
}

function normalizeBulletSummary(raw) {
  let text = (raw || '').trim();
  if (!text) return text;

  // Convert inline bullet symbols into line-based bullets.
  text = text
    .replace(/\s*•\s*/g, '\n- ')
    .replace(/\s*●\s*/g, '\n- ')
    .replace(/\s*▪\s*/g, '\n- ')
    .replace(/\s*◦\s*/g, '\n- ')
    .replace(/\n{3,}/g, '\n\n');

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const hasAnyBullet = lines.some((l) => l.startsWith('- '));
  if (hasAnyBullet) return text;

  const cleaned = text.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/(?<=[.?!])\s+/).filter(Boolean);
  const p1 = parts[0] || cleaned.slice(0, 220);
  const p2 = parts[Math.floor(parts.length / 3)] || '';
  const p3 = parts[Math.floor((parts.length * 2) / 3)] || '';
  const p4 = parts[parts.length - 1] || '';
  return [
    'Main Purpose:',
    `- ${p1}`,
    '',
    'Key Topics:',
    `- ${p2 || p1}`,
    `- ${p3 || p1}`,
    '',
    'Important Insights:',
    `- ${p4 || p1}`
  ].join('\n');
}

function simpleQuiz(text, numQuestions = 5) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    return 'The document does not contain sufficient conceptual content for a quiz.';
  }

  const bannedTitles = /^(introduction|conclusion|overview|summary|references?)$/i;
  const conceptHint = /\b(is|are|defined|refers|means|process|method|theory|model|relationship|because|therefore|causes?|effect|steps?)\b/i;

  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 35 && conceptHint.test(s))
    .filter((s) => !bannedTitles.test(s.toLowerCase()))
    .filter((s) => !/^\W*[\d.]+\W*$/.test(s));

  const uniq = [];
  const seen = new Set();
  for (const s of sentences) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push(s);
    }
  }

  if (uniq.length < 2) {
    return 'The document does not contain sufficient conceptual content for a quiz.';
  }

  const stemTemplates = [
    'Which statement best reflects the concept described in the document?',
    'Based on the document, which option is the most accurate conceptual interpretation?',
    'Which option correctly captures the idea explained in the context?',
    'From the document perspective, which statement is most valid?'
  ];

  const questions = [];
  const optionLabels = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < uniq.length && questions.length < numQuestions; i++) {
    const correct = uniq[i];
    const distractorPool = uniq.filter((_, idx) => idx !== i);
    if (distractorPool.length < 3) break;

    // Rotate distractor selection so each question does not reuse identical B/C/D.
    const base = questions.length % distractorPool.length;
    const selectedDistractors = [
      distractorPool[base % distractorPool.length],
      distractorPool[(base + 1) % distractorPool.length],
      distractorPool[(base + 2) % distractorPool.length]
    ];

    const promptStem = correct.length > 150 ? `${correct.slice(0, 147)}...` : correct;
    const options = [promptStem, ...selectedDistractors];

    // Deterministic shuffle per question index.
    for (let s = options.length - 1; s > 0; s--) {
      const j = (questions.length * 7 + s * 3) % (s + 1);
      const tmp = options[s];
      options[s] = options[j];
      options[j] = tmp;
    }

    const answerIdx = options.findIndex((o) => o === promptStem);
    const answerLabel = optionLabels[Math.max(0, answerIdx)];
    const stem = stemTemplates[questions.length % stemTemplates.length];
    const q = `Q${questions.length + 1}. ${stem}\n` +
      `A) ${options[0]}\n` +
      `B) ${options[1]}\n` +
      `C) ${options[2]}\n` +
      `D) ${options[3]}\n` +
      `Answer: ${answerLabel}\n` +
      `Explanation: The correct option is directly supported by the provided document context.`;
    questions.push(q);
  }

  if (!questions.length) {
    return 'The document does not contain sufficient conceptual content for a quiz.';
  }
  return questions.join('\n\n');
}

function buildExtractiveRagAnswer(question, context) {
  const cleanContext = (context || '').replace(/\s+/g, ' ').trim();
  if (!cleanContext) {
    return 'The information is not available in the provided document.';
  }

  const cleanQuestion = (question || '').toLowerCase().trim();
  const qTerms = cleanQuestion
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const qSet = new Set(qTerms);

  const sentences = cleanContext
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (!sentences.length) {
    return 'The information is not available in the provided document.';
  }

  const scored = sentences.map((s, idx) => {
    const terms = s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    let overlap = 0;
    for (const t of terms) {
      if (qSet.has(t)) overlap += 1;
    }
    const density = terms.length ? overlap / terms.length : 0;
    const exactBoost = cleanQuestion && s.toLowerCase().includes(cleanQuestion) ? 2 : 0;
    return { sentence: s, score: overlap + density + exactBoost, idx };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  const best = scored.filter((x) => x.score > 0).slice(0, 3).map((x) => x.sentence);

  if (!best.length) {
    return 'The information is not available in the provided document.';
  }
  return `Based on retrieved document chunks:\n- ${best.join('\n- ')}`;
}

function fallbackAnswer(question, context) {
  return buildExtractiveRagAnswer(question, context);
}

function buildExtractiveRagSummary(context, pdfTitle = 'Untitled PDF') {
  const cleanContext = (context || '').replace(/\s+/g, ' ').trim();
  if (!cleanContext) {
    return 'The information is not available in the provided document.';
  }

  const sentences = cleanContext
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (!sentences.length) {
    return 'The information is not available in the provided document.';
  }

  const uniq = [];
  const seen = new Set();
  for (const s of sentences) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push(s);
    }
    if (uniq.length >= 18) break;
  }

  const overview = uniq.slice(0, 4).map((s) => `- ${s}`);
  const keyConcepts = uniq.slice(4, 10).map((s) => `- ${s}`);
  const definitions = uniq.slice(10, 13).map((s) => `- ${s}`);
  const formulas = uniq
    .filter((s) => /[=+\-/*^]|formula|equation|transform|filter/i.test(s))
    .slice(0, 3)
    .map((s) => `- ${s}`);
  const examples = uniq
    .filter((s) => /example|for instance|case|application/i.test(s))
    .slice(0, 3)
    .map((s) => `- ${s}`);
  const takeaway = uniq[uniq.length - 1] ? `- ${uniq[uniq.length - 1]}` : '- Summary unavailable.';

  return [
    `Title of the PDF: ${pdfTitle}`,
    '',
    'Short Overview (3-5 lines)',
    ...(overview.length ? overview : ['- The information is not available in the provided document.']),
    '',
    'Key Concepts',
    ...(keyConcepts.length ? keyConcepts : ['- The information is not available in the provided document.']),
    '',
    'Important Definitions',
    ...(definitions.length ? definitions : ['- The information is not available in the provided document.']),
    '',
    'Formulas / Diagrams (if mentioned)',
    ...(formulas.length ? formulas : ['- Not explicitly mentioned in the retrieved chunks.']),
    '',
    'Examples (if available)',
    ...(examples.length ? examples : ['- Not explicitly mentioned in the retrieved chunks.']),
    '',
    'Final Takeaway',
    takeaway
  ].join('\n');
}

async function callLLM(prompt, max_tokens=150) {
  const llmUrl = process.env.LLM_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  if (!llmUrl || !apiKey || apiKey === 'your_openai_key_here') {
    return null;
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  if (llmUrl.includes('/chat/completions')) {
    const resp = await axios.post(llmUrl, {
      model,
      messages: [
        { role: 'system', content: 'You are a concise, accurate academic study assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens
    }, { headers });
    return resp?.data?.choices?.[0]?.message?.content || null;
  }

  const resp = await axios.post(llmUrl, { prompt, max_tokens }, { headers });
  return resp?.data?.choices?.[0]?.text || null;
}

async function summarizeChunkWithLLM(chunkText, index, total) {
  const prompt = [
    `You are summarizing part ${index + 1} of ${total} of a study document.`,
    'Return only bullet points.',
    'Each bullet must start with "- ".',
    'Do not return paragraphs.',
    'Do not add outside information.',
    '',
    'Text:',
    chunkText
  ].join('\n');
  return callLLM(prompt, 260);
}

async function combineChunkSummariesWithLLM(chunkSummaries) {
  const prompt = [
    'You are an expert study assistant.',
    'Combine the chunk summaries into one high-quality revision summary.',
    'Use this exact format:',
    '',
    'Main Purpose:',
    '- ...',
    '',
    'Key Topics:',
    '- ...',
    '- ...',
    '- ...',
    '',
    'Important Insights:',
    'Topic A:',
    '- ...',
    '- ...',
    'Topic B:',
    '- ...',
    '- ...',
    '',
    'Keep it concise, accurate, and grounded only in provided content.',
    'Use bullets only. No paragraphs.',
    'Use simple language for students.',
    'Each bullet should be short and easy to understand.',
    'Avoid long run-on sentences.',
    'For Important Insights, always add topic subheadings before bullets.',
    '',
    'Chunk summaries:',
    chunkSummaries.join('\n\n---\n\n')
  ].join('\n');
  return callLLM(prompt, 520);
}

exports.answerQuestion = async (question, context, rawUserQuery = '') => {
  const entityAnswer = entityQa.answerEntityQuestion(rawUserQuery || question, context);
  if (entityAnswer) {
    return entityAnswer;
  }
  const p = prompts.qa.replace('{context}', context).replace('{question}', question);
  try {
    const out = await callLLM(p, 420);
    return out || fallbackAnswer(question, context);
  } catch (_err) {
    return fallbackAnswer(question, context);
  }
};

exports.summarizeFromRag = async (context, pdfTitle = 'Untitled PDF') => {
  const summaryQuery = 'Summarize all retrieved chunks for exam preparation using the required output format.';
  const withTitle = `PDF Title: ${pdfTitle}\n\n${context || ''}`;
  const p = prompts.qa.replace('{context}', withTitle).replace('{question}', summaryQuery);
  try {
    const out = await callLLM(p, 520);
    return out || buildExtractiveRagSummary(context, pdfTitle);
  } catch (_err) {
    return buildExtractiveRagSummary(context, pdfTitle);
  }
};

exports.summarize = async (text) => {
  const p = prompts.summary.replace('{document_text}', text);
  try {
    // Better quality for long PDFs: summarize in parts then merge.
    const chunks = splitForSummarization(text, 6000);
    if (chunks.length <= 1) {
      const out = await callLLM(p, 420);
      return normalizeBulletSummary(out || simpleSummary(text));
    }
    const chunkSummaries = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkSummary = await summarizeChunkWithLLM(chunks[i], i, chunks.length);
      if (chunkSummary) chunkSummaries.push(chunkSummary);
    }
    if (!chunkSummaries.length) return simpleSummary(text);
    const merged = await combineChunkSummariesWithLLM(chunkSummaries);
    return normalizeBulletSummary(merged || chunkSummaries.join('\n\n') || simpleSummary(text));
  } catch (_err) {
    return normalizeBulletSummary(simpleSummary(text));
  }
};

exports.generateQuiz = async (text, numQuestions=5) => {
  const quizContext = buildQuizContext(text, 14000);
  let p = prompts.quiz.replace('{text}', quizContext).replace('{num_questions}', numQuestions);
  try {
    const out = await callLLM(p, 520);
    return out || simpleQuiz(text, numQuestions);
  } catch (_err) {
    return simpleQuiz(text, numQuestions);
  }
};
