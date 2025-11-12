import React, { useState } from 'react';
import jsPDF from 'jspdf';
import {
  DocumentArrowDownIcon,
  ShareIcon,
  CheckCircleIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { Receipt, Job } from '@/lib/api';

interface ReceiptPDFProps {
  receipt: Receipt;
  job: Job;
  isOpen: boolean;
  onClose: () => void;
}

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ receipt, job, isOpen, onClose }) => {
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

      // Add dotted border for receipt style
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.rect(15, 15, 180, 267);
      pdf.setLineDashPattern([], 0); // Reset line dash

      // Set fonts and colors for receipt styling
      const primaryColor = [0, 0, 0]; // Black for receipt style
      const textColor = [0, 0, 0]; // Black text
      const grayColor = [60, 60, 60]; // Dark gray

      // Use monospace font for authentic receipt look
      const receiptFont = 'courier';

      // Add company header with receipt styling
      pdf.setFontSize(16);
      pdf.setTextColor(...primaryColor);
      pdf.setFont(receiptFont, 'bold');
      pdf.text((process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide').toUpperCase(), 105, 20, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setTextColor(...grayColor);
      pdf.setFont(receiptFont, 'normal');
      pdf.text(process.env.NEXT_PUBLIC_COMPANY_TAGLINE || 'Professional Automotive Services', 105, 26, { align: 'center' });

      // Add receipt title
      pdf.setFontSize(14);
      pdf.setTextColor(...textColor);
      pdf.setFont(receiptFont, 'bold');
      pdf.text('PAYMENT RECEIPT', 105, 40, { align: 'center' });

      // Receipt separator line
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(20, 45, 190, 45);
      pdf.setLineDashPattern([], 0);

      pdf.setFontSize(11);
      pdf.setTextColor(...primaryColor);
      pdf.setFont(receiptFont, 'bold');
      pdf.text('Receipt #: ', 20, 55);
      pdf.setFont(receiptFont, 'normal');
      pdf.setTextColor(...textColor);
      pdf.text(receipt.receipt_number, 45, 55);

      pdf.setFont(receiptFont, 'bold');
      pdf.setTextColor(...primaryColor);
      pdf.text('Date: ', 120, 55);
      pdf.setFont(receiptFont, 'normal');
      pdf.setTextColor(...textColor);
      pdf.text(formatDate(receipt.issued_at), 135, 55);

      // Customer Information Section
      pdf.setFillColor(245, 245, 245);
      pdf.rect(20, 65, 170, 8, 'F');
      pdf.setFontSize(12);
      pdf.setFont(receiptFont, 'bold');
      pdf.setTextColor(...textColor);
      pdf.text('CUSTOMER INFORMATION', 22, 70);

      pdf.setFontSize(11);
      pdf.setFont(receiptFont, 'normal');

      let yPos = 80;
      pdf.text('Customer Name:', 25, yPos);
      pdf.setFont(receiptFont, 'bold');
      pdf.text(job.customer_name || 'Walk-in Customer', 65, yPos);

      if (job.customer_phone) {
        yPos += 7;
        pdf.setFont(receiptFont, 'normal');
        pdf.text('Phone:', 25, yPos);
        pdf.setFont(receiptFont, 'bold');
        pdf.text(job.customer_phone, 65, yPos);
      }

      // Vehicle Information Section
      yPos += 15;
      pdf.setFillColor(245, 245, 245);
      pdf.rect(20, yPos - 5, 170, 8, 'F');
      pdf.setFontSize(12);
      pdf.setFont(receiptFont, 'bold');
      pdf.text('VEHICLE INFORMATION', 22, yPos);

      yPos += 10;
      pdf.setFontSize(11);
      pdf.setFont(receiptFont, 'normal');
      pdf.text('Vehicle:', 25, yPos);
      pdf.setFont(receiptFont, 'bold');
      pdf.text(job.vehicle_display || 'Unregistered Vehicle', 65, yPos);

      yPos += 7;
      pdf.setFont(receiptFont, 'normal');
      pdf.text('Job Number:', 25, yPos);
      pdf.setFont(receiptFont, 'bold');
      pdf.text(`#${job.job_number}`, 65, yPos);

      // Payment Details Section
      yPos += 15;
      pdf.setFillColor(245, 245, 245);
      pdf.rect(20, yPos - 5, 170, 8, 'F');
      pdf.setFontSize(12);
      pdf.setFont(receiptFont, 'bold');
      pdf.text('PAYMENT DETAILS', 22, yPos);

      yPos += 10;
      pdf.setFontSize(11);

      // Services table
      if (job.lines && job.lines.length > 0) {
        // Table header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(25, yPos, 160, 8, 'F');
        pdf.setFont(receiptFont, 'bold');
        pdf.setTextColor(...grayColor);
        pdf.text('Service/Part', 27, yPos + 5);
        pdf.text('Qty', 110, yPos + 5);
        pdf.text('Unit Price', 130, yPos + 5);
        pdf.text('Total', 165, yPos + 5);

        yPos += 10;
        pdf.setFont(receiptFont, 'normal');
        pdf.setTextColor(...textColor);

        // Table rows
        job.lines.forEach((line) => {
          pdf.text(line.service_name.substring(0, 40), 27, yPos);
          pdf.text(line.quantity.toString(), 110, yPos);
          pdf.text(formatCurrency(parseFloat(line.unit_price)), 130, yPos);
          pdf.setFont(receiptFont, 'bold');
          pdf.text(formatCurrency(parseFloat(line.total_amount)), 165, yPos);
          pdf.setFont(receiptFont, 'normal');

          yPos += 6;
          pdf.setFontSize(9);
          pdf.setTextColor(...grayColor);
          pdf.text(line.part_name.substring(0, 50), 27, yPos);
          pdf.setFontSize(11);
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
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineDashPattern([2, 1], 0);
      pdf.line(25, yPos, 185, yPos);
      pdf.setLineDashPattern([], 0);
      yPos += 8;

      // Subtotal
      pdf.setFont(receiptFont, 'normal');
      pdf.text('Subtotal:', 130, yPos);
      pdf.text(formatCurrency(parseFloat(job.estimate_total) + parseFloat(job.discount_amount || '0')), 165, yPos);

      // Discount
      if (parseFloat(job.discount_amount || '0') > 0) {
        yPos += 7;
        pdf.setTextColor(...[34, 197, 94]); // Green
        pdf.text('Discount:', 130, yPos);
        pdf.text(`-${formatCurrency(parseFloat(job.discount_amount))}`, 165, yPos);
        pdf.setTextColor(...textColor);
      }

      // Tax
      if (parseFloat(job.tax_amount || '0') > 0) {
        yPos += 7;
        pdf.text('Tax:', 130, yPos);
        pdf.text(formatCurrency(parseFloat(job.tax_amount)), 165, yPos);
      }

      // Total
      yPos += 7;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(125, yPos - 2, 185, yPos - 2);
      pdf.setLineDashPattern([], 0);
      yPos += 5;
      pdf.setFont(receiptFont, 'bold');
      pdf.setFontSize(12);
      pdf.text('Total Amount:', 130, yPos);
      pdf.setTextColor(...primaryColor);
      pdf.text(formatCurrency(parseFloat(job.final_total)), 165, yPos);

      // Payment Information
      yPos += 10;
      pdf.setTextColor(...textColor);
      pdf.setFontSize(11);
      pdf.setFont(receiptFont, 'normal');
      pdf.text('Amount Paid:', 130, yPos);
      pdf.setTextColor(...[34, 197, 94]); // Green
      pdf.setFont(receiptFont, 'bold');
      pdf.text(formatCurrency(parseFloat(receipt.amount_paid)), 165, yPos);

      yPos += 7;
      pdf.setTextColor(...textColor);
      pdf.setFont(receiptFont, 'normal');
      pdf.text('Payment Method:', 130, yPos);
      pdf.setFont(receiptFont, 'bold');
      pdf.text(receipt.payment_method.replace('_', ' '), 165, yPos);

      if (receipt.payment_reference) {
        yPos += 7;
        pdf.setFont(receiptFont, 'normal');
        pdf.text('Reference:', 130, yPos);
        pdf.setFont(receiptFont, 'bold');
        pdf.text(receipt.payment_reference, 165, yPos);
      }

      // Balance
      yPos += 7;
      pdf.setFont(receiptFont, 'normal');
      pdf.text('Balance Due:', 130, yPos);
      const balance = parseFloat(job.final_total) - parseFloat(receipt.amount_paid);
      pdf.setFont(receiptFont, 'bold');
      if (balance > 0) {
        pdf.setTextColor(...[220, 38, 38]); // Red
      } else {
        pdf.setTextColor(...[34, 197, 94]); // Green
      }
      pdf.text(formatCurrency(Math.max(0, balance)), 165, yPos);

      // Notes section if exists
      if (receipt.notes) {
        yPos += 15;
        pdf.setFillColor(255, 243, 199); // Amber-50
        pdf.rect(20, yPos - 5, 170, 25, 'F');
        pdf.setTextColor(...textColor);
        pdf.setFont(receiptFont, 'bold');
        pdf.setFontSize(10);
        pdf.text('NOTES:', 22, yPos);
        pdf.setFont(receiptFont, 'normal');
        pdf.setFontSize(9);
        const notes = pdf.splitTextToSize(receipt.notes, 165);
        pdf.text(notes, 22, yPos + 5);
      }

      // Footer
      pdf.setTextColor(...grayColor);
      pdf.setFontSize(9);
      pdf.setFont(receiptFont, 'italic');
      pdf.text('Thank you for your business!', 105, 270, { align: 'center' });
      pdf.text(`Receipt generated on ${formatDateTime(new Date().toISOString())}`, 105, 275, { align: 'center' });
      pdf.text('Issued by: ' + receipt.issued_by_name, 105, 280, { align: 'center' });

      // Add watermark for PAID status
      if (job.status === 'PAID' || job.status === 'CLOSED') {
        pdf.setGState(new pdf.GState({opacity: 0.1})); // Set very low opacity
        pdf.setTextColor(34, 197, 94); // Green color
        pdf.setFontSize(60);
        pdf.setFont(receiptFont, 'bold');
        pdf.text('PAID', 105, 150, {
          align: 'center',
          angle: 45
        });
        pdf.setGState(new pdf.GState({opacity: 1})); // Reset opacity for other content
      }

      return pdf;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    const pdf = await generatePDF();
    pdf.save(`Receipt_${receipt.receipt_number}.pdf`);
  };

  const handleShare = async (method: 'whatsapp' | 'email') => {
    const pdf = await generatePDF();
    const pdfBlob = pdf.output('blob');

    // Create a URL for the blob
    const pdfUrl = URL.createObjectURL(pdfBlob);

    if (method === 'whatsapp') {
      // For WhatsApp, we'll download the file first and let user share manually
      // since direct blob sharing to WhatsApp Web is limited
      pdf.save(`Receipt_${receipt.receipt_number}.pdf`);

      // Open WhatsApp Web with a pre-filled message
      const message = `Receipt #${receipt.receipt_number} for Job #${job.job_number}\nAmount Paid: ${formatCurrency(parseFloat(receipt.amount_paid))}\nPayment Date: ${formatDate(receipt.issued_at)}\n\nPlease find the receipt PDF attached.`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else if (method === 'email') {
      // For email, download the file and open mailto link
      pdf.save(`Receipt_${receipt.receipt_number}.pdf`);

      const subject = `Receipt #${receipt.receipt_number} - ${process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'}`;
      const body = `Dear ${job.customer_name || 'Customer'},\n\nPlease find attached the payment receipt for your recent service.\n\nReceipt Details:\n- Receipt Number: ${receipt.receipt_number}\n- Job Number: ${job.job_number}\n- Amount Paid: ${formatCurrency(parseFloat(receipt.amount_paid))}\n- Payment Date: ${formatDate(receipt.issued_at)}\n- Payment Method: ${receipt.payment_method.replace('_', ' ')}\n\nThank you for your business!\n\nBest regards,\n${process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide'}`;

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
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Payment Receipt</h3>
                <p className="text-sm text-gray-600">Receipt #{receipt.receipt_number}</p>
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

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
            {/* Receipt Header */}
            <div className="text-center pb-6 border-b-2 border-blue-600">
              <h2 className="text-3xl font-bold text-blue-600 mb-2">{(process.env.NEXT_PUBLIC_COMPANY_NAME || 'SaleTide').toUpperCase()}</h2>
              <p className="text-sm text-gray-700 font-medium">{process.env.NEXT_PUBLIC_COMPANY_TAGLINE || 'Professional Automotive Services'}</p>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-gray-900">PAYMENT RECEIPT</h3>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Receipt Number</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{receipt.receipt_number}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Number</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">#{job.job_number}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Date</label>
                  <p className="text-lg font-bold text-gray-900 mt-1">{formatDate(receipt.issued_at)}</p>
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
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Service / Part
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">
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

            {/* Payment Information */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">Payment Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Total Amount:</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(parseFloat(job.final_total))}</span>
                </div>

                {parseFloat(job.discount_amount || '0') > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Discount Applied:</span>
                    <span className="text-lg font-bold text-green-600">-{formatCurrency(parseFloat(job.discount_amount))}</span>
                  </div>
                )}

                {parseFloat(job.tax_amount || '0') > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Tax:</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(parseFloat(job.tax_amount))}</span>
                  </div>
                )}

                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Amount Paid:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(parseFloat(receipt.amount_paid))}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Payment Method:</span>
                  <span className="text-lg font-bold text-gray-900">{receipt.payment_method.replace('_', ' ')}</span>
                </div>

                {receipt.payment_reference && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Reference:</span>
                    <span className="text-lg font-bold text-gray-900">{receipt.payment_reference}</span>
                  </div>
                )}

                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Balance Due:</span>
                    <span className={`text-xl font-bold ${
                      parseFloat(job.final_total) - parseFloat(receipt.amount_paid) > 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}>
                      {formatCurrency(Math.max(0, parseFloat(job.final_total) - parseFloat(receipt.amount_paid)))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {receipt.notes && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
                <h4 className="text-sm font-bold text-amber-800 mb-2 uppercase tracking-wide">Notes</h4>
                <p className="text-sm font-semibold text-amber-900">{receipt.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700">Thank you for your business!</p>
              <p className="text-xs text-gray-600 mt-2">Issued by: {receipt.issued_by_name}</p>
              <p className="text-xs text-gray-600">Receipt generated on {formatDateTime(receipt.issued_at)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Issued by: {receipt.issued_by_name}
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

export default ReceiptPDF;