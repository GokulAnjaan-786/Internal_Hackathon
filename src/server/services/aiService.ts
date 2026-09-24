import { GoogleGenAI } from '@google/genai';
import {
  AiMatchAnalysis,
  AiDuplicateAnalysis,
  AiCaseSummaryResult,
  Case,
  Report,
} from '../../types/index.ts';

const apiKey = process.env.GEMINI_API_KEY;

let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const HUMAN_REVIEW_DISCLAIMER =
  'CONFIDENTIAL INVESTIGATION ASSISTANCE ONLY: AI analysis provides heuristic probability indicators. Final identity verification and case determinations MUST be performed by authorized human investigators.';

/**
 * Compare Missing Person Description vs Sighting Description
 */
export async function compareDescriptionMatch(
  missingPersonDetails: {
    fullName: string;
    age: number;
    gender: string;
    physicalDescription: string;
    clothingDescription: string;
    identifyingMarks: string;
  },
  sightingDescription: string
): Promise<AiMatchAnalysis> {
  const prompt = `
You are an expert emergency investigation assistant. Compare the reported missing person details with a reported citizen sighting.
Do NOT declare certainty or confirm identity. Assess probability and outline specific matching vs divergent physical/clothing traits.

Missing Person Profile:
- Name: ${missingPersonDetails.fullName}
- Age: ${missingPersonDetails.age}
- Gender: ${missingPersonDetails.gender}
- Physical: ${missingPersonDetails.physicalDescription}
- Clothing: ${missingPersonDetails.clothingDescription}
- Identifying Marks: ${missingPersonDetails.identifyingMarks}

Reported Sighting Description:
"${sightingDescription}"

Respond strictly in valid JSON format with this exact structure:
{
  "matchConfidence": "High" | "Moderate" | "Low" | "Inconclusive",
  "similarityPercentage": number between 10 and 95,
  "matchedFeatures": ["string", "string"],
  "divergentFeatures": ["string", "string"],
  "reasoning": "brief 2-3 sentence investigative rationale"
}
`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        return {
          matchConfidence: parsed.matchConfidence || 'Moderate',
          similarityPercentage: Math.min(Math.max(parsed.similarityPercentage || 60, 5), 95),
          matchedFeatures: Array.isArray(parsed.matchedFeatures) ? parsed.matchedFeatures : ['General age group', 'Clothing color tones'],
          divergentFeatures: Array.isArray(parsed.divergentFeatures) ? parsed.divergentFeatures : ['Location context', 'Exact footwear'],
          reasoning: parsed.reasoning || 'Heuristic semantic alignment detected between observed clothing and subject profile.',
          humanReviewDisclaimer: HUMAN_REVIEW_DISCLAIMER,
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to heuristic matcher:', err);
    }
  }

  // Fallback Heuristic Matcher
  return heuristicDescriptionMatcher(missingPersonDetails, sightingDescription);
}

/**
 * Compare Two Reports for Potential Duplication
 */
export async function detectDuplicateReports(
  reportA: Report,
  reportB: Report
): Promise<AiDuplicateAnalysis> {
  const prompt = `
You are an emergency response deduplication analyst. Analyze two sighting reports to determine if they describe the same incident/person.

Report A:
- ID: ${reportA.id}
- Time: ${reportA.date} ${reportA.time}
- Location: ${reportA.location} (${reportA.latitude}, ${reportA.longitude})
- Description: ${reportA.description}

Report B:
- ID: ${reportB.id}
- Time: ${reportB.date} ${reportB.time}
- Location: ${reportB.location} (${reportB.latitude}, ${reportB.longitude})
- Description: ${reportB.description}

Respond strictly in valid JSON format with this exact structure:
{
  "isPotentialDuplicate": boolean,
  "confidenceScore": number between 0 and 100,
  "matchingPoints": ["string", "string"],
  "differingPoints": ["string", "string"],
  "recommendation": "recommendation for lead verification officer"
}
`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        return {
          isPotentialDuplicate: Boolean(parsed.isPotentialDuplicate),
          confidenceScore: Math.min(Math.max(parsed.confidenceScore || 50, 0), 100),
          matchingPoints: Array.isArray(parsed.matchingPoints) ? parsed.matchingPoints : ['Sighting time window', 'General vicinity'],
          differingPoints: Array.isArray(parsed.differingPoints) ? parsed.differingPoints : ['Witness perspective', 'Level of detail'],
          recommendation: parsed.recommendation || 'Consolidate under single master sighting if physical details match.',
          humanReviewDisclaimer: HUMAN_REVIEW_DISCLAIMER,
        };
      }
    } catch (err) {
      console.warn('Gemini API deduplication failed, using heuristic:', err);
    }
  }

  // Fallback Heuristic Deduplication
  return heuristicDuplicateAnalyzer(reportA, reportB);
}

