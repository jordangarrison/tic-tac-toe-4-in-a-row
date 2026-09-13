{ pkgs, lib }:

let
  pname = "tic-tac-toe-4-in-a-row";
  version = "0.1.0";
  source = lib.cleanSourceWith {
    src = ./..;
    filter = path: type:
      let
        relative = lib.removePrefix (toString ./.. + "/") (toString path);
      in
      !(lib.hasPrefix "node_modules/" relative)
      && !(lib.hasPrefix "dist/" relative)
      && !(lib.hasPrefix "repos/" relative)
      && !(lib.hasPrefix ".git/" relative);
  };

  bunDeps = pkgs.stdenvNoCC.mkDerivation {
    name = "${pname}-bun-deps-${version}";
    src = source;
    nativeBuildInputs = [ pkgs.bun ];

    buildPhase = ''
      export HOME=$(mktemp -d)
      bun install --frozen-lockfile --ignore-scripts
    '';

    installPhase = ''
      mkdir -p $out
      cp -r node_modules $out/node_modules
    '';

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash = "sha256-PvEiMjofxSgrzCeKTKWe0O288Zq564i1Rla/ESxIl3Q=";
  };
in
pkgs.stdenvNoCC.mkDerivation {
  inherit pname version;
  src = source;

  nativeBuildInputs = [ pkgs.bun pkgs.makeWrapper pkgs.nodejs ];

  buildPhase = ''
    runHook preBuild
    cp -r ${bunDeps}/node_modules node_modules
    chmod -R u+w node_modules
    patchShebangs node_modules
    bun run build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/${pname} $out/bin
    cp -r dist $out/share/${pname}/dist
    makeWrapper ${pkgs.bun}/bin/bun $out/bin/${pname} \
      --add-flags "$out/share/${pname}/dist/server/index.js" \
      --set-default STATIC_ROOT "$out/share/${pname}/dist"
    runHook postInstall
  '';

  meta = {
    description = "Local two-player four-in-a-row scoring game";
    license = lib.licenses.mit;
    mainProgram = pname;
  };
}
