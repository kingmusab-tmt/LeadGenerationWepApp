import Sentiment from "sentiment";

const sentiment = new Sentiment();

export function analyzeSentiment(text: string): {
  score: number;
  comparative: number;
  positive: string[];
  negative: string[];
} {
  const normalizedText = text.trim();
  if (!normalizedText) {
    return {
      score: 0,
      comparative: 0,
      positive: [],
      negative: [],
    };
  }

  const result = sentiment.analyze(normalizedText);
  return {
    score: result.score,
    comparative: result.comparative,
    positive: result.positive,
    negative: result.negative,
  };
}
