# Command Line Interface

Note that the defaults below can be changed in your own environment by deriving your base CLI using the `getCli` function.

```text
Usage: getdotenv [options] [command]

Base CLI. All options except delimiters follow dotenv-expand rules.

Options:
  -e, --env <string>            environment name
  -p, --paths <string>          delimited list of paths to dotenv directory (default: "./")
  --paths-delimiter <string>    regex paths delimiter (default: "\\s+")
  -v, --vars <string>           delimited list KEY=VALUE pairs
  --vars-delimiter <string>     regex vars delimiter (default: "\\s+")
  --vars-assignor <string>      regex vars assignment operator (default: "=")
  -y, --dynamic-path <string>   dynamic variables path
  -o, --output-path <string>    consolidated output file, follows dotenv-expand rules using loaded env vars
  -n, --exclude-env [bool]      exclude environment-specific variables (default: false)
  -g, --exclude-global [bool]   exclude global & dynamic variables (default: false)
  -r, --exclude-private [bool]  exclude private variables (default: false)
  -u, --exclude-public [bool]   exclude public variables (default: false)
  -z, --exclude-dynamic [bool]  exclude dynamic variables (default: false)
  -l, --log [bool]              console log extracted variables (default: false)
  -x, --suppress-dotenv         suppress dotenv loading (default: false)
  -c, --command <string>        shell command string
  -s, --shell <string>          execa shell option
  --dotenv-token <string>       token indicating a dotenv file (default: ".env")
  --private-token <string>      token indicating private variables (default: "local")
  -h, --help                    display help for command

Commands:
  cmd                           execute shell command string (default command)
  help [command]                display help for command
```
