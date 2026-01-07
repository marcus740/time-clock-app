// Debug version of Google API initialization
async function debugGoogleAPI() {
    console.log('🔍 Starting Google API debug...');
    
    // Check if gapi is available
    if (typeof gapi === 'undefined') {
        console.error('❌ GAPI not loaded - Google API script failed to load');
        return;
    }
    
    console.log('✅ GAPI script loaded successfully');
    
    // Test credentials
    const apiKey = 'AIzaSyDxBTHWVk1vXAlhpZF3N2ueBvVFUFqhJds';
    const clientId = '172233323706-0089j5fuie81o8abd5lt64togifdoefc.apps.googleusercontent.com';
    
    console.log('🔑 Using API Key:', apiKey.substring(0, 20) + '...');
    console.log('🆔 Using Client ID:', clientId.substring(0, 20) + '...');
    
    try {
        // Load auth2
        await new Promise((resolve, reject) => {
            gapi.load('auth2', {
                callback: resolve,
                onerror: reject
            });
        });
        
        console.log('✅ Auth2 library loaded');
        
        // Initialize client
        await gapi.client.init({
            apiKey: apiKey,
            clientId: clientId,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            scope: 'https://www.googleapis.com/auth/spreadsheets'
        });
        
        console.log('✅ Google API client initialized successfully!');
        
        // Check auth status
        const authInstance = gapi.auth2.getAuthInstance();
        const isSignedIn = authInstance.isSignedIn.get();
        
        console.log('🔐 Sign-in status:', isSignedIn ? 'Signed in' : 'Not signed in');
        
        return true;
        
    } catch (error) {
        console.error('❌ Google API initialization failed:');
        console.error('Error details:', error);
        
        // Check specific error types
        if (error.details) {
            console.error('Error details:', error.details);
        }
        
        if (error.error) {
            console.error('Error type:', error.error);
        }
        
        return false;
    }
}

// Run the debug when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(debugGoogleAPI, 2000);
});

// Also provide a manual test function
window.testGoogleAPI = debugGoogleAPI;