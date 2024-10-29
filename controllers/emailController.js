const { csvToJsonSender, csvToJsonReceiver } = require("../helpers/csvHelper");
const { sendEmail } = require("../helpers/emailHelper");
const { generateRandomString, transformArrayToObject, replaceDynamicPlaceholders } = require("../helpers/utils");

const sendEmailHandler = async (req, res) => {
  const startTime = Date.now(); // Start timing

  try {
    const { fileType, newTags, subject, fileName, senderName } = req.body;
    const receiverCsv = req.files["receiverCsv"]?.[0];
    const senderCsv = req.files["senderCsv"]?.[0];
    const contentFile = req.files["content"]?.[0]; // HTML content
    const htmlFile = req.files["htmlFile"]?.[0]; // Attachment

    const receiverData = receiverCsv
      ? await csvToJsonReceiver(receiverCsv.buffer)
      : [];
    const senderData = senderCsv
      ? await csvToJsonSender(senderCsv.buffer)
      : [];

    let receiverUpdateData = receiverData.map((item) => ({
      ...item,
      ...transformArrayToObject(JSON.parse(newTags)),
      id: generateRandomString({ length: 10, lettersLower: false, lettersUpper: false, numbers: true }),
    }));

    const results = {
      totalSender: senderData.length,
      totalReceiver: receiverUpdateData.length,
      totalReceiverFailed: 0,
      totalSenderFailed: 0,
      failedReasons: [],
    };

    for (const sender of senderData) {
      for (const receiver of receiverUpdateData) {
        const subjectData = replaceDynamicPlaceholders(subject, receiver);
        const fileNameData = replaceDynamicPlaceholders(fileName, receiver);
        const senderNameData = replaceDynamicPlaceholders(senderName, receiver);

        let content = contentFile ? contentFile.buffer.toString() : "";
        content = replaceDynamicPlaceholders(content, receiver);
        let htmlFileData = htmlFile ? htmlFile.buffer.toString() : "";
        htmlFileData = replaceDynamicPlaceholders(htmlFileData, receiver);

        try {
          await sendEmail(sender, receiver, senderNameData, subjectData, content, htmlFileData, fileType, fileNameData);
        } catch (error) {
          console.error("Error sending email:", error);
          results.totalSenderFailed += 1;
          results.failedReasons.push({ email: receiver.email, reason: error.message });
        }
      }
    }

    const endTime = Date.now(); // End timing
    const totalTime = (endTime - startTime) / 1000 
    res.status(200).json({
      message: "Emails processed",
      data: {...results,totalTime},
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { sendEmail: sendEmailHandler };
