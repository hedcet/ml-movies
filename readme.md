### movie rating app for reddit

this app will help you to post/config one/multiple highlight/normal template with movie rating feature like letterboxd

[demo](https://www.reddit.com/r/kerala_boxoffice/comments/1j6zuyz) | [source-code](https://github.com/hedcet/ml-movies)

### features

- preload movie rating from letterboxd/anywhere
- full control over metadata/image
- internal redis as store
- aggregated stats & export options

### how to install

you can install it any reddit community if you are moderator, this will add one menu like this

![menu](https://github.com/hedcet/ml-movies/blob/main/assets/menu.jpg?raw=true)

moderator can add one post/multiple movie rating template like this

![movie-rating-template-post](https://github.com/hedcet/ml-movies/blob/main/assets/movie-rating-template-post.jpg?raw=true)

& configure following by using customize button

- mods for this post
- movies with image & metadata, also preload rating from letterboxd/anywhere
- reddit internal image url mapping

this app will auto ingest external `image_uri` & keep that in `refs` mapping

![customize](https://github.com/hedcet/ml-movies/blob/main/assets/customize.jpg?raw=true)

you can modify it like this

```
{
  "mods": [
    <user_id>
  ],
  "movies": [
    {
      "id": "interstellar",
      "image_uri": "https://a.ltrbxd.com/resized/film-poster/1/1/7/6/2/1/117621-interstellar-0-230-0-345-crop.jpg?v=7ad89e6666",
      "title": "Interstellar",
      "secondary_key": "Driector",
      "secondary_value": "Christopher Nolan",
      "half": 5372,
      "one": 13721,
      "one_half": 7007,
      "two": 45415,
      "two_half": 36085,
      "three": 200212,
      "three_half": 198076,
      "four": 707387,
      "four_half": 512993,
      "five": 1851427
    }
  ],
  "refs": {
    "https://a.ltrbxd.com/resized/film-poster/1/1/7/6/2/1/117621-interstellar-0-230-0-345-crop.jpg?v=7ad89e6666": "https://i.redd.it/b87sx5w6dlne1.jpeg"
  }
}
```

`movies` array accept multiple movie object in which `id` & `title` are mandatory

| prop            | description                             |
| --------------- | --------------------------------------- |
| id              | unique id like slug in letterboxd url   |
| title           | english title of the movie              |
| original_title  | locale version of title                 |
| image_uri       | image url to upload, aspect ratio ~ 2:3 |
| secondary_key   | extra metadata key like release-date    |
| secondary_value | extra metadata value                    |

preload movie rating from letterbox by using `half` to `five` props like r/kerala_boxoffice [config](https://github.com/hedcet/boxoffice-server/blob/main/ml-movies.json)

this app using [ajv](https://www.npmjs.com/package/ajv) to validate JSON data

download button allow moderator to download metadata & combined rating (preload + redis) in \*.csv format

### changelog

- 0.0.337
  - performance optimization
- 0.0.319/329
  - add memory-cache & preload n+1/all for performance
- 0.0.317
  - remove useAsync chain with sync functions for performance
- 0.0.294
  - disable forward pagination only if one movie
- 0.0.292
  - first preview

### roadmap

| feature                    | description                                |
| -------------------------- | ------------------------------------------ |
| enable_recent_page         | enable recent 6 as home page list/tile     |
| banner_url                 | background image per movie                 |
| recommend_score + ordering | weighted AI scoring & personalised sorting |
| watchlist                  | multi-purpose personal list                |
