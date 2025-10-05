import { Devvit, useAsync, useForm, useState } from "@devvit/public-api";
import { csvFormat } from "d3-dsv";
import { chunk, round } from "lodash";
import { isJSON, isURL } from "validator";

import { validate } from "./ajv.ts";
import { Actions } from "./config.ts";
import { IConfigs, IMovie } from "./interface.ts";

Devvit.configure({ media: true, redditAPI: true, redis: true });

const postForm = Devvit.createForm(
  {
    acceptLabel: "submit",
    cancelLabel: "cancel",
    fields: [
      {
        defaultValue: "movie ratings",
        label: "title",
        name: "title",
        required: true,
        type: "string",
      },
    ],
    title: "post",
  },
  async (e, ctx) => {
    const post = await ctx.reddit.submitPost({
      preview: (
        <vstack alignment="middle center" grow>
          <text size="large">loading...</text>
        </vstack>
      ),
      subredditName: ctx.subredditName!,
      title: e.values.title,
    });
    await ctx.redis.set(
      `${post.id}|configs`,
      JSON.stringify({
        mods: [ctx.userId],
        movies: [{ id: "id", title: "title" }],
      })
    );
    ctx.ui.navigateTo(post);
  }
);

Devvit.addMenuItem({
  forUserType: "moderator",
  label: "post ml-movies template",
  location: "subreddit",
  onPress: (_e, ctx) => ctx.ui.showForm(postForm),
});

