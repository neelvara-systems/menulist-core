export type MenuListBillingDocument = {
  documentId: string;
  documentNumber: string;
  documentType: 'tax_invoice' | 'credit_note';
  status: 'issued';
  issuedAtMillis: number;
  productId: 'ML';
  tenantId: number;
  storeId: number;
  currency: 'INR' | 'USD';
  relatedInvoiceNumber?: string;
  seller: {
    legalName: string;
    registeredAddress: string;
    gstin: string;
    stateCode: string;
    authorisedSignatoryName?: string;
  };
  customer: {
    legalName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
    taxId?: string;
    taxIdType?: string;
    email: string;
  };
  supply: {
    placeOfSupply: string;
    taxTreatment: string;
    lutReference?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    baseAmount: number;
    sacCode: string;
    taxAmount: number;
    grossAmount: number;
  }>;
  totals: {
    baseAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    taxAmount: number;
    grossAmount: number;
  };
};
