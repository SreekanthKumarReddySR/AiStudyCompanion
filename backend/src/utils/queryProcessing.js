function normalizeQuery(query) {
  return String(query || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildRetrievalQuery(query) {
  const normalized = normalizeQuery(query);
  return normalized;
}

function sanitizeHistory(history, maxTurns = 6) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h && typeof h.text === 'string' && h.text.trim())
    .slice(-maxTurns)
    .map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      text: normalizeQuery(h.text).slice(0, 280)
    }));
}

function buildRetrievalQueryFromHistory(query, history) {
  const current = buildRetrievalQuery(query);
  // Entity lookup questions should stay focused on current turn.
  if (/\b(who|name|person|candidate|employee|company|organization|date|period|project|title)\b/i.test(current)) {
    return current;
  }
  const turns = sanitizeHistory(history, 4);
  if (!turns.length) return current;
  const convo = turns.map((t) => `${t.role}: ${t.text}`).join(' | ');
  return normalizeQuery(`${convo} | user: ${current}`).slice(0, 1200);
}

function buildQuestionForLLM(query, history) {
  const current = normalizeQuery(query);
  const turns = sanitizeHistory(history, 4);
  if (!turns.length) return current;
  const convo = turns.map((t) => `${t.role}: ${t.text}`).join('\n');
  return [
    'Conversation so far (for follow-up disambiguation only):',
    convo,
    '',
    `Current user question: ${current}`
  ].join('\n');
}

module.exports = {
  normalizeQuery,
  buildRetrievalQuery,
  buildRetrievalQueryFromHistory,
  buildQuestionForLLM,
  sanitizeHistory
};
