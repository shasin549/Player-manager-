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
            reject("Database error");
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
    const transaction = db.transaction(['players'], 'readonly');
    const store = transaction.objectStore('players');
    const request = store.getAll();
    
    return new Promise((resolve) => {
        request.onsuccess = () => {
            players = request.result || [];
            resolve(players);
        };
    });
}

// Load target value from DB
async function loadTarget() {
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('targetValue');
    
    return new Promise((resolve) => {
        request.onsuccess = () => {
            targetValue = request.result;
            if (targetValue) {
                targetInput.value = targetValue;
                document.getElementById('targetValue').textContent = targetValue;
            }
            resolve(targetValue);
        };
    });
}

// Save player to DB
async function savePlayer(player) {
    const transaction = db.transaction(['players'], 'readwrite');
    const store = transaction.objectStore('players');
    
    const request = editIndex >= 0 
        ? store.put({ ...player, id: players[editIndex].id }) 
        : store.add(player);
    
    await new Promise((resolve) => {
        request.onsuccess = resolve;
    });
}

// Delete player from DB
async function deletePlayerFromDB(id) {
    const transaction = db.transaction(['players'], 'readwrite');
    const store = transaction.objectStore('players');
    const request = store.delete(id);
    
    await new Promise((resolve) => {
        request.onsuccess = resolve;
    });
}

// Save target to DB
async function saveTarget(value) {
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put(value, 'targetValue');
    
    await new Promise((resolve) => {
        request.onsuccess = resolve;
    });
}

// Reset all data
async function clearDB() {
    const transaction = db.transaction(['players', 'settings'], 'readwrite');
    const playersStore = transaction.objectStore('players');
    const settingsStore = transaction.objectStore('settings');
    
    await Promise.all([
        new Promise((resolve) => { playersStore.clear().onsuccess = resolve; }),
        new Promise((resolve) => { settingsStore.clear().onsuccess = resolve; })
    ]);
}

// Render players table
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    
    if (players.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">
                    <div class="empty-state-icon">⚽</div>
                    <div>No players added yet. Add your first player above!</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = players.map((player, index) => `
        <tr>
            <td>${player.name}</td>
            <td>${player.position}</td>
            <td>${player.playingStyle}</td>
            <td>${player.value}</td>
            <td>
                <button class="action-btn edit-btn" onclick="editPlayer(${index})">Edit</button>
                <button class="action-btn delete-btn" onclick="deletePlayer(${player.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Update statistics
function updateStats() {
    const totalValue = players.reduce((sum, player) => sum + player.value, 0);
    const maxPlayers = parseInt(document.getElementById('maxPlayers').value) || 11;
    const remaining = targetValue ? Math.max(0, targetValue - totalValue) : 0;
    const remainingPlayers = Math.max(0, maxPlayers - players.length);
    const average = remainingPlayers > 0 && targetValue ? Math.round(remaining / remainingPlayers) : 0;
    
    document.getElementById('totalValue').textContent = totalValue;
    document.getElementById('remainingValue').textContent = targetValue ? remaining : '-';
    document.getElementById('averageValue').textContent = targetValue ? (remainingPlayers > 0 ? average : '-') : '-';
}

// Add/Update player
async function addPlayer() {
    const name = document.getElementById('name').value.trim();
    const position = document.getElementById('position').value;
    const playingStyle = document.getElementById('playingStyle').value;
    const value = parseInt(document.getElementById('value').value);
    
    if (!name || position === "select" || !playingStyle || isNaN(value) || value <= 0) {
        alert("Please fill all fields with valid values");
        return;
    }
    
    const player = { name, position, playingStyle, value };
    
    try {
        await savePlayer(player);
        
        if (editIndex >= 0) {
            players[editIndex] = player;
            editIndex = -1;
            addPlayerBtn.textContent = 'Add Player';
        } else {
            await loadPlayers();
        }
        
        // Reset form
        document.getElementById('name').value = '';
        document.getElementById('position').value = 'select';
        document.getElementById('playingStyle').value = '';
        document.getElementById('value').value = '';
        
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Error saving player:", error);
        alert("Failed to save player");
    }
}

// Edit player
function editPlayer(index) {
    const player = players[index];
    document.getElementById('name').value = player.name;
    document.getElementById('position').value = player.position;
    document.getElementById('playingStyle').value = player.playingStyle;
    document.getElementById('value').value = player.value;
    
    editIndex = index;
    addPlayerBtn.textContent = 'Update Player';
}

// Delete player
async function deletePlayer(id) {
    if (!confirm('Are you sure you want to delete this player?')) return;
    
    try {
        await deletePlayerFromDB(id);
        await loadPlayers();
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Error deleting player:", error);
        alert("Failed to delete player");
    }
}

// Update target value
async function updateTarget() {
    const newTarget = parseInt(targetInput.value);
    
    if (isNaN(newTarget)) {
        alert("Please enter a valid number");
        return;
    }
    
    try {
        targetValue = newTarget;
        await saveTarget(targetValue);
        document.getElementById('targetValue').textContent = targetValue;
        updateStats();
    } catch (error) {
        console.error("Error updating target:", error);
    }
}

// Reset all data
async function resetApp() {
    if (!confirm('Are you sure you want to reset ALL data? This cannot be undone.')) return;
    
    try {
        await clearDB();
        players = [];
        targetValue = undefined;
        targetInput.value = '';
        document.getElementById('name').value = '';
        document.getElementById('position').value = 'select';
        document.getElementById('playingStyle').value = '';
        document.getElementById('value').value = '';
        document.getElementById('maxPlayers').value = '11';
        addPlayerBtn.textContent = 'Add Player';
        editIndex = -1;
        
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Error resetting app:", error);
        alert("Failed to reset data");
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        await loadPlayers();
        await loadTarget();
        renderTable();
        updateStats();
    } catch (error) {
        console.error("Initialization error:", error);
    }
});

addPlayerBtn.addEventListener('click', addPlayer);
resetBtn.addEventListener('click', resetApp);
targetInput.addEventListener('change', updateTarget);
document.getElementById('maxPlayers').addEventListener('change', updateStats);

// Global functions (needed for inline event handlers in table)
window.editPlayer = editPlayer;
window.deletePlayer = deletePlayer;