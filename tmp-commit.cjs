const { execSync } = require('child_process');
const cwd = 'D:/repos/karmaniverous/get-dotenv';
const run = (c) => console.log(execSync(c, { cwd, encoding: 'utf8' }));
run('git add -A');
run('git commit -m "docs(aws): clarify afterResolve loginOnDemand comment rationale"');
run('git push origin bugfix/login-on-demand-scope');
