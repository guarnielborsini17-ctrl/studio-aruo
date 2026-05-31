export type Submission = {
  id: string;
  date: string;
  client: string;
  desc: string;
  image: string;
  state: any;
};

export type PricingItem = {
  id: string;
  name: string;
  en: string;
  price: string;
  unit: string;
  iconType: string;
  category: 'single' | 'package';
};

export type ChatMessage = {
  id: string;
  sender: 'client' | 'admin';
  text: string;
  timestamp: number;
};

export type Db = {
  version: 1;
  submissions: Submission[];
  pricing: PricingItem[];
  chat: {
    messages: ChatMessage[];
  };
};
