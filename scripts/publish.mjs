// #!/usr/bin/env zx
/* global $ */
/**
 * 发布新版本至 GitHub
 */
import 'dotenv/config';
import path from 'path';
import url from 'url';
import fse from 'fs-extra';
import chalk from 'chalk';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// 防止 Windows 上会产生意外的引号 $'' 转译
$.quote = (s) => s;

// GitHub 登录
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

// 检查已发布的版本
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

// 写入新版本
const newVersion = Number.parseInt(latestRelease[1].split('.')[0]) + 1;
const pkgPath = path.resolve(__dirname, '../package.json');
const pkg = fse.readJSONSync(pkgPath);
pkg.version = `${newVersion}.0.0`;
fse.writeJSONSync(pkgPath, pkg, { spaces: 2 });
console.log(chalk.green('已写入最新版本号 v' + pkg.version));

// 发布新版本
const note = `${new Date().toISOString()}`;
try {
  await $`git add .`;
  await $`git commit -m "${note}"`;
  await $`git tag v${pkg.version}`;
  await $`git pull --rebase -X theirs`;
  await $`git push origin`;
  await $`git push origin --tags`;
} catch (e) {
  console.error(e);
  console.log(chalk.red('无法提交最新文件'));
  process.exit(1);
}
console.log(chalk.green(`已为版本 v${pkg.version} 提交最新文件`));
const release = await $`gh release create v${pkg.version} --notes ""`;
const ghUrl = (release.stdout || release.stderr || '').trim();
if (!ghUrl || !/github.com/.exec(ghUrl)) {
  console.log(chalk.red('发布新版本失败'));
  process.exit(1);
}
console.log(chalk.green(`版本已发布到 ${ghUrl}`));
