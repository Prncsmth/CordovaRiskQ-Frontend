# Cordova RiskQ — SRS Text Content

> Copy-ready text for the CPC capstone SRS. Front matter follows the team's earlier SRS (cover, signature page, change history); Sections 1–4 follow the CPC template numbering (ISO/IEC/IEEE 29148 / IEEE 830 layout).
> Everything below describes what the system actually does today (mobile app, admin dashboard, backend) as of October 13, 2026 (frontend `316f006`, backend `518877c`, admin `35b688f`).
> Items in **[brackets]** are for your team to confirm or fill in.

---

## Cover Page

SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
for
**Cordova RiskQ: A Geolocation-Based Emergency Response and Relief Coordination System for the Municipality of Cordova**

Presented by:
RAPADA, CARL IAN L.
DEGAMO, SMITH T.
INOC, CLYOD CEDRICK **[confirm spelling]**

Bachelor of Science in Information Technology (BSIT)
College of Computer Studies, Cordova Public College
Academic Year **[2025–2026 or 2026–2027]**

Document ID: CPC-BSIT-CAPSTONE-SRS-**[semester]**-CORDOVARISKQ
Version: **[version number of this release]**
Date of Publication: **[date]**

Partner Agency: Municipal Disaster Risk Reduction and Management Office (MDRRMO), Municipality of Cordova
Internal Adviser: Mr. Ariel Batoon

---

## Signature Page

This Software Requirements Specification (SRS) has been reviewed, evaluated, and approved by the project proponents, faculty advisers, internal and external advisers, and stakeholders of Cordova Public College. By signing below, the undersigned certify that this document accurately and completely defines the functional and non-functional requirements of Cordova RiskQ: A Geolocation-Based Emergency Response and Relief Coordination System for the Municipality of Cordova. Approval of this document signifies agreement on the scope, objectives, and requirements stated herein, and establishes it as the official reference for the design, development, testing, and implementation of the system.

| Name | Role | Signature | Date |
|---|---|---|---|
| [Name] | System Developer | | |
| [Name] | Project Manager | | |
| Mr. Ariel Batoon | Internal Adviser | | |
| [Name] | BSIT Capstone Instructor | | |
| [Name] | College of Computer Studies Faculty | | |
| [Name] | MDRRMO Representative (External Adviser) | | |

---

## Change History

The following table records the revisions made to this Software Requirements Specification throughout the development of Cordova RiskQ. Versions 1 to 3 are carried over from the earlier SRS; versions 4 onward are drafted from the project's development milestones. Replace **[Author]** with the responsible member's name.

| Version | Date | Author(s) | Description of Changes |
|---|---|---|---|
| 1 | April 25, 2026 | [Author] | Revised the scope from a combined web and mobile platform to a mobile-first system for faster emergency access, with a web dashboard for administrators. |
| 2 | April 25, 2026 | [Author] | Removed the AI-assisted support feature and replaced it with route navigation for responders. |
| 3 | July 6, 2026 | [Author] | [Describe the July 6 revision, or remove this row.] |
| 4 | July 29, 2026 | [Author] | Established the design system and base mobile interface; added the Home screen and Report Incident flow. |
| 5 | August 23, 2026 | [Author] | Added user profile, password change, report history, and onboarding; introduced the Responder role, the shared incident pipeline for reports and SOS alerts, and administrator role management. Removed the Volunteer role. |
| 6 | September 8, 2026 | [Author] | Added tide and weather flood-risk advisories, in-app and push notifications, the first-time user guide, multi-responder incident teams, barangay grouping, and real-time incident updates. |
| 7 | September 21, 2026 | [Author] | Added the Cordova geofence, incident photo evidence, completed-incident history, evacuation centers, and emergency hotlines; replaced placeholder data with live backend data. |
| 8 | September 29, 2026 | [Author] | Added email verification codes for registration and password reset. |
| 9 | October 13, 2026 | [Author] | Added BDRRMO and MDRRMO responder scope with automatic escalation, emergency alarms, report and profile photos, live announcement updates, and the 60-minute SOS expiry; aligned this document with the implemented system. |

---

## Preface

Cordova RiskQ: A Geolocation-Based Emergency Response and Relief Coordination System for the Municipality of Cordova is a capstone project of BSIT students of Cordova Public College, developed with the Municipal Disaster Risk Reduction and Management Office (MDRRMO) of Cordova, Cebu. It connects three groups of people who need each other during an emergency: residents who need help, the barangay and municipal responders who provide it, and the administrators who coordinate them. The system is made up of a mobile application for citizens and responders, a web-based administrator dashboard, and a central server that stores data and delivers alerts in real time.

Through the mobile application, a resident can send an SOS with one press, report an incident such as a flood, fire, medical emergency, or road accident with a photo and pinned location, find the nearest evacuation center with directions, and receive flood-risk advisories and official announcements. Responders from the Barangay and Municipal Disaster Risk Reduction and Management Offices (BDRRMO and MDRRMO) receive these incidents as alarms on the same application, join the response as a team, navigate to the scene, and share their live location so the person who asked for help can see them coming.

The administrator dashboard gives the municipality an operations view of the whole system: live incidents and SOS alerts on a map, responder status, evacuation center availability, announcements, support requests, reports, and analytics.

The developers focused on building a system that is fast to use under pressure, reliable when the network is weak, and limited to the area it serves. It aims to shorten the time between a resident asking for help and a responder arriving, and to give local government a clear, real-time picture of emergencies across Cordova's thirteen barangays.

---

## List of Figures

Take one screenshot per figure. Suggested numbering (adjust if you merge or drop screens):

**Citizen (mobile app)**
1. Login User Interface
2. Registration User Interface
3. Email Verification (OTP) User Interface
4. Forgot Password and Reset Password User Interface
5. Welcome, Terms and Conditions, and App Introduction User Interface
6. Phone Number Setup User Interface
7. Getting Started Tour User Interface
8. Citizen Home User Interface
9. SOS Active User Interface
10. Report Incident User Interface
11. Report Confirmation User Interface
12. Report History and Report Detail User Interface
13. Map User Interface
14. Evacuation Center Detail and Navigation User Interface
15. Track Responder User Interface
16. Notifications and Announcement Detail User Interface
17. Profile, User Profile, and Change Password User Interface
18. Settings User Interface
19. Emergency Hotlines User Interface
20. FAQs and Contact Support User Interface

