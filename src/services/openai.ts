import OpenAI from 'openai';
import { config } from '../config';
import { logger } from './logging';

class OpenAIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: config.openaiApiKey
        });
    }

    // Entity extraction
    async extractEntities(text: string) {
        try {
            const response = await this.openai.chat.completions.create({
                model: config.openaiModel,
                messages: [
                    {
                        role: "system",
                        content: `Extract named entities from the following text. 
            Return a JSON array where each item has: 
            { 
              "type": "<PERSON|ORGANIZATION|LOCATION|DATE|SKILL|OTHER>", 
              "value": "<extracted entity>", 
              "confidence": <0.0-1.0 score> 
            }`
                    },
                    { role: "user", content: text }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            return content ? JSON.parse(content).entities || [] : [];
        } catch (error) {
            logger.error('OpenAI entity extraction failed:', error);
            throw new Error('Entity extraction failed');
        }
    }

    // Sentiment analysis
    async analyzeSentiment(text: string) {
        try {
            const response = await this.openai.chat.completions.create({
                model: config.openaiModel,
                messages: [
                    {
                        role: "system",
                        content: `Analyze the sentiment of the following text. 
            Return a JSON object with: 
            { 
              "score": <-1.0 to 1.0 where -1 is very negative, 0 is neutral, 1 is very positive>, 
              "label": "<negative|neutral|positive>",
              "confidence": <0.0-1.0 score>
            }`
                    },
                    { role: "user", content: text }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            return content ? JSON.parse(content) : { score: 0, label: "neutral", confidence: 0.5 };
        } catch (error) {
            logger.error('OpenAI sentiment analysis failed:', error);
            throw new Error('Sentiment analysis failed');
        }
    }

    // Intent detection
    async detectIntent(text: string) {
        try {
            const response = await this.openai.chat.completions.create({
                model: config.openaiModel,
                messages: [
                    {
                        role: "system",
                        content: `Detect the intent of the following text.
            Return a JSON object with: 
            { 
              "primary": "<question|statement|request|complaint|feedback|other>",
              "secondary": [<array of more specific intents>],
              "confidence": <0.0-1.0 score>
            }`
                    },
                    { role: "user", content: text }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            return content ? JSON.parse(content) : { primary: "statement", secondary: [], confidence: 0.5 };
        } catch (error) {
            logger.error('OpenAI intent detection failed:', error);
            throw new Error('Intent detection failed');
        }
    }

    // Toxicity analysis
    async analyzeToxicity(text: string) {
        try {
            const response = await this.openai.chat.completions.create({
                model: config.openaiModel,
                messages: [
                    {
                        role: "system",
                        content: `Analyze the following text for toxic content.
            Return a JSON object with: 
            { 
              "overall": <0.0-1.0 toxicity score>,
              "categories": {
                "harassment": <0.0-1.0 score>,
                "hate_speech": <0.0-1.0 score>,
                "self_harm": <0.0-1.0 score>,
                "sexual": <0.0-1.0 score>,
                "violence": <0.0-1.0 score>
              },
              "confidence": <0.0-1.0 score>
            }`
                    },
                    { role: "user", content: text }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            return content ? JSON.parse(content) : {
                overall: 0.01,
                categories: {
                    harassment: 0.01,
                    hate_speech: 0.01,
                    self_harm: 0.01,
                    sexual: 0.01,
                    violence: 0.01
                },
                confidence: 0.5
            };
        } catch (error) {
            logger.error('OpenAI toxicity analysis failed:', error);
            throw new Error('Toxicity analysis failed');
        }
    }

    // Bias detection
    async detectBias(text: string, entities: any[] = []) {
        try {
            const response = await this.openai.chat.completions.create({
                model: config.openaiModel,
                messages: [
                    {
                        role: "system",
                        content: `Detect bias in the following text, especially focusing on language related to hiring and employment.
            Consider gender, age, racial, and other biases in the text.
            Return a JSON object with: 
            { 
              "biasDetected": <boolean>,
              "biasTypes": [<array of bias types detected>],
              "severity": <0.0-1.0 score>,
              "examples": [
                { "text": "<biased text>", "biasType": "<type>", "severity": <0.0-1.0 score> }
              ],
              "confidence": <0.0-1.0 score>
            }`
                    },
                    {
                        role: "user",
                        content: `Text: ${text}\n\nExtracted entities: ${JSON.stringify(entities)}`
                    }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            return content ? JSON.parse(content) : {
                biasDetected: false,
                biasTypes: [],
                severity: 0,
                examples: [],
                confidence: 0.5
            };
        } catch (error) {
            logger.error('OpenAI bias detection failed:', error);
            throw new Error('Bias detection failed');
        }
    }

    // Generate bias mitigation suggestions
    async generateBiasMitigations(biasAnalysis: any) {
        try {
            const response = await this.openai.chat.completions.create({
                model: config.openaiModel,
                messages: [
                    {
                        role: "system",
                        content: `Generate suggestions to mitigate the detected bias.
            For each biased example, suggest an alternative phrasing that removes the bias.
            Return a JSON array where each item has: 
            { 
              "original": "<original biased text>",
              "suggestion": "<bias-free alternative>",
              "reasoning": "<explanation of why this is better>"
            }`
                    },
                    { role: "user", content: JSON.stringify(biasAnalysis) }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            return content ? JSON.parse(content).suggestions || [] : [];
        } catch (error) {
            logger.error('OpenAI bias mitigation generation failed:', error);
            throw new Error('Bias mitigation generation failed');
        }
    }
}

export const openaiService = new OpenAIService();