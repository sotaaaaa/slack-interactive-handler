const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const GITLAB_TOKEN = process.env.GITLAB_TOKEN; // Sử dụng biến môi trường
const GITLAB_PROJECT_ID = process.env.GITLAB_PROJECT_ID; // Sử dụng biến môi trường
const APP_PORT = process.env.PORT; // Sử dụng biến môi trường

app.post("/slack-interactive", async (req, res) => {
  const payload = JSON.parse(req.body.payload);
  const actionValue = payload.actions[0].value;

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

  try {
    await axios.post(
      `https://gitlab.com/api/v4/projects/${GITLAB_PROJECT_ID}/trigger/pipeline`,
      {
        token: GITLAB_TOKEN, // Sử dụng biến môi trường
        ref: payload.channel.name,
        variables: {
          ACTION: pipelineTrigger,
        },
      }
    );

    res.status(200).send("Pipeline triggered successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to trigger pipeline.");
  }
});

app.listen(APP_PORT, () => {
  console.log("Slack interactive handler is running on port " + APP_PORT);
});
