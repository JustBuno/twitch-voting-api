import React from "react";
import { handleLogin } from "./utils";
import { UNAUTHORIZED_ERROR_MESSAGE } from "./systemMessages";

const ErrorMessageModal = ({ error }) => {
  const handleClick = () => {
    if (error.status === 401) {
      // Redirect user for authentication
      handleLogin();
    } else {
      // Reload the current page for other errors
      window.location.reload();
    }
  };

  return (
    <div className="overlay">
      <div className="modal-fixed">
        <div className="modal-content error-modal">
            <p>{error.status === 401 ? UNAUTHORIZED_ERROR_MESSAGE : error.message}</p>
            <button onClick={handleClick}>Close</button>
        </div>
      </div>
    </div>

  );
};

export default ErrorMessageModal;