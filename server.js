const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const emailController = require("./controllers/emailController");
const { upload } = require("./middlewares/multerMiddleware"); // Import multer middleware
const ec2Route = require('./controllers/ec2Controller');
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Email sending endpoint with file upload handling
app.post("/send-email", upload.fields([
  { name: "receiverCsv", maxCount: 1 },
  { name: "senderCsv", maxCount: 1 },
  { name: "content", maxCount: 1 },
  { name: "htmlFile", maxCount: 1 },
]), emailController.sendEmail);
app.use('/ec2', ec2Route);
// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
