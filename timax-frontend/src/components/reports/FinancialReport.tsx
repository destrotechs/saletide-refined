'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  XMarkIcon,
  UserGroupIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

type DateFilterType = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom';

interface FinancialReportProps {
  onClose?: () => void;
}

export default function FinancialReport({ onClose }: FinancialReportProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Calculate date range based on filter
  const getDateRange = () => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today':
        return { start: formatDate(today), end: formatDate(today) };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: formatDate(yesterday), end: formatDate(yesterday) };
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return { start: formatDate(sevenDaysAgo), end: formatDate(today) };
      case 'last30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return { start: formatDate(thirtyDaysAgo), end: formatDate(today) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return { start: formatDate(today), end: formatDate(today) };
      default:
        return { start: formatDate(today), end: formatDate(today) };
    }
  };

  const dateRange = getDateRange();

  // Fetch analytics dashboard for period-based revenue
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-dashboard-report', dateRange.start, dateRange.end],
    queryFn: () => apiClient.getAnalyticsDashboard({
      start_date: dateRange.start,
      end_date: dateRange.end,
    }),
  });

  // Fetch dashboard stats for expenses
  const { data: dashboardStats, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.getDashboardStats(),
  });

  // Fetch commissions for the period
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['commissions-report', dateRange.start, dateRange.end],
    queryFn: () => apiClient.getCommissions({
      status: 'PAID',
    }),
  });

  // Fetch tips for the period
  const { data: tips, isLoading: tipsLoading } = useQuery({
    queryKey: ['tips-report', dateRange.start, dateRange.end],
    queryFn: () => apiClient.getTips({
      status: 'PAID',
    }),
  });

  // Fetch advances for the period
  const { data: advances, isLoading: advancesLoading } = useQuery({
    queryKey: ['advances-report', dateRange.start, dateRange.end],
    queryFn: () => apiClient.getAdvancePayments({
      status: 'PAID',
    }),
  });

  // Calculate totals - use analytics data for period-based revenue
  const totalRevenue = analyticsData?.kpis?.revenue?.current || 0;
  const totalExpenses = dashboardStats?.expenses?.total_expenses || 0;

  // Filter commissions, tips, and advances by date range
  const filterByDateRange = (items: any[], dateField: string = 'created_at') => {
    if (!items) return [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999); // Include the entire end date

    return items.filter(item => {
      const itemDate = new Date(item[dateField] || item.created_at);
      return itemDate >= start && itemDate <= end;
    });
  };

  const filteredCommissions = filterByDateRange(commissions?.results || [], 'paid_at');
  const filteredTips = filterByDateRange(tips?.results || [], 'paid_at');
  const filteredAdvances = filterByDateRange(advances?.results || [], 'paid_at');

  const totalCommissions = filteredCommissions.reduce((sum, c) => sum + parseFloat(c.commission_amount || '0'), 0);
  const totalTips = filteredTips.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  const totalAdvances = filteredAdvances.reduce((sum, a) => sum + parseFloat(a.approved_amount || a.requested_amount || '0'), 0);

  const totalEmployeeCompensation = totalCommissions + totalTips;
  const netRevenue = totalRevenue - totalExpenses;
  const netProfit = netRevenue - totalEmployeeCompensation;

  const isLoading = analyticsLoading || dashboardLoading || commissionsLoading || tipsLoading || advancesLoading;

  const handlePrint = async () => {
    try {
      setIsDownloadingPDF(true);
      const pdfBlob = await apiClient.getFinancialReportPDF({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      // Create a URL for the PDF blob and open it in a new window for printing
      const url = window.URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      } else {
        toast.error('Please allow pop-ups to print the report');
      }

      // Clean up the URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast.error('Failed to print PDF report');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloadingPDF(true);
      const pdfBlob = await apiClient.getFinancialReportPDF({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      // Create a download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financial_report_${dateRange.start}_${dateRange.end}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Financial report PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF report');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const getDateLabel = () => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    if (dateFilter === 'today') return 'Today';
    if (dateFilter === 'yesterday') return 'Yesterday';
    if (dateFilter === 'last7days') return 'Last 7 Days';
    if (dateFilter === 'last30days') return 'Last 30 Days';
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 no-print"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
            {/* Close Button - Hide on print */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors no-print z-10"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>

            <div className="p-8" ref={printRef}>
              {/* Date Filter Controls - Hide on print */}
              <div className="mb-6 no-print">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Select Report Period:</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setDateFilter('today')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              dateFilter === 'today'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                            }`}
                          >
                            Today
                          </button>
                          <button
                            onClick={() => setDateFilter('yesterday')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              dateFilter === 'yesterday'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                            }`}
                          >
                            Yesterday
                          </button>
                          <button
                            onClick={() => setDateFilter('last7days')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              dateFilter === 'last7days'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                            }`}
                          >
                            Last 7 Days
                          </button>
                          <button
                            onClick={() => setDateFilter('last30days')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              dateFilter === 'last30days'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                            }`}
                          >
                            Last 30 Days
                          </button>
                          <button
                            onClick={() => setDateFilter('custom')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              dateFilter === 'custom'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                            }`}
                          >
                            Custom Range
                          </button>
                        </div>
                      </div>

                      {dateFilter === 'custom' && (
                        <div className="flex flex-wrap items-end gap-4 pt-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-2">
                        <Button
                          onClick={handleDownloadPDF}
                          variant="outline"
                          className="flex items-center space-x-2 shadow-md"
                          disabled={isLoading || isDownloadingPDF}
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                          <span>{isDownloadingPDF ? 'Generating PDF...' : 'Download PDF'}</span>
                        </Button>
                        <Button
                          onClick={handlePrint}
                          className="flex items-center space-x-2 shadow-md"
                          disabled={isLoading || isDownloadingPDF}
                        >
                          <PrinterIcon className="h-5 w-5" />
                          <span>{isDownloadingPDF ? 'Generating...' : isLoading ? 'Loading...' : 'Print Report'}</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading financial data...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Printable Report Content */}
                  <div id="printable-content">
                    {/* Report Header */}
                    <div className="text-center mb-10 pb-6 border-b-4 border-gray-800">
                      <h1 className="text-4xl font-bold text-gray-900 mb-3">{process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'}</h1>
                      <h2 className="text-2xl font-semibold text-gray-700 mb-3">Financial Report</h2>
                      <div className="flex items-center justify-center space-x-2 text-gray-600 mb-2">
                        <CalendarIcon className="h-6 w-6" />
                        <p className="text-xl font-medium">{getDateLabel()}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        Period: {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                      </p>
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* Total Revenue */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-3 bg-green-600 rounded-lg shadow-md">
                            <CurrencyDollarIcon className="h-7 w-7 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-green-900">Total Revenue</h3>
                        </div>
                        <p className="text-4xl font-bold text-green-700 mb-2">{formatCurrency(totalRevenue)}</p>
                        <p className="text-sm text-green-800">Income from completed and paid jobs</p>
                      </div>

                      {/* Total Expenses */}
                      <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="p-3 bg-red-600 rounded-lg shadow-md">
                            <BanknotesIcon className="h-7 w-7 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-red-900">Total Expenses</h3>
                        </div>
                        <p className="text-4xl font-bold text-red-700 mb-3">{formatCurrency(totalExpenses)}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-white bg-opacity-60 rounded-lg p-2">
                            <p className="text-gray-600 text-xs">Operating</p>
                            <p className="text-base font-semibold text-red-800">
                              {formatCurrency(dashboardStats?.expenses?.operating_expenses || 0)}
                            </p>
                          </div>
                          <div className="bg-white bg-opacity-60 rounded-lg p-2">
                            <p className="text-gray-600 text-xs">Administrative</p>
                            <p className="text-base font-semibold text-red-800">
                              {formatCurrency(dashboardStats?.expenses?.administrative_expenses || 0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Net Revenue */}
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-6 shadow-sm">
                        <h3 className="text-xl font-bold text-purple-900 mb-3">Net Revenue</h3>
                        <p className="text-4xl font-bold text-purple-700 mb-2">{formatCurrency(netRevenue)}</p>
                        <p className="text-sm text-purple-800 mb-2">Revenue after deducting expenses</p>
                        <div className="text-xs text-gray-600 bg-white bg-opacity-60 rounded-lg p-2">
                          = Revenue ({formatCurrency(totalRevenue)}) - Expenses ({formatCurrency(totalExpenses)})
                        </div>
                      </div>

                      {/* Net Profit */}
                      <div className={`border-2 rounded-xl p-6 shadow-sm ${
                        netProfit >= 0
                          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300'
                          : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300'
                      }`}>
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`p-3 rounded-lg shadow-md ${netProfit >= 0 ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                            {netProfit >= 0 ? (
                              <ArrowTrendingUpIcon className="h-7 w-7 text-white" />
                            ) : (
                              <ArrowTrendingDownIcon className="h-7 w-7 text-white" />
                            )}
                          </div>
                          <h3 className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-900' : 'text-orange-900'}`}>
                            Net Profit
                          </h3>
                        </div>
                        <p className={`text-4xl font-bold mb-2 ${netProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                          {formatCurrency(netProfit)}
                        </p>
                        <p className={`text-sm mb-2 ${netProfit >= 0 ? 'text-emerald-800' : 'text-orange-800'}`}>
                          Net revenue after employee compensation
                        </p>
                        <div className="text-xs text-gray-600 bg-white bg-opacity-60 rounded-lg p-2">
                          = Net Revenue ({formatCurrency(netRevenue)}) - Employee Compensation ({formatCurrency(totalEmployeeCompensation)})
                        </div>
                      </div>
                    </div>

                    {/* Employee Compensation Details */}
                    <div className="mb-8">
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                            <UserGroupIcon className="h-6 w-6 mr-2 text-blue-600" />
                            Employee Compensation Breakdown
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">Commissions Paid</p>
                                <div className="p-2 bg-blue-600 rounded">
                                  <UserGroupIcon className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <p className="text-3xl font-bold text-blue-700 mb-1">{formatCurrency(totalCommissions)}</p>
                              <p className="text-xs text-gray-600">{filteredCommissions.length} payment(s)</p>
                            </div>

                            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">Tips Paid</p>
                                <div className="p-2 bg-teal-600 rounded">
                                  <HandRaisedIcon className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <p className="text-3xl font-bold text-teal-700 mb-1">{formatCurrency(totalTips)}</p>
                              <p className="text-xs text-gray-600">{filteredTips.length} payment(s)</p>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">Advances Given</p>
                                <div className="p-2 bg-indigo-600 rounded">
                                  <CurrencyDollarIcon className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <p className="text-3xl font-bold text-indigo-700 mb-1">{formatCurrency(totalAdvances)}</p>
                              <p className="text-xs text-gray-600">{filteredAdvances.length} advance(s)</p>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t-2 border-gray-200">
                            <div className="flex items-center justify-between">
                              <p className="text-base font-semibold text-gray-800">Total Employee Compensation</p>
                              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalEmployeeCompensation)}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Commissions + Tips (Advances shown for reference only)</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Summary Table */}
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Financial Summary Statement</h3>
                      <div className="overflow-hidden rounded-lg border-2 border-gray-300 shadow-sm">
                        <table className="w-full">
                          <thead className="bg-gray-800 text-white">
                            <tr>
                              <th className="px-6 py-4 text-left font-semibold text-base">Description</th>
                              <th className="px-6 py-4 text-right font-semibold text-base">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr className="bg-green-50">
                              <td className="px-6 py-3 font-semibold text-gray-900">Total Revenue</td>
                              <td className="px-6 py-3 text-right font-bold text-green-700 text-lg">
                                {formatCurrency(totalRevenue)}
                              </td>
                            </tr>
                            <tr className="bg-red-50">
                              <td className="px-6 py-3 pl-12 text-gray-800">Less: Total Expenses</td>
                              <td className="px-6 py-3 text-right text-red-700 font-semibold">
                                ({formatCurrency(totalExpenses)})
                              </td>
                            </tr>
                            <tr className="bg-purple-100 font-semibold">
                              <td className="px-6 py-3 font-bold text-gray-900">Net Revenue</td>
                              <td className="px-6 py-3 text-right font-bold text-purple-700 text-lg">
                                {formatCurrency(netRevenue)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-6 py-3 pl-12 text-gray-800">Less: Commissions Paid</td>
                              <td className="px-6 py-3 text-right font-semibold text-gray-700">
                                ({formatCurrency(totalCommissions)})
                              </td>
                            </tr>
                            <tr>
                              <td className="px-6 py-3 pl-12 text-gray-800">Less: Tips Paid</td>
                              <td className="px-6 py-3 text-right font-semibold text-gray-700">
                                ({formatCurrency(totalTips)})
                              </td>
                            </tr>
                            <tr className={`font-bold ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                              <td className="px-6 py-4 text-lg font-bold text-gray-900">NET PROFIT</td>
                              <td className={`px-6 py-4 text-right font-bold text-xl ${
                                netProfit >= 0 ? 'text-emerald-700' : 'text-orange-700'
                              }`}>
                                {formatCurrency(netProfit)}
                              </td>
                            </tr>
                            <tr className="bg-gray-50 border-t-2 border-gray-300">
                              <td className="px-6 py-3 text-sm text-gray-600 italic">Advances Given (for reference)</td>
                              <td className="px-6 py-3 text-right text-sm text-gray-600">
                                {formatCurrency(totalAdvances)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-10 pt-6 border-t-4 border-gray-800 text-center">
                      <p className="text-lg font-bold text-gray-900">{process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'}</p>
                      <p className="text-sm text-gray-600 mt-1">Confidential Financial Report</p>
                      <p className="text-xs text-gray-500 mt-3">This report is generated electronically and is valid without signature</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }

          /* Preserve colors */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide elements with no-print class */
          .no-print {
            display: none !important;
          }

          /* Remove modal styles for print */
          .fixed {
            position: static !important;
          }

          /* Ensure content is visible */
          body {
            background: white !important;
          }
        }
      `}</style>
    </>
  );
}
