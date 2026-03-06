// simple ranking function based on similarity score
exports.rankChunks = (chunks) => {
  // assuming each chunk has a "score" field
  return chunks.sort((a, b) => b.score - a.score);
};
