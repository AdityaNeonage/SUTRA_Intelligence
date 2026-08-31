import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Connecting to backend...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message);
      })
      .catch((error) => {
        console.error("Error:", error);
        setMessage("Backend connection failed");
      });
  }, []);

  return (
    <div className="app">
      <h1>SUTRA</h1>

      <p>Secure Unified Threat & Relationship Analytics</p>

      <hr />

      <h3>Backend Status:</h3>

      <p>{message}</p>
    </div>
  );
}

export default App;