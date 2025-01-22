require("dotenv").config();
const axios = require("axios");
const express = require("express");

const app = express();
app.use(express.json());

// Environment variables
const API_BASE_URL = process.env.API_BASE_URL || "http://example.com"; // Replace with the server API URL
const DUMMY_API_KEY = process.env.DUMMY_API_KEY; // Dummy API key for validation
const HUB_ACCESS_TOKEN = process.env.HUB_ACCESS_TOKEN;
console.log("HUB_ACCESS_TOKEN", HUB_ACCESS_TOKEN);
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
app.post("/fetch-client-data", async (req, res) => {
  console.log("Entering fetch-client-data endpoint");

  try {
    let responseData = req.body;

    if (!responseData || Object.keys(responseData).length === 0) {
      console.log("Fetching data from external API...");
      const apiResponse = await axios.get(`${API_BASE_URL}/get-client-data`, {
        headers: {
          Authorization: `Bearer ${process.env.DUMMY_API_KEY}`, // Ensure the correct API key is used
        },
      });
      responseData = apiResponse.data;
    }

    const { website, email, companyName, phoneNumber } = responseData;
    console.log("Received data:", { website, email, companyName, phoneNumber });

    if (!companyName || (!email && !phoneNumber && !website)) {
      return res.status(400).json({ error: "Incomplete data received. At least one identifier (email, phone, or website) is required." });
    }

    const clientData = { website, email, companyName, phoneNumber };

    // Search for an existing contact by email, phone number, or website
    const filterGroups = [];
    if (email) filterGroups.push({ filters: [{ propertyName: "email", operator: "EQ", value: email }] });
    if (phoneNumber) filterGroups.push({ filters: [{ propertyName: "phone", operator: "EQ", value: phoneNumber }] });
    if (website) filterGroups.push({ filters: [{ propertyName: "website", operator: "EQ", value: website }] });

    const contactSearchResponse = await axios.post(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      { filterGroups },
      {
        headers: {
          Authorization: `Bearer ${HUB_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const contactResults = contactSearchResponse.data.results;
    let existingContactId = contactResults && contactResults.length > 0 ? contactResults[0].id : null;
    console.log("existingContactId", existingContactId);

    if (!existingContactId) {
      console.log("Creating a new contact...");
      const createContactResponse = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        {
          properties: {
            email: clientData.email,
            company: clientData.companyName,
            phone: clientData.phoneNumber,
            website: clientData.website,
            existing_customer: "InActive Customer",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${HUB_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      existingContactId = createContactResponse.data.id;
      console.log(`New contact created with ID: ${existingContactId}`);
    } else {
      console.log("Contact already exists. Updating contact...");
      await axios.patch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${existingContactId}`,
        {
          properties: {
            email: clientData.email,
            company: clientData.companyName,
            phone: clientData.phoneNumber,
            website: clientData.website,
            existing_customer: "Active Customer",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${HUB_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`Contact ${clientData.email} updated successfully.`);
    }

    // Search for an existing company
    console.log("Searching for existing company...");
    const companyResponse = await axios.post(
      `https://api.hubapi.com/crm/v3/objects/companies/search`,
      {
        filterGroups: [
          {
            filters: [
              { propertyName: "name", operator: "EQ", value: clientData.companyName },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${HUB_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    let existingCompanyId = companyResponse?.data?.results?.length > 0 ? companyResponse.data.results[0].id : null;
    console.log("existingCompanyId", existingCompanyId);

    if (!existingCompanyId) {
      console.log("Creating a new company...");
      const createCompanyResponse = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/companies",
        {
          properties: {
            name: clientData.companyName,
            phone: clientData.phoneNumber,
            website: clientData.website,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${HUB_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      existingCompanyId = createCompanyResponse.data.id;
      console.log(`New company created with ID: ${existingCompanyId}`);
    }

    if (existingContactId && existingCompanyId) {
      console.log("Associating contact and company...");
      try {
        const createAssociationResponse = await axios.put(
          `https://api.hubapi.com/crm/v3/objects/companies/${existingCompanyId}/associations/contacts/${existingContactId}/company_to_contact`,
          {},
          {
            headers: {
              Authorization: `Bearer ${HUB_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Association created successfully:", createAssociationResponse.data);
      } catch (error) {
        console.error("Failed to create association:", error.message);
        console.error("Error details:", error.response?.data);
      }
    }

    res.status(200).json({
      message: "Client data fetched and saved successfully",
      data: clientData,
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
