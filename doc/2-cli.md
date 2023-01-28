# Command Line Interface

```text
Usage: getdotenv [options] [-- [command]]

Load environment variables with a cascade of environment-aware
dotenv files. You can:

* Specify the directories containing your dotenv files.
* Specify the token that identifies dotenv files (e.g. '.env').
* Specify the token that identifies private vatiables (e.g. '.local').
* Specify a default environment, override the default with an existing
  environment variable, and override both with a direct setting.
* Exclude public or private variables.
* Execute a shell command after loading variables.
* Place the shell command inside the invocation to support npm script
  arguments for other options.

Options:
  -p, --paths <strings...>           space-delimited paths to dotenv directory (default './')
  -t, --dotenv-token <string>        token indicating a dotenv file (default: '.env')
  -i, --private-token <string>       token indicating private variables (default: 'local')
  -d, --defaultEnvironment <string>  default environment
  -e, --environment <string>         designated environment
  -v, --variable <string>            environment from variable
  -r, --exclude-private              exclude private variables (default: false)
  -u, --exclude-public               exclude public variables (default: false)
  -c, --command <string>             shell command string
  -l, --log                          log extracted variables (default: false)
  -h, --help                         display help for command
```
