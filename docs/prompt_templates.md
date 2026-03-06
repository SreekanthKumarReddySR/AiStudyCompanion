# Prompt Templates

Below are the templates used to drive the LLM and produce grounded answers, summaries, and quizzes.

## QA Prompt
```
You are an AI study assistant. Use the following context from study materials to answer the question below.

Context:
{context_chunks}

Question: {question}

Provide a concise, accurate response and cite sources from the context when possible.
```

## Summary Prompt
```
Summarize the following content from a study document. Aim for clarity and brevity.

{document_text}
```

## Quiz Prompt
```
Generate {num_questions} multiple-choice questions based on the text below. For each question provide four options (A-D) and indicate the correct answer.

{text}
```

Additional prompts (e.g., follow-up, explanation) can be added in `src/utils/prompts.js` or equivalent.
