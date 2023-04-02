# Command Line Interface

```text
Usage: getdotenv [options] [-- [command]]

Load environment variables with a cascade of environment-aware
dotenv files. You can:

* Specify the directories containing your dotenv files.
* Define dynamic variables progressively in terms of other variables and
  other logic.
* Specify a consolidated output file path.
* Load variables for a specific environment or none.
* Specify a default environment, override the default with an existing
  environment variable, and override both with a direct setting.
* Exclude public, private, global, environment-specific, or dynamic variables.
* Execute a &&-delimited series of shell commands after loading variables.
* Place the shell commands inside the invocation to support npm script
  arguments for other options.
* Specify the token that identifies dotenv files (e.g. '.env').
* Specify the token that identifies private vatiables (e.g. '.local').

Options:
  -p, --paths <strings...>           space-delimited paths to dotenv directory (default './')
  -y, --dynamic-path <string>        dynamic variables path
  -o, --output-path <string>         consolidated output file
  -d, --defaultEnvironment <string>  default environment (prefix with $ to use environment variable)
  -e, --environment <string>         designated environment (prefix with $ to use environment variable)
  -n, --exclude-env                  exclude environment-specific variables (default: false)
  -g, --exclude-global               exclude global & dynamic variables (default: false)
  -r, --exclude-private              exclude private variables (default: false)
  -u, --exclude-public               exclude public variables (default: false)
  -z, --exclude-dynamic              exclude dynamic variables (default: false)
  -c, --command <string>             shell command string
  -l, --log                          log extracted variables (default: false)
  -t, --dotenv-token <string>        token indicating a dotenv file (default: '.env')
  -i, --private-token <string>       token indicating private variables (default: 'local')
  -h, --help                         display help for command
```
