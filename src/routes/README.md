# Routes

Expo Router uses **file-based routing**. Every `.tsx` file in this directory
defines a screen. This directory is configured as the router root in `app.json`
(`["expo-router", { "root": "./src/routes" }]`), so do **not** create an `app/`
or `src/app/` directory. The only root layout is `src/routes/_layout.tsx`.

## Conventions

| File                  | URL                                                 |
| --------------------- | --------------------------------------------------- |
| `index.tsx`           | `/`                                                 |
| `about.tsx`           | `/about`                                            |
| `users/index.tsx`     | `/users`                                            |
| `users/[id].tsx`      | `/users/:id` (dynamic — square brackets)            |
| `files/[...rest].tsx` | `/files/*` (catch-all)                              |
| `(group)/_layout.tsx` | layout group (does not add a URL segment)           |
| `_layout.tsx`         | app shell — wraps every screen; renders `<Stack />` |
| `+not-found.tsx`      | fallback for unmatched routes                       |
