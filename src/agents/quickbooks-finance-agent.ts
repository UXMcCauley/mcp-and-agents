// src/agents/quickbooks-finance-agent.ts
import { BaseAgent } from './base-agent';
import { MCP } from '../mcp/types';
import { quickbooksService } from '../services/quickbooks';
import { hasRequiredContext } from '../mcp/utils';

export class QuickBooksFinanceAgent extends BaseAgent {
    id = "quickbooks-finance-agent";
    name = "QuickBooks Financial Analysis Agent";
    description = "Analyzes financial data from QuickBooks API";
    capabilities = ["payment_analysis", "profit_loss_reporting", "quarterly_analysis"];
    consumesContext = ["financial_request", "date_range"];
    producesContext = ["financial_data", "financial_analysis", "financial_report"];

    async process(context: MCP.ReadonlyContextStore): Promise<MCP.ContextOperation[]> {
        // Check if we have the required context
        if (!hasRequiredContext(context, ["financial_request"])) {
            this.log('debug', 'Missing required context, skipping');
            return [];
        }

        const financialRequest = context.get<any>("financial_request")!;
        const operations: MCP.ContextOperation[] = [];

        try {
            switch (financialRequest.value.type) {
                case 'quarterly_analysis':
                    await this.processQuarterlyAnalysis(financialRequest.value, operations);
                    break;

                case 'payments_received':
                    await this.processPaymentsReceived(financialRequest.value, operations);
                    break;

                case 'profit_loss':
                    await this.processProfitLoss(financialRequest.value, operations);
                    break;

                default:
                    this.log('warn', `Unknown financial request type: ${financialRequest.value.type}`);
            }
        } catch (error) {
            this.log('error', 'Error processing financial request', error);
        }

        return operations;
    }

    private async processQuarterlyAnalysis(request: any, operations: MCP.ContextOperation[]) {
        this.log('info', `Processing quarterly analysis for Y${request.year}Q${request.quarter}`);

        try {
            const quarterlyMetrics = await quickbooksService.calculateQuarterlyMetrics(
                request.year,
                request.quarter
            );

            // Add the raw data
            operations.push(this.createAddOperation(
                'financial_data',
                quarterlyMetrics,
                0.95,
                `QuickBooks data for Y${request.year}Q${request.quarter}`,
                ["financial_request"]
            ));

            // Generate analysis
            const analysis = this.analyzeQuarterlyMetrics(quarterlyMetrics);

            operations.push(this.createAddOperation(
                'financial_analysis',
                analysis,
                0.90,
                `Analysis of Y${request.year}Q${request.quarter} financial performance`,
                ["financial_data"]
            ));

            // Generate a report
            const report = this.generateQuarterlyReport(quarterlyMetrics, analysis);

            operations.push(this.createAddOperation(
                'financial_report',
                report,
                0.95,
                `Quarterly financial report for Y${request.year}Q${request.quarter}`,
                ["financial_data", "financial_analysis"]
            ));

            this.log('info', 'Quarterly analysis completed successfully');
        } catch (error) {
            this.log('error', 'Error in quarterly analysis', error);
        }
    }

    private async processPaymentsReceived(request: any, operations: MCP.ContextOperation[]) {
        this.log('info', `Processing payments received from ${request.startDate} to ${request.endDate}`);

        try {
            const payments = await quickbooksService.getPaymentsReceived(
                request.startDate,
                request.endDate
            );

            operations.push(this.createAddOperation(
                'financial_data',
                { payments },
                0.95,
                `QuickBooks payments from ${request.startDate} to ${request.endDate}`,
                ["financial_request"]
            ));

            // Generate payment analysis
            const analysis = this.analyzePayments(payments);

            operations.push(this.createAddOperation(
                'financial_analysis',
                analysis,
                0.90,
                `Analysis of payments from ${request.startDate} to ${request.endDate}`,
                ["financial_data"]
            ));

            this.log('info', 'Payments analysis completed successfully');
        } catch (error) {
            this.log('error', 'Error processing payments', error);
        }
    }

    private async processProfitLoss(request: any, operations: MCP.ContextOperation[]) {
        this.log('info', `Processing profit & loss from ${request.startDate} to ${request.endDate}`);

        try {
            const profitAndLoss = await quickbooksService.getProfitAndLoss(
                request.startDate,
                request.endDate
            );

            operations.push(this.createAddOperation(
                'financial_data',
                { profitAndLoss },
                0.95,
                `QuickBooks P&L from ${request.startDate} to ${request.endDate}`,
                ["financial_request"]
            ));

            // Generate P&L analysis
            const analysis = this.analyzeProfitLoss(profitAndLoss);

            operations.push(this.createAddOperation(
                'financial_analysis',
                analysis,
                0.90,
                `Analysis of P&L from ${request.startDate} to ${request.endDate}`,
                ["financial_data"]
            ));

            this.log('info', 'Profit & Loss analysis completed successfully');
        } catch (error) {
            this.log('error', 'Error processing profit & loss', error);
        }
    }

