export interface Listing {
  id: string;
  name: string;
  description?: string | null;
  key: string;
  accountId?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  pickupAddress?: string | null;
  isPublic?: boolean; // Public listings don't require a key to be accessed
}
