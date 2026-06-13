package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/urfave/cli/v3"

	"github.com/pseudomuto/skedge/internal/config"
	"github.com/pseudomuto/skedge/internal/scheduler"
)

var configFlag = cli.StringFlag{
	Name:      "config",
	Aliases:   []string{"c"},
	Usage:     "The configuration file",
	Required:  true,
	TakesFile: true,
}

func main() {
	app := &cli.Command{
		Name:  "skedge",
		Usage: "A tool for generating schedules",
		Commands: []*cli.Command{
			generate(),
			validate(),
		},
	}

	if err := app.Run(context.Background(), os.Args); err != nil {
		log.Fatal(err)
	}
}

func generate() *cli.Command {
	return &cli.Command{
		Name:    "generate",
		Aliases: []string{"g", "gen"},
		Usage:   "Generate a schedule",
		Flags:   []cli.Flag{&configFlag},
		Before:  loadConfig,
		Action: func(ctx context.Context, cmd *cli.Command) error {
			cfg := cmd.Metadata[configFlag.Name].(*config.Config)
			res, err := scheduler.New(cfg).Generate(ctx)
			if err != nil {
				return err
			}

			for _, r := range res {
				fmt.Fprintln(cmd.Writer, "Res:", r)
			}

			return nil
		},
	}
}

func validate() *cli.Command {
	return &cli.Command{
		Name:    "validate",
		Aliases: []string{"v"},
		Usage:   "Validate a schedule",
		Flags:   []cli.Flag{&configFlag},
		Before:  loadConfig,
		Action: func(ctx context.Context, cmd *cli.Command) error {
			fmt.Fprintln(cmd.Writer, "Config file:", cmd.Metadata[configFlag.Name])
			return nil
		},
	}
}

func loadConfig(ctx context.Context, cmd *cli.Command) (context.Context, error) {
	f, err := os.Open(cmd.String(configFlag.Name))
	if err != nil {
		return nil, err
	}
	defer func() { _ = f.Close() }()

	conf, err := config.Load(f)
	if err != nil {
		return ctx, err
	}

	cmd.Metadata[configFlag.Name] = conf
	return ctx, nil
}
