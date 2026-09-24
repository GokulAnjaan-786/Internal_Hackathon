# 🚨 MISSING PERSON CASE ORGANISER & INVESTIGATION WORKSPACE

> **"Reduce the amount of time investigators spend searching, comparing, organising and remembering information, so they can spend more time investigating."**

---

## 📌 Executive Overview

The **Missing Person Case Organiser** is a professional emergency investigation platform designed for police officers, search-and-rescue teams, disaster response agencies, and verified triage personnel. 

It connects scattered reports, citizen sightings, photo evidence, geospatial markers, verification notes, and investigation tasks into **ONE CONNECTED CASE**.

```mermaid
flowchart TD
    A[Scattered Information / Hotline Reports] --> B[Organise & Intake]
    B --> C[Connect & Cross-Reference]
    C --> D[AI & Human Verification]
    D --> E[Identify Important Leads]
    E --> F[Assign Actionable Tasks]
    F --> G[Follow-Up & Map Intelligence]
    G --> H[Official Case Decision & Closure]
```

---

## 🌟 Core Pillars & Product Vision

### 🔍 1. One Case $\rightarrow$ Everything Connected
Every case brings together:
* **Missing Person Profile** (Photo, physical traits, identifying marks, clothing, medical conditions)
* **Citizen Sighting Reports & Source Verification**
* **Interactive Investigation Leads Board** (Kanban flow)
* **Task Dispatch & Overdue Reminders**
* **Map Intelligence & Location Story Timeline**
* **AI Investigation Assistant & Maps Grounding**
* **Tamper-Evident Evidence Vault Audit Trail**
* **Formal Case Closure Protocol Checklist & PDF Report Generation**

---

## 🤖 AI Services & Intelligence Architecture

The platform utilizes **Google Gemini 3.8 Flash** and **Gemini 3.5 Flash with Google Maps Grounding** to empower investigators without replacing human decision-making.

### 🛡️ Mandatory AI Safety Principles
1. **AI NEVER automatically declares a person found or confirms identity.**
2. **AI NEVER automatically verifies reports, merges reports, or closes cases.**
3. **All AI outputs are explicitly labeled `AI-ASSISTED` with human review disclaimers.**

| AI Module | Underlying Model / Tool | Function & Purpose |
|---|---|---|
| **1. AI Description Matcher** | `gemini-3.8-flash` | Compares missing person physical & clothing profile against incoming citizen sighting descriptions to output similarity percentage, matched features (✓), divergent features (⚠), and reasoning. |
| **2. AI Duplicate Report Detector** | `gemini-3.8-flash` | Analyzes pairs of incoming sighting reports by timestamp, coordinates, and description text to detect potential duplicate sightings. |
| **3. AI Case Situation Briefing** | `gemini-3.8-flash` | Synthesizes authorized case facts, latest verified sightings, and pending reports into a 3-4 sentence authoritative Situation Report (SITREP). |
| **4. AI Location Intelligence** | `gemini-3.5-flash` + `googleMaps` Tool | Uses Google Maps Grounding to analyze the 2.5 km perimeter around a sighting location, identifying transit hubs, emergency hospitals/shelters, topographical risks, and 3 tactical recommendations. |
| **5. AI Next-Action Assistant** | Rule & AI Engine | Recommends 3–5 prioritized tactical actions with *"WHY THIS WAS SUGGESTED"* explanations. Accepting a recommendation automatically dispatches an Investigation Task. |
| **6. Cross-Case Connection Finder** | Heuristic Semantic Similarity | Scans cross-jurisdictional cases matching age profiles, disaster circumstances, and physical traits to suggest potential related cases for review. |

---

## 🗺️ Map Intelligence & Google Maps Integration

The platform includes a dedicated geospatial intelligence layer powered by **Google Maps Platform** (`@vis.gl/react-google-maps`, Maps JavaScript API, Routes API):

* **Configured Google Maps API Key**: Configured in `.env` (`VITE_GOOGLE_MAPS_API_KEY` & `GOOGLE_MAPS_API_KEY`).
* **Layer Toggles**:
  1. Last Known Location
  2. Reported Sightings
  3. Verified Sightings
  4. Investigation Locations
  5. Emergency Hospitals
  6. Shelters
  7. Transport Hubs
* **Location Story View**: Chronological sequence cards tracking reported subject movement over time.
* **Current Location Distance & Routing**: Explicit browser-permission based distance calculator computing straight-line distance, road distance, and Google Maps directions link from the officer's current position to last known coordinates.

