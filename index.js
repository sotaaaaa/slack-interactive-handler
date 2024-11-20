require("dotenv").config();

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

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
    // Split actionValue with |
    // First part is the action and the second part is the branch
    const actionValueParts = value.split("|");
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

    // Gửi request để trigger GitLab pipeline
    await axios.post(
      `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/trigger/pipeline`,
      {
        token: GITLAB_TOKEN,
        ref: branch,
        variables: {
          ACTION: pipelineTrigger,
        },
      }
    );

    // Trả về yêu cầu cập nhật lại message của Slack (ẩn action hoặc báo thành công)
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

    // Cập nhật message trên Slack (làm ẩn button sau khi nhấn)
    await axios.post(payload.response_url, messageUpdate);

    res.status(200).send("Pipeline triggered successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to trigger pipeline.");
  }
});

app.listen(APP_PORT, () => {
  console.log("Slack interactive handler is running on port " + APP_PORT);
});
