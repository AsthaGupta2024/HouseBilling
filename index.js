require("dotenv").config();
const axios = require("axios");
const express = require("express");

const app = express();
app.use(express.json());

// Environment variables
const API_BASE_URL = process.env.API_BASE_URL || "http://example.com"; // Replace with the server API URL
const DUMMY_API_KEY = process.env.DUMMY_API_KEY; // Dummy API key for validation
console.log("Dummy API Key:", DUMMY_API_KEY);

// Middleware for header validation
app.use((req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log("Authorization Header:", authHeader);
  if (!authHeader || authHeader !== `${DUMMY_API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized: Invalid API key" });
  }
  next();
});

// Endpoint to fetch and save client data
app.get("/fetch-client-data", async (req, res) => {
  console.log("Entering fetch-client-data endpoint");

  try {
    console.log("Fetching data...");
    // const response = await axios.get(`${API_BASE_URL}/get-client-data`, {
    //     //   headers: {
    //     //     Authorization: `Bearer ${process.env.API_KEY}`, // Ensure the correct API key is being used here
    //     //   },
    //     // });
    // For testing, using dummy data:
    const response = {
      data: {
        website: "http://dummywebsite.com",
        email: "dummyemail@example.com",
        companyName: "Dummy Company",
        phoneNumber: "123-456-7890"
      }
    };

    console.log("Dummy data:", response.data);

    // Extract the required data
    const { website, email, companyName, phoneNumber } = response.data;

    // Validate the response data
    if (!website || !email || !companyName || !phoneNumber) {
      return res.status(400).json({ error: "Incomplete data received" });
    }

    // Create clientData object
    const clientData = { website, email, companyName, phoneNumber };

    // Return the data to the client
    res.status(200).json({
      message: "Client data fetched and saved successfully",
      data: clientData, // Return clientData here
    });
  } catch (error) {
    console.error("Error fetching or saving client data:", error.message);
    res.status(500).json({ error: "Failed to fetch or save client data" });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Client-side server running on http://localhost:${PORT}`);
});
