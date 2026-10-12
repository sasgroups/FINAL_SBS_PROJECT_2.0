// services/flightInfoService.js

// Offline airline database
const AIRLINES = {
  "6E": "IndiGo",
  "AI": "Air India",
  "IX": "Air India Express",
  "UK": "Vistara",
  "SG": "SpiceJet",
  "QP": "Akasa Air",
  "G8": "Go First",

  // Add your FLY91 code here when confirmed
  // "??": "FLY91",

  "EK": "Emirates",
  "QR": "Qatar Airways",
  "SQ": "Singapore Airlines",
  "EY": "Etihad Airways",
  "BA": "British Airways",
  "LH": "Lufthansa",
  "AF": "Air France",
  "KL": "KLM",
  "TK": "Turkish Airlines",
  "UA": "United Airlines",
  "AA": "American Airlines",
  "AC": "Air Canada"
};

async function getFlightDetails(scanCode) {
  try {
    console.log(`📦 Barcode scanned: ${scanCode}`);

    let origin = "UNK";
    let destination = "UNK";
    let airlineCode = null;

    // ==============================
    // M1 BARCODE FORMAT
    // ==============================
    if (scanCode.startsWith("M1")) {
      const parts = scanCode.split(/\s+/).filter(Boolean);

      const flightPart = parts.find((p) =>
        /^[A-Z]{6}[A-Z0-9]{2,3}$/.test(p)
      );

      if (flightPart) {
        origin = flightPart.substring(0, 3);
        destination = flightPart.substring(3, 6);
        airlineCode = flightPart.substring(6);
      }
    }

    // ==============================
    // OTHER BARCODE FORMATS
    // ==============================
    if (origin === "UNK" || destination === "UNK") {
      const AIRPORT_REGEX = /\b[A-Z]{3}\b/g;
      const AIRLINE_REGEX = /\b[A-Z0-9]{2}\d{1,4}\b/g;

      const airports = scanCode.match(AIRPORT_REGEX) || [];

      if (airports.length >= 2) {
        origin = airports[0];
        destination = airports[1];
      }

      const airlineMatch = scanCode.match(AIRLINE_REGEX);

      if (airlineMatch) {
        airlineCode = airlineMatch[0].substring(0, 2);
      }
    }

    // ==============================
    // AIRLINE NAME - OFFLINE
    // ==============================
    airlineCode = airlineCode?.toUpperCase();

    const airlineName =
      AIRLINES[airlineCode] || "Unknown Airline";

    console.log(
      `🔎 Parsed: Origin=${origin}, Destination=${destination}, AirlineCode=${airlineCode}`
    );

    console.log(`✈ Airline: ${airlineName}`);

    // ==============================
    // KEEP SAME RETURN FORMAT
    // ==============================
    return {
      origin,
      destination,
      airlineName,
      flightType: "Unknown"
    };

  } catch (error) {
    console.error(
      "❌ Error in getFlightDetails:",
      error.message
    );

    // SAME FALLBACK FORMAT
    return {
      origin: "UNK",
      destination: "UNK",
      airlineName: "Unknown Airline",
      flightType: "Unknown"
    };
  }
}

module.exports = { getFlightDetails };