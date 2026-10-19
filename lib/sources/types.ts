export type ProfileReel = {
  id: string;
  url: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  date: string;
  caption: string;
  pinned: boolean;
};

export type ReelDetails = {
  id: string;
  url: string;
  author: string;
  authorFollowers: number | null;
  caption: string;
  date: string;
  likes: number | null;
  comments: number | null;
  views: number | null;
  topComments: string[];
  keywords: string[];
};

export interface InstagramSource {
  name: string;
  getProfileReels(username: string): Promise<ProfileReel[]>;
  getReel(idOrUrl: string): Promise<ReelDetails>;
}

export interface ReelSearch {
  search(query: string, sinceDays: number): Promise<string[]>;
}
