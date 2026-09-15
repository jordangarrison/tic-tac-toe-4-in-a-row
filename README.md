# Tic Tac Toe: 4 in a Row

A two-player scoring game for an 8×8 board. Completing exactly four Xs or Os in a straight line earns a point, play continues, and the highest score when the board is full wins.

The frontend uses [Foldkit](https://foldkit.dev/) and the shared game engine and Bun backend use Effect v4. See [`docs/game-spec.md`](docs/game-spec.md) for the precise rules.

## Development

The project pins prerelease Foldkit and Effect versions exactly. Bun is the package manager and runtime.

```bash
direnv allow       # or: nix develop
bun install
bun run dev        # frontend at http://localhost:5173
```

The local game runs entirely in the browser and does not require the backend. To exercise the production server locally:

```bash
bun run build
bun run serve      # frontend and API at http://127.0.0.1:3000
```

Useful commands:

```bash
bun run format:check
bun run lint
bun run typecheck
bun test
bun run build
nix flake check
nix build
```

## API

The Effect-powered Bun server serves the built SPA and two read-only endpoints from one port:

- `GET /api/health` — service health
- `GET /api/rules` — Schema-encoded machine-readable scoring rules

Configure it with `HOST`, `PORT`, and `STATIC_ROOT`. The local game remains usable if these endpoints are unavailable.

## Nix deployment

The flake exports:

- `packages.default`
- `devShells.default`
- `checks.default`
- `nixosModules.default`

Example NixOS configuration:

```nix
{
  inputs.tic-tac-toe-4-in-a-row.url =
    "github:jordangarrison/tic-tac-toe-4-in-a-row";

  imports = [
    inputs.tic-tac-toe-4-in-a-row.nixosModules.default
  ];

  services.tic-tac-toe-4-in-a-row = {
    enable = true;
    host = "four.example.com";

    nginx = {
      enable = true;
      enableACME = true;
    };
  };
}
```

The service needs no secrets or database for v0.1.

### Existing nginx configuration

The module does not require its built-in nginx support. An existing global nginx configuration can run the service privately and proxy to it:

```nix
{
  services.tic-tac-toe-4-in-a-row = {
    enable = true;
    package = inputs.tic-tac-toe-4-in-a-row.packages.${pkgs.stdenv.hostPlatform.system}.default;
    listenAddress = "127.0.0.1";
    port = 3000;
    nginx.enable = false;
  };

  services.nginx.virtualHosts."four.example.com" = {
    forceSSL = true;
    useACMEHost = "four.example.com";
    locations."/".proxyPass = "http://127.0.0.1:3000";
  };
}
```

The package contains both the built SPA and Effect/Bun server, so nginx only needs to proxy the selected hostname to the configured local port.
