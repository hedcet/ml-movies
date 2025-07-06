import { Devvit, useAsync, useForm, useState } from "@devvit/public-api";
import { csvFormat } from "d3-dsv";
import { isJSON, isURL } from "validator";

import { validate } from "./ajv.ts";
import { Actions, Routes } from "./config.ts";
import { IConfigs, IMovie, IProps } from "./interface.ts";
import { RatingPage } from "./rating.tsx";
import { StatsPage } from "./stats.tsx";

Devvit.configure({ media: true, redditAPI: true, redis: true });

Devvit.addMenuItem({
  forUserType: "moderator",
  label: "add ml-movies post",
  location: "subreddit",
  onPress: async (_event, ctx) => {
    const post = await ctx.reddit.submitPost({
      title: "movie ratings",
      subredditName: ctx.subredditName!,
      preview: (
        <vstack alignment="middle center" grow>
          <text size="large">loading...</text>
        </vstack>
      ),
    });
    await ctx.redis.set(
      `${post.id}|configs`,
      JSON.stringify({
        mods: [ctx.userId],
        movies: [
          { 
            id: "sample_movie", 
            title: "Sample Movie",
            original_title: "Sample Movie",
            secondary_key: "Year",
            secondary_value: "2024",
            half: 2,
            one: 3,
            one_half: 5,
            two: 8,
            two_half: 12,
            three: 15,
            three_half: 20,
            four: 25,
            four_half: 18,
            five: 32
          }
        ],
      })
    );
    ctx.ui.navigateTo(post);
  },
});