**Responder (mobile app)**
21. Responder Welcome and Tour User Interface
22. Responder Dashboard User Interface
23. Incident Detail – New Incident (Accept/Decline) User Interface
24. Incident Detail – Lobby (Team Roster) User Interface
25. Incident Detail – On the Way and Navigation User Interface
26. Incident Detail – Arrived User Interface
27. Responder Live Map User Interface
28. Responder Notifications User Interface
29. Responder Settings and Completed Incidents User Interface

**Administrator (web dashboard)**
30. Admin Login User Interface
31. Admin Dashboard User Interface
32. Live Incidents and Incident Detail User Interface
33. SOS Alerts User Interface
34. Incident Reports User Interface
35. Live Map User Interface
36. Responders User Interface
37. Users and User Detail User Interface
38. Announcements User Interface
39. Evacuation Centers User Interface
40. Emergency Hotlines User Interface
41. Support Requests User Interface
42. Reports User Interface
43. Analytics User Interface
44. Audit Logs User Interface
45. Admin Settings User Interface

**Diagrams**
46. Citizen Use Case Diagram
47. Responder Use Case Diagram
48. Administrator Use Case Diagram
49. Automated System Processes Use Case Diagram
50. Entity-Relationship Diagram

---

## 1. Introduction

Cordova, Cebu is an island municipality made up of thirteen barangays, several of them low-lying and coastal. Floods, high tides, fires, medical emergencies, and road accidents all call for a fast response, yet residents often do not know which office to call, responders learn about incidents late or by word of mouth, and the municipality has no single, live picture of what is happening across its barangays. Every minute lost between an emergency and a response increases the risk to life and property.

The Cordova RiskQ System is a mobile and web-based emergency response platform designed for the residents, responders, and disaster risk reduction offices of Cordova. Residents use it to send SOS alerts, report incidents with photo and location evidence, and find evacuation centers. Responders use it to receive, join, and act on incidents within their assigned barangay. Administrators use it to monitor and coordinate the whole response from a central dashboard.

### 1.1 Purpose

The purpose of this document is to present the Cordova RiskQ System, a disaster risk and emergency response platform for the Municipality of Cordova, Cebu, made up of a mobile application for citizens and responders, a web-based administrator dashboard, and a central backend server. This document explains the features, functions, interfaces, and requirements of the system.

The system is designed to let residents request emergency help and report incidents from their phones, to deliver those requests as real-time alarms to the right responders based on location and assigned barangay, and to let administrators monitor incidents, responders, evacuation centers, and advisories in one place. It also provides flood-risk advisories based on tide and weather data, official announcements, emergency hotlines, and live responder tracking.

This document serves as a guide for the development, implementation, testing, and maintenance of the Cordova RiskQ System.

### 1.2 Scope

This project's scope focuses on the development of the Cordova RiskQ System, an emergency response platform for residents, responders, and administrators of the Municipality of Cordova, Cebu.

The system includes the following: user registration with email verification and Google sign-in; one-press SOS alerts; incident reporting with category, details, photo, and pinned location; report history and status tracking; live tracking of the responders assigned to a citizen's incident; evacuation center listing with map directions; tide and weather flood-risk advisories; official announcements; in-app and push notifications; emergency hotlines; and in-app support requests. For responders, it includes a barangay-based incident dashboard, incident alarms, a team roster per incident, turn-by-turn navigation, live location sharing, duty status, and a completed-incident history. For administrators, it includes a web dashboard for live incidents, SOS alerts, a live map, responder and user management, announcements, evacuation center and hotline management, support requests, reports with CSV export, analytics, and audit logs.

Within this system, relief coordination refers to helping residents reach safety and stay informed during a disaster: showing which evacuation centers are open or full and how to reach them, issuing flood-risk advisories, publishing official announcements, and listing emergency hotlines. The distribution of relief goods, donation management, and volunteer management are outside the scope of this version.

The system covers the thirteen barangays of the Municipality of Cordova only: Alegria, Bangbang, Buagsong, Catarman, Cogon, Dapitan, Day-as, Gabi, Gilutongan, Ibabao, Pilipog, Poblacion, and San Miguel. SOS alerts and incident reports sent from outside the municipal boundary are rejected. The mobile application is intended for Android devices with GPS and an internet connection, and the administrator dashboard for desktop web browsers. The system supports emergency response coordination but does not replace official emergency hotlines, and it does not dispatch vehicles or manage equipment.

### 1.3 Product Overview

#### 1.3.1 Product Perspective

The Cordova RiskQ System is made up of three connected parts:

1. **Mobile application** (citizen and responder): a single Android application built with React Native and Expo. The account's role, assigned by the system, decides whether the user sees the citizen screens or the responder screens.
2. **Administrator dashboard**: a web application built with Next.js, used by municipal staff to monitor and manage the system.
3. **Backend server**: a Node.js and Express server that holds all business rules, stores data in a PostgreSQL database through Prisma ORM, and delivers real-time updates through Socket.IO and push notifications through the Expo push service.

Both front ends talk only to the backend, through a REST API over HTTPS. The backend in turn uses external services: Google Sign-In for authentication, Resend for verification emails, Cloudinary for photo storage, Stormglass for tide data, Open-Meteo for weather data, and Mapbox for maps, place search, and driving directions. Neither front end connects to the database directly.

#### 1.3.2 Product Functions

Cordova RiskQ functions are the following:

**Citizen Features**

- User Registration and Login – Allows residents to create an account using email and password, verified by a 6-digit code sent by email, or to sign in with a Google account.
- Password Recovery – Allows users to reset a forgotten password using a 6-digit code sent to their registered email.
- Onboarding – Guides new users through the welcome screens, terms and conditions, mobile number entry, and an app tour.
- SOS Alert – Sends an emergency alert with the user's current GPS location to responders in one press, and allows the user to cancel it before a responder joins.
- Incident Reporting – Allows users to report a flood, fire, medical emergency, road accident, or other incident with details, an optional photo, an "urgent" marker, and a pinned location within Cordova.
- Report History and Status – Allows users to view their submitted reports and follow each one's status from pending to completed.
- Track Responder – Allows users to see the responders assigned to their incident, their status (en route or arrived), and their live location on a map.
- Evacuation Centers – Displays nearby evacuation centers and schools ranked by distance, with facilities, open or full status, and driving directions.
- Flood-Risk Advisory – Displays current tide level, flood-risk level (normal, watch, warning), and weather conditions, and notifies users when the risk level rises.
- Announcements – Displays the latest official announcement for the user's barangay on the home screen, updated immediately when an administrator publishes or removes one.
- Notifications – Provides an in-app notification inbox and push notifications for announcements, incident status changes, and flood-risk changes.
- Emergency Hotlines – Lists the emergency numbers of police, fire, medical, and maritime agencies serving Cordova, with one-tap calling.
- Profile Management – Allows users to view and update their name, mobile number, and profile photo, and to change their password.
- Contact Support – Allows users to send a support request to administrators and view its status.
- Settings and Help – Provides push notification, location, and dark mode settings, FAQs, and the app tutorial.

