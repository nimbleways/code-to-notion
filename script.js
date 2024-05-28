const notionJsonTextInput = document.getElementById("notionMimeType");

function printOriginal(clipboardData) {
  const clipboardContentElement = document.getElementById("original");
  clipboardContentElement.innerHTML = "";
  for (const type of clipboardData.types) {
    const clipData = clipboardData.getData(type);
    let h3 = document.createElement("h3");
    h3.textContent = `Content type: ${type}`;
    clipboardContentElement.appendChild(h3);
    const resultElement = document.createElement("pre");
    resultElement.style = "white-space: pre-wrap; word-wrap: break-word;";
    resultElement.textContent = clipData;
    clipboardContentElement.appendChild(resultElement);
  }
}

function getDiffLinesFromGithubHtml(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  const rows = doc.querySelectorAll(".blob-code");
  const codeLines = [];

  let lastFlag = "none";

  rows.forEach((row) => {
    if (row.classList.contains("blob-code")) {
      // Check if this line represents addition, deletion, or none
      if (row.classList.contains("blob-code-addition")) {
        lastFlag = "added";
      } else if (row.classList.contains("blob-code-deletion")) {
        lastFlag = "removed";
      } else {
        lastFlag = "none";
      }
      // Extract code content and create object
      const line = row.innerText;
      codeLines.push({
        line,
        flag: lastFlag,
      });
    }
  });

  return codeLines;
}

function extractFileNameFromHtml(htmlString) {
    const filenamePattern = /<button data-path="([^"]+)"/;
    const filenameMatch = htmlString.match(filenamePattern);
    if (filenameMatch) {
        return filenameMatch[1];
    }
    return null;
}


function mapFileNameToLanguage(filename) {

    if (!filename) {
        return "Plain Text";
    }

    const languageToFilenameRegex = {
        Bash: /\.(sh)$/,
        CSS: /\.(css)$/,
        CSharp: /\.(cs)$/,
        Cpp: /\.(cpp)$/,
        Docker: /(?:dockerfile)$/,
        Go: /\.(go)$/,
        Groovy: /\.(groovy)$/,
        HTML: /\.(html?)$/,
        JSON: /\.(json)$/,
        Java: /\.(java)$/,
        JavaScript: /\.(jsx?)$/,
        Kotlin: /\.(kt)$/,
        Lua: /\.(lua)$/,
        Makefile: /(?:Makefile)$/,
        Markdown: /\.(md)$/,
        PHP: /\.(php)$/,
        Perl: /\.(pl)$/,
        Python: /\.(py)$/,
        Ruby: /\.(rb)$/,
        Rust: /\.(rs)$/,
        SCSS: /\.(scss)$/,
        SQL: /\.(sql)$/,
        Sass: /\.(sass)$/,
        Swift: /\.(swift)$/,
        TOML: /\.(toml)$/,
        TypeScript: /\.(tsx?)$/,
        XML: /\.(xml|csproj)$/,
        YAML: /\.(yaml|yml)$/,
    };

    for (const [language, regex] of Object.entries(languageToFilenameRegex)) {
        if (regex.test(filename.toLowerCase())) {
            return language;
        }
    }
}

function diffLinesToNotionTitle(diffLines) {
  const notionTitle = [];
  for (const lineWithDiffFlag of diffLines) {
    const notionLine = [];
    let prefix;
    if (lineWithDiffFlag.flag === "added") prefix = "+\t";
    else if (lineWithDiffFlag.flag === "removed") prefix = "-\t";
    else prefix = "\t";
    notionLine.push(prefix + lineWithDiffFlag.line + "\n");
    if (lineWithDiffFlag.flag === "added")
      notionLine.push([["h", "teal_background"]]);
    else if (lineWithDiffFlag.flag === "removed")
      notionLine.push([["h", "red_background"]]);
    notionTitle.push(notionLine);
  }
  return notionTitle;
}

function getDiffLinesFromPlainText(codeBefore, codeAfter) {
  const diffLines = Diff.diffLines(codeBefore, codeAfter);
  let codeLines = [];

  let lastFlag = "none";

  diffLines.forEach((diffLine) => {
    // Check if this line represents addition, deletion, or none
    if (diffLine.added) {
      lastFlag = "added";
    } else if (diffLine.removed) {
      lastFlag = "removed";
    } else {
      lastFlag = "none";
    }

    const lines = diffLine.value.split('\n');
    codeLines = codeLines.concat(
      lines.map( line => ({
        line,
        flag: lastFlag,
      }))
    );
  });

  return codeLines;
}

function createNotionJson(title, language) {
  const uuid = self.crypto.randomUUID();
  const notionJsonTemplate = {
    blocks: [
      {
        blockId: uuid,
        blockSubtree: {
          __version__: 3,
          block: {
            [uuid]: {
              value: {
                id: uuid,
                version: 55,
                type: "code",
                properties: {
                  title: title,
                  language: [[language]],
                },
              },
            },
          },
        },
      },
    ],
  };

  return JSON.stringify(notionJsonTemplate);
}

function fillNotionJsonTextInput(notionJson) {
  if (notionJson == null) {
    notionJsonTextInput.value = "";
    return false;
  }
  notionJsonTextInput.value = notionJson;
  selectText(notionJsonTextInput);
  return true;
}

function fillNotionJsonTextInputFromClipboard(clipboardData) {
  const htmlString = clipboardData.getData("text/html");
  if (htmlString === undefined) {
    return null;
  }

  const diffLines = getDiffLinesFromGithubHtml(htmlString);
  const title = diffLinesToNotionTitle(diffLines);
  if (title.length == 0) {
    return null;
  }
  
  const filename = extractFileNameFromHtml(htmlString);
  const language = mapFileNameToLanguage(filename);
  const notionJson = createNotionJson(title, language);

  return fillNotionJsonTextInput(notionJson);
}

function fillNotionJsonTextInputFromPlainText(codeBefore, codeAfter) {
  const diffLines = getDiffLinesFromPlainText(codeBefore, codeAfter);
  const title = diffLinesToNotionTitle(diffLines);
  if (title.length == 0) {
    return null;
  }

  const notionJson = createNotionJson(title, "Plain Text");

  return fillNotionJsonTextInput(notionJson);
}

function selectText(htmlElement) {
  if (document.selection) {
    var range = document.body.createTextRange();
    range.moveToElementText(htmlElement);
    range.select();
  } else if (window.getSelection) {
    var range = document.createRange();
    range.selectNode(htmlElement);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }
}

function showToast(message, duration = 8000) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.classList.remove('transparent');

  setTimeout(() => {
    toast.classList.add('transparent');
  }, duration);
}

function generateDiffFromPlainText() {
  const codeBeforeInput = document.getElementById("code-before");
  const codeAfterInput = document.getElementById("code-after");

  if (!fillNotionJsonTextInputFromPlainText(codeBeforeInput.value, codeAfterInput.value)) {
    return;
  }
  document.execCommand("copy");
  showToast("Notion block is copied! Just paste it in a notion page");
};

function generateDiffFromFromClipboard(clipboardData) {
  printOriginal(clipboardData);
  if (!fillNotionJsonTextInputFromClipboard(clipboardData)) {
    return;
  }
  document.execCommand("copy");
  showToast("Notion block is copied! Just paste it in a notion page");
}

function togglePlainText(checkbox) {
  const githubInput = document.getElementById("github-container");
  const plainTextInput = document.getElementById("plain-text-container");

  githubInput.classList.toggle("hidden", checkbox.checked)
  plainTextInput.classList.toggle("hidden", !checkbox.checked)
}
