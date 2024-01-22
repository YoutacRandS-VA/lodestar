import {Options, Argv} from "yargs";

export interface CliExample {
  command: string;
  title?: string;
  description?: string;
}

export interface CliOptionDefinition extends Options {
  example?: Omit<CliExample, "title">;
}

export type CliCommandOptions<OwnArgs> = Required<{
  [K in keyof OwnArgs]: undefined extends OwnArgs[K]
    ? CliOptionDefinition
    : // If arg cannot be undefined it must specify a default value
      CliOptionDefinition & Required<Pick<Options, "default">>;
}>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CliCommand<OwnArgs = Record<never, never>, ParentArgs = Record<never, never>, R = any> {
  command: string;
  describe: string;
  /**
   * The folder in docs/pages that the cli.md should be placed in.  If not provided no
   * cli flags page will be generated for the command
   */
  docsFolder?: string;
  examples?: CliExample[];
  options?: CliCommandOptions<OwnArgs>;
  // 1st arg: any = free own sub command options
  // 2nd arg: subcommand parent options is = to this command options + parent options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subcommands?: CliCommand<any, OwnArgs & ParentArgs>[];
  handler?: (args: OwnArgs & ParentArgs) => Promise<R>;
}

/**
 * Register a CliCommand type to yargs. Recursively registers subcommands too.
 * @param yargs
 * @param cliCommand
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerCommandToYargs(yargs: Argv, cliCommand: CliCommand<any, any>): void {
  yargs.command({
    command: cliCommand.command,
    describe: cliCommand.describe,
    builder: (yargsBuilder) => {
      yargsBuilder.options(cliCommand.options || {});
      for (const subcommand of cliCommand.subcommands || []) {
        registerCommandToYargs(yargsBuilder, subcommand);
      }
      if (cliCommand.examples) {
        for (const example of cliCommand.examples) {
          yargsBuilder.example(`$0 ${example.command}`, example.description ?? "");
        }
      }
      return yargs;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    handler: cliCommand.handler || function emptyHandler(): void {},
  });
}
