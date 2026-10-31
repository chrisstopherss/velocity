# Velocity

Velocity is a dispatch trainer for ER:LC. You sit in the dispatcher's chair, answer 911 calls, work out where the caller is and what is going on, create the incident, and send units. The map is the real ER:LC map. When the call is over you get a score for how it went.

It is a training tool, not a real CAD. Nothing connects to a game server.

This is early. Right now you get four Beginner calls, a unit board, a radio log, a map with postal search, and a scorecard. Units drive along a road graph instead of cutting across the map, and you can type questions to the caller if the server has an AI key. Pursuits, traffic stops and voice are planned but not built.

## Two looks

You can switch between two interface themes at any time from the top of the screen. The choice is remembered in your browser.

- **Early 2000s**: tiled windows, hot keys and tables, like an old desktop CAD.
- **Modern**: dark cards and a cleaner layout.

Same game underneath, different layout. In both, drag the gap between any two panels to resize them. Double-click a divider to put it back, or focus it and use the arrow keys. Sizes are remembered per theme in your browser.

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

The simulation runs in the browser. Postals, buildings and road lines come from `apps/web/src/data/erlc-map-data.json`, in game coordinates. `getErlcLocation(x, z)` in `erlcLocation.ts` turns a position into a street, building and postal, with no network calls. `npm run build:postals` rebuilds `postals.data.ts` from that file, converting game coordinates to positions on the map image with a fitted transform. There are no landmark names in the data, so calls give a street and postal only. The map image has no text, so the app draws postal numbers and street names itself once you zoom in. The street lines come from `npm run build:streets`.

## Roads

Units follow a graph of roads (`apps/web/src/data/roads.data.ts`) and take the shortest path to the call. When you tick units to dispatch, the map draws each one's route first. The graph is generated from the road lines in `erlc-map-data.json` by `npm run build:roads`. Roads that cross or end on another road get a junction, and a few small gaps between separate pieces are joined (the script prints them). It doesn't know about one-way lanes or overpasses, so a road that crosses another without a junction in the real game will get one here. Open `/#roads` to fix things by hand: click to add nodes, click two nodes to link or unlink them, drag to move, and the toolbar warns you about postals that can't be reached. Download the result and replace `roads.data.ts`. Running `build:roads` again overwrites hand edits.

## AI callers

The four callers can answer typed questions in character. Set `DEEPSEEK_API_KEY` on the server to turn it on, otherwise the box stays hidden and the quick question buttons still work. Anything you type is sent to the model provider along with the last few lines of the call, so don't type personal information.

It is built to be cheap and hard to abuse:

- Model is `deepseek-v4-flash` with thinking off and a 70 token reply limit. Override with `AI_MODEL`, `AI_BASE_URL` and `AI_MAX_OUTPUT_TOKENS` to use another OpenAI-compatible provider.
- Each IP gets 12,000 tokens a day (`AI_IP_DAILY_TOKENS`), 5 requests a minute (`AI_PER_MINUTE`), and 8 typed questions per call. The whole server stops at 400,000 tokens a day (`AI_GLOBAL_DAILY_TOKENS`). Counters live in memory and reset on restart.
- The server owns the call scripts, so a client can't send its own prompt. Messages with sexual content, or abuse involving children, or attempts to rewrite the caller's instructions, are turned away without calling the model, and the same filter runs on replies.
- Set `TRUST_PROXY_HOPS` to the number of proxies in front of the server (default 1) so the limits see the real client address.

## Calls

Calls live in `packages/scenarios/scenarios.json`, which both the game and the AI server read. Each template is one kind of call (shots fired, burglary, robbery and so on) with five variants, and every variant is a different version of that call with its own truth. Shots fired, for example, can be an active shooter, shots heard with someone running, a man firing a pistol, someone who heard fireworks and is not sure, or a prank caller. A variant sets its own priority and how many units it really needs, and some need none at all: a prank, a misunderstanding, or something already resolved. For those the right move is to log it as a false report and use Close without units. Sending units to one costs you points.

A template also has a few callers and a list of postals where it can happen. Every call is chosen at random, including the first, and the same kind of call never comes twice in a row. After a call closes, the score card tells you what the call really was.

To add a call, add a variant or a template and run the tests. They check that the postals exist, every answer is filled in, the not real variants say how the caller behaves, and the text passes the content filter. Calls are for adults only: no children, nothing sexual, no gore, no self-harm.

## Keys

- F1 answers the ringing call
- F5 dispatches the selected units
- F12 clears the call

## Credits

- The map image is from ER:LC. It belongs to its creators. Velocity is not affiliated with or endorsed by ER:LC, its developers or Roblox.
- The road lines, postals and buildings in `erlc-map-data.json` were provided by finalcutpro.
- Icons are from the Lucide set (ISC license), apart from the unit icons on the map.

## License

MIT. See `LICENSE`.
