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
  _rating?: number;
  _ratings?: { [k: string]: number };
}

export interface IRatingData {
  stars: number;
  count: number;
  percentage: number;
}

export interface IProps {
  page: number;
  setPage: (page: number) => void;
  movies: any[];
  movie: any;
  setMovie: (movie: any) => void;
  movieIndex: number;
  setMovieIndex: (movieIndex: number) => void;
  mod: boolean;
  pagination: number;
  setAction: (action: any) => void;
  // actionLoading: boolean;
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
