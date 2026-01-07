const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Data file path
const DATA_FILE = path.join(__dirname, 'data', 'time-records.json');

// Google Sheets configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Initialize data file if it doesn't exist
async function initializeDataFile() {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(DATA_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Check if file exists
        await fs.access(DATA_FILE);
    } catch (error) {
        await fs.writeFile(DATA_FILE, JSON.stringify([]));
    }
}

// Read data from file
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return [];
    }
}

// Write data to file
async function writeData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Get all time records
app.get('/api/records', async (req, res) => {
    try {
        const records = await readData();
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

// Add a new time record
app.post('/api/records', async (req, res) => {
    try {
        const records = await readData();
        const newRecord = {
            id: Date.now(),
            ...req.body,
            createdAt: new Date().toISOString()
        };
        
        records.push(newRecord);
        const success = await writeData(records);
        
        if (success) {
            res.status(201).json(newRecord);
        } else {
            res.status(500).json({ error: 'Failed to save record' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to create record' });
    }
});

// Update a time record
app.put('/api/records/:id', async (req, res) => {
    try {
        const records = await readData();
        const id = parseInt(req.params.id);
        const index = records.findIndex(record => record.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        records[index] = {
            ...records[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        const success = await writeData(records);
        
        if (success) {
            res.json(records[index]);
        } else {
            res.status(500).json({ error: 'Failed to update record' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update record' });
    }
});

// Delete a time record
app.delete('/api/records/:id', async (req, res) => {
    try {
        const records = await readData();
        const id = parseInt(req.params.id);
        const filteredRecords = records.filter(record => record.id !== id);
        
        if (filteredRecords.length === records.length) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        const success = await writeData(filteredRecords);
        
        if (success) {
            res.json({ message: 'Record deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete record' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

// Clock in
app.post('/api/clock-in', async (req, res) => {
    try {
        const records = await readData();
        const { userId = 'default' } = req.body;
        
        // Check if user is already clocked in
        const activeSession = records.find(record => 
            record.userId === userId && 
            record.clockInTime && 
            !record.clockOutTime
        );
        
        if (activeSession) {
            return res.status(400).json({ error: 'User is already clocked in' });
        }
        
        const newSession = {
            id: Date.now(),
            userId,
            date: new Date().toISOString().split('T')[0],
            clockInTime: new Date().toISOString(),
            clockOutTime: null,
            notes: '',
            createdAt: new Date().toISOString()
        };
        
        records.push(newSession);
        const success = await writeData(records);
        
        if (success) {
            res.status(201).json(newSession);
        } else {
            res.status(500).json({ error: 'Failed to clock in' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to clock in' });
    }
});

// Clock out
app.post('/api/clock-out', async (req, res) => {
    try {
        const records = await readData();
        const { userId = 'default', notes = '' } = req.body;
        
        // Find active session
        const sessionIndex = records.findIndex(record => 
            record.userId === userId && 
            record.clockInTime && 
            !record.clockOutTime
        );
        
        if (sessionIndex === -1) {
            return res.status(400).json({ error: 'No active session found' });
        }
        
        records[sessionIndex].clockOutTime = new Date().toISOString();
        records[sessionIndex].notes = notes;
        records[sessionIndex].updatedAt = new Date().toISOString();
        
        const success = await writeData(records);
        
        if (success) {
            res.json(records[sessionIndex]);
        } else {
            res.status(500).json({ error: 'Failed to clock out' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to clock out' });
    }
});

// Get current session status
app.get('/api/status/:userId?', async (req, res) => {
    try {
        const records = await readData();
        const userId = req.params.userId || 'default';
        
        const activeSession = records.find(record => 
            record.userId === userId && 
            record.clockInTime && 
            !record.clockOutTime
        );
        
        res.json({
            isClockedIn: !!activeSession,
            session: activeSession || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
    }
});

// Export to Google Sheets
app.post('/api/export-google-sheets', async (req, res) => {
    try {
        const { spreadsheetId, accessToken } = req.body;
        
        if (!spreadsheetId || !accessToken) {
            return res.status(400).json({ error: 'Spreadsheet ID and access token are required' });
        }
        
        const records = await readData();
        
        // Set up Google Sheets API with the provided access token
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        
        const sheets = google.sheets({ version: 'v4', auth });
        
        // Prepare data for Google Sheets
        const headers = ['Date', 'Clock In', 'Clock Out', 'Duration (Hours)', 'Notes'];
        const rows = records.map(record => [
            record.date,
            record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString() : '',
            record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : 'In Progress',
            record.clockOutTime ? 
                ((new Date(record.clockOutTime) - new Date(record.clockInTime)) / (1000 * 60 * 60)).toFixed(2) :
                'In Progress',
            record.notes || ''
        ]);
        
        const values = [headers, ...rows];
        
        // Clear existing data and write new data
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'A:Z'
        });
        
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'A1',
            valueInputOption: 'RAW',
            resource: { values }
        });
        
        res.json({ message: 'Data exported to Google Sheets successfully', rowsUpdated: values.length });
    } catch (error) {
        console.error('Google Sheets export error:', error);
        res.status(500).json({ error: 'Failed to export to Google Sheets' });
    }
});

// Generate summary report
app.get('/api/summary', async (req, res) => {
    try {
        const records = await readData();
        const { startDate, endDate, userId = 'default' } = req.query;
        
        let filteredRecords = records.filter(record => record.userId === userId && record.clockOutTime);
        
        if (startDate && endDate) {
            filteredRecords = filteredRecords.filter(record => 
                record.date >= startDate && record.date <= endDate
            );
        }
        
        const summary = {
            totalSessions: filteredRecords.length,
            totalHours: 0,
            averageSessionLength: 0,
            dailyBreakdown: {},
            weeklyBreakdown: {},
            monthlyBreakdown: {}
        };
        
        filteredRecords.forEach(record => {
            if (record.clockOutTime) {
                const hours = (new Date(record.clockOutTime) - new Date(record.clockInTime)) / (1000 * 60 * 60);
                summary.totalHours += hours;
                
                // Daily breakdown
                if (!summary.dailyBreakdown[record.date]) {
                    summary.dailyBreakdown[record.date] = 0;
                }
                summary.dailyBreakdown[record.date] += hours;
                
                // Weekly breakdown
                const weekStart = getWeekStart(new Date(record.date));
                if (!summary.weeklyBreakdown[weekStart]) {
                    summary.weeklyBreakdown[weekStart] = 0;
                }
                summary.weeklyBreakdown[weekStart] += hours;
                
                // Monthly breakdown
                const monthKey = record.date.substring(0, 7); // YYYY-MM
                if (!summary.monthlyBreakdown[monthKey]) {
                    summary.monthlyBreakdown[monthKey] = 0;
                }
                summary.monthlyBreakdown[monthKey] += hours;
            }
        });
        
        summary.averageSessionLength = summary.totalSessions > 0 ? 
            summary.totalHours / summary.totalSessions : 0;
        
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

// Backup data
app.get('/api/backup', async (req, res) => {
    try {
        const records = await readData();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `time-records-backup-${timestamp}.json`;
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Restore data from backup
app.post('/api/restore', async (req, res) => {
    try {
        const { records, replaceExisting = false } = req.body;
        
        if (!Array.isArray(records)) {
            return res.status(400).json({ error: 'Invalid backup data format' });
        }
        
        let existingRecords = [];
        if (!replaceExisting) {
            existingRecords = await readData();
        }
        
        const mergedRecords = [...existingRecords, ...records];
        const success = await writeData(mergedRecords);
        
        if (success) {
            res.json({ 
                message: 'Data restored successfully', 
                recordsRestored: records.length,
                totalRecords: mergedRecords.length
            });
        } else {
            res.status(500).json({ error: 'Failed to restore data' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to restore data' });
    }
});

// Utility function to get week start date
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
    await initializeDataFile();
    app.listen(PORT, () => {
        console.log(`Time Clock Server running on port ${PORT}`);
        console.log(`Open http://localhost:${PORT} to access the application`);
    });
}

startServer().catch(console.error);