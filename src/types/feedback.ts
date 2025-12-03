export interface Feedback {
  id: string;
  uatId: string;
  uatName: string;
  uatEmail: string;
  type: 'comment' | 'request';
  subject: string;
  message: string;
  status: 'pending' | 'solved';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByEmail?: string;
}

export interface CreateFeedbackData {
  type: 'comment' | 'request';
  subject: string;
  message: string;
}
