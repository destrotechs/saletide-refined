import React, { useRef, useState } from 'react';
import {
  PrinterIcon,
  DocumentTextIcon,
  UserIcon,
  TruckIcon,
  CalendarIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  HashtagIcon,
  CheckCircleIcon,
  BanknotesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import type { Job } from '@/lib/api';

interface JobCardProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintConfirmation, setShowPrintConfirmation] = useState(false);

  const handlePrintConfirm = () => {
    setShowPrintConfirmation(true);
  };

  const handlePrint = () => {
    setShowPrintConfirmation(false);
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #111827;
          line-height: 1.5;
          background: white;
        }

        .job-card {
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
        }

        .header {
          border-bottom: 3px solid #1e40af;
          padding-bottom: 15px;
          margin-bottom: 25px;
        }

        .company-info {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 15px;
        }

        .company-name {
          font-size: 28px;
          font-weight: 700;
          color: #1e40af;
          letter-spacing: -0.5px;
        }

        .job-number-box {
          text-align: right;
        }

        .job-number-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          font-weight: 600;
        }

        .job-number {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-top: 2px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 8px;
        }

        .section {
          margin-bottom: 25px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .info-item {
          display: flex;
          align-items: start;
          gap: 10px;
        }

        .info-icon {
          width: 18px;
          height: 18px;
          color: #6b7280;
          margin-top: 1px;
          flex-shrink: 0;
        }

        .info-content {
          flex: 1;
        }

        .info-label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 2px;
        }

        .info-value {
          font-size: 14px;
          color: #111827;
          font-weight: 500;
        }

        .services-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }

        .services-table thead {
          background: #f9fafb;
        }

        .services-table th {
          padding: 10px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          border-bottom: 2px solid #e5e7eb;
        }

        .services-table td {
          padding: 12px 10px;
          font-size: 13px;
          border-bottom: 1px solid #e5e7eb;
        }

        .service-name {
          font-weight: 500;
          color: #111827;
        }

        .service-part {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }

        .financial-summary {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }

        .financial-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .financial-item:not(:last-child) {
          border-bottom: 1px solid #e5e7eb;
        }

        .financial-label {
          font-size: 13px;
          color: #6b7280;
        }

        .financial-value {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .total-row {
          margin-top: 8px;
          padding-top: 12px;
          border-top: 2px solid #d1d5db;
        }

        .total-row .financial-label {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .total-row .financial-value {
          font-size: 18px;
          font-weight: 700;
          color: #1e40af;
        }

        .notes-section {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          border-radius: 4px;
          margin-top: 20px;
        }

        .notes-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #92400e;
          margin-bottom: 8px;
        }

        .notes-content {
          font-size: 13px;
          color: #78350f;
          line-height: 1.6;
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-text {
          font-size: 11px;
          color: #6b7280;
        }

        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 40px;
        }

        .signature-block {
          padding-top: 60px;
          border-top: 2px solid #d1d5db;
        }

        .signature-label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .signature-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        @media print {
          body { margin: 0; }
          .job-card { padding: 10mm; }
        }

        .status-draft { background: #f3f4f6; color: #374151; }
        .status-scheduled { background: #fef3c7; color: #92400e; }
        .status-in_progress { background: #dbeafe; color: #1e40af; }
        .status-qc { background: #e9d5ff; color: #6b21a8; }
        .status-completed { background: #d1fae5; color: #065f46; }
        .status-invoiced { background: #e0e7ff; color: #3730a3; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-closed { background: #f3f4f6; color: #374151; }
      </style>
    `;

    const getStatusClass = (status: string) => {
      return `status-${status.toLowerCase()}`;
    };

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job #${job.job_number}</title>
          ${styles}
        </head>
        <body>
          <div class="job-card">
            <div class="header">
              <div class="company-info">
                <div>
                  <div class="company-name">TIMAX AUTO SERVICE</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                    Professional Automotive Services
                  </div>
                </div>
                <div class="job-number-box">
                  <div class="job-number-label">Job Order</div>
                  <div class="job-number">#${job.job_number}</div>
                  <div class="status-badge ${getStatusClass(job.status)}">
                    ${job.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Customer Information</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-content">
                    <div class="info-label">Customer Name</div>
                    <div class="info-value">${job.customer_name || 'N/A'}</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-content">
                    <div class="info-label">Phone Number</div>
                    <div class="info-value">${job.customer_phone || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Vehicle Information</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-content">
                    <div class="info-label">Vehicle</div>
                    <div class="info-value">${job.vehicle_display || 'N/A'}</div>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-content">
                    <div class="info-label">Service Date</div>
                    <div class="info-value">${formatDate(job.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>

            ${job.lines && job.lines.length > 0 ? `
              <div class="section">
                <div class="section-title">Services & Parts</div>
                <table class="services-table">
                  <thead>
                    <tr>
                      <th style="width: 50%;">Service / Part</th>
                      <th style="width: 15%; text-align: center;">Qty</th>
                      <th style="width: 17%; text-align: right;">Unit Price</th>
                      <th style="width: 18%; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${job.lines.map(line => `
                      <tr>
                        <td>
                          <div class="service-name">${line.service_name}</div>
                          <div class="service-part">${line.part_name}</div>
                        </td>
                        <td style="text-align: center;">${line.quantity}</td>
                        <td style="text-align: right;">${formatCurrency(parseFloat(line.unit_price))}</td>
                        <td style="text-align: right; font-weight: 600;">
                          ${formatCurrency(parseFloat(line.total_amount))}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <div class="financial-summary">
              <div class="financial-item">
                <div class="financial-label">Subtotal</div>
                <div class="financial-value">
                  ${formatCurrency(parseFloat(job.estimate_total) + parseFloat(job.discount_amount || '0'))}
                </div>
              </div>
              ${parseFloat(job.discount_amount || '0') > 0 ? `
                <div class="financial-item">
                  <div class="financial-label">Discount</div>
                  <div class="financial-value" style="color: #059669;">
                    -${formatCurrency(parseFloat(job.discount_amount))}
                  </div>
                </div>
              ` : ''}
              ${parseFloat(job.tax_amount || '0') > 0 ? `
                <div class="financial-item">
                  <div class="financial-label">Tax</div>
                  <div class="financial-value">
                    ${formatCurrency(parseFloat(job.tax_amount))}
                  </div>
                </div>
              ` : ''}
              <div class="financial-item total-row">
                <div class="financial-label">Total Amount</div>
                <div class="financial-value">
                  ${formatCurrency(parseFloat(job.final_total))}
                </div>
              </div>
              ${job.payments_total > 0 ? `
                <div class="financial-item">
                  <div class="financial-label">Amount Paid</div>
                  <div class="financial-value" style="color: #059669;">
                    ${formatCurrency(job.payments_total)}
                  </div>
                </div>
                <div class="financial-item">
                  <div class="financial-label">Balance Due</div>
                  <div class="financial-value" style="color: ${job.balance_due > 0 ? '#dc2626' : '#059669'};">
                    ${formatCurrency(job.balance_due)}
                  </div>
                </div>
              ` : ''}
            </div>

            ${job.notes ? `
              <div class="notes-section">
                <div class="notes-title">Service Notes</div>
                <div class="notes-content">${job.notes}</div>
              </div>
            ` : ''}

            <div class="signature-section">
              <div class="signature-block">
                <div class="signature-label">Customer Signature</div>
                <div class="signature-name">${job.customer_name || ''}</div>
              </div>
              <div class="signature-block">
                <div class="signature-label">Service Advisor</div>
                <div class="signature-name">${job.created_by_name || ''}</div>
              </div>
            </div>

            <div class="footer">
              <div class="footer-text">
                Job Order #${job.job_number} • Created ${formatDateTime(job.created_at)}
              </div>
              <div class="footer-text">
                Page 1 of 1
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'SCHEDULED':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'QC':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'INVOICED':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'PAID':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'CLOSED':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-xl">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2" />
            Job Order Card Preview
          </h3>
          <div className="flex items-center space-x-3">
            <Button onClick={handlePrintConfirm} className="flex items-center space-x-2">
              <PrinterIcon className="h-4 w-4" />
              <span>Print Job Card</span>
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Section */}
        <div className="flex-1 overflow-y-auto p-6" ref={printRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="border-b-2 border-blue-600 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-blue-600">TIMAX AUTO SERVICE</h1>
                <p className="text-sm text-gray-600 mt-1">Professional Automotive Services</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Job Order</p>
                <p className="text-xl font-bold text-gray-900 mt-1">#{job.job_number}</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)} mt-2`}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Customer Information</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium text-gray-900">{job.customer_name || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium text-gray-900">{job.customer_phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Vehicle Information</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <TruckIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="ml-2 font-medium text-gray-900">{job.vehicle_display || 'N/A'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Date:</span>
                  <span className="ml-2 font-medium text-gray-900">{formatDate(job.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Services Table */}
          {job.lines && job.lines.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Services & Parts</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service / Part
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {job.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{line.service_name}</div>
                          <div className="text-xs text-gray-500">{line.part_name}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900">
                          {line.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(parseFloat(line.unit_price))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(parseFloat(line.total_amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(parseFloat(job.estimate_total) + parseFloat(job.discount_amount || '0'))}
                </span>
              </div>
              {parseFloat(job.discount_amount || '0') > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(parseFloat(job.discount_amount))}
                  </span>
                </div>
              )}
              {parseFloat(job.tax_amount || '0') > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(parseFloat(job.tax_amount))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-300">
                <span className="text-gray-900">Total Amount:</span>
                <span className="text-blue-600">{formatCurrency(parseFloat(job.final_total))}</span>
              </div>
              {job.payments_total > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(job.payments_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance Due:</span>
                    <span className={`font-medium ${job.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(job.balance_due)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
              <h3 className="text-xs uppercase tracking-wider text-amber-800 font-semibold mb-2">Service Notes</h3>
              <p className="text-sm text-amber-900">{job.notes}</p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Print Confirmation Dialog */}
      {showPrintConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <PrinterIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Print Job Card?
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              This will open a print dialog for Job #{job.job_number}. Make sure your printer is connected and ready.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPrintConfirmation(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCard;