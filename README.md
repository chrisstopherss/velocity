# Velocity

Velocity is a dispatch trainer for ER:LC. You sit in the dispatcher's chair, answer 911 calls, work out where the caller is and what is going on, create the incident, and send units. The map is the real ER:LC map. When the call is over you get a score for how it went.

It is a training tool, not a real CAD. Nothing connects to a game server.

This is early. Right now you get four scripted Beginner calls, a unit board, a radio log, a map with postal search, and a scorecard. AI callers, pursuits, traffic stops and voice are planned but not built.

## Two looks

You can switch between two interface themes at any time from the top of the screen. The choice is remembered in your browser.

- **Early 2000s**: tiled windows, hot keys and tables, like an old desktop CAD.
- **Modern**: dark cards and a cleaner layout.

Same game underneath, different layout.

## Running it

You need Node 20 or newer.

```
npm install
npm run build
npm start
```

Then open http://localhost:3000.

For development, run the server and the web app in two terminals:

```
npm run dev:server
npm run dev:web
```

The web app is on http://localhost:5173 and talks to the server on port 3000.

Tests and type checks:

```
npm test
npm run typecheck
```

## How it is laid out

- `apps/web` is the React and Vite front end. The game rules live in `src/game`, the call scripts and unit roster in `src/data`, and each theme has its own shell in `src/shells`.
- `apps/server` is a small Fastify server. For now it serves the built web app and a health check at `/api/health`.

The simulation runs in the browser. Postal numbers, street names and nearby landmarks come from CADLY's public map resolver, collected once with `scripts/cadly-scan.mjs` and turned into data by `scripts/build-postals.mjs`. The app does not call that API while you play. Postal positions on the map image are fitted from that data, so they are close but not exact. The resolver misspells a few street names, and those are corrected in the build script.

## Keys

- F1 answers the ringing call
- F5 dispatches the selected units
- F12 clears the call

## Credits

- The map image is from ER:LC. It belongs to its creators. Velocity is not affiliated with or endorsed by ER:LC, its developers or Roblox.
- Postal and street data come from [CADLY](https://cadly.me)'s public map resolver.
- Icons are from the Lucide set (ISC license).

## License

MIT. See `LICENSE`.
