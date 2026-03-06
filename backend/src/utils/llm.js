const axios = require('axios');
const prompts = require('./promptTemplates');

exports.processQuery = async (query) => {
  // This function would normally embed the query, perform vector search, then synthesize
  // Here we simply forward query to LLM for demonstration
  const prompt = prompts.qa.replace('{question}', query).replace('{context}', '');
  const resp = await axios.post(process.env.LLM_URL, {
    prompt,
    max_tokens: 150
  }, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }});
  return resp.data.choices[0].text;
};

exports.summarize = async (text) => {
  const prompt = prompts.summary.replace('{document_text}', text);
  const resp = await axios.post(process.env.LLM_URL, { prompt, max_tokens: 100 }, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }});
  return resp.data.choices[0].text;
};

exports.generateQuiz = async (text, numQuestions = 5) => {
  let p = prompts.quiz.replace('{text}', text).replace('{num_questions}', numQuestions);
  const resp = await axios.post(process.env.LLM_URL, { prompt: p, max_tokens: 200 }, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }});
  return resp.data.choices[0].text;
};
