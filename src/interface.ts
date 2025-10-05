export interface IConfigs {
  mods: string[];
  movies: IMovie[];
  refs?: { [k: string]: string };
}

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