**Responder Features**

- Responder Login – Responders sign in through the same mobile application. Only an administrator can grant the responder role; there is no self-registration as a responder.
- Incident Dashboard – Displays active incidents within the responder's scope, grouped by barangay and prioritized by urgency, with filters, along with the latest announcement for responders.
- Incident Alarms – Sounds a siren with vibration when a new incident or SOS arrives (with a distinct sound for SOS) and when a teammate rings the team.
- Accept, Decline, and Rejoin – Allows a responder to join or decline an incident, leave it, and rejoin it later.
- Team Roster – Shows every responder on the incident and their individual status (joined, on the way, arrived), updated in real time.
- Ring Team – Sends an alarm to the other responders on the same incident.
- Navigation – Provides a map route and turn-by-turn directions to the incident location.
- Live Location Sharing – Shares the responder's location while on the way, so the citizen and the administrator can track them.
- Incident Completion and Cancellation – Allows an arrived responder to mark the incident completed or cancel it.
- Duty Status – Allows the responder to go on duty or off duty; off-duty responders do not receive new incident alerts.
- Reporter Information – Shows the reporter's details, photo, and the description they wrote, for responders actively handling the incident.
- Completed Incidents – Displays the responder's history of completed incidents.
- Responder Notifications – Provides notifications for new incidents, roster changes, escalations, and team rings.

**Administrator Features**

- Administrator Login – A separate, admin-only login for the web dashboard.
- Operations Dashboard – Shows key counts (active incidents, SOS alerts today, total responders), a 14-day incident trend, a live map preview, recent incidents, recent activity, responder duty status, evacuation center status, and quick actions.
- Live Incidents – Lists all incidents with status filters (active, responding, resolved, cancelled) and full incident details; an incident that is resolved or cancelled while the page is open stays in the list with its new status.
- SOS Alerts – Lists SOS alerts with their status and lets the administrator close an alert as resolved or dismissed; flags alerts left unattended.
- Incident Reports – Lists citizen-submitted incident reports.
- Live Map – Displays incidents, evacuation centers, and responders who are on the way to an incident on one map, updated in real time.
- Responder Management – Lists responders with duty status and unit, and assigns each responder's home barangay.
- User Management – Lists and searches users, promotes a citizen to responder with a unit (BDRRMO or MDRRMO), or reverts a responder to citizen.
- Announcements – Creates and deletes announcements with a priority (normal or urgent) and an audience (all users, responders only, or a specific barangay), which are delivered as notifications. Deleting an announcement removes it from users' screens immediately, and an older announcement never takes its place.
- Evacuation Center Management – Updates each center's open or full status and its available facilities.
- Hotline Management – Updates emergency hotline numbers.
- Support Requests – Views citizen support requests and updates their status (open, in progress, resolved).
- Reports – Filters incident history by date range, category, and barangay, shows totals, average response time, and resolution rate, and exports to CSV.
- Analytics – Displays incident trends, SOS trends, incident-type breakdown, response time by type, and incidents by hour of day.
- Audit Logs – Displays a searchable record of system events and administrator actions.
- Admin Settings – Allows the administrator to update their profile name and change their password.

#### 1.3.3 User Characteristics

The Cordova RiskQ System is designed for three kinds of users:

- **Citizens** are residents of Cordova of any age and background, including users with little technical experience. They are expected to know how to use a smartphone, grant location permission, and read simple instructions. They may be using the application while stressed or in danger, so emergency actions are reachable in one or two presses.
- **Responders** are members of the Barangay Disaster Risk Reduction and Management Office (BDRRMO) or the Municipal Disaster Risk Reduction and Management Office (MDRRMO). They are expected to be familiar with the barangay they serve and to keep the application open and their phone audible while on duty. BDRRMO responders handle incidents in their assigned barangay; MDRRMO responders cover the whole municipality as backup.
- **Administrators** are municipal staff who coordinate emergency response. They are expected to be comfortable with web applications on a desktop computer and to understand the municipality's emergency procedures.

#### 1.3.4 Limitations

- The system requires an internet connection (mobile data or Wi-Fi) to send SOS alerts and reports, receive alarms and notifications, and load maps.
- SOS alerts and incident reports can only be sent from within the Municipality of Cordova. Both the reporter's location and the pinned incident location must be inside the municipal boundary.
- Location accuracy depends on the device's GPS and signal conditions. Indoor or obstructed locations may be less accurate.
- Alerts may be delayed or not delivered during network outages, poor signal, or server downtime. Push notifications also depend on the device's notification settings and the Expo push service.
- Responders receive incidents only within their scope: a BDRRMO responder only receives incidents in the barangay assigned to them by the administrator, and a responder with no assigned unit or barangay receives none until the administrator assigns one.
- Off-duty responders do not receive new incident alerts.
- A citizen can only cancel their own SOS or report before a responder has joined it.
- Responder locations are shared only while a responder is on the way to an incident, not at all times.
- Flood-risk levels are derived from sea-level data with thresholds that have not yet been calibrated against official MDRRMO or PAGASA flood-stage data. They are advisory only.
- Tide data is refreshed about every 8 hours and weather data about every hour, so advisories are not minute-by-minute.
- Incident photos are limited to one image per report, up to 5 MB.
- The system depends on third-party services (Google Sign-In, Resend, Cloudinary, Stormglass, Open-Meteo, Mapbox, Expo push, and Neon PostgreSQL hosting) and is affected by their availability.
- The responder role can only be granted by an administrator. Administrator accounts cannot sign in to the mobile application.
- The system supports emergency coordination; it does not replace official emergency hotlines, and it does not dispatch vehicles, track equipment, or record people assisted.
- Relief goods distribution, donation management, and volunteer management are not included in this version.

### 1.4 Definitions