const App: Devvit.CustomPostComponent = (ctx: Devvit.Context) => {
  async function getConfigs() {
    const configs = await ctx.redis.get(`${ctx.postId}|configs`);
    return configs && isJSON(configs) ? JSON.parse(configs) : {};
  }

  function getPrefix(suffix: string) {
    return `${ctx.postId}|movie-${suffix}`;
  }

  async function getRating(prefix: string) {
    const v = await ctx.redis.hGet(`${prefix}|rating`, ctx.userId!);
    return v === undefined ? undefined : +v;
  }

  async function getRatings(prefix: string, preload: any = {}) {
    const k = `${prefix}|ratings`;
    const r: { [k: string]: number } = {
      half: preload.half || 0,
      one: preload.one || 0,
      one_half: preload.one_half || 0,
      two: preload.two || 0,
      two_half: preload.two_half || 0,
      three: preload.three || 0,
      three_half: preload.three_half || 0,
      four: preload.four || 0,
      four_half: preload.four_half || 0,
      five: preload.five || 0,
    };
    const keys = Object.keys(r);
    for (const [i, v] of (await ctx.redis.hMGet(k, keys)).entries())
      if (v) r[keys[i]] += +v;
    return r;
  }

  async function getMovies() {
    return (await Promise.all(
      (configs?.movies || []).map(async (m1: IMovie) => {
        const m10: any = structuredClone(m1);
        if (m10.image_uri && configs.refs?.[m10.image_uri])
          m10.image_uri = configs.refs[m10.image_uri];
        m10._rating = await getRating(getPrefix(m10.id));
        m10._ratings = await getRatings(getPrefix(m10.id), m10);
        return m10;
      })
    )) as any;
  }

  const [configs, setConfigs] = useState(async () => await getConfigs());
  const [page, setPage] = useState(Routes.Rating);
  const [movies, setMovies] = useState(async () => await getMovies());
  const [movie, setMovie] = useState(movies[0] || { 
    id: "sample", 
    title: "Sample Movie",
    half: 1, one: 2, one_half: 3, two: 5, two_half: 8, 
    three: 12, three_half: 15, four: 20, four_half: 18, five: 25,
    _ratings: { half: 1, one: 2, one_half: 3, two: 5, two_half: 8, 
               three: 12, three_half: 15, four: 20, four_half: 18, five: 25 }
  });
  const [movieIndex, setMovieIndex] = useState(0);
  const [action, setAction] = useState(Actions.Dummy);

  const { loading: actionLoading } = useAsync(
    async () => {
      switch (action) {
        case Actions.Submit: {
          const prefix = getPrefix(movie.id);
          const rating = await getRating(prefix);
          if (rating === undefined) {
            const k1 = `${prefix}|rating`;
            const k10 = `${prefix}|ratings`;
            const txn = await ctx.redis.watch(k1, k10);
            await txn.multi();
            await txn.hSet(k1, { [ctx.userId!]: `${movie._rating}` });
            await txn.hIncrBy(
              k10,
              Object.keys(movie._ratings)[movie._rating],
              1
            );
            await txn.exec();
            return { ratings: await getRatings(prefix, movie) };
          }
          const { _ratings: ratings } = movie;
          return { ratings };
        }

        case Actions.Reset: {
          const prefix = getPrefix(movie.id);
          const rating = await getRating(prefix);
          if (rating === undefined) {
            const { _ratings: ratings } = movie;
            return { ratings };
          }
          const k1 = `${prefix}|rating`;
          const k10 = `${prefix}|ratings`;
          const txn = await ctx.redis.watch(k1, k10);
          await txn.multi();
          await txn.hDel(k1, [ctx.userId!]);
          await txn.hIncrBy(k10, Object.keys(movie._ratings)[rating], -1);
          await txn.exec();
          return { ratings: await getRatings(prefix, movie) };
        }

        default:
          const { _ratings: ratings } = movie;
          return { ratings };
      }
    },
    {
      depends: [action],
      finally: (r: any, e) => {
        setAction(Actions.Dummy);

        if (r) {
          setMovie({ ...movie, _ratings: r.ratings });
          setMovies(
            movies.map((m: any) => {
              if (movie.id === m.id) {
                m._rating = movie._rating;
                m._ratings = r.ratings;
              }
              return m;
            })
          );
        }
      },
    }
  );

  function showToast(text: string) {
    ctx.ui.showToast(text);
  }

  function enIn(value: number, locale: string = "en-in", opts: any = {}) {
    return value.toLocaleString(locale, opts);
  }

  const customizeForm = useForm(
    {
      acceptLabel: "save",
      description: "refer ~ github.com/hedcet/ml-movies",
      fields: [
        {
          defaultValue: JSON.stringify(configs, null, 2),
          label: "configs",
          lineHeight: 15,
          name: "configs",
          required: true,
          type: "paragraph",
        },
      ],
    },
    async (r) => {
      if (r.configs && isJSON(r.configs)) {
        const configs: IConfigs = JSON.parse(r.configs);
        if (validate(configs)) {
          await Promise.all(
            configs.movies.map(async (movie) => {
              if (movie.image_uri) {
                if (isURL(movie.image_uri)) {
                  if (new URL(movie.image_uri).hostname.endsWith(".redd.it"))
                    return;
                  if (isURL(configs.refs?.[movie.image_uri] || "")) return;
                  try {
                    const { mediaUrl } = await ctx.media.upload({
                      type: "image",
                      url: movie.image_uri,
                    });
                    configs.refs = {
                      ...configs.refs,
                      [movie.image_uri]: mediaUrl,
                    };
                  } catch (e) {
                    showToast(`failed to upload image_uri|${movie.image_uri}`);
                    delete movie.image_uri;
                  }
                } else {
                  showToast(`invalid image_uri|${movie.image_uri}`);
                  delete movie.image_uri;
                }
              }
            })
          );
          await ctx.redis.set(`${ctx.postId}|configs`, JSON.stringify(configs));
          setConfigs(configs);
        } else {
          const [error] = validate.errors!;
          showToast(error.message || "invalid configs");
        }
      } else showToast("invalid json");
    }
  );

  function customize() {
    ctx.ui.showForm(customizeForm);
  }

  async function download() {
    const data = configs.movies
      ? await Promise.all(
          configs.movies.map(async (movie: any) => {
            if (movie.image_uri && configs.refs?.[movie.image_uri])
              movie.image_uri = configs.refs[movie.image_uri];
            const [
              half,
              one,
              one_half,
              two,
              two_half,
              three,
              three_half,
              four,
              four_half,
              five,
            ] = await ctx.redis.hMGet(
              `${ctx.postId}|movie-${movie.id}|ratings`,
              [
                "half",
                "one",
                "one_half",
                "two",
                "two_half",
                "three",
                "three_half",
                "four",
                "four_half",
                "five",
              ]
            );
            return {
              ...movie,
              half: +(half || 0) + (movie.half || 0),
              one: +(one || 0) + (movie.one || 0),
              one_half: +(one_half || 0) + (movie.one_half || 0),
              two: +(two || 0) + (movie.two || 0),
              two_half: +(two_half || 0) + (movie.two_half || 0),
              three: +(three || 0) + (movie.three || 0),
              three_half: +(three_half || 0) + (movie.three_half || 0),
              four: +(four || 0) + (movie.four || 0),
              four_half: +(four_half || 0) + (movie.four_half || 0),
              five: +(five || 0) + (movie.five || 0),
            };
          })
        )
      : [];
    ctx.ui.navigateTo(
      `https://ml-movies.hedcet.workers.dev?href=${encodeURIComponent(
        `data:text/csv;base64,${Buffer.from(csvFormat(data)).toString(
          "base64"
        )}`
      )}`
    );
  }

  const props: IProps = {
    page,
    setPage,
    movies,
    movie,
    setMovie,
    movieIndex,
    setMovieIndex,
    mod: configs.mods?.includes(ctx.userId) || ctx.userId === "t2_tnr2e", // u/HedCET
    pagination: movies.length,
    setAction,
    // actionLoading,
    showToast,
    enIn,
    customize,
    download,
  };

  switch (page) {
    case Routes.Stats:
      return <StatsPage {...props} />;
    default:
      return <RatingPage {...props} />;
  }
};

Devvit.addCustomPostType({ height: "tall", name: "ml-movies", render: App });

export default Devvit;
