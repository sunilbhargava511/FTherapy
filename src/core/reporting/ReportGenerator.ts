import { SessionNotebook } from '../notebook/SessionNotebook';
import { 
  ExtractedFinancialData, 
  QualitativeReport, 
  QuantitativeReport,
  SessionNotebookData 
} from '../notebook/types';
import { DataExtractor } from '../extraction/DataExtractor';

export class ReportGenerator {
  private extractor: DataExtractor;

  constructor() {
    this.extractor = new DataExtractor();
  }

  /**
   * Generate both qualitative and quantitative reports for a notebook
   */
  async generateReports(notebook: SessionNotebook): Promise<{
    qualitative: QualitativeReport;
    quantitative: QuantitativeReport;
  }> {
    // Extract data from conversation
    const messages = notebook.getMessages();
    const { financialData, userProfile } = this.extractor.extract(messages);
    
    // Store extracted data in notebook
    notebook.setExtractedData(financialData);
    notebook.updateProfile(userProfile);

    // Generate reports in parallel
    const [qualitative, quantitative] = await Promise.all([
      this.generateQualitativeReport(notebook, financialData),
      this.generateQuantitativeReport(financialData, userProfile)
    ]);

    // Attach reports to notebook
    notebook.attachQualitativeReport(qualitative);
    notebook.attachQuantitativeReport(quantitative);

    return { qualitative, quantitative };
  }