- **Cordova RiskQ System** – A disaster risk and emergency response platform for the Municipality of Cordova, Cebu, made up of a mobile application, an administrator dashboard, and a backend server.
- **Citizen** – A resident who uses the mobile application to request help, report incidents, and receive advisories.
- **Responder** – A BDRRMO or MDRRMO member who uses the mobile application to receive and respond to incidents.
- **Administrator** – Municipal staff who use the web dashboard to monitor and manage the system.
- **Barangay** – The smallest administrative division in the Philippines. Cordova has thirteen.
- **BDRRMO** – Barangay Disaster Risk Reduction and Management Office.
- **MDRRMO** – Municipal Disaster Risk Reduction and Management Office.
- **SOS** – A one-press emergency alert that sends the user's location to responders.
- **Incident** – A record of an emergency, created from a citizen's report or SOS, that responders act on.
- **Roster** – The list of responders who have joined an incident and each one's status.
- **Escalation** – Alerting MDRRMO responders when an incident has had no responder join within two minutes.
- **Relief Coordination** – In this system, guiding residents to safety and keeping them informed during a disaster through evacuation center status and directions, flood-risk advisories, announcements, and emergency hotlines.
- **Geofence** – The Cordova municipal boundary used to accept or reject SOS alerts and reports.
- **Flood-Risk Level** – The advisory level (normal, watch, or warning) derived from the current sea level.
- **OTP** – One-Time Password; the 6-digit code sent by email to verify registration or reset a password.
- **Push Notification** – A message shown on the device even when the application is not open.
- **GPS** – Global Positioning System.
- **API** – Application Programming Interface.
- **REST** – Representational State Transfer, the style of the system's web API.
- **JWT** – JSON Web Token, used to keep users signed in securely.
- **ORM** – Object-Relational Mapping.
- **UI** – User Interface.
- **CSV** – Comma-Separated Values, a spreadsheet-compatible export format.
- **SRS** – Software Requirements Specification.

---

## 2. References

[1] IEEE. IEEE Std 830-1998, IEEE Recommended Practice for Software Requirements Specifications. IEEE Computer Society, 1998.
[2] Cordova Public College CCS Faculty, CPC BSIT Capstone Guidelines (2026), 2026.
[3] Republic of the Philippines. Republic Act No. 10121, Philippine Disaster Risk Reduction and Management Act of 2010.
[4] Republic of the Philippines. Republic Act No. 10173, Data Privacy Act of 2012.
[5] National Institute of Standards and Technology. NIST Special Publication 800-63B, Digital Identity Guidelines: Authentication and Lifecycle Management.

---

## 3. Specific Requirements

### 3.1 External Interfaces

#### 3.1.1 User Interface

Place each screenshot, then its paragraph.

**Citizen**

**Authentication: Login User Interface (Figure 1)**
The login page is the starting point of the Cordova RiskQ mobile application. Users sign in with their registered email and password, or with their Google account. The system checks the account's role and takes citizens to the citizen home screen and responders to the responder dashboard. Repeated failed sign-in attempts are temporarily blocked to protect accounts from password guessing.

**Registration User Interface (Figure 2)**
The registration page allows new residents to create an account by entering their name, email address, and password. The password must be 8 to 64 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol. After the form is submitted, the system sends a verification code to the given email address before the account is created.

**Email Verification User Interface (Figure 3)**
The email verification page asks the user to enter the 6-digit code sent to their email. The code expires after 10 minutes and allows a limited number of attempts. Users can request a new code after a short waiting period. The account is created only after the correct code is entered.

**Forgot Password and Reset Password User Interface (Figure 4)**
The forgot password page allows users who cannot remember their password to request a 6-digit reset code by email. On the reset page, the user enters the code and a new password. Once the password is changed, every other signed-in session on that account is signed out, and the user is returned to the login page.

**Welcome, Terms and Conditions, and App Introduction User Interface (Figure 5)**
After registering, new users see a welcome screen, the terms and conditions they must accept to continue, and a short introduction to what the application does.

**Phone Number Setup User Interface (Figure 6)**
The phone number page asks the user for their mobile number, which is saved to their profile so responders can contact them during an emergency.

**Getting Started Tour User Interface (Figure 7)**
The getting started tour is a short guided walkthrough that points out the main features of the home screen, such as the SOS button, reporting, and the map. It can be replayed later from the profile menu.

**Citizen Home User Interface (Figure 8)**
The home page gives citizens immediate access to emergency features. It shows the SOS button, the flood-risk advisory banner with the current tide level and weather, the latest announcement for the user's barangay (which updates immediately when an administrator publishes or removes one), the nearest evacuation center based on the user's location, and a notification bell with an unread indicator.

**SOS Active User Interface (Figure 9)**
When the SOS button is pressed, the system sends the user's current location to responders and shows the active SOS screen. The screen shows the status of the alert and links to the Track Responder page once a responder is assigned. The user can cancel the SOS after confirming, as long as no responder has joined yet.

**Report Incident User Interface (Figure 10)**
The report incident page allows citizens to report an emergency by choosing a category (flood, fire, medical, road accident, or other), describing what happened, attaching an optional photo, marking it as urgent, and pinning the location on a map. The location defaults to the user's current GPS position and shows the nearest barangay. Reports pinned outside Cordova are not accepted.

**Report Confirmation User Interface (Figure 11)**
The report confirmation page tells the user that their report was submitted successfully and that responders have been notified, with options to view the report or return home.

**Report History and Report Detail User Interface (Figure 12)**
The report history page lists every report the user has submitted with its category, date, and current status. Selecting a report opens its details, including the description, photo, location, and the status of the response.

**Map User Interface (Figure 13)**
The map page shows the user's location and the evacuation centers and schools around them. Users can tap a marker for details and drop a pin to choose a location.

**Evacuation Center Detail and Navigation User Interface (Figure 14)**
The evacuation center detail page shows the center's name, address, type, available facilities (water, power, medical aid, restrooms), whether it is open or full, and its distance from the user. The navigation page shows a driving route from the user's current location to the center.

**Track Responder User Interface (Figure 15)**
The track responder page lets the citizen follow the response to their SOS or report. It shows the assigned responders, their status (finding a responder, en route, or arrived), their profile photo, and their live location on a map.

**Notifications and Announcement Detail User Interface (Figure 16)**
The notifications page lists the user's notifications, such as announcements, incident status updates, and flood-risk changes, with unread items highlighted and options to mark them as read or delete them. Selecting an announcement opens its full content.

**Profile, User Profile, and Change Password User Interface (Figure 17)**
The profile page is the user's account menu. From it, the user can view and edit their name, mobile number, and profile photo, change their password, and log out. Users who signed in with Google manage their password through Google instead.

**Settings User Interface (Figure 18)**
The settings page allows users to manage push notifications, location access, and dark mode, and gives access to the app tutorial, FAQs, emergency hotlines, and contact support.

