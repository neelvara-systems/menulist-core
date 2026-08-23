import { jsPDF } from 'jspdf';
import type { MenuListBillingDocument } from './billingDocumentTypes';

const formatMoney = (amount: number, currency: string): string => (
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount / 100)
);

const formatDate = (millis: number): string => new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
}).format(new Date(millis));

const addressLines = (document: MenuListBillingDocument): string[] => {
    const profile = document.customer;
    return [
        profile.legalName,
        profile.addressLine1,
        profile.addressLine2,
        `${profile.city}, ${profile.region} ${profile.postalCode}`,
        profile.countryCode,
        profile.taxId ? `${profile.taxIdType || 'Tax ID'}: ${profile.taxId}` : undefined,
        `Email: ${profile.email}`,
    ].filter((value): value is string => Boolean(value));
};

export const renderMenuListBillingDocumentPdf = (document: MenuListBillingDocument): Uint8Array => {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const margin = 16;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    const title = document.documentType === 'tax_invoice' ? 'TAX INVOICE' : 'CREDIT NOTE';

    pdf.setProperties({
        title: `${title} ${document.documentNumber}`,
        subject: 'MenuList billing document',
        author: document.seller.legalName,
        creator: 'MenuList',
    });
    pdf.setTextColor(7, 19, 63);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(19);
    pdf.text('MenuList', margin, 20);
    pdf.setFontSize(15);
    pdf.text(title, pageWidth - margin, 20, { align: 'right' });

    pdf.setDrawColor(210, 220, 235);
    pdf.line(margin, 26, pageWidth - margin, 26);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(70, 83, 105);
    pdf.text(`Document no: ${document.documentNumber}`, margin, 34);
    pdf.text(`Issue date: ${formatDate(document.issuedAtMillis)}`, margin, 40);
    if (document.relatedInvoiceNumber) {
        pdf.text(`Original invoice: ${document.relatedInvoiceNumber}`, margin, 46);
    }
    pdf.text(`Place of supply: ${document.supply.placeOfSupply}`, pageWidth - margin, 34, { align: 'right' });
    pdf.text(`Currency: ${document.currency}`, pageWidth - margin, 40, { align: 'right' });

    let y = 56;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(7, 19, 63);
    pdf.text('Supplier', margin, y);
    pdf.text('Bill to', 110, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(70, 83, 105);
    const supplierLines = [
        document.seller.legalName,
        ...pdf.splitTextToSize(document.seller.registeredAddress, 78),
        `GSTIN: ${document.seller.gstin}`,
        `State code: ${document.seller.stateCode}`,
    ];
    const customerLines = addressLines(document).flatMap((line) => pdf.splitTextToSize(line, 78));
    supplierLines.forEach((line, index) => pdf.text(line, margin, y + 7 + index * 5));
    customerLines.forEach((line, index) => pdf.text(line, 110, y + 7 + index * 5));
    y += Math.max(supplierLines.length, customerLines.length) * 5 + 16;

    const columns = [margin, 100, 119, 145, pageWidth - margin];
    pdf.setFillColor(238, 244, 252);
    pdf.rect(margin, y, contentWidth, 10, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(7, 19, 63);
    pdf.text('Description', columns[0] + 2, y + 6.5);
    pdf.text('Qty', columns[1] + 2, y + 6.5);
    pdf.text('Taxable', columns[2] + 2, y + 6.5);
    pdf.text('Tax', columns[3] + 2, y + 6.5);
    pdf.text('Total', columns[4] - 2, y + 6.5, { align: 'right' });
    y += 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(70, 83, 105);
    document.lineItems.forEach((line) => {
        const description = pdf.splitTextToSize(`${line.description}\nSAC ${line.sacCode}`, 78);
        const rowHeight = Math.max(15, description.length * 5 + 4);
        pdf.rect(margin, y, contentWidth, rowHeight);
        pdf.text(description, columns[0] + 2, y + 6);
        pdf.text(String(line.quantity), columns[1] + 2, y + 6);
        pdf.text(formatMoney(line.baseAmount, document.currency), columns[3] - 2, y + 6, { align: 'right' });
        pdf.text(formatMoney(line.taxAmount, document.currency), columns[4] - 28, y + 6, { align: 'right' });
        pdf.text(formatMoney(line.grossAmount, document.currency), columns[4] - 2, y + 6, { align: 'right' });
        y += rowHeight;
    });

    y += 8;
    const totals: Array<readonly [string, number]> = [
        ['Taxable amount', document.totals.baseAmount],
        ...(document.totals.cgstAmount ? [['CGST', document.totals.cgstAmount] as const] : []),
        ...(document.totals.sgstAmount ? [['SGST', document.totals.sgstAmount] as const] : []),
        ...(document.totals.igstAmount ? [['IGST', document.totals.igstAmount] as const] : []),
        ['Total tax', document.totals.taxAmount],
        ['Document total', document.totals.grossAmount],
    ];
    totals.forEach(([label, amount], index) => {
        const isLast = index === totals.length - 1;
        pdf.setFont('helvetica', isLast ? 'bold' : 'normal');
        pdf.setTextColor(7, 19, 63);
        pdf.text(label, 124, y + index * 7);
        pdf.text(formatMoney(amount, document.currency), pageWidth - margin, y + index * 7, { align: 'right' });
    });
    y += totals.length * 7 + 7;

    if (document.supply.taxTreatment === 'zero_rated_export' && document.supply.lutReference) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(70, 83, 105);
        pdf.text(
            pdf.splitTextToSize(
                `Export under LUT without payment of integrated tax. LUT reference: ${document.supply.lutReference}`,
                contentWidth,
            ),
            margin,
            y,
        );
        y += 12;
    }
    if (document.seller.authorisedSignatoryName) {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(7, 19, 63);
        pdf.text('Authorised signatory', pageWidth - margin, y + 10, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        pdf.text(document.seller.authorisedSignatoryName, pageWidth - margin, y + 16, { align: 'right' });
    }

    pdf.setFontSize(8);
    pdf.setTextColor(110, 120, 138);
    pdf.text(
        'This document was generated from the payment and tax details frozen when the transaction was settled.',
        margin,
        286,
    );
    return new Uint8Array(pdf.output('arraybuffer'));
};
