import { BaseAgent } from './base-agent';
import { MCP } from '../mcp/types';
import { openaiService } from '../services/openai';

export class NLPAgent extends BaseAgent {
    id = "nlp-agent";
    name = "Natural Language Processing Agent";
    description = "Analyzes text for entities, sentiment, and intent";
    capabilities = ["entity_extraction", "sentiment_analysis", "intent_detection", "toxicity_detection"];
    consumesContext = ["user_input", "conversation_history"];
    producesContext = ["entities", "sentiment", "intent", "toxicity_score"];

    async process(context: MCP.ReadonlyContextStore): Promise<MCP.ContextOperation[]> {
        const userInput = context.get<string>("user_input");

        if (!userInput) {
            this.log('debug', 'No user input found, skipping');
            return []; // Nothing to process
        }

        const text = userInput.value;
        const operations: MCP.ContextOperation[] = [];

        this.log('info', 'Processing text input', { length: text.length });

        try {
            // Run NLP processing tasks in parallel for efficiency
            const [entities, sentiment, intent, toxicityScore] = await Promise.all([
                this.extractEntities(text),
                this.analyzeSentiment(text),
                this.detectIntent(text),
                this.analyzeToxicity(text)
            ]);

            // Add the results to context
            operations.push(this.createAddOperation(
                'entities',
                entities,
                0.85,
                "Extracted via named entity recognition",
                ["user_input"]
            ));

            operations.push(this.createAddOperation(
                'sentiment',
                sentiment,
                0.82,
                "Analyzed via sentiment model",
                ["user_input"]
            ));

            operations.push(this.createAddOperation(
                'intent',
                intent,
                0.78,
                "Classified via intent model",
                ["user_input"]
            ));

            operations.push(this.createAddOperation(
                'toxicity_score',
                toxicityScore,
                0.95,
                "Measured via content safety model",
                ["user_input"]
            ));

            this.log('info', 'Successfully processed NLP tasks');
        } catch (error) {
            this.log('error', 'Error processing NLP tasks', error);
        }

        return operations;
    }

    // NLP processing methods using OpenAI
    private async extractEntities(text: string) {
        this.log('debug', 'Extracting entities');

        try {
            const result = await openaiService.extractEntities(text);
            this.log('debug', 'Extracted entities', { count: result.length });
            return result;
        } catch (error) {
            this.log('error', 'Entity extraction failed', error);
            // Fallback to minimal result
            return [];
        }
    }

    private async analyzeSentiment(text: string) {
        this.log('debug', 'Analyzing sentiment');

        try {
            const result = await openaiService.analyzeSentiment(text);
            this.log('debug', 'Sentiment analysis complete', { score: result.score });
            return result;
        } catch (error) {
            this.log('error', 'Sentiment analysis failed', error);
            // Fallback to neutral sentiment
            return {
                score: 0,
                label: "neutral",
                confidence: 0.5
            };
        }
    }

    private async detectIntent(text: string) {
        this.log('debug', 'Detecting intent');

        try {
            const result = await openaiService.detectIntent(text);
            this.log('debug', 'Intent detection complete', { primary: result.primary });
            return result;
        } catch (error) {
            this.log('error', 'Intent detection failed', error);
            // Fallback to statement intent
            return {
                primary: "statement",
                secondary: [],
                confidence: 0.5
            };
        }
    }

    private async analyzeToxicity(text: string) {
        this.log('debug', 'Analyzing toxicity');

        try {
            const result = await openaiService.analyzeToxicity(text);
            this.log('debug', 'Toxicity analysis complete', { score: result.overall });
            return result;
        } catch (error) {
            this.log('error', 'Toxicity analysis failed', error);
            // Fallback to low toxicity score
            return {
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
        }
    }
}