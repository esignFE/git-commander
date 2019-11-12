const fs = require("fs");

// if (!fs.existsSync(`./CHANGELOG.md`)) {
//   fs.writeFileSync(`./CHANGELOG.md`, '')
// }

// fs.writeFileSync(`./CHANGELOG.md`, `## 0.9.9 (2019-08-09)`)

function isHaveMd(path) {
  if (!fs.existsSync(`./examples/docs/CHANGELOG.md`)) {
    fs.writeFileSync(`./examples/docs/CHANGELOG.md`, "");
  }
  if (!fs.existsSync(`./${path}/CHANGELOG.md`)) {
    fs.writeFileSync(`./${path}/CHANGELOG.md`, "");
  }
}

function createContent(package, packageInfo, packageJsonPath) {
  let classAry = [
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "chore",
    "build",
    "revert",
    "BreakingChanges"
  ];

  let classAryHash = {
    fix: "### Bug Fixes",
    feat: "### Features",
    docs: "### Docs",
    style: "### Style",
    refactor: "### Refactor",
    perf: "### Perf",
    test: "### Test",
    chore: "### Chore",
    build: "### Build",
    revert: "### Revert",
    BreakingChanges: "### BreakingChanges"
  };

  let classObj = {};

  let fileContent;
  if (packageJsonPath)
    fileContent = fs.readFileSync(`${packageJsonPath}`).toString();
  else
    fileContent = fs
      .readFileSync(`./${packageInfo.packagePath}/CHANGELOG.md`)
      .toString();

  let hasVersion = false;
  hasVersion = fileContent.indexOf(
    `## ${packageInfo.name} v${packageInfo.version}`
  );

  if (hasVersion > -1) {
    //如果已存在相同版本(适用于同一个版本未发布的情况下,多次commit)
    let startIndex, endIndex, fileContentAry;
    fileContentAry = fileContent.split("\n");
    startIndex = fileContentAry.findIndex(
      item =>
        item.indexOf(`## ${packageInfo.name} v${packageInfo.version}`) > -1
    );
    endIndex = fileContentAry.findIndex((item, index) => {
      if (index <= startIndex) return false;
      if (index === fileContentAry.length - 1) return true;
      return /\#\# .* v.* \(.{4}\-.{2}\-.{2}\)/.test(item);
    });
    if (endIndex !== fileContentAry.length - 1) endIndex -= 1;

    classAry.forEach(className => {
      classObj[`${className}`] = [];
      classObj[`${className}StartIndex`] = fileContentAry.findIndex(
        (item, index) => {
          if (index < startIndex) return false;
          if (index > endIndex) return false;
          else return item.indexOf(`${classAryHash[className]}`) > -1;
        }
      );

      if (classObj[`${className}StartIndex`] > -1) {
        classObj[`${className}EndIndex`] = fileContentAry.findIndex(
          (item, index) => {
            if (index <= classObj[`${className}StartIndex`]) return false;
            else if (index === fileContentAry.length - 1) return true;
            else return /^#{1,3}/.test(item);
          }
        );
        if (classObj[`${className}EndIndex`] !== fileContentAry.length - 1)
          classObj[`${className}EndIndex`] -= 1;
        classObj[`${className}`].push(
          ...fileContentAry.slice(
            classObj[`${className}StartIndex`] + 1,
            classObj[`${className}EndIndex`] + 1
          )
        );
      }
    });
    for (let obj of packageInfo.commitInfo) {
      if (!classObj[`${obj.commitType}`]) continue;
      let str;
      str = `* **${obj.fileName}:** ${obj.commitMessage} ([${obj.shortCommitId}](${packageInfo.gitUrl}/commit/${obj.shortCommitId}))`;
      classObj[`${obj.commitType}`].push(str);
      if (obj.BreakingChangeMessage.length > 0) {
        str = `* **${obj.fileName}:** ${obj.BreakingChangeMessage} ([${obj.shortCommitId}](${packageInfo.gitUrl}/commit/${obj.shortCommitId}))`;
        classObj.BreakingChanges.push(str);
      }
    }

    let content = "";
    classAry.forEach(className => {
      classObj[`${className}`] = classObj[`${className}`].filter(
        item => item !== ""
      );
      classObj[`${className}`] = Array.from(new Set(classObj[`${className}`]));
      classObj[`${className}`] = classObj[`${className}`].join("\n");
      if (classObj[`${className}`].length > 1) {
        content =
          content +
          (classObj[`${className}`].length > 0
            ? `\n${classAryHash[className]}\n${classObj[`${className}`]}\n`
            : "");
      }
    });
    fileContentAry = fileContentAry
      .slice(startIndex, startIndex + 1)
      .concat([content])
      .concat(fileContentAry.slice(endIndex + 1));
    fileContent = fileContentAry.join("\n");
    return { fileContent, hasVersion: true };
  } else {
    classAry.forEach(className => {
      classObj[`${className}`] = [];
    });

    for (let obj of packageInfo.commitInfo) {
      let str;
      str = `* **${obj.fileName}:** ${obj.commitMessage} ([${obj.shortCommitId}](${packageInfo.gitUrl}/commit/${obj.shortCommitId}))`;
      classObj[`${obj.commitType}`].push(str);
      if (obj.BreakingChangeMessage.length > 0) {
        str = `* **${obj.fileName}:** ${obj.BreakingChangeMessage} ([${obj.shortCommitId}](${packageInfo.gitUrl}/commit/${obj.shortCommitId}))`;
        classObj.BreakingChanges.push(str);
      }
    }

    let content = `## ${packageInfo.name} v${packageInfo.version} (${packageInfo.time})`;
    classAry.forEach(className => {
      classObj[`${className}`] = classObj[`${className}`].join("\n");
      content =
        content +
        (classObj[`${className}`].length > 0
          ? `\n\n${classAryHash[className]}\n${classObj[`${className}`]}`
          : "");
    });
    content = content + "\n\n";
    return { content, fileContent, hasVersion: false };
  }
}

module.exports = function write_ChangeLog(
  ChangeLogOptions,
  package,
  packageInfo
) {
  isHaveMd(packageInfo.packagePath);
  let contentObj = createContent(package, packageInfo);

  if (!contentObj.hasVersion) {
    fs.writeFileSync(
      `./${packageInfo.packagePath}/CHANGELOG.md`,
      contentObj.content + contentObj.fileContent
    );
    root_CHANGELOG_content = fs
      .readFileSync(`./examples/docs/CHANGELOG.md`)
      .toString();

    fs.writeFileSync(
      `./examples/docs/CHANGELOG.md`,
      contentObj.content + "\n" + root_CHANGELOG_content
    );
  } else {
    fs.writeFileSync(
      `./${packageInfo.packagePath}/CHANGELOG.md`,
      contentObj.fileContent
    );

    contentObj = createContent(
      package,
      packageInfo,
      `./examples/docs/CHANGELOG.md`
    );
    if (!contentObj.hasVersion) {
      root_CHANGELOG_content = fs
        .readFileSync(`./examples/docs/CHANGELOG.md`)
        .toString();

      fs.writeFileSync(
        `./examples/docs/CHANGELOG.md`,
        contentObj.content + root_CHANGELOG_content
      );
    } else {
      fs.writeFileSync(`./examples/docs/CHANGELOG.md`, contentObj.fileContent);
    }
  }
};
