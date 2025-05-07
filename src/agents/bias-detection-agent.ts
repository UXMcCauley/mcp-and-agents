import { BaseAgent } from './base-agent';
import { MCP } from '../mcp/types';
import { openaiService } from '../services/openai';

export class BiasDetectionAgent extends BaseAgent {
    id = "bias-detection-agent";
    name = "Bias Detection Agent";
    description = "Detects and flags potential biases in content";
    capabilities = ["gender_bias_detection", "racial_bias_detection", "age_bias_detection"];
    consumesContext = ["user_input", "entities", "sentiment"];
    producesContext = ["bias_analysis", "bias_mitigation_suggestions"];

    async process(context: MCP.ReadonlyContextStore): Promise<MCP.ContextOperation[]> {
        const userInput = context.get<string>("user_input");
        const entities = context.get<any[]>("entities");

        if (!userInput) {
            this.log('debug', 'No user input found, skipping');
            return []; // Not enough context to process
        }

        const text = userInput.value;
        const operations: MCP.ContextOperation[] = [];

        this.log('info', 'Analyzing text for bias', { length: text.length });

        try {
            // Detect bias in the text
            const biasAnalysis = await this.detectBias(text, entities?.value || []);

            // Only add bias-related context if bias was detected
            if (biasAnalysis.biasDetected) {
                this.log('info', 'Bias detected', {
                    types: biasAnalysis.biasTypes,
                    severity: biasAnalysis.severity
                });

                // Generate mitigation suggestions
                const mitigationSuggestions = await this.generateMitigationSuggestions(biasAnalysis);

                operations.push(this.createAddOperation(
                    'bias_analysis',
                    biasAnalysis,
                    0.75,
                    "Analyzed text for potential biases in language and representation",
                    ["user_input", "entities"]
                ));

                operations.push(this.createAddOperation(
                    'bias_mitigation_suggestions',
                    mitigationSuggestions,
                    0.70,
                    "Generated suggestions to mitigate detected biases",
                    ["bias_analysis"]
                ));
            } else {
                this.log('info', 'No significant bias detected');
            }
        } catch (error) {
            this.log('error', 'Error in bias detection', error);
        }

        return operations;
    }

    // Bias detection using OpenAI
    private async detectBias(text: string, entities: any[]) {
        this.log('debug', 'Detecting bias');

        try {
            const result = await openaiService.detectBias(text, entities);
            return result;
        } catch (error) {
            this.log('error', 'Bias detection failed', error);
            // Fallback to no bias detected
            return {
                biasDetected: false,
                biasTypes: [],
                severity: 0,
                examples: [],
                confidence: 0.5
            };
        }
    }

    private async generateMitigationSuggestions(biasAnalysis: any) {
        this.log('debug', 'Generating mitigation suggestions');

        try {
            const result = await openaiService.generateBiasMitigations(biasAnalysis);
            return result;
        } catch (error) {
            this.log('error', 'Mitigation generation failed', error);
            // Fallback to empty suggestions
            return [];
        }
    }
}