**Emergency Hotlines User Interface (Figure 19)**
The emergency hotlines page lists the emergency numbers of the police, fire, medical, and maritime agencies serving Cordova, grouped by category. Tapping a number starts a phone call.

**FAQs and Contact Support User Interface (Figure 20)**
The FAQs page answers common questions about using the application. The contact support page allows the user to send a message to the administrators under a topic (app issue, report help, account, or other) and view the status of their earlier requests.

**Responder**

**Responder Welcome and Tour User Interface (Figure 21)**
When a responder signs in for the first time, the welcome screen and tour introduce the responder dashboard, incident alarms, and the steps for responding to an incident.

**Responder Dashboard User Interface (Figure 22)**
The responder dashboard lists the active incidents within the responder's scope, grouped by barangay and ordered by urgency and activity. It shows the flood-risk advisory, the latest announcement for responders, a duty status switch (on duty or offline), a notification bell, and a filter bar. When a new incident or SOS arrives, an alarm sounds and a pop-up appears.

**Incident Detail – New Incident User Interface (Figure 23)**
The new incident page shows the incident's category, urgency, location, time reported, the reporter's description and photo, and its distance from the responder. The responder can accept or decline the incident. A responder who left an incident earlier sees a Rejoin button instead.

**Incident Detail – Lobby User Interface (Figure 24)**
After accepting, the responder enters the lobby, which shows the team roster: every responder on the incident and each one's status, updated in real time. From here the responder can set out to the scene, ring the team, or leave the incident.

**Incident Detail – On the Way and Navigation User Interface (Figure 25)**
While on the way, the responder sees a map with the route to the incident and turn-by-turn directions. The responder's location is shared with the citizen and the administrator. The responder can mark that they have arrived or leave the incident.

**Incident Detail – Arrived User Interface (Figure 26)**
Once on scene, the responder can view the reporter's contact information and mark the incident as completed when the response is finished, or cancel the incident if needed.

**Responder Live Map User Interface (Figure 27)**
The live map shows the active incidents within the responder's scope on a map, so they can see where emergencies are happening across their area.

**Responder Notifications User Interface (Figure 28)**
The responder notifications page lists new incident alerts, roster updates from teammates, escalation alerts, and team rings.

**Responder Settings and Completed Incidents User Interface (Figure 29)**
The responder settings page allows the responder to manage their profile, password, and preferences and to log out. The completed incidents page lists the incidents the responder has helped complete.

**Administrator**

**Admin Login User Interface (Figure 30)**
The admin login page is the entry point of the web dashboard. Only administrator accounts can sign in here, and administrator accounts cannot sign in to the mobile application.

**Admin Dashboard User Interface (Figure 31)**
The admin dashboard is the municipality's operations view. It shows the number of active incidents, SOS alerts today, and total responders; a 14-day incident and SOS trend chart; a live map preview; recent incidents; a live feed of recent activity; responder duty status; evacuation center status; and quick actions.

**Live Incidents and Incident Detail User Interface (Figure 32)**
The live incidents page lists all incidents with counts and filters for active, responding, resolved, and cancelled, and updates in real time; an incident closed while the page is open stays in the list marked Resolved or Cancelled. The incident detail page shows the incident's full information, location, and the responders handling it.

**SOS Alerts User Interface (Figure 33)**
The SOS alerts page lists every SOS with its sender, location, time, and status, and flags alerts that have gone unattended. The administrator can close an alert as resolved or dismissed.

**Incident Reports User Interface (Figure 34)**
The incident reports page lists the incident reports submitted by citizens, with their category, barangay, status, and time.

**Live Map User Interface (Figure 35)**
The live map shows active incidents, evacuation centers, and responders who are on the way to an incident, each with its own marker, and updates in real time. Layers can be turned on and off.

**Responders User Interface (Figure 36)**
The responders page lists all responders with their unit (BDRRMO or MDRRMO), assigned barangay, and duty status, with search and filters. The administrator can assign a responder's home barangay.

**Users and User Detail User Interface (Figure 37)**
The users page lists all registered users with search; users who signed in with Google without a display name are shown by their email address. From a user's detail page, the administrator can promote a citizen to responder (choosing BDRRMO or MDRRMO) or revert a responder to citizen.

**Announcements User Interface (Figure 38)**
The announcements page allows the administrator to publish an announcement with a title, content, priority (normal or urgent), and audience (all users, responders only, or a specific barangay). Publishing sends a notification to the chosen audience and updates the announcement shown in the mobile application immediately. Past announcements can be viewed and deleted; deleting the current announcement removes it from users' screens right away, and no older announcement is shown in its place.

**Evacuation Centers User Interface (Figure 39)**
The evacuation centers page lists all centers and lets the administrator mark each one open or full and update its facilities. Changes appear immediately in the mobile application.

**Emergency Hotlines User Interface (Figure 40)**
The emergency hotlines page lets the administrator update the names and numbers of the emergency hotlines shown to citizens.

**Support Requests User Interface (Figure 41)**
The support requests page lists the messages citizens have sent through Contact Support, with filters by status. The administrator can mark each request as open, in progress, or resolved.

**Reports User Interface (Figure 42)**
The reports page shows completed and cancelled incidents filtered by date range, category, and barangay, with the total number of incidents, the average response time, and the resolution rate. The results can be exported to a CSV file.

**Analytics User Interface (Figure 43)**
The analytics page shows charts of incident trends, SOS trends, incidents by type, response time by type, and incidents by hour of day, for a chosen date range.

**Audit Logs User Interface (Figure 44)**
The audit logs page shows a searchable, filterable record of system events (such as SOS alerts, incidents, and responder actions) and administrator actions (such as role changes, announcements, and barangay assignments), including who did what and when.

**Admin Settings User Interface (Figure 45)**
The admin settings page allows the administrator to update their display name and change their password.

#### 3.1.2 Hardware Interface

- Android smartphones used by citizens and responders, with GPS for location, a camera for incident and profile photos, a speaker and vibration motor for alarms, and mobile data or Wi-Fi for internet access.
- Desktop or laptop computers used by administrators to access the web dashboard through a modern web browser.
- A cloud server that hosts the backend application and a cloud-hosted PostgreSQL database.

#### 3.1.3 Software Interface

**Mobile Application**
- React Native 0.86 with Expo SDK 57 and Expo Router
- Expo Location (GPS), Expo Image Picker (photos), Expo Notifications (push), Expo Audio (alarms)
- Mapbox Maps (with a Leaflet map fallback for development)
- Google Sign-In
- Socket.IO client

