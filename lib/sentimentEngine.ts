import Sentiment from "sentiment";

const sentiment = new Sentiment();

export function analyzeSentiment(text: string): {
  score: number;
  comparative: number;
  positive: string[];
  negative: string[];
} {
  const result = sentiment.analyze(text);
  return {
    score: result.score,
    comparative: result.comparative,
    positive: result.positive,
    negative: result.negative,
  };
}