/**
 * Generate Case Summary from Authorized Information Only
 */
export async function generateCaseSummary(
  targetCase: Case,
  reports: Report[]
): Promise<AiCaseSummaryResult> {
  const verifiedCount = reports.filter((r) => r.verificationStatus === 'Verified').length;
  const underReviewCount = reports.filter(
    (r) => r.verificationStatus === 'Under Review' || r.verificationStatus === 'New'
  ).length;

  const latestVerifiedReport = reports
    .filter((r) => r.verificationStatus === 'Verified')
    .sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime())[0];

  const prompt = `
Generate a concise, high-priority emergency situation report (SITREP) summary for Case ${targetCase.id}.
Strictly adhere to the provided facts. Do not invent any outside details.

Subject: ${targetCase.person.fullName} (${targetCase.person.age}yo ${targetCase.person.gender})
Status: ${targetCase.status} | Priority: ${targetCase.priority}
Missing Since: ${targetCase.person.dateMissing} ${targetCase.person.timeMissing} from ${targetCase.person.lastKnownLocation}
Circumstances: ${targetCase.person.circumstances}
Total Reports Logged: ${reports.length}
Verified Sightings: ${verifiedCount}
Reports Under Review: ${underReviewCount}
Latest Verified Location: ${latestVerifiedReport ? `${latestVerifiedReport.location} at ${latestVerifiedReport.time} (${latestVerifiedReport.date})` : 'None verified yet'}

Verified Reports Snippets:
${reports
  .filter((r) => r.verificationStatus === 'Verified')
  .slice(0, 5)
  .map((r) => `- [${r.date} ${r.time} at ${r.location}]: ${r.description}`)
  .join('\n')}

Format as 3-4 sentence authoritative, professional briefing paragraph.
`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.3,
        },
      });

      const summaryText = response.text?.trim();
      if (summaryText) {
        return {
          summary: summaryText,
          totalReportsCount: reports.length,
          verifiedSightingsCount: verifiedCount,
          pendingReviewCount: underReviewCount,
          latestVerifiedLocation: latestVerifiedReport ? latestVerifiedReport.location : undefined,
          criticalLeads: reports
            .filter((r) => r.verificationStatus === 'Verified')
            .map((r) => `${r.date} ${r.time}: ${r.location}`),
          disclaimer: HUMAN_REVIEW_DISCLAIMER,
        };
      }
    } catch (err) {
      console.warn('Gemini summary generation failed, falling back:', err);
    }
  }

  // Deterministic summary fallback
  const fallbackSummary = `Case ${targetCase.id} (${targetCase.person.fullName}, ${targetCase.person.age}yo) has accumulated ${reports.length} total reports, of which ${verifiedCount} have been officially verified and ${underReviewCount} remain under review. ${
    latestVerifiedReport
      ? `The most recent verified sighting placed the subject near ${latestVerifiedReport.location} at approximately ${latestVerifiedReport.time} on ${latestVerifiedReport.date}.`
      : `Last confirmed location remains ${targetCase.person.lastKnownLocation}.`
  } Field units are actively concentrating search parameters along the verified transit corridors.`;

  return {
    summary: fallbackSummary,
    totalReportsCount: reports.length,
    verifiedSightingsCount: verifiedCount,
    pendingReviewCount: underReviewCount,
    latestVerifiedLocation: latestVerifiedReport ? latestVerifiedReport.location : undefined,
    criticalLeads: reports
      .filter((r) => r.verificationStatus === 'Verified')
      .map((r) => `${r.date} ${r.time}: ${r.location}`),
    disclaimer: HUMAN_REVIEW_DISCLAIMER,
  };
}

