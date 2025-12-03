export interface UrbanismCertificate {
  id?: string;
  uatId: string;
  number: string;
  issueDate: string;
  status: 'draft' | 'issued';
  createdAt: string;

  // 1. Date despre solicitant
  applicant: {
    name: string;
    cnpCui: string;
    address: string;
    email: string;
    phone: string;
  };

  // 2. Identificarea imobilului
  property: {
    address: string;
    cadastralNumber: string;
    area: number;
    uat: string;
  };

  // 3. Scopul solicitării
  purpose: string;

  // 4. Regimul juridic
  legalRegime: {
    owner: string;
    usageCategory: string;
    propertyRegime: string; // e.g., Intravilan / Extravilan
  };

  // 5. Regimul tehnic și urbanistic (autogenerat)
  technicalRegime: string;

  // 6. Servituți și restricții (din layere GIS)
  restrictions: string;

  // 7. Documente necesare
  requiredDocuments: {
    planCadastral: boolean;
    planSituatie: boolean;
    extrasCF: boolean;
    studiuGeotehnic: boolean;
    memoriuTehnic: boolean;
    alteDocumente: string;
  };

  // 8. Observații
  observations: string;
}