**Administrator Dashboard**
- Next.js 16 with React 19
- Tailwind CSS
- Mapbox GL (live map)
- Recharts (charts)
- Socket.IO client

**Backend Server**
- Node.js 20 or later with Express.js 5 and TypeScript
- Prisma ORM 7
- Neon PostgreSQL
- Socket.IO (real-time updates)
- Zod (input validation), bcrypt (password hashing), JSON Web Token (sessions)

**Third-Party Services**
- Google Sign-In (authentication)
- Resend (verification and password reset emails)
- Cloudinary (photo storage)
- Expo Push Notification Service (push notifications)
- Stormglass API (tide and sea-level data)
- Open-Meteo API (weather data)
- Mapbox Directions and Geocoding APIs (routes and place names)

#### 3.1.4 Communication Interface

The Cordova RiskQ System uses the internet, through mobile data or Wi-Fi, to connect the mobile application and the administrator dashboard to the backend server. Requests such as signing in, sending an SOS, submitting a report, and updating an incident are sent through a REST API over HTTPS, with each user's session carried in a secure token. Real-time updates, such as team roster changes, responder locations, and new activity on the admin dashboard, are delivered through Socket.IO connections, so screens update without refreshing. Alerts reach users' phones through the Expo push notification service even when the application is closed. Verification and password reset codes are delivered by email. The backend also communicates with external services over HTTPS for tide and weather data, photo storage, maps, and directions.

### 3.2 Functional Requirements

Draw one use case diagram per subsection below, using the actors and use cases listed, and place the narrative under it.

#### 3.2.1 Citizen Use Case (Figure 46)

**Actors:** Citizen (primary); Email Service, Google Sign-In, Map Service (secondary)

**Use cases:** Register Account; Verify Email (OTP); Sign In; Sign In with Google; Reset Password; Complete Onboarding; Send SOS; Cancel SOS; Report Incident; Attach Photo; Pin Location; View Report History; View Report Detail; Track Responder; View Evacuation Centers; Navigate to Evacuation Center; View Flood-Risk Advisory; View Announcements; Manage Notifications; Call Emergency Hotline; Manage Profile; Change Password; Contact Support; Manage Settings

**Relationships:** Register Account «include» Verify Email. Report Incident «include» Pin Location. Report Incident «extend» Attach Photo. Send SOS «extend» Cancel SOS. Send SOS «extend» Track Responder. Report Incident «extend» Track Responder.

**Narrative:**
The diagram shows how a citizen interacts with the Cordova RiskQ System. A citizen first registers an account, which includes verifying their email with a 6-digit code sent by the Email Service, or signs in with Google. After onboarding, the citizen can send an SOS with their current location in one press, or report an incident by choosing a category, describing it, pinning its location, and optionally attaching a photo. The system checks that the location is within Cordova before accepting it. The citizen can cancel an SOS or report until a responder joins, follow its status in their report history, and track the assigned responders' live location until they arrive.

The citizen can also view evacuation centers and get directions from the Map Service, check the flood-risk advisory, read announcements, manage notifications, call emergency hotlines, update their profile and password, and contact support.

#### 3.2.2 Responder Use Case (Figure 47)

**Actors:** Responder (BDRRMO or MDRRMO) (primary); Citizen, Map Service (secondary)

**Use cases:** Sign In; Set Duty Status; View Incident Dashboard; Filter Incidents; Receive Incident Alarm; View Incident Detail; Accept Incident; Decline Incident; Leave Incident; Rejoin Incident; View Team Roster; Ring Team; Navigate to Incident; Share Live Location; Mark Arrived; View Reporter Information; Complete Incident; Cancel Incident; View Live Map; View Notifications; View Completed Incidents; Manage Profile

**Relationships:** Accept Incident «include» View Incident Detail. Navigate to Incident «include» Share Live Location. Mark Arrived «extend» Complete Incident. Mark Arrived «extend» Cancel Incident.

**Narrative:**
The diagram shows how a responder handles an incident. An on-duty responder receives an alarm when a new incident or SOS is created within their scope: a BDRRMO responder receives incidents in their assigned barangay, and MDRRMO responders receive them as backup when no BDRRMO is on duty in that barangay or when no one has joined within two minutes. The responder views the incident details, including the reporter's description and photo, and accepts or declines.

After accepting, the responder joins the team roster, where each responder's status is visible to the team in real time, and can ring the team to alert the others. While on the way, the responder follows the route from the Map Service and their live location is shared with the citizen. On arrival, the responder can view the reporter's contact information and mark the incident completed, or cancel it. A responder can leave an incident before arriving and rejoin it later. Responders can also set their duty status, view the live map, read notifications, and review the incidents they have completed.

#### 3.2.3 Administrator Use Case (Figure 48)

**Actor:** Administrator

**Use cases:** Sign In to Dashboard; View Operations Dashboard; Monitor Live Incidents; View Incident Detail; Manage SOS Alerts; View Incident Reports; View Live Map; Manage Responders; Assign Responder Barangay; Manage Users; Promote to Responder; Revert to Citizen; Publish Announcement; Delete Announcement; Manage Evacuation Centers; Manage Hotlines; Manage Support Requests; Generate Reports; Export CSV; View Analytics; View Audit Logs; Manage Admin Profile; Change Password

**Relationships:** Manage Users «extend» Promote to Responder. Manage Users «extend» Revert to Citizen. Manage Responders «extend» Assign Responder Barangay. Generate Reports «extend» Export CSV.

**Narrative:**
The diagram shows how the administrator manages the Cordova RiskQ System from the web dashboard. After signing in through the admin-only login, the administrator monitors the overall situation through the operations dashboard, live incidents, SOS alerts, incident reports, and the live map, which shows incidents, evacuation centers, and responders on the way in real time. The administrator closes SOS alerts as resolved or dismissed.

The administrator manages people by promoting citizens to responders with a unit, reverting responders to citizens, and assigning each responder's home barangay, which decides which incidents that responder receives. The administrator also publishes announcements to all users, responders only, or a specific barangay; updates evacuation center status and hotline numbers; and responds to support requests. Finally, the administrator generates reports with CSV export, reviews analytics, and checks the audit logs, which record every administrator action.

#### 3.2.4 Automated System Processes Use Case (Figure 49)

**Actors:** System Scheduler (primary); Tide Service (Stormglass), Weather Service (Open-Meteo), Push Notification Service (secondary); Citizen, Responder, Administrator (receivers)

**Use cases:** Refresh Tide Data; Refresh Weather Data; Compute Flood-Risk Level; Send Flood-Risk Notification; Escalate Unanswered Incident; Expire Unattended SOS; Send Push Notification; Broadcast Real-Time Update; Prune Old Audit Logs

