self:
{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.tic-tac-toe-4-in-a-row;
  addressForUrl = if lib.hasInfix ":" cfg.listenAddress then "[${cfg.listenAddress}]" else cfg.listenAddress;
in
{
  options.services.tic-tac-toe-4-in-a-row = {
    enable = lib.mkEnableOption "Tic Tac Toe: 4 in a Row";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.system}.default;
      defaultText = lib.literalExpression "self.packages.\${pkgs.system}.default";
      description = "The game package to run.";
    };

    host = lib.mkOption {
      type = lib.types.str;
      default = "localhost";
      example = "four.example.com";
      description = "Public hostname for the game.";
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 3000;
      description = "Port on which the Bun server listens.";
    };

    listenAddress = lib.mkOption {
      type = lib.types.str;
      default = "127.0.0.1";
      description = "Address on which the Bun server listens.";
    };

    openFirewall = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether to open the application port directly.";
    };

    nginx = {
      enable = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Whether to configure an nginx reverse proxy.";
      };

      enableACME = lib.mkOption {
        type = lib.types.bool;
        default = true;
        description = "Whether nginx should obtain a Let's Encrypt certificate.";
      };
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = !(cfg.nginx.enable && cfg.host == "localhost");
        message = "services.tic-tac-toe-4-in-a-row: set a public host when nginx is enabled.";
      }
      {
        assertion = !(cfg.openFirewall && cfg.nginx.enable);
        message = "services.tic-tac-toe-4-in-a-row: use either openFirewall or nginx, not both.";
      }
    ];

    users.users.tic-tac-toe = {
      isSystemUser = true;
      group = "tic-tac-toe";
    };
    users.groups.tic-tac-toe = { };

    networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ cfg.port ];

    systemd.services.tic-tac-toe-4-in-a-row = {
      description = "Tic Tac Toe: 4 in a Row";
      wantedBy = [ "multi-user.target" ];
      wants = [ "network-online.target" ];
      after = [ "network-online.target" ];

      environment = {
        HOST = cfg.listenAddress;
        PORT = toString cfg.port;
      };

      serviceConfig = {
        Type = "exec";
        User = "tic-tac-toe";
        Group = "tic-tac-toe";
        ExecStart = lib.getExe cfg.package;
        Restart = "on-failure";
        RestartSec = 5;
        DynamicUser = false;
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        NoNewPrivileges = true;
        PrivateDevices = true;
        RestrictAddressFamilies = [ "AF_UNIX" "AF_INET" "AF_INET6" ];
        RestrictNamespaces = true;
        RestrictRealtime = true;
        ProtectControlGroups = true;
        ProtectKernelModules = true;
        ProtectKernelTunables = true;
        LockPersonality = true;
        CapabilityBoundingSet = "";
      };
    };

    services.nginx = lib.mkIf cfg.nginx.enable {
      enable = true;
      recommendedProxySettings = true;
      recommendedTlsSettings = true;
      recommendedOptimisation = true;
      recommendedGzipSettings = true;

      virtualHosts.${cfg.host} = {
        forceSSL = cfg.nginx.enableACME;
        enableACME = cfg.nginx.enableACME;
        locations."/" = {
          proxyPass = "http://${addressForUrl}:${toString cfg.port}";
        };
      };
    };
  };
}