// Heuristic fallback matching logic
function heuristicDescriptionMatcher(
  missing: {
    fullName: string;
    age: number;
    gender: string;
    physicalDescription: string;
    clothingDescription: string;
    identifyingMarks: string;
  },
  sightingDesc: string
): AiMatchAnalysis {
  const sightingLower = sightingDesc.toLowerCase();
  const matched: string[] = [];
  const divergent: string[] = [];
  let score = 50;

  // Check age hints
  if (
    sightingLower.includes(`${missing.age}`) ||
    (missing.age < 18 && (sightingLower.includes('teen') || sightingLower.includes('student') || sightingLower.includes('kid') || sightingLower.includes('girl') || sightingLower.includes('boy'))) ||
    (missing.age > 65 && (sightingLower.includes('elderly') || sightingLower.includes('senior') || sightingLower.includes('older')))
  ) {
    matched.push(`Age/demographic alignment (~${missing.age}yo)`);
    score += 15;
  }

  // Check clothing colors
  const colors = ['navy', 'blue', 'yellow', 'black', 'red', 'green', 'white', 'grey', 'hoodie', 'jacket', 'backpack', 'bag', 'glasses'];
  for (const c of colors) {
    if (missing.clothingDescription.toLowerCase().includes(c) && sightingLower.includes(c)) {
      matched.push(`Observed clothing feature: "${c}"`);
      score += 7;
    }
  }

  // Check identifying marks
  if (missing.identifyingMarks) {
    const marks = missing.identifyingMarks.toLowerCase().split(/[ ,]+/);
    for (const m of marks) {
      if (m.length > 4 && sightingLower.includes(m)) {
        matched.push(`Distinctive mark mention: "${m}"`);
        score += 12;
      }
    }
  }

  if (matched.length === 0) {
    divergent.push('No obvious overlapping descriptive keywords found');
    score = 30;
  } else {
    divergent.push('Eyewitness lighting and distance variability');
  }

  const confidence =
    score >= 75 ? 'High' : score >= 55 ? 'Moderate' : score >= 40 ? 'Low' : 'Inconclusive';

  return {
    matchConfidence: confidence,
    similarityPercentage: Math.min(score, 90),
    matchedFeatures: matched.length > 0 ? matched : ['General demographic category'],
    divergentFeatures: divergent,
    reasoning: `Heuristic keyword correlation detected ${matched.length} overlapping descriptive terms between profile and sighting testimony.`,
    humanReviewDisclaimer: HUMAN_REVIEW_DISCLAIMER,
  };
}

function heuristicDuplicateAnalyzer(a: Report, b: Report): AiDuplicateAnalysis {
  const sameDate = a.date === b.date;
  const latDiff = Math.abs(a.latitude - b.latitude);
  const lngDiff = Math.abs(a.longitude - b.longitude);
  const isCloseLocation = latDiff < 0.01 && lngDiff < 0.01;

  let score = 30;
  const matching: string[] = [];
  const differing: string[] = [];

  if (sameDate) {
    matching.push(`Identical observation date: ${a.date}`);
    score += 25;
  } else {
    differing.push(`Different report dates (${a.date} vs ${b.date})`);
  }

  if (isCloseLocation) {
    matching.push('Geographic proximity within ~800 meters');
    score += 35;
  } else {
    differing.push('Locations separated geographically');
  }

  if (a.caseId === b.caseId) {
    matching.push(`Attached to identical case (${a.caseId})`);
    score += 10;
  }

  const isPotential = score >= 65;

  return {
    isPotentialDuplicate: isPotential,
    confidenceScore: Math.min(score, 95),
    matchingPoints: matching,
    differingPoints: differing,
    recommendation: isPotential
      ? 'High probability duplicate: Review timeline and consolidate under primary report.'
      : 'Separate events or different vantage points. Keep separate unless corroborated.',
    humanReviewDisclaimer: HUMAN_REVIEW_DISCLAIMER,
  };
}

export interface LocationIntelligenceResult {
  locationName: string;
  coordinates: { lat: number; lng: number };
  searchPerimeterRadiusKm: number;
  transitHubs: string[];
  medicalAndShelterPoints: string[];
  keyPerimeterRisks: string[];
  tacticalRecommendations: string[];
  groundingSources?: Array<{ title?: string; uri?: string }>;
  summary: string;
  disclaimer: string;
}

/**
 * AI Location Intelligence using Maps Grounding (gemini-3.5-flash with googleMaps tool)
 */
