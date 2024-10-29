const csv = require("csv-parser");
const { Readable } = require("stream");

// Convert buffer to readable stream
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // No more data to send
  return stream;
}

// Helper function to convert CSV buffer to JSON for sender
async function csvToJsonSender(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = bufferToStream(buffer);

    stream
      .pipe(csv({ headers: false }))
      .on("data", (data) => {
        if (data && Object.keys(data).length >= 2) {
          results.push({
            email: data[0] || "", // First element as email
            password: data[1] || "", // Second element as password
          });
        }
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

// Helper function to convert CSV buffer to JSON for receiver
async function csvToJsonReceiver(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = bufferToStream(buffer);

    stream
      .pipe(csv({ headers: false }))
      .on("data", (data) => {
        if (data && Object.keys(data).length) {
          results.push({
            email: data[0] || "",
            name: data[1] || "",
            content: data[2] || "",
            c3: data[3] || "",
            c4: data[4] || "",
            c5: data[5] || "",
            c6: data[6] || "",
          });
        }
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

module.exports = { csvToJsonSender, csvToJsonReceiver };