  /**
   * Generate qualitative report using AI (server-side only)
   */
  private async generateQualitativeReport(
    notebook: SessionNotebook,
    financialData: ExtractedFinancialData
  ): Promise<QualitativeReport> {
    try {
      // Call server-side API for report generation
      const response = await fetch('/api/notebooks/generate-qualitative-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookData: notebook.getData(),
          financialData: financialData
        })
      });

      if (response.ok) {
        const report = await response.json();
        return report;
      } else {
        throw new Error('Failed to generate qualitative report via API');
      }
    } catch (error) {
      console.error('Failed to generate qualitative report:', error);
      // Return fallback report
      return this.generateFallbackQualitativeReport(notebook, financialData);
    }
  }

  /**
   * Generate quantitative report from extracted data
   */
  private generateQuantitativeReport(
    financialData: ExtractedFinancialData,
    userProfile: any
  ): QuantitativeReport {
    const monthlyIncome = financialData.income.monthly || 0;
    const monthlyExpenses = financialData.expenses.total || 0;
    const surplus = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0;

    // Identify savings opportunities
    const savingsOpportunities = this.identifySavingsOpportunities(financialData);

    // Generate projections
    const projections = this.generateProjections(monthlyIncome, monthlyExpenses, surplus);

    return {
      monthlyBudget: {
        income: monthlyIncome,
        expenses: this.categorizeExpenses(financialData.expenses),
        surplus: surplus,
        savingsRate: Math.round(savingsRate * 10) / 10
      },
      savingsOpportunities,
      projections,
      generatedAt: new Date()
    };
  }

  /**
   * Categorize expenses for budget breakdown
   */
  private categorizeExpenses(expenses: ExtractedFinancialData['expenses']): { [category: string]: number } {
    const categorized: { [category: string]: number } = {};
    
    const categories = ['housing', 'food', 'transport', 'fitness', 'entertainment', 'subscriptions', 'other'];
    
    for (const category of categories) {
      const value = expenses[category as keyof typeof expenses];
      if (value && typeof value === 'number' && value > 0) {
        categorized[category] = value;
      }
    }

    return categorized;
  }

  /**
   * Identify potential savings opportunities
   */
  private identifySavingsOpportunities(data: ExtractedFinancialData): QuantitativeReport['savingsOpportunities'] {
    const opportunities: QuantitativeReport['savingsOpportunities'] = [];
    const monthlyIncome = data.income.monthly || 0;

    // Housing: Should be ~30% of income
    if (data.expenses.housing) {
      const recommendedHousing = monthlyIncome * 0.30;
      if (data.expenses.housing > recommendedHousing) {
        opportunities.push({
          category: 'Housing',
          currentSpend: data.expenses.housing,
          recommendedSpend: recommendedHousing,
          potentialSaving: data.expenses.housing - recommendedHousing,
          suggestion: 'Consider finding more affordable housing or getting a roommate'
        });
      }
    }

    // Food: Should be ~10-15% of income
    if (data.expenses.food) {
      const recommendedFood = monthlyIncome * 0.12;
      if (data.expenses.food > recommendedFood) {
        opportunities.push({
          category: 'Food',
          currentSpend: data.expenses.food,
          recommendedSpend: recommendedFood,
          potentialSaving: data.expenses.food - recommendedFood,
          suggestion: 'Try meal planning and cooking more at home'
        });
      }
    }

    // Entertainment: Should be ~5-10% of income
    if (data.expenses.entertainment) {
      const recommendedEntertainment = monthlyIncome * 0.07;
      if (data.expenses.entertainment > recommendedEntertainment) {
        opportunities.push({
          category: 'Entertainment',
          currentSpend: data.expenses.entertainment,
          recommendedSpend: recommendedEntertainment,
          potentialSaving: data.expenses.entertainment - recommendedEntertainment,
          suggestion: 'Look for free or low-cost entertainment options'
        });
      }
    }

    // Subscriptions: Review all subscriptions
    if (data.expenses.subscriptions && data.expenses.subscriptions > 50) {
      opportunities.push({
        category: 'Subscriptions',
        currentSpend: data.expenses.subscriptions,
        recommendedSpend: 50,
        potentialSaving: Math.max(0, data.expenses.subscriptions - 50),
        suggestion: 'Review and cancel unused subscriptions'
      });
    }

    return opportunities;
  }

  /**
   * Generate financial projections
   */
  private generateProjections(
    monthlyIncome: number,
    monthlyExpenses: number,
    monthlySurplus: number
  ): QuantitativeReport['projections'] {
    // Simple linear projections (can be enhanced with compound interest, etc.)
    return {
      threeMonth: {
        savings: monthlySurplus * 3,
        netWorth: monthlySurplus * 3
      },
      sixMonth: {
        savings: monthlySurplus * 6,
        netWorth: monthlySurplus * 6
      },
      oneYear: {
        savings: monthlySurplus * 12,
        netWorth: monthlySurplus * 12
      }
    };
  }

  /**
   * Parse AI-generated text into structured qualitative report
   */
  private parseQualitativeReport(aiResponse: string): QualitativeReport {
    // This is a simplified parser - can be enhanced with better structure
    const sections = aiResponse.split('\n\n');
    
    const report: QualitativeReport = {
      summary: '',
      keyInsights: [],
      recommendations: [],
      actionItems: [],
      generatedAt: new Date()
    };

    // Extract summary (usually first paragraph)
    report.summary = sections[0] || 'Financial coaching session completed.';

    // Extract insights, recommendations, and action items
    for (const section of sections) {
      if (section.toLowerCase().includes('insight')) {
        const insights = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
        report.keyInsights = insights.map(i => i.replace(/^[-•]\s*/, '').trim());
      }
      if (section.toLowerCase().includes('recommend')) {
        const recommendations = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
        report.recommendations = recommendations.map(r => r.replace(/^[-•]\s*/, '').trim());
      }
      if (section.toLowerCase().includes('action') || section.toLowerCase().includes('next step')) {
        const actions = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || line.match(/^\d+\./));
        report.actionItems = actions.map(a => a.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim());
      }
    }

    // Ensure we have at least some content
    if (report.keyInsights.length === 0) {
      report.keyInsights = ['Session data has been recorded for analysis'];
    }
    if (report.recommendations.length === 0) {
      report.recommendations = ['Continue tracking expenses and income'];
    }
    if (report.actionItems.length === 0) {
      report.actionItems = ['Review monthly budget', 'Set savings goals'];
    }

    return report;
  }

  /**
   * Generate fallback qualitative report if AI fails
   */
  private generateFallbackQualitativeReport(
    notebook: SessionNotebook,
    financialData: ExtractedFinancialData
  ): QualitativeReport {
    const profile = notebook.getUserProfile();
    const surplus = (financialData.income.monthly || 0) - (financialData.expenses.total || 0);

    const report: QualitativeReport = {
      summary: `Financial coaching session with ${profile.name || 'client'} completed. ` +
               `Based on our conversation, we've identified key areas for financial improvement.`,
      keyInsights: [],
      recommendations: [],
      actionItems: [],
      generatedAt: new Date()
    };

    // Generate insights based on data
    if (surplus > 0) {
      report.keyInsights.push(`You have a monthly surplus of $${surplus.toFixed(2)}, which is great for building savings.`);
    } else if (surplus < 0) {
      report.keyInsights.push(`Your expenses exceed income by $${Math.abs(surplus).toFixed(2)} monthly.`);
    }

    if (financialData.income.monthly) {
      report.keyInsights.push(`Monthly income: $${financialData.income.monthly.toFixed(2)}`);
    }

    if (financialData.expenses.total) {
      report.keyInsights.push(`Total monthly expenses: $${financialData.expenses.total.toFixed(2)}`);
    }

    // Generate recommendations
    if (surplus < 0) {
      report.recommendations.push('Reduce discretionary spending to balance your budget');
      report.recommendations.push('Look for ways to increase income');
    }

    if (!financialData.goals.savings || financialData.goals.savings < 100) {
      report.recommendations.push('Aim to save at least 10% of your income');
    }

    if (financialData.debts?.total && financialData.debts.total > 0) {
      report.recommendations.push('Create a debt repayment plan');
    }

    // Generate action items
    report.actionItems.push('Track all expenses for the next month');
    report.actionItems.push('Create a detailed monthly budget');
    
    if (surplus > 0) {
      report.actionItems.push(`Set up automatic transfer of $${(surplus * 0.5).toFixed(2)} to savings`);
    }

    return report;
  }
}