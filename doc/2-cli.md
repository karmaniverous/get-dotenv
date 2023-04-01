# Command Line Interface

```text
Usage: getdotenv [options] [-- [command]]

Load environment variables with a cascade of environment-aware
dotenv files. You can:

* Specify the directories containing your dotenv files.
* Specify the token that identifies dotenv files (e.g. '.env').
* Specify the token that identifies private vatiables (e.g. '.local').
* Load variables for a specific environment or none.
* Specify a default environment, override the default with an existing
  environment variable, and override both with a direct setting.
* Exclude public or private variables.
* Exclude global & dynamic or environment-specific variables.
* Define dynamic variables progressively in terms of other variables and
  other logic.
* Execute a &&-delimited series of shell commands after loading variables.
* Place the shell commands inside the invocation to support npm script
  arguments for other options.

Options:
  -p, --paths <strings...>           space-delimited paths to dotenv directory (default './')
  -t, --dotenv-token <string>        token indicating a dotenv file (default: '.env')
  -i, --private-token <string>       token indicating private variables (default: 'local')
  -d, --defaultEnvironment <string>  default environment
  -e, --environment <string>         designated environment
  -v, --variable <string>            environment from variable
  -n, --exclude-env                  exclude environment-specific variables (default: false)
  -g, --exclude-global               exclude global & dynamic variables (default: false)
  -r, --exclude-private              exclude private variables (default: false)
  -u, --exclude-public               exclude public variables (default: false)
  -y, --dynamic-path <string>        dynamic variables path
  -c, --command <string>             shell command string
  -l, --log                          log extracted variables (default: false)
  -h, --help                         display help for command
```
