const playwright = require("playwright-aws-lambda");

const buildUri = ({ queryStringParameters = {} }) => {
  const {
    cardpath = "https://stb-socialcards.netlify.app",
    id = "social-card",
    title = "Stacking the Bricks",
    width,
    height,
    author_avatar = "https://stackingthebricks.com/icon-256.png",
    author_name = ""
  } = queryStringParameters;

  const dimensions = width && height ? `&width=${width}&height=${height}` : "";

  return {
    id,
    path: `${cardpath}?id=${id}&title=${title}${dimensions}&author_avatar=${author_avatar}&&author_name=${author_name}`,
  };
};

const getBoundingSize = (uri) => {
  const cardBox = document.getElementById(uri.id);
  if (typeof cardBox === "undefined" || cardBox === null)
    return { x: 0, y: 0, width: 1920, height: 1080 };
  const { x, y, width, height } = cardBox.getBoundingClientRect();
  return { x, y, width, height };
};

exports.handler = async function (event) {
  try {
    const uri = buildUri(event);
    console.log("uri", uri.path);
    await playwright.loadFont(
        "https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf"
      );
    const browser = await playwright.launchChromium();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({
      width: 1920,
      height: 1080,
    });
    await page.goto(uri.path);

    await new Promise((resolve) => setTimeout(resolve, "200"));
    const boundingRect = await page.evaluate(getBoundingSize, uri);
    const screenshotBuffer = await page.screenshot({ clip: boundingRect });
    await browser.close();
    const base64Image = screenshotBuffer.toString("base64");

    return {
      isBase64Encoded: true,
      statusCode: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": `${screenshotBuffer.length}`,
      },
      body: base64Image,
    };
  } catch (error) {
    console.log(error);
    return { statusCode: error.statusCode || 500, body: error.message };
  }
};
