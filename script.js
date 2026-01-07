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
            await new Promise((resolve) => {
                if (typeof gapi !== 'undefined') {
                    resolve();
                } else {
                    window.onGoogleApiLoad = resolve;
                }
            });

            await gapi.load('auth2:client', () => {
                gapi.client.init({
                    apiKey: 'YOUR_API_KEY', // Replace with your actual API key
                    clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // Replace with your client ID
                    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                    scope: 'https://www.googleapis.com/auth/spreadsheets'
                }).then(() => {
                    this.isGoogleApiLoaded = true;
                    const authInstance = gapi.auth2.getAuthInstance();
                    this.isSignedIn = authInstance.isSignedIn.get();
                    this.updateAuthStatus();
                }).catch(error => {
                    console.log('Google API initialization failed:', error);
                });
            });
        } catch (error) {
            console.log('Failed to load Google API:', error);
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
            notes: ''
        };
        
        localStorage.setItem('currentSession', JSON.stringify(this.currentSession));
        this.updateClockStatus(true);
        this.showNotification('Clocked in successfully!', 'success');
    }

    clockOut() {
        if (!this.currentSession) return;
        
        const now = new Date();
        this.currentSession.clockOutTime = now.toISOString();
        
        // Add to records
        this.records.push({ ...this.currentSession });
        localStorage.setItem('timeClockRecords', JSON.stringify(this.records));
        localStorage.removeItem('currentSession');
        
        const duration = this.calculateDuration(
            new Date(this.currentSession.clockInTime),
            new Date(this.currentSession.clockOutTime)
        );
        
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
            notes: notes
        };

        this.records.push(entry);
        localStorage.setItem('timeClockRecords', JSON.stringify(this.records));
        
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

        const authInstance = gapi.auth2.getAuthInstance();
        if (this.isSignedIn) {
            authInstance.signOut().then(() => {
                this.isSignedIn = false;
                this.updateAuthStatus();
                this.showNotification('Signed out from Google Sheets', 'info');
            });
        } else {
            authInstance.signIn().then(() => {
                this.isSignedIn = true;
                this.updateAuthStatus();
                this.showNotification('Successfully connected to Google Sheets!', 'success');
            }).catch(error => {
                console.error('Google Sign-in failed:', error);
                this.showNotification('Failed to connect to Google Sheets', 'error');
            });
        }
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
        if (!this.isSignedIn) {
            this.showNotification('Please connect to Google Sheets first', 'error');
            return;
        }

        const spreadsheetId = document.getElementById('spreadsheetId').value;
        if (!spreadsheetId) {
            this.showNotification('Please enter a Spreadsheet ID', 'error');
            return;
        }

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