{
  description = "Tic Tac Toe: 4 in a Row";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        package = pkgs.callPackage ./nix/package.nix { inherit (nixpkgs) lib; };
      in
      {
        packages.default = package;
        devShells.default = import ./nix/devshell.nix { inherit pkgs; };
        checks.default = package;
      }
    )
    // {
      nixosModules.default = import ./nix/module.nix self;
    };
}
