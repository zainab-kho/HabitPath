export interface Reward {
  id: string;
  name: string;
  costPoints: number;
  costDollars: number;
  backgroundColor?: string;
  photoUri?: string;
  tags?: string[];
  notes?: string;
  link?: string;
  recurring?: boolean;
  dateAdded: string;
  isClaimed: boolean;
  dateClaimed?: string;
}