**Narrative:**
The diagram shows the processes the system performs on its own. The system retrieves tide data from the Tide Service about every 8 hours and weather data from the Weather Service every hour, computes the flood-risk level, and notifies citizens when the level rises. Every 30 seconds it checks for incidents that no responder has joined within two minutes and alerts the MDRRMO responders. It also marks an SOS alert as expired when no responder has joined it within 60 minutes (an administrator-configurable setting), deletes administrator audit log entries older than 90 days, and delivers push notifications and real-time updates to citizens, responders, and administrators as events happen.

#### 3.2.5 Functional Requirements List

Optional: a numbered list your adviser can trace to the use cases.

| ID | Requirement |
|---|---|
| FR-01 | The system shall allow a resident to register using an email and password, and shall create the account only after the 6-digit code sent to that email is verified. |
| FR-02 | The system shall allow users to sign in using email and password or a Google account. |
| FR-03 | The system shall allow users to reset a forgotten password using a 6-digit code sent to their email. |
| FR-04 | The system shall route each user to the citizen or responder screens based on the role stored on their account. |
| FR-05 | The system shall allow a citizen to send an SOS containing their GPS location, and shall not create a duplicate SOS while one is still active. |
| FR-06 | The system shall allow a citizen to report an incident with a category, details (up to 1,000 characters), an optional photo, an urgent marker, and a pinned location. |
| FR-07 | The system shall reject an SOS or report whose location, or whose reporter's location, is outside the Municipality of Cordova. |
| FR-08 | The system shall set each incident's urgency from its category (fire and medical: high; flood and road accident: medium; other: low) and raise it one level when the reporter marks it urgent. |
| FR-09 | The system shall alert the BDRRMO responders assigned to the incident's barangay, and the MDRRMO responders when that barangay has no on-duty BDRRMO or when no responder has joined within two minutes. |
| FR-10 | The system shall allow responders to accept, decline, leave, and rejoin an incident, and to set their status to on the way, arrived, completed, or cancelled. |
| FR-11 | The system shall show every responder on an incident and their status to the team in real time. |
| FR-12 | The system shall share a responder's location with the citizen and the administrator while the responder is on the way to the incident. |
| FR-13 | The system shall allow a citizen to cancel their SOS or report only until a responder has joined it. |
| FR-14 | The system shall list evacuation centers with their facilities, status, and distance, and provide driving directions. |
| FR-15 | The system shall display the current tide level, flood-risk level, and weather, and notify citizens when the flood-risk level rises. |
| FR-16 | The system shall deliver in-app and push notifications for announcements, incident status changes, flood-risk changes, new incidents, roster updates, escalations, and team rings. |
| FR-17 | The system shall allow administrators to promote a citizen to responder with a unit, revert a responder to citizen, and assign a responder's barangay. |
| FR-18 | The system shall allow administrators to publish announcements to all users, responders only, or a specific barangay. |
| FR-19 | The system shall allow administrators to update evacuation center status and facilities and emergency hotline numbers. |
| FR-20 | The system shall allow administrators to view and close SOS alerts, and view all incidents and their details. |
| FR-21 | The system shall allow administrators to generate filtered incident reports and export them to CSV. |
| FR-22 | The system shall record each administrator action in an audit log and keep it for 90 days. |
| FR-23 | The system shall allow citizens to send support requests and administrators to update their status. |
| FR-24 | The system shall mark an SOS alert as expired when no responder has joined it within 60 minutes, configurable by the system administrator. |

### 3.3 Usability Requirements

Users should be able to understand and use the Cordova RiskQ System quickly, including during an emergency. The SOS button shall be reachable from the citizen home screen with a single press, and reporting an incident shall take only a few steps, with the location filled in automatically from the device's GPS. New citizens and responders are guided by a first-time tour that can be replayed at any time. Error messages shall state what went wrong and offer a retry, so a network failure is never mistaken for "no data." Icon-only buttons carry accessibility labels for screen readers, and the application offers a dark mode. Responder alarms use a loud siren with vibration so they are noticed even when the phone is not being looked at, with a different sound for SOS alerts. The administrator dashboard groups its pages by task (overview, emergency operations, people, resources, and system) so administrators can find what they need without training.

### 3.4 Performance Requirements

Users must have an internet connection to send alerts, receive notifications, and load maps. The system shall deliver new incidents and SOS alerts to the responders in scope as soon as they are created, and shall escalate any incident that no responder has joined within two minutes, checking every 30 seconds. Team roster changes, responder locations, and administrator dashboard activity shall be pushed in real time through Socket.IO without the user refreshing. The responder dashboard and notification badges also refresh automatically every few seconds as a fallback. Report photos are reduced to 1,280 pixels before uploading, and a photo upload that takes longer than 30 seconds is abandoned so a weak signal never blocks the report from being sent. Tide data shall be refreshed about every 8 hours and weather data every hour. Administrator lists for users, responders, SOS alerts, and announcements are paginated so pages stay fast as data grows. The system shall support many citizens, responders, and administrators using it at the same time.

### 3.5 Logical Database Requirements

