const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();
const https = require('https');
const axios = require('axios');
const multer = require('multer');
const he = require('he');

const app = express();
const port = 8000;

app.use(bodyParser.json());

const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const clientID = process.env.CLIENT_ID;
const broadcasterID = process.env.BROADCASTER_ID;
const channel = process.env.STREAMELEMENTS_CHANNEL_ID;
const jwtToken = process.env.STREAMELEMENTS_JWT_TOKEN;

const redirectURI = process.env.REDIRECT_URI;
let allowedOrigins = process.env.ALLOWED_ORIGINS;

// Parse ALLOWED_ORIGINS into an array
if (allowedOrigins) {
    allowedOrigins = allowedOrigins.split(',').map(origin => origin.trim());
} else {
    allowedOrigins = [];
}

// MySQL Connection Pool
const mysqlUser = process.env.MYSQL_USER;
const mysqlPassword = process.env.MYSQL_PASSWORD;
const mysqlDatabase = process.env.MYSQL_DATABASE;

const superVoteCost = parseInt(process.env.SUPER_VOTE_COST);

const corsOptions = {
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

app.use(cors(corsOptions));

let pool;
let votingEnabled;
let superVotedID;

try {
    pool = mysql.createPool({
        host: 'localhost',
        user: mysqlUser,
        password: mysqlPassword,
        database: mysqlDatabase,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    // Fetch votingEnabled value from database
    pool.query('SELECT value FROM globalVariables WHERE variable = "votingEnabled"')
        .then(([rows]) => {
            if (rows.length > 0) {
                votingEnabled = !!rows[0].value; // Convert tinyInt to boolean
            } else {
                // If votingEnabled not found, insert a new row with value 1
                return pool.query('INSERT INTO globalVariables (variable, value) VALUES (?, ?)', ['votingEnabled', 1]);
            }
        })
        .then(() => {
            // Check for a superVoted entry
            return pool.query('SELECT gameID FROM voting WHERE superVoted = 1 LIMIT 1');
        })
        .then(([rows]) => {
            if (rows.length > 0) {
                superVotedID = rows[0].gameID;
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
} catch (error) {
    console.error('Error:', error);
}

// Ensure directories exist
const ensureDirectoryExists = (directory) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
};

const storageVoting = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '/images/voting');
        ensureDirectoryExists(dir); // Ensure directory exists
        cb(null, dir); // Specify the directory where uploaded files will be stored
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now(); // Get current timestamp
        const originalname = file.originalname;
        let filename;

        // Check if the file is coming from the cover or header field
        if (file.fieldname === 'cover') {
            filename = `${timestamp}_cover_${originalname}`; // Construct filename for cover file
        } else if (file.fieldname === 'header') {
            filename = `${timestamp}_header_${originalname}`; // Construct filename for header file
        } else {
            filename = `${timestamp}_${originalname}`; // Default filename construction
        }

        cb(null, filename);
    }
});

const storageGiveaways = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '/images/giveaways');
        ensureDirectoryExists(dir); // Ensure directory exists
        cb(null, dir); // Specify the directory where uploaded files will be stored
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now(); // Get current timestamp
        const originalname = file.originalname;
        let filename;

        // Check if the file is coming from the cover or header field
        if (file.fieldname === 'cover') {
            filename = `${timestamp}_cover_${originalname}`; // Construct filename for cover file
        } else if (file.fieldname === 'header') {
            filename = `${timestamp}_header_${originalname}`; // Construct filename for header file
        } else {
            filename = `${timestamp}_${originalname}`; // Default filename construction
        }

        cb(null, filename);
    }
});

const uploadVoting = multer({ storage: storageVoting });
const uploadGiveaways = multer({ storage: storageGiveaways });

function deleteUploadedFiles(options) {
    const { cover, header } = options;
    if (cover) {
        fs.unlinkSync(path.join(__dirname, '/images/', cover));
    }

    if (header) {
        fs.unlinkSync(path.join(__dirname, '/images/', header));
    }
}

// Serve uploaded images statically
app.use('/images', express.static(path.join(__dirname, 'images')));

const sanitizeInput = (input) => {
    // Remove leading and trailing white spaces
    input = input.trim();
    // Remove all non-alphanumeric characters
    input = input.replace(/[^a-zA-Z0-9]/g, '');
    return input;
};

// Helper function to ensure URLs use HTTPS
function ensureHttps(...urls) {
    return urls.map(url => (url && url.startsWith('http://')) ? url.replace('http://', 'https://') : url);
}

async function validateUser(options) {
    const { twitchUserID, accessToken, isAdmin } = options;

    if (!accessToken || !twitchUserID) {
        return { status: 400, error: 'Missing parameters' };
    }

    try {
        // Make a request to Twitch API to validate the token
        const response = await axios.get('https://id.twitch.tv/oauth2/validate', {
            headers: {
                'Authorization': `OAuth ${accessToken}`
            }
        });

        // If token is invalid or user ID doesn't match, return false
        if (response.status !== 200 || response.data.user_id !== twitchUserID) {
            return { status: 401, error: 'Invalid or expired token' };
        }

        // If isAdmin is true, check if the user is an admin
        if (isAdmin) {
            const [userResults] = await pool.execute('SELECT * FROM users WHERE twitchUserID = ? AND isAdmin = ?', [twitchUserID, true]);

            // If the user is not found, the access token is incorrect, or the user is not an admin
            if (userResults.length === 0) {
                return { status: 401, error: 'Unauthorized: Incorrect User Data' };
            }
        }

        return { status: 200 };
    } catch (error) {
        console.error('Authentication error: ', error);

        // Check if the error has a response object
        if (error.response && error.response.status) {
            return { status: error.response.status, error: error.message };
        } else {
            // If not, return a generic error status
            return { status: 500, error: 'Internal Server Error' };
        }
    }
}

