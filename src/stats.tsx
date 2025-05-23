import { Devvit } from "@devvit/public-api";
import { chunk, round } from "lodash";

import { IProps } from "./interface.ts";
import { Routes } from "./config.ts";

export const StatsPage: Devvit.BlockComponent<IProps> = (props) => {
  function getRatingsSummary(ratings: { [k: string]: number }) {
    const values: number[] = Object.values(ratings);
    const count = values.reduce((m, i) => m + i, 0);
    const avg = count
      ? values.reduce((m, item, i) => m + item * (i + 1), 0) / count / 2
      : 0;
    return (
      <hstack alignment="bottom center" gap="small">
        <text size="xlarge" weight="bold">
          {round(avg, 1)}
        </text>
        <text size="small">from {props.enIn(count)} ratings</text>
      </hstack>
    );
  }

  function getRatingsChart(ratings: { [k: string]: number }) {
    const values: number[] = Object.values(ratings);
    const count = values.reduce((m, i) => m + i, 0);
    const chunks = chunk(values, 2).map((i) => i.reduce((m, i) => m + i, 0));
    return (
      <vstack alignment="middle center">
        {chunks.reverse().map((i, index) => (
          <vstack width="192px">
            {index ? <spacer size="small" /> : ""}
            <hstack alignment="bottom center" gap="small">
              {0 < i ? (
                <text
                  maxWidth={`${96 + index * 16}%`}
                  overflow="ellipsis"
                  size="xsmall"
                  weight="bold"
                >
                  {props.enIn(i)} ~ {count ? round((i / count) * 100, 1) : 0}%
                </text>
              ) : (
                ""
              )}
              <spacer grow />
              <text size="xsmall">
                {[...Array(chunks.length - index)].map(() => "🌕")}
              </text>
            </hstack>
            <spacer size="xsmall" />
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

  return (
    <vstack alignment="middle center" gap="medium" grow padding="medium">
      <spacer grow />

      <hstack alignment="bottom center" gap="small" width="100%">
        <image
          height="72px"
          imageHeight={72}
          imageWidth={48}
          resizeMode="cover"
          url={props.movie.image_uri || "placeholder.jpg"}
          width="48px"
        />

        <vstack maxWidth="60%">
          <spacer size="small" />
          <text size="xsmall">Movie</text>
          <text overflow="ellipsis" size="xlarge" weight="bold">
            {props.movie.title}
          </text>
          {props.movie.original_title ? (
            <text overflow="ellipsis" size="xsmall">
              {props.movie.original_title}
            </text>
          ) : (
            ""
          )}
          <spacer size="small" />
        </vstack>
      </hstack>

      {getRatingsSummary(props.movie._ratings || {})}
      {getRatingsChart(props.movie._ratings || {})}

      <spacer grow />

      <hstack alignment="middle center" gap="small" width="100%">
        <button icon="close" onPress={() => props.setPage(Routes.Rating)} />
        <spacer grow />
      </hstack>
    </vstack>
  );
};
