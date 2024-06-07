import React, { useEffect, useState } from "react";
import axios from "axios";
import ListGames from "./ListGames";
import TopVoted from "./TopVoted";
import { SERVER } from "../constants";
import { SetTimestamp } from "../utils";

const FetchGames = ({ search, storedTwitchUserID, showAdminView, isAdmin, showModal, setShowModal, setErrorMessage, votingEnabled, setVotingEnabled }) => {
    const [gamesActive, setGamesActive] = useState(null);
    const [gamesNotActive, setGamesNotActive] = useState(null);
    const [superVoteCost, setSuperVoteCost] = useState(null);
    const [superVotedID, setSuperVotedID] = useState(null);
    const [storedGameID, setStoredGameID] = useState(parseInt(sessionStorage.getItem("gameID")));
    const storedAccessToken = sessionStorage.getItem("accessToken");

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch active games
                const activeResponse = await axios.get(`${SERVER}/voting/fetchGames/true`);
                let activeData = activeResponse.data.games;
                activeData.sort((a, b) => a.title.localeCompare(b.title));
                setGamesActive(activeData);
                setVotingEnabled(activeResponse.data.votingEnabled);
                setSuperVoteCost(activeResponse.data.superVoteCost);
                setSuperVotedID(activeResponse.data.superVotedID);
    
                // If showAdminView and isAdmin are both true, fetch inactive games
                if (showAdminView && isAdmin) {
                    const inactiveResponse = await axios.get(`${SERVER}/voting/fetchGames/false`);
                    let inactiveData = inactiveResponse.data.games;
                    inactiveData.sort((a, b) => a.title.localeCompare(b.title));
                    setGamesNotActive(inactiveData);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        
        fetchData();
    }, [showAdminView, isAdmin, setVotingEnabled]);
    

    useEffect(() => {
        async function fetchGameID() {
            try {
                if (storedTwitchUserID && storedAccessToken) {
                    const response = await axios.get(`${SERVER}/fetchGameID/${storedTwitchUserID}`, {
                        headers: {
                            'accessToken': `Bearer ${storedAccessToken}`
                        }
                    });
                    const gameID = response.data.gameID;
                    SetTimestamp();
                    if (gameID) {
                        sessionStorage.setItem("gameID", gameID);
                        setStoredGameID(gameID);
                    } else {
                        setStoredGameID(null);
                        sessionStorage.removeItem("gameID");
                    }
                }
            } catch (error) {
                console.error("Error fetching game ID:", error);
                sessionStorage.removeItem("gameID");
            }
        }

        fetchGameID();
    }, [storedTwitchUserID, storedAccessToken]);

    return (
        <div>
            {gamesActive && (
                <>
                    <TopVoted
                        games={gamesActive}
                        votingEnabled={votingEnabled}
                        superVotedID={superVotedID}
                    />
                    <ListGames
                        games={gamesActive}
                        isActive={true}
                        search={search}
                        storedTwitchUserID={storedTwitchUserID}
                        storedGameID={storedGameID}
                        setStoredGameID={setStoredGameID}
                        showAdminView={showAdminView}
                        isAdmin={isAdmin}
                        showModal={showModal}
                        setShowModal={setShowModal}
                        setErrorMessage={setErrorMessage}
                        votingEnabled={votingEnabled}
                        superVoteCost={superVoteCost}
                    />
                    {gamesNotActive && showAdminView && (
                        <div className="hidden">
                            <h2 className="header">
                                Hidden Games
                            </h2>
                            <ListGames
                                games={gamesNotActive}
                                isActive={false}
                                search={search}
                                storedTwitchUserID={storedTwitchUserID}
                                storedGameID={storedGameID}
                                showAdminView={showAdminView}
                                isAdmin={isAdmin}
                                showModal={showModal}
                                setShowModal={setShowModal}
                                setErrorMessage={setErrorMessage}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default FetchGames;