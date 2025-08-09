'use client';

import { QualitativeReport, QuantitativeReport } from '@/core/notebook/types';
import { Download, FileText, PieChart } from 'lucide-react';

interface NotebookReportProps {
  qualitative?: QualitativeReport;
  quantitative?: QuantitativeReport;
  notebookId: string;
}

export default function NotebookReport({ qualitative, quantitative, notebookId }: NotebookReportProps) {
  const handleExport = async (format: 'json' | 'csv' | 'txt') => {
    try {
      const response = await fetch(`/api/notebooks/export?id=${notebookId}&format=${format}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${notebookId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Download size={16} />
          <span className="text-sm font-medium text-gray-700">Export Session</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport('json')}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            CSV
          </button>
          <button
            onClick={() => handleExport('txt')}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            TXT
          </button>
        </div>
      </div>

      {/* Qualitative Report */}
      {qualitative && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <FileText size={16} className="text-blue-500" />
            <h3 className="font-medium text-gray-800">Session Insights</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
              <p className="text-sm text-gray-600">{qualitative.summary}</p>
            </div>
            
            {qualitative.keyInsights && qualitative.keyInsights.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Key Insights</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {qualitative.keyInsights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {qualitative.recommendations && qualitative.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Recommendations</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {qualitative.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {qualitative.actionItems && qualitative.actionItems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Action Items</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {qualitative.actionItems.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quantitative Report */}
      {quantitative && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <PieChart size={16} className="text-green-500" />
            <h3 className="font-medium text-gray-800">Financial Analysis</h3>
          </div>
          
          <div className="space-y-3">
            {/* Budget Overview */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Monthly Budget</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Income:</span>
                  <span className="font-medium ml-2">${quantitative.monthlyBudget.income}</span>
                </div>
                <div>
                  <span className="text-gray-600">Surplus:</span>
                  <span className={`font-medium ml-2 ${quantitative.monthlyBudget.surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${quantitative.monthlyBudget.surplus}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Savings Rate:</span>
                  <span className="font-medium ml-2">{quantitative.monthlyBudget.savingsRate}%</span>
                </div>
              </div>
            </div>
            
            {/* Expense Breakdown */}
            {Object.keys(quantitative.monthlyBudget.expenses).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Expenses</h4>
                <div className="space-y-1">
                  {Object.entries(quantitative.monthlyBudget.expenses).map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{category}:</span>
                      <span className="font-medium">${amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Savings Opportunities */}
            {quantitative.savingsOpportunities && quantitative.savingsOpportunities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Savings Opportunities</h4>
                <div className="space-y-2">
                  {quantitative.savingsOpportunities.map((opp, index) => (
                    <div key={index} className="bg-yellow-50 p-2 rounded text-sm">
                      <div className="font-medium text-yellow-800">{opp.category}</div>
                      <div className="text-yellow-700">Save ${opp.potentialSaving}/month</div>
                      <div className="text-yellow-600">{opp.suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Projections */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Projections</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-800">3 Months</div>
                  <div className="text-blue-700">${quantitative.projections.threeMonth.savings}</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-800">6 Months</div>
                  <div className="text-blue-700">${quantitative.projections.sixMonth.savings}</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-800">1 Year</div>
                  <div className="text-blue-700">${quantitative.projections.oneYear.savings}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Info */}
      <div className="text-xs text-gray-500 text-center">
        Reports generated: {qualitative ? new Date(qualitative.generatedAt).toLocaleString() : 'N/A'}
      </div>
    </div>
  );
}