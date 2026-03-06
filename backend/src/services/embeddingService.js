const axios = require('axios');

function fallbackEmbedding(text = '') {
  const dims = 256;
  const vec = new Array(dims).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    vec[i % dims] += (code % 97) / 97;
  }
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map(v => v / mag);
}

exports.embedText = async (text) => {
  const embeddingUrl = process.env.EMBEDDING_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!embeddingUrl || !apiKey || apiKey === 'your_openai_key_here') {
    return fallbackEmbedding(text);
  }

  try {
    const resp = await axios.post(embeddingUrl, { input: text }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const embedding = resp?.data?.data?.[0]?.embedding;
    return Array.isArray(embedding) && embedding.length ? embedding : fallbackEmbedding(text);
  } catch (_err) {
    return fallbackEmbedding(text);
  }
};
