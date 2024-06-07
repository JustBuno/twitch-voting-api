import axios from "axios";
import ReactPlayer from "react-player";
import { STREAMELEMENTS_CHANNEL_ID, SERVER } from "./constants";
import { DEFAULT_ERROR_MESSAGE, GAME_REMOVED_ERROR_MESSAGE, VOTING_DISABLED_ERROR_MESSAGE } from "./systemMessages";

export const fetchPoints = async (storedUsername) => {
    try {
        if (storedUsername) {
            // Make a request to StreamElements API to get loyalty points
            const response = await axios.get(`https://api.streamelements.com/kappa/v2/points/${STREAMELEMENTS_CHANNEL_ID}/${storedUsername}`, {
                headers: {
                    'Accept': "application/json; charset=utf-8"
                },
            });
            return response.data.points;
        }
        return null;
    } catch (error) {
        // Check if the error status is 404 (Not Found)
        if (error.response && error.response.status === 404) {
            // If 404, set points to 0
            return 0;
        }
        return null;
    }
};

export const handleLogin = () => {
    window.location.href = `${SERVER}/twitch/auth`;
};

export const renderTrailer = (game, playerHeight) => {
    if (ReactPlayer.canPlay(game.trailer)) {
        return (
            <ReactPlayer
                className="details-trailer"
                url={game.trailer}
                width={'100%'}
                height={playerHeight}
                controls={true}
                playing={true}
                muted={true}
            />
        );
    } else {
        return (
            <img
                className="details-trailer"
                src={game.trailer}
                alt="Trailer"
                draggable="false"
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `${SERVER}/images/missing-header.gif`;
                    e.target.alt = "Image missing";
                }}
            />
        );
    }
};

export const updatePlayerDimensions = (setPlayerHeight) => {
    const updateDimensions = () => {
        const container = document.querySelector(".details-right");
        if (container) {
            const containerWidth = container.offsetWidth;
            const aspectRatio = 16 / 9;
            const width = containerWidth;
            const height = width / aspectRatio;
            setPlayerHeight(height);
        }
    };

    // Update dimensions when the component mounts and on window resize
    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
        window.removeEventListener("resize", updateDimensions);
    };
};

export const getStoreName = (storeUrl) => {
    if (!storeUrl) return ''; // Return empty string if store URL is null
    // Extract store name from the URL
    const url = new URL(storeUrl);
    const hostname = url.hostname.toLowerCase();
    // Check if the URL matches known store URLs
    if (hostname.includes('store.steampowered.com')) {
        return 'Steam';
    } else if (hostname.includes('epicgames.com')) {
        return 'Epic Games';
    } else if (hostname.includes('ea.com')) {
        return 'EA';
    } else if (hostname.includes('ubisoft.com')) {
        return 'Ubisoft';
    } else {
        return 'Official Store'; // Default to 'Official Store' for unknown platforms
    }
};

export const openOfficialStore = (storeUrl) => {
    window.open(storeUrl, '_blank');
};

export const handleVote = async (gameID, storedTwitchUserID, setErrorMessage) => {
    try {
        const storedAccessToken = sessionStorage.getItem("accessToken");
        // Send a request to update the gameID on the server
        await axios.put(`${SERVER}/changeVote/${storedTwitchUserID}`, {
            gameID
        }, {
            headers: {
                'accessToken': `Bearer ${storedAccessToken}`
            }
        });
        // Update sessionStorage with the new gameID
        sessionStorage.setItem("gameID", gameID);
    } catch (error) {
        console.error('Error voting:', error);
        sessionStorage.setItem("error", true);

        if (error.response && error.response.status === 401) {
            setErrorMessage({ status: 401 });
        } else if (error.response && error.response.status === 400) {
            setErrorMessage({ status: 400, message: GAME_REMOVED_ERROR_MESSAGE });
        } else if (error.response && error.response.status === 403) {
            setErrorMessage({ status: 403, message: VOTING_DISABLED_ERROR_MESSAGE });
        } else {
            // Handle other errors
            setErrorMessage({ status: 500, message: DEFAULT_ERROR_MESSAGE });
        }
    }
};

