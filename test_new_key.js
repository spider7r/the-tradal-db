
const { GoogleGenerativeAI } = require("@google/generative-ai");
const API_KEY = "AIzaSyBvhmXGzWJs3NTgDsDrCyLPCDmcq1XkgvI";
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
    console.log("Testing new key...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello, this is a test.");
        console.log("SUCCESS: " + result.response.text());
    } catch (error) {
        console.log("FAIL: " + error.message);
    }
}
test();
