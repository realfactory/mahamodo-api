const axios = require("axios");
require("dotenv").config();

async function gptAiGenerator(prompt, content, model = "gpt-3.5-turbo") {

  const finalPrompt = prompt ?? "สรุปเนื้อหาคําทํานายนี้ไม่เกิน 5 บรรทัด :";
  const finalContent = content;
  const finalModel = model;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: finalModel,
        messages: [
          {
            role: "user",
            content: `${finalPrompt}\n\n${finalContent}`,
          },
        ],
        max_tokens: 1200,
        temperature: 0.5,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    return response.data.choices[0].message.content;
    
  } catch (error) {
    const apiErrorMessage = error.response?.data?.error?.message || error.message;
    console.error("gptAiGenerator() Error generating text:", apiErrorMessage);
    throw new Error(`Something went wrong: ${apiErrorMessage}`);
  }
}

module.exports = {
  gptAiGenerator,
};
