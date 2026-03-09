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
  // Intentionally ignore history to force every question to be independent.
  return buildRetrievalQuery(query);
}

function buildQuestionForLLM(query, history) {
  // Intentionally ignore history to force every question to be independent.
  return normalizeQuery(query);
}

module.exports = {
  normalizeQuery,
  buildRetrievalQuery,
  buildRetrievalQueryFromHistory,
  buildQuestionForLLM,
  sanitizeHistory
};
