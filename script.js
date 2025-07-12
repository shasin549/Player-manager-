let players = [];
let targetValue;
let editIndex = -1;
let db;

// DOM Elements
const addPlayerBtn = document.getElementById('addPlayerBtn');
const resetBtn = document.getElementById('resetBtn');
const targetInput = document.getElementById('targetInput');

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PlayerManagerDB', 1);
        
        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(new Error("Database error: " + event.target.error.message));
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('players')) {
                const store = db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('position', 'position', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
        };
    });
}

// Load players from DB
async function loadPlayers() {
    try {
        const transaction = db.transaction(['players'], 'readonly');
        const store = transaction.objectStore('players');
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                players = request.result || [];
                resolve(players);
            };
            
            request.onerror = (event) => {
                reject(new Error('Failed to load players: ' + event.target.error));
            };
        });
    } catch (error) {
        console.error('Error in loadPlayers:', error);
        throw error;
    }
}

// Save player to DB
async function savePlayer(player) {
    try {
        const transaction = db.transaction(['players'], 'readwrite');
        const store = transaction.objectStore('players');
        
        const request = editIndex >= 0 
            ? store.put({ ...player, id: players[editIndex].id }) 
            : store.add(player);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('Player saved successfully');
                resolve();
            };
            
            request.onerror = (event) => {
                reject(new Error('Failed to save player: ' + event.target.error));
            };
        });
    } catch (error) {
        console.error('Error in savePlayer:', error);
        throw error;
    }
}

// Add/Update player with proper validation
async function addPlayer() {
    try {
        const name = document.getElementById('name').value.trim();
        const position = document.getElementById('position').value;
        const playingStyle = document.getElementById('playingStyle').value;
        const value = parseInt(document.getElementById('value').value);
        
        // Validation
        if (!name) throw new Error("Please enter player name");
        if (position === "select") throw new Error("Please select player position");
        if (!playingStyle) throw new Error("Please select playing style");
        if (isNaN(value) || value <= 0) throw new Error("Please enter a valid positive value");
        
        const player = { name, position, playingStyle, value };
        
        await savePlayer(player);
        
        if (editIndex >= 0) {
            // Update existing player
            players[editIndex] = player;
            editIndex = -1;
            addPlayerBtn.textContent = 'Add Player';
        } else {
            // Add new player
            await loadPlayers(); // Reload to get the new player with ID
        }
        
        // Reset form
        document.getElementById('name').value = '';
        document.getElementById('position').value = 'select';
        document.getElementById('playingStyle').value = '';
        document.getElementById('value').value = '';
        
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Error in addPlayer:", error);
        alert(error.message);
    }
}

// Update statistics with default maxPlayers = 21
function updateStats() {
    const totalValue = players.reduce((sum, player) => sum + player.value, 0);
    const maxPlayers = parseInt(document.getElementById('maxPlayers').value) || 21; // Changed default to 21
    const remaining = targetValue ? Math.max(0, targetValue - totalValue) : 0;
    const remainingPlayers = Math.max(0, maxPlayers - players.length);
    const average = remainingPlayers > 0 && targetValue ? Math.round(remaining / remainingPlayers) : 0;
    
    document.getElementById('totalValue').textContent = totalValue;
    document.getElementById('remainingValue').textContent = targetValue ? remaining : '-';
    document.getElementById('averageValue').textContent = targetValue ? (remainingPlayers > 0 ? average : '-') : '-';
}

// Initialize the application with default maxPlayers = 21
async function initializeApp() {
    try {
        await initDB();
        await loadPlayers();
        await loadTarget();
        
        // Set default maxPlayers to 21
        document.getElementById('maxPlayers').value = '21';
        
        // Set up event listeners
        addPlayerBtn.addEventListener('click', addPlayer);
        resetBtn.addEventListener('click', resetApp);
        targetInput.addEventListener('change', updateTarget);
        document.getElementById('maxPlayers').addEventListener('change', updateStats);
        
        // Make functions available globally
        window.editPlayer = editPlayer;
        window.deletePlayer = deletePlayer;
        
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Initialization error:", error);
        alert("Failed to initialize application: " + error.message);
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);