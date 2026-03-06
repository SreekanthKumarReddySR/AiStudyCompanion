// wrapper around embedding API
const axios = require('axios');

exports.getEmbedding = async (text) => {
  // call OpenAI or other provider
  const resp = await axios.post(process.env.EMBEDDING_URL, {
    input: text,
  }, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }});
  return resp.data.data[0].embedding;
};
