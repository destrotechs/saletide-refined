'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  PlusIcon,
  MinusIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalculatorIcon,
  ScaleIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';
import { formatCurrency } from '@/lib/utils';
import { apiClient, AccountCategory, Account, PLStatement, FinancialSummary } from '@/lib/api';


interface SummaryCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  isPercentage?: boolean;
  isCurrency?: boolean;
}

function SummaryCard({ title, value, subtitle, icon, color, trend, isPercentage = false, isCurrency = true }: SummaryCardProps) {
  const formattedValue = isPercentage
    ? `${value.toFixed(2)}%`
    : isCurrency
    ? formatCurrency(value)
    : value.toLocaleString();

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${color}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {trend !== undefined && (
            <div className={`flex items-center space-x-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartOfAccountsSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: accountCategories = [], isLoading, error } = useQuery({
    queryKey: ['chartOfAccounts'],
    queryFn: () => apiClient.getChartOfAccounts(),
  });

  const filteredCategories = useMemo(() => {
    if (selectedCategory === 'all') {
      return accountCategories;
    }
    return accountCategories.filter(cat => cat.account_type === selectedCategory);
  }, [accountCategories, selectedCategory]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 text-center">
            Error loading chart of accounts. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-xl font-semibold">Chart of Accounts</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Comprehensive list of all financial accounts</p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="ASSET">Assets</option>
              <option value="LIABILITY">Liabilities</option>
              <option value="EQUITY">Equity</option>
              <option value="REVENUE">Revenue</option>
              <option value="EXPENSE">Expenses</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {filteredCategories.map((category) => (
            <div key={category.id} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.code} - {category.name}</h3>
                    <p className="text-sm text-gray-600">{category.account_type.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(category.total_balance)}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {category.accounts.map((account) => (
                  <div key={account.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-900">
                            {account.code} - {account.name}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {account.account_subtype}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-semibold text-gray-900">{formatCurrency(account.balance)}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>DR: {formatCurrency(account.debit_balance)}</span>
                          <span>CR: {formatCurrency(account.credit_balance)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfitLossSection() {
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');

  const { data: plStatement, isLoading, error } = useQuery({
    queryKey: ['profitLoss', startDate, endDate],
    queryFn: () => apiClient.getProfitLossStatement(startDate, endDate),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-xl font-semibold">Profit & Loss Statement</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Income statement for selected period</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button variant="outline" className="flex items-center space-x-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center">
            Error loading profit & loss statement. Please try again.
          </div>
        ) : plStatement ? (
        <div className="space-y-6">
          {/* Revenue Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-green-200">
              <h3 className="font-semibold text-green-900">Revenue</h3>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Service Revenue</span>
                <span className="font-medium">{formatCurrency(plStatement.revenue.service_revenue)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Parts Revenue</span>
                <span className="font-medium">{formatCurrency(plStatement.revenue.parts_revenue)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Labor Revenue</span>
                <span className="font-medium">{formatCurrency(plStatement.revenue.labor_revenue)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between bg-green-100 font-semibold">
                <span className="text-green-900">Total Revenue</span>
                <span className="text-green-900">{formatCurrency(plStatement.revenue.total_revenue)}</span>
              </div>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <h3 className="font-semibold text-red-900">Expenses</h3>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Cost of Goods Sold</span>
                <span className="font-medium">{formatCurrency(plStatement.expenses.cost_of_goods_sold)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Operating Expenses</span>
                <span className="font-medium">{formatCurrency(plStatement.expenses.operating_expenses)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Administrative Expenses</span>
                <span className="font-medium">{formatCurrency(plStatement.expenses.administrative_expenses)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between bg-red-100 font-semibold">
                <span className="text-red-900">Total Expenses</span>
                <span className="text-red-900">{formatCurrency(plStatement.expenses.total_expenses)}</span>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
              <h3 className="font-semibold text-blue-900">Summary</h3>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Gross Profit</span>
                <span className="font-semibold text-green-600">{formatCurrency(plStatement.gross_profit)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Net Income</span>
                <span className="font-semibold text-green-600">{formatCurrency(plStatement.net_income)}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Gross Margin</span>
                <span className="font-medium">{plStatement.gross_margin.toFixed(2)}%</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-gray-700">Net Margin</span>
                <span className="font-medium">{plStatement.net_margin.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BalanceSheetReport({ accountCategories }: { accountCategories: AccountCategory[] }) {
  const assets = accountCategories.filter(cat => cat.account_type === 'ASSET');
  const liabilities = accountCategories.filter(cat => cat.account_type === 'LIABILITY');
  const equity = accountCategories.filter(cat => cat.account_type === 'EQUITY');

  const totalAssets = assets.reduce((sum, cat) => sum + cat.total_balance, 0);
  const totalLiabilities = liabilities.reduce((sum, cat) => sum + cat.total_balance, 0);
  const totalEquity = equity.reduce((sum, cat) => sum + cat.total_balance, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Balance Sheet</CardTitle>
        <p className="text-sm text-gray-600">As of {new Date().toLocaleDateString()}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Assets Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets</h3>
            <div className="space-y-3">
              {assets.map((category) => (
                <div key={category.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">{category.name}</span>
                  <span className="font-medium">{formatCurrency(category.total_balance)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 border-t border-gray-300 font-semibold text-lg">
                <span>Total Assets</span>
                <span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>
          </div>

          {/* Liabilities Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Liabilities</h3>
            <div className="space-y-3">
              {liabilities.map((category) => (
                <div key={category.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">{category.name}</span>
                  <span className="font-medium">{formatCurrency(category.total_balance)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 border-t border-gray-300 font-semibold">
                <span>Total Liabilities</span>
                <span>{formatCurrency(totalLiabilities)}</span>
              </div>
            </div>
          </div>

          {/* Equity Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Equity</h3>
            <div className="space-y-3">
              {equity.map((category) => (
                <div key={category.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">{category.name}</span>
                  <span className="font-medium">{formatCurrency(category.total_balance)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 border-t border-gray-300 font-semibold">
                <span>Total Equity</span>
                <span>{formatCurrency(totalEquity)}</span>
              </div>
            </div>
          </div>

          {/* Balance Check */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>Total Liabilities + Equity</span>
              <span>{formatCurrency(totalLiabilities + totalEquity)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
              <span>Balance Check: {totalAssets === (totalLiabilities + totalEquity) ? '✓ Balanced' : '⚠ Not Balanced'}</span>
              <span>Difference: {formatCurrency(totalAssets - (totalLiabilities + totalEquity))}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialRatiosReport({ financialSummary }: { financialSummary: FinancialSummary }) {
  const ratios = [
    {
      category: 'Liquidity Ratios',
      items: [
        { name: 'Quick Ratio', value: financialSummary.quick_ratio, description: 'Ability to pay short-term debts', benchmark: '> 1.0' },
        { name: 'Current Ratio', value: (financialSummary.cash_on_hand + financialSummary.accounts_receivable) / (financialSummary.accounts_payable || 1), description: 'Short-term liquidity', benchmark: '1.5 - 3.0' },
      ]
    },
    {
      category: 'Leverage Ratios',
      items: [
        { name: 'Debt-to-Equity Ratio', value: financialSummary.debt_to_equity_ratio, description: 'Financial leverage', benchmark: '< 2.0' },
        { name: 'Debt Ratio', value: financialSummary.total_liabilities / financialSummary.total_assets, description: 'Total debt relative to assets', benchmark: '< 0.4' },
      ]
    },
    {
      category: 'Efficiency Ratios',
      items: [
        { name: 'Asset Turnover', value: 44000 / financialSummary.total_assets, description: 'Revenue per dollar of assets', benchmark: '> 0.5' },
        { name: 'Working Capital', value: financialSummary.working_capital, description: 'Short-term financial health', benchmark: '> 0', isCurrency: true },
      ]
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Financial Ratios Analysis</CardTitle>
        <p className="text-sm text-gray-600">Key performance indicators and benchmarks</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {ratios.map((category) => (
            <div key={category.category}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{category.category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((ratio) => (
                  <div key={ratio.name} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{ratio.name}</h4>
                      <span className="text-lg font-semibold">
                        {ratio.isCurrency
                          ? formatCurrency(ratio.value || 0)
                          : typeof ratio.value === 'number'
                            ? ratio.value.toFixed(2)
                            : '0.00'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{ratio.description}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">Benchmark: {ratio.benchmark}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        ratio.isCurrency
                          ? (ratio.value || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {ratio.isCurrency
                          ? (ratio.value || 0) > 0 ? 'Positive' : 'Negative'
                          : 'Calculated'
                        }
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FinancialReportsSection() {
  const [selectedReport, setSelectedReport] = useState<'overview' | 'balance' | 'ratios' | 'period'>('overview');

  const { data: accountCategories = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['chartOfAccounts'],
    queryFn: () => apiClient.getChartOfAccounts(),
  });

  const { data: financialSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['financialSummary'],
    queryFn: () => apiClient.getFinancialSummary(),
  });

  const { data: currentPL, isLoading: plLoading } = useQuery({
    queryKey: ['profitLoss', '2025-01-01', '2025-12-31'],
    queryFn: () => apiClient.getProfitLossStatement('2025-01-01', '2025-12-31'),
  });

  const reports = [
    { id: 'overview', name: 'Report Overview', icon: ChartBarIcon },
    { id: 'balance', name: 'Balance Sheet', icon: ScaleIcon },
    { id: 'ratios', name: 'Financial Ratios', icon: CalculatorIcon },
    { id: 'period', name: 'Period Analysis', icon: CalendarIcon },
  ];

  if (accountsLoading || summaryLoading || plLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Report Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id as any)}
                className={`${
                  selectedReport === report.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <Icon className="h-5 w-5" />
                <span>{report.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Report Content */}
      {selectedReport === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Button
            variant="outline"
            className="h-32 flex flex-col items-center justify-center space-y-3"
            onClick={() => setSelectedReport('balance')}
          >
            <ScaleIcon className="h-10 w-10" />
            <div className="text-center">
              <div className="font-semibold">Balance Sheet</div>
              <div className="text-xs text-gray-600">Assets, Liabilities & Equity</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-32 flex flex-col items-center justify-center space-y-3"
            onClick={() => setSelectedReport('ratios')}
          >
            <CalculatorIcon className="h-10 w-10" />
            <div className="text-center">
              <div className="font-semibold">Financial Ratios</div>
              <div className="text-xs text-gray-600">Liquidity, Leverage & Efficiency</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-32 flex flex-col items-center justify-center space-y-3"
            onClick={() => setSelectedReport('period')}
          >
            <CalendarIcon className="h-10 w-10" />
            <div className="text-center">
              <div className="font-semibold">Period Analysis</div>
              <div className="text-xs text-gray-600">Year-over-year comparison</div>
            </div>
          </Button>

          <Button variant="outline" className="h-32 flex flex-col items-center justify-center space-y-3">
            <DocumentTextIcon className="h-10 w-10" />
            <div className="text-center">
              <div className="font-semibold">Cash Flow</div>
              <div className="text-xs text-gray-600">Operating, Investing & Financing</div>
            </div>
          </Button>

          <Button variant="outline" className="h-32 flex flex-col items-center justify-center space-y-3">
            <ClipboardDocumentListIcon className="h-10 w-10" />
            <div className="text-center">
              <div className="font-semibold">Trial Balance</div>
              <div className="text-xs text-gray-600">All account balances</div>
            </div>
          </Button>

          <Button variant="outline" className="h-32 flex flex-col items-center justify-center space-y-3">
            <BanknotesIcon className="h-10 w-10" />
            <div className="text-center">
              <div className="font-semibold">Tax Summary</div>
              <div className="text-xs text-gray-600">Tax preparation data</div>
            </div>
          </Button>
        </div>
      )}

      {selectedReport === 'balance' && accountCategories && (
        <BalanceSheetReport accountCategories={accountCategories} />
      )}

      {selectedReport === 'ratios' && financialSummary && (
        <FinancialRatiosReport financialSummary={financialSummary} />
      )}

      {selectedReport === 'period' && currentPL && financialSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Period Analysis</CardTitle>
            <p className="text-sm text-gray-600">Year-to-date performance overview</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Revenue Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Total Revenue (YTD)</span>
                    <span className="font-semibold">{formatCurrency(currentPL.revenue.total_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Parts Revenue</span>
                    <span className="font-medium">{formatCurrency(currentPL.revenue.parts_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Labor Revenue</span>
                    <span className="font-medium">{formatCurrency(currentPL.revenue.labor_revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Service Revenue</span>
                    <span className="font-medium">{formatCurrency(currentPL.revenue.service_revenue)}</span>
                  </div>
                </div>
              </div>

              {/* Profitability Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Profitability Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Gross Profit</span>
                    <span className="font-semibold text-green-600">{formatCurrency(currentPL.gross_profit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Gross Margin</span>
                    <span className="font-medium">{currentPL.gross_margin}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Net Income</span>
                    <span className={`font-semibold ${currentPL.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(currentPL.net_income)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Net Margin</span>
                    <span className="font-medium">{currentPL.net_margin}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="mt-8 bg-blue-50 p-6 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">Key Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-800">
                    <strong>Revenue Mix:</strong> Parts sales dominate at {((currentPL.revenue.parts_revenue / currentPL.revenue.total_revenue) * 100).toFixed(1)}% of total revenue.
                  </p>
                </div>
                <div>
                  <p className="text-blue-800">
                    <strong>Liquidity:</strong> Strong cash position with a quick ratio of {financialSummary.quick_ratio.toFixed(2)}.
                  </p>
                </div>
                <div>
                  <p className="text-blue-800">
                    <strong>Working Capital:</strong> Healthy {formatCurrency(financialSummary.working_capital)} in working capital.
                  </p>
                </div>
                <div>
                  <p className="text-blue-800">
                    <strong>Asset Base:</strong> Total assets of {formatCurrency(financialSummary.total_assets)} with strong inventory position.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'pl' | 'reports'>('overview');

  const { data: financialSummary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['financialSummary'],
    queryFn: () => apiClient.getFinancialSummary(),
  });

  const tabs = [
    { id: 'overview', name: 'Financial Overview', icon: ChartBarIcon },
    { id: 'accounts', name: 'Chart of Accounts', icon: ClipboardDocumentListIcon },
    { id: 'pl', name: 'P&L Statement', icon: DocumentTextIcon },
    { id: 'reports', name: 'Financial Reports', icon: CalculatorIcon },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <PageHeader
            title="Accounting & Finance"
            description="Comprehensive financial management and reporting"
            breadcrumbs={[
              { label: 'Accounting' }
            ]}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <ArrowPathIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button size="sm" className="flex items-center">
                  <ArrowDownTrayIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export All</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </>
            }
          />

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {summaryLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : summaryError ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="text-red-600 text-center">
                      Error loading financial summary. Please try again.
                    </div>
                  </CardContent>
                </Card>
              ) : financialSummary ? (
                <>
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard
                      title="Total Assets"
                      value={financialSummary.total_assets}
                      subtitle="Current & Fixed Assets"
                      icon={<BanknotesIcon className="h-6 w-6 text-white" />}
                      color="bg-green-500"
                      trend={8.5}
                    />
                    <SummaryCard
                      title="Total Liabilities"
                      value={financialSummary.total_liabilities}
                      subtitle="Current & Long-term"
                      icon={<MinusIcon className="h-6 w-6 text-white" />}
                      color="bg-red-500"
                      trend={-2.3}
                    />
                    <SummaryCard
                      title="Total Equity"
                      value={financialSummary.total_equity}
                      subtitle="Owner's Equity"
                      icon={<ScaleIcon className="h-6 w-6 text-white" />}
                      color="bg-blue-500"
                      trend={12.1}
                    />
                    <SummaryCard
                      title="Working Capital"
                      value={financialSummary.working_capital}
                      subtitle="Current Assets - Current Liabilities"
                      icon={<CurrencyDollarIcon className="h-6 w-6 text-white" />}
                      color="bg-purple-500"
                      trend={5.7}
                    />
                  </div>

                  {/* Additional Financial Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SummaryCard
                      title="Cash on Hand"
                      value={financialSummary.cash_on_hand}
                      subtitle="Available Cash"
                      icon={<BanknotesIcon className="h-6 w-6 text-white" />}
                      color="bg-green-600"
                    />
                    <SummaryCard
                      title="Accounts Receivable"
                      value={financialSummary.accounts_receivable}
                      subtitle="Outstanding Invoices"
                      icon={<DocumentTextIcon className="h-6 w-6 text-white" />}
                      color="bg-yellow-500"
                    />
                    <SummaryCard
                      title="Accounts Payable"
                      value={financialSummary.accounts_payable}
                      subtitle="Outstanding Bills"
                      icon={<ClipboardDocumentListIcon className="h-6 w-6 text-white" />}
                      color="bg-orange-500"
                    />
                  </div>

                  {/* Financial Ratios */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SummaryCard
                      title="Quick Ratio"
                      value={financialSummary.quick_ratio}
                      subtitle="Liquidity Measure"
                      icon={<CalculatorIcon className="h-6 w-6 text-white" />}
                      color="bg-indigo-500"
                      isPercentage={false}
                      isCurrency={false}
                    />
                    <SummaryCard
                      title="Debt-to-Equity Ratio"
                      value={financialSummary.debt_to_equity_ratio}
                      subtitle="Leverage Measure"
                      icon={<ScaleIcon className="h-6 w-6 text-white" />}
                      color="bg-pink-500"
                      isPercentage={false}
                      isCurrency={false}
                    />
                  </div>
                </>
              ) : null}
            </div>
          )}

          {activeTab === 'accounts' && <ChartOfAccountsSection />}

          {activeTab === 'pl' && <ProfitLossSection />}

          {activeTab === 'reports' && <FinancialReportsSection />}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}