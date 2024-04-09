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

function parseGithubHtml(htmlString) {
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

function createNotionTitleProperty(htmlString) {
  const linesWithDiffFlag = parseGithubHtml(htmlString);
  const notionTitle = [];
  for (const lineWithDiffFlag of linesWithDiffFlag) {
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

function getNotionJson(clipboardData) {
  const htmlString = clipboardData.getData("text/html");

  if (htmlString === undefined) {
    return null;
  }

  const title = createNotionTitleProperty(htmlString);
  if (title.length == 0) {
    return null;
  }
  const uuid = self.crypto.randomUUID();

  const filename = extractFileNameFromHtml(htmlString);
  const language = mapFileNameToLanguage(filename);

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

function fillNotionJsonTextInput(clipboardData) {
  const notionJson = getNotionJson(clipboardData);
  if (notionJson == null) {
    notionJsonTextInput.value = "";
    return false;
  }
  notionJsonTextInput.value = getNotionJson(clipboardData);
  selectText(notionJsonTextInput);
  return true;
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
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

document.addEventListener("paste", function (e) {
  if (!e.clipboardData || !e.clipboardData.getData || !e.clipboardData.types) {
    return;
  }
  printOriginal(e.clipboardData);
  if (!fillNotionJsonTextInput(e.clipboardData)) {
    return;
  }
  document.execCommand("copy");
  showToast("Notion block is copied! Just paste it in a notion page");
  e.preventDefault();
});

document.addEventListener("copy", function (event) {
  if (event.target !== notionJsonTextInput) {
    return;
  }
  event.clipboardData.setData(
    "text/_notion-blocks-v3-production",
    notionJsonTextInput.value,
  );
  event.preventDefault();
});