export const removeVote = async (storedTwitchUserID, setErrorMessage) => {
    try {
        const storedAccessToken = sessionStorage.getItem("accessToken");
        await axios.put(`${SERVER}/removeVote/${storedTwitchUserID}`, null, {
            headers: {
                'accessToken': `Bearer ${storedAccessToken}`
            }
        });
        // Update sessionStorage with the new gameID
        sessionStorage.removeItem("gameID");
    } catch (error) {
        console.error('Error voting:', error);
        sessionStorage.setItem("error", true);

        if (error.response && error.response.status === 401) {
            setErrorMessage({ status: 401 });
        } else if (error.response && error.response.status === 400) {
            setErrorMessage({ status: 400, message: GAME_REMOVED_ERROR_MESSAGE });
        } else if (error.response && error.response.status === 403) {
            setErrorMessage({ status: 403, message: VOTING_DISABLED_ERROR_MESSAGE });
        } else {
            // Handle other errors
            setErrorMessage({ status: 500, message: DEFAULT_ERROR_MESSAGE });
        }
    }
};

export const handleResetVotes = async (storedTwitchUserID, votingEnabled) => {
    try {
        const storedAccessToken = sessionStorage.getItem("accessToken");
        const gameID = sessionStorage.getItem("topVoted");

        // Display a confirmation dialog before proceeding
        let confirmReset;
        if (votingEnabled) {
            confirmReset = window.confirm("Are you sure you want to close voting?");
        } else {
            confirmReset = window.confirm("Are you sure you want to reset voting?");
        }

        if (confirmReset) {
            const response = await axios.put(`${SERVER}/voteReset/${storedTwitchUserID}`, {
                gameID
            }, {
                headers: {
                    'accessToken': `Bearer ${storedAccessToken}`
                }
            });

            if (response.status === 200) {
                sessionStorage.removeItem("topVoted");
                window.location.reload();
            } else {
                console.error('Failed to reset vote counts');
            }
        }
    } catch (error) {
        console.error('Error resetting vote counts:', error);
    }
};

export const handleResetTotalVoteCount = async (storedTwitchUserID, game, setHasReset) => {
    try {
        const storedAccessToken = sessionStorage.getItem("accessToken");
        // Display a confirmation dialog before proceeding
        const confirmReset = window.confirm(`Are you sure you want to reset the vote history of ${game.title}?`);

        if (confirmReset && game.gameID) {
            const response = await axios.post(`${SERVER}/voting/resetTotalVoteCount/${storedTwitchUserID}`,
            {
                gameID: game.gameID,
                totalVoteCount: true
            }, {
                headers: {
                    'accessToken': `Bearer ${storedAccessToken}`
                }
            });

            if (response.status === 200) {
                sessionStorage.setItem("reload", true);
                setHasReset(true);
            } else {
                console.error('Failed to reset vote counts');
            }
        }
    } catch (error) {
        console.error('Error resetting vote counts:', error);

        // Check if the error response status is 403 (Forbidden Request)
        if (error.response.status === 403) {
            // Display the error message received from the server
            alert(error.response.data.error);
        } else {
            // For other errors, display a generic error message
            alert('An error occurred while resetting vote count. Please try again later.');
        }
    }
};

export const handleResetVoteCount = async (storedTwitchUserID, game, setHasReset) => {
    try {
        const storedAccessToken = sessionStorage.getItem("accessToken");
        // Display a confirmation dialog before proceeding
        const confirmReset = window.confirm(`Are you sure you want to reset current votes for ${game.title}?`);

        if (confirmReset && game.gameID) {
            const response = await axios.post(`${SERVER}/voting/resetTotalVoteCount/${storedTwitchUserID}`,
            {
                gameID: game.gameID
            }, {
                headers: {
                    'accessToken': `Bearer ${storedAccessToken}`
                }
            });

            if (response.status === 200) {
                sessionStorage.setItem("reload", true);
                setHasReset(true);
            } else {
                console.error('Failed to reset vote counts');
            }
        }
    } catch (error) {
        console.error('Error resetting vote counts:', error);

        // Check if the error response status is 403 (Forbidden Request)
        if (error.response.status === 403) {
            // Display the error message received from the server
            alert(error.response.data.error);
        } else {
            // For other errors, display a generic error message
            alert('An error occurred while resetting vote count. Please try again later.');
        }
    }
};

export const SetTimestamp = () => {
    // Set the current timestamp in sessionStorage
    sessionStorage.setItem("lastValidationTimestamp", new Date().getTime());
};