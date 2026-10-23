import { useState, useEffect } from 'react';
import { Search, Download, Calendar, FileText, Users, X, Eye } from 'lucide-react';
import { getPaystubs, getPaystubById } from '../../../../axios/api/account.payroll';
import jsPDF from 'jspdf';
import DocLogo from '../../../../assets/doclogo.png';

interface Paystub {
  _id: string;
  payrollId: string;
  userId: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
    internalId?: string;
    companyFlag?: boolean;
    details?: {
      companyFlag?: boolean;
    };
  };
  employeeName: string;
  employeeId?: string;
  employeeEmail?: string;
  employeeRole?: string;
  workType?: 'Employee' | 'Driver' | 'Owner-Operator';
  payPeriod: {
    startDate: string;
    endDate: string;
    payDate: string;
  };
  paystubId?: string;
  summary: {
    grossPay: number;
    totalDeductions: number;
    totalTaxes: number;
    netPay: number;
  };
  status: 'draft' | 'issued' | 'void';
  createdAt: string;
  companyDetails?: {
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
  };
}

const PaystubsList = () => {
  const [paystubs, setPaystubs] = useState<Paystub[]>([]);
  const [filteredPaystubs, setFilteredPaystubs] = useState<Paystub[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingBulk, setDownloadingBulk] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'employees' | 'drivers' | 'ownerOperators'>('all');
  const [showPaystubModal, setShowPaystubModal] = useState<boolean>(false);
  const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchPaystubs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [paystubs, searchQuery, activeTab]);

  const fetchPaystubs = async (dateParams?: { startDate?: string; endDate?: string }) => {
    setLoading(true);
    try {
      const params: any = {};
      // Use dateParams if provided, otherwise use state
      if (dateParams?.startDate || startDate) {
        params.startDate = dateParams?.startDate || startDate;
      }
      if (dateParams?.endDate || endDate) {
        params.endDate = dateParams?.endDate || endDate;
      }
      // Search is handled on frontend for better UX
      // if (searchQuery) params.search = searchQuery;

      const response = await getPaystubs(params);
      if (response?.success) {
        setPaystubs(response.data || []);
      } else {
        setPaystubs([]);
      }
    } catch (error) {
      console.error('Error fetching paystubs:', error);
      setPaystubs([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...paystubs];

    // Apply tab filter (employees/drivers/owner operators)
    if (activeTab === 'employees') {
      filtered = filtered.filter(paystub => {
        const role = paystub.employeeRole?.toLowerCase() || paystub.userId?.role?.toLowerCase() || '';
        const workType = paystub.workType?.toLowerCase() || '';
        return role !== 'driver' && workType !== 'owner-operator';
      });
    } else if (activeTab === 'drivers') {
      filtered = filtered.filter(paystub => {
        // Company drivers: must be a driver role AND companyFlag should be false
        // Note: Based on backend logic: companyFlag=true = Owner Operator, companyFlag=false = Company Driver
        const role = paystub.employeeRole?.toLowerCase() || paystub.userId?.role?.toLowerCase() || '';
        if (role !== 'driver') return false;
        // Check both direct property and nested details
        const companyFlag = paystub.userId?.companyFlag ?? paystub.userId?.details?.companyFlag ?? false;
        // Company drivers have companyFlag = false
        return companyFlag === false;
      });
    } else if (activeTab === 'ownerOperators') {
      filtered = filtered.filter(paystub => {
        // Owner operators: must be a driver role AND companyFlag should be true
        // Note: Based on backend logic: companyFlag=true = Owner Operator, companyFlag=false = Company Driver
        const role = paystub.employeeRole?.toLowerCase() || paystub.userId?.role?.toLowerCase() || '';
        if (role !== 'driver') return false;
        // Check both direct property and nested details
        const companyFlag = paystub.userId?.companyFlag ?? paystub.userId?.details?.companyFlag ?? false;
        // Owner operators have companyFlag = true
        return companyFlag === true;
      });
    }

    // Apply search filter (frontend filtering for instant results)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(paystub =>
        paystub.employeeName?.toLowerCase().includes(query) ||
        paystub.employeeId?.toLowerCase().includes(query) ||
        paystub.employeeEmail?.toLowerCase().includes(query) ||
        paystub.userId?.name?.toLowerCase().includes(query) ||
        paystub.userId?.internalId?.toLowerCase().includes(query)
      );
    }

    setFilteredPaystubs(filtered);
  };

  const handleViewPaystub = async (paystub: Paystub) => {
    setModalLoading(true);
    setShowPaystubModal(true);
    try {
      const response = await getPaystubById(paystub._id);
      const fullPaystub = response?.success && response.data ? response.data : paystub;
      setSelectedPaystub(fullPaystub);
    } catch (error) {
      console.error('Error fetching paystub details:', error);
      setSelectedPaystub(paystub);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDateFilter = () => {
    fetchPaystubs({ startDate, endDate });
    setShowDateFilter(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    fetchPaystubs();
  };

  const handleDownloadPDF = async (paystub: Paystub) => {
    try {
      // Fetch full paystub details for complete PDF
      const response = await getPaystubById(paystub._id);
      const fullPaystub = response?.success && response.data ? response.data : paystub;

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      const textR = 31, textG = 41, textB = 55;

      let yPos = margin;

      // Pre-load doclogo for use in header
      let docLogoBase64 = '';
      let docLogoW = 22, docLogoH = 11;
      try {
        const logoImg = new Image();
        logoImg.src = DocLogo;
        await new Promise<void>((resolve) => {
          logoImg.onload = () => {
            try {
              const cv = document.createElement('canvas');
              cv.width = logoImg.width; cv.height = logoImg.height;
              const ctx = cv.getContext('2d');
              if (ctx) {
                ctx.drawImage(logoImg, 0, 0);
                docLogoBase64 = cv.toDataURL('image/png');
                docLogoW = 22;
                docLogoH = (logoImg.height / logoImg.width) * docLogoW;
              }
            } catch { }
            resolve();
          };
          logoImg.onerror = () => resolve();
        });
      } catch { }

      // Determine if this is an employee (not a driver)
      const isEmployee = (fullPaystub.employeeRole?.toLowerCase() !== 'driver' &&
        fullPaystub.userId?.role?.toLowerCase() !== 'driver') ||
        (fullPaystub.workType?.toLowerCase() === 'employee');

      if (isEmployee) {
        // PAY STUB format - Blue header (matching employee payroll format)
        const contentWidth = pageWidth - (margin * 2);
        const primaryR = 37, primaryG = 99, primaryB = 235;
        const lightGrayR = 243, lightGrayG = 244, lightGrayB = 246;
        const greenR = 34, greenG = 197, greenB = 94;
        const redR = 239, redG = 68, redB = 68;

        // Blue header background
        doc.setFillColor(primaryR, primaryG, primaryB);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Company name (left side, white text)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const companyName = fullPaystub.companyDetails?.companyName || fullPaystub.company?.name || 'Company Name';
        doc.text(companyName, margin, 18);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        let companyY = 25;
        const companyAddress = fullPaystub.companyDetails?.companyAddress || fullPaystub.company?.address || '';
        const companyPhone = fullPaystub.companyDetails?.companyPhone || fullPaystub.company?.phone || '';
        const companyEmail = fullPaystub.companyDetails?.companyEmail || '';
        if (companyAddress) {
          const addressLines = doc.splitTextToSize(companyAddress, 70);
          doc.text(addressLines, margin, companyY);
          companyY += addressLines.length * 4.5;
        }
        if (companyPhone) {
          doc.text(`Phone: ${companyPhone}`, margin, companyY);
          companyY += 4.5;
        }
        if (companyEmail) {
          doc.text(`Email: ${companyEmail}`, margin, companyY);
        }

        // PAY STUB title (right side, white text)
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('PAY STUB', pageWidth - margin, 18, { align: 'right' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('EARNINGS STATEMENT', pageWidth - margin, 25, { align: 'right' });
        if (fullPaystub.paystubId) {
          doc.setFontSize(7);
          doc.text(`ID: ${fullPaystub.paystubId}`, pageWidth - margin, 32, { align: 'right' });
        }

        // Platform logo in bottom-right of header
        if (docLogoBase64) {
          doc.addImage(docLogoBase64, 'PNG', pageWidth - margin - docLogoW, 44 - docLogoH, docLogoW, docLogoH);
        }

        doc.setTextColor(textR, textG, textB);
        yPos = 55;

        // Pay Period Box (right-aligned)
        const payBoxWidth = 75;
        const payBoxHeight = 25;
        doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
        doc.roundedRect(pageWidth - margin - payBoxWidth, yPos, payBoxWidth, payBoxHeight, 2, 2, 'F');

        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.text('Pay Period Start', pageWidth - margin - payBoxWidth + 3, yPos + 6);
        doc.text('Pay Period End', pageWidth - margin - payBoxWidth + 3, yPos + 12);
        doc.text('Pay Date', pageWidth - margin - payBoxWidth + 3, yPos + 18);

        doc.setFontSize(8);
        doc.setTextColor(textR, textG, textB);
        doc.setFont('helvetica', 'bold');
        const startDateStr = new Date(fullPaystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endDateStr = new Date(fullPaystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const payDateStr = new Date(fullPaystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        doc.text(startDateStr, pageWidth - margin - 3, yPos + 6, { align: 'right' });
        doc.text(endDateStr, pageWidth - margin - 3, yPos + 12, { align: 'right' });
        doc.text(payDateStr, pageWidth - margin - 3, yPos + 18, { align: 'right' });

        yPos += payBoxHeight + 8;

        // Employee Information Section
        checkPageBreak(25);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Information', margin, yPos);
        yPos += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${fullPaystub.employeeName || fullPaystub.userId?.name || 'N/A'}`, margin, yPos);
        yPos += 6;
        const empInternalId = fullPaystub.employeeId || fullPaystub.userId?.internalId;
        if (empInternalId) {
          doc.text(`Employee ID: ${empInternalId}`, margin, yPos);
          yPos += 6;
        }
        doc.text(`Role: ${fullPaystub.employeeRole || fullPaystub.userId?.role || 'N/A'}`, margin, yPos);
        yPos += 6;
        doc.text(`Work Type: ${fullPaystub.workType || 'Employee'}`, margin, yPos);
        yPos += 6;
        if (fullPaystub.employeeAddress) {
          const addrLines = doc.splitTextToSize(`Address: ${fullPaystub.employeeAddress}`, contentWidth);
          doc.text(addrLines, margin, yPos);
          yPos += addrLines.length * 5;
        }
        yPos += 8;

        // Earnings Section
        checkPageBreak(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Earnings', margin, yPos);
        yPos += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
        doc.rect(margin, yPos - 2, contentWidth, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Earning Type', margin + 2, yPos + 4);
        doc.text('Units', margin + 70, yPos + 4);
        doc.text('Rate', margin + 100, yPos + 4);
        doc.text('Amount', pageWidth - margin - 2, yPos + 4, { align: 'right' });
        yPos += 9;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (fullPaystub.earnings?.earningsBreakdown && fullPaystub.earnings.earningsBreakdown.length > 0) {
          fullPaystub.earnings.earningsBreakdown.forEach((earning: any) => {
            checkPageBreak(6);
            const typeText = doc.splitTextToSize(earning.type || 'N/A', 60);
            doc.text(typeText, margin + 2, yPos + 4);
            doc.text(String(earning.units || '-'), margin + 70, yPos + 4);
            doc.text(earning.rate > 0 ? `$${earning.rate.toFixed(2)}` : '-', margin + 100, yPos + 4);
            doc.text(`$${earning.amount.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            yPos += Math.max(6, typeText.length * 5);
          });
        } else {
          checkPageBreak(6);
          doc.text('Basic Pay', margin + 2, yPos + 4);
          doc.text(`$${(fullPaystub.earnings?.baseSalary || fullPaystub.summary?.grossPay || 0).toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
          yPos += 6;
          if ((fullPaystub.earnings?.bonus || 0) > 0) {
            checkPageBreak(6);
            doc.text('Bonus', margin + 2, yPos + 4);
            doc.text(`$${fullPaystub.earnings.bonus.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            yPos += 6;
          }
        }

        yPos += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total Earnings', margin + 2, yPos + 4);
        doc.setTextColor(greenR, greenG, greenB);
        doc.text(`$${(fullPaystub.earnings?.totalEarnings || fullPaystub.summary?.grossPay || 0).toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
        doc.setTextColor(textR, textG, textB);
        yPos += 10;

        // Deductions Section
        checkPageBreak(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Deductions', margin, yPos);
        yPos += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
        doc.rect(margin, yPos - 2, contentWidth, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Deduction Type', margin + 2, yPos + 4);
        doc.text('Amount', pageWidth - margin - 2, yPos + 4, { align: 'right' });
        yPos += 9;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const deductionsBreakdown = fullPaystub.deductions?.deductionsBreakdown;
        if (deductionsBreakdown && deductionsBreakdown.length > 0) {
          deductionsBreakdown.forEach((deduction: any) => {
            checkPageBreak(6);
            const typeText = doc.splitTextToSize(deduction.type || 'N/A', 120);
            doc.text(typeText, margin + 2, yPos + 4);
            doc.setTextColor(redR, redG, redB);
            doc.text(`$${deduction.amount.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            doc.setTextColor(textR, textG, textB);
            yPos += Math.max(6, typeText.length * 5);
          });
        } else {
          if ((fullPaystub.deductions?.otherDeductions || 0) > 0) {
            checkPageBreak(6);
            doc.text('Other Deductions', margin + 2, yPos + 4);
            doc.setTextColor(redR, redG, redB);
            doc.text(`$${fullPaystub.deductions.otherDeductions.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            doc.setTextColor(textR, textG, textB);
            yPos += 6;
          }
          if ((fullPaystub.summary?.totalTaxes || 0) > 0) {
            checkPageBreak(6);
            doc.text('Taxes', margin + 2, yPos + 4);
            doc.setTextColor(redR, redG, redB);
            doc.text(`$${fullPaystub.summary.totalTaxes.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            doc.setTextColor(textR, textG, textB);
            yPos += 6;
          }
        }

        yPos += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total Deductions', margin + 2, yPos + 4);
        doc.setTextColor(redR, redG, redB);
        doc.text(`$${(fullPaystub.deductions?.totalDeductions || fullPaystub.summary?.totalDeductions || 0).toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
        doc.setTextColor(textR, textG, textB);
        yPos += 12;

        // Pay Summary Box (blue)
        checkPageBreak(40);
        doc.setFillColor(primaryR, primaryG, primaryB);
        doc.roundedRect(margin, yPos, contentWidth, 32, 2, 2, 'F');
        yPos += 8;
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Pay Summary', margin + 3, yPos);
        yPos += 9;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Gross Earnings:', margin + 3, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${(fullPaystub.summary?.grossPay || 0).toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
        yPos += 7;

        doc.setFont('helvetica', 'normal');
        doc.text('Total Deductions:', margin + 3, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${(fullPaystub.summary?.totalDeductions || 0).toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
        yPos += 6;

        doc.setDrawColor(255, 255, 255);
        doc.line(margin + 3, yPos, pageWidth - margin - 3, yPos);
        yPos += 6;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Net Pay', margin + 3, yPos);
        doc.setFontSize(13);
        doc.text(`$${(fullPaystub.summary?.netPay || 0).toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
        doc.setTextColor(textR, textG, textB);
        yPos += 15;

        // YTD Summary (if available)
        if (fullPaystub.ytd) {
          checkPageBreak(25);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Year-to-Date (YTD) Summary', margin, yPos);
          yPos += 7;
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 7;

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text('YTD Earnings:', margin, yPos);
          doc.text(`$${fullPaystub.ytd.earnings.toFixed(2)}`, margin + 70, yPos);
          yPos += 6;
          doc.text('YTD Deductions:', margin, yPos);
          doc.text(`$${fullPaystub.ytd.deductions.toFixed(2)}`, margin + 70, yPos);
          yPos += 6;
          doc.text('YTD Net Pay:', margin, yPos);
          doc.setFont('helvetica', 'bold');
          doc.text(`$${fullPaystub.ytd.netPay.toFixed(2)}`, margin + 70, yPos);
          yPos += 10;
        }

        // Footer
        const empFooterY = pageHeight - 20;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, empFooterY, pageWidth - margin, empFooterY);
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        let empFooterTextY = empFooterY + 5;
        if (fullPaystub.notes) {
          const notesLines = doc.splitTextToSize(`Notes: ${fullPaystub.notes}`, contentWidth);
          doc.text(notesLines, margin, empFooterTextY);
          empFooterTextY += notesLines.length * 4;
        }
        if (fullPaystub.hrName) {
          doc.text(`HR Signature: ${fullPaystub.hrName}`, margin, empFooterTextY);
          empFooterTextY += 4;
        }
        const statusText = fullPaystub.status || 'issued';
        doc.text(`Status: ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`, margin, empFooterTextY);
        doc.text(`Generated: ${new Date(fullPaystub.createdAt || new Date()).toLocaleString()}`, pageWidth - margin, empFooterTextY, { align: 'right' });

      } else {
        // Driver/Owner Operator Format - Blue header (matching driver payroll format)
        const contentWidth = pageWidth - (margin * 2);
        const primaryR = 37, primaryG = 99, primaryB = 235;
        const lightGrayR = 243, lightGrayG = 244, lightGrayB = 246;
        const greenR = 34, greenG = 197, greenB = 94;
        const redR = 239, redG = 68, redB = 68;

        // Blue header background
        doc.setFillColor(primaryR, primaryG, primaryB);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Company name (left side, white text)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const companyName = fullPaystub.companyDetails?.companyName || fullPaystub.company?.name || 'Company Name';

        doc.text(companyName, margin, 12);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        let companyY = 19;
        if (fullPaystub.companyDetails?.companyAddress) {
          const addressLines = doc.splitTextToSize(fullPaystub.companyDetails.companyAddress, 70);
          doc.text(addressLines, margin, companyY);
          companyY += addressLines.length * 4;
        }
        if (fullPaystub.companyDetails?.companyPhone) {
          doc.text(fullPaystub.companyDetails.companyPhone, margin, companyY);
          companyY += 4;
        }

        // Employee info on right side of header
        const drvWorkType = fullPaystub.workType;
        if (drvWorkType === 'Owner-Operator' || drvWorkType === 'Driver') {
          const employeeInfoX = pageWidth - margin - 70;
          doc.setFontSize(8);
          const drvHeaderEmpId = fullPaystub.employeeId || fullPaystub.userId?.internalId;
          if (drvHeaderEmpId) {
            doc.text(drvHeaderEmpId, employeeInfoX, 12);
          }
          const drvHeaderName = fullPaystub.employeeName || fullPaystub.userId?.name;
          if (drvHeaderName) {
            const nameLines = doc.splitTextToSize(drvHeaderName, 65);
            doc.text(nameLines, employeeInfoX, 16);
            companyY = Math.max(companyY, 16 + nameLines.length * 4);
          }
          if (fullPaystub.employeeAddress) {
            const addrLines = doc.splitTextToSize(fullPaystub.employeeAddress, 65);
            doc.text(addrLines, employeeInfoX, companyY + 2);
          }
        }

        // Title on right
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        if (drvWorkType === 'Owner-Operator') {
          doc.text('OWNER OPERATOR PAY STATEMENT', pageWidth - margin, 12, { align: 'right' });
        } else {
          doc.text('PAY STUB', pageWidth - margin, 12, { align: 'right' });
        }

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        let rightHeaderY = 16;
        if (fullPaystub.companyDetails?.gstNumber) {
          doc.text(`GST No. ${fullPaystub.companyDetails.gstNumber}`, pageWidth - margin, rightHeaderY, { align: 'right' });
          rightHeaderY += 4;
        }
        const drvPeriodStartFmt = new Date(fullPaystub.payPeriod.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        const drvPeriodEndFmt = new Date(fullPaystub.payPeriod.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        doc.text(`PAY PERIOD ${drvPeriodStartFmt} - ${drvPeriodEndFmt}`, pageWidth - margin, rightHeaderY, { align: 'right' });
        rightHeaderY += 4;
        const drvPayDueFmt = new Date(fullPaystub.payPeriod.payDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        doc.text(`PAYROLL DUE: ${drvPayDueFmt}`, pageWidth - margin, rightHeaderY, { align: 'right' });

        // Platform logo in bottom-right of header
        if (docLogoBase64) {
          doc.addImage(docLogoBase64, 'PNG', pageWidth - margin - docLogoW, 44 - docLogoH, docLogoW, docLogoH);
        }

        doc.setTextColor(textR, textG, textB);
        yPos = 55;

        // Pay Period Box (right-aligned)
        const drvBoxWidth = 75;
        const drvBoxHeight = 25;
        doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
        doc.roundedRect(pageWidth - margin - drvBoxWidth, yPos, drvBoxWidth, drvBoxHeight, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.text('Pay Period Start', pageWidth - margin - drvBoxWidth + 3, yPos + 6);
        doc.text('Pay Period End', pageWidth - margin - drvBoxWidth + 3, yPos + 12);
        doc.text('Pay Date', pageWidth - margin - drvBoxWidth + 3, yPos + 18);
        doc.setFontSize(8);
        doc.setTextColor(textR, textG, textB);
        doc.setFont('helvetica', 'bold');
        const drvStartDate = new Date(fullPaystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const drvEndDate = new Date(fullPaystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const drvPayDateFmt = new Date(fullPaystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        doc.text(drvStartDate, pageWidth - margin - 3, yPos + 6, { align: 'right' });
        doc.text(drvEndDate, pageWidth - margin - 3, yPos + 12, { align: 'right' });
        doc.text(drvPayDateFmt, pageWidth - margin - 3, yPos + 18, { align: 'right' });
        yPos += drvBoxHeight + 8;

        // Employee Information
        checkPageBreak(25);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Information', margin, yPos);
        yPos += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${fullPaystub.employeeName || fullPaystub.userId?.name || 'N/A'}`, margin, yPos);
        yPos += 6;
        const drvEmpId = fullPaystub.employeeId || fullPaystub.userId?.internalId;
        if (drvEmpId) {
          doc.text(`Employee ID: ${drvEmpId}`, margin, yPos);
          yPos += 6;
        }
        doc.text(`Role: ${fullPaystub.employeeRole || fullPaystub.userId?.role || 'N/A'}`, margin, yPos);
        yPos += 6;
        doc.text(`Work Type: ${fullPaystub.workType || 'Driver'}`, margin, yPos);
        yPos += 6;
        if (fullPaystub.employeeAddress) {
          const empAddrLines = doc.splitTextToSize(`Address: ${fullPaystub.employeeAddress}`, contentWidth);
          doc.text(empAddrLines, margin, yPos);
          yPos += empAddrLines.length * 5;
        }
        yPos += 8;

        // Trip Details (if available)
        if (fullPaystub.tripDetails && fullPaystub.tripDetails.length > 0) {
          checkPageBreak(30);
          doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
          doc.rect(margin, yPos, contentWidth, 6, 'F');
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(textR, textG, textB);
          const col1 = margin + 1, col2 = margin + 15, col3 = margin + 30, col4 = margin + 42;
          const col5 = margin + 50, col6 = margin + 65, col7 = margin + 80;
          const col8 = margin + 92, col9 = margin + 108, col10 = margin + 125;
          doc.text('Truck #', col1, yPos + 4);
          doc.text('Pay Type', col2, yPos + 4);
          doc.text('Load #', col3, yPos + 4);
          doc.text('Type', col4, yPos + 4);
          doc.text('Period', col5, yPos + 4);
          doc.text('From', col5, yPos + 5.5);
          doc.text('To', col6, yPos + 4);
          doc.text('Pay Rate', col7, yPos + 4);
          doc.text('Miles/', col8, yPos + 4);
          doc.text('Hours', col8, yPos + 5.5);
          doc.text('CAD', col9, yPos + 4);
          doc.text('USD', col10, yPos + 4);
          yPos += 7;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          let totalMilesDrv = 0;
          for (const trip of fullPaystub.tripDetails) {
            checkPageBreak(8);
            const truckNum = trip.truckNumber || 'N/A';
            const payType = trip.payType || 'Paid Per Mile';
            const loadNum = trip.loadNumber || 'N/A';
            const tripType = trip.tripType || 'N/A';
            const fromDate = trip.periodFrom ? new Date(trip.periodFrom).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A';
            const toDate = trip.periodTo ? new Date(trip.periodTo).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A';
            const origin = trip.origin || 'N/A';
            const destination = trip.destination || 'N/A';
            const originLines = doc.splitTextToSize(origin, 12);
            const destLines = doc.splitTextToSize(destination, 12);
            const payRate = trip.payRate || 0;
            const miles = trip.miles || 0;
            const hours = trip.hours || 0;
            const amountCAD = trip.amountCAD || 0;
            const amountUSD = trip.amountUSD || 0;
            totalMilesDrv += miles;
            const maxLines = Math.max(originLines.length, destLines.length);
            const rowHeight = Math.max(6, maxLines * 3.5);
            doc.text(truckNum, col1, yPos + 3);
            doc.text(payType, col2, yPos + 3);
            doc.text(loadNum, col3, yPos + 3);
            doc.text(tripType, col4, yPos + 3);
            doc.text(fromDate, col5, yPos + 3);
            if (origin !== 'N/A') {
              doc.setFontSize(5); doc.setTextColor(107, 114, 128);
              doc.text(originLines[0] || origin.substring(0, 15), col5, yPos + 5.5);
              doc.setFontSize(6); doc.setTextColor(textR, textG, textB);
            }
            doc.text(toDate, col6, yPos + 3);
            if (destination !== 'N/A') {
              doc.setFontSize(5); doc.setTextColor(107, 114, 128);
              doc.text(destLines[0] || destination.substring(0, 15), col6, yPos + 5.5);
              doc.setFontSize(6); doc.setTextColor(textR, textG, textB);
            }
            doc.text(`$${payRate.toFixed(2)}`, col7, yPos + 3);
            if (miles > 0) {
              doc.text(miles.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), col8, yPos + 3);
            } else if (hours > 0) {
              doc.text(hours.toFixed(2), col8, yPos + 3);
            } else {
              doc.text('-', col8, yPos + 3);
            }
            doc.text(`$${amountCAD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col9, yPos + 3);
            doc.text(`$${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col10, yPos + 3);
            yPos += rowHeight;
          }
          yPos += 2;
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text(`Total Miles: ${totalMilesDrv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, yPos);
          yPos += 8;
        } else {
          // Fallback: Earnings section
          checkPageBreak(40);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Earnings', margin, yPos);
          yPos += 7;
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 5;
          doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
          doc.rect(margin, yPos - 2, contentWidth, 7, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Earning Type', margin + 2, yPos + 4);
          doc.text('Units', margin + 70, yPos + 4);
          doc.text('Rate', margin + 100, yPos + 4);
          doc.text('Amount', pageWidth - margin - 2, yPos + 4, { align: 'right' });
          yPos += 9;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const drvEarningsBreakdown = fullPaystub.earnings?.earningsBreakdown;
          if (drvEarningsBreakdown && drvEarningsBreakdown.length > 0) {
            drvEarningsBreakdown.forEach((earning: any) => {
              checkPageBreak(6);
              const typeText = doc.splitTextToSize(earning.type || 'N/A', 60);
              doc.text(typeText, margin + 2, yPos + 4);
              doc.text(String(earning.units || '-'), margin + 70, yPos + 4);
              doc.text(earning.rate > 0 ? `$${earning.rate.toFixed(2)}` : '-', margin + 100, yPos + 4);
              doc.text(`$${earning.amount.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
              yPos += Math.max(6, typeText.length * 5);
            });
          } else {
            checkPageBreak(6);
            doc.text('Basic Pay', margin + 2, yPos + 4);
            doc.text(`$${(fullPaystub.earnings?.baseSalary || fullPaystub.summary?.grossPay || 0).toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            yPos += 6;
          }
          yPos += 3;
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('Total Earnings', margin + 2, yPos + 4);
          doc.setTextColor(greenR, greenG, greenB);
          doc.text(`$${(fullPaystub.earnings?.totalEarnings || fullPaystub.summary?.grossPay || 0).toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
          doc.setTextColor(textR, textG, textB);
          yPos += 10;
        }

        // Deductions Section
        checkPageBreak(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Deductions', margin, yPos);
        yPos += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        doc.setFillColor(lightGrayR, lightGrayG, lightGrayB);
        doc.rect(margin, yPos - 2, contentWidth, 7, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Deduction Type', margin + 2, yPos + 4);
        doc.text('Amount', pageWidth - margin - 2, yPos + 4, { align: 'right' });
        yPos += 9;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const drvDeductionsBreakdown = fullPaystub.deductions?.deductionsBreakdown;
        if (drvDeductionsBreakdown && drvDeductionsBreakdown.length > 0) {
          drvDeductionsBreakdown.forEach((deduction: any) => {
            checkPageBreak(6);
            const typeText = doc.splitTextToSize(deduction.type || 'N/A', 120);
            doc.text(typeText, margin + 2, yPos + 4);
            doc.setTextColor(redR, redG, redB);
            doc.text(`$${deduction.amount.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            doc.setTextColor(textR, textG, textB);
            yPos += Math.max(6, typeText.length * 5);
          });
        } else {
          if ((fullPaystub.deductions?.otherDeductions || 0) > 0) {
            checkPageBreak(6);
            doc.text('Other Deductions', margin + 2, yPos + 4);
            doc.setTextColor(redR, redG, redB);
            doc.text(`$${fullPaystub.deductions.otherDeductions.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            doc.setTextColor(textR, textG, textB);
            yPos += 6;
          }
          if ((fullPaystub.summary?.totalTaxes || 0) > 0) {
            checkPageBreak(6);
            doc.text('Taxes', margin + 2, yPos + 4);
            doc.setTextColor(redR, redG, redB);
            doc.text(`$${fullPaystub.summary.totalTaxes.toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
            doc.setTextColor(textR, textG, textB);
            yPos += 6;
          }
        }
        yPos += 3;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Total Deductions', margin + 2, yPos + 4);
        doc.setTextColor(redR, redG, redB);
        doc.text(`$${(fullPaystub.deductions?.totalDeductions || fullPaystub.summary?.totalDeductions || 0).toFixed(2)}`, pageWidth - margin - 2, yPos + 4, { align: 'right' });
        doc.setTextColor(textR, textG, textB);
        yPos += 12;

        // Pay Summary Box (blue)
        checkPageBreak(40);
        doc.setFillColor(primaryR, primaryG, primaryB);
        doc.roundedRect(margin, yPos, contentWidth, 32, 2, 2, 'F');
        yPos += 8;
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Pay Summary', margin + 3, yPos);
        yPos += 9;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Gross Pay', margin + 3, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${(fullPaystub.summary?.grossPay || 0).toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
        yPos += 7;
        if (fullPaystub.additions && Array.isArray(fullPaystub.additions) && fullPaystub.additions.length > 0) {
          const totalAdditions = fullPaystub.additions.reduce((sum: number, add: any) => sum + (add.totalCAD || add.amount || 0), 0);
          doc.setFont('helvetica', 'normal');
          doc.text('Additions (+)', margin + 3, yPos);
          doc.setFont('helvetica', 'bold');
          doc.text(`$${totalAdditions.toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
          yPos += 7;
        }
        doc.setFont('helvetica', 'normal');
        doc.text('Total Deductions:', margin + 3, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${(fullPaystub.summary?.totalDeductions || fullPaystub.deductions?.totalDeductions || 0).toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
        yPos += 6;
        doc.setDrawColor(255, 255, 255);
        doc.line(margin + 3, yPos, pageWidth - margin - 3, yPos);
        yPos += 6;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Net Pay', margin + 3, yPos);
        doc.setFontSize(13);
        doc.text(`$${(fullPaystub.summary?.netPay || 0).toFixed(2)}`, pageWidth - margin - 3, yPos, { align: 'right' });
        doc.setTextColor(textR, textG, textB);
        yPos += 15;

        // YTD Summary
        if (fullPaystub.ytd) {
          checkPageBreak(25);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Year-to-Date (YTD) Summary', margin, yPos);
          yPos += 7;
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 7;
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text('YTD Earnings:', margin, yPos);
          doc.text(`$${fullPaystub.ytd.earnings.toFixed(2)}`, margin + 70, yPos);
          yPos += 6;
          doc.text('YTD Deductions:', margin, yPos);
          doc.text(`$${fullPaystub.ytd.deductions.toFixed(2)}`, margin + 70, yPos);
          yPos += 6;
          doc.text('YTD Net Pay:', margin, yPos);
          doc.setFont('helvetica', 'bold');
          doc.text(`$${fullPaystub.ytd.netPay.toFixed(2)}`, margin + 70, yPos);
          yPos += 10;
        }

        // Footer
        const drvFooterY = pageHeight - 20;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, drvFooterY, pageWidth - margin, drvFooterY);
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        let drvFooterTextY = drvFooterY + 5;
        if (fullPaystub.notes) {
          const notesLines = doc.splitTextToSize(`Notes: ${fullPaystub.notes}`, contentWidth);
          doc.text(notesLines, margin, drvFooterTextY);
          drvFooterTextY += notesLines.length * 4;
        }
        if (fullPaystub.hrName) {
          doc.text(`HR Signature: ${fullPaystub.hrName}`, margin, drvFooterTextY);
          drvFooterTextY += 4;
        }
        const drvStatus = fullPaystub.status || 'issued';
        doc.text(`Status: ${drvStatus.charAt(0).toUpperCase() + drvStatus.slice(1)}`, margin, drvFooterTextY);
        doc.text(`Generated: ${new Date(fullPaystub.createdAt || new Date()).toLocaleString()}`, pageWidth - margin, drvFooterTextY, { align: 'right' });

      }

      const fileName = `Paystub_${(fullPaystub.employeeName || fullPaystub.userId?.name || 'Unknown').replace(/\s+/g, '_')}_${fullPaystub.paystubId || fullPaystub._id.slice(-8)}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleBulkDownload = async () => {
    if (filteredPaystubs.length === 0) {
      alert('No paystubs to download.');
      return;
    }

    setDownloadingBulk(true);
    try {
      // Download all paystubs sequentially using the same handleDownloadPDF logic
      // This ensures all paystubs use the same PDF format
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < filteredPaystubs.length; i++) {
        const paystub = filteredPaystubs[i];
        try {
          // Use the same handleDownloadPDF function to ensure consistent PDF format
          await handleDownloadPDF(paystub);
          successCount++;

          // Small delay between downloads to prevent browser blocking
          if (i < filteredPaystubs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
        } catch (error) {
          console.error(`Error downloading paystub ${paystub._id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        alert(`Successfully downloaded ${successCount} paystub(s).${errorCount > 0 ? ` ${errorCount} failed.` : ''}`);
      } else {
        alert('Failed to download paystubs. Please try again.');
      }
    } catch (error) {
      console.error('Error in bulk download:', error);
      alert('Error downloading paystubs. Please try again.');
    } finally {
      setDownloadingBulk(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-main px-6 py-8">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-headings flex items-center gap-2">
                <FileText className="text-[var(--accent-navyblue)]" size={28} />
                Gross Payroll
              </h1>
              <p className="text-sm text-secondary mt-1">View and download paystubs for employees, drivers, and owner operators</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-theme mb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'all'
                ? 'border-blue-600 !text-[var(--accent-navyblue)]'
                : 'border-transparent text-secondary hover:text-primary'
                }`}
            >
              All Paystubs
              <span className="ml-2 px-2 py-0.5 bg-card rounded-full text-xs">
                {paystubs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'employees'
                ? 'border-blue-600 !text-[#00D1FF]'
                : 'border-transparent text-secondary hover:text-primary'
                }`}
            >
              <Users size={18} />
              Employees
              <span className="ml-2 px-2 py-0.5 bg-card rounded-full text-xs">
                {paystubs.filter(p => {
                  const role = p.employeeRole?.toLowerCase() || p.userId?.role?.toLowerCase() || '';
                  return role !== 'driver';
                }).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'drivers'
                ? 'border-blue-600 text-[#00D1FF]'
                : 'border-transparent text-secondary hover:text-primary'
                }`}
            >
              <Users size={18} />
              Drivers
              <span className="ml-2 px-2 py-0.5 bg-card rounded-full text-xs">
                {paystubs.filter(p => {
                  // Company drivers: must be a driver role AND companyFlag should be false
                  const role = p.employeeRole?.toLowerCase() || p.userId?.role?.toLowerCase() || '';
                  if (role !== 'driver') return false;
                  const companyFlag = p.userId?.companyFlag ?? p.userId?.details?.companyFlag ?? false;
                  return companyFlag === false;
                }).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ownerOperators')}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'ownerOperators'
                ? 'border-blue-600 text-[#00D1FF]'
                : 'border-transparent text-secondary hover:text-primary'
                }`}
            >
              <Users size={18} />
              Owner Operators
              <span className="ml-2 px-2 py-0.5 bg-card rounded-full text-xs">
                {paystubs.filter(p => {
                  // Owner operators: must be a driver role AND companyFlag should be true
                  const role = p.employeeRole?.toLowerCase() || p.userId?.role?.toLowerCase() || '';
                  if (role !== 'driver') return false;
                  const companyFlag = p.userId?.companyFlag ?? p.userId?.details?.companyFlag ?? false;
                  return companyFlag === true;
                }).length}
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl shadow-sm border border-theme p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, employee ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date Filter Toggle */}
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] flex items-center gap-2 transition-colors"
            >
              <Calendar size={18} />
              Date Filter
            </button>

            {/* Bulk Download */}
            {filteredPaystubs.length > 0 && (
              <button
                onClick={handleBulkDownload}
                disabled={downloadingBulk}
                className="px-4 py-2 bg-[var(--accent-navyblue)] hover:bg-blue-700 !text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {downloadingBulk ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download All ({filteredPaystubs.length})
                  </>
                )}
              </button>
            )}

            {/* Clear Filters */}
            {(searchQuery || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] flex items-center gap-2 transition-colors text-[#A855F7]"
              >
                <X size={18} />
                Clear
              </button>
            )}
          </div>

          {/* Date Filter Panel */}
          {showDateFilter && (
            <div className="mt-4 pt-4 border-t border-theme">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-primary mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-primary mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleDateFilter}
                  className="px-6 py-2 bg-[var(--accent-navyblue)] hover:bg-[#0d6fc7] !text-white rounded-lg font-medium transition-colors"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Paystubs Table */}
        <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-navyblue)]"></div>
            </div>
          ) : filteredPaystubs.length === 0 ? (
            <div className="text-center py-12 text-secondary">
              <FileText className="mx-auto mb-4 text-secondary" size={48} />
              <p className="text-lg font-medium">
                No {activeTab === 'employees' ? 'employee' : activeTab === 'drivers' ? 'driver' : activeTab === 'ownerOperators' ? 'owner operator' : ''} paystubs found
              </p>
              <p className="text-sm">Try adjusting your filters, search query, or date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Employee / Driver</th>
                    {activeTab !== 'employees' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Employee Code</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pay Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Pay Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Net Pay</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme divide-white/5">
                  {filteredPaystubs.map((paystub) => (
                    <tr key={paystub._id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium bg-[var(--accent-navyblue)]">
                            {paystub.employeeName?.charAt(0) || 'N'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-primary">{paystub.employeeName || 'Unknown'}</div>
                            {paystub.employeeEmail && (
                              <div className="text-sm text-secondary">{paystub.employeeEmail}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      {activeTab !== 'employees' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-primary font-medium">
                            {paystub.employeeId || paystub.userId?.internalId || 'N/A'}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${paystub.employeeRole?.toLowerCase() === 'driver'
                            ? 'bg-[rgba(0,255,163,0.12)] text-[var(--accent-green)]'
                            : 'bg-[rgba(17,131,224,0.12)] text-[var(--accent-navyblue)]'
                            }`}>
                            {paystub.employeeRole || paystub.userId?.role || 'N/A'}
                          </span>
                          {paystub.employeeRole?.toLowerCase() === 'driver' || paystub.userId?.role?.toLowerCase() === 'driver' ? (
                            (() => {
                              // Determine workType based on companyFlag (not stored workType which may be incorrect)
                              const companyFlag = paystub.userId?.companyFlag ?? paystub.userId?.details?.companyFlag ?? false;
                              // companyFlag=false = Company Driver, companyFlag=true = Owner Operator
                              const displayWorkType = companyFlag === false ? 'Driver' : 'Owner-Operator';
                              return (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-card text-primary">
                                  {displayWorkType}
                                </span>
                              );
                            })()
                          ) : paystub.workType ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-card text-primary">
                              {paystub.workType}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">
                          {new Date(paystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-secondary">to {new Date(paystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-primary">
                          {new Date(paystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-primary">
                          ${paystub.summary.netPay.toFixed(2)}
                        </div>
                        <div className="text-xs text-secondary">
                          Gross: ${paystub.summary.grossPay.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${paystub.status === 'issued'
                          ? 'bg-[rgba(0,255,163,0.12)] text-[var(--accent-green)]'
                          : paystub.status === 'void'
                            ? 'bg-[rgba(244,63,94,0.12)] text-[var(--accent-red)]'
                            : 'bg-card text-primary'
                          }`}>
                          {paystub.status.charAt(0).toUpperCase() + paystub.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewPaystub(paystub)}
                            className="p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)]"
                            title="View Details"
                          >
                            <Eye size={18} />
                            <span className="hidden md:inline">View</span>
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(paystub)}
                            className="p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--accent-navyblue)] hover:bg-[rgba(17,131,224,0.08)]"
                            title="Download PDF"
                          >
                            <Download size={18} />
                            <span className="hidden md:inline">Download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Footer */}
          {filteredPaystubs.length > 0 && (
            <div className="bg-card px-6 py-4 border-t border-theme">
              <div className="flex items-center justify-between text-sm">
                <div className="text-secondary">
                  Showing <span className="font-semibold text-primary">{filteredPaystubs.length}</span> paystub{filteredPaystubs.length !== 1 ? 's' : ''}
                  {activeTab !== 'all' && (
                    <span className="ml-2 text-[#00D1FF]">
                      ({activeTab === 'employees' ? 'Employees' : activeTab === 'drivers' ? 'Drivers' : activeTab === 'ownerOperators' ? 'Owner Operators' : ''})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-secondary">
                    Total Net Pay: <span className="font-semibold text-primary">
                      ${filteredPaystubs.reduce((sum, p) => sum + p.summary.netPay, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-secondary">
                    Total Gross: <span className="font-semibold text-primary">
                      ${filteredPaystubs.reduce((sum, p) => sum + p.summary.grossPay, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Paystub Detail Modal */}
    {showPaystubModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[rgba(0,209,255,0.15)]">

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgba(17,131,224,0.15)] flex items-center justify-center">
                <FileText size={18} className="text-[var(--accent-navyblue)]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Paystub Details</h2>
                {selectedPaystub?.paystubId && (
                  <p className="text-xs text-secondary">#{selectedPaystub.paystubId}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setShowPaystubModal(false); setSelectedPaystub(null); }}
              className="p-2 rounded-lg text-secondary hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {modalLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-navyblue)]" />
            </div>
          ) : selectedPaystub ? (
            <div className="px-6 py-5 space-y-5">

              {/* Company Header */}
              {selectedPaystub.companyDetails?.companyName && (
                <div className="text-center py-3 border-b border-[rgba(255,255,255,0.05)]">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {selectedPaystub.companyDetails.companyName}
                  </h3>
                  {selectedPaystub.companyDetails.companyAddress && (
                    <p className="text-xs text-secondary mt-1">{selectedPaystub.companyDetails.companyAddress}</p>
                  )}
                  {(selectedPaystub.companyDetails.companyPhone || selectedPaystub.companyDetails.companyEmail) && (
                    <p className="text-xs text-secondary">
                      {selectedPaystub.companyDetails.companyPhone}
                      {selectedPaystub.companyDetails.companyPhone && selectedPaystub.companyDetails.companyEmail && ' · '}
                      {selectedPaystub.companyDetails.companyEmail}
                    </p>
                  )}
                </div>
              )}

              {/* Pay Period */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[var(--bg-card-light)] rounded-xl p-3">
                  <p className="text-xs text-secondary mb-1">Period Start</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(selectedPaystub.payPeriod.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-[var(--bg-card-light)] rounded-xl p-3">
                  <p className="text-xs text-secondary mb-1">Period End</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(selectedPaystub.payPeriod.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-[var(--bg-card-light)] rounded-xl p-3">
                  <p className="text-xs text-secondary mb-1">Pay Date</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {new Date(selectedPaystub.payPeriod.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Employee Information */}
              <div className="bg-[var(--bg-card-light)] rounded-xl p-4">
                <p className="text-xs text-secondary uppercase tracking-wider mb-3">Employee Information</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-navyblue)] flex items-center justify-center text-white font-semibold text-sm">
                    {selectedPaystub.employeeName?.charAt(0) || 'N'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedPaystub.employeeName}</p>
                    {selectedPaystub.employeeEmail && (
                      <p className="text-xs text-secondary">{selectedPaystub.employeeEmail}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(selectedPaystub.employeeId || selectedPaystub.userId?.internalId) && (
                    <div>
                      <span className="text-secondary text-xs">Employee ID</span>
                      <p className="text-[var(--text-primary)] font-medium">{selectedPaystub.employeeId || selectedPaystub.userId?.internalId}</p>
                    </div>
                  )}
                  {(selectedPaystub.employeeRole || selectedPaystub.userId?.role) && (
                    <div>
                      <span className="text-secondary text-xs">Role</span>
                      <p className="text-[var(--text-primary)] font-medium capitalize">{selectedPaystub.employeeRole || selectedPaystub.userId?.role}</p>
                    </div>
                  )}
                  {selectedPaystub.workType && (
                    <div>
                      <span className="text-secondary text-xs">Work Type</span>
                      <p className="text-[var(--text-primary)] font-medium">{selectedPaystub.workType}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pay Summary */}
              <div className="rounded-xl overflow-hidden border border-[rgba(17,131,224,0.2)]">
                <div className="bg-[rgba(17,131,224,0.1)] px-4 py-2">
                  <p className="text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">Pay Summary</p>
                </div>
                <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-secondary">Gross Pay</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">${selectedPaystub.summary.grossPay.toFixed(2)}</span>
                  </div>
                  {selectedPaystub.summary.totalTaxes > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-secondary">Total Taxes</span>
                      <span className="text-sm font-medium text-[var(--accent-red)]">- ${selectedPaystub.summary.totalTaxes.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedPaystub.summary.totalDeductions > 0 && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-sm text-secondary">Total Deductions</span>
                      <span className="text-sm font-medium text-[var(--accent-red)]">- ${selectedPaystub.summary.totalDeductions.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3 bg-[rgba(0,255,163,0.05)]">
                    <span className="text-sm font-bold text-[var(--text-primary)]">Net Pay</span>
                    <span className="text-base font-bold text-[var(--accent-green)]">${selectedPaystub.summary.netPay.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Status & Issued Date */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-secondary">Status:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    selectedPaystub.status === 'issued'
                      ? 'bg-[rgba(0,255,163,0.12)] text-[var(--accent-green)]'
                      : selectedPaystub.status === 'void'
                        ? 'bg-[rgba(244,63,94,0.12)] text-[var(--accent-red)]'
                        : 'bg-[rgba(255,255,255,0.07)] text-[var(--text-primary)]'
                  }`}>
                    {selectedPaystub.status.charAt(0).toUpperCase() + selectedPaystub.status.slice(1)}
                  </span>
                </div>
                <div className="text-secondary text-xs">
                  Generated: {new Date(selectedPaystub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

            </div>
          ) : null}

          {/* Footer with Download PDF and Close Button */}
          <div className="p-6 border-t-2 border-theme bg-card">
            <div className="flex justify-between items-center">
              {selectedPaystub ? (
                <button
                  onClick={() => handleDownloadPDF(selectedPaystub)}
                  className="px-6 py-3 bg-[var(--accent-navyblue)] hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => { setShowPaystubModal(false); setSelectedPaystub(null); }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-headings rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <X size={18} />
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    )}
    </>
  );
};

export default PaystubsList;

