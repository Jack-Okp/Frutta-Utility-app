# Frutta Utility

Frutta Utility is a lightweight, mobile-first, no-friction utility checklist web app designed for engineers. It enables quick and easy inspections and maintenance logging for boilers, compressors, generators, and chillers.

The app uses a "soft login" mechanism, allowing engineers to quickly log in with their name, email, and shift details, which are remembered locally for seamless future visits. Data can be saved either locally in the browser or synchronized with Google Sheets for easy collaboration and storage without needing a traditional database.

## Features

- **Soft Login System:** Enter your details once. The app remembers you on the device/browser.
- **Machine Dashboard:** View all your tracked utility machines (Boiler, Compressor, Generator, Chiller) with quick health badges and running hours at a glance.
- **Asset Registration:** Easily register new machines with relevant metadata (Tag Number, Model, S/N, Maintenance Intervals).
- **Customizable Checklist Templates:** Start from a standard checklist template and tailor it to each specific machine using the built-in drag-and-drop-style Template Builder.
- **Fast Checklist Entry:** Log daily, weekly, or monthly checks in seconds with conditional fields, pass/fail toggles, and numerical inputs.
- **Offline/Local First Fallback:** The app can function entirely using the browser's `localStorage` if no Google Sheets backend is provided.
- **PDF Reporting:** Export professional PDF reports of machine histories and inspections filtered by date range.

## Tech Stack

- **Frontend:** React + Vite
- **Routing:** React Router (`react-router-dom`)
- **Styling:** Vanilla CSS (Responsive, Mobile-First, Industrial Theme)
- **PDF Generation:** `html2pdf.js`
- **Backend (Optional):** Google Apps Script acting as a serverless REST API connected to Google Sheets.

## Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-github-repo-url>
   cd frutta-utility
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at fruttautility`

### Google Sheets Integration (Optional but recommended)

To use Google Sheets as your database instead of local storage:

1. Create a new Google Sheet named **Frutta Utility DB**.
2. Go to `Extensions` > `Apps Script` in your Google Sheet.
3. Replace the code in `Code.gs` with the provided `apps_script.js` code found in this repository.
4. Replace `SPREADSHEET_ID` in the script with your actual Google Sheet ID (found in the URL of your sheet).
5. Click **Deploy** -> **New deployment**.
6. Select type **Web app**.
7. Execute as **Me**, and set Who has access to **Anyone**.
8. Copy the generated Web App URL.
9. Create a `.env` file in the root of your Vite project and add the URL:
   ```env
   VITE_GOOGLE_APPS_SCRIPT_URL=your_web_app_url_here
   ```
10. Restart your development server. The app will automatically initialize the needed tabs in your Google Sheet and start syncing data!

## Usage Flow
1. **First Visit:** Fill out the soft login form.
2. **Dashboard:** Add your utility machines.
3. **Machine Details:** Click on a machine to view its history or manage its checklist templates.
4. **Log Inspection:** Click Daily/Weekly/Monthly to fill out the form.
5. **Export:** Go to the Export tab, select a machine and date range, and click Download PDF.

## License
MIT License
