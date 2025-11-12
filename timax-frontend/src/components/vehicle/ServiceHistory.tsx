import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import Button from '@/components/ui/Button';

interface ServiceHistoryProps {
  vehicleId: string;
}

interface ServiceRecord {
  job_id: string;
  job_number: string;
  date: string;
  status: string;
  total_amount: number;
  services: string[];
}

const ServiceHistory: React.FC<ServiceHistoryProps> = ({ vehicleId }) => {
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'all' | '6months' | '1year' | '2years'>('1year');

  const { data: historyData, isLoading, error } = useQuery({
    queryKey: ['vehicleServiceHistory', vehicleId],
    queryFn: () => apiClient.getVehicleServiceHistory(vehicleId),
    enabled: !!vehicleId,
  });

  const toggleExpanded = (jobId: string) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'completed':
      case 'paid':
      case 'closed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
      case 'qc':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
      case 'invoiced':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (['completed', 'paid', 'closed'].includes(statusLower)) {
      return <CheckCircleIcon className="h-4 w-4" />;
    } else if (['cancelled'].includes(statusLower)) {
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
    return null;
  };

  const filterRecordsByTime = (records: ServiceRecord[]) => {
    if (selectedTimeFilter === 'all') return records;

    const now = new Date();
    const filterDate = new Date();

    switch (selectedTimeFilter) {
      case '6months':
        filterDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2years':
        filterDate.setFullYear(now.getFullYear() - 2);
        break;
    }

    return records.filter(record => new Date(record.date) >= filterDate);
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Service History</h3>
          <p className="mt-1 text-sm text-gray-500">Unable to fetch service history at this time.</p>
        </CardContent>
      </Card>
    );
  }

  if (!historyData || !historyData.service_history || historyData.service_history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClockIcon className="h-5 w-5 mr-2" />
            Service History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Service History</h3>
            <p className="mt-1 text-sm text-gray-500">This vehicle has no recorded service history yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredRecords = filterRecordsByTime(historyData.service_history);
  const averageServiceCost = filteredRecords.length > 0
    ? filteredRecords.reduce((sum, record) => sum + record.total_amount, 0) / filteredRecords.length
    : 0;

  // Calculate service frequency (average days between services)
  let averageDaysBetweenServices = 0;
  if (filteredRecords.length > 1) {
    const sortedRecords = [...filteredRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const daysDiffs = [];
    for (let i = 1; i < sortedRecords.length; i++) {
      const diff = (new Date(sortedRecords[i].date).getTime() - new Date(sortedRecords[i-1].date).getTime()) / (1000 * 60 * 60 * 24);
      daysDiffs.push(diff);
    }
    averageDaysBetweenServices = daysDiffs.reduce((sum, diff) => sum + diff, 0) / daysDiffs.length;
  }

  // Calculate cost trend
  let costTrend = 'stable';
  if (filteredRecords.length >= 3) {
    const recentAvg = filteredRecords.slice(0, 3).reduce((sum, r) => sum + r.total_amount, 0) / 3;
    const olderAvg = filteredRecords.slice(-3).reduce((sum, r) => sum + r.total_amount, 0) / 3;
    if (recentAvg > olderAvg * 1.15) costTrend = 'increasing';
    else if (recentAvg < olderAvg * 0.85) costTrend = 'decreasing';
  }

  return (
    <div className="space-y-6">
      {/* Service History Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Service Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={selectedTimeFilter}
                onChange={(e) => setSelectedTimeFilter(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last Year</option>
                <option value="2years">Last 2 Years</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Records in Selected Period</h3>
              <p className="mt-1 text-sm text-gray-500">Try selecting a longer time period.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {/* Service Records */}
              <div className="space-y-6">
                {filteredRecords.map((record, index) => (
                  <div key={record.job_id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute left-8 w-3 h-3 bg-white border-4 border-blue-500 rounded-full -translate-x-1/2"></div>

                    {/* Record Card */}
                    <div className="ml-16 group">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => toggleExpanded(record.job_id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  Job #{record.job_number}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                                  {getStatusIcon(record.status)}
                                  {record.status.replace('_', ' ')}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <CalendarDaysIcon className="h-4 w-4 mr-1" />
                                  {formatDate(record.date)}
                                </div>
                                <div className="flex items-center">
                                  <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                  {formatCurrency(record.total_amount)}
                                </div>
                                <div className="flex items-center">
                                  <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
                                  {record.services.length} service{record.services.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link href={`/jobs/${record.job_id}`}>
                                <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                                  View Details
                                </Button>
                              </Link>
                              <button className="p-1 text-gray-400 hover:text-gray-600">
                                {expandedRecords.has(record.job_id) ? (
                                  <ChevronDownIcon className="h-5 w-5" />
                                ) : (
                                  <ChevronRightIcon className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {expandedRecords.has(record.job_id) && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700">Services Performed:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {record.services.map((service, serviceIndex) => (
                                    <span
                                      key={serviceIndex}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                                    >
                                      {service}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Most Common Services */}
      {filteredRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
              Most Common Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const serviceCounts = new Map<string, number>();
                filteredRecords.forEach(record => {
                  record.services.forEach(service => {
                    serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1);
                  });
                });

                const sortedServices = Array.from(serviceCounts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5);

                const maxCount = sortedServices[0]?.[1] || 1;

                return sortedServices.map(([service, count]) => (
                  <div key={service} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{service}</span>
                        <span className="text-sm text-gray-500">{count} time{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceHistory;