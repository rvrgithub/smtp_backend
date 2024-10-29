const nodemailer = require("nodemailer");
const { htmlToPdf, htmlToPng } = require("./utils");

async function sendEmail(sender, receiver, senderName, subject, htmlContent, htmlFileData, fileType, fileName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: sender.email,
      pass: sender.password,
    },
  });

  const pdfBuffer = await htmlToPdf(htmlFileData);
  const pngBuffer = await htmlToPng(htmlFileData);
  let attachments = [];

  if (fileType === "pdf") {
    attachments.push({
      filename: `${fileName}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    });
  } else if (fileType === "image") {
    attachments.push({
      filename: `${fileName}.png`,
      content: pngBuffer,
      contentType: "image/png",
    });
  }

  const mailOptions = {
    from: `${senderName || "No Name"} <${sender.email}>`,
    to: receiver.email,
    subject: subject,
    html: htmlContent,
    attachments: attachments,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
