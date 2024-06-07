import axios from 'axios';
import { SERVER } from "./constants";

const isValidFile = (file) => {
    const validTypes = ["image/jpeg", "image/png"];
    const maxSize = 512000;
    return (
        validTypes.includes(file.type) &&
        file.size <= maxSize
    );
};

export const handleFileChange = (e, type, formData, setFormData, setPreview) => {
    const file = e.target.files[0];
    if (file) {
        if (isValidFile(file)) {
            // Set file based on type (cover or header)
            setFormData({ ...formData, [type]: file });
            // Set the image file directly to the preview state variable
            setPreview(URL.createObjectURL(file));
        } else {
            // Handle invalid file type here (e.g., show error message)
            alert("Invalid file type or size. Please select a JPEG or PNG file and keep the file size under 500KB.");
        }
    }
};

export const handleChange = (e, formData, setFormData) => {
    const { name, value, checked } = e.target;

    // If the field is appID or cost, validate that it's a number
    if (name === 'appID' || name === 'cost') {
        if (!isNaN(value)) { // Check if value is a valid number
            setFormData({ ...formData, [name]: value });
        }
    } else if (name === 'isActive') {
        // Convert value to boolean if it's 'true' or 'false' string
        const newValue = value === 'true' || value === 'false' ? value === 'true' : checked;
        setFormData({ ...formData, [name]: newValue });
    } else {
        setFormData({ ...formData, [name]: value });
    }
};

export const handleAppIDSubmit = async (formData, setFormData, setShowForm, setCoverPreview, setHeaderPreview) => {
    try {
        const response = await axios.get(`${SERVER}/getGameInfo/${formData.appID}`);
        if (response.status === 200) {
            const { title, description, trailer, store, cover, header } = response.data;
            setFormData({ ...formData, title, description, trailer, store });
            setShowForm(true); // Show the form after successfully fetching data

            if (cover) {
                // Set game cover source based on Steam app ID
                setCoverPreview(cover);
            }

            if (header) {
                // Set game cover source based on Steam app ID
                setHeaderPreview(header);
            }
        }
    } catch (error) {
        console.error('Error fetching game info:', error);
        // Check if the error response status is 404 (Not Found)
        if (error.response.status === 404) {
            // Display the error message received from the server
            alert(error.response.data.error);
        } else {
            // For other errors, display a generic error message
            alert('An error occurred while adding the game. Please try again later.');
        }
    }
};

export const isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};