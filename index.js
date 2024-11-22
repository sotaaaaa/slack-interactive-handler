require("dotenv").config();

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const FormData = require("form-data");

const app = express();

// Phân tích dữ liệu từ Slack (đảm bảo đọc dữ liệu đúng kiểu)
app.use(bodyParser.urlencoded({ extended: true })); // Để phân tích application/x-www-form-urlencoded
app.use(bodyParser.json()); // Cung cấp hỗ trợ cho các yêu cầu JSON nếu cần

const GITLAB_TOKEN = process.env.GITLAB_TOKEN; // Sử dụng biến môi trường
const GITLAB_PROJECT_ID = process.env.GITLAB_PROJECT_ID; // Sử dụng biến môi trường
const APP_PORT = process.env.PORT || 3000; // Nếu không có PORT trong .env, dùng mặc định 3000

app.post("/slack-interactive", async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload); // Đảm bảo `req.body.payload` là chuỗi JSON
    const value = payload.actions[0].value;

    // Tách action và branch từ giá trị Slack gửi lên
    const actionValueParts = value.split("-");
    const actionValue = actionValueParts[0];
    const branch = actionValueParts[1];

    let pipelineTrigger = "";

    switch (actionValue) {
      case "build_only":
        pipelineTrigger = "build_expo";
        break;
      case "build_testflight":
        pipelineTrigger = "upload_to_testflight";
        break;
      case "build_google":
        pipelineTrigger = "upload_to_google_play";
        break;
      default:
        return res.status(200).send("No action selected.");
    }

    // Sử dụng FormData để gửi dữ liệu dạng multipart/form-data
    const formData = new FormData();
    formData.append("token", GITLAB_TOKEN);
    formData.append("ref", branch);
    formData.append("variables[ACTION]", pipelineTrigger);

    // Gửi request đến API GitLab để trigger pipeline
    await axios.post(
      `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/trigger/pipeline`,
      formData,
      { headers: formData.getHeaders() }
    );

    // Cập nhật message trên Slack (ẩn button sau khi nhấn)
    const messageUpdate = {
      text: "Pipeline triggered successfully!",
      replace_original: true, // Thay thế message gốc
      attachments: [
        {
          text: "The action has been successfully triggered.",
          color: "good",
          actions: [], // Loại bỏ các button actions
        },
      ],
    };

    // Cập nhật phản hồi trên Slack
    await axios.post(payload.response_url, messageUpdate);

    res.status(200).send("Pipeline triggered successfully!");
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Failed to trigger pipeline.");
  }
});

app.listen(APP_PORT, () => {
  console.log("Slack interactive handler is running on port " + APP_PORT);
});
