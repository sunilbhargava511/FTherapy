'use client';

import { ChevronRight } from 'lucide-react';
import { UserProfile, TherapistPersonality } from '@/lib/types';
import { calculateBudget } from '@/lib/budget-calculator';

interface FinancialSummaryProps {
  userProfile: UserProfile;
  therapist: TherapistPersonality;
  onStartNew: () => void;
}

export default function FinancialSummary({ userProfile, therapist, onStartNew }: FinancialSummaryProps) {
  const budgetItems = calculateBudget(userProfile);
  
  const getTherapistMessage = () => {
    const messages = {
      'mel-robbins': `HERE'S YOUR FINANCIAL REALITY CHECK!`,
      'aja-evans': `Your Financial Wellness Journey`,
      'ramit-sethi': `${userProfile.name}'s Rich Life Blueprint`,
      'nora-ephron': `The Financial Life of ${userProfile.name}`,
      'michelle-obama': `Your Path to Financial Empowerment`
    };
    
    return messages[therapist.id as keyof typeof messages] || messages['mel-robbins'];
  };

  const totalMonthly = budgetItems.reduce((sum, item) => sum + item.monthly, 0);
  const totalAnnual = budgetItems.reduce((sum, item) => sum + item.annual, 0);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">
          {userProfile.name}, {getTherapistMessage()}
        </h3>
        <p className="mb-4 text-gray-600">
          Here&apos;s your personalized financial analysis based on your lifestyle choices and preferences.
        </p>
      </div>
      
      {/* Qualitative Summary */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold mb-4 text-gray-800">Your Lifestyle Choices</h4>
        <div className="space-y-3">
          {userProfile.lifestyle?.housing?.preference && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p><strong className="text-blue-700">🏠 Living Situation:</strong> <span className="text-gray-700">{userProfile.lifestyle?.housing?.preference}</span></p>
            </div>
          )}
          {userProfile.lifestyle?.food?.preference && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p><strong className="text-green-700">🍽️ Eating Habits:</strong> <span className="text-gray-700">{userProfile.lifestyle?.food?.preference}</span></p>
            </div>
          )}
          {userProfile.lifestyle?.transport?.preference && (
            <div className="bg-purple-50 p-3 rounded-lg">
              <p><strong className="text-purple-700">🚗 Getting Around:</strong> <span className="text-gray-700">{userProfile.lifestyle?.transport?.preference}</span></p>
            </div>
          )}
          {userProfile.lifestyle?.fitness?.preference && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p><strong className="text-red-700">💪 Staying Active:</strong> <span className="text-gray-700">{userProfile.lifestyle?.fitness?.preference}</span></p>
            </div>
          )}
          {userProfile.lifestyle?.entertainment?.preference && (
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p><strong className="text-yellow-700">🎬 Having Fun:</strong> <span className="text-gray-700">{userProfile.lifestyle?.entertainment?.preference}</span></p>
            </div>
          )}
          {userProfile.lifestyle?.subscriptions?.preference && (
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p><strong className="text-indigo-700">📱 Subscriptions:</strong> <span className="text-gray-700">{userProfile.lifestyle?.subscriptions?.preference}</span></p>
            </div>
          )}
          {userProfile.lifestyle?.travel?.preference && (
            <div className="bg-pink-50 p-3 rounded-lg">
              <p><strong className="text-pink-700">✈️ Travel Style:</strong> <span className="text-gray-700">{userProfile.lifestyle?.travel?.preference}</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Quantitative Breakdown */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Your Estimated Monthly Budget</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2">Category</th>
                <th className="text-right py-3 px-2">Monthly</th>
                <th className="text-right py-3 px-2">Annual</th>
                <th className="text-right py-3 px-2">% of Budget</th>
              </tr>
            </thead>
            <tbody>
              {budgetItems.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-2">
                    <span className="mr-2">{item.icon}</span>
                    {item.category}
                  </td>
                  <td className="text-right px-2 font-medium">
                    ${item.monthly.toLocaleString()}
                  </td>
                  <td className="text-right px-2">
                    ${item.annual.toLocaleString()}
                  </td>
                  <td className="text-right px-2">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs w-8 font-medium">{item.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t-2 bg-gray-50">
                <td className="pt-3 px-2">Total</td>
                <td className="text-right pt-3 px-2">
                  ${totalMonthly.toLocaleString()}
                </td>
                <td className="text-right pt-3 px-2">
                  ${totalAnnual.toLocaleString()}
                </td>
                <td className="text-right pt-3 px-2">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Key Insights</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Your largest expense category is {budgetItems[0]?.category.toLowerCase()}</li>
          <li>• You&apos;re allocating {budgetItems.find(item => item.category.includes('Savings'))?.percentage}% to savings and investments</li>
          <li>• Based on your location ({userProfile.location}), costs are adjusted accordingly</li>
          <li>• Your lifestyle choices suggest a {totalMonthly > 5000 ? 'higher' : 'moderate'} cost of living</li>
        </ul>
      </div>

      <button
        onClick={onStartNew}
        className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <ChevronRight className="w-5 h-5" />
        Start New Conversation
      </button>
    </div>
  );
}