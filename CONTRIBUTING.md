# Contributing

Short version: **issues yes, pull requests no.**

## Pull requests are not accepted

This connector is maintained in-house by the Hou.la team, and the repository is public so that
you can read it, audit it before running it on your machine, fork it and build on it — not to
run it as a community project. **Pull requests are closed automatically**, and that is not a
judgement on your patch. It keeps the release, the npm package and the signed binaries on a
single, predictable chain of custody.

The code is [Apache 2.0](./LICENSE): if you need a change we haven't shipped, you are entirely
free to fork and ship your own version. Just don't use the Hou.la name or logo for it.

## Issues are welcome — and they work

Opening an issue is the fastest way to get something fixed. Genuinely useful reports:

- **A bug.** Include your OS, your Node version (`node -v`) or the binary you downloaded, the
  connector version, what you expected and what happened. Redact your key — anything starting
  with `hle_` is a secret.
- **An event that looks wrong**: a missing field, a bad type, a payload that doesn't match the
  README. Paste the raw envelope you received (with any personal data removed).
- **An integration idea**: a bridge to Streamer.bot, OBS, home automation, another game. Tell us
  what you're trying to build — a well-argued issue is how new bridges get prioritised.
- **A documentation gap**: something in the README that is wrong, stale or impossible to follow.

Please **never paste a token, an RCON password, a server IP or a viewer's personal data** into an
issue. This repository is public and issues are indexed by search engines.

## Security

Don't open a public issue for a vulnerability. Report it privately through
[hou.la](https://hou.la) and give us a reasonable window to ship a fix before disclosing.

## Looking to contribute *content*?

Gift packs — artwork plus an effect mapping — live in a separate repository that **is** open to
pull requests: **[Hou-la/houla-bundles](https://github.com/Hou-la/houla-bundles)**. If you want
to design a pack for interactive gifts, that's the place.
