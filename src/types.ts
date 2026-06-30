export type UserProfile = {
  id: string;
  name: string;
  avatar: string | null;
};

export type FileMetadata = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type TransferStatus = {
  fileId: string;
  progress: number; // 0 to 1
  status: 'pending' | 'transferring' | 'completed' | 'error';
  direction: 'sending' | 'receiving';
};