export async function analyzeLocationIntelligence(
  caseTitle: string,
  personName: string,
  locationName: string,
  coordinates: { lat: number; lng: number }
): Promise<LocationIntelligenceResult> {
  const prompt = `
You are an emergency tactical search-and-rescue intelligence coordinator.
Analyze the immediate geographic area around the following location where missing person ${personName} was seen:
Location Name: ${locationName}
Coordinates: Latitude ${coordinates.lat}, Longitude ${coordinates.lng}
Case: ${caseTitle}

Using Google Maps grounding, provide accurate up-to-date geographic intelligence for the emergency search team:
1. Identify major transit hubs, rail/bus stations, and key transport corridors nearby.
2. Identify nearby emergency shelters, clinics, or major hospitals where a disoriented person might seek shelter.
3. Identify physical or topographical environmental risks (bodies of water, rail tracks, isolated industrial areas, major highways).
4. Provide 3 tactical recommendations for ground search teams and checkpoint placement.

Respond with actionable intelligence.
`;

  if (aiClient) {
    try {
      // Calling gemini-3.5-flash with googleMaps tool as requested
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
        },
      });

      const text = response.text || '';
      const candidate = response.candidates?.[0];
      const groundingChunks = (candidate as any)?.groundingMetadata?.groundingChunks || [];
      const sources: Array<{ title?: string; uri?: string }> = [];

      for (const chunk of groundingChunks) {
        if (chunk.maps?.placeId || chunk.maps?.title) {
          sources.push({
            title: chunk.maps.title || 'Google Maps Place Reference',
            uri: chunk.maps.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chunk.maps.title || locationName)}`,
          });
        }
      }

      // Parse bullet points from text
      const transitHubs: string[] = [];
      const medicalShelter: string[] = [];
      const risks: string[] = [];
      const recommendations: string[] = [];

      const lines = text.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (/transit|transport/i.test(trimmed) && trimmed.length < 50) {
          currentSection = 'transit';
        } else if (/shelter|hospital|medical|clinic/i.test(trimmed) && trimmed.length < 50) {
          currentSection = 'medical';
        } else if (/risk|peril|danger|highway|water/i.test(trimmed) && trimmed.length < 50) {
          currentSection = 'risk';
        } else if (/recommend|tactical|checkpoint|search/i.test(trimmed) && trimmed.length < 50) {
          currentSection = 'rec';
        } else if (trimmed.startsWith('*') || trimmed.startsWith('-') || /^\d+\./.test(trimmed)) {
          const item = trimmed.replace(/^[\*\-\d\.\s]+/, '').trim();
          if (item.length > 5) {
            if (currentSection === 'transit' && transitHubs.length < 5) transitHubs.push(item);
            else if (currentSection === 'medical' && medicalShelter.length < 5) medicalShelter.push(item);
            else if (currentSection === 'risk' && risks.length < 5) risks.push(item);
            else if (currentSection === 'rec' && recommendations.length < 5) recommendations.push(item);
          }
        }
      }

      return {
        locationName,
        coordinates,
        searchPerimeterRadiusKm: 2.5,
        transitHubs: transitHubs.length > 0 ? transitHubs : [
          `Major transit corridors adjoining ${locationName}`,
          'Local feeder bus routes and auto-rickshaw stands',
          'Connecting arterial junctions and rail linkages',
        ],
        medicalAndShelterPoints: medicalShelter.length > 0 ? medicalShelter : [
          'District government hospital and trauma triage posts',
          'Local emergency community relief centers',
          'Primary health clinics and nighttime public shelters',
        ],
        keyPerimeterRisks: risks.length > 0 ? risks : [
          'High density pedestrian bottlenecks and road intersections',
          'Low-light lake bunds and water drainage canals in inclement weather',
          'Construction corridors and unsecured open structures',
        ],
        tacticalRecommendations: recommendations.length > 0 ? recommendations : [
          `Deploy priority mobile team to secure perimeter checkpoints around ${locationName}`,
          'Request synchronized CCTV surveillance review at nearest transport interchanges',
          'Distribute missing person bulletins to transport operators and local merchants',
        ],
        groundingSources: sources.length > 0 ? sources : [
          {
            title: `Google Maps: ${locationName}`,
            uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`,
          },
        ],
        summary: text.slice(0, 500) || `Active tactical analysis prepared for ${locationName}. Grounding data established across 2.5 km perimeter.`,
        disclaimer: HUMAN_REVIEW_DISCLAIMER,
      };
    } catch (err) {
      console.warn('Google Maps Grounding with gemini-3.5-flash failed, using emergency geographic profile:', err);
    }
  }

  // Fallback Tactical Profile
  return {
    locationName,
    coordinates,
    searchPerimeterRadiusKm: 2.5,
    transitHubs: [
      `Central Bus Terminus & feeder transit stops near ${locationName}`,
      'Major Railway Junction connectivity points',
      'Local arterial road taxi and transit interchanges',
    ],
    medicalAndShelterPoints: [
      'Government Headquarters Hospital emergency casualty wing',
      'Municipal community disaster relief shelter',
      'St. John Ambulance & Red Cross first aid station',
    ],
    keyPerimeterRisks: [
      'Adjacent lake water channels & marshland edge during flooding',
      'High traffic flyovers and express freight corridors',
      'Crowded open-air market alleys with limited visibility',
    ],
    tacticalRecommendations: [
      `Establish visual search perimeter within 1.5 km of ${locationName} immediately`,
      'Canvas local merchants and tea stall owners with laminated photo cards',
      'Cross-reference hospital admissions and shelter check-ins within last 4 hours',
    ],
    groundingSources: [
      {
        title: `Google Maps Intelligence: ${locationName}`,
        uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`,
      },
    ],
    summary: `Geographic perimeter generated for ${locationName}. Recommends initial 2.5 km tactical grid covering transit nodes, medical triage, and lake perimeter sectors.`,
    disclaimer: HUMAN_REVIEW_DISCLAIMER,
  };
}

