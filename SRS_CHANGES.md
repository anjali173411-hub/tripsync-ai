# SRS Changes After Review

## 1. Merged AI service (sections 3.4, 3.5, 7)

Itinerary generation and group consensus are the same problem with different input sizes, so they now share **one** AI service. A solo trip is treated as a group with one member.

- Section 7, internal AI interface: replace `generateItinerary()`, `resolveGroupConflicts()`, `chatWithAssistant()` with a single `generateItinerary({ trip, numberOfDays, members, instructions })`.
- Section 3.4, intro: *"For solo and group trips, the system uses the same AI service; for group trips the service additionally identifies overlaps and conflicts (3.5)."*
- AI provider: **Google Gemini API** (sections 2.4, 4.2, 9).

## 2. New requirement: malformed AI output (add to section 3.4)

**FR-4.6:** The system shall validate every AI response before saving it. A response is rejected if it is not valid JSON, is incomplete, has a different number of days than the trip, names travellers who are not trip members, contains invalid costs, or has a conflict with fewer than two options. On rejection, the system shall re-request the itinerary once, telling the AI what was wrong. If the second response is also invalid, the system shall show an error with a retry option and shall not change any saved trip data.

## 3. Moved to future scope (section 8.3)

- **AI Travel Assistant Chat** (old section 3.6, FR-6.1 to FR-6.5, ChatMessages collection 6.9)
- **Mock Flight and Hotel Selection** (old section 3.8, FR-8.1 to FR-8.3)

Remove both rows from the use case table (7.3) and from the product functions list (2.2).

## 4. Revised timeline (section 10)

| Phase | Duration | Key deliverables |
|---|---|---|
| Phase 1: Setup & Auth | Week 1–2 | Scaffolding, schemas, JWT registration/login |
| Phase 2: Trips & Preferences | Week 3 | Trip CRUD, invitations, preference form |
| Phase 3: Shared AI Service | Week 4 | Gemini integration, prompt templates, output validation (FR-4.6), solo itineraries, itinerary editing |
| Phase 4: Group Consensus Engine | **Week 5–6** | Conflict detection, member attribution tags, voting, organiser override, finalisation, prompt tuning with real group test cases |
| Phase 5: Budget, Admin & Reviews | Week 7 | Expense tracking, destination management, analytics, reviews |
| Phase 6: Testing & Deployment | Week 8 | End-to-end testing, deployment, demo preparation |

## 5. Risk table (section 11)

Update the "inconsistent or low-quality AI itineraries" mitigation to reference FR-4.6 (validate, retry once, then fail safely). Remove the chat and mock-booking items from the scope-creep row.

