# Letter & Agenda Writer

A web application for creating, managing, and downloading letters and agendas. This project is built using HTML, CSS, JavaScript, and Firebase for authentication and Firestore for data storage.

## Features

- **Admin Login**: Secure login for administrators to manage documents.
- **Document Management**: Create, edit, and delete letters/agendas.
- **Search Functionality**: Search documents by title.
- **Download as DOCX**: Generate and download documents in `.docx` format.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Firebase Authentication, Firestore Database
- **Libraries**:
  - [docx.js](https://github.com/dolanmiu/docx) for generating Word documents.
  - [Axios](https://axios-http.com/) for HTTP requests.
  - [FileSaver.js](https://github.com/eligrey/FileSaver.js/) for saving files.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nisarg27998/letter-agenda-writer.git
   cd letter-agenda-writer
   ```
2. Open index.html in your browser to run the application.

## Firebase Setup

1. Create a Firebase project at Firebase Console.
2. Enable Authentication and Firestore Database in your Firebase project.
3. Replace the Firebase configuration in script.js with your project's configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

## Usage

1. Open the application in your browser.
2. Use the Login button to log in as an admin.
3. Create, edit, or delete documents in the admin section.
4. Search for documents using the search bar.
5. Download documents as .docx files.

## Project Structure

```
letter-agenda-website/
├── [index.html](http://_vscodecontentref_/0)       # Main HTML file
├── [styles.css](http://_vscodecontentref_/1)       # CSS for styling
├── [script.js](http://_vscodecontentref_/2)        # JavaScript for functionality
└── README.md        # Project documentation
```

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## Contact

For any inquiries, please contact panchalnisarg65@gmail.com.
