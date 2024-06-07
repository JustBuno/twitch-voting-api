import React from "react";
import { SERVER } from "../constants";

const placeholderImage = `${SERVER}/images/question-mark.png`;

const TopVoted = ({ games, votingEnabled, superVotedID }) => {
    // Filter out games with zero votes
    const filteredGames = games.filter(game => game.voteCount > 0);

    // Sort the filtered games by their vote counts in descending order
    let sortedGames = [...filteredGames].sort((a, b) => b.voteCount - a.voteCount);

    // If superVotedID is provided, set the superVoted game as the first element of sortedGames
    if (superVotedID) {
        const superVotedGameIndex = sortedGames.findIndex(game => game.gameID === superVotedID);
        if (superVotedGameIndex !== -1) {
            const superVotedGame = sortedGames.splice(superVotedGameIndex, 1)[0];
            sortedGames = [superVotedGame, ...sortedGames];
        }
    }

    if (!votingEnabled && sortedGames[0]) {
        sessionStorage.setItem("topVoted", sortedGames[0].gameID);
    }

    return sortedGames[0] ? (
        <div>
            <h1 className="podium-title">TOP VOTED GAMES</h1>
            <div className="podium-container">
                <div className={`podium-game silver ${!votingEnabled ? "transparency" : ""}`}>
                    {sortedGames[1] ? (
                        <>
                            <img
                                className="game-cover"
                                src={sortedGames[1].cover ? `${SERVER}/images/${sortedGames[1].cover}` : (sortedGames[1].appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${sortedGames[1].appID}/library_600x900.jpg` : `${SERVER}/images/missing-cover.gif`)}
                                alt={sortedGames[1].title}
                                draggable="false"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `${SERVER}/images/missing-cover.gif`;
                                    e.target.alt = "Image missing";
                                }}
                            />
                            <div className="vote-count">{sortedGames[1].voteCount}</div>
                        </>
                    ) : (
                        <img
                            className="game-cover"
                            src={placeholderImage}
                            alt="Placeholder"
                            draggable="false"
                        />
                    )}
                </div>
                <div className="podium-game gold">
                    {sortedGames[0] ? (
                        <>
                            <img
                                className="game-cover"
                                src={sortedGames[0].cover ? `${SERVER}/images/${sortedGames[0].cover}` : (sortedGames[0].appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${sortedGames[0].appID}/library_600x900.jpg` : `${SERVER}/images/missing-cover.gif`)}
                                alt={sortedGames[0].title}
                                draggable="false"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `${SERVER}/images/missing-cover.gif`;
                                    e.target.alt = "Image missing";
                                }}
                            />
                            {!votingEnabled && (
                                <div className="flex button-container">
                                    <div className="winner">
                                        <div>WINNER</div>
                                        {superVotedID && (
                                            <div className="subtitle">SUPER VOTED</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {!superVotedID && (
                                <div className="vote-count">{sortedGames[0].voteCount}</div>
                            )}
                        </>
                    ) : (
                        <img
                            className="game-cover"
                            src={placeholderImage}
                            alt="Placeholder"
                            draggable="false"
                        />
                    )}
                </div>
                <div className={`podium-game bronze ${!votingEnabled ? "transparency" : ""}`}>
                    {sortedGames[2] ? (
                        <>
                            <img
                                className="game-cover"
                                src={sortedGames[2].cover ? `${SERVER}/images/${sortedGames[2].cover}` : (sortedGames[2].appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${sortedGames[2].appID}/library_600x900.jpg` : `${SERVER}/images/missing-cover.gif`)}
                                alt={sortedGames[2].title}
                                draggable="false"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `${SERVER}/images/missing-cover.gif`;
                                    e.target.alt = "Image missing";
                                }}
                            />
                            <div className="vote-count">{sortedGames[2].voteCount}</div>
                        </>
                    ) : (
                        <img
                            className="game-cover"
                            src={placeholderImage}
                            alt="Placeholder"
                            draggable="false"
                        />
                    )}
                </div>
            </div>
        </div>
    ) : null;
};

export default TopVoted;