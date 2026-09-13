# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: true

## Project Notes

- Product name: **Tic Tac Toe: 4 in a Row**.
- Use Effect v4 throughout the shared game engine and backend.
- The frontend uses Foldkit and follows the exact versions pinned in `package.json`.
- Bun is the package manager and server runtime.
- Keep the game rules in a shared, pure package used by both browser and server.
- The Nix flake must provide a development shell, deployable package, and NixOS module.
