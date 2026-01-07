// Time Clock JavaScript Application
class TimeClockApp {
    constructor() {
        this.isGoogleApiLoaded = false;
        this.isSignedIn = false;
        this.currentSession = null;
        this.records = JSON.parse(localStorage.getItem('timeClockRecords') || '[]');
        
        this.init();
        this.updateDisplay();
        this.startClock();
    }

    init() {
        // Set today's date for manual entry
        document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
        
        // Load Google API
        this.loadGoogleAPI();
        
        // Check if currently clocked in
        const session = JSON.parse(localStorage.getItem('currentSession') || 'null');
        if (session && session.clockInTime && !session.clockOutTime) {
            this.currentSession = session;
            this.updateClockStatus(true);
        }

        // Apply default filter
        this.applyFilter();
    }

    async loadGoogleAPI() {
        try {
            // Wait for both gapi and google to be available
            await new Promise((resolve) => {
                const checkLibraries = () => {
                    if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                        resolve();
                    } else {
                        setTimeout(checkLibraries, 100);
                    }
                };
                checkLibraries();
            });

            // Initialize gapi client
            await new Promise((resolve, reject) => {
                gapi.load('client', {
                    callback: resolve,
                    onerror: reject
                });
            });

            await gapi.client.init({
                apiKey: 'AIzaSyDxBTHWVk1vXAlhpZF3N2ueBvVFUFqhJds',
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });

            // Initialize Google Identity Services
            google.accounts.id.initialize({
                client_id: '172233323706-0089j5fuie81o8abd5lt64togifdoefc.apps.googleusercontent.com',
                callback: (response) => {
                    // Handle sign-in response
                    this.handleSignInResponse(response);
                }
            });

            this.isGoogleApiLoaded = true;
            this.updateAuthStatus();
            console.log('✅ Google API and Identity Services initialized successfully');

        } catch (error) {
            console.error('❌ Failed to load Google API:', error);
        }
    }

    startClock() {
        setInterval(() => {
            this.updateCurrentTime();
            if (this.currentSession) {
                this.updateSessionInfo();
            }
        }, 1000);
    }

    updateCurrentTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleString();
    }

    updateSessionInfo() {
        if (!this.currentSession) return;
        
        const clockInTime = new Date(this.currentSession.clockInTime);
        const now = new Date();
        const duration = this.calculateDuration(clockInTime, now);
        
        document.getElementById('sessionInfo').innerHTML = 
            `Clocked in since: ${clockInTime.toLocaleTimeString()}<br>Current session: ${duration}`;
    }

    clockIn() {
        const now = new Date();
        this.currentSession = {
            id: Date.now(),
            date: now.toISOString().split('T')[0],
            clockInTime: now.toISOString(),
            clockOutTime: null,
            notes: '',
            sheetsRowNumber: null
        };
        
        localStorage.setItem('currentSession', JSON.stringify(this.currentSession));
        this.updateClockStatus(true);
        this.showNotification('Clocked in successfully!', 'success');
        
        // Auto-sync to Google Sheets
        this.autoSyncToSheets('clockIn', this.currentSession);
    }

    clockOut() {
        if (!this.currentSession) return;
        
        const now = new Date();
        this.currentSession.clockOutTime = now.toISOString();
        
        const duration = this.calculateDuration(
            new Date(this.currentSession.clockInTime),
            new Date(this.currentSession.clockOutTime)
        );
        
        // Auto-sync to Google Sheets before completing
        this.autoSyncToSheets('clockOut', this.currentSession);
        
        // Add to records
        this.records.push({ ...this.currentSession });
        localStorage.setItem('timeClockRecords', JSON.stringify(this.records));
        localStorage.removeItem('currentSession');
        
        this.currentSession = null;
        this.updateClockStatus(false);
        this.updateDisplay();
        this.showNotification(`Clocked out successfully! Session duration: ${duration}`, 'success');
    }

    addManualEntry() {
        const date = document.getElementById('manualDate').value;
        const timeIn = document.getElementById('manualTimeIn').value;
        const timeOut = document.getElementById('manualTimeOut').value;
        const notes = document.getElementById('manualNotes').value;

        if (!date || !timeIn || !timeOut) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const timeInDate = new Date(`${date}T${timeIn}`);
        const timeOutDate = new Date(`${date}T${timeOut}`);

        if (timeOutDate <= timeInDate) {
            this.showNotification('Clock out time must be after clock in time', 'error');
            return;
        }

        const entry = {
            id: Date.now(),
            date: date,
            clockInTime: timeInDate.toISOString(),
            clockOutTime: timeOutDate.toISOString(),
            notes: notes,
            sheetsRowNumber: null
        };

        this.records.push(entry);
        localStorage.setItem('timeClockRecords', JSON.stringify(this.records));
        
        // Auto-sync complete entry to Google Sheets
        this.autoSyncToSheets('manualEntry', entry);
        
        // Clear form
        document.getElementById('manualTimeIn').value = '';
        document.getElementById('manualTimeOut').value = '';
        document.getElementById('manualNotes').value = '';
        
        this.updateDisplay();
        this.showNotification('Manual entry added successfully!', 'success');
    }

    updateClockStatus(isClockedIn) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const clockInBtn = document.getElementById('clockInBtn');
        const clockOutBtn = document.getElementById('clockOutBtn');

        if (isClockedIn) {
            statusIndicator.className = 'status-indicator in';
            statusText.textContent = 'Currently Clocked In';
            clockInBtn.disabled = true;
            clockOutBtn.disabled = false;
        } else {
            statusIndicator.className = 'status-indicator out';
            statusText.textContent = 'Currently Clocked Out';
            document.getElementById('sessionInfo').innerHTML = '';
            clockInBtn.disabled = false;
            clockOutBtn.disabled = true;
        }
    }

    updateDisplay() {
        this.updateSummaryCards();
        this.updateRecordsTable();
    }

    updateSummaryCards() {
        const today = new Date().toISOString().split('T')[0];
        const startOfWeek = this.getStartOfWeek();
        const startOfMonth = this.getStartOfMonth();

        let todayHours = 0;
        let weekHours = 0;
        let monthHours = 0;
        let totalHours = 0;

        this.records.forEach(record => {
            if (record.clockOutTime) {
                const duration = this.calculateHours(
                    new Date(record.clockInTime),
                    new Date(record.clockOutTime)
                );

                totalHours += duration;

                if (record.date === today) {
                    todayHours += duration;
                }

                if (record.date >= startOfWeek) {
                    weekHours += duration;
                }

                if (record.date >= startOfMonth) {
                    monthHours += duration;
                }
            }
        });

        document.getElementById('todayHours').textContent = todayHours.toFixed(2);
        document.getElementById('weekHours').textContent = weekHours.toFixed(2);
        document.getElementById('monthHours').textContent = monthHours.toFixed(2);
        document.getElementById('totalHours').textContent = totalHours.toFixed(2);
    }

    updateRecordsTable() {
        const tbody = document.getElementById('recordsTableBody');
        tbody.innerHTML = '';

        const sortedRecords = [...this.records].sort((a, b) => new Date(b.clockInTime) - new Date(a.clockInTime));

        sortedRecords.forEach(record => {
            const row = tbody.insertRow();
            
            const date = new Date(record.clockInTime).toLocaleDateString();
            const timeIn = new Date(record.clockInTime).toLocaleTimeString();
            const timeOut = record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : 'In Progress';
            const duration = record.clockOutTime ? 
                this.calculateDuration(new Date(record.clockInTime), new Date(record.clockOutTime)) : 
                'In Progress';

            row.innerHTML = `
                <td>${date}</td>
                <td>${timeIn}</td>
                <td>${timeOut}</td>
                <td>${duration}</td>
                <td>${record.notes || ''}</td>
                <td>
                    <button class="delete-btn" onclick="timeClockApp.deleteRecord(${record.id})">
                        Delete
                    </button>
                </td>
            `;
        });
    }

    deleteRecord(id) {
        if (confirm('Are you sure you want to delete this record?')) {
            this.records = this.records.filter(record => record.id !== id);
            localStorage.setItem('timeClockRecords', JSON.stringify(this.records));
            this.updateDisplay();
            this.showNotification('Record deleted successfully!', 'success');
        }
    }

    applyFilter() {
        const filterPeriod = document.getElementById('filterPeriod').value;
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;

        let filteredRecords = [...this.records];

        if (startDate && endDate) {
            filteredRecords = filteredRecords.filter(record => 
                record.date >= startDate && record.date <= endDate
            );
        } else {
            switch (filterPeriod) {
                case 'today':
                    const today = new Date().toISOString().split('T')[0];
                    filteredRecords = filteredRecords.filter(record => record.date === today);
                    break;
                case 'week':
                    const startOfWeek = this.getStartOfWeek();
                    filteredRecords = filteredRecords.filter(record => record.date >= startOfWeek);
                    break;
                case 'month':
                    const startOfMonth = this.getStartOfMonth();
                    filteredRecords = filteredRecords.filter(record => record.date >= startOfMonth);
                    break;
            }
        }

        // Temporarily replace records for display
        const originalRecords = this.records;
        this.records = filteredRecords;
        this.updateRecordsTable();
        this.records = originalRecords;
    }

    exportToExcel() {
        const data = this.records.map(record => ({
            'Date': record.date,
            'Clock In': new Date(record.clockInTime).toLocaleTimeString(),
            'Clock Out': record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : 'In Progress',
            'Duration (Hours)': record.clockOutTime ? 
                this.calculateHours(new Date(record.clockInTime), new Date(record.clockOutTime)).toFixed(2) : 
                'In Progress',
            'Notes': record.notes || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Time Records");
        
        const filename = `time-records-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        
        this.showNotification('Excel file downloaded successfully!', 'success');
    }

    exportToCSV() {
        const data = this.records.map(record => ({
            'Date': record.date,
            'Clock In': new Date(record.clockInTime).toLocaleTimeString(),
            'Clock Out': record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : 'In Progress',
            'Duration (Hours)': record.clockOutTime ? 
                this.calculateHours(new Date(record.clockInTime), new Date(record.clockOutTime)).toFixed(2) : 
                'In Progress',
            'Notes': record.notes || ''
        }));

        const csv = this.arrayToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time-records-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showNotification('CSV file downloaded successfully!', 'success');
    }

    arrayToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }

    handleGoogleAuth() {
        if (!this.isGoogleApiLoaded) {
            this.showNotification('Google API not loaded yet. Please try again.', 'error');
            return;
        }

        if (this.isSignedIn) {
            // Sign out
            google.accounts.id.disableAutoSelect();
            this.isSignedIn = false;
            this.accessToken = null;
            this.updateAuthStatus();
            this.showNotification('Signed out from Google Sheets', 'info');
        } else {
            // Sign in - request access token for Sheets API
            const client = google.accounts.oauth2.initTokenClient({
                client_id: '172233323706-0089j5fuie81o8abd5lt64togifdoefc.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/spreadsheets',
                callback: (response) => {
                    if (response.access_token) {
                        this.accessToken = response.access_token;
                        this.isSignedIn = true;
                        this.updateAuthStatus();
                        this.showNotification('Successfully connected to Google Sheets!', 'success');
                    } else {
                        this.showNotification('Failed to get access token', 'error');
                    }
                },
            });
            client.requestAccessToken();
        }
    }

    handleSignInResponse(response) {
        // Handle the ID token response from Google Identity Services
        console.log('Google Identity response:', response);
    }

    extractSpreadsheetId(url) {
        // Extract spreadsheet ID from various Google Sheets URL formats
        if (!url) return null;
        
        // Handle different URL formats:
        // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
        // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
        // Just the ID itself
        
        // If it's already just an ID (no slashes), return as-is
        if (!url.includes('/')) {
            return url.trim();
        }
        
        // Extract from full URL
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
            return match[1];
        }
        
        // If no match found, return null
        return null;
    }

    async autoSyncToSheets(action, record) {
        // Check if auto-sync is enabled
        const autoSyncEnabled = document.getElementById('autoSyncEnabled').checked;
        if (!autoSyncEnabled || !this.isSignedIn || !this.accessToken) {
            return;
        }

        const spreadsheetUrl = document.getElementById('spreadsheetUrl').value;
        const spreadsheetId = this.extractSpreadsheetId(spreadsheetUrl);
        if (!spreadsheetId) {
            return;
        }

        try {
            // Set the access token for gapi
            gapi.client.setToken({
                access_token: this.accessToken
            });

            if (action === 'clockIn') {
                await this.appendClockInToSheets(spreadsheetId, record);
            } else if (action === 'clockOut') {
                await this.updateClockOutInSheets(spreadsheetId, record);
            } else if (action === 'manualEntry') {
                await this.appendCompleteRowToSheets(spreadsheetId, record);
            }
        } catch (error) {
            console.error('Auto-sync failed:', error);
            // Don't show error notification for auto-sync failures to avoid interrupting workflow
        }
    }

    async ensureHeaders(spreadsheetId) {
        try {
            // Check if headers exist
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'A1:E1'
            });

            const values = response.result.values;
            if (!values || values.length === 0 || !values[0] || values[0].length === 0) {
                // Add headers if they don't exist
                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: 'A1:E1',
                    valueInputOption: 'RAW',
                    resource: {
                        values: [['Date', 'Clock In', 'Clock Out', 'Duration (Hours)', 'Notes']]
                    }
                });
                console.log('✅ Added headers to Google Sheet');
            }
        } catch (error) {
            console.log('Could not add headers:', error);
        }
    }

    async appendClockInToSheets(spreadsheetId, record) {
        // Ensure headers exist
        await this.ensureHeaders(spreadsheetId);

        const clockInTime = new Date(record.clockInTime);
        const data = [
            record.date,
            clockInTime.toLocaleTimeString(),
            '', // Clock out time (empty for now)
            '', // Duration (empty for now)
            record.notes || ''
        ];

        // Find the first empty row or append after existing data
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'A:E',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [data]
            }
        });

        // Store the row number for later update when clocking out
        const range = response.result.updates.updatedRange;
        const rowMatch = range.match(/A(\d+):E\d+/);
        if (rowMatch) {
            record.sheetsRowNumber = parseInt(rowMatch[1]);
            // Update local storage with row number
            localStorage.setItem('currentSession', JSON.stringify(record));
        }

        console.log('✅ Auto-synced clock-in to Google Sheets');
    }

    async updateClockOutInSheets(spreadsheetId, record) {
        if (!record.sheetsRowNumber) {
            // If no row number stored, append as new row
            await this.appendCompleteRowToSheets(spreadsheetId, record);
            return;
        }

        const clockOutTime = new Date(record.clockOutTime);
        const duration = this.calculateHours(
            new Date(record.clockInTime),
            new Date(record.clockOutTime)
        ).toFixed(2);

        // Update only the clock out time and duration columns
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `C${record.sheetsRowNumber}:D${record.sheetsRowNumber}`,
            valueInputOption: 'RAW',
            resource: {
                values: [[
                    clockOutTime.toLocaleTimeString(),
                    duration
                ]]
            }
        });

        console.log('✅ Auto-synced clock-out to Google Sheets');
    }

    async appendCompleteRowToSheets(spreadsheetId, record) {
        const clockInTime = new Date(record.clockInTime);
        const clockOutTime = record.clockOutTime ? new Date(record.clockOutTime) : null;
        const duration = clockOutTime ? 
            this.calculateHours(clockInTime, clockOutTime).toFixed(2) : 
            'In Progress';

        const data = [
            record.date,
            clockInTime.toLocaleTimeString(),
            clockOutTime ? clockOutTime.toLocaleTimeString() : 'In Progress',
            duration,
            record.notes || ''
        ];

        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'A:E',
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [data]
            }
        });

        console.log('✅ Auto-synced complete record to Google Sheets');
    }

    updateAuthStatus() {
        const indicator = document.getElementById('authIndicator');
        const status = document.getElementById('authStatus');
        const authBtn = document.getElementById('authBtn');

        if (this.isSignedIn) {
            indicator.className = 'auth-indicator connected';
            status.textContent = 'Connected to Google Sheets';
            authBtn.textContent = 'Disconnect from Google Sheets';
        } else {
            indicator.className = 'auth-indicator disconnected';
            status.textContent = 'Not connected to Google Sheets';
            authBtn.textContent = 'Connect to Google Sheets';
        }
    }

    async syncToGoogleSheets() {
        if (!this.isSignedIn || !this.accessToken) {
            this.showNotification('Please connect to Google Sheets first', 'error');
            return;
        }

        const spreadsheetUrl = document.getElementById('spreadsheetUrl').value;
        if (!spreadsheetUrl) {
            this.showNotification('Please enter your Google Sheets URL', 'error');
            return;
        }

        const spreadsheetId = this.extractSpreadsheetId(spreadsheetUrl);
        if (!spreadsheetId) {
            this.showNotification('Invalid Google Sheets URL. Please paste a valid Google Sheets link.', 'error');
            return;
        }

        console.log('Extracted Spreadsheet ID:', spreadsheetId);

        try {
            const data = [
                ['Date', 'Clock In', 'Clock Out', 'Duration (Hours)', 'Notes'],
                ...this.records.map(record => [
                    record.date,
                    new Date(record.clockInTime).toLocaleTimeString(),
                    record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : 'In Progress',
                    record.clockOutTime ? 
                        this.calculateHours(new Date(record.clockInTime), new Date(record.clockOutTime)).toFixed(2) : 
                        'In Progress',
                    record.notes || ''
                ])
            ];

            // Set the access token for gapi
            gapi.client.setToken({
                access_token: this.accessToken
            });

            const response = await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: 'A1:E' + (data.length),
                valueInputOption: 'RAW',
                resource: {
                    values: data
                }
            });

            this.showNotification('Data synced to Google Sheets successfully!', 'success');
        } catch (error) {
            console.error('Google Sheets sync failed:', error);
            this.showNotification('Failed to sync with Google Sheets. Check your Spreadsheet ID.', 'error');
        }
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            localStorage.removeItem('timeClockRecords');
            localStorage.removeItem('currentSession');
            this.records = [];
            this.currentSession = null;
            this.updateClockStatus(false);
            this.updateDisplay();
            this.showNotification('All data cleared successfully!', 'success');
        }
    }

    calculateDuration(startTime, endTime) {
        const diffMs = endTime - startTime;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    calculateHours(startTime, endTime) {
        const diffMs = endTime - startTime;
        return diffMs / (1000 * 60 * 60);
    }

    getStartOfWeek() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek;
        return new Date(now.setDate(diff)).toISOString().split('T')[0];
    }

    getStartOfMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        `;

        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#28a745';
                break;
            case 'error':
                notification.style.backgroundColor = '#dc3545';
                break;
            case 'info':
                notification.style.backgroundColor = '#007bff';
                break;
            default:
                notification.style.backgroundColor = '#6c757d';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Global functions for HTML onclick events
function clockIn() {
    timeClockApp.clockIn();
}

function clockOut() {
    timeClockApp.clockOut();
}

function addManualEntry() {
    timeClockApp.addManualEntry();
}

function handleGoogleAuth() {
    timeClockApp.handleGoogleAuth();
}

function syncToGoogleSheets() {
    timeClockApp.syncToGoogleSheets();
}

function exportToExcel() {
    timeClockApp.exportToExcel();
}

function exportToCSV() {
    timeClockApp.exportToCSV();
}

function clearAllData() {
    timeClockApp.clearAllData();
}

function applyFilter() {
    timeClockApp.applyFilter();
}

// Initialize the app when page loads
let timeClockApp;
document.addEventListener('DOMContentLoaded', function() {
    timeClockApp = new TimeClockApp();
});

// Google API load callback
function onGoogleApiLoad() {
    if (window.onGoogleApiLoad) {
        window.onGoogleApiLoad();
    }
}