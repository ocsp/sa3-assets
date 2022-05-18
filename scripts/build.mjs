/**
 * 编译当前版本
 */
import 'dotenv/config';
import path from 'path';
import url from 'url';
import crypto from 'crypto';
import fse from 'fs-extra';
import chalk from 'chalk';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const distPath = path.join(__dirname, '../dist');
fse.ensureDirSync(distPath);
fse.emptyDirSync(distPath);

// 递归复制所有源文件路径
console.log(chalk.green('开始复制文件'));
const srcPath = path.join(__dirname, '../src');
const copyFolder = (src, dst) => {
  fse.ensureDirSync(dst);
  fse.readdirSync(src).forEach((file) => {
    const srcFile = path.join(src, file);
    let dstFile = path.join(dst, file);
    if (fse.statSync(srcFile).isDirectory()) {
      copyFolder(srcFile, dstFile);
    } else {
      // 计算文件哈希
      const hash = crypto.createHash('md5');
      const file = fse.readFileSync(srcFile);
      hash.update(file);
      const md5 = hash.digest('hex');
      // 写入文件
      const shortMD5 = md5.substring(0, 8);
      let dstFileName = path.basename(dstFile);
      dstFileName = dstFileName.replace(/\.(\w+)$/, `.${shortMD5}.$1`);
      dstFile = path.join(dst, dstFileName);
      console.log(chalk.green(`写入文件 ${dstFileName}`));
      fse.copyFileSync(srcFile, dstFile);
    }
  });
};
copyFolder(srcPath, distPath);

// 生成 HTML 页面
function desc(str) {
  return str.replace(/\\/g, '/').replace(/\/\//g, '/');
}

console.log(chalk.green('开始生成 HTML 页面'));
const pkg = fse.readJSONSync(path.resolve(__dirname, '../package.json'));
const template = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>DSRAssets</title>
</head>
<body>
{{inject}}
</body>
</html>`;
const genFolderHTML = (folder) => {
  const folderName = path.basename(folder);
  const isRootFolder = folderName === 'dist';
  let html = '';
  if (!isRootFolder) {
    html += `<li><a href="../">../</a></li>\n`;
  }
  fse.readdirSync(folder).forEach((file) => {
    const filePath = path.join(folder, file);
    const fstat = fse.statSync(filePath);
    if (fstat.isFile()) {
      html += `<li><a href="${desc(file)}" target="_blank">${file}</a></li>\n`;
    } else if (fstat.isDirectory()) {
      html += `<li><a href="${desc(file)}/">${desc(file)}/</a></li>\n`;
    }
  });
  html = `<ul>\n${html}</ul>`;
  const folderRelPath = `/${path.relative(distPath, folder)}/`;
  html = `<h3>Index of ${desc(folderRelPath)}</h3>\n${html}`;
  html = `<h1>DSRAssets</h1>\n${html}`;
  html =
    `${html}\n<footer style="margin: 1em 0">\n` +
    `v${pkg.version} - ` +
    '<a href="https://github.com/dsrkafuu/dsr-assets" target="_blank">GitHub</a>' +
    '\n</footer>';
  const fullHTML = template.replace('{{inject}}', html);
  const htmlPath = path.join(folder, 'index.html');
  console.log(chalk.green(`生成页面 ${desc(folderRelPath)}`));
  fse.writeFileSync(htmlPath, fullHTML);

  // 递归生成子文件夹的 HTML 页面
  fse.readdirSync(folder).forEach((file) => {
    const filePath = path.join(folder, file);
    if (fse.statSync(filePath).isDirectory()) {
      genFolderHTML(filePath);
    }
  });
};
genFolderHTML(distPath);
