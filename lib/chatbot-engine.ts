import { Lead, QualificationFlow, Question } from "@/types/chatbot";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { analyzeSentiment } from "./sentimentEngine";

interface ConversationState {
  currentQuestionIndex: number;
  responses: Record<string, any>;
  score: number;
}

export class ChatbotEngine {
  private genAI: GoogleGenerativeAI;
  private qualificationFlow: QualificationFlow;
  private conversationState: Map<string, ConversationState>;

  constructor(apiKey: string, flow: QualificationFlow) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.qualificationFlow = flow;
    this.conversationState = new Map();
  }

  async processMessage(
    conversationId: string,
    userMessage: string,
    leadData: Partial<Lead>,
  ): Promise<{
    response: string;
    nextQuestion?: Question;
    leadUpdate?: Partial<Lead>;
  }> {
    const state = this.getConversationState(conversationId);

    // Extract and update lead information
    const extractedInfo = await this.extractInformation(userMessage, leadData);
    const updatedLead = { ...leadData, ...extractedInfo };

    // Sentiment analysis
    const sentiment = analyzeSentiment(userMessage);

    // Update conversation state
    this.updateConversationState(conversationId, state, userMessage);

    // Calculate score and get next question
    const score = this.calculateScore(state.responses, updatedLead);
    const nextQuestion = this.determineNextQuestion(state, updatedLead);

    // Generate AI response with sentiment
    const response = await this.generateAIResponse(
      userMessage,
      nextQuestion,
      updatedLead,
      sentiment,
    );

    return {
      response,
      nextQuestion,
      leadUpdate: {
        ...updatedLead,
        qualificationScore: score,
      },
    };
  }

  private getConversationState(conversationId: string): ConversationState {
    return (
      this.conversationState.get(conversationId) || {
        currentQuestionIndex: 0,
        responses: {},
        score: 0,
      }
    );
  }

  private updateConversationState(
    conversationId: string,
    state: ConversationState,
    userMessage: string,
  ): void {
    state.responses[`message_${Date.now()}`] = userMessage;
    state.currentQuestionIndex++;
    this.conversationState.set(conversationId, state);
  }

  private async extractInformation(
    message: string,
    currentLead: Partial<Lead>,
  ): Promise<Partial<Lead>> {
    const prompt = `
    Analyze this message from a potential lead: "${message}"
    
    Current known lead details: ${JSON.stringify(currentLead)}
    
    Extract and return ONLY a JSON object with any of these fields if mentioned:
    - name
    - email  
    - phone
    - company
    - industry
    - budget
    - timeline
    - painPoints
    
    Return format example: {"name": "John", "company": "Acme Inc"}
    Return empty object if no relevant information found.
    `;

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Safely extract JSON from response
      try {
        if (!text) return {};
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch (e) {
        console.error("JSON parsing error:", e);
        return {};
      }
    } catch (error) {
      console.error("Error extracting information:", error);
      return {};
    }
  }

  private calculateScore(
    responses: Record<string, any>,
    leadData: Partial<Lead>,
  ): number {
    let score = 0;

    this.qualificationFlow.scoring?.forEach((rule) => {
      const fieldValue =
        leadData[rule.field as keyof Lead] || responses[rule.field];

      rule.conditions?.forEach((condition) => {
        if (this.evaluateCondition(fieldValue, condition)) {
          score += condition.score || 0;
        }
      });
    });

    return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
  }

  private evaluateCondition(value: any, condition: any): boolean {
    if (!condition.operator) return false;

    switch (condition.operator.toLowerCase()) {
      case "equals":
        return value == condition.value;
      case "contains":
        return String(value)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase());
      case "greater_than":
        return Number(value) > Number(condition.value);
      case "less_than":
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  }

  private determineNextQuestion(
    state: ConversationState,
    leadData: Partial<Lead>,
  ): Question | undefined {
    const questions = this.qualificationFlow.questions || [];

    for (let i = state.currentQuestionIndex; i < questions.length; i++) {
      const question = questions[i];

      if (
        !question.condition ||
        this.evaluateQuestionCondition(
          question.condition,
          leadData,
          state.responses,
        )
      ) {
        return question;
      }
    }

    return undefined;
  }

  private evaluateQuestionCondition(
    condition: string,
    leadData: Partial<Lead>,
    responses: Record<string, any>,
  ): boolean {
    if (!condition) return true;

    try {
      // Simple condition evaluation - consider using a safer eval alternative in production
      return new Function("lead", "responses", `return ${condition}`)(
        leadData,
        responses,
      );
    } catch {
      return true; // Default to showing question if condition parsing fails
    }
  }

  private getModelName(): string {
    // Always use Gemini 2.5 Pro if available, fallback to 1.5 Pro
    return "gemini-2.5-pro";
  }

  private async generateAIResponse(
    userMessage: string,
    nextQuestion: Question | undefined,
    leadData: Partial<Lead>,
    sentiment?: {
      score: number;
      comparative: number;
      positive: string[];
      negative: string[];
    },
  ): Promise<string> {
    const context = `
    Role: Lead qualification assistant for ${
      this.qualificationFlow.industry
    } industry.
    
    Conversation Context:
    - Previous message: "${userMessage}"
    - Current lead details: ${JSON.stringify(leadData)}
    ${
      nextQuestion
        ? `- Next question to ask: "${nextQuestion.text}"`
        : "- Qualification complete"
    }
    - Sentiment score: ${sentiment?.score ?? 0} (${
      sentiment?.score && sentiment.score > 0
        ? "positive"
        : sentiment?.score && sentiment.score < 0
          ? "negative"
          : "neutral"
    })
    ${
      sentiment?.positive?.length
        ? `- Positive keywords: ${sentiment.positive.join(", ")}`
        : ""
    }
    ${
      sentiment?.negative?.length
        ? `- Negative keywords: ${sentiment.negative.join(", ")}`
        : ""
    }
    
    Your Task:
    1. Acknowledge the user's input naturally
    2. ${
      nextQuestion
        ? "Transition to the next question"
        : "Provide appropriate closing"
    }
    3. Adapt your tone to match the user's sentiment (more upbeat if positive, more empathetic if negative)
    4. Keep response to 1-2 sentences
    
    Response Requirements:
    - Directly address the user
    - Don't mention you're an AI
    - Don't repeat the question verbatim
    `;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.getModelName(),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        },
      });

      const result = await model.generateContent(context);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("Error generating response:", error);
      return (
        nextQuestion?.text ||
        "Thank you for your information. We'll be in touch soon!"
      );
    }
  }

  public resetConversation(conversationId: string): void {
    this.conversationState.delete(conversationId);
  }
}
