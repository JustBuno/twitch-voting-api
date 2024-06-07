import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SERVER } from '../constants';
import { handleResetTotalVoteCount, handleResetVoteCount } from '../utils';

const AllVotes = ({ storedTwitchUserID, onClose, hasReset, setHasReset }) => {
    const [games, setGames] = useState([]);

    useEffect(() => {
        setHasReset(true);
    }, [setHasReset]);

    useEffect(() => {
        // Fetch data from the server when the component mounts
        const fetchData = async () => {
            if (hasReset) {
                try {
                    // Make a GET request to fetch data from the server
                    const response = await axios.get(`${SERVER}/voting/fetchGames`);

                    // Extract the data from the response
                    const data = response.data;

                    // Filter and sort the games
                    const filteredAndSortedGames = data
                        .filter(game => game.totalVoteCount > 0) // Filter games with totalVoteCount > 0
                        .sort((a, b) => b.totalVoteCount - a.totalVoteCount); // Sort games by totalVoteCount in descending order

                    setGames(filteredAndSortedGames);
                    setHasReset(false);
                } catch (error) {
                    console.error('Error fetching data:', error);
                    // Handle error, e.g., display an error message to the user
                }
            }
        };

        fetchData();
    }, [hasReset, setHasReset]);

    return (
        <div className="modal-content center-content">
            <img
                className="cancel"
                src={`${SERVER}/images/delete-button.png`}
                alt="delete"
                draggable="false"
                onClick={onClose}
            />
            <div className='table-full-width'>
                <h3>Vote History</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Game</th>
                            <th>Current Votes</th>
                            <th></th>
                            <th>Total Votes</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {games.map(game => (
                            <tr key={game.gameID}>
                                <td>{game.title}</td>
                                <td className='vote-count-column'>{game.voteCount}</td>
                                <td className='vote-count-column'>
                                    <img
                                        className="reset-vote-count"
                                        src={`${SERVER}/images/delete-button.png`}
                                        alt="delete"
                                        draggable="false"
                                        onClick={() => handleResetVoteCount(storedTwitchUserID, game, setHasReset)}
                                    />
                                </td>
                                <td className='vote-count-column'>{game.totalVoteCount}</td>
                                <td className='vote-count-column'>
                                    <img
                                        className="reset-vote-count"
                                        src={`${SERVER}/images/delete-button.png`}
                                        alt="delete"
                                        draggable="false"
                                        onClick={() => handleResetTotalVoteCount(storedTwitchUserID, game, setHasReset)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AllVotes;