---

## 🏛️ Navigation & Major Product Sections

1. **Command Control Room** (`/dashboard`): Real-time metrics, active urgent cases, new reports, and pending verifications.
2. **Senior Officer Command Desk** (`/senior-dashboard`): Executive overview answering *"Which cases require my attention right now?"* with stale case warnings (>48h no update).
3. **Investigation Cockpit** (`/cases/:id`): Main 9-tab workspace screen for case officers.
4. **Investigation Leads Board** (`/leads`): Visual 7-column Kanban board for tracking clues and witness leads (`NEW`, `ASSIGNED`, `UNDER_INVESTIGATION`, `WAITING_FOR_RESPONSE`, `VERIFIED`, `NOT_USEFUL`, `CLOSED`).
5. **Verification Queue** (`/verification`): Verification desk for reviewing, verifying, rejecting, or marking duplicate reports.
6. **Incident Map** (`/map`): Multi-case geospatial intelligence map with sector filters and distance calculations.
7. **Task Dispatch** (`/tasks`): Investigation tasks linked directly to cases and leads with overdue highlights.
8. **"What Changed Since Last Login?"**: Session-aware activity diff tracking new reports, verified sightings, completed tasks, and leads since the officer's last login.
9. **Mobile Field Mode** (`/field-mode`): High-efficiency layout for field officers to quickly submit sightings, photos, and update tasks from mobile/tablet devices.
10. **Tamper-Evident Audit Logs** (`/audit-logs`): Immutable audit log recording every sensitive action (case creation, report verification, priority override, evidence access, closure).
11. **Citizen Portal** (`/citizen-portal`): Public intake form and tracking receipt portal with data minimization.

---

## 🔒 Role-Based Access Control (RBAC) & Security

Enforced on **BOTH Frontend UI and Backend Express APIs**:

| Role | Permissions & Capabilities |
|---|---|
| **SUPER_ADMIN** | System-wide administrative control, user management, priority override, case archival, full audit visibility. |
| **CASE_OFFICER** | Manage assigned cases, dispatch leads/tasks, review reports, override priority, execute case closure. |
| **VERIFICATION_OFFICER** | Review sighting reports, verify/reject/duplicate reports, add verification notes. |
| **HOSPITAL_SHELTER** | Intake missing person reports, submit hospital casualty log reports, view authorized case summaries. |
| **CITIZEN / REPORTER** | Submit public sighting reports, track report status via anonymous receipt ID (Confidential notes and officer identities hidden). |

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Node.js**: v18.x or higher
* **npm**: v9.x or higher

### Environment Setup
Create a `.env` file in the project root:

```env
# Google Maps Platform API Key
VITE_GOOGLE_MAPS_API_KEY="AIzaSyB8L5_LT26pOQ2ETNMtGMvPw8dih08wTl0"
GOOGLE_MAPS_API_KEY="AIzaSyB8L5_LT26pOQ2ETNMtGMvPw8dih08wTl0"

# Optional Gemini API Key (If omitted, system automatically operates with robust fallback heuristics)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

PORT=3000
NODE_ENV=development
```

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

### 4. Run API Verification Suite
```bash
node C:\Users\HP\.gemini\antigravity-ide\brain\4e518be4-a45a-4c19-a3c5-407afae88e38\scratch\test_endpoints.js
```

---

## 🔑 Demo Login Credentials (RBAC Quick Test)

| Role | Username | Password |
|---|---|---|
| **Super Admin** | `admin` | `admin123` |
| **Case Officer** | `officer` | `officer123` |
| **Verification Officer** | `verifier` | `verifier123` |
| **Hospital / Shelter** | `shelter` | `shelter123` |
| **Citizen / Volunteer** | `citizen` | `citizen123` |

---

## 📊 Summary of Tech Stack

* **Frontend**: React 19, TypeScript, Vite, TailwindCSS 4, Lucide Icons, Leaflet / Google Maps JS (`@vis.gl/react-google-maps`).
* **Backend**: Node.js, Express, tsx runtime, Google GenAI SDK (`@google/genai`).
* **Database Layer**: In-Memory Relational Data Store (`db.ts`) with normalized tables and initial seed data.

---

*“ WE DO NOT GIVE INVESTIGATORS MORE INFORMATION. WE HELP THEM MAKE SENSE OF THE INFORMATION THEY ALREADY HAVE. ”*
