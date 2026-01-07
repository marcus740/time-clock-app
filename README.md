# Time Clock Application

A comprehensive time tracking application that allows you to clock in/out, track hours, and export data to Excel and Google Sheets.

## Features

### Core Functionality
- ⏰ **Clock In/Out**: Simple one-click time tracking
- 📝 **Manual Entry**: Add time entries manually for past dates
- 💾 **Local Storage**: Data persists in your browser
- 🔄 **Real-time Updates**: Live clock and session duration tracking

### Data Export Options
- 📈 **Excel Export**: Download your time records as .xlsx files
- 📊 **Google Sheets Integration**: Sync data directly to Google Sheets
- 📄 **CSV Export**: Export data in CSV format
- 💾 **Backup/Restore**: Create and restore data backups

### Reporting & Analytics
- 📊 **Summary Dashboard**: View hours worked today, this week, and this month
- 📈 **Detailed Reports**: Filter records by date range or time period
- 🎯 **Visual Indicators**: Easy-to-read status indicators and progress tracking

### Additional Features
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 🌐 **Offline Capable**: Works without internet connection
- 🗑️ **Data Management**: Edit and delete individual records
- 🔒 **Privacy-Focused**: All data stored locally by default

## Quick Start

### Option 1: Simple HTML Version (No Server Required)

1. Download the files:
   - `index.html`
   - `script.js`

2. Open `index.html` in your web browser

3. Start tracking time immediately!

### Option 2: Full Server Version (Advanced Features)

1. **Install Dependencies**
   ```bash
   cd time-clock
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Open in Browser**
   ```
   http://localhost:3000
   ```

## Google Sheets Integration Setup

To connect with Google Sheets:

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one

2. **Enable Google Sheets API**
   - Navigate to APIs & Services > Library
   - Search for "Google Sheets API" and enable it

3. **Create Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Configure OAuth consent screen if prompted
   - Add your domain (e.g., `http://localhost:3000`) to authorized origins

4. **Update Configuration**
   - Replace `YOUR_API_KEY` and `YOUR_CLIENT_ID` in `script.js`
   - Add your credentials from Google Cloud Console

5. **Get Spreadsheet ID**
   - Create a Google Sheet
   - Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

## Usage Guide

### Basic Time Tracking

1. **Clock In**
   - Click the "Clock In" button when you start working
   - The status will change to "Currently Clocked In"
   - You'll see the session duration update in real-time

2. **Clock Out**
   - Click the "Clock Out" button when you finish working
   - The session will be automatically saved to your records

3. **View Records**
   - All your time entries appear in the table below
   - Use filters to view specific date ranges

### Manual Time Entry

1. Select the date you want to add time for
2. Enter the start and end times
3. Add optional notes
4. Click "Add Entry"

### Exporting Data

1. **Excel Export**
   - Click "Export to Excel" to download a .xlsx file
   - File includes all your time records with calculations

2. **Google Sheets Sync**
   - First, connect to Google Sheets using the "Connect" button
   - Enter your Spreadsheet ID
   - Click "Sync to Google Sheets" to upload all data

3. **CSV Export**
   - Click "Export to CSV" for a simple text format
   - Compatible with most spreadsheet applications

### Filtering and Reports

- Use the filter dropdown to view:
  - All records
  - Today only
  - This week
  - This month
  - Custom date range

- Summary cards show:
  - Hours worked today
  - Hours worked this week
  - Hours worked this month
  - Total hours tracked

## API Documentation (Server Version)

### Endpoints

- `GET /api/records` - Get all time records
- `POST /api/records` - Create a new record
- `PUT /api/records/:id` - Update a record
- `DELETE /api/records/:id` - Delete a record
- `POST /api/clock-in` - Clock in
- `POST /api/clock-out` - Clock out
- `GET /api/status/:userId` - Get current clock status
- `POST /api/export-google-sheets` - Export to Google Sheets
- `GET /api/summary` - Get summary report
- `GET /api/backup` - Download backup
- `POST /api/restore` - Restore from backup

### Example API Usage

```javascript
// Clock in
fetch('/api/clock-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'user123' })
});

// Get records
fetch('/api/records')
    .then(response => response.json())
    .then(records => console.log(records));
```

## Data Format

Time records are stored in the following format:

```json
{
  "id": 1640995200000,
  "userId": "default",
  "date": "2024-01-01",
  "clockInTime": "2024-01-01T09:00:00.000Z",
  "clockOutTime": "2024-01-01T17:00:00.000Z",
  "notes": "Regular work day",
  "createdAt": "2024-01-01T09:00:00.000Z",
  "updatedAt": "2024-01-01T17:00:00.000Z"
}
```

## Customization

### Styling
- Edit the CSS in `index.html` to change colors, fonts, and layout
- The design uses CSS Grid and Flexbox for responsive layout

### Functionality
- Modify `script.js` to add new features or change behavior
- Server-side logic can be extended in `server.js`

### Data Storage
- By default, data is stored in browser localStorage
- Server version stores data in JSON files
- Can be easily adapted to use databases (MongoDB, PostgreSQL, etc.)

## Troubleshooting

### Google Sheets Integration Issues

1. **"Google API not loaded yet"**
   - Wait a few seconds and try again
   - Check your internet connection

2. **"Failed to connect to Google Sheets"**
   - Verify your API credentials are correct
   - Check that Google Sheets API is enabled
   - Ensure your domain is in authorized origins

3. **"Failed to sync with Google Sheets"**
   - Verify the Spreadsheet ID is correct
   - Make sure the spreadsheet is accessible to your Google account
   - Check that the spreadsheet isn't protected

### General Issues

1. **Data not saving**
   - Check browser console for errors
   - Ensure localStorage is enabled
   - Try clearing browser cache

2. **Export not working**
   - Modern browsers are required for file downloads
   - Check popup blockers aren't preventing downloads

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Security Notes

- Data is stored locally in your browser by default
- Google Sheets integration requires OAuth authentication
- No sensitive data is transmitted to external servers (except Google Sheets when explicitly syncing)
- For production use, consider implementing user authentication and secure data storage

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to modify and use for your projects.

---

**Happy time tracking! ⏰**