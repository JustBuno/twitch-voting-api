import axios from "axios";
import { SERVER } from "../constants";
import { SetTimestamp } from "../utils";

const DeleteGame = ({ onClose, game, storedTwitchUserID }) => {
    const storedAccessToken = sessionStorage.getItem("accessToken");

    const handleDelete = async () => {
        try {
            const response = await axios.delete(`${SERVER}/giveaways/deleteGame/${game.gameID}?twitchUserID=${storedTwitchUserID}`, {
                headers: {
                    'accessToken': `Bearer ${storedAccessToken}`
                }
            });

            if (response.status === 200) {
                SetTimestamp();
                window.location.reload();
            }
        } catch (error) {
            console.error("DELETE error: ", error);
        }
    };

    return (
        <div className="modal-content">
            <div className="delete">
                <h1>DELETE GAME</h1>
                <h2>{game.title}</h2>
                <img className="game-header"
                        src={game.header ? `${SERVER}/images/${game.header}` : (game.appID ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.appID}/header.jpg` : `${SERVER}/images/missing-header.gif`)}
                        alt="header"
                        draggable="false"
                    />
                <button className="submit" onClick={handleDelete}>CONFIRM</button>
                <img
                    className="cancel"
                    src={`${SERVER}/images/delete-button.png`}
                    alt="delete"
                    draggable="false"
                    onClick={onClose}
                />
            </div>
        </div>
    );

};

export default DeleteGame;