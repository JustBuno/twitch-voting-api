import React, { useEffect, useState } from "react";
import axios from "axios";
import ListGames from "./ListGames"
import { SERVER } from "../constants";

const FetchGames = ({ search, storedTwitchUserID, showAdminView, isAdmin, showModal, setShowModal, showRedeemed, errorMessage, setErrorMessage }) => {
    const [games, setGames] = useState(null);

    useEffect(() => {
        // Fetch data from the server when the component mounts
        const fetchData = async () => {
            try {
                // Make a GET request to fetch data from the server
                const response = await axios.get(`${SERVER}/giveaways/fetchGames`);

                // Extract the data from the response
                let data = response.data;

                // Sort the games array alphabetically by title
                data.sort((a, b) => a.title.localeCompare(b.title));

                // Filter out duplicate entries based on appID, conditionally based on showAdminView
                if (!showAdminView) {
                    data = data.filter((game, index, self) =>
                        index === self.findIndex((g) => (
                            g.appID === game.appID && g.title === game.title
                        ))
                    );
                }

                // Check state to prevent unauthorized access
                if (!showAdminView || (showAdminView && isAdmin)) {
                    // Set the games state with the fetched, sorted, and filtered data
                    setGames(data);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                // Handle error, e.g., display an error message to the user
            }
        };

        fetchData();
    }, [showAdminView, isAdmin]);

    return (
        <div>
            {games && (
                <ListGames
                    games={games}
                    search={search}
                    storedTwitchUserID={storedTwitchUserID}
                    showAdminView={showAdminView}
                    isAdmin={isAdmin}
                    showModal={showModal}
                    setShowModal={setShowModal}
                    showRedeemed={showRedeemed}
                    errorMessage={errorMessage}
                    setErrorMessage={setErrorMessage}
                />
            )}
        </div>
    );
}

export default FetchGames;