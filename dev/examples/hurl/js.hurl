POST http://localhost:5173/api/pastes
x-api-key: test
{
  "texts": ["import hljs from 'highlight.js'; \n function detectLanguage(code) {\nconst result = hljs.highlightAuto(code); \n if (!result.language) return 'text'; \n // Optional: reject low-confidence guesses \n if (result.relevance < 5) return 'text'; \n return result.language;\n}"]
}
