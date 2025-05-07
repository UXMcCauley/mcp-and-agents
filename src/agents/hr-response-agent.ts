import { BaseAgent } from './base-agent';
import { MCP } from '../mcp/types';
import { openaiService } from '../services/openai';
import { hasRequiredContext } from '../mcp/utils';

export class HRResponseAgent extends BaseAgent {
    id = "hr-response-agent";
    name = "HR Response Generator";
    description = "Generates bias-free HR responses based on comprehensive context";
    capabilities = ["hr_writing", "legal_compliance", "bias_mitigation"];
    consumesContext = [
        "user_input",
        "bias_analysis",
        "identified_skills",
        "mapping_to_requirements",
        "compliance_issues",
        "fairness_score",
        "legal_risks"
    ];
    producesContext = ["hr_response", "revised_evaluation", "coaching_feedback"];

    async process(context: MCP.ReadonlyContextStore): Promise<MCP.ContextOperation[]> {
        const userInput = context.get<string>("user_input");

        if (!userInput) {
            this.log('debug', 'Missing required context, skipping');
            return [];
        }

        const complianceIssues = context.get("compliance_issues");
        const fairnessScore = context.get("fairness_score");
        const mapping = context.get("mapping_to_requirements");
        const biasAnalysis = context.get("bias_analysis");

        const operations: MCP.ContextOperation[] = [];

        this.log('info', 'Generating HR response');

        try {
            // Generate a revised evaluation
            const revisedEvaluation = await this.generateRevisedEvaluation(
                userInput.value,
                complianceIssues?.value,
                mapping?.value,
                biasAnalysis?.value
            );

            // Generate coaching feedback
            const coachingFeedback = await this.generateCoachingFeedback(
                complianceIssues?.value,
                fairnessScore?.value,
                biasAnalysis?.value
            );

            // Generate formal HR response
            const hrResponse = await this.generateHRResponse(
                revisedEvaluation,
                coachingFeedback
            );

            operations.push(this.createAddOperation(
                'revised_evaluation',
                revisedEvaluation,
                0.85,
                "Rewrote evaluation to address compliance issues and eliminate bias",
                [
                    "user_input",
                    ...(complianceIssues ? ["compliance_issues"] : []),
                    ...(mapping ? ["mapping_to_requirements"] : []),
                    ...(biasAnalysis ? ["bias_analysis"] : [])
                ]
            ));

            operations.push(this.createAddOperation(
                'coaching_feedback',
                coachingFeedback,
                0.90,
                "Generated coaching feedback to improve evaluation practices",
                [
                    ...(complianceIssues ? ["compliance_issues"] : []),
                    ...(fairnessScore ? ["fairness_score"] : []),
                    ...(biasAnalysis ? ["bias_analysis"] : [])
                ]
            ));

            operations.push(this.createAddOperation(
                'hr_response',
                hrResponse,
                0.95,
                "Final HR response combining revised evaluation and feedback",
                ["revised_evaluation", "coaching_feedback"]
            ));

            this.log('info', 'HR response generated successfully');
        } catch (error) {
            this.log('error', 'Failed to generate HR response', error);
        }

        return operations;
    }

    private async generateRevisedEvaluation(
        originalText: string,
        complianceIssues: any[] = [],
        mappingToRequirements: any = {},
        biasAnalysis: any = null
    ) {
        this.log('debug', 'Generating revised evaluation');

        try {
            const result = await openaiService.generateRevisedEvaluation(
                originalText,
                complianceIssues,
                mappingToRequirements,
                biasAnalysis
            );
            return result;
        } catch (error) {
            this.log('error', 'Revised evaluation generation failed', error);
            return originalText; // Fallback to original text
        }
    }

    private async generateCoachingFeedback(
        complianceIssues: any[] = [],
        fairnessScore: any = {},
        biasAnalysis: any = null
    ) {
        this.log('debug', 'Generating coaching feedback');

        try {
            const result = await openaiService.generateCoachingFeedback(
                complianceIssues,
                fairnessScore,
                biasAnalysis
            );
            return result;
        } catch (error) {
            this.log('error', 'Coaching feedback generation failed', error);
            return {
                mainPoints: ["Unable to generate detailed coaching feedback"],
                trainingRecommendations: []
            };
        }
    }

    private async generateHRResponse(
        revisedEvaluation: string,
        coachingFeedback: any
    ) {
        this.log('debug', 'Generating complete HR response');

        try {
            const result = await openaiService.generateHRResponse(
                revisedEvaluation,
                coachingFeedback
            );
            return result;
        } catch (error) {
            this.log('error', 'HR response generation failed', error);
            return {
                revisedText: revisedEvaluation,
                feedbackForEvaluator: "Unable to generate detailed feedback",
                systemActions: []
            };
        }
    }
}