declare module "sentiment" {
  interface SentimentResult {
    score: number;
    comparative: number;
    positive: string[];
    negative: string[];
    words: string[];
  }

  class Sentiment {
    analyze(text: string): SentimentResult;
  }

  export = Sentiment;
}