// Function to check if a file exists
const fileExists = async (url) => {
    try {
        const response = await axios.head(url);
        return response.status === 200;
    } catch (error) {
        return false;
    }
};

// Endpoint to fetch games from voting list for AllVotes modal
app.get('/voting/fetchGames/', async (req, res) => {
    try {
        // Fetch game data from the database where isActive is true
        const [gameResults] = await pool.execute('SELECT gameID, title, voteCount, totalVoteCount FROM voting');

        // Extract data from each game entry
        const games = gameResults.map(game => ({
            gameID: game.gameID,
            title: game.title,
            voteCount: game.voteCount,
            totalVoteCount: game.totalVoteCount
        }));

        res.status(200).json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to fetch games from voting list
app.get('/voting/fetchGames/:isActive', async (req, res) => {
    try {
        // Convert isActive parameter to boolean
        const isActive = req.params.isActive === 'true';

        // Fetch game data from the database where isActive is true
        const [gameResults] = await pool.execute('SELECT gameID, appID, title, cover, header, description, trailer, store, voteCount FROM voting WHERE isActive = ?', [isActive]);

        // Extract data from each game entry
        const games = gameResults.map(game => ({
            gameID: game.gameID,
            appID: game.appID,
            title: game.title,
            cover: game.cover,
            header: game.header,
            description: game.description,
            trailer: game.trailer,
            store: game.store,
            isActive,
            voteCount: game.voteCount
        }));

        res.status(200).json({ games, votingEnabled, superVoteCost, superVotedID });
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for adding games from voting
app.post('/voting/addGame/:twitchUserID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Proceed with file upload logic
        uploadVoting.fields([{ name: 'cover', maxCount: 1 }, { name: 'header', maxCount: 1 }])(req, res, async function (err) {
            if (err) {
                console.error('File upload error: ', err);
                // Pass the error to the middleware's callback
                return res.status(500).json({ error: 'File upload failed' });
            }

            let cover = null; // Initialize cover path to null
            let header = null; // Initialize header path to null

            // If a new cover image is uploaded, update the cover path
            if (req.files['cover'] && req.files['cover'][0]) {
                cover = `voting/${req.files['cover'][0].filename}`; // Update cover path to just the filename
            }

            // If a new header image is uploaded, update the header path
            if (req.files['header'] && req.files['header'][0]) {
                header = `voting/${req.files['header'][0].filename}`; // Update header path to just the filename
            }

            const { appID, title, description, trailer, store, isActive } = req.body;

            // Ensure trailer and store URLs use HTTPS
            const [secureTrailer, secureStore] = ensureHttps(trailer, store);

            // If store is an empty string, set it to null
            const storeValue = secureStore === '' ? null : secureStore;

            const isActiveValue = isActive === 'true' ? 1 : 0;

            // Insert the new game entry into the database
            await pool.execute('INSERT INTO voting (appID, title, description, trailer, store, isActive, cover, header) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [appID, title, description, secureTrailer, storeValue, isActiveValue, cover, header]);

            res.json({ message: 'Game added successfully' });
        });
    } catch (error) {
        console.error('Error: ', error);

        // Delete uploaded files
        deleteUploadedFiles({ cover, header });

        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for editing games from voting
app.put('/voting/editGame/:gameID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.query.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Proceed with game editing logic
        const gameID = parseInt(req.params.gameID);

        if (gameID === superVotedID) {
            return res.status(403).json({ error: 'This game has been super voted' });
        }

        // Proceed with file upload logic
        uploadVoting.fields([{ name: 'cover', maxCount: 1 }, { name: 'header', maxCount: 1 }])(req, res, async function (err) {
            if (err) {
                console.error('File upload error: ', err);
                // Pass the error to the middleware's callback
                return res.status(500).json({ error: 'File upload failed' });
            }

            let newCover = null; // Initialize new cover path to null
            let newHeader = null; // Initialize new header path to null

            // Retrieve existing filenames of cover and header images associated with the game
            const [existingFilenames] = await pool.execute('SELECT cover, header FROM voting WHERE gameID = ?', [gameID]);
            const existingCoverFilename = existingFilenames[0].cover;
            const existingHeaderFilename = existingFilenames[0].header;

            const { title, description, trailer, store, isActive, cover, header } = req.body;

            // Check if cover is to be removed
            if (cover === 'remove') {
                // Delete previous cover image file if it exists
                if (existingCoverFilename) {
                    try {
                        // Delete uploaded files
                        deleteUploadedFiles({ cover: existingCoverFilename });
                    } catch (error) {
                        console.error('Error deleting header image file:', error);
                        // Log the error and continue execution
                    }
                }
            } else {
                // If a new cover image is uploaded and it's different from the existing filename, update the cover path
                if (req.files['cover'] && req.files['cover'][0] && req.files['cover'][0].filename !== existingCoverFilename) {
                    newCover = `voting/${req.files['cover'][0].filename}`; // Update cover path to just the filename
                    // Delete previous cover image file if it exists
                    if (existingCoverFilename) {
                        try {
                            // Delete uploaded files
                            deleteUploadedFiles({ cover: existingCoverFilename });
                        } catch (error) {
                            console.error('Error deleting header image file:', error);
                            // Log the error and continue execution
                        }
                    }
                } else {
                    newCover = existingCoverFilename; // Keep the existing cover path if no new cover is uploaded
                }
            }

            // Check if header is to be removed
            if (header === 'remove') {
                // Delete previous header image file if it exists
                if (existingHeaderFilename) {
                    try {
                        // Delete uploaded files
                        deleteUploadedFiles({ header: existingHeaderFilename });
                    } catch (error) {
                        console.error('Error deleting header image file:', error);
                        // Log the error and continue execution
                    }
                }
            } else {
                // If a new header image is uploaded and it's different from the existing filename, update the header path
                if (req.files['header'] && req.files['header'][0] && req.files['header'][0].filename !== existingHeaderFilename) {
                    newHeader = `voting/${req.files['header'][0].filename}`; // Update header path to just the filename
                    // Delete previous header image file if it exists
                    if (existingHeaderFilename) {
                        try {
                            // Delete uploaded files
                            deleteUploadedFiles({ header: existingHeaderFilename });
                        } catch (error) {
                            console.error('Error deleting header image file:', error);
                            // Log the error and continue execution
                        }
                    }
                } else {
                    newHeader = existingHeaderFilename; // Keep the existing header path if no new header is uploaded
                }
            }

            // Ensure trailer and store URLs use HTTPS
            const [secureTrailer, secureStore] = ensureHttps(trailer, store);

            // If store is an empty string, set it to null
            const storeValue = secureStore === '' ? null : secureStore;

            const isActiveValue = isActive === 'true' ? 1 : 0;

            // Update the game entry in the database
            await pool.execute('UPDATE voting SET title = ?, cover = ?, header = ?, description = ?, trailer = ?, store = ?, isActive = ? WHERE gameID = ?', [title, newCover, newHeader, description, secureTrailer, storeValue, isActiveValue, gameID]);

            res.json({ message: 'Game updated successfully' });
        })
    } catch (error) {
        console.error('PUT error: ', error);

        // Delete uploaded files
        if (newCover !== existingCoverFilename) {
            deleteUploadedFiles({ cover: newCover });
        }
        if (newHeader !== existingHeaderFilename) {
            deleteUploadedFiles({ header: newHeader });
        }

        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for deleting a game from voting
app.delete('/voting/deleteGame/:gameID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.query.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Proceed with game deletion logic
        const gameID = parseInt(req.params.gameID);

        if (gameID === superVotedID) {
            return res.status(403).json({ error: 'This game has been super voted' });
        }

        // Retrieve filenames of cover and header images associated with the game
        const [gameData] = await pool.execute('SELECT cover, header FROM voting WHERE gameID = ?', [gameID]);
        const { cover, header } = gameData[0];

        // Reset all gameID in the users table where gameID matches the provided gameID
        await pool.execute('UPDATE users SET gameID = 0 WHERE gameID = ?', [gameID]);

        // Delete the game entry from the database
        await pool.execute('DELETE FROM voting WHERE gameID = ?', [gameID]);

        // Delete uploaded files
        deleteUploadedFiles({ cover, header });

        res.json({ message: 'Game deleted successfully' });
    } catch (error) {
        console.error('DELETE error: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to fetch games from giveaways list
app.get('/giveaways/fetchGames', async (req, res) => {
    try {
        // Fetch game data from the database
        const [gameResults] = await pool.execute('SELECT gameID, appID, title, cover, header, description, trailer, store, cost FROM giveaways');

        // Extract data from each game entry
        const games = gameResults.map(game => ({
            gameID: game.gameID,
            appID: game.appID,
            title: game.title,
            cover: game.cover,
            header: game.header,
            description: game.description,
            trailer: game.trailer,
            store: game.store,
            cost: game.cost
        }));

        res.status(200).json(games);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to fetch game data based on Steam app ID
app.get('/getGameInfo/:appID', async (req, res) => {
    try {
        const appID = req.params.appID;
        const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appID}&cc=en`);

        // Check if the request was successful and data is available
        if (response.status === 200 && response.data && response.data[appID] && response.data[appID].success) {
            const gameData = response.data[appID].data; // Extract game data
            let store = `https://store.steampowered.com/app/${appID}/`
            let cover = `https://steamcdn-a.akamaihd.net/steam/apps/${appID}/library_600x900.jpg`;
            let header = `https://steamcdn-a.akamaihd.net/steam/apps/${appID}/header.jpg`
            // Check if library_600x900.jpg exists for the game
            if (!(await fileExists(cover))) {
                // If library_600x900.jpg does not exist, set cover to null
                cover = null;
            }

            if (!(await fileExists(header))) {
                // If header.jpg does not exist, set header to null
                header = null;
            }

            let trailer = '';
            if (gameData.movies && gameData.movies.length > 0) {
                // If trailers exist, use the first trailer
                trailer = gameData.movies[0].webm.max;
            } else if (gameData.screenshots && gameData.screenshots.length > 0) {
                // If no trailers exist, use the first screenshot
                trailer = gameData.screenshots[0].path_thumbnail;
            }

            // Ensure trailer and store URLs use HTTPS
            const [secureTrailer, secureStore] = ensureHttps(trailer, store);

            const formattedData = {
                title: gameData.name,
                description: he.decode(gameData.short_description),
                trailer: secureTrailer,
                store: secureStore,
                cover: cover, // Use the cover image URL if exists, otherwise null
                header: header // Use the header image URL if exists, otherwise null
            };
            res.status(200).json(formattedData);
        } else {
            // If no data or request was not successful
            res.status(404).json({ error: 'Game data not found' });
        }
    } catch (error) {
        console.error('Error fetching game data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint for adding games to giveaways
app.post('/giveaways/addGame/:twitchUserID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        const gameKey = req.headers.gamekey;

        // Check if gameKey already exists in either giveaways or redeemedKeys table
        const [existingKeys] = await pool.query('SELECT EXISTS (SELECT 1 FROM giveaways WHERE gameKey = ?) AS existsInGiveaways, EXISTS (SELECT 1 FROM redeemedKeys WHERE gameKey = ?) AS existsInRedeemedKeys', [gameKey, gameKey]);

        // Check if the gameKey exists in either table
        const { existsInGiveaways, existsInRedeemedKeys } = existingKeys[0];
        if (existsInGiveaways || existsInRedeemedKeys) {
            return res.status(400).json({ error: 'Game Key already present in the Database' });
        }

        // If no duplicates found, proceed with file upload logic
        uploadGiveaways.fields([{ name: 'cover', maxCount: 1 }, { name: 'header', maxCount: 1 }])(req, res, async function (err) {
            if (err) {
                console.error('File upload error: ', err);
                // Pass the error to the middleware's callback
                return res.status(500).json({ error: 'File upload failed' });
            }

            let cover = null; // Initialize cover path to null
            let header = null; // Initialize header path to null

            // If a new cover image is uploaded, update the cover path
            if (req.files['cover'] && req.files['cover'][0]) {
                cover = `giveaways/${req.files['cover'][0].filename}`; // Update cover path to just the filename
            }

            // If a new header image is uploaded, update the header path
            if (req.files['header'] && req.files['header'][0]) {
                header = `giveaways/${req.files['header'][0].filename}`; // Update header path to just the filename
            }

            const { appID, title, description, trailer, store, cost } = req.body;

            // Ensure trailer and store URLs use HTTPS
            const [secureTrailer, secureStore] = ensureHttps(trailer, store);

            // If store is an empty string, set it to null
            const storeValue = secureStore === '' ? null : secureStore;

            // Insert the new game entry into the database
            await pool.execute('INSERT INTO giveaways (appID, title, description, trailer, store, cost, gameKey, cover, header) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [appID, title, description, secureTrailer, storeValue, cost, gameKey, cover, header]);

            res.json({ message: 'Game added successfully' });
        });
    } catch (error) {
        console.error('Error: ', error);

        // Delete uploaded files
        deleteUploadedFiles({ cover, header });

        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to fetch gameKey by gameID
app.get('/giveaways/editGame/fetchGameKey/:gameID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.query.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        const gameID = req.params.gameID;

        // Fetch gameKey from the database for the given gameID
        const [gameResults] = await pool.execute('SELECT gameKey FROM giveaways WHERE gameID = ?', [gameID]);

        // Check if gameKey exists for the given gameID
        if (gameResults.length > 0 && gameResults[0].gameKey) {
            const { gameKey } = gameResults[0];
            res.status(200).json({ gameKey });
        } else {
            res.status(404).json({ error: 'GameKey not found' });
        }
    } catch (error) {
        console.error('PUT error: ', error);

        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for editing games from giveaways
app.put('/giveaways/editGame/:gameID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.query.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Proceed with game editing logic
        const gameID = req.params.gameID;
        const gameKey = req.headers.gamekey;

        if (gameKey !== null && gameKey !== '') {
            // Check if gameKey already exists in either giveaways or redeemedKeys table
            const [existingKeys] = await pool.query('SELECT EXISTS (SELECT 1 FROM giveaways WHERE gameKey = ? AND gameID != ?) AS existsInGiveaways, EXISTS (SELECT 1 FROM redeemedKeys WHERE gameKey = ?) AS existsInRedeemedKeys', [gameKey, gameID, gameKey]);

            // Check if the gameKey exists in either table
            const { existsInGiveaways, existsInRedeemedKeys } = existingKeys[0];
            if (existsInGiveaways || existsInRedeemedKeys) {
                return res.status(400).json({ error: 'Game Key already present in the Database' });
            }
        }

        // If no duplicates found, proceed with file upload logic
        uploadGiveaways.fields([{ name: 'cover', maxCount: 1 }, { name: 'header', maxCount: 1 }])(req, res, async function (err) {
            if (err) {
                console.error('File upload error: ', err);
                // Pass the error to the middleware's callback
                return res.status(500).json({ error: 'File upload failed' });
            }

            let newCover = null; // Initialize new cover path to null
            let newHeader = null; // Initialize new header path to null

            // Retrieve existing filenames of cover and header images associated with the game
            const [existingFilenames] = await pool.execute('SELECT cover, header FROM giveaways WHERE gameID = ?', [gameID]);
            const existingCoverFilename = existingFilenames[0].cover;
            const existingHeaderFilename = existingFilenames[0].header;

            const { title, description, trailer, store, cost, cover, header } = req.body;

            // Check if cover is to be removed
            if (cover === 'remove') {
                // Delete previous cover image file if it exists
                if (existingCoverFilename) {
                    try {
                        // Delete uploaded files
                        deleteUploadedFiles({ cover: existingCoverFilename });
                    } catch (error) {
                        console.error('Error deleting header image file:', error);
                        // Log the error and continue execution
                    }
                }
            } else {
                // If a new cover image is uploaded and it's different from the existing filename, update the cover path
                if (req.files['cover'] && req.files['cover'][0] && req.files['cover'][0].filename !== existingCoverFilename) {
                    newCover = `giveaways/${req.files['cover'][0].filename}`; // Update cover path to just the filename
                    // Delete previous cover image file if it exists
                    if (existingCoverFilename) {
                        try {
                            // Delete uploaded files
                            deleteUploadedFiles({ cover: existingCoverFilename });
                        } catch (error) {
                            console.error('Error deleting header image file:', error);
                            // Log the error and continue execution
                        }
                    }
                } else {
                    newCover = existingCoverFilename; // Keep the existing cover path if no new cover is uploaded
                }
            }

            // Check if header is to be removed
            if (header === 'remove') {
                // Delete previous header image file if it exists
                if (existingHeaderFilename) {
                    try {
                        // Delete uploaded files
                        deleteUploadedFiles({ header: existingHeaderFilename });
                    } catch (error) {
                        console.error('Error deleting header image file:', error);
                        // Log the error and continue execution
                    }
                }
            } else {
                // If a new header image is uploaded and it's different from the existing filename, update the header path
                if (req.files['header'] && req.files['header'][0] && req.files['header'][0].filename !== existingHeaderFilename) {
                    newHeader = `giveaways/${req.files['header'][0].filename}`; // Update header path to just the filename
                    // Delete previous header image file if it exists
                    if (existingHeaderFilename) {
                        try {
                            // Delete uploaded files
                            deleteUploadedFiles({ header: existingHeaderFilename });
                        } catch (error) {
                            console.error('Error deleting header image file:', error);
                            // Log the error and continue execution
                        }
                    }
                } else {
                    newHeader = existingHeaderFilename; // Keep the existing header path if no new header is uploaded
                }
            }

            // Ensure trailer and store URLs use HTTPS
            const [secureTrailer, secureStore] = ensureHttps(trailer, store);

            // If store is an empty string, set it to null
            const storeValue = secureStore === '' ? null : secureStore;

            // Update the game entry in the database, excluding gameKey if it's null
            let query = 'UPDATE giveaways SET title = ?, cover = ?, header = ?, description = ?, trailer = ?, store = ?, cost = ?';
            const queryParams = [title, newCover, newHeader, description, secureTrailer, storeValue, cost];

            if (gameKey !== null && gameKey !== '') {
                query += ', gameKey = ?';
                queryParams.push(gameKey);
            }

            query += ' WHERE gameID = ?';
            queryParams.push(gameID);

            await pool.execute(query, queryParams);

            res.json({ message: 'Game updated successfully' });
        })
    } catch (error) {
        console.error('PUT error: ', error);

        // Delete uploaded files
        if (newCover !== existingCoverFilename) {
            deleteUploadedFiles({ cover: newCover });
        }
        if (newHeader !== existingHeaderFilename) {
            deleteUploadedFiles({ header: newHeader });
        }

        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for deleting a game from giveaways
app.delete('/giveaways/deleteGame/:gameID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.query.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Proceed with game deletion logic
        const gameID = req.params.gameID;

        // Retrieve filenames of cover and header images associated with the game
        const [gameData] = await pool.execute('SELECT cover, header FROM giveaways WHERE gameID = ?', [gameID]);
        const { cover, header } = gameData[0];

        // Delete the game entry from the database
        await pool.execute('DELETE FROM giveaways WHERE gameID = ?', [gameID]);

        // Delete uploaded files
        deleteUploadedFiles({ cover, header });

        res.json({ message: 'Game deleted successfully' });
    } catch (error) {
        console.error('DELETE error: ', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for initiating Twitch authentication
app.get('/twitch/auth', (req, res) => {
    // Redirect the user to Twitch for authentication
    res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${clientID}&redirect_uri=${redirectURI}&response_type=code&scope=user:read:email`);
});

// Endpoint for handling Twitch callback
app.get('/twitch/auth/callback', async (req, res) => {
    try {
        const code = req.query.code;

        // Exchange the authorization code for an access token
        const tokenResponse = await axios.post(
            `https://id.twitch.tv/oauth2/token`,
            {
                client_id: clientID,
                client_secret: clientSecret,
                grant_type: "authorization_code",
                redirect_uri: redirectURI,
                code,
            }
        );

        const twitchAccessToken = tokenResponse.data.access_token;

        // Fetch user information from Twitch API using the access token
        const userInfoResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${twitchAccessToken}`,
                'Client-ID': clientID,
            }
        });

        const { id: twitchUserID, profile_image_url: profileImage, display_name: twitchUsername } = userInfoResponse.data.data[0];

        // Check if the user exists in the database
        const [userResults] = await pool.execute('SELECT * FROM users WHERE twitchUserID = ?', [twitchUserID]);

        let isAdmin = 0;

        if (userResults.length > 0) {
            // User exists, update the access token
            await pool.execute('UPDATE users SET twitchUsername = ? WHERE twitchUserID = ?', [twitchUsername, twitchUserID]);
            // Extract additional user information from the database
            isAdmin = userResults[0].isAdmin;
        } else {
            // If the user id belongs to the broadcaster, set as admin
            if (twitchUserID === broadcasterID) {
                isAdmin = 1;
            }
            // If the user doesn't exist, add the user to the database
            await pool.execute('INSERT INTO users (twitchUserID, twitchUsername, isAdmin) VALUES (?, ?, ?)', [twitchUserID, twitchUsername, isAdmin]);
        }

        // Return user information including Twitch data and additional database data
        res.json({
            twitchUserID,
            twitchAccessToken,
            profileImage,
            twitchUsername,
            isAdmin
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Endpoint for validating user credentials
app.get('/twitch/validateUser/:twitchUserID', async (req, res) => {
    const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
    const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token
    const isAdmin = req.query.isAdmin === 'true'; // Convert string 'true' to boolean true

    const validationResponse = await validateUser({ twitchUserID, accessToken, isAdmin });

    if (validationResponse.status === 200) {
        return res.json({ message: 'User successfully validated' });
    } else {
        return res.status(validationResponse.status).json({ error: validationResponse.error });
    }
});

// Endpoint to redeem keys using loyalty points
app.put('/redeemKey/:twitchUserID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Get a connection from the pool
        const connection = await pool.getConnection();

        // Fetch twitchUsername from users table
        const [userResults] = await connection.execute('SELECT twitchUsername FROM users WHERE twitchUserID = ?', [twitchUserID]);

        const user = userResults[0].twitchUsername;

        // Check if user is found
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Fetch user's current points
        const pointsResponse = await axios.get(
            `https://api.streamelements.com/kappa/v2/points/${channel}/${user}`,
            {
                headers: {
                    'Accept': "application/json; charset=utf-8"
                },
            }
        );
        const currentPoints = pointsResponse.data.points;
        const { gameID } = req.body;

        // Fetch game.cost, title, and gameKey for the given gameID
        const [gameResults] = await connection.execute('SELECT cost, title, gameKey FROM giveaways WHERE gameID = ?', [gameID]);

        // Check if gameResults contains rows
        if (gameResults.length > 0) {
            const { cost: amount, title, gameKey } = gameResults[0];

            // Check if user has enough points
            if (currentPoints < amount) {
                return res.status(400).json({ error: "Insuficient Points" });
            }

            // Begin transaction
            await connection.beginTransaction();

            // Delete entry from giveaways table
            await connection.execute('DELETE FROM giveaways WHERE gameID = ?', [gameID]);

            // Insert into redeemedKeys table
            await connection.execute('INSERT INTO redeemedKeys (title, gameKey, twitchUserID) VALUES (?, ?, ?)', [title, gameKey, twitchUserID]);

            // If user has enough points, redeem the key
            await axios.put(
                `https://api.streamelements.com/kappa/v2/points/${channel}/${user}/-${amount}`, {},
                {
                    headers: {
                        'Accept': 'application/json; charset=utf-8',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                }
            );

            // Commit transaction
            await connection.commit();

            res.status(200).json({ gameKey });
        } else {
            res.status(404).json({ error: 'GameKey not found' });
        }
    } catch (error) {
        console.error(error);

        // Rollback transaction if it was started
        if (connection) {
            await connection.rollback();
        }

        res.status(500).json({ error: "Internal server error" });
    } finally {
        // Release the connection back to the pool
        if (connection) {
            connection.release();
        }
    }
});

app.get('/redeemedKeys/:twitchUserID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Query the redeemedKeys table to fetch keys for the provided twitchUserID
        const [redeemedKeysResults] = await pool.execute('SELECT title, gameKey FROM redeemedKeys WHERE twitchUserID = ?', [twitchUserID]);

        res.json(redeemedKeysResults);
    } catch (error) {
        // If there's an error, return a 500 error
        console.error("Error fetching redeemed keys:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/allRedeemedKeys/:twitchUserID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Query the redeemedKeys table to fetch all redeemed keys
        const [redeemedKeysResults] = await pool.execute('SELECT users.twitchUsername, redeemedKeys.id, redeemedKeys.title, redeemedKeys.gameKey FROM redeemedKeys JOIN users ON redeemedKeys.twitchUserID = users.twitchUserID');

        res.json(redeemedKeysResults);
    } catch (error) {
        // If there's an error, return a 500 error
        console.error("Error fetching all redeemed keys:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.put('/allRedeemedKeys/updateKey/:id', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.query.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        const id = req.params.id;
        const gameKey = req.headers.gamekey;

        if (gameKey !== null && gameKey !== '') {
            // Check if gameKey already exists in either giveaways or redeemedKeys table
            const [existingKeys] = await pool.query('SELECT EXISTS (SELECT 1 FROM redeemedKeys WHERE gameKey = ? AND id != ?) AS existsInRedeemedKeys, EXISTS (SELECT 1 FROM giveaways WHERE gameKey = ?) AS existsInGiveaways', [gameKey, id, gameKey]);

            // Check if the gameKey exists in either table
            const { existsInGiveaways, existsInRedeemedKeys } = existingKeys[0];
            if (existsInGiveaways || existsInRedeemedKeys) {
                return res.status(400).json({ error: 'Game Key already present in the Database' });
            }
        }

        // Check if the key exists
        const [existingKey] = await pool.execute('SELECT id FROM redeemedKeys WHERE id = ?', [id]);

        if (!existingKey.length) {
            return res.status(404).json({ error: "Key not found." });
        }

        // Update the key
        await pool.execute('UPDATE redeemedKeys SET gameKey = ? WHERE id = ?', [gameKey, id]);

        res.json({ message: "Key updated successfully." });
    } catch (error) {
        // If there's an error, return a 500 error
        console.error("Error updating key:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.delete('/allRedeemedKeys/deleteKey/:id', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.query.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        const id = req.params.id;

        // Check if the key exists
        const [existingKey] = await pool.execute('SELECT id FROM redeemedKeys WHERE id = ?', [id]);

        if (!existingKey.length) {
            return res.status(404).json({ error: "Key not found." });
        }

        // Delete the key
        await pool.execute('DELETE FROM redeemedKeys WHERE id = ?', [id]);

        res.json({ message: "Key deleted successfully." });
    } catch (error) {
        // If there's an error, return a 500 error
        console.error("Error deleting key:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint for fetching gameID for a Twitch user
app.get('/fetchGameID/:twitchUserID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');

        // Check if the user exists in the database
        const [userResults] = await pool.execute('SELECT gameID FROM users WHERE twitchUserID = ?', [twitchUserID]);

        if (userResults.length > 0) {
            const gameID = userResults[0].gameID;
            res.json({ gameID });
        } else {
            res.json({ gameID: null }); // Return null if the user doesn't exist
        }
    } catch (error) {
        console.error('MySQL Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for updating gameID when a user votes
app.put('/changeVote/:twitchUserID', async (req, res) => {
    try {
        if (!votingEnabled) {
            return res.status(403).json({ error: 'Voting is temporarily disabled' });
        }

        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        const gameID = req.body.gameID;

        // Get a connection from the pool
        const connection = await pool.getConnection();

        // Check if the game is active
        const [gameResults] = await connection.execute('SELECT isActive FROM voting WHERE gameID = ? AND isActive = 1', [gameID]);
        const isActive = gameResults.length > 0;

        if (!isActive) {
            connection.release();
            return res.status(400).json({ error: 'Game is not active' });
        }

        // Retrieve the current gameID voted by the user
        const [previousGameIDResults] = await connection.execute('SELECT gameID FROM users WHERE twitchUserID = ?', [twitchUserID]);
        const previousGameID = previousGameIDResults.length > 0 ? previousGameIDResults[0].gameID : null;

        // Check if gameID is different from previousGameID
        if (gameID !== previousGameID) {
            try {
                // Begin a transaction
                await connection.beginTransaction();

                // Decrement voteCount for previousGameID if it exists
                if (previousGameID !== null && previousGameID !== 0) {
                    await connection.execute('UPDATE voting SET voteCount = voteCount - 1, totalVoteCount = totalVoteCount - 1 WHERE gameID = ?', [previousGameID]);
                }

                // Update voteCount in voting table
                await connection.execute('UPDATE voting SET voteCount = voteCount + 1, totalVoteCount = totalVoteCount + 1 WHERE gameID = ?', [gameID]);

                // Update gameID in users table
                await connection.execute('UPDATE users SET gameID = ? WHERE twitchUserID = ?', [gameID, twitchUserID]);

                // Commit the transaction
                await connection.commit();

                // Success response
                res.json({ message: 'GameID and voteCount updated successfully' });
            } catch (error) {
                // Rollback the transaction on error
                await connection.rollback();
                console.error('MySQL Error:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            } finally {
                // Release the connection back to the pool
                if (connection) {
                    connection.release();
                }
            }
        } else {
            // Release the connection back to the pool if gameID is the same as previousGameID
            if (connection) {
                connection.release();
            }
            res.json({ message: 'GameID is the same as previous one. No update needed.' });
        }
    } catch (error) {
        console.error('MySQL Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for removing a user's vote
app.put('/removeVote/:twitchUserID', async (req, res) => {
    try {
        if (!votingEnabled) {
            return res.status(403).json({ error: 'Voting is temporarily disabled' });
        }

        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Get a connection from the pool
        const connection = await pool.getConnection();

        // Retrieve the current gameID voted by the user
        const [gameIDResults] = await connection.execute('SELECT gameID FROM users WHERE twitchUserID = ?', [twitchUserID]);
        const oldGameID = gameIDResults.length > 0 ? gameIDResults[0].gameID : null;

        // Check if user has voted
        if (oldGameID !== null && oldGameID !== 0) {
            try {
                // Begin a transaction
                await connection.beginTransaction();

                // Decrement voteCount for the oldGameID
                await connection.execute('UPDATE voting SET voteCount = voteCount - 1, totalVoteCount = totalVoteCount - 1 WHERE gameID = ?', [oldGameID]);

                // Update gameID to 0 in users table to remove the vote
                await connection.execute('UPDATE users SET gameID = 0 WHERE twitchUserID = ?', [twitchUserID]);

                // Commit the transaction
                await connection.commit();
                // Success response
                res.json({ message: 'Vote removed successfully' });
            } catch (error) {
                // Rollback the transaction on error
                await connection.rollback();
                console.error('MySQL Error:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            } finally {
                // Release the connection back to the pool
                if (connection) {
                    connection.release();
                }
            }
        } else {
            // Release the connection back to the pool if user has not voted
            if (connection) {
                connection.release();
            }
            res.json({ message: 'GameID is the same as previous one. No update needed.' });
        }
    } catch (error) {
        console.error('MySQL Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to superVote
app.put('/superVote/:twitchUserID', async (req, res) => {
    try {
        if (!votingEnabled) {
            return res.status(403).json({ error: 'Voting is temporarily disabled' });
        }

        if (superVoteCost < 1) {
            return res.status(403).json({ error: 'SuperVote is currently disabled' });
        }

        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        // Get a connection from the pool
        const connection = await pool.getConnection();

        // Fetch twitchUsername from users table
        const [userResults] = await connection.execute('SELECT twitchUsername FROM users WHERE twitchUserID = ?', [twitchUserID]);

        const user = userResults[0].twitchUsername;

        // Check if user is found
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Fetch user's current points
        const pointsResponse = await axios.get(
            `https://api.streamelements.com/kappa/v2/points/${channel}/${user}`,
            {
                headers: {
                    'Accept': "application/json; charset=utf-8"
                },
            }
        );
        const currentPoints = pointsResponse.data.points;

        // Check if user has enough points
        if (currentPoints < superVoteCost) {
            return res.status(400).json({ error: "Insuficient Points" });
        }

        const { gameID } = req.body;

        // Check if gameID exists
        const [gameResults] = await connection.execute('SELECT gameID FROM voting WHERE gameID = ?', [gameID]);
        const gameExists = gameResults.length > 0;

        if (!gameExists) {
            return res.status(404).json({ error: "GameID not found" });
        }

        try {
            // Begin a transaction
            await connection.beginTransaction();

            // Update gameID in users table
            await connection.execute('UPDATE users SET gameID = ? WHERE twitchUserID = ?', [gameID, twitchUserID]);

            // Update vote count and set superVoted to true
            await connection.execute('UPDATE voting SET voteCount = voteCount + 1, totalVoteCount = totalVoteCount + 1, superVoted = 1 WHERE gameID = ?', [gameID]);

            // Close voting
            await connection.execute('UPDATE globalVariables SET value = ? WHERE variable = ?', [0, 'votingEnabled']);

            // If user has enough points, redeem the key
            await axios.put(
                `https://api.streamelements.com/kappa/v2/points/${channel}/${user}/-${superVoteCost}`, {},
                {
                    headers: {
                        'Accept': 'application/json; charset=utf-8',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                }
            );

            // Commit transaction
            await connection.commit();

            superVotedID = gameID;
            votingEnabled = false;
            res.status(200).json({});
        } catch (error) {
            console.error(error);

            // Rollback transaction if it was started
            if (connection) {
                await connection.rollback();
            }

            res.status(500).json({ error: "Internal server error" });
        } finally {
            // Release the connection back to the pool
            if (connection) {
                connection.release();
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint for handling PUT requests to reset vote counts
app.put('/voteReset/:twitchUserID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        try {
            // Get a connection from the pool
            const connection = await pool.getConnection();

            try {
                // Begin a transaction
                await connection.beginTransaction();

                try {
                    if (votingEnabled) {
                        // Close voting
                        await connection.execute('UPDATE globalVariables SET value = ? WHERE variable = ?', [0, 'votingEnabled']);
                        votingEnabled = false;
                    } else {
                        // Reset gameID for all users
                        await connection.execute('UPDATE users SET gameID = ?', [0]);

                        // Remove all lines in votes table
                        await connection.execute('UPDATE voting SET voteCount = ?', [0]);

                        // Resume voting
                        await connection.execute('UPDATE globalVariables SET value = ? WHERE variable = ?', [1, 'votingEnabled']);

                        const gameID = req.body.gameID;

                        if (gameID) {
                            // Retrieve filenames of cover and header images associated with the game
                            const [gameData] = await pool.execute('SELECT cover, header FROM voting WHERE gameID = ?', [gameID]);
                            if (gameData[0]) {
                                const { cover, header } = gameData[0];

                                // Delete the game entry from the database
                                await connection.execute('DELETE FROM voting WHERE gameID = ?', [gameID]);

                                // Delete uploaded files
                                deleteUploadedFiles({ cover, header });
                            }
                        }
                        superVotedID = null;
                        votingEnabled = true;
                    }
                    // Commit the transaction
                    await connection.commit();

                    res.status(200).json({ message: 'Vote counts and gameIDs reset successfully' });
                } catch (error) {
                    // Rollback the transaction on error
                    await connection.rollback();

                    console.error('MySQL Transaction Error:', error);
                    res.status(500).json({ error: 'Internal Server Error' });
                } finally {
                    // Release the connection back to the pool
                    if (connection) {
                        connection.release();
                    }
                }
            } catch (error) {
                console.error('Transaction Error:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        } catch (error) {
            console.error('Database Connection Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } catch (error) {
        console.error('PUT Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to reset voteCount and totalVoteCount for a selected gameID
app.post('/voting/resetTotalVoteCount/:twitchUserID', async (req, res) => {
    try {
        const twitchUserID = sanitizeInput(req.params.twitchUserID || '');
        const accessToken = sanitizeInput(req.headers.accesstoken?.split(' ')[1] || ''); // Extract access token

        const authenticationResult = await validateUser({ twitchUserID, accessToken, isAdmin: true });

        if (authenticationResult.error) {
            return res.status(401).json({ error: authenticationResult.error });
        }

        const { gameID, totalVoteCount } = req.body;

        if (gameID === superVotedID) {
            return res.status(403).json({ error: 'This game has been super voted' });
        }

        // Get a connection from the pool
        const connection = await pool.getConnection();

        try {
            // Begin a transaction
            await connection.beginTransaction();

            // Reset voteCount and totalVoteCount for the selected gameID in the voting table
            if (totalVoteCount) {
                await connection.execute('UPDATE voting SET voteCount = 0, totalVoteCount = 0 WHERE gameID = ?', [gameID]);
            } else {
                await connection.execute('UPDATE voting SET voteCount = 0 WHERE gameID = ?', [gameID]);
            }

            // Reset all gameID in the users table where gameID matches the provided gameID
            await connection.execute('UPDATE users SET gameID = 0 WHERE gameID = ?', [gameID]);

            // Commit the transaction
            await connection.commit();

            res.status(200).json({ message: 'Votes and gameID reset successfully' });
        } catch (error) {
            // Rollback the transaction if any error occurs
            await connection.rollback();
            console.error('Error resetting votes and gameID:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        } finally {
            // Release the connection back to the pool
            connection.release();
        }
    } catch (error) {
        console.error('Error resetting votes and gameID:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create HTTPS server with SSL/TLS certificate and key
const certDir = process.env.CERT_DIR;
const httpsOptions = {
    key: fs.readFileSync(path.join(certDir, 'privkey.pem')),
    cert: fs.readFileSync(path.join(certDir, 'fullchain.pem'))
};

const server = https.createServer(httpsOptions, app);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});