// #!/usr/bin/env zx
import dotenv from 'dotenv';
import fse from 'fs-extra';

dotenv.config();
$.quote = (s) => s; // 防止 Windows 上会产生意外的引号 $'' 转译

if (!process.env.GH_TOKEN) {
  console.log(chalk.red('未设定 GH_TOKEN 环境变量'));
  process.exit(1);
}
const login = await $`gh auth status`;
if (!/Logged in to github.com as/.exec(login.stdout || login.stderr)) {
  console.log(chalk.red('GitHub CLI 登陆失败'));
  process.exit(1);
}
console.log(chalk.green('GitHub CLI 登陆成功'));

const releases = await $`gh release list`;
let latestRelease = [];
// 无已发布的版本
if (
  releases.stdout === '' &&
  releases.stderr === '' &&
  releases.exitCode === 0
) {
  latestRelease = ['', '0.0.0'];
}
// 有已发布的版本
else {
  latestRelease = /v(\d+\.\d+\.\d+)[ \t]+Latest/.exec(
    releases.stdout || releases.stderr
  );
  if (
    !latestRelease ||
    typeof latestRelease[1] !== 'string' ||
    latestRelease[1].split('.').length !== 3
  ) {
    console.log(chalk.red('无法获取最新版本号'));
    process.exit(1);
  }
}
// 写入版本
const newVersion = Number.parseInt(latestRelease[1].split('.')[0]) + 1;
const pkg = fse.readJSONSync('./package.json');
pkg.version = `${newVersion}.0.0`;
fse.writeJSONSync('./package.json', pkg, { spaces: 2 });
console.log(chalk.green('已写入最新版本号 v' + pkg.version));

const note = `${new Date().toISOString()}`;
try {
  await $`git add .`;
  await $`git commit -m "${note}"`;
  await $`git tag v${pkg.version}`;
  await $`git pull --rebase -X theirs`;
  await $`git push origin`;
} catch {
  console.log(chalk.red('无法提交最新文件'));
  process.exit(1);
}
console.log(chalk.green(`已为版本 v${pkg.version} 提交最新文件`));

const release = await $`gh release create v${pkg.version} --notes ""`;
const url = (release.stdout || release.stderr || '').trim();
if (!url || !/github.com/.exec(url)) {
  console.log(chalk.red('发布新版本失败'));
  process.exit(1);
}

const cdnUrl = url
  .replace('github.com', 'cdn.jsdelivr.net/gh')
  .replace('/releases/tag/v', '@')
  .replace(/\.0\.0.*$/, '.0.0/');
console.log(chalk.green(`版本已发布到 ${cdnUrl}`));
