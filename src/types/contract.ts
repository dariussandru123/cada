export interface ContractData {
  id?: string;
  uatId: string;
  createdAt: string;
  updatedAt: string;
  
  // A. Date Parcela
  parcelaId: string;
  nrCadastral: string;
  suprafataParcela: number;
  categoriaFolosinta: string;
  localizare: string;

  // B. Tip Contract
  tipContract: string;

  // C. Date Titular
  titularTip: 'PF' | 'PJ';
  numeDenumire: string;
  cnpCui: string;
  adresa: string;
  telefon: string;
  email: string;

  // D. Date Contract
  numarContract: string;
  dataIncheiere: string;
  dataExpirare: string;
  suprafataContractata: number;
  pret: number;
  periodicitatePlata: string;
  modAtribuire: string;
  hclNumar: string;
  hclData: string;

  // E. Documente
  fileUrl?: string;
  fileName?: string;
  status: 'activ' | 'expirat' | 'in_asteptare';
}
