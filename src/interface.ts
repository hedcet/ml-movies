export interface IMovie {
  id: string;
  image_uri?: string;
  title: string;
  original_title?: string;
  secondary_key?: string;
  secondary_value?: string;
  half?: number;
  one?: number;
  one_half?: number;
  two?: number;
  two_half?: number;
  three?: number;
  three_half?: number;
  four?: number;
  four_half?: number;
  five?: number;
}

export interface IProps {
  page: number;
  setPage: (page: number) => void;
  movieIndex: number;
  movie: any;
  mod: boolean;
  pagination: number;
  flag: boolean;
  rating: number;
  setRating: (rating: number) => void;
  ratings: any;
  setAction: (action: number) => void;
  // actionLoading: boolean;
  setMovieSync: (index: number) => void;
  showToast: (text: string) => void;
  enIn: (v: number, locale?: string, opts?: any) => string;
  customize: () => void;
  download: () => void;
}

export interface IConfigs {
  mods: string[];
  movies: IMovie[];
  refs?: { [k: string]: string };
}
