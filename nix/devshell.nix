{ pkgs }:

pkgs.mkShell {
  packages = with pkgs; [
    bun
    git
  ];

  shellHook = ''
    echo "Tic Tac Toe: 4 in a Row dev shell"
    echo "  bun: $(bun --version)"
    echo ""
    echo "Run 'bun install' then 'bun run dev'."
  '';
}
