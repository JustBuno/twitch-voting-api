import React, { useState, useEffect, useRef, useCallback } from "react";
import Details from "./Details";
import RedeemConfirm from "./RedeemConfirm";
import AddGame from "./AddGame";
import EditGame from "./EditGame";
import DeleteGame from "./DeleteGame";
import { SERVER } from "../constants";
import { GIVEAWAYS_EMPTY_MESSAGE } from "../systemMessages";

const ListGames = ({ games, search, storedTwitchUserID, showAdminView, isAdmin, showModal, setShowModal, showRedeemed, errorMessage, setErrorMessage }) => {
    const [details, setDetails] = useState(null);
    const [redeemConfirm, setRedeemConfirm] = useState(null);
    const [hasRedeemed, setHasRedeemed] = useState(false);
    const [addGame, setAddGame] = useState(false);
    const [editGame, setEditGame] = useState(null);
    const [deleteGame, setDeleteGame] = useState(null);
    const modalRef = useRef(null);

    const handleDetailsClick = (game) => {
        setDetails(game);
        setShowModal(true);
    };

    const handleRedeemConfirmClick = (game) => {
        setRedeemConfirm(game);
        if (details) {
            setDetails(null);
        } else {
            setShowModal(true);
        }
    };

    const handleAddClick = () => {
        setAddGame(true);
        setShowModal(true);
    };

    const handleEditClick = (game) => {
        setEditGame(game);
        setShowModal(true);
    };

    const handleDeleteClick = (game) => {
        setDeleteGame(game);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        if (hasRedeemed) {
            window.location.reload();
        } else {
            setShowModal(false);
        }
    };

    useEffect(() => {
        if (!showModal) {
            if (hasRedeemed && !errorMessage.status) {
                window.location.reload();
            } else {
                setAddGame(false);
                setEditGame(null);
                setDeleteGame(null);
                setDetails(null);
                setRedeemConfirm(null);
            }
        } else if (showRedeemed) {
            setRedeemConfirm(null);
        }
    }, [showModal, showRedeemed, hasRedeemed, errorMessage.status]);

    const handleClickOutside = useCallback((event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
            setShowModal(false);
        }
    }, [setShowModal]);

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [handleClickOutside]);

    return (
        <div className="flex">
            {games.length === 0 && !showAdminView && (
                <p className="list-empty">{GIVEAWAYS_EMPTY_MESSAGE}</p>
            )}
            {games.length !== 0 && games.filter((game) => {
                return (search === '') ? game : game.title.toLowerCase().includes(search);
            }).map((game) => (
                <div className="list" key={game.gameID}>
                    <img
                        className="game-cover"
                        src={game.cover ? `${SERVER}/images/${game.cover}` : (game.appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appID}/library_600x900.jpg` : `${SERVER}/images/missing-cover.gif`)}
                        alt={game.title}
                        draggable="false"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `${SERVER}/images/missing-cover.gif`;
                            e.target.alt = "Image missing";
                        }}
                    />
                    <div className="buttons">
                        {!showAdminView && (
                            <div>
                                <div className="button-container">
                                    <button
                                        className="game-button"
                                        onClick={() => handleDetailsClick(game)}
                                    >
                                        DETAILS
                                    </button>
                                </div>
                                {storedTwitchUserID && (
                                    <button
                                        className="game-cost"
                                        onClick={() => handleRedeemConfirmClick(game)}
                                    >
                                        {game.cost}
                                    </button>
                                )}
                            </div>
                        )}
                        {isAdmin && showAdminView && (
                            <div>
                                <img
                                    className="edit-button"
                                    src={`${SERVER}/images/edit-button.png`}
                                    alt="edit"
                                    draggable="false"
                                    onClick={() => handleEditClick(game)}
                                />
                                <img
                                    className="delete-button"
                                    src={`${SERVER}/images/delete-button.png`}
                                    alt="delete"
                                    draggable="false"
                                    onClick={() => handleDeleteClick(game)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {isAdmin && showAdminView && (
                <img
                    className="add-button"
                    src={`${SERVER}/images/add-button.png`}
                    alt="add game button"
                    draggable="false"
                    onClick={handleAddClick}
                />
            )}

            {showModal && details && (
                <div className="overlay">
                    <div className="modal-responsive" ref={modalRef}>
                        {details && (
                            <Details
                                game={details}
                                onClose={handleCloseModal}
                                storedTwitchUserID={storedTwitchUserID}
                                handleRedeemConfirmClick={handleRedeemConfirmClick}
                            />
                        )}
                    </div>
                </div>
            )}
            {showModal && (redeemConfirm || editGame || deleteGame || addGame) && (
                <div className="overlay">
                    <div className="modal-fixed">
                        {redeemConfirm && (
                            <RedeemConfirm
                                game={redeemConfirm}
                                onClose={handleCloseModal}
                                storedTwitchUserID={storedTwitchUserID}
                                hasRedeemed={hasRedeemed}
                                setHasRedeemed={setHasRedeemed}
                                setErrorMessage={setErrorMessage}
                            />
                        )}
                        {editGame && (
                            <EditGame
                                game={editGame}
                                onClose={handleCloseModal}
                                storedTwitchUserID={storedTwitchUserID}
                            />
                        )}
                        {deleteGame && (
                            <DeleteGame
                                game={deleteGame}
                                onClose={handleCloseModal}
                                storedTwitchUserID={storedTwitchUserID}
                            />
                        )}
                        {addGame && (
                            <AddGame
                                onClose={handleCloseModal}
                                storedTwitchUserID={storedTwitchUserID}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );

};

export default ListGames;