const App: Devvit.CustomPostComponent = (ctx: Devvit.Context) => {
  const map: any = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five" };
  const width = ctx.dimensions?.width || 288;

  async function getConfigs() {
    const configs = await ctx.redis.get(`${ctx.postId}|configs`);
    return configs && isJSON(configs) ? JSON.parse(configs) : {};
  }

  const [configs, setConfigs] = useState(async () => await getConfigs());

  function getPrefix(suffix: string) {
    return `${ctx.postId}|movie-${suffix}`;
  }

  async function getRating(prefix: string) {
    const v = await ctx.redis.hGet(`${prefix}|rating`, ctx.userId!);
    return v ? +v : 0;
  }

  async function getRatings(prefix: string, preload: any = {}) {
    const k = `${prefix}|ratings`;
    const r: { [k: string]: number } = {
      five: preload.five || 0,
      four_half: preload.four_half || 0,
      four: preload.four || 0,
      three_half: preload.three_half || 0,
      three: preload.three || 0,
      two_half: preload.two_half || 0,
      two: preload.two || 0,
      one_half: preload.one_half || 0,
      one: preload.one || 0,
      half: preload.half || 0,
    };
    const keys = Object.keys(r);
    for (const [i, v] of (await ctx.redis.hMGet(k, keys)).entries())
      if (v) r[keys[i]] += +v;
    return r;
  }

  async function getMovies(movies: IMovie[], refs: any = {}) {
    return (await Promise.all(
      movies.map(async (i) => {
        const prefix = getPrefix(i.id);
        const movie: any = {
          ...i,
          _rating: await getRating(prefix),
          _ratings: await getRatings(prefix, i),
        };
        if (movie.image_uri && refs[movie.image_uri])
          movie._image_uri = refs[movie.image_uri];
        return movie;
      })
    )) as any;
  }

  const [movieIndex, setMovieIndex] = useState(0);
  const [movies, setMovies] = useState(
    async () =>
      await getMovies(
        configs?.movies?.length
          ? configs.movies
          : [{ id: "id", title: "title" }],
        configs?.refs
      )
  );

  function enIn(value: number, locale: string = "en-in", opts: any = {}) {
    return value.toLocaleString(locale, opts);
  }

  function getSummary(ratings: { [k: string]: number }) {
    const v: number[] = Object.values(ratings);
    const count = v.reduce((m, i) => m + i, 0);
    return (
      <hstack alignment="bottom center" gap="small">
        <text size="xlarge" weight="bold">
          {round(
            count
              ? v.reduce((m, i, index) => m + i * (v.length - index), 0) /
                  count /
                  2
              : 0,
            1
          )}
        </text>
        <text maxWidth="100%" overflow="ellipsis" size="small">
          from {enIn(count)} ratings
        </text>
      </hstack>
    );
  }

  function getChart(ratings: { [k: string]: number }) {
    const v: number[] = Object.values(ratings);
    const count = v.reduce((m, i) => m + i, 0);
    const chunks = chunk(v, 2).map((i) => i.reduce((m, i) => m + i, 0));
    return (
      <vstack alignment="middle center" gap="small">
        {chunks.map((i, index) => (
          <vstack width="100%">
            <hstack alignment="bottom center" gap="small">
              <text></text>
              <text
                maxWidth="70%"
                overflow="ellipsis"
                size="xsmall"
                weight="bold"
              >
                {enIn(i)} ~ {count ? round((i / count) * 100, 1) : 0}%
              </text>
              <spacer grow />
              <text color="global-stars" weight="bold">
                {Array(chunks.length - index).fill("☆")}
              </text>
              <text></text>
            </hstack>
            <vstack backgroundColor="secondary-background" cornerRadius="full">
              <hstack
                backgroundColor="primary-background"
                width={`${count ? round((i / count) * 100, 1) : 0}%`}
              >
                <spacer size="xsmall" shape="square" />
              </hstack>
            </vstack>
          </vstack>
        ))}
      </vstack>
    );
  }

  function isMod() {
    return configs?.mods?.includes(ctx.userId) || ctx.userId === "t2_tnr2e"; // u/HedCET
  }

  function showToast(text: string) {
    ctx.ui.showToast(text);
  }

  const customizeForm = useForm(
    {
      acceptLabel: "submit",
      cancelLabel: "cancel",
      fields: [
        {
          defaultValue: JSON.stringify(configs, null, 2),
          label: "configs",
          lineHeight: 20,
          name: "configs",
          required: true,
          type: "paragraph",
        },
      ],
      title: "customize",
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
                      ...configs?.refs,
                      [movie.image_uri]: mediaUrl,
                    };
                  } catch (e) {
                    showToast(`failed to upload | ${movie.image_uri}`);
                    delete movie.image_uri;
                  }
                } else {
                  showToast(`invalid image_uri | ${movie.image_uri}`);
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

  const [action, setAction] = useState(Actions.Done);
  const [rating, setRating] = useState(movies?.[movieIndex]?._rating || 0);

  const { loading } = useAsync(
    async () => {
      if (action === Actions.Rating) {
        const movie = movies[movieIndex];
        const prefix = getPrefix(movie.id);
        const t = await ctx.redis.watch(
          `${prefix}|ratings`,
          `${prefix}|rating`
        );
        await t.multi();
        if (movie._rating)
          await t.hIncrBy(`${prefix}|ratings`, map[movie._rating], -1);
        if (rating) {
          await t.hIncrBy(`${prefix}|ratings`, map[rating], 1);
          await t.hSet(`${prefix}|rating`, { [ctx.userId!]: `${rating}` });
        } else await t.hDel(`${prefix}|rating`, [ctx.userId!]);
        await t.exec();
        if (movie._rating) movie._ratings[map[movie._rating]] -= 1;
        if (rating) movie._ratings[map[rating]] += 1;
        movie._rating = rating;
        return movies.map((i: any) => (movie.id === i.id ? movie : i));
      }
    },
    {
      depends: [action],
      finally: (movies, e) => {
        setAction(Actions.Done);
        if (e) showToast(e.message || "failed to rate");
        else if (movies) setMovies(movies);
      },
    }
  );

  function download(data: { [k: string]: any }[]) {
    ctx.ui.navigateTo(
      `https://ml-movies.hedcet.workers.dev?href=${encodeURIComponent(
        `data:text/csv;base64,${Buffer.from(csvFormat(data)).toString(
          "base64"
        )}`
      )}`
    );
  }

  return (
    <vstack alignment="middle center" gap="large" grow padding="medium">
      <hstack alignment="middle center">
        {movies.map((movie: any, index: number) => (
          <vstack
            gap="medium"
            width={
              movieIndex === index ? (width <= 288 ? "256px" : "288px") : "0px"
            }
          >
            <hstack alignment="bottom center" gap="small">
              <image
                height="144px"
                imageHeight={144}
                imageWidth={96}
                resizeMode="cover"
                url={movie._image_uri || "placeholder.jpg"}
                width="96px"
              />
              <vstack gap="small" grow>
                <vstack></vstack>
                <vstack>
                  <text maxWidth="100%" overflow="ellipsis" size="xsmall">
                    {movie.original_title || "Movie"}
                  </text>
                  <text
                    maxWidth="100%"
                    overflow="ellipsis"
                    size="xlarge"
                    weight="bold"
                  >
                    {movie.title}
                  </text>
                </vstack>
                {movie.secondary_key && movie.secondary_value && (
                  <vstack>
                    <text maxWidth="100%" overflow="ellipsis" size="xsmall">
                      {movie.secondary_key}
                    </text>
                    <text
                      maxWidth="100%"
                      overflow="ellipsis"
                      size="small"
                      weight="bold"
                    >
                      {movie.secondary_value}
                    </text>
                  </vstack>
                )}
                <vstack></vstack>
              </vstack>
            </hstack>
            {getSummary(movie._ratings)}
            {getChart(movie._ratings)}
          </vstack>
        ))}
      </hstack>

      <hstack
        alignment="middle center"
        backgroundColor="secondary-background"
        border="thin"
        cornerRadius={width <= 288 ? "none" : "full"}
        gap={width <= 343 ? "small" : width <= 400 ? "medium" : "large"}
        padding="small"
      >
        {0 < movieIndex ? (
          <button
            icon="left"
            onPress={() => {
              const i = movieIndex - 1;
              setMovieIndex(i);
              setRating(movies[i]._rating);
            }}
            size="small"
          />
        ) : (
          <button
            disabled={!isMod()}
            icon="customize"
            onPress={() => {
              if (!isMod()) return;
              ctx.ui.showForm(customizeForm);
            }}
            size="small"
          />
        )}
        <vstack alignment="middle center" gap="small">
          <text size="xsmall" weight="bold">
            {rating ? `${rating} rating` : "how would you rate?"}
          </text>
          <hstack gap="small">
            {Array(5)
              .fill(undefined)
              .map((_i, index) => (
                <button
                  appearance={index < rating ? "primary" : "bordered"}
                  disabled={loading}
                  icon={index < rating ? "star-fill" : "star"}
                  onPress={() => {
                    const i = index + 1;
                    if (rating === i) setRating(0);
                    else {
                      setRating(i);
                      const movie = movies[movieIndex];
                      showToast(
                        `${movie.original_title || movie.title} ~ ${i} rating`
                      );
                    }
                    setAction(Actions.Rating);
                  }}
                  size="small"
                />
              ))}
          </hstack>
        </vstack>
        {movieIndex < movies.length - 1 ? (
          <button
            icon="right"
            onPress={() => {
              const i = movieIndex + 1;
              setMovieIndex(i);
              setRating(movies[i]._rating);
            }}
            size="small"
          />
        ) : (
          <button
            disabled={!isMod()}
            icon="download"
            onPress={() => {
              if (!isMod()) return;
              download(
                movies.map((i: any) => {
                  const movie = Object.fromEntries(
                    Object.entries(i).filter(([k]) => !k.startsWith("_"))
                  ) as Partial<IMovie> & Record<string, any>;
                  // _ratings handler
                  Object.entries(i._ratings || {}).forEach(([k, v]) => {
                    movie[k] = v;
                  });
                  return movie;
                })
              );
            }}
            size="small"
          />
        )}
      </hstack>
    </vstack>
  );
};

Devvit.addCustomPostType({ height: "tall", name: "ml-movies", render: App });

export default Devvit;
