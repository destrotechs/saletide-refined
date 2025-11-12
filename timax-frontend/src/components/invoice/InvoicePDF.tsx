import React, { useState } from 'react';
import jsPDF from 'jspdf';
import {
  DocumentArrowDownIcon,
  ShareIcon,
  DocumentTextIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { Invoice, Job } from '@/lib/api';

interface InvoicePDFProps {
  invoice: Invoice;
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, job, isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const generatePDF = async (): Promise<jsPDF> => {
    setIsGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Professional styling colors
      const primaryColor = [37, 99, 235]; // Blue-600
      const textColor = [0, 0, 0]; // Black text
      const grayColor = [60, 60, 60]; // Dark gray
      const accentColor = [59, 130, 246]; // Blue-500

      // Add border
      pdf.setDrawColor(37, 99, 235);
      pdf.setLineWidth(0.5);
      pdf.rect(10, 10, 190, 277);

      // Add company header
      pdf.setFontSize(24);
      pdf.setTextColor(...primaryColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide', 105, 25, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setTextColor(...grayColor);
      pdf.setFont('helvetica', 'normal');
      pdf.text(process.env.NEXT_PUBLIC_COMPANY_TAGLINE || 'Professional Automotive Services', 105, 32, { align: 'center' });

      // Add invoice title
      pdf.setFontSize(18);
      pdf.setTextColor(...textColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE', 105, 45, { align: 'center' });

      // Invoice separator line
      pdf.setDrawColor(...accentColor);
      pdf.setLineWidth(0.5);
      pdf.line(20, 50, 190, 50);

      // Invoice details - left side
      pdf.setFontSize(10);
      pdf.setTextColor(...grayColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice Number:', 20, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      pdf.text(invoice.invoice_number, 50, 60);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...grayColor);
      pdf.text('Job Number:', 20, 67);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      pdf.text(`#${job.job_number}`, 50, 67);

      // Invoice details - right side
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...grayColor);
      pdf.text('Issue Date:', 130, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      pdf.text(formatDate(invoice.issue_date), 155, 60);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...grayColor);
      pdf.text('Due Date:', 130, 67);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textColor);
      pdf.text(formatDate(invoice.due_date), 155, 67);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...grayColor);
      pdf.text('Status:', 130, 74);
      pdf.setFont('helvetica', 'bold');

      // Status color coding
      if (invoice.status === 'PAID') {
        pdf.setTextColor(34, 197, 94); // Green
      } else if (invoice.status === 'OVERDUE') {
        pdf.setTextColor(220, 38, 38); // Red
      } else if (invoice.status === 'SENT') {
        pdf.setTextColor(59, 130, 246); // Blue
      } else {
        pdf.setTextColor(...grayColor);
      }
      pdf.text(invoice.status, 155, 74);
      pdf.setTextColor(...textColor);

      // Customer Information Section
      let yPos = 85;
      pdf.setFillColor(245, 247, 250);
      pdf.rect(20, yPos, 80, 8, 'F');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...primaryColor);
      pdf.text('BILL TO', 22, yPos + 5);

      yPos += 12;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...textColor);
      pdf.text(job.customer_name || 'Walk-in Customer', 22, yPos);

      if (job.customer_phone) {
        yPos += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...grayColor);
        pdf.text(`Phone: ${job.customer_phone}`, 22, yPos);
      }

      // Vehicle Information
      yPos += 10;
      pdf.setFillColor(245, 247, 250);
      pdf.rect(20, yPos, 80, 8, 'F');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...primaryColor);
      pdf.text('VEHICLE', 22, yPos + 5);

      yPos += 12;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...textColor);
      pdf.text(job.vehicle_display || 'Unregistered Vehicle', 22, yPos);

      // Services table
      yPos = 140;
      pdf.setFillColor(245, 247, 250);
      pdf.rect(20, yPos, 170, 8, 'F');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...primaryColor);
      pdf.text('SERVICES & PARTS', 22, yPos + 5);

      yPos += 12;

      if (job.lines && job.lines.length > 0) {
        // Table header
        pdf.setFillColor(37, 99, 235);
        pdf.rect(20, yPos, 170, 8, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.text('Description', 22, yPos + 5);
        pdf.text('Qty', 115, yPos + 5);
        pdf.text('Unit Price', 135, yPos + 5);
        pdf.text('Total', 170, yPos + 5);

        yPos += 10;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...textColor);
        pdf.setFontSize(9);

        // Table rows
        job.lines.forEach((line, index) => {
          // Alternating row colors
          if (index % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(20, yPos - 2, 170, 10, 'F');
          }

          pdf.setFont('helvetica', 'bold');
          pdf.text(line.service_name.substring(0, 45), 22, yPos + 2);
          pdf.setFont('helvetica', 'normal');
          pdf.text(line.quantity.toString(), 115, yPos + 2);
          pdf.text(formatCurrency(parseFloat(line.unit_price)), 135, yPos + 2);
          pdf.setFont('helvetica', 'bold');
          pdf.text(formatCurrency(parseFloat(line.total_amount)), 170, yPos + 2);

          yPos += 5;
          pdf.setFontSize(8);
          pdf.setTextColor(...grayColor);
          pdf.setFont('helvetica', 'italic');
          pdf.text(line.part_name.substring(0, 50), 22, yPos);
          pdf.setFontSize(9);
          pdf.setTextColor(...textColor);
          yPos += 8;

          // Add page break if needed
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
        });
      }

      // Financial Summary
      yPos += 5;
      pdf.setDrawColor(...accentColor);
      pdf.setLineWidth(0.3);
      pdf.line(120, yPos, 190, yPos);
      yPos += 8;

      pdf.setFontSize(10);

      // Subtotal
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...grayColor);
      pdf.text('Subtotal:', 135, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...textColor);
      pdf.text(formatCurrency(parseFloat(invoice.subtotal)), 170, yPos);

      // Discount
      if (parseFloat(invoice.discount_amount || '0') > 0) {
        yPos += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...grayColor);
        pdf.text('Discount:', 135, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(34, 197, 94); // Green
        pdf.text(`-${formatCurrency(parseFloat(invoice.discount_amount))}`, 170, yPos);
        pdf.setTextColor(...textColor);
      }

      // Tax
      if (parseFloat(invoice.tax_amount || '0') > 0) {
        yPos += 6;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...grayColor);
        pdf.text('Tax:', 135, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...textColor);
        pdf.text(formatCurrency(parseFloat(invoice.tax_amount)), 170, yPos);
      }

      // Total
      yPos += 6;
      pdf.setDrawColor(...accentColor);
      pdf.setLineWidth(0.5);
      pdf.line(120, yPos - 2, 190, yPos - 2);
      yPos += 5;

      pdf.setFillColor(37, 99, 235);
      pdf.rect(120, yPos - 5, 70, 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TOTAL AMOUNT:', 135, yPos + 2);
      pdf.text(formatCurrency(parseFloat(invoice.total_amount)), 170, yPos + 2);

      // Payment Status
      yPos += 15;
      pdf.setTextColor(...textColor);
      pdf.setFontSize(10);

      if (invoice.status === 'PAID') {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(34, 197, 94);
        pdf.text('PAID IN FULL', 135, yPos);
      } else {
        const balance = parseFloat(invoice.total_amount) - parseFloat(job.payments_total?.toString() || '0');
        if (balance > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...grayColor);
          pdf.text('Amount Due:', 135, yPos);
          pdf.setTextColor(220, 38, 38);
          pdf.text(formatCurrency(balance), 170, yPos);
        }
      }

      // Notes section if exists
      if (invoice.notes) {
        yPos += 15;
        pdf.setFillColor(254, 249, 195); // Yellow-100
        pdf.rect(20, yPos - 5, 170, 25, 'F');
        pdf.setTextColor(...textColor);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('NOTES:', 22, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const notes = pdf.splitTextToSize(invoice.notes, 165);
        pdf.text(notes, 22, yPos + 5);
      }

      // Terms and conditions
      if (invoice.terms_and_conditions) {
        yPos += 35;
        pdf.setFillColor(243, 244, 246); // Gray-100
        pdf.rect(20, yPos - 5, 170, 25, 'F');
        pdf.setTextColor(...textColor);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text('TERMS & CONDITIONS:', 22, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        const terms = pdf.splitTextToSize(invoice.terms_and_conditions, 165);
        pdf.text(terms, 22, yPos + 5);
      }

      // Footer
      pdf.setTextColor(...grayColor);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Thank you for your business!', 105, 270, { align: 'center' });
      pdf.text(`Invoice generated on ${formatDateTime(new Date().toISOString())}`, 105, 275, { align: 'center' });
      pdf.text('Issued by: ' + invoice.created_by_name, 105, 280, { align: 'center' });

      // Add watermark for PAID status
      if (invoice.status === 'PAID') {
        pdf.setGState(new pdf.GState({opacity: 0.1}));
        pdf.setTextColor(34, 197, 94); // Green color
        pdf.setFontSize(60);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PAID', 105, 150, {
          align: 'center',
          angle: 45
        });
        pdf.setGState(new pdf.GState({opacity: 1}));
      } else if (invoice.status === 'OVERDUE') {
        pdf.setGState(new pdf.GState({opacity: 0.1}));
        pdf.setTextColor(220, 38, 38); // Red color
        pdf.setFontSize(60);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OVERDUE', 105, 150, {
          align: 'center',
          angle: 45
        });
        pdf.setGState(new pdf.GState({opacity: 1}));
      }

      return pdf;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const pdf = await generatePDF();
    pdf.save(`Invoice_${invoice.invoice_number}.pdf`);
  };

  const handleShare = async (method: 'whatsapp' | 'email') => {
    const pdf = await generatePDF();
    const pdfBlob = pdf.output('blob');

    // Create a URL for the blob
    const pdfUrl = URL.createObjectURL(pdfBlob);

    if (method === 'whatsapp') {
      // For WhatsApp, we'll download the file first and let user share manually
      pdf.save(`Invoice_${invoice.invoice_number}.pdf`);

      // Open WhatsApp Web with a pre-filled message
      const message = `Invoice #${invoice.invoice_number} for Job #${job.job_number}\nTotal Amount: ${formatCurrency(parseFloat(invoice.total_amount))}\nDue Date: ${formatDate(invoice.due_date)}\n\nPlease find the invoice PDF attached.`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else if (method === 'email') {
      // For email, download the file and open mailto link
      pdf.save(`Invoice_${invoice.invoice_number}.pdf`);

      const subject = `Invoice #${invoice.invoice_number} - ${process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'}`;
      const body = `Dear ${job.customer_name || 'Customer'},\n\nPlease find attached the invoice for your recent service.\n\nInvoice Details:\n- Invoice Number: ${invoice.invoice_number}\n- Job Number: ${job.job_number}\n- Total Amount: ${formatCurrency(parseFloat(invoice.total_amount))}\n- Issue Date: ${formatDate(invoice.issue_date)}\n- Due Date: ${formatDate(invoice.due_date)}\n- Status: ${invoice.status}\n\nPlease make payment by the due date to avoid any late fees.\n\nThank you for your business!\n\nBest regards,\n${process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'}`;

      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl);
    }

    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    setShowShareOptions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Invoice</h3>
                <p className="text-sm text-gray-600">Invoice #{invoice.invoice_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border-2 border-blue-200 rounded-lg shadow-sm p-6 space-y-6">
            {/* Invoice Header */}
            <div className="text-center pb-6 border-b-2 border-blue-600">
              <h2 className="text-3xl font-bold text-blue-600 mb-2">{process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'}</h2>
              <p className="text-sm text-gray-700 font-medium">{process.env.NEXT_PUBLIC_COMPANY_TAGLINE || 'Professional Automotive Services'}</p>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-gray-900">INVOICE</h3>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Invoice Number</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{invoice.invoice_number}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Number</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">#{job.job_number}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status</label>
                  <p className={`text-lg font-bold mt-1 ${
                    invoice.status === 'PAID' ? 'text-green-600' :
                    invoice.status === 'OVERDUE' ? 'text-red-600' :
                    invoice.status === 'SENT' ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>{invoice.status}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Issue Date</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatDate(invoice.issue_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Due Date</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatDate(invoice.due_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Customer</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{job.customer_name || 'Walk-in Customer'}</p>
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            {job.vehicle_display && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Vehicle Information</h4>
                <p className="text-lg font-bold text-gray-900">{job.vehicle_display}</p>
              </div>
            )}

            {/* Services Table */}
            {job.lines && job.lines.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Services & Parts</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Service / Part
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {job.lines.slice(0, 5).map((line) => (
                        <tr key={line.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="text-sm font-bold text-gray-900">{line.service_name}</div>
                            <div className="text-xs text-gray-600 mt-1">{line.part_name}</div>
                          </td>
                          <td className="px-4 py-4 text-center text-sm font-semibold text-gray-900">
                            {line.quantity}
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">
                            {formatCurrency(parseFloat(line.unit_price))}
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">
                            {formatCurrency(parseFloat(line.total_amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Invoice Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">Invoice Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(parseFloat(invoice.subtotal))}</span>
                </div>

                {parseFloat(invoice.discount_amount || '0') > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Discount Applied:</span>
                    <span className="text-lg font-bold text-green-600">-{formatCurrency(parseFloat(invoice.discount_amount))}</span>
                  </div>
                )}

                {parseFloat(invoice.tax_amount || '0') > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Tax:</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(parseFloat(invoice.tax_amount))}</span>
                  </div>
                )}

                <div className="border-t-2 border-blue-600 pt-3">
                  <div className="flex justify-between items-center bg-blue-600 text-white p-3 rounded-lg">
                    <span className="text-sm font-bold uppercase">Total Amount:</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(parseFloat(invoice.total_amount))}
                    </span>
                  </div>
                </div>

                {invoice.status === 'PAID' ? (
                  <div className="flex justify-center items-center mt-4">
                    <span className="text-xl font-bold text-green-600">PAID IN FULL</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm font-semibold text-gray-700">Amount Due:</span>
                    <span className="text-xl font-bold text-red-600">
                      {formatCurrency(Math.max(0, parseFloat(invoice.total_amount) - parseFloat(job.payments_total?.toString() || '0')))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <h4 className="text-sm font-bold text-yellow-800 mb-2 uppercase tracking-wide">Notes</h4>
                <p className="text-sm font-semibold text-yellow-900">{invoice.notes}</p>
              </div>
            )}

            {invoice.terms_and_conditions && (
              <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                <h4 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">Terms & Conditions</h4>
                <p className="text-xs text-gray-700">{invoice.terms_and_conditions}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700">Thank you for your business!</p>
              <p className="text-xs text-gray-600 mt-2">Issued by: {invoice.created_by_name}</p>
              <p className="text-xs text-gray-600">Invoice generated on {formatDateTime(invoice.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Issued by: {invoice.created_by_name}
            </div>
            <div className="flex space-x-3">
              {!showShareOptions ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="flex items-center"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    onClick={() => setShowShareOptions(true)}
                    disabled={isGenerating}
                    className="flex items-center"
                  >
                    <ShareIcon className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowShareOptions(false)}
                    className="flex items-center"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleShare('whatsapp')}
                    disabled={isGenerating}
                    className="flex items-center bg-green-600 hover:bg-green-700"
                  >
                    <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={() => handleShare('email')}
                    disabled={isGenerating}
                    className="flex items-center"
                  >
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePDF;
