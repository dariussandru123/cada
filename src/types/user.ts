export type UserRole = 'admin' | 'city_hall_manager' | 'user';

export interface UserData {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: string;
  uatName?: string;
  uatCode?: string;
  shapefileUrl?: string;
  shapefileMetadata?: {
    fileName: string;
    uploadedAt: string;
    uploadedBy: string;
  };
}

export interface UATAccount {
  id: string;
  uatName: string;
  uatCode: string;
  email: string;
  createdAt: string;
  shapefileUrl?: string;
  shapefileMetadata?: {
    fileName: string;
    uploadedAt: string;
    uploadedBy: string;
  };
}
