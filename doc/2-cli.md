# Command Line Interface

Note that the defaults below can be changed in your own environment by deriving your base CLI using the `getDotenvCli` function or placing a `getdotenv.options.json` file in your project root directory.

```text
Usage: getdotenv [options] [command]

Base CLI.

Options:
  -e, --env <string>                  target environment
  -v, --vars <string>                 dotenv-expanded delimited key-value pairs: KEY1=VAL1 KEY2=VAL2 (default: "")
  -c, --command <string>              dotenv-expanded shell command string
  -o, --output-path <string>          consolidated output file, follows dotenv-expand rules using loaded env vars
  -p, --load-process                  load variables to process.env ON (default)
  -P, --load-process-off              load variables to process.env OFF
  -a, --exclude-all                   exclude all dotenv variables from loading ON
  -A, --exclude-all-off               exclude all dotenv variables from loading OFF (default)
  -z, --exclude-dynamic               exclude dynamic dotenv variables from loading ON
  -Z, --exclude-dynamic-off           exclude dynamic dotenv variables from loading OFF (default)
  -n, --exclude-env                   exclude environment-specific dotenv variables from loading
  -N, --exclude-env-off               exclude environment-specific dotenv variables from loading OFF (default)
  -g, --exclude-global                exclude global dotenv variables from loading ON
  -G, --exclude-global-off            exclude global dotenv variables from loading OFF (default)
  -r, --exclude-private               exclude private dotenv variables from loading ON
  -R, --exclude-private-off           exclude private dotenv variables from loading OFF (default)
  -u, --exclude-public                exclude public dotenv variables from loading ON
  -U, --exclude-public-off            exclude public dotenv variables from loading OFF (default)
  -l, --log                           console log loaded variables ON
  -L, --log-off                       console log loaded variables OFF (default)
  -d, --debug                         debug mode ON
  -D, --debug-off                     debug mode OFF (default)
  --default-env <string>              default target environment (default: "dev")
  --dotenv-token <string>             dotenv-expanded token indicating a dotenv file (default: ".env")
  --dynamic-path <string>             dynamic variables path (default: "./env/dynamic.js")
  --paths <string>                    dotenv-expanded delimited list of paths to dotenv directory (default: "./ ./env")
  --paths-delimiter <string>          paths delimiter string (default: " ")
  --paths-delimiter-pattern <string>  paths delimiter regex pattern (default: "\\s+")
  --private-token <string>            dotenv-expanded token indicating private variables (default: "local")
  --vars-delimiter <string>           vars delimiter string (default: " ")
  --vars-delimiter-pattern <string>   vars delimiter regex pattern (default: "\\s+")
  --vars-assignor <string>            vars assignment operator string (default: "=")
  --vars-assignor-pattern <string>    vars assignment operator regex pattern (default: "=")
  -h, --help                          display help for command

Commands:
  cmd                                 execute shell command string (default command)
  help [command]                      display help for command
```
