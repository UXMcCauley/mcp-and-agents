import {BaseAgent} from './base-agent';
import {MCP} from '../mcp/types';
import {openaiService} from '../services/openai';
import {hasRequiredContext} from '../mcp/utils';

export class JobRequisiteAgent extends BaseAgent {
    id = "job-requisite-agent";
    name = "Job Requisite Enrichment Agent";
    description = "Identifies job requirements and skills from context";
    capabilities = ["skill_extraction", "requirement_mapping"];
    consumesContext = ["user_input", "job_description"];
    producesContext = ["identified_skills", "mapping_to_requirements"];

    // @ts-ignore
    async process(context: MCP.ReadonlyContextStore): Promise<MCP.ContextOperation[]> {
        // Check if we have the required context
        if (!hasRequiredContext(context, ["user_input", "job_description"])) {
            this.log('debug', 'Missing required context, skipping');
            return [];
        }

        const userInput = context.get<string>("user_input")!;
        const jobDescription = context.get<string>("job_description")!;

        const operations: MCP.ContextOperation[] = [];

        this.log('info', 'Processing job requisites');

        try {
            // Extract skills from the candidate evaluation
            const identifiedSkills = await this.extractSkills(userInput.value);

            // Map skills to job requirements
            const mappingToRequirements = await this.mapToRequirements(
                identifiedSkills,
                jobDescription.value
            );

            operations.push(this.createAddOperation(
                'identified_skills',
                identifiedSkills,
                0.80,
                "Extracted from candidate evaluation text",
                ["user_input"]
            ));

            operations.push(this.createAddOperation(
                'mapping_to_requirements',
                mappingToRequirements,
                0.75,
                "Mapped extracted skills to job requirements",
                ["identified_skills", "job_description"]
            ));

            this.log('info', `Identified ${identifiedSkills.length} skills and mapped to ${mappingToRequirements.length} requirements`);
        } catch (error) {
            this.log('error', 'Failed to process job requisites', error);
        }

        return operations;
    }

    private async extractSkills(text: string) {
        this.log('debug', 'Extracting skills from text');

        try {
            // @ts-ignore
            return await openaiService.extractSkills(text);
        } catch (error) {
            this.log('error', 'Skill extraction failed', error);
            return [];
        }
    }

    private async mapToRequirements(skills: any[], jobDescription: string) {
        this.log('debug', 'Mapping skills to job requirements');

        try {
            // @ts-ignore
            return await openaiService.mapSkillsToRequirements(skills, jobDescription);
        } catch (error) {
            this.log('error', 'Skill mapping failed', error);
            return [];
        }
    }
}