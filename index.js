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
        phoneNumber: "123-456-7890",
      },
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

    // Prepare the HubSpot contact object
    const contactObj = {
      properties: {
        email: clientData.email,
        company: clientData.companyName, // You can map `companyName` to `firstname` or other fields based on your needs
        phone: clientData.phoneNumber,
        website: clientData.website,
      },
    };
    const clientEmail = contactObj.properties.email;
    const contactResponse = await axios.post(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: clientEmail,
              },
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
    const results = contactResponse.data.results;
    console.log("results", results);
    const existingContactId =
      results && results.length > 0 ? results[0].id : null;
    console.log("existingContactId", existingContactId);
    if (existingContactId) {
      // Step 2: Update the contact if it already exists
      await axios.patch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${existingContactId}`,
        {
          properties: {
            email: clientData.email,
            company: clientData.companyName, // You can map `companyName` to `firstname` or other fields based on your needs
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
      console.log(`Contact ${clientData.email} updated successfully.`);
    } else {
      // Step 3: Create a new contact if none exists
      console.log("none exists");
      await axios.post(
        "https://api.hubapi.com/crm/v3/objects/contacts",
        {
          properties: {
            email: clientData.email,
            company: clientData.companyName, // You can map `companyName` to `firstname` or other fields based on your needs
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
      console.log(`Contact ${clientData.email} created successfully.`);
    }
    // Check if the company exists
    const clientcompany = contactObj.properties.company;
    console.log("clientcompany", clientcompany);

    // Search for the company by name (companyName)
    const companyResponse = await axios.post(
      `https://api.hubapi.com/crm/v3/objects/companies/search`,
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: "name", // Use "name" to search for the company
                operator: "EQ",
                value: clientcompany,
              },
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

    const Companyresults = companyResponse.data.results;
    console.log("Companyresults", Companyresults);

    // Check if company exists
    const existingCompanyId =
      Companyresults && Companyresults.length > 0 ? Companyresults[0].id : null;


    // If the company exists, associate the contact with the company
    if (existingCompanyId) {
      console.log("existingCompanyId", existingCompanyId);
      // Associate contact with the company
      const updateCompanyResponse = await axios.patch(
        `https://api.hubapi.com/crm/v3/objects/companies/${existingCompanyId}`,
        {
          properties: {
            name: clientData.companyName, // Mapping the company name to the correct property
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
      console.log("Company updated:", updateCompanyResponse.data);
    }
    else {
      // Step 3: Create a new contact if none exists
      console.log("none exists");
      const createCompanyResponse = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/companies",
        {
          properties: {
            name: clientData.companyName, // You can map `companyName` to `firstname` or other fields based on your needs
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
      console.log("New company created:", createCompanyResponse.data);
    }
    //Create Association
    // console.log("existingContactId", existingContactId);
    // const createAssociationResponse = await axios.put(
    //   `https://api.hubapi.com/crm/v4/objects/contact/${existingContactId}/associations/companies/${existingCompanyId}`,
    //   {
    //     associationCategory: "HUBSPOT_DEFINED", // or any other valid category
    //     associationTypeId: 1, // or any valid definition ID
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${HUB_ACCESS_TOKEN}`,
    //       "Content-Type": "application/json",
    //     },
    //   }

    // );
    // console.log("Association created:", createAssociationResponse.data);

    console.log("existingContactId", existingContactId);
    console.log("existingCompanyId", existingCompanyId);

    if (existingContactId && existingCompanyId) {
      const createAssociationResponse = await axios.put(
        `https://api.hubapi.com/crm/v3/objects/companies/${existingCompanyId}/associations/contacts/${existingContactId}/company_to_contact`,
        {
          associationCategory: "HUBSPOT_DEFINED", // or any other valid category
          associationTypeId: 1, // or any valid definition ID

        }, // Empty body
        {
          headers: {
            Authorization: `Bearer ${HUB_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Association created:", createAssociationResponse.data);
    } else {
      console.error("Cannot create association: Missing contact or company ID");
    }
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
