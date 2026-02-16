import { Timestamp } from 'firebase/firestore';

export interface Quote {
  id?: string;
  text: string;
  personAlias: string;
  listId: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface QuoteList {
  id?: string;
  personName: string;
  collaborators: string[];
  createdAt: Timestamp;
  createdBy: string;
}

export interface ListAlias {
  alias: string;
}
