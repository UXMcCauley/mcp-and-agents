import {BaseAgent} from './base-agent';
import {MCP} from '../mcp/types';
import {openaiService} from '../services/openai';

export class ComplianceAgent extends BaseAgent {
    id = "compliance-agent";
    name = "Compliance and Fairness Agent";
    description = "Ensures evaluations comply with employment laws and best practices";
    capabilities = ["compliance_checking", "fairness_analysis", "legal_risk_assessment"];
    consumesContext = ["user_input", "bias_analysis", "identified_skills", "mapping_to_requirements"];
    producesContext = ["compliance_issues", "fairness_score", "legal_risks"];

    // @ts-ignore
    async process(context: MCP.ReadonlyContextStore): Promise<MCP.ContextOperation[]> {
        const userInput = context.get<string>("user_input");

        if (!userInput) {
            this.log('debug', 'Missing required context, skipping');
            return [];
        }

        const biasAnalysis = context.get("bias_analysis");
        const mapping = context.get("mapping_to_requirements");

        const operations: MCP.ContextOperation[] = [];

        this.log('info', 'Running compliance checks');

        try {
            // Run compliance checks in parallel for efficiency
            // @ts-ignore
            const [complianceIssues, fairnessScore, legalRisks] = await Promise.all([
                this.checkCompliance(userInput.value, biasAnalysis?.value),
                this.calculateFairnessScore(userInput.value, biasAnalysis?.value, mapping?.value),
                this.assessLegalRisks(userInput.value, biasAnalysis?.value)
            ]);

            // Add the results to context
            operations.push(this.createAddOperation(
                'compliance_issues',
                complianceIssues,
                0.85,
                "Analyzed text for compliance with employment laws and best practices",
                ["user_input", ...(biasAnalysis ? ["bias_analysis"] : [])]
            ));

            operations.push(this.createAddOperation(
                'fairness_score',
                fairnessScore,
                0.80,
                "Calculated based on bias analysis and requirement mapping",
                [
                    "user_input",
                    ...(biasAnalysis ? ["bias_analysis"] : []),
                    ...(mapping ? ["mapping_to_requirements"] : [])
                ]
            ));

            operations.push(this.createAddOperation(
                'legal_risks',
                legalRisks,
                0.75,
                "Assessed potential legal risks based on compliance issues",
                ["compliance_issues", ...(biasAnalysis ? ["bias_analysis"] : [])]
            ));

            this.log('info', `Compliance check complete: ${complianceIssues.length} issues found, fairness score ${fairnessScore.overall}`);
        } catch (error) {
            this.log('error', 'Compliance analysis failed', error);
        }

        return operations;
    }

    private async checkCompliance(text: string, biasAnalysis: any) {
        this.log('debug', 'Checking compliance with employment laws');

        try {
            // @ts-ignore
            return await openaiService.checkCompliance(text, biasAnalysis);
        } catch (error) {
            this.log('error', 'Compliance check failed', error);
            return [];
        }
    }

    private async calculateFairnessScore(text: string, biasAnalysis: any, mapping: any) {
        this.log('debug', 'Calculating fairness score');

        try {
            // @ts-ignore
            return await openaiService.calculateFairnessScore(text, biasAnalysis, mapping);
        } catch (error) {
            this.log('error', 'Fairness score calculation failed', error);
            return {
                overall: 0.5,
                categories: {
                    gender_fairness: 0.5,
                    age_fairness: 0.5,
                    race_fairness: 0.5,
                    evidence_based: 0.5
                },
                improvements: []
            };
        }
    }

    private async assessLegalRisks(text: string, biasAnalysis: any) {
        this.log('debug', 'Assessing legal risks');

        try {
            // @ts-ignore
            return await openaiService.assessLegalRisks(text, biasAnalysis);
        } catch (error) {
            this.log('error', 'Legal risk assessment failed', error);
            return {
                riskLevel: "unknown",
                potentialIssues: [],
                recommendation: "Unable to assess legal risks"
            };
        }
    }
}