
const { GoogleGenerativeAI } = require("@google/generative-ai");
const API_KEY = "AIzaSyA_VezYQGXZ_mT8xyGNCMYB2JBpLXmzDsE"; // NEW KEY
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
    console.log("Testing FINAL key...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello friend");
        console.log("SUCCESS: " + result.response.text());
    } catch (error) {
        console.log("FAIL: " + error.message);
    }
}
test();