The Cordova RiskQ System uses a PostgreSQL database to store and manage the entities below, whose relationships are shown in Figure 50 (draw it from the backend's `prisma/schema.prisma`). A User reports many Incidents and sends many SOS Alerts; an SOS Alert may be linked to one Incident; Incident Responder links responders to Incidents (many-to-many); a User has many Notifications and Support Requests, and an administrator has many Announcements and Admin Audit Log entries. Evacuation Center, Hotline, Tide Status, Pending Registration, and Password Reset Code stand alone.

- **User** – account details (name, email, mobile number, profile photo), hashed password or Google account link, role (citizen, responder, or admin), responder unit and assigned barangay, duty status, last known location, and push notification token.
- **Pending Registration** and **Password Reset Code** – temporary records holding hashed verification codes, their expiry time, and the number of attempts.
- **SOS Alert** – the sender, location, status, and time of each SOS.
- **Incident** – the source (SOS or report), reporter, category, details, photo, location and place name, urgency, status, and times.
- **Incident Responder** – one record per responder per incident, holding that responder's status (joined, on the way, arrived, left, or declined).
- **Tide Status** – the latest sea level, next high or low tide, flood-risk level, air temperature, and weather description.
- **Announcement** – title, content, priority, audience, target barangay, the administrator who published it, and the time it was deleted, if any. Deleted announcements are kept as records but are no longer shown to users.
- **Notification** – each user's notifications, with type, title, message, read status, and the related record.
- **Evacuation Center** – name, address, type, facilities, location, and open or full status.
- **Hotline** – the name, number, and category of each emergency hotline.
- **Support Request** – the sender, topic, subject, message, and status.
- **Admin Audit Log** – the administrator, action, description, and time of each administrator action.

Passwords and verification codes are stored only as one-way hashes, never as plain text.

### 3.6 Design Constraints

The Cordova RiskQ mobile application must run on Android devices with GPS and an internet connection, and the administrator dashboard must run in a modern desktop web browser. SOS alerts and incident reports are limited to locations within the Municipality of Cordova, Cebu. The system must ensure that users can only access what their role allows: citizens see only their own reports, responders see only incidents within their scope, and only administrators can access the dashboard and change user roles. Responder roles cannot be self-assigned. The mobile application and the dashboard must communicate only with the backend server and never access the database directly. The system depends on third-party services for authentication, email, photo storage, maps, tide and weather data, and push notifications. Incident photos are limited to one image of up to 5 MB.

### 3.7 Software System Attributes

a) **Reliability:** The Cordova RiskQ System should deliver SOS alerts and incident reports to responders accurately and without duplicates; pressing SOS twice does not create two alerts. Unanswered incidents are escalated automatically so no emergency is left without a responder. Simultaneous requests, such as two SOS presses or two first-time Google sign-ins for the same account at the same moment, are handled safely without errors or duplicate records. Database operations are retried on temporary connection failures, and the application tells the user clearly when a request fails so they can try again.

b) **Availability:** The system should be available at all times, since emergencies can happen at any hour. Push notifications reach users even when the application is closed, and the system keeps running its scheduled checks (escalation, SOS expiry, tide and weather updates) without anyone needing to trigger them.

c) **Security:** Passwords are hashed with bcrypt and must meet a strength policy of 8 to 64 characters with uppercase and lowercase letters, a number, and a symbol. New accounts and password resets require a 6-digit email code that expires in 10 minutes and allows a limited number of attempts. Sessions use signed tokens that expire after 7 days, and changing a password signs out all other sessions. Repeated login, code, report, and upload attempts are rate-limited to prevent abuse. Every request is checked against the user's role, and personal contact details are shown only to the responders actively handling that user's incident. All communication uses HTTPS. These measures support compliance with the Data Privacy Act of 2012.

d) **Maintainability:** The system is divided into three separate applications (mobile, admin, and backend), each organized by feature, with input validation rules defined in one place and shared across endpoints. Core business rules are covered by automated tests, and each feature is documented with a design specification and implementation plan, so the system can be updated and extended by future developers.

#### 3.7.1 Non-Functional Requirements List

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | The system shall escalate an incident to MDRRMO responders when no responder has joined it within 2 minutes, checking at least every 30 seconds. |
| NFR-02 | Performance | The system shall push team roster changes, responder locations, and administrator activity to open screens in real time, without a manual refresh. |
| NFR-03 | Performance | The mobile application shall reduce report photos to at most 1,280 pixels and abandon an upload that exceeds 30 seconds, so the report is still sent. |
| NFR-04 | Performance | The system shall refresh tide data about every 8 hours and weather data every hour. |
| NFR-05 | Usability | The SOS function shall be reachable from the citizen home screen with one press. |
| NFR-06 | Usability | Responder alarms shall use a siren with vibration, with a distinct sound for SOS alerts. |
| NFR-07 | Usability | Failed requests shall show an error with a retry option, distinct from an empty result. |
| NFR-08 | Security | Passwords shall be 8 to 64 characters with an uppercase letter, a lowercase letter, a number, and a symbol, and shall be stored as bcrypt hashes. |
| NFR-09 | Security | Verification codes shall expire after 10 minutes and allow a limited number of attempts. |
| NFR-10 | Security | Sessions shall expire after 7 days, and changing a password shall sign out all other sessions. |
| NFR-11 | Security | Login, verification code, report, photo, and support request endpoints shall be rate-limited. |
| NFR-12 | Security | Each request shall be authorized by role; a user's contact details shall be visible only to responders actively handling that user's incident. |
| NFR-13 | Reliability | Repeated or simultaneous SOS presses and first-time Google sign-ins shall not create duplicate records or errors. |
| NFR-14 | Reliability | The system shall retry database operations on temporary connection failures. |
| NFR-15 | Data Retention | Administrator audit log entries shall be kept for 90 days. |
| NFR-16 | Constraint | SOS alerts and incident reports shall be accepted only from within the Municipality of Cordova. |

---

## 4. Verification

During registration, users must enter a 6-digit verification code sent to their email address before their account is created, and the same verification is required to reset a password. Each SOS alert and incident report is verified to come from within the Municipality of Cordova, using both the pinned location and the reporter's own location. Each request is verified against the user's role, so only responders can act on incidents, only responders within the incident's scope receive and can accept it, and only administrators can access the dashboard and change user roles. Uploaded photos are verified to be images within the size limit.

The system's functions were verified through automated tests of the backend's core rules (authentication including Google sign-in, password reset, verification codes, rate limiting, geofencing, incident urgency, responder scope and roster, SOS triggering, announcements, notifications, and input validation) and of the mobile application's incident grouping, filtering, and announcement refresh logic, together with manual testing of each user interface for citizens, responders, and administrators on Android devices and a desktop browser, as summarized below.

| Requirements | Verification Method |
|---|---|
| FR-01 – FR-04, NFR-08 – NFR-10 (accounts and sign-in) | Automated backend tests; manual test with a real email account and a Google account |
| FR-05 – FR-08, FR-13, NFR-16 (SOS and reporting within Cordova) | Automated geofence, urgency, and SOS tests; manual test inside and outside the boundary |
| FR-09 – FR-11, FR-24, NFR-01 (responder alerting, scope, escalation, SOS expiry) | Automated responder-scope, roster, and SOS-expiry tests; manual test with BDRRMO and MDRRMO accounts |
| FR-12, NFR-02 (real-time roster and tracking) | Manual test with two or more devices on the same incident |
| FR-16, NFR-06 (notifications and alarms) | Manual test of push delivery and alarm sounds on Android devices |
| FR-14, FR-15, NFR-04 (evacuation centers and advisories) | Manual test against live backend data |
| FR-17 – FR-23, NFR-15 (administrator functions) | Manual test of each dashboard page against the backend |
| NFR-11 – NFR-14 (security and reliability) | Automated rate-limit, authorization, concurrency, and retry tests |
