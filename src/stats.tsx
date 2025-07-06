import { Devvit, useState } from "@devvit/public-api";
import { round } from "lodash";

import { IProps, IRatingData } from "./interface.ts";
import { Routes } from "./config.ts";

export const StatsPage: Devvit.BlockComponent<IProps> = (props) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

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
    try {
      // Convert half-star ratings to 1-5 star ratings with proper typing
      const starRatings: IRatingData[] = [
        { stars: 1, count: (ratings.half || 0) + (ratings.one || 0), percentage: 0 },
        { stars: 2, count: (ratings.one_half || 0) + (ratings.two || 0), percentage: 0 },
        { stars: 3, count: (ratings.two_half || 0) + (ratings.three || 0), percentage: 0 },
        { stars: 4, count: (ratings.three_half || 0) + (ratings.four || 0), percentage: 0 },
        { stars: 5, count: (ratings.four_half || 0) + (ratings.five || 0), percentage: 0 }
      ];

      const totalCount = starRatings.reduce((sum, rating) => sum + rating.count, 0);
      
      // Calculate percentages
      starRatings.forEach(rating => {
        rating.percentage = totalCount > 0 ? round((rating.count / totalCount) * 100, 1) : 0;
      });
      
      if (totalCount === 0) {
        return (
          <vstack alignment="middle center" padding="medium">
            <text size="small" color="neutral-content-weak">
              No ratings yet
            </text>
          </vstack>
        );
      }

      return (
        <vstack alignment="middle center" gap="medium" width="100%">
          <text size="medium" weight="bold">Rating Distribution</text>
          
          {starRatings.reverse().map((rating) => {
            const isSelected = selectedRating === rating.stars;
            
            return (
              <vstack width="300px" key={`rating-${rating.stars}`}>
                <hstack alignment="middle center" gap="small" width="100%">
                  <button
                    appearance={isSelected ? "primary" : "secondary"}
                    size="small"
                    onPress={() => {
                      setSelectedRating(isSelected ? null : rating.stars);
                    }}
                  >
                    {rating.stars}★
                  </button>
                  
                  <text 
                    size="small" 
                    weight="regular"
                    color={isSelected ? "primary" : "neutral-content"}
                  >
                    {"★".repeat(rating.stars)}{"☆".repeat(5 - rating.stars)}
                  </text>
                  
                  <spacer grow />
                  
                  <text 
                    size="small" 
                    weight="bold"
                    color={isSelected ? "primary" : "neutral-content"}
                  >
                    {props.enIn(rating.count)} ({rating.percentage}%)
                  </text>
                </hstack>
                
                <spacer size="small" />
                
                <vstack 
                  backgroundColor={isSelected ? "primary-background-weak" : "secondary-background"} 
                  cornerRadius="full" 
                  border={isSelected ? "thick" : "none"}
                  borderColor={isSelected ? "primary" : undefined}
                  width="100%"
                >
                  <hstack
                    backgroundColor={isSelected ? "primary" : "primary-background"}
                    width={`${Math.max(rating.percentage, 2)}%`}
                    cornerRadius="full"
                  >
                    <spacer size="small" shape="square" />
                  </hstack>
                </vstack>
                
                <spacer size="medium" />
              </vstack>
            );
          })}
          
          {selectedRating && (
            <vstack alignment="middle center" padding="small" backgroundColor="primary-background-weak" cornerRadius="medium">
              <text size="small" weight="bold" color="primary">
                Showing {selectedRating}-star ratings
              </text>
              <button 
                size="small" 
                appearance="plain"
                onPress={() => setSelectedRating(null)}
              >
                Clear selection
              </button>
            </vstack>
          )}
        </vstack>
      );
    } catch (error) {
      // Error handling for edge cases
      return (
        <vstack alignment="middle center" padding="medium">
          <text size="small" color="neutral-content-weak">
            Unable to load rating data
          </text>
        </vstack>
      );
    }
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
