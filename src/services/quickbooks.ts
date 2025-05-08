// src/services/quickbooks.ts
import QuickBooks from 'node-quickbooks';
import { config } from '../config';
import { logger } from './logging';

class QuickBooksService {
    private qbo: any; // We'll use 'any' type since the library is not fully typed

    constructor() {
        try {
            // Set OAuth version globally
            QuickBooks.setOauthVersion('2.0', config.quickbooks.useSandbox);

            // Initialize QuickBooks with OAuth 2.0
            this.qbo = new QuickBooks(
                config.quickbooks.clientId,
                config.quickbooks.clientSecret,
                config.quickbooks.accessToken,
                undefined, // tokenSecret not needed for OAuth 2.0
                config.quickbooks.realmId,
                config.quickbooks.useSandbox,
                config.quickbooks.debug,
                60, // minor version
                '2.0', // OAuth version
                config.quickbooks.refreshToken
            );

            logger.info('QuickBooks service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize QuickBooks service:', error);
            throw error;
        }
    }

    /**
     * Fetch payments received within a date range
     */
    async getPaymentsReceived(startDate: string, endDate: string): Promise<any[]> {
        try {
            return new Promise((resolve, reject) => {
                // Get all payments first (since custom queries aren't supported)
                this.qbo.findPayments((err: any, payments: any) => {
                    if (err) {
                        logger.error('Error fetching QuickBooks payments:', err);
                        reject(err);
                    } else {
                        const allPayments = payments?.QueryResponse?.Payment || [];
                        
                        // Filter payments by date range locally
                        const filteredPayments = allPayments.filter((payment: any) => {
                            const txnDate = new Date(payment.TxnDate);
                            const start = new Date(startDate);
                            const end = new Date(endDate);
                            return txnDate >= start && txnDate <= end;
                        });
                        
                        logger.info(`Filtered ${filteredPayments.length} payments between ${startDate} and ${endDate}`);
                        resolve(filteredPayments);
                    }
                });
            });
        } catch (error) {
            logger.error('Exception in getPaymentsReceived:', error);
            throw error;
        }
    }

    /**
     * Fetch profit and loss report
     */
    async getProfitAndLoss(startDate: string, endDate: string): Promise<any> {
        try {
            return new Promise((resolve, reject) => {
                this.qbo.reportProfitAndLoss({
                    start_date: startDate,
                    end_date: endDate
                }, (err: any, report: any) => {
                    if (err) {
                        logger.error('Error fetching QuickBooks P&L report:', err);
                        reject(err);
                    } else {
                        resolve(report);
                    }
                });
            });
        } catch (error) {
            logger.error('Exception in getProfitAndLoss:', error);
            throw error;
        }
    }

    /**
     * Calculate quarterly metrics
     */
    async calculateQuarterlyMetrics(year: number, quarter: number): Promise<any> {
        try {
            // Define date range for the quarter
            const startMonth = (quarter - 1) * 3 + 1;
            const endMonth = quarter * 3;
            const startDate = `${year}-${startMonth.toString().padStart(2, '0')}-01`;

            // Calculate end date correctly for each quarter
            let endDate: string;
            if (endMonth === 3) {
                // March - 31 days
                endDate = `${year}-03-31`;
            } else if (endMonth === 6) {
                // June - 30 days
                endDate = `${year}-06-30`;
            } else if (endMonth === 9) {
                // September - 30 days
                endDate = `${year}-09-30`;
            } else {
                // December - 31 days
                endDate = `${year}-12-31`;
            }

            // Fetch payments and P&L in parallel
            const [payments, profitAndLoss] = await Promise.all([
                this.getPaymentsReceived(startDate, endDate),
                this.getProfitAndLoss(startDate, endDate)
            ]);

            // Extract key financial metrics from the P&L report
            const extractMetric = (report: any, label: string): number => {
                try {
                    if (!report || !report.Rows || !Array.isArray(report.Rows.Row)) {
                        return 0;
                    }

                    const row = report.Rows.Row.find((r: any) =>
                        r.Summary?.ColData?.[0]?.value === label ||
                        (r.ColData && r.ColData[0]?.value === label)
                    );

                    if (row && row.Summary?.ColData?.[1]?.value) {
                        return parseFloat(row.Summary.ColData[1].value);
                    } else if (row && row.ColData?.[1]?.value) {
                        return parseFloat(row.ColData[1].value);
                    }

                    return 0;
                } catch (error) {
                    logger.error(`Error extracting metric ${label}:`, error);
                    return 0;
                }
            };

            const totalRevenue = extractMetric(profitAndLoss, 'Total Income');
            const totalExpenses = extractMetric(profitAndLoss, 'Total Expenses');
            const netIncome = extractMetric(profitAndLoss, 'Net Income');

            // Count payments by type
            const paymentsByType = payments.reduce((acc: any, payment: any) => {
                const paymentMethod = payment.PaymentMethodRef?.name || 'Other';
                acc[paymentMethod] = (acc[paymentMethod] || 0) + parseFloat(payment.TotalAmt || 0);
                return acc;
            }, {});

            return {
                period: {
                    year,
                    quarter,
                    startDate,
                    endDate
                },
                summary: {
                    totalRevenue,
                    totalExpenses,
                    netIncome,
                    profitMargin: totalRevenue ? `${(netIncome / totalRevenue * 100).toFixed(2)}%` : '0%',
                    paymentCount: payments.length
                },
                paymentsByType,
                topExpenseCategories: this.extractTopExpenseCategories(profitAndLoss)
            };
        } catch (error) {
            logger.error('Exception in calculateQuarterlyMetrics:', error);
            throw error;
        }
    }

    /**
     * Extract top expense categories from P&L report
     */
    private extractTopExpenseCategories(profitAndLoss: any): any[] {
        try {
            if (!profitAndLoss || !profitAndLoss.Rows || !Array.isArray(profitAndLoss.Rows.Row)) {
                return [];
            }

            // Find the expenses section
            const expensesSection = profitAndLoss.Rows.Row.find((row: any) =>
                row.Header?.ColData?.[0]?.value === 'Expenses' ||
                row.group === 'TotalExpenses'
            );

            if (!expensesSection || !expensesSection.Rows?.Row) {
                return [];
            }

            // Define types for better TypeScript support
            interface ExpenseCategory {
                category: string;
                amount: number;
                percentage: string;
            }

            // Get expense categories and amounts
            const categories: ExpenseCategory[] = expensesSection.Rows.Row
                .filter((row: any) => row.ColData?.[0]?.value && row.ColData?.[1]?.value)
                .map((row: any) => {
                    const amount = parseFloat(row.ColData[1].value);
                    return {
                        category: row.ColData[0].value,
                        amount,
                        percentage: '' // Will calculate below
                    };
                })
                .filter((cat: ExpenseCategory) => cat.amount > 0); // Filter out zero amounts

            // Calculate percentages
            const totalExpenses = categories.reduce((sum: number, cat: ExpenseCategory) => sum + cat.amount, 0);

            if (totalExpenses > 0) {
                categories.forEach((cat: ExpenseCategory) => {
                    cat.percentage = `${(cat.amount / totalExpenses * 100).toFixed(2)}%`;
                });
            }

            // Sort by amount (descending) and return top 5
            return categories
                .sort((a: ExpenseCategory, b: ExpenseCategory) => b.amount - a.amount)
                .slice(0, 5);
        } catch (error) {
            logger.error('Error extracting expense categories:', error);
            return [];
        }
    }
}

export const quickbooksService = new QuickBooksService();