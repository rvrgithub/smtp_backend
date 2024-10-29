const puppeteer = require("puppeteer");

async function htmlToPdf(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();
  return pdfBuffer;
}

// Function to convert HTML to PNG
async function htmlToPng(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const imageBuffer = await page.screenshot({ type: "png" });
  await browser.close();
  return imageBuffer;
}

function generateRandomString({ length, lettersLower, lettersUpper, numbers }) {
  const lowerChars = "abcdefghijklmnopqrstuvwxyz";
  const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numberChars = "0123456789";

  let charPool = "";

  if (lettersLower) charPool += lowerChars;
  if (lettersUpper) charPool += upperChars;
  if (numbers) charPool += numberChars;

  if (charPool === "") {
    throw new Error("At least one character type must be selected.");
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charPool.length);
    result += charPool[randomIndex];
  }

  return result;
}

function transformArrayToObject(array) {
  return array.reduce((acc, item) => {
    const { tagName, ...rest } = item;
    acc[tagName] = generateRandomString(rest);
    return acc;
  }, {});
}

function replaceDynamicPlaceholders(content, data) {
  for (const key in data) {
    const pattern = new RegExp(`{{${key}}}`, "g");
    content = content?.replace(pattern, data[key]);
  }
  return content;
}

module.exports = {
  htmlToPdf,
  htmlToPng,
  generateRandomString,
  transformArrayToObject,
  replaceDynamicPlaceholders,
};
