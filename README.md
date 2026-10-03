# relayer-list

# https://www.spark.money/tools/stablecoin-bridge-comparison

## Web app

Interoperability agents and relayers database

## Development

```sh
npm install
npm run dev      # vite dev server on http://localhost:5173
```

## Build

```sh
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve dist/ locally on http://localhost:4173
```

The bundle uses relative asset paths, so `dist/` can be published at a domain
root or under a subpath. The datasets in `public/data/` are fetched at runtime
and copied verbatim into the build, so they can be updated without a rebuild of
the page.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`, which builds the site and
publishes `dist/` to GitHub Pages.