    // Helper method to analyze quarterly metrics
    private analyzeQuarterlyMetrics(metrics: any) {
        // Implementation would contain business logic to analyze the metrics
        // This is a simplified version
        return {
            overview: `Financial performance for ${metrics.period.year} Q${metrics.period.quarter}`,
            profitabilityAssessment: metrics.summary.netIncome > 0
                ? "Profitable quarter"
                : "Loss-making quarter",
            profitMarginAssessment: this.assessProfitMargin(parseFloat(metrics.summary.profitMargin)),
            revenueBreakdown: {
                paymentMethods: Object.keys(metrics.paymentsByType).map(method => ({
                    method,
                    amount: metrics.paymentsByType[method],
                    percentage: (metrics.paymentsByType[method] / metrics.summary.totalRevenue * 100).toFixed(2) + '%'
                }))
            },
            expenseAnalysis: {
                topCategories: metrics.topExpenseCategories,
                assessment: `The top expense category is ${metrics.topExpenseCategories[0]?.category || 'unknown'}, representing ${metrics.topExpenseCategories[0]?.percentage || '0%'} of total expenses.`
            }
        };
    }

    // Helper method to assess profit margin
    private assessProfitMargin(margin: number): string {
        if (margin < 0) return "Negative profit margin indicates operational losses.";
        if (margin < 10) return "Low profit margin. Consider cost reduction strategies.";
        if (margin < 20) return "Moderate profit margin within industry average.";
        return "Strong profit margin above industry average.";
    }

    // Helper method to analyze payments
    private analyzePayments(payments: any[]) {
        // Simplified implementation
        return {
            count: payments.length,
            total: payments.reduce((sum, p) => sum + p.TotalAmt, 0),
            average: payments.length > 0
                ? (payments.reduce((sum, p) => sum + p.TotalAmt, 0) / payments.length).toFixed(2)
                : 0,
            largestPayment: payments.length > 0
                ? Math.max(...payments.map(p => p.TotalAmt))
                : 0
        };
    }

    // Helper method to analyze profit and loss
    private analyzeProfitLoss(profitAndLoss: any) {
        // Simplified implementation
        return {
            // Implementation would extract and analyze P&L data
            totalRevenue: this.extractTotalFromPL(profitAndLoss, 'Total Income'),
            totalExpenses: this.extractTotalFromPL(profitAndLoss, 'Total Expenses'),
            netIncome: this.extractTotalFromPL(profitAndLoss, 'Net Income')
        };
    }

    // Helper to extract totals from a P&L report
    private extractTotalFromPL(profitAndLoss: any, category: string): number {
        try {
            const row = profitAndLoss.Rows.Row.find((r: any) =>
                r.Summary?.ColData?.[0]?.value === category
            );
            return row ? parseFloat(row.Summary.ColData[1].value) : 0;
        } catch (error) {
            this.log('error', `Error extracting ${category} from P&L`, error);
            return 0;
        }
    }

    // Generate a formatted quarterly report
    private generateQuarterlyReport(metrics: any, analysis: any) {
        return {
            title: `Financial Performance Report - ${metrics.period.year} Q${metrics.period.quarter}`,
            period: `${metrics.period.startDate} to ${metrics.period.endDate}`,
            executiveSummary: `In Q${metrics.period.quarter} of ${metrics.period.year}, the business generated $${metrics.summary.totalRevenue.toLocaleString()} in revenue with a net income of $${metrics.summary.netIncome.toLocaleString()}, resulting in a profit margin of ${metrics.summary.profitMargin}.`,
            financialHighlights: [
                `Revenue: $${metrics.summary.totalRevenue.toLocaleString()}`,
                `Expenses: $${metrics.summary.totalExpenses.toLocaleString()}`,
                `Net Income: $${metrics.summary.netIncome.toLocaleString()}`,
                `Profit Margin: ${metrics.summary.profitMargin}`,
                `Total Payments Processed: ${metrics.summary.paymentCount}`
            ],
            revenueBreakdown: {
                description: "Breakdown of revenue by payment method:",
                methods: Object.entries(metrics.paymentsByType).map(([method, amount]) => ({
                    method,
                    amount: `$${(amount as number).toLocaleString()}`,
                    percentage: `${((amount as number) / metrics.summary.totalRevenue * 100).toFixed(2)}%`
                }))
            },
            expenseAnalysis: {
                description: "Top expense categories:",
                categories: metrics.topExpenseCategories.map((cat: any) => ({
                    category: cat.category,
                    amount: `$${cat.amount.toLocaleString()}`,
                    percentage: cat.percentage
                }))
            },
            profitabilityAnalysis: analysis.profitMarginAssessment,
            recommendations: this.generateRecommendations(metrics, analysis)
        };
    }

    // Generate business recommendations based on the financial data
    private generateRecommendations(metrics: any, analysis: any): string[] {
        const recommendations = [];

        // Profitability recommendations
        if (metrics.summary.netIncome <= 0) {
            // @ts-ignore
            recommendations.push("Urgent action needed to address negative profitability. Review and reduce top expense categories.");
        } else if (parseFloat(metrics.summary.profitMargin) < 10) {
            // @ts-ignore
            recommendations.push("Consider strategies to improve your profit margin, such as raising prices or reducing costs in top expense categories.");
        }

        // Revenue recommendations
        const paymentMethods = Object.keys(metrics.paymentsByType);
        if (paymentMethods.length === 1) {
            // @ts-ignore
            recommendations.push("Diversify payment methods to reduce dependency on a single payment channel.");
        }

        // Expense recommendations
        if (metrics.topExpenseCategories.length > 0) {
            const topExpense = metrics.topExpenseCategories[0];
            if (parseFloat(topExpense.percentage) > 30) {
                // @ts-ignore
                recommendations.push(`Your top expense (${topExpense.category}) represents ${topExpense.percentage} of total expenses. Consider strategies to reduce this cost.`);
            }
        }

        // Default recommendation if none were generated
        if (recommendations.length === 0) {
            // @ts-ignore
            recommendations.push("Continue current financial strategies, which are yielding positive results.");
        }

        return recommendations;
    }
}